// ───────────────────────────────────────────────────────────────────
// MODULE: Image Flip Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import {
  asList,
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

type RasterFormat = 'jpeg' | 'png' | 'webp' | 'avif';

type FlipDirection = 'horizontal' | 'vertical' | 'both';

interface ExpectedImage {
  readonly width: number;
  readonly height: number;
  readonly codec: string;
  readonly fileName: string;
  readonly slug: string;
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface LineCase {
  readonly direction: FlipDirection;
  readonly phrase: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('image-flip-');

const RASTER_FORMATS: readonly RasterFormat[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
];

const SCHEMA_REJECTIONS: readonly {
  readonly label: string;
  readonly args: Record<string, unknown>;
}[] = [
  { label: 'direction diagonal', args: { direction: 'diagonal' } },
  { label: 'missing direction', args: {} },
];

const TILE_WIDTH = 4;
const TILE_HEIGHT = 2;

const RED: Rgb = { r: 255, g: 0, b: 0 };
const GREEN: Rgb = { r: 0, g: 255, b: 0 };
const BLUE: Rgb = { r: 0, g: 0, b: 255 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

// Rows differ and neither row reads the same backwards.
const SOURCE_PIXELS: readonly Rgb[] = [
  RED, GREEN, BLUE, WHITE,
  RED, RED, GREEN, BLUE,
];

const HORIZONTAL_PIXELS: readonly Rgb[] = [
  WHITE, BLUE, GREEN, RED,
  BLUE, GREEN, RED, RED,
];

const VERTICAL_PIXELS: readonly Rgb[] = [
  RED, RED, GREEN, BLUE,
  RED, GREEN, BLUE, WHITE,
];

const BOTH_PIXELS: readonly Rgb[] = [
  BLUE, GREEN, RED, RED,
  WHITE, BLUE, GREEN, RED,
];

const LINE_CASES: readonly LineCase[] = [
  { direction: 'horizontal', phrase: 'horizontally' },
  { direction: 'vertical', phrase: 'vertically' },
  { direction: 'both', phrase: 'both ways' },
];

const pdfPath = path.join(sandbox.allowedRoot, 'doc.pdf');
const svgPath = path.join(sandbox.allowedRoot, 'mark.svg');
const outsidePath = path.join(sandbox.root, 'outside.png');
const missingPath = path.join(sandbox.allowedRoot, 'missing.png');
writeFileSync(pdfPath, '%PDF-1.4\n');
writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
writeFileSync(outsidePath, 'outside');

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

function patternBuffer(pixels: readonly Rgb[]): Buffer {
  const bytes = Buffer.alloc(pixels.length * 3);
  for (let index = 0; index < pixels.length; index += 1) {
    const pixel = pixels[index];
    if (pixel === undefined) {
      throw new Error('expected a pixel');
    }
    bytes[index * 3] = pixel.r;
    bytes[index * 3 + 1] = pixel.g;
    bytes[index * 3 + 2] = pixel.b;
  }
  return bytes;
}

async function writePattern(fileName: string): Promise<string> {
  const target = path.join(sandbox.allowedRoot, fileName);
  await sharp(patternBuffer(SOURCE_PIXELS), {
    raw: {
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      channels: 3,
    },
  })
    .png()
    .toFile(target);
  return target;
}

async function flip(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_flip', args);
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

function writtenPath(
  body: Record<string, unknown>,
  expected: ExpectedImage,
): string {
  expect(body.tool).toBe('image_flip');
  expect(body.warnings).toEqual([]);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe('image');
  expect(entry.width).toBe(expected.width);
  expect(entry.height).toBe(expected.height);
  expect(entry.codec).toBe(expected.codec);
  expect(entry).not.toHaveProperty('durationSeconds');
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected an image file');
  }
  expect(entry.bytes).toBe(statSync(entry.path).size);
  expect(path.basename(entry.path)).toBe(expected.fileName);
  const folderName = path.basename(path.dirname(entry.path));
  expect(folderName).toMatch(/^\d{3} - /u);
  expect(folderName.endsWith(` - ${expected.slug}`)).toBe(true);
  expect(path.dirname(path.dirname(entry.path))).toBe(sandbox.outputDir);
  return entry.path;
}

async function readPixels(filePath: string): Promise<Rgb[]> {
  const decoded = await sharp(filePath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = decoded;
  expect(info.width).toBe(TILE_WIDTH);
  expect(info.height).toBe(TILE_HEIGHT);
  expect(info.channels).toBeGreaterThanOrEqual(3);
  const pixels: Rgb[] = [];
  const channels = info.channels;
  for (let index = 0; index < TILE_WIDTH * TILE_HEIGHT; index += 1) {
    const offset = index * channels;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    if (red === undefined || green === undefined || blue === undefined) {
      throw new Error('expected a pixel');
    }
    pixels.push({ r: red, g: green, b: blue });
  }
  return pixels;
}

async function expectMirrored(
  direction: FlipDirection,
  outputName: string,
  slug: string,
  pixels: readonly Rgb[],
): Promise<string> {
  const before = sha256Of(patternPath);
  const outcome = await flip({
    inputPath: patternPath,
    outputName,
    direction,
  });
  expect(outcome.isError).toBe(false);
  const written = writtenPath(outcome.body, {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    codec: 'png',
    fileName: 'tile-flipped.png',
    slug,
  });
  expect(await readPixels(written)).toEqual(pixels);
  expect(sha256Of(patternPath)).toBe(before);
  return written;
}

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await flip(args);
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
        name: 'image_flip',
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

const patternPath = await writePattern('tile.png');

afterAll((): void => {
  sandbox.cleanup();
});

it('mirrors tile.png horizontally into a new folder', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  expect(await readPixels(patternPath)).toEqual(SOURCE_PIXELS);
  const written = await expectMirrored(
    'horizontal',
    'horizontal',
    'horizontal',
    HORIZONTAL_PIXELS,
  );
  expect(path.dirname(written)).toBe(
    path.join(sandbox.outputDir, '001 - horizontal'),
  );
});

it('mirrors tile.png vertically', async (): Promise<void> => {
  await expectMirrored(
    'vertical',
    'vertical',
    'vertical',
    VERTICAL_PIXELS,
  );
});

it('mirrors tile.png both ways', async (): Promise<void> => {
  await expectMirrored('both', 'both ways', 'both-ways', BOTH_PIXELS);
});

it.each(RASTER_FORMATS)(
  'flips a %s image',
  async (format): Promise<void> => {
    const extension = inputExtension(format);
    const fileName = `raster-${format}${extension}`;
    const source = await writeRaster(format, fileName, 64, 48);
    const before = sha256Of(source);
    const outcome = await flip({
      inputPath: source,
      outputName: `raster ${format}`,
      direction: 'horizontal',
    });
    expect(outcome.isError).toBe(false);
    writtenPath(outcome.body, {
      width: 64,
      height: 48,
      codec: format,
      fileName: `raster-${format}-flipped${extension}`,
      slug: `raster-${format}`,
    });
    expect(sha256Of(source)).toBe(before);
  },
);

it.each(SCHEMA_REJECTIONS)(
  'rejects $label',
  async ({ args }): Promise<void> => {
    await expectRejected({
      inputPath: patternPath,
      outputName: 'rejected',
      ...args,
    });
  },
);

it('refuses a PDF', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: pdfPath,
      outputName: 'pdf input',
      direction: 'horizontal',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { reason: 'image-content' },
  );
});

it('refuses an SVG', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: svgPath,
      outputName: 'svg input',
      direction: 'horizontal',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { reason: 'image-content' },
  );
});

it('refuses an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      direction: 'horizontal',
    },
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('reports a missing input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'missing',
      direction: 'horizontal',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('rejects a relative input path', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: 'tile.png',
      outputName: 'relative',
      direction: 'horizontal',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPath',
      value: 'tile.png',
      reason: 'relative-path',
    },
  );
});

it('rejects an output name that leaves no slug', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: patternPath,
      outputName: '!!!',
      direction: 'horizontal',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'outputName',
      value: '!!!',
      reason: 'empty-slug',
    },
  );
});

it('names the written file on one line', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    for (const item of LINE_CASES) {
      const result = await client.callTool({
        name: 'image_flip',
        arguments: {
          inputPath: patternPath,
          outputName: `line ${item.direction}`,
          direction: item.direction,
        },
      });
      expect(result.isError).not.toBe(true);
      if (!Array.isArray(result.content)) {
        throw new Error('expected content');
      }
      const first = result.content[0];
      if (first === undefined || first.type !== 'text') {
        throw new Error('expected text content');
      }
      expect(first.text).not.toMatch(/[\r\n]/u);
      const outputs = asList(asRecord(result.structuredContent).outputs);
      const entry = asRecord(outputs[0]);
      if (typeof entry.path !== 'string') {
        throw new Error('expected a path');
      }
      const baseName = path.basename(patternPath);
      const summary = `Flipped ${baseName} ${item.phrase}. `;
      expect(first.text.startsWith(summary)).toBe(true);
      expect(first.text).toContain(entry.path);
    }
  });
});
