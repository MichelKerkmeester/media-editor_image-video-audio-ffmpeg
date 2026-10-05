// ───────────────────────────────────────────────────────────────────
// MODULE: Image Rotate Tests
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

const sandbox = createSandbox('image-rotate-');

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
  { label: 'angle 361', args: { angle: 361 } },
  { label: 'angle -361', args: { angle: -361 } },
  { label: 'background red', args: { angle: 90, background: 'red' } },
  { label: 'background #FFF', args: { angle: 90, background: '#FFF' } },
  { label: 'missing angle', args: {} },
];

const WIDE_WIDTH = 200;
const WIDE_HEIGHT = 100;
const FULL_TURNS = [-360, 360] as const;

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

async function rotate(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_rotate', args);
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
  expect(body.tool).toBe('image_rotate');
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
  const outcome = await rotate(args);
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
        name: 'image_rotate',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function cornerOf(filePath: string): Promise<Rgb> {
  const decoded = await sharp(filePath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = decoded;
  expect(info.channels).toBeGreaterThanOrEqual(3);
  const red = data[0];
  const green = data[1];
  const blue = data[2];
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error('expected a corner pixel');
  }
  return { r: red, g: green, b: blue };
}

function expectLarger(
  body: Record<string, unknown>,
  fileName: string,
  slug: string,
): string {
  expect(body.tool).toBe('image_rotate');
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe('image');
  expect(entry.codec).toBe('png');
  if (
    typeof entry.width !== 'number'
    || typeof entry.height !== 'number'
    || typeof entry.path !== 'string'
    || typeof entry.bytes !== 'number'
  ) {
    throw new Error('expected an image file');
  }
  expect(entry.width).toBeGreaterThan(WIDE_WIDTH);
  expect(entry.height).toBeGreaterThan(WIDE_HEIGHT);
  expect(entry.bytes).toBe(statSync(entry.path).size);
  expect(path.basename(entry.path)).toBe(fileName);
  const folderName = path.basename(path.dirname(entry.path));
  expect(folderName.endsWith(` - ${slug}`)).toBe(true);
  expect(path.dirname(path.dirname(entry.path))).toBe(sandbox.outputDir);
  return entry.path;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const widePath = await writeRaster('png', 'wide.png', WIDE_WIDTH, WIDE_HEIGHT);

afterAll((): void => {
  sandbox.cleanup();
});

it('turns a 200x100 image by 90 degrees into 100x200', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(widePath);
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'quarter turn',
    angle: 90,
  });
  expect(outcome.isError).toBe(false);
  const written = writtenPath(outcome.body, {
    width: WIDE_HEIGHT,
    height: WIDE_WIDTH,
    codec: 'png',
    fileName: 'wide-rotated.png',
    slug: 'quarter-turn',
  });
  expect(path.dirname(written)).toBe(
    path.join(sandbox.outputDir, '001 - quarter-turn'),
  );
  expect(sha256Of(widePath)).toBe(before);
});

it('keeps the size of a 180 degree turn', async (): Promise<void> => {
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'half turn',
    angle: 180,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: WIDE_WIDTH,
    height: WIDE_HEIGHT,
    codec: 'png',
    fileName: 'wide-rotated.png',
    slug: 'half-turn',
  });
});

it.each(FULL_TURNS)(
  'keeps the size of a %s degree turn',
  async (angle): Promise<void> => {
    const outcome = await rotate({
      inputPath: widePath,
      outputName: `full turn ${angle}`,
      angle,
    });
    expect(outcome.isError).toBe(false);
    writtenPath(outcome.body, {
      width: WIDE_WIDTH,
      height: WIDE_HEIGHT,
      codec: 'png',
      fileName: 'wide-rotated.png',
      slug: `full-turn-${Math.abs(angle)}`,
    });
  },
);

it('enlarges the canvas for a 45 degree turn', async (): Promise<void> => {
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'diagonal',
    angle: 45,
  });
  expect(outcome.isError).toBe(false);
  expectLarger(outcome.body, 'wide-rotated.png', 'diagonal');
});

it('fills the exposed corner with the background', async (): Promise<void> => {
  const before = sha256Of(widePath);
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'red corners',
    angle: 45,
    background: '#FF0000',
  });
  expect(outcome.isError).toBe(false);
  const written = expectLarger(outcome.body, 'wide-rotated.png', 'red-corners');
  const corner = await cornerOf(written);
  expect(corner.r).toBeGreaterThan(corner.g);
  expect(corner.r).toBeGreaterThan(corner.b);
  expect(sha256Of(widePath)).toBe(before);
});

it('fills the exposed corner with black by default', async (): Promise<void> => {
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'black corners',
    angle: 45,
  });
  expect(outcome.isError).toBe(false);
  const written = expectLarger(outcome.body, 'wide-rotated.png', 'black-corners');
  const corner = await cornerOf(written);
  expect(corner.r).toBe(0);
  expect(corner.g).toBe(0);
  expect(corner.b).toBe(0);
});

it('turns by a negative angle', async (): Promise<void> => {
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'negative turn',
    angle: -90,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: WIDE_HEIGHT,
    height: WIDE_WIDTH,
    codec: 'png',
    fileName: 'wide-rotated.png',
    slug: 'negative-turn',
  });
});

it('turns by a fractional angle', async (): Promise<void> => {
  const outcome = await rotate({
    inputPath: widePath,
    outputName: 'fractional turn',
    angle: 22.5,
  });
  expect(outcome.isError).toBe(false);
  expectLarger(outcome.body, 'wide-rotated.png', 'fractional-turn');
});

it.each(RASTER_FORMATS)(
  'rotates a %s image',
  async (format): Promise<void> => {
    const extension = inputExtension(format);
    const fileName = `raster-${format}${extension}`;
    const source = await writeRaster(format, fileName, 64, 48);
    const before = sha256Of(source);
    const outcome = await rotate({
      inputPath: source,
      outputName: `raster ${format}`,
      angle: 180,
    });
    expect(outcome.isError).toBe(false);
    writtenPath(outcome.body, {
      width: 64,
      height: 48,
      codec: format,
      fileName: `raster-${format}-rotated${extension}`,
      slug: `raster-${format}`,
    });
    expect(sha256Of(source)).toBe(before);
  },
);

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
      angle: 90,
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
      angle: 90,
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
      angle: 90,
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
      angle: 90,
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
      angle: 90,
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
      angle: 90,
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
      name: 'image_rotate',
      arguments: {
        inputPath: widePath,
        outputName: 'line check',
        angle: 45,
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
    const baseName = path.basename(widePath);
    expect(first.text.startsWith(`Rotated ${baseName} by 45 degrees. `)).toBe(true);
    expect(first.text).toContain(entry.path);
  });
});
