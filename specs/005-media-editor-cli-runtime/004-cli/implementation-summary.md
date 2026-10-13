---
title: "Implementation Summary"
description: "The Media Editor runtime now has a media-editor command that runs the same 40 tools as MCP through one shared dispatch module, with a plugin shim and a persistent probe cache."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "005-media-editor-cli-runtime/004-cli"
    last_updated_at: "2026-10-04T18:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Built and verified the CLI"
    next_safe_action: "Start 005-skill-cli-only"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
# Implementation Summary

<!-- SPECKIT_LEVEL: 2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 004-cli |
| **Completed** | 2026-10-04 |
| **Level** | 2 |
| **Evidence range** | Media Editor `2749c54` and parent `0d9d802a` to the working tree |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

A `media-editor` command runs any of the 40 tools from a shell and prints one JSON object on stdout, with logs on stderr. It shares one dispatch module with the MCP server, so both validate and run a tool the same way, and MCP still answers with the same `McpError`s as before.

### Phase 4: cli

Run bare, `media-editor` treats the working folder as its allowed folder, writes to `<cwd>/media files/export` and keeps its data in the platform default data folder. Flags `--allowed-dir`, `--output-dir`, `--data-dir`, `--timeout` and `--json` and the `MEDIA_EDITOR_*` variables still apply, and tool argv never reaches `loadConfig`. Commands are `list`, `describe <tool>`, `health` and `<tool>` with args from `--args`, `--args-file` or stdin. Exit codes are 0 ok, 1 tool error, 2 usage, 3 fatal startup, 130 on SIGINT and 143 on SIGTERM. A signal kills running ffmpeg children and removes the output folders of the call in flight. Previews become JPEG files under `<dataDir>/previews`, and binary resolutions and capability lists persist in `<dataDir>/cache/probes.json`.

### Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `runtime/src/server/dispatch.ts` | Created | `dispatchTool` and its outcomes, with no MCP SDK value import |
| `runtime/src/server/tool-registry.ts` | Modified | Maps the outcomes to `MethodNotFound` and `InvalidParams` |
| `runtime/src/cli.ts` | Created | The command line entry, built to `dist/cli.js` |
| `runtime/src/core/probe-cache.ts` | Created | Persistent cache, revalidated by file size and mtime |
| `runtime/src/core/process-runner.ts` | Modified | `terminateAll`, `registerCleanupPath` and live child tracking |
| `runtime/src/server/tool-context.ts` | Modified | Per-dispatch output tracking and the preview sink |
| `runtime/src/core/ffmpeg-resolver.ts`, `capabilities.ts` | Modified | Read and write the persistent cache, with writes treated as advisory |
| `runtime/src/tools/media/preview.ts`, `media/probe.ts`, `image/probe.ts` | Modified | Write CLI previews to a file and add `previewPath` |
| `runtime/package.json`, `.gitignore`, `scripts/build-plugin.ts` | Modified | `media-editor` bin, plugin `bin/` shims and the `dist/cli.js` check |
| `runtime/tests/cli/`, `tests/core/` and packaging tests | Created or modified | Dispatch parity, process, signal, cache and smoke tests |
| `runtime/README.md`, `ARCHITECTURE.md`, `src/README.md`, `src/server/README.md`, `src/core/README.md` | Modified | Command line section, exit codes, `npm link` and the new modules |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

GPT-6 Luna wrote the core in one run and three fix rounds. SWE 2 wrote the wiring and tests in two runs. DeepSeek V4.1 Flash reviewed the core in 7 batches of 11 to 15 KB, then reviewed the second fix round in 2 batches. Every finding was checked against the code before it was ruled.

| Finding | Ruling |
|---------|--------|
| `describe` schema differs from the MCP listing | Fixed in round 1 |
| Dispatch in `core/` imports `server/` | Fixed in round 1 by moving it to `server/` |
| Symlinked npm bin printed nothing | Found in the prefix install test, fixed in round 2 |
| Unknown tool reported after reading args | Fixed in round 2 |
| Child untracked on `error` before it exits, cleanup paths not snapshotted, grace timer left set | Fixed in round 2 |
| In-flight output folders shared across calls | Fixed in round 2 with per-dispatch tracking |
| Cache hit trusts a replaced binary, unknown `source` accepted | Fixed in round 2 |
| Cache write failure fails a good lookup | Fixed in round 2 for both writers |
| Per-dispatch context dropped an injected context | Found by the pinned suite after round 2, fixed in round 3 |
| `targetFolder` exposed in the MCP schema | Rejected, it is the placement contract |
| `targetFolder` with `subfolder: false` exits 1 | Rejected, by design |
| `--output-dir` loses to the environment | Rejected, a run showed the flag wins |
| Per-dispatch tracking still missing, after round 2 | Rejected, each batch saw half the code and `dispatch.ts:126` builds it |
| Missing persistent `error` listener, unbounded wait | Rejected, the listener exists and the wait needs a child that survives SIGKILL |

### Args source by outcome by signal

The full matrix is 3 sources by 3 outcomes by 3 signal states, 27 cells. Args are read and parsed before dispatch, so the source cannot change the outcome. 11 rows are tested.

| Source | Outcome | Signal | Test |
|--------|---------|--------|------|
| `--args` | 0 | none | converts with `--args` |
| `--args-file` | 0 | none | converts with `--args-file` |
| stdin | 0 | none | converts with stdin |
| `--args` | 1 | none | `PATH_NOT_ALLOWED` |
| `--args` | 2 | none | bad JSON, invalid arguments, unknown tool |
| `--args-file` | 2 | none | unknown tool with a missing file |
| `--args` and `--args-file` | 2 | none | both given |
| none | 2 | none | no command, bare `--`, unknown flag |
| `--args` | 143 | SIGTERM | kills the encode and cleans up |
| `--args` | 130 | SIGINT | kills the encode and cleans up |
| `--args` | 143 | SIGTERM | exits promptly while an encode runs |
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| Dispatch lives in `src/server/` | `core/` must not import `server/` |
| The standalone install is `npm link` or a folder install | `package.json` has no `files` field and `dist/` is ignored, so a packed tarball lacks `dist/` |
| `--help` exits 0, and a bare `--` is a usage error | Help is a successful answer, and `--` would otherwise let tool argv slip past the parser |
| Previews go to `<dataDir>/previews` | stdout carries one JSON object, so an image block has nowhere to go |
| Proofs set `MEDIA_EDITOR_DATA_DIR` to scratch | Keeps tests and runs off the real data folder. It does not touch the allowed or output folder defaults |
| The plugin keeps `mcpServers` | Phase 005 removes it |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| `npm run build`, `npm run typecheck` | Exit 0 |
| `npm run test:pinned` | 91 files passed, 1,821 passed and 4 skipped of 1,825. Baseline 86 files and 1,771 passed |
| `npx vitest run tests/packaging` | 8 files, 146 passed and 2 skipped |
| `npm run bundle -- --all`, `npm run plugin` | Exit 0, plugin `bin 2 files`, `mcpServers` present |
| Plugin shim `list` from a scratch folder | 40 tools, exit 0 |
| Four PNGs through the shim, `targetFolder` and `maxBytes` 100000 | 99,728, 70,670, 78,556 and 61,128 bytes in `<scratch>/media files/export/001 - webp-under-100kb/` |
| `npm install -g --prefix <scratch>` | `bin/media-editor` links to `dist/cli.js`, `list` exit 0, unknown tool exit 2. The real npm prefix is untouched |
| `media_setup_ffmpeg` then `health`, live | Both binaries installed into the scratch data folder and found with source `installed` by the later call |
| Startup through the shim, medians of 7 | `health` 168 ms cold and 113 ms warm, `media_probe` 186 ms cold and 168 ms warm, `list` 110 ms |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **Plain `npm test` fails on this host.** The `ffprobe-static` darwin arm64 binary is x86_64, so `test:pinned` is the authoritative run.
2. **No tarball install.** `npm pack` would ship without `dist/`. A `files` field or a prepack build is needed before publishing.
3. **Most matrix cells are inferred.** 11 of 27 cells run, and the rest rely on args being parsed before dispatch.
<!-- /ANCHOR:limitations -->

---
