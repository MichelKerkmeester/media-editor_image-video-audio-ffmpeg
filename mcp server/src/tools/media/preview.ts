// ───────────────────────────────────────────────────────────────────
// MODULE: Preview
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import sharp from 'sharp';
import { z } from 'zod';

import { withTempDir } from '../../core/process-runner.js';
import { IMAGE_PIXEL_LIMIT } from '../image/sharp-output.js';

import type { CallToolResult, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Longest side of a preview, large enough to tell what a picture shows. */
const PREVIEW_EDGE = 512;
const PREVIEW_QUALITY = 70;
const PREVIEW_MIME = 'image/jpeg';
const FRAME_FILE = 'preview-frame.png';

/** Share of the duration where the frame is taken, past any fade-in. */
const FRAME_POSITION = 0.25;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

async function previewFrom(source: string | Buffer): Promise<ImageContent> {
  const jpeg = await sharp(source, { limitInputPixels: IMAGE_PIXEL_LIMIT })
    .rotate()
    .resize(PREVIEW_EDGE, PREVIEW_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: PREVIEW_QUALITY })
    .toBuffer();
  return { type: 'image', data: jpeg.toString('base64'), mimeType: PREVIEW_MIME };
}

// ───────────────────────────────────────────────────────────────────
// 4. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** The `preview` switch both probe tools accept. */
export const previewField = z
  .boolean()
  .optional()
  .describe(
    'true also returns a small JPEG of the content, at most 512 pixels on '
    + 'the longest side, so the picture can be seen before naming the file. '
    + 'A video gives one frame. Audio has no picture. Defaults to false.',
  );

/**
 * Build a small JPEG of one image.
 *
 * @param input - Resolved image to read
 * @returns The preview as an MCP image block
 * @throws The sharp error when the image cannot be decoded
 */
export function imagePreview(input: ResolvedInput): Promise<ImageContent> {
  return previewFrom(input.realPath);
}

/**
 * Build a small JPEG of one video frame, a quarter of the way in.
 *
 * The frame is written to a private temp folder that is always removed.
 *
 * @param context - Services for the ffmpeg run
 * @param input - Resolved video to read
 * @param durationSeconds - Duration from the probe, or undefined when unknown
 * @returns The preview as an MCP image block
 * @throws {@link MediaError} When ffmpeg is missing or the frame cannot be read
 */
export function videoPreview(
  context: ToolContext,
  input: ResolvedInput,
  durationSeconds: number | undefined,
): Promise<ImageContent> {
  const seek = durationSeconds === undefined ? 0 : durationSeconds * FRAME_POSITION;
  return withTempDir(async (dir) => {
    const framePath = path.join(dir, FRAME_FILE);
    await context.runBinary(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        seek.toFixed(3),
        '-i',
        input.realPath,
        '-frames:v',
        '1',
        '-an',
        framePath,
      ],
      { inputs: [input], outputs: [framePath], tempDir: dir },
    );
    return previewFrom(framePath);
  });
}

/**
 * Add a preview block after a result's text block.
 *
 * @param result - Finished probe result
 * @param preview - Image block to add
 * @returns The same result with the preview in its content
 */
export function withPreviewBlock(
  result: CallToolResult,
  preview: ImageContent,
): CallToolResult {
  return { ...result, content: [...result.content, preview] };
}
