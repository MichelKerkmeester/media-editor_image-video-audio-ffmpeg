---
title: "Feature Specification: Phase 11: code-documentation"
description: "The server package has 23 code folders and no map of how they fit, so a reader learns the layers only by reading the source. This phase gives every code folder a README and the package root an architecture doc, each claim checked against the code."
trigger_phrases:
  - "code folder readme"
  - "mcp server architecture"
  - "package root guard"
  - "code documentation"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 11: code-documentation

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
| **Phase** | 11 of 12 |
| **Predecessor** | 010-pinned-build-parity |
| **Successor** | 012-media-folder-layout |
| **Handoff Criteria** | Every folder under `src/`, `scripts/` and `tests/` has a README, `ARCHITECTURE.md` sits at the package root, every doc validates and the package gate passes |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 11** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: documentation inside `AI Systems/Media Editor/mcp server/`, one defect class in its build scripts found while documenting them, and this folder. Shipped code under `src/` does not change, so the bundles and plugin are not rebuilt.

**Dependencies**:
- The finished server from phases 2 to 10, which the docs describe
- The operator's request of 2026-09-30: "make sure each code folder has a code readme / And we have a ARCHITECTURE doc in root of mcp servers"

**Deliverables**:
- `ARCHITECTURE.md` and a root `README.md` at the package root
- A code-folder README in each of the 23 folders under `src/`, `scripts/` and `tests/`, with the fixture README refreshed to the same shape
- One package-root guard shared by the three build scripts, with tests

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The package has 39 tools across 71 source files and 83 test suites, and only the fixture folder and the generated plugin folder carried a README. A maintainer could not see which layer may import which, which runner a new tool should use or where a test for a module lives without reading the code. The operator asked for a README in every code folder and an architecture doc at the package root.

### Purpose
A maintainer opens any code folder and finds what it holds and how it connects, and opens `ARCHITECTURE.md` for the whole shape, with no claim the code contradicts.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `ARCHITECTURE.md` at the package root: overview, topology and import direction, request flow, runtime subsystems, packaging, verification, key decisions
- A root `README.md` in the general README shape
- Code-folder READMEs for every folder under `src/`, `scripts/` and `tests/`, following the sk-doc code-folder shape
- A refresh of `tests/fixtures/README.md` to that shape, keeping its MIT attribution word for word
- Fixing the defect class the build-script docs exposed: `build-bundle.ts` and `build-plugin.ts` crashed with a raw `ENOENT` outside the package root, the same defect phase 10 fixed in `test-pinned.ts`

### Out of Scope
- `assets/` and `licenses/` - they hold a font and licence texts, no code
- `claude-plugin/server/` and `claude-plugin/skills/` - gitignored build output, and `claude-plugin/` already has its README
- The old `mcp servers/` folder - its deletion belongs to someone else and stays unstaged
- Rebuilding the bundles and plugin - no file under `src/` changes, and the READMEs never reach a bundle

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `ARCHITECTURE.md` | Create | The package architecture |
| `README.md` | Create | Package overview, quick start, tools, configuration and commands |
| `src/**/README.md` (9) | Create | `src/`, `server/`, `core/`, `types/`, `tools/` and its four tool families |
| `scripts/README.md`, `scripts/bundle/README.md` | Create | Build, plugin and pinned-run scripts |
| `tests/**/README.md` (11) | Create | Suite layout, commands and coverage per folder |
| `tests/fixtures/README.md` | Modify | Refreshed to the code-folder shape |
| `scripts/package-root.ts` | Create | `assertPackageRoot`, shared by the three scripts |
| `scripts/build-bundle.ts`, `scripts/build-plugin.ts`, `scripts/test-pinned.ts` | Modify | Call the shared guard |
| `tests/packaging/package-root.vitest.ts` | Create | The guard and both build scripts outside the root |
| `../USER-GUIDE.md`, `../INSTALL-GUIDE.md` | Create and modify | The Project setup guide, and a related-docs list that no longer names the deleted `mcp servers/` |
| `.skilled/skills/sk-doc/shared/scripts/check_no_new_snake_case.py` and `test_authored_name_kebab.py` | Modify | `ARCHITECTURE.md` joins `TOOL_MANDATED_NAMES`, with a test row |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | Every folder under `src/`, `scripts/` and `tests/` has a `README.md` in the code-folder shape |
| REQ-002 | `ARCHITECTURE.md` exists at the package root and describes the layers, their import direction, the request flow, the runtime subsystems and the packaging |
| REQ-003 | Every new or changed doc passes `validate_document.py` |
| REQ-004 | The package gate passes after the script change: tsc, both suites, greps, headers, widths and alignment |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | Every count, name, default and command in the docs matches the code, checked by hand and by a D6 reviewer that wrote none of it |
| REQ-006 | Every build script stops with its own message outside the package root, from one shared guard with tests |
| REQ-007 | The docs carry no em dash, no banned HVR word, no broken relative link and no line over the width the validator allows |
| REQ-008 | The fixture README keeps its MIT attribution word for word |
| REQ-009 | A user guide tells a teammate which install the Media Editor Project needs and how to set it up, added on the operator's request of 2026-09-30 |
| REQ-010 | `ARCHITECTURE.md` passes the sk-doc kebab-case name check, by the exemption the operator approved on 2026-09-30 |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: 23 of 23 code folders hold a README, and `ARCHITECTURE.md` sits at the package root
- **SC-002**: 25 of 25 docs pass `validate_document.py`, and the package gate prints `GATE: PASS`
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | A doc states a count or behavior the code does not have | Med | Every count was checked against disk, and a D6 reviewer checked the claims against the code |
| Risk | The name `ARCHITECTURE.md` fails the sk-doc kebab-case name check, which exempts only tool-mandated names | Low | The operator named the file. The check's exemption list is the place to amend, proposed in the implementation summary |
| Dependency | The D6 executor routes | Low | `run-d6.sh` falls through the routes in the parent goal's order |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The docs add no bytes to a bundle. The bundle build stages only `dist`, `assets`, `licenses` and five named files
- **NFR-P02**: The guard reads one `package.json` before any other work, so a wrong folder fails before a download, a write or a spawn

### Security
- **NFR-S01**: No doc names a secret, a token or a personal path
- **NFR-S02**: No doc or comment names a spec folder, phase or requirement id

### Reliability
- **NFR-R01**: The guard fails the same way for every wrong folder: a missing, unreadable, non-JSON or foreign `package.json`
- **NFR-R02**: Both suites keep their totals plus the new guard tests and no new skip
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: a folder with no `package.json` returns 1 with the script's message
- Maximum length: every doc line fits the validator's limit, and diagrams stay under 70 columns
- Invalid format: a `package.json` that is not JSON, or is a list, fails the guard the same way

### Error Scenarios
- External service failure: a D6 route out of quota falls to the next route
- Network timeout: not applicable, the guard runs before any download
- Concurrent access: peer sessions share the tree, so only files in this package and this folder change

### State Transitions
- Partial completion: each doc stands alone, so a half-finished set still validates file by file
- Session expiry: continuity lives in this folder's docs
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 12/25 | 25 docs, one new script module, three script edits, one test file |
| Risk | 4/25 | No shipped code changes, and the guard only turns a crash into a message |
| Research | 10/20 | Every claim read from the code |
| **Total** | **26/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- None. The kebab-case name check on `ARCHITECTURE.md` is recorded with a proposed amendment rather than left open
<!-- /ANCHOR:questions -->

---
