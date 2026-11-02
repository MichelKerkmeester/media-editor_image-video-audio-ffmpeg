---
title: "Feature Specification: Phase 2: runtime-rename"
description: "Renames AI Systems/Media Editor/mcp server/ to runtime/ in the nested Media Editor repository and the parent repository and updates every live mention, with no other change."
trigger_phrases:
  - "media editor runtime rename"
  - "mcp server to runtime"
  - "media editor folder rename"
  - "runtime rename mirror pairs"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 2: runtime-rename

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Draft |
| **Created** | 2026-10-04 |
| **Branch** | `main` |
| **Parent Spec** | ../spec.md |
| **Phase** | 2 of 6 |
| **Predecessor** | 001-deep-research |
| **Successor** | 003-naming-and-placement-hardening |
| **Handoff Criteria** | No live `mcp server` mention is left, and `npm run test:pinned` and a bundle build pass from `runtime/` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 2** of the Media Editor runtime rename, CLI-only skill and naming hardening specification.

**Scope Boundary**: The folder move and the mention updates. No code behavior, tool, wording or route changes.

**Dependencies**:
- Phase 001 closed and the operator's design choices recorded
- The Sync Loop's `reference_sites.py` for the leftover-mention check

**Deliverables**:
- `AI Systems/Media Editor/runtime/` in place of `mcp server/`, tracked as the same move by both repositories
- Every live doc mention updated, with both sides of each mirror pair edited identically

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The runtime folder is named `mcp server/`, after one transport. Phase 004 adds a CLI over the same handlers, so the name will be wrong for half of what the folder serves. 69 lines across 40 files in the Media Editor repository name the folder, outside changelogs, measured at scaffold time.

### Purpose
The folder is `runtime/`, every live mention says so, and the runtime builds and tests exactly as before.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `git mv "mcp server" runtime` in the nested Media Editor repository, which the parent repository then tracks as the same move
- The live mentions: the README, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `AGENTS.md:169`, `sk-media-editor/SKILL.md:259,299`, `references/setup.md:23,121`, `references/tools.md:23`, four playbook files, 22 code READMEs and the server docs
- Both sides of the two mirror pairs, Tools and Setup, edited identically so byte parity holds

### Out of Scope
- Changelogs, reports, Sync Loop episodes and `specs/`, which are dated records
- Code changes. `scripts/package-root.ts` checks the package name and every path is relative, so no source file needs an edit
- The root `ARCHITECTURE.md` mention of `mcp servers/`, which names the retired Imagician and Video-Audio assets, not this folder

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/mcp server/` | Rename | Becomes `AI Systems/Media Editor/runtime/` |
| `AI Systems/Media Editor/README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `AGENTS.md` | Modify | Folder mentions |
| `AI Systems/Media Editor/sk-media-editor/SKILL.md`, `references/setup.md`, `references/tools.md` | Modify | Folder mentions |
| `AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Setup.md`, `Media Editor - Reference - Media Editor Tools.md` | Modify | Mirror sides, kept byte-identical to the skill side |
| `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/` | Modify | Four scenario files |
| `AI Systems/Media Editor/runtime/**/README.md` and server docs | Modify | 22 code READMEs plus `ARCHITECTURE.md` and `README.md` of the runtime |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `AI Systems/Media Editor/mcp server/` no longer exists and `runtime/` holds the same tracked files, recorded as renames by `git status` in both repositories |
| REQ-002 | No live mention of `mcp server` is left outside dated records, proven by `rg` and `reference_sites.py` |
| REQ-003 | `npm run test:pinned` and `npx vitest run tests/packaging` pass from `runtime/` with the baseline counts |
| REQ-004 | Each mirror pair stays byte-identical |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | `npm run bundle -- --all` and `npm run plugin` build from `runtime/` |
| REQ-006 | No file under `runtime/src/` changes |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: `rg -n "mcp server"` over both repositories returns only dated records
- **SC-002**: The test, packaging and bundle numbers match the baseline in `../scratch/baseline.md`
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | Peer sessions with uncommitted work in the shared tree | A move under their feet | Check `git status` in both repositories first and stop on overlap |
| Risk | A relative path in `node_modules`, `dist` or a build script still points at `mcp server` | High | Rebuild and run the full tests and packaging tests after the move |
| Risk | A mirror pair edited on one side only | Med | Run the pair parity check after the edits |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Test run time stays within the baseline range
- **NFR-P02**: Bundle sizes match the baseline build

### Security
- **NFR-S01**: No secret or environment value enters a changed file
- **NFR-S02**: The ignored `node_modules/` and build outputs are not committed

### Reliability
- **NFR-R01**: `git log --follow` traces each moved file to its history
- **NFR-R02**: Gates that read the folder path keep passing
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: none, the move is one command
- Maximum length: paths with spaces in `media files/` stay quoted
- Invalid format: a mention inside a code block or a quoted command changes the same way as prose

### Error Scenarios
- External service failure: none, the phase is local
- Network timeout: none
- Concurrent access: a peer edit inside `mcp server/` stops the phase until it lands

### State Transitions
- Partial completion: a half-moved tree is restored with `git mv runtime "mcp server"` before any other change
- Session expiry: the move is a single tracked rename, visible in `git status`
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 14/25 | One folder move and about 40 files of mentions |
| Risk | 10/25 | Two repositories, mirror pairs, build paths |
| Research | 4/20 | The mention list is known |
| **Total** | **28/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- Does any gate in the Sync Loop name the folder by path rather than through `reference_sites.py`? The phase checks before editing
<!-- /ANCHOR:questions -->

---
