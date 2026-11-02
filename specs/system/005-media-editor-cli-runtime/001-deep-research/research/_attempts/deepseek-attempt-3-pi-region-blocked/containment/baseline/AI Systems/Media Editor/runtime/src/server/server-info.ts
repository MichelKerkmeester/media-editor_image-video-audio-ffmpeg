// ───────────────────────────────────────────────────────────────────
// MODULE: Server Info
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createRequire } from 'node:module';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Name advertised during MCP initialization. */
export const SERVER_NAME = 'media-editor';

const FALLBACK_VERSION = '0.0.0';

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Read the version from this package's own package.json.
 *
 * A missing file or a non-string version becomes `0.0.0`.
 *
 * @returns The package version
 */
export function readServerVersion(): string {
  try {
    // The same relative path resolves from src/server and from dist/server.
    const loaded: unknown = createRequire(import.meta.url)('../../package.json');
    if (isRecord(loaded) && typeof loaded.version === 'string') {
      return loaded.version;
    }
  } catch {
    // A missing package file is the same case as a missing version.
  }
  return FALLBACK_VERSION;
}
