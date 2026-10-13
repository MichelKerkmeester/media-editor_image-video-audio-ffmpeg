---
title: "tests/fixtures: fixture clips"
description: "Five small solid-colour MP4 clips from misbahsy/video-audio-mcp under the MIT licence, used by the concat, fade, b-roll and image suites."
trigger_phrases:
  - "test fixtures"
  - "fixture clips"
---

# tests/fixtures: fixture clips

---

## 1. OVERVIEW

These five clips come from misbahsy/video-audio-mcp under the MIT licence.

Copyright (c) 2025 misbahsy

Each clip is a solid-color MP4 with one H.264 video stream and no audio stream. Larger media is generated at test time.

Suites reach them through `fixturePath` and `copyFixture` in `../helpers/`. A tool suite copies a clip into its sandbox before a tool reads it, so no tool call can change a file here.

---

## 2. FILES

| File | What it is | Duration | Resolution | Codec | Bytes |
| --- | --- | --- | --- | --- | --- |
| `main_video.mp4` | Solid black main timeline | 10 s | 640x360 | h264, High, yuv420p, 30 fps | 12127 |
| `short_video1.mp4` | Solid green clip | 5 s | 640x360 | h264, High, yuv420p, 30 fps | 6855 |
| `short_video2.mp4` | Solid yellow clip | 4 s | 640x360 | h264, High, yuv420p, 30 fps | 5802 |
| `broll1.mp4` | Solid red b-roll clip | 3 s | 640x360 | h264, High, yuv420p, 30 fps | 4770 |
| `broll2.mp4` | Solid blue b-roll clip | 2 s | 640x360 | h264, High, yuv420p, 30 fps | 3717 |

---

## 3. USED BY

| Suite | Why |
|-------|-----|
| `../tools/composition/concat.vitest.ts`, `concat-xfade.vitest.ts` | Clips to join |
| `../tools/composition/add-b-roll.vitest.ts` | A main timeline and b-roll clips |
| `../tools/composition/add-fade.vitest.ts` | A clip to fade |
| `../tools/image/probe.vitest.ts`, `sharp-output.vitest.ts` | A file that is not an image |
| `../helpers/media.vitest.ts`, `composition-media.vitest.ts` | The fixture helpers themselves |

---

## 4. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../helpers/README.md`](../helpers/README.md): `fixturePath` and `copyFixture`
