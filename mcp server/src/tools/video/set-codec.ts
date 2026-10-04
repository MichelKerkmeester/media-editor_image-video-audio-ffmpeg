// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Codec
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import {
  VIDEO_CODEC_VALUES,
  normalizeVideoCodec,
} from '../../core/media-containers.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VideoCodecValue } from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the codec field has passed its shape check. */
interface CodecArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly codec: VideoCodecValue;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_codec';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'reencoded.mp4';

const FALLBACK_ENCODERS = ['aac'] as const;

const AUDIO_FALLBACK_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const CODEC_DESCRIPTION =
  'Video encoder. libx264, libx265, or libvpx-vp9.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function codecArgs(
  realPath: string,
  codec: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    codec,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetCodec(
  args: CodecArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const codec = normalizeVideoCodec(args.codec);
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
    operation: codec,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: [codec] },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return codecArgs(input.realPath, codec, 'copy', outputPath);
        },
      },
      {
        encoders: FALLBACK_ENCODERS,
        warning: AUDIO_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return codecArgs(input.realPath, codec, 'aac', outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the video codec of ${baseName} to ${codec}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video picture with a named encoder and leaves the input unchanged. */
export const videoSetCodecTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video codec',
  description:
    'Re-encodes the picture of one video as libx264, libx265, or '
    + 'libvpx-vp9. It writes the file in the export root, or a numbered folder on request, and never '
    + 'changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    codec: z.enum(VIDEO_CODEC_VALUES).describe(CODEC_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetCodec(args, context);
  },
});
