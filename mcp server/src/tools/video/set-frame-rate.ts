// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Frame Rate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { frameRateField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the frame-rate field has passed its shape check. */
interface FrameRateArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly frameRate: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_frame_rate';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'framerate.mp4';

const UPFRONT_ENCODERS = ['libx264'] as const;
const FALLBACK_ENCODERS = ['aac'] as const;

const AUDIO_FALLBACK_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const FRAME_RATE_DESCRIPTION =
  'Frame rate in frames per second, greater than 0 and at most 240.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function frameRateArgs(
  realPath: string,
  frameRate: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    'libx264',
    '-r',
    frameRate,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetFrameRate(
  args: FrameRateArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const frameRate = String(args.frameRate);
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: `${frameRate}fps`,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: UPFRONT_ENCODERS },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return frameRateArgs(input.realPath, frameRate, 'copy', outputPath);
        },
      },
      {
        encoders: FALLBACK_ENCODERS,
        warning: AUDIO_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return frameRateArgs(input.realPath, frameRate, 'aac', outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the frame rate of ${baseName} to ${frameRate} fps. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video at a target frame rate and leaves the input unchanged. */
export const videoSetFrameRateTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video frame rate',
  description:
    'Re-encodes the picture of one video at a target frame rate. It writes '
    + 'the file in a new numbered folder and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    frameRate: frameRateField(FRAME_RATE_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetFrameRate(args, context);
  },
});
