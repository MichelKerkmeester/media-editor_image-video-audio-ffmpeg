// ───────────────────────────────────────────────────────────────────
// MODULE: Image Batch Resize Tests
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

type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif';

interface ExpectedFile {
  readonly width: number;
  readonly height: number;
  readonly codec: string;
  readonly fileName: string;
}

interface SizeArgument {
  readonly width: number;
  readonly height?: number;
  readonly suffix: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('image-batch-resize-');

const OUTPUT_FORMATS: readonly OutputFormat[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
];

const TWENTY_ONE_SIZES: readonly SizeArgument[] = Array.from(
  { length: 21 },
  (_unused, index): SizeArgument => ({
    width: 16,
    suffix: `s${index}`,
  }),
);

const SCHEMA_REJECTIONS: readonly {
  readonly label: string;
  readonly args: Record<string, unknown>;
}[] = [
  {
    label: 'suffix A',
    args: { sizes: [{ width: 16, suffix: 'A' }] },
  },
  {
    label: 'suffix a.b',
    args: { sizes: [{ width: 16, suffix: 'a.b' }] },
  },
  {
    label: 'suffix a/b',
    args: { sizes: [{ width: 16, suffix: 'a/b' }] },
  },
  {
    label: 'suffix -a',
    args: { sizes: [{ width: 16, suffix: '-a' }] },
  },
  {
    label: 'suffix of 17 characters',
    args: { sizes: [{ width: 16, suffix: 'a'.repeat(17) }] },
  },
  {
    label: 'height 0',
    args: { sizes: [{ width: 16, height: 0, suffix: 'a' }] },
  },
  {
    label: 'height 32769',
    args: { sizes: [{ width: 16, height: 32769, suffix: 'a' }] },
  },
  {
    label: 'a fractional height',
    args: { sizes: [{ width: 16, height: 8.5, suffix: 'a' }] },
  },
  { label: 'empty sizes', args: { sizes: [] } },
  { label: '21 sizes', args: { sizes: TWENTY_ONE_SIZES } },
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

async function batchResize(
  args: Record<string, unknown>,
): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'image_batch_resize', args);
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

function expectImages(
  body: Record<string, unknown>,
  slug: string,
  expected: readonly ExpectedFile[],
): string {
  expect(body.tool).toBe('image_batch_resize');
  expect(body.warnings).toEqual([]);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(expected.length);
  let folder = '';
  for (const [index, wanted] of expected.entries()) {
    const entry = asRecord(outputs[index]);
    expect(entry.mediaType).toBe('image');
    expect(entry.width).toBe(wanted.width);
    expect(entry.height).toBe(wanted.height);
    expect(entry.codec).toBe(wanted.codec);
    expect(entry).not.toHaveProperty('durationSeconds');
    if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
      throw new Error('expected an image file');
    }
    expect(entry.bytes).toBe(statSync(entry.path).size);
    expect(path.basename(entry.path)).toBe(wanted.fileName);
    const entryFolder = path.dirname(entry.path);
    if (folder === '') {
      folder = entryFolder;
    } else {
      expect(entryFolder).toBe(folder);
    }
  }
  expect(path.dirname(folder)).toBe(sandbox.outputDir);
  const folderName = path.basename(folder);
  expect(folderName).toMatch(/^\d{3} - /u);
  expect(folderName.endsWith(` - ${slug}`)).toBe(true);
  return folder;
}

function extensionFor(format: OutputFormat): string {
  if (format === 'jpeg') {
    return '.jpg';
  }
  return `.${format}`;
}

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await batchResize(args);
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
        name: 'image_batch_resize',
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

const heroPath = await writeRaster('jpeg', 'hero.jpg', 200, 100);
const plainPath = await writeRaster('png', 'plain.png', 64, 48);

afterAll((): void => {
  sandbox.cleanup();
});

it('writes three sizes into one numbered folder', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(heroPath);
  const outcome = await batchResize({
    inputPath: heroPath,
    outputName: 'hero sizes',
    sizes: [
      { width: 50, suffix: 'sm' },
      { width: 100, suffix: 'md' },
      { width: 40, suffix: 'a' },
    ],
  });
  expect(outcome.isError).toBe(false);
  const folder = expectImages(outcome.body, 'hero-sizes', [
    {
      width: 50,
      height: 25,
      codec: 'jpeg',
      fileName: 'hero-sm.jpg',
    },
    {
      width: 100,
      height: 50,
      codec: 'jpeg',
      fileName: 'hero-md.jpg',
    },
    {
      width: 40,
      height: 20,
      codec: 'jpeg',
      fileName: 'hero-a.jpg',
    },
  ]);
  expect(folder).toBe(path.join(sandbox.outputDir, '001 - hero-sizes'));
  expect(sha256Of(heroPath)).toBe(before);
});

it('crops to the exact box when a height is given', async (): Promise<void> => {
  const before = sha256Of(heroPath);
  const outcome = await batchResize({
    inputPath: heroPath,
    outputName: 'boxed sizes',
    sizes: [
      { width: 50, height: 50, suffix: 'sq' },
      { width: 60, height: 20, suffix: 'wide' },
    ],
  });
  expect(outcome.isError).toBe(false);
  expectImages(outcome.body, 'boxed-sizes', [
    {
      width: 50,
      height: 50,
      codec: 'jpeg',
      fileName: 'hero-sq.jpg',
    },
    {
      width: 60,
      height: 20,
      codec: 'jpeg',
      fileName: 'hero-wide.jpg',
    },
  ]);
  expect(sha256Of(heroPath)).toBe(before);
});

it('names the folder when several sizes are written', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const result = await client.callTool({
      name: 'image_batch_resize',
      arguments: {
        subfolder: true,
        inputPath: heroPath,
        outputName: 'line check',
        sizes: [
          { width: 50, suffix: 'sm' },
          { width: 100, suffix: 'md' },
          { width: 40, suffix: 'lg' },
        ],
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
    expect(outputs).toHaveLength(3);
    const entry = asRecord(outputs[0]);
    if (typeof entry.path !== 'string') {
      throw new Error('expected a path');
    }
    const folderPath = path.dirname(entry.path);
    expect(first.text).toContain(`${folderPath}/`);
    expect(first.text).toContain('(3 files)');
    expect(first.text).not.toContain(path.basename(entry.path));
  });
});

it('names the single file when one size is written', async (): Promise<void> => {
  const before = sha256Of(heroPath);
  await withToolClient(sandbox.config, async (client) => {
    const result = await client.callTool({
      name: 'image_batch_resize',
      arguments: {
        subfolder: true,
        inputPath: heroPath,
        outputName: 'one size',
        sizes: [{ width: 50, suffix: 'sm' }],
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
    const body = asRecord(result.structuredContent);
    const folder = expectImages(body, 'one-size', [
      {
        width: 50,
        height: 25,
        codec: 'jpeg',
        fileName: 'hero-sm.jpg',
      },
    ]);
    const entry = asRecord(asList(body.outputs)[0]);
    if (typeof entry.path !== 'string') {
      throw new Error('expected a path');
    }
    expect(path.dirname(entry.path)).toBe(folder);
    expect(first.text).toContain(entry.path);
    expect(first.text).not.toContain('(1 files)');
  });
  expect(sha256Of(heroPath)).toBe(before);
});

it('writes webp files when format is webp', async (): Promise<void> => {
  const before = sha256Of(plainPath);
  const outcome = await batchResize({
    inputPath: plainPath,
    outputName: 'webp sizes',
    sizes: [{ width: 32, suffix: 'sm' }],
    format: 'webp',
  });
  expect(outcome.isError).toBe(false);
  expectImages(outcome.body, 'webp-sizes', [
    {
      width: 32,
      height: 24,
      codec: 'webp',
      fileName: 'plain-sm.webp',
    },
  ]);
  expect(sha256Of(plainPath)).toBe(before);
});

it('writes jpeg files when format is jpg', async (): Promise<void> => {
  const outcome = await batchResize({
    inputPath: plainPath,
    outputName: 'jpg alias',
    sizes: [{ width: 32, suffix: 'sm' }],
    format: 'jpg',
  });
  expect(outcome.isError).toBe(false);
  expectImages(outcome.body, 'jpg-alias', [
    {
      width: 32,
      height: 24,
      codec: 'jpeg',
      fileName: 'plain-sm.jpg',
    },
  ]);
});

it.each(OUTPUT_FORMATS)(
  're-encodes as %s',
  async (format): Promise<void> => {
    const outcome = await batchResize({
      inputPath: plainPath,
      outputName: `as ${format}`,
      sizes: [{ width: 32, suffix: 'sm' }],
      format,
    });
    expect(outcome.isError).toBe(false);
    expectImages(outcome.body, `as-${format}`, [
      {
        width: 32,
        height: 24,
        codec: format,
        fileName: `plain-sm${extensionFor(format)}`,
      },
    ]);
  },
);

it('rejects a repeated suffix before any path work', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'duplicate suffix',
      sizes: [
        { width: 16, suffix: 'thumb' },
        { width: 32, suffix: 'thumb' },
      ],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'sizes',
      value: 'thumb',
      reason: 'duplicate-suffix',
    },
  );
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label',
  async ({ args }): Promise<void> => {
    await expectRejected({
      inputPath: heroPath,
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
      sizes: [{ width: 16, suffix: 'sm' }],
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
      sizes: [{ width: 16, suffix: 'sm' }],
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
      sizes: [{ width: 16, suffix: 'sm' }],
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
      sizes: [{ width: 16, suffix: 'sm' }],
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
      inputPath: 'hero.jpg',
      outputName: 'relative',
      sizes: [{ width: 16, suffix: 'sm' }],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPath',
      value: 'hero.jpg',
      reason: 'relative-path',
    },
  );
});

it('rejects an output name that leaves no slug', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: heroPath,
      outputName: '!!!',
      sizes: [{ width: 16, suffix: 'sm' }],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'outputName',
      value: '!!!',
      reason: 'empty-slug',
    },
  );
});
