// ───────────────────────────────────────────────────────────────────
// MODULE: Build Plugin
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ERROR_CODES, MediaError } from '../src/core/errors.js';
import { PLATFORM_KEYS, platformKeyOf } from '../src/core/pinned-builds.js';
import { runStep } from './bundle/artifacts.js';
import { bundleFileName } from './bundle/targets.js';
import { assertPackageRoot } from './package-root.js';

import type { PlatformKey } from '../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One filled plugin folder: the target it serves and what it holds. */
export interface PluginReport {
  /** The platform whose bundle was unpacked into the plugin. */
  readonly key: PlatformKey;
  /** The server version read from the unpacked bundle manifest. */
  readonly serverVersion: string;
  /** How many files the skill copy holds. */
  readonly skillFiles: number;
  /** How many command line shims the bin folder holds. */
  readonly binFiles: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TARGET_FLAG = '--target';

// The POSIX shim resolves its own real path so a symlinked install still finds
// the server folder that sits beside the bin folder.
const CLI_SHIM = `#!/bin/sh
# Runs the Media Editor command line from this plugin's own server folder.
self=$0
while [ -L "$self" ]; do
  link=$(readlink "$self")
  case $link in
    /*) self=$link ;;
    *) self=$(dirname "$self")/$link ;;
  esac
done
here=$(CDPATH= cd -- "$(dirname -- "$self")" && pwd -P)
exec node "$here/../server/dist/cli.js" "$@"
`;

const CLI_SHIM_CMD = '@echo off\r\nnode "%~dp0..\\server\\dist\\cli.js" %*\r\n';

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

function versionOf(json: Record<string, unknown>): string | undefined {
  const version = json['version'];
  return typeof version === 'string' ? version : undefined;
}

function versionMismatch(): MediaError {
  const message = 'The plugin version does not match the package version.';
  return new MediaError(ERROR_CODES.INTERNAL, message, { reason: 'version-mismatch' });
}

function invalidTarget(value: unknown, reason: string, message: string): MediaError {
  const details = { parameter: 'target', value, reason };
  return new MediaError(ERROR_CODES.INVALID_INPUT, message, details);
}

function requireTarget(value: string): PlatformKey {
  const key = PLATFORM_KEYS.find((candidate) => candidate === value);
  if (key === undefined) {
    throw invalidTarget(value, 'unknown-target', `Unknown bundle target: ${value}`);
  }
  return key;
}

function comparePaths(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function hashFile(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function hashLink(absolute: string, relative: string): string {
  const target = statSync(absolute, { throwIfNoEntry: false });
  if (target === undefined || !target.isFile()) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The link does not resolve to a regular file.', {
      reason: 'unresolved-link',
      path: relative,
    });
  }
  return hashFile(absolute);
}

function collectTree(folder: string, prefix: string, digests: Map<string, string>): void {
  for (const name of readdirSync(folder)) {
    const relative = prefix === '' ? name : `${prefix}/${name}`;
    const absolute = path.join(folder, name);
    const stats = lstatSync(absolute);
    if (stats.isFile()) {
      digests.set(relative, hashFile(absolute));
    } else if (stats.isDirectory()) {
      collectTree(absolute, relative, digests);
    } else if (stats.isSymbolicLink()) {
      digests.set(relative, hashLink(absolute, relative));
    } else {
      throw new MediaError(ERROR_CODES.INTERNAL, 'The entry is not a file, folder or link.', {
        reason: 'unsupported-entry',
        path: relative,
      });
    }
  }
}

function findLinks(folder: string, prefix: string): string[] {
  const links: string[] = [];
  for (const name of readdirSync(folder)) {
    const relative = prefix === '' ? name : `${prefix}/${name}`;
    const absolute = path.join(folder, name);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) {
      links.push(relative);
    } else if (stats.isDirectory()) {
      links.push(...findLinks(absolute, relative));
    }
  }
  return links;
}

function writeLinkAsFile(absolute: string, relative: string): void {
  const target = statSync(absolute, { throwIfNoEntry: false });
  if (target === undefined || !target.isFile()) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The link does not resolve to a regular file.', {
      reason: 'unresolved-link',
      path: relative,
    });
  }
  const resolved = realpathSync(absolute);
  rmSync(absolute);
  copyFileSync(resolved, absolute);
}

function resolveLinks(folder: string, prefix: string): void {
  for (const name of readdirSync(folder)) {
    const relative = prefix === '' ? name : `${prefix}/${name}`;
    const absolute = path.join(folder, name);
    const stats = lstatSync(absolute);
    if (stats.isDirectory()) {
      resolveLinks(absolute, relative);
    } else if (stats.isSymbolicLink()) {
      writeLinkAsFile(absolute, relative);
    }
  }
}

function differences(
  source: Map<string, string>,
  copy: Map<string, string>,
  links: readonly string[],
): string[] {
  const differing = new Set<string>(links);
  for (const [relative, digest] of source) {
    if (copy.get(relative) !== digest) {
      differing.add(relative);
    }
  }
  for (const relative of copy.keys()) {
    if (!source.has(relative)) {
      differing.add(relative);
    }
  }
  return [...differing].sort(comparePaths);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Top-level skill folders the plugin does not ship.
 *
 * The feature catalog anchors every claim to `runtime/` source files, which the plugin's
 * `server/` copy does not keep at those paths, so a shipped catalog would only carry links
 * that resolve nowhere.
 */
export const UNSHIPPED_SKILL_FOLDERS: readonly string[] = ['feature-catalog'];

function isUnshipped(relative: string): boolean {
  const top = relative.split('/')[0] ?? '';
  return UNSHIPPED_SKILL_FOLDERS.includes(top);
}

/**
 * Hashes the part of a skill folder the plugin ships.
 *
 * @param folder - The skill folder to hash
 * @returns The digests of {@link hashTree} without the unshipped top-level folders
 */
export function shippedSkillHashes(folder: string): Map<string, string> {
  return new Map([...hashTree(folder)].filter(([relative]) => !isUnshipped(relative)));
}

/**
 * Hashes every file under a folder, resolving links to the bytes they point at.
 *
 * The map key is the file's path relative to the folder with forward slashes and the
 * value is the SHA-256 of its bytes; the map is sorted by path. A link contributes the
 * digest of its target under the link's own relative path.
 *
 * @param folder - The folder to walk
 * @returns The digest of every file the folder holds, keyed by relative path
 * @throws {@link MediaError} `INTERNAL` when a link does not resolve to a regular file,
 *   reported as `unresolved-link`, or an entry is neither a file, a folder nor a link,
 *   reported as `unsupported-entry`
 */
export function hashTree(folder: string): Map<string, string> {
  const digests = new Map<string, string>();
  collectTree(folder, '', digests);
  return new Map([...digests].sort(([left], [right]) => comparePaths(left, right)));
}

/**
 * Replaces a destination folder with a copy of a source folder and reports every difference.
 *
 * The copy resolves links, so the destination holds regular files only, and it leaves out
 * the {@link UNSHIPPED_SKILL_FOLDERS}. A returned path is missing from the copy, extra in the
 * copy, has another digest, or is still a link there; an empty result means the copy holds
 * exactly the shipped part of the source and is link-free.
 *
 * @param source - The folder to copy
 * @param destination - The folder to replace with the copy
 * @returns The relative paths that differ, sorted, or an empty list when the copy matches
 * @throws {@link MediaError} `INTERNAL` when a link does not resolve to a regular file,
 *   reported as `unresolved-link`, or an entry is neither a file, a folder nor a link,
 *   reported as `unsupported-entry`
 */
export function copySkill(source: string, destination: string): string[] {
  rmSync(destination, { recursive: true, force: true });
  cpSync(source, destination, {
    recursive: true,
    dereference: true,
    filter: (entry) => !isUnshipped(path.relative(source, entry).split(path.sep).join('/')),
  });
  // Some releases keep a copied link in place even when the copy asked to dereference it,
  // and the plugin ships regular files only, so the fresh copy is normalized before the check.
  resolveLinks(destination, '');
  return differences(shippedSkillHashes(source), hashTree(destination), findLinks(destination, ''));
}

/**
 * Reads the target platform key from `--target <key>`, or takes the host when it is absent.
 *
 * @param argv - The arguments that follow the script name
 * @param platform - The operating system name the host runs on
 * @param arch - The CPU architecture name the host runs on
 * @returns The platform key to build for
 * @throws {@link MediaError} `INVALID_INPUT` for an unknown key (`unknown-target`), a missing
 *   value (`missing-value`), another argument (`unknown-argument`) or a host pair no bundle
 *   targets (`unsupported-host`)
 */
export function parsePluginArgs(
  argv: readonly string[],
  platform: string,
  arch: string,
): PlatformKey {
  let selected: PlatformKey | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      break;
    }
    if (token !== TARGET_FLAG) {
      throw invalidTarget(token, 'unknown-argument', `Unknown argument: ${token}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw invalidTarget(null, 'missing-value', 'The --target flag needs a value.');
    }
    selected = requireTarget(value);
    index += 1;
  }
  if (selected !== undefined) {
    return selected;
  }
  const host = platformKeyOf(platform, arch);
  if (host === undefined) {
    throw invalidTarget(
      `${platform}-${arch}`,
      'unsupported-host',
      `No bundle targets the host ${platform}-${arch}.`,
    );
  }
  return host;
}

/**
 * Fills the plugin's build folders for one platform and reports what it wrote.
 *
 * The bundle is unpacked into `claude-plugin/server` and the tracked skill is copied into
 * `claude-plugin/skills/sk-media-editor`; both folders are build output and never tracked.
 * The whole `skills` folder is replaced, so a skill folder an earlier build left under
 * another name never ships beside the current one. The `bin` folder is replaced the same
 * way with the command line shims.
 *
 * @param key - The platform whose bundle should be unpacked
 * @param root - The package root that holds the bundle and the plugin folder
 * @returns The platform key, the server version and the file counts of the copy outputs
 * @throws {@link MediaError} `INTERNAL` when the bundle is missing (`bundle-missing`), the
 *   manifest registers an MCP server (`mcp-servers`), the unpacked server holds a link
 *   (`server-link`), a version differs (`version-mismatch`), the server has no cli file
 *   (`server-missing`), the tracked skill is absent (`skill-missing`) or the copy differs
 *   (`skill-mismatch`), and for every failure {@link copySkill} and {@link hashTree} raise
 */
export async function buildPlugin(key: PlatformKey, root: string): Promise<PluginReport> {
  const bundle = path.join(root, 'dist-bundles', bundleFileName(key));
  if (!existsSync(bundle)) {
    throw new MediaError(
      ERROR_CODES.INTERNAL,
      'Build the bundle first with npm run bundle -- --target <key>.',
      { reason: 'bundle-missing', path: bundle },
    );
  }
  const packageVersion = versionOf(readJson(path.join(root, 'package.json')));
  const pluginDir = path.join(root, 'claude-plugin');
  const pluginJsonPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const pluginJson = existsSync(pluginJsonPath) ? readJson(pluginJsonPath) : {};
  if (versionOf(pluginJson) !== packageVersion) {
    throw versionMismatch();
  }
  // The plugin ships the media-editor command in bin/ and registers no MCP server,
  // so a manifest that still carries mcpServers is refused before anything is written.
  if ('mcpServers' in pluginJson) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The plugin manifest registers an MCP server.', {
      reason: 'mcp-servers',
      path: pluginJsonPath,
    });
  }
  const serverDir = path.join(pluginDir, 'server');
  rmSync(serverDir, { recursive: true, force: true });
  mkdirSync(serverDir, { recursive: true });
  await runStep('unzip', ['-q', bundle, '-d', serverDir], { cwd: root });
  const serverLinks = findLinks(serverDir, '');
  if (serverLinks.length > 0) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The unpacked server holds links.', {
      reason: 'server-link',
      paths: serverLinks,
    });
  }
  const serverManifestPath = path.join(serverDir, 'manifest.json');
  if (!existsSync(serverManifestPath)) {
    throw versionMismatch();
  }
  const serverVersion = versionOf(readJson(serverManifestPath));
  if (serverVersion === undefined || serverVersion !== packageVersion) {
    throw versionMismatch();
  }
  if (!existsSync(path.join(serverDir, 'dist', 'cli.js'))) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The unpacked server has no cli file.', {
      reason: 'server-missing',
    });
  }
  const skillSource = path.resolve(root, '..', 'sk-media-editor');
  if (!existsSync(path.join(skillSource, 'SKILL.md'))) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The tracked skill folder was not found.', {
      reason: 'skill-missing',
    });
  }
  const skillsDir = path.join(pluginDir, 'skills');
  rmSync(skillsDir, { recursive: true, force: true });
  const skillDestination = path.join(skillsDir, 'sk-media-editor');
  const differing = copySkill(skillSource, skillDestination);
  if (differing.length > 0) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The copied skill does not match its source.', {
      reason: 'skill-mismatch',
      paths: differing,
    });
  }
  const binDir = path.join(pluginDir, 'bin');
  rmSync(binDir, { recursive: true, force: true });
  mkdirSync(binDir, { recursive: true });
  const shimPath = path.join(binDir, 'media-editor');
  writeFileSync(shimPath, CLI_SHIM);
  if (process.platform !== 'win32') {
    chmodSync(shimPath, 0o755);
  }
  writeFileSync(path.join(binDir, 'media-editor.cmd'), CLI_SHIM_CMD);
  return {
    key,
    serverVersion,
    skillFiles: hashTree(skillDestination).size,
    binFiles: readdirSync(binDir).length,
  };
}

/**
 * Runs the plugin build for one target from the package root.
 *
 * @param argv - The command line arguments after the script name
 * @param root - The folder the build starts from, which must be the package root
 * @returns The process exit code, zero on success and one on failure
 */
export async function main(
  argv: readonly string[],
  root: string = process.cwd(),
): Promise<number> {
  try {
    assertPackageRoot(root, 'Run the plugin build from the package root.');
    const key = parsePluginArgs(argv, process.platform, process.arch);
    const report = await buildPlugin(key, root);
    const summary = `claude-plugin ${report.key} server ${report.serverVersion}`;
    console.log(`${summary} skill ${report.skillFiles} files bin ${report.binFiles} files`);
    return 0;
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      const details = JSON.stringify(error.details);
      console.error(`PLUGIN BUILD FAILED ${error.code}: ${error.message} ${details}`);
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
