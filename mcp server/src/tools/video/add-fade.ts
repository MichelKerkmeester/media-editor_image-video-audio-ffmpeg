// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Fade
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  probeMedia,
  requireVideoStream,
} from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MediaProperties } from '../../core/media-properties.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { EncodeAttempt, UpfrontNames } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Canonical fade directions a filter can be built for. */
export type FadeDirection = 'fade_in' | 'fade_out';

/** Every fade value the schema accepts, aliases included. */
type FadeChoice = FadeDirection | 'crossfade_from_black' | 'crossfade_to_black';

/** Arguments that passed the schema checks. */
interface FadeArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly fadeType: FadeChoice;
  readonly duration: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_add_fade';

const FADE_EXTENSION = '.mp4';
const FADE_TEMP_NAME = 'fade.mp4';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const VIDEO_ENCODERS = [VIDEO_ENCODER] as const;
const AUDIO_ENCODERS = [AUDIO_ENCODER] as const;
const FADE_FILTERS = ['fade'] as const;

const UPFRONT_NAMES: UpfrontNames = {
  encoders: VIDEO_ENCODERS,
  filters: FADE_FILTERS,
};

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const ROUND_SCALE = 1000;

const FADE_TYPES = [
  'fade_in',
  'fade_out',
  'crossfade_from_black',
  'crossfade_to_black',
] as const satisfies readonly FadeChoice[];

const CANONICAL_TYPES: Readonly<Record<FadeChoice, FadeDirection>> = {
  fade_in: 'fade_in',
  fade_out: 'fade_out',
  crossfade_from_black: 'fade_in',
  crossfade_to_black: 'fade_out',
};

const FADE_OPERATIONS: Readonly<Record<FadeDirection, string>> = {
  fade_in: 'fade-in',
  fade_out: 'fade-out',
};

const FADE_WORDS: Readonly<Record<FadeDirection, string>> = {
  fade_in: 'in',
  fade_out: 'out',
};

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const FADE_TYPE_DESCRIPTION =
  'Which end fades: fade_in brings the picture up from black at the start '
  + 'and fade_out takes it down to black at the end.';

const DURATION_DESCRIPTION =
  'Length of the fade in seconds. Use a value greater than 0 and no longer '
  + 'than the video itself.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function normalizeFadeType(value: FadeChoice): FadeDirection {
  return CANONICAL_TYPES[value];
}

function roundSeconds(value: number): number {
  return Math.round(value * ROUND_SCALE) / ROUND_SCALE;
}

/**
 * Return the probed duration once the fade is known to fit inside it.
 *
 * A fade longer than the picture is refused rather than clipped silently,
 * and a file whose probe reported no duration cannot place a fade at all.
 *
 * @param duration - Fade length in seconds from the caller
 * @param input - Accepted input a failure should name
 * @param properties - Properties from a probe of that input
 * @returns The video duration in seconds
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when no duration could be read
 * @throws {@link MediaError} `INVALID_INPUT` when the fade is longer than the video
 */
function checkedTotal(
  duration: number,
  input: ResolvedInput,
  properties: MediaProperties,
): number {
  const total = properties.durationSeconds;
  if (total === undefined) {
    throw new MediaError(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      'This video has no readable duration.',
      {
        path: input.rawPath,
        detected: 'unknown-duration',
        accepted: ['video'],
      },
    );
  }
  if (duration > total) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The fade is longer than the video.',
      {
        parameter: 'duration',
        value: duration,
        reason: 'longer-than-video',
      },
    );
  }
  return total;
}

function fadeArgs(
  realPath: string,
  filter: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-vf',
    filter,
    '-c:v',
    VIDEO_ENCODER,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

function fadeAttempts(
  realPath: string,
  filter: string,
): readonly [EncodeAttempt, EncodeAttempt] {
  return [
    {
      buildArgs(outputPath: string): string[] {
        return fadeArgs(realPath, filter, 'copy', outputPath);
      },
    },
    {
      encoders: AUDIO_ENCODERS,
      warning: AUDIO_COPY_WARNING,
      buildArgs(outputPath: string): string[] {
        return fadeArgs(realPath, filter, 'aac', outputPath);
      },
    },
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build the fade filter for one direction and duration.
 *
 * A fade in always starts at zero; a fade out starts at the total length
 * minus the fade, so it ends with the video. Numbers are rounded to
 * milliseconds before they become filter text.
 *
 * @param type - Canonical fade direction
 * @param duration - Fade length in seconds
 * @param total - Video duration in seconds
 * @returns The filter text, for example `fade=t=out:st=8:d=2`
 */
export function fadeFilter(type: FadeDirection, duration: number, total: number): string {
  const length = String(roundSeconds(duration));
  if (type === 'fade_in') {
    return `fade=t=in:st=0:d=${length}`;
  }
  return `fade=t=out:st=${String(roundSeconds(total - duration))}:d=${length}`;
}

async function runAddFade(args: FadeArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const direction = normalizeFadeType(args.fadeType);
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const total = checkedTotal(args.duration, input, properties);
  const filter = fadeFilter(direction, args.duration, total);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: FADE_OPERATIONS[direction],
    extension: FADE_EXTENSION,
    tempName: FADE_TEMP_NAME,
    upfront: UPFRONT_NAMES,
    attempts: fadeAttempts(input.realPath, filter),
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text: `Added a ${String(args.duration)}-second fade ${FADE_WORDS[direction]} `
      + `to ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Adds one fade from or to black and leaves the input unchanged. */
export const videoAddFadeTool = defineTool({
  name: TOOL_NAME,
  title: 'Add a fade',
  description:
    'Adds one fade from black at the start or one fade to black at the end of '
    + 'a video. It writes one new MP4 file into a new numbered folder and never '
    + 'changes the input. The picture is re-encoded, so run time grows with file '
    + 'size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and '
    + 'minutes to tens of minutes above 1 GB.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    fadeType: z.enum(FADE_TYPES).describe(FADE_TYPE_DESCRIPTION),
    duration: z.number().gt(0).describe(DURATION_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runAddFade(args, context);
  },
});
