---
title: "tests: Media Editor server test suite"
description: "Vitest suites for the core, the server layer, every tool and the packaging scripts, with shared helpers and fixture clips."
trigger_phrases:
  - "media editor tests"
  - "run the media editor suite"
  - "vitest media editor"
---

# tests: Media Editor server test suite

---

## 1. OVERVIEW

`tests/` holds every test the package runs. Vitest picks up `tests/**/*.vitest.ts`, runs each file in its own forked process and allows 60 seconds per test and per hook. Tool tests call the real server through an in-memory MCP client and run real ffmpeg on media the helpers generate.

Current state:

- The media tests need a working ffmpeg and ffprobe, found the way the server finds them. A missing binary fails those tests rather than skipping them.
- Temporary files go under `tests/.tmp/`, which git ignores, and each test removes its own folder.
- Some tests skip on purpose: cases that need another platform or file system, bundle checks when `dist-bundles/` is empty, spawned CLI cases that need the pinned binary pair and resolver checks that apply only to the pinned run.
- No test is an expected failure.

---

## 2. DIRECTORY TREE

```text
tests/
├── smoke.vitest.ts   # Proves the runner itself starts
├── core/             # One suite per src/core module, source-notice.ts aside
├── server/           # Registry, tool context, media fields and a stdio run of the built server
├── cli/              # Shared dispatch checks and spawned runs of the built command
├── tools/            # Tool suites in audio/, composition/, image/, media/ and video/
├── packaging/        # Bundle, plugin, pinned-test and manifest checks
├── helpers/          # Media generators, the in-memory tool client and pinned-run shims
└── fixtures/         # Five small MP4 clips with their licence note
```

---

## 3. CONVENTIONS

| Convention | Rule |
|------------|------|
| File names | `<module>.vitest.ts`, named after the source module or tool it covers |
| Headers | Every file opens with the `MODULE:` box header the package gate checks |
| Tool calls | `createSandbox` makes an allowed folder, an output folder and a data folder, and `withToolClient` connects a client to `createServer` |
| Media | Generated at test time by `helpers/media.ts`, `helpers/composition-media.ts` and `helpers/broken-media.ts`. The fixture clips feed the concat, fade and b-roll suites and two image suites |

---

## 4. COMMANDS

Run from `AI Systems/Media Editor/runtime/`.

| Command | What it runs |
|---------|--------------|
| `npm test` | Every suite on the development ffmpeg |
| `npm run test:pinned` | Every suite on this machine's pinned ffmpeg, after a digest check |
| `npx vitest run tests/core` | One folder |
| `npx vitest run tests/tools/video/trim.vitest.ts` | One file |
| `npm run test:pinned -- tests/tools/video` | One folder on the pinned ffmpeg |

Expected result for `npm run test:pinned`: `Test Files  91 passed (91)` and a `Tests` line with only passed and skipped counts. A plain `npm test` also skips `cli/pinned-smoke.vitest.ts` and the spawned CLI cases that need the pinned pair.

---

## 5. RELATED

- [`core/README.md`](./core/README.md), [`server/README.md`](./server/README.md), [`cli/README.md`](./cli/README.md), [`tools/README.md`](./tools/README.md), [`packaging/README.md`](./packaging/README.md), [`helpers/README.md`](./helpers/README.md), [`fixtures/README.md`](./fixtures/README.md)
- [`../README.md`](../README.md): Package commands
- [`../scripts/README.md`](../scripts/README.md): How the pinned run works
