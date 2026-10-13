// ───────────────────────────────────────────────────────────────────
// MODULE: Image Flip
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

/** Mirror axis the schema accepts. */
type FlipDirection = 'horizontal' | 'vertical' | 'both';

/** Arguments for one flip call. */
interface FlipArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly direction: FlipDirection;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_flip';
const FLIP_OPERATION = 'flipped';

const FLIP_DIRECTIONS = [
  'horizontal',
  'vertical',
  'both',
] as const satisfies readonly FlipDirection[];

const DIRECTION_WORDS: Record<FlipDirection, string> = {
  horizontal: 'horizontally',
  vertical: 'vertically',
  both: 'both ways',
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function mirror(input: ResolvedInput, direction: FlipDirection): Sharp {
  // Sharp calls a left-to-right mirror flop and a top-to-bottom mirror flip.
  let image = openImage(input);
  if (direction === 'horizontal' || direction === 'both') {
    image = image.flop();
  }
  if (direction === 'vertical' || direction === 'both') {
    image = image.flip();
  }
  return image;
}

function flipPlan(
  input: ResolvedInput,
  direction: FlipDirection,
): PlannedImage {
  return {
    operation: FLIP_OPERATION,
    pipeline: (): Sharp => mirror(input, direction),
  };
}

function flipText(
  baseName: string,
  direction: FlipDirection,
  written: WrittenImages,
): string {
  const summary = `Flipped ${baseName} ${DIRECTION_WORDS[direction]}.`;
  return `${summary} ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runFlip(
  args: FlipArguments,
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
    plans: [flipPlan(input, args.direction)],
  });
  return successResult({
    tool: TOOL_NAME,
    text: flipText(path.basename(input.rawPath), args.direction, written),
    outputs: written.images.map((image) => image.entry),
    warnings: written.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Mirror one image into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, without changing the input. */
export const imageFlipTool = defineTool({
  name: TOOL_NAME,
  title: 'Flip an image',
  description:
    'Mirrors one image horizontally, vertically, or both ways. '
    + 'The width and height stay the same. '
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
    direction: z
      .enum(FLIP_DIRECTIONS)
      .describe(
        'Which way to mirror the image: horizontal, vertical, or both.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runFlip(args, context);
  },
});
