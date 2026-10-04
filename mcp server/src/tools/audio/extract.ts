// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Extract
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import {
  EXTRACT_CODEC_EXTENSIONS,
  EXTRACT_CODEC_VALUES,
  normalizeExtractCodec,
} from '../../core/media-containers.js';
import { probeMedia, requireAudioStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ExtractCodecValue } from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the schema default for the encoder is applied. */
interface ExtractArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly audioCodec: ExtractCodecValue;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'audio_extract';
const AUDIO_OPERATION = 'audio';

const AUDIO_CODEC_DESCRIPTION =
  'Audio encoder. libmp3lame writes an .mp3 file, aac writes an .m4a file, '
  + 'libvorbis writes an .ogg file, flac writes a .flac file, '
  + 'and pcm_s16le writes a .wav file. Defaults to libmp3lame.';

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runExtract(
  args: ExtractArguments,
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
  requireAudioStream(input, properties);
  const codec = normalizeExtractCodec(args.audioCodec);
  const extension = EXTRACT_CODEC_EXTENSIONS[codec];
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'audio',
    operation: AUDIO_OPERATION,
    extension,
    tempName: `extracted${extension}`,
    upfront: { encoders: [codec] },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return ['-n', '-i', input.realPath, '-vn', '-c:a', codec, outputPath];
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text: `Extracted audio from ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Extracts one audio track into a new file and leaves the input unchanged. */
export const audioExtractTool = defineTool({
  name: TOOL_NAME,
  title: 'Extract audio',
  description:
    'Extracts the audio track from a video or audio file into a file of its own. '
    + 'It writes that file in the export root, or a numbered folder on request, and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the video or audio file to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    outputName: outputNameField,
    audioCodec: z
      .enum(EXTRACT_CODEC_VALUES)
      .default('libmp3lame')
      .describe(AUDIO_CODEC_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runExtract(args, context);
  },
});
