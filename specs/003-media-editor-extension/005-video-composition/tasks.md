---
title: "Tasks: Phase 5: video composition"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "video composition tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 5: video composition

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

- [x] T001 Save `ffmpeg -filters` from the bundled binary and record whether `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` and `overlay` are present (`implementation-summary.md`) [EVIDENCE: `ffmpeg -hide_banner -filters` on the bundled ffmpeg 6.0 darwin-arm64 lists all six plus `select`, `aselect`, `setpts`, `asetpts`, `fade`, `scale`, `format` and `colorchannelmixer`; `-buildconf` shows `--enable-libass`, `--enable-libfreetype` and `--enable-fontconfig`; recorded in implementation-summary.md]
- [x] T002 Escaping helper with its adversarial table test (`src/core/filter-escape.ts`, `tests/core/filter-escape.vitest.ts`) [EVIDENCE: 67 tests pass, among them 20 exact escape rows and the ffmpeg round trip of the 27-string battery (tests/core/filter-escape.vitest.ts:535) and a 200-string seeded fuzz (tests/core/filter-escape.vitest.ts:546) with 0 failures; dropping the colon escape or the quote wrapping fails 8 tests; gate PASS, 1091 passed and 4 skipped]
- [x] T003 Bundled font with its licence, and a resolver for its path (`assets/fonts/`, `src/core/font-path.ts`, `tests/core/font-path.vitest.ts`) [EVIDENCE: Source Sans 3 Regular in `assets/fonts/`, its OFL 1.1 licence in `assets/licenses/` because libass reads every file in the `fontsdir` folder; font-path tests pass, including a drawtext render of white glyphs with the bundled font; gate PASS, 1098 passed and 4 skipped]
- [x] T004 Test media generators: clips with audio, a clip with silent gaps, an SRT and a PNG (`tests/helpers/composition-media.ts`, `tests/helpers/composition-media.vitest.ts`) [EVIDENCE: silence-pattern audio and video, SubRip writer, fixture copy, alpha PNG and the `meanLuma` and `meanColor` frame readers; 10 helper tests pass; gate PASS, 1108 passed and 4 skipped]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T005 `video_add_text_overlay`, porting `test_add_text_overlay` (`src/tools/video/add-text-overlay.ts`, `tests/tools/composition/add-text-overlay.vitest.ts`) [EVIDENCE: plus the shared position table `src/core/overlay-position.ts` with 27 exact rows matching contract 3.3.1; 30 tool tests pass, text proven drawn by frame brightness; removing `expansion=none` fails the real `%` render and removing `fontfile=` fails the args snapshot; registry reordered to contract rows; gate PASS, 1211 passed and 4 skipped]
- [x] T006 `video_add_subtitles`, porting `test_add_subtitles` plus a drive-letter path case (`src/tools/video/add-subtitles.ts`, `tests/tools/composition/add-subtitles.vitest.ts`) [EVIDENCE: plus `filterSafeSubtitle` and `filterSafeFontDir` in `src/core/filter-escape.ts`; 23 tool tests pass, cues proven burned by frame brightness; removing the path escaping fails the colon-path and drive-letter cases; the orchestrator added copy-route tests for the subtitle and the text-overlay font, each failing when the copy is skipped; gate PASS, 1240 passed and 4 skipped]
- [x] T007 `video_add_image_overlay`, porting `test_add_image_overlay` (`src/tools/video/add-image-overlay.ts`, `tests/tools/composition/add-image-overlay.vitest.ts`) [EVIDENCE: 24 tool tests pass, overlay colour and timing proven by frame colour; dropping the start-only window fails two tests; `scale` is gated only when a size is given, per 8.2 rule 1 (contract row amended, `TOOL_REQUIREMENTS` row now `overlay`); gate PASS, 1264 passed and 4 skipped]
- [x] T008 `video_concat` without a transition, porting `test_concatenate_videos` plus a quote-in-name case (`src/tools/video/concat.ts`, `tests/tools/composition/concat.vitest.ts`) [EVIDENCE: plus `src/core/concat-list.ts`, whose list holds only `norm_<i>.mp4` names; 17 tool tests pass, including three clips joined in colour order and `it's.mp4`; dropping the `-r` normalization fails two tests; gate PASS, 1285 passed and 4 skipped]
- [x] T009 `video_concat` transition path, porting `test_concatenate_videos_with_xfade` plus an audio-bearing case (`src/tools/video/concat.ts`, `tests/tools/composition/concat-xfade.vitest.ts`) [EVIDENCE: 13 tests pass, among them dissolve and wipeleft on the source clips, a red-to-blue blend read by frame colour, and two clips with sound keeping one video and one audio stream; always leaving out `acrossfade` fails the audio case; gate PASS, 1298 passed and 4 skipped. The offset first came from the caller clip's probe; the T016 review found that against contract 3.3.5, and it now comes from a probe of `norm_0.mp4`]
- [x] T010 `media_remove_silence`, porting `test_remove_silence` plus a trailing-silence case (`src/tools/media/remove-silence.ts`, `tests/tools/composition/remove-silence.vitest.ts`) [EVIDENCE: 25 tests pass, trailing, leading and interior silences each shortening the output to the loud part; putting `PTS-STARTPTS` back fails the interior, video and graph tests, which proves the amended 3.3.6; gate PASS, 1323 passed and 4 skipped]
- [x] T011 `video_add_b_roll`, porting the five sub-cases of `test_add_b_roll` (`src/tools/video/add-b-roll.ts`, `tests/tools/composition/add-b-roll.vitest.ts`) [EVIDENCE: 28 tests pass, the five source sub-cases among them; a red-then-blue clip inserted at 2 s shows red at 2.5 s and blue at 4 s; removing the per-clip `setpts` shift fails six tests, which proves the amended 3.3.7; `audioMix` and `transitionIn` fail the strict entry schema; `TOOL_REQUIREMENTS` adds `setpts`; gate PASS, 1351 passed and 4 skipped]
- [x] T012 `video_add_fade`, porting `test_add_basic_transitions` (`src/tools/video/add-fade.ts`, `tests/tools/composition/add-fade.vitest.ts`) [EVIDENCE: 19 tests pass, the four source cases among them; a white clip fades up from black and down to black, read by frame brightness; starting the fade-out at 0 fails two tests; gate PASS, 1370 passed and 4 skipped]
- [x] T013 Capability-gating tests for the six filters with a stubbed capability set (`tests/tools/composition/capability-gating.vitest.ts`) [EVIDENCE: 15 tests pass: 13 refusals across all seven tools, each asserting `CAPABILITY_MISSING` with the exact `details`, 0 ffmpeg runs and no new folder, plus two controls that succeed without the conditional names; removing the `subtitles` gate fails its case; gate PASS, 1385 passed and 4 skipped]
- [x] T014 Registry test expects 35 tools (`tests/server/registry.vitest.ts`) [EVIDENCE: the orchestrator placed each tool at its contract row as it landed; tests/server/registry.vitest.ts pins all 35 names in contract row order and `toHaveLength(35)`, passing in the full suite]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T015 Full gate on the final state [EVIDENCE: gate PASS after the T016 fixes: `npx tsc --noEmit` exit 0; `npx vitest run` 64 files, 1392 tests, 1388 passed, 4 skipped, exit 0; greps, headers, line length, ephemeral ids and em dashes clean; alignment script 134 files, 0 findings; `npm run build` exit 0; live stdio `tools/list` over `dist/index.js` printed `COUNT: 35`]
- [x] T016 MiMo read-only review of every graph builder against the escaping invariant [EVIDENCE: MiMo v2.6 Pro (high) found the escaping invariant, argv blocks, 8.2 gates, handler checks, output names and caller-file inputs sound, and returned two P2 findings, both confirmed by reading the lines and fixed: the xfade offset now comes from a probe of the normalized first clip (`probeIntermediate`, contract 3.3.5), and `filterSafeSubtitle` sniffs the original before copying (contract 8.6); reverting either fix fails its new test]
- [x] T017 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/005-video-composition --strict` [EVIDENCE: after `repair-derived.cjs --apply`, `validate.sh --strict` printed `RESULT: PASSED`, exit 0, 2026-09-29]
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: `spec.md` section 4 holds REQ-001 to REQ-009]
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: `plan.md` sections 3 and 4 and the AI execution protocol, section 3 updated for `overlay-position.ts`, `concat-list.ts` and `runPipeline`]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: `plan.md` section 3 names contract 3.3, 8.2, 8.3, 8.5 and 8.6]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `npx tsc --noEmit` exit 0 on the final state]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: the `: any`, untyped `catch (error)`, `shell: true` and `'use strict'` greps over `src` print nothing]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: every tool failure is a `MediaError` from the handler, `probeMedia`, the stream gates, `runAttempts` or `runPipeline`; the composition tests assert `INVALID_INPUT`, `UNSUPPORTED_FORMAT`, `CAPABILITY_MISSING`, `PATH_NOT_ALLOWED` and `INPUT_NOT_FOUND` by code]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate PASS on 134 files, the recorded deviation in `../002-server-foundation/goal.md` (the real script reads tracked files only)]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: AC-001 to AC-007, AC-009 and AC-010 Met, AC-008 Superseded by AC-010 through ADR-002, in `acceptance-criteria.md`]
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: full run: 64 files, 1392 tests, 1388 passed, 4 skipped, exit 0]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: quote, colon, percent, newline and backslash text in the 27-row round trip `tests/core/filter-escape.vitest.ts:535`; `C:\clips\a.srt` in `add-subtitles.vitest.ts:504`; one concat clip refused by the schema in `concat.vitest.ts:507`; a fade longer than the clip in `add-fade.vitest.ts` (`longer-than-video`); no silence copied unchanged with a warning in `remove-silence.vitest.ts:489`; mixed sizes and rates normalized in `concat.vitest.ts:407`; an unknown transition and three clips with a transition in `concat-xfade.vitest.ts`]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: error-path tests assert `code` and `details` through `expectFailure`, never message text; no composition test reads `.message`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: classification table under Inherited source defects in `implementation-summary.md` (G2, G4, G5, G7, G8, G13, F1, F2, F3)]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: `grep` for `escapeFilterValue` and `quoteFilterValue` finds the helper as the only escaper, and no tool module writes a quote or colon escape of its own (MiMo checked each graph builder); every temp path a filter opens comes from `filterSafePath`, `filterSafeSubtitle` or `filterSafeFontDir`]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: `copy-then-encode.ts` gained `runPipeline`, `prepare` and `otherInputs`, `filter-escape.ts` the sniff-first copy and `media-properties.ts` `probeIntermediate`, and the full suite reran green on the final state]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: `tests/core/filter-escape.vitest.ts` tables 20 escape rows, 27 round-trip strings and a 200-string fuzz; the copy route is tested for a quoted subtitle and a quoted font folder; every tool file refuses an outside-root path; the no-op cases (no silence, an image overlay with no size) and the `aac` fallback of the subtitle, text and fade tools are tested]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: listed under Matrix in `implementation-summary.md`]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: the full suite reran with all seven `MEDIA_EDITOR_*` variables hostile: 1388 passed, 4 skipped]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: the summary names the file list and the gate output it was taken on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: no secrets, tokens or machine paths in the phase's source or tests; the one `/Users/me/` string is a made-up safe-set example in `filter-escape.vitest.ts:103`, and every input is generated at test time under the sandbox]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: each of the seven handlers calls `context.resolveInput` or `resolveInputs` before probing, and `PATH_NOT_ALLOWED` is tested in all eight tool test files]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: `grep -rn "shell: true" src` prints nothing, and every argv is an array of one token per element]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec, plan section 3, tasks, acceptance criteria and ADR-002 updated together at close]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: 76 of 76 exports in the phase's 13 source files carry TSDoc (the two `normalizePosition` overloads share one block), and every function that throws directly carries `@throws`]
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
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: ADR-001 lists its rejected alternatives and ADR-002 scores three options]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: two phase 5 rows in the `001-tool-contract/contract.md` change log: silence timestamps in 3.3.6, and the b-roll shift, even grid scale and image overlay `scale` gating in 3.3.7, 8.1 and 8.2]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: every run goes through `context.runBinary`, which uses `config.timeoutSeconds` when no timeout is passed (`src/server/tool-context.ts:354`); no phase 5 module passes one]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: the 9 composition files (196 tests) finish in 3.1 s of wall time, against the 4 minute budget]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: slowest test 676 ms, `concat-xfade.vitest.ts` 'test_concatenate_videos_with_xfade: dissolve']
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: numbers under Verification in `implementation-summary.md`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: `plan.md` section 7, corrected at close, removes one module, its test, its `all-tools.ts` line, its `TOOL_REQUIREMENTS` row and its registry and capability-gating test rows; no tool imports another tool, only the shared helpers]
- [x] CHK-121 [P0] Tools added here stay unreachable until a bundle is packed, so no feature flag is needed [EVIDENCE: `ALL_TOOLS` is reachable only through the built server, and no bundle exists yet]
- [x] CHK-122 [P1] `media_health` lists `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` and `overlay` as present or absent [EVIDENCE: a live `media_health` listed `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` and `overlay` present, and `tests/tools/media/health.vitest.ts` now asserts the six names]
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: Handoff under What Was Built in `implementation-summary.md`]
- [ ] CHK-124 [P2] Packaging steps reviewed with `007-desktop-extension`, which owns them
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: MiMo review completed with two P2 findings, both confirmed and fixed (T016)]
- [x] CHK-131 [P1] Font licence recorded for THIRD_PARTY_NOTICES [EVIDENCE: Source Sans 3 is under the SIL Open Font License 1.1 in `assets/licenses/SourceSans3-OFL.md`, recorded under Dependency licences in `implementation-summary.md` for `007-desktop-extension` T006; no npm dependency was added: `npm ls --depth=0` lists the same eight packages as phase 4]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: caller text reaches a graph only through the two-level escape with `expansion=none` (MiMo checked every builder, fuzz of 200 strings), traversal through `outputName` fails the schema and unsafe paths are copied, and every run is bounded by the timeout, the 50-entry caps and a subtitle sniff before any copy]
- [x] CHK-133 [P2] No user media or metadata leaves the machine [EVIDENCE: `grep` finds no fetch, http or net import in `src`, and ffmpeg runs under the file-only protocol whitelist]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: all phase documents updated together at close, and `validate.sh` prints `RESULT: PASSED`]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: the live `tools/list` schema of all 7 tools compared field by field with contract 3.3 on 2026-09-29: names, types, ranges, enums with their aliases, defaults and required lists match, `clips` accepts an empty list so the handler can return `INVALID_INPUT` `empty` as 3.3.7 says, all four annotations are false, and every field is described]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: the 7 names, the output file names and the warnings are listed under Handoff for `009-media-editor-integration`]
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
