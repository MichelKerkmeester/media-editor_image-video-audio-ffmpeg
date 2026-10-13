---
title: "Acceptance Criteria: Phase 3: naming-and-placement-hardening"
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
    packet_pointer: "005-media-editor-cli-runtime/003-naming-and-placement-hardening"
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
# Acceptance Criteria: Phase 3: naming-and-placement-hardening

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 005-media-editor-cli-runtime/003-naming-and-placement-hardening
**Level:** 2
**Status:** In Progress
**Date:** 2026-10-04
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the kernel, When its naming rules are read, Then one hard question before the first writing call carries the proposed names and, for two or more inputs from one request, the choice between the export root and one numbered folder, and it applies even when the request is clear | Read-back of `claude project/Custom Instructions.md`: ALWAYS 9, ESCALATE 1 and Strict Sequence step 3 carry the one question with every name and, for two or more inputs, the place, even when the request is clear | Met | - |
| AC-002 | REQ-002 | Given the kernel, When the export and naming paragraphs are read, Then several files are defined per request and `media_rename` is named for renaming afterwards only | Read-back of `claude project/Custom Instructions.md`: the Export Protocol defines several files per request, and File Naming names `media_rename` for renaming afterwards only | Met | - |
| AC-003 | REQ-003 | Given the skill, `AGENTS.md` and Interactive Intelligence, When each is read, Then each carries the same gate, and the Interactive Intelligence pair compares equal | Read-back of `SKILL.md` ALWAYS 8 and ESCALATE 1, `AGENTS.md` step 2 and row 6, Interactive Intelligence rule 7 and the Batch question. `cmp` on the pair is silent | Met | - |
| AC-004 | REQ-004 | Given a batch written by separate tool calls, When the user chose one numbered folder, Then every file lands in that one folder through `targetFolder`, a target outside the export folder, missing, without the `NNN - ` prefix or escaping by traversal or symlink is rejected, and a name collision takes the next counted name without replacing a file | `placement.vitest.ts` and `output-folder.vitest.ts` under `npm run test:pinned`, plus the live stdio smoke: four calls, one folder, `-2` on a taken name | Met | - |
| AC-005 | REQ-005 | Given four PNGs in `media files/import` and a clear prompt to convert them to WebP under 100 KB, When a real Project reply and a real skill reply are graded, Then Turn 1 asks one question and writes nothing, and Turn 2 puts all four files in one place with readable names | Deferred to 006, pending operator upload and live runs. Graded replies to `PED-001` and `SED-004` will be saved in `../006-verify-and-release/scratch/` | Unmet | - |
| AC-006 | REQ-006 | Given the runtime, When the `fileName`, `subfolder` and writing-tool descriptions are read, Then each says the name must be one the user confirmed | The shared `fileName` description says the user confirmed the name, and a placement test asserts it on every placement tool. `rg` finds no stale placement clause in `runtime/src/tools` | Met | - |
| AC-007 | REQ-007 | Given the changed runtime and playbook, When `npm run test:pinned` and the playbook validator run, Then both pass and the validator counts the new scenarios | `npm run test:pinned`: 86 files, 1,771 passed, 4 skipped, exit 0. Playbook validator: 32 scenarios, 19 categories, 0 violations, exit 0 | Met | - |
| AC-008 | REQ-008 | Given the operator's answers after phase 001, When the phase closes, Then `maxBytes` on `image_convert` meets the target for JPEG, WebP and AVIF or returns a structured failure without resizing, PNG with `maxBytes` is rejected, and the server guard is recorded as declined | `convert.vitest.ts` covers reached for webp, jpeg and avif with dimensions kept and quality pinned, roomy, unreachable and PNG rejected. The server guard is recorded as declined | Met | - |

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

Seven of eight criteria are Met. AC-005 is deferred to 006, pending operator upload and live runs, and stays Unmet here: the skill side changes again in 005, and the Project side needs the operator to upload the kernel and Knowledge files first.
<!-- /ANCHOR:closure -->
