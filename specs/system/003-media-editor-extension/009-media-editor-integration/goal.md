---
title: "Goal: Phase 9: Media Editor integration"
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
    packet_pointer: "003-media-editor-extension/009-media-editor-integration"
    last_updated_at: "2026-09-28T16:30:00Z"
    last_updated_by: "scaffold"
    recent_action: "Authored the durable directive"
    next_safe_action: "Execute against the completion criteria"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
# Goal: Phase 9: Media Editor integration

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Make the Media Editor use its MCP tools whenever they are connected, local ffmpeg otherwise and chat advice where neither exists, in every packaging, with every gate that pinned the old wording updated and green.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The routing order is MCP tools, then local ffmpeg, then chat advice, stated the same way in skill and kernel |
| D2 | Nothing under `mcp servers/` is touched or committed without the operator's recorded answer |
| D3 | Pinned wording moves in the same change as its gate pin |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [ ] `bash benchmark/parity/run_parity.sh` passes in `AI Systems/Media Editor/`
- [x] `python3 benchmark/gates/rule_parity.py` passes in `AI Systems/Media Editor/`
- [x] `bash benchmark/parity/run_residency.sh` passes in `AI Systems/Media Editor/`
- [x] `sk-media-editor/changelog/v0.6.0.0.md` exists
- [ ] The `goal.md` log records one connected-tools scenario passing in Claude Desktop
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/009-media-editor-integration --strict` prints `RESULT: PASSED`
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
| Phase opened | Done | 2026-09-29 |
| Line check | Done | 294 citations, 292 exact, two moved and confirmed harmless |
| Skill, references, mirrors, kernel | Done | Route order in every packaging, kernel v0.6.0 at 21,554 bytes, seven mirrors hash equal to a skill source |
| Playbook and gates | Done | 19 scenarios pass the validator, `rule_parity.py` 6 rules, residency passes, grader clean |
| Plugin rebuild | Done | `npm run plugin` exit 0, skill copy test passes, live session on the final build connected with 39 tools |
| `run_parity.sh` | Waiting on the operator | 10 findings, each an edited file that differs from HEAD, clear on commit |
| Connected-tools scenario in Claude Desktop | Waiting on the operator | PRO-001 with the extension installed (T024, AC-011) |
| Web Project scenarios | Waiting on the operator | PNE-001 and PGD-001 after the kernel and five mirrors are re-uploaded (AC-002) |
| `mcp servers/` deletions | Waiting on the operator | Ten unstaged deletions from before this phase, untouched (T001) |
| `SYNC.md` review note | Waiting on the operator | Written only after the operator confirms the kernel review (T025) |

### Deviations and findings

| Item | Note |
|------|------|
| Executors | Under the parent goal's D6 routes, the line check ran on DeepSeek v4.1 Flash and the wording review on GPT-6 Luna, not MiMo as the plan named |
| Missed sites | The wording review found six advisory sites the inventory missed, all fixed, and a widened grep found no more |
| Edge cases at close | The folder rule (`CONFIG_MISSING`, `PATH_NOT_ALLOWED`) and the capability rule (`CAPABILITY_MISSING`) were missing from both the skill and the kernel, and were added |
| Peer commit | A peer session's commit `abf08e80` carried this phase's residency rows into HEAD, so HEAD pins kernel lines its own kernel does not yet hold |
| Shared card | A peer session's Human Voice Core change reached the Media Editor mirror at 22:14. It is not part of this phase |
| Router fixtures | The benchmark router fixtures consume an older contract, left unchanged as a follow-up |
<!-- /ANCHOR:log -->
