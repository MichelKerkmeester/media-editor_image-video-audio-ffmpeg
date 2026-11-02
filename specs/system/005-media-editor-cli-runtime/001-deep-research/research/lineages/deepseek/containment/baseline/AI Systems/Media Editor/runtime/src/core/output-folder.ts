// ───────────────────────────────────────────────────────────────────
// MODULE: Output Folder
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  lstatSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import path from 'node:path';

import type { FileHandle } from 'node:fs/promises';

import { ERROR_CODES, MediaError, nodeErrorCode } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One fresh numbered folder for a single writing call. */
export interface AllocatedFolder {
  /** Absolute path of the folder that was created. */
  readonly folderPath: string;

  /** Sequence number, compared by value. */
  readonly number: number;

  /** Slug used as the description segment. Empty for the output root. */
  readonly name: string;

  /**
   * True when this call created the folder. The output root is shared with
   * earlier results, so a failure must never remove it.
   */
  readonly created: boolean;
}

type OutputFolderReason = 'unset' | 'unusable';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const SLUG_MAX_CHARS = 60;
const FILE_NAME_MAX_BYTES = 120;

/** Highest counter tried for a free name in the export root. */
const COUNTER_MAX = 999;
const MAX_CREATE_ATTEMPTS = 100;
const NUMBER_WIDTH = 3;
const FOLDER_NUMBER = /^(\d{3,}) - /;
const TARGET_FOLDER_FORM = /^\d{3,} - \S/u;
const TRAILING_EXTENSION = /\.[A-Za-z0-9]{1,5}$/;

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

function emptySlug(text: string, parameter: string): MediaError {
  return new MediaError(
    ERROR_CODES.INVALID_INPUT,
    `${parameter} leaves no usable name.`,
    {
      parameter,
      value: text,
      reason: 'empty-slug',
    },
  );
}

function slugFor(text: string, parameter: string): string {
  const slug = limitSlug(collapseSlug(text));
  if (slug.length === 0) {
    throw emptySlug(text, parameter);
  }
  if (isWindowsDeviceName(slug)) {
    return `${slug}-out`;
  }
  return slug;
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

function targetFolderNamed(targetFolder: string): MediaError {
  return new MediaError(
    ERROR_CODES.INVALID_INPUT,
    `targetFolder must look like "014 - webp-under-100kb", got: ${targetFolder}`,
    {
      parameter: 'targetFolder',
      reason: 'target-folder-name',
      targetFolder,
    },
  );
}

function targetFolderMissing(targetFolder: string): MediaError {
  return new MediaError(
    ERROR_CODES.INVALID_INPUT,
    `targetFolder names a folder that is not in the export root: ${targetFolder}`,
    {
      parameter: 'targetFolder',
      reason: 'target-folder-missing',
      targetFolder,
    },
  );
}

function targetFolderOutside(targetFolder: string): MediaError {
  return new MediaError(
    ERROR_CODES.PATH_NOT_ALLOWED,
    `targetFolder must name a folder directly inside the export root: ${targetFolder}`,
    {
      parameter: 'targetFolder',
      reason: 'target-folder-outside-export',
      targetFolder,
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
  return slugFor(text, 'outputName');
}

/**
 * Turn a caller's readable name into a file stem.
 *
 * A trailing extension is dropped, because the tool sets the extension from
 * what it wrote. The stem follows the folder slug rules: lowercase ASCII
 * letters and digits joined by single hyphens, at most 60 characters.
 *
 * @param text - Caller name, with or without an extension
 * @param parameter - Argument name stored on a failure
 * @returns The file stem
 * @throws {@link MediaError} When nothing usable remains (`INVALID_INPUT`)
 */
export function fileStem(text: string, parameter: string): string {
  return slugFor(text.replace(TRAILING_EXTENSION, ''), parameter);
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
      return { folderPath, number, name, created: true };
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
 * Resolve an existing numbered folder a caller names for a shared batch.
 *
 * The folder must sit directly inside the export root and is never created.
 * `created` is false, so a taken file name moves on to `<stem>-2<ext>` and a
 * failed call removes only the files it wrote, never the folder or the
 * earlier results in it.
 *
 * @param outputDir - Configured output root, or undefined when unset
 * @param targetFolder - Folder name as an earlier call returned it
 * @param tool - Tool name stored on a configuration failure
 * @returns The existing folder
 * @throws {@link MediaError} `CONFIG_MISSING` when the root is unset,
 * `INVALID_INPUT` for a malformed or missing name, `PATH_NOT_ALLOWED` for a
 * name that escapes the root
 */
export function resolveTargetFolder(
  outputDir: string | undefined,
  targetFolder: string,
  tool: string,
): AllocatedFolder {
  if (outputDir === undefined) {
    throw missingOutputFolder(tool, 'unset');
  }
  if (
    targetFolder.includes('/')
    || targetFolder.includes('\\')
    || targetFolder.includes('\0')
    || targetFolder === '.'
    || targetFolder === '..'
  ) {
    throw targetFolderOutside(targetFolder);
  }
  const numbered = FOLDER_NUMBER.exec(targetFolder);
  if (numbered === null || !TARGET_FOLDER_FORM.test(targetFolder)) {
    throw targetFolderNamed(targetFolder);
  }
  const digits = numbered[1];
  if (digits === undefined) {
    throw targetFolderNamed(targetFolder);
  }

  let realRoot: string;
  try {
    realRoot = realpathSync.native(outputDir);
  } catch {
    throw targetFolderMissing(targetFolder);
  }

  const candidate = path.join(realRoot, targetFolder);
  let isDirectory = false;
  try {
    isDirectory = statSync(candidate).isDirectory();
  } catch {
    isDirectory = false;
  }
  if (!isDirectory) {
    throw targetFolderMissing(targetFolder);
  }
  let isSymbolicLink: boolean;
  let realCandidate: string;
  try {
    isSymbolicLink = lstatSync(candidate).isSymbolicLink();
    realCandidate = realpathSync.native(candidate);
  } catch {
    throw targetFolderMissing(targetFolder);
  }
  if (isSymbolicLink) {
    throw targetFolderOutside(targetFolder);
  }
  if (path.dirname(realCandidate) !== realRoot) {
    throw targetFolderOutside(targetFolder);
  }
  return {
    folderPath: realCandidate,
    number: Number(digits),
    name: targetFolder.slice(numbered[0].length),
    created: false,
  };
}

/**
 * The name with `-<counter>` before its extension, within 120 UTF-8 bytes.
 *
 * @param fileName - Name the call wanted
 * @param counter - Counter from 2 up
 * @returns The counted name
 */
export function countedFileName(fileName: string, counter: number): string {
  const extension = path.extname(fileName);
  const stem = fileName.slice(0, fileName.length - extension.length);
  const suffix = `-${counter}${extension}`;
  const room = FILE_NAME_MAX_BYTES - Buffer.byteLength(suffix, 'utf8');
  return `${cutUtf8(stem, room)}${suffix}`;
}

/**
 * Write one output under a free name, never replacing a file.
 *
 * In a numbered folder the call made, the first name is the only one tried,
 * so a clash still fails. In the shared export root a taken name moves on to
 * `<stem>-2<ext>`, `<stem>-3<ext>` and so on, because an earlier result with
 * the same name belongs to the user.
 *
 * @param folder - Destination of the call
 * @param fileName - Name the call wants
 * @param write - Exclusive write of one candidate path, which throws
 * `OUTPUT_EXISTS` when that path is taken
 * @returns The path that was written
 * @throws {@link MediaError} `OUTPUT_EXISTS` when no candidate is free
 */
export async function writeUnderFreeName(
  folder: AllocatedFolder,
  fileName: string,
  write: (target: string) => Promise<void>,
): Promise<string> {
  const last = folder.created ? 1 : COUNTER_MAX;
  for (let counter = 1; ; counter += 1) {
    const name = counter === 1 ? fileName : countedFileName(fileName, counter);
    const target = path.join(folder.folderPath, name);
    try {
      await write(target);
      return target;
    } catch (error: unknown) {
      const taken = error instanceof MediaError
        && error.code === ERROR_CODES.OUTPUT_EXISTS;
      if (!taken || counter >= last) {
        throw error;
      }
    }
  }
}

/**
 * Use the output root itself as the destination of one call.
 *
 * A one-file result lands beside earlier results rather than in a folder of
 * its own. The root is created when missing, and it is never removed.
 *
 * @param outputDir - Configured output root, or undefined when unset
 * @param tool - Tool name stored on a configuration failure
 * @returns The root as a destination this call did not create
 * @throws {@link MediaError} When the root is unset or unusable (`CONFIG_MISSING`)
 */
export function useOutputRoot(
  outputDir: string | undefined,
  tool: string,
): AllocatedFolder {
  if (outputDir === undefined) {
    throw missingOutputFolder(tool, 'unset');
  }
  try {
    mkdirSync(outputDir, { recursive: true });
    return {
      folderPath: realpathSync.native(outputDir),
      number: 0,
      name: '',
      created: false,
    };
  } catch {
    throw missingOutputFolder(tool, 'unusable');
  }
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

/**
 * Name one output file, from the caller's readable name when one was given.
 *
 * Without a name the result is `<stem>-<operation><extension>`, as
 * {@link outputFileName} builds it. With a name and one file the result is
 * `<name><extension>`. With a name and several files the operation stays in
 * the name, `<name>-<operation><extension>`, so the files stay distinct.
 *
 * @param inputPath - Source path whose base name supplies the default stem
 * @param operation - Operation token of this file
 * @param extension - Extension including its leading dot
 * @param fileName - Caller's readable name, or undefined for the default
 * @param several - True when the call writes more than one file
 * @returns The file name, within 120 UTF-8 bytes
 * @throws {@link MediaError} When the readable name leaves no usable stem
 */
export function placedFileName(
  inputPath: string,
  operation: string,
  extension: string,
  fileName: string | undefined,
  several: boolean,
): string {
  if (fileName === undefined) {
    return outputFileName(inputPath, operation, extension);
  }
  const suffix = several ? `-${operation}${extension}` : extension;
  return readableFileName(fileName, suffix, 'fileName');
}

/**
 * Build `<slug><suffix>` from a readable name, cutting only the slug.
 *
 * @param text - Readable name, with or without an extension
 * @param suffix - Text kept whole after the slug, such as `.webp`
 * @param parameter - Argument name stored on a failure
 * @returns The file name, within 120 UTF-8 bytes when the suffix fits
 * @throws {@link MediaError} When the name leaves no usable stem
 */
export function readableFileName(text: string, suffix: string, parameter: string): string {
  const room = FILE_NAME_MAX_BYTES - Buffer.byteLength(suffix, 'utf8');
  return `${cutUtf8(fileStem(text, parameter), room)}${suffix}`;
}
