---
title: "Acceptance Criteria: Phase 1: tool contract"
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
    packet_pointer: "003-media-editor-extension/001-tool-contract"
    last_updated_at: "2026-09-29T01:10:00Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Met AC-001 to AC-010 with observed evidence, AC-011 awaits operator"
    next_safe_action: "Operator reads contract.md and records approval in goal.md"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 90
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 1: tool contract

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/001-tool-contract
**Level:** 3
**Status:** Complete
**Date:** 2026-09-28
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the finished `contract.md`, When its unified table is compared name by name with the 8 Imagician and 27 video-audio registrations, Then every source tool maps to exactly one new name and the table has 39 rows | `grep -c '@mcp.tool()' ../context/video-audio-mcp-main/server.py` (27) and the list at `imagician/src/index.ts:31-194` (8), diffed against contract section 2. Observed 2026-09-29: `scratch/name-diff.md` re-run on contract 0.2 shows 39 unique rows, 35 of 35 source registrations mapped, 0 missing, 0 extra | Met | - |
| AC-002 | REQ-002 | Given any tool row, When a reader looks up its schema, Then every parameter has a type, a required flag or default, plus a range or enum where the source passed a raw string | Contract section 3, checked by the MiMo review. Observed 2026-09-29: 39 of 39 tool schema headings, 39 parameter tables each with a Unit column; MiMo review against the sources gave 14 findings, all fixed in 0.2 | Met | - |
| AC-003 | REQ-003 | Given an input under an allowed root, When any tool runs, Then the policy sends its output to a new `NNN - <description>/` folder and leaves the input untouched | Contract section 4 rules and adversarial case list. Observed 2026-09-29: contract section 4 states the `NNN - <slug>/` output rule and 4.4 lists the adversarial cases (separator, joined input list, outside root, output onto input, no root configured) | Met | - |
| AC-004 | REQ-004 | Given any failure, When a tool reports it, Then the result has `isError: true` and one code from the section 5 list | Contract section 5, each code referenced by a tool row or core rule. Observed 2026-09-29: section 5 lists fifteen codes, each appears outside its definition (`INTERNAL` least, one mention in section 7) | Met | - |
| AC-005 | REQ-005 | Given no override and no bundled binary for the platform, When the resolver runs, Then it tries system `PATH` and then points the caller at `media_setup_ffmpeg` | Contract section 6 lookup order. Observed 2026-09-29: section 6.1 to 6.6 give the four-step order; step 3 is the system PATH and 6.6 sends the caller to `media_setup_ffmpeg` | Met | - |
| AC-006 | REQ-006 | Given a successful run, When the tool returns, Then the result carries a text summary and structured outputs with path and bytes | Contract section 7 example result. Observed 2026-09-29: section 7 defines the text summary plus structured outputs with path and bytes, with an example result | Met | - |
| AC-007 | REQ-007 | Given a build without `drawtext`, When `video_add_text_overlay` is called, Then the contract requires `CAPABILITY_MISSING` before ffmpeg starts | Contract section 8 capability table. Observed 2026-09-29: section 8 capability table gates `video_add_text_overlay` on `drawtext` and returns `CAPABILITY_MISSING` before spawn | Met | - |
| AC-008 | REQ-008 | Given any ffmpeg run, When the process policy applies, Then a timeout, a stderr cap and temp-folder cleanup are specified | Contract section 8 process policy. Observed 2026-09-29: section 8.4 fixes the 1800 second timeout, the 64 KB and 4 KB stderr caps and the temp-folder cleanup | Met | - |
| AC-009 | REQ-009 | Given inventory section G, When each defect is looked up in the contract, Then one line names how the new tool avoids it | Contract section 9, 13 lines for G.1 to G.13. Observed 2026-09-29: section 9 carries G.1 to G.13, each with a class and one fix line | Met | - |
| AC-010 | REQ-010 | Given the attribution plan, When THIRD_PARTY_NOTICES is drafted from it, Then both upstream copyright lines appear verbatim and every bundled dependency is listed | Contract section 10 against `imagician/LICENSE:3` and `vam/LICENSE:3`. Observed 2026-09-29: both copyright lines appear verbatim in section 10 (`Hongyi Wang` 2024, `misbahsy` 2025), matching `imagician/LICENSE:3` and `vam/LICENSE:3`; section 10.3 lists dependency licences | Met | - |
| AC-011 | REQ-001 | Given the reviewed contract, When the operator reads it, Then approval is recorded with a date | `goal.md` log row: the operator answered 'Approve as built' on 2026-09-29 | Met | - |

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

**Closeable:** Yes

AC-001 to AC-010 are met with evidence observed on 2026-09-29, and AC-011 on the operator's dated approval of the same day, recorded in the `goal.md` log.
<!-- /ANCHOR:closure -->
