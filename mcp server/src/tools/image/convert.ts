// ───────────────────────────────────────────────────────────────────
// MODULE: Image Convert
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import {
  OUTPUT_FORMAT_VALUES,
  normalizeFormat,
  openImage,
  outputSentence,
  readImageMetadata,
  writeImageOutputs,
} from './sharp-output.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Sharp } from 'sharp';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type {
  EncoderFormat,
  OutputFormatValue,
  PlannedImage,
  WrittenImages,
} from './sharp-output.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the schema default for quality is applied. */
interface ConvertArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly format: OutputFormatValue;
  readonly quality: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_convert';
const CONVERT_OPERATION = 'converted';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function encode(
  image: Sharp,
  format: EncoderFormat,
  quality: number,
): Sharp {
  if (format === 'jpeg') {
    return image.jpeg({ quality, progressive: true });
  }
  if (format === 'png') {
    return image.png({ quality });
  }
  if (format === 'webp') {
    return image.webp({ quality });
  }
  return image.avif({ quality });
}

function convertPlan(
  input: ResolvedInput,
  format: EncoderFormat,
  quality: number,
): PlannedImage {
  // The source format is ignored so a same-format call still re-encodes.
  return {
    operation: CONVERT_OPERATION,
    pipeline: (): Sharp => encode(openImage(input), format, quality),
  };
}

function convertText(
  baseName: string,
  format: EncoderFormat,
  written: WrittenImages,
): string {
  return `Converted ${baseName} to ${format}. ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runConvert(
  args: ConvertArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const format = normalizeFormat(args.format);
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  await readImageMetadata(input);
  const written = await writeImageOutputs(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    plans: [convertPlan(input, format, args.quality)],
  });
  return successResult({
    tool: TOOL_NAME,
    text: convertText(path.basename(input.rawPath), format, written),
    outputs: written.images.map((image) => image.entry),
    warnings: written.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Convert one image into the export root, or a numbered folder on request, without changing the input. */
export const imageConvertTool = defineTool({
  name: TOOL_NAME,
  title: 'Convert an image',
  description:
    'Converts one image to jpeg, png, webp, or avif. '
    + 'Quality from 1 to 100 is visual quality for jpeg, webp, and avif, '
    + 'and the palette colour target for png. '
    + 'It writes one re-encoded file in the export root, or a numbered folder on request, '
    + 'and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the image to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    outputName: outputNameField,
    format: z
      .enum(OUTPUT_FORMAT_VALUES)
      .describe(
        'Target format: jpeg, png, webp, or avif.',
      ),
    quality: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(80)
      .describe(
        'Quality from 1 to 100 on the sharp scale, higher is better. '
        + 'It is visual quality for jpeg, webp, and avif, '
        + 'and the palette colour target for png. Defaults to 80.',
      ),
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
