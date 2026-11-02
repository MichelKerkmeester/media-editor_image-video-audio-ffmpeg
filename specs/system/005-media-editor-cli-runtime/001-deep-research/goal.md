---
title: "Goal: Phase 1: deep-research"
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
    packet_pointer: "005-media-editor-cli-runtime/001-deep-research"
    last_updated_at: "2026-10-04T12:00:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Authored the durable directive"
    next_safe_action: "Execute against the completion criteria"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
# Goal: Phase 1: deep-research

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Produce 10 iterations of file-cited research, 5 from DeepSeek V4.1 Flash max and 5 from GPT-6 Luna max, on the Media Editor CLI core, its surface and output, its distribution, the skill and Project split and the naming and placement hardening, merged into one ranked design for phases 002 to 005.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | This phase produces findings only. No file under `AI Systems/` changes |
| D2 | The run follows `.skilled/commands/deep/research.md` and `deep-research-auto.yaml` with `--stop-policy=max-iterations --concurrency=2` and the labels `deepseek` and `luna` |
| D3 | Both lineages work the same five focuses, one per iteration, in the order the spec lists them |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [ ] `research/lineages/deepseek/iterations/` and `research/lineages/luna/iterations/` each hold 5 iteration files with content
- [ ] All 10 iteration records in `research/lineages/*/deep-research-state.jsonl` carry `target_agent`, `resolved_route`, `agent_definition_loaded` and `mode`
- [ ] `research/research.md` exists, merges both lineages and ranks the changes for phases 002 to 005
- [ ] Every load-bearing claim in `research/research.md` cites a file and line
- [ ] `git status` shows no change under `AI Systems/` from this phase
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
| Phase opened | Pending | |

### Deviations and findings

| Item | Note |
|------|------|
| None yet | |
<!-- /ANCHOR:log -->
