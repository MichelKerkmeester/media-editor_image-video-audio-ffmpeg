---
title: "tests/tools/composition: composition suites"
description: "Suites for the tools that combine or overlay media: text, images, subtitles, fades, b-roll, concat and silence removal, plus the capability gates they share."
trigger_phrases:
  - "composition tests"
  - "overlay tests"
  - "concat tests"
---

# tests/tools/composition: composition suites

---

## 1. OVERVIEW

`tests/tools/composition/` covers the tools that build a filter graph from several inputs or several elements. Seven of the nine suites sample frames with `meanLuma` and `meanColor` to prove an overlay, fade or transition landed where it should. They take tone and silence patterns, SubRip files and overlay images from `composition-media.ts`.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `add-text-overlay.vitest.ts` | `video_add_text_overlay` |
| `add-image-overlay.vitest.ts` | `video_add_image_overlay` |
| `add-subtitles.vitest.ts` | `video_add_subtitles` |
| `add-fade.vitest.ts` | `video_add_fade` |
| `add-b-roll.vitest.ts` | `video_add_b_roll` |
| `concat.vitest.ts` | `video_concat` without transitions |
| `concat-xfade.vitest.ts` | `video_concat` with xfade transitions, mixed sound and three clips |
| `remove-silence.vitest.ts` | `media_remove_silence` |
| `capability-gating.vitest.ts` | Each composition tool refused before ffmpeg runs when a filter or encoder it needs is missing, and the calls that still work without one |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/tools/composition
```

Expected result: `Test Files  9 passed (9)`.

---

## 4. RELATED

- [`../README.md`](../README.md): All tool suites
- [`../../../src/tools/video/README.md`](../../../src/tools/video/README.md): The composition tools and their runners
- [`../../../src/tools/media/README.md`](../../../src/tools/media/README.md): `media_remove_silence`
