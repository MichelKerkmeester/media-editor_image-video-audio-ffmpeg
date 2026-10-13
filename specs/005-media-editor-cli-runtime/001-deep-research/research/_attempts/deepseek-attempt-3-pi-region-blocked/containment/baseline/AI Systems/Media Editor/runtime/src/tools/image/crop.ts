// ───────────────────────────────────────────────────────────────────
// MODULE: Image Crop
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

/** Arguments after the schema has accepted every field. */
interface CropArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Which edge of the region passed the image. */
type RegionEdge = 'width' | 'height';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_crop';
const CROP_OPERATION = 'cropped';
const REGION_REASON = 'region-exceeds-image';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function regionError(
  edge: RegionEdge,
  value: number,
  args: CropArguments,
  imageWidth: number,
  imageHeight: number,
  span: number,
): MediaError {
  const sum = edge === 'width' ? 'left + width' : 'top + height';
  const message = `The crop region does not fit the ${imageWidth}x${imageHeight}`
    + ` image (${sum} is ${span}).`;
  return new MediaError(ERROR_CODES.INVALID_INPUT, message, {
    parameter: edge,
    value,
    reason: REGION_REASON,
    imageWidth,
    imageHeight,
    left: args.left,
    top: args.top,
  });
}

function assertRegionFits(
  args: CropArguments,
  imageWidth: number,
  imageHeight: number,
): void {
  // A region past both edges names width, so the first failing axis wins.
  if (args.left + args.width > imageWidth) {
    throw regionError(
      'width',
      args.width,
      args,
      imageWidth,
      imageHeight,
      args.left + args.width,
    );
  }
  if (args.top + args.height > imageHeight) {
    throw regionError(
      'height',
      args.height,
      args,
      imageWidth,
      imageHeight,
      args.top + args.height,
    );
  }
}

function cropPlan(input: ResolvedInput, args: CropArguments): PlannedImage {
  return {
    operation: CROP_OPERATION,
    pipeline: (): Sharp => openImage(input).extract({
      left: args.left,
      top: args.top,
      width: args.width,
      height: args.height,
    }),
  };
}

function cropText(
  baseName: string,
  width: number,
  height: number,
  written: WrittenImages,
): string {
  const size = `${width}x${height}`;
  return `Cropped ${baseName} to a ${size} region. ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runCrop(
  args: CropArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const metadata = await readImageMetadata(input);
  // Stored size is what extract reads. An absent side cannot contain a region.
  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;
  assertRegionFits(args, imageWidth, imageHeight);
  const written = await writeImageOutputs(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    plans: [cropPlan(input, args)],
  });
  return successResult({
    tool: TOOL_NAME,
    text: cropText(
      path.basename(input.rawPath),
      args.width,
      args.height,
      written,
    ),
    outputs: written.images.map((image) => image.entry),
    warnings: written.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Crop one image into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, without changing the input. */
export const imageCropTool = defineTool({
  name: TOOL_NAME,
  title: 'Crop an image',
  description:
    'Crops one rectangular region from an image. '
    + 'The region must fit inside the image. '
    + 'It writes one file in the export root, in a new numbered folder '
    + 'when subfolder is true, or in the existing folder named by '
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
    left: z
      .number()
      .int()
      .min(0)
      .max(32767)
      .describe(
        'Distance from the left edge in pixels, from 0 to 32767.',
      ),
    top: z
      .number()
      .int()
      .min(0)
      .max(32767)
      .describe(
        'Distance from the top edge in pixels, from 0 to 32767.',
      ),
    width: z
      .number()
      .int()
      .min(1)
      .max(32768)
      .describe('Width of the region in pixels, from 1 to 32768.'),
    height: z
      .number()
      .int()
      .min(1)
      .max(32768)
      .describe('Height of the region in pixels, from 1 to 32768.'),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runCrop(args, context);
  },
});
