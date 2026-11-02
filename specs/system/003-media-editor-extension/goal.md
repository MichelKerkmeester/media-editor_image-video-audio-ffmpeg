---
title: "Goal: Media Editor MCP server and Claude extension"
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
    packet_pointer: "003-media-editor-extension"
    last_updated_at: "2026-09-30T06:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed 012-media-folder-layout: media/ with export, import and tests, plugin output and guides"
    next_safe_action: "Operator: commit, run the clean-machine and Desktop checks, re-upload the Project"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 95
    open_questions: []
    answered_questions: []
---
# Goal: Media Editor MCP server and Claude extension

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Ship one Media Editor MCP server that edits images, video and audio with its own ffmpeg, installs in one click as a Claude Desktop extension and as a Claude Code plugin, and is the Media Editor's first choice whenever it is connected.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The server is TypeScript on Node with sharp, ffmpeg-static and ffprobe-static, at `AI Systems/Media Editor/mcp server/` |
| D2 | Targets are macOS arm64 and x64, Windows x64, Linux x64 and Linux arm64 |
| D3 | No tool overwrites an input or writes outside the output folder the user chose |
| D4 | Every code phase meets the sk-code-opencode TypeScript rules and passes the package gate |
| D5 | `mcp servers/` and git history stay untouched unless the operator asks |
| D6 | Dispatched work runs on the executors below, in order, moving down only when a route is out of quota or credit. No model reviews code it wrote |

### Executors

```bash
# 1. DeepSeek V4.1 Flash max, cli-pi, OpenCode Go
pi -p "<prompt>" --model opencode-go/deepseek-v4.1-flash --thinking max --mode json --offline </dev/null
# 2. DeepSeek V4.1 Flash xhigh, cli-pi, Cline (no max tier)
pi -p "<prompt>" --model cline-pass/cline-pass/deepseek-v4.1-flash --thinking xhigh --mode json --offline </dev/null
# 3. GPT-6 Luna max fast, cli-codex or cli-pi
codex exec --model gpt-6-luna -c model_reasoning_effort="max" -c service_tier="fast" -c approval_policy=never --sandbox workspace-write "<prompt>" </dev/null
pi -p "<prompt>" --model openai-codex/gpt-6-luna --thinking max --mode json --offline </dev/null
# 4. Last fallback: MiMo v2.6 Pro high, cli-pi, LLM Gateway
pi -p "<prompt>" --model llmgateway/mimo-v2.6-pro --thinking high --mode json --offline </dev/null
```

Run from the repo root with `SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1` in front.

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:binding -->
## 2. BINDING

**Read the child goal before working a phase.** Each is authoritative for its
phase and binds as if written here.

| Phase | Goal document |
|-------|---------------|
| tool contract | `001-tool-contract/goal.md` |
| server foundation | `002-server-foundation/goal.md` |
| image tools | `003-image-tools/goal.md` |
| video and audio core | `004-video-audio-core/goal.md` |
| video composition | `005-video-composition/goal.md` |
| probe, repair and HLS | `006-probe-repair-hls/goal.md` |
| desktop extension | `007-desktop-extension/goal.md` |
| Claude Code plugin | `008-claude-code-plugin/goal.md` |
| Media Editor integration | `009-media-editor-integration/goal.md` |
| Pinned build parity | `010-pinned-build-parity/goal.md` |
| Code documentation | `011-code-documentation/goal.md` |
| Media folder layout | `012-media-folder-layout/goal.md` |

**Precedence.** Decisions above outrank child detail. Child detail outranks any
summary of it. Name a conflict rather than resolving it silently.

**Stop.** Only the criteria below decide done. An evaluator sees the objective
string, not these files.
<!-- /ANCHOR:binding -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `validate.sh <this packet> --recursive --strict` prints `RESULT: PASSED`
- [x] `npx tsc --noEmit` and `npx vitest run` both exit 0 in `AI Systems/Media Editor/mcp server/`
- [x] The server's `tools/list` returns 39 tools
- [x] Five `.mcpb` files, one per target platform, each pass `mcpb validate`
- [x] `claude plugin validate` exits 0 on the plugin folder
- [x] `sk-media-editor/SKILL.md` routes to the MCP tools first, local ffmpeg second and chat advice third
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
| Phased spec and nested goals | Done | Parent spec, this goal and nine child folders written 2026-09-28 |
| Phases 001 to 004 | Done | Each child's `validate.sh --strict` printed `RESULT: PASSED` in the recursive run of 2026-09-29; 28 tools live after phase 4 |
| 005-video-composition | Done | 35 tools live, gate PASS 1388 passed 4 skipped, MiMo 2 P2 fixed, validate --strict RESULT: PASSED |
| 006-probe-repair-hls | Done | 38 tools live, gate PASS 1494 passed 4 skipped, MiMo 5 P2 (2 fixed, 1 rejected, 2 approved as amendments), three operator-approved amendments in ADR-003, validate --strict RESULT: PASSED |
| 007-desktop-extension | Built and verified | Five bundles repacked 2026-09-29 22:19 and again at 23:15 by phase 10 (64.7 to 73.6 MB), each packed manifest passes `mcpb validate` with 39 tools, validate --strict RESULT: PASSED. The clean-machine smoke test is the operator's |
| 008-claude-code-plugin | Done | Plugin and `media_setup_ffmpeg`, `claude plugin validate` exit 0, live session on the final build with 39 tools and bundled ffmpeg 9.0.2, four D6 reviews with 16 of 20 findings fixed, validate --strict RESULT: PASSED |
| 009-media-editor-integration | Built, in review | Tools first, then local ffmpeg, then advice in the skill, kernel v0.6.0, mirrors, playbook and gates. `run_parity.sh` clears on commit, and the Desktop and web scenarios are the operator's. validate --strict RESULT: PASSED |
| 010-pinned-build-parity | Done | `npm run test:pinned` runs the suite on the pinned 9.0.2, and an MP4 copy holding PCM or FFV1 re-encodes on every platform by the operator's choice. Bundles and plugin rebuilt and validated, DeepSeek review answered, validate --strict RESULT: PASSED |
| 011-code-documentation | Done | A README in each of the 23 code folders, `ARCHITECTURE.md` and a root `README.md`, every claim checked against the code and by four D6 reviews. The two build scripts that still crashed outside the package root now share one guard with `test-pinned.ts` |
| 012-media-folder-layout | Done | `media/` holds `export/`, `import/` and `tests/`, kernel and skill v0.7.0 name `media/export/`, the plugin saves there, both guides give the settings. Gates pass apart from parity findings that clear on commit. Nothing committed |
| Final package gate | Done | `GATE: PASS`, tsc 0, 83 files, `npm test` `1729 passed, 6 skipped (1735)`, `npm run test:pinned` `1731 passed, 4 skipped (1735)`, alignment 0 findings over 176 files |
| Commit | Done | 2026-09-30 on the operator's go-ahead: `22586a10` adds the server, `43d0136c` the integration and both guides, `b39052e7` deletes `mcp servers/`, all pushed to `origin/main`. Phase 12 is not committed |
| Operator steps | Open | Commit and push phase 12, clean-machine smoke test (007), Project re-upload, Desktop and web scenarios, kernel review note (009) |

### Deviations and findings

| Item | Note |
|------|------|
| Contract amended in phase 6 | On 2026-09-29 the operator approved three amendments to contract 3.4 (phase 6 ADR-003): album art is not video, `auto` decodes its copy, the ladder keeps the shared frame-rate rule |
| ffmpeg-static arm64 build is non-free | Its `ffmpeg -L` says it is not legally redistributable; the operator chose the martin-riedl.de 9.0.2 GPL build for the darwin-arm64 bundle, which D1's `ffmpeg-static` covers on the other four targets |
| ffmpeg 9 on Apple Silicon | Phase 8's live session found the shipped 9.0.2 prints two flag characters per filter row, which hid every filter. Fixed with a test. The suite still runs on the development ffmpeg 6.0, and on 9.0.2 45 tests fail on ffmpeg 6 premises, 17 of them stream copies into MP4 that ffmpeg 9 accepts. Keeping those copies or forcing AAC is an operator decision. The operator chose "Re-encode like others" on 2026-09-29, and phase 10 made both suites pass on 9.0.2 |
| Peer commit | A peer session's commit `abf08e80` carried phase 9's residency rows into HEAD before the Media Editor edits were committed |
| Executors set by the operator | D6 added 2026-09-29, replacing DevPass DeepSeek for code and MiMo for reviews. That day each pi route in the block replied `OK` to a one-word probe, the Cline V4.1 id for the first time. `codex --version` (0.158.0) printed nothing within 20 s, so Luna runs through pi until Codex answers |
<!-- /ANCHOR:log -->
