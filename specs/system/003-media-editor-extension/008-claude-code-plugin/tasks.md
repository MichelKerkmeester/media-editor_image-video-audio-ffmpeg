---
title: "Tasks: Phase 8: Claude Code plugin"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "claude code plugin tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 8: Claude Code plugin

<!-- SPECKIT_LEVEL: 3 -->

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

One task is one file, or one tool with its test, so each maps to one DeepSeek dispatch. T001, T010 and T011 need the Claude Code CLI and run under the orchestrator. Paths are relative to `AI Systems/Media Editor/mcp server/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Spike: install a test plugin that references the darwin-arm64 bundle with `claude --plugin-dir`, with `node` removed from `PATH`, and record whether the server starts (`decision-record.md` ADR-001) [EVIDENCE: ADR-001 records four `claude --plugin-dir <plugin> mcp list` runs on Claude Code 2.1.284, darwin-arm64: without Node the bundle reference fails with `ENOENT: Executable not found in $PATH`, and with Node it passes `${user_config.output_directory}` and `${DESKTOP}` through unexpanded, so the inline `node` branch was taken]
- [x] T002 Pinned ffmpeg builds per target with URL, size and SHA-256 (`src/tools/media/ffmpeg-pins.ts`) [EVIDENCE: the pins live in `src/core/pinned-builds.ts`, the one table phase 7 built for the bundles, instead of a second file: ten rows, five platforms by ffmpeg and ffprobe, each with an https URL, `redirectHost` (null for the two darwin-arm64 zips, `release-assets.githubusercontent.com` for the eight GitHub gzips), the byte count, the archive SHA-256 and the binary SHA-256]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T003 `plugin.json` with `mcpServers` per ADR-001 (`claude-plugin/.claude-plugin/plugin.json`) [EVIDENCE: `mcpServers.media-editor` runs `node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js ${CLAUDE_PROJECT_DIR}` with `MEDIA_EDITOR_DATA_DIR=${CLAUDE_PLUGIN_DATA}`; `claude plugin validate claude-plugin/.claude-plugin/plugin.json` prints `Validation passed`, exit 0]
- [x] T004 `marketplace.json` listing the plugin (`claude-plugin/.claude-plugin/marketplace.json`) [EVIDENCE: `media-editor-local` lists `media-editor` with source `./`; `claude plugin validate claude-plugin` validates it and prints `Validation passed`, exit 0]
- [x] T005 Pack step copying `sk-media-editor/` into `skills/media-editor/`, with a hash comparison test (`scripts/build-plugin.ts`, `tests/packaging/build-plugin.vitest.ts`) [EVIDENCE: `build-plugin.vitest.ts` 12 tests pass, among them 'copies the tracked skill byte for byte', 'reports a file whose bytes changed after the copy', 'writes the two tracked skill links as regular files' and 'refuses a bundle that unpacks a link'; `npm run plugin` prints `claude-plugin darwin-arm64 server 0.1.0 skill 40 files`, and `find claude-plugin -type l` finds no link]
- [x] T006 Plugin README with install steps, and the Node requirement if the spike calls for it (`claude-plugin/README.md`) [EVIDENCE: the README gives the build and `--plugin-dir` steps, the `mcp list` check with its expected line, Node.js 20.9.0 on `PATH` as a requirement, the server settings and four troubleshooting rows]
- [x] T007 `media_setup_ffmpeg` with consent, pinned download, hash check and unpack, tested against a local HTTP fixture (`src/tools/media/setup-ffmpeg.ts`, `tests/tools/media/setup-ffmpeg.vitest.ts`) [EVIDENCE: `setup-ffmpeg.vitest.ts` 15 tests, `artifact-download.vitest.ts` 23 and `zip-entry.vitest.ts` 13 pass. They use an injected fetch instead of a local HTTP server, a deviation: the fetch is the seam the code takes, and one live download proved the real path, darwin-x64 ffprobe (25,239,438 bytes) through `302 github.com` then `200 release-assets.githubusercontent.com`, both digests matching, in 1,449 ms]
- [x] T008 Resolver's fourth step reads the data folder a consented setup filled, with its test (`src/core/ffmpeg-resolver.ts`, `tests/core/ffmpeg-resolver.vitest.ts`) [EVIDENCE: `ffmpeg-resolver.vitest.ts` 'accepts an installed binary when the pin and the record match' returns `source: 'installed'`, and 'refuses an installed binary when the pin table has no entry' refuses it; the setup test 'installs both binaries with consent and records them' re-resolves through the real resolver and reports `source: 'installed'` for both]
- [x] T009 Registry and Desktop manifest expect 39 tools (`tests/server/registry.vitest.ts`, `tests/packaging/manifest.vitest.ts`) [EVIDENCE: `registry.vitest.ts` lists `media_setup_ffmpeg` and expects 39, `manifest.vitest.ts` has `TOOL_COUNT = 39` and checks each manifest description against the registry; both pass]
- [x] T014 Repack and revalidate the five phase 7 bundles with the phase 7 build script, so every `.mcpb` the plugin points at carries `media_setup_ffmpeg` (`mcpb validate` per platform, then `mcpb pack`) [EVIDENCE: `npm run bundle -- --all` exit 0 after the last source change; `mcpb validate` exit 0 on each of the five packed manifests, each with 39 tools, and on the root manifest; sizes and digests in `implementation-summary.md`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T010 `claude plugin validate` on the plugin folder [EVIDENCE: exit 0 on the folder and on `plugin.json`, Claude Code 2.1.284]
- [x] T011 A `claude --plugin-dir` session lists 39 tools and runs `media_health`, with the transcript saved in the `goal.md` log [EVIDENCE: `claude -p` sessions with `--plugin-dir` on the rebuilt plugin: the init lists 39 `mcp__plugin_media-editor_media-editor__*` tools and the `media-editor:media-editor` skill, the server is `connected`, `media_health` reports the bundled ffmpeg 9.0.2 with 18 of 18 filters present, and `video_set_resolution` wrote a file ffprobe reads as `h264,160,120`. The summary is in the `goal.md` log]
- [x] T012 Full package gate on the final state [EVIDENCE: `bash gate.sh` exit 0 after the final rebuild: tsc 0, `Test Files 81 passed (81)`, `Tests 1694 passed | 4 skipped (1698)`, greps, headers, 100 columns, ids and em dashes clean, alignment 0 findings over 170 files, `GATE: PASS`]
- [x] T013 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/008-claude-code-plugin --strict` [EVIDENCE: `RESULT: PASSED` on 2026-09-29 after the final numbers were written]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Package gate green on the final state, rerun by the orchestrator [EVIDENCE: T012]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- **Specification**: See `spec.md`
- **Plan**: See `plan.md`
- **Acceptance criteria**: See `acceptance-criteria.md`
- **Contract**: See `../001-tool-contract/contract.md`
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: spec.md section 4 holds REQ-001 to REQ-008, with REQ-006's Node floor settled by ADR-001]
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: plan.md sections 1 and 3 and the AI execution protocol, synced at close with the inline server, the injected fetch and the rollback file list]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: plan.md section 1 names contract 3.4, section 5, 6.5 and 10.5]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `tsc exit 0` in the final gate run]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: the gate's `: any`, untyped `catch`, `'use strict'` and `shell: true` greps over `src`, `tests` and `scripts` print nothing]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: setup and download failures are `CONSENT_REQUIRED`, `DOWNLOAD_FAILED` (with `reason`), `CHECKSUM_MISMATCH`, `INVALID_INPUT` or `INTERNAL`, and the plugin build's are `INVALID_INPUT` or `INTERNAL`. Review findings F6, F9 and F10 closed three raw escapes. The one raw `Error` left is an already existing destination, which the TSDoc names and setup never reaches because its work folder is new]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate: MODULE headers, dividers, the 100-column check and the ids and em dash greps pass, and the alignment script finds 0 over 170 files on a tracked copy]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: nine rows Met and AC-007 Superseded by ADR-001 in `acceptance-criteria.md`]
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: `vitest exit 0`, `Test Files 81 passed (81)`, `Tests 1694 passed | 4 skipped (1698)` in the final gate run]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: bundled ffmpeg with consent: 'reports both found binaries and writes nothing either way' and 'downloads nothing when both binaries are already installed'; hash mismatch: 'refuses a body whose digest does not match and leaves no trace'; unknown platform: 'refuses a platform with no pinned build and writes nothing', now asserting the message names `MEDIA_EDITOR_FFMPEG_PATH`; network down: 'reports an unreachable host and still plans both downloads'; no Node: the README row and the ADR-001 run]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: every setup, download, zip and plugin-build failure test asserts `code` and `details`, and none reads stderr]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: section G names no download, install or plugin defect, because setup is new. The ffmpeg 9 filter rows the session found are `cross-consumer` (every filter-gated tool) and were fixed in the one reader]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: each review fix covered its whole class: both exclusive opens, all three body cancels, both archive kinds' size bounds. The filter-row finding led to a full suite run on the shipped 9.0.2 pair, and the encoder reader reads that build correctly (10 of 10 encoders)]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: `capabilities.ts`, `artifact-download.ts` and `zip-entry.ts` changed, and the full suite reran on the final state]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: setup takes no path. The zip entry table refuses a parent path, an absolute path, a symlink, a Unix directory, a DOS directory, two entries, another name, random bytes and a truncated archive. The redirect table refuses five cases, and the filter reader has both row formats]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: five platforms by two components by two archive kinds by two redirect cases, ten pinned rows, listed in `implementation-summary.md`]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: phase 8 adds no read of a `MEDIA_EDITOR_*` variable. The plugin sets `MEDIA_EDITOR_DATA_DIR` through the phase 2 config, whose hostile-environment tests still pass]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: the summary names the file list, the gate run and the bundle digests it was taken on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: no secret or token. The only home paths in tests are the `/Users/me` placeholders of earlier phases, and `plugin.json` uses Claude Code's variables]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: `media_setup_ffmpeg` takes no path parameter and writes only in the server data folder, which contract section 4 exempts. The plugin passes the project folder as a root to the phase 2 guard]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: the grep prints nothing, and the plugin build runs `unzip` through `runStep` with an argument list]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec file table and status, plan sections 1, 3, 5 and 7, tasks and acceptance criteria updated together at close]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: a scan of every export in `setup-ffmpeg.ts`, `artifact-download.ts`, `zip-entry.ts`, `build-plugin.ts`, `source-notice.ts`, `pinned-builds.ts` and `capabilities.ts` finds none without TSDoc, and each that throws has `@throws`]
- [x] CHK-042 [P2] Plugin README states install steps and requirements [EVIDENCE: `claude-plugin/README.md` sections 2 and 3]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: tests write under `os.tmpdir()`, and the builds write only ignored output]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` holds only `.gitkeep`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 0/15 |
| P1 Items | 23 | 0/23 |
| P2 Items | 9 | 0/9 |

**Verification Date**: 2026-09-28
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Architecture decisions documented in decision-record.md, here or in the phase that owns them [EVIDENCE: `decision-record.md` ADR-001 and ADR-002]
- [x] CHK-101 [P1] All ADRs this phase relies on have a status [EVIDENCE: ADR-001 is Accepted, inline branch, and ADR-002 is Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: each ADR scores its alternatives with a reason for each rejection]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: the one-redirect rule is in contract 3.4 with the operator's approval. A download past the time limit is a connection error under contract 3.4 and section 5, reported with reason `timeout`, so no amendment was needed]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: NFR-P01: `media_health` answered in 1,111 ms and 1,876 ms of tool time on the first call of two fresh sessions, under 5 seconds]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: NFR-P02: each download stops at the server's per-run limit (tested at 50 ms), and every plan row reports the download size. The full suite ran in 19.83 s]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: `bundle-contents.vitest.ts` 'carries binaries built for its architecture' at 2,551 ms, and the slowest phase 8 test 'copies the tracked skill byte for byte' at 319 ms]
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: in the Verification table]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: plan.md section 7 names every file this phase created or changed and how each is restored]
- [x] CHK-121 [P0] The plugin is opt-in per user install, so no feature flag is needed [EVIDENCE: it loads only with `--plugin-dir` or an explicit install]
- [x] CHK-122 [P1] `media_health` reports a consented download as its binary source [EVIDENCE: the setup install test re-resolves to `source: 'installed'` through the real resolver, and `media_health` reports the resolver's `source` unchanged]
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: Operator notes under Verification]
- [x] CHK-124 [P2] Packaging steps reviewed with `007-desktop-extension`, which owns them [EVIDENCE: the plugin build consumes the phase 7 bundle unchanged, and the phase 7 build reran for every repack]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: under the parent goal's D6 routes the review ran on GPT-6 Luna: 11 findings, 8 fixed with tests and 3 rejected with reasons. Three more followed, none on the model that wrote the code: DeepSeek v4.1 Flash on the fixes (3 of 3 fixed), GPT-6 Luna on the timeout (2 of 2 fixed) and DeepSeek v4.1 Flash on the staging (3 of 4 fixed, 1 answered by an existing test). Every fix was reverted once and its test failed, except the unpack cleanup, which no test can trigger]
- [x] CHK-131 [P1] Licence of every new dependency recorded for THIRD_PARTY_NOTICES [EVIDENCE: phase 8 adds no npm dependency. A consented setup writes the pinned build's licence and source notice beside the binary]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: zip entries: the refusal table; traversal: no entry name reaches a path; exhaustion: the pinned size cap, the bounded inflation and the download time limit]
- [x] CHK-133 [P2] `media_setup_ffmpeg` downloads only after consent, and no user media leaves the machine [EVIDENCE: the consent test sees no fetch without `consent: true`, and the only requests are GETs to the pinned URLs and their one allowed redirect]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: all phase 8 documents updated together at close]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: `manifest.vitest.ts` checks each manifest description against the registry, and the setup description follows contract 3.4]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: phase 9 wrote the plugin install into `INSTALL-GUIDE.md` and the skill's tools-first route]
- [x] CHK-143 [P2] Handoff notes for the next phase written [EVIDENCE: the goal log and `implementation-summary.md` carry the ffmpeg 9 stream-copy question and the suite-on-shipped-build follow-up]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Michel Kerkmeester | Operator and product owner | [ ] Approved |  |
| Orchestrator (Claude Opus) | Technical lead, reruns every gate | [x] Approved | 2026-09-29 |
| GPT-6 Luna, then DeepSeek v4.1 Flash (D6 routes) | Read-only reviewers | [x] Findings resolved | 2026-09-29 |
<!-- /ANCHOR:sign-off -->
