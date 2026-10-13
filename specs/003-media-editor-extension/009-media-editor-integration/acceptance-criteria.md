---
title: "Acceptance Criteria: Phase 9: Media Editor integration"
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
    packet_pointer: "003-media-editor-extension/009-media-editor-integration"
    last_updated_at: "2026-09-28T16:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Authored the acceptance criteria for this packet"
    next_safe_action: "Meet, waive or supersede the open criteria"
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
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 9: Media Editor integration

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/009-media-editor-integration
**Level:** 3
**Status:** In review
**Date:** 2026-09-28
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given `SKILL.md` and the kernel, When their routing sections are read side by side, Then both give the same three routes in the same order | MiMo review note, and a grep for the route wording in both files. Observed: the same route sentence at `SKILL.md:77` and kernel `:45`, and the D6 wording review on GPT-6 Luna found no route conflict after its six findings were fixed | Met | - |
| AC-002 | REQ-002 | Given claude.ai web with no tools, When an advisory playbook scenario runs, Then the reply hands back the command and the attestation shows execution did not occur | PNE-001 and PGD-001 results. Not run: the scenarios need a live claude.ai web Project with the v0.6.0 kernel uploaded, which is the operator's step | Unmet | - |
| AC-003 | REQ-003 | Given the final state, When `run_parity.sh`, `rule_parity.py` and `run_residency.sh` run, Then all three pass | Gate outputs in `implementation-summary.md`. Observed: `rule_parity.py` and `run_residency.sh` pass, and `run_parity.sh` failed with 10 findings before the commit, each an edited file that differs from HEAD. After the operator's commit on 2026-09-30, `43b8899a`, all three pass: `PASSED 7/7 declared pairs`, `PASSED 6 rules` and `PASSED 1 system(s)` | Met | - |
| AC-004 | REQ-004 | Given the final state, When `git status --short` is read, Then nothing under `AI Systems/Media Editor/mcp servers/` is staged or restored unless the operator's logged answer allows it | `git status --short` output and the `goal.md` log row. Observed: `git diff --cached` named no file, and the ten `mcp servers/` deletions stayed unstaged ` D` rows, untouched by this phase. On 2026-09-30 the operator asked for the old folder deleted, and commit `6281eb51` records the ten deletions | Met | - |
| AC-005 | REQ-005 | Given each edited site, When it is compared with the inventory, Then its line matched at edit time or the mismatch is recorded | `scratch/line-check.md`: 294 citations, 292 matched, two mismatches recorded and confirmed by hand | Met | - |
| AC-006 | REQ-006 | Given `INSTALL-GUIDE.md`, When it is read from the top, Then the extension and plugin sections come before the manual ffmpeg install | Headings in `INSTALL-GUIDE.md`: section 3 runs 'Claude Desktop extension (recommended)', 'Claude Code plugin' and 'When the server finds no ffmpeg' before 'Manual ffmpeg' | Met | - |
| AC-007 | REQ-007 | Given the playbook, When its scenarios are listed, Then connected-tools and fallback scenarios exist and PNE, PID, PGD and PHL remain | Scenario index in `manual-testing-playbook.md` lists SRO-001, SRO-002 and PRO-001 beside PNE-001, PID-001, PGD-001 and PHL-001, and the validator prints `scenarios=19 categories=16 violations=0` | Met | - |
| AC-008 | REQ-008 | Given the kernel and mirrors, When the H1 and the `shasum` of each pair are checked, Then the version is bumped and every pair matches | `shasum -a 256` pair output: kernel H1 `v0.6.0`, and all seven knowledge files hash equal to a skill source | Met | - |
| AC-009 | REQ-009 | Given the changelog folder, When it is listed, Then `v0.6.0.0.md` records the routing change, and `SYNC.md` has a new review note only if the operator confirmed | `sk-media-editor/changelog/v0.6.0.0.md` records the routing change, and `SYNC.md` gained only a dated change note that says it is not a review, since the operator has not confirmed one | Met | - |
| AC-010 | REQ-010 | Given the rebuilt plugin, When its skill copy is hashed against `sk-media-editor/`, Then every file matches | `tests/packaging/build-plugin.vitest.ts` in the package: 'keeps the built plugin skill equal to its source' passes in the final gate after `npm run plugin` rebuilt the plugin | Met | - |
| AC-011 | REQ-001 | Given Claude Desktop with the extension installed, When the operator runs the connected-tools scenario, Then the Media Editor uses the MCP tools and saves into the chosen output folder | Operator result in the `goal.md` log. Not run: it needs Claude Desktop with the extension installed, which is the operator's step | Unmet | - |

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

Nine criteria are met, eight on evidence observed on 2026-09-29 and AC-003 after the commit of 2026-09-30. Two wait on the operator: AC-002 needs the kernel uploaded to a live claude.ai web Project, and AC-011 needs a Claude Desktop run with the extension. Neither is waived, because each one tests something no local check can stand in for.
<!-- /ANCHOR:closure -->
