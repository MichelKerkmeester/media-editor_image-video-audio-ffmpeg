---
title: "Tasks: Phase 12: media-folder-layout"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "media folder tasks"
  - "export path tasks"
  - "verification checklist"
  - "plugin output tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 12: media-folder-layout

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

Paths below are relative to `AI Systems/Media Editor/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 List the files in `export/` and sort them: the `file_example_*` samples are test files, the downloaded photos are source files
- [x] T002 Dry-run the path substitution and list every match by file: 84 matches in 31 files
- [x] T003 Back up `systems.py` to the scratchpad and confirm the five knowledge pairs are byte-identical before any edit
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Create `media files/import/`, `media files/export/` and `media files/tests/` with a `.gitkeep` each, move the files and remove `export/`
- [x] T005 Add the ignore block for `media files/import/` and `media files/tests/` to the repository `.gitignore`
- [x] T006 Run the substitution: 78 replacements in 30 files, since the root `README.md` is a symlink to the skill README
- [x] T007 Add the "Media folders" section and the `media files/import/` lookup rule to `AGENTS.md`, and the import and tests sentence to `SKILL.md` and the skill README
- [x] T008 Resync the three Media Editor residency rows with `resync_statement.py`, repeated until it reports 0
- [x] T009 Move the kernel and skill to v0.7.0, add `changelog/v0.7.0.0.md` and the dated `SYNC.md` note
- [x] T010 Set `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"` in `plugin.json`, add the output row to the plugin README and rebuild with `npm run plugin`
- [x] T011 [P] Update `INSTALL-GUIDE.md` and `USER-GUIDE.md`: the tree, `mkdir -p`, the allowed folder, the output setting and the test prompt
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T012 Search the live files for `export/` outside `media files/`: only the `SYNC.md` note that records the move, plus history in changelogs and benchmark reports
- [x] T013 Run `rule_parity.py`, residency and parity through the harness, and the grader fixtures
- [x] T014 `cmp` the five knowledge pairs
- [x] T015 Run `claude plugin validate`, the packaging tests and a live plugin server call on a throwaway project
- [x] T016 Update the parent phase map, goal binding and log
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Manual verification passed
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

- [x] CHK-001 [P0] Requirements documented in spec.md. Evidence: REQ-001 to REQ-007
- [x] CHK-002 [P0] Technical approach defined in plan.md. Evidence: sections 1, 3 and the fix addendum
- [x] CHK-003 [P1] Dependencies identified and available. Evidence: plan section 6, the live Project marked as the operator's
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes lint/format checks. Evidence: `rule_parity.py` exit 0 with `PASSED 6 rules`, `claude plugin validate` prints `Validation passed`
- [x] CHK-011 [P0] No console errors or warnings. Evidence: the residency harness prints `PASSED 1 system(s)`
- [x] CHK-012 [P1] Error handling implemented. Evidence: not applicable, no server code changed. The server's own `mkdirSync` creates `media files/export/` on first use
- [x] CHK-013 [P1] Code follows project patterns. Evidence: residency rows moved by `resync_statement.py`, never by hand
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met. Evidence: `acceptance-criteria.md`, 8 of 8 `Met`
- [x] CHK-021 [P0] Manual testing complete. Evidence: the installed extension server saved `media files/export/001 - photo-800webp/photo-resized.jpg` on 2026-10-03, a path with spaces, with no ffmpeg on PATH. The 2026-09-30 plugin run, before the rename, saved `media/export/001 - resized-sample/sample-resized.png`
- [x] CHK-022 [P1] Edge cases tested. Evidence: `media files/export/` did not exist before that call and the server created it
- [x] CHK-023 [P1] Error scenarios validated. Evidence: a hand edit of `systems.py` broke three statement keys and the harness failed, which is why the rows went through `resync_statement.py`
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each actionable finding has a finding class. Evidence: the result path is `class-of-bug`, every statement of it moved together
- [x] CHK-FIX-002 [P0] Same-class producer inventory completed. Evidence: the dry run, 84 matches in 31 files
- [x] CHK-FIX-003 [P0] Consumer inventory completed. Evidence: `rule_parity.py`, the residency rows, the grader fixtures and the plugin copy
- [x] CHK-FIX-004 [P0] Path fixes include adversarial table tests. Evidence: the regex skips `export/` after a path character, so `media files/export/` is never rewritten twice. The post-change search is the table
- [x] CHK-FIX-005 [P1] Matrix axes and row count listed. Evidence: skill source, knowledge mirror and plugin copy, five pairs by `cmp`
- [x] CHK-FIX-006 [P1] Hostile env or global-state variant. Evidence: `resync_statement.py` ran with a fresh `PYTHONPYCACHEPREFIX` to avoid stale bytecode
- [x] CHK-FIX-007 [P1] Evidence pinned to an explicit diff range. Evidence: nothing is committed, so the working tree against HEAD is the range
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets. Evidence: the manifest names `${CLAUDE_PROJECT_DIR}`, no personal path
- [x] CHK-031 [P0] Input validation implemented. Evidence: the output folder sits inside the plugin's allowed folder, so the path guard still applies
- [x] CHK-032 [P1] Auth/authz working correctly. Evidence: not applicable
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized
- [x] CHK-041 [P1] Code comments adequate. Evidence: the ignore block comment names the folders, no spec id
- [x] CHK-042 [P2] README updated. Evidence: skill README, Project README, plugin README and both guides
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only. Evidence: the backup, pairs file and test project live in the session scratchpad
- [x] CHK-051 [P1] scratch/ cleaned before completion
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 13/13 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-09-30
<!-- /ANCHOR:summary -->

---
