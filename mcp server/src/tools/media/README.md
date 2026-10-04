---
title: "media: health, probe, repair, silence and ffmpeg setup"
description: "The five media tools: server health, ffprobe metadata, file repair, silence removal and the consent-gated ffmpeg install."
trigger_phrases:
  - "media health tool"
  - "media repair"
  - "media setup ffmpeg"
  - "remove silence"
---

# media: health, probe, repair, silence and ffmpeg setup

---

## 1. OVERVIEW

`src/tools/media/` holds the tools that work on any media type or on the server itself. Two are read-only reports, two rewrite a file through the shared runners in `../video/copy-then-encode.ts` and one installs ffmpeg.

Current state:

- `media_health` is the diagnostic entry point. It reports the server version, where ffmpeg and ffprobe were found, their encoders and filters, the image engine versions and the folders and limits in effect.
- `media_setup_ffmpeg` downloads only on a call with `consent: true`. When a binary the call asks for is missing, a call without it returns the planned download in a `CONSENT_REQUIRED` error, and the tool description tells the model to show that plan to the user first.
- `video_hls_ladder` lives in `../video/hls-ladder.ts`, although its tests sit in `tests/tools/media/`.

---

## 2. KEY FILES

| File | Tool | Responsibility |
|------|------|----------------|
| `health.ts` | `media_health` | Read-only report of binaries, capabilities, image engines, folders and limits |
| `probe.ts` | `media_probe` | Read-only ffprobe report: format, duration, size and bit rate, plus codec, picture size, frame rate, sample rate and channel layout per stream |
| `repair.ts` | `media_repair` | Diagnoses a damaged file with ffprobe, then runs `remux`, `reencode` or `auto`, which tries the remux and checks it decodes before falling back to the re-encode |
| `remove-silence.ts` | `media_remove_silence` | Finds silent stretches with `silencedetect` and keeps the rest with `select` and `aselect`. A file without silence is copied through `runPipeline` |
| `setup-ffmpeg.ts` | `media_setup_ffmpeg` | Plans, downloads, checks and installs a pinned ffmpeg or ffprobe into the data folder, one call at a time. `createSetupFfmpegTool(deps)` builds a copy with test doubles |

---

## 3. BOUNDARIES AND FLOW

| Boundary | Rule |
|----------|------|
| Imports | `../../server/` for `defineTool` and `ToolContext`, `../../core/` for probing, capabilities, pinned builds and downloads, `../video/copy-then-encode.ts` for the runners |
| Writes | `repair.ts` and `remove-silence.ts` write only through the runners. `setup-ffmpeg.ts` writes only inside the data folder |
| Network | Only `setup-ffmpeg.ts` downloads, and only the URLs in `../../core/pinned-builds.ts` |

`media_setup_ffmpeg` flow:

```text
call without consent ─▶ plan: URL, size, SHA-256, destination ─▶ CONSENT_REQUIRED
call with consent    ─▶ download to a work folder ─▶ archive digest check
                     ─▶ unpack ─▶ binary digest check ─▶ place ─▶ install.json
```

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools/media tests/tools/composition/remove-silence.vitest.ts
```

Expected result: `Test Files  8 passed (8)`.

---

## 5. RELATED

- [`../README.md`](../README.md): All tool groups
- [`../video/README.md`](../video/README.md): The runners these tools share
- [`../../core/README.md`](../../core/README.md): Pinned builds, downloads and the resolver
- [`../../../tests/tools/media/README.md`](../../../tests/tools/media/README.md): Media tool tests
