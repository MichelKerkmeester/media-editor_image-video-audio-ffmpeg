---
title: "Implementation Summary"
description: "The Media Editor skill now reaches its tools only through the media-editor command, the plugin registers no MCP server, and every router, parity and playbook gate agrees with the new route order."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "005-media-editor-cli-runtime/005-skill-cli-only"
    last_updated_at: "2026-10-04T19:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Moved the skill to the command"
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
<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
# Implementation Summary

<!-- SPECKIT_LEVEL: 2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 005-skill-cli-only |
| **Completed** | 2026-10-04 |
| **Level** | 2 |
| **Evidence range** | Media Editor `1bdd011` and parent `25717845` to the working tree |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The skill now runs the Media Editor tools only through the `media-editor` command in the Bash tool, then hand-written ffmpeg, then advice. Its tool check is `media-editor health`. The Claude Code plugin ships `bin/media-editor`, `server/` and the skill, and registers no MCP server. A Claude Desktop Project still reaches the tools through the extension.

### Phase 5: skill-cli-only

`choose_route` gained `media_cli_available()` and a `cli` route ahead of `tools`. The skill binds the extension call false and the Project binds the command and ffmpeg calls false, so each surface sees one tool route. The kernel's Router Code took the same line. The seven mirrored references say the tools are "available" rather than "connected". `tools.md` and `setup.md` carry the command beside the extension. The new skill-only `references/cli.md` teaches absolute paths and the batch pattern with a worked four-file example.

### Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `sk-media-editor/SKILL.md`, `README.md` | Modified | Command tool check and route order |
| `sk-media-editor/references/cli.md` | Created | The command, absolute paths, exit codes, previews, consent and the batch pattern |
| `sk-media-editor/references/router-contract.md` | Modified | `media_cli_available()` and the `cli` route |
| `sk-media-editor/references/tools.md`, `setup.md` and five operation references, with their seven Knowledge mirrors | Modified | Transport-neutral wording, a setup section per surface |
| `claude project/Custom Instructions.md`, `README.md` | Modified | Router Code line, three sentences about the skill, kernel v1.2.0 |
| `sk-media-editor/manual-testing-playbook/` | Modified | SRO-001 renamed to `command-first.md`, 11 skill scenarios, the root playbook and 2 Project wording fixes |
| `sk-media-editor/graph-metadata.json`, `leaf-manifest.json`, `leaf-aliases.json` | Modified | MCP tooling edge dropped, manifests regenerated |
| `benchmark/router/differential.py`, `route_contract.py`, `README.md` | Modified | Six host states, comments |
| `benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py`, `README.md` | Modified | Reworded phrases, SRO-001 note |
| The Sync Loop's `systems.py` | Modified | `cli.md` unmirrored, five residency statements resynced |
| `runtime/claude-plugin/.claude-plugin/plugin.json`, `marketplace.json`, `README.md` | Modified | No `mcpServers`, the command and the accepted cost |
| `runtime/scripts/build-plugin.ts`, `runtime/tests/packaging/build-plugin.vitest.ts` | Modified | Refuse a server entry, test the shim from a scratch folder |
| `AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `SYNC.md`, `runtime/README.md`, `runtime/ARCHITECTURE.md` | Modified | The command route, the standalone install, the dated note |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

The orchestrator wrote the router contract, the kernel lines, the Sync Loop declaration, the mirrored wording and `tools.md`. DeepSeek V4.1 Flash max through cli-devin drafted `cli.md`, `setup.md`, `SKILL.md`, the playbook scenarios, the guides and the READMEs, and every draft was read as a diff before it stayed. SWE 2 made the plugin, build script, packaging test and Python gate edits. DeepSeek reviewed the SWE 2 code in two batches.

| Finding | Ruling |
|---------|--------|
| TypeScript batch | CLEAN |
| `rule_parity` phrases still say tools first | Rejected. The mirrored text is transport-neutral by design, and `tools.md` defines the tools as reached through the command in the skill and the extension in a Project |
| No host state runs the command with ffmpeg absent | Accepted. Added `cli without ffmpeg`, and a router gated on ffmpeg now fails 22 of 132 checks |
| `cli.md` drafted calls 2 to 4 without `outputName` | Found by the orchestrator. `outputName` is required, fixed, and the example then ran verbatim |

### Surface by host state

The matrix is 2 surfaces by 4 host states, 8 cells, and 6 can occur.

| Surface | Host state | Route | Covered by |
|---------|------------|-------|------------|
| Skill | Command present, ffmpeg present | `cli` | `cli available` |
| Skill | Command present, no ffmpeg | `cli` | `cli without ffmpeg` |
| Skill | ffmpeg only | `ffmpeg` | `ffmpeg only` |
| Skill | Neither | `advice` | `neither` |
| Project | Extension connected | `tools` | `tools connected` |
| Project | No extension | `advice` | `neither` |

`cli beside tools` proves the order where both tool routes answer. A Project never sees the command or ffmpeg, so its two ffmpeg cells cannot occur.

### The proof search

```bash
rg -n -i 'mcp|media_health|media_tools_connected|connected' sk-media-editor/ \
  -g '!**/changelog/**' -g '!**/references/tools.md' -g '!**/references/setup.md' \
  -g '!**/references/image-operations.md' -g '!**/references/video-and-audio-operations.md' \
  -g '!**/references/interactive-intelligence.md' -g '!**/references/media-framework.md' \
  -g '!**/assets/hls-video-conversion.md' -g '!**/manual-testing-playbook/project-*/**'
```

Every remaining hit names the Project, the leaf entry of a Project scenario, `cli.md` saying `media-editor health` runs the `media_health` tool, or the router contract's `media_tools_connected()`, which is the Project's binding and is copied into the kernel. None is a skill route. `rg -n -i mcp sk-media-editor/ -g '!**/changelog/**'` finds only `.mcpb` file names and the `media-editor-mcp` package name.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| One `choose_route` with a `cli` route ahead of `tools` | The kernel's Router Code must equal the contract, so both surfaces share the function and each binds the other's calls false |
| Mirrors say "available" | They are shared with the Project, so they name no transport |
| SRO-001 renamed to `command-first.md` | Its old name described a route the skill no longer has. The id stays, and twin pairing is unchanged |
| The `mcp-tooling` graph edge removed | The skill no longer drives an MCP server |
| Kernel moved to v1.2.0, Skill left at v1.0.0.0 | The kernel changed. Release numbers are the operator's |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| `npm run build`, `typecheck`, `plugin` | Exit 0, plugin `skill 60 files bin 2 files` |
| `npm run test:pinned` | 91 files passed, 1,824 passed and 4 skipped of 1,828 |
| `npx vitest run tests/packaging` | 8 files, 149 passed and 2 skipped |
| `claude plugin validate` on the manifest and the marketplace | Passed |
| Plugin shim from a scratch folder | `list` 40 tools, `health` finds the bundled ffmpeg |
| Sandbox clone gates | Fixtures 22/22, differential 132/132, `rule_parity` 5 rules, parity 7/7, residency, `pair_divergence` 7 pairs, twin and `check_report` on the sample report, `record_claims`, `carrier_query_evidence` all checks PASS, playbook PASS with 32 scenarios |
| `validate_skill_package.py`, `validate_document.py` | PASS and VALID on every changed skill doc |
| `cmp` on the seven mirror pairs | Silent |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **No live Claude Code run yet.** SC-001 is task T012 in phase 006.
2. **The live Project needs a re-upload.** The kernel and all seven Knowledge files changed.
3. **Four system docs keep their earlier validator errors.** `README.md`, `SYNC.md`, `claude project/README.md` and `benchmark/router/README.md` had the same blocking counts before this phase.
4. **The plugin's data folder moved.** The command uses the platform default, so an ffmpeg the old plugin downloaded into its plugin data folder is not found by the command. The bundled ffmpeg still answers first, so this matters only on a host where the bundled build cannot run.
<!-- /ANCHOR:limitations -->

---
