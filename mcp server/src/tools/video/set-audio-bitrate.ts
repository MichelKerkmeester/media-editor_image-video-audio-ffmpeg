// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Audio Bitrate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { probeMedia, requireAudioStream, requireVideoStream } from '../../core/media-properties.js';
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
  readonly audioBitrate: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_audio_bitrate';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'audio-bitrate.mp4';

const UPFRONT_ENCODERS = ['aac'] as const;
const PICTURE_FALLBACK_ENCODERS = ['libx264'] as const;

const PICTURE_FALLBACK_WARNING =
  'The picture could not be copied into MP4, so it was re-encoded with libx264.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const AUDIO_BITRATE_DESCRIPTION =
  'Audio bitrate from 1k to 100M, for example 128k or 192k. '
  + 'k is 1000 bit/s and M is 1000000 bit/s.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function audioBitrateArgs(
  realPath: string,
  pictureCodec: string,
  audioBitrate: string,
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    pictureCodec,
    '-c:a',
    'aac',
    '-b:a',
    audioBitrate,
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetAudioBitrate(
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
  requireAudioStream(input, properties);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: `audio-${args.audioBitrate}`,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: UPFRONT_ENCODERS },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return audioBitrateArgs(input.realPath, 'copy', args.audioBitrate, outputPath);
        },
      },
      {
        encoders: PICTURE_FALLBACK_ENCODERS,
        warning: PICTURE_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return audioBitrateArgs(input.realPath, 'libx264', args.audioBitrate, outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the audio bitrate of ${baseName} to ${args.audioBitrate}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video's audio track at a target bitrate and leaves the input unchanged. */
export const videoSetAudioBitrateTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video audio bitrate',
  description:
    'Re-encodes the audio track of one video at a target bitrate, '
    + 'copying the picture when it can. It writes the file in a new numbered '
    + 'folder and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    audioBitrate: bitrateField(AUDIO_BITRATE_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetAudioBitrate(args, context);
  },
});
