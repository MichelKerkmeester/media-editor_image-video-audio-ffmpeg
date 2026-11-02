// ───────────────────────────────────────────────────────────────────
// MODULE: Pinned Builds Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { expect, it } from 'vitest';

import {
  PINNED_BUILDS,
  PLATFORM_KEYS,
  executableFileName,
  platformKeyOf,
  platformParts,
} from '../../src/core/pinned-builds.js';
import type { PlatformKey } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

const COMPONENTS = ['ffmpeg', 'ffprobe'] as const;

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('lists the five bundle targets in build order in both declarations', (): void => {
  const expectedKeys = ['darwin-arm64', 'darwin-x64', 'win32-x64', 'linux-x64', 'linux-arm64'];
  expect([...PLATFORM_KEYS]).toEqual(expectedKeys);
  expect(Object.keys(PINNED_BUILDS)).toEqual(expectedKeys);
});

it('describes every row with its key, licence and https build metadata', (): void => {
  for (const key of PLATFORM_KEYS) {
    const row = PINNED_BUILDS[key];
    expect(row.platform).toBe(key);
    expect(row.licence).toBe('GPL-3.0-or-later');
    expect(row.version.length).toBeGreaterThan(0);
    expect(row.builder.length).toBeGreaterThan(0);
    expect(row.release.length).toBeGreaterThan(0);
    expect(row.buildPage.startsWith('https://')).toBe(true);
    for (const url of row.sourceUrls) {
      expect(url.startsWith('https://')).toBe(true);
    }
    for (const component of COMPONENTS) {
      const artifact = row.artifacts[component];
      expect(artifact).toBeDefined();
      expect(artifact.component).toBe(component);
    }
  }
});

it('pins every artifact to an https archive, a size and two lowercase hashes', (): void => {
  for (const key of PLATFORM_KEYS) {
    const row = PINNED_BUILDS[key];
    for (const component of COMPONENTS) {
      const artifact = row.artifacts[component];
      expect(artifact.url.startsWith('https://')).toBe(true);
      const onGitHub = new URL(artifact.url).host === 'github.com';
      expect(artifact.redirectHost).toBe(onGitHub ? 'release-assets.githubusercontent.com' : null);
      expect(Number.isSafeInteger(artifact.bytes)).toBe(true);
      expect(artifact.bytes).toBeGreaterThan(0);
      expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(artifact.binarySha256).toMatch(/^[0-9a-f]{64}$/);
      if (artifact.archive === 'zip') {
        expect(artifact.entry).toBe(component);
      } else {
        expect(artifact.entry).toBeUndefined();
        expect(artifact.url.endsWith(`${component}-${key}.gz`)).toBe(true);
      }
    }
  }
});

it('gives each pinned archive hash and binary hash to one artifact only', (): void => {
  const archiveHashes: string[] = [];
  const binaryHashes: string[] = [];
  for (const key of PLATFORM_KEYS) {
    for (const component of COMPONENTS) {
      const artifact = PINNED_BUILDS[key].artifacts[component];
      archiveHashes.push(artifact.sha256);
      binaryHashes.push(artifact.binarySha256);
    }
  }
  expect(archiveHashes.length).toBeGreaterThan(0);
  expect(new Set(archiveHashes).size).toBe(archiveHashes.length);
  expect(new Set(binaryHashes).size).toBe(binaryHashes.length);
});

it('keeps both binaries of a row on the single build the row names', (): void => {
  for (const key of PLATFORM_KEYS) {
    const row = PINNED_BUILDS[key];
    expect(Object.keys(row.artifacts).sort()).toEqual(['ffmpeg', 'ffprobe']);
    // One build serves the pair, so the row carries one version string for both.
    const versions = Object.keys(row).filter((field) => field === 'version');
    expect(versions).toEqual(['version']);
    expect(typeof row.version).toBe('string');
  }
});

it('maps the five supported platform and arch pairs and rejects the rest', (): void => {
  const supported: Array<[string, string, PlatformKey]> = [
    ['darwin', 'arm64', 'darwin-arm64'],
    ['darwin', 'x64', 'darwin-x64'],
    ['win32', 'x64', 'win32-x64'],
    ['linux', 'x64', 'linux-x64'],
    ['linux', 'arm64', 'linux-arm64'],
  ];
  for (const [platform, arch, key] of supported) {
    expect(platformKeyOf(platform, arch)).toBe(key);
  }
  const unsupported: Array<[string, string]> = [
    ['darwin', 'ia32'],
    ['linux', 'arm'],
    ['freebsd', 'x64'],
    ['win32', 'arm64'],
    ['', ''],
  ];
  for (const [platform, arch] of unsupported) {
    expect(platformKeyOf(platform, arch)).toBeUndefined();
  }
  expect(platformKeyOf(process.platform, process.arch)).toBeDefined();
});

it('round-trips every platform key through its parts', (): void => {
  for (const key of PLATFORM_KEYS) {
    const parts = platformParts(key);
    expect(platformKeyOf(parts.platform, parts.arch)).toBe(key);
  }
});

it('gives only the Windows binaries an .exe suffix', (): void => {
  expect(executableFileName('ffmpeg', 'win32-x64')).toBe('ffmpeg.exe');
  expect(executableFileName('ffprobe', 'win32-x64')).toBe('ffprobe.exe');
  for (const key of PLATFORM_KEYS) {
    if (key === 'win32-x64') {
      continue;
    }
    for (const component of COMPONENTS) {
      expect(executableFileName(component, key)).toBe(component);
    }
  }
});

it('freezes every row and source list against mutation', (): void => {
  const row = PINNED_BUILDS['linux-x64'];
  const version = row.version;
  const sourceUrls = [...row.sourceUrls];
  expect(() => {
    (row as { version: string }).version = 'mutated';
  }).toThrow(TypeError);
  expect(() => {
    (row.sourceUrls as string[]).push('https://example.com/mutated');
  }).toThrow(TypeError);
  expect(PINNED_BUILDS['linux-x64'].version).toBe(version);
  expect([...PINNED_BUILDS['linux-x64'].sourceUrls]).toEqual(sourceUrls);
});
