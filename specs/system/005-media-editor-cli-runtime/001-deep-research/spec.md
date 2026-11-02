---
title: "Feature Specification: Phase 1: deep-research"
description: "Runs 10 deep-research iterations, 5 from DeepSeek V4.1 Flash max and 5 from GPT-6 Luna max, into the Media Editor CLI, its distribution, the skill and Project split and the naming hardening, and merges them into one ranked design."
trigger_phrases:
  - "media editor cli deep research"
  - "media editor research lineages"
  - "deepseek luna research fan-out"
  - "media editor cli design"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 1: deep-research

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
| **Phase** | 1 of 6 |
| **Predecessor** | None |
| **Successor** | 002-runtime-rename |
| **Handoff Criteria** | 10 iteration files and a merged `research/research.md`, spot-checked by the master orchestrator, and the operator's answers to the open design choices |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 1** of the Media Editor runtime rename, CLI-only skill and naming hardening specification.

**Scope Boundary**: Findings only. Writes go to `research/` and this phase's spec docs. No file under `AI Systems/` changes.

**Dependencies**:
- `.skilled/commands/deep/research.md` and `.skilled/commands/deep/assets/deep-research-auto.yaml`, followed as written (PLAN-WORKFLOW LOCK)
- cli-pi with `opencode-go/deepseek-v4.1-flash` at thinking max, and cli-codex with `gpt-6-luna` at reasoning effort max on the fast service tier
- The Media Editor source at `AI Systems/Media Editor/mcp server/` as it stands before the rename

**Deliverables**:
- `research/lineages/deepseek/` and `research/lineages/luna/`, 5 iterations each
- `research/research.md` merged across both lineages, with a ranked change list for phases 002 to 005

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Phases 002 to 005 change a runtime of 40 tool handlers, a skill with byte-identical mirror pairs and a set of Python gates that encode the current MCP-first route order. The design has open questions that the code has to answer: how `dispatchToolCall` (`src/server/tool-registry.ts:102-127`) separates from `McpServer` and `McpError`, how a CLI avoids `loadConfig` turning bare argv tokens into allowed folders (`src/core/config.ts:168-175`), how the plugin exposes the CLI and how batch placement works when `allocateOutputFolder` always creates a new folder.

### Purpose
One ranked, evidenced design for phases 002 to 005, where every load-bearing claim cites a file and line, built from two independent model lineages.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- The `/deep:research:auto` run with `--spec-folder=AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research --stop-policy=max-iterations --concurrency=2` and two executors: `--executor=cli-pi --model=opencode-go/deepseek-v4.1-flash --reasoning-effort=max --iters=5 --label=deepseek` and `--executor=cli-codex --model=gpt-6-luna --reasoning-effort=max --service-tier=fast --iters=5 --label=luna`
- Five iteration focuses shared by both lineages:
  1. CLI core: a transport-neutral dispatch, argument errors as results, a separate entry because `src/index.ts:126` self-runs, a config path that never feeds tool argv to `loadConfig`, exit codes and SIGINT and SIGTERM cleanup of ffmpeg children and temp folders
  2. CLI surface and output: `list`, `describe <tool>` with JSON Schema from zod, `<tool>` with JSON args by flag, file or stdin, stdout JSON from `structuredContent`, the preview written to a file instead of base64 (`src/tools/media/preview.ts:119`), a persistent capability and resolver cache and the shared `MEDIA_EDITOR_DATA_DIR`
  3. Distribution: how the skill finds `server/dist/cli.js` in Claude Code (`${CLAUDE_PLUGIN_ROOT}`, a plugin `bin/` folder or an installed shim), per-platform sharp, the pinned ffmpeg, a standalone install for other terminal agents and the dist layout that `server-info.ts:42` and `font-path.ts:51` read by relative path
  4. Skill and Project split: a transport-neutral `references/tools.md` that stays mirrored, a skill-only `references/cli.md`, `setup.md` split by surface, the Sync Loop declaration in `systems.py`, and rewrites of `router-contract.md` `choose_route`, `route_contract.py`, `differential.py` `HOST_STATES`, `rule_parity.py`, `twin_divergence.py` and the route-order playbook scenarios
  5. Naming and placement hardening plus the ranked change list: kernel gate wording, a batch template in Interactive Intelligence, tool and field description text (`field-schemas.ts:62-80`, `tools/image/convert.ts:136-141`), batch-aware placement, whether a server guard is worth its friction and new playbook scenarios
- A merged `research/research.md` and the open choices brought to the operator

### Out of Scope
- Any change under `AI Systems/`. Implementation starts in phase 002
- A third research executor. The operator chose two lineages of 5

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `research/lineages/deepseek/` | Create | DeepSeek iterations, state log and deltas |
| `research/lineages/luna/` | Create | GPT-6 Luna iterations, state log and deltas |
| `research/research.md` | Create | Merged findings and the ranked change list for phases 002 to 005 |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | Each lineage writes 5 iteration files with content under `research/lineages/<label>/iterations/` |
| REQ-002 | Every iteration state record carries the route-proof fields `target_agent`, `resolved_route`, `agent_definition_loaded` and `mode` |
| REQ-003 | `research/research.md` merges both lineages and holds a ranked change list for phases 002 to 005 |
| REQ-004 | Every load-bearing claim in `research/research.md` cites a file and line |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | The master orchestrator's spot-checks of claims against the code are recorded |
| REQ-006 | The open design choices, likely the CLI install route, a `maxBytes` target on `image_convert` and the server guard, are answered by the operator before phase 002 |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: 10 iteration files, 5 per lineage, each with content and route-proof fields in its state record
- **SC-002**: A merged `research/research.md` whose ranked change list names the files phases 002 to 005 touch
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | OpenCode Go access to DeepSeek V4.1 Flash | No DeepSeek lineage | Fall back to `cline-pass/deepseek-v4.1-flash`, which caps at xhigh, and report the switch |
| Risk | DeepSeek returns an empty answer at the output cap and still exits 0 | High | Read the final text and `stopReason` from `--mode json`, keep prompts small, redispatch once on a miss |
| Risk | A lineage claims a fact the code does not hold | Med | Spot-check load-bearing claims against the source before the operator sees the design |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Two lineages run concurrently, `--concurrency=2`
- **NFR-P02**: Each DeepSeek dispatch stays below the output cap, checked by a non-empty final text

### Security
- **NFR-S01**: No secret or environment value is written into a prompt, an iteration or `research.md`
- **NFR-S02**: Executors run read-only against `AI Systems/`

### Reliability
- **NFR-R01**: A failed iteration is redispatched once by the workflow's leaf-reliability gate
- **NFR-R02**: A billing or model error is reported, never counted as an iteration
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: an iteration file with no findings fails the leaf-reliability gate and is redispatched
- Maximum length: DeepSeek prompts stay small enough to answer below the output cap
- Invalid format: a state record without route-proof fields marks the delegation incomplete

### Error Scenarios
- External service failure: a 401, 429 or invalid-model error stops that lineage and is reported with the exact message
- Network timeout: the workflow's redispatch-once rule applies
- Concurrent access: `research/.deep-research.lock` keeps one writer

### State Transitions
- Partial completion: the workflow resumes from `deep-research-state.jsonl`
- Session expiry: continuity lives in the state logs, not in the session
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 10/25 | Writes only `research/`, reads the whole Media Editor runtime and its gates |
| Risk | 8/25 | No product change. Risk is a wrong claim reaching the design |
| Research | 18/20 | Five focuses across code, distribution and Python gates |
| **Total** | **36/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- Which CLI install route ranks first once both lineages report? Answered: the plugin ships `bin/media-editor`
- Does the research support a `maxBytes` target on `image_convert` and a server guard, or only one of them? Answered: `maxBytes` yes, the server guard no

### Operator Decisions

Recorded 2026-10-04, relayed by the coordinator after the operator answered the choices in `research/research.md` section 12.

| ID | Decision | Carried into |
|----|----------|--------------|
| OD-1 | The plugin ships `bin/media-editor`, so the plugin and a standalone install share the bare `media-editor` command. Accepted cost: claude.ai and Cowork will not install the plugin | 004, 005 |
| OD-2 | A `targetFolder` field on writing tools names an existing numbered folder under the export root, so separate calls from one request share it. It needs a containment check (inside the export root, an existing `NNN - ` folder, no traversal) and a collision rule. No multi-input `image_convert` | 003 |
| OD-3 | `maxBytes` on `image_convert` for JPEG, WebP and AVIF only: a bounded quality search, a structured failure when the size cannot be reached, never a resize. Its own task in phase 003 | 003 |
| OD-4 | No server guard. `setup.md` stays one mirrored file with surface sections | 003, 005 |

<!-- BEGIN GENERATED: deep-research/spec-findings -->
Abridged from `research/research.md`, which stays canonical.

- Both lineages agree on the CLI core: a dispatch module lifted out of the MCP registration over the same `ALL_TOOLS`, a separate `cli.ts` entry, argv kept away from `loadConfig`, stdout JSON from `structuredContent`, a preview file instead of base64, persistent caches, no daemon and no server guard.
- Argument errors become results on the CLI only. The MCP adapter keeps throwing `McpError`, so MCP behaviour does not change.
- Removing `mcpServers` from the plugin also removes the allowed root, output folder and data folder it passes today, so the CLI adapter needs working-folder defaults.
- Install route is an operator choice: a plugin `bin/` shim (recommended, one command shared with the standalone install) or an inline `${CLAUDE_PLUGIN_ROOT}` path (keeps claude.ai and Cowork eligibility).
- Batch placement: recommended `targetFolder` naming an existing numbered folder under the export root. Multi-input `image_convert` needs a per-plan input, a per-plan file name and aligned `fileNames`.
- `maxBytes`: recommended in phase 003 as its own task, lossy formats only, structured failure, no resizing.
- `setup.md` stays mirrored with surface sections, a deviation from this phase's brief.
- The closeout gate recorded `synthesis_incomplete`: lineage deltas carry no structured finding rows. Findings were read from the iteration files and spot-checked instead.
<!-- END GENERATED: deep-research/spec-findings -->
<!-- /ANCHOR:questions -->

---
