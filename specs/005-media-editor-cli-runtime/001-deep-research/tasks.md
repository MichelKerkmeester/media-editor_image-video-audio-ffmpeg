---
title: "Tasks: Phase 1: deep-research"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "deep research tasks"
  - "research fan-out tasks"
  - "research verification checklist"
  - "research spot-check tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 1: deep-research

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

- [x] T001 Read `.skilled/commands/deep/research.md` and `deep-research-auto.yaml` end to end (`.skilled/commands/deep/`) Evidence: read before dispatch, followed as written.
- [x] T002 Confirm the three executor canaries in `../scratch/baseline.md` (`../scratch/baseline.md`) Evidence: canaries OK in `../scratch/baseline.md`.
- [x] T003 Write the `PRE-BOUND SETUP ANSWERS` block with both executor lines and the five focuses (`research/`) Evidence: `research/dispatch-prompt.md` and `research/deep-research-config.json`.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 [P] Run the deepseek lineage, 5 iterations (`research/lineages/deepseek/`) Evidence: 5 iterations, second attempt after one route-proof redispatch.
- [x] T005 [P] Run the luna lineage, 5 iterations (`research/lineages/luna/`) Evidence: 5 iterations.
- [x] T006 Synthesize both lineages with a ranked change list for phases 002 to 005 (`research/research.md`) Evidence: `research/research.md` section 11.
- [x] T007 Redispatch any iteration the leaf-reliability gate rejects, once, and record why (`research/`) Evidence: DeepSeek redispatched once, attempt 1 in `research/_attempts/deepseek-attempt-1/`.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T008 Count iteration files and check route-proof fields in each state record (`research/lineages/*/deep-research-state.jsonl`) Evidence: `verify-iteration.cjs` 10 of 10 OK.
- [x] T009 Spot-check load-bearing claims against the source and record the result (`implementation-summary.md`) Evidence: 35 checks in `research/research.md` section 17, summarized in `implementation-summary.md`.
- [x] T010 Record the operator's answers to the open design choices (`implementation-summary.md`) Evidence: Key Decisions table and `spec.md` Operator Decisions.
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
- [x] CHK-003 [P1] Executor canaries recorded in `../scratch/baseline.md`
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] No file under `AI Systems/` changed, checked with `git status` Evidence: `git status --porcelain` empty for `AI Systems` and for the Media Editor repository.
- [x] CHK-011 [P0] Every iteration file has content Evidence: 10 iteration files, 33 to 325 lines each.
- [ ] CHK-012 [P1] Every DeepSeek answer was read from the JSON with its `stopReason` Open: the fan-out runner invoked pi without `--mode json`, so no `stopReason` was captured. Non-empty iteration files that pass `verify-iteration.cjs` stand in as evidence.
- [x] CHK-013 [P1] Iteration files follow the workflow's own format Evidence: `verify-iteration.cjs` narrative check.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met Evidence: AC-001 to AC-006 Met.
- [x] CHK-021 [P0] 10 iteration state records carry the route-proof fields Evidence: all 10 kept iterations. Luna also holds one earlier iteration-1 record without route proof, superseded by its backfill.
- [x] CHK-022 [P1] Load-bearing claims spot-checked against the source
- [x] CHK-023 [P1] Executor errors reported with their exact message Evidence: no executor error. The DeepSeek route-proof miss is recorded in `research/research.md` section 4.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each ranked change names its finding class: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence`, or `test-isolation`. Evidence: finding-class lines under each phase in `research/research.md` section 11.
- [x] CHK-FIX-002 [P0] The same-class inventory of tool descriptions that present an omitted `fileName` as normal is complete. Evidence: `research/research.md` section 10.
- [x] CHK-FIX-003 [P0] The consumer inventory of gates that read the route order is complete. Evidence: `research/research.md` section 9.
- [x] CHK-FIX-004 [P0] The CLI config path is checked against bare-token, outside-root and empty-argv cases. Evidence: `loadConfig` run with empty, bare-token and flag argv, outside-root cited, `research/research.md` section 6.
- [x] CHK-FIX-005 [P1] The batch matrix axes and row count are listed. Evidence: 4 axes, 16 rows, `research/research.md` section 10.
- [ ] CHK-FIX-006 [P1] The shared `MEDIA_EDITOR_DATA_DIR` behavior is covered across separate CLI calls. Open: design recorded in `research/research.md` section 7. The cross-call test belongs to phase 004.
- [x] CHK-FIX-007 [P1] Cited line numbers are pinned to the Media Editor commit recorded in `../scratch/baseline.md`. Evidence: Media Editor commit `1bdd011`, stated in the `research/research.md` header.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets in prompts, iterations or `research.md` Evidence: pattern grep over `research/` found none.
- [x] CHK-031 [P0] Executors ran read-only against `AI Systems/` Evidence: Media Editor status empty before and after.
- [x] CHK-032 [P1] No credential values in recorded errors
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized
- [x] CHK-041 [P1] `research/research.md` cites a file for every load-bearing claim
- [x] CHK-042 [P2] Open choices listed for the operator Evidence: `research/research.md` section 12.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only Evidence: temporary files went to the session scratchpad outside the repository.
- [x] CHK-051 [P1] scratch/ cleaned before completion Evidence: `scratch/` holds `.gitkeep` and the coordinator-requested `closeout-fix.md`, no temporary files.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 11/13 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-04
<!-- /ANCHOR:summary -->

---
