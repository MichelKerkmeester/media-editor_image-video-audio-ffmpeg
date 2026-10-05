// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Download
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, readFile, rm, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

import { ERROR_CODES, isMediaError, MediaError } from './errors.js';
import { readSingleZipEntry } from './zip-entry.js';

import type { FileHandle } from 'node:fs/promises';

import type { PinnedArtifact } from './pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The part of fetch this module uses, so a test can hand in its own. */
export type DownloadFetch = (
  url: string,
  init: { readonly redirect: 'manual'; readonly signal: AbortSignal },
) => Promise<Response>;

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const HTTP_OK = 200;
const REDIRECT_MIN = 300;
const REDIRECT_MAX = 399;
const HTTPS_PROTOCOL = 'https:';

const REASON_REDIRECT = 'redirect';
const REASON_HTTP_STATUS = 'http-status';
const REASON_NETWORK = 'network';
const REASON_TIMEOUT = 'timeout';
const REASON_NO_BODY = 'no-body';
const REASON_SIZE_EXCEEDED = 'size-exceeded';
const REASON_WRITE = 'write';
const REASON_ARCHIVE_UNREADABLE = 'archive-unreadable';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRedirect(status: number): boolean {
  return status >= REDIRECT_MIN && status <= REDIRECT_MAX;
}

function downloadFailed(
  artifact: PinnedArtifact,
  httpStatus: number | null,
  reason: string,
  message: string,
): MediaError {
  return new MediaError(ERROR_CODES.DOWNLOAD_FAILED, message, {
    url: artifact.url,
    httpStatus,
    reason,
  });
}

function checksumMismatch(expected: string, actual: string, url: string): MediaError {
  return new MediaError(
    ERROR_CODES.CHECKSUM_MISMATCH,
    'The file does not match the pinned SHA-256.',
    { expected, actual, url },
  );
}

function archiveUnreadable(artifact: PinnedArtifact): MediaError {
  return downloadFailed(
    artifact,
    null,
    REASON_ARCHIVE_UNREADABLE,
    'The archive could not be unpacked.',
  );
}

function interrupted(
  artifact: PinnedArtifact,
  httpStatus: number | null,
  signal: AbortSignal,
  message: string,
): MediaError {
  if (signal.aborted) {
    return downloadFailed(
      artifact,
      httpStatus,
      REASON_TIMEOUT,
      'The download did not finish within the time limit.',
    );
  }
  return downloadFailed(artifact, httpStatus, REASON_NETWORK, message);
}

async function requestUrl(
  artifact: PinnedArtifact,
  fetchImpl: DownloadFetch,
  url: string,
  lastStatus: number | null,
  signal: AbortSignal,
): Promise<Response> {
  try {
    return await fetchImpl(url, { redirect: 'manual', signal });
  } catch (error: unknown) {
    throw interrupted(artifact, lastStatus, signal, 'The download could not reach the server.');
  }
}

function isAlreadyThere(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

async function createExclusive(
  artifact: PinnedArtifact,
  destination: string,
): Promise<FileHandle> {
  try {
    return await open(destination, 'wx');
  } catch (error: unknown) {
    if (isAlreadyThere(error)) {
      throw error;
    }
    throw downloadFailed(
      artifact,
      null,
      REASON_WRITE,
      'The download could not be written to disk.',
    );
  }
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch (error: unknown) {
    // The body is abandoned either way, and the caller's refusal is the failure to report.
  }
}

function redirectTarget(artifact: PinnedArtifact, response: Response): URL | null {
  if (artifact.redirectHost === null) {
    return null;
  }
  const location = response.headers.get('location');
  if (location === null) {
    return null;
  }
  try {
    const target = new URL(location, artifact.url);
    if (target.protocol !== HTTPS_PROTOCOL || target.host !== artifact.redirectHost) {
      return null;
    }
    return target;
  } catch (error: unknown) {
    return null;
  }
}

async function openResponse(
  artifact: PinnedArtifact,
  fetchImpl: DownloadFetch,
  signal: AbortSignal,
): Promise<Response> {
  const first = await requestUrl(artifact, fetchImpl, artifact.url, null, signal);
  if (!isRedirect(first.status)) {
    return first;
  }
  const target = redirectTarget(artifact, first);
  if (target === null) {
    await discardBody(first);
    throw downloadFailed(
      artifact,
      first.status,
      REASON_REDIRECT,
      'The download answered with a redirect this row does not allow.',
    );
  }
  await discardBody(first);
  const second = await requestUrl(artifact, fetchImpl, target.href, first.status, signal);
  if (isRedirect(second.status)) {
    await discardBody(second);
    throw downloadFailed(
      artifact,
      second.status,
      REASON_REDIRECT,
      'The download answered with a second redirect.',
    );
  }
  return second;
}

async function writeSome(handle: FileHandle, chunk: Uint8Array, offset: number): Promise<number> {
  try {
    const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset);
    return bytesWritten;
  } catch (error: unknown) {
    return 0;
  }
}

async function writeChunk(
  artifact: PinnedArtifact,
  handle: FileHandle,
  chunk: Uint8Array,
  httpStatus: number,
): Promise<void> {
  // A write may take fewer bytes than it was given, so it repeats until none are left.
  let offset = 0;
  while (offset < chunk.byteLength) {
    const written = await writeSome(handle, chunk, offset);
    if (written === 0) {
      throw downloadFailed(
        artifact,
        httpStatus,
        REASON_WRITE,
        'The download could not be written to disk.',
      );
    }
    offset += written;
  }
}

async function writeBody(
  artifact: PinnedArtifact,
  httpStatus: number,
  body: ReadableStream<Uint8Array>,
  handle: FileHandle,
  signal: AbortSignal,
): Promise<string> {
  const hash = createHash('sha256');
  let received = 0;
  try {
    for await (const chunk of body) {
      if (received + chunk.byteLength > artifact.bytes) {
        throw downloadFailed(
          artifact,
          httpStatus,
          REASON_SIZE_EXCEEDED,
          'The download is larger than the pinned size.',
        );
      }
      hash.update(chunk);
      await writeChunk(artifact, handle, chunk, httpStatus);
      received += chunk.byteLength;
    }
  } catch (error: unknown) {
    if (isMediaError(error)) {
      throw error;
    }
    throw interrupted(artifact, httpStatus, signal, 'The download stopped before it finished.');
  }
  return hash.digest('hex');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Streams a file through SHA-256 and returns the lowercase hex digest.
 *
 * @param filePath - The path of the file to hash
 * @returns The lowercase hex SHA-256 of the file contents
 * @throws {Error} When the file cannot be read
 */
export async function sha256OfFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

/**
 * Removes a path that a failed step left behind, keeping that step's error.
 *
 * A removal that fails leaves the path in place and is not reported, because
 * the error that started the cleanup is the one the caller has to see.
 *
 * @param target - The file or folder to remove
 * @param recursive - True when `target` is a folder to remove with its contents
 * @returns Resolves once the removal was tried
 */
export async function removeQuietly(target: string, recursive = false): Promise<void> {
  try {
    await rm(target, { recursive, force: true });
  } catch (error: unknown) {
    // The failure that started the cleanup is the one the caller reports.
  }
}

/**
 * Downloads one pinned archive into `destination` and checks it.
 *
 * The destination is created with an exclusive open, so an existing file
 * is never overwritten. The body streams to disk through SHA-256, never
 * passes the pinned size, and every failure removes the file, or leaves it
 * when it cannot be removed and reports the original failure.
 *
 * @param artifact - The pinned row naming the URL, size and digest
 * @param destination - The archive path to create; it must not exist yet
 * @param fetchImpl - The fetch to use; defaults to the global fetch
 * @param signal - Stops the request and the body when it aborts; defaults to
 *   a signal that never does
 * @returns Resolves once the archive is on disk and matches its digest
 * @throws {@link MediaError} `DOWNLOAD_FAILED` for a refused redirect, a
 *   final status other than 200, a rejected fetch, an empty body, a body
 *   that stops partway or is larger than the pinned size, a destination
 *   that cannot be created, or a failed write, and with reason `timeout`
 *   when `signal` stops the request or the body
 * @throws {@link MediaError} `CHECKSUM_MISMATCH` when the body SHA-256
 *   differs from the pinned one
 * @throws {Error} When `destination` already exists, which leaves it untouched
 */
export async function downloadArtifact(
  artifact: PinnedArtifact,
  destination: string,
  fetchImpl: DownloadFetch = (url, init) => fetch(url, init),
  signal: AbortSignal = new AbortController().signal,
): Promise<void> {
  const handle = await createExclusive(artifact, destination);
  try {
    const response = await openResponse(artifact, fetchImpl, signal);
    if (response.status !== HTTP_OK) {
      throw downloadFailed(
        artifact,
        response.status,
        REASON_HTTP_STATUS,
        `The download answered with HTTP ${String(response.status)}.`,
      );
    }
    const body = response.body;
    if (body === null) {
      throw downloadFailed(
        artifact,
        response.status,
        REASON_NO_BODY,
        'The download answered with an empty body.',
      );
    }
    const actual = await writeBody(artifact, response.status, body, handle, signal);
    if (actual !== artifact.sha256) {
      throw checksumMismatch(artifact.sha256, actual, artifact.url);
    }
  } catch (error: unknown) {
    await removeQuietly(destination);
    throw error;
  } finally {
    await handle.close();
  }
}

/**
 * Unpacks the one binary a checked archive holds into `destination`.
 *
 * The destination is created exclusively, so an existing file is never
 * overwritten, and every failure removes the file before it propagates,
 * or leaves it when it cannot be removed and reports the original failure.
 *
 * @param archivePath - The checked archive on disk
 * @param artifact - The pinned row naming the archive kind, entry and
 *   binary digest
 * @param destination - The binary path to create; it must not exist yet
 * @returns Resolves once the binary is on disk and matches its digest
 * @throws {@link MediaError} `DOWNLOAD_FAILED` when the archive cannot
 *   be read or unpacked, or the destination cannot be created
 * @throws {@link MediaError} `CHECKSUM_MISMATCH` when the binary
 *   SHA-256 differs from the pinned one
 * @throws {Error} When `destination` already exists, which leaves it untouched
 */
export async function unpackArtifact(
  archivePath: string,
  artifact: PinnedArtifact,
  destination: string,
): Promise<void> {
  // Claimed before the cleanup below can run, so a file that was already
  // there fails here and is never removed.
  const claim = await createExclusive(artifact, destination);
  try {
    await claim.close();
    if (artifact.archive === 'gzip') {
      await pipeline(
        createReadStream(archivePath),
        createGunzip(),
        createWriteStream(destination),
      );
    } else {
      const archive = await readFile(archivePath);
      const entryBytes = readSingleZipEntry(archive, artifact.entry ?? artifact.component);
      await writeFile(destination, entryBytes);
    }
    const actual = await sha256OfFile(destination);
    if (actual !== artifact.binarySha256) {
      throw checksumMismatch(artifact.binarySha256, actual, artifact.url);
    }
  } catch (error: unknown) {
    await removeQuietly(destination);
    if (error instanceof MediaError) {
      throw error;
    }
    throw archiveUnreadable(artifact);
  }
}
