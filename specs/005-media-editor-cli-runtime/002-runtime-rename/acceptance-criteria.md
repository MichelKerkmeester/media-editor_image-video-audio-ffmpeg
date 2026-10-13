---
title: "Acceptance Criteria: Phase 2: runtime-rename"
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
    packet_pointer: "005-media-editor-cli-runtime/002-runtime-rename"
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
# Acceptance Criteria: Phase 2: runtime-rename

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 005-media-editor-cli-runtime/002-runtime-rename
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
| AC-001 | REQ-001 | Given the nested Media Editor repository, When the move runs, Then `mcp server/` is gone and `git status` in both repositories lists its tracked files as renames to `runtime/` | Nested: 204 R and 25 RM under `runtime/`, `mcp server/` gone. Parent: 224 D plus untracked `runtime/`, the unstaged view of the same move | Met | - |
| AC-002 | REQ-002 | Given both repositories, When `rg -n "mcp server"` and `reference_sites.py` run, Then every hit is a dated record: a changelog, report, episode or spec | `scratch/mentions.txt`: 4 `rg` leftovers, all dated or concept, and `reference_sites.py` adds only changelogs | Met | - |
| AC-003 | REQ-003 | Given `runtime/`, When `npm run test:pinned` and `npx vitest run tests/packaging` run, Then the file, test and packaging counts equal the baseline | 86 files, 1,749 passed, 4 skipped, and packaging 139 passed, 2 skipped, equal to `../scratch/baseline.md` | Met | - |
| AC-004 | REQ-004 | Given the Tools and Setup mirror pairs, When both sides are compared byte by byte, Then each pair is identical | `cmp` identical on the Tools and Setup pairs, and parity PASSED 7/7 in the sandbox clone | Met | - |
| AC-005 | REQ-005 | Given `runtime/`, When `npm run bundle -- --all` and `npm run plugin` run, Then both exit 0 | `npm run bundle -- --all` exit 0 with five bundles, `npm run plugin` exit 0 | Met | - |
| AC-006 | REQ-006 | Given the diff, When it is limited to `runtime/src/`, Then it holds only renames and no content change | `git diff -M --numstat HEAD` shows content changes under `runtime/src` only in 9 `README.md` files, no `.ts` file | Met | - |

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
