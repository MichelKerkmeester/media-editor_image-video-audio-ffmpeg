---
title: "Tasks: Phase 4: video and audio core"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "video audio core tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 4: video and audio core

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

One task is one tool module with its registry line and its ported test, so each maps to one DeepSeek dispatch. Paths are relative to `AI Systems/Media Editor/mcp server/`. Test names refer to `vam/tests/test_video_functions.py`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Run `ffmpeg -encoders` from the bundled binary and record whether `libx264`, `aac`, `libmp3lame`, `libx265`, `libvpx-vp9` and `libopus` are present (`implementation-summary.md`) [EVIDENCE: bundled `ffmpeg-static` ffmpeg 6.0 on darwin-arm64, rerun 2026-09-29: all six present, plus `libvorbis`, `flac`, `pcm_s16le`, `mpeg4` and the filters `scale`, `pad`, `crop`, `atempo`, `setpts`; recorded in `implementation-summary.md`]
- [x] T002 ffprobe properties helper with its test (`src/core/media-properties.ts`, `tests/core/media-properties.vitest.ts`) [EVIDENCE: `src/core/media-properties.ts`, 23 tests, cover art ignored and the 30 fps fallback asserted, an unreadable file gives `PROCESS_FAILED` at `tests/core/media-properties.vitest.ts:506`]
- [x] T003 Time parsing helper with its test (`src/core/time-parse.ts`, `tests/core/time-parse.vitest.ts`) [EVIDENCE: `src/core/time-parse.ts`, 39 table-driven tests over seconds, `HH:MM:SS(.mmm)`, `MM:SS` and the rejected forms]
- [x] T003b Container tables, alias normalizers, shared zod fields and value parsers, added so the 19 tools share one source for flags, extensions and ranges (`src/core/media-containers.ts`, `src/server/media-fields.ts`, `tests/core/media-containers.vitest.ts`, `tests/server/media-fields.vitest.ts`) [EVIDENCE: 48 and 79 tests; the ffprobe-to-container map checked against real wav, mp3, flac, m4a and ogg files at `tests/core/media-containers.vitest.ts:381`]
- [x] T004 Copy-then-encode helper with a forced-failure test (`src/tools/video/copy-then-encode.ts`, `tests/tools/video/copy-then-encode.vitest.ts`) [EVIDENCE: `runAttempts` with 16 tests; a forced attempt-1 failure falls back on its own temp path at `tests/tools/video/copy-then-encode.vitest.ts:270`, both failing gives one capped `PROCESS_FAILED` at `:290`, no fallback on a timeout or spawn failure at `:384` and `:408`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T005 `audio_extract`, porting `test_extract_audio` (`src/tools/audio/extract.ts`, `tests/tools/audio/extract.vitest.ts`) [EVIDENCE: `src/tools/audio/extract.ts`, registered tenth in `src/server/all-tools.ts`; 15 tests, the oracle port at `tests/tools/audio/extract.vitest.ts:290` probes an audio-only mp3 within 0.15 s of the input and the input hash unchanged]
- [x] T006 `audio_convert_properties`, porting `test_convert_audio_properties` (`src/tools/audio/convert-properties.ts`, `tests/tools/audio/convert-properties.vitest.ts`) [EVIDENCE: `src/tools/audio/convert-properties.ts`, 11 tests; the oracle's wav, 192k, 44100 Hz, 2 channels and a 320k, 48000 Hz mp3 case checked by ffprobe]
- [x] T007 `audio_convert`, porting `test_convert_audio_format` (`src/tools/audio/convert.ts`, `tests/tools/audio/convert.vitest.ts`) [EVIDENCE: `src/tools/audio/convert.ts`, 13 tests over the five containers and the `aac` alias, container and codec read back by ffprobe]
- [x] T008 `audio_set_bitrate`, porting `test_set_audio_bitrate` (`src/tools/audio/set-bitrate.ts`, `tests/tools/audio/set-bitrate.vitest.ts`) [EVIDENCE: `src/tools/audio/set-bitrate.ts`, 14 tests; the input container is kept and a Matroska audio file is refused with `reason: container`]
- [x] T009 `audio_set_sample_rate`, porting `test_set_audio_sample_rate` (`src/tools/audio/set-sample-rate.ts`, `tests/tools/audio/set-sample-rate.vitest.ts`) [EVIDENCE: `src/tools/audio/set-sample-rate.ts`, 14 tests; 48000 Hz read back from a 44100 Hz input]
- [x] T010 `audio_set_channels`, porting `test_set_audio_channels` (`src/tools/audio/set-channels.ts`, `tests/tools/audio/set-channels.vitest.ts`) [EVIDENCE: `src/tools/audio/set-channels.ts`, 16 tests; mono to 2 channels and stereo to 1 read back by ffprobe]
- [x] T011 `video_trim`, porting `test_trim_video` and `test_trim_video_with_duration_check` (`src/tools/video/trim.ts`, `tests/tools/video/trim.vitest.ts`) [EVIDENCE: `src/tools/video/trim.ts`, 16 tests; the time order is a handler check (`end-not-after-start`), a PCM-in-Matroska input reaches attempt 2 and gets `aac` plus one fallback warning at `tests/tools/video/trim.vitest.ts:463`]
- [x] T012 `video_convert_properties`, porting `test_convert_video_properties` (`src/tools/video/convert-properties.ts`, `tests/tools/video/convert-properties.vitest.ts`) [EVIDENCE: `src/tools/video/convert-properties.ts`, 23 tests; the oracle's height 120, 30 fps, aac, 44100 Hz, 2 channels read back, the default pair of each of the five containers, and webm with libx264 refused as `PROCESS_FAILED` with no folder]
- [x] T013 `video_set_aspect_ratio`, porting `test_change_aspect_ratio` (`src/tools/video/set-aspect-ratio.ts`, `tests/tools/video/set-aspect-ratio.vitest.ts`) [EVIDENCE: `src/tools/video/set-aspect-ratio.ts`, 40 tests; pad and crop sizes read back by ffprobe, the same-ratio copy shortcut, and 320x240 to 21:9 giving an even 320x136 through `aspectFilter` at `src/tools/video/set-aspect-ratio.ts:294`]
- [x] T014 `video_convert`, porting `test_convert_video_format` (`src/tools/video/convert.ts`, `tests/tools/video/convert.vitest.ts`) [EVIDENCE: `src/tools/video/convert.ts`, 13 tests; mkv and mov keep the copied h264 and aac, webm reaches attempt 2 for vp9 and opus with one fallback warning]
- [x] T015 `video_set_resolution`, porting `test_set_video_resolution` (`src/tools/video/set-resolution.ts`, `tests/tools/video/set-resolution.vitest.ts`) [EVIDENCE: `src/tools/video/set-resolution.ts`, 12 tests; 160x120 and the height-only `h120` form read back, an odd height 121 recorded as `PROCESS_FAILED` at `tests/tools/video/set-resolution.vitest.ts:327`]
- [x] T016 `video_set_codec`, porting `test_set_video_codec` (`src/tools/video/set-codec.ts`, `tests/tools/video/set-codec.vitest.ts`) [EVIDENCE: `src/tools/video/set-codec.ts`, 10 tests; libx264, libx265 (hevc) and the `vp9` alias read back, with the `libvpx-vp9` file name]
- [x] T017 `video_set_bitrate`, porting `test_set_video_bitrate` (`src/tools/video/set-bitrate.ts`, `tests/tools/video/set-bitrate.vitest.ts`) [EVIDENCE: `src/tools/video/set-bitrate.ts`, 11 tests; the oracle's `2M` and a `50k` run whose video rate is at least 3x lower at `tests/tools/video/set-bitrate.vitest.ts:371`]
- [x] T018 `video_set_frame_rate`, porting `test_set_video_frame_rate` (`src/tools/video/set-frame-rate.ts`, `tests/tools/video/set-frame-rate.vitest.ts`) [EVIDENCE: `src/tools/video/set-frame-rate.ts`, 10 tests; 24 fps read back as `24/1` from a 25 fps input and 12.5 as `25/2` at `tests/tools/video/set-frame-rate.vitest.ts:316`]
- [x] T019 `video_set_audio_codec`, porting `test_set_video_audio_track_codec` (`src/tools/video/set-audio-codec.ts`, `tests/tools/video/set-audio-codec.vitest.ts`) [EVIDENCE: `src/tools/video/set-audio-codec.ts`, 12 tests; aac, libmp3lame, the `mp3` alias and libopus read back, an ffv1 picture reaches attempt 2 with one warning at `tests/tools/video/set-audio-codec.vitest.ts:348`, a video with no audio refused]
- [x] T020 `video_set_audio_bitrate`, porting `test_set_video_audio_track_bitrate` (`src/tools/video/set-audio-bitrate.ts`, `tests/tools/video/set-audio-bitrate.vitest.ts`) [EVIDENCE: `src/tools/video/set-audio-bitrate.ts`, 12 tests; 192k read back within 15 percent on a stereo input (the native AAC encoder caps a mono track near 118k), and 32k at least 3x lower at `tests/tools/video/set-audio-bitrate.vitest.ts:370`]
- [x] T021 `video_set_audio_sample_rate`, porting `test_set_video_audio_track_sample_rate` (`src/tools/video/set-audio-sample-rate.ts`, `tests/tools/video/set-audio-sample-rate.vitest.ts`) [EVIDENCE: `src/tools/video/set-audio-sample-rate.ts`, 12 tests; 48000 and 22050 Hz read back from a 44100 Hz input, the ffv1 input reaches attempt 2 with one warning]
- [x] T022 `video_set_audio_channels`, porting `test_set_video_audio_track_channels` (`src/tools/video/set-audio-channels.ts`, `tests/tools/video/set-audio-channels.vitest.ts`) [EVIDENCE: `src/tools/video/set-audio-channels.ts`, 12 tests; mono to 2 channels and stereo to 1 read back at `tests/tools/video/set-audio-channels.vitest.ts:346` and `:372`, the ffv1 input reaches attempt 2]
- [x] T023 `video_set_speed`, porting `test_change_video_speed` plus cases at 0.25 and 4.0 (`src/tools/video/set-speed.ts`, `tests/tools/video/set-speed.vitest.ts`) [EVIDENCE: `src/tools/video/set-speed.ts`, 23 tests; 1.5, 4.0, 0.25 and 0.5 read back by duration on video and audio, and the atempo chain table (4 gives `atempo=2.0,atempo=2.0`) in `tests/tools/video/set-speed.vitest.ts`]
- [x] T024 Registry test expects 28 tools (`tests/server/registry.vitest.ts`) [EVIDENCE: the 28 names in contract row order pinned at `tests/server/registry.vitest.ts:258`; a live stdio `tools/list` on the built server returned COUNT 28 on 2026-09-29]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T025 Full gate on the final state [EVIDENCE: final state: `npm run build` exit 0, `tsc --noEmit` exit 0, `vitest run` 50 files, 1017 passed, 4 skipped, exit 0, the same with all seven `MEDIA_EDITOR_*` variables hostile, stand-in alignment gate PASS on 108 files with 0 findings]
- [x] T026 Alias grep and args-order check from the plan.md inventories [EVIDENCE: the alias grep over `src` and a grep for `-ss` or `-to` after `-i` both print nothing; every tool argv starts with `-n`; the `trimArgs` snapshot at `tests/tools/video/trim.vitest.ts:604` fails when `-i` moves first]
- [x] T027 MiMo read-only review of the 19 modules against `vam/server.py` [EVIDENCE: MiMo v2.6 Pro (high) read the 19 modules, the five helpers and the tests against contract 3.2, 8.2 and `vam/server.py` and returned no findings; it read four test files in full and the rest by assertion pattern]
- [x] T028 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/004-video-audio-core --strict` [EVIDENCE: `RESULT: PASSED` on 2026-09-29 after `repair-derived.cjs --apply`]
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: `spec.md` section 4 holds REQ-001 to REQ-008]
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: `plan.md` sections 3 and 4, updated for the temp-file attempt helper]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: `plan.md` section 3 names contract 3.2 and 8.2]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `npx tsc --noEmit` exit 0 on the final state]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: the `: any`, untyped `catch (error)`, `shell: true` and `'use strict'` greps over `src` print nothing]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: every tool failure is a `MediaError` from the handler, `probeMedia`, the stream and container gates or `runAttempts`; tests assert `INVALID_INPUT`, `UNSUPPORTED_FORMAT`, `CAPABILITY_MISSING`, `PROCESS_FAILED`, `PROCESS_TIMEOUT`, `OUTPUT_EXISTS`, `PATH_NOT_ALLOWED` and `INPUT_NOT_FOUND` by code]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate PASS on 108 files, the recorded deviation in `../002-server-foundation/goal.md` (the real script reads tracked files only)]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: AC-001 to AC-006, AC-008 and AC-009 Met, AC-007 Superseded by AC-010 through ADR-002, and AC-010 Met, in `acceptance-criteria.md`]
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: full run: 50 files, 1021 tests, 1017 passed, 4 skipped, exit 0]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: start after end `tests/tools/video/trim.vitest.ts` (`end-not-after-start`), speed 0.25 and 4.0 in `set-speed.vitest.ts`, an audio tool on a silent video in each audio test, the matching-ratio copy in `set-aspect-ratio.vitest.ts`, a missing encoder at `set-codec.vitest.ts` and `copy-then-encode.vitest.ts:334`, both attempts failing at `copy-then-encode.vitest.ts:290`, an unreadable input at `tests/core/media-properties.vitest.ts:506`, and a stream mismatch in every tool file]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: error-path tests assert `code` and `details`, never message text; the fallback tests assert a warning count, never its wording]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: classification table under Inherited source defects in `implementation-summary.md` (G.3, G.4, G.5, G.9, G.10, G.11, G.13)]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: `grep -rnE 'child_process|spawn\(|writeFile|mkdir|copyFile|rename\(|process-runner' src/tools/audio src/tools/video` prints only the attempt helper, and the alias grep over `src` prints nothing]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: `copy-then-encode.ts` gained the attempt `warning`, and the full suite reran green on the final state]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: `tests/server/media-fields.vitest.ts` tables bad bitrates, resolutions, ratios, colours and times; every tool file refuses an outside-root path; the PCM and ffv1 inputs drive the fallback; the no-op cases (a 4:3 video to 4:3, mono channels on a mono input) are named in the tests]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: listed under Matrix in `implementation-summary.md`]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: the full suite reran with all seven `MEDIA_EDITOR_*` variables hostile: 1017 passed, 4 skipped]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: the summary names the file list and the gate output it was taken on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: no secrets, tokens or machine paths in `src/tools/audio`, `src/tools/video` or their tests; every input is generated at test time under the sandbox]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: every handler calls `context.resolveInput` before probing, and `PATH_NOT_ALLOWED` is tested in all 19 tool files]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: `grep -rn "shell: true" src` prints nothing, and every argv is an array of one token per element]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec edge cases, plan section 3 and ADR-001, tasks and acceptance criteria updated together at close]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: 89 of 89 exports in the phase's source files carry TSDoc, and every function that throws directly carries `@throws`]
- [ ] CHK-042 [P2] Package README lists the tools this phase adds
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: test output goes under the OS temp folder through `createSandbox`, and `scratch/` holds nothing this phase created]
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

**Verification Date**: 2026-09-29. Open rows: CHK-042 is deferred to `007-desktop-extension`, which owns packaging and user-facing docs, and CHK-124 goes with it. Operator and MiMo sign-offs are theirs to give.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Architecture decisions documented in decision-record.md, here or in the phase that owns them [EVIDENCE: `plan.md` ADR-001 and `decision-record.md` ADR-002]
- [x] CHK-101 [P1] All ADRs this phase relies on have a status [EVIDENCE: ADR-001 and ADR-002 are Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: ADR-001 lists two rejected alternatives and ADR-002 scores two options]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: the phase 4 row in the `001-tool-contract/contract.md` change log, with the edits in 3.2 rule 4, 3.2.1, 3.2.3, 3.2.6 and section 5]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: every run goes through `context.runBinary`, which uses `config.timeoutSeconds` when no timeout is passed (`src/server/tool-context.ts:354`); neither `runAttempts` nor `probeMedia` passes one]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: the 20 video and audio files (310 tests) finish in 3.61 s as vitest reports it, against the 3 minute budget]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: slowest test 437 ms, `set-frame-rate.vitest.ts` 'test_set_video_frame_rate: re-encodes 25 fps input to 24 fps and keeps aac']
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: numbers under Verification in `implementation-summary.md`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: `plan.md` section 7 removes one module, its test and one `all-tools.ts` line; no tool imports another tool, only the shared helpers]
- [x] CHK-121 [P0] Tools added here stay unreachable until a bundle is packed, so no feature flag is needed [EVIDENCE: `ALL_TOOLS` is reachable only through the built server, and no bundle exists yet]
- [x] CHK-122 [P1] `media_health` lists `libx264`, `aac`, `libmp3lame`, `libx265`, `libvpx-vp9` and `libopus` as present or absent [EVIDENCE: a live `media_health` listed all ten gated encoders present, and `tests/tools/media/health.vitest.ts` asserts the six names]
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: Handoff under What Was Built in `implementation-summary.md`]
- [ ] CHK-124 [P2] Packaging steps reviewed with `007-desktop-extension`, which owns them
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: MiMo review completed with no findings]
- [x] CHK-131 [P1] Licence of every new dependency recorded for THIRD_PARTY_NOTICES [EVIDENCE: no dependency was added: `npm ls --depth=0` lists the same eight packages and versions as phase 3]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: caller strings reach argv only through closed enums and parsed patterns (MiMo checked each), traversal through `outputName` fails the schema, and every run is bounded by the configured timeout]
- [x] CHK-133 [P2] No user media or metadata leaves the machine [EVIDENCE: `grep` finds no fetch, http or net import in the phase's source files, and ffmpeg runs under the file-only protocol whitelist]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: all phase documents updated together at close, and `validate.sh` prints `RESULT: PASSED`]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: the live `tools/list` schema of all 19 tools compared field by field with contract 3.2 on 2026-09-29: names, types, ranges, enums, aliases, defaults and required lists match, all four annotations are false, and every field is described]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: the 19 names, the output file names and the fallback warnings are listed under Handoff for `009-media-editor-integration`]
- [x] CHK-143 [P2] Handoff notes for the next phase written [EVIDENCE: Handoff under What Was Built in `implementation-summary.md`]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Michel Kerkmeester | Operator and product owner | [ ] Approved |  |
| Orchestrator (Claude Opus) | Technical lead, reruns every gate | [x] Approved | 2026-09-29 |
| MiMo v2.6 Pro | Read-only reviewer | [ ] Approved |  |
<!-- /ANCHOR:sign-off -->
