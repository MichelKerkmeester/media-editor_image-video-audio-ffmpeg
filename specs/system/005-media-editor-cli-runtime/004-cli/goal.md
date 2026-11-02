---
title: "Goal: Phase 4: cli"
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
    packet_pointer: "005-media-editor-cli-runtime/004-cli"
    last_updated_at: "2026-10-04T18:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Met every completion criterion with evidence"
    next_safe_action: "Start 005-skill-cli-only"
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
# Goal: Phase 4: cli

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Give the Media Editor runtime a `media-editor` CLI that runs the same 40 tool handlers through one dispatch module shared with MCP, prints JSON a script can read and leaves MCP behavior unchanged.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The CLI and MCP share one dispatch module, and MCP keeps its own error mapping so its behavior does not change |
| D2 | The CLI exposes exactly the tools MCP exposes and adds none |
| D3 | Tool argv never reaches `loadConfig` |
| D4 | One bare `media-editor` command for the plugin and a standalone install. With no flag it uses the working folder as allowed folder, `<cwd>/media files/export` as output and the platform default data folder, and reads no plugin variable |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `media-editor list` from `runtime/dist/cli.js` names the same 40 tools as the MCP server, checked by a process test
- [x] `media-editor image_convert` with JSON args by flag, file and stdin each prints `structuredContent` as JSON on stdout, checked by process tests
- [x] A process test sends SIGINT and SIGTERM during an ffmpeg job and finds no ffmpeg child and no temp folder left
- [x] A config test proves a bare tool-argv token is not an allowed folder, and a process test with no flags writes under `<cwd>/media files/export`
- [x] `npm run test:pinned` in `runtime/` passes with at least 86 files and 1,749 tests plus the new CLI tests
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
| Phase opened | Done | Operator decisions on the plugin bin, the bare command and the data folder |
| CLI, dispatch, shim and cache | Done | Luna core and three fix rounds, SWE 2 wiring and tests |
| Review | Done | DeepSeek V4.1 Flash, 9 batches, rulings in implementation-summary.md |
| Proof | Done | `test:pinned` 91 files, 1,821 passed and 4 skipped, shim list and four-PNG run, live setup then health |

### Deviations and findings

| Item | Note |
|------|------|
| Pinned suite failure after fix round 2 | An injected context lost its overrides in the per-dispatch context. Fixed at the source in round 3 |
| Tarball install | `dist/` is not packed, so the install path is `npm link` or a folder install |
<!-- /ANCHOR:log -->
