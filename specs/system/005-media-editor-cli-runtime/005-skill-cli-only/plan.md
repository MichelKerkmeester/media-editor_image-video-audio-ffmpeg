---
title: "Implementation Plan: Phase 5: skill-cli-only"
description: "Rewrites the skill and its references onto the media-editor CLI, keeps setup as one mirrored file with surface sections, updates the router contract, Python gates, Sync Loop declaration and playbook to the CLI-first order, and drops mcpServers from the plugin."
trigger_phrases:
  - "skill cli-only plan"
  - "route order rewrite"
  - "sync loop declaration update"
  - "plugin mcpServers removal"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 5: skill-cli-only

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown skill, Python gates, TypeScript build script |
| **Framework** | sk-media-editor skill, Sync Loop, vitest packaging tests |
| **Storage** | None |
| **Testing** | Router fixtures and differential, `rule_parity`, parity, `pair_divergence`, playbook validator, packaging tests |

### Overview
DeepSeek drafts the skill, reference, guide and README text. The sub-orchestrator writes the Sync Loop declaration and checks every drafted line. SWE 2 makes the Python gate and plugin build edits. Gates run in a sandbox clone first, because the Sync Loop reads the live tree.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phase 004 closed and `media-editor` ships in the plugin
- [x] The mirror design approved: `tools.md` and `setup.md` stay mirrored, `cli.md` is skill-only
- [ ] A sandbox clone ready for the gates

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Every router, parity and playbook gate passes
- [ ] Docs updated (spec/plan/tasks)
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Two surfaces, one transport-neutral contract. Tool names, parameters and errors stay shared, and invocation lives with each surface.

### Key Components
- **Shared**: `references/tools.md`, transport-neutral and mirrored
- **Shared**: `references/setup.md`, one mirrored file with a plugin and standalone CLI section and a Desktop extension section
- **Skill only**: `references/cli.md`
- **Gates**: router contract and its Python, the Sync Loop declaration and the playbook route scenarios
- **Plugin**: `plugin.json` without `mcpServers`, still shipping `server/` and the skill, plus `bin/media-editor` on the Bash tool PATH

### Data Flow
The skill runs `media-editor health`, then `media-editor <tool>` with JSON args, reads the JSON result and reports the path. Without the CLI it runs ffmpeg, and without ffmpeg it gives advice.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `sk-media-editor/SKILL.md` and references | MCP-first routing | Update to the CLI | `rg` for MCP terms in the skill |
| `benchmark/router/route_contract.py`, `differential.py` | Encode the route order and host states | Update | Router fixtures and differential |
| `benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py` | Parity and divergence | Update | Gate runs |
| The Sync Loop's `systems.py` | Pair and deviation declarations | Update | Parity and `pair_divergence` |
| `runtime/claude-plugin/.claude-plugin/plugin.json` | Registers the MCP server | Remove `mcpServers` | Packaging tests |

Required inventories:
- Same-class producers: `rg -n "media_health|MCP|mcp" sk-media-editor/` sorted into skill-only and mirrored.
- Consumers of changed symbols: every gate and scenario that names the route order.
- Matrix axes: surface (skill, Project) by host state (CLI present, ffmpeg only, neither).
- Algorithm invariant: the skill never routes to MCP, and the Project never routes to the CLI.
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
| Unit | Router contract and host states | Router fixtures, `differential.py` |
| Integration | Mirrors, parity, residency, playbook, packaging | `rule_parity.py`, `run_parity.sh`, `run_residency.sh`, `pair_divergence`, playbook validator, `npx vitest run tests/packaging` |
| Manual | Skill in Claude Code with the plugin | One conversion through `media-editor` |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phase 004 CLI | Internal | Pending | No route to point at |
| Sync Loop declaration | Internal | Green | Parity fails |
| DeepSeek and SWE 2 | External | Canary pending | Swap models with a stated reason |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A parity or router gate that cannot pass with the new order
- **Procedure**: Revert the phase's files from the diff in both repositories, nothing is committed before phase 006
<!-- /ANCHOR:rollback -->

---


---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup ──► Skill and references ──► Gates and declaration ──► Plugin ──► Verify in sandbox
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Phase 004 | Skill |
| Skill and references | Setup | Gates |
| Gates and declaration | Skill | Plugin |
| Plugin and verify | Gates | Phase 006 |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 30 minutes |
| Core Implementation | High | 6 to 9 hours |
| Verification | High | 3 hours |
| **Total** | | **9.5 to 12.5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Sandbox clone gates green before the live tree
- [ ] Mirror pairs compared with `cmp`
- [ ] No commit made before phase 006

### Rollback Procedure
1. Revert the skill and reference edits on both sides of each mirror pair
2. Revert the Python gates and the Sync Loop declaration
3. Restore `mcpServers` in `plugin.json` and rerun the packaging tests
4. Report the cause to the master orchestrator

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
