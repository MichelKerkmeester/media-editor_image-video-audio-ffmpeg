---
title: "Decision Record: Phase 1: tool contract"
description: "TypeScript on Node over Python, the MCP SDK 1.x McpServer with zod, and spawn with an args array and no shell."
trigger_phrases:
  - "tool contract decisions"
  - "typescript over python mcpb"
  - "mcp sdk mcpserver zod"
  - "spawn args array no shell"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/001-tool-contract"
    last_updated_at: "2026-09-28T16:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Recorded the design decisions this phase settles"
    next_safe_action: "Confirm or revise each decision when the phase runs"
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
# Decision Record: Phase 1: tool contract

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:adr-001 -->
## ADR-001: TypeScript on Node, not Python

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Deciders** | Michel Kerkmeester (operator), plan approved 2026-09-28 |

---

<!-- ANCHOR:adr-001-context -->
### Context

Video-audio is Python on FastMCP and ffmpeg-python and needs a system ffmpeg (`vam/server.py:10`, `vam/pyproject.toml:6-12`). Imagician is TypeScript on sharp (`imagician/package.json:46-47`). The product is a one-click Claude Desktop extension on five platforms. MCPB Node bundles carry `node_modules` and Claude Desktop ships Node, while Python bundles cannot portably carry compiled dependencies (github.com/modelcontextprotocol/mcpb). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Constraints

- Five targets: darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64
- No user-side install of Python, ffmpeg or a package manager
- sharp and ffmpeg ship as native binaries
<!-- /ANCHOR:adr-001-context -->

---

<!-- ANCHOR:adr-001-decision -->
### Decision

**We chose**: One TypeScript server on Node 18 or later, with sharp for images and `ffmpeg-static` and `ffprobe-static` for video and audio.

**How it works**: The video-audio tools are rewritten in TypeScript as ffmpeg argument arrays, and their pytest cases become vitest cases that serve as the behavioural oracle. The Imagician tools move to the new SDK and keep sharp.
<!-- /ANCHOR:adr-001-decision -->

---

<!-- ANCHOR:adr-001-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **TypeScript on Node** | MCPB carries node_modules, Desktop ships Node, sharp is already TypeScript | 27 tools rewritten, ffmpeg-python aliases mapped to real flags | 9/10 |
| Python on FastMCP | Video-audio code reused as is | Bundles cannot portably carry compiled deps, and users need Python 3.13 (`vam/pyproject.toml:6`) | 3/10 |
| Two servers, one per language | Least rewriting | Two installs, two contracts, and the Python problem stays | 2/10 |

**Why this one**: Only the Node route installs in one click on all five targets.
<!-- /ANCHOR:adr-001-alternatives -->

---

<!-- ANCHOR:adr-001-consequences -->
### Consequences

**What improves**:
- One install gives image, video and audio tools
- The bundle carries its own ffmpeg, so the missing-ffmpeg stop (`AI Systems/Media Editor/AGENTS.md:38`) no longer blocks extension users

**What it costs**:
- 27 tools rewritten. Mitigation: ported tests as the oracle, one tool per dispatch
- ffmpeg-python behaviour (keyword aliases, input-option placement) must be matched by hand. Mitigation: contract section 3 writes the real flags

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| The rewrite changes behaviour silently | M | Ported vitest cases per tool, with the source's duration checks |
| Node availability in Claude Code unknown | M | Spike in `008-claude-code-plugin` |
<!-- /ANCHOR:adr-001-consequences -->

---

<!-- ANCHOR:adr-001-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Python bundles cannot ship to the five targets |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One language, one runtime |
| 4 | **Fits Goal?** | PASS | One-click install is the parent objective |
| 5 | **Open Horizons?** | PASS | Node is the MCPB default runtime |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-001-five-checks -->

---

<!-- ANCHOR:adr-001-impl -->
### Implementation

**What changes**:
- `AI Systems/Media Editor/mcp server/` becomes a Node package
- Video-audio logic is rewritten, not wrapped

**How to roll back**: Before phase 2 starts, change this ADR and the contract. After that, a language change means discarding the package, so it is not rolled back in place.
<!-- /ANCHOR:adr-001-impl -->
<!-- /ANCHOR:adr-001 -->

---

<!-- ANCHOR:adr-002 -->
## ADR-002: MCP SDK 1.x McpServer with zod schemas

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Deciders** | Michel Kerkmeester (operator), plan approved 2026-09-28 |

---

<!-- ANCHOR:adr-002-context -->
### Context

Imagician uses the low-level `Server` API from SDK 0.5.0 with hand-written JSON Schema and no runtime validation (`imagician/src/index.ts:2-9`, `:31-194`, `imagician/package-lock.json:833-835`). Its defaults are destructured without checks (`imagician/src/index.ts:205`). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Constraints

- The current SDK line is 1.x
- Every parameter must be validated before a path or string reaches ffmpeg or sharp
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: The MCP TypeScript SDK 1.x `McpServer` with one zod schema per tool.

**How it works**: Each tool module exports its name, description, zod input schema and handler. The registry calls `registerTool` for each one. zod rejects a bad call before the handler runs, and the same schema documents the tool.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **SDK 1.x `McpServer` with zod** | One schema validates and documents, current API | API differs from the 0.5 code it replaces | 9/10 |
| Low-level `Server` with JSON Schema | Closest to Imagician | No runtime validation, two sources of truth | 4/10 |
| Stay on SDK 0.5 | No API change | Old protocol version, no structured output | 2/10 |

**Why this one**: It closes the missing-validation defect (inventory G.12) with the same code that declares the schema.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- Every call is validated before a handler runs
- Contract schemas map one to one onto code

**What it costs**:
- The 0.5 to 1.x API jump. Mitigation: `002-server-foundation` proves the registry with `media_health` before any other tool

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| An SDK minor release changes the `registerTool` shape | M | Pin the version in `package.json` and test the registry |
| zod version differs from the one the SDK expects | L | Use the zod version the SDK declares as its peer |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | No runtime validation today |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | Uses the SDK's own API |
| 4 | **Fits Goal?** | PASS | Every tool needs it |
| 5 | **Open Horizons?** | PASS | Current supported API line |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `src/server/tool-registry.ts` registers zod-typed tools
- Every tool module exports a zod schema

**How to roll back**: Pin the previous SDK version in `package.json` and reinstall. Tool modules keep their zod schemas either way.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->

---

<!-- ANCHOR:adr-003 -->
## ADR-003: spawn with an args array and no shell

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Deciders** | Michel Kerkmeester (operator), plan approved 2026-09-28 |

---

<!-- ANCHOR:adr-003-context -->
### Context

Video-audio runs ffmpeg through ffmpeg-python and `subprocess.run` with argument lists, never a shell (inventory G.1). It still builds filter graphs as f-strings from raw caller input (G.4), writes a concat list that a `'` in a filename breaks (G.2) and sets no timeout (G.11).

### Constraints

- Windows paths with drive letters must survive inside filter strings
- No shell on any platform
- Every run must be killable
<!-- /ANCHOR:adr-003-context -->

---

<!-- ANCHOR:adr-003-decision -->
### Decision

**We chose**: `child_process.spawn(binary, args, { shell: false })` through one process runner, with every caller value that enters a filter graph passed through one escaping helper.

**How it works**: Tools build an argument array. The runner spawns it, enforces the timeout, keeps the last 64 KB of stderr and maps the exit to a result or a contract error. Caller values in filter graphs go through the escaping helper, and the concat list writer escapes `\` and `'` in each `file '...'` line (contract sections 3.3.5 and 8.5).
<!-- /ANCHOR:adr-003-decision -->

---

<!-- ANCHOR:adr-003-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **spawn with an args array and one runner** | No shell, one place for timeout and stderr handling | Filter escaping is still needed | 9/10 |
| `fluent-ffmpeg` | Familiar builder API | Deprecated upstream, an extra layer to map | 4/10 |
| `exec` with a command string | Short to write | Shell quoting on three operating systems, injection risk | 1/10 |

**Why this one**: It keeps the one thing the source got right, no shell, and puts the three things it got wrong in one module each.
<!-- /ANCHOR:adr-003-alternatives -->

---

<!-- ANCHOR:adr-003-consequences -->
### Consequences

**What improves**:
- No shell injection surface
- Every run has a timeout and bounded memory

**What it costs**:
- Filter-grammar escaping stays our job. Mitigation: adversarial table tests in `005-video-composition`

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| The helper misses a filter metacharacter | H | Tests cover `\ ' : % , [ ] ; =`, newlines and Windows drive letters, the full table of contract section 8.5 |
| A killed process leaves partial output | M | The runner deletes the output folder on failure |
<!-- /ANCHOR:adr-003-consequences -->

---

<!-- ANCHOR:adr-003-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | The source has no timeout and raw filter strings |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | Node built-in, no dependency |
| 4 | **Fits Goal?** | PASS | Every video and audio tool depends on it |
| 5 | **Open Horizons?** | PASS | Behaves the same on all five targets |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-003-five-checks -->

---

<!-- ANCHOR:adr-003-impl -->
### Implementation

**What changes**:
- `src/core/process-runner.ts` is the only module that spawns
- `src/core/filter-escape.ts` is the only escaping path

**How to roll back**: The runner is one module. Replace its body without touching any tool module.
<!-- /ANCHOR:adr-003-impl -->
<!-- /ANCHOR:adr-003 -->

---
