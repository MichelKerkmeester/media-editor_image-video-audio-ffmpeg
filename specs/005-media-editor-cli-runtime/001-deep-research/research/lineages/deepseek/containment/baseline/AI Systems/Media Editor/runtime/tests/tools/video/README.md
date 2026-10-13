---
title: "tests/tools/video: video tool and runner suites"
description: "One suite per single-input video tool, plus the suite for the copy-then-encode runner every ffmpeg tool uses."
trigger_phrases:
  - "video tool tests"
  - "copy then encode tests"
---

# tests/tools/video: video tool and runner suites

---

## 1. OVERVIEW

`tests/tools/video/` covers the video tools that take one input and change its picture, sound, container or timing, and `copy-then-encode.ts`, the runner behind every ffmpeg tool. Ten suites, for `video_trim` and every `set-*` tool except `video_set_speed`, include a case where the stream copy cannot work, so the fallback re-encode and its warning are tested on every build the suite runs on.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `copy-then-encode.vitest.ts` | `runAttempts`, `runPipeline`, `runInOutputFolder` and `assertPortableMp4`: attempt order, temp folder cleanup, kept file names and MP4 refusals |
| `trim.vitest.ts` | `video_trim` |
| `convert.vitest.ts` | `video_convert` |
| `convert-properties.vitest.ts` | `video_convert_properties` |
| `set-codec.vitest.ts` | `video_set_codec` |
| `set-bitrate.vitest.ts` | `video_set_bitrate` |
| `set-frame-rate.vitest.ts` | `video_set_frame_rate` |
| `set-resolution.vitest.ts` | `video_set_resolution` |
| `set-aspect-ratio.vitest.ts` | `video_set_aspect_ratio` |
| `set-speed.vitest.ts` | `video_set_speed` |
| `set-audio-codec.vitest.ts` | `video_set_audio_codec` |
| `set-audio-bitrate.vitest.ts` | `video_set_audio_bitrate` |
| `set-audio-sample-rate.vitest.ts` | `video_set_audio_sample_rate` |
| `set-audio-channels.vitest.ts` | `video_set_audio_channels` |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/tools/video
```

Expected result: `Test Files  14 passed (14)`.

---

## 4. RELATED

- [`../README.md`](../README.md): All tool suites
- [`../../../src/tools/video/README.md`](../../../src/tools/video/README.md): The video tools and the runner
