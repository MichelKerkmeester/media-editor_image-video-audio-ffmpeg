// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add B Roll
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import {
  BROLL_POSITION_VALUES,
  normalizePosition,
  positionXY,
} from '../../core/overlay-position.js';
import { successResult } from '../../core/result.js';
import { formatSeconds, requireSeconds } from '../../core/time-parse.js';
import { outputNameField } from '../../server/field-schemas.js';
import { timeField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runPipeline } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { BrollPosition, BrollPositionValue } from '../../core/overlay-position.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { PipelineProduct, PipelineStep } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One `clips` entry with the values the schema accepted. */
interface ClipArguments {
  readonly clipPath: string;
  readonly insertAt: number | string;
  readonly duration?: number;
  readonly position: BrollPositionValue;
  readonly scale?: number;
  readonly fadeIn: boolean;
  readonly fadeOut: boolean;
  readonly fadeDuration: number;
}

/** Arguments after the schema defaults are applied. */
interface AddBRollArguments {
  readonly inputPath: string;
  readonly clips: readonly ClipArguments[];
  readonly outputName: string;
}

/** One overlay the second pass chains, in sorted order. */
export interface BrollGraphEntry {
  /** One-based index of the clip's own input in the second pass. */
  readonly index: number;

  /** Seconds the clip's window opens, counted on the main timeline. */
  readonly insertAt: number;

  /** Seconds the window stays open. */
  readonly length: number;

  /** Canonical anchor of the clip on the main frame. */
  readonly position: BrollPosition;
}

/** One clip after its position, length and fades were validated. */
export interface BrollClip {
  /** Canonical anchor of the clip on the main frame. */
  readonly position: BrollPosition;

  /** Size factor of the clip's own size, used by the grid positions. */
  readonly scale?: number;

  /** Whether the clip fades in from its first frame. */
  readonly fadeIn: boolean;

  /** Whether the clip fades out before its window ends. */
  readonly fadeOut: boolean;

  /** Seconds each fade lasts. */
  readonly fadeDuration: number;
}

/** One resolved clip and the arguments that describe it. */
interface ResolvedClip {
  readonly input: ResolvedInput;
  readonly args: ClipArguments;
  readonly index: number;
}

/** One sorted clip with the values its two passes need. */
interface PlannedClip {
  readonly input: ResolvedInput;
  readonly insertAt: number;
  readonly length: number;
  readonly clip: BrollClip;
}

/** Everything the passes of one call need besides the temp folder. */
interface BrollPlan {
  readonly main: ResolvedInput;
  readonly entries: readonly PlannedClip[];
  readonly width: number;
  readonly height: number;
  readonly hasAudio: boolean;
  readonly graph: readonly BrollGraphEntry[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_add_b_roll';

const BROLL_OPERATION = 'b-roll';
const BROLL_EXTENSION = '.mp4';
const BROLL_TEMP_NAME = 'b-roll.mp4';
const CLIP_TEMP_PREFIX = 'clip_';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const BROLL_ENCODERS = [VIDEO_ENCODER, AUDIO_ENCODER] as const;
const BROLL_FILTERS = ['overlay', 'scale', 'setpts'] as const;
const FADE_FILTER = 'fade';

const MAX_CLIPS = 50;
const MIN_SCALE = 0.01;
const MAX_SCALE = 10;
const DEFAULT_SCALE = 0.5;
const DEFAULT_POSITION = 'fullscreen';
const DEFAULT_FADE_DURATION = 0.5;

const TIME_FORMS =
  'Accepts a number of seconds, a plain numeric string, HH:MM:SS, '
  + 'HH:MM:SS.mmm, or MM:SS.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the main video to read, inside an allowed root. '
  + 'The file is not changed.';

const CLIPS_DESCRIPTION =
  'Clips to overlay, one entry each. Use 1 to 50 entries. Every clip is shown from '
  + 'its own insertAt for its own length, in insertAt order.';

const CLIP_PATH_DESCRIPTION =
  'Absolute path of the clip to overlay, inside an allowed root. The file is not changed.';

const INSERT_AT_DESCRIPTION =
  `When the clip starts being shown, in seconds. ${TIME_FORMS} `
  + 'It must be less than the main video\'s duration.';

const DURATION_DESCRIPTION =
  'Seconds of the clip to show. Defaults to the clip\'s own duration. '
  + 'Use a value greater than 0.';

const POSITION_DESCRIPTION =
  'Where the clip sits on the frame: top_left, top_center, top_right, center_left, '
  + 'center, center_right, bottom_left, bottom_center, bottom_right or fullscreen. '
  + `Defaults to ${DEFAULT_POSITION}.`;

const SCALE_DESCRIPTION =
  `Size factor of the clip's own size for the grid positions, from ${MIN_SCALE} to `
  + `${MAX_SCALE}. Defaults to ${DEFAULT_SCALE}. A fullscreen clip always fills the `
  + 'frame, so scale cannot be set there.';

const FADE_IN_DESCRIPTION =
  'When true, the clip fades in from black as its window opens. Defaults to false.';

const FADE_OUT_DESCRIPTION =
  'When true, the clip fades out to black before its window ends. Defaults to false.';

const FADE_DURATION_DESCRIPTION =
  `Seconds each fade lasts. Use a value greater than 0. Defaults to ${DEFAULT_FADE_DURATION}.`;

const CLIP_SCHEMA = z.strictObject({
  clipPath: z.string().min(1).describe(CLIP_PATH_DESCRIPTION),
  insertAt: timeField(INSERT_AT_DESCRIPTION),
  duration: z.number().gt(0).optional().describe(DURATION_DESCRIPTION),
  position: z
    .enum(BROLL_POSITION_VALUES)
    .default(DEFAULT_POSITION)
    .describe(POSITION_DESCRIPTION),
  scale: z.number().min(MIN_SCALE).max(MAX_SCALE).optional().describe(SCALE_DESCRIPTION),
  fadeIn: z.boolean().default(false).describe(FADE_IN_DESCRIPTION),
  fadeOut: z.boolean().default(false).describe(FADE_OUT_DESCRIPTION),
  fadeDuration: z
    .number()
    .gt(0)
    .default(DEFAULT_FADE_DURATION)
    .describe(FADE_DURATION_DESCRIPTION),
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function checkClipArguments(clips: readonly ClipArguments[]): void {
  if (clips.length === 0) {
    throw new MediaError(ERROR_CODES.INVALID_INPUT, 'A b-roll call needs at least one clip.', {
      parameter: 'clips',
      value: 0,
      reason: 'empty',
    });
  }
  for (const [index, clip] of clips.entries()) {
    if (clip.position === 'fullscreen' && clip.scale !== undefined) {
      throw new MediaError(ERROR_CODES.INVALID_INPUT, 'A fullscreen clip cannot carry a scale.', {
        parameter: `clips[${String(index)}].scale`,
        value: clip.scale,
        reason: 'scale-with-fullscreen',
      });
    }
  }
}

function resolveClips(clips: readonly ClipArguments[], context: ToolContext): ResolvedClip[] {
  const resolved: ResolvedClip[] = [];
  for (const [index, args] of clips.entries()) {
    resolved.push({
      index,
      args,
      input: context.resolveInput(
        args.clipPath,
        'input',
        `clips[${String(index)}].clipPath`,
        TOOL_NAME,
      ),
    });
  }
  return resolved;
}

async function planClips(
  clips: readonly ResolvedClip[],
  mainSeconds: number,
  context: ToolContext,
): Promise<PlannedClip[]> {
  const planned: PlannedClip[] = [];
  for (const entry of clips) {
    const parameter = `clips[${String(entry.index)}]`;
    const properties = await probeMedia(context, entry.input);
    requireVideoStream(entry.input, properties);
    const insertAt = requireSeconds(entry.args.insertAt, `${parameter}.insertAt`);
    if (insertAt >= mainSeconds) {
      throw new MediaError(
        ERROR_CODES.INVALID_INPUT,
        'A b-roll clip must start before the main video ends.',
        {
          parameter: `${parameter}.insertAt`,
          value: entry.args.insertAt,
          reason: 'past-end',
        },
      );
    }
    const clipSeconds = properties.durationSeconds ?? 0;
    const length = entry.args.duration === undefined
      ? clipSeconds
      : Math.min(entry.args.duration, clipSeconds);
    if (length <= 0) {
      throw new MediaError(ERROR_CODES.INVALID_INPUT, 'The clip has no usable length.', {
        parameter: `${parameter}.duration`,
        value: entry.args.duration ?? 0,
        reason: 'duration-unavailable',
      });
    }
    planned.push({
      input: entry.input,
      insertAt,
      length,
      clip: {
        position: normalizePosition(entry.args.position),
        scale: entry.args.scale,
        fadeIn: entry.args.fadeIn,
        fadeOut: entry.args.fadeOut,
        fadeDuration: entry.args.fadeDuration,
      },
    });
  }
  return planned;
}

function scaleToken(clip: BrollClip, mainWidth: number, mainHeight: number): string {
  if (clip.position === 'fullscreen') {
    return `scale=${String(mainWidth)}:${String(mainHeight)}`;
  }
  // libx264 refuses an odd 4:2:0 frame side, and iw times a factor can be odd.
  const factor = String(clip.scale ?? DEFAULT_SCALE);
  return `scale=trunc(iw*${factor}/2)*2:trunc(ih*${factor}/2)*2`;
}

function clipArgs(inputPath: string, filter: string, outputPath: string): string[] {
  return [
    '-n',
    '-i',
    inputPath,
    '-vf',
    filter,
    '-c:v',
    VIDEO_ENCODER,
    '-c:a',
    AUDIO_ENCODER,
    outputPath,
  ];
}

function composeArgs(
  plan: BrollPlan,
  clipPaths: readonly string[],
  outputPath: string,
): string[] {
  const args = ['-n', '-i', plan.main.realPath];
  for (const clipPath of clipPaths) {
    args.push('-i', clipPath);
  }
  args.push('-filter_complex', brollGraph(plan.graph), '-map', '[v]');
  if (plan.hasAudio) {
    args.push('-map', '0:a');
  }
  args.push('-c:v', VIDEO_ENCODER);
  if (plan.hasAudio) {
    args.push('-c:a', AUDIO_ENCODER);
  }
  args.push(outputPath);
  return args;
}

function graphEntries(entries: readonly PlannedClip[]): BrollGraphEntry[] {
  return entries.map((entry, position) => ({
    index: position + 1,
    insertAt: entry.insertAt,
    length: entry.length,
    position: entry.clip.position,
  }));
}

function hasAnyFade(entries: readonly PlannedClip[]): boolean {
  return entries.some((entry) => entry.clip.fadeIn || entry.clip.fadeOut);
}

function inputTuple(
  main: ResolvedInput,
  entries: readonly PlannedClip[],
): readonly [ResolvedInput, ...ResolvedInput[]] {
  const [first, ...rest] = entries;
  if (first === undefined) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The b-roll call had no clips to overlay.', {
      tool: TOOL_NAME,
    });
  }
  return [main, first.input, ...rest.map((entry) => entry.input)];
}

function bRollStep(context: ToolContext, plan: BrollPlan): PipelineStep {
  return async (tempDir: string): Promise<PipelineProduct> => {
    const clipPaths: string[] = [];
    for (const [position, entry] of plan.entries.entries()) {
      const clipPath = path.join(
        tempDir,
        `${CLIP_TEMP_PREFIX}${String(position)}${BROLL_EXTENSION}`,
      );
      const filter = clipFilter(entry.clip, plan.width, plan.height, entry.length);
      await context.runBinary('ffmpeg', clipArgs(entry.input.realPath, filter, clipPath), {
        inputs: [entry.input],
        outputs: [clipPath],
        tempDir,
      });
      clipPaths.push(clipPath);
    }
    const outputPath = path.join(tempDir, BROLL_TEMP_NAME);
    await context.runBinary('ffmpeg', composeArgs(plan, clipPaths, outputPath), {
      inputs: [plan.main],
      outputs: [outputPath],
      tempDir,
    });
    return {
      tempPath: outputPath,
      operation: BROLL_OPERATION,
      extension: BROLL_EXTENSION,
      mediaType: 'video',
    };
  };
}

async function runAddBRoll(args: AddBRollArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  checkClipArguments(args.clips);
  const main = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const resolved = resolveClips(args.clips, context);
  const mainProperties = await probeMedia(context, main);
  const mainVideo = requireVideoStream(main, mainProperties);
  const entries = await planClips(resolved, mainProperties.durationSeconds ?? 0, context);
  // The sort is stable, so clips given the same time keep their caller order.
  entries.sort((left, right) => left.insertAt - right.insertAt);
  const plan: BrollPlan = {
    main,
    entries,
    width: mainVideo.width,
    height: mainVideo.height,
    hasAudio: mainProperties.hasAudio,
    graph: graphEntries(entries),
  };
  const result = await runPipeline(
    context,
    {
      tool: TOOL_NAME,
      outputName: args.outputName,
      inputs: inputTuple(main, entries),
      upfront: {
        encoders: BROLL_ENCODERS,
        filters: hasAnyFade(entries) ? [...BROLL_FILTERS, FADE_FILTER] : BROLL_FILTERS,
      },
    },
    bRollStep(context, plan),
  );
  const baseName = path.basename(main.rawPath);
  const noun = entries.length === 1 ? 'clip' : 'clips';
  return successResult({
    tool: TOOL_NAME,
    text: `Added ${String(entries.length)} b-roll ${noun} to ${baseName}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build the `-vf` filter one clip is processed with.
 *
 * A fullscreen clip is scaled to the main frame; every other position keeps a
 * factor of the clip's own size, floored to an even number. The fade out starts
 * a fade duration before the window ends, clamped at the clip's first frame.
 *
 * @param clip - Anchor, scale and fade settings of the clip
 * @param mainWidth - Main video width in pixels
 * @param mainHeight - Main video height in pixels
 * @param length - Seconds the clip's window stays open
 * @returns The filter chain, one element per filter
 */
export function clipFilter(
  clip: BrollClip,
  mainWidth: number,
  mainHeight: number,
  length: number,
): string {
  const parts = [scaleToken(clip, mainWidth, mainHeight)];
  if (clip.fadeIn) {
    parts.push(`fade=t=in:st=0:d=${String(clip.fadeDuration)}`);
  }
  if (clip.fadeOut) {
    const fadeOutStart = Math.max(0, length - clip.fadeDuration);
    parts.push(`fade=t=out:st=${formatSeconds(fadeOutStart)}:d=${String(clip.fadeDuration)}`);
  }
  return parts.join(',');
}

/**
 * Build the `-filter_complex` graph that shifts and chains every clip.
 *
 * Each clip's timestamps move to its own insertion time first, so the clip
 * plays from its first frame when its window opens. Then one overlay per clip
 * draws it during its window, every overlay reading the previous one.
 *
 * @param entries - One entry per clip, in sorted insertion order
 * @returns The filter graph, chains joined with `;`
 */
export function brollGraph(entries: readonly BrollGraphEntry[]): string {
  const shifts: string[] = [];
  const overlays: string[] = [];
  let source = '[0:v]';
  for (const [position, entry] of entries.entries()) {
    const label = `b${String(position)}`;
    const start = formatSeconds(entry.insertAt);
    const end = formatSeconds(entry.insertAt + entry.length);
    shifts.push(`[${String(entry.index)}:v]setpts=PTS-STARTPTS+${start}/TB[${label}]`);
    const xy = entry.position === 'fullscreen' ? 'x=0:y=0' : positionXY(entry.position, 'broll');
    const last = position === entries.length - 1;
    const target = last ? 'v' : `v${String(position)}`;
    overlays.push(
      `${source}[${label}]overlay=${xy}:enable='between(t,${start},${end})'[${target}]`,
    );
    source = `[v${String(position)}]`;
  }
  return [...shifts, ...overlays].join(';');
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Overlays timed b-roll clips onto a main video and leaves every input unchanged. */
export const videoAddBRollTool = defineTool({
  name: TOOL_NAME,
  title: 'Add b-roll clips',
  description:
    'Overlays one or more clips onto a main video as timed overlays, each at its own '
    + 'position and shown length, with optional fades. Every clip starts from its first '
    + 'frame when its window opens. It writes one new MP4 file into a new numbered '
    + 'folder and never changes an input. The picture is re-encoded, so run time grows '
    + 'with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and '
    + 'minutes to tens of minutes above 1 GB. The call returns when the work ends or when '
    + 'the timeout stops it.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    clips: z.array(CLIP_SCHEMA).min(0).max(MAX_CLIPS).describe(CLIPS_DESCRIPTION),
    outputName: outputNameField,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runAddBRoll(args, context);
  },
});
