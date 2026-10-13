---
title: "Tasks: Phase 2: runtime-rename"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "runtime rename tasks"
  - "mention sweep tasks"
  - "rename verification checklist"
  - "mirror pair edit tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 2: runtime-rename

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
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Capture `git status` in both repositories and stop on any peer edit under the folder (`AI Systems/Media Editor/`) Evidence: nested status empty before the move, parent showed only peer edits outside Media Editor.
- [x] T002 List every `mcp server` mention and sort it into live and dated (`scratch/mentions.txt`) Evidence: `scratch/mentions.txt`.
- [x] T003 [P] Check every gate and script for a path built from the folder name (the Sync Loop folder) Evidence: no script, gate or config builds a path from the folder name. `rg` found none in code, `systems.py` or benchmark files.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Move the folder with `git mv "mcp server" runtime` (`AI Systems/Media Editor/runtime/`) Evidence: 229 renames staged in the nested repository.
- [x] T005 Update the top-level docs (`README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `AGENTS.md`)
- [x] T006 Update the skill and both sides of the Tools and Setup mirror pairs (`sk-media-editor/`, `claude project/knowledge/`) Evidence: `cmp` identical on both pairs.
- [x] T007 Update the four playbook files, the 22 code READMEs and the server docs (`sk-media-editor/manual-testing-playbook/`, `runtime/`) Evidence: 4 playbook files, 25 runtime docs.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T008 Run `npm run test:pinned` and `npx vitest run tests/packaging` and compare with the baseline (`runtime/`) Evidence: 86 files, 1,749 passed, 4 skipped. Packaging 139 passed, 2 skipped.
- [x] T009 Run `npm run bundle -- --all` and `npm run plugin` (`runtime/`) Evidence: both exit 0.
- [x] T010 Rerun the leftover-mention check and the mirror pair parity check (`scratch/mentions.txt`) Evidence: `scratch/mentions.txt`, 4 leftovers, all dated or concept.
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

- [x] CHK-001 [P0] Requirements documented in spec.md
- [x] CHK-002 [P0] Technical approach defined in plan.md
- [x] CHK-003 [P1] No peer edit under the folder in either repository Evidence: nested status empty before the move.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `git diff --stat` shows no change under `runtime/src/` Evidence: only 9 `README.md` files change content under `runtime/src/`, no `.ts` file.
- [x] CHK-011 [P0] `git status` records the move as renames Evidence: 204 R and 25 RM in the nested repository.
- [x] CHK-012 [P1] Every edited doc still passes its format gate Evidence: 38 of 40 pass `validate_document.py`, `README.md` and `SYNC.md` fail with the same errors as at HEAD.
- [x] CHK-013 [P1] Quoted paths with spaces stay quoted Evidence: `cd "media-editor_image-video-audio-ffmpeg/runtime"` and `"<path to>/runtime/claude-plugin"` stay quoted.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met Evidence: AC-001 to AC-006 Met.
- [x] CHK-021 [P0] `npm run test:pinned` matches the baseline file and test counts
- [x] CHK-022 [P1] Packaging tests match the baseline count
- [x] CHK-023 [P1] Bundle and plugin builds succeed
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] The rename is `class-of-bug`: every live mention is one instance of the same name.
- [x] CHK-FIX-002 [P0] Same-class inventory from `rg` and `reference_sites.py` completed, live and dated sorted. Evidence: `scratch/mentions.txt`.
- [x] CHK-FIX-003 [P0] Consumer inventory covers scripts, gates and configs that build a path from the folder name. Evidence: T003.
- [x] CHK-FIX-004 [P0] Paths with spaces, quoted commands and code blocks checked in the sweep. Evidence: DeepSeek review of the full diff, CLEAN, with a planted-defect canary caught.
- [x] CHK-FIX-005 [P1] Matrix axes repository by file kind listed with their row count. Evidence: 2 repositories by 4 file kinds (system docs, skill and mirrors, playbook, runtime docs), 8 rows.
- [x] CHK-FIX-006 [P1] Tests run from a fresh shell so no cached path from the old folder is read. Evidence: each npm command ran in a new shell from `runtime/`.
- [x] CHK-FIX-007 [P1] Evidence is pinned to the diff against the Media Editor commit in `../scratch/baseline.md`. Evidence: diff against Media Editor HEAD `1bdd011`.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets
- [x] CHK-031 [P0] No ignored build output or `node_modules/` staged Evidence: the nested index holds only the 229 renamed tracked files and 15 doc edits.
- [x] CHK-032 [P1] No permission or config value changed by the move Evidence: `plugin.json`, `manifest.json` and `package.json` moved unchanged.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized
- [x] CHK-041 [P1] Mirror pairs byte-identical after the edits Evidence: `cmp` identical.
- [x] CHK-042 [P2] Dated records left unchanged Evidence: changelogs, episodes and older `SYNC.md` lines unchanged.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only Evidence: temporary files in the session scratchpad outside the repository.
- [x] CHK-051 [P1] scratch/ cleaned before completion Evidence: `scratch/` holds `mentions.txt` only.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 13/13 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-04
<!-- /ANCHOR:summary -->

---
