---
title: "media: health, probe, rename, repair, silence and ffmpeg setup"
description: "The six media tools: server health, ffprobe metadata, renaming a result, file repair, silence removal and the consent-gated ffmpeg install, plus the probe preview."
trigger_phrases:
  - "media health tool"
  - "media repair"
  - "media rename"
  - "media setup ffmpeg"
  - "remove silence"
---

# media: health, probe, rename, repair, silence and ffmpeg setup

---

## 1. OVERVIEW

`src/tools/media/` holds the tools that work on any media type or on the server itself. Two are read-only reports, one renames a result, two rewrite a file through the shared runners in `../video/copy-then-encode.ts` and one installs ffmpeg. `preview.ts` is not a tool: it adds the optional picture that `media_probe` and `image_probe` return.

Current state:

- `media_health` is the diagnostic entry point. It reports the server version, where ffmpeg and ffprobe were found, their encoders and filters, the image engine versions and the folders and limits in effect.
- `media_setup_ffmpeg` downloads only on a call with `consent: true`. When a binary the call asks for is missing, a call without it returns the planned download in a `CONSENT_REQUIRED` error, and the tool description tells the model to show that plan to the user first.
- `media_rename` renames one file inside the export folder only. It keeps the extension and the folder and moves by hard link and unlink, so an existing file is never replaced.
- `preview: true` on a probe returns a JPEG of at most 512 pixels, or one video frame a quarter of the way in. Audio has no picture, so it gets a warning, and a failed preview is a warning too.
- `video_hls_ladder` lives in `../video/hls-ladder.ts`, although its tests sit in `tests/tools/media/`.

---

## 2. KEY FILES

| File | Tool | Responsibility |
|------|------|----------------|
| `health.ts` | `media_health` | Read-only report of binaries, capabilities, image engines, folders and limits |
| `probe.ts` | `media_probe` | Read-only ffprobe report: format, duration, size and bit rate, plus codec, picture size, frame rate, sample rate and channel layout per stream |
| `rename.ts` | `media_rename` | Slugs the new name with `readableFileName`, keeps the extension and the folder and never overwrites. A file outside the export folder is `PATH_NOT_ALLOWED` |
| `preview.ts` | (helper) | `previewField` and `withPreviewBlock`: sharp scales an image, or an ffmpeg frame from a video, to a small JPEG image block for the probes |
| `repair.ts` | `media_repair` | Diagnoses a damaged file with ffprobe, then runs `remux`, `reencode` or `auto`, which tries the remux and checks it decodes before falling back to the re-encode |
| `remove-silence.ts` | `media_remove_silence` | Finds silent stretches with `silencedetect` and keeps the rest with `select` and `aselect`. A file without silence is copied through `runPipeline` |
| `setup-ffmpeg.ts` | `media_setup_ffmpeg` | Plans, downloads, checks and installs a pinned ffmpeg or ffprobe into the data folder, one call at a time. `createSetupFfmpegTool(deps)` builds a copy with test doubles |

---

## 3. BOUNDARIES AND FLOW

| Boundary | Rule |
|----------|------|
| Imports | `../../server/` for `defineTool`, `ToolContext` and the field schemas, `../../core/` for probing, capabilities, pinned builds and downloads, `../video/copy-then-encode.ts` for the runners |
| Writes | `repair.ts` and `remove-silence.ts` write only through the runners. `rename.ts` moves a file only inside the export folder. `preview.ts` writes a video frame only to a temporary folder it removes. `setup-ffmpeg.ts` writes only inside the data folder |
| Network | Only `setup-ffmpeg.ts` downloads, and only the URLs in `../../core/pinned-builds.ts` |

`media_setup_ffmpeg` flow:

```text
call without consent ─▶ plan: URL, size, SHA-256, destination ─▶ CONSENT_REQUIRED
call with consent    ─▶ download to a work folder ─▶ archive digest check
                     ─▶ unpack ─▶ binary digest check ─▶ place ─▶ install.json
```

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/tools/media tests/tools/composition/remove-silence.vitest.ts
```

Expected result: `Test Files  11 passed (11)`.

---

## 5. RELATED

- [`../README.md`](../README.md): All tool groups
- [`../video/README.md`](../video/README.md): The runners these tools share
- [`../../core/README.md`](../../core/README.md): Pinned builds, downloads and the resolver
- [`../../../tests/tools/media/README.md`](../../../tests/tools/media/README.md): Media tool tests
