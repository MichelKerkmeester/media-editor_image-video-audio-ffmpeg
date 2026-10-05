// ───────────────────────────────────────────────────────────────────
// MODULE: Process Runner
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';
import { lstatSync, mkdtempSync, rmSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ERROR_CODES, MediaError, nodeErrorCode } from './errors.js';
import { verifyUnchanged } from './path-guard.js';

import type { ResolvedInput } from './path-guard.js';
import type { ChildProcess } from 'node:child_process';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Which program the runner is launching. `raw` adds no flags of its own. */
export type BinaryKind = 'ffmpeg' | 'ffprobe' | 'raw';

/**
 * Inputs re-checked immediately before a spawn.
 */
export interface ProcessGuard {
  /** Accepted inputs, opened only at `realPath`. */
  readonly inputs: readonly ResolvedInput[];

  /** Canonical allowed roots for the re-check. */
  readonly roots: readonly string[];
}

/**
 * Options for one child process.
 */
export interface RunOptions {
  /** Which flag set and binary label to use. */
  readonly kind: BinaryKind;

  /** Milliseconds from spawn until the process is asked to stop. */
  readonly timeoutMs: number;

  /** Milliseconds between the termination signal and SIGKILL. Defaults to 5000. */
  readonly killGraceMs?: number;

  /** When true, stdout is collected. Otherwise it is discarded. */
  readonly captureStdout?: boolean;

  /** Working directory for the child. Unset for every tool except the ladder. */
  readonly cwd?: string;

  /** Files the child is expected to create. Checked before and after the run. */
  readonly outputs?: readonly string[];

  /** Folders removed after a failed run. Left in place after success. */
  readonly cleanupFolders?: readonly string[];

  /** Temp-folder path replaced with `<tmp>` in the stderr tail. */
  readonly tempDir?: string;

  /** When set, inputs are re-checked and sniffed before the spawn. */
  readonly guard?: ProcessGuard;

  /** Environment to filter. Defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * A finished child that exited zero and left every planned output in place.
 */
export interface ProcessResult {
  /** Exit status. Zero for a result and failures throw instead. */
  readonly exitCode: number;

  /** Signal that ended the process, or null when it exited on its own. */
  readonly signal: NodeJS.Signals | null;

  /** Captured stdout, or an empty string when stdout was discarded. */
  readonly stdout: string;

  /** Last 64 KB of stderr, decoded as UTF-8. */
  readonly stderr: string;

  /** Sanitized last 4 KB of that stderr buffer. */
  readonly stderrTail: string;

  /** Milliseconds from spawn until the process exited. */
  readonly elapsedMs: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Most children the runner will have started at once. Further calls wait. */
export const MAX_CONCURRENT_PROCESSES = 2;

const DEFAULT_KILL_GRACE_MS = 5000;
const SIGNAL_KILL_GRACE_MS = 500;
const STDERR_CAP_BYTES = 64 * 1024;
const STDERR_TAIL_BYTES = 4 * 1024;
const SNIFF_BYTES = 512;
const TEMP_PREFIX = 'media-editor-';
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const DIGITS_ONLY = /^\d+$/;
const SUBRIP_TIME =
  /^\d{2}:\d{2}:\d{2}[,.]\d{3} --> \d{2}:\d{2}:\d{2}[,.]\d{3}/;
const ANSI_ESCAPE =
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;
const CONTROL_CHARACTER =
  /[\u0000-\u0008\u000B\u000C\u000D-\u001F\u007F-\u009F]/g;

const CHILD_ENV_NAMES = [
  'PATH',
  'HOME',
  'USERPROFILE',
  'TMPDIR',
  'TEMP',
  'TMP',
  'SystemRoot',
  'APPDATA',
  'LOCALAPPDATA',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'FONTCONFIG_PATH',
  'FONTCONFIG_FILE',
] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

let activeProcesses = 0;
const slotWaiters: Array<{
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
}> = [];
const liveChildren = new Map<ChildProcess, Promise<void>>();
const liveCleanupPaths = new Map<string, number>();
let terminationStarted = false;
let terminationPromise: Promise<void> | undefined;

/**
 * One queue for every spawn, so a burst cannot start more than two children.
 */
function acquireSlot(): Promise<void> {
  if (terminationStarted) {
    return Promise.reject(new Error('The process runner is shutting down.'));
  }
  if (activeProcesses < MAX_CONCURRENT_PROCESSES) {
    activeProcesses += 1;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    slotWaiters.push({
      resolve: () => {
        activeProcesses += 1;
        resolve();
      },
      reject,
    });
  });
}

function releaseSlot(): void {
  activeProcesses -= 1;
  const next = slotWaiters.shift();
  if (next !== undefined && !terminationStarted) {
    next.resolve();
  } else if (next !== undefined) {
    next.reject(new Error('The process runner is shutting down.'));
  }
}

function binaryLabel(binary: string, kind: BinaryKind): string {
  if (kind === 'raw') {
    return path.parse(binary).name;
  }
  return kind;
}

function isEnoent(error: unknown): boolean {
  return nodeErrorCode(error) === 'ENOENT';
}

function isOutputExists(error: unknown): boolean {
  return error instanceof MediaError && error.code === ERROR_CODES.OUTPUT_EXISTS;
}

function pathExists(target: string): boolean {
  try {
    lstatSync(target);
    return true;
  } catch (error: unknown) {
    if (isEnoent(error)) {
      return false;
    }
    throw error;
  }
}

function isCompleteFile(target: string): boolean {
  try {
    const info = lstatSync(target);
    return info.isFile() && info.size > 0;
  } catch (error: unknown) {
    if (isEnoent(error)) {
      return false;
    }
    throw error;
  }
}

function insertFileWhitelist(args: readonly string[]): string[] {
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      continue;
    }
    if (token === '-i') {
      const previous = index > 0 ? args[index - 1] : undefined;
      const beforePrevious = index > 1 ? args[index - 2] : undefined;
      const hasPair = beforePrevious === '-protocol_whitelist' && previous === 'file';
      if (!hasPair) {
        result.push('-protocol_whitelist', 'file');
      }
    }
    result.push(token);
  }
  return result;
}

function asBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }
  if (typeof chunk === 'string') {
    return Buffer.from(chunk);
  }
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk);
  }
  return Buffer.alloc(0);
}

function appendCapped(current: Buffer, chunk: Buffer, maxBytes: number): Buffer {
  if (chunk.length >= maxBytes) {
    return tailBytes(chunk, maxBytes);
  }
  if (current.length + chunk.length <= maxBytes) {
    return Buffer.concat([current, chunk]);
  }
  return tailBytes(Buffer.concat([current, chunk]), maxBytes);
}

function withoutBom(bytes: Buffer): Buffer {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(UTF8_BOM)) {
    return bytes.subarray(3);
  }
  return bytes;
}

function sniffText(bytes: Buffer): string {
  return withoutBom(bytes).toString('utf8').replace(/^\s+/, '');
}

function isIndirectionContainer(text: string): boolean {
  const first = text.charAt(0);
  if (first === '#' || first === '<' || first === '[') {
    return true;
  }
  return text.startsWith('ffconcat') || text.startsWith('v=0');
}

function isSubRip(text: string): boolean {
  const lines = text.split(/\r\n|\n|\r/);
  const firstLine = lines[0] ?? '';
  const secondLine = lines[1] ?? '';
  return DIGITS_ONLY.test(firstLine) && SUBRIP_TIME.test(secondLine);
}

function contentRejected(
  rawPath: string,
  accepted: 'media' | 'subrip',
  reason: 'indirection-container' | 'not-subrip',
): MediaError {
  const message = reason === 'not-subrip'
    ? 'The subtitle file is not SubRip.'
    : 'The file is a playlist or script, not a media file.';
  return new MediaError(ERROR_CODES.UNSUPPORTED_FORMAT, message, {
    path: rawPath,
    detected: reason === 'not-subrip' ? 'unknown' : 'indirection-container',
    accepted,
    reason,
  });
}

async function readHead(filePath: string): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(SNIFF_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, SNIFF_BYTES, 0);
    return Buffer.from(buffer.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}

function processFailed(
  binary: string,
  exitCode: number,
  signal: NodeJS.Signals | null,
  stderrTail: string,
): MediaError {
  return new MediaError(
    ERROR_CODES.PROCESS_FAILED,
    'The process failed.',
    {
      binary,
      exitCode,
      signal,
      stderrTail,
    },
  );
}

function assertOutputsWritten(
  outputs: readonly string[],
  label: string,
  stderrTail: string,
): void {
  for (const output of outputs) {
    if (!isCompleteFile(output)) {
      throw processFailed(label, 0, null, stderrTail);
    }
  }
}

function copyAllowedEnv(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): NodeJS.ProcessEnv {
  const child: NodeJS.ProcessEnv = {};
  if (platform === 'win32') {
    const allowed = new Set(CHILD_ENV_NAMES.map((name) => name.toLowerCase()));
    const seen = new Set<string>();
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        continue;
      }
      const folded = key.toLowerCase();
      if (!allowed.has(folded) || seen.has(folded)) {
        continue;
      }
      seen.add(folded);
      child[key] = value;
    }
    return child;
  }
  for (const name of CHILD_ENV_NAMES) {
    const value = env[name];
    if (value !== undefined) {
      child[name] = value;
    }
  }
  return child;
}

function spawnAndWait(
  binary: string,
  args: readonly string[],
  options: RunOptions,
  label: string,
): Promise<ProcessResult> {
  if (terminationStarted) {
    return Promise.reject(new Error('The process runner is shutting down.'));
  }
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const stdoutMode = options.captureStdout === true ? 'pipe' : 'ignore';
    const child = spawn(binary, buildArgv(options.kind, args), {
      shell: false,
      env: buildChildEnv(options.env ?? process.env),
      stdio: ['ignore', stdoutMode, 'pipe'],
      cwd: options.cwd,
    });
    let resolveExited: () => void = () => undefined;
    const exited = new Promise<void>((resolve) => {
      resolveExited = resolve;
    });
    liveChildren.set(child, exited);
    const markExited = (): void => {
      liveChildren.delete(child);
      resolveExited();
    };
    child.once('error', () => {
      if (child.exitCode !== null || child.signalCode !== null) {
        markExited();
      }
    });
    child.once('close', markExited);

    let stderrBuf: Buffer = Buffer.alloc(0);
    let stdoutBuf: Buffer = Buffer.alloc(0);
    let settled = false;
    let timedOut = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (settle: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutTimer !== undefined) {
        clearTimeout(timeoutTimer);
      }
      if (graceTimer !== undefined) {
        clearTimeout(graceTimer);
      }
      settle();
    };

    const streams = (): { stderr: string; stderrTail: string; stdout: string } => {
      // Replacement keeps a byte cap that lands mid-character from throwing.
      const stderr = stderrBuf.toString('utf8');
      const stderrTail = sanitizeStderr(
        tailBytes(stderrBuf, STDERR_TAIL_BYTES).toString('utf8'),
        options.tempDir,
      );
      const stdout = options.captureStdout === true
        ? stdoutBuf.toString('utf8')
        : '';
      return { stderr, stderrTail, stdout };
    };

    if (child.stdout !== null) {
      child.stdout.on('data', (chunk: unknown) => {
        stdoutBuf = Buffer.concat([stdoutBuf, asBuffer(chunk)]);
      });
    }
    if (child.stderr !== null) {
      child.stderr.on('data', (chunk: unknown) => {
        stderrBuf = appendCapped(stderrBuf, asBuffer(chunk), STDERR_CAP_BYTES);
      });
    }

    child.on('error', (error: Error) => {
      if (settled || timedOut) {
        return;
      }
      const spawnCode = nodeErrorCode(error);
      finish(() => {
        reject(new SpawnFailedError(
          label,
          spawnCode !== undefined && spawnCode.length > 0 ? spawnCode : 'UNKNOWN',
        ));
      });
    });

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      finish(() => {
        const elapsedMs = Date.now() - startedAt;
        const captured = streams();
        if (timedOut) {
          reject(new MediaError(
            ERROR_CODES.PROCESS_TIMEOUT,
            'The process did not finish in time and was stopped.',
            {
              binary: label,
              timeoutSeconds: options.timeoutMs / 1000,
              elapsedSeconds: elapsedMs / 1000,
            },
          ));
          return;
        }
        if (code === 0 && signal === null) {
          resolve({
            exitCode: 0,
            signal: null,
            stdout: captured.stdout,
            stderr: captured.stderr,
            stderrTail: captured.stderrTail,
            elapsedMs,
          });
          return;
        }
        const exitCode = signal !== null || code === null ? -1 : code;
        reject(processFailed(label, exitCode, signal, captured.stderrTail));
      });
    });

    timeoutTimer = setTimeout(() => {
      if (settled) {
        return;
      }
      timedOut = true;
      // Default signal asks the child to exit. SIGKILL follows if it ignores it.
      child.kill();
      graceTimer = setTimeout(() => {
        if (!settled) {
          child.kill('SIGKILL');
        }
      }, options.killGraceMs ?? DEFAULT_KILL_GRACE_MS);
    }, options.timeoutMs);
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * A child that could not be created. The failure code is `PROCESS_FAILED`.
 */
export class SpawnFailedError extends MediaError {
  /**
   * Record a spawn that never started.
   *
   * @param binary - Label stored on the failure
   * @param spawnCode - Node's error code, such as `ENOENT`
   */
  constructor(binary: string, spawnCode: string) {
    super(ERROR_CODES.PROCESS_FAILED, 'The process could not be started.', {
      binary,
      exitCode: -1,
      signal: null,
      stderrTail: '',
      spawnFailed: true,
      spawnCode,
    });
    this.name = 'SpawnFailedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Report whether a failure is a spawn that never started.
 *
 * @param error - Any thrown value
 * @returns True when the value is a {@link SpawnFailedError}
 */
export function isSpawnFailure(error: unknown): error is SpawnFailedError {
  return error instanceof SpawnFailedError;
}

/**
 * Copy the allowlisted environment and force a C locale.
 *
 * On Windows the allowlist matches names without case and keeps the
 * spelling it found. Host tokens such as FFREPORT are not copied.
 *
 * @param env - Environment to filter
 * @param platform - Platform whose name matching applies
 * @returns A new environment containing only the allowlist plus locale
 */
export function buildChildEnv(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  const child = copyAllowedEnv(env, platform);
  child.LC_ALL = 'C';
  child.LANG = 'C';
  return child;
}

/**
 * Add the runner flags for a binary kind. The caller's array is not changed.
 *
 * `-y` is left as the caller wrote it. `raw` is returned as a copy. ffmpeg gets the
 * file-only protocol whitelist before each `-i`, ffprobe once at the start.
 *
 * @param kind - Which flag set to apply
 * @param args - Argument tokens already chosen by the caller
 * @returns A new argument list
 */
export function buildArgv(kind: BinaryKind, args: readonly string[]): string[] {
  if (kind === 'raw') {
    return args.slice();
  }
  const prefix: string[] = [];
  if (!args.includes('-hide_banner')) {
    prefix.push('-hide_banner');
  }
  if (kind === 'ffmpeg') {
    if (!args.includes('-nostdin')) {
      prefix.push('-nostdin');
    }
    if (!args.includes('-n')) {
      prefix.push('-n');
    }
    return insertFileWhitelist([...prefix, ...args]);
  }
  if (!args.includes('-v')) {
    prefix.push('-v', 'error');
  }
  // ffprobe reads one input, often positional, so the flag leads the argv.
  if (!args.includes('-protocol_whitelist')) {
    prefix.push('-protocol_whitelist', 'file');
  }
  return [...prefix, ...args];
}

/**
 * Return the last `maxBytes` of a buffer.
 *
 * @param data - Bytes to trim
 * @param maxBytes - How many trailing bytes to keep
 * @returns A copy of the trailing bytes, or an empty buffer when `maxBytes` is below 1
 */
export function tailBytes(data: Buffer, maxBytes: number): Buffer {
  if (maxBytes <= 0 || data.length === 0) {
    return Buffer.alloc(0);
  }
  const start = data.length > maxBytes ? data.length - maxBytes : 0;
  const copy = Buffer.alloc(data.length - start);
  data.copy(copy, 0, start);
  return copy;
}

/**
 * Make stderr text safe to put in a result.
 *
 * ANSI sequences go first, then control characters other than LF and TAB,
 * then each occurrence of the temp folder.
 *
 * @param text - Decoded stderr
 * @param tempDir - Temp folder to hide, when the run had one
 * @returns The sanitized text
 */
export function sanitizeStderr(text: string, tempDir?: string): string {
  const stripped = text.replace(ANSI_ESCAPE, '').replace(CONTROL_CHARACTER, '');
  if (tempDir === undefined || tempDir.length === 0) {
    return stripped;
  }
  return stripped.split(tempDir).join('<tmp>');
}

/**
 * Refuse playlist, manifest, and script inputs, and require SubRip subtitles.
 *
 * A local playlist can name a file outside the allowed roots even when the
 * child is limited to the file protocol, so the bytes are checked here.
 * Font files are not sniffed.
 *
 * @param inputs - Accepted inputs, read at `realPath`
 * @returns Nothing when every input is acceptable
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when a gate refuses a file
 */
export async function assertReadableContent(
  inputs: readonly ResolvedInput[],
): Promise<void> {
  for (const input of inputs) {
    if (input.role === 'font') {
      continue;
    }
    const text = sniffText(await readHead(input.realPath));
    if (input.role === 'subtitle') {
      if (!isSubRip(text)) {
        throw contentRejected(input.rawPath, 'subrip', 'not-subrip');
      }
      continue;
    }
    if (isIndirectionContainer(text)) {
      throw contentRejected(input.rawPath, 'media', 'indirection-container');
    }
  }
}

/**
 * Delete each path, retrying a locked one. A missing path is not a failure
 * and nothing throws.
 *
 * @param paths - Files or folders to remove
 * @returns The paths that were still present after the retries
 */
export function removePaths(paths: readonly string[]): string[] {
  const leftover: string[] = [];
  for (const target of paths) {
    try {
      rmSync(target, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 50,
      });
    } catch {
      // A locked handle must not replace the failure that caused cleanup.
      leftover.push(target);
    }
  }
  return leftover;
}

/**
 * Track a temporary or in-flight output path until its owner releases it.
 *
 * @param target - File or folder removed if shutdown starts
 * @returns An idempotent function that stops tracking the path
 */
export function registerCleanupPath(target: string): () => void {
  if (terminationStarted) {
    removePaths([target]);
    return () => undefined;
  }
  liveCleanupPaths.set(target, (liveCleanupPaths.get(target) ?? 0) + 1);
  let released = false;
  return (): void => {
    if (released) {
      return;
    }
    released = true;
    const count = liveCleanupPaths.get(target);
    if (count === undefined || count <= 1) {
      liveCleanupPaths.delete(target);
      return;
    }
    liveCleanupPaths.set(target, count - 1);
  };
}

/**
 * Stop live child processes and synchronously remove tracked temporary paths.
 *
 * @returns Once all children have exited and registered paths are removed
 */
export function terminateAll(): Promise<void> {
  if (terminationPromise !== undefined) {
    return terminationPromise;
  }
  terminationStarted = true;
  terminationPromise = (async (): Promise<void> => {
    const cleanupPaths = [...liveCleanupPaths.keys()];
    const waiters = slotWaiters.splice(0);
    for (const waiter of waiters) {
      waiter.reject(new Error('The process runner is shutting down.'));
    }

    const children = [...liveChildren.entries()];
    for (const [child] of children) {
      try {
        child.kill('SIGTERM');
      } catch {
        // SIGKILL below is the final cleanup attempt.
      }
    }
    const exits = children.map(([, exited]) => exited);
    if (exits.length > 0) {
      let graceTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.all(exits),
          new Promise<void>((resolve) => {
            graceTimer = setTimeout(resolve, SIGNAL_KILL_GRACE_MS);
          }),
        ]);
      } finally {
        if (graceTimer !== undefined) {
          clearTimeout(graceTimer);
        }
      }
    }

    for (const child of liveChildren.keys()) {
      try {
        child.kill('SIGKILL');
      } catch {
        // The child may have exited between the registry check and kill.
      }
    }
    await Promise.all([...liveChildren.values()]);
    removePaths(cleanupPaths);
    liveCleanupPaths.clear();
  })();
  return terminationPromise;
}

/**
 * Delete each path after a failure and note any that stayed.
 *
 * The failure keeps its own code and message. Paths that could not be
 * removed are listed in `details.leftover`, so the caller can remove them.
 *
 * @param failure - The error about to be rethrown
 * @param paths - Files or folders to remove
 */
export function cleanUpAfterFailure(failure: unknown, paths: readonly string[]): void {
  const leftover = removePaths(paths);
  if (leftover.length === 0 || !(failure instanceof MediaError)) {
    return;
  }
  const earlier: unknown = failure.details.leftover;
  const known = Array.isArray(earlier) ? earlier : [];
  failure.details.leftover = [...known, ...leftover];
}

/**
 * Create a private temp folder, run `fn`, and always remove the folder.
 *
 * A removal failure does not hide the error from `fn`.
 *
 * @param fn - Work that receives the new folder path
 * @returns Whatever `fn` returns
 */
export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(path.join(tmpdir(), TEMP_PREFIX));
  const releaseCleanup = registerCleanupPath(dir);
  try {
    return await fn(dir);
  } finally {
    removePaths([dir]);
    releaseCleanup();
  }
}

/**
 * Run one child under the process policy.
 *
 * The binary path must be absolute. At most two runs are active. A queued
 * run's timeout starts when its process is spawned. A failure after the
 * guard removes planned outputs that were absent before the spawn, and the
 * cleanup folders. An output that already exists is left untouched.
 *
 * @param binary - Absolute path of the program to run
 * @param args - Argument tokens, one element per token
 * @param options - Kind, timeout, outputs, and optional guards
 * @returns Captured status and streams for a zero exit with complete outputs
 * @throws {@link MediaError} `INTERNAL` when `binary` is not absolute
 * @throws {@link MediaError} `PATH_NOT_ALLOWED` or `UNSUPPORTED_FORMAT` from a guard
 * @throws {@link MediaError} `OUTPUT_EXISTS` when a planned output is already there
 * @throws {@link SpawnFailedError} when the process cannot be spawned
 * @throws {@link MediaError} `PROCESS_FAILED` when the process fails or an output is empty
 * @throws {@link MediaError} `PROCESS_TIMEOUT` when the process outlives its timeout
 */
export async function runProcess(
  binary: string,
  args: readonly string[],
  options: RunOptions,
): Promise<ProcessResult> {
  if (!path.isAbsolute(binary)) {
    throw new MediaError(
      ERROR_CODES.INTERNAL,
      'The binary path must be absolute.',
      { reason: 'relative-binary' },
    );
  }

  const label = binaryLabel(binary, options.kind);
  await acquireSlot();
  const cleanupReleases = (options.cleanupFolders ?? []).map(registerCleanupPath);
  const outputReleases: Array<() => void> = [];
  let removableOutputs: readonly string[] | undefined;
  try {
    if (options.guard !== undefined) {
      for (const input of options.guard.inputs) {
        verifyUnchanged(input, options.guard.roots);
      }
      await assertReadableContent(options.guard.inputs);
    }

    const outputs = options.outputs ?? [];
    const absentOutputs: string[] = [];
    for (const output of outputs) {
      if (pathExists(output)) {
        throw new MediaError(
          ERROR_CODES.OUTPUT_EXISTS,
          `Output already exists and is never overwritten: ${output}`,
          { path: output, stage: 'run' },
        );
      }
      absentOutputs.push(output);
    }
    removableOutputs = absentOutputs;
    for (const output of absentOutputs) {
      outputReleases.push(registerCleanupPath(output));
    }

    const result = await spawnAndWait(binary, args, options, label);
    assertOutputsWritten(outputs, label, result.stderrTail);
    return result;
  } catch (error: unknown) {
    if (!isOutputExists(error)) {
      if (removableOutputs !== undefined) {
        cleanUpAfterFailure(error, removableOutputs);
      }
      cleanUpAfterFailure(error, options.cleanupFolders ?? []);
    }
    throw error;
  } finally {
    for (const release of [...outputReleases, ...cleanupReleases]) {
      release();
    }
    releaseSlot();
  }
}
