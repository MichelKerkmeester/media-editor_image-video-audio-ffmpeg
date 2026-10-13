---
title: "Acceptance Criteria: Phase 6: verify-and-release"
description: "The criteria this packet must satisfy before it may be closed, each one met, waived by a decision record, or superseded by one."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-media-editor-cli-runtime/006-verify-and-release"
    last_updated_at: "2026-10-04T12:00:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Authored the acceptance criteria for this packet"
    next_safe_action: "Meet, waive or supersede the open criteria"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 6: verify-and-release

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 005-media-editor-cli-runtime/006-verify-and-release
**Level:** 2
**Status:** Draft
**Date:** 2026-10-04
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the finished runtime, When `npm run test:pinned`, the packaging tests, `npm run bundle -- --all` and `npm run plugin` run, Then each passes and its counts are reported against the baseline | `scratch/gates.md` | Met: final-state rerun in `scratch/gates.md`, every command exit 0. `test:pinned` 91 files, 1,826 passed, 4 skipped against the baseline 86 files and 1,749. Packaging 150 passed against 139. `bundle --all` 5 bundles, `npm run plugin` server 1.1.0, skill 61 files | - |
| AC-002 | REQ-002 | Given a sandbox clone, When the router, parity, residency, `pair_divergence`, `record_claims` and `carrier_query_evidence` gates run, Then each passes, and each passes again live after the parent commit | `scratch/gates.md` | Met: sandbox clone and live at `84992ac8` after the push, router fixtures 22/22, differential 132/132, parity 7/7, residency, rule parity 5 rules, `pair_divergence` 7 pairs, `record_claims` 58 claims and `carrier_query_evidence` all PASS, every exit 0 | - |
| AC-003 | REQ-003 | Given the skill, When the playbook validator, `ci-skill-root-metadata` and `validate_skill_package --strict` run, Then each passes | `scratch/gates.md` | Met: playbook validator 32 scenarios, 19 categories, 0 violations, `ci-skill-root-metadata` 1 of 1, `validate_skill_package --strict` PASS, in the final-state rerun | - |
| AC-004 | REQ-004 | Given the packet, When `validate.sh --strict` runs on 088 and on each child, Then each prints `RESULT: PASSED` | `scratch/gates.md` | Met: `validate.sh AI Systems/Media Editor/specs/005-media-editor-cli-runtime --recursive --strict` printed `RESULT: PASSED` with 0 errors and 0 warnings for the parent and each of the six children on 2026-10-05 | - |
| AC-005 | REQ-005 | Given a version, a commit, the push or the release, When it is about to happen, Then the operator's yes for it is recorded first | `implementation-summary.md` key decisions | Met: the operator chose version 1.1.0 on 2026-10-04 and answered yes to the commits, the push and the release on 2026-10-05 before each happened, recorded in the key decisions | - |
| AC-006 | REQ-006 | Given four PNGs in a scratch folder, When each is converted through `media-editor`, Then four WebP files exist and the JSON names their paths | `scratch/smoke/` | Met: the three final live runs converted the four PNGs through `media-editor` and each JSON result named its path, four WebP files of 61,128 to 99,728 bytes in one folder per run (`scratch/graded-replies/round7-run*`, the evidence lives there rather than in `scratch/smoke/`) | - |
| AC-007 | REQ-007 | Given the release commits, When their messages are read, Then each has a body and a `Spec:` trailer and no attribution line | `git log` in both repositories | Met: `git log -1` in both repositories shows a Context, Changes and Verification body, the trailer `Spec: 005-media-editor-cli-runtime` and no `Co-Authored-By` or `Claude-Session` line | - |
| AC-008 | REQ-008 | Given every scenario in the Media Editor playbook, When each runs alone on its own packaging to its last turn at Sonnet 5.5 medium, Then each passes its own criteria, and every first-run failure is classified, fixed at its cause and rerun | Report folder under `benchmark/reports/` | Met: `AI Systems/Media Editor/benchmark/reports/2026-10-05--manual-testing-playbook--claude-sonnet-5-5-medium/`, 32 of 32 PASS for both graders. Every failure of rounds 1 to 11 is classified and fixed at its cause in the `scratch/gates.md` rounds table | - |
| AC-009 | REQ-009 | Given the new Media Editor feature catalog, When the anchor check and the `sk-create-feature-catalog` validators run, Then every anchor resolves, every validator passes, and no playbook scenario still says no feature catalog exists | Validator output and the anchor check | Met: `validate_catalog_package.py` PASS with 0 violations, `validate_document.py` 0 issues, 1,220 relative links and anchors resolved by script across both catalogs and both playbooks, no scenario says no catalog exists | - |
| AC-010 | REQ-010 | Given the Sync Loop feature catalog, When it is audited against the current Sync Loop code and its validators run, Then no entry is stale or missing, every anchor resolves and every validator passes | Audit record and validator output | Met: audit in `scratch/review-syncloop-by-luna.md`, F-001 to F-007 fixed, every Sync Loop playbook scenario run in a sandbox clone and rerun by the orchestrator (`scratch/sync-loop-playbook-run.md`), catalog validator 0 violations, links resolved | - |
| AC-011 | REQ-011 | Given the final state after AC-008 to AC-010, When every gate and the three plain-project live skill runs rerun, Then each passes | `scratch/gates.md` and `scratch/graded-replies/` | Met: every gate exit 0 in the final-state rerun of `scratch/gates.md`, and the three live plain-project runs PASS (`scratch/graded-replies/round7-run*`) | - |

### Status values

| Value | Meaning |
|-------|---------|
| `Met` | Verified. The Verification cell names evidence that was actually observed. |
| `Unmet` | Not yet satisfied. Blocks closure. |
| `Waived` | Deliberately not pursued. Requires an ADR in the Waiver cell. |
| `Superseded` | Replaced by a different criterion or decision. Requires an ADR in the Waiver cell. |

### Waiver cell

Write `-` when the row is `Met` or `Unmet`. Write `ADR-NNN` when the row is
`Waived` or `Superseded`, naming a decision record that exists in
`decision-record.md`. A waiver naming an ADR that is not there fails validation:
the point of a waiver is that someone recorded the reasoning, so an unbacked
waiver is treated as an unmet criterion rather than as a pass.
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** No

Written when the phase closes.
<!-- /ANCHOR:closure -->
