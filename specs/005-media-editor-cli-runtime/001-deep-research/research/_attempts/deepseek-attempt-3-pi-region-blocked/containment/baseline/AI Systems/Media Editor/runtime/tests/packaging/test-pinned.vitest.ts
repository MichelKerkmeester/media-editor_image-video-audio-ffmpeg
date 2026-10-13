// ───────────────────────────────────────────────────────────────────
// MODULE: Test Pinned Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { PINNED_BIN_DIR_ENV, main, preparePinnedBinaries } from '../../scripts/test-pinned.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { PINNED_BUILDS, platformKeyOf } from '../../src/core/pinned-builds.js';
import { resolveTestBinary } from '../helpers/media.js';
import { sha256Of } from '../helpers/tool-client.js';

import type { FetchLike } from '../../scripts/bundle/artifacts.js';
import type { PinnedArtifact, PinnedBuild, PlatformKey } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const KEY: PlatformKey = 'linux-x64';
const FFMPEG_URL = 'https://pinned.example.test/ffmpeg.gz';
const FFPROBE_URL = 'https://pinned.example.test/ffprobe.gz';
const FFMPEG_BINARY = Buffer.from('#!/bin/sh\necho pinned ffmpeg\n', 'utf8');
const FFPROBE_BINARY = Buffer.from('#!/bin/sh\necho pinned ffprobe\n', 'utf8');
const FFMPEG_ARCHIVE = gzipSync(FFMPEG_BINARY);
const FFPROBE_ARCHIVE = gzipSync(FFPROBE_BINARY);
const WRONG_SHA256 = '0'.repeat(64);
const FAILURE_EXIT_CODE = 1;

// Each row is a folder the run may be started from by mistake, and its package.json.
const NOT_ROOT_FOLDERS: Array<[string, string | undefined]> = [
  ['holds no package.json', undefined],
  ['holds the package.json of another package', '{"name":"other-package"}'],
  ['holds a package.json that is not JSON', '{"name":'],
];

// Set only by `npm run test:pinned`, which is the one run the resolver check applies to.
const PINNED_BIN_DIR = process.env[PINNED_BIN_DIR_ENV] ?? '';
const HOST_KEY = platformKeyOf(process.platform, process.arch);

const tempDirs: string[] = [];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function digestOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function gzipArtifact(
  component: 'ffmpeg' | 'ffprobe',
  url: string,
  archive: Buffer,
  binary: Buffer,
): PinnedArtifact {
  return {
    component,
    url,
    redirectHost: null,
    bytes: archive.length,
    sha256: digestOf(archive),
    archive: 'gzip',
    binarySha256: digestOf(binary),
  };
}

function buildsWith(ffprobe: PinnedArtifact): Readonly<Record<PlatformKey, PinnedBuild>> {
  const build: PinnedBuild = {
    ...PINNED_BUILDS[KEY],
    version: '9.9.9-test',
    artifacts: {
      ffmpeg: gzipArtifact('ffmpeg', FFMPEG_URL, FFMPEG_ARCHIVE, FFMPEG_BINARY),
      ffprobe,
    },
  };
  return { ...PINNED_BUILDS, [KEY]: build };
}

function servingArchives(): FetchLike {
  return async (url: string): Promise<Response> => {
    const body = url === FFMPEG_URL ? FFMPEG_ARCHIVE : FFPROBE_ARCHIVE;
    return new Response(body, { status: HTTP_OK });
  };
}

function freshRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'media-pinned-'));
  tempDirs.push(root);
  return root;
}

async function mediaErrorFrom(run: Promise<unknown>): Promise<MediaError> {
  try {
    await run;
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('preparePinnedBinaries', (): void => {
  it('places both checked binaries under build/pinned/<key>', async (): Promise<void> => {
    const root = freshRoot();
    const ffprobe = gzipArtifact('ffprobe', FFPROBE_URL, FFPROBE_ARCHIVE, FFPROBE_BINARY);
    const pinned = await preparePinnedBinaries(root, KEY, {
      builds: buildsWith(ffprobe),
      fetchImpl: servingArchives(),
    });

    expect(pinned).toEqual({
      key: KEY,
      binDir: path.join(root, 'build', 'pinned', KEY),
      version: '9.9.9-test',
    });
    expect(readFileSync(path.join(pinned.binDir, 'ffmpeg'))).toEqual(FFMPEG_BINARY);
    expect(readFileSync(path.join(pinned.binDir, 'ffprobe'))).toEqual(FFPROBE_BINARY);
    expect(existsSync(path.join(root, 'build', 'cache', `${KEY}-ffprobe.gz`))).toBe(true);
  });

  it('stops on a binary whose digest differs and places none', async (): Promise<void> => {
    const root = freshRoot();
    const ffprobe = {
      ...gzipArtifact('ffprobe', FFPROBE_URL, FFPROBE_ARCHIVE, FFPROBE_BINARY),
      binarySha256: WRONG_SHA256,
    };
    const error = await mediaErrorFrom(preparePinnedBinaries(root, KEY, {
      builds: buildsWith(ffprobe),
      fetchImpl: servingArchives(),
    }));

    expect(error.code).toBe(ERROR_CODES.CHECKSUM_MISMATCH);
    expect(existsSync(path.join(root, 'build', 'pinned', KEY, 'ffprobe'))).toBe(false);
  });

  it('stops when a missing archive cannot be fetched', async (): Promise<void> => {
    const root = freshRoot();
    const ffprobe = gzipArtifact('ffprobe', FFPROBE_URL, FFPROBE_ARCHIVE, FFPROBE_BINARY);
    const refusing: FetchLike = async (): Promise<Response> => {
      return new Response(null, { status: HTTP_NOT_FOUND });
    };
    const error = await mediaErrorFrom(preparePinnedBinaries(root, KEY, {
      builds: buildsWith(ffprobe),
      fetchImpl: refusing,
    }));

    expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
    expect(existsSync(path.join(root, 'build', 'pinned'))).toBe(false);
  });
});

describe('main', (): void => {
  it.each(NOT_ROOT_FOLDERS)(
    'stops with its own message in a folder that %s',
    async (_label, manifest): Promise<void> => {
      const root = freshRoot();
      if (manifest !== undefined) {
        writeFileSync(path.join(root, 'package.json'), manifest, 'utf8');
      }
      const printed = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
      try {
        expect(await main([], root)).toBe(FAILURE_EXIT_CODE);
        expect(printed).toHaveBeenCalledTimes(1);
        const line = String(printed.mock.calls[0]?.[0]);
        expect(line).toContain(`PINNED RUN FAILED ${ERROR_CODES.INVALID_INPUT}`);
        expect(line).toContain('not-package-root');
      } finally {
        printed.mockRestore();
      }
      expect(existsSync(path.join(root, 'build'))).toBe(false);
    },
  );
});

describe.skipIf(PINNED_BIN_DIR.length === 0 || HOST_KEY === undefined)(
  'a pinned run',
  (): void => {
    it.each(['ffmpeg', 'ffprobe'] as const)(
      'resolves the pinned %s the bundles ship',
      async (component): Promise<void> => {
        const resolved = await resolveTestBinary(component);
        if (resolved === undefined || HOST_KEY === undefined) {
          throw new Error(`${component} was not resolved in the pinned run.`);
        }
        expect(path.dirname(resolved)).toBe(PINNED_BIN_DIR);
        expect(sha256Of(resolved)).toBe(PINNED_BUILDS[HOST_KEY].artifacts[component].binarySha256);
      },
    );
  },
);
