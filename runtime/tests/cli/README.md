---
title: "tests/cli: command line suites"
description: "Suites for the shared dispatch module, the built media-editor command run as a child process and the pinned smoke check."
trigger_phrases:
  - "cli tests"
  - "media-editor cli test"
  - "command line tests"
---

# tests/cli: command line suites

---

## 1. OVERVIEW

`tests/cli/` checks the command line entry of the package. `dispatch.vitest.ts` works in memory against the dispatch module the server and the command share. `cli-process.vitest.ts` runs `npm run build` once, spawns `dist/cli.js` per test like `tests/server/stdio.vitest.ts` does and gives every child its own sandbox: working folder, `HOME` and `MEDIA_EDITOR_DATA_DIR` inside it and the other `MEDIA_EDITOR_*` variables removed.

The spawned suites run the real resolver, so cases that need a working ffprobe pair, the signal runs, the installed-binary check and the pinned smoke check, run only where `MEDIA_EDITOR_TEST_BIN_DIR` supplies the pinned pair. `npm run test:pinned` sets it and they all run there. A plain `npm test` skips them with a reason.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `dispatch.vitest.ts` | `dispatchTool`: unknown-tool and invalid-arguments outcomes with the MCP messages, handler failure mapping and placement fields. Parity between the CLI tool list and `listTools`, one call made both ways, and a source check that dispatch has no MCP import |
| `cli-process.vitest.ts` | The built command in a child: `list`, `describe` and `health`, `list` started through a symlink, arguments from `--args`, `--args-file` and stdin, unknown-tool precedence over bad argument sources, every error exit code, previews under the data folder, allowed-root and output-folder isolation, SIGINT and SIGTERM cleanup plus a bounded exit after SIGTERM, and the probe cache shared between runs |
| `in-flight-outputs.vitest.ts` | Two concurrent MCP calls through a gated probe tool: the still-running call keeps its output folder registered for shutdown cleanup after the finished call released its own |
| `pinned-smoke.vitest.ts` | Under the pinned run only: `health` resolves the pinned ffmpeg and ffprobe through the path overrides and reports a version for each |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/cli
npm run test:pinned -- tests/cli
```

Expected result for a plain run: `Test Files  3 passed | 1 skipped (4)` with five skipped cases and no expected failures. Under the pinned run every file passes and the gated cases run.

---

## 4. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../server/README.md`](../server/README.md): The stdio suite whose spawn pattern this folder follows
- [`../../src/README.md`](../../src/README.md): The entry points these suites cover
