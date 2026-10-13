// ───────────────────────────────────────────────────────────────────
// MODULE: Media Remove Silence
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import { probeMedia, requireAudioStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runPipeline } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MediaProperties } from '../../core/media-properties.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { PipelineProduct, PipelineStep } from '../video/copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the schema defaults are applied. */
interface RemoveSilenceArguments {
  readonly inputPath: string;
  readonly silenceThresholdDb: number;
  readonly minSilenceDurationMs: number;
  readonly outputName: string;
}

/** One silent stretch found in the file, in seconds. */
export interface Silence {
  /** Start of the silence in seconds. */
  readonly start: number;

  /** End of the silence in seconds. */
  readonly end: number;
}

/** One loud stretch the output keeps, in seconds. */
export interface Segment {
  /** Start of the kept stretch in seconds. */
  readonly start: number;

  /** End of the kept stretch in seconds. */
  readonly end: number;
}

/** Values the passes need besides their private temp folder. */
interface RemovalPlan {
  readonly input: ResolvedInput;
  readonly duration: number;
  readonly thresholdText: string;
  readonly minSilenceText: string;
  readonly hasVideo: boolean;
}

/** What the passes found, so the summary can name it after they return. */
interface RemovalReport {
  copied: boolean;
  count: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'media_remove_silence';
const OPERATION = 'without-silence';
const COPY_TEMP_STEM = 'without-silence';
const KEEP_VIDEO_TEMP_NAME = 'without-silence.mp4';
const KEEP_AUDIO_TEMP_NAME = 'without-silence.m4a';

const VIDEO_EXTENSION = '.mp4';
const AUDIO_EXTENSION = '.m4a';

const VIDEO_ENCODERS = ['libx264', 'aac'] as const;
const AUDIO_ENCODERS = ['aac'] as const;
const SILENCE_FILTERS = [
  'silencedetect',
  'select',
  'setpts',
  'aselect',
  'asetpts',
] as const;

// A stretch shorter than this is a boundary artifact, not a take worth keeping.
const MIN_SEGMENT_SECONDS = 0.001;

const NO_SILENCE_WARNING =
  'No silence was found at this threshold, so the file was copied unchanged.';

const SILENCE_START = /silence_start: (-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)/gu;
const SILENCE_END = /silence_end: (-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)/gu;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function numberMatches(pattern: RegExp, text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(pattern)) {
    const raw = match[1];
    if (raw === undefined) {
      continue;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      values.push(parsed);
    }
  }
  return values;
}

// The filter text stays plain: no exponent, no trailing zeros.
function numberText(value: number): string {
  return value.toFixed(6).replace(/0+$/u, '').replace(/\.$/u, '');
}

function copyExtension(hasVideo: boolean, realPath: string): string {
  const extension = path.extname(realPath).toLowerCase();
  if (extension.length > 1) {
    return extension;
  }
  return hasVideo ? VIDEO_EXTENSION : AUDIO_EXTENSION;
}

function requireDuration(input: ResolvedInput, props: MediaProperties): number {
  const duration = props.durationSeconds;
  if (duration === undefined) {
    throw new MediaError(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      'This file has no readable duration.',
      {
        path: input.rawPath,
        detected: 'unknown-duration',
        accepted: ['audio'],
      },
    );
  }
  return duration;
}

function detectArgs(plan: RemovalPlan): string[] {
  return [
    '-n',
    '-i',
    plan.input.realPath,
    '-vn',
    '-af',
    `silencedetect=n=${plan.thresholdText}dB:d=${plan.minSilenceText}`,
    '-f',
    'null',
    '-',
  ];
}

function copyArgs(realPath: string, outputPath: string): string[] {
  return ['-n', '-i', realPath, '-c', 'copy', outputPath];
}

function keepArgs(plan: RemovalPlan, expr: string, outputPath: string): string[] {
  if (!plan.hasVideo) {
    return [
      '-n',
      '-i',
      plan.input.realPath,
      '-filter_complex',
      keepGraph(expr, false),
      '-map',
      '[a]',
      '-c:a',
      'aac',
      outputPath,
    ];
  }
  return [
    '-n',
    '-i',
    plan.input.realPath,
    '-filter_complex',
    keepGraph(expr, true),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    outputPath,
  ];
}

async function copyProduct(
  context: ToolContext,
  plan: RemovalPlan,
  report: RemovalReport,
  tempDir: string,
): Promise<PipelineProduct> {
  const extension = copyExtension(plan.hasVideo, plan.input.realPath);
  const copyPath = path.join(tempDir, `${COPY_TEMP_STEM}${extension}`);
  await context.runBinary('ffmpeg', copyArgs(plan.input.realPath, copyPath), {
    inputs: [plan.input],
    outputs: [copyPath],
    tempDir,
  });
  report.copied = true;
  return {
    tempPath: copyPath,
    operation: OPERATION,
    extension,
    mediaType: plan.hasVideo ? 'video' : 'audio',
    warnings: [NO_SILENCE_WARNING],
  };
}

function removalStep(
  context: ToolContext,
  plan: RemovalPlan,
  report: RemovalReport,
): PipelineStep {
  return async (tempDir: string): Promise<PipelineProduct> => {
    // The detect pass writes nothing; its stderr is the only result worth reading.
    const detection = await context.runBinary('ffmpeg', detectArgs(plan), {
      inputs: [plan.input],
      tempDir,
    });
    const silences = parseSilences(detection.stderr, plan.duration);
    if (silences.length === 0) {
      return copyProduct(context, plan, report, tempDir);
    }
    const segments = keepSegments(silences, plan.duration);
    if (segments.length === 0) {
      throw new MediaError(
        ERROR_CODES.INVALID_INPUT,
        'Every stretch of this file is silent at this threshold.',
        {
          parameter: 'inputPath',
          value: plan.input.rawPath,
          reason: 'all-silent',
        },
      );
    }
    report.count = silences.length;
    const outputPath = path.join(
      tempDir,
      plan.hasVideo ? KEEP_VIDEO_TEMP_NAME : KEEP_AUDIO_TEMP_NAME,
    );
    await context.runBinary(
      'ffmpeg',
      keepArgs(plan, selectExpression(segments), outputPath),
      {
        inputs: [plan.input],
        outputs: [outputPath],
        tempDir,
      },
    );
    return {
      tempPath: outputPath,
      operation: OPERATION,
      extension: plan.hasVideo ? VIDEO_EXTENSION : AUDIO_EXTENSION,
      mediaType: plan.hasVideo ? 'video' : 'audio',
    };
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Read the silent stretches from `silencedetect` output.
 *
 * Starts and ends pair in order. A start with no matching end runs to the
 * file's own end, a negative start counts as zero, an end past the duration
 * counts as the duration, and a pair whose end is not after its start is
 * dropped.
 *
 * @param stderr - Captured stderr of the detect run
 * @param duration - Seconds the file lasts, from the probe
 * @returns The silent stretches, in the order they were found
 */
export function parseSilences(stderr: string, duration: number): Silence[] {
  const starts = numberMatches(SILENCE_START, stderr);
  const ends = numberMatches(SILENCE_END, stderr);
  const silences: Silence[] = [];
  for (const [index, rawStart] of starts.entries()) {
    const start = Math.max(rawStart, 0);
    const end = Math.min(ends[index] ?? duration, duration);
    if (end > start) {
      silences.push({ start, end });
    }
  }
  return silences;
}

/**
 * Keep the loud stretches between the silent ones.
 *
 * One stretch runs from the file's start to the first silence, one between
 * each pair, and one from the last silence to the file's end. A stretch
 * shorter than a millisecond is dropped, so a boundary artifact cannot
 * become its own segment.
 *
 * @param silences - Silent stretches from {@link parseSilences}
 * @param duration - Seconds the file lasts
 * @returns The stretches the output keeps, in order
 */
export function keepSegments(
  silences: readonly Silence[],
  duration: number,
): Segment[] {
  const segments: Segment[] = [];
  let current = 0;
  for (const silence of silences) {
    if (silence.start > current) {
      segments.push({ start: current, end: silence.start });
    }
    current = silence.end;
  }
  if (current < duration) {
    segments.push({ start: current, end: duration });
  }
  return segments.filter(
    (segment) => segment.end - segment.start >= MIN_SEGMENT_SECONDS,
  );
}

/**
 * Build the select expression for the kept stretches.
 *
 * Terms join with `+`, and each number is written with at most six decimals
 * and no trailing zeros, for example `between(t,1,2.5)`.
 *
 * @param segments - Stretches from {@link keepSegments}
 * @returns The expression placed inside the select and aselect filters
 */
export function selectExpression(segments: readonly Segment[]): string {
  return segments
    .map((segment) => `between(t,${numberText(segment.start)},${numberText(segment.end)})`)
    .join('+');
}

/**
 * Build the filter graph that rebuilds the kept timeline.
 *
 * The count-based forms are what close the gap: `PTS-STARTPTS` moves only the
 * first kept frame to zero and leaves every interior gap in the timeline,
 * while `N/FRAME_RATE/TB` and `N/SR/TB` run the kept stretches back to back.
 *
 * @param expr - Expression from {@link selectExpression}
 * @param hasVideo - True when the input carries a picture
 * @returns The value for one `-filter_complex` element
 */
export function keepGraph(expr: string, hasVideo: boolean): string {
  const audio = `[0:a]aselect='${expr}',asetpts=N/SR/TB[a]`;
  if (!hasVideo) {
    return audio;
  }
  const video = `[0:v]select='${expr}',setpts=N/FRAME_RATE/TB[v]`;
  return `${video};${audio}`;
}

async function runRemoveSilence(
  args: RemoveSilenceArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const properties = await probeMedia(context, input);
  requireAudioStream(input, properties);
  const duration = requireDuration(input, properties);
  const hasVideo = properties.hasVideo;
  const report: RemovalReport = { copied: false, count: 0 };
  const result = await runPipeline(
    context,
    {
      tool: TOOL_NAME,
      outputName: args.outputName,
      inputs: [input],
      upfront: {
        encoders: hasVideo ? VIDEO_ENCODERS : AUDIO_ENCODERS,
        filters: SILENCE_FILTERS,
      },
    },
    removalStep(
      context,
      {
        input,
        duration,
        thresholdText: String(args.silenceThresholdDb),
        minSilenceText: String(args.minSilenceDurationMs / 1000),
        hasVideo,
      },
      report,
    ),
  );
  const baseName = path.basename(input.rawPath);
  const text = report.copied
    ? `Found no silence in ${baseName}, so it was copied unchanged. `
      + `Output saved to ${result.entry.path}.`
    : `Removed ${String(report.count)} silent stretches from ${baseName}. `
      + `Output saved to ${result.entry.path}.`;
  return successResult({
    tool: TOOL_NAME,
    text,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Removes silent stretches from an audio or video file and leaves the input unchanged. */
export const mediaRemoveSilenceTool = defineTool({
  name: TOOL_NAME,
  title: 'Remove silence',
  description:
    'Finds silent stretches in an audio or video file and keeps the loud parts, '
    + 'so the result plays back to back. A file with no audio stream is refused. '
    + 'It writes one new file into the export root, in a new numbered '
    + 'folder when subfolder is true, or in the existing folder named by '
    + 'targetFolder, and never changes the input. Run time grows with file '
    + 'size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, '
    + 'and minutes to tens of minutes above 1 GB.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the audio or video file to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    silenceThresholdDb: z
      .number()
      .min(-100)
      .max(0)
      .default(-30)
      .describe(
        'Level in dBFS below which sound counts as silence. '
        + 'Use a value from -100 to 0. Defaults to -30.',
      ),
    minSilenceDurationMs: z
      .number()
      .int()
      .min(1)
      .max(600000)
      .default(500)
      .describe(
        'Shortest silent stretch to remove, in milliseconds. '
        + 'Use a whole number from 1 to 600000. Defaults to 500.',
      ),
    outputName: outputNameField,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runRemoveSilence(args, context);
  },
});
