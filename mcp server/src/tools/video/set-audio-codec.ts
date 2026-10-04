// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Audio Codec
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import {
  VIDEO_AUDIO_CODEC_VALUES,
  normalizeVideoAudioCodec,
} from '../../core/media-containers.js';
import {
  probeMedia,
  requireAudioStream,
  requireVideoStream,
} from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VideoAudioCodecValue } from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the audio codec field has passed its shape check. */
interface AudioCodecArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly audioCodec: VideoAudioCodecValue;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_audio_codec';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'audio-codec.mp4';

const PICTURE_FALLBACK_ENCODERS = ['libx264'] as const;

const PICTURE_FALLBACK_WARNING =
  'The picture could not be copied into MP4, so it was re-encoded with libx264.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const AUDIO_CODEC_DESCRIPTION = 'Audio encoder. aac, libmp3lame, or libopus.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function audioCodecArgs(
  realPath: string,
  pictureCodec: string,
  audioCodec: string,
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    pictureCodec,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetAudioCodec(
  args: AudioCodecArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const codec = normalizeVideoAudioCodec(args.audioCodec);
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
    operation: `audio-${codec}`,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: [codec] },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return audioCodecArgs(input.realPath, 'copy', codec, outputPath);
        },
      },
      {
        encoders: PICTURE_FALLBACK_ENCODERS,
        warning: PICTURE_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return audioCodecArgs(input.realPath, 'libx264', codec, outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the audio codec of ${baseName} to ${codec}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video's audio track with a named encoder and leaves the input unchanged. */
export const videoSetAudioCodecTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video audio codec',
  description:
    'Re-encodes the audio track of one video as aac, libmp3lame, or libopus, '
    + 'copying the picture when it can. It writes the file in a new numbered '
    + 'folder and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    audioCodec: z.enum(VIDEO_AUDIO_CODEC_VALUES).describe(AUDIO_CODEC_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetAudioCodec(args, context);
  },
});
