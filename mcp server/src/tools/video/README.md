---
title: "video: ffmpeg video tools and runners"
description: "The twenty video tools and copy-then-encode.ts, the shared runner that every ffmpeg tool uses to try attempts in a temp folder and keep one result."
trigger_phrases:
  - "media editor video tools"
  - "copy then encode"
  - "runAttempts runPipeline"
---

# video: ffmpeg video tools and runners

---

## 1. OVERVIEW

`src/tools/video/` holds the video tools and `copy-then-encode.ts`, the runner every ffmpeg tool in the package uses. A tool describes its work as ffmpeg argument lists, and the runner executes them in a private temp folder, checks the file and moves the one it keeps into a new numbered folder.

Current state:

- Most tools copy the streams they do not change and re-encode only when the copy fails, which adds a warning to the result. The audio fallback is AAC and the picture fallback is H.264.
- `video_set_speed`, `video_convert_properties`, `video_add_b_roll` and `video_hls_ladder` encode every stream on every call.
- `assertPortableMp4` refuses an MP4, M4A or M4V file that would keep PCM audio or an FFV1 picture, so that copy counts as failed on every ffmpeg build and the next attempt re-encodes.

---

## 2. ARCHITECTURE

```text
video tool ──▶ copy-then-encode.ts   one private temp folder per call
                 │
                 ├─▶ runAttempts        first attempt that passes
                 ├─▶ runPipeline        several passes, one product
                 └─▶ runInOutputFolder  many files, written in place
                 │
                 ▼
new numbered folder ──▶ readBack ──▶ successResult
```

---

## 3. KEY FILES

| File | Tool | Runner |
|------|------|--------|
| `copy-then-encode.ts` | Shared: `runAttempts`, `runPipeline`, `runInOutputFolder`, `assertPortableMp4`, `joinStderrTails` | |
| `trim.ts` | `video_trim`: cuts one video to the span between two times | `runAttempts` |
| `convert.ts` | `video_convert`: changes the container | `runAttempts` |
| `convert-properties.ts` | `video_convert_properties`: changes the container and encoding properties in one pass | `runAttempts` |
| `set-codec.ts` | `video_set_codec`: re-encodes the picture as `libx264`, `libx265` or `libvpx-vp9` | `runAttempts` |
| `set-bitrate.ts` | `video_set_bitrate`: re-encodes the picture at a target bitrate | `runAttempts` |
| `set-frame-rate.ts` | `video_set_frame_rate`: re-encodes the picture at a target frame rate | `runAttempts` |
| `set-resolution.ts` | `video_set_resolution`: scales to a target picture size | `runAttempts` |
| `set-aspect-ratio.ts` | `video_set_aspect_ratio`: pads or crops to a target ratio | `runAttempts` |
| `set-speed.ts` | `video_set_speed`: changes playback speed, with the audio tempo following | `runAttempts` |
| `set-audio-codec.ts` | `video_set_audio_codec`: re-encodes the audio track as `aac`, `libmp3lame` or `libopus` | `runAttempts` |
| `set-audio-bitrate.ts` | `video_set_audio_bitrate`: re-encodes the audio track at a target bitrate | `runAttempts` |
| `set-audio-sample-rate.ts` | `video_set_audio_sample_rate`: re-encodes the audio track at a target sample rate | `runAttempts` |
| `set-audio-channels.ts` | `video_set_audio_channels`: re-encodes the audio track at a target channel count | `runAttempts` |
| `add-fade.ts` | `video_add_fade`: one fade from black at the start or to black at the end | `runAttempts` |
| `add-text-overlay.ts` | `video_add_text_overlay`: timed text, one drawtext filter per element | `runAttempts` |
| `add-image-overlay.ts` | `video_add_image_overlay`: one scaled image for a time span | `runAttempts` |
| `add-subtitles.ts` | `video_add_subtitles`: burns in one SubRip file with the bundled font | `runAttempts` |
| `add-b-roll.ts` | `video_add_b_roll`: timed clips over a main video | `runPipeline` |
| `concat.ts` | `video_concat`: joins two or more videos in order, optionally with transitions | `runPipeline` |
| `hls-ladder.ts` | `video_hls_ladder`: a master playlist plus 1080p, 720p, 480p and 360p rungs | `runInOutputFolder` |

Several modules also export their pure argument and filter builders, such as `trimArgs`, `drawtextFilter` and `xfadeGraph`, so tests can check them without running ffmpeg.

---

## 4. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Imports | `../../server/` for `defineTool`, `ToolContext` and the field schemas, `../../core/` for probing, capabilities, filter escaping and results |
| Consumers | `../audio/` and `../media/` import `copy-then-encode.ts`. No module here imports another tool group |
| Temp files | Every ffmpeg output goes into the runner's temp folder first. Only the kept file reaches the numbered folder |

---

## 5. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools/video tests/tools/composition
```

Expected result: `Test Files  23 passed (23)`. The HLS ladder tests live in `tests/tools/media/`.

---

## 6. RELATED

- [`../README.md`](../README.md): All tool groups
- [`../../../tests/tools/video/README.md`](../../../tests/tools/video/README.md): Video tool and runner tests
- [`../../../tests/tools/composition/README.md`](../../../tests/tools/composition/README.md): Overlay, subtitle, b-roll and concat tests
- [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md): Where the runners sit in a request
