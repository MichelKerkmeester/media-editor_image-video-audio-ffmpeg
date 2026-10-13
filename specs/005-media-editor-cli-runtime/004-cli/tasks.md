---
title: "Tasks: Phase 4: cli"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "cli tasks"
  - "dispatch extraction tasks"
  - "cli verification checklist"
  - "cli process test tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 4: cli

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:notation -->
## Task Notation

| Prefix | Meaning |
|--------|---------|
| `[ ]` | Pending |
| `[x]` | Completed |
| `[P]` | Parallelizable |
| `[B]` | Blocked |

**Task Format**: `T### [P?] Description (file path)`
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Read the approved CLI design and operator decision OD-1, one bare `media-editor` command (`../001-deep-research/research/research.md`, `../001-deep-research/spec.md`) [Read research sections 6 to 8 and 11 and OD-1, then the operator decisions on the plugin `bin/media-editor`, the bare command and the platform default data folder]
- [x] T002 Record baseline test counts and per-call startup cost (`scratch/`) [Baseline 86 files and 1,771 passed with 4 skipped, and the import cost of `all-tools` at 0.13 s warm and 0.40 s first against bare node at 0.02 s]
- [x] T003 [P] Inventory `dispatchToolCall` and `McpError` uses (`runtime/src/`) [Two `McpError` sites, both in `tool-registry.ts`, and one private dispatch, now `dispatchTool` in `src/server/dispatch.ts`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Extract the transport-neutral dispatch module and point the MCP registry at it (`runtime/src/server/tool-registry.ts`, `runtime/src/core/`) [`src/server/dispatch.ts` exports `dispatchTool` with no MCP SDK value import, and `tool-registry.ts` maps its outcomes to the same two `McpError`s]
- [x] T005 Write the CLI entry with `list`, `describe` and `<tool>`, JSON args by flag, file or stdin, and stdout JSON (`runtime/src/cli.ts`) [`src/cli.ts`, built to `dist/cli.js` with a shebang]
- [x] T006 Add exit codes, signal cleanup, preview-to-file, config isolation with working-folder defaults and the persistent cache (`runtime/src/cli.ts`, `runtime/src/core/`) [Exit codes 0, 1, 2, 3, 130 and 143, `terminateAll` and `registerCleanupPath` in `process-runner.ts`, previews under `<dataDir>/previews`, and `PersistentProbeCache` at `<dataDir>/cache/probes.json`]
- [x] T007 Add the `media-editor` bin and ship `dist/cli.js` in bundles and the plugin (`runtime/package.json`, `runtime/scripts/`) [`bin.media-editor` in `package.json`, and `build-plugin.ts` asserts `server/dist/cli.js` and emits `bin/media-editor` (0755) and `bin/media-editor.cmd`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T008 [P] Write handler tests with `createSandbox` and process tests that spawn `dist/cli.js` (`runtime/tests/cli/`) [`tests/cli/` holds dispatch (8), cli-process, pinned-smoke and in-flight-outputs tests, plus `tests/core/probe-cache.vitest.ts`]
- [x] T009 Run `npm run test:pinned`, the packaging tests and the bundle and plugin builds (`runtime/`) [`test:pinned` 91 files, 1,821 passed and 4 skipped, packaging 8 files, 146 passed and 2 skipped, `bundle --all` and `plugin` exit 0]
- [x] T010 Convert four PNGs through `media-editor` from a scratch folder and record the JSON (`scratch/`) [Four PNGs through the plugin shim with `targetFolder` and `maxBytes` 100000 landed as 99,728, 70,670, 78,556 and 61,128 bytes in `<scratch>/media files/export/001 - webp-under-100kb/`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Manual verification passed [plugin shim `list`, four-PNG conversion and a live `media_setup_ffmpeg` then `health`]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- **Specification**: See `spec.md`
- **Plan**: See `plan.md`
<!-- /ANCHOR:cross-refs -->

---

## Verification Checklist

<!-- ANCHOR:protocol -->
## Verification Protocol

| Priority | Handling | Completion Impact |
|----------|----------|-------------------|
| **[P0]** | HARD BLOCKER | Cannot claim done until complete |
| **[P1]** | Required | Must complete OR get user approval |
| **[P2]** | Optional | Can defer with documented reason |
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented in spec.md [spec.md REQ-001 to REQ-011]
- [x] CHK-002 [P0] Technical approach defined in plan.md [plan.md]
- [x] CHK-003 [P1] CLI design approved by the operator [Operator decisions on the plugin bin, the bare command and the data folder, relayed by the coordinator]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npm run typecheck` passes [`npm run typecheck` exit 0]
- [x] CHK-011 [P0] No code comment names a spec path, phase or task id [`rg` for spec paths, phase numbers and task ids over `src`, `scripts` and the new tests found none]
- [x] CHK-012 [P1] Usage errors print a message, never a stack trace [Bad JSON, unknown tool, unknown flag, no command and a missing args file each print one line on stderr with exit 2 and no `at` frame]
- [x] CHK-013 [P1] Code reviewed by a model that did not write it [DeepSeek V4.1 Flash reviewed the code in 7 batches and then the fix round. Accepted findings were fixed, and the rest were ruled with evidence in implementation-summary.md]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [acceptance-criteria.md AC-001 to AC-011 all Met]
- [x] CHK-021 [P0] Full MCP suite passes with the baseline counts plus the new tests [91 files, 1,821 passed and 4 skipped, against 86 files and 1,771 passed before]
- [x] CHK-022 [P1] Flag, file and stdin args each tested [`converts into one numbered folder with --args`, `--args-file` and `stdin`]
- [x] CHK-023 [P1] SIGINT and SIGTERM leave no ffmpeg child or temp folder [`kills the encode and cleans up on SIGTERM` (143) and `on SIGINT` (130) check that no ffmpeg child and no output folder are left]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] The dispatch extraction is `cross-consumer`: MCP and the CLI both consume it. [`tool-registry.ts:138` and `cli.ts:382` both call `dispatchTool`]
- [x] CHK-FIX-002 [P0] Every `McpError` raised on a handler path is inventoried and mapped. [MethodNotFound for an unknown tool and InvalidParams for bad arguments, both mapped from dispatch outcomes and checked against MCP messages in `dispatch.vitest.ts`]
- [x] CHK-FIX-003 [P0] Every caller of the old private dispatch now calls the shared module. [No caller of the old private dispatch is left, and `rg dispatchTool` finds only the registry, the CLI and tests]
- [x] CHK-FIX-004 [P0] Config isolation has tests for a bare token, an outside folder, empty argv and a `--` flag. [`rejects a bare token`, `opens an outside folder through --allowed-dir`, `treats no command as a usage error` and `treats a bare double dash as a usage error`]
- [x] CHK-FIX-005 [P1] The args source by outcome by signal matrix is listed with its row count. [The 27-cell matrix and its 11 tested rows are listed in implementation-summary.md]
- [x] CHK-FIX-006 [P1] Tests set `MEDIA_EDITOR_DATA_DIR` to a sandbox so no real data folder is read. [`childEnv` and the pinned smoke set `HOME` and `MEDIA_EDITOR_DATA_DIR` to the sandbox]
- [x] CHK-FIX-007 [P1] Evidence is pinned to an explicit diff range in the nested repository. [Media Editor `044df9c` and parent `805794e0` to the working tree]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets [None added]
- [x] CHK-031 [P0] JSON args validated by the zod schema before any file is touched [`dispatchTool` parses with the tool zod schema before the handler runs, and invalid arguments exit 2 before any file is touched]
- [x] CHK-032 [P1] The CLI enforces the same allowed folders as MCP [The CLI builds its config through `loadConfig`, and an outside input exits 1 with `PATH_NOT_ALLOWED`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized [Tasks, criteria and summary updated together]
- [x] CHK-041 [P1] Runtime README documents the CLI commands and exit codes [`runtime/README.md` section 5 COMMAND LINE has the commands and the exit code table]
- [x] CHK-042 [P2] Startup cost before and after the cache recorded [Through the plugin shim, `health` 168 ms cold and 113 ms warm, `media_probe` 186 ms cold and 168 ms warm, medians of 7]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only [Proof runs used the session scratchpad outside the repository]
- [x] CHK-051 [P1] scratch/ cleaned before completion [`scratch/` holds only `.gitkeep`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 13/13 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-04
<!-- /ANCHOR:summary -->

---
