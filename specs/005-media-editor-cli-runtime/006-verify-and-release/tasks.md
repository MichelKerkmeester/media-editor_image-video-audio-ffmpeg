---
title: "Tasks: Phase 6: verify-and-release"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "verify and release tasks"
  - "release gate tasks"
  - "release verification checklist"
  - "commit and push tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 6: verify-and-release

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

- [x] T001 Confirm phases 001 to 005 pass strict validation (`AI Systems/Media Editor/specs/005-media-editor-cli-runtime/`) [`validate.sh --recursive --strict` on 088: RESULT: PASSED for the parent and all six children]
- [x] T002 Clone both repositories into a sandbox (`scratch/`) [A shared clone of the parent with the live Media Editor and Sync Loop trees replayed as one commit, as in phase 005]
- [x] T003 [P] Read the baseline (`../scratch/baseline.md`) [86 files and 1,749 tests before phase 002, packaging 139 passed, playbook 30 scenarios]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Run the runtime tests, packaging tests, bundles and plugin build in the sandbox (`scratch/gates.md`) [All exit 0. `test:pinned` 91 files, 1,824 passed, 4 skipped. Packaging 149 passed, 2 skipped. 5 bundles. `claude plugin validate` passed on the manifest and the marketplace]
- [x] T005 Run the router, parity, residency, `pair_divergence`, `record_claims` and `carrier_query_evidence` gates in the sandbox (`scratch/gates.md`) [All exit 0 in the sandbox clone: differential 132/132, `rule_parity` 5 rules, parity 7/7, residency, `pair_divergence` 7 pairs, `record_claims` 58 claims, `carrier_query_evidence` all PASS. The live rerun waits for the commit]
- [x] T006 Run the playbook validator, `ci-skill-root-metadata`, `validate_skill_package --strict` and `validate.sh --strict` on 088 and every child (`scratch/gates.md`) [Playbook PASS with 32 scenarios, `ci-skill-root-metadata` passed 1 of 1, `validate_skill_package --strict` PASS, `validate.sh --recursive --strict` PASSED]
- [x] T007 Convert four PNGs through `media-editor` from a scratch folder (`scratch/smoke/`) [The live diagnostic run wrote four readable WebP files of 61,128 to 99,728 bytes into one folder through `media-editor` (`scratch/graded-replies/`)]
- [ ] T011 Grade a real Project reply to `PED-001` after the operator uploads the kernel and Knowledge files, and a real skill reply to `SED-004` on the CLI skill, then mark 003 AC-005 with the evidence (`scratch/graded-replies/`)
- [x] T012 Load the plugin in a live Claude Code session, convert one image through `media-editor` and confirm no MCP server starts, which is 005 success criterion SC-001 (`scratch/smoke/`) [Both live sessions listed no Media Editor MCP server, and the diagnostic run converted all four PNGs through `media-editor` (`scratch/graded-replies/`)]
- [x] T013 Write the Media Editor feature catalog to `sk-create-feature-catalog`, check every anchor with a script, run the mode's validators and replace the playbook's no-catalog lines with cross-references (`AI Systems/Media Editor/sk-media-editor/feature-catalog/`), operator amendment [69 leaves in 11 categories, written by Luna and reviewed by DeepSeek, kept current with every later fix. `validate_catalog_package.py` 0 violations, `validate_document.py` 0 issues on the edited files, the link and anchor script resolved all 1,220 relative links across both catalogs and both playbooks, and no scenario still says no catalog exists]
- [x] T014 Audit the Sync Loop feature catalog against the current Sync Loop code, fix stale or missing entries and broken anchors and run its validators (`AI Systems/z — Claude Project Sync Loop/feature-catalog/`), operator amendment [Rebuilt to 26 leaves by DeepSeek and reviewed by Luna in `scratch/review-syncloop-by-luna.md`. Findings F-006 and F-007 fixed in the catalog. F-001 to F-005 fixed in the playbook, whose every scenario was run in a sandbox clone (`scratch/sync-loop-playbook-run.md`) and rerun by the orchestrator. `--deny` documented. `validate_catalog_package.py` 0 violations, playbook validator 5 scenarios 0 violations]
- [x] T015 Run every Media Editor playbook scenario one at a time on its own packaging through `run_packaging.sh` at Sonnet 5.5 medium, to its last turn, and fix every failure at its cause (`AI Systems/Media Editor/benchmark/reports/`), operator amendment [Eleven full rounds, each failure classified and fixed at its cause, recorded in `scratch/gates.md`. Round 11: DeepSeek 32 PASS, Luna 31 PASS and PAI-001 a scenario contradiction, fixed in the contract and regraded PASS by both from the same bundle. Report `2026-10-05--manual-testing-playbook--claude-sonnet-5-5-medium/`, 32 of 32 PASS, `check_report.sh` and `twin_divergence.py` exit 0]
- [x] T016 Rerun every gate and the three plain-project live skill runs from the final state (`scratch/gates.md`, `scratch/graded-replies/`), operator amendment [27 gates exit 0 in the final-state rerun of `scratch/gates.md`: `test:pinned` 91 files and 1,826 passed, packaging 150 passed, differential 132/132, parity 7/7, residency, both playbooks and both catalogs 0 violations. The three live runs on the round 11 state each wrote nothing in Turn 1 and four readable WebP files into one folder in Turn 2 (`graded-replies/round7-run*`)]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T008 Ask the operator for the version, then write the changelog entry (`AI Systems/Media Editor/sk-media-editor/changelog/`) [The operator chose 1.1.0. Runtime, extension, plugin and marketplace at 1.1.0, Skill 1.1.0.0, kernel v1.1.0, `changelog/v1.1.0.0.md` written and a dated `SYNC.md` note added]
- [x] T009 Commit in both repositories after the operator's yes, then rerun the live gates (`scratch/gates.md`) [Operator's yes on 2026-10-05. Media Editor `215824e` with 415 paths and parent `71469389` with 447 paths, staged by pathspec and matched against `scratch/stage-*.txt`. Live gates at `71469389`: fixtures 22/22, differential 132/132, rule parity 5, parity 7/7, residency, pair divergence 7, record claims 58, carrier all PASS]
- [x] T010 Push and release after the operator's yes, and confirm `HEAD` equals `origin/main` in both (`scratch/gates.md`) [Operator's yes on 2026-10-05. Parent pushed `0d9d802a..71469389` with the Barter account, Media Editor pushed `2749c54..215824e`, `HEAD` equals `origin/main` in both. Release `v1.1.0.0` published as Latest at `215824e` with the five `.mcpb` files, each API digest equal to the local file. A follow-up the operator approved, the stale catalog phrase and the `tmp` override, pushed as Media Editor `ad758ed` and parent `3ea7118d`, live gates rerun with every exit 0]
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

- [x] CHK-001 [P0] Requirements documented in spec.md [REQ-001 to REQ-011 in `spec.md`, `SPEC_DOC_SUFFICIENCY` passes]
- [x] CHK-002 [P0] Technical approach defined in plan.md [`plan.md` phases and gate order, `validate.sh --strict` PASSED]
- [ ] CHK-003 [P1] Phases 001 to 005 closed
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Every gate's output and exit status read and recorded [`scratch/gates.md`, every row with its exit and result line, final-state, live and follow-up tables]
- [x] CHK-011 [P0] No gate weakened to pass [No gate script, threshold or flag changed to pass. The three scenario contract rewordings, PHL-001, SAI-001 and PAI-001, are each recorded with their cause in the rounds table]
- [x] CHK-012 [P1] Commit messages pass the commit-msg hook [All four commits went through the global commit-msg hook with exit 0, no attribution line]
- [x] CHK-013 [P1] Only intended paths staged [Release commits matched `scratch/stage-*.txt` exactly, 415 and 447 paths. Follow-up commits staged three named paths. Peer files `.env.example`, `.gitignore`, `opencode.json`, `tsconfig.pi.json` and `episodes/walk-state/` stayed out]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [AC-001 to AC-011 all Met in `acceptance-criteria.md`]
- [x] CHK-021 [P0] Every sandbox gate passed before the first commit [Final-state table in `scratch/gates.md`, 27 rows, every exit 0, before `215824e`]
- [x] CHK-022 [P1] Live gates passed after the parent commit [Every exit 0 at `71469389` and again at `3ea7118d`]
- [x] CHK-023 [P1] Smoke test produced four WebP files with readable names [`scratch/graded-replies/round7-run*`, four readable WebP files per run in one folder]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each gate failure found here has a finding class before it is fixed. [Rounds table classes each failure as system, scenario, harness or grader. The final rerun's validator failures are classed as invocation errors]
- [x] CHK-FIX-002 [P0] A fix for a gate failure goes back to its owning phase's files. [Rule fixes went to the kernel, `SKILL.md`, `AGENTS.md` and the runtime, harness fixes to `run_packaging.sh`, contract fixes to the playbook, each recorded in `SYNC.md` and the changelog]
- [x] CHK-FIX-003 [P0] The whole gate set reruns after any fix. [Full rebuild and gate rerun after every round fix, the final-state rerun after round 11, and the live rerun after the follow-up]
- [x] CHK-FIX-004 [P0] The push gate's deletion and rename counts are checked before the push. [3 deletions and 84 changed renames, 87 under the gate's 100, checked before the release push]
- [x] CHK-FIX-005 [P1] The gate by run matrix is listed with its row count. [`scratch/gates.md` final-state 27 rows, live 8 rows, follow-up 12 rows]
- [x] CHK-FIX-006 [P1] Sandbox gates run without reading a peer's working tree. [The clone took only the Media Editor and Sync Loop trees, which also carried a peer's 184 untracked `episodes/walk-state/` files from 2026-10-01. `carrier_query.py` reads that folder, so `carrier_query_evidence.py` reran in the clone with the folder moved out: exit 0, all checks PASS, no state file written]
- [x] CHK-FIX-007 [P1] Evidence is pinned to the release commits in both repositories. [Media Editor `215824e` and `ad758ed`, parent `71469389` and `3ea7118d`, release `v1.1.0.0` at `215824e`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets [Credential scan of both push ranges found no line]
- [x] CHK-031 [P0] No hook bypassed without the operator's yes [Every real commit and push ran its hooks. Only the throwaway sandbox clone committed with `core.hooksPath=/dev/null`. The pull-request rule bypass on `main` is the operator's standing decision]
- [x] CHK-032 [P1] The push account switched back after the push [`gh auth status` shows `MichelKerkmeester` active after both pushes]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized [`validate.sh --recursive --strict` RESULT: PASSED]
- [x] CHK-041 [P1] Changelog entry written for the approved version [`sk-media-editor/changelog/v1.1.0.0.md`, with the playbook-run rules, and the release notes of `v1.1.0.0`]
- [x] CHK-042 [P2] Parent goal log updated with the final evidence [`goal.md` log carries a row per criterion, `check-goal.cjs` PASSED 5 of 5]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only [Scripts and outputs lived in the session scratchpad. One stray `/tmp` file of the orchestrator's was removed]
- [x] CHK-051 [P1] scratch/ cleaned before completion [`scratch/` holds only cited evidence: gates, graded replies, verdicts, reviews, stage lists, commit drafts and the operator guide]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 12/13, CHK-003 waits on the operator's Project reply |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-05
<!-- /ANCHOR:summary -->

---
