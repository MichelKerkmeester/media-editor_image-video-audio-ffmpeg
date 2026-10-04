// ───────────────────────────────────────────────────────────────────
// MODULE: Media Repair
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError, isMediaError } from '../../core/errors.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { AttemptOutput, EncodeAttempt } from '../video/copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the schema defaults are applied. */
interface RepairArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly strategy: 'auto' | 'remux' | 'reencode';
}

/** One stream the diagnosis could read. */
export interface DiagnosisStream {
  /** Stream kind ffprobe reported, for example `video` or `audio`. */
  type: string;

  /** Codec name of that stream, empty when ffprobe omitted it. */
  codecName: string;

  /** Present and true for album art, a picture no pass treats as video. */
  attachedPicture?: true;
}

/** What one ffprobe diagnosis could read from a damaged file. */
export interface Diagnosis {
  /** Container name string as ffprobe reported it. */
  formatName?: string;

  /** Seconds the file runs, when the probe reported a usable number. */
  durationSeconds?: number;

  /** Streams the probe could read before it stopped. */
  streams: DiagnosisStream[];

  /** Capped stderr text of a probe that could not read the file. */
  errorExcerpt?: string;
}

/** Which rewrite pass produced the repaired file. */
type PassName = 'remux' | 'reencode';

/** The kept file and the pass that made it. */
interface RewriteOutcome {
  readonly output: AttemptOutput;
  readonly pass: PassName;
}

/** Which block of ffprobe's default writer a line belongs to. */
type WriterSection = 'none' | 'format' | 'stream';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'media_repair';
// The strategy values double as the pass names the result reports.
const REMUX_STRATEGY = 'remux';
const REENCODE_STRATEGY = 'reencode';
const OPERATION = 'repaired';
const TEMP_STEM = 'repaired';

const VIDEO_KIND = 'video';
const AUDIO_KIND = 'audio';
const ACCEPTED_KINDS = ['video', 'audio'] as const;

const VIDEO_EXTENSION = '.mp4';
const AUDIO_EXTENSION = '.m4a';

const VIDEO_ENCODERS = ['libx264', 'aac'] as const;
const VIDEO_ONLY_ENCODERS = ['libx264'] as const;
const AUDIO_ENCODERS = ['aac'] as const;
const VIDEO_AUDIO_FLAGS = ['-c:a', 'aac', '-b:a', '128k'] as const;

const COPY_FAILED_VIDEO_WARNING =
  'The stream copy failed or kept decode errors, so the file was re-encoded as H.264 and AAC.';
const COPY_FAILED_AUDIO_WARNING =
  'The stream copy failed or kept decode errors, so the file was re-encoded as AAC.';
const ALBUM_ART_WARNING = 'The album art was left out, because the re-encoded file is audio only.';

const DIAGNOSIS_ENTRIES =
  'format=format_name,duration:stream=codec_name,codec_type:stream_disposition=attached_pic';
const ATTACHED_PICTURE_KEY = 'DISPOSITION:attached_pic';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function parsedDuration(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }
  return seconds;
}

// Album art arrives as a video stream, but no pass should treat it as one.
function hasStreamKind(diagnosis: Diagnosis, kind: string): boolean {
  return diagnosis.streams.some(
    (stream) => stream.type === kind && stream.attachedPicture !== true,
  );
}

function hasAttachedPicture(diagnosis: Diagnosis): boolean {
  return diagnosis.streams.some((stream) => stream.attachedPicture === true);
}

function errorLineCount(stderr: string): number {
  return stderr.split('\n').filter((line) => line.trim().length > 0).length;
}

function tailText(error: MediaError): string {
  const tail = error.details.stderrTail;
  return typeof tail === 'string' ? tail : '';
}

function diagnosisArgs(realPath: string): string[] {
  return ['-v', 'error', '-show_entries', DIAGNOSIS_ENTRIES, realPath];
}

function copyAttempt(realPath: string): EncodeAttempt {
  return {
    buildArgs: (outputPath: string): string[] => [
      '-n',
      '-i',
      realPath,
      '-c',
      'copy',
      outputPath,
    ],
  };
}

function reencodeAttempt(diagnosis: Diagnosis, realPath: string): EncodeAttempt {
  if (!hasStreamKind(diagnosis, VIDEO_KIND)) {
    return {
      buildArgs: (outputPath: string): string[] => [
        '-n',
        '-i',
        realPath,
        '-vn',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        outputPath,
      ],
      encoders: AUDIO_ENCODERS,
    };
  }
  const hasAudio = hasStreamKind(diagnosis, AUDIO_KIND);
  return {
    buildArgs: (outputPath: string): string[] => [
      '-n',
      '-i',
      realPath,
      '-c:v',
      'libx264',
      '-crf',
      '23',
      '-preset',
      'medium',
      ...(hasAudio ? VIDEO_AUDIO_FLAGS : []),
      outputPath,
    ],
    encoders: hasAudio ? VIDEO_ENCODERS : VIDEO_ONLY_ENCODERS,
  };
}

function reencodeExtension(diagnosis: Diagnosis): string {
  return hasStreamKind(diagnosis, VIDEO_KIND) ? VIDEO_EXTENSION : AUDIO_EXTENSION;
}

function reencodeWarning(diagnosis: Diagnosis): string {
  return hasStreamKind(diagnosis, VIDEO_KIND)
    ? COPY_FAILED_VIDEO_WARNING
    : COPY_FAILED_AUDIO_WARNING;
}

// A copy can exit 0 and still carry a cut stream, so auto decodes it once before keeping it.
function decodeCheck(context: ToolContext): (outputPath: string, tempDir: string) => Promise<void> {
  return async (outputPath: string, tempDir: string): Promise<void> => {
    const result = await context.runBinary(
      'ffmpeg',
      ['-v', 'error', '-i', outputPath, '-f', 'null', '-'],
      { inputs: [], tempDir },
    );
    if (errorLineCount(result.stderr) === 0) {
      return;
    }
    throw new MediaError(ERROR_CODES.PROCESS_FAILED, 'The stream copy kept decode errors.', {
      binary: 'ffmpeg',
      exitCode: 0,
      signal: null,
      stderrTail: result.stderrTail,
    });
  };
}

function unsupportedDiagnosis(input: ResolvedInput, diagnosis: Diagnosis): MediaError {
  return new MediaError(
    ERROR_CODES.UNSUPPORTED_FORMAT,
    'The diagnosis found no video and no audio stream to repair.',
    {
      path: input.rawPath,
      detected: diagnosis.formatName ?? 'unknown',
      accepted: [...ACCEPTED_KINDS],
    },
  );
}

function scanWriter(stdout: string): Diagnosis {
  const streams: DiagnosisStream[] = [];
  let formatName: string | undefined;
  let durationSeconds: number | undefined;
  let section: WriterSection = 'none';
  let streamType = '';
  let streamCodec = '';
  let streamAttached = false;

  // A damaged file can stop the writer mid-block, so an open block still counts.
  const closeStream = (): void => {
    if (section === 'stream' && streamType.length > 0) {
      const stream: DiagnosisStream = { type: streamType, codecName: streamCodec };
      if (streamAttached) {
        stream.attachedPicture = true;
      }
      streams.push(stream);
    }
    streamType = '';
    streamCodec = '';
    streamAttached = false;
  };

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (line === '[STREAM]') {
      streamType = '';
      streamCodec = '';
      streamAttached = false;
      section = 'stream';
      continue;
    }
    if (line === '[/STREAM]') {
      closeStream();
      section = 'none';
      continue;
    }
    if (line === '[FORMAT]') {
      section = 'format';
      continue;
    }
    if (line === '[/FORMAT]') {
      section = 'none';
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (section === 'format') {
      if (key === 'format_name' && value.length > 0) {
        formatName = value;
      }
      if (key === 'duration') {
        durationSeconds = parsedDuration(value) ?? durationSeconds;
      }
    }
    if (section === 'stream') {
      if (key === 'codec_type' && value.length > 0) {
        streamType = value;
      }
      if (key === 'codec_name') {
        streamCodec = value;
      }
      if (key === ATTACHED_PICTURE_KEY) {
        streamAttached = value === '1';
      }
    }
  }

  closeStream();
  const diagnosis: Diagnosis = { streams };
  if (formatName !== undefined) {
    diagnosis.formatName = formatName;
  }
  if (durationSeconds !== undefined) {
    diagnosis.durationSeconds = durationSeconds;
  }
  return diagnosis;
}

async function diagnose(context: ToolContext, input: ResolvedInput): Promise<Diagnosis> {
  try {
    const result = await context.runBinary('ffprobe', diagnosisArgs(input.realPath), {
      inputs: [input],
      captureStdout: true,
    });
    return parseDiagnosis(result.stdout, result.stderrTail);
  } catch (error: unknown) {
    // A damaged file makes ffprobe exit non-zero, and its stderr is the diagnosis.
    if (isMediaError(error) && error.code === ERROR_CODES.PROCESS_FAILED) {
      return parseDiagnosis('', tailText(error));
    }
    throw error;
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Read what one diagnosis run reported, plus any error text.
 *
 * The `[STREAM]` and `[FORMAT]` blocks of `key=value` lines are ffprobe's
 * default writer layout. A value that did not parse is left out, and partial
 * output is accepted, because a damaged file is the reason the probe ran.
 *
 * @param stdout - Captured stdout of the ffprobe run
 * @param errorText - Sanitized stderr text of that run, empty when it exited zero
 * @returns The format name, duration, readable streams and error excerpt
 */
export function parseDiagnosis(stdout: string, errorText: string): Diagnosis {
  const diagnosis = scanWriter(stdout);
  if (errorText.length > 0) {
    diagnosis.errorExcerpt = errorText;
  }
  return diagnosis;
}

async function runStrategy(
  args: RepairArguments,
  context: ToolContext,
  input: ResolvedInput,
  diagnosis: Diagnosis,
): Promise<RewriteOutcome> {
  const hasVideo = hasStreamKind(diagnosis, VIDEO_KIND);
  const inputExtension = path.extname(input.realPath).toLowerCase();
  const reencode = reencodeAttempt(diagnosis, input.realPath);
  const extension = reencodeExtension(diagnosis);
  const common = {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: hasVideo ? 'video' : 'audio',
    operation: OPERATION,
  } as const;

  if (args.strategy === REMUX_STRATEGY) {
    return {
      output: await runAttempts(context, {
        ...common,
        extension: inputExtension,
        tempName: `${TEMP_STEM}${inputExtension}`,
        upfront: {},
        attempts: [copyAttempt(input.realPath)],
      }),
      pass: REMUX_STRATEGY,
    };
  }

  if (args.strategy === REENCODE_STRATEGY) {
    return {
      output: await runAttempts(context, {
        ...common,
        extension,
        tempName: `${TEMP_STEM}${extension}`,
        upfront: { encoders: reencode.encoders },
        attempts: [reencode],
      }),
      pass: REENCODE_STRATEGY,
    };
  }

  const output = await runAttempts(context, {
    ...common,
    extension: inputExtension,
    tempName: `${TEMP_STEM}${inputExtension}`,
    upfront: {},
    attempts: [
      { ...copyAttempt(input.realPath), check: decodeCheck(context) },
      {
        ...reencode,
        extension,
        warning: reencodeWarning(diagnosis),
      },
    ],
  });
  return {
    output,
    pass: output.attemptUsed === 2 ? REENCODE_STRATEGY : REMUX_STRATEGY,
  };
}

async function runRepair(args: RepairArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const diagnosis = await diagnose(context, input);
  const hasVideo = hasStreamKind(diagnosis, VIDEO_KIND);
  if (!hasVideo && !hasStreamKind(diagnosis, AUDIO_KIND)) {
    throw unsupportedDiagnosis(input, diagnosis);
  }

  const rewrite = await runStrategy(args, context, input, diagnosis);
  const warnings = [...rewrite.output.warnings];
  if (rewrite.pass === REENCODE_STRATEGY && !hasVideo && hasAttachedPicture(diagnosis)) {
    warnings.push(ALBUM_ART_WARNING);
  }
  const baseName = path.basename(input.rawPath);
  const summary = rewrite.pass === REENCODE_STRATEGY
    ? `Repaired ${baseName} by re-encoding.`
    : `Repaired ${baseName} with a stream copy.`;
  return successResult({
    tool: TOOL_NAME,
    text: `${summary} Output saved to ${rewrite.output.entry.path}.`,
    outputs: [rewrite.output.entry],
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras: {
      diagnosis,
      repair: {
        strategy: args.strategy,
        pass: rewrite.pass,
        outputPath: rewrite.output.entry.path,
        bytes: rewrite.output.entry.bytes,
      },
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Diagnoses a damaged media file with ffprobe, then rewrites it with a matching pass. */
export const mediaRepairTool = defineTool({
  name: TOOL_NAME,
  title: 'Repair media',
  description:
    'Diagnoses a damaged or partly readable video or audio file with ffprobe, then rewrites it '
    + 'with a matching ffmpeg pass: remux copies the streams into a fresh container, which '
    + 'repairs a missing or broken index or timestamp table; reencode rebuilds the streams as '
    + 'H.264 and AAC (AAC alone for audio), which repairs damaged or cut-short streams. It '
    + 'writes one new file into a new numbered folder and never changes the input. Run time '
    + 'grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, '
    + 'and minutes to tens of minutes above 1 GB.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the damaged or partly readable video or audio file to read, '
        + 'inside an allowed root. The file is not changed.',
      ),
    outputName: outputNameField,
    strategy: z
      .enum(['auto', 'remux', 'reencode'])
      .default('auto')
      .describe(
        'How the file is rewritten. remux copies the streams into a fresh container, which '
        + 'repairs a missing or broken index or timestamp table; reencode rebuilds the streams '
        + 'as H.264 and AAC (AAC alone for audio), which repairs damaged or cut-short streams; '
        + 'auto copies first, decodes the copy once, and re-encodes when the copy fails or '
        + 'still has decode errors. Defaults to auto.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runRepair(args, context);
  },
});
