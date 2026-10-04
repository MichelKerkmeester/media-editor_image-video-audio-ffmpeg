// ───────────────────────────────────────────────────────────────────
// MODULE: Test Pinned
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ERROR_CODES, MediaError } from '../src/core/errors.js';
import { PINNED_BUILDS, executableFileName, platformKeyOf } from '../src/core/pinned-builds.js';
import { extractBinary, fetchArtifact } from './bundle/artifacts.js';
import { assertPackageRoot } from './package-root.js';

import type { PinnedBuild, PinnedComponent, PlatformKey } from '../src/core/pinned-builds.js';
import type { FetchLike } from './bundle/artifacts.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Replacements for the pinned build table and the network. */
export interface PinnedRunDeps {
  /** The pinned build per platform key. */
  readonly builds: Readonly<Record<PlatformKey, PinnedBuild>>;

  /** The transport a missing archive is fetched with; the global fetch by default. */
  readonly fetchImpl?: FetchLike;
}

/** Where one run's pinned binaries were placed. */
export interface PinnedBinaries {
  readonly key: PlatformKey;
  readonly binDir: string;
  readonly version: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** The variable that points the test config at the pinned binaries. */
export const PINNED_BIN_DIR_ENV = 'MEDIA_EDITOR_TEST_BIN_DIR';

const COMPONENTS: readonly PinnedComponent[] = ['ffmpeg', 'ffprobe'];
const VITEST_ENTRY = path.join('node_modules', 'vitest', 'vitest.mjs');
const FAILURE_EXIT_CODE = 1;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function archiveExtension(build: PinnedBuild, component: PinnedComponent): string {
  return build.artifacts[component].archive === 'zip' ? 'zip' : 'gz';
}

function runVitest(root: string, binDir: string, argv: readonly string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, VITEST_ENTRY), 'run', ...argv], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, [PINNED_BIN_DIR_ENV]: binDir },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve(code ?? FAILURE_EXIT_CODE);
    });
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Places the pinned ffmpeg and ffprobe of one platform under `build/pinned/<key>/`.
 *
 * Each archive comes from `build/cache/`, where the bundle build keeps it, or
 * is fetched there when it is missing or its digest is wrong. Each unpacked
 * binary must match its own pinned digest before it is placed.
 *
 * @param root - The package root
 * @param key - The platform whose pinned pair is wanted
 * @param deps - Replacements for the build table and the network
 * @returns The key, the folder holding both binaries and the build's version
 * @throws {@link MediaError} `DOWNLOAD_FAILED` for a fetch or an archive that fails,
 *   and `CHECKSUM_MISMATCH` when an archive or a binary differs from its pin
 */
export async function preparePinnedBinaries(
  root: string,
  key: PlatformKey,
  deps: PinnedRunDeps = { builds: PINNED_BUILDS },
): Promise<PinnedBinaries> {
  const build = deps.builds[key];
  const binDir = path.join(root, 'build', 'pinned', key);
  for (const component of COMPONENTS) {
    const artifact = build.artifacts[component];
    const cacheName = `${key}-${component}.${archiveExtension(build, component)}`;
    const cachePath = path.join(root, 'build', 'cache', cacheName);
    const archive = await fetchArtifact(artifact, cachePath, deps.fetchImpl);
    await extractBinary(archive, artifact, path.join(binDir, executableFileName(component, key)));
  }
  return { key, binDir, version: build.version };
}

/**
 * Runs the whole test suite on the pinned ffmpeg and ffprobe of this machine.
 *
 * @param argv - Arguments passed on to `vitest run`, such as a test path
 * @param root - The folder the run starts from, which must be the package root
 * @returns The vitest exit code, or one when the pinned pair could not be placed
 */
export async function main(
  argv: readonly string[],
  root: string = process.cwd(),
): Promise<number> {
  try {
    assertPackageRoot(root, 'Run the pinned tests from the package root.');
    const key = platformKeyOf(process.platform, process.arch);
    if (key === undefined) {
      const message = 'No pinned ffmpeg build exists for this platform.';
      throw new MediaError(ERROR_CODES.INVALID_INPUT, message, {
        parameter: 'platform',
        value: `${process.platform}-${process.arch}`,
        reason: 'unsupported-platform',
      });
    }
    const pinned = await preparePinnedBinaries(root, key);
    console.log(`Pinned ${pinned.key} ffmpeg ${pinned.version} from ${pinned.binDir}`);
    return await runVitest(root, pinned.binDir, argv);
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      const details = JSON.stringify(error.details);
      console.error(`PINNED RUN FAILED ${error.code}: ${error.message} ${details}`);
      return FAILURE_EXIT_CODE;
    }
    throw error;
  }
}

// The run starts only when this file is the process entry point, so tests can import it.
const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  process.exitCode = await main(process.argv.slice(2));
}
