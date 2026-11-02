---
title: "Feature Specification: Phase 5: skill-cli-only"
description: "Moves the sk-media-editor skill, AGENTS.md, references, gates, playbook and Claude Code plugin onto the media-editor CLI with no MCP route, while the Claude Project keeps the Desktop extension."
trigger_phrases:
  - "cli-only media editor skill"
  - "skill route order cli first"
  - "plugin without mcp server"
  - "skill and project split"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 5: skill-cli-only

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-10-04 |
| **Branch** | `main` |
| **Parent Spec** | ../spec.md |
| **Phase** | 5 of 6 |
| **Predecessor** | 004-cli |
| **Successor** | 006-verify-and-release |
| **Handoff Criteria** | No MCP route is left in the skill, the plugin has no `mcpServers`, and the router, parity and playbook gates pass with the new route order |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 5** of the Media Editor runtime rename, CLI-only skill and naming hardening specification.

**Scope Boundary**: The skill side, its gates and the plugin. The Claude Project keeps MCP through the Desktop extension, and its kernel changes only where a shared mirror needs it.

**Dependencies**:
- Phase 004 closed, so `media-editor` exists and is shipped in the plugin
- The skill and Project split in `../001-deep-research/research/research.md`, focus 4, and operator decisions OD-1 and OD-4 in `../001-deep-research/spec.md`

**Deliverables**:
- A skill whose tool check is `media-editor health` and whose route order is the CLI, then hand-written ffmpeg, then advice
- New `references/cli.md`, and one mirrored `setup.md` with a section per surface: the Claude Code plugin and a standalone CLI install for the skill, the Desktop extension for the Project
- Updated router contract, Python gates, Sync Loop declaration, playbook route scenarios, guides and READMEs
- A plugin manifest with no `mcpServers`, and a plugin `bin/media-editor` that puts the bare `media-editor` command on the Bash tool PATH

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The skill's first route is the Media Editor tools through MCP, checked with `media_health`, and the Claude Code plugin registers an MCP server that runs `server/dist/index.js` (`runtime/claude-plugin/.claude-plugin/plugin.json`). The router contract, `route_contract.py`, `differential.py` `HOST_STATES`, `rule_parity.py`, `twin_divergence.py` and the route-order playbook scenarios all encode that MCP-first order, and the Tools and Setup references are byte-identical mirrors shared with the Project, which stays on MCP.

### Purpose
The skill reaches its tools only through `media-editor`, falls back to hand-written ffmpeg for the three operations with no tool and for machines without the CLI, and gives advice when neither can run, while the Project keeps working through the Desktop extension and every gate agrees with the new order.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- The skill's tool check becomes `media-editor health`, and MCP leaves the skill entirely
- Route order, the operator's choice: the CLI first for everything it covers, then hand-written ffmpeg for audio trim, loudness normalization, CRF compression and machines without the CLI, then advice
- A transport-neutral `references/tools.md` that stays mirrored, a new skill-only `references/cli.md`, and `setup.md` kept as one mirrored file with a section per surface, operator decision OD-4
- `router-contract.md` `choose_route`, `route_contract.py`, `differential.py` `HOST_STATES`, `rule_parity.py`, `twin_divergence.py` and the route-order playbook scenarios
- The Sync Loop declaration in `systems.py`: pairs and declared deviations
- Both guides, the READMEs and `AGENTS.md`
- The plugin drops `mcpServers` from `plugin.json`, keeps `server/` and the skill copy, and gains `bin/media-editor`, a launcher that finds its own folder and runs `server/dist/cli.js`, because plugin variables are absent from the Bash tool environment. The skill and `cli.md` state one invocation, the bare `media-editor`, for the plugin and a standalone install alike. The build script and packaging tests follow
- The guides and the plugin README state the accepted cost of the `bin/` folder: claude.ai and Cowork will not install the plugin, and the Project covers claude.ai over MCP

### Out of Scope
- The Project's route order, which stays on MCP
- New tools for the three gap operations

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/sk-media-editor/SKILL.md` | Modify | CLI tool check and route order |
| `AI Systems/Media Editor/sk-media-editor/references/cli.md` | Create | CLI invocation, skill only |
| `AI Systems/Media Editor/sk-media-editor/references/setup.md`, `tools.md`, `router-contract.md` | Modify | One mirrored setup with surface sections, transport-neutral tools, new `choose_route` |
| `AI Systems/Media Editor/claude project/knowledge/` | Modify | Mirror sides of the setup and tools pairs, byte-identical with the skill |
| `AI Systems/Media Editor/AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md` | Modify | CLI route |
| `AI Systems/Media Editor/benchmark/router/route_contract.py`, `differential.py` | Modify | Route order and host states |
| `AI Systems/Media Editor/benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py` | Modify | Parity and divergence rules |
| The Sync Loop's `systems.py` | Modify | Pairs and declared deviations |
| `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/` | Modify | Route-order scenarios |
| `AI Systems/Media Editor/runtime/claude-plugin/.claude-plugin/plugin.json`, `runtime/scripts/build-plugin.ts`, `runtime/tests/packaging/` | Modify | No `mcpServers`, `bin/media-editor` shipped and checked |
| `AI Systems/Media Editor/runtime/claude-plugin/bin/media-editor` | Create | Launcher for `server/dist/cli.js` |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | The skill's tool check is `media-editor health`, and no MCP route or `media_health` tool call is left in `sk-media-editor/` outside the mirrored transport-neutral references |
| REQ-002 | The skill's route order is the CLI, then hand-written ffmpeg, then advice |
| REQ-003 | `plugin.json` has no `mcpServers`, the plugin still ships `server/` and the skill and ships an executable `bin/media-editor` that runs `server/dist/cli.js`, and the packaging tests pass |
| REQ-004 | Router fixtures, the differential, `rule_parity`, twin divergence and parity pass with the new route order |
| REQ-005 | Every mirror pair the Sync Loop declares is byte-identical or a declared deviation |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | `references/cli.md` documents the commands, args, output and exit codes from phase 004 |
| REQ-007 | The one mirrored `setup.md` carries a section for the plugin and standalone CLI install and a section for the Desktop extension, and its Project mirror stays byte-identical |
| REQ-008 | The route-order playbook scenarios match the new order and the playbook validator passes |
| REQ-009 | Guides, READMEs and `AGENTS.md` describe the CLI route |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: In Claude Code with the plugin, the skill converts an image through `media-editor` and no MCP server starts
- **SC-002**: In a Claude Desktop Project with the extension, the Project still converts through MCP
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | The research's split design for mirrors | Parity breaks if a mirrored file gains skill-only text | Keep invocation in the skill-only `cli.md` |
| Risk | A Python gate still encodes MCP first | High | Run every router and parity gate in a sandbox clone first |
| Risk | Users of the plugin lose the tools if the CLI is not found | High | The plugin `bin/media-editor` the operator chose, tested by the packaging tests |
| Risk | claude.ai and Cowork will not install a plugin with a `bin/` folder | Med | Accepted by the operator. The Project covers claude.ai over MCP, and the guides say so |
| Risk | Sync Loop parity failing on a peer's stale tree | Med | Judge in a clean worktree, as the Sync Loop notes say |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The skill's tool check is one `media-editor health` call
- **NFR-P02**: No reference grows past the size the skill's loading rules allow

### Security
- **NFR-S01**: The skill passes paths to the CLI as JSON args, never through a shell-built string
- **NFR-S02**: The plugin grants no permission the MCP server did not have

### Reliability
- **NFR-R01**: Without the CLI, the skill falls back to ffmpeg and says so
- **NFR-R02**: With neither, the skill gives the exact command and says nothing ran
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: no file named, the skill lists `media files/import/` first, as today
- Maximum length: none beyond the CLI's own
- Invalid format: an unknown tool returns the CLI's usage error, and the skill reports it

### Error Scenarios
- External service failure: none, the CLI is local
- Network timeout: none
- Concurrent access: none

### State Transitions
- Partial completion: a CLI failure halfway through a batch is reported per file
- Session expiry: none
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 20/25 | Skill, references, guides, five Python gates, the Sync Loop declaration, the playbook and the plugin |
| Risk | 16/25 | Breaking change for the skill and mirror parity |
| Research | 8/20 | Designed in phase 001 |
| **Total** | **44/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- Does `references/tools.md` stay fully mirrored, or does it become a declared deviation? Answered: it stays mirrored and transport-neutral, and invocation lives in the skill-only `cli.md`
<!-- /ANCHOR:questions -->

---
