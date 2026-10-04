---
title: "tests/tools: tool suites"
description: "One suite per tool, grouped by what the tools do, each calling the real server through an in-memory client."
trigger_phrases:
  - "tool tests"
  - "media editor tool suites"
---

# tests/tools: tool suites

---

## 1. OVERVIEW

`tests/tools/` holds the suites that call tools the way a host does. Each suite builds a sandbox with `createSandbox`, connects a client with `withToolClient` and checks the structured result, the files written and the input left unchanged. Most suites generate their media with ffmpeg first, so they need a working ffmpeg and ffprobe.

The folders follow what a tool does rather than where its source lives. Overlays, subtitles, fades, b-roll, concat and silence removal share the helpers in `composition/`, and the HLS ladder sits with the other media tools.

---

## 2. DIRECTORY TREE

```text
tools/
├── audio/         # The six audio tools
├── composition/   # Overlays, subtitles, fade, b-roll, concat, silence removal, capability gates
├── image/         # The eight image tools, sharp-output and cross-tool image checks
├── media/         # Health, probe, previews, rename, placement, repair, ffmpeg setup and the HLS ladder
└── video/         # Trim, convert, the set-* tools, speed and the copy-then-encode runner
```

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools
```

Expected result: `Test Files  50 passed (50)`.

---

## 4. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../../src/tools/README.md`](../../src/tools/README.md): The tool modules
- [`../helpers/README.md`](../helpers/README.md): Sandbox, client and media generators
