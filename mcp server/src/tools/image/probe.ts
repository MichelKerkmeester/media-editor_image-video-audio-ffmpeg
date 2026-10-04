// ───────────────────────────────────────────────────────────────────
// MODULE: Image Probe
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { successResult } from '../../core/result.js';
import { defineTool } from '../../server/tool-registry.js';
import { imagePreview, previewField, withPreviewBlock } from '../media/preview.js';
import { imageFormatName, readImageMetadata } from './sharp-output.js';

import type { CallToolResult, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import type { Metadata } from 'sharp';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for one probe call. */
interface ProbeArguments {
  readonly inputPath: string;
  readonly preview?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_probe';
const PREVIEW_FAILED = 'No preview: the image could not be scaled down.';

/** Sharp depth names that map onto a bit count. Any other name is omitted. */
const BIT_DEPTHS = {
  uchar: 8,
  ushort: 16,
  float: 32,
  double: 64,
} as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isKnownDepth(depth: string): depth is keyof typeof BIT_DEPTHS {
  return Object.hasOwn(BIT_DEPTHS, depth);
}

function bitDepth(depth: string): number | undefined {
  if (!isKnownDepth(depth)) {
    return undefined;
  }
  return BIT_DEPTHS[depth];
}

function assignFinite(
  fields: Record<string, unknown>,
  key: string,
  value: number | undefined,
): void {
  if (typeof value === 'number' && Number.isFinite(value)) {
    fields[key] = value;
  }
}

function probeFields(
  metadata: Metadata,
  fileSize: number,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (typeof metadata.format === 'string' && metadata.format.length > 0) {
    fields.format = imageFormatName(metadata.format);
  }
  assignFinite(fields, 'width', metadata.width);
  assignFinite(fields, 'height', metadata.height);
  assignFinite(fields, 'channels', metadata.channels);
  const depth = bitDepth(metadata.depth);
  if (depth !== undefined) {
    fields.bitDepth = depth;
  }
  if (typeof metadata.space === 'string' && metadata.space.length > 0) {
    fields.colorSpace = metadata.space;
  }
  assignFinite(fields, 'density', metadata.density);
  if (typeof metadata.hasAlpha === 'boolean') {
    fields.hasAlpha = metadata.hasAlpha;
  }
  fields.fileSize = fileSize;
  return fields;
}

function probeText(baseName: string, fields: Record<string, unknown>): string {
  const width = fields.width;
  const height = fields.height;
  const format = fields.format;
  const fileSize = fields.fileSize;
  if (typeof fileSize !== 'number') {
    return `Read ${baseName}.`;
  }
  if (
    typeof width !== 'number'
    || typeof height !== 'number'
    || typeof format !== 'string'
  ) {
    return `Read ${baseName}, ${fileSize} bytes.`;
  }
  return `Read ${baseName}: ${width}x${height} ${format}, ${fileSize} bytes.`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runProbe(
  args: ProbeArguments,
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
  const fileSize = statSync(input.realPath).size;
  const fields = probeFields(metadata, fileSize);
  const warnings: string[] = [];
  let preview: ImageContent | undefined;
  if (args.preview === true) {
    try {
      preview = await imagePreview(input);
    } catch {
      // The metadata is the answer. A preview that fails is a warning.
      warnings.push(PREVIEW_FAILED);
    }
  }
  const text = probeText(path.basename(input.rawPath), fields);
  const result = successResult({
    tool: TOOL_NAME,
    text: preview === undefined ? text : `${text} Preview attached.`,
    outputs: [],
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras: fields,
  });
  return preview === undefined ? result : withPreviewBlock(result, preview);
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Read image metadata without writing a file or changing the input. */
export const imageProbeTool = defineTool({
  name: TOOL_NAME,
  title: 'Probe an image',
  description:
    'Reads the format, pixel size, channels, bit depth, colour space, '
    + 'density, alpha and byte size of one image. With preview it also '
    + 'returns a small JPEG of the picture, to name the file by what it '
    + 'shows. It writes no file and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the image to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    preview: previewField,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runProbe(args, context);
  },
});
