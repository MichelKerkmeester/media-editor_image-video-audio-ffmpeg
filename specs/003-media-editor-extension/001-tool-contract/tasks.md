---
title: "Tasks: Phase 1: tool contract"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "tool contract tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 1: tool contract

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

Each task writes one contract section or runs one check. Setup reads and the review run on MiMo, section drafts run on DeepSeek into `scratch/sections/` (one file each, at most three at once), and the one opus-high writer assembles `contract.md` (plan.md, Execution model).
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Read `../context/source-inventory.md` sections A to I and list every UNKNOWN it leaves (`scratch/unknowns.md`)
- [x] T002 Spot-check ten inventory citations against `../context/imagician-main/src/index.ts` and `../context/video-audio-mcp-main/server.py`, record the result (`scratch/spot-check.md`)
- [x] T003 [P] Read `AI Systems/Media Editor/sk-media-editor/assets/hls-video-conversion.md` and `references/mcp-video-audio.md` for the Media Editor tool recipes
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Section 1, naming and parameter conventions with units (`contract.md`)
- [x] T005 Section 2, unified tool table, 39 rows with source file:line (`contract.md`)
- [x] T006 [P] Section 3, schemas for the 8 image tools (`contract.md`)
- [x] T007 [P] Section 3, schemas for the 19 conversion tools (`contract.md`)
- [x] T008 [P] Section 3, schemas for the 7 composition tools and `media_health` (`contract.md`)
- [x] T009 [P] Section 3, schemas for `media_probe`, `media_repair`, `video_hls_ladder` and `media_setup_ffmpeg` (`contract.md`)
- [x] T010 [P] Section 4, path policy with its adversarial case list (`contract.md`)
- [x] T011 [P] Section 5, error model and code list (`contract.md`)
- [x] T012 [P] Section 6, ffmpeg and ffprobe resolution order, variables and arguments (`contract.md`)
- [x] T013 [P] Section 7, result format with one success and one error example (`contract.md`)
- [x] T014 [P] Section 8, capability gating, process policy and escaping table (`contract.md`)
- [x] T015 [P] Section 9, one line per inventory section G defect (`contract.md`)
- [x] T016 [P] Section 10, MIT attribution plan and licences to fetch (`contract.md`)
- [x] T017 ADR-001 to ADR-003 (`decision-record.md`)
- [x] T022 Assemble `contract.md` from the `scratch/sections/` drafts in section order, resolving disagreements between drafts (`contract.md`)
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T018 Name diff: 35 source tool names against the unified table, 0 missing [EVIDENCE: re-run on contract 0.2, 39 rows, 35 of 35 source names, 0 missing (`scratch/name-diff.md`)]
- [x] T019 MiMo read-only review of `contract.md` against the sources, findings resolved [EVIDENCE: MiMo review found 6 P0, 3 P1, 5 P2, all fixed in 0.2 and logged in the contract change log]
- [x] T020 Operator approval recorded in the `goal.md` log [EVIDENCE: the operator answered 'Approve as built' on 2026-09-29, logged in `goal.md` and in the contract's status line and change log]
- [x] T021 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract --strict` [EVIDENCE: printed `RESULT: PASSED`, Errors 0, Warnings 0, after `repair-derived.cjs --apply` refreshed the graph fingerprint]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Operator approval recorded in `goal.md`
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: `spec.md` REQ-001 to REQ-010, strict validator passes]
- [x] CHK-002 [P0] Contract structure and review path defined in plan.md [EVIDENCE: `plan.md` sections Execution model and Rollback]
- [x] CHK-003 [P1] Inventory spot check recorded in scratch/ [EVIDENCE: `scratch/spot-check.md`, ten citations]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Every tool row has a schema block, none left as prose [EVIDENCE: 39 schema headings, 39 parameter tables, checked by script 2026-09-29]
- [x] CHK-011 [P0] Parameter names are camelCase and every tool name starts with `image_`, `video_`, `audio_` or `media_` [EVIDENCE: no tool name outside the four prefixes, no parameter outside camelCase (other first-column tokens are enum values)]
- [x] CHK-012 [P1] Every error code in section 5 is used by a tool row or core rule [EVIDENCE: all fifteen codes appear outside their definition, `INTERNAL` in section 7]
- [x] CHK-013 [P1] Every quality, bitrate and time parameter states its unit [EVIDENCE: all 39 parameter tables carry a Unit column]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: AC-001 to AC-011 Met, AC-011 on the operator's approval of 2026-09-29]
- [x] CHK-021 [P0] Name diff finds all 35 source names in the table [EVIDENCE: `scratch/name-diff.md`]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a contract rule [EVIDENCE: spec.md section 8: 4.4 cases, 6.6 `media_setup_ffmpeg` message, 8.4 timeout rows, 8.2 gates, 8.5 drive-letter row]
- [x] CHK-023 [P1] MiMo review findings resolved [EVIDENCE: 14 findings, contract change log 0.2]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each inventory section G defect has a class and a contract line [EVIDENCE: section 9.1 has G.1 to G.13, each with a class and a section]
- [x] CHK-FIX-002 [P0] Same-class defects grouped: every raw-string filter parameter (G.4) falls under one escaping or validation rule [EVIDENCE: G.4 falls under the one helper in 8.5 and the schema rule in 3.2 rule 2]
- [x] CHK-FIX-003 [P0] Every later phase that consumes a section is named in it [EVIDENCE: sections 1, 6 and 9 gained phase names on 2026-09-29, every section now names its builder]
- [x] CHK-FIX-004 [P0] Path policy lists delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: contract 4.4 rows: separator, joined input list, outside root, output onto input, no root configured]
- [x] CHK-FIX-005 [P1] Matrix axes listed: 5 platforms, 3 media kinds, 4 binary lookup steps [EVIDENCE: contract 6.10 lists the three axes]
- [x] CHK-FIX-006 [P1] Hostile values listed for every `MEDIA_EDITOR_*` variable [EVIDENCE: contract 6.9 has a hostile-value row for each of the seven variables]
- [x] CHK-FIX-007 [P1] Contract version and date stated in its header [EVIDENCE: contract header: version 0.2, 2026-09-28, change log dated rows]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets or personal paths in the contract [EVIDENCE: no keys, tokens or personal paths (only the placeholder `/Users/me`)]
- [x] CHK-031 [P0] Path policy covers inputs, outputs, temp folders and font files [EVIDENCE: contract 4.1 to 4.4 cover inputs, outputs, the temp folder and font files]
- [x] CHK-032 [P1] No-shell rule and escaping helper specified [EVIDENCE: 8.3 (no shell, argv array) and 8.5 (one escaping helper)]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: `validate.sh 001-tool-contract --strict` printed `RESULT: PASSED` on 2026-09-29 with 0 errors and 0 warnings]
- [x] CHK-041 [P1] Every source claim cites file:line [EVIDENCE: 818 file:line citations, review corrected three, spot check of ten]
- [x] CHK-042 [P2] Contract has a change log section for later amendments [EVIDENCE: contract `Change log` section]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: the packet folder holds the seven packet docs, `contract.md` and `scratch/` only; the ffmpeg runs wrote inside `scratch/escape-check/`]
- [ ] CHK-051 [P1] scratch/ cleaned before completion (DEVIATION: kept on purpose, `scratch/` holds the evidence files the contract and summary cite; the operator decides whether to prune `scratch/sections/` drafts)
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 14/15 |
| P1 Items | 23 | 22/23 |
| P2 Items | 9 | 9/9 |

**Verification Date**: 2026-09-29. Open: CHK-020 (AC-011 needs operator approval) and CHK-051 (scratch kept on purpose)
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] ADR-001 to ADR-003 written in decision-record.md [EVIDENCE: `decision-record.md` ADR-001 to ADR-003]
- [x] CHK-101 [P1] Each ADR has a status [EVIDENCE: all three ADRs show Status Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: each ADR lists rejected alternatives]
- [x] CHK-103 [P2] Amendment procedure stated in the contract [EVIDENCE: contract `How to use this contract` and `Change log`]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Default timeout stated (NFR-P01) [EVIDENCE: 1800 seconds, section 8.4]
- [x] CHK-111 [P1] stderr cap stated (NFR-P02) [EVIDENCE: 64 KB kept in process, 4 KB returned, section 8.4]
- [x] CHK-112 [P2] Large-file guidance from `sk-media-editor/references/mcp-video-audio.md:232-239` reflected in tool descriptions [EVIDENCE: section 8.4 large-file row]
- [x] CHK-113 [P2] Timeout override variable named [EVIDENCE: `MEDIA_EDITOR_TIMEOUT_SECONDS`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback (amend in place) documented in plan.md [EVIDENCE: `plan.md` Rollback plan]
- [x] CHK-121 [P0] No feature flag applies, since the contract ships no code [EVIDENCE: the contract ships no code, nothing to flag]
- [x] CHK-122 [P1] Variable and argument names fixed for phases 7 and 8 [EVIDENCE: contract 6.8 table]
- [x] CHK-123 [P1] Handoff note for phase 2 written [EVIDENCE: `implementation-summary.md`, Handoff to phase 2]
- [x] CHK-124 [P2] Contract linked from each later phase's plan [EVIDENCE: plans 002 to 008 each cite the contract]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] MiMo security read of sections 4, 5 and 8 completed [EVIDENCE: MiMo security run over sections 4, 5 and 8, rules added and checked on ffmpeg 6.0 (change log 0.2)]
- [x] CHK-131 [P1] Licence list for every planned dependency written [EVIDENCE: contract 10.3]
- [x] CHK-132 [P2] GPL obligation for bundled ffmpeg stated with its handling [EVIDENCE: contract 10.4]
- [x] CHK-133 [P2] No tool sends media or metadata off the machine [EVIDENCE: contract 10.5 first rule]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: same strict run, plus spec.md, acceptance-criteria.md and implementation-summary.md agree the packet is in review with operator approval open]
- [x] CHK-141 [P1] Tool descriptions written fresh, not copied from source docstrings (inventory G.13) [EVIDENCE: 3.2.21 and 3.3.12 author descriptions from schemas, G.13 fix in section 9]
- [x] CHK-142 [P2] Error messages reviewed for plain language [EVIDENCE: section 5 message column, plain sentences]
- [x] CHK-143 [P2] Handoff notes for phase 2 written [EVIDENCE: `implementation-summary.md`, Handoff to phase 2]
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
