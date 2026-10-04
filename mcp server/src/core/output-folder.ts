// ───────────────────────────────────────────────────────────────────
// MODULE: Output Folder
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { mkdirSync, readdirSync, realpathSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import path from 'node:path';

import type { FileHandle } from 'node:fs/promises';

import { ERROR_CODES, MediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One fresh numbered folder for a single writing call. */
export interface AllocatedFolder {
  /** Absolute path of the folder that was created. */
  readonly folderPath: string;

  /** Sequence number, compared by value. */
  readonly number: number;

  /** Slug used as the description segment. */
  readonly name: string;
}

type OutputFolderReason = 'unset' | 'unusable';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const SLUG_MAX_CHARS = 60;
const FILE_NAME_MAX_BYTES = 120;
const MAX_CREATE_ATTEMPTS = 100;
const NUMBER_WIDTH = 3;
const FOLDER_NUMBER = /^(\d{3,}) - /;

const WINDOWS_DEVICE_NAMES: ReadonlySet<string> = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isAsciiWhitespace(char: string): boolean {
  return char === ' '
    || char === '\t'
    || char === '\n'
    || char === '\r'
    || char === '\f'
    || char === '\v';
}

function isAsciiSlugBody(char: string): boolean {
  const isLetter = char >= 'a' && char <= 'z';
  const isDigit = char >= '0' && char <= '9';
  return isLetter || isDigit;
}

function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = error.code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code;
}

function collapseSlug(text: string): string {
  let slug = '';
  let hyphenPending = false;

  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined || codePoint > 0x7f) {
      continue;
    }

    if (isAsciiWhitespace(char) || char === '-') {
      hyphenPending = true;
      continue;
    }

    const lower = char.toLowerCase();
    if (!isAsciiSlugBody(lower)) {
      continue;
    }

    if (hyphenPending && slug.length > 0) {
      slug += '-';
    }
    hyphenPending = false;
    slug += lower;
  }

  return slug;
}

function limitSlug(slug: string): string {
  if (slug.length <= SLUG_MAX_CHARS) {
    return slug;
  }
  const cut = slug.slice(0, SLUG_MAX_CHARS);
  if (cut.endsWith('-')) {
    return cut.slice(0, -1);
  }
  return cut;
}

function isWindowsDeviceName(slug: string): boolean {
  const beforeDot = slug.split('.')[0] ?? slug;
  return WINDOWS_DEVICE_NAMES.has(slug) || WINDOWS_DEVICE_NAMES.has(beforeDot);
}

function emptySlug(text: string): MediaError {
  return new MediaError(
    ERROR_CODES.INVALID_INPUT,
    'Output name leaves no usable slug.',
    {
      parameter: 'outputName',
      value: text,
      reason: 'empty-slug',
    },
  );
}

function missingOutputFolder(
  tool: string,
  reason: OutputFolderReason,
): MediaError {
  const message = reason === 'unset'
    ? 'No output folder is configured.'
    : 'The output folder cannot take a new folder.';
  return new MediaError(ERROR_CODES.CONFIG_MISSING, message, {
    setting: 'outputFolder',
    reason,
    tool,
  });
}

function outputExists(filePath: string): MediaError {
  return new MediaError(
    ERROR_CODES.OUTPUT_EXISTS,
    `Output already exists and is never overwritten: ${filePath}`,
    {
      path: filePath,
      stage: 'run',
    },
  );
}

function highestFolderNumber(directory: string): number {
  const entries = readdirSync(directory);
  let highest = 0;
  for (const entry of entries) {
    const digits = FOLDER_NUMBER.exec(entry)?.[1];
    if (digits === undefined) {
      continue;
    }
    const value = Number(digits);
    if (value > highest) {
      highest = value;
    }
  }
  return highest;
}

function inputStem(inputPath: string): string {
  const base = path.basename(inputPath);
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    return base;
  }
  return base.slice(0, dot);
}

async function writeAll(handle: FileHandle, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.length) {
    const { bytesWritten } = await handle.write(
      data,
      offset,
      data.length - offset,
    );
    if (bytesWritten <= 0) {
      throw new Error('The output write made no progress.');
    }
    offset += bytesWritten;
  }
}

async function closeQuietly(handle: FileHandle): Promise<void> {
  try {
    await handle.close();
  } catch {
    // The write error has to reach the caller unchanged.
  }
}

async function removeCreated(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Only a file this call created is removed, and a failed removal
    // must not replace the original write error.
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Turn an output description into one path segment.
 *
 * Non-ASCII characters are dropped rather than transliterated. A Windows
 * device name is suffixed on every platform so the folder can be copied.
 *
 * @param text - Caller output description
 * @param platform - Host platform. The device-name rule does not depend on it.
 * @returns A slug of at most 60 characters
 * @throws {@link MediaError} When nothing usable remains (`INVALID_INPUT`)
 */
export function slugify(
  text: string,
  platform: NodeJS.Platform = process.platform,
): string {
  // Every host keeps the suffix: Windows cannot create these names.
  void platform;
  const slug = limitSlug(collapseSlug(text));
  if (slug.length === 0) {
    throw emptySlug(text);
  }
  if (isWindowsDeviceName(slug)) {
    return `${slug}-out`;
  }
  return slug;
}

/**
 * Create the next numbered folder under the output root.
 *
 * Gaps are left empty. The number is the highest match plus one.
 *
 * @param outputDir - Configured output root, or undefined when unset
 * @param outputName - Description slugged into the folder name
 * @param tool - Tool name stored on a configuration failure
 * @returns The folder that was created
 * @throws {@link MediaError} When the slug is empty, or the root is unset or unusable
 */
export function allocateOutputFolder(
  outputDir: string | undefined,
  outputName: string,
  tool: string,
): AllocatedFolder {
  if (outputDir === undefined) {
    throw missingOutputFolder(tool, 'unset');
  }

  const name = slugify(outputName);
  let realOutputDir: string;
  try {
    mkdirSync(outputDir, { recursive: true });
    realOutputDir = realpathSync.native(outputDir);
  } catch {
    throw missingOutputFolder(tool, 'unusable');
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    let number: number;
    try {
      number = highestFolderNumber(realOutputDir) + 1;
    } catch {
      throw missingOutputFolder(tool, 'unusable');
    }

    const folderName = `${String(number).padStart(NUMBER_WIDTH, '0')} - ${name}`;
    const folderPath = path.join(realOutputDir, folderName);
    try {
      mkdirSync(folderPath);
      return { folderPath, number, name };
    } catch (error: unknown) {
      if (nodeErrorCode(error) === 'EEXIST') {
        continue;
      }
      throw missingOutputFolder(tool, 'unusable');
    }
  }

  throw missingOutputFolder(tool, 'unusable');
}

/**
 * Write bytes to a new file, failing when the path is already taken.
 *
 * The exclusive flag refuses anything already at the path. A later write
 * failure removes only the file this call created and rethrows the original
 * error.
 *
 * @param filePath - Destination path
 * @param data - Bytes to store
 * @throws {@link MediaError} When the path already exists (`OUTPUT_EXISTS`)
 */
export async function writeExclusive(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  let handle: FileHandle;
  try {
    handle = await open(filePath, 'wx');
  } catch (error: unknown) {
    if (nodeErrorCode(error) === 'EEXIST') {
      throw outputExists(filePath);
    }
    throw error;
  }

  try {
    await writeAll(handle, data);
  } catch (error: unknown) {
    await closeQuietly(handle);
    await removeCreated(filePath);
    throw error;
  }

  await handle.close();
}

/**
 * Take the longest prefix that fits in a UTF-8 byte budget.
 *
 * The cut stops before a code point that would not fit, so a surrogate pair
 * or a multi-byte character is never split.
 *
 * @param text - Source text
 * @param maxBytes - Maximum UTF-8 size of the result
 * @returns A prefix ending on a code-point boundary
 */
export function cutUtf8(text: string, maxBytes: number): string {
  if (maxBytes <= 0) {
    return '';
  }

  let used = 0;
  let result = '';
  for (const char of text) {
    const bytes = Buffer.byteLength(char, 'utf8');
    if (used + bytes > maxBytes) {
      break;
    }
    result += char;
    used += bytes;
  }
  return result;
}

/**
 * Build `<stem>-<operation><extension>` within 120 UTF-8 bytes.
 *
 * The stem is the source base name without its last extension. Only the stem
 * is shortened, so the operation and the extension stay intact.
 *
 * @param inputPath - Source path whose base name supplies the stem
 * @param operation - Operation token placed before the extension
 * @param extension - Extension including its leading dot
 * @returns The file name. It stays within 120 bytes when the suffix itself fits.
 */
export function outputFileName(
  inputPath: string,
  operation: string,
  extension: string,
): string {
  const suffix = `-${operation}${extension}`;
  const room = FILE_NAME_MAX_BYTES - Buffer.byteLength(suffix, 'utf8');
  return `${cutUtf8(inputStem(inputPath), room)}${suffix}`;
}
