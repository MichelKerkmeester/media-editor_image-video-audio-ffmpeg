---
title: "Tasks: Phase 6: probe, repair and HLS"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "probe repair hls tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 6: probe, repair and HLS

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

One task is one tool module, or one mode of it, with its test, so each maps to one DeepSeek dispatch. Paths are relative to `AI Systems/Media Editor/mcp server/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Read the contract rows for the three tools and `AI Systems/Media Editor/sk-media-editor/assets/hls-video-conversion.md:94-170` [EVIDENCE: contract 3.4, 5, 8.2 and 8.4 read; the spec, plan and four criteria that predate the contract were aligned to it through ADR-002; on ffmpeg 6.0 a stream copy restores the duration of an unindexed Matroska recording, a re-encode decodes an MP4 cut short with 0 errors, a copy of a Matroska file with PCM audio named `.mp4` exits 1, ffprobe exits 1 on an MP4 cut before its index, the recipe's scale enlarged a 640x360 source to 1920x1080, and its unindexed profile flags encoded a 720p rung as Constrained Baseline 3.1; contract 3.4 amended for the rung rule and per-stream profile and level]
- [x] T002b An attempt may name its own output extension, so the repair copy pass keeps the input's container (`src/tools/video/copy-then-encode.ts`, `tests/tools/video/copy-then-encode.vitest.ts`) [EVIDENCE: `EncodeAttempt.extension` names the temp file and the kept file; two new tests, 25 in the file; naming the kept file with the request's extension or the temp file without the attempt's each fails the new test]
- [x] T002 Broken-media generators with their test (`tests/helpers/broken-media.ts`, `tests/helpers/broken-media.vitest.ts`) [EVIDENCE: six generators and `decodeErrorLines`, each proved on the real binaries (9 tests): the unindexed recording has no duration and gains one on a copy, the cut MP4 and cut audio decode with errors, ffprobe exits non-zero on the indexless MP4, the mislabeled file's copy into MP4 exits non-zero; gate PASS, 1404 passed and 4 skipped]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T003 `media_probe` for video, audio and images through one ffprobe read (`src/tools/media/probe.ts`, `tests/tools/media/probe.vitest.ts`) [EVIDENCE: 12 tests pass: the three blocks on a video with sound, a silent video, an audio file and a PNG, keys omitted when absent, the folder listing unchanged, `PROCESS_FAILED` naming `media_repair` for an indexless MP4 and an empty file; ffprobe 9.0.2 gives a PNG `25/1`, so the orchestrator added a crafted-probe test for the 30 fps fallback and the omissions, which fails when the fallback changes; registry pinned at 36 with `media_probe` read-only; gate PASS, 1416 passed and 4 skipped]
- [x] T004 `media_repair` diagnosis and the `remux` copy pass (`src/tools/media/repair.ts`, `tests/tools/media/repair-diagnose.vitest.ts`) [EVIDENCE: 12 tests pass: the writer parse with a duration, `N/A` and a blank duration left out, error text kept, the copy repairing an unindexed Matroska (output duration within 0.3 s of 4 s, 0 decode errors), a clean MP4, `UNSUPPORTED_FORMAT` for an indexless MP4 and an empty file with no folder, `PROCESS_FAILED` for the mislabeled Matroska, path and schema failures; the orchestrator made a blank duration parse as absent instead of 0; three mutations (copy flags dropped, a probe failure rethrown, the media type forced) each fail a test; registry pinned at 37; gate PASS, 1428 passed and 4 skipped]
- [x] T005 `media_repair` re-encode passes and `auto` (`src/tools/media/repair.ts`, `tests/tools/media/repair-strategies.vitest.ts`) [EVIDENCE: 11 tests pass: a cut MP4 re-encoded to one `h264` and one `aac` stream with 0 decode errors, cut audio to a single `aac` stream in `.m4a`, a silent video with no audio added, `auto` copying an unindexed recording with no warning, `auto` re-encoding the mislabeled Matroska with one warning, the capability gates (0 runs before a `reencode` without `libx264`, the copy still working without either encoder, `auto` stopping after one run), path and schema failures; the orchestrator added a `.webm`-named MP4 case after a mutation dropping the re-encode extension passed every test, and it now fails; mutations on the reported pass and the upfront gate each fail a test; gate PASS, 1439 passed and 4 skipped]
- [x] T006 `video_hls_ladder` with the recipe's settings (`src/tools/video/hls-ladder.ts`, `tests/tools/media/hls-ladder.vitest.ts`) [EVIDENCE: 21 ladder tests and 3 folder-helper tests pass: a three-rung master in ladder order with each rung's resolution, at least 5 segments per rung matching `segmentCount`, 4 playlist entries with real byte counts and `totalBytes` equal to the folder; ffprobe reads 720p as Main 4.0 and 480p and 360p as Constrained Baseline 3.1 with no audio; fewer segments at 4 seconds, more bytes at crf 18 than 28, a letterboxed portrait, a `%` kept out of the paths, the duplicate-rung, schema, audio, path, capability and zero-segment failures, and the exact argv; the orchestrator added a key-frame count after a mutation that fixed the GOP at 2 seconds passed every test, and it now fails; mutations on the unindexed profile, the segment check and the pad each fail a test; gate PASS, 1463 passed and 4 skipped]
- [x] T007 Rung selection that drops rungs taller than the source, portrait input included (`src/tools/video/hls-ladder.ts`, `tests/tools/media/hls-rungs.vitest.ts`) [EVIDENCE: 23 tests pass: the `selectRungs` table (1920x1080 keeps all, 1280x720 drops 1080p, 854x480, 640x360, 720x1280 and 360x640 by the shorter side, 320x240 keeps none, a subset keeps its order), defaults on 1280x720 and 640x360 with `droppedRungs` and one warning, a portrait source, `larger-than-source` with 0 runs and no folder, a 1080p source with no warning; four mutations (an equal side dropped, the height used instead of the shorter side, the warning omitted, the all-dropped refusal removed) each fail a test; gate PASS, 1486 passed and 4 skipped]
- [x] T008 Registry test expects 38 tools (`tests/server/registry.vitest.ts`) [EVIDENCE: the pinned list ends `media_probe`, `media_repair`, `video_hls_ladder` with `toHaveLength(38)` and read-only `media_health`, `image_probe`, `media_probe`; it passes in the gate run above]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T009 Full gate on the final state [EVIDENCE: `bash gate.sh` exit 0 on the final state: tsc 0, `Tests 1494 passed | 4 skipped (1498)`, both greps empty, headers, 100-column check, ids and em dashes clean over 146 files, `GATE: PASS`]
- [x] T010 ffprobe reads `master.m3u8` and each variant playlist from the ladder test output [EVIDENCE: live stdio run against `dist/index.js` on 2026-09-29: `COUNT: 38`; `video_hls_ladder` on a 1280x720 clip with defaults dropped 1080p with one warning; ffprobe opened `master.m3u8` (h264 1280x720, 854x480, 640x360) and each of `720p/`, `480p/` and `360p/playlist.m3u8` (h264 at the rung size, 3 segments each); the ladder test also probes the master (`hls-ladder.vitest.ts`)]
- [x] T011 MiMo read-only review of the repair strategies [EVIDENCE: MiMo v2.6 Pro high reviewed the three tools against contract 3.4, 5, 7, 8.2 and 8.4 and found the argv, gates, folders and parameter-sensitive tests sound, with 5 P2 findings. Verified by reading the cited lines: the ladder's output check dropped the run's stderr tail (fixed, the zero-segment test now asserts the tail) and its text line named `master.m3u8` where 7.1 rule 2 asks for the folder and the file count (fixed, with `folderTotals`); the lowercased copy extension still names the input's own container, so no change; the album-art summary and the frame-rate fallback went to the operator, who approved both as amendments (ADR-003)]
- [x] T012 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/006-probe-repair-hls --strict` [EVIDENCE: after `repair-derived.cjs --apply`, `RESULT: PASSED` with 0 errors and 0 warnings, 2026-09-29]
- [x] T013 Operator-approved amendments: album art is not video in the repair diagnosis, whose audio re-encode gains `-vn` and a warning; `auto` decodes its copy once through a new attempt-level `check`; the ladder's frame-rate sentence (ADR-003, contract change-log row) [EVIDENCE: `generateCoverArtAudio` with its test, 6 new repair tests (album art parsed, re-encoded as one AAC stream with the warning, copied to `.mp3` by `auto`, `auto` re-encoding a cut MP4 to 0 decode errors, both passes failing with joined tails, a diagnosis timeout passed through), one runner test for the `check` fallback; four mutations (check dropped, `-vn` dropped, album art counted as video, decode errors ignored) each fail a test; gate PASS, 1494 passed and 4 skipped]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Package gate green on the final state, rerun by the orchestrator
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: `spec.md` section 4 holds REQ-001 to REQ-008, aligned to contract 3.4 by ADR-002]
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: `plan.md` sections 3 and 4 and the AI execution protocol]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: `plan.md` section 3 names contract 3.4, 5, 7, 8.2 and 8.4]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `npx tsc --noEmit` exit 0 inside the final gate run]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: the `: any`, untyped `catch (error)`, `shell: true` and `'use strict'` greps over `src` and `tests` print nothing in the final gate]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: every failure of the three tools is a `MediaError` from the handler, `probeMedia`, the stream gate, `runAttempts`, `runInOutputFolder` or the runner; the tests assert `INVALID_INPUT`, `UNSUPPORTED_FORMAT`, `PROCESS_FAILED`, `PROCESS_TIMEOUT`, `CAPABILITY_MISSING`, `PATH_NOT_ALLOWED` and `INPUT_NOT_FOUND` by code]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate PASS on 146 files, the recorded deviation in `../002-server-foundation/goal.md`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: AC-001, AC-004 to AC-006 and AC-009 to AC-014 Met, AC-002, AC-003, AC-007 and AC-008 Superseded by ADR-002, in `acceptance-criteria.md`]
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: full run in the final gate: 71 files, 1498 tests, 1494 passed, 4 skipped, exit 0]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: audio-only ladder input `hls-ladder.vitest.ts:670`; 640x360 `hls-rungs.vitest.ts:489`; portrait `hls-rungs.vitest.ts:506`; a file that is not media, `media_probe` on an empty file and an indexless MP4 `probe.vitest.ts:374` and `:388`; a zero-byte file refused by `media_repair` `repair-diagnose.vitest.ts:297`; both `auto` passes failing with joined tails and an ffprobe timeout `repair-strategies.vitest.ts` (added at close)]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: error-path tests assert `code` and `details` through `expectFailure` or the caught `MediaError`; no phase 6 test reads `.message`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: classification table under Inherited source defects in `implementation-summary.md` (G3, G4, G5, G6, G11, G13 and the repair-recipe gap)]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: `grep -rn attached_pic src` shows the shared probe, `media_probe` and now the repair diagnosis all skip album art; `grep -rn "cwd:" src/tools` finds only the ladder; every `-n` is written by the tool or added by `buildArgv`]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: `copy-then-encode.ts` gained the attempt `extension`, `runInOutputFolder` and the attempt `check`, and `media-properties.ts` gained `readProbeJson`; the full suite reran green on the final state]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: a `%` in the ladder's description (`hls-ladder.vitest.ts`); outside-root and missing inputs refused in all five tool test files; no-op, a clean MP4 copied unchanged by `remux`; fallback, the copy-to-re-encode cases of `auto`; no caller string reaches any argv token (MiMo confirmed)]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: listed under Matrix in `implementation-summary.md`]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: the full suite reran with all seven `MEDIA_EDITOR_*` variables hostile: 1488 passed, 4 skipped, exit 0 (before the last six tests were added)]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: the summary names the file list and the gate output it was taken on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: no secrets, tokens or machine paths in the phase's source or tests; every input is generated at test time under the sandbox]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: each of the three handlers calls `context.resolveInput` first, and `PATH_NOT_ALLOWED` is tested for each]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: `grep -rn "shell: true" src` prints nothing, and every argv is an array of one token per element]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec, plan sections 3 and 7, tasks, acceptance criteria, ADR-002 and ADR-003 updated together at close]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: a scan of all 342 exports in `src` and `tests/helpers` finds TSDoc on each, except two overloads sharing one block and `export {}`; the scan found `PipelineStep` separated from its block by an insertion earlier in this phase, now fixed]
- [ ] CHK-042 [P2] Package README lists the tools this phase adds
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: test output goes under the OS temp folder through `createSandbox` and `makeTempDir`, and `scratch/` holds nothing this phase created]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` holds only `.gitkeep`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 15/15 |
| P1 Items | 23 | 23/23 |
| P2 Items | 9 | 7/9 |

**Verification Date**: 2026-09-29. Open rows: CHK-042 is deferred to `007-desktop-extension`, which owns packaging and user-facing docs, and CHK-124 goes with it.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Architecture decisions documented in decision-record.md, here or in the phase that owns them [EVIDENCE: `plan.md` ADR-001, `decision-record.md` ADR-002 and ADR-003]
- [x] CHK-101 [P1] All ADRs this phase relies on have a status [EVIDENCE: ADR-001, ADR-002 and ADR-003 are Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: ADR-002 and ADR-003 each score three options]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: two phase 6 rows in the contract change log: rung selection, and the three operator-approved amendments of ADR-003]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: every run goes through `context.runBinary` with the configured timeout; the diagnosis timeout test shows `PROCESS_TIMEOUT` passes through before ffmpeg runs; `media_probe` on a 1.08 GB video answered in 342 ms cold and 36 ms warm, against NFR-P01's 2 seconds]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: a 10-second three-rung ladder took 887 ms over live stdio, against NFR-P02's 60 seconds; the six files under `tests/tools/media` ran 91 tests in 3.97 s]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: slowest phase 6 test 591 ms, `repair-strategies.vitest.ts` 're-encodes cut audio into a single AAC stream']
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: numbers under Verification in `implementation-summary.md`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: `plan.md` section 7, corrected at close, names each tool module, its tests, its `all-tools.ts` line and its registry row; no tool imports another tool]
- [x] CHK-121 [P0] Tools added here stay unreachable until a bundle is packed, so no feature flag is needed [EVIDENCE: the tools exist only in the local package; nothing is packed, published or committed]
- [x] CHK-122 [P1] `media_health` reports `libx264` and the `hls` muxer as present or absent [EVIDENCE: live `media_health` lists `libx264` present; contract 3.3.9 and 8.1 read encoders and filters only, so the `hls` muxer half is replaced by the contract, and a build without it fails the ladder's run as `PROCESS_FAILED` with no folder left]
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: Known Limitations and Handoff in `implementation-summary.md`]
- [ ] CHK-124 [P2] Packaging steps reviewed with `007-desktop-extension`, which owns them
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: T011: five findings, two fixed, one rejected with its reason, two resolved by the operator's amendments]
- [x] CHK-131 [P1] Licence of every new dependency recorded for THIRD_PARTY_NOTICES [EVIDENCE: no dependency was added in this phase]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: the ladder runs in its numbered folder with server-made relative patterns (a `%` test), every input passes the path guard, and every run carries the timeout]
- [x] CHK-133 [P2] No user media or metadata leaves the machine [EVIDENCE: the three tools open no network connection, and every input opens under `-protocol_whitelist file`]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: spec, plan, tasks, acceptance criteria, decision record, summary and goal agree at close]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: the live `tools/list` descriptions of the three tools state the contract's reads, writes, folder rule and timing note]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: Handoff in `implementation-summary.md` lists the names, file patterns and warnings for the integration phase]
- [x] CHK-143 [P2] Handoff notes for the next phase written [EVIDENCE: Handoff in `implementation-summary.md`]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Michel Kerkmeester | Operator and product owner | [ ] Approved |  |
| Orchestrator (Claude Opus) | Technical lead, reruns every gate | [ ] Approved |  |
| MiMo v2.6 Pro | Read-only reviewer | [ ] Approved |  |
<!-- /ANCHOR:sign-off -->
