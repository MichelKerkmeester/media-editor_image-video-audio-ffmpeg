// ───────────────────────────────────────────────────────────────────
// MODULE: Image Resize Tests
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

type RasterFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff';

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

const sandbox = createSandbox('image-resize-');

const KEPT_FORMATS: readonly RasterFormat[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'tiff',
];

const SCHEMA_REJECTIONS: readonly {
  readonly label: string;
  readonly args: Record<string, unknown>;
}[] = [
  { label: 'fit stretch', args: { fit: 'stretch', width: 32 } },
  { label: 'width 0', args: { width: 0 } },
  { label: 'width 32769', args: { width: 32769 } },
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

async function resize(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_resize', args);
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
  expect(body.tool).toBe('image_resize');
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
  const outcome = await resize(args);
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
        name: 'image_resize',
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

const widePath = await writeRaster('png', 'wide.png', 200, 100);
const smallPath = await writeRaster('png', 'small.png', 64, 48);

afterAll((): void => {
  sandbox.cleanup();
});

it('numbers two calls as 001 and 002', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const first = await resize({
    inputPath: widePath,
    outputName: 'first copy',
    width: 100,
  });
  const second = await resize({
    inputPath: widePath,
    outputName: 'second copy',
    width: 100,
  });
  expect(first.isError).toBe(false);
  expect(second.isError).toBe(false);
  const firstPath = writtenPath(first.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-resized.png',
    slug: 'first-copy',
  });
  const secondPath = writtenPath(second.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-resized.png',
    slug: 'second-copy',
  });
  expect(path.dirname(firstPath)).toBe(
    path.join(sandbox.outputDir, '001 - first-copy'),
  );
  expect(path.dirname(secondPath)).toBe(
    path.join(sandbox.outputDir, '002 - second-copy'),
  );
});

it('keeps the aspect ratio when only the width is set', async (): Promise<void> => {
  const before = sha256Of(widePath);
  const outcome = await resize({
    inputPath: widePath,
    outputName: 'aspect width',
    width: 100,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-resized.png',
    slug: 'aspect-width',
  });
  expect(sha256Of(widePath)).toBe(before);
});

it('keeps the aspect ratio when only the height is set', async (): Promise<void> => {
  const outcome = await resize({
    inputPath: widePath,
    outputName: 'aspect height',
    height: 50,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 100,
    height: 50,
    codec: 'png',
    fileName: 'wide-resized.png',
    slug: 'aspect-height',
  });
});

it('fills both sides when fit is fill', async (): Promise<void> => {
  const outcome = await resize({
    inputPath: widePath,
    outputName: 'exact fill',
    width: 80,
    height: 30,
    fit: 'fill',
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 80,
    height: 30,
    codec: 'png',
    fileName: 'wide-resized.png',
    slug: 'exact-fill',
  });
});

it('does not enlarge when withoutEnlargement stays true', async (): Promise<void> => {
  const outcome = await resize({
    inputPath: smallPath,
    outputName: 'stay small',
    width: 500,
    withoutEnlargement: true,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 64,
    height: 48,
    codec: 'png',
    fileName: 'small-resized.png',
    slug: 'stay-small',
  });
});

it('enlarges when withoutEnlargement is false', async (): Promise<void> => {
  const outcome = await resize({
    inputPath: smallPath,
    outputName: 'grow small',
    width: 500,
    withoutEnlargement: false,
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, {
    width: 500,
    height: 375,
    codec: 'png',
    fileName: 'small-resized.png',
    slug: 'grow-small',
  });
});

it.each(KEPT_FORMATS)(
  'keeps a %s input',
  async (format): Promise<void> => {
    const extension = inputExtension(format);
    const fileName = `kept-${format}${extension}`;
    const source = await writeRaster(format, fileName, 64, 48);
    const before = sha256Of(source);
    const outcome = await resize({
      inputPath: source,
      outputName: `kept ${format}`,
      width: 32,
    });
    expect(outcome.isError).toBe(false);
    writtenPath(outcome.body, {
      width: 32,
      height: 24,
      codec: format,
      fileName: `kept-${format}-resized${extension}`,
      slug: `kept-${format}`,
    });
    expect(sha256Of(source)).toBe(before);
  },
);

it('rejects a call that sets neither dimension', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'no size',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'width',
      value: null,
      reason: 'dimension-required',
    },
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
      width: 32,
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
      width: 32,
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
      width: 32,
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
      width: 32,
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
      width: 32,
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
      width: 32,
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
      name: 'image_resize',
      arguments: {
        inputPath: widePath,
        outputName: 'line check',
        width: 100,
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
