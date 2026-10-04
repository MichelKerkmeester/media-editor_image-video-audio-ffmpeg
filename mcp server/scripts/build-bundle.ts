// ───────────────────────────────────────────────────────────────────
// MODULE: Build Bundle
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ERROR_CODES, MediaError } from '../src/core/errors.js';
import { PINNED_BUILDS } from '../src/core/pinned-builds.js';
import { renderSourceNotice } from '../src/core/source-notice.js';
import {
  checkPackedBundle,
  extractBinary,
  fetchArtifact,
  findMissingNatives,
  pruneFfprobeStatic,
  runStep,
  sha256File,
} from './bundle/artifacts.js';
import { checkNotices, listNodeModules } from './bundle/notices.js';
import {
  binaryDestinations,
  bundleFileName,
  checkBundleSize,
  npmInstallArgs,
  npmInstallEnv,
  parseBuildArgs,
  targetManifest,
} from './bundle/targets.js';
import { assertPackageRoot } from './package-root.js';

import type { PinnedComponent, PlatformKey } from '../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One packed desktop bundle: the platform it serves, its file, its size and its digest. */
export interface BuildReport {
  /** The platform this bundle targets. */
  readonly key: PlatformKey;
  /** The absolute path of the packed bundle file. */
  readonly bundlePath: string;
  /** The size of the packed bundle in bytes. */
  readonly bytes: number;
  /** The SHA-256 digest of the packed bundle. */
  readonly sha256: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const COMPONENTS: readonly PinnedComponent[] = ['ffmpeg', 'ffprobe'];
const STAGED_FILES: readonly string[] = [
  'icon.png',
  'LICENSE',
  'THIRD_PARTY_NOTICES',
  'package.json',
  'package-lock.json',
];
const STAGED_FOLDERS: readonly string[] = ['dist', 'assets', 'licenses'];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function readJson(filePath: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'A JSON file is not an object.', {
      reason: 'json-shape',
      path: filePath,
    });
  }
  return parsed as Record<string, unknown>;
}

function authorName(manifest: Record<string, unknown>): string {
  const author = manifest['author'];
  if (typeof author === 'object' && author !== null && 'name' in author) {
    const name: unknown = author.name;
    if (typeof name === 'string') {
      return name;
    }
  }
  throw new MediaError(ERROR_CODES.INTERNAL, 'The manifest names no author.', {
    reason: 'manifest-shape',
  });
}

function stageSources(root: string, stage: string): void {
  const sources = [...STAGED_FOLDERS, ...STAGED_FILES];
  const missing = sources.find((name) => !existsSync(path.join(root, name)));
  if (missing !== undefined) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'A file the bundle needs is missing.', {
      reason: 'missing-source',
      path: missing,
    });
  }
  const buildNotices = path.join(root, 'licenses', 'ffmpeg-builds');
  // Source maps stay out of the bundle, and the per-build licence folder is replaced by the
  // one pair that describes the build this bundle carries.
  const keep = (source: string): boolean =>
    !source.endsWith('.map') && !source.startsWith(buildNotices);
  for (const folder of STAGED_FOLDERS) {
    cpSync(path.join(root, folder), path.join(stage, folder), { recursive: true, filter: keep });
  }
  for (const file of STAGED_FILES) {
    copyFileSync(path.join(root, file), path.join(stage, file));
  }
}

function archiveExtension(key: PlatformKey, component: PinnedComponent): string {
  return PINNED_BUILDS[key].artifacts[component].archive === 'zip' ? 'zip' : 'gz';
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Stages one platform, installs its pinned binaries and packs the desktop bundle.
 *
 * @param key - The platform whose bundle should be built.
 * @param root - The package root that holds the sources to stage.
 * @returns The report of the packed bundle.
 * @throws {@link MediaError} When staging, fetching, the native check, the notices, packing or
 *   the check of the packed file fails.
 */
export async function buildBundle(key: PlatformKey, root: string): Promise<BuildReport> {
  const build = PINNED_BUILDS[key];
  const stage = path.join(root, 'build', 'stage', key);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  stageSources(root, stage);

  const manifest = readJson(path.join(root, 'manifest.json'));
  const packageJson = readJson(path.join(root, 'package.json'));
  if (manifest['version'] !== packageJson['version']) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The manifest and package versions differ.', {
      reason: 'version-mismatch',
      manifest: manifest['version'],
      package: packageJson['version'],
    });
  }
  const staged = `${JSON.stringify(targetManifest(manifest, key), null, 2)}\n`;
  writeFileSync(path.join(stage, 'manifest.json'), staged);

  await runStep('npm', npmInstallArgs(key), { cwd: stage, env: npmInstallEnv(key, process.env) });

  const destinations = binaryDestinations(key);
  for (const component of COMPONENTS) {
    const cachePath = path.join(
      root,
      'build',
      'cache',
      `${key}-${component}.${archiveExtension(key, component)}`,
    );
    const archive = await fetchArtifact(build.artifacts[component], cachePath);
    const destination = path.join(stage, destinations[component]);
    await extractBinary(archive, build.artifacts[component], destination);
  }
  pruneFfprobeStatic(stage, key);
  const missingNatives = findMissingNatives(stage, key);
  if (missingNatives.length > 0) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The install left out a native package.', {
      reason: 'native-missing',
      missing: missingNatives,
    });
  }

  const licences = path.join(stage, 'licenses');
  copyFileSync(
    path.join(root, 'licenses', 'ffmpeg-builds', `${key}-LICENSE.txt`),
    path.join(licences, 'ffmpeg-LICENSE.txt'),
  );
  writeFileSync(path.join(licences, 'ffmpeg-SOURCE.md'), renderSourceNotice(build));
  writeFileSync(path.join(licences, 'node-modules.txt'), listNodeModules(stage).text);

  const problems = await checkNotices(stage, build, authorName(manifest));
  if (problems.length > 0) {
    const message = 'The notices are incomplete, so nothing was packed.';
    throw new MediaError(ERROR_CODES.INTERNAL, message, {
      reason: 'notices-incomplete',
      problems,
    });
  }

  const cli = path.join(root, 'node_modules', '@anthropic-ai', 'mcpb', 'dist', 'cli', 'cli.js');
  await runStep(process.execPath, [cli, 'validate', path.join(stage, 'manifest.json')], {
    cwd: root,
  });
  const bundleFolder = path.join(root, 'dist-bundles');
  mkdirSync(bundleFolder, { recursive: true });
  const bundlePath = path.join(bundleFolder, bundleFileName(key));
  rmSync(bundlePath, { force: true });
  await runStep(process.execPath, [cli, 'pack', stage, bundlePath], { cwd: root });

  const bytes = statSync(bundlePath).size;
  try {
    checkBundleSize(bytes);
  } catch (error: unknown) {
    rmSync(bundlePath, { force: true });
    throw error;
  }
  const workDir = path.join(root, 'build', 'verify', key);
  const packed = await checkPackedBundle(bundlePath, build, destinations, workDir);
  if (packed.length > 0) {
    rmSync(bundlePath, { force: true });
    const message = 'The packed bundle does not match its build, so it was removed.';
    throw new MediaError(ERROR_CODES.INTERNAL, message, {
      reason: 'bundle-mismatch',
      problems: packed,
    });
  }
  return { key, bundlePath, bytes, sha256: await sha256File(bundlePath) };
}

/**
 * Runs the bundle build for the requested targets from the package root.
 *
 * @param argv - The command line arguments after the script name.
 * @param root - The folder the build starts from, which must be the package root.
 * @returns The process exit code, zero on success and one on failure.
 */
export async function main(
  argv: readonly string[],
  root: string = process.cwd(),
): Promise<number> {
  let current = '-';
  try {
    assertPackageRoot(root, 'Run the build from the package root.');
    const { targets } = parseBuildArgs(argv);
    await runStep('npm', ['run', 'build'], { cwd: root });
    for (const key of targets) {
      current = key;
      const report = await buildBundle(key, root);
      const name = path.basename(report.bundlePath);
      console.log(`${name} ${report.bytes} bytes sha256 ${report.sha256}`);
    }
    return 0;
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      const details = JSON.stringify(error.details);
      console.error(`BUILD FAILED ${current} ${error.code}: ${error.message} ${details}`);
      return 1;
    }
    throw error;
  }
}

// The build runs only when this file is the process entry point, so tests can import it.
const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  process.exitCode = await main(process.argv.slice(2));
}
