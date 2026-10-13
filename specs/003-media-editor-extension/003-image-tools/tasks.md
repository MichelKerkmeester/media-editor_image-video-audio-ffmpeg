---
title: "Tasks: Phase 3: image tools"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "image tools tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 3: image tools

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

One task is one tool module with its registry line and its test, so each maps to one DeepSeek dispatch. Paths are relative to `AI Systems/Media Editor/mcp server/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Read the image rows of `../001-tool-contract/contract.md` and confirm the helper design against them [EVIDENCE: contract 3.1 image rows, 4.2, 4.3 and 5 read; the helper follows them, see `plan.md` section 3]
- [x] T002 Output helper that writes a sharp pipeline into an allocated folder, with its test (`src/tools/image/sharp-output.ts`, `tests/tools/image/sharp-output.vitest.ts`) [EVIDENCE: `src/tools/image/sharp-output.ts` with 21 tests in `tests/tools/image/sharp-output.vitest.ts`, folder removal proven on a throwing plan, a duplicate name and a truncated body]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T003 `image_resize` with its registry line and test (`src/tools/image/resize.ts`, `tests/tools/image/resize.vitest.ts`) [EVIDENCE: `src/tools/image/resize.ts`, 23 tests, input hash asserted unchanged at `tests/tools/image/resize.vitest.ts:257`]
- [x] T004 `image_convert` (`src/tools/image/convert.ts`, `tests/tools/image/convert.vitest.ts`) [EVIDENCE: `src/tools/image/convert.ts`, 30 tests over jpeg, png, webp and avif, the 30th pinning the format descriptions]
- [x] T005 `image_crop` with the bounds check (`src/tools/image/crop.ts`, `tests/tools/image/crop.vitest.ts`) [EVIDENCE: `src/tools/image/crop.ts`, 21 tests including the one-pixel-past-the-edge cases at `tests/tools/image/crop.vitest.ts:413-441`]
- [x] T006 `image_compress` with the size-change report (`src/tools/image/compress.ts`, `tests/tools/image/compress.vitest.ts`) [EVIDENCE: `src/tools/image/compress.ts`, 18 tests, growth case at `tests/tools/image/compress.vitest.ts:388`]
- [x] T007 `image_rotate` with colour validation (`src/tools/image/rotate.ts`, `tests/tools/image/rotate.vitest.ts`) [EVIDENCE: `src/tools/image/rotate.ts`, 25 tests, hex-only `background` rejected with -32602 at `tests/tools/image/rotate.vitest.ts:69`]
- [x] T008 `image_flip` (`src/tools/image/flip.ts`, `tests/tools/image/flip.vitest.ts`) [EVIDENCE: `src/tools/image/flip.ts`, 16 tests]
- [x] T009 `image_probe` without the modification time (`src/tools/image/probe.ts`, `tests/tools/image/probe.vitest.ts`) [EVIDENCE: `src/tools/image/probe.ts`, 17 tests, `lastModified`, `exif`, `icc`, `xmp` and `iptc` listed at `tests/tools/image/probe.vitest.ts:59-65` and asserted absent at `:170-172`, and a JPEG read with no folder written and the input hash unchanged at `:213-240`]
- [x] T010 `image_batch_resize` (`src/tools/image/batch-resize.ts`, `tests/tools/image/batch-resize.vitest.ts`) [EVIDENCE: `src/tools/image/batch-resize.ts`, 27 tests including `sizes[].height` after the review]
- [x] T011 Registry test expects 9 tools (`tests/server/registry.vitest.ts`) [EVIDENCE: `tests/server/registry.vitest.ts:258` lists 9 names and the read-only pair, and `ALL_TOOLS` holds 9]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T012 Full gate on the final state [EVIDENCE: final state: `tsc --noEmit` exit 0, `npm run build` exit 0, `vitest run` 26 files, 518 passed, 4 skipped, exit 0, hostile `MEDIA_EDITOR_*` run identical, stand-in alignment gate PASS on 60 files with 0 findings]
- [x] T013 MiMo read-only review of the eight modules against their contract rows [EVIDENCE: MiMo read-only review returned three findings (`outputName` separators, jpg alias in descriptions, batch-resize height coverage); all fixed. F1 is proven by a test that fails without the fix (removing the separator rule fails 28 of the 56 `output-name.vitest.ts` cases). F3 is proven by the description test in `convert.vitest.ts`, added at close-out after finding none existed and mutation-checked by putting `jpg` back into the description. F2 was a coverage gap, so its fix is the added tests. MiMo did not re-review the fixes]
- [x] T014 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/003-image-tools --strict` [EVIDENCE: `validate.sh` run after `repair-derived.cjs --apply`, `RESULT: PASSED`, Errors 0, Warnings 0, AC_COVERAGE 9/9, AC_CLOSURE 9/9]
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
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: `plan.md` sections 3 and 4 and the AI execution protocol]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: `plan.md` section 3, Contract Sections Implemented]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `npx tsc --noEmit` exit 0 on the final state]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: both greps print nothing in `src` and `tests`]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: every image failure is a `MediaError` from `sharp-output.ts` or the tool handler, and an unmapped write failure reaches the registry, which returns `INTERNAL` (`tests/tools/image/write-failure.vitest.ts`)]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate PASS on 60 files, the recorded deviation in `../002-server-foundation/goal.md` (the real script reads tracked files only)]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: AC-001 to AC-009 Met in `acceptance-criteria.md`, each observed by a literal run over the built server]
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: full run: 26 files, 522 tests, 518 passed, 4 skipped, exit 0]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: each `spec.md` section 8 case checked against a named test: crop edges `crop.vitest.ts:415-432`, missing dimension and empty size list and duplicate suffix in the resize and batch tests, a PDF, an SVG, a video and an oversize header in `probe.vitest.ts:277-301`, a file removed after the guard in `sharp-output.vitest.ts`, a refused disk write in `write-failure.vitest.ts`]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: error-path tests assert `code` and `details`, never message text]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: classification table under Inherited source defects in `implementation-summary.md`]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: `grep -rnE 'writeFile|mkdir|child_process|process-runner|runBinary' src/tools/image` prints nothing, so the helper is the only writer and no image tool spawns anything]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: core files were not changed in this phase, and the full suite reran green on the final state]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: `output-name.vitest.ts` runs 7 bad names through all 7 writing tools, and `sharp-output.vitest.ts` covers non-image content, the pixel limit and a truncated body]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: output format (jpeg, png, webp, avif) is a test axis in convert, compress, rotate, flip and the helper, listed under Matrix in `implementation-summary.md`]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: the full suite reran with all seven `MEDIA_EDITOR_*` variables hostile: 518 passed, 4 skipped]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: the summary names the file list and the gate output it was taken on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: no secrets, tokens or personal machine paths in `src/tools/image` or the image tests, and fixtures are generated at test time]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: every image handler calls `context.resolveInput` first, and the PATH_NOT_ALLOWED refusal is tested in all 8 tool files]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: `grep -rn "shell: true" src` prints nothing, and `child_process` is absent from `src/tools/image`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec, plan, tasks, acceptance criteria and goal updated together at close]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: 26 of 26 exports in `src/tools/image` carry TSDoc, and the three that throw directly carry `@throws`]
- [ ] CHK-042 [P2] Package README lists the tools this phase adds
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: test output goes under the OS temp folder through `createSandbox`, and `scratch/` holds nothing this phase created]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` is empty]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 15/15 |
| P1 Items | 23 | 23/23 |
| P2 Items | 9 | 7/9 |

**Verification Date**: 2026-09-29. Open rows: CHK-042 is deferred to `007-desktop-extension` and CHK-124 is not done. Operator and MiMo sign-offs are theirs to give.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Architecture decisions documented in decision-record.md, here or in the phase that owns them [EVIDENCE: `plan.md` ADR-001, plus the ADRs of the two earlier phases this phase builds on]
- [x] CHK-101 [P1] All ADRs this phase relies on have a status [EVIDENCE: ADR-001 is Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: `plan.md` ADR-001 lists two rejected alternatives]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: the `dimension-required` and the `imageEngine` and `outputName` amendments are in the `001-tool-contract/contract.md` change log]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: no image tool spawns a process, so NFR-P01 is a wall-clock bound: the slowest tool on a 4000 by 3000 JPEG was `image_convert` to avif at 2932 ms]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: the 11 image test files (256 tests) finish in 466 ms as vitest reports it, the tests span about 172 ms of wall time and the slowest single test takes 35 ms, against the 30 s budget]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: slowest test 31 ms, `batch-resize.vitest.ts` 'writes three sizes into one numbered folder']
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: numbers under Verification in `implementation-summary.md`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: `plan.md` section 7 removes one module, one test and one `all-tools.ts` line, which matches the files created]
- [x] CHK-121 [P0] Tools added here stay unreachable until a bundle is packed, so no feature flag is needed [EVIDENCE: `ALL_TOOLS` is reachable only through the built server, and no bundle exists yet]
- [x] CHK-122 [P1] `media_health` reports the sharp and libvips versions [EVIDENCE: `media_health` reports `imageEngine` with the sharp and libvips versions (`src/tools/media/health.ts`, tested in `tests/tools/media/health.vitest.ts`)]
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: Handoff under What Was Built in `implementation-summary.md`]
- [ ] CHK-124 [P2] Packaging steps reviewed with `007-desktop-extension`, which owns them
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: MiMo review completed with three findings, all resolved and verified by my own tests; MiMo did not re-review the fixes]
- [x] CHK-131 [P1] Licence of every new dependency recorded for THIRD_PARTY_NOTICES [EVIDENCE: sharp Apache-2.0 and libvips LGPL-3.0-or-later, already recorded in the phase 2 summary, and this phase adds no dependency]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: traversal through `outputName`, non-image content, a decode bomb and a truncated file each have a test]
- [x] CHK-133 [P2] No user media or metadata leaves the machine [EVIDENCE: no image tool opens a network connection, and `grep` finds no fetch or http import in `src/tools/image`]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: all six phase documents updated together at close, and `validate.sh` prints `RESULT: PASSED`]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: the live `tools/list` schema of all eight image tools compared field by field with contract section 3.1 on 2026-09-29: names, types, ranges, enums, defaults and annotations all match, and only `image_probe` is read-only]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: the output folder pattern, the seven settings and the `image_*` names are listed under Handoff for `009-media-editor-integration`]
- [x] CHK-143 [P2] Handoff notes for the next phase written [EVIDENCE: Handoff under What Was Built in `implementation-summary.md`]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Michel Kerkmeester | Operator and product owner | [ ] Approved |  |
| Orchestrator (Claude Sonnet 5.5) | Technical lead, reruns every gate | [x] Approved | 2026-09-29 |
| MiMo v2.6 Pro | Read-only reviewer | [ ] Approved |  |
<!-- /ANCHOR:sign-off -->
