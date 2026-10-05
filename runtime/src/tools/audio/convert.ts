// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Convert
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import {
  AUDIO_CONTAINERS,
  AUDIO_FORMAT_VALUES,
  normalizeAudioFormat,
} from '../../core/media-containers.js';
import { probeMedia, requireAudioStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AudioFormatValue } from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a container-only audio conversion. */
interface ConvertArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly format: AudioFormatValue;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'audio_convert';
const AUDIO_OPERATION = 'converted';

const FORMAT_DESCRIPTION = 'Audio container. mp3, wav, m4a, flac, or ogg.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the audio or video file to read, inside an allowed root. '
  + 'The file is not changed. A video keeps its sound and drops the picture.';

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runConvert(
  args: ConvertArguments,
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
  const container = AUDIO_CONTAINERS[normalizeAudioFormat(args.format)];
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'audio',
    operation: AUDIO_OPERATION,
    extension: container.extension,
    tempName: `converted${container.extension}`,
    upfront: { encoders: [container.encoder] },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return [
            '-n',
            '-i',
            input.realPath,
            '-vn',
            '-c:a',
            container.encoder,
            '-f',
            container.muxer,
            outputPath,
          ];
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text: `Converted ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Changes an audio container and leaves the input file unchanged. */
export const audioConvertTool = defineTool({
  name: TOOL_NAME,
  title: 'Convert audio',
  description:
    'Changes the container of one audio file. '
    + 'It writes that file in the export root, in a new numbered folder '
    + 'when subfolder is true, or in the existing folder named by '
    + 'targetFolder, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    format: z.enum(AUDIO_FORMAT_VALUES).describe(FORMAT_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runConvert(args, context);
  },
});
