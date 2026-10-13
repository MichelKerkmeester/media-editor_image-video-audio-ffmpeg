---
title: "Feature Specification: Media Editor runtime rename, CLI-only skill and naming hardening"
description: "Renames the Media Editor mcp server folder to runtime, adds a media-editor CLI over the same 40 tool handlers, makes the skill rely on that CLI alone and hardens the naming and placement gate after a Project batch landed in two places."
trigger_phrases:
  - "media editor cli runtime"
  - "media editor runtime rename"
  - "cli-only media editor skill"
  - "media editor naming and placement hardening"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-media-editor-cli-runtime"
    last_updated_at: "2026-10-04T12:00:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Scaffolded the phased packet and authored the parent spec and goal"
    next_safe_action: "Run the deep research in 001-deep-research"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions:
      - "Install route: the plugin ships bin/media-editor, one bare media-editor command"
      - "maxBytes on image_convert: yes, JPEG, WebP and AVIF only"
      - "Server-side naming guard: no"
---
<!-- SPECKIT_TEMPLATE_SOURCE: phase-parent-spec | v2.2 -->

<!-- SPECKIT_LEVEL: 2 -->

# Feature Specification: Media Editor runtime rename, CLI-only skill and naming hardening

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Draft |
| **Created** | 2026-10-04 |
| **Branch** | `main` |
| **Parent Spec** | `../spec.md` |
| **Parent Packet** | 005-media-editor-cli-runtime |
| **Predecessor** | 051-versionless-knowledge-names |
| **Successor** | None |
| **Handoff Criteria** | The design from 001-deep-research is approved by the operator before 002-runtime-rename starts, and every later phase passes its own strict validation before the next begins |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The `sk-media-editor` skill reaches its own tools only through MCP. The Claude Code plugin starts `mcp server/dist/index.js` as an MCP server, and without the plugin the skill falls back to hand-written ffmpeg. The folder name `mcp server/` also ties the runtime to one transport, though it will serve a CLI too. Separately, a live bug showed that the naming and placement gate does not hold for a batch. In a Claude Desktop Project, Sonnet 5.5 medium converted four PNGs from `media files/import` to WebP under 100 KB without asking about names or a folder. It passed `subfolder: true` on the first `image_convert` call only, so one file landed in `001 - webp-under-100kb/` and three in the export root as `CleanShot ...-converted.webp`.

### Purpose
The runtime lives in `runtime/`, serves the 40 tool handlers through both MCP and a `media-editor` CLI, and the skill drives that CLI alone while the Claude Project keeps the Desktop extension. On every surface, one question before the first write settles the names and, for a batch, one place for all of its files.

> **Phase-parent note:** This spec.md is the ONLY authored document at the parent level. All detailed planning, task breakdowns, checklists, and decisions live in the child phase folders listed in the Phase Documentation Map below. This keeps the parent from drifting stale as phases execute and pivot.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Deep research by DeepSeek V4.1 Flash max and GPT-6 Luna max, 5 iterations each, into the CLI design, its distribution, the skill and Project split and the naming hardening
- Renaming `AI Systems/Media Editor/mcp server/` to `runtime/` in the nested Media Editor repository and the parent repository
- A hard naming and placement gate in the Project kernel, the skill, `AGENTS.md`, Interactive Intelligence, the tool descriptions and batch-aware server placement
- A `media-editor` CLI over the same handlers, with tests, and the MCP server unchanged in behavior
- The skill, its references, gates, playbook and plugin relying on the CLI only, with the Project keeping MCP
- Verification of every gate, then commits, push and release after the operator approves each

### Out of Scope
- New tools for audio trim, loudness normalization and CRF compression. These stay on the hand-written ffmpeg route
- Moving the Claude Project off the Desktop extension and MCP. A browser or Project has no terminal
- Rewriting dated records: changelogs, reports, Sync Loop episodes and `specs/`
- Any commit, push or release before the operator approves it in phase 006

### Decisions Already Made

| Topic | Decision |
|-------|----------|
| Spec | New phased packet `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/`, operator-specified |
| Plugin | Ships the skill and the CLI runtime, with no MCP server |
| Research depth | 5 iterations per executor, 10 in total, `--stop-policy=max-iterations` |
| Project | Stays on the Desktop extension and MCP, and gets the hardening |
| Skill routes | CLI, then the ffmpeg fallback, then advice. No new tools for the three gap operations |
| Workspace | `main` in the shared tree for both repositories. Gates run in sandbox clones until the commit |
| Commits | None until phase 006 approval. Each commit has a body and a `Spec:` trailer, with no attribution lines, in the nested repository and the parent repository |

### Files to Change

| File Path | Change Type | Phase | Description |
|-----------|-------------|-------|-------------|
| `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/` | Create | 001-deep-research | Iterations from both lineages and the merged `research.md` |
| `AI Systems/Media Editor/mcp server/` to `runtime/` | Rename | 002-runtime-rename | Folder move plus every live doc mention in both repositories |
| `AI Systems/Media Editor/claude project/Custom Instructions.md` | Modify | 003-naming-and-placement-hardening | Hard gate for names and one place per batch |
| `AI Systems/Media Editor/runtime/src/core/output-folder.ts` | Modify | 003-naming-and-placement-hardening | Batch-aware placement |
| `AI Systems/Media Editor/runtime/src/cli.ts` | Create | 004-cli | The `media-editor` CLI entry |
| `AI Systems/Media Editor/sk-media-editor/` | Modify | 005-skill-cli-only | Skill, references and playbook on the CLI route |
| `AI Systems/Media Editor/runtime/claude-plugin/.claude-plugin/plugin.json` | Modify | 005-skill-cli-only | Drop `mcpServers` |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:phase-map -->
## PHASE DOCUMENTATION MAP

> This spec uses phased decomposition. Each phase is an independently executable child spec folder. All implementation details (plan, tasks, checklist, decisions, continuity) live inside the phase children.

| Phase | Folder | Focus | Status |
|-------|--------|-------|--------|
| 1 | 001-deep-research/ | Ranked, evidenced design for phases 002 to 005 from 10 research iterations | Pending |
| 2 | 002-runtime-rename/ | `mcp server/` becomes `runtime/` in both repositories, nothing else changes | Pending |
| 3 | 003-naming-and-placement-hardening/ | Ask once before the first write, with one place per batch | Pending |
| 4 | 004-cli/ | `media-editor` CLI over the same handlers, tested | Pending |
| 5 | 005-skill-cli-only/ | Skill, AGENTS.md, references, gates, playbook and plugin rely on the CLI only | Pending |
| 6 | 006-verify-and-release/ | All gates green, the operator approves commits, push and release | Pending |

### Phase Transition Rules

- Each phase MUST pass `validate.sh` independently before the next phase begins
- Parent spec tracks aggregate progress via this map
- Use `/spec_kit:resume [parent-folder]/[NNN-phase]/` to resume a specific phase
- Run `validate.sh --recursive` on parent to validate all phases as integrated unit

### Phase Handoff Criteria

| From | To | Criteria | Verification |
|------|-----|----------|--------------|
| 001-deep-research | 002-runtime-rename | 10 iterations and a merged `research.md`, spot-checked, and the operator has answered the open design choices | Iteration count, `research/research.md` present, the operator's answers recorded in `001-deep-research/implementation-summary.md` |
| 002-runtime-rename | 003-naming-and-placement-hardening | No live `mcp server` mention is left and the full tests and a bundle build pass | `rg` and `reference_sites.py` output, `npm run test:pinned`, `npm run bundle` |
| 003-naming-and-placement-hardening | 004-cli | The gate wording is in every surface and batch placement is tested | `npm run test:pinned`, the playbook validator |
| 004-cli | 005-skill-cli-only | `media-editor` runs every tool through the shared dispatch and the MCP suite is unchanged | CLI tests and `npm run test:pinned` |
| 005-skill-cli-only | 006-verify-and-release | No MCP route is left in the skill and the plugin has no `mcpServers` | `rg` over `sk-media-editor/`, packaging tests |
<!-- /ANCHOR:phase-map -->

---

<!-- ANCHOR:questions -->
## 4. OPEN QUESTIONS

- Which install route does the CLI take? Answered: the plugin ships `bin/media-editor`, so the plugin and a standalone install share the bare `media-editor` command, and claude.ai and Cowork will not install the plugin
- Does `image_convert` gain a `maxBytes` target? Answered: yes, for JPEG, WebP and AVIF, as its own task in phase 003
- Is a server-side guard against unconfirmed names worth the friction it adds? Answered: no
- Batch placement and `setup.md` were decided with them: a `targetFolder` field in phase 003, and one mirrored `setup.md` in phase 005. All decisions are in `001-deep-research/spec.md` Operator Decisions
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Phase children**: See sub-folders `[0-9][0-9][0-9]-*/` for per-phase spec.md, plan.md, tasks.md
- **Parent Spec**: See `../spec.md`
- **Graph Metadata**: See `graph-metadata.json` for `derived.last_active_child_id` pointer
