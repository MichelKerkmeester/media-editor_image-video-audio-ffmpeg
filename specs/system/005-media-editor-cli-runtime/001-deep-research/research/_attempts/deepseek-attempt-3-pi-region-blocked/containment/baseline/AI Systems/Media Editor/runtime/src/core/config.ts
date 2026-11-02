// ───────────────────────────────────────────────────────────────────
// MODULE: Server Config
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

/** How much the server writes to stderr. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Settings that took effect after defaults and rejected values. */
export interface ServerConfig {
  /** Canonical real paths of the roots that survived. */
  readonly allowedRoots: readonly string[];

  /** Effective output folder. Undefined when nothing absolute was set and no root remains. */
  readonly outputDir: string | undefined;

  /** Trimmed ffmpeg override. Undefined when unset or blank. */
  readonly ffmpegPath: string | undefined;

  /** Trimmed ffprobe override. Undefined when unset or blank. */
  readonly ffprobePath: string | undefined;

  /** Per-run process limit in seconds. */
  readonly timeoutSeconds: number;

  /** Data folder, either the accepted absolute path or the platform default. */
  readonly dataDir: string;

  /** Effective stderr level. */
  readonly logLevel: LogLevel;
}

/** Platform and home used only to build the default data folder. */
export interface LoadConfigOptions {
  readonly platform?: NodeJS.Platform;
  readonly homeDir?: string;
}

/** Loaded settings plus the warn lines the caller writes to stderr. */
export interface LoadedConfig {
  readonly config: ServerConfig;
  readonly warnings: readonly string[];
}

interface RootCandidate {
  readonly entry: string;
  readonly sourceName: string;
}

type OutputArg =
  | { readonly kind: 'absent' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'value'; readonly value: string };

interface ParsedArguments {
  readonly allowedDirs: readonly RootCandidate[];
  readonly outputArg: OutputArg;
  readonly warnings: readonly string[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_SECONDS = 1800;
const MIN_TIMEOUT_SECONDS = 1;
const MAX_TIMEOUT_SECONDS = 86400;
const TIMEOUT_PATTERN = /^[0-9]+$/;
const DATA_FOLDER_NAME = 'media-editor';
const ENV_PREFIX = 'MEDIA_EDITOR_';
const ALLOWED_DIR_ARG = '--allowed-dir';
const FOLDER_ARG = 'a folder argument';
const OUTPUT_DIR_ARG = '--output-dir';
const ALLOWED_DIRS_ENV = 'MEDIA_EDITOR_ALLOWED_DIRS';
const OUTPUT_DIR_ENV = 'MEDIA_EDITOR_OUTPUT_DIR';
const FFMPEG_PATH_ENV = 'MEDIA_EDITOR_FFMPEG_PATH';
const FFPROBE_PATH_ENV = 'MEDIA_EDITOR_FFPROBE_PATH';
const TIMEOUT_ENV = 'MEDIA_EDITOR_TIMEOUT_SECONDS';
const DATA_DIR_ENV = 'MEDIA_EDITOR_DATA_DIR';
const LOG_LEVEL_ENV = 'MEDIA_EDITOR_LOG_LEVEL';

const KNOWN_ENV_NAMES: ReadonlySet<string> = new Set([
  ALLOWED_DIRS_ENV,
  OUTPUT_DIR_ENV,
  FFMPEG_PATH_ENV,
  FFPROBE_PATH_ENV,
  TIMEOUT_ENV,
  DATA_DIR_ENV,
  LOG_LEVEL_ENV,
]);

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function ignoredValue(name: string): string {
  return `Ignoring ${name} because its value cannot be used.`;
}

function isLogLevel(value: string): value is LogLevel {
  for (const level of LOG_LEVELS) {
    if (level === value) {
      return true;
    }
  }
  return false;
}

function splitTrimmed(raw: string): string[] {
  const entries: string[] = [];
  for (const part of raw.split(path.delimiter)) {
    const trimmed = part.trim();
    if (trimmed.length > 0) {
      entries.push(trimmed);
    }
  }
  return entries;
}

function unknownVariableNames(env: NodeJS.ProcessEnv): string[] {
  const names: string[] = [];
  for (const key of Object.keys(env)) {
    if (key.startsWith(ENV_PREFIX) && !KNOWN_ENV_NAMES.has(key)) {
      names.push(key);
    }
  }
  names.sort();
  return names;
}

function argumentParts(token: string): { name: string; inlineValue: string | undefined } {
  const equalsAt = token.indexOf('=');
  if (equalsAt === -1) {
    return { name: token, inlineValue: undefined };
  }
  return {
    name: token.slice(0, equalsAt),
    inlineValue: token.slice(equalsAt + 1),
  };
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  const allowedDirs: RootCandidate[] = [];
  const warnings: string[] = [];
  let outputArg: OutputArg = { kind: 'absent' };
  let index = 0;

  while (index < argv.length) {
    const token = argv[index];
    if (token === undefined) {
      index += 1;
      continue;
    }
    // A bundle host expands a folder list into one bare argument per folder.
    if (!token.startsWith('--')) {
      const trimmed = token.trim();
      if (trimmed.length > 0) {
        allowedDirs.push({ entry: trimmed, sourceName: FOLDER_ARG });
      }
      index += 1;
      continue;
    }

    const parts = argumentParts(token);
    const isKnown = parts.name === ALLOWED_DIR_ARG || parts.name === OUTPUT_DIR_ARG;
    if (!isKnown) {
      warnings.push(`Ignoring unknown argument ${parts.name}.`);
      // A mistyped flag takes its value along, so its path never becomes a root.
      const next = argv[index + 1];
      const takesValue = parts.inlineValue === undefined
        && next !== undefined
        && !next.startsWith('--');
      index += takesValue ? 2 : 1;
      continue;
    }

    let raw: string | undefined;
    if (parts.inlineValue !== undefined) {
      raw = parts.inlineValue;
      index += 1;
    } else {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith('--')) {
        warnings.push(`Ignoring ${parts.name} because it has no value.`);
        if (parts.name === OUTPUT_DIR_ARG) {
          outputArg = { kind: 'missing' };
        }
        index += 1;
        continue;
      }
      raw = next;
      index += 2;
    }

    const trimmed = raw.trim();
    if (parts.name === ALLOWED_DIR_ARG) {
      if (trimmed.length > 0) {
        allowedDirs.push({ entry: trimmed, sourceName: ALLOWED_DIR_ARG });
      }
      continue;
    }
    outputArg = { kind: 'value', value: trimmed };
  }

  return { allowedDirs, outputArg, warnings };
}

/**
 * Real path of a directory entry, or undefined when the entry cannot be a root.
 * Callers warn; a duplicate of a path already kept is not a failure.
 */
function canonicalRoot(entry: string): string | undefined {
  if (!path.isAbsolute(entry)) {
    return undefined;
  }
  try {
    const realPath = realpathSync.native(entry);
    if (statSync(realPath).isFile()) {
      return undefined;
    }
    return realPath;
  } catch {
    return undefined;
  }
}

function collectRoots(candidates: readonly RootCandidate[], warnings: string[]): string[] {
  const roots: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const realPath = canonicalRoot(candidate.entry);
    if (realPath === undefined) {
      warnings.push(ignoredValue(candidate.sourceName));
      continue;
    }
    // NFC folds two spellings of one folder. The stored path stays the first real spelling.
    const key = realPath.normalize('NFC');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    roots.push(realPath);
  }
  return roots;
}

function readOutputDir(
  outputArg: OutputArg,
  envValue: string | undefined,
  firstRoot: string | undefined,
  warnings: string[],
): string | undefined {
  if (outputArg.kind === 'value') {
    // A folder that does not exist yet is still legal, so this path is kept as written.
    if (path.isAbsolute(outputArg.value)) {
      return outputArg.value;
    }
    warnings.push(ignoredValue(OUTPUT_DIR_ARG));
  }

  if (envValue !== undefined) {
    const trimmed = envValue.trim();
    if (path.isAbsolute(trimmed)) {
      return trimmed;
    }
    warnings.push(ignoredValue(OUTPUT_DIR_ENV));
  }

  return firstRoot;
}

function readTimeout(raw: string | undefined, warnings: string[]): number {
  if (raw === undefined) {
    return DEFAULT_TIMEOUT_SECONDS;
  }
  const trimmed = raw.trim();
  if (!TIMEOUT_PATTERN.test(trimmed)) {
    warnings.push(ignoredValue(TIMEOUT_ENV));
    return DEFAULT_TIMEOUT_SECONDS;
  }
  const parsed = Number(trimmed);
  const isInRange = Number.isSafeInteger(parsed)
    && parsed >= MIN_TIMEOUT_SECONDS
    && parsed <= MAX_TIMEOUT_SECONDS;
  if (!isInRange) {
    warnings.push(ignoredValue(TIMEOUT_ENV));
    return DEFAULT_TIMEOUT_SECONDS;
  }
  return parsed;
}

function readLogLevel(raw: string | undefined, warnings: string[]): LogLevel {
  if (raw === undefined) {
    return 'info';
  }
  if (isLogLevel(raw)) {
    return raw;
  }
  warnings.push(ignoredValue(LOG_LEVEL_ENV));
  return 'info';
}

function isExistingFile(candidate: string): boolean {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function readDataDir(
  raw: string | undefined,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  home: string,
  warnings: string[],
): string {
  const fallback = defaultDataDir(platform, env, home);
  if (raw === undefined) {
    return fallback;
  }
  const trimmed = raw.trim();
  if (!path.isAbsolute(trimmed) || isExistingFile(trimmed)) {
    warnings.push(ignoredValue(DATA_DIR_ENV));
    return fallback;
  }
  return trimmed;
}

function readBinaryOverride(raw: string | undefined): string | undefined {
  // Blank counts as unset. Every other check belongs to the resolver.
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

function blankAsUnset(raw: string | undefined): string {
  return raw?.trim() ?? '';
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Default data folder for a platform.
 *
 * Windows uses `APPDATA` when that variable is non-blank, otherwise the home
 * roaming folder. Linux uses `XDG_DATA_HOME` when it is set and absolute,
 * otherwise the home share folder. Any other platform uses the Linux rule.
 *
 * @param platform - Operating system the default is built for
 * @param env - Environment that may hold `APPDATA` or `XDG_DATA_HOME`
 * @param homeDir - Home directory used when the platform variable does not apply
 * @returns Absolute or joined data-folder path for that platform
 */
export function defaultDataDir(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  homeDir: string,
): string {
  if (platform === 'win32') {
    const appData = blankAsUnset(env.APPDATA);
    if (appData.length > 0) {
      return path.win32.join(appData, DATA_FOLDER_NAME);
    }
    return path.win32.join(homeDir, 'AppData', 'Roaming', DATA_FOLDER_NAME);
  }

  if (platform === 'darwin') {
    return path.posix.join(homeDir, 'Library', 'Application Support', DATA_FOLDER_NAME);
  }

  const xdgHome = env.XDG_DATA_HOME;
  if (xdgHome !== undefined && path.posix.isAbsolute(xdgHome)) {
    return path.posix.join(xdgHome, DATA_FOLDER_NAME);
  }
  return path.posix.join(homeDir, '.local', 'share', DATA_FOLDER_NAME);
}

/**
 * Read server settings from an environment and an argument list.
 *
 * A value that cannot be used is ignored. Warnings name the setting or the
 * argument, never the value. This function writes nothing itself.
 *
 * @param env - Environment to read
 * @param argv - Arguments in `--name value` or `--name=value` form, plus bare folder paths
 * @param options - Platform and home used only for the default data folder
 * @returns The settings that took effect, plus warn lines for the caller
 */
export function loadConfig(
  env: NodeJS.ProcessEnv,
  argv: readonly string[],
  options?: LoadConfigOptions,
): LoadedConfig {
  const platform = options?.platform ?? process.platform;
  const home = options?.homeDir ?? homedir();
  const warnings: string[] = [];
  const parsed = parseArguments(argv);
  warnings.push(...parsed.warnings);

  const unknownNames = unknownVariableNames(env);
  if (unknownNames.length > 0) {
    warnings.push(`Ignoring unknown variables ${unknownNames.join(', ')}.`);
  }

  const candidates: RootCandidate[] = [...parsed.allowedDirs];
  const envRoots = env[ALLOWED_DIRS_ENV];
  if (envRoots !== undefined) {
    for (const entry of splitTrimmed(envRoots)) {
      candidates.push({ entry, sourceName: ALLOWED_DIRS_ENV });
    }
  }
  const allowedRoots = collectRoots(candidates, warnings);
  const outputDir = readOutputDir(
    parsed.outputArg,
    env[OUTPUT_DIR_ENV],
    allowedRoots[0],
    warnings,
  );

  const config: ServerConfig = {
    allowedRoots,
    outputDir,
    ffmpegPath: readBinaryOverride(env[FFMPEG_PATH_ENV]),
    ffprobePath: readBinaryOverride(env[FFPROBE_PATH_ENV]),
    timeoutSeconds: readTimeout(env[TIMEOUT_ENV], warnings),
    dataDir: readDataDir(env[DATA_DIR_ENV], platform, env, home, warnings),
    logLevel: readLogLevel(env[LOG_LEVEL_ENV], warnings),
  };

  return { config, warnings };
}
