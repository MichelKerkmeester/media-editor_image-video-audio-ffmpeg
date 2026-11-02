// ───────────────────────────────────────────────────────────────────
// MODULE: Pinned Ffmpeg Static
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

// ───────────────────────────────────────────────────────────────────
// 2. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** The pinned ffmpeg of a `test:pinned` run, in the shape `ffmpeg-static` exports. */
const pinnedFfmpeg: string = path.join(
  process.env['MEDIA_EDITOR_TEST_BIN_DIR'] ?? '',
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg',
);

export default pinnedFfmpeg;
