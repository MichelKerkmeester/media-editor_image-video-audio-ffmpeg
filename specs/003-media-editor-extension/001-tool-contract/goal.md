---
title: "Goal: Phase 1: tool contract"
description: "The durable directive this packet executes against and the criteria that decide when it is done."
trigger_phrases:
  - "packet goal"
  - "durable directive"
  - "completion criteria"
  - "goal binding"
importance_tier: "important"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/001-tool-contract"
    last_updated_at: "2026-09-28T16:30:00Z"
    last_updated_by: "scaffold"
    recent_action: "Authored the durable directive"
    next_safe_action: "Execute against the completion criteria"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
# Goal: Phase 1: tool contract

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Write, and get approved, one contract that fixes the name, parameter schema, path rules, errors, ffmpeg lookup, result shape and attribution for all 39 Media Editor MCP tools.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | This phase writes documents only, inside `001-tool-contract/` |
| D2 | Every source tool is kept and gets exactly one new name |
| D3 | Later phases amend `contract.md` in place with a dated note, never a copy |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `contract.md` exists in `001-tool-contract/` and its unified tool table has 39 rows
- [x] A name diff finds 0 of the 35 source tools unmapped
- [x] `decision-record.md` holds ADR-001, ADR-002 and ADR-003
- [x] The `goal.md` log records the operator's approval of `contract.md` with a date
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract --strict` prints `RESULT: PASSED`
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:log -->
## 4. LOG

Everything below is VOLATILE. It is not part of the directive, it is not copied
into the objective, and it is expected to grow. Progress, evidence, deviations
and findings belong here.

### Progress

| Item | State | Evidence |
|------|-------|----------|
| Phase opened | Done | 2026-09-28 |
| T020 operator approval of contract.md | done | 2026-09-29: asked whether to record approval of contract.md with the amendments approved in phases 6, 7 and 8, the operator answered 'Approve as built'. The contract status line and its change log now say so |
| contract.md 39 rows, name diff 0 of 35 unmapped, ADR-001 to ADR-003 | done | scratch/name-diff.md re-run on 0.2, decision-record.md all Accepted |
| strict validation | done | validate.sh 001-tool-contract --strict printed RESULT: PASSED on 2026-09-29, Errors 0 Warnings 0 |

### Deviations and findings

| Item | Note |
|------|------|
| None yet | - |
<!-- /ANCHOR:log -->
