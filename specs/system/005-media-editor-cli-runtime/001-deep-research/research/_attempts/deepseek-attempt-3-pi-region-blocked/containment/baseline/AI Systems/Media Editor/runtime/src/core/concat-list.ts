// ───────────────────────────────────────────────────────────────────
// MODULE: Concat List
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { ERROR_CODES, MediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const CONCAT_LIST_FILE = 'concat_list.txt';
const NORMALIZED_NAME_PREFIX = 'norm_';
const NORMALIZED_NAME_EXTENSION = '.mp4';
const MIN_ENTRIES = 1;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function assertEntryCount(count: number): void {
  if (!Number.isInteger(count) || count < MIN_ENTRIES) {
    throw new MediaError(
      ERROR_CODES.INTERNAL,
      'A concat list needs at least one entry.',
      { count, reason: 'empty-concat-list' },
    );
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build the demuxer list for a run's normalized clips.
 *
 * Every entry is a name the server generated for its own intermediate, so
 * no caller byte reaches the list and no entry needs quoting.
 *
 * @param count - Number of clips that were normalized
 * @returns One `file '<name>'` line per clip, each ending in a line feed
 * @throws {@link MediaError} `INTERNAL` when the count is below one
 */
export function concatListText(count: number): string {
  assertEntryCount(count);
  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const name = `${NORMALIZED_NAME_PREFIX}${String(index)}${NORMALIZED_NAME_EXTENSION}`;
    lines.push(`file '${name}'\n`);
  }
  return lines.join('');
}

/**
 * Write the demuxer list into a run's private temp folder.
 *
 * The exclusive create keeps an existing file, so a list is written once
 * per run and never rewritten in place.
 *
 * @param tempDir - Temp folder that holds the normalized clips
 * @param count - Number of clips that were normalized
 * @returns Absolute path of the written list
 * @throws {@link MediaError} `INTERNAL` when the count is below one
 * @throws {Error} When the list path already exists
 */
export function writeConcatList(tempDir: string, count: number): string {
  const listPath = path.join(tempDir, CONCAT_LIST_FILE);
  writeFileSync(listPath, concatListText(count), { flag: 'wx' });
  return listPath;
}
