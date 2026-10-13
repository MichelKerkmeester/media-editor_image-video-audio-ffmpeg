---
title: "Goal: Phase 12: media-folder-layout"
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
<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
# Goal: Phase 12: media-folder-layout

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Give the Media Editor one `media files/` folder with `export/`, `import/` and `tests/` inside, and make every packaging name it.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | "the exports folder" means the Media Editor's own `export/`. Other systems keep theirs |
| D2 | Results go to `media files/export/`, source files to `media files/import/`, sample files to `media files/tests/`, and the last two are read in place, never written |
| D3 | Git tracks only the three `.gitkeep` files, so no media file is committed |
| D4 | Changelog history and recorded benchmark runs keep the old path, since they describe what happened then |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `media files/` holds `export/`, `import/` and `tests/`, and `git add -n "media files"` lists only their `.gitkeep` files
- [x] No live Media Editor file names `export/` as the result folder
- [x] `rule_parity.py`, residency and the grader fixtures pass, and parity shows only findings that clear on commit
- [x] The plugin saves a result into `media files/export/` in a live server call
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/012-media-folder-layout --strict` prints `RESULT: PASSED`
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
| Phase opened | Done | 2026-09-30, on the operator's request to rename `export/` to `media/` with three folders inside, then "Update plugin etc and guide" |
| Folders and ignore rules | Done | Three `.gitkeep` files, samples in `media files/tests/`, photos in `media files/import/` |
| Path substitution | Done | 78 replacements in 30 files, after a dry run of 84 matches in 31 files. The gap is the root `README.md`, a symlink to the skill README |
| Residency rows | Done | Three statements resynced, a second pass reports 0 |
| Plugin | Done | `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"`, rebuilt, `Validation passed`, live calls: the installed extension server saved `media files/export/001 - photo-800webp/photo-resized.jpg` on 2026-10-03, a path with spaces, with no ffmpeg on PATH. The 2026-09-30 plugin run, before the rename, saved `media/export/001 - resized-sample/sample-resized.png` |
| Guides | Done | Both guides show the tree and the two settings |
| Gates | Done | `PASSED 6 rules`, `PASSED 1 system(s)`, `all 2 report checks clean`, parity findings only against HEAD |

### Deviations and findings

| Item | Note |
|------|------|
| A hand edit of `systems.py` broke three statement keys | Fixed. The backup was restored and the rows went through `resync_statement.py`, which recomputes the keys |
| Parity found no dated `SYNC.md` note naming kernel v0.7.0 | Fixed with the note, marked as a change record rather than a review |
| The Desktop extension manifest is unchanged | Its output folder is the user's setting, so the guides tell the user what to enter instead |
| The live Project still holds kernel v1.5 | Re-uploading the kernel and four knowledge files is the operator's step |
| Folder renamed to `media files` | The operator renamed `media/` to `media files/` on 2026-10-03, which amends D2. 150 matches in 35 files moved by the same substitution, the plugin flag by hand, four shell commands quoted for the space, the three residency rows resynced and the ignore rules moved, after which git again adds only the three `.gitkeep` files |
| Desktop showed "Unable to connect to extension server" | Claude Desktop builds no launch config while a required list setting holds an empty entry, and logs only "No MCP config found". The operator's settings held an empty second **Directory path** row. The installed server started fine with the folder alone, so both guides now say to remove empty rows |
| No separate test machine | The operator tests with the repo's own `AI Systems/Media Editor/media files/`, so `USER-GUIDE.md` now names that folder as the one to list, says git keeps the folders but not their files, and has the test prompt name the file |
<!-- /ANCHOR:log -->
