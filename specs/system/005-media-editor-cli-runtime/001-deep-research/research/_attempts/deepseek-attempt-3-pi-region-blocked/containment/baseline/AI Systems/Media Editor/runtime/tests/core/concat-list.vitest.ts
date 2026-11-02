// ───────────────────────────────────────────────────────────────────
// MODULE: Concat List Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import { concatListText, writeConcatList } from '../../src/core/concat-list.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { makeTempDir, removeTempDir } from '../helpers/media.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const ONE_CLIP = "file 'norm_0.mp4'\n";

const THREE_CLIPS = "file 'norm_0.mp4'\n"
  + "file 'norm_1.mp4'\n"
  + "file 'norm_2.mp4'\n";

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function expectInternalError(run: () => void): void {
  let thrown: unknown;
  try {
    run();
  } catch (error: unknown) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(MediaError);
  if (thrown instanceof MediaError) {
    expect(thrown.code).toBe(ERROR_CODES.INTERNAL);
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('writes one relative file line per clip', (): void => {
  expect(concatListText(1)).toBe(ONE_CLIP);
  expect(concatListText(3)).toBe(THREE_CLIPS);
});

it('names the list next to the clips it lists', (): void => {
  const dir = makeTempDir('concat-list-');
  try {
    const listPath = writeConcatList(dir, 2);
    expect(listPath).toBe(path.join(dir, 'concat_list.txt'));
    expect(readFileSync(listPath, 'utf8')).toBe(concatListText(2));
  } finally {
    removeTempDir(dir);
  }
});

it('refuses to overwrite an existing list', (): void => {
  const dir = makeTempDir('concat-list-existing-');
  try {
    const listPath = path.join(dir, 'concat_list.txt');
    writeFileSync(listPath, 'sentinel\n');
    expect(() => writeConcatList(dir, 1)).toThrow(Error);
    expect(readFileSync(listPath, 'utf8')).toBe('sentinel\n');
  } finally {
    removeTempDir(dir);
  }
});

it('refuses a count below one', (): void => {
  expectInternalError(() => concatListText(0));
  const dir = makeTempDir('concat-list-empty-');
  try {
    expectInternalError(() => writeConcatList(dir, 0));
  } finally {
    removeTempDir(dir);
  }
});
