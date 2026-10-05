// ───────────────────────────────────────────────────────────────────
// MODULE: Probe Cache Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { PersistentProbeCache } from '../../src/core/probe-cache.js';

import type { Capabilities } from '../../src/core/capabilities.js';
import type {
  CachedBinaryResolution,
  ProbeCacheIdentity,
} from '../../src/core/probe-cache.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

let dataDir = '';

function cacheFile(): string {
  return path.join(dataDir, 'cache', 'probes.json');
}

function identity(over: Partial<ProbeCacheIdentity> = {}): ProbeCacheIdentity {
  return {
    path: path.join(dataDir, 'bin', 'ffmpeg'),
    size: 4096,
    mtimeMs: 1000,
    version: 'ffmpeg version test',
    ...over,
  };
}

function resolution(
  over: Partial<CachedBinaryResolution> = {},
): CachedBinaryResolution {
  return {
    ...identity(),
    name: 'ffmpeg',
    source: 'bundled',
    resolutionKey: 'settings',
    ...over,
  };
}

function lists(): Capabilities {
  return {
    encoders: new Set(['libx264', 'aac']),
    filters: new Set(['scale', 'crop']),
  };
}

// A served hit needs the recorded file on disk with the same size and mtime,
// so fixtures that expect a hit write the binary they record.
function writeBinary(name: string, contents: string): ProbeCacheIdentity {
  const filePath = path.join(dataDir, 'bin', name);
  writeFileSync(filePath, contents);
  const info = statSync(filePath);
  return {
    path: filePath,
    size: info.size,
    mtimeMs: info.mtimeMs,
    version: 'ffmpeg version test',
  };
}

function readDocument(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(cacheFile(), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected a cache document');
  }
  return parsed as Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeEach((): void => {
  dataDir = mkdtempSync(path.join(tmpdir(), 'probe-cache-'));
});

afterEach((): void => {
  rmSync(dataDir, { recursive: true, force: true });
});

it('serves the latest binary resolution for a name and key', async (): Promise<void> => {
  mkdirSync(path.join(dataDir, 'bin'), { recursive: true });
  const earlier = writeBinary('ffmpeg', 'first-build');
  const newer = writeBinary('ffmpeg-new', 'second-build-bytes');
  const cache = new PersistentProbeCache(dataDir);
  await cache.setBinaryResolution(resolution({
    size: earlier.size,
    mtimeMs: earlier.mtimeMs,
  }));
  await cache.setBinaryResolution(
    resolution({
      path: newer.path,
      size: newer.size,
      mtimeMs: newer.mtimeMs,
      version: 'ffmpeg version newer',
    }),
  );
  const hit = await cache.getBinaryResolution('ffmpeg', 'settings');
  expect(hit?.path).toBe(newer.path);
  expect(hit?.version).toBe('ffmpeg version newer');
  expect(await cache.getBinaryResolution('ffmpeg', 'other-settings')).toBeUndefined();
  expect(await cache.getBinaryResolution('ffprobe', 'settings')).toBeUndefined();
});

it('forgets a binary resolution by name and path', async (): Promise<void> => {
  mkdirSync(path.join(dataDir, 'bin'), { recursive: true });
  const stored = writeBinary('ffmpeg', 'bytes');
  const cache = new PersistentProbeCache(dataDir);
  const entry = resolution({ size: stored.size, mtimeMs: stored.mtimeMs });
  await cache.setBinaryResolution(entry);
  // The entry is servable first, so the drop is what removes the hit.
  expect(
    (await cache.getBinaryResolution('ffmpeg', 'settings'))?.path,
  ).toBe(entry.path);
  await cache.dropBinaryResolution('ffmpeg', entry.path);
  expect(await cache.getBinaryResolution('ffmpeg', 'settings')).toBeUndefined();
});

it('serves stored capability lists for the same identity', async (): Promise<void> => {
  const cache = new PersistentProbeCache(dataDir);
  await cache.setCapabilities(identity(), lists());
  const hit = await cache.getCapabilities(identity());
  expect(hit?.encoders).toEqual(new Set(['libx264', 'aac']));
  expect(hit?.filters).toEqual(new Set(['scale', 'crop']));
});

it('misses capabilities after the binary size changes', async (): Promise<void> => {
  const cache = new PersistentProbeCache(dataDir);
  await cache.setCapabilities(identity(), lists());
  expect(await cache.getCapabilities(identity({ size: 8192 }))).toBeUndefined();
});

it('misses capabilities after the binary mtime changes', async (): Promise<void> => {
  const cache = new PersistentProbeCache(dataDir);
  await cache.setCapabilities(identity(), lists());
  expect(await cache.getCapabilities(identity({ mtimeMs: 2000 }))).toBeUndefined();
});

it('ignores a binary resolution whose source is not known', async (): Promise<void> => {
  mkdirSync(path.join(dataDir, 'bin'), { recursive: true });
  const stored = writeBinary('ffmpeg', 'bytes');
  mkdirSync(path.join(dataDir, 'cache'), { recursive: true });
  writeFileSync(cacheFile(), JSON.stringify({
    schemaVersion: 1,
    binaries: [{
      path: stored.path,
      size: stored.size,
      mtimeMs: stored.mtimeMs,
      version: stored.version,
      name: 'ffmpeg',
      source: 'not-a-source',
      resolutionKey: 'settings',
    }],
    capabilities: [],
  }));
  const cache = new PersistentProbeCache(dataDir);
  expect(await cache.getBinaryResolution('ffmpeg', 'settings')).toBeUndefined();
});

it('falls back to an empty document on a corrupt file and rewrites it', async (): Promise<void> => {
  mkdirSync(path.join(dataDir, 'cache'), { recursive: true });
  writeFileSync(cacheFile(), '{broken json');
  const cache = new PersistentProbeCache(dataDir);
  expect(await cache.getBinaryResolution('ffmpeg', 'settings')).toBeUndefined();
  expect(await cache.getCapabilities(identity())).toBeUndefined();
  await cache.setBinaryResolution(resolution());
  const document = readDocument();
  expect(document['schemaVersion']).toBe(1);
  const binaries = document['binaries'];
  expect(Array.isArray(binaries) && binaries.length === 1).toBe(true);
  const first = (binaries as unknown[])[0] as Record<string, unknown>;
  expect(first['name']).toBe('ffmpeg');
  expect(first['resolutionKey']).toBe('settings');
});

it(
  'keeps every binary entry written concurrently',
  async (): Promise<void> => {
    const cache = new PersistentProbeCache(dataDir);
    const count = 24;
    await Promise.all(
      Array.from({ length: count }, (_, index) => (
        cache.setBinaryResolution(
          resolution({
            resolutionKey: `settings-${index}`,
            version: `ffmpeg version ${index}`,
          }),
        )
      )),
    );
    const document = readDocument();
    const binaries = document['binaries'];
    expect(Array.isArray(binaries) && binaries.length === count).toBe(true);
  },
);

it('never exposes a partial document while writes land', async (): Promise<void> => {
  const cache = new PersistentProbeCache(dataDir);
  const writes = Array.from({ length: 24 }, (_, index) => (
    cache.setBinaryResolution(
      resolution({
        resolutionKey: `settings-${index}`,
        version: `ffmpeg version ${index}`,
      }),
    )
  ));
  // A rename either replaces the whole file or leaves the old one, so a reader
  // that catches the file mid-run still parses a complete document.
  let allDone = false;
  const settled = Promise.all(writes).then(() => {
    allDone = true;
  });
  while (!allDone) {
    if (existsSync(cacheFile())) {
      const document = JSON.parse(readFileSync(cacheFile(), 'utf8'));
      expect((document as Record<string, unknown>)['schemaVersion']).toBe(1);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1);
    });
  }
  await settled;
  const document = readDocument();
  expect(document['schemaVersion']).toBe(1);
  const leftOver = readdirSync(path.join(dataDir, 'cache')).filter((name) => (
    name.endsWith('.tmp')
  ));
  expect(leftOver).toEqual([]);
});
