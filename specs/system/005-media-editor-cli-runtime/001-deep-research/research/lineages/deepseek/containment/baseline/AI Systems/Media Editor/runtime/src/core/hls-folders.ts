// ───────────────────────────────────────────────────────────────────
// MODULE: HLS Folders
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import type { Dirent } from 'node:fs';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** How many regular files a folder holds and their total size. */
export interface FolderTotals {
  /** Regular files under the folder, counted recursively. */
  readonly files: number;

  /** Summed size of those files in bytes. */
  readonly bytes: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const SEGMENT_PREFIX = 'segment_';
const SEGMENT_EXTENSION = '.ts';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isSegmentName(name: string): boolean {
  return name.startsWith(SEGMENT_PREFIX) && name.endsWith(SEGMENT_EXTENSION);
}

function totalsUnder(directory: string): FolderTotals {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = totalsUnder(fullPath);
      files += nested.files;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(fullPath).size;
    }
  }
  return { files, bytes };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Create one folder per rung inside a run's numbered folder.
 *
 * ffmpeg writes `%v/segment_%03d.ts` but creates no directories, so every
 * rung folder must exist before the spawn. A plain mkdir refuses an existing
 * folder instead of merging this run into a previous one.
 *
 * @param folderPath - Numbered folder that will hold the ladder
 * @param rungs - Rung folder names, in ladder order
 * @throws The filesystem error from mkdirSync, for example EEXIST
 */
export function createRungFolders(folderPath: string, rungs: readonly string[]): void {
  for (const rung of rungs) {
    mkdirSync(path.join(folderPath, rung));
  }
}

/**
 * Count the segment files one rung folder holds.
 *
 * @param folderPath - Numbered folder that holds the ladder
 * @param rung - Rung folder name
 * @returns The number of `segment_*.ts` files, or 0 when the folder is missing
 */
export function countSegments(folderPath: string, rung: string): number {
  let entries: Dirent[];
  try {
    entries = readdirSync(path.join(folderPath, rung), { withFileTypes: true });
  } catch {
    return 0;
  }
  return entries.filter((entry) => entry.isFile() && isSegmentName(entry.name)).length;
}

/**
 * Count every regular file under one folder, recursively, and sum their size.
 *
 * @param folderPath - Folder to measure
 * @returns The file count and the total bytes of those files
 * @throws The filesystem error from the directory read or the stat call
 */
export function folderTotals(folderPath: string): FolderTotals {
  return totalsUnder(folderPath);
}
