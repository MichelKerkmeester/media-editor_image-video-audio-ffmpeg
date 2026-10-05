// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Download Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterAll, expect, it } from 'vitest';

import { downloadArtifact, unpackArtifact } from '../../src/core/artifact-download.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';

import type { FileHandle } from 'node:fs/promises';
import type { DownloadFetch } from '../../src/core/artifact-download.js';
import type { PinnedArtifact } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface FakeFetch {
  readonly impl: DownloadFetch;
  readonly calls: string[];
}

interface StalledWriteCase {
  readonly name: string;
  readonly outcome: 'none' | 'reject';
}

type PartialWrite = (
  this: FileHandle,
  buffer: Uint8Array,
  offset?: number,
  length?: number,
) => Promise<{ bytesWritten: number; buffer: Uint8Array }>;

interface RedirectRefusalCase {
  readonly name: string;
  readonly redirectHost: string | null;
  readonly firstLocation: string | null;
  readonly secondLocation?: string;
  readonly disallowed: string | null;
  readonly expectedCalls: readonly string[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PINNED_URL = 'https://pinned.example.test/ffmpeg.gz';
const REDIRECT_URL = 'https://assets.example.test/signed?x=1';
const REDIRECT_HOST = 'assets.example.test';
const OTHER_HOST_URL = 'https://evil.example.test/ffmpeg.gz';
const INSECURE_URL = 'http://assets.example.test/ffmpeg.gz';

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_REDIRECT = 302;

const BODY = Buffer.from('pinned archive body', 'utf8');
const BODY_SHA256 = createHash('sha256').update(BODY).digest('hex');
const BINARY = Buffer.from('unpacked binary payload', 'utf8');
const BINARY_SHA256 = createHash('sha256').update(BINARY).digest('hex');
const WRONG_SHA256 = '0'.repeat(64);
const STALL_LIMIT_MS = 50;
const STALL_RETRY_LIMIT = 100;
const READ_ONLY_FOLDER_MODE = 0o555;
const WRITABLE_FOLDER_MODE = 0o755;
// Windows ignores folder modes and root ignores permissions, so neither can lock a folder.
const FOLDER_LOCK_UNAVAILABLE = process.platform === 'win32' || process.getuid?.() === 0;

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-download-'));

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const VERSION_NEEDED = 20;
const STORED_METHOD = 0;
const FILE_MODE = 0o100644;

const REDIRECT_REFUSALS: readonly RedirectRefusalCase[] = [
  {
    name: 'a redirect when the row names no host',
    redirectHost: null,
    firstLocation: REDIRECT_URL,
    disallowed: REDIRECT_URL,
    expectedCalls: [PINNED_URL],
  },
  {
    name: 'a redirect to another host',
    redirectHost: REDIRECT_HOST,
    firstLocation: OTHER_HOST_URL,
    disallowed: OTHER_HOST_URL,
    expectedCalls: [PINNED_URL],
  },
  {
    name: 'a redirect that is not https',
    redirectHost: REDIRECT_HOST,
    firstLocation: INSECURE_URL,
    disallowed: INSECURE_URL,
    expectedCalls: [PINNED_URL],
  },
  {
    name: 'a redirect with no Location header',
    redirectHost: REDIRECT_HOST,
    firstLocation: null,
    disallowed: null,
    expectedCalls: [PINNED_URL],
  },
  {
    name: 'a second redirect',
    redirectHost: REDIRECT_HOST,
    firstLocation: REDIRECT_URL,
    secondLocation: OTHER_HOST_URL,
    disallowed: OTHER_HOST_URL,
    expectedCalls: [PINNED_URL, REDIRECT_URL],
  },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function artifact(overrides: Partial<PinnedArtifact> = {}): PinnedArtifact {
  return {
    component: 'ffmpeg',
    url: PINNED_URL,
    redirectHost: REDIRECT_HOST,
    bytes: BODY.length,
    sha256: BODY_SHA256,
    archive: 'gzip',
    binarySha256: BINARY_SHA256,
    ...overrides,
  };
}

function fakeFetch(responses: ReadonlyMap<string, Response>): FakeFetch {
  const calls: string[] = [];
  const impl: DownloadFetch = async (url: string): Promise<Response> => {
    calls.push(url);
    const response = responses.get(url);
    if (response === undefined) {
      throw new Error(`The fake fetch holds no response for ${url}.`);
    }
    return response;
  };
  return { impl, calls };
}

function redirectResponse(location: string | null): Response {
  const headers = new Headers();
  if (location !== null) {
    headers.set('location', location);
  }
  return new Response(null, { status: HTTP_REDIRECT, headers });
}

function destination(name: string): string {
  return path.join(scratch, name);
}

async function mediaErrorFrom(run: () => Promise<void>): Promise<MediaError> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

function buildStoredZip(name: string, data: Buffer): Buffer {
  const nameBytes = Buffer.from(name, 'utf8');
  const local = Buffer.alloc(LOCAL_HEADER_SIZE);
  local.writeUInt32LE(LOCAL_SIGNATURE, 0);
  local.writeUInt16LE(VERSION_NEEDED, 4);
  local.writeUInt16LE(STORED_METHOD, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  const central = Buffer.alloc(CENTRAL_HEADER_SIZE);
  central.writeUInt32LE(CENTRAL_SIGNATURE, 0);
  central.writeUInt16LE(VERSION_NEEDED, 4);
  central.writeUInt16LE(VERSION_NEEDED, 6);
  central.writeUInt16LE(STORED_METHOD, 10);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE((FILE_MODE << 16) >>> 0, 38);
  const directory = Buffer.concat([central, nameBytes]);
  const directoryOffset = LOCAL_HEADER_SIZE + nameBytes.length + data.length;
  const eocd = Buffer.alloc(EOCD_SIZE);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(directoryOffset, 16);
  return Buffer.concat([local, nameBytes, data, directory, eocd]);
}

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('writes a 200 body byte for byte and contacts only the pinned URL', async (): Promise<void> => {
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(BODY, { status: HTTP_OK })]]));
  const target = destination('plain.gz');
  await downloadArtifact(artifact(), target, fake.impl);
  expect(readFileSync(target).equals(BODY)).toBe(true);
  expect(fake.calls).toEqual([PINNED_URL]);
});

it('follows one allowed redirect and writes the second body', async (): Promise<void> => {
  const responses = new Map<string, Response>([
    [PINNED_URL, redirectResponse(REDIRECT_URL)],
    [REDIRECT_URL, new Response(BODY, { status: HTTP_OK })],
  ]);
  const fake = fakeFetch(responses);
  const target = destination('redirected.gz');
  await downloadArtifact(artifact(), target, fake.impl);
  expect(readFileSync(target).equals(BODY)).toBe(true);
  expect(fake.calls).toEqual([PINNED_URL, REDIRECT_URL]);
});

it.each(REDIRECT_REFUSALS)(
  'refuses $name',
  async (row: RedirectRefusalCase): Promise<void> => {
    const responses = new Map<string, Response>([
      [PINNED_URL, redirectResponse(row.firstLocation)],
    ]);
    if (row.secondLocation !== undefined) {
      responses.set(REDIRECT_URL, redirectResponse(row.secondLocation));
    }
    const fake = fakeFetch(responses);
    const target = destination(`${row.name.replaceAll(' ', '-')}.gz`);
    const error = await mediaErrorFrom(() =>
      downloadArtifact(artifact({ redirectHost: row.redirectHost }), target, fake.impl),
    );
    expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
    expect(error.details.reason).toBe('redirect');
    expect(error.details.httpStatus).toBe(HTTP_REDIRECT);
    expect(error.details.url).toBe(PINNED_URL);
    expect(existsSync(target)).toBe(false);
    expect(fake.calls).toEqual(row.expectedCalls);
    if (row.disallowed !== null) {
      expect(fake.calls).not.toContain(row.disallowed);
    }
  },
);

it('reports a final status other than 200 as an HTTP failure', async (): Promise<void> => {
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(null, { status: HTTP_NOT_FOUND })]]));
  const target = destination('missing.gz');
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('http-status');
  expect(error.details.httpStatus).toBe(HTTP_NOT_FOUND);
  expect(error.details.url).toBe(PINNED_URL);
  expect(existsSync(target)).toBe(false);
});

it('reports a rejected fetch as a network failure', async (): Promise<void> => {
  const impl: DownloadFetch = async (): Promise<Response> => {
    throw new Error('The server is unreachable.');
  };
  const target = destination('offline.gz');
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, impl));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('network');
  expect(error.details.httpStatus).toBeNull();
  expect(error.details.url).toBe(PINNED_URL);
  expect(existsSync(target)).toBe(false);
});

it('refuses a body larger than the pinned size', async (): Promise<void> => {
  const oversized = Buffer.concat([BODY, Buffer.from([0])]);
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(oversized, { status: HTTP_OK })]]));
  const target = destination('oversized.gz');
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('size-exceeded');
  expect(error.details.httpStatus).toBe(HTTP_OK);
  expect(existsSync(target)).toBe(false);
});

it('reports a checksum mismatch and removes the file', async (): Promise<void> => {
  const other = Buffer.alloc(BODY.length, 0x20);
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(other, { status: HTTP_OK })]]));
  const target = destination('mismatch.gz');
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
  expect(error.code).toBe(ERROR_CODES.CHECKSUM_MISMATCH);
  expect(error.details).toMatchObject({
    expected: BODY_SHA256,
    actual: createHash('sha256').update(other).digest('hex'),
    url: PINNED_URL,
  });
  expect(existsSync(target)).toBe(false);
});

it('refuses an existing destination and leaves it unchanged', async (): Promise<void> => {
  const target = destination('existing.gz');
  writeFileSync(target, 'keep me');
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(BODY, { status: HTTP_OK })]]));
  await expect(downloadArtifact(artifact(), target, fake.impl)).rejects.toMatchObject({
    code: 'EEXIST',
  });
  expect(readFileSync(target, 'utf8')).toBe('keep me');
});

it('reports a body that stops partway as a network failure', async (): Promise<void> => {
  const broken = new ReadableStream<Uint8Array>({
    start(controller): void {
      controller.enqueue(BODY.subarray(0, 4));
      controller.error(new Error('The connection dropped.'));
    },
  });
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(broken, { status: HTTP_OK })]]));
  const target = destination('dropped.gz');
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('network');
  expect(error.details.httpStatus).toBe(HTTP_OK);
  expect(existsSync(target)).toBe(false);
});

it('refuses an existing unpack destination and leaves it unchanged', async (): Promise<void> => {
  const archivePath = destination('kept-binary.gz');
  writeFileSync(archivePath, gzipSync(BINARY));
  const target = destination('kept-binary');
  writeFileSync(target, 'keep me');
  await expect(unpackArtifact(archivePath, artifact(), target)).rejects.toMatchObject({
    code: 'EEXIST',
  });
  expect(readFileSync(target, 'utf8')).toBe('keep me');
});

it('reports a download the time limit stopped', async (): Promise<void> => {
  const impl: DownloadFetch = async (_url, init): Promise<Response> => {
    const stalled = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(BODY.subarray(0, 4));
        init.signal.addEventListener('abort', (): void => {
          controller.error(init.signal.reason);
        });
      },
    });
    return new Response(stalled, { status: HTTP_OK });
  };
  const target = destination('stalled.gz');
  const signal = AbortSignal.timeout(STALL_LIMIT_MS);
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, impl, signal));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('timeout');
  expect(existsSync(target)).toBe(false);
});

it('reports a destination that cannot be created as a write failure', async (): Promise<void> => {
  const fake = fakeFetch(new Map([[PINNED_URL, new Response(BODY, { status: HTTP_OK })]]));
  const target = destination(path.join('no-such-folder', 'plain.gz'));
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('write');
  expect(fake.calls).toEqual([]);
});

it('reports an unpack path that cannot be created as a write failure', async (): Promise<void> => {
  const archivePath = destination('orphan-binary.gz');
  writeFileSync(archivePath, gzipSync(BINARY));
  const target = destination(path.join('no-such-folder', 'binary'));
  const error = await mediaErrorFrom(() => unpackArtifact(archivePath, artifact(), target));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('write');
});

it.skipIf(FOLDER_LOCK_UNAVAILABLE)(
  'keeps the download failure when the file cannot be removed',
  async (): Promise<void> => {
    const folder = destination('locked-folder');
    mkdirSync(folder);
    const target = path.join(folder, 'locked.gz');
    const locking: DownloadFetch = async (): Promise<Response> => {
      chmodSync(folder, READ_ONLY_FOLDER_MODE);
      return new Response(null, { status: HTTP_NOT_FOUND });
    };
    try {
      const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, locking));
      expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
      expect(error.details.reason).toBe('http-status');
      expect(existsSync(target)).toBe(true);
    } finally {
      chmodSync(folder, WRITABLE_FOLDER_MODE);
    }
  },
);

it('refuses a redirect whose body will not cancel', async (): Promise<void> => {
  const stubborn = new ReadableStream<Uint8Array>({
    cancel(): Promise<void> {
      return Promise.reject(new Error('The body refused to cancel.'));
    },
  });
  const headers = new Headers({ location: OTHER_HOST_URL });
  const refused = new Response(stubborn, { status: HTTP_REDIRECT, headers });
  const fake = fakeFetch(new Map([[PINNED_URL, refused]]));
  const target = destination('stubborn.gz');
  const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('redirect');
  expect(existsSync(target)).toBe(false);
  expect(fake.calls).toEqual([PINNED_URL]);
});

const STALLED_WRITES: readonly StalledWriteCase[] = [
  { name: 'takes no bytes', outcome: 'none' },
  { name: 'rejects', outcome: 'reject' },
];

it.each(STALLED_WRITES)(
  'fails as a write failure when the disk $name',
  async (row: StalledWriteCase): Promise<void> => {
    const probe = await open(destination('stall-probe'), 'w');
    const methods = Object.getPrototypeOf(probe) as { write: PartialWrite };
    await probe.close();
    const original = methods.write;
    let calls = 0;
    methods.write = function (
      this: FileHandle,
      buffer: Uint8Array,
      offset?: number,
      length?: number,
    ): Promise<{ bytesWritten: number; buffer: Uint8Array }> {
      calls += 1;
      // A loop without its guard would retry forever, so the disk recovers late
      // and the missing refusal shows as a finished download instead of a hang.
      if (calls > STALL_RETRY_LIMIT) {
        return original.call(this, buffer, offset, length);
      }
      if (row.outcome === 'none') {
        return Promise.resolve({ bytesWritten: 0, buffer });
      }
      return Promise.reject(new Error('The disk is full.'));
    };
    try {
      const fake = fakeFetch(new Map([[PINNED_URL, new Response(BODY, { status: HTTP_OK })]]));
      const target = destination(`stalled-write-${row.outcome}.gz`);
      const error = await mediaErrorFrom(() => downloadArtifact(artifact(), target, fake.impl));
      expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
      expect(error.details.reason).toBe('write');
      expect(calls).toBe(1);
      expect(existsSync(target)).toBe(false);
    } finally {
      methods.write = original;
    }
  },
);

it('writes the rest of a chunk the disk took only part of', async (): Promise<void> => {
  const probe = await open(destination('probe'), 'w');
  const methods = Object.getPrototypeOf(probe) as { write: PartialWrite };
  await probe.close();
  const original = methods.write;
  let shortened = false;
  methods.write = function (
    this: FileHandle,
    buffer: Uint8Array,
    offset = 0,
    length = buffer.byteLength - offset,
  ): Promise<{ bytesWritten: number; buffer: Uint8Array }> {
    const take = shortened ? length : Math.ceil(length / 2);
    shortened = true;
    return original.call(this, buffer, offset, take);
  };
  try {
    const fake = fakeFetch(new Map([[PINNED_URL, new Response(BODY, { status: HTTP_OK })]]));
    const target = destination('short-write.gz');
    await downloadArtifact(artifact(), target, fake.impl);
    expect(shortened).toBe(true);
    expect(readFileSync(target).equals(BODY)).toBe(true);
  } finally {
    methods.write = original;
  }
});

it('unpacks a gzip archive and accepts the binary digest', async (): Promise<void> => {
  const archivePath = destination('binary.gz');
  writeFileSync(archivePath, gzipSync(BINARY));
  const target = destination('gzip-binary');
  await unpackArtifact(archivePath, artifact(), target);
  expect(readFileSync(target).equals(BINARY)).toBe(true);
});

it('unpacks the one stored zip entry and accepts the binary digest', async (): Promise<void> => {
  const archivePath = destination('binary.zip');
  writeFileSync(archivePath, buildStoredZip('ffmpeg', BINARY));
  const target = destination('zip-binary');
  await unpackArtifact(archivePath, artifact({ archive: 'zip' }), target);
  expect(readFileSync(target).equals(BINARY)).toBe(true);
});

it('rejects a wrong binary digest and removes the file', async (): Promise<void> => {
  const archivePath = destination('wrong-digest.gz');
  writeFileSync(archivePath, gzipSync(BINARY));
  const target = destination('wrong-digest-binary');
  const error = await mediaErrorFrom(() =>
    unpackArtifact(archivePath, artifact({ binarySha256: WRONG_SHA256 }), target),
  );
  expect(error.code).toBe(ERROR_CODES.CHECKSUM_MISMATCH);
  expect(error.details).toMatchObject({
    expected: WRONG_SHA256,
    actual: BINARY_SHA256,
    url: PINNED_URL,
  });
  expect(existsSync(target)).toBe(false);
});

it('rejects bytes that are not gzip and removes the file', async (): Promise<void> => {
  const archivePath = destination('not-gzip');
  writeFileSync(archivePath, 'this is not gzip');
  const target = destination('not-gzip-binary');
  const error = await mediaErrorFrom(() => unpackArtifact(archivePath, artifact(), target));
  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('archive-unreadable');
  expect(error.details.httpStatus).toBeNull();
  expect(error.details.url).toBe(PINNED_URL);
  expect(existsSync(target)).toBe(false);
});
