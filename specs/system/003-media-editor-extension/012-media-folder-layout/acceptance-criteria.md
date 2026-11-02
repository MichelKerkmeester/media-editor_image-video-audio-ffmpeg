---
title: "Acceptance Criteria: Phase 12: media-folder-layout"
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
    packet_pointer: "003-media-editor-extension/012-media-folder-layout"
    last_updated_at: "2026-09-30T10:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed the phase with every criterion met"
    next_safe_action: "Operator: commit, then re-upload the kernel and four knowledge files"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 12: media-folder-layout

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/012-media-folder-layout
**Level:** 2
**Status:** Complete
**Date:** 2026-09-30
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the Media Editor folder, When `media files/` is listed and staged in a dry run, Then it holds `export/`, `import/` and `tests/` and git would add only their `.gitkeep` files | `git add -n "media files"` lists three `.gitkeep` files and nothing else. The samples sit in `media files/tests/`, the photos in `media files/import/`, and `export/` is gone | Met | - |
| AC-002 | REQ-002 | Given the live Media Editor files, When they are searched for `export/` outside `media files/`, Then no file names it as the result folder | One hit is left: the `SYNC.md` note that records the move. Changelog history and recorded benchmark runs keep the path as it was | Met | - |
| AC-003 | REQ-003 | Given the five knowledge mirrors, When each is compared with its skill source, Then all match byte for byte | `cmp` on the five pairs: `mcp-imagician`, `mcp-video-audio`, `interactive-intelligence`, `media-framework` and `hls` all the same | Met | - |
| AC-004 | REQ-004 | Given the final state, When the Media Editor gates run, Then each passes | `rule_parity.py`: `PASSED 6 rules`. Residency harness: `PASSED 1 system(s)`. Grader: `all 2 report checks clean`. Parity harness: 8 findings, every one "differs from its committed revision at HEAD", which clears on commit | Met | - |
| AC-005 | REQ-005 | Given the plugin manifest, When its server starts in a project with a photo in `media files/import/`, Then a resize saves into `media files/export/` | `plugin.json` passes `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"`. On 2026-10-03 the installed extension server, given a `media files` folder with no `export/` yet, saved `media files/export/001 - photo-800webp/photo-resized.jpg` with no ffmpeg on PATH. The 2026-09-30 plugin run, before the rename, saved `media/export/001 - resized-sample/sample-resized.png`. Rebuilt on 2026-10-03, `claude plugin validate` prints `Validation passed`, and the packaging tests pass 25 of 25 | Met | - |
| AC-006 | REQ-006 | Given both guides, When a user follows them, Then they allow `media files/` and set the output folder to `media files/export/` | `USER-GUIDE.md` section 2 item 3 shows the tree, section 3 steps 2 and 3 set the folders and warn about empty rows, the test prompt reads from `media files/import`. `INSTALL-GUIDE.md` creates the three folders with `mkdir -p` and gives the same settings | Met | - |
| AC-007 | REQ-007 | Given the release, When the kernel, skill and records are read, Then they name v0.7.0 | Kernel H1 `v0.7.0`, `SKILL.md` `version: 0.7.0`, skill README `0.7.0.0`, `changelog/v0.7.0.0.md` exists, `SYNC.md` carries the dated note | Met | - |
| AC-008 | REQ-004 | Given the residency declaration, When it is compared with its backup, Then only Media Editor rows changed | `diff` against the scratchpad backup touches three statements between lines 1902 and 2083, all inside the Media Editor block at 1686 to 2119. A second resync pass reports 0 | Met | - |

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

All eight criteria are met.
<!-- /ANCHOR:closure -->
