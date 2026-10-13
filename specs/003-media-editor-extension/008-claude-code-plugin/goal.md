---
title: "Goal: Phase 8: Claude Code plugin"
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
    packet_pointer: "003-media-editor-extension/008-claude-code-plugin"
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
# Goal: Phase 8: Claude Code plugin

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Ship the Media Editor MCP server and skill as a Claude Code plugin that validates, lists all 39 tools in a session and offers a consent-gated ffmpeg setup where no bundled build fits.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The skill in the plugin is copied from `sk-media-editor/` at pack time and never edited there |
| D2 | `media_setup_ffmpeg` downloads only with consent, from pinned https URLs, checked by SHA-256 |
| D3 | The server config shape follows the Node-runtime spike recorded in ADR-001 |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `claude plugin validate` exits 0 on the plugin folder
- [x] A `claude --plugin-dir` session lists 39 Media Editor tools
- [x] The setup test proves no file is written without `consent: true`
- [x] The skill hash test finds every copied file identical to `sk-media-editor/`
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/008-claude-code-plugin --strict` prints `RESULT: PASSED`
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
| Plugin and setup tool | Done | `claude plugin validate` exit 0 on the folder and on `plugin.json` after the final rebuild |
| Plugin session | Done | Final build, 2026-09-29: server `connected`, 39 tools, raw `media_health` reports bundled ffmpeg 9.0.2 with 18 of 18 filters |
| Consent | Done | 'plans both downloads and writes nothing without consent' passes in the final gate |
| Skill copy | Done | 'keeps the built plugin skill equal to its source' passes after `npm run plugin` rebuilt the plugin with the phase 9 skill |
| Package gate | Done | `GATE: PASS`, tsc 0, 81 files, `1694 passed, 4 skipped (1698)`, alignment 0 findings over 170 files |
| Reviews | Done | Four read-only reviews on D6 routes, none by the model that wrote the code: 16 of 20 findings fixed with tests, 3 rejected as outside the threat model or by design, 1 answered by an existing test |

### Deviations and findings

| Item | Note |
|------|------|
| ffmpeg 9 filter rows | The Apple Silicon build prints two flag characters per filter row, so the capability gate read every filter as absent there and ten filter-gated tools would have refused. The parser now takes two or three, found live by the plugin session |
| Suite runs on ffmpeg 6.0 | The one run on the shipped 9.0.2 pair failed 45 tests on ffmpeg 6 premises: 28 drawtext log checks and 17 stream copies ffmpeg 9 now accepts into MP4. Keeping the copy or forcing AAC is the operator's decision |
| Timeout and staging | Checking NFR-P02 found no download time limit. One deadline per call now covers every download, and both binaries are staged before either is placed |
| Cleanup errors | Six cleanup removals could replace the error the user should see. All now go through `removeQuietly` |
| Cross-server race | Setup calls queue inside one server. Two Claude Code sessions sharing the plugin data folder could still race, recorded as limitation 7 |
<!-- /ANCHOR:log -->
