// ───────────────────────────────────────────────────────────────────
// MODULE: Media Setup Ffmpeg Tests
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
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { resetResolverCache } from '../../../src/core/ffmpeg-resolver.js';
import { PINNED_BUILDS } from '../../../src/core/pinned-builds.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  createSetupFfmpegTool,
  mediaSetupFfmpegTool,
} from '../../../src/tools/media/setup-ffmpeg.js';
import { asList, asRecord, sha256Of } from '../../helpers/tool-client.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { DownloadFetch } from '../../../src/core/artifact-download.js';
import type { ServerConfig } from '../../../src/core/config.js';
import type { ErrorCode } from '../../../src/core/errors.js';
import type {
  BinaryName,
  ResolvedBinary,
  ResolverDeps,
} from '../../../src/core/ffmpeg-resolver.js';
import type { PinnedArtifact, PinnedBuild, PlatformKey } from '../../../src/core/pinned-builds.js';
import type { ToolContext } from '../../../src/server/tool-context.js';
import type { AnyToolDefinition } from '../../../src/server/tool-registry.js';
import type { SetupDeps } from '../../../src/tools/media/setup-ffmpeg.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface FakeFetch {
  readonly impl: DownloadFetch;
  readonly calls: string[];
}

interface CleanupFailureCase {
  readonly name: string;
  readonly code: ErrorCode;
  readonly readBack: () => Promise<string>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const VERSION = '9.9.9-test';
const HTTP_OK = 200;
const FFMPEG_URL = 'https://pinned.example.test/ffmpeg.gz';
const FFPROBE_URL = 'https://pinned.example.test/ffprobe.gz';
const WRONG_SHA256 = '0'.repeat(64);
const LICENCE_TEXT = 'Test licence text for the pinned build.\n';
const READ_ONLY_FOLDER_MODE = 0o555;
const WRITABLE_FOLDER_MODE = 0o755;
// Windows ignores folder modes and root ignores permissions, so neither can lock a folder.
const FOLDER_LOCK_UNAVAILABLE = process.platform === 'win32' || process.getuid?.() === 0;

const FFMPEG_BINARY = Buffer.from('#!/bin/sh\necho fake ffmpeg\n', 'utf8');
const FFPROBE_BINARY = Buffer.from('#!/bin/sh\necho fake ffprobe\n', 'utf8');
const FFMPEG_ARCHIVE = gzipSync(FFMPEG_BINARY);
const FFPROBE_ARCHIVE = gzipSync(FFPROBE_BINARY);
const FFMPEG_ARCHIVE_SHA = digestOf(FFMPEG_ARCHIVE);
const FFPROBE_ARCHIVE_SHA = digestOf(FFPROBE_ARCHIVE);
const FFMPEG_BINARY_SHA = digestOf(FFMPEG_BINARY);
const FFPROBE_BINARY_SHA = digestOf(FFPROBE_BINARY);

const FFMPEG_ARTIFACT: PinnedArtifact = {
  component: 'ffmpeg',
  url: FFMPEG_URL,
  redirectHost: null,
  bytes: FFMPEG_ARCHIVE.length,
  sha256: FFMPEG_ARCHIVE_SHA,
  archive: 'gzip',
  binarySha256: FFMPEG_BINARY_SHA,
};

const FFPROBE_ARTIFACT: PinnedArtifact = {
  component: 'ffprobe',
  url: FFPROBE_URL,
  redirectHost: null,
  bytes: FFPROBE_ARCHIVE.length,
  sha256: FFPROBE_ARCHIVE_SHA,
  archive: 'gzip',
  binarySha256: FFPROBE_BINARY_SHA,
};

const fakeBuild: PinnedBuild = {
  platform: 'linux-x64',
  version: VERSION,
  licence: 'GPL-3.0-or-later',
  builder: 'Test builder',
  buildPage: 'https://pinned.example.test/',
  release: 'test release',
  sourceUrls: ['https://pinned.example.test/source.tar.xz'],
  artifacts: { ffmpeg: FFMPEG_ARTIFACT, ffprobe: FFPROBE_ARTIFACT },
};

const builds: Readonly<Record<PlatformKey, PinnedBuild>> = {
  ...PINNED_BUILDS,
  'linux-x64': fakeBuild,
};

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-setup-'));
const packageRoot = path.join(scratch, 'package');
const bareRoot = path.join(scratch, 'bare-package');
const fallbackRoot = path.join(scratch, 'fallback-package');

const buildLicenceDir = path.join(packageRoot, 'licenses', 'ffmpeg-builds');
mkdirSync(buildLicenceDir, { recursive: true });
writeFileSync(path.join(buildLicenceDir, 'linux-x64-LICENSE.txt'), LICENCE_TEXT);
mkdirSync(path.join(bareRoot, 'licenses'), { recursive: true });
mkdirSync(path.join(fallbackRoot, 'licenses'), { recursive: true });
writeFileSync(path.join(fallbackRoot, 'licenses', 'ffmpeg-LICENSE.txt'), LICENCE_TEXT);

const resolverDeps: ResolverDeps = {
  platform: 'linux',
  arch: 'x64',
  pathEnv: '',
  bundledPath: (): null => null,
  pinned: {
    'linux-x64': { ffmpeg: FFMPEG_BINARY_SHA, ffprobe: FFPROBE_BINARY_SHA },
  },
  probeVersion: (_binaryPath: string, name: BinaryName): string => `${name} version ${VERSION}`,
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function digestOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
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

function pinnedResponses(): Map<string, Response> {
  return new Map<string, Response>([
    [FFMPEG_URL, new Response(FFMPEG_ARCHIVE, { status: HTTP_OK })],
    [FFPROBE_URL, new Response(FFPROBE_ARCHIVE, { status: HTTP_OK })],
  ]);
}

function toolWith(overrides: Partial<SetupDeps> = {}): AnyToolDefinition {
  return createSetupFfmpegTool({
    platform: 'linux',
    arch: 'x64',
    builds,
    packageRoot,
    ...overrides,
  });
}

function freshContext(): ToolContext {
  const dataDir = mkdtempSync(path.join(scratch, 'data-'));
  const config: ServerConfig = {
    allowedRoots: [],
    outputDir: undefined,
    ffmpegPath: undefined,
    ffprobePath: undefined,
    timeoutSeconds: 90,
    dataDir,
    logLevel: 'debug',
  };
  return createToolContext(config, { resolverDeps });
}

async function handlerFailure(call: Promise<unknown>): Promise<MediaError> {
  let failure: unknown;
  try {
    await call;
  } catch (error: unknown) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(MediaError);
  if (!(failure instanceof MediaError)) {
    throw new Error('expected a handler failure');
  }
  return failure;
}

function bodyOf(result: CallToolResult): Record<string, unknown> {
  expect(result.isError).not.toBe(true);
  return asRecord(result.structuredContent);
}

function textOf(result: CallToolResult): string {
  const first = rowAt(asList(result.content), 0);
  expect(typeof first.text).toBe('string');
  return typeof first.text === 'string' ? first.text : '';
}

function rowAt(rows: readonly unknown[], index: number): Record<string, unknown> {
  const row = rows[index];
  if (row === undefined) {
    throw new Error('expected a result row');
  }
  return asRecord(row);
}

function listTree(root: string): string[] {
  const found: string[] = [];
  collectTree(root, '', found);
  found.sort();
  return found;
}

function collectTree(directory: string, prefix: string, found: string[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
    found.push(relative);
    if (entry.isDirectory()) {
      collectTree(path.join(directory, entry.name), relative, found);
    }
  }
}

function binDir(dataDir: string): string {
  return path.join(dataDir, 'bin');
}

function binPath(dataDir: string, name: string): string {
  return path.join(binDir(dataDir), name);
}

function workFolders(dataDir: string): string[] {
  return readdirSync(binDir(dataDir)).filter((name) => name.startsWith('.setup-'));
}

function installRecord(dataDir: string): Record<string, unknown> {
  const recordPath = binPath(dataDir, 'install.json');
  const parsed: unknown = JSON.parse(readFileSync(recordPath, 'utf8')) as unknown;
  return asRecord(parsed);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeEach((): void => {
  resetResolverCache();
});

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

it('plans both downloads and writes nothing without consent', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;
  const before = listTree(dataDir);

  const error = await handlerFailure(tool.handler({ component: 'both', consent: false }, context));

  expect(error.code).toBe(ERROR_CODES.CONSENT_REQUIRED);
  expect(error.details.action).toBe('download-ffmpeg');
  const rows = asList(error.details.downloads).map((row) => asRecord(row));
  expect(rows).toHaveLength(2);
  expect(rowAt(rows, 0)).toMatchObject({
    component: 'ffmpeg',
    platform: 'linux-x64',
    url: FFMPEG_URL,
    redirectHost: null,
    bytes: FFMPEG_ARCHIVE.length,
    sha256: FFMPEG_ARCHIVE_SHA,
    binarySha256: FFMPEG_BINARY_SHA,
    destination: binPath(dataDir, 'ffmpeg'),
  });
  expect(rowAt(rows, 1)).toMatchObject({
    component: 'ffprobe',
    platform: 'linux-x64',
    url: FFPROBE_URL,
    redirectHost: null,
    bytes: FFPROBE_ARCHIVE.length,
    sha256: FFPROBE_ARCHIVE_SHA,
    binarySha256: FFPROBE_BINARY_SHA,
    destination: binPath(dataDir, 'ffprobe'),
  });
  expect(fake.calls).toEqual([]);
  expect(listTree(dataDir)).toEqual(before);
  expect(existsSync(binDir(dataDir))).toBe(false);
});

it('asks consent for the ffprobe download alone', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const error = await handlerFailure(
    tool.handler({ component: 'ffprobe', consent: false }, context),
  );

  expect(error.code).toBe(ERROR_CODES.CONSENT_REQUIRED);
  expect(error.details.action).toBe('download-ffprobe');
  const rows = asList(error.details.downloads).map((row) => asRecord(row));
  expect(rows).toHaveLength(1);
  expect(rowAt(rows, 0)).toMatchObject({
    component: 'ffprobe',
    url: FFPROBE_URL,
    destination: binPath(dataDir, 'ffprobe'),
  });
  expect(fake.calls).toEqual([]);
});

it('installs both binaries with consent and records them', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;
  const ffmpegPath = binPath(dataDir, 'ffmpeg');
  const ffprobePath = binPath(dataDir, 'ffprobe');

  const result = await tool.handler({ component: 'both', consent: true }, context);
  const body = bodyOf(result);

  expect(textOf(result)).toBe(
    `Installed ffmpeg and ffprobe ${VERSION} into the server data folder.`,
  );
  expect(fake.calls).toEqual([FFMPEG_URL, FFPROBE_URL]);

  expect(readFileSync(ffmpegPath, 'utf8')).toBe(FFMPEG_BINARY.toString('utf8'));
  expect(readFileSync(ffprobePath, 'utf8')).toBe(FFPROBE_BINARY.toString('utf8'));
  expect(sha256Of(ffmpegPath)).toBe(FFMPEG_BINARY_SHA);
  expect(sha256Of(ffprobePath)).toBe(FFPROBE_BINARY_SHA);
  if (process.platform !== 'win32') {
    expect(statSync(ffmpegPath).mode & 0o777).toBe(0o755);
    expect(statSync(ffprobePath).mode & 0o777).toBe(0o755);
  }

  const licencePath = path.join(binDir(dataDir), 'licenses', 'ffmpeg-LICENSE.txt');
  const sourcePath = path.join(binDir(dataDir), 'licenses', 'ffmpeg-SOURCE.md');
  expect(readFileSync(licencePath, 'utf8')).toBe(LICENCE_TEXT);
  expect(readFileSync(sourcePath, 'utf8').includes(`ffmpeg version ${VERSION}`)).toBe(true);

  const record = installRecord(dataDir);
  expect(record.platform).toBe('linux-x64');
  expect(record.version).toBe(VERSION);
  expect(record.notices).toEqual(['licenses/ffmpeg-LICENSE.txt', 'licenses/ffmpeg-SOURCE.md']);
  const binaries = asRecord(record.binaries);
  expect(binaries.ffmpeg).toMatchObject({
    fileName: 'ffmpeg',
    sha256: FFMPEG_BINARY_SHA,
    archiveSha256: FFMPEG_ARCHIVE_SHA,
    url: FFMPEG_URL,
  });
  expect(binaries.ffprobe).toMatchObject({
    fileName: 'ffprobe',
    sha256: FFPROBE_BINARY_SHA,
    archiveSha256: FFPROBE_ARCHIVE_SHA,
    url: FFPROBE_URL,
  });

  expect(workFolders(dataDir)).toEqual([]);
  expect(asList(body.components).map((entry) => asRecord(entry))).toEqual([
    {
      component: 'ffmpeg',
      path: ffmpegPath,
      source: 'installed',
      bytes: FFMPEG_ARCHIVE.length,
      sha256: FFMPEG_BINARY_SHA,
    },
    {
      component: 'ffprobe',
      path: ffprobePath,
      source: 'installed',
      bytes: FFPROBE_ARCHIVE.length,
      sha256: FFPROBE_BINARY_SHA,
    },
  ]);
  expect(asList(body.downloads)).toHaveLength(2);
  expect(body.licences).toEqual(['licenses/ffmpeg-LICENSE.txt', 'licenses/ffmpeg-SOURCE.md']);
  expect(body.warnings).toEqual([]);
});

it('downloads nothing when both binaries are already installed', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const first = await tool.handler({ component: 'both', consent: true }, context);
  expect(first.isError).not.toBe(true);
  const callsAfterFirst = [...fake.calls];

  const second = await tool.handler({ component: 'both', consent: true }, context);
  const body = bodyOf(second);

  expect(fake.calls).toEqual(callsAfterFirst);
  expect(textOf(second)).toBe('ffmpeg and ffprobe are ready.');
  expect(asList(body.components).map((entry) => asRecord(entry))).toEqual([
    { component: 'ffmpeg', path: binPath(dataDir, 'ffmpeg'), source: 'installed' },
    { component: 'ffprobe', path: binPath(dataDir, 'ffprobe'), source: 'installed' },
  ]);
  expect(asList(body.downloads)).toEqual([]);
  expect(asList(body.licences)).toEqual([]);
});

it('refuses a body whose digest does not match and leaves no trace', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const wrongBuild: PinnedBuild = {
    ...fakeBuild,
    artifacts: {
      ...fakeBuild.artifacts,
      ffmpeg: { ...FFMPEG_ARTIFACT, sha256: WRONG_SHA256 },
    },
  };
  const tool = toolWith({
    builds: { ...PINNED_BUILDS, 'linux-x64': wrongBuild },
    fetchImpl: fake.impl,
  });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.CHECKSUM_MISMATCH);
  expect(error.details).toEqual({
    expected: WRONG_SHA256,
    actual: FFMPEG_ARCHIVE_SHA,
    url: FFMPEG_URL,
  });
  expect(fake.calls).toEqual([FFMPEG_URL]);
  expect(existsSync(binPath(dataDir, 'ffmpeg'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'ffprobe'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
  expect(workFolders(dataDir)).toEqual([]);
});

it('reports an unreachable host and still plans both downloads', async (): Promise<void> => {
  const calls: string[] = [];
  const offline: DownloadFetch = async (url: string): Promise<Response> => {
    calls.push(url);
    throw new TypeError('fetch failed');
  };
  const tool = toolWith({ fetchImpl: offline });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('network');
  expect(calls).toEqual([FFMPEG_URL]);
  expect(existsSync(binPath(dataDir, 'ffmpeg'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
  expect(workFolders(dataDir)).toEqual([]);
  const retry = await handlerFailure(tool.handler({ component: 'both', consent: false }, context));
  expect(retry.code).toBe(ERROR_CODES.CONSENT_REQUIRED);
  expect(asList(retry.details.downloads)).toHaveLength(2);
});

it('stops a download at the server time limit and leaves no trace', async (): Promise<void> => {
  const stalled: DownloadFetch = async (_url, init): Promise<Response> => new Response(
    new ReadableStream<Uint8Array>({
      start(controller): void {
        init.signal.addEventListener('abort', (): void => {
          controller.error(init.signal.reason);
        });
      },
    }),
    { status: HTTP_OK },
  );
  const tool = toolWith({ fetchImpl: stalled });
  const base = freshContext();
  const context = createToolContext({ ...base.config, timeoutSeconds: 0.05 }, { resolverDeps });
  const dataDir = context.config.dataDir;

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details.reason).toBe('timeout');
  expect(existsSync(binPath(dataDir, 'ffmpeg'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
  expect(workFolders(dataDir)).toEqual([]);
});

it('removes the first binary when a later download fails', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const wrongBuild: PinnedBuild = {
    ...fakeBuild,
    artifacts: {
      ...fakeBuild.artifacts,
      ffprobe: { ...FFPROBE_ARTIFACT, sha256: WRONG_SHA256 },
    },
  };
  const tool = toolWith({
    builds: { ...PINNED_BUILDS, 'linux-x64': wrongBuild },
    fetchImpl: fake.impl,
  });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.CHECKSUM_MISMATCH);
  expect(fake.calls).toEqual([FFMPEG_URL, FFPROBE_URL]);
  expect(existsSync(binPath(dataDir, 'ffmpeg'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'ffprobe'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
  expect(workFolders(dataDir)).toEqual([]);
});

it('removes a placed binary when a later one cannot be read back', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const context = freshContext();
  const dataDir = context.config.dataDir;
  const tool = toolWith({
    fetchImpl: fake.impl,
    hashFile: async (filePath: string): Promise<string> => {
      if (filePath === binPath(dataDir, 'ffprobe')) {
        throw new Error(`The disk could not read ${filePath}.`);
      }
      return sha256Of(filePath);
    },
  });

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details).toEqual({ url: FFPROBE_URL, httpStatus: null, reason: 'write' });
  expect(existsSync(binPath(dataDir, 'ffmpeg'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'ffprobe'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
  expect(workFolders(dataDir)).toEqual([]);
});

it('gives every download in one call the same deadline', async (): Promise<void> => {
  const responses = pinnedResponses();
  const signals: AbortSignal[] = [];
  const recording: DownloadFetch = async (url, init): Promise<Response> => {
    signals.push(init.signal);
    const response = responses.get(url);
    if (response === undefined) {
      throw new Error(`No response for ${url}.`);
    }
    return response;
  };
  const tool = toolWith({ fetchImpl: recording });

  await tool.handler({ component: 'both', consent: true }, freshContext());

  expect(signals).toHaveLength(2);
  expect(signals[0]).toBe(signals[1]);
});

it('installs once when two consented calls overlap', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const [first, second] = await Promise.all([
    tool.handler({ component: 'both', consent: true }, context),
    tool.handler({ component: 'both', consent: true }, context),
  ]);

  expect(textOf(first)).toBe(
    `Installed ffmpeg and ffprobe ${VERSION} into the server data folder.`,
  );
  expect(textOf(second)).toBe('ffmpeg and ffprobe are ready.');
  expect(fake.calls).toEqual([FFMPEG_URL, FFPROBE_URL]);
  expect(sha256Of(binPath(dataDir, 'ffmpeg'))).toBe(FFMPEG_BINARY_SHA);
  expect(sha256Of(binPath(dataDir, 'ffprobe'))).toBe(FFPROBE_BINARY_SHA);
});

it('runs the next call after an earlier one failed', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();

  const [refused, installed] = await Promise.allSettled([
    tool.handler({ component: 'both', consent: false }, context),
    tool.handler({ component: 'both', consent: true }, context),
  ]);

  expect(refused.status).toBe('rejected');
  expect(installed.status).toBe('fulfilled');
  expect(fake.calls).toEqual([FFMPEG_URL, FFPROBE_URL]);
});

const CLEANUP_FAILURES: readonly CleanupFailureCase[] = [
  {
    name: 'a read-back that fails',
    code: ERROR_CODES.DOWNLOAD_FAILED,
    readBack: async (): Promise<string> => {
      throw new Error('The disk could not read the binary.');
    },
  },
  {
    name: 'a read-back with the wrong digest',
    code: ERROR_CODES.CHECKSUM_MISMATCH,
    readBack: async (): Promise<string> => WRONG_SHA256,
  },
];

describe.skipIf(FOLDER_LOCK_UNAVAILABLE)('a cleanup that cannot remove files', (): void => {
  it.each(CLEANUP_FAILURES)(
    'keeps the failure of $name',
    async ({ code, readBack }): Promise<void> => {
      const fake = fakeFetch(pinnedResponses());
      const context = freshContext();
      const dataDir = context.config.dataDir;
      const tool = toolWith({
        fetchImpl: fake.impl,
        hashFile: async (filePath: string): Promise<string> => {
          if (filePath !== binPath(dataDir, 'ffprobe')) {
            return sha256Of(filePath);
          }
          chmodSync(binDir(dataDir), READ_ONLY_FOLDER_MODE);
          return readBack();
        },
      });

      try {
        const call = tool.handler({ component: 'both', consent: true }, context);
        const error = await handlerFailure(call);
        expect(error.code).toBe(code);
        expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
      } finally {
        chmodSync(binDir(dataDir), WRITABLE_FOLDER_MODE);
      }
    },
  );
});

it('refuses a platform with no pinned build and writes nothing', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ platform: 'freebsd', fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;
  const before = listTree(dataDir);

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
  expect(error.message).toContain('MEDIA_EDITOR_FFMPEG_PATH');
  expect(error.details).toEqual({
    parameter: 'platform',
    value: 'freebsd-x64',
    reason: 'unsupported-platform',
  });
  expect(fake.calls).toEqual([]);
  expect(listTree(dataDir)).toEqual(before);
  expect(existsSync(binDir(dataDir))).toBe(false);
});

it('refuses to download when the licence text is missing', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ packageRoot: bareRoot, fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;
  const before = listTree(dataDir);

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.INTERNAL);
  expect(error.details).toEqual({ reason: 'licence-missing' });
  expect(fake.calls).toEqual([]);
  expect(listTree(dataDir)).toEqual(before);
});

it('reports both found binaries and writes nothing either way', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const real = freshContext();
  const dataDir = real.config.dataDir;
  const context: ToolContext = {
    ...real,
    resolveBinary: (name: BinaryName): Promise<ResolvedBinary> => Promise.resolve({
      name,
      path: `/usr/bin/${name}`,
      source: 'system-path',
      version: `${name} version ${VERSION}`,
    }),
  };
  const before = listTree(dataDir);

  const withoutConsent = await tool.handler({ component: 'both', consent: false }, context);
  const withConsent = await tool.handler({ component: 'both', consent: true }, context);
  const refused = bodyOf(withoutConsent);
  const accepted = bodyOf(withConsent);

  const expected = [
    { component: 'ffmpeg', path: '/usr/bin/ffmpeg', source: 'system-path' },
    { component: 'ffprobe', path: '/usr/bin/ffprobe', source: 'system-path' },
  ];
  expect(asList(refused.components)).toEqual(expected);
  expect(asList(accepted.components)).toEqual(expected);
  expect(asList(refused.downloads)).toEqual([]);
  expect(asList(accepted.downloads)).toEqual([]);
  expect(textOf(withoutConsent)).toBe('ffmpeg and ffprobe are ready.');
  expect(textOf(withConsent)).toBe('ffmpeg and ffprobe are ready.');
  expect(fake.calls).toEqual([]);
  expect(listTree(dataDir)).toEqual(before);
});

it('uses the shared licence file when the platform copy is absent', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ packageRoot: fallbackRoot, fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  const result = await tool.handler({ component: 'ffmpeg', consent: true }, context);
  expect(result.isError).not.toBe(true);

  const licencePath = path.join(binDir(dataDir), 'licenses', 'ffmpeg-LICENSE.txt');
  expect(readFileSync(licencePath, 'utf8')).toBe(LICENCE_TEXT);
  expect(textOf(result)).toBe(`Installed ffmpeg ${VERSION} into the server data folder.`);
  expect(fake.calls).toEqual([FFMPEG_URL]);
});

it('keeps the ffmpeg entry when a later call installs ffprobe', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  await tool.handler({ component: 'ffmpeg', consent: true }, context);
  const firstFfmpeg = asRecord(asRecord(installRecord(dataDir).binaries).ffmpeg);

  await tool.handler({ component: 'ffprobe', consent: true }, context);
  const binaries = asRecord(installRecord(dataDir).binaries);

  expect(asRecord(binaries.ffmpeg)).toEqual(firstFfmpeg);
  expect(binaries.ffprobe).toMatchObject({
    fileName: 'ffprobe',
    sha256: FFPROBE_BINARY_SHA,
  });
  expect(fake.calls).toEqual([FFMPEG_URL, FFPROBE_URL]);
});

it('drops a recorded binary that is no longer there', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const tool = toolWith({ fetchImpl: fake.impl });
  const context = freshContext();
  const dataDir = context.config.dataDir;

  await tool.handler({ component: 'ffmpeg', consent: true }, context);
  rmSync(binPath(dataDir, 'ffmpeg'));
  await tool.handler({ component: 'ffprobe', consent: true }, context);

  expect(Object.keys(asRecord(installRecord(dataDir).binaries))).toEqual(['ffprobe']);
});

it('removes a binary it cannot read back and reports a write failure', async (): Promise<void> => {
  const fake = fakeFetch(pinnedResponses());
  const context = freshContext();
  const dataDir = context.config.dataDir;
  const tool = toolWith({
    fetchImpl: fake.impl,
    hashFile: async (filePath: string): Promise<string> => {
      throw new Error(`The disk could not read ${filePath}.`);
    },
  });

  const error = await handlerFailure(tool.handler({ component: 'both', consent: true }, context));

  expect(error.code).toBe(ERROR_CODES.DOWNLOAD_FAILED);
  expect(error.details).toEqual({ url: FFMPEG_URL, httpStatus: null, reason: 'write' });
  expect(existsSync(binPath(dataDir, 'ffmpeg'))).toBe(false);
  expect(existsSync(binPath(dataDir, 'install.json'))).toBe(false);
  expect(workFolders(dataDir)).toEqual([]);
});

it('exposes the registered name, title, description and annotations', (): void => {
  expect(mediaSetupFfmpegTool.name).toBe('media_setup_ffmpeg');
  expect(mediaSetupFfmpegTool.title).toBe('Set up ffmpeg');
  expect(
    mediaSetupFfmpegTool.description.startsWith(
      'Finds ffmpeg and ffprobe, and downloads a pinned build of either one that is missing '
        + 'after the user consents.',
    ),
  ).toBe(true);
  expect(mediaSetupFfmpegTool.description.includes('first call')).toBe(true);
  expect(mediaSetupFfmpegTool.description.includes('consent: true')).toBe(true);
  expect(mediaSetupFfmpegTool.annotations).toEqual({
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  });
});
