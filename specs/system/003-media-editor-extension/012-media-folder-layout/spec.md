---
title: "Feature Specification: Phase 12: media-folder-layout"
description: "The Media Editor kept results and source files together in export/. This phase gives it one media files/ folder with export/, import/ and tests/ inside, and moves every stated path, the plugin and the guides with it."
trigger_phrases:
  - "media folder layout"
  - "media files/export"
  - "media files/import"
  - "media files/tests"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 12: media-folder-layout

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-09-30 |
| **Branch** | `main`, nothing committed |
| **Parent Spec** | ../spec.md |
| **Phase** | 12 of 12 |
| **Predecessor** | 011-code-documentation |
| **Successor** | None |
| **Handoff Criteria** | No live file names `export/` as the Media Editor's result folder, the plugin writes to `media files/export/`, and the Media Editor gates pass |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 12** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: the Media Editor system folder, the Media Editor residency rows in the Sync Loop declaration, one block in the repository `.gitignore` and this folder. Server code under `src/` does not change.

**Dependencies**:
- The operator's request of 2026-09-30: "the exports folder should be renamed to media, inside it should be export, import, tests", then "Update plugin etc and guide"
- The operator's rename of `media/` to `media files/` on 2026-10-03

**Deliverables**:
- `media files/export/`, `media files/import/` and `media files/tests/`, each with a `.gitkeep`, and the old `export/` content moved into them
- Every live statement of the result path moved to `media files/export/`, with the kernel and skill at v0.7.0
- The Claude Code plugin writing to `media files/export/` in the project it runs in
- Both guides describing the new folders

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
`export/` held results and the files a user wanted edited side by side, because the system named no place for source files. With the Desktop extension, the folders the tools may open are a setting the user fills in, and a single folder that mixes inputs and results is hard to set up and hard to keep tidy.

### Purpose
One `media files/` folder holds source files, results and test files in three named parts, and every packaging names the same parts.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- The three folders, their `.gitkeep` files and ignore rules that keep media out of git
- Moving the files that sat in `export/`: the `file_example_*` samples to `media files/tests/`, the downloaded photos to `media files/import/`
- The result path in `AGENTS.md`, `SKILL.md`, the skill README, four references and their knowledge mirrors, the kernel, the Project README, the playbook and the grader fixtures
- `rule_parity.py` and the three Media Editor residency rows
- The input lookup rule in `AGENTS.md`, which now lists `media files/import/` first
- The plugin's `--output-dir`, its README and a rebuilt plugin
- `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `SYNC.md` and a v0.7.0.0 changelog

### Out of Scope
- Other systems' `export/` folders - the request names the Media Editor's folder
- The Desktop extension manifest - its output setting is the user's choice, and the guides tell them what to pick
- Changelog history - past entries record the path as it was

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/media files/{import,export,tests}/.gitkeep` | Create | The three folders |
| `.gitignore` | Modify | Ignore the media inside `import/` and `tests/` |
| Media Editor skill, kernel, knowledge, playbook, fixtures, gate | Modify | `export/` becomes `media files/export/` |
| `AI Systems/z — Claude Project Sync Loop/systems.py` | Modify | Three Media Editor residency rows resynced |
| `mcp server/claude-plugin/.claude-plugin/plugin.json`, `README.md` | Modify | `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"` |
| `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `SYNC.md`, `changelog/v0.7.0.0.md` | Modify and create | Guides, change record and release note |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `media files/` holds `export/`, `import/` and `tests/`, and git tracks only their `.gitkeep` files |
| REQ-002 | No live Media Editor file names `export/` as the result folder |
| REQ-003 | The kernel's knowledge mirrors stay byte-identical to their skill sources |
| REQ-004 | Rule parity, residency, the grader fixtures and parity pass, apart from files that differ from HEAD until commit |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | The Claude Code plugin writes results into `media files/export/` of the project it runs in |
| REQ-006 | Both guides tell a user to allow `media files/` and set the output folder to `media files/export/` |
| REQ-007 | The kernel and skill move to v0.7.0 with a changelog entry and a dated `SYNC.md` note |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: A search for `export/` outside `media files/` finds nothing in the live Media Editor files
- **SC-002**: A plugin server run reads from `media files/import/` and saves to `media files/export/001 - .../`
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | A residency resync rewrites another system's rows | High | Each old string carries Media Editor context, and a diff against a backup shows only Media Editor lines changed |
| Risk | Media files get committed | Med | Ignore rules for `import/` and `tests/`, and `git add -n` lists only the three `.gitkeep` files |
| Dependency | The live Project | Low | The kernel and four knowledge files need a re-upload, recorded as an operator step |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The server creates `media files/export/` on first use, so a new project needs no setup step
- **NFR-P02**: No server code changes, so the bundles need no rebuild

### Security
- **NFR-S01**: The plugin's output folder sits inside its allowed folder, so no write leaves the project
- **NFR-S02**: Source and test files are read in place and never written

### Reliability
- **NFR-R01**: A second resync pass reports 0 changes
- **NFR-R02**: The plugin copy of every skill file matches its source after the rebuild
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: an empty `media files/import/` sends the lookup on to the working directory
- Maximum length: not applicable
- Invalid format: not applicable

### Error Scenarios
- External service failure: not applicable, nothing leaves the machine
- Network timeout: not applicable
- Concurrent access: another session's benchmark run stays uncommitted and untouched

### State Transitions
- Partial completion: `git restore` on the listed files and moving the files back undoes the phase
- Session expiry: continuity lives in this folder's docs
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 14/25 | About 40 files, one declaration, one ignore block |
| Risk | 8/25 | Shared declaration and ignore rules |
| Research | 4/20 | Every path found by one search |
| **Total** | **26/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- None
<!-- /ANCHOR:questions -->

---
