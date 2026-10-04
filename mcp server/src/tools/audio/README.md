---
title: "audio: ffmpeg audio tools"
description: "The six audio tools, each one ffmpeg encode run through the shared attempt runner into a new numbered folder."
trigger_phrases:
  - "media editor audio tools"
  - "audio extract convert"
---

# audio: ffmpeg audio tools

---

## 1. OVERVIEW

`src/tools/audio/` holds the tools that write audio files. Each one probes its input, checks the encoder it needs and runs a single ffmpeg encode through `runAttempts` from `../video/copy-then-encode.ts`. None of them tries a stream copy first, so each call returns an encoded file or a `PROCESS_FAILED` error with ffmpeg's stderr tail.

Current state:

- Containers and encoders come from `../../core/media-containers.ts`, where aliases such as `aac` for the M4A container and `mp3` for `libmp3lame` are resolved.
- Every tool refuses an input without an audio stream. `audio_extract`, `audio_convert` and `audio_convert_properties` also take a video file and keep only its audio. The three `set-*` tools need an audio container and write that container back.

---

## 2. KEY FILES

| File | Responsibility |
|------|----------------|
| `extract.ts` | `audio_extract`: writes the audio track of a video or audio file into a file of its own |
| `convert.ts` | `audio_convert`: changes the container of one audio file, encoding with that container's default encoder |
| `convert-properties.ts` | `audio_convert_properties`: changes the container and can set bitrate, sample rate and channel count in the same pass |
| `set-bitrate.ts` | `audio_set_bitrate`: re-encodes at a target bitrate |
| `set-sample-rate.ts` | `audio_set_sample_rate`: re-encodes at a target sample rate |
| `set-channels.ts` | `audio_set_channels`: re-encodes at a target channel count |

---

## 3. BOUNDARIES AND FLOW

| Boundary | Rule |
|----------|------|
| Imports | `../../server/` for `defineTool`, `ToolContext` and the field schemas, `../../core/` for probing and containers, `../video/copy-then-encode.ts` for `runAttempts` |
| Output | One file per call, named `<stem>-<operation><extension>` in a new numbered folder |

```text
resolveInput ─▶ probeMedia ─▶ requireAudioStream ─▶ assertCapabilities
             ─▶ runAttempts (one encode) ─▶ readBack ─▶ successResult
```

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools/audio
```

Expected result: `Test Files  6 passed (6)`.

---

## 5. RELATED

- [`../README.md`](../README.md): All tool groups
- [`../video/README.md`](../video/README.md): The shared runner in `copy-then-encode.ts`
- [`../../../tests/tools/audio/README.md`](../../../tests/tools/audio/README.md): Audio tool tests
