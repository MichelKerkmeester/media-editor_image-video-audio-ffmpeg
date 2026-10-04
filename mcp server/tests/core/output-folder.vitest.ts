// ───────────────────────────────────────────────────────────────────
// MODULE: Output Folder Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import {
  allocateOutputFolder,
  cutUtf8,
  outputFileName,
  slugify,
  writeExclusive,
} from '../../src/core/output-folder.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL = 'image_compress';

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-output-folder-'));
const scratchReal = realpathSync.native(scratch);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function mediaError(run: () => void): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

async function mediaErrorFrom(run: () => Promise<void>): Promise<MediaError> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

function makeDir(name: string): string {
  const dir = path.join(scratchReal, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function systemCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = error.code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code;
}

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('slugify', (): void => {
  it('builds a lowercase ascii slug', (): void => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Pictures: evil!')).toBe('pictures-evil');
    expect(slugify('a   b')).toBe('a-b');
    expect(slugify('---Hello---')).toBe('hello');
    expect(slugify('a---b')).toBe('a-b');
    expect(slugify('hello_world')).toBe('helloworld');
    expect(slugify('café')).toBe('caf');
    expect(slugify('Straße')).toBe('strae');
    expect(slugify('東京 tower')).toBe('tower');

    const hundredLetters = 'A'.repeat(100);
    expect(slugify(hundredLetters)).toBe('a'.repeat(60));
    expect(slugify(hundredLetters).endsWith('-')).toBe(false);

    const cutOnHyphen = `${'b'.repeat(59)} ${'c'.repeat(40)}`;
    expect(cutOnHyphen).toHaveLength(100);
    expect(slugify(cutOnHyphen)).toBe('b'.repeat(59));
    expect(slugify(cutOnHyphen).endsWith('-')).toBe(false);

    expect(slugify('con')).toBe('con-out');
    expect(slugify('nul')).toBe('nul-out');
    expect(slugify('com1')).toBe('com1-out');
    expect(slugify('CON', 'win32')).toBe('con-out');
    expect(slugify('con', 'darwin')).toBe('con-out');
    expect(slugify('com10', 'linux')).toBe('com10');
  });

  it('rejects an empty slug', (): void => {
    for (const text of ['', '!!!']) {
      const error = mediaError((): void => {
        slugify(text);
      });
      expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(error.details).toEqual({
        parameter: 'outputName',
        value: text,
        reason: 'empty-slug',
      });
    }
  });
});

describe('allocateOutputFolder', (): void => {
  it('starts at 001 and continues at 002', (): void => {
    const dir = path.join(scratchReal, 'sequence');
    const first = allocateOutputFolder(dir, 'x', TOOL);
    expect(first.number).toBe(1);
    expect(first.name).toBe('x');
    expect(first.folderPath).toBe(path.join(realpathSync.native(dir), '001 - x'));
    expect(statSync(first.folderPath).isDirectory()).toBe(true);

    const second = allocateOutputFolder(dir, 'x', TOOL);
    expect(second.number).toBe(2);
    expect(path.basename(second.folderPath)).toBe('002 - x');
  });

  it('does not fill gaps', (): void => {
    const dir = makeDir('gaps');
    mkdirSync(path.join(dir, '001 - a'));
    mkdirSync(path.join(dir, '005 - b'));

    const created = allocateOutputFolder(dir, 'x', TOOL);
    expect(created.number).toBe(6);
    expect(path.basename(created.folderPath)).toBe('006 - x');
    expect(existsSync(path.join(dir, '002 - x'))).toBe(false);
    expect(existsSync(path.join(dir, '003 - x'))).toBe(false);
    expect(existsSync(path.join(dir, '004 - x'))).toBe(false);
  });

  it('ignores foreign entries', (): void => {
    const dir = makeDir('foreign');
    writeFileSync(path.join(dir, 'readme.txt'), 'note');
    mkdirSync(path.join(dir, 'abc - x'));
    mkdirSync(path.join(dir, '12 - short'));

    const created = allocateOutputFolder(dir, 'x', TOOL);
    expect(created.number).toBe(1);
    expect(path.basename(created.folderPath)).toBe('001 - x');
  });

  it('compares numbers by value past 999', (): void => {
    const dir = makeDir('wide');
    mkdirSync(path.join(dir, '999 - a'));

    const first = allocateOutputFolder(dir, 'x', TOOL);
    expect(first.number).toBe(1000);
    expect(path.basename(first.folderPath)).toBe('1000 - x');

    const second = allocateOutputFolder(dir, 'x', TOOL);
    expect(second.number).toBe(1001);
    expect(path.basename(second.folderPath)).toBe('1001 - x');
  });

  it('gives two calls in the same tick different numbers', (): void => {
    const dir = path.join(scratchReal, 'race');
    const created = [
      allocateOutputFolder(dir, 'x', TOOL),
      allocateOutputFolder(dir, 'x', TOOL),
    ];
    expect(created[0]?.number).not.toBe(created[1]?.number);
    expect(new Set(created.map((entry) => entry.number))).toEqual(new Set([1, 2]));
    expect(statSync(created[0]?.folderPath ?? '').isDirectory()).toBe(true);
    expect(statSync(created[1]?.folderPath ?? '').isDirectory()).toBe(true);
  });

  it('rejects an unset output directory', (): void => {
    const error = mediaError((): void => {
      allocateOutputFolder(undefined, 'x', TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.CONFIG_MISSING);
    expect(error.details).toEqual({
      setting: 'outputFolder',
      reason: 'unset',
      tool: TOOL,
    });
  });

  it('rejects an output directory that is a file', (): void => {
    const dir = makeDir('file-root');
    const filePath = path.join(dir, 'not-a-folder');
    writeFileSync(filePath, 'nope');

    const error = mediaError((): void => {
      allocateOutputFolder(filePath, 'x', TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.CONFIG_MISSING);
    expect(error.details).toEqual({
      setting: 'outputFolder',
      reason: 'unusable',
      tool: TOOL,
    });
  });

  it('rejects an empty slug before creating a folder', (): void => {
    const dir = path.join(scratchReal, 'no-slug');
    const error = mediaError((): void => {
      allocateOutputFolder(dir, '!!!', TOOL);
    });
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details.reason).toBe('empty-slug');
    expect(existsSync(dir)).toBe(false);
  });
});

describe('writeExclusive', (): void => {
  it('writes and then refuses an existing file', async (): Promise<void> => {
    const dir = makeDir('exclusive');
    const filePath = path.join(dir, 'frame.bin');
    const original = new Uint8Array([1, 2, 3, 9]);
    await writeExclusive(filePath, original);
    expect(Array.from(readFileSync(filePath))).toEqual([1, 2, 3, 9]);

    const snapshot = readFileSync(filePath);
    const error = await mediaErrorFrom(async (): Promise<void> => {
      await writeExclusive(filePath, new Uint8Array([7, 7, 7]));
    });
    expect(error.code).toBe(ERROR_CODES.OUTPUT_EXISTS);
    expect(error.details).toEqual({
      path: filePath,
      stage: 'run',
    });
    expect(readFileSync(filePath).equals(snapshot)).toBe(true);
  });

  it('rethrows an open failure and does not invent a file', async (): Promise<void> => {
    const missing = path.join(scratchReal, 'missing-parent', 'out.bin');
    let caught: unknown;
    try {
      await writeExclusive(missing, new Uint8Array([1]));
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).not.toBeInstanceOf(MediaError);
    expect(systemCode(caught)).toBe('ENOENT');
    expect(existsSync(missing)).toBe(false);
  });
});

describe('cutUtf8', (): void => {
  it('does not split a multi-byte character', (): void => {
    expect(Buffer.byteLength('é', 'utf8')).toBe(2);
    expect(cutUtf8('é', 1)).toBe('');
    expect(cutUtf8('é', 2)).toBe('é');
    expect(cutUtf8('aé', 2)).toBe('a');

    expect(Buffer.byteLength('字', 'utf8')).toBe(3);
    expect(cutUtf8('字', 2)).toBe('');
    expect(cutUtf8('字', 3)).toBe('字');
    expect(cutUtf8('a字', 3)).toBe('a');

    expect(Buffer.byteLength('😀', 'utf8')).toBe(4);
    expect(cutUtf8('😀', 3)).toBe('');
    expect(cutUtf8('😀', 4)).toBe('😀');
    expect(cutUtf8('a😀', 4)).toBe('a');
    expect(cutUtf8('a😀', 4)).not.toMatch(/[\uD800-\uDFFF]/);
  });
});

describe('outputFileName', (): void => {
  it('keeps the stem, operation and extension', (): void => {
    expect(outputFileName('/media/hero.jpg', 'compressed', '.jpg')).toBe(
      'hero-compressed.jpg',
    );
    expect(outputFileName('/media/café.png', 'compressed', '.jpg')).toBe(
      'café-compressed.jpg',
    );
  });

  it('cuts a long multi-byte stem to 120 bytes', (): void => {
    const stem = `${'é'.repeat(100)}${'字'.repeat(100)}${'😀'.repeat(100)}`;
    expect(Array.from(stem)).toHaveLength(300);
    const operation = 'compressed';
    const extension = '.jpg';
    const suffix = `-${operation}${extension}`;
    const name = outputFileName(`/library/${stem}.mp4`, operation, extension);

    expect(Buffer.byteLength(name, 'utf8')).toBeLessThanOrEqual(120);
    expect(name.endsWith(suffix)).toBe(true);
    expect(Buffer.from(name, 'utf8').toString('utf8')).toBe(name);

    const kept = name.slice(0, name.length - suffix.length);
    expect(stem.startsWith(kept)).toBe(true);
    const next = Array.from(stem)[Array.from(kept).length];
    if (next !== undefined) {
      const longer = `${kept}${next}${suffix}`;
      expect(Buffer.byteLength(longer, 'utf8')).toBeGreaterThan(120);
    }
  });
});
