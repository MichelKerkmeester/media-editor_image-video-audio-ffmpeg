---
title: "Tasks: Phase 2: server foundation"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "server foundation tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 2: server foundation

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

One task is one file, or one module with its test, so each maps to one DeepSeek dispatch. Paths are relative to `AI Systems/Media Editor/mcp server/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 `package.json` with the pinned SDK 1.x, zod, sharp, `ffmpeg-static`, `ffprobe-static`, TypeScript and vitest, then `npm install` (`package.json`)
- [x] T002 `tsconfig.json`: NodeNext, `strict: true`, `outDir: dist` (`tsconfig.json`)
- [x] T003 `vitest.config.ts` including `tests/**/*.vitest.ts`, plus `.gitignore` (`vitest.config.ts`)
- [x] T004 [P] Copy the five clips from `../context/video-audio-mcp-main/tests/sample_files/` with a README naming the MIT source (`tests/fixtures/`)
- [x] T005 [P] Run `verify_alignment_drift.py --root "AI Systems/Media Editor/mcp server" --fail-on-warn` on the scaffold and record whether it accepts the root (`implementation-summary.md`) Recorded as a deviation: the script reads git-tracked files only, so `gate.sh` stands in.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T006 `MediaError` and the contract code list, with its test (`src/core/errors.ts`, `tests/core/errors.vitest.ts`)
- [x] T007 Configuration reader for environment and arguments, with its test (`src/core/config.ts`, `tests/core/config.vitest.ts`)
- [x] T008 Path guard with the adversarial table test (`src/core/path-guard.ts`, `tests/core/path-guard.vitest.ts`)
- [x] T009 Output folder allocator, with its test (`src/core/output-folder.ts`, `tests/core/output-folder.vitest.ts`)
- [x] T010 ffmpeg and ffprobe resolver, one test per lookup step (`src/core/ffmpeg-resolver.ts`, `tests/core/ffmpeg-resolver.vitest.ts`)
- [x] T011 Process runner with args array, no shell, timeout, stderr tail and cleanup, with its test (`src/core/process-runner.ts`, `tests/core/process-runner.vitest.ts`)
- [x] T012 Capability detector for `-encoders` and `-filters`, with its test (`src/core/capabilities.ts`, `tests/core/capabilities.vitest.ts`)
- [x] T013 Success and error result builders, with their test (`src/core/result.ts`, `tests/core/result.vitest.ts`)
- [x] T014 Media test helpers: fixture paths plus `lavfi` and sharp generators, with their test (`tests/helpers/media.ts`, `tests/helpers/media.vitest.ts`)
- [x] T015 Tool registry and server factory, with the registry test (`src/server/tool-context.ts`, `src/server/server-info.ts`, `src/server/tool-registry.ts`, `src/server/all-tools.ts`, `src/server/create-server.ts`, `tests/server/registry.vitest.ts`)
- [x] T016 `media_health`, with its test (`src/tools/media/health.ts`, `tests/tools/media/health.vitest.ts`)
- [x] T017 stdio entry and the smoke test that spawns the built server (`src/index.ts`, `src/core/logger.ts`, `tests/core/logger.vitest.ts`, `tests/server/stdio.vitest.ts`)
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T018 Full gate from spec.md section 4 on the final state
- [x] T019 `media_health` output from the stdio smoke test captured in `implementation-summary.md`
- [x] T020 MiMo read-only review of `path-guard.ts` and `process-runner.ts`, findings resolved
- [x] T021 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/002-server-foundation --strict`
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
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: `plan.md` sections 3 and 4 and the AI execution protocol]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: `plan.md` section 3, Contract Sections Implemented]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `npx tsc --noEmit` exit 0]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: both greps print nothing in `src` and `tests`]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: every thrown value is a `MediaError` or reaches the registry, which turns it into `INTERNAL` (registry test); hash errors are caught and fail closed]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate PASS on 38 files; the real script reads tracked files only, so the stand-in is a recorded deviation in `goal.md`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: AC-001 to AC-010 Met in `acceptance-criteria.md`; two Windows-only tests skipped and named under AC-002]
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: full run: 15 files, 265 tests, 261 passed, 4 skipped, exit 0]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: each section 8 case checked against a named test]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: error-path tests assert `code`]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: classification table under Inherited source defects in `implementation-summary.md`]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: the `child_process` and spawn grep lists only `src/core/process-runner.ts`]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: full suite rerun after every core change, final run 261 passed, 4 skipped]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: path-guard tests cover prefix sibling, symlink escape, quote in a name, a list with its last entry outside, output equal to input and no root; no filter string is built in this phase, so its escaping table belongs to phase 5]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: Matrix table in `implementation-summary.md`: three axes with the rows exercised]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: suite rerun with all seven `MEDIA_EDITOR_*` variables hostile: 261 passed, 4 skipped]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: Files Changed and Verification tables in `implementation-summary.md` name the files and command results]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: targeted grep for keys, tokens and personal paths is clean]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: `media_health` takes no path; the only route into `runBinary`'s `inputs` is `resolveInput` and `resolveInputs`, and later phase briefs carry the grep]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: `shell: true` grep prints nothing; the runner takes an argv array]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: `spec.md` Status is Complete, `plan.md` ADR-004 is Accepted with its Contract Sections Implemented table, and every task row is ticked]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: 103 exports checked, none without TSDoc; all 13 exported functions that throw directly carry `@throws`]
- [ ] CHK-042 [P2] Package README lists the tools this phase adds
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: test output goes under the OS temp folder and is removed after the run]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` holds `.gitkeep` only]
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

- [x] CHK-100 [P0] Architecture decisions documented in decision-record.md, here or in the phase that owns them [EVIDENCE: `decision-record.md` holds ADR-001 to ADR-003 and `plan.md` holds ADR-004]
- [x] CHK-101 [P1] All ADRs this phase relies on have a status [EVIDENCE: all four ADRs Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: each ADR carries an alternatives table with a rationale]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: amendments recorded in the `contract.md` change log]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: the timeout test stops a sleeping child and removes partial files]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: 3 s wall against the 60 s budget]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: 1045 ms, the two-children cap test]
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: Verification table in `implementation-summary.md`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: `git status` shows only the untracked package beside the earlier deletions, nothing staged; plan section 7 removes that folder]
- [x] CHK-121 [P0] Tools added here stay unreachable until a bundle is packed, so no feature flag is needed [EVIDENCE: no manifest, plugin file or bundle exists yet, so nothing can reach the server before phases 7 and 8]
- [x] CHK-122 [P1] `media_health` reports every binary and capability this phase depends on [EVIDENCE: live `media_health` reports both binaries and 28 capabilities]
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: Known Limitations and Handoff in `implementation-summary.md`]
- [ ] CHK-124 [P2] Packaging steps reviewed with `007-desktop-extension`, which owns them
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: review findings F1 to F6 resolved in `implementation-summary.md`]
- [x] CHK-131 [P1] Licence of every new dependency recorded for THIRD_PARTY_NOTICES [EVIDENCE: Dependency licences table in `implementation-summary.md`]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: review findings F1 to F6 and limitation 6]
- [x] CHK-133 [P2] No user media or metadata leaves the machine [EVIDENCE: no network module or call anywhere in `src`]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: `validate.sh --strict` prints `RESULT: PASSED` with Warnings 0, `AC_CLOSURE` 10/10 and no `GENERATED_METADATA_DRIFT`]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: live description and fields match contract 3.3.9]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: Handoff section names the settings, `media_health` and the licence limit]
- [x] CHK-143 [P2] Handoff notes for the next phase written [EVIDENCE: Handoff section in `implementation-summary.md`]
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
