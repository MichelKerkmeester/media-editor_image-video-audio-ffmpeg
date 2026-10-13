---
title: "Tasks: Phase 3: naming-and-placement-hardening"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "naming gate tasks"
  - "batch placement tasks"
  - "hardening verification checklist"
  - "batch scenario tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 3: naming-and-placement-hardening

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

- [x] T001 Read the ranked hardening changes and the operator's answers (`../001-deep-research/research/research.md`). Evidence: research sections 10 and 11 and OD-2 to OD-4 applied as goal decisions D4 to D6
- [x] T002 Measure the kernel's character count before any edit (`claude project/Custom Instructions.md`). Evidence: 26,262 characters
- [x] T003 [P] Inventory every writing tool description and every caller of `allocateOutputFolder` (`runtime/src/`). Evidence: 36 writing tools, 35 with placement. Callers: `sharp-output.ts:496`, `copy-then-encode.ts:297`, and the two context implementations in `tool-context.ts`
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Write the hard gate, the per-request batch definition and the `media_rename` wording into the kernel (`claude project/Custom Instructions.md`)
- [x] T005 Carry the same gate into the skill, `AGENTS.md` and Interactive Intelligence with a batch question template, both sides of the mirror (`sk-media-editor/SKILL.md`, `AGENTS.md`, `sk-media-editor/references/interactive-intelligence.md`, `claude project/knowledge/Media Editor - System - Interactive Intelligence.md`)
- [x] T006 [P] Add `targetFolder` to every writing tool with the containment check and the counted-name collision rule, with tests for a batch across separate calls, a target outside the export root, a missing folder, a traversal attempt, a symlink escape and a name collision (`runtime/src/core/output-folder.ts`, `runtime/src/server/`, `runtime/tests/`)
- [x] T007 [P] Rewrite the `fileName`, `subfolder` and writing-tool descriptions so the name is one the user confirmed (`runtime/src/server/field-schemas.ts`, `runtime/src/tools/`)
- [x] T008 Build `maxBytes` on `image_convert` for JPEG, WebP and AVIF as its own task: bounded quality search, structured failure when unreachable, no resize, PNG rejected, with tests per format. The server guard is declined (`runtime/src/tools/image/`, `runtime/src/core/errors.ts`, `runtime/tests/`)
- [x] T009 Add the Project batch and skill batch scenarios (`sk-media-editor/manual-testing-playbook/`)
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T010 Run `npm run test:pinned` and the playbook validator (`runtime/`, `sk-media-editor/manual-testing-playbook/`). Evidence: 86 files, 1,771 passed, 4 skipped, and 32 scenarios, 19 categories, 0 violations
- [ ] T011 Grade a real Project reply and a real skill reply against the batch scenarios, four PNGs and a clear prompt (`scratch/`). Deferred to 006, pending operator upload and live runs
- [x] T012 Compare the Interactive Intelligence pair with `cmp` and record the kernel's character count after the edit (`scratch/`). Evidence: `cmp` silent on all four changed pairs, kernel 27,556 characters, recorded in `implementation-summary.md` rather than `scratch/`
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [ ] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [ ] Manual verification passed
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

- [x] CHK-001 [P0] Requirements documented in spec.md
- [x] CHK-002 [P0] Technical approach defined in plan.md
- [x] CHK-003 [P1] Placement shape approved by the operator. Evidence: OD-2 in `../001-deep-research/spec.md`
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npm run typecheck` passes. Evidence: exit 0
- [x] CHK-011 [P0] No code comment names a spec path, phase or task id. Evidence: `rg` for `specs/`, `088`, `phase` and task ids over the changed runtime files found none
- [x] CHK-012 [P1] Folder targeting returns a tool error for a missing or outside folder. Evidence: placement tests and the live smoke, `PATH_NOT_ALLOWED` for `../in`
- [x] CHK-013 [P1] Code follows the runtime's existing patterns in `output-folder.ts`. Evidence: `MediaError` factories beside the existing ones, JSDoc on the export, `AllocatedFolder` reused
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [ ] CHK-020 [P0] All acceptance criteria met. Open: AC-005 deferred to 006, pending operator upload and live runs
- [ ] CHK-021 [P0] Project batch scenario passes on a graded real reply. Deferred to 006, pending operator upload and live runs
- [ ] CHK-022 [P0] Skill batch scenario passes on a graded real reply. Deferred to 006, pending operator upload and live runs
- [x] CHK-023 [P1] Placement tests cover several calls sharing one folder. Evidence: the batch test in `placement.vitest.ts` and the live smoke
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each of the seven root causes has a finding class and a named fix. Evidence: causes 1 to 4 by the kernel edits, 5 by the field descriptions, 6 by `targetFolder`, 7 by `PED-001` and `SED-004`
- [x] CHK-FIX-002 [P0] Same-class inventory of descriptions presenting an omitted name or folder as normal is complete. Evidence: 34 placement tools now name `targetFolder` in their description, 7 JSDoc lines took the same wording, 5 wrong "new numbered folder" claims were corrected, and the runtime READMEs, `ARCHITECTURE.md`, `README.md`, `INSTALL-GUIDE.md` and three reference pairs took the field or the batch rule
- [x] CHK-FIX-003 [P0] Consumer inventory of `allocateOutputFolder`, `fileNameField` and `subfolderField` is complete. Evidence: the two fields are consumed only by `listedInputSchema`, and `allocateOutputFolder` by the two writers and the two contexts
- [x] CHK-FIX-004 [P0] Folder targeting has adversarial tests for outside-root, symlink, missing folder and no-op cases. Evidence: `output-folder.vitest.ts` covers traversal, separators, NUL, `.`, `..`, both symlink cases, a plain file, a missing folder and never-creates
- [x] CHK-FIX-005 [P1] The 16-row matrix of surface by inputs by clarity by calls is listed before completion is claimed. Evidence: `implementation-summary.md`, Coverage matrix
- [x] CHK-FIX-006 [P1] Tests that read the export folder use an isolated sandbox. Evidence: `createSandbox` per test, the smoke in a scratch folder
- [x] CHK-FIX-007 [P1] Evidence is pinned to an explicit diff range in both repositories. Evidence: Media Editor `2749c54` and parent `0d9d802a`, each to the working tree
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets
- [x] CHK-031 [P0] A target folder outside the export folder is rejected. Evidence: tests and the live smoke
- [x] CHK-032 [P1] Symlinks cannot lead a write out of the export folder. Evidence: the symlink tests in `output-folder.vitest.ts`
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized
- [x] CHK-041 [P1] Interactive Intelligence pair byte-identical. Evidence: `cmp` silent
- [x] CHK-042 [P2] Kernel character count before and after recorded. Evidence: 26,262 and 27,556
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only. Evidence: run files lived in the session scratchpad, the phase `scratch/` holds only `.gitkeep`
- [x] CHK-051 [P1] scratch/ cleaned before completion
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 13 | 10/13 |
| P1 Items | 12 | 12/12 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-04. Open P0 items: CHK-020, CHK-021, CHK-022, all waiting on the operator's graded replies
<!-- /ANCHOR:summary -->

---
