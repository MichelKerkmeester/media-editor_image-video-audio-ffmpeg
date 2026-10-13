---
title: "Goal: Media Editor runtime rename, CLI-only skill and naming hardening"
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
    packet_pointer: "005-media-editor-cli-runtime"
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
# Goal: Media Editor runtime rename, CLI-only skill and naming hardening

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Move the Media Editor runtime to `runtime/`, serve its 40 tool handlers through a `media-editor` CLI that the skill relies on alone while the Claude Project keeps MCP, and make every surface ask once before the first write so a batch gets confirmed names and one place.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The Claude Code plugin ships the skill and the CLI runtime and registers no MCP server |
| D2 | The Claude Project stays on the Desktop extension and MCP, and gets the naming hardening |
| D3 | The skill's route order is the CLI, then hand-written ffmpeg, then advice. No new tools for audio trim, loudness normalization or CRF compression |
| D4 | Research is 5 iterations each from DeepSeek V4.1 Flash max and GPT-6 Luna max, 10 in total, stopped by iteration count |
| D5 | Both repositories stay on `main` in the shared tree, and gates run in sandbox clones until the commit |
| D6 | No commit before the operator approves in phase 006. Each commit has a body and a `Spec:` trailer and no attribution lines |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:binding -->
## 2. BINDING

**Read the child goal before working a phase.** Each is authoritative for its
phase and binds as if written here.

| Phase | Goal document |
|-------|---------------|
| deep research | `001-deep-research/goal.md` |
| runtime rename | `002-runtime-rename/goal.md` |
| naming and placement hardening | `003-naming-and-placement-hardening/goal.md` |
| cli | `004-cli/goal.md` |
| skill cli-only | `005-skill-cli-only/goal.md` |
| verify and release | `006-verify-and-release/goal.md` |

**Precedence.** Decisions above outrank child detail. Child detail outranks any
summary of it. Name a conflict rather than resolving it silently.

**Stop.** Only the criteria below decide done. An evaluator sees the objective
string, not these files.
<!-- /ANCHOR:binding -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [ ] `AI Systems/Media Editor/mcp server/` does not exist, and `rg -n "mcp server"` over both repositories returns only changelogs, reports, Sync Loop episodes and `specs/` files
- [ ] `npm run test:pinned` in `AI Systems/Media Editor/runtime/` passes with at least 86 files and 1,749 tests, including tests that spawn the `media-editor` CLI
- [ ] `runtime/claude-plugin/.claude-plugin/plugin.json` has no `mcpServers` key, and `rg` finds no MCP route in `sk-media-editor/` outside its mirrored references
- [ ] A graded real Project reply and a graded real skill reply to four PNGs and a clear WebP prompt each ask one question with no write in Turn 1 and put all four files in one place with readable names in Turn 2
- [ ] `validate.sh AI Systems/Media Editor/specs/005-media-editor-cli-runtime --recursive --strict` prints `RESULT: PASSED`
- [ ] `HEAD` equals `origin/main` in the Media Editor repository and the parent repository after the release the operator approved
- [ ] Operator amendment, 2026-10-04: every scenario in `sk-media-editor/manual-testing-playbook/` passes on its own packaging in a graded live run, and the Media Editor and Sync Loop feature catalogs are current and pass the sk-doc feature-catalog validators
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
| Parent goal authored | Done | `check-goal.cjs` and `goal.cjs packet` |
| Criterion 1, no `mcp server/` and no stray mention | Met, 2026-10-05 | The folder is gone and `rg -n "mcp server"` outside changelogs, reports, episodes and `specs/` returns no line, exit 1, after the follow-up removed a duplicate catalog trigger phrase |
| Criterion 2, `test:pinned` | Met, 2026-10-05 | 91 files, 1,826 passed, 4 skipped, against 86 files and 1,749 at the start, with the CLI process tests |
| Criterion 3, no MCP in the plugin or the skill | Met, 2026-10-05 | `plugin.json` holds no `mcpServers`, and `SKILL.md`, `references/cli.md`, `references/router-contract.md`, the skill README and `AGENTS.md` carry no MCP mention |
| Criterion 4, graded real replies | Skill side met, Project side open | Three live plain-project skill runs pass (`006/scratch/graded-replies/round7-run*`). The real Project reply waits for the operator to upload the kernel and Knowledge files and run PED-001 in Claude Desktop |
| Criterion 5, `validate.sh --recursive --strict` | Met, 2026-10-05 | `RESULT: PASSED` on the parent and all six children |
| Criterion 6, `HEAD` equals `origin/main` | Met, 2026-10-05 | Media Editor `968c856` and parent `6fa201b9`, both pushed. Release `v1.1.0.0` published at `42634c3` with an annotated tag |
| Criterion 7, playbook and catalogs | Met, 2026-10-05 | Round 11 report, 32 of 32 PASS for DeepSeek and Luna. Both catalogs and both playbooks 0 violations |

### Deviations and findings

| Item | Note |
|------|------|
| Operator amendment, 2026-10-04 | The playbook and feature-catalog criteria were asked for as two lines. They share one line because `check-goal.cjs` allows 3 to 7 criteria and two lines made 8 |
| Release follow-up, 2026-10-05 | Criterion 1 failed after the release on a lowercase catalog trigger phrase. The operator approved a follow-up commit, which also overrides `tmp` to close two Dependabot alerts. `node-forge` has no patched release and its alert stays open |
<!-- /ANCHOR:log -->
