---
title: "Acceptance Criteria: Phase 1: deep-research"
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
    packet_pointer: "005-media-editor-cli-runtime/001-deep-research"
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
# Acceptance Criteria: Phase 1: deep-research

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 005-media-editor-cli-runtime/001-deep-research
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
| AC-001 | REQ-001 | Given the run has finished, When the lineage folders are listed, Then `research/lineages/deepseek/iterations/` and `research/lineages/luna/iterations/` each hold 5 iteration files with content | `ls research/lineages/*/iterations/iteration-*.md` lists 10 files, 33 to 325 lines each | Met | - |
| AC-002 | REQ-002 | Given the two state logs, When each iteration record is read, Then all 10 carry `target_agent`, `resolved_route`, `agent_definition_loaded` and `mode` | `verify-iteration.cjs` returns OK with route proof for all 10 kept iterations | Met | - |
| AC-003 | REQ-003 | Given both lineages, When synthesis completes, Then `research/research.md` merges them and ranks the changes for phases 002 to 005 | `research/research.md` sections 5 and 11 | Met | - |
| AC-004 | REQ-004 | Given `research/research.md`, When each load-bearing claim is read, Then it cites a file and line | Read of `research/research.md`, every load-bearing claim carries a path and line, 35 of them spot-checked in section 17 | Met | - |
| AC-005 | REQ-005 | Given the merged design, When the master orchestrator checks claims against the source, Then the checks and their results are recorded | `implementation-summary.md` verification table, detail in `research/research.md` section 17 | Met | - |
| AC-006 | REQ-006 | Given the open design choices, When the operator answers them, Then the answers are recorded before phase 002 starts | `implementation-summary.md` key decisions table, answers relayed by the coordinator on 2026-10-04 | Met | - |

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
