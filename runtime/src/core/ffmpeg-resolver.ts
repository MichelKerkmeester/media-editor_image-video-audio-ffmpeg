// ───────────────────────────────────────────────────────────────────
// MODULE: FFmpeg Resolver
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import {
  accessSync,
  constants,
  createReadStream,
  readFileSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

import { ERROR_CODES, MediaError } from './errors.js';
import { writeLog } from './logger.js';
import { PINNED_BUILDS, PLATFORM_KEYS } from './pinned-builds.js';
import { runProcess } from './process-runner.js';

import type { ServerConfig } from './config.js';
import type { CachedBinaryResolution, PersistentProbeCache } from './probe-cache.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Which program a lookup is for. */
export type BinaryName = 'ffmpeg' | 'ffprobe';

/** Which step supplied an accepted binary. */
export type BinarySource = 'env-override' | 'bundled' | 'system-path' | 'installed';

/** A binary that passed the checks for its step. */
export interface ResolvedBinary {
  readonly name: BinaryName;
  readonly path: string;
  readonly source: BinarySource;
  readonly version: string;

  /**
   * Earlier candidates that exist but could not run, as `step: path unusable`.
   * Present only when a step was passed over.
   */
  readonly skipped?: readonly string[];
}

/** Why a lookup found nothing a tool can run. */
export interface NotFoundInfo {
  readonly lookedIn: string[];
  readonly envVar: string;
  readonly nextStep: string;
  readonly message: string;
}

/** Either an accepted binary or the steps that were tried. */
export type LookupResult =
  | { readonly found: true; readonly binary: ResolvedBinary }
  | { readonly found: false; readonly info: NotFoundInfo };

/** One file named by an install record. */
export interface InstalledBinary {
  readonly fileName: string;
  readonly sha256: string;
}

/**
 * The install record beside an installed binary.
 * Only the platform and the binary table are read.
 */
export interface InstallRecord {
  readonly platform: string;
  readonly binaries: Partial<Record<BinaryName, InstalledBinary>>;
}

/** Size and modification time for one candidate file. */
export interface BinaryFileInfo {
  readonly isFile: boolean;
  readonly size: number;
  readonly mtimeMs: number;
}

/** Replacements for the filesystem, the packages, and the version probe. */
export interface ResolverDeps {
  readonly platform?: NodeJS.Platform;
  readonly arch?: string;
  readonly pathEnv?: string;
  readonly bundledPath?: (name: BinaryName) => string | null | undefined;
  readonly fileInfo?: (binaryPath: string) => BinaryFileInfo | undefined;
  readonly isExecutable?: (binaryPath: string) => boolean;
  readonly probeVersion?: (
    binaryPath: string,
    name: BinaryName,
  ) => Promise<string | undefined> | string | undefined;
  readonly hashFile?: (binaryPath: string) => Promise<string> | string;
  readonly readInstallRecord?: (recordPath: string) => InstallRecord | undefined;
  readonly pinned?: Readonly<
    Record<string, Readonly<Partial<Record<BinaryName, string>>>>
  >;
}

interface CacheEntry {
  readonly binary: ResolvedBinary;
  readonly size: number;
  readonly mtimeMs: number;
}

interface InflightLookup {
  readonly generation: number;
  readonly promise: Promise<LookupResult>;
}

interface ReadyDeps {
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly pathEnv: string;
  readonly bundledPath: (name: BinaryName) => string | null | undefined;
  readonly fileInfo: (binaryPath: string) => BinaryFileInfo | undefined;
  readonly isExecutable: (binaryPath: string) => boolean;
  readonly probeVersion: (
    binaryPath: string,
    name: BinaryName,
  ) => Promise<string | undefined> | string | undefined;
  readonly hashFile: (binaryPath: string) => Promise<string> | string;
  readonly readInstallRecord: (recordPath: string) => InstallRecord | undefined;
  readonly pinned: Readonly<
    Record<string, Readonly<Partial<Record<BinaryName, string>>>>
  >;
}

type BinaryConfig = Pick<ServerConfig, 'ffmpegPath' | 'ffprobePath' | 'dataDir'>;

type InstallStatus = 'absent' | 'unusable' | 'hash-mismatch' | 'no-pin';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/**
 * SHA-256 pins of the binaries `media_setup_ffmpeg` installs, keyed by platform and architecture.
 * They come from the pinned build table, so the data folder cannot vouch for its own files.
 */
export const PINNED_BINARY_SHA256: Readonly<
  Record<string, Readonly<Partial<Record<BinaryName, string>>>>
> = Object.freeze(
  Object.fromEntries(
    PLATFORM_KEYS.map((key) => {
      const { ffmpeg, ffprobe } = PINNED_BUILDS[key].artifacts;
      return [key, Object.freeze({ ffmpeg: ffmpeg.binarySha256, ffprobe: ffprobe.binarySha256 })];
    }),
  ),
);

const VERSION_PROBE_MS = 10000;
const FFMPEG_ENV_VAR = 'MEDIA_EDITOR_FFMPEG_PATH';
const FFPROBE_ENV_VAR = 'MEDIA_EDITOR_FFPROBE_PATH';
const NOT_ABSOLUTE = 'is not absolute';
const DOES_NOT_EXIST = 'does not exist';
const NOT_A_FILE = 'is not a regular file';
const NOT_EXECUTABLE = 'is not executable';
const NO_VERSION = 'did not answer -version';
const VERSION_PREFIX: Readonly<Record<BinaryName, string>> = {
  ffmpeg: 'ffmpeg version ',
  ffprobe: 'ffprobe version ',
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBinaryEntry(value: unknown): InstalledBinary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.fileName !== 'string' || typeof value.sha256 !== 'string') {
    return undefined;
  }
  return { fileName: value.fileName, sha256: value.sha256 };
}

function parseInstallRecord(value: unknown): InstallRecord | undefined {
  if (!isRecord(value) || typeof value.platform !== 'string') {
    return undefined;
  }
  if (!isRecord(value.binaries)) {
    return undefined;
  }
  const binaries: Partial<Record<BinaryName, InstalledBinary>> = {};
  const names: readonly BinaryName[] = ['ffmpeg', 'ffprobe'];
  for (const name of names) {
    const entry = value.binaries[name];
    if (entry === undefined) {
      continue;
    }
    const parsed = readBinaryEntry(entry);
    if (parsed === undefined) {
      return undefined;
    }
    binaries[name] = parsed;
  }
  return { platform: value.platform, binaries };
}

function defaultReadInstallRecord(recordPath: string): InstallRecord | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(recordPath, 'utf8')) as unknown;
    return parseInstallRecord(parsed);
  } catch {
    return undefined;
  }
}

function defaultFileInfo(binaryPath: string): BinaryFileInfo | undefined {
  try {
    const info = statSync(binaryPath);
    return { isFile: info.isFile(), size: info.size, mtimeMs: info.mtimeMs };
  } catch {
    return undefined;
  }
}

function defaultIsExecutable(binaryPath: string, platform: NodeJS.Platform): boolean {
  // Windows has no executable bit, so a regular file is runnable.
  if (platform === 'win32') {
    const info = defaultFileInfo(binaryPath);
    return info !== undefined && info.isFile;
  }
  try {
    accessSync(binaryPath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function defaultHashFile(binaryPath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(binaryPath);
  try {
    for await (const chunk of stream) {
      hash.update(chunk);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('The file could not be hashed.');
  }
  return hash.digest('hex');
}

function firstLine(text: string): string {
  const splitAt = text.indexOf('\n');
  const line = splitAt === -1 ? text : text.slice(0, splitAt);
  if (line.endsWith('\r')) {
    return line.slice(0, -1);
  }
  return line;
}

function matchingVersion(text: string, name: BinaryName): string | undefined {
  const line = firstLine(text);
  if (!line.startsWith(VERSION_PREFIX[name])) {
    return undefined;
  }
  return line;
}

async function defaultProbeVersion(
  binaryPath: string,
  name: BinaryName,
): Promise<string | undefined> {
  try {
    const result = await runProcess(binaryPath, ['-version'], {
      kind: 'raw',
      timeoutMs: VERSION_PROBE_MS,
      captureStdout: true,
    });
    return matchingVersion(result.stdout, name);
  } catch {
    // ENOEXEC and a bad CPU type are unusable candidates, not lookup failures.
    return undefined;
  }
}

function defaultBundledPath(name: BinaryName): string | null | undefined {
  if (name === 'ffprobe') {
    return ffprobeStatic.path;
  }
  // NodeNext types this default export as the module, while the value is the path.
  const candidate: unknown = ffmpegStatic;
  if (typeof candidate === 'string' || candidate === null) {
    return candidate;
  }
  return undefined;
}

function envVarFor(name: BinaryName): string {
  if (name === 'ffmpeg') {
    return FFMPEG_ENV_VAR;
  }
  return FFPROBE_ENV_VAR;
}

function executableName(name: BinaryName, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    return `${name}.exe`;
  }
  return name;
}

function configuredOverride(name: BinaryName, config: BinaryConfig): string | undefined {
  const raw = name === 'ffmpeg' ? config.ffmpegPath : config.ffprobePath;
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

function usableExport(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value.trim().length === 0) {
    return undefined;
  }
  return value;
}

function searchDirectories(pathEnv: string): string[] {
  const directories: string[] = [];
  for (const entry of pathEnv.split(path.delimiter)) {
    // An empty entry would search the host's working directory.
    if (entry.trim().length === 0) {
      continue;
    }
    directories.push(entry);
  }
  return directories;
}

function systemPathNote(directories: readonly string[]): string {
  if (directories.length === 0) {
    return 'system-path: absent';
  }
  return `system-path: ${directories.join(', ')} absent`;
}

function rejectedOverride(
  name: BinaryName,
  overridePath: string,
  reason: string,
): LookupResult {
  const envVar = envVarFor(name);
  return {
    found: false,
    info: {
      lookedIn: [`env-override: ${overridePath} ${reason}`],
      envVar,
      nextStep: `fix or unset ${envVar}`,
      message: `${envVar} names ${overridePath}, which ${reason}.`,
    },
  };
}

function notFound(name: BinaryName, lookedIn: readonly string[]): LookupResult {
  return {
    found: false,
    info: {
      lookedIn: lookedIn.slice(),
      envVar: envVarFor(name),
      nextStep: 'media_setup_ffmpeg',
      message: `${name} was not found. Run media_setup_ffmpeg to install a bundled build.`,
    },
  };
}

function readyDeps(deps: ResolverDeps | undefined): ReadyDeps {
  const platform = deps?.platform ?? process.platform;
  const arch = deps?.arch ?? process.arch;
  const pathEnv = deps?.pathEnv ?? process.env.PATH ?? '';
  return {
    platform,
    arch,
    pathEnv,
    bundledPath: deps?.bundledPath ?? defaultBundledPath,
    fileInfo: deps?.fileInfo ?? defaultFileInfo,
    isExecutable: deps?.isExecutable
      ?? ((binaryPath: string): boolean => defaultIsExecutable(binaryPath, platform)),
    probeVersion: deps?.probeVersion ?? defaultProbeVersion,
    hashFile: deps?.hashFile ?? defaultHashFile,
    readInstallRecord: deps?.readInstallRecord ?? defaultReadInstallRecord,
    pinned: deps?.pinned ?? PINNED_BINARY_SHA256,
  };
}

function persistentResolutionKey(
  name: BinaryName,
  config: BinaryConfig,
  deps: ReadyDeps,
): string {
  return JSON.stringify({
    name,
    override: configuredOverride(name, config),
    bundled: usableExport(deps.bundledPath(name)),
    pathEnv: deps.pathEnv,
    platform: deps.platform,
    arch: deps.arch,
    dataDir: config.dataDir,
  });
}

async function cachedResolution(
  name: BinaryName,
  config: BinaryConfig,
  deps: ReadyDeps,
  probeCache: PersistentProbeCache,
  resolutionKey: string,
): Promise<CacheEntry | undefined> {
  const persisted = await probeCache.getBinaryResolution(name, resolutionKey);
  if (persisted === undefined) {
    return undefined;
  }
  const info = deps.fileInfo(persisted.path);
  if (
    info === undefined
    || !info.isFile
    || info.size !== persisted.size
    || info.mtimeMs !== persisted.mtimeMs
    || !deps.isExecutable(persisted.path)
  ) {
    return undefined;
  }

  const sourceIsCurrent = (
    persisted.source === 'env-override'
    && configuredOverride(name, config) === persisted.path
  ) || (
    persisted.source === 'bundled'
    && usableExport(deps.bundledPath(name)) === persisted.path
  ) || (
    persisted.source === 'system-path'
    && searchDirectories(deps.pathEnv).some((directory) => (
      path.join(directory, executableName(name, deps.platform)) === persisted.path
    ))
  ) || (
    persisted.source === 'installed'
    && path.join(config.dataDir, 'bin', executableName(name, deps.platform))
      === persisted.path
  );
  if (!sourceIsCurrent) {
    return undefined;
  }

  if (persisted.source === 'installed') {
    const checked = await acceptInstalled(
      name,
      persisted.path,
      config,
      deps,
      persisted.version,
    );
    if (typeof checked === 'string') {
      return undefined;
    }
  }

  const binary = {
    name,
    path: persisted.path,
    source: persisted.source,
    version: persisted.version,
    ...(persisted.skipped === undefined ? {} : { skipped: [...persisted.skipped] }),
  } satisfies ResolvedBinary;
  return { binary, size: persisted.size, mtimeMs: persisted.mtimeMs };
}

async function versionOf(
  deps: ReadyDeps,
  binaryPath: string,
  name: BinaryName,
): Promise<string | undefined> {
  try {
    const raw = await deps.probeVersion(binaryPath, name);
    if (typeof raw !== 'string') {
      return undefined;
    }
    return matchingVersion(raw, name);
  } catch {
    return undefined;
  }
}

function copyBinary(binary: ResolvedBinary): ResolvedBinary {
  const copy: ResolvedBinary = {
    name: binary.name,
    path: binary.path,
    source: binary.source,
    version: binary.version,
  };
  if (binary.skipped === undefined) {
    return copy;
  }
  return { ...copy, skipped: [...binary.skipped] };
}

function withSkipped(entry: CacheEntry, skipped: readonly string[]): CacheEntry {
  if (skipped.length === 0) {
    return entry;
  }
  return { ...entry, binary: { ...entry.binary, skipped: [...skipped] } };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

let cacheGeneration = 0;
const cache = new Map<BinaryName, CacheEntry>();
const cacheStamps = new Map<BinaryName, number>();
const inflight = new Map<BinaryName, InflightLookup>();

function stampOf(name: BinaryName): number {
  return cacheStamps.get(name) ?? 0;
}

function remember(
  name: BinaryName,
  entry: CacheEntry,
  generation: number,
  stamp: number,
): void {
  if (generation !== cacheGeneration || stamp !== stampOf(name)) {
    return;
  }
  cache.set(name, entry);
}

function readCache(
  name: BinaryName,
  fileInfo: ReadyDeps['fileInfo'],
): ResolvedBinary | undefined {
  const entry = cache.get(name);
  if (entry === undefined) {
    return undefined;
  }
  const info = fileInfo(entry.binary.path);
  const changed = info === undefined
    || !info.isFile
    || info.size !== entry.size
    || info.mtimeMs !== entry.mtimeMs;
  if (changed) {
    cache.delete(name);
    return undefined;
  }
  return copyBinary(entry.binary);
}

async function inspectOverride(
  name: BinaryName,
  overridePath: string,
  deps: ReadyDeps,
): Promise<CacheEntry | string> {
  if (!path.isAbsolute(overridePath)) {
    return NOT_ABSOLUTE;
  }
  const info = deps.fileInfo(overridePath);
  if (info === undefined) {
    return DOES_NOT_EXIST;
  }
  if (!info.isFile) {
    return NOT_A_FILE;
  }
  if (!deps.isExecutable(overridePath)) {
    return NOT_EXECUTABLE;
  }
  const version = await versionOf(deps, overridePath, name);
  if (version === undefined) {
    return NO_VERSION;
  }
  return {
    binary: { name, path: overridePath, source: 'env-override', version },
    size: info.size,
    mtimeMs: info.mtimeMs,
  };
}

async function acceptRunnable(
  name: BinaryName,
  binaryPath: string,
  source: 'bundled' | 'system-path',
  deps: ReadyDeps,
): Promise<CacheEntry | 'absent' | 'unusable'> {
  const info = deps.fileInfo(binaryPath);
  if (info === undefined || !info.isFile) {
    return 'absent';
  }
  if (!deps.isExecutable(binaryPath)) {
    return 'unusable';
  }
  const version = await versionOf(deps, binaryPath, name);
  if (version === undefined) {
    return 'unusable';
  }
  return {
    binary: { name, path: binaryPath, source, version },
    size: info.size,
    mtimeMs: info.mtimeMs,
  };
}

async function hashOf(deps: ReadyDeps, binaryPath: string): Promise<string | undefined> {
  try {
    const digest = await deps.hashFile(binaryPath);
    if (typeof digest !== 'string' || digest.length === 0) {
      return undefined;
    }
    return digest;
  } catch {
    return undefined;
  }
}

async function acceptInstalled(
  name: BinaryName,
  binaryPath: string,
  config: BinaryConfig,
  deps: ReadyDeps,
  versionHint?: string,
): Promise<CacheEntry | InstallStatus> {
  const info = deps.fileInfo(binaryPath);
  if (info === undefined || !info.isFile) {
    return 'absent';
  }
  if (!deps.isExecutable(binaryPath)) {
    return 'unusable';
  }
  const pin = deps.pinned[`${deps.platform}-${deps.arch}`]?.[name];
  if (pin === undefined || pin.length === 0) {
    return 'no-pin';
  }
  const recordPath = path.join(config.dataDir, 'bin', 'install.json');
  const recorded = deps.readInstallRecord(recordPath)?.binaries[name]?.sha256;
  // The digest is checked before -version so a replaced install is never started.
  const digest = await hashOf(deps, binaryPath);
  if (digest === undefined || recorded === undefined || digest !== recorded || digest !== pin) {
    return 'hash-mismatch';
  }
  const version = versionHint ?? await versionOf(deps, binaryPath, name);
  if (version === undefined) {
    return 'unusable';
  }
  return {
    binary: { name, path: binaryPath, source: 'installed', version },
    size: info.size,
    mtimeMs: info.mtimeMs,
  };
}

async function runLookup(
  name: BinaryName,
  config: BinaryConfig,
  deps: ReadyDeps,
  generation: number,
  stamp: number,
): Promise<LookupResult> {
  const override = configuredOverride(name, config);
  if (override !== undefined) {
    // The user named this file, so a different binary would hide the mistake.
    const inspected = await inspectOverride(name, override, deps);
    if (typeof inspected === 'string') {
      return rejectedOverride(name, override, inspected);
    }
    remember(name, inspected, generation, stamp);
    return { found: true, binary: copyBinary(inspected.binary) };
  }

  const lookedIn: string[] = ['env-override: unset'];
  const skipped: string[] = [];
  const exported = usableExport(deps.bundledPath(name));
  if (exported === undefined) {
    lookedIn.push('bundled: no path exported');
  } else {
    const accepted = await acceptRunnable(name, exported, 'bundled', deps);
    if (typeof accepted !== 'string') {
      remember(name, accepted, generation, stamp);
      return { found: true, binary: copyBinary(accepted.binary) };
    }
    lookedIn.push(`bundled: ${exported} ${accepted}`);
    if (accepted === 'unusable') {
      skipped.push(`bundled: ${exported} ${accepted}`);
    }
  }

  const directories = searchDirectories(deps.pathEnv);
  const fileName = executableName(name, deps.platform);
  const absentDirectories: string[] = [];
  const unusableOnPath: string[] = [];
  for (const directory of directories) {
    const candidate = path.join(directory, fileName);
    const accepted = await acceptRunnable(name, candidate, 'system-path', deps);
    if (typeof accepted !== 'string') {
      const withNotes = withSkipped(accepted, skipped);
      remember(name, withNotes, generation, stamp);
      return { found: true, binary: copyBinary(withNotes.binary) };
    }
    if (accepted === 'absent') {
      absentDirectories.push(directory);
    } else {
      unusableOnPath.push(`system-path: ${candidate} ${accepted}`);
      skipped.push(`system-path: ${candidate} ${accepted}`);
    }
  }
  if (directories.length === 0 || absentDirectories.length > 0) {
    lookedIn.push(systemPathNote(absentDirectories));
  }
  lookedIn.push(...unusableOnPath);

  const installed = path.join(config.dataDir, 'bin', fileName);
  const installedResult = await acceptInstalled(name, installed, config, deps);
  if (typeof installedResult !== 'string') {
    const withNotes = withSkipped(installedResult, skipped);
    remember(name, withNotes, generation, stamp);
    return { found: true, binary: copyBinary(withNotes.binary) };
  }
  lookedIn.push(`installed: ${installed} ${installedResult}`);
  // A miss stays uncached so a later install resolves in this same process.
  return notFound(name, lookedIn);
}

/**
 * Find ffmpeg or ffprobe without throwing when none is usable.
 *
 * @param name - Which binary to find
 * @param config - Override paths and the data folder
 * @param deps - Replacements for the real filesystem and processes
 * @returns The accepted binary, or the steps that were tried
 */
export async function lookupBinary(
  name: BinaryName,
  config: Pick<ServerConfig, 'ffmpegPath' | 'ffprobePath' | 'dataDir'>,
  deps?: ResolverDeps,
  probeCache?: PersistentProbeCache,
): Promise<LookupResult> {
  const ready = readyDeps(deps);
  const cached = readCache(name, ready.fileInfo);
  if (cached !== undefined) {
    return { found: true, binary: cached };
  }

  const resolutionKey = probeCache === undefined
    ? undefined
    : persistentResolutionKey(name, config, ready);
  if (probeCache !== undefined && resolutionKey !== undefined) {
    const persisted = await cachedResolution(
      name,
      config,
      ready,
      probeCache,
      resolutionKey,
    );
    if (persisted !== undefined) {
      remember(name, persisted, cacheGeneration, stampOf(name));
      return { found: true, binary: copyBinary(persisted.binary) };
    }
  }

  const generation = cacheGeneration;
  const existing = inflight.get(name);
  if (existing !== undefined && existing.generation === generation) {
    return existing.promise;
  }

  const stamp = stampOf(name);
  const holder: { promise?: Promise<LookupResult> } = {};
  const promise = runLookup(name, config, ready, generation, stamp).finally(() => {
    const current = inflight.get(name);
    if (current?.promise === holder.promise) {
      inflight.delete(name);
    }
  });
  holder.promise = promise;
  inflight.set(name, { generation, promise });
  const result = await promise;
  if (result.found && probeCache !== undefined && resolutionKey !== undefined) {
    const info = ready.fileInfo(result.binary.path);
    if (info !== undefined && info.isFile) {
      const record: CachedBinaryResolution = {
        name: result.binary.name,
        path: result.binary.path,
        source: result.binary.source,
        version: result.binary.version,
        size: info.size,
        mtimeMs: info.mtimeMs,
        resolutionKey,
        ...(result.binary.skipped === undefined
          ? {}
          : { skipped: [...result.binary.skipped] }),
      };
      try {
        await probeCache.setBinaryResolution(record);
      } catch {
        writeLog('warn', 'warn', 'Could not save the binary resolution cache.');
      }
    }
  }
  return result;
}

/**
 * Find ffmpeg or ffprobe, or throw when none is usable.
 *
 * @param name - Which binary to find
 * @param config - Override paths and the data folder
 * @param deps - Replacements for the real filesystem and processes
 * @returns The accepted binary
 * @throws {@link MediaError} `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND`
 */
export async function resolveBinary(
  name: BinaryName,
  config: Pick<ServerConfig, 'ffmpegPath' | 'ffprobePath' | 'dataDir'>,
  deps?: ResolverDeps,
  probeCache?: PersistentProbeCache,
): Promise<ResolvedBinary> {
  const result = await lookupBinary(name, config, deps, probeCache);
  if (result.found) {
    return result.binary;
  }
  const code = name === 'ffmpeg'
    ? ERROR_CODES.FFMPEG_NOT_FOUND
    : ERROR_CODES.FFPROBE_NOT_FOUND;
  throw new MediaError(code, result.info.message, {
    lookedIn: result.info.lookedIn.slice(),
    envVar: result.info.envVar,
    nextStep: result.info.nextStep,
  });
}

/**
 * Drop one cached binary so the next lookup starts at the override.
 *
 * @param name - Which cache entry to drop
 */
export function invalidateBinary(name: BinaryName): void {
  cache.delete(name);
  cacheStamps.set(name, stampOf(name) + 1);
}

/**
 * Drop every cached binary and any lookup still in flight.
 */
export function resetResolverCache(): void {
  cacheGeneration += 1;
  cache.clear();
  cacheStamps.clear();
  inflight.clear();
}
