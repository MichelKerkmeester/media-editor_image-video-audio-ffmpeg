// ───────────────────────────────────────────────────────────────────
// MODULE: Sharp Output
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { rmSync } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { ERROR_CODES, isMediaError, MediaError } from '../../core/errors.js';
import { outputFileName, writeExclusive } from '../../core/output-folder.js';
import { assertOutputNotOnInput } from '../../core/path-guard.js';
import { describeOutput } from '../../core/result.js';

import type { FileHandle } from 'node:fs/promises';
import type { Metadata, Sharp } from 'sharp';
import type { AllocatedFolder } from '../../core/output-folder.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { OutputEntry } from '../../core/result.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Format a tool schema accepts. `jpg` is an alias and stays in the enum. */
export type OutputFormatValue = (typeof OUTPUT_FORMAT_VALUES)[number];

/** Format passed to a sharp encoder. `jpg` has already been normalized. */
export type EncoderFormat = 'jpeg' | 'png' | 'webp' | 'avif';

/**
 * One file a writing image tool wants in the numbered folder.
 * `pipeline` must return a new instance on every call.
 */
export interface PlannedImage {
  /** Token placed before the extension: `<stem>-<operation><ext>`. */
  readonly operation: string;

  /** Builds a fresh pipeline that already includes its encoder. */
  readonly pipeline: () => Sharp;
}

/** One image written into the call's folder. */
export interface WrittenImage {
  /** Output entry, including the read-back when it succeeded. */
  readonly entry: OutputEntry;

  /** Format of the encoded buffer, with sharp's `heif` reported as `avif`. */
  readonly format: string;
}

/** Everything a writing image call produced. */
export interface WrittenImages {
  /** Numbered folder that holds the files. */
  readonly folder: AllocatedFolder;

  /** Written files, in plan order. */
  readonly images: readonly WrittenImage[];

  /** Read-back notes. Empty when every file could be described. */
  readonly warnings: readonly string[];
}

/** Inputs for one writing image call. */
export interface ImageOutputRequest {
  /** Registered tool name, stored on a configuration failure. */
  readonly tool: string;

  /** Description slugged into the folder name. */
  readonly outputName: string;

  /** Caller file the pipelines read. */
  readonly input: ResolvedInput;

  /** Files to write, in order. */
  readonly plans: readonly PlannedImage[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Sharp refuses an input whose width times height is above this. */
export const IMAGE_PIXEL_LIMIT = 100_000_000;

/**
 * Closed `format` enum, including the `jpg` alias.
 * Schemas use this list with no transform, so the alias stays visible.
 */
export const OUTPUT_FORMAT_VALUES = [
  'jpeg',
  'jpg',
  'png',
  'webp',
  'avif',
] as const;

const HEADER_BYTES = 16;

const JPEG_PREFIX = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const RIFF_PREFIX = Buffer.from('RIFF');
const WEBP_BRAND = Buffer.from('WEBP');
const GIF87A = Buffer.from('GIF87a');
const GIF89A = Buffer.from('GIF89a');
const TIFF_LITTLE_ENDIAN = Buffer.from([0x49, 0x49, 0x2a, 0x00]);
const TIFF_BIG_ENDIAN = Buffer.from([0x4d, 0x4d, 0x00, 0x2a]);
const FTYP_BOX = Buffer.from('ftyp');
const AVIF_BRAND = Buffer.from('avif');
const AVIS_BRAND = Buffer.from('avis');

const DECODE_MARKERS = [
  'corrupt',
  'unsupported image format',
  'premature end',
  'bad seek',
  'invalid',
  'end of stream',
] as const;

const LOADER_NAMES = [
  'jpegload',
  'pngload',
  'webpload',
  'gifload',
  'tiffload',
  'heifload',
  'magickload',
  'svgload',
  'pdfload',
] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function unsupportedContent(): MediaError {
  return new MediaError(
    ERROR_CODES.UNSUPPORTED_FORMAT,
    'The file is not a supported image.',
    { reason: 'image-content' },
  );
}

function pixelLimitError(): MediaError {
  return new MediaError(
    ERROR_CODES.UNSUPPORTED_FORMAT,
    'The image declares more pixels than the limit allows.',
    { reason: 'image-pixel-limit' },
  );
}

function undecodableImage(): MediaError {
  return new MediaError(
    ERROR_CODES.UNSUPPORTED_FORMAT,
    'The file could not be read as an image.',
    {},
  );
}

function thrownMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '';
}

function matchesAt(header: Buffer, offset: number, needle: Buffer): boolean {
  const end = offset + needle.length;
  if (header.length < end) {
    return false;
  }
  return header.subarray(offset, end).equals(needle);
}

function hasImageSignature(header: Buffer): boolean {
  if (
    matchesAt(header, 0, JPEG_PREFIX)
    || matchesAt(header, 0, PNG_SIGNATURE)
    || matchesAt(header, 0, GIF87A)
    || matchesAt(header, 0, GIF89A)
    || matchesAt(header, 0, TIFF_LITTLE_ENDIAN)
    || matchesAt(header, 0, TIFF_BIG_ENDIAN)
  ) {
    return true;
  }
  if (matchesAt(header, 0, RIFF_PREFIX) && matchesAt(header, 8, WEBP_BRAND)) {
    return true;
  }
  if (!matchesAt(header, 4, FTYP_BOX)) {
    return false;
  }
  return matchesAt(header, 8, AVIF_BRAND) || matchesAt(header, 8, AVIS_BRAND);
}

function exceedsPixelLimit(
  width: number | undefined,
  height: number | undefined,
): boolean {
  if (typeof width !== 'number' || typeof height !== 'number') {
    return false;
  }
  return width * height > IMAGE_PIXEL_LIMIT;
}

/**
 * A metadata read can fail before it returns dimensions. The wording is
 * the only signal that the failure was the pixel limit.
 */
function errorFromDecode(error: unknown): MediaError {
  if (isMediaError(error)) {
    return error;
  }
  if (thrownMessage(error).toLowerCase().includes('pixel limit')) {
    return pixelLimitError();
  }
  return undecodableImage();
}

function isDecodeFailure(message: string): boolean {
  const lower = message.toLowerCase();
  for (const marker of DECODE_MARKERS) {
    if (lower.includes(marker)) {
      return true;
    }
  }
  for (const loader of LOADER_NAMES) {
    if (lower.includes(loader)) {
      return true;
    }
  }
  return false;
}

/**
 * Library text stays out of `details`. A media error is returned unchanged
 * so its code and details survive.
 */
function mappedWriteError(error: unknown): unknown {
  if (isMediaError(error)) {
    return error;
  }
  const message = thrownMessage(error);
  if (message.toLowerCase().includes('pixel limit')) {
    return pixelLimitError();
  }
  if (isDecodeFailure(message)) {
    return undecodableImage();
  }
  return error;
}

function removeFolder(folderPath: string): void {
  try {
    rmSync(folderPath, { recursive: true, force: true });
  } catch {
    // The original failure has to reach the caller unchanged.
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

async function openForRead(realPath: string): Promise<FileHandle> {
  try {
    return await open(realPath, 'r');
  } catch (error: unknown) {
    // The guard saw the file, so a missing one here was removed after the check.
    if (isMissingFile(error)) {
      throw new MediaError(
        ERROR_CODES.INPUT_NOT_FOUND,
        `Input file not found: ${realPath}`,
        { path: realPath, role: 'input' },
      );
    }
    throw error;
  }
}

async function readHeader(realPath: string): Promise<Buffer> {
  const handle = await openForRead(realPath);
  try {
    const header = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await handle.read(header, 0, HEADER_BYTES, 0);
    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function entryForWritten(
  target: string,
  format: string,
  warnings: string[],
): Promise<OutputEntry> {
  const codec = imageFormatName(format);
  try {
    const metadata = await sharp(target, {
      limitInputPixels: IMAGE_PIXEL_LIMIT,
    }).metadata();
    return describeOutput(target, 'image', {
      width: metadata.width,
      height: metadata.height,
      codec,
    });
  } catch {
    // The file stays. A read-back that cannot describe it is a warning.
    const baseName = path.basename(target);
    warnings.push(`Could not read image details back from ${baseName}.`);
    return describeOutput(target, 'image', { codec });
  }
}

async function writeOnePlan(
  request: ImageOutputRequest,
  folder: AllocatedFolder,
  plan: PlannedImage,
  warnings: string[],
): Promise<WrittenImage> {
  const encoded = await plan.pipeline().toBuffer({ resolveWithObject: true });
  const fileName = outputFileName(
    request.input.rawPath,
    plan.operation,
    extensionForFormat(encoded.info.format),
  );
  const target = path.join(folder.folderPath, fileName);
  assertOutputNotOnInput(target, [request.input.realPath]);
  await writeExclusive(target, encoded.data);
  const entry = await entryForWritten(target, encoded.info.format, warnings);
  return { entry, format: imageFormatName(encoded.info.format) };
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Map a schema format onto the encoder name.
 *
 * `jpg` becomes `jpeg`. Every other accepted value is already an encoder name.
 *
 * @param value - Format from the tool schema, alias included
 * @returns The encoder format
 */
export function normalizeFormat(value: OutputFormatValue): EncoderFormat {
  if (value === 'jpg') {
    return 'jpeg';
  }
  return value;
}

/**
 * Format name as this server reports it.
 *
 * Sharp names an AVIF file `heif`. The content gate admits only AVIF brands,
 * so `heif` is reported as `avif`. Every other name passes through.
 *
 * @param format - Format name reported by sharp
 * @returns The name a result reports
 */
export function imageFormatName(format: string): string {
  if (format === 'heif') {
    return 'avif';
  }
  return format;
}

/**
 * File extension for a sharp format name, including the leading dot.
 *
 * JPEG is written as `.jpg`. HEIF is written as `.avif` because that is the
 * still-image brand this server accepts.
 *
 * @param format - Format name reported by sharp, or an encoder format
 * @returns Extension including the leading dot
 */
export function extensionForFormat(format: string): string {
  if (format === 'jpeg') {
    return '.jpg';
  }
  if (format === 'heif') {
    return '.avif';
  }
  return `.${format}`;
}

/**
 * Accept only a JPEG, PNG, WebP, GIF, TIFF, or AVIF signature.
 *
 * The check reads the first 16 bytes and does not decode the file. Anything
 * else, including a short or empty file, is refused.
 *
 * @param realPath - Canonical path of the caller file
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` with `reason: "image-content"`,
 * or `INPUT_NOT_FOUND` when the file was removed after the path guard ran
 */
export async function assertImageContent(realPath: string): Promise<void> {
  const header = await readHeader(realPath);
  if (!hasImageSignature(header)) {
    throw unsupportedContent();
  }
}

/**
 * Read sharp metadata after the content gate and the pixel limit.
 *
 * The product of width and height is checked because a metadata read can
 * return dimensions without enforcing the limit. A decode failure does not
 * carry the library message.
 *
 * @param input - Caller file accepted by the path guard
 * @returns Metadata for an image inside the pixel limit
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when the content, the pixel
 * limit, or the decode refuses the file
 */
export async function readImageMetadata(
  input: ResolvedInput,
): Promise<Metadata> {
  await assertImageContent(input.realPath);
  let metadata: Metadata;
  try {
    metadata = await sharp(input.realPath, {
      limitInputPixels: IMAGE_PIXEL_LIMIT,
    }).metadata();
  } catch (error: unknown) {
    throw errorFromDecode(error);
  }
  if (exceedsPixelLimit(metadata.width, metadata.height)) {
    throw pixelLimitError();
  }
  return metadata;
}

/**
 * Open a caller file with the pixel limit applied.
 *
 * This is the only place a tool builds a pipeline from a caller file.
 * The returned pipeline has not encoded anything yet.
 *
 * @param input - Caller file accepted by the path guard
 * @returns A new sharp pipeline for that file
 */
export function openImage(input: ResolvedInput): Sharp {
  return sharp(input.realPath, { limitInputPixels: IMAGE_PIXEL_LIMIT });
}

/**
 * Encode each plan into one fresh numbered folder.
 *
 * Any failure after the folder exists removes that folder and then throws.
 * A media error is rethrown unchanged. A pixel-limit or corrupt-image failure
 * becomes `UNSUPPORTED_FORMAT`. Any other error is rethrown as it is.
 *
 * @param context - Services for the numbered folder
 * @param request - Tool name, output description, input, and plans
 * @returns The folder, the written images, and any read-back warnings
 * @throws {@link MediaError} When encoding or the exclusive write fails with a
 * known image or output code
 */
export async function writeImageOutputs(
  context: ToolContext,
  request: ImageOutputRequest,
): Promise<WrittenImages> {
  const folder = context.allocateOutputFolder(
    request.outputName,
    request.tool,
  );
  const warnings: string[] = [];
  const images: WrittenImage[] = [];
  try {
    for (const plan of request.plans) {
      images.push(await writeOnePlan(request, folder, plan, warnings));
    }
  } catch (error: unknown) {
    removeFolder(folder.folderPath);
    throw mappedWriteError(error);
  }
  return { folder, images, warnings };
}

/**
 * Location sentence a tool appends to its own summary.
 *
 * One image names that file. Several images name the folder and the count.
 *
 * @param written - Files written for one call
 * @returns The sentence, ending with a period
 */
export function outputSentence(written: WrittenImages): string {
  const [first] = written.images;
  if (written.images.length === 1 && first !== undefined) {
    return `Output saved to ${first.entry.path}.`;
  }
  const count = written.images.length;
  const folderPath = written.folder.folderPath;
  return `Output saved to ${folderPath}/ (${count} files).`;
}
