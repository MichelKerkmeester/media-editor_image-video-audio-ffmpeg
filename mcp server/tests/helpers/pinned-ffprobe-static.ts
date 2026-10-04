// ───────────────────────────────────────────────────────────────────
// MODULE: Pinned Ffprobe Static
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

// ───────────────────────────────────────────────────────────────────
// 2. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** The pinned ffprobe of a `test:pinned` run, in the shape `ffprobe-static` exports. */
const pinnedFfprobe: { readonly path: string } = {
  path: path.join(
    process.env['MEDIA_EDITOR_TEST_BIN_DIR'] ?? '',
    process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe',
  ),
};

export default pinnedFfprobe;
