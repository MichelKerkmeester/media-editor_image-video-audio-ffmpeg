---
title: "Goal: Phase 7: desktop extension"
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
    packet_pointer: "003-media-editor-extension/007-desktop-extension"
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
# Goal: Phase 7: desktop extension

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Build and validate five one-click Claude Desktop bundles of the Media Editor MCP server, one per target platform, each with its own binaries and notices, and prove one on a clean machine.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | Bundles ship unsigned; signing is added before any public release |
| D2 | Packing stops when the notices file lacks any bundled binary |
| D3 | The build method for non-host platforms is whatever the spike proves, recorded in ADR-001 |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `dist-bundles/` in the package holds 5 `.mcpb` files, one per target
- [x] `mcpb validate` exits 0 for each of the 5 manifests
- [x] No bundle exceeds 150 MB
- [ ] The `goal.md` log records the operator's clean-machine smoke test with date and platform
- [ ] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/007-desktop-extension --strict` prints `RESULT: PASSED`
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
| Five bundles | Done | npm run bundle -- --all 2026-09-29: 64,669,717 to 73,610,195 bytes; mcpb validate exit 0 on all five packed manifests; bundle-contents test 43/43 |
| Operator smoke test | Pending | T015: install one bundle on a clean machine, set two folders, run media_health and image_resize |

### Deviations and findings

| Item | Note |
|------|------|
| ffprobe on Apple Silicon | Observed 2026-09-29 during phases 4 and 5: the resolver skips the bundled `ffprobe-static` darwin-arm64 file as unusable (an x86_64 binary, no Rosetta on the build Mac) and uses Homebrew's ffprobe 9.0.2 from the PATH, so every probe so far ran on that one. A clean Apple Silicon Mac without Homebrew or Rosetta would get `FFPROBE_NOT_FOUND`. This is the spec's `ffprobe-static` risk row, now seen at runtime. Resolved for the bundles on 2026-09-29: ADR-002 ships a native martin-riedl.de ffprobe on darwin-arm64, and the unpacked bundle's `media_health` reports it `bundled`. The development tree still resolves Homebrew's, because its own `node_modules` keeps the package default |
<!-- /ANCHOR:log -->
