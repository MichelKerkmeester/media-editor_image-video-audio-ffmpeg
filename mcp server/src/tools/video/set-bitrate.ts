// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Bitrate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { bitrateField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the bitrate field has passed its shape check. */
interface BitrateArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly videoBitrate: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_bitrate';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'bitrate.mp4';

const UPFRONT_ENCODERS = ['libx264'] as const;
const FALLBACK_ENCODERS = ['aac'] as const;

const AUDIO_FALLBACK_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const BITRATE_DESCRIPTION =
  'Video bitrate from 1k to 100M, for example 2M. '
  + 'k is 1000 bit/s and M is 1000000 bit/s.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function bitrateArgs(
  realPath: string,
  videoBitrate: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    'libx264',
    '-b:v',
    videoBitrate,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetBitrate(
  args: BitrateArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
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
    operation: args.videoBitrate,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: UPFRONT_ENCODERS },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return bitrateArgs(input.realPath, args.videoBitrate, 'copy', outputPath);
        },
      },
      {
        encoders: FALLBACK_ENCODERS,
        warning: AUDIO_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return bitrateArgs(input.realPath, args.videoBitrate, 'aac', outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the video bitrate of ${baseName} to ${args.videoBitrate}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video at a target bitrate and leaves the input unchanged. */
export const videoSetBitrateTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video bitrate',
  description:
    'Re-encodes the picture of one video at a target bitrate. It writes '
    + 'the file in a new numbered folder and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    videoBitrate: bitrateField(BITRATE_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetBitrate(args, context);
  },
});
