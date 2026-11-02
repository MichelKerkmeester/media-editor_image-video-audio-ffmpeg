// ───────────────────────────────────────────────────────────────────
// MODULE: Image Compress
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import {
  imageFormatName,
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
  PlannedImage,
  WrittenImages,
} from './sharp-output.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the schema defaults for quality and progressive. */
interface CompressArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly quality: number;
  readonly progressive: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'image_compress';
const COMPRESS_OPERATION = 'compressed';
const LARGER_THAN_ORIGINAL = 'The compressed file is larger than the original.';

const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp', 'avif'] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isAcceptedFormat(value: string): value is EncoderFormat {
  for (const format of ACCEPTED_FORMATS) {
    if (value === format) {
      return true;
    }
  }
  return false;
}

function encoderForDetected(
  detected: string | undefined,
): EncoderFormat | undefined {
  if (detected === undefined) {
    return undefined;
  }
  // AVIF metadata arrives as heif, which this name reports as avif.
  const reported = imageFormatName(detected);
  if (isAcceptedFormat(reported)) {
    return reported;
  }
  return undefined;
}

function unsupportedFormat(detected: string | undefined): MediaError {
  const details: Record<string, unknown> = {
    accepted: [...ACCEPTED_FORMATS],
  };
  if (detected !== undefined) {
    details.format = imageFormatName(detected);
  }
  return new MediaError(
    ERROR_CODES.UNSUPPORTED_FORMAT,
    'Only a jpeg, png, webp, or avif image can be compressed.',
    details,
  );
}

function encode(
  image: Sharp,
  format: EncoderFormat,
  quality: number,
  progressive: boolean,
): Sharp {
  if (format === 'jpeg') {
    return image.jpeg({ quality, progressive });
  }
  if (format === 'png') {
    return image.png({ quality });
  }
  if (format === 'webp') {
    return image.webp({ quality });
  }
  return image.avif({ quality });
}

function compressPlan(
  input: ResolvedInput,
  format: EncoderFormat,
  quality: number,
  progressive: boolean,
): PlannedImage {
  return {
    operation: COMPRESS_OPERATION,
    pipeline: (): Sharp => encode(
      openImage(input),
      format,
      quality,
      progressive,
    ),
  };
}

function writtenByteCount(written: WrittenImages): number {
  const image = written.images[0];
  if (image === undefined) {
    throw new Error('The compressed image was not written.');
  }
  return image.entry.bytes;
}

function withGrowthWarning(
  written: WrittenImages,
  bytesBefore: number,
  bytesAfter: number,
): string[] {
  const warnings = [...written.warnings];
  if (bytesAfter > bytesBefore) {
    warnings.push(LARGER_THAN_ORIGINAL);
  }
  return warnings;
}

function compressText(
  baseName: string,
  quality: number,
  written: WrittenImages,
): string {
  const summary = `Compressed ${baseName} at quality ${quality}.`;
  return `${summary} ${outputSentence(written)}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runCompress(
  args: CompressArguments,
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
  const encoder = encoderForDetected(metadata.format);
  if (encoder === undefined) {
    throw unsupportedFormat(metadata.format);
  }
  // The input size is fixed before the write, so the comparison uses that file.
  const bytesBefore = statSync(input.realPath).size;
  const written = await writeImageOutputs(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    plans: [compressPlan(input, encoder, args.quality, args.progressive)],
  });
  const bytesAfter = writtenByteCount(written);
  return successResult({
    tool: TOOL_NAME,
    text: compressText(path.basename(input.rawPath), args.quality, written),
    outputs: written.images.map((image) => image.entry),
    warnings: withGrowthWarning(written, bytesBefore, bytesAfter),
    elapsedMs: Date.now() - startedAt,
    extras: { bytesBefore, bytesAfter },
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Compress one image into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, without changing the input. */
export const imageCompressTool = defineTool({
  name: TOOL_NAME,
  title: 'Compress an image',
  description:
    'Compresses one jpeg, png, webp, or avif image in its own format. '
    + 'Quality from 1 to 100 is visual quality for jpeg, webp, and avif, '
    + 'and the palette colour target for png. Progressive applies to jpeg only. '
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
    progressive: z
      .boolean()
      .default(true)
      .describe(
        'True or false. A jpeg is written progressively when true. '
        + 'Ignored for png, webp, and avif. Defaults to true.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runCompress(args, context);
  },
});
