// ───────────────────────────────────────────────────────────────────
// MODULE: Image Convert
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
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
  readonly maxBytes?: number;
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

/**
 * Highest quality whose encoded buffer stays within `maxBytes`.
 *
 * Sharp encoding is deterministic, so the file later written at the returned
 * quality has the size measured here. The search encodes to buffers only,
 * so a failure creates no folder and writes no file.
 */
async function fitWithinMaxBytes(
  input: ResolvedInput,
  format: EncoderFormat,
  quality: number,
  maxBytes: number,
): Promise<number> {
  const encodedSize = async (value: number): Promise<number> => (
    await encode(openImage(input), format, value).toBuffer()
  ).length;
  if (await encodedSize(quality) <= maxBytes) {
    return quality;
  }
  const smallestBytes = await encodedSize(1);
  if (smallestBytes > maxBytes) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      `${path.basename(input.rawPath)} cannot fit in ${maxBytes} bytes as ${format}: even quality 1 needs ${smallestBytes} bytes.`,
      {
        parameter: 'maxBytes',
        reason: 'max-bytes-unreachable',
        maxBytes,
        smallestBytes,
        format,
      },
    );
  }
  let fits = 1;
  let tooBig = quality;
  while (tooBig - fits > 1) {
    const mid = fits + Math.floor((tooBig - fits) / 2);
    if (await encodedSize(mid) <= maxBytes) {
      fits = mid;
    } else {
      tooBig = mid;
    }
  }
  return fits;
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
  if (args.maxBytes !== undefined && format === 'png') {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'maxBytes applies to jpeg, webp and avif, not png.',
      { parameter: 'maxBytes', reason: 'max-bytes-format', format: 'png' },
    );
  }
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  await readImageMetadata(input);
  const quality = args.maxBytes === undefined
    ? args.quality
    : await fitWithinMaxBytes(input, format, args.quality, args.maxBytes);
  const written = await writeImageOutputs(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    plans: [convertPlan(input, format, quality)],
  });
  const warnings: string[] = [];
  let extras: Record<string, unknown> | undefined;
  if (args.maxBytes !== undefined && quality !== args.quality) {
    warnings.push(
      `Quality lowered from ${args.quality} to ${quality} to fit maxBytes ${args.maxBytes}.`,
    );
    extras = { quality, maxBytes: args.maxBytes };
  }
  warnings.push(...written.warnings);
  return successResult({
    tool: TOOL_NAME,
    text: convertText(path.basename(input.rawPath), format, written),
    outputs: written.images.map((image) => image.entry),
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Convert one image into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, without changing the input. */
export const imageConvertTool = defineTool({
  name: TOOL_NAME,
  title: 'Convert an image',
  description:
    'Converts one image to jpeg, png, webp, or avif. '
    + 'Quality from 1 to 100 is visual quality for jpeg, webp, and avif, '
    + 'and the palette colour target for png. '
    + 'maxBytes caps the file size for jpeg, webp, and avif by lowering '
    + 'quality, never by resizing. '
    + 'It writes one re-encoded file in the export root, in a new numbered '
    + 'folder when subfolder is true, or in the existing folder named by '
    + 'targetFolder, and never changes the input.',
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
    maxBytes: z
      .number()
      .int()
      .min(1)
      .max(100_000_000)
      .optional()
      .describe(
        'Largest allowed file size in bytes, for jpeg, webp and avif only. '
        + '100 KB is 100000 bytes. The tool lowers quality from the quality '
        + 'value toward 1 until the file fits, never resizes, and fails '
        + 'without writing when even quality 1 is too large.',
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
