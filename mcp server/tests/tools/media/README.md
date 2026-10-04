---
title: "tests/tools/media: media tool suites"
description: "Suites for health, probe, repair, ffmpeg setup and the HLS ladder."
trigger_phrases:
  - "media tool tests"
  - "repair tests"
  - "setup ffmpeg tests"
---

# tests/tools/media: media tool suites

---

## 1. OVERVIEW

`tests/tools/media/` covers the tools in `src/tools/media/`, except `media_remove_silence`, whose suite is in `../composition/`, plus `video_hls_ladder`. The repair suites use the damaged files from `broken-media.ts`. The setup suite replaces the network and the platform with test doubles through `createSetupFfmpegTool`, so it never downloads.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `health.vitest.ts` | `media_health` |
| `probe.vitest.ts` | `media_probe` |
| `repair-diagnose.vitest.ts` | `media_repair` diagnosis, `remux` repairs and failures |
| `repair-strategies.vitest.ts` | `media_repair` `reencode` and `auto` on cut, unindexed, silent and cover-art files |
| `setup-ffmpeg.vitest.ts` | `media_setup_ffmpeg`: plans, consent, digest checks, placement, cleanup and one call at a time |
| `hls-ladder.vitest.ts` | `video_hls_ladder` playlists, segments and folder layout |
| `hls-rungs.vitest.ts` | `video_hls_ladder` rung selection against source sizes and orientations |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools/media
```

Expected result: `Test Files  7 passed (7)`.

---

## 4. RELATED

- [`../README.md`](../README.md): All tool suites
- [`../../../src/tools/media/README.md`](../../../src/tools/media/README.md): The media tools
