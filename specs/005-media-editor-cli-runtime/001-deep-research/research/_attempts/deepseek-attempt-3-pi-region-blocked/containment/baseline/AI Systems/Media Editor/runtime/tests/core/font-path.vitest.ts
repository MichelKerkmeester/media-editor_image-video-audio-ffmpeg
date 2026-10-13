// ───────────────────────────────────────────────────────────────────
// MODULE: Font Path Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { isFilterSafePath, quoteFilterValue } from '../../src/core/filter-escape.js';
import {
  BUNDLED_FONT_FILE,
  assertBundledFont,
  bundledFontDir,
  bundledFontPath,
} from '../../src/core/font-path.js';
import { resolveTestBinary } from '../helpers/media.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const FONT_DIR_SUFFIX = path.join('assets', 'fonts');
const MIN_FONT_BYTES = 100_000;
const RENDER_TIMEOUT_MS = 60_000;

const LICENCE_URL = new URL('../../assets/licenses/SourceSans3-OFL.md', import.meta.url);

const FONT_FILE_PATTERN = /\.(ttf|otf)$/;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Report whether any rendered pixel came out bright.
 *
 * @param pixels - Gray8 bytes ffmpeg wrote to stdout
 * @returns True when at least one byte is above 128
 */
function hasBrightPixel(pixels: Buffer): boolean {
  for (const pixel of pixels) {
    if (pixel > 128) {
      return true;
    }
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('resolves the bundled font folder as an absolute path', (): void => {
  const dir = bundledFontDir();
  expect(path.isAbsolute(dir)).toBe(true);
  expect(dir.endsWith(FONT_DIR_SUFFIX)).toBe(true);
  expect(dir.endsWith(path.sep)).toBe(false);
  expect(statSync(dir).isDirectory()).toBe(true);
});

it('resolves the bundled font as a regular file above the size floor', (): void => {
  const filePath = bundledFontPath();
  expect(path.isAbsolute(filePath)).toBe(true);
  expect(path.basename(filePath)).toBe(BUNDLED_FONT_FILE);
  expect(filePath.endsWith('.ttf')).toBe(true);
  const stats = statSync(filePath);
  expect(stats.isFile()).toBe(true);
  expect(stats.size).toBeGreaterThan(MIN_FONT_BYTES);
});

it('holds font files only, because the filter reads every entry', (): void => {
  const entries = readdirSync(bundledFontDir(), { withFileTypes: true });
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(entry.isFile()).toBe(true);
    expect(FONT_FILE_PATTERN.test(entry.name)).toBe(true);
  }
});

it('ships the font licence beside the fonts, never inside', (): void => {
  const licencePath = fileURLToPath(LICENCE_URL);
  expect(existsSync(licencePath)).toBe(true);
  expect(readFileSync(licencePath, 'utf8')).toContain('SIL Open Font License');
  expect(licencePath.startsWith(bundledFontDir())).toBe(false);
});

it('keeps the font path inside the filter safe set', (): void => {
  expect(isFilterSafePath(bundledFontPath())).toBe(true);
});

it('returns the font path while the install is intact', (): void => {
  expect(assertBundledFont('video_add_text_overlay')).toBe(bundledFontPath());
});

describe('renders with the bundled font', { timeout: RENDER_TIMEOUT_MS }, (): void => {
  let ffmpegPath = '';

  beforeAll(async (): Promise<void> => {
    const binary = await resolveTestBinary('ffmpeg');
    if (binary === undefined) {
      throw new Error('ffmpeg is not available for the font render.');
    }
    ffmpegPath = binary;
  });

  it('draws white glyphs on a black frame', (): void => {
    const fontOption = quoteFilterValue(bundledFontPath());
    const filter = "drawtext=text='Ag':expansion=none:"
      + `fontfile=${fontOption}:fontsize=40:fontcolor=#FFFFFF:x=10:y=10`;
    const run = spawnSync(
      ffmpegPath,
      [
        '-hide_banner',
        '-nostdin',
        '-n',
        '-f',
        'lavfi',
        '-i',
        'color=c=black:s=160x120:d=0.1',
        '-vf',
        filter,
        '-frames:v',
        '1',
        '-f',
        'rawvideo',
        '-pix_fmt',
        'gray',
        '-',
      ],
      { maxBuffer: 8 * 1024 * 1024 },
    );
    expect(run.status).toBe(0);
    expect(run.stdout.length).toBeGreaterThan(0);
    expect(hasBrightPixel(run.stdout)).toBe(true);
  });
});
