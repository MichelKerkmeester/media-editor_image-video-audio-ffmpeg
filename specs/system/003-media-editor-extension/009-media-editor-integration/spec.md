---
title: "Feature Specification: Phase 9: Media Editor integration"
description: "The Media Editor still assumes a claude.ai Project can only advise and the CLI can only drive a local ffmpeg. This phase makes it use the MCP tools when connected, local ffmpeg otherwise and advice where neither exists."
trigger_phrases:
  - "media editor integration"
  - "media editor routing mcp tools"
  - "media editor kernel update"
  - "sync loop pins media editor"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 9: Media Editor integration

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

With the server, bundles and plugin shipped, the Media Editor itself must learn to use them. Its skill, AGENTS.md, Project kernel, install guide, playbook and gates all encode the old arrangement: the CLI drives a local ffmpeg and the claude.ai Project only advises (package inventory sections B to E). This phase states one routing order everywhere: MCP tools when connected, local ffmpeg when not, chat advice when neither exists, as on claude.ai web. The sync-loop pins, rule-parity phrases and grader fixtures that hold the old wording move in the same change, so no gate goes red.

**Key Decisions**: One routing order stated the same way in skill and kernel, the advisory path kept for claude.ai web, and the kernel version bumped as `AI Systems/Media Editor/SYNC.md:17` requires (ADR-001 in `plan.md`)

**Critical Dependencies**: Phases 7 and 8 shipped, and the operator's answer before anything in `AI Systems/Media Editor/mcp servers/` is touched or any commit is made

---
<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P1 |
| **Status** | In review, three operator steps open |
| **Created** | 2026-09-28 |
| **Branch** | `main` |
| **Parent Spec** | `../spec.md` |
| **Phase** | 9 of 9 |
| **Predecessor** | `008-claude-code-plugin` |
| **Successor** | 010-pinned-build-parity |
| **Handoff Criteria** | Skill, kernel, guide, playbook, gates and changelog describe the three routes, and every Media Editor gate is green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 9** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Media Editor sources and their gates. No server code.

**Dependencies**:
- `scratch/media-editor-package-inventory.md`, the file:line inventory of every site
- The shipped tool names in `../001-tool-contract/contract.md`
- The sync loop at `AI Systems/z — Claude Project Sync Loop/`, Media Editor rows only

**Deliverables**:
- Updated `sk-media-editor/SKILL.md`, references and README
- Updated `AGENTS.md` section 5
- Updated Project kernel, Project README and knowledge mirrors
- Updated `INSTALL-GUIDE.md`, and a `SYNC.md` review note once the operator confirms
- New and updated playbook scenarios
- Re-pinned Media Editor rows in `systems.py`, `rule_parity.py` phrases and grader fixtures
- `sk-media-editor/changelog/v0.6.0.0.md`

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Every Media Editor surface assumes one of two runtimes. The kernel says a claude.ai Project cannot run ffmpeg and must never claim execution (`claude project/Custom Instructions.md:5`, `:259`, `:276`), and AGENTS.md makes a missing ffmpeg a hard stop with no fallback (`AGENTS.md:38`, `:152`). With the extension installed, a Claude Desktop Project can run the tools, and so can a Claude Code session with the plugin, so both statements become wrong there. They are also pinned: the sync loop holds the advisory kernel lines verbatim (`AI Systems/z — Claude Project Sync Loop/systems.py:2098`, `:2129`, `:2449`, `:2462`, `:2470`, `:2515`, `:2585`, `:2593`), `rule_parity.py` counts ffmpeg-precondition phrases across pairs (`benchmark/gates/rule_parity.py:77-81`, `:104`), and four playbook scenarios pass only when execution did not occur (`sk-media-editor/manual-testing-playbook/manual-testing-playbook.md:312-368`, `:448-464`). Paths are relative to `AI Systems/Media Editor/` unless given in full, as in the package inventory.

### Purpose
A Media Editor that uses the MCP tools whenever they are connected, falls back to local ffmpeg and advises only where neither exists, stated the same way in every packaging, with every gate that pinned the old wording updated in the same change.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `sk-media-editor/SKILL.md` routing: the three-route order in section 2, the tool checks at `:98`, `:250` and `:261-266` extended with a connected-tools check, and `:349`, `:389`, `:397`, `:401`
- `sk-media-editor/references/mcp-imagician.md` and `mcp-video-audio.md` (`:35-41`, `:52`) and `interactive-intelligence.md` (`:45`, `:74-80`, `:199`), with their `claude project/knowledge/` mirrors refreshed as byte copies (`claude project/README.md:51`)
- `AGENTS.md` section 5 (`:146-152`), plus `:38` and `:134`
- Project kernel `claude project/Custom Instructions.md` at `:5`, `:15`, `:66`, `:72`, `:206`, `:220`, `:226`, `:251`, `:259-260`, `:265`, `:276-277` and `:290-307`, with the H1 version bumped as `SYNC.md:17` requires
- `claude project/README.md` (`:3`, `:25`, `:33-37`, `:43`, `:61-63`, `:77-79`) and `sk-media-editor/README.md` (`:35`, `:326`, `:357-358`, `:363-364`, `:378`)
- `INSTALL-GUIDE.md`: a Claude Desktop extension section and a Claude Code plugin section ahead of the manual ffmpeg install (`:53`, `:86-106`)
- Playbook: root `manual-testing-playbook.md` (`:11`, `:37`, `:80`, `:127-128`), the PNE, PID, PGD and PHL scenarios kept as the no-tools case, and new scenarios for connected tools and for the fallback to local ffmpeg
- Gates: `benchmark/gates/rule_parity.py` (`:69-120`), the grader fixtures `benchmark/grader/fixtures/sample-report/replies/PID-001.txt` and `PHL-001.txt`, and `benchmark/grader/twin_divergence.py` (`:82-95`)
- Sync loop: the Media Editor residency rows in `AI Systems/z — Claude Project Sync Loop/systems.py`, and the Media Editor pair names at `:2066-2079` if a knowledge mirror is renamed
- `SYNC.md` review note (`:13`, `:19-21`), written only after the operator confirms the review
- `sk-media-editor/changelog/v0.6.0.0.md`
- A final plugin rebuild so the plugin carries the updated skill

### Out of Scope
- The `mcp servers/` directories - they show as uncommitted deletions made by someone else, and this phase confirms with the operator before touching or committing anything there
- The benchmark router (`benchmark/router/route_contract.py:65-79`) - stale against the current contract, and re-contracting it is a separate change recorded as a follow-up
- Sync-loop rows of other systems, and claim 6 in the sync loop's `runtime-register.md:29` - flagged to the operator, not edited
- Deploying the kernel to the live claude.ai Project - a manual operator step (`claude project/README.md:5`, `:72`)
- Commits and pushes - only when the operator asks

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/sk-media-editor/SKILL.md`, `README.md`, `references/*.md` | Modify | Three-route order, tool checks, install guidance |
| `AI Systems/Media Editor/AGENTS.md` | Modify | Section 5 and the ffmpeg check lines |
| `AI Systems/Media Editor/claude project/Custom Instructions.md`, `README.md`, `knowledge/*.md` | Modify | Kernel routing with the version bump, README, byte-copy mirrors |
| `AI Systems/Media Editor/INSTALL-GUIDE.md`, `SYNC.md` | Modify | Extension and plugin install, review note |
| `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/**` | Modify, Create | Updated and new scenarios |
| `AI Systems/Media Editor/benchmark/gates/rule_parity.py`, `benchmark/grader/**` | Modify | Re-pinned phrases, fixtures, twin declarations |
| `AI Systems/z — Claude Project Sync Loop/systems.py` | Modify | Media Editor rows only |
| `AI Systems/Media Editor/sk-media-editor/changelog/v0.6.0.0.md` | Create | Changelog |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `SKILL.md` and the kernel state the same routing order: MCP tools when connected, local ffmpeg otherwise, chat advice when neither exists |
| REQ-002 | claude.ai web keeps the advisory path: with no tool run, the kernel still never claims execution, and the attestation line records what actually ran |
| REQ-003 | Every gate that pinned the old wording is updated in the same change and passes: `run_parity.sh`, `rule_parity.py` and `run_residency.sh` for the Media Editor |
| REQ-004 | No file under `AI Systems/Media Editor/mcp servers/` is staged, restored or edited without the operator's recorded answer |
| REQ-005 | Every edited site is one the package inventory lists, and its line still matched when edited |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | `INSTALL-GUIDE.md` leads with the Desktop extension and the Claude Code plugin and keeps the manual ffmpeg install as the fallback |
| REQ-007 | The playbook has scenarios for connected tools, fallback to local ffmpeg and web advice, and the four advisory scenarios remain as the no-tools case |
| REQ-008 | The kernel H1 version is bumped (a rule change is a minor bump, `SYNC.md:17`), and every knowledge mirror stays a byte copy of its skill source |
| REQ-009 | `sk-media-editor/changelog/v0.6.0.0.md` records the change, and the `SYNC.md` review note waits for the operator's confirmation |
| REQ-010 | The Claude Code plugin is rebuilt so it ships the updated skill |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: `bash benchmark/parity/run_parity.sh` passes for the Media Editor
- **SC-002**: `python3 benchmark/gates/rule_parity.py` passes
- **SC-003**: `bash benchmark/parity/run_residency.sh` passes for the Media Editor rows
- **SC-004**: A connected-tools playbook scenario passes in Claude Desktop with the extension installed
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | Inventory line numbers drift before the edit (inventory taken 2026-09-28) | Med | T002 re-reads every cited line and records mismatches before any edit |
| Risk | Residency pins turn red when kernel lines move (`systems.py:2098` and the others) | High | Update the Media Editor rows in the same change and run the residency check |
| Risk | `rule_parity.py` counts phrases per pair, and a wording change on one side fails it (`rule_parity.py:230-233`) | High | Change both sides of each pair together and rerun the gate |
| Risk | Renaming a knowledge mirror breaks pair names and references (`systems.py:2066-2079`) | High | Keep mirror names where possible, and repoint every reference in the same change when a version bump renames one |
| Risk | The `mcp servers/` deletions belong to someone else's uncommitted work | High | Never stage or restore them, and ask the operator before any commit |
| Risk | Twin scenarios invert: the PID and SID pair assumes the Project never executes (`benchmark/grader/twin_divergence.py:82-95`) | Med | Keep the no-tools Project scenarios, add connected-tools scenarios as a new pair and re-declare the twins |
| Dependency | Operator confirmation of the kernel review and the live upload | No review note | Leave `SYNC.md` unchanged until confirmed |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The kernel stays within what the claude.ai custom-instructions field accepts, measured before and after (18,086 bytes today, package inventory section A)

### Security
- **NFR-S01**: No instruction tells a model to run tools or ffmpeg outside the user's chosen folders
- **NFR-S02**: The kernel never claims an execution, verification or save that did not happen

### Reliability
- **NFR-R01**: Every gate named in section 5 is rerun on the final state and its output recorded

---

## 8. EDGE CASES

### Data Boundaries
- A Desktop Project with the extension installed but no folder set: the kernel tells the user to set the folders, then retry
- Tools connected but a capability missing (`CAPABILITY_MISSING`): routing falls back to local ffmpeg if present, otherwise to advice
- A Claude Code session with both the plugin and a local ffmpeg: the MCP tools win

### Error Scenarios
- A gate fails after an edit: the change is not claimed complete, the failing site is fixed and the whole gate reruns
- An inventory line no longer matches: that site halts, is recorded and waits for the operator before editing

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 18/25 | Files: about 30 across skill, kernel, playbook and gates |
| Risk | 18/25 | Pinned statements: Y, shared sync loop: Y, others' uncommitted work: Y |
| Research | 8/20 | Inventory exists, lines re-verified |
| Multi-Agent | 8/15 | Workstreams: writer, MiMo re-inventory, operator review |
| Coordination | 14/15 | Shared sync loop, operator confirmations, plugin rebuild |
| **Total** | **66/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | Residency check red after the kernel edit | H | H | Rows updated in the same change |
| R-002 | Rule parity red on one side of a pair | H | M | Both sides edited together |
| R-003 | Someone else's deletions staged | H | L | Explicit path staging only, operator asked first |
| R-004 | Playbook verdicts invert silently | M | M | Advisory scenarios kept, new ones added |

---

## 11. USER STORIES

### US-001: Tools first, advice last (Priority: P0)

**As a** Media Editor user in Claude Desktop with the extension, **I want** the Media Editor to edit my file with the tools instead of handing me a command, **so that** I get the edited file, not a recipe.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: Honest on the web (Priority: P0)

**As a** claude.ai web user, **I want** the Media Editor to keep giving exact commands and never pretend it ran them, **so that** I can trust what it says it did.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- Does the operator want the benchmark router re-contracted here or in a later packet? This spec leaves it out of scope.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: None in this phase. The routing choice is the local ADR in `plan.md`, and it builds on the bundle and plugin ADRs in `../007-desktop-extension/decision-record.md` and `../008-claude-code-plugin/decision-record.md`
- **Source inventory**: `../context/source-inventory.md`

---
