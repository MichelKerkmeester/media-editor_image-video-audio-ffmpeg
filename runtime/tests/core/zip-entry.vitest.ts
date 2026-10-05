// ───────────────────────────────────────────────────────────────────
// MODULE: Zip Entry Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';

import { expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { listZipEntries, readSingleZipEntry } from '../../src/core/zip-entry.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ZipFixtureEntry {
  readonly name: string;
  readonly data: Buffer;
  readonly method: 0 | 8;
  readonly mode?: number;
  readonly dosAttributes?: number;
  readonly declaredSize?: number;
}

interface ZipFailureCase {
  readonly name: string;
  readonly archive: Buffer;
  readonly expectedName: string;
  readonly reason: string;
  readonly details?: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
const VERSION_NEEDED = 20;
const STORED_METHOD = 0;
const DEFLATE_METHOD = 8;
const DEFAULT_MODE = 0o100755;
const DIRECTORY_MODE = 0o040755;
const SYMLINK_MODE = 0o120777;
const DOS_DIRECTORY = 0x10;
const INFLATED_SIZE = 64 * 1024;
const UNDERSTATED_SIZE = 16;
const BINARY = Buffer.from('ffmpeg binary payload', 'utf8');

const FAILURE_CASES: readonly ZipFailureCase[] = [
  {
    name: 'two entries',
    archive: buildZip([
      { name: 'ffmpeg', data: BINARY, method: DEFLATE_METHOD },
      { name: 'ffprobe', data: BINARY, method: DEFLATE_METHOD },
    ]),
    expectedName: 'ffmpeg',
    reason: 'archive-entries',
    details: { entries: ['ffmpeg', 'ffprobe'], expected: 'ffmpeg' },
  },
  {
    name: 'one entry with another name',
    archive: buildZip([{ name: 'ffprobe', data: BINARY, method: DEFLATE_METHOD }]),
    expectedName: 'ffmpeg',
    reason: 'archive-entries',
    details: { entries: ['ffprobe'], expected: 'ffmpeg' },
  },
  {
    name: 'a parent path',
    archive: buildZip([{ name: '../ffmpeg', data: BINARY, method: DEFLATE_METHOD }]),
    expectedName: '../ffmpeg',
    reason: 'unsafe-entry',
    details: { entry: '../ffmpeg' },
  },
  {
    name: 'an absolute path',
    archive: buildZip([{ name: '/ffmpeg', data: BINARY, method: DEFLATE_METHOD }]),
    expectedName: '/ffmpeg',
    reason: 'unsafe-entry',
    details: { entry: '/ffmpeg' },
  },
  {
    name: 'a symlink',
    archive: buildZip([
      { name: 'ffmpeg', data: BINARY, method: DEFLATE_METHOD, mode: SYMLINK_MODE },
    ]),
    expectedName: 'ffmpeg',
    reason: 'unsafe-entry',
    details: { entry: 'ffmpeg' },
  },
  {
    name: 'a directory mode without a trailing slash',
    archive: buildZip([
      { name: 'ffmpeg', data: BINARY, method: DEFLATE_METHOD, mode: DIRECTORY_MODE },
    ]),
    expectedName: 'ffmpeg',
    reason: 'unsafe-entry',
    details: { entry: 'ffmpeg' },
  },
  {
    name: 'a DOS directory attribute',
    archive: buildZip([
      { name: 'ffmpeg', data: BINARY, method: DEFLATE_METHOD, dosAttributes: DOS_DIRECTORY },
    ]),
    expectedName: 'ffmpeg',
    reason: 'unsafe-entry',
    details: { entry: 'ffmpeg' },
  },
  {
    name: 'random bytes',
    archive: randomBytes(64),
    expectedName: 'ffmpeg',
    reason: 'archive-unreadable',
  },
  {
    name: 'a truncated archive',
    archive: buildZip([{ name: 'ffmpeg', data: BINARY, method: DEFLATE_METHOD }])
      .subarray(0, -10),
    expectedName: 'ffmpeg',
    reason: 'archive-unreadable',
  },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function mediaError(run: () => void): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

function localHeader(entry: ZipFixtureEntry, nameLength: number, compressedSize: number): Buffer {
  const header = Buffer.alloc(LOCAL_HEADER_SIZE);
  header.writeUInt32LE(LOCAL_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4);
  header.writeUInt16LE(entry.method, 8);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(entry.declaredSize ?? entry.data.length, 22);
  header.writeUInt16LE(nameLength, 26);
  return header;
}

function centralHeader(
  entry: ZipFixtureEntry,
  nameLength: number,
  compressedSize: number,
  localHeaderOffset: number,
): Buffer {
  const header = Buffer.alloc(CENTRAL_HEADER_SIZE);
  const mode = entry.mode ?? DEFAULT_MODE;
  header.writeUInt32LE(CENTRAL_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(VERSION_NEEDED, 4);
  header.writeUInt16LE(VERSION_NEEDED, 6);
  header.writeUInt16LE(entry.method, 10);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(entry.declaredSize ?? entry.data.length, 24);
  header.writeUInt16LE(nameLength, 28);
  header.writeUInt32LE(((mode << 16) | (entry.dosAttributes ?? 0)) >>> 0, 38);
  header.writeUInt32LE(localHeaderOffset, 42);
  return header;
}

function buildZip(entries: readonly ZipFixtureEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const directoryParts: Buffer[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const payload = entry.method === DEFLATE_METHOD ? deflateRawSync(entry.data) : entry.data;
    localParts.push(localHeader(entry, name.length, payload.length), name, payload);
    directoryParts.push(centralHeader(entry, name.length, payload.length, localOffset), name);
    localOffset += LOCAL_HEADER_SIZE + name.length + payload.length;
  }
  const directory = Buffer.concat(directoryParts);
  const eocd = Buffer.alloc(EOCD_SIZE);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, directory, eocd]);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('reads back the one deflated entry byte for byte', (): void => {
  const archive = buildZip([{ name: 'ffmpeg', data: BINARY, method: DEFLATE_METHOD }]);
  expect(readSingleZipEntry(archive, 'ffmpeg').equals(BINARY)).toBe(true);
});

it('reads back the one stored entry byte for byte', (): void => {
  const archive = buildZip([{ name: 'ffmpeg', data: BINARY, method: STORED_METHOD }]);
  expect(readSingleZipEntry(archive, 'ffmpeg').equals(BINARY)).toBe(true);
});

it('reports every central directory field for a two-entry archive', (): void => {
  const linkTarget = Buffer.from('ffmpeg-target', 'utf8');
  const archive = buildZip([
    { name: 'bin/', data: Buffer.alloc(0), method: STORED_METHOD, mode: DIRECTORY_MODE },
    { name: 'ffmpeg', data: linkTarget, method: DEFLATE_METHOD, mode: SYMLINK_MODE },
  ]);
  const entries = listZipEntries(archive);
  expect(entries).toHaveLength(2);
  expect(entries[0]).toEqual({
    name: 'bin/',
    method: STORED_METHOD,
    compressedSize: 0,
    uncompressedSize: 0,
    localHeaderOffset: 0,
    isDirectory: true,
    isSymlink: false,
  });
  expect(entries[1]).toEqual({
    name: 'ffmpeg',
    method: DEFLATE_METHOD,
    compressedSize: deflateRawSync(linkTarget).length,
    uncompressedSize: linkTarget.length,
    localHeaderOffset: LOCAL_HEADER_SIZE + 'bin/'.length,
    isDirectory: false,
    isSymlink: true,
  });
});

it.each(FAILURE_CASES)(
  'rejects $name with $reason',
  (row: ZipFailureCase): void => {
    const error = mediaError((): void => {
      readSingleZipEntry(row.archive, row.expectedName);
    });
    expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
    expect(error.details.reason).toBe(row.reason);
    if (row.details !== undefined) {
      expect(error.details).toMatchObject(row.details);
    }
  },
);

it('stops inflating an entry at its recorded size', (): void => {
  const archive = buildZip([{
    name: 'ffmpeg',
    data: Buffer.alloc(INFLATED_SIZE),
    method: DEFLATE_METHOD,
    declaredSize: UNDERSTATED_SIZE,
  }]);
  const error = mediaError((): void => {
    readSingleZipEntry(archive, 'ffmpeg');
  });
  expect(error.details.reason).toBe('archive-unreadable');
  expect(error.message).toBe('The archive entry did not decompress.');
});
