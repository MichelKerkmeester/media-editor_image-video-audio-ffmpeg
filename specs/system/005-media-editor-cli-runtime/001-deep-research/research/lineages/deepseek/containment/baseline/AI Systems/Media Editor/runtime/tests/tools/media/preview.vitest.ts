// ───────────────────────────────────────────────────────────────────
// MODULE: Probe Preview Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import sharp from 'sharp';
import { afterAll, expect, it } from 'vitest';

import { generateAudio, generateImage, generateVideo } from '../../helpers/media.js';
import { asList, createSandbox, withToolClient } from '../../helpers/tool-client.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('probe-preview-');

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

async function probe(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  let result: CallToolResult | undefined;
  await withToolClient(sandbox.config, async (client) => {
    result = (await client.callTool({ name, arguments: args })) as CallToolResult;
  });
  if (result === undefined) {
    throw new Error('expected a result');
  }
  return result;
}

async function previewSize(result: CallToolResult): Promise<{ width: number; height: number }> {
  expect(result.isError).not.toBe(true);
  expect(result.content).toHaveLength(2);
  const block = result.content[1];
  if (block?.type !== 'image') {
    throw new Error('expected an image block');
  }
  expect(block.mimeType).toBe('image/jpeg');
  const metadata = await sharp(Buffer.from(block.data, 'base64')).metadata();
  expect(metadata.format).toBe('jpeg');
  return { width: metadata.width ?? 0, height: metadata.height ?? 0 };
}

afterAll((): void => {
  sandbox.cleanup();
});

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('returns a scaled-down JPEG of an image when preview is true', async (): Promise<void> => {
  const inputPath = await generateImage(sandbox.allowedRoot, {
    width: 1200,
    height: 600,
    format: 'png',
    fileName: 'wide.png',
  });
  const result = await probe('image_probe', { inputPath, preview: true });
  expect(await previewSize(result)).toEqual({ width: 512, height: 256 });
});

it('returns only the text block when preview is left out', async (): Promise<void> => {
  const inputPath = await generateImage(sandbox.allowedRoot, {
    width: 40,
    height: 20,
    format: 'png',
    fileName: 'plain.png',
  });
  const result = await probe('image_probe', { inputPath });
  expect(result.content).toHaveLength(1);
});

it('returns one video frame from media_probe', async (): Promise<void> => {
  const inputPath = await generateVideo(sandbox.allowedRoot, {
    seconds: 2,
    width: 320,
    height: 240,
    fileName: 'clip.mp4',
  });
  const result = await probe('media_probe', { inputPath, preview: true });
  expect(await previewSize(result)).toEqual({ width: 320, height: 240 });
});

it('warns instead of failing when an audio file has no picture', async (): Promise<void> => {
  const inputPath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  const result = await probe('media_probe', { inputPath, preview: true });
  expect(result.isError).not.toBe(true);
  expect(result.content).toHaveLength(1);
  const body = result.structuredContent ?? {};
  expect(asList(body.warnings)).toContain('No preview: the file has no picture.');
});
