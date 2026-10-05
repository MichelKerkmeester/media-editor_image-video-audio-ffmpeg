// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Targets Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { expect, it } from 'vitest';

import {
  BUNDLE_SIZE_LIMIT,
  binaryDestinations,
  bundleFileName,
  checkBundleSize,
  npmInstallArgs,
  npmInstallEnv,
  parseBuildArgs,
  targetManifest,
} from '../../scripts/bundle/targets.js';
import { ERROR_CODES, isMediaError } from '../../src/core/errors.js';
import { PLATFORM_KEYS, platformParts } from '../../src/core/pinned-builds.js';

import type { MediaError } from '../../src/core/errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

function captureError(run: () => unknown): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (isMediaError(error)) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the call to throw a MediaError.');
}

function makeManifest(): Record<string, unknown> {
  return {
    manifest_version: '0.3',
    name: 'media-editor',
    version: '1.0.0',
    description: 'Media editor tools for the desktop extension',
    author: { name: 'Barter AI Systems' },
    server: {
      type: 'node',
      entry_point: 'dist/index.js',
      mcp_config: { command: 'node', args: ['dist/index.js'] },
    },
    compatibility: { platforms: ['darwin', 'win32', 'linux'], runtimes: { node: '>=20' } },
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('reads one or more targets and keeps their first-seen order', (): void => {
  expect(parseBuildArgs(['--target', 'linux-x64'])).toEqual({ targets: ['linux-x64'] });
  expect(parseBuildArgs(['--target', 'win32-x64', '--target', 'darwin-arm64'])).toEqual({
    targets: ['win32-x64', 'darwin-arm64'],
  });
  expect(parseBuildArgs(['--target=linux-x64'])).toEqual({ targets: ['linux-x64'] });
  expect(parseBuildArgs(['--target', 'linux-x64', '--target', 'linux-x64'])).toEqual({
    targets: ['linux-x64'],
  });
});

it('expands --all to every target in platform key order', (): void => {
  expect(parseBuildArgs(['--all'])).toEqual({ targets: [...PLATFORM_KEYS] });
});

it('refuses an empty, unknown, or misused target argument', (): void => {
  const cases: ReadonlyArray<readonly [readonly string[], Record<string, unknown>]> = [
    [[], { parameter: 'target', value: null, reason: 'no-target' }],
    [['--target', 'mac'], { parameter: 'target', value: 'mac', reason: 'unknown-target' }],
    [['--target'], { parameter: 'target', value: null, reason: 'missing-value' }],
    [['--target', '--all'], { parameter: 'target', value: null, reason: 'missing-value' }],
    [['--fast'], { parameter: 'target', value: '--fast', reason: 'unknown-flag' }],
  ];
  for (const [argv, details] of cases) {
    const error = captureError(() => parseBuildArgs(argv));
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details).toEqual(details);
  }
});

it('adds --libc=glibc for the two Linux targets only', (): void => {
  const withLibc = PLATFORM_KEYS.filter((key) => npmInstallArgs(key).includes('--libc=glibc'));
  expect(withLibc).toEqual(['linux-x64', 'linux-arm64']);
});

it('passes the install flags and the target platform and cpu for every key', (): void => {
  for (const key of PLATFORM_KEYS) {
    const { platform, arch } = platformParts(key);
    const args = npmInstallArgs(key);
    expect(args).toContain('--omit=dev');
    expect(args).toContain('--ignore-scripts');
    expect(args).toContain(`--os=${platform}`);
    expect(args).toContain(`--cpu=${arch}`);
  }
});

it('sets both npm platform variables from the key and keeps the other variables', (): void => {
  const env: NodeJS.ProcessEnv = { PATH: '/usr/bin:/bin', HOME: '/home/user' };
  const result = npmInstallEnv('linux-arm64', env);
  expect(result['npm_config_platform']).toBe('linux');
  expect(result['npm_config_arch']).toBe('arm64');
  expect(result['PATH']).toBe('/usr/bin:/bin');
  expect(result['HOME']).toBe('/home/user');
});

it('returns a copy and leaves the caller environment unchanged', (): void => {
  const env: NodeJS.ProcessEnv = { PATH: '/usr/bin:/bin' };
  const snapshot: NodeJS.ProcessEnv = { ...env };
  npmInstallEnv('win32-x64', env);
  expect(env).toEqual(snapshot);
});

it('places both binaries where the server resolves them on Windows', (): void => {
  expect(binaryDestinations('win32-x64')).toEqual({
    ffmpeg: 'node_modules/ffmpeg-static/ffmpeg.exe',
    ffprobe: 'node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe',
  });
});

it('places both binaries under the platform and arch folders for linux-arm64', (): void => {
  expect(binaryDestinations('linux-arm64')).toEqual({
    ffmpeg: 'node_modules/ffmpeg-static/ffmpeg',
    ffprobe: 'node_modules/ffprobe-static/bin/linux/arm64/ffprobe',
  });
});

it('names the bundle file after the platform key', (): void => {
  expect(bundleFileName('linux-x64')).toBe('media-editor-linux-x64.mcpb');
});

it('limits compatibility per target and keeps the other fields intact', (): void => {
  const manifest = makeManifest();
  const snapshot = structuredClone(manifest);
  for (const key of PLATFORM_KEYS) {
    const result = targetManifest(manifest, key);
    expect(result['compatibility']).toEqual({
      platforms: [platformParts(key).platform],
      runtimes: { node: '>=20' },
    });
    expect(Object.keys(result)).toEqual(Object.keys(manifest));
    for (const [name, value] of Object.entries(manifest)) {
      if (name !== 'compatibility') {
        expect(result[name]).toEqual(value);
      }
    }
  }
  expect(manifest).toEqual(snapshot);
});

it('refuses a manifest without a compatibility object', (): void => {
  const error = captureError(() => targetManifest({ name: 'media-editor' }, 'linux-x64'));
  expect(error.code).toBe(ERROR_CODES.INTERNAL);
  expect(error.details).toEqual({ reason: 'manifest-shape' });
});

it('accepts a bundle exactly at the size limit', (): void => {
  expect(() => checkBundleSize(BUNDLE_SIZE_LIMIT)).not.toThrow();
});

it('refuses a bundle over the size limit and reports the measurement', (): void => {
  const bytes = BUNDLE_SIZE_LIMIT + 1;
  const error = captureError(() => checkBundleSize(bytes));
  expect(error.code).toBe(ERROR_CODES.INTERNAL);
  expect(error.details).toEqual({ reason: 'size-exceeded', bytes, limit: BUNDLE_SIZE_LIMIT });
});
