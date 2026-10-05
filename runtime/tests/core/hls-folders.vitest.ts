// ───────────────────────────────────────────────────────────────────
// MODULE: HLS Folders Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import {
  countSegments,
  createRungFolders,
  folderTotals,
} from '../../src/core/hls-folders.js';
import { makeTempDir, removeTempDir } from '../helpers/media.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

function writeSegment(dir: string, name: string, text: string): void {
  writeFileSync(path.join(dir, name), text);
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('creates one folder per rung and refuses an existing one', (): void => {
  const dir = makeTempDir('hls-folders-');
  try {
    createRungFolders(dir, ['720p', '360p']);
    expect(statSync(path.join(dir, '720p')).isDirectory()).toBe(true);
    expect(statSync(path.join(dir, '360p')).isDirectory()).toBe(true);
    expect(() => createRungFolders(dir, ['720p'])).toThrow(Error);
  } finally {
    removeTempDir(dir);
  }
});

it('counts only segment files and answers zero for a missing rung', (): void => {
  const dir = makeTempDir('hls-segments-');
  try {
    const rungDir = path.join(dir, '720p');
    mkdirSync(rungDir);
    writeFileSync(path.join(rungDir, 'playlist.m3u8'), '#EXTM3U\n');
    writeSegment(rungDir, 'segment_000.ts', 'a');
    writeSegment(rungDir, 'segment_001.ts', 'bb');
    // A folder that looks like a segment must not be counted as one.
    mkdirSync(path.join(rungDir, 'segment_999.ts'));
    expect(countSegments(dir, '720p')).toBe(2);
    expect(countSegments(dir, '360p')).toBe(0);
  } finally {
    removeTempDir(dir);
  }
});

it('counts and sums every regular file under the folder, recursively', (): void => {
  const dir = makeTempDir('hls-bytes-');
  try {
    const rungDir = path.join(dir, '720p');
    const nestedDir = path.join(rungDir, 'nested');
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(path.join(dir, 'master.m3u8'), 'EXT');
    writeSegment(rungDir, 'segment_000.ts', 'hello');
    writeFileSync(path.join(nestedDir, 'extra'), 'abcd');
    expect(folderTotals(dir)).toEqual({ files: 3, bytes: 12 });
  } finally {
    removeTempDir(dir);
  }
});
