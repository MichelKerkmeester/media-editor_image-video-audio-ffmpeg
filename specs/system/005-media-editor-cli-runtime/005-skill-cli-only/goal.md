---
title: "Goal: Phase 5: skill-cli-only"
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
    packet_pointer: "005-media-editor-cli-runtime/005-skill-cli-only"
    last_updated_at: "2026-10-04T19:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Met every completion criterion with evidence"
    next_safe_action: "Start 006-verify-and-release"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
# Goal: Phase 5: skill-cli-only

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Make the Media Editor skill, its references, gates, playbook and Claude Code plugin rely on the `media-editor` CLI alone, while the Claude Project keeps the Desktop extension and every gate agrees with the new route order.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The skill's route order is the CLI, then hand-written ffmpeg, then advice, and MCP never appears as a skill route |
| D2 | Tool names, parameters and errors stay in mirrored references, and invocation lives in surface-only files |
| D3 | The plugin keeps shipping `server/` and the skill copy |
| D4 | The plugin ships `bin/media-editor`, so the skill states one bare `media-editor` invocation for the plugin and a standalone install. Accepted cost: claude.ai and Cowork will not install the plugin |
| D5 | `setup.md` stays one mirrored file with a section per surface |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `rg` finds no MCP route and no `media_health` call in `sk-media-editor/` outside the mirrored transport-neutral references
- [x] `runtime/claude-plugin/.claude-plugin/plugin.json` has no `mcpServers` key, the built plugin carries an executable `bin/media-editor`, and `npx vitest run tests/packaging` passes
- [x] Router fixtures, the differential, `rule_parity` and twin divergence pass in a sandbox clone with the CLI-first order
- [x] `run_parity.sh` and `pair_divergence` pass with every pair identical or a declared deviation in `systems.py`
- [x] The playbook validator passes on `sk-media-editor/manual-testing-playbook` with the updated route-order scenarios
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
| Phase opened | Done | Research sections 9 and 11, OD-1 and OD-4 |
| Skill, references, gates, playbook, plugin | Done | DeepSeek drafts read as diffs, SWE 2 plugin and gates, orchestrator contract, kernel and declaration |
| Proof | Done | Sandbox gates all exit 0, differential 132/132, packaging 149 passed, `test:pinned` 1,824 passed |

### Deviations and findings

| Item | Note |
|------|------|
| Kernel version | Moved to v1.2.0 because its Router Code changed, provisional for the operator |
| Review finding | A command route gated on ffmpeg passed the gate, so `cli without ffmpeg` was added |
| Live run | SC-001 moved to 006 T012 |
<!-- /ANCHOR:log -->
