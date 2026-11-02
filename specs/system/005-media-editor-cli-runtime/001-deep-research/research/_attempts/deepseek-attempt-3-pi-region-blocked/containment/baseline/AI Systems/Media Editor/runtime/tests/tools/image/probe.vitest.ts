// ───────────────────────────────────────────────────────────────────
// MODULE: Image Probe Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { copyFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { buildOversizedPng, fixturePath } from '../../helpers/media.js';
import {
  asRecord,
  callTool,
  createSandbox,
  expectProtocolError,
  listFolders,
  sha256Of,
  withToolClient,
} from '../../helpers/tool-client.js';

import type { Sharp } from 'sharp';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

type RasterFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'tiff' | 'avif';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('image-probe-');

const RASTER_FORMATS: readonly RasterFormat[] = [
  'jpeg',
  'png',
  'webp',
  'gif',
  'tiff',
  'avif',
];

const SCHEMA_REJECTIONS: readonly {
  readonly label: string;
  readonly args: Record<string, unknown>;
}[] = [
  { label: 'missing inputPath', args: {} },
  { label: 'empty inputPath', args: { inputPath: '' } },
];

const OMITTED_KEYS = [
  'lastModified',
  'exif',
  'icc',
  'xmp',
  'iptc',
] as const;

const pdfPath = path.join(sandbox.allowedRoot, 'doc.pdf');
const svgPath = path.join(sandbox.allowedRoot, 'mark.svg');
const outsidePath = path.join(sandbox.root, 'outside.png');
const missingPath = path.join(sandbox.allowedRoot, 'missing.png');
const videoPath = path.join(sandbox.allowedRoot, 'clip.mp4');
writeFileSync(pdfPath, '%PDF-1.4\n');
writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
writeFileSync(outsidePath, 'outside');
copyFileSync(fixturePath('main_video.mp4'), videoPath);

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function inputExtension(format: RasterFormat): string {
  if (format === 'jpeg') {
    return '.jpg';
  }
  return `.${format}`;
}

function encodeRaster(
  format: RasterFormat,
  width: number,
  height: number,
): Sharp {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#3366cc',
    },
  });
  if (format === 'jpeg') {
    return image.jpeg();
  }
  if (format === 'png') {
    return image.png();
  }
  if (format === 'webp') {
    return image.webp();
  }
  if (format === 'gif') {
    return image.gif();
  }
  if (format === 'tiff') {
    return image.tiff();
  }
  return image.avif();
}

async function writeRaster(
  format: RasterFormat,
  fileName: string,
  width: number,
  height: number,
): Promise<string> {
  const target = path.join(sandbox.allowedRoot, fileName);
  await encodeRaster(format, width, height).toFile(target);
  return target;
}

async function writeAlphaPng(fileName: string): Promise<string> {
  const target = path.join(sandbox.allowedRoot, fileName);
  await sharp({
    create: {
      width: 64,
      height: 48,
      channels: 4,
      background: { r: 51, g: 102, b: 204, alpha: 0.5 },
    },
  }).png().toFile(target);
  return target;
}

async function probe(inputPath: string): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_probe', { inputPath });
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

function expectProbe(
  body: Record<string, unknown>,
  format: string,
  width: number,
  height: number,
  filePath: string,
): void {
  expect(body.tool).toBe('image_probe');
  expect(body.outputs).toEqual([]);
  expect(body.warnings).toEqual([]);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  expect(body.format).toBe(format);
  expect(body.width).toBe(width);
  expect(body.height).toBe(height);
  expect(body.fileSize).toBe(statSync(filePath).size);
  expect(body.bitDepth).toBe(8);
  for (const key of OMITTED_KEYS) {
    expect(body).not.toHaveProperty(key);
  }
  expect(JSON.stringify(body)).not.toContain(filePath);
  expect(listFolders(sandbox.outputDir)).toEqual([]);
}

async function expectFailure(
  inputPath: string,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await probe(inputPath);
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(code);
  expect(outcome.body.details).toEqual(details);
  expect(outcome.body).not.toHaveProperty('outputs');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function expectRejected(args: Record<string, unknown>): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client) => {
    await expectProtocolError(
      client.callTool({
        name: 'image_probe',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  sandbox.cleanup();
});

it('reads photo.jpg without writing a folder', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const source = await writeRaster('jpeg', 'photo.jpg', 200, 100);
  const before = sha256Of(source);
  const size = statSync(source).size;
  await withToolClient(sandbox.config, async (client) => {
    const result = await client.callTool({
      name: 'image_probe',
      arguments: { inputPath: source },
    });
    expect(result.isError).not.toBe(true);
    if (!Array.isArray(result.content)) {
      throw new Error('expected content');
    }
    const first = result.content[0];
    if (first === undefined || first.type !== 'text') {
      throw new Error('expected text content');
    }
    expect(first.text).toBe(`Read photo.jpg: 200x100 jpeg, ${size} bytes.`);
    const body = asRecord(result.structuredContent);
    expectProbe(body, 'jpeg', 200, 100, source);
    expect(body.channels).toBe(3);
    expect(body.hasAlpha).toBe(false);
    expect(body.colorSpace).toBe('srgb');
    expect(typeof body.density).toBe('number');
  });
  expect(sha256Of(source)).toBe(before);
});

it.each(RASTER_FORMATS)(
  'reports a %s image',
  async (format): Promise<void> => {
    const extension = inputExtension(format);
    const fileName = `raster-${format}${extension}`;
    const source = await writeRaster(format, fileName, 64, 48);
    const before = sha256Of(source);
    const outcome = await probe(source);
    expect(outcome.isError).toBe(false);
    expectProbe(outcome.body, format, 64, 48, source);
    expect(sha256Of(source)).toBe(before);
  },
);

it('reports alpha on a png and not on a jpeg', async (): Promise<void> => {
  const png = await writeAlphaPng('alpha.png');
  const jpeg = await writeRaster('jpeg', 'flat.jpg', 64, 48);
  const pngOutcome = await probe(png);
  const jpegOutcome = await probe(jpeg);
  expect(pngOutcome.isError).toBe(false);
  expect(jpegOutcome.isError).toBe(false);
  expect(pngOutcome.body.hasAlpha).toBe(true);
  expect(pngOutcome.body.channels).toBe(4);
  expect(jpegOutcome.body.hasAlpha).toBe(false);
  expect(pngOutcome.body.outputs).toEqual([]);
  expect(listFolders(sandbox.outputDir)).toEqual([]);
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label',
  async ({ args }): Promise<void> => {
    await expectRejected(args);
  },
);

it('refuses a PDF', async (): Promise<void> => {
  await expectFailure(pdfPath, ERROR_CODES.UNSUPPORTED_FORMAT, {
    reason: 'image-content',
  });
});

it('refuses an SVG', async (): Promise<void> => {
  await expectFailure(svgPath, ERROR_CODES.UNSUPPORTED_FORMAT, {
    reason: 'image-content',
  });
});

it('refuses a video', async (): Promise<void> => {
  await expectFailure(videoPath, ERROR_CODES.UNSUPPORTED_FORMAT, {
    reason: 'image-content',
  });
});

it('refuses a header that declares too many pixels', async (): Promise<void> => {
  const filePath = path.join(sandbox.allowedRoot, 'bomb.png');
  writeFileSync(filePath, buildOversizedPng());
  await expectFailure(filePath, ERROR_CODES.UNSUPPORTED_FORMAT, {
    reason: 'image-pixel-limit',
  });
});

it('refuses an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(outsidePath, ERROR_CODES.PATH_NOT_ALLOWED, {
    path: outsidePath,
    realPath: outsidePath,
    allowedRoots: [sandbox.allowedRoot],
    reason: 'outside-root',
  });
});

it('reports a missing input', async (): Promise<void> => {
  await expectFailure(missingPath, ERROR_CODES.INPUT_NOT_FOUND, {
    path: missingPath,
    role: 'input',
  });
});

it('rejects a relative input path', async (): Promise<void> => {
  await expectFailure('photo.jpg', ERROR_CODES.INVALID_INPUT, {
    parameter: 'inputPath',
    value: 'photo.jpg',
    reason: 'relative-path',
  });
});
