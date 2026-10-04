// ───────────────────────────────────────────────────────────────────
// MODULE: Vitest Config
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

// Set by `npm run test:pinned` to the folder holding the pinned ffmpeg and ffprobe.
const PINNED_BIN_DIR = process.env['MEDIA_EDITOR_TEST_BIN_DIR'] ?? '';

// The two static packages name the development binaries, so a pinned run points
// them at the pinned pair. Only the tests see these aliases, never the bundle.
const PINNED_ALIASES: Record<string, string> = PINNED_BIN_DIR.length === 0
  ? {}
  : {
    'ffmpeg-static': helperPath('pinned-ffmpeg-static.ts'),
    'ffprobe-static': helperPath('pinned-ffprobe-static.ts'),
  };

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function helperPath(fileName: string): string {
  return fileURLToPath(new URL(`./tests/helpers/${fileName}`, import.meta.url));
}

// ───────────────────────────────────────────────────────────────────
// 4. EXPORTS
// ───────────────────────────────────────────────────────────────────

export default defineConfig({
  resolve: {
    alias: PINNED_ALIASES,
  },
  test: {
    include: ['tests/**/*.vitest.ts'],
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
  },
});
