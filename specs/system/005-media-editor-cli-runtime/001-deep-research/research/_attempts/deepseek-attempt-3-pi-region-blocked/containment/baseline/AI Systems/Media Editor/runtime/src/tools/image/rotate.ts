// ───────────────────────────────────────────────────────────────────
// MODULE: Image Rotate
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

/** Arguments after the schema default for background is applied. */
interface RotateArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly angle: number;
  readonly background: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_rotate';
const ROTATE_OPERATION = 'rotated';
const MIN_ANGLE = -360;
const MAX_ANGLE = 360;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function rotatePlan(
  input: ResolvedInput,
  angle: number,
  background: string,
): PlannedImage {
  return {
    operation: ROTATE_OPERATION,
    // Quarter turns ignore the fill. Other angles use it on the new corners.
    pipeline: (): Sharp => openImage(input).rotate(angle, { background }),
  };
}

function rotateText(
  baseName: string,
  angle: number,
  written: WrittenImages,
): string {
  const summary = `Rotated ${baseName} by ${angle} degrees.`;
  return `${summary} ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runRotate(
  args: RotateArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  // The metadata read is the content gate and the pixel limit.
  await readImageMetadata(input);
  const written = await writeImageOutputs(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    plans: [rotatePlan(input, args.angle, args.background)],
  });
  return successResult({
    tool: TOOL_NAME,
    text: rotateText(path.basename(input.rawPath), args.angle, written),
    outputs: written.images.map((image) => image.entry),
    warnings: written.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Rotate one image into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, without changing the input. */
export const imageRotateTool = defineTool({
  name: TOOL_NAME,
  title: 'Rotate an image',
  description:
    'Rotates one image by an angle in degrees. '
    + 'A turn that is not a multiple of 90 enlarges the canvas and fills '
    + 'the new corners with the background colour. '
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
    angle: z
      .number()
      .min(MIN_ANGLE)
      .max(MAX_ANGLE)
      .describe(
        'Rotation in degrees, from -360 to 360, positive clockwise. '
        + 'Any angle is accepted, not only quarter turns.',
      ),
    background: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex colour such as #FF8800.')
      .default('#000000')
      .describe(
        'Corner fill as #RRGGBB when the angle is not a multiple of 90. '
        + 'Defaults to #000000.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runRotate(args, context);
  },
});
