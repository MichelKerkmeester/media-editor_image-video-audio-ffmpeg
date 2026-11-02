// ───────────────────────────────────────────────────────────────────
// MODULE: Path Guard
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import { ERROR_CODES, MediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Caller path class from the path policy. */
export type InputRole = 'input' | 'subtitle' | 'overlay-image' | 'font';

/** One caller path after it has been accepted. */
export interface ResolvedInput {
  /** Path string the caller passed. */
  readonly rawPath: string;

  /** Canonical path the tool opens. */
  readonly realPath: string;

  /** Which caller parameter this file fills. */
  readonly role: InputRole;
}

type PathStringReason =
  | 'not-utf8'
  | 'nul-byte'
  | 'relative-path'
  | 'windows-special-path';

type PathDenialReason =
  | 'outside-root'
  | 'sibling-prefix'
  | 'symlink-target'
  | 'changed-after-check';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const WINDOWS_TWO_SEPARATORS = /^[\\/]{2}/;
const WINDOWS_EXTENDED_OR_DEVICE = /^[\\/]{2}[?.][\\/]/;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function withoutTrailingSeparator(value: string, sep: string): string {
  let body = value.normalize('NFC');
  while (body.endsWith(sep) && body.length > sep.length) {
    body = body.slice(0, -sep.length);
  }
  return body;
}

function segmentsOf(value: string, sep: string): readonly string[] {
  const body = withoutTrailingSeparator(value, sep);
  if (body === sep || body.length === 0) {
    return [''];
  }
  return body.split(sep);
}

function startsWithSegments(
  target: readonly string[],
  root: readonly string[],
): boolean {
  if (root.length > target.length) {
    return false;
  }
  for (let index = 0; index < root.length; index += 1) {
    if (target[index] !== root[index]) {
      return false;
    }
  }
  return true;
}

function pathFor(platform: NodeJS.Platform): path.PlatformPath {
  if (platform === 'win32') {
    return path.win32;
  }
  return path.posix;
}

/**
 * A lone surrogate becomes U+FFFD in a UTF-8 round trip, which would name
 * a different file.
 */
function isRoundTripUtf8(value: string): boolean {
  return Buffer.from(value, 'utf8').toString('utf8') === value;
}

function isWindowsSpecialPath(value: string): boolean {
  if (WINDOWS_EXTENDED_OR_DEVICE.test(value)) {
    return true;
  }
  return value.indexOf(':', 2) !== -1;
}

/**
 * A shared text prefix is a sibling only when the next character is not a
 * separator. `/media` against `/media-private` counts; a child path does not.
 */
function isPlainStringPrefix(prefix: string, full: string, sep: string): boolean {
  const start = withoutTrailingSeparator(prefix, sep);
  const body = withoutTrailingSeparator(full, sep);
  if (start.length === 0 || body.length <= start.length) {
    return false;
  }
  if (!body.startsWith(start)) {
    return false;
  }
  const next = body[start.length];
  if (next === undefined) {
    return false;
  }
  return next !== sep;
}

function hasSiblingPrefix(
  rawPath: string,
  roots: readonly string[],
  sep: string,
): boolean {
  for (const root of roots) {
    if (
      isPlainStringPrefix(root, rawPath, sep)
      || isPlainStringPrefix(rawPath, root, sep)
    ) {
      return true;
    }
  }
  return false;
}

function invalidInput(
  parameter: string,
  value: string,
  reason: PathStringReason,
): MediaError {
  return new MediaError(
    ERROR_CODES.INVALID_INPUT,
    `Path parameter ${parameter} is not a usable path.`,
    {
      parameter,
      value,
      reason,
    },
  );
}

function inputNotFound(rawPath: string, role: InputRole): MediaError {
  return new MediaError(
    ERROR_CODES.INPUT_NOT_FOUND,
    `Input file not found: ${rawPath}`,
    {
      path: rawPath,
      role,
    },
  );
}

function pathNotAllowed(
  rawPath: string,
  realPath: string,
  roots: readonly string[],
  reason: PathDenialReason,
): MediaError {
  return new MediaError(
    ERROR_CODES.PATH_NOT_ALLOWED,
    `Path is outside the allowed roots: ${rawPath}`,
    {
      path: rawPath,
      realPath,
      allowedRoots: [...roots],
      reason,
    },
  );
}

function readRealPath(rawPath: string, role: InputRole): string {
  try {
    return realpathSync.native(rawPath);
  } catch {
    throw inputNotFound(rawPath, role);
  }
}

function assertRegularFile(
  realPath: string,
  rawPath: string,
  role: InputRole,
): void {
  let isFile = false;
  try {
    isFile = statSync(realPath).isFile();
  } catch {
    throw inputNotFound(rawPath, role);
  }
  if (!isFile) {
    throw inputNotFound(rawPath, role);
  }
}

/**
 * `path.resolve` collapses `.` and `..` without following links, so a link
 * that stays inside the spelling but leaves on disk is a symlink target.
 */
function containmentReason(
  rawPath: string,
  roots: readonly string[],
): Exclude<PathDenialReason, 'changed-after-check'> {
  const lexical = path.resolve(rawPath.normalize('NFC'));
  const lexicalInside = roots.some((root) => isInsideRoot(lexical, root));
  if (lexicalInside) {
    return 'symlink-target';
  }
  if (hasSiblingPrefix(rawPath, roots, path.sep)) {
    return 'sibling-prefix';
  }
  return 'outside-root';
}

function sameRealPath(left: string, right: string): boolean {
  return left.normalize('NFC') === right.normalize('NFC');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Report whether `target` is `root` or a path inside it.
 *
 * Both sides are compared as whole NFC segments. The compare is byte-exact.
 *
 * @param target - Path to test
 * @param root - Containing path
 * @param sep - Segment separator. Defaults to the current platform
 * @returns True when every root segment matches the start of `target`
 */
export function isInsideRoot(
  target: string,
  root: string,
  sep: string = path.sep,
): boolean {
  return startsWithSegments(segmentsOf(target, sep), segmentsOf(root, sep));
}

/**
 * Reject a path string before any file system call.
 *
 * Checks run in order: UTF-8 round trip, NUL, absolute path, then Windows
 * extended-length and stream forms.
 *
 * @param value - Caller path string
 * @param parameter - Argument name to store on the failure
 * @param platform - Platform whose absolute-path rule applies
 * @throws {@link MediaError} `INVALID_INPUT` when the string cannot be used
 */
export function validatePathString(
  value: string,
  parameter: string,
  platform: NodeJS.Platform = process.platform,
): void {
  if (!isRoundTripUtf8(value)) {
    throw invalidInput(parameter, value, 'not-utf8');
  }
  if (value.includes('\0')) {
    throw invalidInput(parameter, value, 'nul-byte');
  }
  if (!pathFor(platform).isAbsolute(value)) {
    throw invalidInput(parameter, value, 'relative-path');
  }
  if (platform === 'win32' && isWindowsSpecialPath(value)) {
    throw invalidInput(parameter, value, 'windows-special-path');
  }
}

/**
 * Report whether a Windows path string is a UNC path.
 *
 * True when the string starts with two separators, in any mix of backslash
 * and forward slash, and is neither an extended-length path nor a device
 * path. Windows turns the forward-slash spelling into the same UNC path, so
 * it needs the same string-only check before any file system call.
 *
 * @param value - Caller path string
 * @returns True when `value` is a UNC path
 */
export function isUncPath(value: string): boolean {
  if (!WINDOWS_TWO_SEPARATORS.test(value)) {
    return false;
  }
  return !WINDOWS_EXTENDED_OR_DEVICE.test(value);
}

/**
 * Reject an empty root list before a path is read.
 *
 * @param roots - Canonical roots already accepted at startup
 * @param tool - Tool that asked for a path
 * @throws {@link MediaError} `CONFIG_MISSING` when `roots` is empty
 */
export function assertRootsConfigured(
  roots: readonly string[],
  tool: string,
): void {
  if (roots.length > 0) {
    return;
  }
  throw new MediaError(
    ERROR_CODES.CONFIG_MISSING,
    'No allowed roots are configured. Set MEDIA_EDITOR_ALLOWED_DIRS or --allowed-dir.',
    {
      setting: 'allowedRoots',
      tool,
      reason: 'unset',
    },
  );
}

/**
 * Resolve one caller path to a regular file inside an allowed root.
 *
 * The returned `realPath` is the native real path, which is the path the
 * tool opens. On Windows a UNC path no root names is refused before that
 * call, because canonicalizing it can open a network connection.
 *
 * @param rawPath - Caller path string
 * @param role - Which kind of input this path is
 * @param roots - Canonical allowed roots
 * @param parameter - Argument name stored on a string failure
 * @param tool - Tool name stored when no root is configured
 * @param platform - Platform whose path rules apply
 * @returns The caller string, its real path, and the role
 * @throws {@link MediaError} When the string, the file, or the root check fails
 */
export function resolveInputPath(
  rawPath: string,
  role: InputRole,
  roots: readonly string[],
  parameter: string,
  tool: string,
  platform: NodeJS.Platform = process.platform,
): ResolvedInput {
  assertRootsConfigured(roots, tool);
  validatePathString(rawPath, parameter, platform);
  if (platform === 'win32' && isUncPath(rawPath)) {
    const lexicalPath = path.win32.normalize(rawPath);
    const isNamedByRoot = roots.some((root) => isInsideRoot(lexicalPath, root, '\\'));
    if (!isNamedByRoot) {
      throw pathNotAllowed(rawPath, rawPath, roots, 'outside-root');
    }
  }
  const realPath = readRealPath(rawPath, role);
  const isInside = roots.some((root) => isInsideRoot(realPath, root));
  if (!isInside) {
    throw pathNotAllowed(
      rawPath,
      realPath,
      roots,
      containmentReason(rawPath, roots),
    );
  }
  assertRegularFile(realPath, rawPath, role);
  return {
    rawPath,
    realPath,
    role,
  };
}

/**
 * Resolve every path, or throw on the first failure.
 *
 * @param rawPaths - Caller path strings, in order
 * @param role - Role shared by every entry
 * @param roots - Canonical allowed roots
 * @param parameter - Argument name stored on a string failure
 * @param tool - Tool name stored when no root is configured
 * @param platform - Platform whose path rules apply
 * @returns One resolved entry per input, in the same order
 * @throws {@link MediaError} When any entry fails. Nothing is returned
 */
export function resolveInputPaths(
  rawPaths: readonly string[],
  role: InputRole,
  roots: readonly string[],
  parameter: string,
  tool: string,
  platform: NodeJS.Platform = process.platform,
): ResolvedInput[] {
  const resolved: ResolvedInput[] = [];
  for (const rawPath of rawPaths) {
    resolved.push(
      resolveInputPath(rawPath, role, roots, parameter, tool, platform),
    );
  }
  return resolved;
}

/**
 * Confirm an accepted path still points at the same file inside the roots.
 *
 * @param resolved - Result of an earlier {@link resolveInputPath}
 * @param roots - Canonical allowed roots
 * @throws {@link MediaError} `INPUT_NOT_FOUND` when the path is gone, or
 * `PATH_NOT_ALLOWED` with `changed-after-check` when it moved
 */
export function verifyUnchanged(
  resolved: ResolvedInput,
  roots: readonly string[],
): void {
  let nextReal: string;
  try {
    nextReal = realpathSync.native(resolved.rawPath);
  } catch {
    throw inputNotFound(resolved.rawPath, resolved.role);
  }
  const moved = !sameRealPath(nextReal, resolved.realPath);
  const isInside = roots.some((root) => isInsideRoot(nextReal, root));
  if (moved || !isInside) {
    throw pathNotAllowed(resolved.rawPath, nextReal, roots, 'changed-after-check');
  }
}

/**
 * Reject a planned output that is an input path or a path inside one.
 *
 * @param plannedOutput - Output path the tool is about to create
 * @param inputRealPaths - Real paths of the inputs already accepted
 * @throws {@link MediaError} `OUTPUT_EXISTS` with `stage` `pre-check`
 */
export function assertOutputNotOnInput(
  plannedOutput: string,
  inputRealPaths: readonly string[],
): void {
  for (const inputPath of inputRealPaths) {
    if (isInsideRoot(plannedOutput, inputPath)) {
      throw new MediaError(
        ERROR_CODES.OUTPUT_EXISTS,
        `Output collides with an input and is never overwritten: ${plannedOutput}`,
        {
          path: plannedOutput,
          stage: 'pre-check',
          input: inputPath,
        },
      );
    }
  }
}
