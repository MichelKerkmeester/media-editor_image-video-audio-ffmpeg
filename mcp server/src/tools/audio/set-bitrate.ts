// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Set Bitrate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { requireAudioContainer } from '../../core/media-containers.js';
import { probeMedia, requireAudioStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { bitrateField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a bitrate re-encode that keeps the input container. */
interface SetBitrateArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly audioBitrate: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'audio_set_bitrate';
const BITRATE_OPERATION = 'bitrate';

const BITRATE_DESCRIPTION =
  'Target bitrate from 1k to 100M. k is 1000 bit/s and M is 1000000 bit/s.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the audio or video file to read, inside an allowed root. '
  + 'The file is not changed. A video keeps its sound and drops the picture.';

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetBitrate(
  args: SetBitrateArguments,
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
  const container = requireAudioContainer(input, properties);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'audio',
    operation: BITRATE_OPERATION,
    extension: container.extension,
    tempName: `bitrate${container.extension}`,
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
            '-b:a',
            args.audioBitrate,
            outputPath,
          ];
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the bitrate of ${baseName} to ${args.audioBitrate}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one audio file at a target bitrate and leaves the input unchanged. */
export const audioSetBitrateTool = defineTool({
  name: TOOL_NAME,
  title: 'Set audio bitrate',
  description:
    'Re-encodes one audio file at a target bitrate. '
    + 'It writes that file in a new numbered folder and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    audioBitrate: bitrateField(BITRATE_DESCRIPTION),
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
