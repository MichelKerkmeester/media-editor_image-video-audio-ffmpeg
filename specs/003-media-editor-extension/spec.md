---
title: "Feature Specification: Media Editor MCP server and Claude extension"
description: "One Media Editor MCP server in TypeScript that covers image, video and audio editing with ffmpeg bundled, shipped as a one-click Claude Desktop extension and as a Claude Code plugin, and wired into the Media Editor system as its first choice when connected."
trigger_phrases:
  - "media editor mcp server"
  - "media editor claude extension"
  - "media editor mcpb bundle"
  - "media editor claude code plugin"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension"
    last_updated_at: "2026-09-30T06:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed 012-media-folder-layout: media/ with export, import and tests, plugin output and guides"
    next_safe_action: "Operator: commit, run the clean-machine and Desktop checks, re-upload the Project"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/specs/003-media-editor-extension/context/source-inventory.md"
      - "AI Systems/Media Editor/specs/003-media-editor-extension/009-media-editor-integration/scratch/media-editor-package-inventory.md"
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 95
    open_questions:
      - "Sign the .mcpb bundles in phase 7, or ship unsigned first?"
      - "Where are release artifacts hosted for the plugin's bundle URL?"
    answered_questions:
      - "Code lives in AI Systems/Media Editor/mcp server/"
      - "Platforms: macOS arm64 and x64, Windows x64, Linux x64 and arm64"
      - "Tools: all 8 image tools, all video and audio tools, plus probe, repair and HLS ladder"
      - "Integration into the Media Editor system is in scope as the last phase"
---
<!-- SPECKIT_TEMPLATE_SOURCE: phase-parent-spec | v2.2 -->

<!-- SPECKIT_LEVEL: 2 -->

# Feature Specification: Media Editor MCP server and Claude extension

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | In review: built and verified, operator steps open |
| **Created** | 2026-09-28 |
| **Branch** | `main` |
| **Parent Spec** | None, this is the phase parent |
| **Parent Packet** | 003-media-editor-extension |
| **Predecessor** | None |
| **Successor** | None |
| **Handoff Criteria** | Each phase child closes on its own acceptance criteria before the next starts, per the handoff table below |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The Media Editor's claude.ai Project can only advise. It hands the user an ffmpeg command to run and states that nothing was executed (`AI Systems/Media Editor/claude project/Custom Instructions.md:5`, `:259`). The operator confirmed that ffmpeg is not preinstalled where Claude runs, and Computer Use cannot type in a terminal, so a user without ffmpeg and a shell gets a recipe and no edited file. The skill runtime can edit media, but only on a machine where someone installed ffmpeg by hand (`AI Systems/Media Editor/AGENTS.md:38`).

### Purpose
Give Claude a local tool surface that edits images, video and audio on the user's own machine and installs in one click. The outcome is one MCP server of ours that covers image, video and audio, carries its own ffmpeg, installs as a Claude Desktop extension (`.mcpb`) and as a Claude Code plugin, and is the Media Editor's first choice whenever it is connected. When it is not connected, the Media Editor keeps its local ffmpeg path and, where neither exists (claude.ai web), its advisory path.

> **Phase-parent note:** This spec.md is the only authored document at the parent level besides `goal.md`. Plans, tasks, decisions and closure criteria live in the child phase folders listed below.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- A tool contract that names every tool, its parameters, the path policy, the error model, the ffmpeg resolution order and the licence attribution before any code is written
- A TypeScript MCP server at `AI Systems/Media Editor/mcp server/` with 8 image tools on sharp, 26 video and audio tools plus a health tool on ffmpeg, and three new tools for the Media Editor's own modes: `media_probe`, `media_repair` and `video_hls_ladder` (tool counts from `context/source-inventory.md` sections A and B)
- A vitest suite that covers every tool, using the small clips from the MIT video-audio source and media generated at test time
- Five per-platform Claude Desktop bundles: macOS arm64 and x64, Windows x64, Linux x64 and arm64
- A Claude Code plugin that points at the same bundle and ships the media-editor skill
- Media Editor routing, kernel, install guide, playbook, gates and changelog updated so the tools are used when connected

### Out of Scope
- Generating new media. The Media Editor edits existing files only (`AI Systems/Media Editor/AGENTS.md:13`)
- Making claude.ai web run tools. A web Project cannot reach a local MCP server, so it keeps the advisory path
- The `AI Systems/Media Editor/mcp servers/` directories, which show as uncommitted deletions made by someone else. No phase stages, restores or edits them without the operator's word
- Commits and pushes. None happen unless the operator asks

### Files to Change

| File Path | Change Type | Phase | Description |
|-----------|-------------|-------|-------------|
| `AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract/contract.md` | Create | 001 | Unified tool table, schemas, path policy, error model, ffmpeg resolution, result format, attribution plan |
| `AI Systems/Media Editor/mcp server/` package files and `src/` core modules | Create | 002 | Package, TypeScript and vitest config, server entry, registry, resolver, path guard, runner, errors, results, `media_health` |
| `AI Systems/Media Editor/mcp server/tests/fixtures/` | Create | 002 | The five small clips (about 33 KB) from the MIT video-audio source |
| `AI Systems/Media Editor/mcp server/src/tools/image/` and tests | Create | 003 | Eight image tools |
| `AI Systems/Media Editor/mcp server/src/tools/video/`, `src/tools/audio/` and tests | Create | 004, 005 | Nineteen conversion tools, then seven composition tools |
| `AI Systems/Media Editor/mcp server/src/tools/media/` and tests | Create | 006 | `media_probe`, `media_repair`, `video_hls_ladder` |
| `AI Systems/Media Editor/mcp server/manifest.json`, icon, build scripts | Create | 007 | Desktop extension manifest and per-platform packing |
| `AI Systems/Media Editor/mcp server/claude-plugin/` | Create | 008 | Plugin manifest, marketplace entry, `media_setup_ffmpeg` tool |
| `AI Systems/Media Editor/sk-media-editor/`, `AGENTS.md`, `claude project/`, `INSTALL-GUIDE.md`, `SYNC.md`, `benchmark/` | Modify | 009 | Routing order, kernel, install path, playbook, gates, changelog |
| `AI Systems/z — Claude Project Sync Loop/systems.py` | Modify | 009 | Media Editor residency rows only |
| `AI Systems/Media Editor/mcp server/ARCHITECTURE.md`, `README.md`, code-folder READMEs, `scripts/package-root.ts` | Create | 011 | Package docs and the shared package-root guard |
| `AI Systems/Media Editor/specs/003-media-editor-extension/**` | Create | all | This packet |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:phase-map -->
## PHASE DOCUMENTATION MAP

> This spec uses phased decomposition. Each phase is an independently executable child spec folder. All implementation details live inside the phase children.

| Phase | Folder | Focus | Status |
|-------|--------|-------|--------|
| 1 | 001-tool-contract/ | One tool contract: 39 tools with new names and zod-level schemas, path policy, error codes, ffmpeg resolution order, result format, MIT attribution | Complete |
| 2 | 002-server-foundation/ | Package scaffold on the MCP SDK `McpServer` with zod and vitest, ffmpeg and ffprobe resolver, path guard, spawn runner with an args array, `media_health` | Complete |
| 3 | 003-image-tools/ | The eight image tools on sharp, each with a vitest | Complete |
| 4 | 004-video-audio-core/ | Nineteen conversion tools: extract, trim, convert, codec, bitrate, frame rate, resolution, sample rate, channels, aspect ratio, speed | Complete |
| 5 | 005-video-composition/ | Seven composition tools: subtitles, text and image overlay, concat with transitions, b-roll, fades, silence removal | Complete |
| 6 | 006-probe-repair-hls/ | `media_probe`, `media_repair` and `video_hls_ladder` for the Media Editor's inspect, repair and HLS modes | Complete |
| 7 | 007-desktop-extension/ | `manifest.json` with user config, five per-platform `.mcpb` builds, `mcpb validate` and `mcpb pack`, clean-machine install | Built and verified: operator smoke test open |
| 8 | 008-claude-code-plugin/ | Plugin and marketplace manifests pointing at the bundle, the media-editor skill in the plugin, `media_setup_ffmpeg`, `claude plugin validate` | Complete |
| 9 | 009-media-editor-integration/ | Media Editor uses the tools when connected, local ffmpeg otherwise, advice where neither exists, across skill, kernel, guide, playbook and gates | In review: commit, re-upload and Desktop run open |
| 10 | 010-pinned-build-parity/ | The suite on each machine's pinned ffmpeg, and MP4 copies that re-encode PCM and FFV1 on every platform | Complete |
| 11 | 011-code-documentation/ | A README in every code folder, `ARCHITECTURE.md` at the package root, and one package-root guard for the three build scripts | Complete |
| 12 | 012-media-folder-layout/ | One `media/` folder with `export/`, `import/` and `tests/`, every stated path, the plugin's output folder and both guides | Complete |

### Phase Transition Rules

- Each phase passes `validate.sh` on its own folder before the next begins
- This map tracks aggregate progress
- `validate.sh --recursive` on this folder validates the packet as a whole
- Code phases 002 to 008 also pass the package gate (`npx tsc --noEmit`, `npx vitest run`, the `: any` and untyped-catch greps, the alignment drift script) before handing off

### Phase Handoff Criteria

| From | To | Criteria | Verification |
|------|-----|----------|--------------|
| 001-tool-contract | 002-server-foundation | `contract.md` maps all 35 source tools plus `media_probe`, `media_repair`, `video_hls_ladder` and `media_setup_ffmpeg` (39 rows), each with a parameter schema, and the operator approved it | Row count of the unified table in `001-tool-contract/contract.md`, and the approval line in its log |
| 002-server-foundation | 003-image-tools | The package builds and its gate is green, and `media_health` reports ffmpeg and ffprobe versions from the resolved binaries | `npx tsc --noEmit && npx vitest run` exit 0 in `AI Systems/Media Editor/mcp server/`, plus the drift script or its recorded stand-in |
| 003-image-tools | 004-video-audio-core | Eight image tools registered, one vitest file each, gate green | `npx vitest run tests/tools/image` exit 0, and `tools/list` in the registry test returns 9 names |
| 004-video-audio-core | 005-video-composition | Nineteen conversion tools registered with their ported test cases, gate green | `npx vitest run tests/video tests/audio` exit 0 |
| 005-video-composition | 006-probe-repair-hls | Seven composition tools registered, capability gating tested for `drawtext`, `subtitles` and `xfade` | `npx vitest run tests/composition` exit 0 |
| 006-probe-repair-hls | 007-desktop-extension | Three Media Editor tools registered, 38 tools in `tools/list`, full gate green | `npx vitest run` exit 0 and the registry test's count of 38 |
| 007-desktop-extension | 008-claude-code-plugin | Five `.mcpb` files packed and validated, and the operator installed one on a clean machine and ran `media_health` | `mcpb validate` output per platform, and the operator's smoke note in the phase log |
| 008-claude-code-plugin | 009-media-editor-integration | `claude plugin validate` passes and a `--plugin-dir` session lists the 39 tools | Validate output and the `--plugin-dir` session transcript in the phase log |
| 009-media-editor-integration | 010-pinned-build-parity | The Media Editor routes to the tools first in every packaging, and the operator asked for this phase | The 009 goal log and the operator's answer of 2026-09-29 |
| 010-pinned-build-parity | 011-code-documentation | Both suites pass on the pinned build, and the operator asked for code-folder READMEs and an architecture doc on 2026-09-30 | The 010 goal log and the operator's request of 2026-09-30 |
| 011-code-documentation | 012-media-folder-layout | Phase 11 committed and pushed, and the operator asked for the `media/` layout on 2026-09-30 | The 011 goal log and the operator's request of 2026-09-30 |
<!-- /ANCHOR:phase-map -->

---

<!-- ANCHOR:questions -->
## 4. OPEN QUESTIONS

Resolved by the operator on 2026-09-28:

- Signing: bundles ship unsigned for now, with signing added before any public release. Claude Desktop shows a warning on unsigned installs.
- Hosting: the plugin points at the bundle files on disk for now. Public hosting is decided later, before the plugin is shared outside this machine.
- The writer's proposals (39 tools, a 30-minute job limit, about 150MB per bundle, the `MEDIA_EDITOR_*` setting names and the error-code names) are accepted as the starting point. Phase 1's contract may adjust them with a recorded reason.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Phase children**: `001-tool-contract/` through `009-media-editor-integration/`, each with spec, plan, tasks, acceptance criteria and goal
- **Source inventory**: `context/source-inventory.md`, the tool-by-tool read of both MIT sources
- **Media Editor inventory**: `009-media-editor-integration/scratch/media-editor-package-inventory.md`
- **Goal**: `goal.md`, with one binding row per phase
- **Graph Metadata**: `graph-metadata.json`
