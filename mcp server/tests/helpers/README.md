---
title: "tests/helpers: shared test helpers"
description: "Media generators, the in-memory tool client and the pinned-run shims every suite shares, each generator with a suite of its own."
trigger_phrases:
  - "test helpers"
  - "tool client sandbox"
  - "generate test media"
---

# tests/helpers: shared test helpers

---

## 1. OVERVIEW

`tests/helpers/` holds the code suites import to build media, call tools and point the pinned run at its binaries. The three media generators each have a suite of their own, so a broken generator fails there first rather than in every tool suite.

---

## 2. KEY FILES

| File | Responsibility |
|------|----------------|
| `tool-client.ts` | `createSandbox` for an allowed folder, output folder and data folder. `withToolClient` connects an in-memory MCP client to `createServer`. `callTool`, `expectProtocolError`, `listFolders`, `sha256Of` |
| `media.ts` | `generateVideo`, `generateAudio`, `generateImage`, `buildOversizedPng`, `probeJson`, `fixturePath` and `resolveTestBinary`. `makeTempDir` and `removeTempDir` work under `tests/.tmp/` |
| `composition-media.ts` | Tone and silence patterns, SubRip files, overlay PNGs, fixture copies and frame sampling with `meanLuma` and `meanColor` |
| `broken-media.ts` | Damaged files for the repair tests: unindexed Matroska, cut MP4 and M4A, index-less MP4, Matroska named `.mp4`, cover-art MP3 and an empty file. `decodeErrorLines` counts the errors ffmpeg logs while decoding a file |
| `media.vitest.ts`, `composition-media.vitest.ts`, `broken-media.vitest.ts` | Suites for the three generators |
| `pinned-ffmpeg-static.ts`, `pinned-ffprobe-static.ts` | Shims that name the pinned binaries. `vitest.config.ts` aliases `ffmpeg-static` and `ffprobe-static` to them only when `MEDIA_EDITOR_TEST_BIN_DIR` is set |

---

## 3. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Binaries | `resolveTestBinary` uses the server's own resolver with no overrides and no installed copy, so the tests run the binary a fresh server would |
| Temp files | Generators write into the folder the caller passes, which suites create with `makeTempDir` inside `tests/.tmp/` |
| Shims | Nothing imports the pinned shims by path. They reach the code only through the vitest aliases |

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/helpers
```

Expected result: `Test Files  3 passed (3)`.

---

## 5. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../fixtures/README.md`](../fixtures/README.md): The clips `fixturePath` names
- [`../../scripts/README.md`](../../scripts/README.md): The pinned run that sets `MEDIA_EDITOR_TEST_BIN_DIR`
