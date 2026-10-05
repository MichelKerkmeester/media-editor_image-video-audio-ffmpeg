// ───────────────────────────────────────────────────────────────────
// MODULE: Image Batch Resize
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

/** One requested size. An omitted height keeps the aspect ratio. */
interface SizeEntry {
  readonly width: number;
  readonly height?: number;
  readonly suffix: string;
}

/** Arguments after the schema has accepted the list. */
interface BatchResizeArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly sizes: readonly SizeEntry[];
  readonly format?: OutputFormatValue;
}

/** Sharp resize options for this tool. Height is left off when omitted. */
interface CoverResize {
  readonly width: number;
  readonly height?: number;
  readonly fit: 'cover';
  readonly withoutEnlargement: true;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_batch_resize';
const FIXED_QUALITY = 80;

const SUFFIX_PATTERN = /^[a-z0-9]([a-z0-9_-]{0,14}[a-z0-9])?$/u;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function assertUniqueSuffixes(sizes: readonly SizeEntry[]): void {
  // A field schema cannot compare two entries, so the handler does.
  const seen = new Set<string>();
  for (const size of sizes) {
    if (seen.has(size.suffix)) {
      throw new MediaError(
        ERROR_CODES.INVALID_INPUT,
        'Two sizes use the same suffix.',
        {
          parameter: 'sizes',
          value: size.suffix,
          reason: 'duplicate-suffix',
        },
      );
    }
    seen.add(size.suffix);
  }
}

function coverResize(size: SizeEntry): CoverResize {
  const settings: CoverResize = {
    width: size.width,
    fit: 'cover',
    withoutEnlargement: true,
  };
  if (size.height === undefined) {
    return settings;
  }
  return {
    width: size.width,
    height: size.height,
    fit: 'cover',
    withoutEnlargement: true,
  };
}

function encode(image: Sharp, format: EncoderFormat): Sharp {
  if (format === 'jpeg') {
    return image.jpeg({ quality: FIXED_QUALITY, progressive: true });
  }
  if (format === 'png') {
    return image.png();
  }
  if (format === 'webp') {
    return image.webp({ quality: FIXED_QUALITY });
  }
  return image.avif({ quality: FIXED_QUALITY });
}

function sizePlan(
  input: ResolvedInput,
  size: SizeEntry,
  format: EncoderFormat | undefined,
): PlannedImage {
  const settings = coverResize(size);
  return {
    operation: size.suffix,
    pipeline: (): Sharp => {
      const resized = openImage(input).resize(settings);
      // No encoder leaves the input's own format in place.
      if (format === undefined) {
        return resized;
      }
      return encode(resized, format);
    },
  };
}

function resolvedFormat(
  format: OutputFormatValue | undefined,
): EncoderFormat | undefined {
  if (format === undefined) {
    return undefined;
  }
  return normalizeFormat(format);
}

function batchText(baseName: string, written: WrittenImages): string {
  const count = written.images.length;
  const noun = count === 1 ? 'size' : 'sizes';
  return `Resized ${baseName} into ${count} ${noun}. ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runBatchResize(
  args: BatchResizeArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  assertUniqueSuffixes(args.sizes);
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  await readImageMetadata(input);
  const format = resolvedFormat(args.format);
  const written = await writeImageOutputs(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    plans: args.sizes.map((size) => sizePlan(input, size, format)),
  });
  return successResult({
    tool: TOOL_NAME,
    text: batchText(path.basename(input.rawPath), written),
    outputs: written.images.map((image) => image.entry),
    warnings: written.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Resize one image into several sizes in one new numbered folder unless subfolder is false, or in the existing folder named by targetFolder, leaving the input unchanged. */
export const imageBatchResizeTool = defineTool({
  name: TOOL_NAME,
  title: 'Resize an image into several sizes',
  description:
    'Resizes one image into each listed size. '
    + 'It writes one file per size, all in one new numbered folder unless '
    + 'subfolder is false, or in the existing folder named by targetFolder, '
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
    sizes: z
      .array(
        z.object({
          width: z
            .number()
            .int()
            .min(1)
            .max(32768)
            .describe('Target width in pixels, from 1 to 32768.'),
          height: z
            .number()
            .int()
            .min(1)
            .max(32768)
            .optional()
            .describe(
              'Target height in pixels, from 1 to 32768. '
              + 'Optional. An omitted side keeps the aspect ratio.',
            ),
          suffix: z
            .string()
            .min(1)
            .max(16)
            .regex(SUFFIX_PATTERN)
            .describe(
              'File-name token of 1 to 16 characters. '
              + 'Lowercase letters, digits, hyphens, and underscores, '
              + 'starting and ending with a letter or digit.',
            ),
        }),
      )
      .min(1)
      .max(20)
      .describe('One to 20 sizes. Each entry writes one file.'),
    format: z
      .enum(OUTPUT_FORMAT_VALUES)
      .optional()
      .describe(
        'Output format: jpeg, png, webp, or avif. '
        + 'Optional. When omitted, the input format is kept.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runBatchResize(args, context);
  },
});
