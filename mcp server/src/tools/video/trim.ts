// ───────────────────────────────────────────────────────────────────
// MODULE: Video Trim
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { formatSeconds, requireSeconds } from '../../core/time-parse.js';
import { outputNameField } from '../../server/field-schemas.js';
import { timeField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after each time field has passed its own shape check. */
interface TrimArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly startTime: number | string;
  readonly endTime: number | string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_trim';
const TRIM_OPERATION = 'trimmed';
const TRIM_EXTENSION = '.mp4';
const TRIM_TEMP_NAME = 'trimmed.mp4';

const COPY_CODECS = ['-c', 'copy'] as const;
const FALLBACK_CODECS = ['-c:v', 'libx264', '-c:a', 'aac'] as const;
const FALLBACK_ENCODERS = ['libx264', 'aac'] as const;
const FALLBACK_WARNING =
  'The streams could not be copied into MP4, so the cut was re-encoded with libx264 and aac.';

const TIME_FORMS =
  'Accepts a number of seconds, a plain numeric string, HH:MM:SS, '
  + 'HH:MM:SS.mmm, or MM:SS. An end past the end of the file means the end '
  + 'of the file.';

const START_TIME_DESCRIPTION = `When the cut starts, in seconds. ${TIME_FORMS}`;
const END_TIME_DESCRIPTION = `When the cut ends, in seconds. ${TIME_FORMS}`;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Build one trim argv with `-ss` and `-to` as input options before `-i`.
 *
 * @param realPath - Resolved input path
 * @param start - Start in seconds, already formatted
 * @param end - End in seconds, already formatted
 * @param codecs - Codec flags of the attempt
 * @param outputPath - Temp file the attempt writes
 * @returns The full argv, one element per token
 */
export function trimArgs(
  realPath: string,
  start: string,
  end: string,
  codecs: readonly string[],
  outputPath: string,
): string[] {
  return ['-n', '-ss', start, '-to', end, '-i', realPath, ...codecs, outputPath];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runTrim(
  args: TrimArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const start = requireSeconds(args.startTime, 'startTime');
  const end = requireSeconds(args.endTime, 'endTime');
  if (start >= end) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The end time must be later than the start time.',
      {
        parameter: 'endTime',
        value: args.endTime,
        reason: 'end-not-after-start',
      },
    );
  }
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const startText = formatSeconds(start);
  const endText = formatSeconds(end);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: TRIM_OPERATION,
    extension: TRIM_EXTENSION,
    tempName: TRIM_TEMP_NAME,
    upfront: {},
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return trimArgs(input.realPath, startText, endText, COPY_CODECS, outputPath);
        },
      },
      {
        encoders: FALLBACK_ENCODERS,
        warning: FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return trimArgs(
            input.realPath,
            startText,
            endText,
            FALLBACK_CODECS,
            outputPath,
          );
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Trimmed ${baseName} from ${startText} to ${endText} seconds. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Cuts one video to a time span and leaves the input unchanged. */
export const videoTrimTool = defineTool({
  name: TOOL_NAME,
  title: 'Trim video',
  description:
    'Cuts one video to the span between two times. A stream copy is tried first, '
    + 'and the video is re-encoded only when that copy cannot be stored. It writes '
    + 'the file in a new numbered folder and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the video to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    outputName: outputNameField,
    startTime: timeField(START_TIME_DESCRIPTION),
    endTime: timeField(END_TIME_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runTrim(args, context);
  },
});
