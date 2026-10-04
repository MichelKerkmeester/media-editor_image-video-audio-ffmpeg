// ───────────────────────────────────────────────────────────────────
// MODULE: Image Compress Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync, statSync, writeFileSync } from 'node:fs';
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
  readonly inputPath: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('image-compress-');

const RASTER_FORMATS: readonly RasterFormat[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
];

const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp', 'avif'];
const LARGER_THAN_ORIGINAL = 'The compressed file is larger than the original.';
const BASELINE_JPEG_MARKER = 0xc0;

const SCHEMA_REJECTIONS: readonly {
  readonly label: string;
  readonly quality: number;
}[] = [
  { label: 'quality 0', quality: 0 },
  { label: 'quality 101', quality: 101 },
];

const NOISE_SEED = 0x6d2b79f5;
const NOISE_WIDTH = 200;
const NOISE_HEIGHT = 100;

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
  + 'AAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const pdfPath = path.join(sandbox.allowedRoot, 'doc.pdf');
const svgPath = path.join(sandbox.allowedRoot, 'mark.svg');
const outsidePath = path.join(sandbox.root, 'outside.png');
const missingPath = path.join(sandbox.allowedRoot, 'missing.png');
const flatPath = path.join(sandbox.allowedRoot, 'flat.png');
writeFileSync(pdfPath, '%PDF-1.4\n');
writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
writeFileSync(outsidePath, 'outside');
// Already smaller than sharp's quality-100 re-encode of the same pixels.
writeFileSync(flatPath, TINY_PNG);

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function outputExtension(format: RasterFormat): string {
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

function noiseBytes(width: number, height: number): Buffer {
  const data = Buffer.alloc(width * height * 3);
  let state = NOISE_SEED;
  for (let index = 0; index < data.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    data[index] = state >>> 24;
  }
  return data;
}

function jpegFrameMarker(filePath: string): number {
  const data = readFileSync(filePath);
  for (let index = 0; index < data.length - 1; index += 1) {
    if (data[index] !== 0xff) {
      continue;
    }
    const marker = data[index + 1];
    if (marker === undefined) {
      continue;
    }
    const isFrame = marker >= 0xc0
      && marker <= 0xcf
      && marker !== 0xc4
      && marker !== 0xc8
      && marker !== 0xcc;
    if (isFrame) {
      return marker;
    }
  }
  throw new Error('expected a jpeg frame marker');
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

async function writeNoiseJpeg(): Promise<string> {
  const target = path.join(sandbox.allowedRoot, 'noise.jpg');
  await sharp(noiseBytes(NOISE_WIDTH, NOISE_HEIGHT), {
    raw: {
      width: NOISE_WIDTH,
      height: NOISE_HEIGHT,
      channels: 3,
    },
  }).jpeg({ quality: 100 }).toFile(target);
  return target;
}

async function writeStill(format: 'gif' | 'tiff'): Promise<string> {
  const extension = format === 'gif' ? 'gif' : 'tif';
  const target = path.join(sandbox.allowedRoot, `still.${extension}`);
  const image = sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: '#cc6633',
    },
  });
  if (format === 'gif') {
    await image.gif().toFile(target);
  } else {
    await image.tiff().toFile(target);
  }
  return target;
}

async function compress(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_compress', args);
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

function byteCount(value: unknown): number {
  expect(typeof value).toBe('number');
  if (typeof value !== 'number') {
    throw new Error('expected a byte count');
  }
  return value;
}

function expectWritten(
  body: Record<string, unknown>,
  expected: ExpectedImage,
): string {
  expect(body.tool).toBe('image_compress');
  expect(Object.keys(body).sort()).toEqual([
    'bytesAfter',
    'bytesBefore',
    'elapsedMs',
    'outputs',
    'tool',
    'warnings',
  ]);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  expect(Number.isInteger(body.bytesBefore)).toBe(true);
  expect(Number.isInteger(body.bytesAfter)).toBe(true);
  expect(body.bytesBefore).toBe(statSync(expected.inputPath).size);
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
  expect(body.bytesAfter).toBe(entry.bytes);
  expect(path.basename(entry.path)).toBe(expected.fileName);
  expect(path.extname(entry.path)).toBe(path.extname(expected.fileName));
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
  const outcome = await compress(args);
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
        name: 'image_compress',
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

const photoPath = await writeRaster('jpeg', 'photo.jpg', 64, 48);
const noisePath = await writeNoiseJpeg();
const gifPath = await writeStill('gif');
const tiffPath = await writeStill('tiff');
const sourcePaths: Record<RasterFormat, string> = {
  jpeg: await writeRaster('jpeg', 'src-jpeg.jpg', 64, 48),
  png: await writeRaster('png', 'src-png.png', 64, 48),
  webp: await writeRaster('webp', 'src-webp.webp', 64, 48),
  avif: await writeRaster('avif', 'src-avif.avif', 64, 48),
};

it('compresses photo.jpg without changing the input', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(photoPath);
  await withToolClient(sandbox.config, async (client) => {
    const result = await client.callTool({
      name: 'image_compress',
      arguments: {
        inputPath: photoPath,
        outputName: 'compressed photo',
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
    const written = expectWritten(asRecord(result.structuredContent), {
      width: 64,
      height: 48,
      codec: 'jpeg',
      fileName: 'photo-compressed.jpg',
      slug: 'compressed-photo',
      inputPath: photoPath,
    });
    expect(path.dirname(written)).toBe(
      path.join(sandbox.outputDir, '001 - compressed-photo'),
    );
    expect(first.text).not.toMatch(/[\r\n]/u);
    expect(first.text).toContain(written);
  });
  expect(sha256Of(photoPath)).toBe(before);
});

it.each(RASTER_FORMATS)(
  're-encodes a $format image in that format',
  async (format): Promise<void> => {
    const sourcePath = sourcePaths[format];
    const before = sha256Of(sourcePath);
    const outcome = await compress({
      inputPath: sourcePath,
      outputName: `keep ${format}`,
    });
    expect(outcome.isError).toBe(false);
    const written = expectWritten(outcome.body, {
      width: 64,
      height: 48,
      codec: format,
      fileName: `src-${format}-compressed${outputExtension(format)}`,
      slug: `keep-${format}`,
      inputPath: sourcePath,
    });
    expect(path.extname(written)).toBe(path.extname(sourcePath));
    expect(sha256Of(sourcePath)).toBe(before);
  },
);

it('writes a smaller jpeg at quality 40', async (): Promise<void> => {
  const beforeHash = sha256Of(noisePath);
  const outcome = await compress({
    inputPath: noisePath,
    outputName: 'noise smaller',
    quality: 40,
  });
  expect(outcome.isError).toBe(false);
  expectWritten(outcome.body, {
    width: NOISE_WIDTH,
    height: NOISE_HEIGHT,
    codec: 'jpeg',
    fileName: 'noise-compressed.jpg',
    slug: 'noise-smaller',
    inputPath: noisePath,
  });
  const bytesBefore = byteCount(outcome.body.bytesBefore);
  const bytesAfter = byteCount(outcome.body.bytesAfter);
  expect(bytesAfter).toBeLessThan(bytesBefore);
  expect(outcome.body.warnings).toEqual([]);
  expect(sha256Of(noisePath)).toBe(beforeHash);
});

it('warns when a flat png grows at quality 100', async (): Promise<void> => {
  const beforeHash = sha256Of(flatPath);
  const outcome = await compress({
    inputPath: flatPath,
    outputName: 'flat png',
    quality: 100,
  });
  expect(outcome.isError).toBe(false);
  const written = expectWritten(outcome.body, {
    width: 1,
    height: 1,
    codec: 'png',
    fileName: 'flat-compressed.png',
    slug: 'flat-png',
    inputPath: flatPath,
  });
  const bytesBefore = byteCount(outcome.body.bytesBefore);
  const bytesAfter = byteCount(outcome.body.bytesAfter);
  expect(bytesAfter).toBeGreaterThan(bytesBefore);
  expect(bytesAfter).toBe(statSync(written).size);
  expect(outcome.body.warnings).toEqual([LARGER_THAN_ORIGINAL]);
  expect(sha256Of(flatPath)).toBe(beforeHash);
});

it('writes a baseline jpeg when progressive is false', async (): Promise<void> => {
  const before = sha256Of(photoPath);
  const outcome = await compress({
    inputPath: photoPath,
    outputName: 'baseline jpeg',
    progressive: false,
  });
  expect(outcome.isError).toBe(false);
  const written = expectWritten(outcome.body, {
    width: 64,
    height: 48,
    codec: 'jpeg',
    fileName: 'photo-compressed.jpg',
    slug: 'baseline-jpeg',
    inputPath: photoPath,
  });
  expect(path.extname(written)).toBe('.jpg');
  expect(jpegFrameMarker(written)).toBe(BASELINE_JPEG_MARKER);
  expect(sha256Of(photoPath)).toBe(before);
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label',
  async ({ quality }): Promise<void> => {
    await expectRejected({
      inputPath: photoPath,
      outputName: 'rejected',
      quality,
    });
  },
);

it('refuses a gif', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: gifPath,
      outputName: 'gif input',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      format: 'gif',
      accepted: ACCEPTED_FORMATS,
    },
  );
});

it('refuses a tiff', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tiffPath,
      outputName: 'tiff input',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      format: 'tiff',
      accepted: ACCEPTED_FORMATS,
    },
  );
});

it('refuses a PDF', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: pdfPath,
      outputName: 'pdf input',
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
      inputPath: 'photo.jpg',
      outputName: 'relative',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPath',
      value: 'photo.jpg',
      reason: 'relative-path',
    },
  );
});

it('rejects an output name that leaves no slug', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: photoPath,
      outputName: '!!!',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'outputName',
      value: '!!!',
      reason: 'empty-slug',
    },
  );
});
