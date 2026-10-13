// ───────────────────────────────────────────────────────────────────
// MODULE: Package Root
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { ERROR_CODES, MediaError } from '../src/core/errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** The name this package's own package.json carries. */
export const PACKAGE_NAME = 'media-editor-mcp';

// The staged bundle and plugin server carry a copy of this package.json but never the
// source, so the source entry tells the real root apart from them.
const SOURCE_ENTRY = path.join('src', 'index.ts');

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function packageName(root: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch (error: unknown) {
    // A folder without a readable package.json is not the package root either.
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || !('name' in parsed)) {
    return undefined;
  }
  return parsed.name;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Refuses to run a build or test script from any folder but this package's root.
 *
 * @param root - The folder the script started from
 * @param message - The sentence that tells the user where to run the script
 * @throws {@link MediaError} `INVALID_INPUT` with reason `not-package-root` when the
 *   folder has no readable package.json, one that names another package, or no source
 */
export function assertPackageRoot(root: string, message: string): void {
  if (packageName(root) !== PACKAGE_NAME || !existsSync(path.join(root, SOURCE_ENTRY))) {
    throw new MediaError(ERROR_CODES.INVALID_INPUT, message, {
      parameter: 'root',
      value: root,
      reason: 'not-package-root',
    });
  }
}
