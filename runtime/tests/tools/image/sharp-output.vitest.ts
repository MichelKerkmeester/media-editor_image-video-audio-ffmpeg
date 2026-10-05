// ───────────────────────────────────────────────────────────────────
// MODULE: Sharp Output Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  assertImageContent,
  extensionForFormat,
  imageFormatName,
  normalizeFormat,
  openImage,
  outputSentence,
  readImageMetadata,
  writeImageOutputs,
} from '../../../src/tools/image/sharp-output.js';
import { buildOversizedPng, fixturePath } from '../../helpers/media.js';
import {
  createSandbox,
  listFolders,
  sha256Of,
} from '../../helpers/tool-client.js';

import type { ErrorCode } from '../../../src/core/errors.js';
import type { ResolvedInput } from '../../../src/core/path-guard.js';
import type { PlannedImage } from '../../../src/tools/image/sharp-output.js';
import type { Sharp } from 'sharp';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

type RasterFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'tiff' | 'avif';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('sharp-output-');
const context = createToolContext(sandbox.config);

const RASTER_FORMATS: readonly RasterFormat[] = [
  'jpeg',
  'png',
  'webp',
  'gif',
  'tiff',
  'avif',
];

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const svgPath = path.join(sandbox.allowedRoot, 'mark.svg');
const pdfPath = path.join(sandbox.allowedRoot, 'doc.pdf');
const emptyPath = path.join(sandbox.allowedRoot, 'empty.bin');
const textPath = path.join(sandbox.allowedRoot, 'note.txt');
writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
writeFileSync(pdfPath, '%PDF-1.4\n');
writeFileSync(emptyPath, Buffer.alloc(0));
writeFileSync(textPath, 'plain text');

const REFUSED_CONTENT = [
  ['svg', svgPath],
  ['pdf', pdfPath],
  ['video', fixturePath('main_video.mp4')],
  ['empty', emptyPath],
  ['text', textPath],
] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function encodeRaster(format: RasterFormat): Sharp {
  const image = sharp({
    create: {
      width: 64,
      height: 48,
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
): Promise<string> {
  const target = path.join(sandbox.allowedRoot, fileName);
  await encodeRaster(format).toFile(target);
  return target;
}

function resolved(filePath: string): ResolvedInput {
  return context.resolveInput(filePath, 'input', 'inputPath', 'image_resize');
}

function pngPlan(input: ResolvedInput, operation: string): PlannedImage {
  return {
    operation,
    pipeline: (): Sharp => openImage(input).png(),
  };
}

async function mediaErrorFrom(run: () => Promise<unknown>): Promise<MediaError> {
  try {
    await run();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(MediaError);
    if (error instanceof MediaError) {
      return error;
    }
  }
  throw new Error('expected a media error');
}

function expectCode(
  error: MediaError,
  code: ErrorCode,
  details: Record<string, unknown>,
): void {
  expect(error.code).toBe(code);
  expect(error.details).toEqual(details);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  sandbox.cleanup();
});

it.each(RASTER_FORMATS)(
  'accepts %s content',
  async (format): Promise<void> => {
    const extension = format === 'jpeg' ? 'jpg' : format;
    const filePath = await writeRaster(format, `raster-${format}.${extension}`);
    await assertImageContent(filePath);
  },
);

it.each(REFUSED_CONTENT)(
  'refuses %s content',
  async (_kind, filePath): Promise<void> => {
    const error = await mediaErrorFrom(() => assertImageContent(filePath));
    expectCode(error, ERROR_CODES.UNSUPPORTED_FORMAT, {
      reason: 'image-content',
    });
  },
);

it('reports INPUT_NOT_FOUND when the file is removed after the guard', async (): Promise<void> => {
  const filePath = await writeRaster('png', 'removed-late.png');
  const input = resolved(filePath);
  unlinkSync(filePath);
  const error = await mediaErrorFrom(() => readImageMetadata(input));
  expectCode(error, ERROR_CODES.INPUT_NOT_FOUND, {
    path: input.realPath,
    role: 'input',
  });
});

it('reads width and height from a png', async (): Promise<void> => {
  const filePath = await writeRaster('png', 'plain.png');
  const metadata = await readImageMetadata(resolved(filePath));
  expect(metadata.width).toBe(64);
  expect(metadata.height).toBe(48);
});

it('refuses a header that declares too many pixels', async (): Promise<void> => {
  const filePath = path.join(sandbox.allowedRoot, 'bomb.png');
  writeFileSync(filePath, buildOversizedPng());
  const error = await mediaErrorFrom(
    () => readImageMetadata(resolved(filePath)),
  );
  expectCode(error, ERROR_CODES.UNSUPPORTED_FORMAT, {
    reason: 'image-pixel-limit',
  });
});

it('refuses a png signature followed by garbage', async (): Promise<void> => {
  const filePath = path.join(sandbox.allowedRoot, 'garbage.png');
  writeFileSync(filePath, Buffer.concat([
    PNG_SIGNATURE,
    Buffer.from('not-a-png-body'),
  ]));
  const error = await mediaErrorFrom(
    () => readImageMetadata(resolved(filePath)),
  );
  expectCode(error, ERROR_CODES.UNSUPPORTED_FORMAT, {});
});

it('normalizes jpg and maps format extensions', (): void => {
  expect(normalizeFormat('jpg')).toBe('jpeg');
  expect(extensionForFormat('jpeg')).toBe('.jpg');
  expect(extensionForFormat('tiff')).toBe('.tiff');
  expect(extensionForFormat('gif')).toBe('.gif');
  expect(extensionForFormat('png')).toBe('.png');
  expect(extensionForFormat('webp')).toBe('.webp');
  expect(extensionForFormat('avif')).toBe('.avif');
  expect(extensionForFormat('heif')).toBe('.avif');
});

it('writes numbered folders without changing the input', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const filePath = await writeRaster('png', 'photo.png');
  const input = resolved(filePath);
  const before = sha256Of(filePath);

  const first = await writeImageOutputs(context, {
    tool: 'image_resize',
    outputName: 'hero',
    input,
    plans: [pngPlan(input, 'resized')],
  });
  expect(path.basename(first.folder.folderPath)).toBe('001 - hero');
  expect(readdirSync(first.folder.folderPath).sort()).toEqual([
    'photo-resized.png',
  ]);
  const written = first.images[0];
  if (written === undefined) {
    throw new Error('expected one written image');
  }
  expect(written.entry.mediaType).toBe('image');
  expect(written.entry.bytes).toBe(statSync(written.entry.path).size);
  expect(written.entry.width).toBe(64);
  expect(written.entry.height).toBe(48);
  expect(written.entry.codec).toBe('png');
  expect(written.entry).not.toHaveProperty('durationSeconds');
  expect(first.warnings).toEqual([]);
  expect(sha256Of(filePath)).toBe(before);
  expect(outputSentence(first)).toBe(
    `Output saved to ${written.entry.path}.`,
  );

  const second = await writeImageOutputs(context, {
    tool: 'image_resize',
    outputName: 'hero',
    input,
    plans: [pngPlan(input, 'resized')],
  });
  expect(path.basename(second.folder.folderPath)).toBe('002 - hero');

  const pair = await writeImageOutputs(context, {
    tool: 'image_resize',
    outputName: 'pair',
    input,
    plans: [pngPlan(input, 'a'), pngPlan(input, 'b')],
  });
  expect(path.basename(pair.folder.folderPath)).toBe('003 - pair');
  expect(readdirSync(pair.folder.folderPath).sort()).toEqual([
    'photo-a.png',
    'photo-b.png',
  ]);
  expect(pair.images).toHaveLength(2);
  expect(outputSentence(pair)).toBe(
    `Output saved to ${pair.folder.folderPath}/ (2 files).`,
  );
  expect(sha256Of(filePath)).toBe(before);
});

it('removes the folder when a plan throws', async (): Promise<void> => {
  const filePath = await writeRaster('png', 'plan-throws.png');
  const input = resolved(filePath);
  const failure = new MediaError(
    ERROR_CODES.INVALID_INPUT,
    'A dimension is required.',
    { parameter: 'width', reason: 'dimension-required' },
  );
  const before = listFolders(sandbox.outputDir);
  const error = await mediaErrorFrom(() => writeImageOutputs(context, {
    tool: 'image_resize',
    outputName: 'throws',
    input,
    plans: [{
      operation: 'resized',
      pipeline: (): Sharp => {
        throw failure;
      },
    }],
  }));
  expect(error).toBe(failure);
  expectCode(error, ERROR_CODES.INVALID_INPUT, failure.details);
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('removes the folder when two plans share an operation', async (): Promise<void> => {
  const filePath = await writeRaster('png', 'same-operation.png');
  const input = resolved(filePath);
  const before = listFolders(sandbox.outputDir);
  const error = await mediaErrorFrom(() => writeImageOutputs(context, {
    tool: 'image_resize',
    outputName: 'clash',
    input,
    plans: [pngPlan(input, 'copy'), pngPlan(input, 'copy')],
  }));
  expect(error.code).toBe(ERROR_CODES.OUTPUT_EXISTS);
  expect(error.details.stage).toBe('run');
  expect(typeof error.details.path).toBe('string');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('removes the folder when the input body is truncated', async (): Promise<void> => {
  const fullPath = await writeRaster('png', 'whole.png');
  const truncatedPath = path.join(sandbox.allowedRoot, 'truncated.png');
  writeFileSync(truncatedPath, readFileSync(fullPath).subarray(0, 33));
  const input = resolved(truncatedPath);
  const before = listFolders(sandbox.outputDir);
  const error = await mediaErrorFrom(() => writeImageOutputs(context, {
    tool: 'image_resize',
    outputName: 'corrupt',
    input,
    plans: [pngPlan(input, 'resized')],
  }));
  expectCode(error, ERROR_CODES.UNSUPPORTED_FORMAT, {});
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('reports an avif file as avif, not heif', async (): Promise<void> => {
  expect(imageFormatName('heif')).toBe('avif');
  expect(imageFormatName('jpeg')).toBe('jpeg');
  const filePath = await writeRaster('png', 'to-avif.png');
  const input = resolved(filePath);
  const plan: PlannedImage = {
    operation: 'converted',
    pipeline: (): Sharp => openImage(input).avif({ quality: 60 }),
  };
  const written = await writeImageOutputs(context, {
    tool: 'image_convert',
    outputName: 'avif-codec',
    input,
    plans: [plan],
  });
  const image = written.images[0];
  if (image === undefined) {
    throw new Error('expected one written image');
  }
  expect(image.format).toBe('avif');
  expect(image.entry.codec).toBe('avif');
  expect(path.extname(image.entry.path)).toBe('.avif');
});
