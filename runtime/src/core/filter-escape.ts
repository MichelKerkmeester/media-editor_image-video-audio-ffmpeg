// ───────────────────────────────────────────────────────────────────
// MODULE: Filter Escape
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { constants } from 'node:fs';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import { ERROR_CODES, MediaError } from './errors.js';
import { assertReadableContent } from './process-runner.js';

import type { ResolvedInput } from './path-guard.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Bytes a path may carry and still enter a filter graph without a copy. */
const FILTER_SAFE_PATH = /^[A-Za-z0-9._/\\: -]+$/;

/** File name a copied subtitle takes inside the run's temp folder. */
const SUBTITLE_COPY_NAME = 'subtitle.srt';

/** Folder name copied font files take inside the run's temp folder. */
const FONT_COPY_FOLDER = 'fonts';

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Report whether a character is white space the option parser strips at an edge.
 *
 * @param character - One character, or undefined past the end of a string
 * @returns True for a space, a TAB or an LF
 */
function isEdgeWhitespace(character: string | undefined): boolean {
  return character === ' ' || character === '\t' || character === '\n';
}

/**
 * Report whether a value holds a byte a filter cannot carry.
 *
 * TAB and LF stay allowed, because a raw LF draws a line break and a TAB is
 * ordinary text. Every other C0 control and DEL is refused: ffmpeg's debug
 * output cannot tell those bytes apart from the text around them.
 *
 * @param value - Text from the caller, with CRLF already normalized
 * @returns True when a refused control character is present
 */
function hasRefusedControl(value: string): boolean {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point === undefined || point === 0x09 || point === 0x0a) {
      continue;
    }
    if (point < 0x20 || point === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Put a backslash before every character of an edge run.
 *
 * @param text - The leading or trailing white space of an escaped value
 * @returns The same characters, each with a leading backslash
 */
function escapeEdgeWhitespace(text: string): string {
  let escaped = '';
  for (const character of text) {
    escaped += `\\${character}`;
  }
  return escaped;
}

/**
 * Escape a value for the filter's own option parser.
 *
 * The parser reads a backslash as its escape byte, splits options on a colon,
 * honors quotes, and strips unescaped white space from both edges.
 *
 * @param value - Caller text
 * @returns The value with its option-level bytes escaped
 */
function escapeOptionValue(value: string): string {
  const replaced = value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll(':', '\\:');
  let start = 0;
  while (isEdgeWhitespace(replaced[start])) {
    start += 1;
  }
  let end = replaced.length;
  while (end > start && isEdgeWhitespace(replaced[end - 1])) {
    end -= 1;
  }
  return escapeEdgeWhitespace(replaced.slice(0, start))
    + replaced.slice(start, end)
    + escapeEdgeWhitespace(replaced.slice(end));
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Escape a caller value for the text between single quotes in a filter graph.
 *
 * The result undoes both parse levels in one pass: the option parser's escape
 * bytes first, then the graph parser's quoting, so a single caller quote
 * becomes the five bytes backslash, quote, backslash, quote, quote.
 *
 * @param value - Caller text whose control characters were already checked
 * @returns The text to write between single quotes
 */
export function escapeFilterValue(value: string): string {
  return escapeOptionValue(value).replaceAll("'", "'\\''");
}

/**
 * Wrap an escaped value in the single quotes a filter option needs.
 *
 * @param value - Caller text whose control characters were already checked
 * @returns The quoted option value, quotes included
 */
export function quoteFilterValue(value: string): string {
  return `'${escapeFilterValue(value)}'`;
}

/**
 * Normalize line breaks and refuse control characters before escaping.
 *
 * CRLF and a lone CR become LF, so a Windows line break does not trip the
 * refusal. TAB and LF stay; every other C0 control and DEL fails the call.
 *
 * @param value - Text from the caller
 * @param parameter - Name of the field that supplied the value
 * @returns The text with CRLF and lone CR turned into LF
 * @throws {@link MediaError} `INVALID_INPUT` when a refused control is present
 */
export function normalizeCallerText(value: string, parameter: string): string {
  const normalized = value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  if (hasRefusedControl(normalized)) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      `Text parameter ${parameter} holds a control character.`,
      { parameter, value, reason: 'control-character' },
    );
  }
  return normalized;
}

/**
 * Report whether a path may enter a filter graph unchanged.
 *
 * The safe set is ASCII letters, digits, dot, dash, underscore, slash,
 * backslash, colon and space. One byte outside it needs a copy.
 *
 * @param filePath - Path as the server holds it
 * @returns True when every byte is inside the safe set
 */
export function isFilterSafePath(filePath: string): boolean {
  return filePath.length > 0 && FILTER_SAFE_PATH.test(filePath);
}

/**
 * Return a path that can go inside a filter graph, copying the file when needed.
 *
 * A path outside the safe set is copied byte for byte into the run's temp
 * folder under a server-chosen name, so a quote, percent, comma, semicolon,
 * bracket or equals sign never reaches the graph. The original is only read.
 *
 * @param realPath - Canonical path of the file the filter must open
 * @param tempDir - This run's private temp folder
 * @param tempName - Server-chosen file name inside that folder
 * @returns `realPath` when it is safe, otherwise the copy's path
 * @throws {Error} When the copy fails, including when the target exists
 */
export async function filterSafePath(
  realPath: string,
  tempDir: string,
  tempName: string,
): Promise<string> {
  if (isFilterSafePath(realPath)) {
    return realPath;
  }
  const target = path.join(tempDir, tempName);
  await copyFile(realPath, target, constants.COPYFILE_EXCL);
  return target;
}

/**
 * Return a subtitle path a filter graph can open, copying it when needed.
 *
 * A path outside the safe set is sniffed as SubRip, then copied byte for
 * byte into the run's temp folder, so a refused file is never copied. The
 * copy is sniffed again, since the original may change between the two
 * reads. The original is read only.
 *
 * @param input - Accepted subtitle input from the path guard
 * @param tempDir - This run's private temp folder
 * @returns `input.realPath` when it is safe, otherwise the copy's path
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when the original or the
 *   copy is not SubRip
 * @throws {Error} When the copy fails, including when the target exists
 */
export async function filterSafeSubtitle(
  input: ResolvedInput,
  tempDir: string,
): Promise<string> {
  if (isFilterSafePath(input.realPath)) {
    return input.realPath;
  }
  await assertReadableContent([input]);
  const copyPath = await filterSafePath(input.realPath, tempDir, SUBTITLE_COPY_NAME);
  await assertReadableContent([{ ...input, realPath: copyPath }]);
  return copyPath;
}

/**
 * Return a font folder a filter graph can open, copying it when needed.
 *
 * libass reads every file of a `fontsdir`, so an unsafe folder is replaced
 * by a temp folder holding a copy of each regular file. The original folder
 * is read only.
 *
 * @param dir - Folder as the server holds it
 * @param tempDir - This run's private temp folder
 * @returns `dir` when it is safe, otherwise the copied folder
 * @throws {Error} When a needed copy fails, including when one exists
 */
export async function filterSafeFontDir(dir: string, tempDir: string): Promise<string> {
  if (isFilterSafePath(dir)) {
    return dir;
  }
  const target = path.join(tempDir, FONT_COPY_FOLDER);
  await mkdir(target);
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    await copyFile(
      path.join(dir, entry.name),
      path.join(target, entry.name),
      constants.COPYFILE_EXCL,
    );
  }
  return target;
}
