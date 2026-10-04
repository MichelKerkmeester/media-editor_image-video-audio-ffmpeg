// ───────────────────────────────────────────────────────────────────
// MODULE: Image Crop Tests
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

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('image-crop-');

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
  {
    label: 'left -1',
    args: { left: -1, top: 0, width: 10, height: 10 },
  },
  {
    label: 'width 0',
    args: { left: 0, top: 0, width: 0, height: 10 },
  },
  {
    label: 'missing top',
    args: { left: 0, width: 10, height: 10 },
  },
];

const SPLIT_WIDTH = 64;
const SPLIT_HEIGHT = 48;
const HALF_WIDTH = 32;
const LEFT_COLOUR: Rgb = { r: 220, g: 20, b: 20 };
const RIGHT_COLOUR: Rgb = { r: 20, g: 40, b: 220 };
const REGION_REASON = 'region-exceeds-image';

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

function splitPixels(): Buffer {
  const channels = 3;
  const pixels = Buffer.alloc(SPLIT_WIDTH * SPLIT_HEIGHT * channels);
  for (let y = 0; y < SPLIT_HEIGHT; y += 1) {
    for (let x = 0; x < SPLIT_WIDTH; x += 1) {
      const colour = x < HALF_WIDTH ? LEFT_COLOUR : RIGHT_COLOUR;
      const offset = (y * SPLIT_WIDTH + x) * channels;
      pixels[offset] = colour.r;
      pixels[offset + 1] = colour.g;
      pixels[offset + 2] = colour.b;
    }
  }
  return pixels;
}

async function writeSplitImage(): Promise<string> {
  const target = path.join(sandbox.allowedRoot, 'split.png');
  const image = sharp(splitPixels(), {
    raw: {
      width: SPLIT_WIDTH,
      height: SPLIT_HEIGHT,
      channels: 3,
    },
  });
  await image.png().toFile(target);
  return target;
}

async function crop(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_crop', args);
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
  expect(body.tool).toBe('image_crop');
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

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await crop(args);
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
        name: 'image_crop',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function expectColour(filePath: string, colour: Rgb): Promise<void> {
  const decoded = await sharp(filePath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = decoded;
  expect(info.channels).toBeGreaterThanOrEqual(3);
  expect(data[0]).toBe(colour.r);
  expect(data[1]).toBe(colour.g);
  expect(data[2]).toBe(colour.b);
  const channels = info.channels;
  const last = (info.width * info.height - 1) * channels;
  expect(data[last]).toBe(colour.r);
  expect(data[last + 1]).toBe(colour.g);
  expect(data[last + 2]).toBe(colour.b);
}

function regionDetails(
  parameter: 'width' | 'height',
  value: number,
  left: number,
  top: number,
): Record<string, unknown> {
  return {
    parameter,
    value,
    reason: REGION_REASON,
    imageWidth: SPLIT_WIDTH,
    imageHeight: SPLIT_HEIGHT,
    left,
    top,
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const widePath = await writeRaster('png', 'wide.png', 200, 100);
const smallPath = await writeRaster('png', 'small.png', 64, 48);
const splitPath = await writeSplitImage();

afterAll((): void => {
  sandbox.cleanup();
});

it('numbers two calls as 001 and 002', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const first = await crop({
    inputPath: widePath,
    outputName: 'first copy',
    left: 0,
    top: 0,
    width: 100,
    height: 50,
  });
  const second = await crop({
    inputPath: widePath,
    outputName: 'second copy',
    left: 0,
    top: 0,
    width: 100,
    height: 50,
  });
  expect(first.isError).toBe(false);
  expect(second.isError).toBe(false);
  const firstPath = writtenPath(first.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-cropped.png',
    slug: 'first-copy',
  });
  const secondPath = writtenPath(second.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-cropped.png',
    slug: 'second-copy',
  });
  expect(path.dirname(firstPath)).toBe(
    path.join(sandbox.outputDir, '001 - first-copy'),
  );
  expect(path.dirname(secondPath)).toBe(
    path.join(sandbox.outputDir, '002 - second-copy'),
  );
});

it('writes a region at the requested size', async (): Promise<void> => {
  const before = sha256Of(widePath);
  const outcome = await crop({
    inputPath: widePath,
    outputName: 'exact region',
    left: 20,
    top: 10,
    width: 100,
    height: 50,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-cropped.png',
    slug: 'exact-region',
  });
  expect(sha256Of(widePath)).toBe(before);
});

it('accepts a region on the right and bottom edges', async (): Promise<void> => {
  const outcome = await crop({
    inputPath: smallPath,
    outputName: 'edge fit',
    left: 32,
    top: 24,
    width: 32,
    height: 24,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 32,
    height: 24,
    codec: 'png',
    fileName: 'small-cropped.png',
    slug: 'edge-fit',
  });
});

it('reads the right half of a two-colour image', async (): Promise<void> => {
  const before = sha256Of(splitPath);
  const outcome = await crop({
    inputPath: splitPath,
    outputName: 'right half',
    left: HALF_WIDTH,
    top: 0,
    width: HALF_WIDTH,
    height: SPLIT_HEIGHT,
  });
  expect(outcome.isError).toBe(false);
  const written = writtenPath(outcome.body, {
    width: HALF_WIDTH,
    height: SPLIT_HEIGHT,
    codec: 'png',
    fileName: 'split-cropped.png',
    slug: 'right-half',
  });
  await expectColour(written, RIGHT_COLOUR);
  expect(sha256Of(splitPath)).toBe(before);
});

it.each(RASTER_FORMATS)(
  'crops a %s image',
  async (format): Promise<void> => {
    const extension = inputExtension(format);
    const fileName = `raster-${format}${extension}`;
    const source = await writeRaster(format, fileName, 64, 48);
    const before = sha256Of(source);
    const outcome = await crop({
      inputPath: source,
      outputName: `raster ${format}`,
      left: 4,
      top: 6,
      width: 20,
      height: 10,
    });
    expect(outcome.isError).toBe(false);
    writtenPath(outcome.body, {
      width: 20,
      height: 10,
      codec: format,
      fileName: `raster-${format}-cropped${extension}`,
      slug: `raster-${format}`,
    });
    expect(sha256Of(source)).toBe(before);
  },
);

it('rejects a region one pixel past the right edge', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: splitPath,
      outputName: 'past right',
      left: 33,
      top: 0,
      width: 32,
      height: 24,
    },
    ERROR_CODES.INVALID_INPUT,
    regionDetails('width', 32, 33, 0),
  );
});

it('rejects a region one pixel past the bottom edge', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: splitPath,
      outputName: 'past bottom',
      left: 0,
      top: 25,
      width: 32,
      height: 24,
    },
    ERROR_CODES.INVALID_INPUT,
    regionDetails('height', 24, 0, 25),
  );
});

it('names width when the region passes both edges', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: splitPath,
      outputName: 'past both',
      left: 40,
      top: 30,
      width: 32,
      height: 24,
    },
    ERROR_CODES.INVALID_INPUT,
    regionDetails('width', 32, 40, 30),
  );
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label',
  async ({ args }): Promise<void> => {
    await expectRejected({
      inputPath: widePath,
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
      left: 0,
      top: 0,
      width: 10,
      height: 10,
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
      left: 0,
      top: 0,
      width: 10,
      height: 10,
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
      left: 0,
      top: 0,
      width: 10,
      height: 10,
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
      left: 0,
      top: 0,
      width: 10,
      height: 10,
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
      inputPath: 'wide.png',
      outputName: 'relative',
      left: 0,
      top: 0,
      width: 10,
      height: 10,
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPath',
      value: 'wide.png',
      reason: 'relative-path',
    },
  );
});

it('rejects an output name that leaves no slug', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: widePath,
      outputName: '!!!',
      left: 0,
      top: 0,
      width: 10,
      height: 10,
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
    const result = await client.callTool({
      name: 'image_crop',
      arguments: {
        inputPath: widePath,
        outputName: 'line check',
        left: 0,
        top: 0,
        width: 100,
        height: 50,
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
    const entry = asRecord(asList(asRecord(result.structuredContent).outputs)[0]);
    expect(typeof entry.path).toBe('string');
    if (typeof entry.path !== 'string') {
      throw new Error('expected a path');
    }
    expect(first.text).toContain(entry.path);
  });
});
