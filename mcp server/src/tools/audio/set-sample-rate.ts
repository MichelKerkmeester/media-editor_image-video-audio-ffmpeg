// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Set Sample Rate
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
import { sampleRateField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a sample-rate re-encode that keeps the input container. */
interface SetSampleRateArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly sampleRate: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'audio_set_sample_rate';
const SAMPLE_RATE_OPERATION = 'sample-rate';

const SAMPLE_RATE_DESCRIPTION =
  'Target sample rate in hertz, from 8000 to 384000.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the audio or video file to read, inside an allowed root. '
  + 'The file is not changed. A video keeps its sound and drops the picture.';

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetSampleRate(
  args: SetSampleRateArguments,
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
    operation: SAMPLE_RATE_OPERATION,
    extension: container.extension,
    tempName: `sample-rate${container.extension}`,
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
            '-ar',
            String(args.sampleRate),
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
      `Set the sample rate of ${baseName} to ${String(args.sampleRate)} Hz. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one audio file at a target sample rate and leaves the input unchanged. */
export const audioSetSampleRateTool = defineTool({
  name: TOOL_NAME,
  title: 'Set audio sample rate',
  description:
    'Re-encodes one audio file at a target sample rate. '
    + 'It writes that file in the export root, or a numbered folder on request, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    sampleRate: sampleRateField(SAMPLE_RATE_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetSampleRate(args, context);
  },
});
