// ───────────────────────────────────────────────────────────────────
// MODULE: Font Path
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ERROR_CODES, MediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** File name of the one font the package ships. */
export const BUNDLED_FONT_FILE = 'SourceSans3-Regular.ttf' as const;

/** Family name the bundled font declares inside a style list. */
export const BUNDLED_FONT_FAMILY = 'Source Sans 3' as const;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRegularFile(candidate: string): boolean {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Absolute path of the folder that holds the bundled font files.
 *
 * The folder resolves from this module, so it holds while the code runs
 * from `src/` and from `dist/` after a build. A filter receives every
 * file in the folder, so it must hold font files only.
 *
 * @returns Absolute path of `assets/fonts/`, with no trailing separator
 */
export function bundledFontDir(): string {
  return path.resolve(fileURLToPath(new URL('../../assets/fonts/', import.meta.url)));
}

/**
 * Absolute path of the font file every text filter receives.
 *
 * @returns Absolute path of the bundled font
 */
export function bundledFontPath(): string {
  return path.join(bundledFontDir(), BUNDLED_FONT_FILE);
}

/**
 * Return the bundled font path, refusing an install that lost its font.
 *
 * A packed server without its font cannot draw text and no caller input
 * can repair that, so the failure is reported as an internal one.
 *
 * @param tool - Tool name that needed the font, recorded on the failure
 * @returns Absolute path of the bundled font file
 * @throws {@link MediaError} `INTERNAL` when the font is not a regular file
 */
export function assertBundledFont(tool: string): string {
  const filePath = bundledFontPath();
  if (!isRegularFile(filePath)) {
    throw new MediaError(
      ERROR_CODES.INTERNAL,
      'The bundled font is missing from this install.',
      { tool, path: filePath },
    );
  }
  return filePath;
}
