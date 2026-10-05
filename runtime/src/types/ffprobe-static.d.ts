// ───────────────────────────────────────────────────────────────────
// MODULE: ffprobe-static
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

declare module 'ffprobe-static' {
  /**
   * Default interop shape of the untyped CommonJS package (`exports.path`).
   */
  export interface FfprobeStatic {
    path: string;
  }

  const ffprobeStatic: FfprobeStatic;
  export default ffprobeStatic;
}
