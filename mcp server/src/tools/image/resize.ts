// ───────────────────────────────────────────────────────────────────
// MODULE: Image Resize
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
  openImage,
  outputSentence,
  readImageMetadata,
  writeImageOutputs,
} from './sharp-output.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Sharp } from 'sharp';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { PlannedImage, WrittenImages } from './sharp-output.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Fit values sharp accepts for a resize. */
type ResizeFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

/** Arguments after the schema defaults are applied. */
interface ResizeArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly width?: number;
  readonly height?: number;
  readonly fit: ResizeFit;
  readonly withoutEnlargement: boolean;
}

/** Options passed to sharp. An omitted side is left off the object. */
interface ResizeSettings {
  width?: number;
  height?: number;
  readonly fit: ResizeFit;
  readonly withoutEnlargement: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_resize';
const RESIZE_OPERATION = 'resized';

const FIT_VALUES = [
  'cover',
  'contain',
  'fill',
  'inside',
  'outside',
] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function assertDimension(
  width: number | undefined,
  height: number | undefined,
): void {
  // A field schema cannot require one of two keys, so the handler does.
  if (width === undefined && height === undefined) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'A width or a height is required.',
      {
        parameter: 'width',
        value: null,
        reason: 'dimension-required',
      },
    );
  }
}

function resizeSettings(args: ResizeArguments): ResizeSettings {
  const settings: ResizeSettings = {
    fit: args.fit,
    withoutEnlargement: args.withoutEnlargement,
  };
  if (args.width !== undefined) {
    settings.width = args.width;
  }
  if (args.height !== undefined) {
    settings.height = args.height;
  }
  return settings;
}

function resizePlan(
  input: ResolvedInput,
  args: ResizeArguments,
): PlannedImage {
  const settings = resizeSettings(args);
  return {
    operation: RESIZE_OPERATION,
    pipeline: (): Sharp => openImage(input).resize(settings),
  };
}

function resizeText(baseName: string, written: WrittenImages): string {
  const entry = written.images[0]?.entry;
  const width = entry?.width;
  const height = entry?.height;
  const size = width !== undefined && height !== undefined
    ? ` to ${width}x${height}`
    : '';
  return `Resized ${baseName}${size}. ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runResize(
  args: ResizeArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  assertDimension(args.width, args.height);
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
    plans: [resizePlan(input, args)],
  });
  return successResult({
    tool: TOOL_NAME,
    text: resizeText(path.basename(input.rawPath), written),
    outputs: written.images.map((image) => image.entry),
    warnings: written.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Resize one image into the export root, or a numbered folder on request, without changing the input. */
export const imageResizeTool = defineTool({
  name: TOOL_NAME,
  title: 'Resize an image',
  description:
    'Resizes one image to a width, a height, or both. '
    + 'It writes one file in the export root, or a numbered folder on request, and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the image to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    outputName: outputNameField,
    width: z
      .number()
      .int()
      .min(1)
      .max(32768)
      .optional()
      .describe(
        'Target width in pixels, from 1 to 32768. '
        + 'Optional when height is set.',
      ),
    height: z
      .number()
      .int()
      .min(1)
      .max(32768)
      .optional()
      .describe(
        'Target height in pixels, from 1 to 32768. '
        + 'Optional when width is set. An omitted side keeps the aspect ratio.',
      ),
    fit: z
      .enum(FIT_VALUES)
      .default('cover')
      .describe(
        'How the image fits both sides: cover, contain, fill, inside, or outside. '
        + 'Defaults to cover.',
      ),
    withoutEnlargement: z
      .boolean()
      .default(true)
      .describe(
        'When true, the image is not enlarged past its current size. '
        + 'Defaults to true.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runResize(args, context);
  },
});
