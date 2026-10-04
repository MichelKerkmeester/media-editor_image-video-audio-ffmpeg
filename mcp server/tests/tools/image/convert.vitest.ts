// ───────────────────────────────────────────────────────────────────
// MODULE: Image Convert Tests
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

interface FormatPair {
  readonly source: RasterFormat;
  readonly target: RasterFormat;
}

interface ExpectedImage {
  readonly width: number;
  readonly height: number;
  readonly codec: string;
  readonly fileName: string;
  readonly slug: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('image-convert-');

const RASTER_FORMATS: readonly RasterFormat[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
];

const FORMAT_PAIRS: readonly FormatPair[] = RASTER_FORMATS.flatMap(
  (source): readonly FormatPair[] => RASTER_FORMATS.map((target) => ({
    source,
    target,
  })),
);

const SCHEMA_REJECTIONS: readonly {
  readonly label: string;
  readonly args: Record<string, unknown>;
}[] = [
  { label: 'quality 0', args: { format: 'jpeg', quality: 0 } },
  { label: 'quality 101', args: { format: 'jpeg', quality: 101 } },
  { label: 'format gif', args: { format: 'gif' } },
  { label: 'missing format', args: {} },
];

const NOISE_SEED = 0x6d2b79f5;
const NOISE_WIDTH = 200;
const NOISE_HEIGHT = 100;

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

async function writeNoise(): Promise<string> {
  const target = path.join(sandbox.allowedRoot, 'noise.png');
  const image = sharp(noiseBytes(NOISE_WIDTH, NOISE_HEIGHT), {
    raw: {
      width: NOISE_WIDTH,
      height: NOISE_HEIGHT,
      channels: 3,
    },
  });
  await image.png().toFile(target);
  return target;
}

async function convert(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_convert', args);
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
  expect(body.tool).toBe('image_convert');
  expect(Object.keys(body).sort()).toEqual([
    'elapsedMs',
    'outputs',
    'tool',
    'warnings',
  ]);
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
  const outcome = await convert(args);
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
        name: 'image_convert',
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

const photoPath = await writeRaster('png', 'photo.png', 64, 48);
const noisePath = await writeNoise();
const sourcePaths: Record<RasterFormat, string> = {
  jpeg: await writeRaster('jpeg', 'src-jpeg.jpg', 64, 48),
  png: await writeRaster('png', 'src-png.png', 64, 48),
  webp: await writeRaster('webp', 'src-webp.webp', 64, 48),
  avif: await writeRaster('avif', 'src-avif.avif', 64, 48),
};

it('converts photo.png to webp without changing the input', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(photoPath);
  await withToolClient(sandbox.config, async (client) => {
    const result = await client.callTool({
      name: 'image_convert',
      arguments: {
        inputPath: photoPath,
        outputName: 'photo webp',
        format: 'webp',
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
    const written = writtenPath(asRecord(result.structuredContent), {
      width: 64,
      height: 48,
      codec: 'webp',
      fileName: 'photo-converted.webp',
      slug: 'photo-webp',
    });
    expect(path.dirname(written)).toBe(
      path.join(sandbox.outputDir, '001 - photo-webp'),
    );
    expect(first.text).not.toMatch(/[\r\n]/u);
    expect(first.text.startsWith('Converted photo.png to webp. ')).toBe(true);
    expect(first.text).toContain(written);
  });
  expect(sha256Of(photoPath)).toBe(before);
});

it.each(FORMAT_PAIRS)(
  'converts $source to $target',
  async ({ source, target }): Promise<void> => {
    const sourcePath = sourcePaths[source];
    const before = sha256Of(sourcePath);
    const extension = outputExtension(target);
    const outcome = await convert({
      inputPath: sourcePath,
      outputName: `pair ${source} ${target}`,
      format: target,
    });
    expect(outcome.isError).toBe(false);
    const written = writtenPath(outcome.body, {
      width: 64,
      height: 48,
      codec: target,
      fileName: `src-${source}-converted${extension}`,
      slug: `pair-${source}-${target}`,
    });
    expect(path.extname(written)).toBe(extension);
    expect(sha256Of(sourcePath)).toBe(before);
  },
);

it('accepts the jpg alias as jpeg', async (): Promise<void> => {
  const before = sha256Of(photoPath);
  const outcome = await convert({
    inputPath: photoPath,
    outputName: 'jpg alias',
    format: 'jpg',
  });
  expect(outcome.isError).toBe(false);
  const written = writtenPath(outcome.body, {
    width: 64,
    height: 48,
    codec: 'jpeg',
    fileName: 'photo-converted.jpg',
    slug: 'jpg-alias',
  });
  expect(path.extname(written)).toBe('.jpg');
  expect(sha256Of(photoPath)).toBe(before);
});

it('lists only the four canonical formats in the format descriptions', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    for (const name of ['image_convert', 'image_batch_resize']) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool, name).toBeDefined();
      const properties = asRecord(tool?.inputSchema.properties);
      const format = asRecord(properties.format);
      const texts = [tool?.description, format.description];
      expect(String(format.description), name).toContain('jpeg, png, webp, or avif');
      for (const text of texts) {
        expect(String(text), name).not.toMatch(/\bjpg\b/u);
      }
    }
  });
});

it('writes a smaller jpeg at a lower quality', async (): Promise<void> => {
  const before = sha256Of(noisePath);
  const low = await convert({
    inputPath: noisePath,
    outputName: 'noise low',
    format: 'jpeg',
    quality: 20,
  });
  const high = await convert({
    inputPath: noisePath,
    outputName: 'noise high',
    format: 'jpeg',
    quality: 95,
  });
  expect(low.isError).toBe(false);
  expect(high.isError).toBe(false);
  const lowPath = writtenPath(low.body, {
    width: NOISE_WIDTH,
    height: NOISE_HEIGHT,
    codec: 'jpeg',
    fileName: 'noise-converted.jpg',
    slug: 'noise-low',
  });
  const highPath = writtenPath(high.body, {
    width: NOISE_WIDTH,
    height: NOISE_HEIGHT,
    codec: 'jpeg',
    fileName: 'noise-converted.jpg',
    slug: 'noise-high',
  });
  expect(statSync(lowPath).size).toBeLessThan(statSync(highPath).size);
  expect(sha256Of(noisePath)).toBe(before);
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label',
  async ({ args }): Promise<void> => {
    await expectRejected({
      inputPath: photoPath,
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
      format: 'png',
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
      format: 'png',
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
      format: 'png',
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
      format: 'png',
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
      inputPath: 'photo.png',
      outputName: 'relative',
      format: 'png',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPath',
      value: 'photo.png',
      reason: 'relative-path',
    },
  );
});

it('rejects an output name that leaves no slug', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: photoPath,
      outputName: '!!!',
      format: 'png',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'outputName',
      value: '!!!',
      reason: 'empty-slug',
    },
  );
});
