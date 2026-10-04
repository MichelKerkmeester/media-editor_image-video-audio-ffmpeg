---
title: "tests/tools/audio: audio tool suites"
description: "One suite per audio tool, each run against generated tones through the in-memory client."
trigger_phrases:
  - "audio tool tests"
---

# tests/tools/audio: audio tool suites

---

## 1. OVERVIEW

`tests/tools/audio/` covers the six tools in `src/tools/audio/`. Each suite generates its input with `generateAudio` or `generateVideo` and checks the codec, container and properties of the written file with ffprobe.

---

## 2. KEY FILES

| File | Tool |
|------|------|
| `extract.vitest.ts` | `audio_extract` |
| `convert.vitest.ts` | `audio_convert` |
| `convert-properties.vitest.ts` | `audio_convert_properties` |
| `set-bitrate.vitest.ts` | `audio_set_bitrate` |
| `set-sample-rate.vitest.ts` | `audio_set_sample_rate` |
| `set-channels.vitest.ts` | `audio_set_channels` |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools/audio
```

Expected result: `Test Files  6 passed (6)`.

---

## 4. RELATED

- [`../README.md`](../README.md): All tool suites
- [`../../../src/tools/audio/README.md`](../../../src/tools/audio/README.md): The audio tools
