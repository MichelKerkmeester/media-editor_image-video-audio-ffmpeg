// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Audio Channels
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { probeMedia, requireAudioStream, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { channelsField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the channel-count field has passed its shape check. */
interface ChannelsArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly channels: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_audio_channels';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'audio-channels.mp4';

const UPFRONT_ENCODERS = ['aac'] as const;
const PICTURE_FALLBACK_ENCODERS = ['libx264'] as const;

const PICTURE_FALLBACK_WARNING =
  'The picture could not be copied into MP4, so it was re-encoded with libx264.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const CHANNELS_DESCRIPTION =
  'Target channel count from 1 to 8. 1 is mono and 2 is stereo.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function audioChannelsArgs(
  realPath: string,
  pictureCodec: string,
  channels: number,
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
    '-ac',
    String(channels),
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetAudioChannels(
  args: ChannelsArguments,
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
    operation: `audio-${String(args.channels)}ch`,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: UPFRONT_ENCODERS },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return audioChannelsArgs(input.realPath, 'copy', args.channels, outputPath);
        },
      },
      {
        encoders: PICTURE_FALLBACK_ENCODERS,
        warning: PICTURE_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return audioChannelsArgs(input.realPath, 'libx264', args.channels, outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the audio channel count of ${baseName} to ${String(args.channels)}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video's audio track at a target channel count and leaves the input unchanged. */
export const videoSetAudioChannelsTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video audio channels',
  description:
    'Re-encodes the audio track of one video at a target channel count, '
    + 'copying the picture when it can. It writes the file in the export '
    + 'root, in a new numbered folder when subfolder is true, or in the '
    + 'existing folder named by targetFolder, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    channels: channelsField(CHANNELS_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetAudioChannels(args, context);
  },
});
