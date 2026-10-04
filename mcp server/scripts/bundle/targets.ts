// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Targets
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { PLATFORM_KEYS, executableFileName, platformParts } from '../../src/core/pinned-builds.js';

import type { PinnedComponent, PlatformKey } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The targets one build run should pack. */
export interface BuildArgs {
  /** The requested targets, deduplicated and in the order they appeared. */
  readonly targets: readonly PlatformKey[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** The largest unpacked bundle the extension format allows, in bytes. */
export const BUNDLE_SIZE_LIMIT = 150_000_000;

const TARGET_FLAG = '--target';
const TARGET_VALUE_PREFIX = '--target=';
const ALL_FLAG = '--all';
const LINUX_PLATFORM = 'linux';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function invalidTarget(value: unknown, reason: string, message: string): MediaError {
  const details = { parameter: 'target', value, reason };
  return new MediaError(ERROR_CODES.INVALID_INPUT, message, details);
}

function requireTargetKey(value: string): PlatformKey {
  const key = PLATFORM_KEYS.find((candidate) => candidate === value);
  if (key === undefined) {
    throw invalidTarget(value, 'unknown-target', `Unknown bundle target: ${value}`);
  }
  return key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Reads the bundle targets from a command line.
 *
 * `--all` names every supported target and `--target <key>` or `--target=<key>`
 * names one; a repeated target collapses to its first position.
 *
 * @param argv - The arguments that follow the script name
 * @returns The targets to pack, deduplicated and in first-seen order
 * @throws {@link MediaError} `INVALID_INPUT` for a bad flag or target
 */
export function parseBuildArgs(argv: readonly string[]): BuildArgs {
  const targets: PlatformKey[] = [];
  const add = (key: PlatformKey): void => {
    if (!targets.includes(key)) {
      targets.push(key);
    }
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      break;
    }
    if (token === ALL_FLAG) {
      for (const key of PLATFORM_KEYS) {
        add(key);
      }
    } else if (token.startsWith(TARGET_VALUE_PREFIX)) {
      add(requireTargetKey(token.slice(TARGET_VALUE_PREFIX.length)));
    } else if (token === TARGET_FLAG) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw invalidTarget(null, 'missing-value', 'The --target flag needs a value.');
      }
      add(requireTargetKey(value));
      index += 1;
    } else {
      throw invalidTarget(token, 'unknown-flag', `Unknown argument: ${token}`);
    }
  }
  if (targets.length === 0) {
    throw invalidTarget(null, 'no-target', 'No bundle target was selected.');
  }
  return { targets };
}

/**
 * Builds the npm arguments that install one target's dependencies.
 *
 * `--ignore-scripts` keeps the binary packages from downloading their own
 * builds, and `--libc=glibc` keeps npm from skipping sharp's Linux packages
 * when the install host is not a glibc Linux.
 *
 * @param key - The target npm should resolve packages for
 * @returns The arguments to pass to `npm ci`
 */
export function npmInstallArgs(key: PlatformKey): string[] {
  const { platform, arch } = platformParts(key);
  const args = [
    'ci',
    '--omit=dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    `--os=${platform}`,
    `--cpu=${arch}`,
  ];
  if (platform === LINUX_PLATFORM) {
    args.push('--libc=glibc');
  }
  return args;
}

/**
 * Builds the install environment for one target without changing the caller's.
 *
 * npm reads `npm_config_platform` and `npm_config_arch` for optional
 * dependency variants, so both follow the requested target.
 *
 * @param key - The target npm should resolve packages for
 * @param env - The environment to copy
 * @returns A copy of `env` with both npm platform variables set
 */
export function npmInstallEnv(key: PlatformKey, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const { platform, arch } = platformParts(key);
  return { ...env, npm_config_platform: platform, npm_config_arch: arch };
}

/**
 * Names where the two pinned binaries sit inside a staged bundle.
 *
 * The server resolves both paths relative to its own files at run time, so a
 * bundle only runs when the pinned binaries land here.
 *
 * @param key - The target whose file names apply
 * @returns The slash-separated stage path of each component
 */
export function binaryDestinations(key: PlatformKey): Readonly<Record<PinnedComponent, string>> {
  const { platform, arch } = platformParts(key);
  const probeBinDir = `node_modules/ffprobe-static/bin/${platform}/${arch}`;
  return {
    ffmpeg: `node_modules/ffmpeg-static/${executableFileName('ffmpeg', key)}`,
    ffprobe: `${probeBinDir}/${executableFileName('ffprobe', key)}`,
  };
}

/**
 * Names the extension file one target builds.
 *
 * @param key - The target being packed
 * @returns The file name, with the platform key in it
 */
export function bundleFileName(key: PlatformKey): string {
  return `media-editor-${key}.mcpb`;
}

/**
 * Copies a manifest and limits its compatibility list to one platform.
 *
 * The copy is deep, so the shared source manifest stays unchanged and each
 * target edits only its own compatibility list.
 *
 * @param manifest - The parsed manifest shared by every target
 * @param key - The target whose operating system the copy should allow
 * @returns A new manifest whose compatibility lists only this platform
 * @throws {@link MediaError} `INTERNAL` for a manifest without compatibility
 */
export function targetManifest(
  manifest: Record<string, unknown>,
  key: PlatformKey,
): Record<string, unknown> {
  const copy = structuredClone(manifest);
  const compatibility = copy['compatibility'];
  if (!isRecord(compatibility)) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The manifest has no compatibility object.', {
      reason: 'manifest-shape',
    });
  }
  compatibility['platforms'] = [platformParts(key).platform];
  return copy;
}

/**
 * Refuses a finished bundle that is over the extension size limit.
 *
 * @param bytes - The finished bundle size in bytes
 * @throws {@link MediaError} `INTERNAL` when the size exceeds the limit
 */
export function checkBundleSize(bytes: number): void {
  if (bytes > BUNDLE_SIZE_LIMIT) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The bundle is over the size limit.', {
      reason: 'size-exceeded',
      bytes,
      limit: BUNDLE_SIZE_LIMIT,
    });
  }
}
