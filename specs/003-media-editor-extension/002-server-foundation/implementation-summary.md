---
title: "Implementation Summary: Phase 2: server foundation"
description: "The Media Editor MCP package now exists with a tested core and one tool, media_health, that answers over stdio."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/002-server-foundation"
    last_updated_at: "2026-09-29T02:10:00Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Closed phase 2"
    next_safe_action: "Start 003-image-tools"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/mcp server/src/server/tool-context.ts"
      - "AI Systems/Media Editor/mcp server/src/core/path-guard.ts"
      - "AI Systems/Media Editor/mcp server/src/core/process-runner.ts"
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
# Implementation Summary

<!-- SPECKIT_LEVEL: 3 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 002-server-foundation |
| **Completed** | 2026-09-29 |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The package at `AI Systems/Media Editor/mcp server/` now starts as an MCP server over stdio and answers `tools/list` and `tools/call` for one tool, `media_health`. Every tool phases 3 to 6 add will sit on the same core: a configuration reader, a path guard, a numbered output folder allocator, an ffmpeg and ffprobe resolver, a process runner and a result builder. Those pieces are tested on their own, so a later phase only writes the tool.

### Phase 2: server-foundation

`media_health` is read-only. It reports the server version, where ffmpeg and ffprobe were found and by which lookup step, 28 encoder and filter checks, and the folders and limits in effect. A caller that gets a clean answer knows the path guard, the resolver, the runner and the registry all work together, which is the reason the tool exists in this phase.

The server raises its own protocol errors. SDK 1.31 turns every thrown error into a tool result with `isError`, so `tools/call` is handled in `src/server/tool-registry.ts`: an unknown tool name gives `-32601`, an input that fails its zod schema gives `-32602`, and a handler that throws becomes the contract's error body. Section 5 of the contract was corrected to say so.

### Captured `media_health` output

From a live run of `node dist/index.js` over stdio, with one allowed folder. The reply text was:

`Server version 0.1.0. ffmpeg was found from bundled: ffmpeg version 6.0 Copyright (c) 2000-2023 the FFmpeg developers. ffprobe was found from system-path: ffprobe version 9.0.2 Copyright (c) 2007-2026 the FFmpeg developers. 1 allowed folder is in effect.`

Structured fields of the same reply: `serverVersion` `0.1.0`, `ffmpeg.source` `bundled`, `ffprobe.source` `system-path`, `capabilities` holding 28 entries (10 encoders, 18 filters, all `present: true` on this build), `elapsedMs` 62 and `warnings` empty. `tools/list` returned exactly `media_health`. `tools/call` with the name `nope` returned `-32601`. The server wrote one stderr line, `[media-editor] info: started with 1 allowed folder`, and exited 0 when stdin closed.

### Files Changed

All paths are inside `AI Systems/Media Editor/mcp server/`. Every file is new and untracked, and nothing was staged or committed.

| File | Action | Purpose |
|------|--------|---------|
| `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.gitignore` | Created | Package scaffold: NodeNext, strict, SDK 1.31.0, zod 4.6.5, sharp 0.35.5, `ffmpeg-static`, `ffprobe-static`, vitest |
| `src/core/errors.ts` | Created | `MediaError` and the fifteen contract error codes |
| `src/core/config.ts` | Created | Environment and argument reader with warnings for bad values |
| `src/core/path-guard.ts` | Created | Input path checks: UTF-8, root containment, symlink and prefix cases, Windows special paths |
| `src/core/output-folder.ts` | Created | Next numbered output folder and file names |
| `src/core/ffmpeg-resolver.ts` | Created | Override, bundled, system PATH, installed lookup with a cache |
| `src/core/process-runner.ts` | Created | The only module that spawns: argv arrays, no shell, timeout, stderr tail, cleanup, file-only protocol whitelist, content gates |
| `src/core/capabilities.ts` | Created | Encoder and filter lists read from the resolved ffmpeg |
| `src/core/result.ts` | Created | Success and error result builders |
| `src/core/logger.ts` | Created | Stderr-only log lines |
| `src/server/tool-context.ts`, `tool-registry.ts`, `all-tools.ts`, `create-server.ts`, `server-info.ts` | Created | Services a tool handler uses, the registry, the server factory |
| `src/tools/media/health.ts` | Created | The `media_health` tool |
| `src/index.ts` | Created | stdio entry with clean shutdown |
| `src/types/ffprobe-static.d.ts` | Created | Types for a package that ships none |
| `tests/core/*.vitest.ts` (9 files), `tests/server/*.vitest.ts` (3), `tests/tools/media/health.vitest.ts`, `tests/smoke.vitest.ts`, `tests/helpers/media.ts` and its test | Created | 15 test files, 265 tests |
| `tests/fixtures/` | Created | Five small clips and a README naming the MIT source |

### Handoff to the next phases

Phases 3 to 6 write a tool module, add it to `ALL_TOOLS` in `src/server/all-tools.ts` and call the core through `ToolContext` (`src/server/tool-context.ts`) only:

- `resolveInput` and `resolveInputs` run on every path parameter before the path is used.
- `allocateOutputFolder` creates the numbered output folder, and `readBack` describes each written file. Video and audio are probed, and a probe that cannot run becomes one warning.
- `runBinary(name, args, { inputs })` runs ffmpeg or ffprobe. `inputs` is required: pass the resolved inputs the argv opens, or an empty array when it opens none. An input left out of that array skips the content check, so each later phase brief carries a grep that every file-input tool passes its resolved inputs.
- `successResult` and `errorResult` build the reply, and a thrown `MediaError` is turned into the error body by the registry.
- The image tools in phase 3 do not ask for ffmpeg (contract section 5), so they work with `resolveInput`, `allocateOutputFolder` and `readBack` alone.
- `media_setup_ffmpeg` is not built here. The resolver names it in a missing-binary message, and phase 8 builds it.

For the user-facing docs in `009-media-editor-integration`: the seven settings are `MEDIA_EDITOR_ALLOWED_DIRS`, `MEDIA_EDITOR_DATA_DIR`, `MEDIA_EDITOR_FFMPEG_PATH`, `MEDIA_EDITOR_FFPROBE_PATH`, `MEDIA_EDITOR_LOG_LEVEL`, `MEDIA_EDITOR_OUTPUT_DIR` and `MEDIA_EDITOR_TIMEOUT_SECONDS`, with `--allowed-dir` and `--output-dir` as the matching flags. `media_health` is the first call to make when a tool fails, and its reply names `media_setup_ffmpeg` as the next step when a binary is missing. The ffmpeg licence limit under Known Limitations must reach the install guide before any bundle ships.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Each task ran as one dispatch to Grok 4.7 through `cursor-agent` (`grok-4.7-xhigh-fast`), one file or module plus its test at a time. The DeepSeek fallback through Pi never triggered: no usage-limit signature appeared and no fallback output exists. After every dispatch the orchestrator read the files, reran the full gate and resolved the handback notes before starting the next one. Where a handback was wrong or a check was missing, the fix went in directly, and the contract was amended when the code had shown the contract to be wrong.

### Read-only review

MiMo v2.6 Pro (high) read `path-guard.ts` and `process-runner.ts` and returned six findings. Each was checked against the code before it was acted on:

| Finding | Claim | Outcome |
|---------|-------|---------|
| F1 | A UNC path written with forward slashes, or with mixed separators, skips the lexical root check | Confirmed and fixed. `resolveInputPath` now normalises through `path.win32.normalize` and compares against the roots before any filesystem call. Table tests cover both separators and a mix. |
| F2 | `runBinary` lets a tool omit the resolved inputs, so the content gate and the root re-check never run | Confirmed and fixed at the type level. `inputs` is now required on `RunBinaryOptions`, and an empty array means the argv opens no caller file. |
| F3 | A spawn failure reports `PROCESS_FAILED`, which the contract did not say | Resolved by amending the contract to state it. |
| F4 | An `OUTPUT_EXISTS` refusal removes nothing, which the contract did not say | Resolved by amending the contract to state it. |
| F5 | Captured stdout is uncapped | Confirmed and deferred. It is limitation 6 below. |
| F6 | ffmpeg refuses `-n` together with `-y`, so an overwrite flag could be added silently | Refuted. Running ffmpeg with both flags showed that the argv prefix always carries `-n` and the runner never adds `-y`. |

### Edge-case work that followed

Checking `spec.md` section 8 against the tests found four edges without a test. Two of them exposed gaps between the spec and the code, and both were closed in the code rather than by weakening the spec:

- **Leftover reporting.** `removePaths` now returns the paths it could not delete, and `cleanUpAfterFailure` adds them to the failure as `details.leftover` without replacing the original `MediaError`. A cleanup that cannot finish no longer disappears. Two tests cover it, and both fail when `removePaths` swallows the failure (checked by mutating the code and restoring it).
- **Skipped candidates.** The resolver now records earlier candidates that exist but could not run. `media_health` reports them as an optional `skipped` list on a found binary and adds the sentence `N earlier candidate(s) could not run.` The resolver's own wording separates `absent` (no file at that location) from `unusable` (a file is there and cannot run).
- **Trailing separator.** A test now pins that an allowed folder given with a trailing separator resolves to the same root.
- **Redundant catches.** `catch` blocks that only re-narrowed with `instanceof Error` were collapsed in `path-guard.ts`, `config.ts` and `ffmpeg-resolver.ts`. The three `instanceof Error` sites left in `src` turn an unknown value into text or an `Error`, so none of them is redundant.

Nothing was committed, staged or pushed.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| One module per concern in a layered tree (`core`, `server`, `tools`) | ADR-001. A tool phase adds one file under `src/tools/` and one line in `all-tools.ts`. |
| Resolve ffmpeg by override, then bundled, then system PATH, then consented install | ADR-002. An override never falls through, so a wrong path fails loudly instead of running some other binary. The install step is pinned by SHA-256 and fails closed while the pin list is empty. |
| Five small clips tracked, everything else generated | ADR-003. Fixtures stay under 100 KB and larger media is built with `lavfi` at test time. |
| Own `tools/call` handler | SDK 1.31 cannot raise `-32601` or `-32602` on its own. The handler lives in `src/server/tool-registry.ts`. |
| Error text is `"<code>: <message>"`, the body is `{code, message, details}` | Callers and tests match on the code and never on wording. |
| Alignment stand-in gate | `verify_alignment_drift.py` scans only git-tracked files, so it passes an untracked package without reading it. The stand-in copies the package into a scratch git repo, adds it, and runs the script plus MODULE header, line-length and grep checks. |

### Contract amendments made in this phase

`001-tool-contract/contract.md` stays at version 0.2 and its change log records each row: the 6.10 test matrix, the 6.11 renumber, the UNC pre-check in 4.2, the host note in 4.4, the `ERROR_CODES` snippet, the ffprobe protocol whitelist placement in 8.3, the `detected` values, the INTERNAL `reason` `relative-binary`, the environment allowlist note, the 6.2 `lookedIn` sample, the 30 second capability timeout, the section 5 change naming the server's own handler as the source of protocol errors, and the review amendments: a spawn failure reports `PROCESS_FAILED`, an `OUTPUT_EXISTS` refusal removes nothing, `runBinary` requires its resolved `inputs`, a cleanup that cannot finish adds `details.leftover`, forward-slash and mixed UNC paths are compared lexically, and `media_health` may report `skipped` candidates.

### Dependency licences

Read from the installed packages on 2026-09-29, for the third-party notices phase 7 writes.

| Package | Version | Licence | Use |
|---------|---------|---------|-----|
| `@modelcontextprotocol/sdk` | 1.31.0 | MIT | Server and stdio transport |
| `zod` | 4.6.5 | MIT | Input schemas |
| `sharp` | 0.35.5 | Apache-2.0 | Image tools in phase 3 |
| `@img/sharp-darwin-arm64` | 0.35.5 | Apache-2.0 | sharp's platform binding, one per platform |
| `@img/sharp-libvips-darwin-arm64` | 1.3.4 | LGPL-3.0-or-later | libvips inside sharp, one per platform |
| `ffmpeg-static` | 5.3.0 | GPL-3.0-or-later | Bundled ffmpeg binary (limitation 1) |
| `ffprobe-static` | 3.1.0 | MIT | Bundled ffprobe binaries (limitation 2) |
| `typescript` | 7.0.2 | Apache-2.0 | Dev only |
| `vitest` | 5.0.2 | MIT | Dev only |
| `@types/node` | 22.20.4 | MIT | Dev only |

`@anthropic-ai/mcpb` is not a dependency yet. Phase 7 adds it and records its licence then.

### Inherited source defects

Section G of `../context/source-inventory.md` lists thirteen defects in the two sources. This phase closes the ones its core can close, and the rest belong to the tool phases that port the affected tool.

| Defect | Class | Closed here by | Evidence |
|--------|-------|----------------|----------|
| G1 Shell use is absent in the sources | class-of-bug | `process-runner.ts` is the only spawner, with an argv array and `shell: false` | `child_process` appears only in `src/core/process-runner.ts`, and the `shell: true` grep prints nothing |
| G3 No root limit, output may equal input | class-of-bug | `resolveInputPath` and `assertOutputNotOnInput` in `path-guard.ts` | 44 path-guard tests, 40 passed and 4 skipped |
| G5 Overwrite policy differs per call | class-of-bug | The runner adds `-n` and never `-y`, and `writeExclusive` refuses an existing file | `'-y'` appears nowhere in `src`, and the runner test refuses an existing output and leaves it |
| G7 ffmpeg is assumed on PATH | matrix/evidence | The resolver: override, bundled, system PATH, installed | 44 resolver tests, and only darwin-arm64 was observed |
| G10 Error taxonomy is misleading | class-of-bug | `MediaError` with fifteen codes, and a registry that turns any throw into `INTERNAL` | 4 error tests and 12 registry tests |
| G11 No timeout or size bound | class-of-bug, partly closed | Timeout, a two-child cap and a stderr cap | Captured stdout is still uncapped (limitation 6) |

Left to the tool phases: G2 (concat list quoting), G4 (filter strings), G8 (silent capability lies) and G9 (bugs), each in the tool that owns it, and G12 (imagician validation) in the image phase. G6 (hard-coded test paths) is instance-only and was not ported. G13 (doc drift) applies when each tool description is written, so it is open until the tool phases write them fresh.

### Matrix

| Axis | Values | Rows exercised |
|------|--------|----------------|
| Platform | darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64 | One host observed. The win32 branches run through an injected platform in the path-guard and resolver tests that pass one, and no bundled binary for the other four targets has been run |
| Binary source | override, bundled, system PATH, installed | All four, in 44 resolver tests |
| Configuration source | environment, arguments, missing | All three, in 23 config tests |

The plan's same-class-producer grep used `exec\(`, which also matches `RegExp.exec(` and listed four unrelated files. The plan now uses a pattern that lists only `process-runner.ts`.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS, exit 0 |
| `npx vitest run` | PASS, exit 0: 15 files, 265 tests, 261 passed, 4 skipped, 0 failed |
| Fresh copy without `node_modules` and `dist`: `npm ci`, `tsc --noEmit`, `vitest run` | PASS: `npm ci` exit 0, `tsc` exit 0, 261 passed and 4 skipped |
| Same suite with all seven `MEDIA_EDITOR_*` variables set to hostile values | PASS: 261 passed, 4 skipped |
| Leftover-reporting tests catch a runner that swallows cleanup failures | PASS: both fail when `removePaths` ignores a failed delete, and pass again once the file is restored |
| `grep` for `: any` and untyped `catch (error)` in `src` and `tests` | PASS, both print nothing |
| `find tests -size +100k` | PASS, prints nothing |
| `child_process` outside `src/core/process-runner.ts`, and `shell: true` anywhere | PASS, neither found |
| Stand-in alignment gate: the real script on a `git init` scratch copy with `--fail-on-warn`, plus greps and header, line-length, ephemeral-id and em-dash checks | PASS: 38 files scanned, 0 findings (recorded deviation: the real script reads tracked files only, and the package is untracked) |
| Live stdio smoke of `media_health` | PASS, output captured above |
| Suite runtime | 2.7 s of test time and 3 s wall, against the 60 s budget. Slowest tests: 1045 ms (at most two children at once), 611 ms (force-kill of a child that ignores the termination signal), 306 ms (timeout removes partial files), all in `tests/core/process-runner.vitest.ts` |
| Strict validation of this packet: `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/002-server-foundation --strict` | PASS: `RESULT: PASSED`, exit 0, Errors 0, Warnings 0, `AC_COVERAGE` 10/10 and `AC_CLOSURE` 10/10 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **`ffmpeg-static` licence.** It is GPL-3.0-or-later, and the darwin-arm64 binary is built with `--enable-gpl --enable-version3 --enable-nonfree`. A nonfree build cannot be redistributed. This has to be settled before any bundle ships (contract 10.4, phase 7). `sharp` pulls in libvips under LGPL-3.0-or-later.
2. **`ffprobe-static` gaps.** Its darwin/arm64 file is an x86_64 binary that fails here with "bad CPU type", and it ships no linux/arm64 binary. On this machine ffprobe resolves from the system PATH, so no run through the package has used the packaged ffprobe. Tests do not assume it runs.
3. **Windows is unverified.** Path escaping, `\\?\` and alternate-stream rejection and UNC handling, backslash and forward-slash spellings alike, are written here. Their tests run against `path.win32` on this machine, and the ones that need a real Windows volume did not run.
4. **Four tests skip on this machine.** Three are Windows-only path-guard cases (a drive-letter path inside the roots, one outside, and a UNC path kept for the root check). The fourth, a different-case folder on a case-sensitive volume, needs a case-sensitive volume, and a default APFS volume is not one.
5. **Fixtures carry no audio.** Audio tests generate their own tones.
6. **Bounded, not capped.** A decode bomb is limited by the timeout and the two-process cap, not by memory. Captured stdout is uncapped (review finding F5, confirmed and deferred). An image2 `%` pattern in a caller file name could expand to sibling files. A failed cleanup is now reported as `details.leftover`, so the remaining risk is a folder that stays locked, not one that disappears silently.
7. **Dev-only Node floor.** vitest 5 needs Node 22.12 or newer while the package's `engines` floor is 20.9.
8. **Cosmetic.** `media_health` ignores unknown arguments because the zod object strips them. The redundant `catch` narrowing and the resolver's "absent" wording for an unusable candidate were fixed in this phase.
9. **No package README yet.** The P2 checklist row for it is deferred to phase 7, which owns packaging and user-facing docs.
<!-- /ANCHOR:limitations -->

---
