---
title: "Implementation Plan: Phase 12: media-folder-layout"
description: "Replace export/ with media/ and its three parts, move every stated path in one substitution checked by a dry run, resync the residency rows with Media Editor context only, and point the plugin at media files/export/."
trigger_phrases:
  - "media folder plan"
  - "export path move"
  - "residency resync"
  - "plugin output folder"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 12: media-folder-layout

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown system files, one Python gate, one Python declaration, one plugin manifest |
| **Framework** | The Media Editor skill, its Claude Project package and its Claude Code plugin |
| **Storage** | The `media files/` folder on disk, ignored by git apart from `.gitkeep` files |
| **Testing** | `rule_parity.py`, residency and parity through the harness, the grader fixtures, `claude plugin validate`, a live plugin server run |

### Overview
One regex moves `export/` to `media files/export/` wherever it is not already part of a longer path, after a dry run lists every match by file. Prose for the three folders goes into `AGENTS.md`, `SKILL.md` and the skill README. The residency rows move through `resync_statement.py`, with old strings that only the Media Editor kernel carries.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Problem statement clear and scope documented
- [x] Success criteria measurable
- [x] Dependencies identified

### Definition of Done
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Docs updated (spec/plan/tasks)
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One source of truth: the skill files change first, and the knowledge mirrors and plugin copy follow by the same substitution and a rebuild.

### Key Components
- **`media files/`**: `import/` for source files, `export/` for results, `tests/` for sample files
- **Plugin manifest**: `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"`, created by the server on first use
- **Residency rows**: three kernel statements that name the result path

### Data Flow
A user puts a file in `media files/import/`. The runtime finds it there before asking for a path, and the tool or ffmpeg writes the result into a new numbered folder in `media files/export/`.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| Skill, `AGENTS.md`, kernel, references | State the result path | Update | A search for `export/` outside `media files/` finds none |
| Knowledge mirrors | Byte copies of four references | Same substitution | `cmp` on all five pairs |
| `rule_parity.py` | Pins the destination phrase | Update | `PASSED 6 rules` |
| Residency rows in `systems.py` | Record three kernel statements | Resync | Harness `PASSED 1 system(s)`, diff limited to Media Editor lines |
| Grader fixtures | Sample replies naming the path | Update | `all 2 report checks clean` |
| Plugin | Output went to the project root | `--output-dir` | Live server run saves to `media files/export/001 - .../` |
| Other systems' `export/` | Their own result folders | Unchanged, not consumers | The resync diff touches lines 1902 to 2083 only |

Required inventories:
- Same-class producers: every Media Editor file with `export/` not preceded by a path character, 84 matches in 31 files in the dry run.
- Consumers of changed symbols: `rule_parity.py`, the residency rows, the grader fixtures and the plugin's bundled skill copy.
- Matrix axes: skill source against knowledge mirror against plugin copy, each compared after the change.
- Algorithm invariant: a path already under `media files/` is never rewritten, since the regex skips `export/` after a path character.
<!-- /ANCHOR:affected-surfaces -->


---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

Follow the ordered tasks in `tasks.md`. It owns the Setup, Implementation and Verification phase checkboxes and task state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | Plugin packaging | `vitest` on `build-plugin` and `manifest` |
| Integration | Rule parity, residency, parity, grader fixtures | The Media Editor gates and the residency harness |
| Manual | A plugin server run on a throwaway project | stdio JSON-RPC with `image_resize` |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `resync_statement.py` | Internal | Green | The residency rows would stay stale |
| The residency harness in the scratchpad | Internal | Green | Residency could not run before commit |
| The live claude.ai Project | External | Yellow | The kernel re-upload waits on the operator |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: the operator rejects the layout, or a gate fails after commit
- **Procedure**: `git restore` the changed files, move the files in `media files/import/` and `media files/tests/` back into `export/` and delete `media files/`
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:ai-exec -->
## AI EXECUTION PROTOCOL

### Execution model

| Role | Executor |
|------|----------|
| Edits, gates and the plugin rebuild | The orchestrator |
| Kernel review and the live Project re-upload | The operator |

### Pre-Task Checklist

1. [x] A dry run listed every match before the substitution ran
2. [x] The five knowledge pairs were byte-identical before the change
3. [x] `systems.py` was backed up before the resync
4. [x] The folder's files were listed before the move

### Execution Rules

| Rule | Description |
|------|-------------|
| TASK-SEQ | Folders, then the path substitution, then prose, then gates and the plugin |
| TASK-SCOPE | The Media Editor system, its residency rows, one ignore block and this folder |
| TASK-VERIFY | Every gate reruns after the last edit |
| TASK-EVIDENCE | Every ticked task names the output that proves it |

### Status Reporting Format

`T### | done or blocked | files changed | check and its result | open question for the operator`

### Blocked Task Protocol

Mark the task `[B]` in `tasks.md` with the reason and the failing output. Three failed fixes for the same symptom stop the loop, and the orchestrator reports the error, the attempts and a proposed next step to the operator.
<!-- /ANCHOR:ai-exec -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (inventory) ──► Folders and paths ──► Plugin and guides ──► Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | None | Folders and paths |
| Folders and paths | Setup | Plugin and guides |
| Plugin and guides | Folders and paths | Verify |
| Verify | All above | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 20 minutes |
| Core Implementation | Med | 1 hour |
| Verification | Med | 30 minutes |
| **Total** | | **2 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [x] Backup created: `systems.py` and the old folder listing are in the scratchpad
- [x] Feature flag configured: not applicable
- [x] Monitoring alerts set: not applicable

### Rollback Procedure
1. `git restore` the changed tracked files and delete `sk-media-editor/changelog/v0.7.0.0.md`
2. Move the files from `media files/import/` and `media files/tests/` back into `export/`, then delete `media files/`
3. Rebuild the plugin with `npm run plugin`
4. Rerun the Media Editor gates

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
