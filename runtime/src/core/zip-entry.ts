// ───────────────────────────────────────────────────────────────────
// MODULE: Zip Entry
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { inflateRawSync } from 'node:zlib';

import { ERROR_CODES, MediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One entry of a zip archive's central directory. */
export interface ZipEntryInfo {
  /** The entry name exactly as the archive stores it, '/' separated. */
  readonly name: string;
  /** 0 for stored, 8 for deflate. */
  readonly method: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  /** Offset of the entry's local file header from the start of the archive. */
  readonly localHeaderOffset: number;
  /** True when the name ends with '/' or the Unix or DOS attributes mark a directory. */
  readonly isDirectory: boolean;
  /** True when the Unix mode in the external attributes marks a symbolic link. */
  readonly isSymlink: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;

const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const EOCD_SEARCH_SIZE = EOCD_MIN_SIZE + MAX_COMMENT_SIZE;
const CENTRAL_HEADER_MIN_SIZE = 46;
const LOCAL_HEADER_MIN_SIZE = 30;

const EOCD_ENTRY_COUNT_OFFSET = 10;
const EOCD_DIRECTORY_SIZE_OFFSET = 12;
const EOCD_DIRECTORY_OFFSET = 16;
const EOCD_COMMENT_LENGTH_OFFSET = 20;

const CENTRAL_METHOD_OFFSET = 10;
const CENTRAL_COMPRESSED_SIZE_OFFSET = 20;
const CENTRAL_UNCOMPRESSED_SIZE_OFFSET = 24;
const CENTRAL_NAME_LENGTH_OFFSET = 28;
const CENTRAL_EXTRA_LENGTH_OFFSET = 30;
const CENTRAL_COMMENT_LENGTH_OFFSET = 32;
const CENTRAL_EXTERNAL_ATTRIBUTES_OFFSET = 38;
const CENTRAL_LOCAL_HEADER_OFFSET = 42;

const LOCAL_NAME_LENGTH_OFFSET = 26;
const LOCAL_EXTRA_LENGTH_OFFSET = 28;

const ZIP64_OFFSET = 0xffffffff;
const ZIP64_COUNT = 0xffff;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

const UNIX_MODE_SHIFT = 16;
const FILE_TYPE_MASK = 0o170000;
const SYMLINK_TYPE = 0o120000;
const DIRECTORY_TYPE = 0o040000;
const DOS_DIRECTORY_ATTRIBUTE = 0x10;

const DIRECTORY_SUFFIX = '/';
const DRIVE_LETTER_PATTERN = /^[A-Za-z]:/;
const SEGMENT_SEPARATOR_PATTERN = /[\\/]/;

const REASON_ARCHIVE_UNREADABLE = 'archive-unreadable';
const REASON_ARCHIVE_ENTRIES = 'archive-entries';
const REASON_UNSAFE_ENTRY = 'unsafe-entry';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

/** Build the failure every damaged or unsupported archive raises. */
function archiveUnreadable(message: string): MediaError {
  return new MediaError(ERROR_CODES.DOWNLOAD_FAILED, message, {
    reason: REASON_ARCHIVE_UNREADABLE,
  });
}

function zip64Unsupported(): MediaError {
  return archiveUnreadable('The archive uses ZIP64 fields, which this reader does not support.');
}

function requireBytes(archive: Buffer, offset: number, size: number): void {
  if (offset < 0 || size < 0 || offset + size > archive.length) {
    throw archiveUnreadable('The archive ends before the record it promises.');
  }
}

function findEndOfCentralDirectory(archive: Buffer): number {
  const lastStart = archive.length - EOCD_MIN_SIZE;
  const firstStart = Math.max(0, archive.length - EOCD_SEARCH_SIZE);
  for (let offset = lastStart; offset >= firstStart; offset -= 1) {
    if (archive.readUInt32LE(offset) !== EOCD_SIGNATURE) {
      continue;
    }
    const commentLength = archive.readUInt16LE(offset + EOCD_COMMENT_LENGTH_OFFSET);
    if (offset + EOCD_MIN_SIZE + commentLength === archive.length) {
      return offset;
    }
  }
  throw archiveUnreadable('The archive has no end of central directory record.');
}

function readDirectory(
  archive: Buffer,
  directoryOffset: number,
  entryCount: number,
): ZipEntryInfo[] {
  const entries: ZipEntryInfo[] = [];
  let offset = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    requireBytes(archive, offset, CENTRAL_HEADER_MIN_SIZE);
    if (archive.readUInt32LE(offset) !== CENTRAL_HEADER_SIGNATURE) {
      throw archiveUnreadable('The central directory holds a header with the wrong signature.');
    }
    const method = archive.readUInt16LE(offset + CENTRAL_METHOD_OFFSET);
    const compressedSize = archive.readUInt32LE(offset + CENTRAL_COMPRESSED_SIZE_OFFSET);
    const uncompressedSize = archive.readUInt32LE(offset + CENTRAL_UNCOMPRESSED_SIZE_OFFSET);
    const nameLength = archive.readUInt16LE(offset + CENTRAL_NAME_LENGTH_OFFSET);
    const extraLength = archive.readUInt16LE(offset + CENTRAL_EXTRA_LENGTH_OFFSET);
    const commentLength = archive.readUInt16LE(offset + CENTRAL_COMMENT_LENGTH_OFFSET);
    const externalAttributes = archive.readUInt32LE(
      offset + CENTRAL_EXTERNAL_ATTRIBUTES_OFFSET,
    );
    const localHeaderOffset = archive.readUInt32LE(offset + CENTRAL_LOCAL_HEADER_OFFSET);
    if (
      compressedSize === ZIP64_OFFSET
      || uncompressedSize === ZIP64_OFFSET
      || localHeaderOffset === ZIP64_OFFSET
    ) {
      throw zip64Unsupported();
    }
    requireBytes(archive, offset + CENTRAL_HEADER_MIN_SIZE, nameLength);
    const name = archive.toString(
      'utf8',
      offset + CENTRAL_HEADER_MIN_SIZE,
      offset + CENTRAL_HEADER_MIN_SIZE + nameLength,
    );
    const fileType = (externalAttributes >>> UNIX_MODE_SHIFT) & FILE_TYPE_MASK;
    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      isDirectory: name.endsWith(DIRECTORY_SUFFIX)
        || fileType === DIRECTORY_TYPE
        || (externalAttributes & DOS_DIRECTORY_ATTRIBUTE) !== 0,
      isSymlink: fileType === SYMLINK_TYPE,
    });
    offset += CENTRAL_HEADER_MIN_SIZE + nameLength + extraLength + commentLength;
  }
  return entries;
}

function isUnsafeEntry(entry: ZipEntryInfo): boolean {
  if (entry.isDirectory || entry.isSymlink) {
    return true;
  }
  if (
    entry.name.startsWith('/')
    || entry.name.startsWith('\\')
    || DRIVE_LETTER_PATTERN.test(entry.name)
  ) {
    return true;
  }
  return entry.name.split(SEGMENT_SEPARATOR_PATTERN).includes('..');
}

function archiveEntriesError(entries: readonly ZipEntryInfo[], expected: string): MediaError {
  return new MediaError(
    ERROR_CODES.DOWNLOAD_FAILED,
    'The archive does not hold exactly the one expected entry.',
    {
      reason: REASON_ARCHIVE_ENTRIES,
      entries: entries.map((entry) => entry.name),
      expected,
    },
  );
}

function unsafeEntryError(entry: ZipEntryInfo): MediaError {
  return new MediaError(
    ERROR_CODES.DOWNLOAD_FAILED,
    'The archive entry is not a plain file inside the archive.',
    { reason: REASON_UNSAFE_ENTRY, entry: entry.name },
  );
}

function unpackEntry(compressed: Buffer, method: number, expectedSize: number): Buffer {
  if (method === METHOD_STORED) {
    return Buffer.from(compressed);
  }
  if (method === METHOD_DEFLATE) {
    try {
      // Bounded by the recorded size, so a damaged entry cannot inflate past it in memory.
      return inflateRawSync(compressed, { maxOutputLength: Math.max(expectedSize, 1) });
    } catch (error: unknown) {
      throw archiveUnreadable('The archive entry did not decompress.');
    }
  }
  throw archiveUnreadable('The archive entry uses an unsupported compression method.');
}

function readEntryData(archive: Buffer, entry: ZipEntryInfo): Buffer {
  const headerOffset = entry.localHeaderOffset;
  requireBytes(archive, headerOffset, LOCAL_HEADER_MIN_SIZE);
  if (archive.readUInt32LE(headerOffset) !== LOCAL_HEADER_SIGNATURE) {
    throw archiveUnreadable('The entry does not point at a local file header.');
  }
  const nameLength = archive.readUInt16LE(headerOffset + LOCAL_NAME_LENGTH_OFFSET);
  const extraLength = archive.readUInt16LE(headerOffset + LOCAL_EXTRA_LENGTH_OFFSET);
  const dataStart = headerOffset + LOCAL_HEADER_MIN_SIZE + nameLength + extraLength;
  requireBytes(archive, dataStart, entry.compressedSize);
  const compressed = archive.subarray(dataStart, dataStart + entry.compressedSize);
  const unpacked = unpackEntry(compressed, entry.method, entry.uncompressedSize);
  if (unpacked.length !== entry.uncompressedSize) {
    throw archiveUnreadable('The unpacked entry does not match its recorded size.');
  }
  return unpacked;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * List every entry of a zip archive's central directory.
 *
 * @param archive - The complete zip archive bytes
 * @returns One record per entry, in central directory order
 * @throws {@link MediaError} `DOWNLOAD_FAILED` for an archive this reader cannot parse
 */
export function listZipEntries(archive: Buffer): ZipEntryInfo[] {
  const eocdOffset = findEndOfCentralDirectory(archive);
  const entryCount = archive.readUInt16LE(eocdOffset + EOCD_ENTRY_COUNT_OFFSET);
  const directorySize = archive.readUInt32LE(eocdOffset + EOCD_DIRECTORY_SIZE_OFFSET);
  const directoryOffset = archive.readUInt32LE(eocdOffset + EOCD_DIRECTORY_OFFSET);
  if (
    entryCount === ZIP64_COUNT
    || directorySize === ZIP64_OFFSET
    || directoryOffset === ZIP64_OFFSET
  ) {
    throw zip64Unsupported();
  }
  return readDirectory(archive, directoryOffset, entryCount);
}

/**
 * Read the one entry a single-entry zip archive holds.
 *
 * The caller names the entry it expects, and an entry that could escape the
 * unpack folder or stand in for another file through a link is refused before
 * any bytes come back.
 *
 * @param archive - The complete zip archive bytes
 * @param expectedName - The exact entry name the archive must hold
 * @returns The unpacked entry bytes
 * @throws {@link MediaError} `DOWNLOAD_FAILED` when the archive is unreadable,
 *   does not hold exactly this entry, or the entry is unsafe to unpack
 */
export function readSingleZipEntry(archive: Buffer, expectedName: string): Buffer {
  const entries = listZipEntries(archive);
  const entry = entries[0];
  if (entries.length !== 1 || entry === undefined || entry.name !== expectedName) {
    throw archiveEntriesError(entries, expectedName);
  }
  if (isUnsafeEntry(entry)) {
    throw unsafeEntryError(entry);
  }
  return readEntryData(archive, entry);
}
