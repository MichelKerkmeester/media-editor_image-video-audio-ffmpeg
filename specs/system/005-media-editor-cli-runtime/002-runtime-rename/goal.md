---
title: "Goal: Phase 2: runtime-rename"
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
    packet_pointer: "005-media-editor-cli-runtime/002-runtime-rename"
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
# Goal: Phase 2: runtime-rename

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Rename the Media Editor runtime folder from `mcp server/` to `runtime/` in both repositories and update every live mention, with the runtime building and testing exactly as before.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | One `git mv "mcp server" runtime` in the nested repository makes the move, and no other folder is renamed |
| D2 | Dated records keep the old name: changelogs, reports, Sync Loop episodes and `specs/` |
| D3 | No content change under `runtime/src/` |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `AI Systems/Media Editor/mcp server/` does not exist and `git status` in both repositories lists its tracked files as renames to `runtime/`
- [x] `rg -n "mcp server"` over both repositories returns only changelogs, reports, Sync Loop episodes and `specs/` files
- [x] `npm run test:pinned` in `runtime/` passes with 86 files and 1,749 tests, and `npx vitest run tests/packaging` passes 139 tests
- [x] `npm run bundle -- --all` and `npm run plugin` in `runtime/` exit 0
- [x] `cmp` reports no difference for the Tools pair and for the Setup pair
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
| Phase opened | Done | Nested status empty before the move |
| Folder moved | Done | 229 renames staged in the nested repository |
| Mentions repointed | Done | 39 live files, 4 dated or concept leftovers in `scratch/mentions.txt` |
| Gates | Done | Build, 86 and 1,749 pinned, 139 packaging, bundles, plugin, playbook, skill package, parity 7/7, residency PASSED |

### Deviations and findings

| Item | Note |
|------|------|
| First pinned run | One failure in `build-plugin.vitest.ts` until `npm run plugin` rebuilt the git-ignored skill copy |
| `rg` scope | `SYNC.md` lines 27 and 39 and two concept trigger phrases keep the words, which the completion criterion allows as dated or concept text |
<!-- /ANCHOR:log -->
