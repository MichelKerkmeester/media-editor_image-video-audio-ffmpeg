// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Speed
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments that passed the schema checks. */
interface SetSpeedArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly speedFactor: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_speed';

const SPEED_EXTENSION = '.mp4';
const SPEED_TEMP_NAME = 'speed.mp4';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const SPEED_ENCODERS = [VIDEO_ENCODER, AUDIO_ENCODER] as const;

const VIDEO_FILTERS = ['setpts'] as const;
const VIDEO_AUDIO_FILTERS = ['setpts', 'atempo'] as const;

// One atempo instance only accepts this band, so the chain repeats outside it.
const ATEMPO_MIN = 0.5;
const ATEMPO_MAX = 2;

// A leftover inside these bounds still needs its own instance; the bounds
// leave room for floating-point residue.
const SLOW_TAIL_LIMIT = 0.99;
const FAST_TAIL_LIMIT = 1.01;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

// An integer value still needs its decimal point, the form atempo prints back.
function tempoText(value: number): string {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

function speedArgs(
  realPath: string,
  factor: number,
  hasAudio: boolean,
  outputPath: string,
): string[] {
  const args = ['-n', '-i', realPath, '-filter:v', setptsFilter(factor)];
  if (hasAudio) {
    args.push('-filter:a', atempoChain(factor));
  }
  args.push('-c:v', VIDEO_ENCODER, '-c:a', AUDIO_ENCODER, outputPath);
  return args;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * The picture filter that rescales timestamps to the given factor.
 *
 * @param factor - Playback speed multiplier, greater than 0
 * @returns The filter text, `setpts=0.5*PTS` for 2 and `setpts=2*PTS` for 0.5
 */
export function setptsFilter(factor: number): string {
  return `setpts=${String(1 / factor)}*PTS`;
}

/**
 * The audio filter chain one stream needs for the given factor.
 *
 * One atempo instance accepts 0.5 to 2, so a faster factor repeats
 * `atempo=2.0` and a slower one repeats `atempo=0.5` until the leftover
 * factor fits the band and gets an instance of its own.
 *
 * @param factor - Playback speed multiplier, greater than 0
 * @returns Comma-joined atempo filters, `atempo=2.0,atempo=1.5` for 3
 */
export function atempoChain(factor: number): string {
  const parts: string[] = [];
  let remainder = factor;
  if (remainder < ATEMPO_MIN) {
    while (remainder < ATEMPO_MIN) {
      parts.push(`atempo=${tempoText(ATEMPO_MIN)}`);
      remainder *= 2;
    }
    if (remainder < SLOW_TAIL_LIMIT) {
      parts.push(`atempo=${tempoText(remainder)}`);
    }
  } else if (remainder > ATEMPO_MAX) {
    while (remainder > ATEMPO_MAX) {
      parts.push(`atempo=${tempoText(ATEMPO_MAX)}`);
      remainder /= 2;
    }
    if (remainder > FAST_TAIL_LIMIT) {
      parts.push(`atempo=${tempoText(remainder)}`);
    }
  } else {
    parts.push(`atempo=${tempoText(remainder)}`);
  }
  return parts.join(',');
}

async function runSetSpeed(
  args: SetSpeedArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const factor = args.speedFactor;
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: String(factor) + 'x',
    extension: SPEED_EXTENSION,
    tempName: SPEED_TEMP_NAME,
    upfront: {
      encoders: SPEED_ENCODERS,
      filters: properties.hasAudio ? VIDEO_AUDIO_FILTERS : VIDEO_FILTERS,
    },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return speedArgs(input.realPath, factor, properties.hasAudio, outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Changed the speed of ${baseName} by ${String(factor)}x. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Changes how fast a video plays and leaves the input unchanged. */
export const videoSetSpeedTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video speed',
  description:
    'Changes how fast a video plays, speeding the picture up or slowing it down '
    + 'while the audio tempo follows the same factor. It writes the result as an '
    + 'MP4 file in a new numbered folder and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the video to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    outputName: outputNameField,
    speedFactor: z
      .number()
      .gt(0)
      .max(100)
      .describe(
        'Playback speed multiplier. 2 doubles the speed and 0.5 halves it. '
        + 'Use a value greater than 0 and at most 100.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetSpeed(args, context);
  },
});
