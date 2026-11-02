---
title: "Feature Specification: Phase 4: cli"
description: "Adds a media-editor CLI over the same 40 tool handlers through a transport-neutral dispatch module shared with the MCP server, with tests, while MCP behavior stays unchanged."
trigger_phrases:
  - "media editor cli"
  - "media-editor command"
  - "transport-neutral dispatch"
  - "cli over tool handlers"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 4: cli

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-10-04 |
| **Branch** | `main` |
| **Parent Spec** | ../spec.md |
| **Phase** | 4 of 6 |
| **Predecessor** | 003-naming-and-placement-hardening |
| **Successor** | 005-skill-cli-only |
| **Handoff Criteria** | `media-editor` runs every tool through the shared dispatch, its tests pass and the full MCP suite is unchanged |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 4** of the Media Editor runtime rename, CLI-only skill and naming hardening specification.

**Scope Boundary**: `runtime/` only: a dispatch module, the CLI entry, its build and bin, and tests. No skill, kernel or plugin manifest change.

**Dependencies**:
- Phase 003 closed, so the CLI inherits the hardened descriptions and batch placement
- The CLI design in `../001-deep-research/research/research.md`, focuses 1 and 2, and operator decision OD-1 in `../001-deep-research/spec.md`: one bare `media-editor` command, reached through the package bin here and the plugin `bin/media-editor` in phase 005

**Deliverables**:
- A transport-neutral dispatch module used by both MCP and the CLI
- `runtime/src/cli.ts`, built to `dist/cli.js`, with the package bin `media-editor`
- CLI tests and process tests

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The 40 tool handlers are reachable only through MCP. `dispatchToolCall` (`src/server/tool-registry.ts:102-127`) is private to the MCP registry and raises MCP errors, `src/index.ts:126` runs the server on import, and `loadConfig` turns every bare argv token into an allowed folder (`src/core/config.ts:168-175`), so a CLI cannot reuse the entry or pass tool arguments through the same config path.

### Purpose
A `media-editor` command runs any tool with the same handlers, validation and results as MCP, prints JSON a script can read and exits with a code that says what happened.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- A transport-neutral dispatch module exported from the runtime and used by both the MCP registry and the CLI, with argument errors returned as results
- `runtime/src/cli.ts`, a separate entry that never self-runs the MCP server, built to `dist/cli.js`, with `"bin": { "media-editor": "dist/cli.js" }`
- The commands from the research: `list`, `describe <tool>` with JSON Schema from zod, and `<tool>` with JSON args by flag, file or stdin
- The output contract: stdout JSON from `structuredContent`, previews written to a file instead of base64
- Exit codes, SIGINT and SIGTERM cleanup of ffmpeg children and temp folders, a config path that never feeds tool argv to `loadConfig`, the shared `MEDIA_EDITOR_DATA_DIR` and the persistent capability and resolver cache from research
- Defaults the bare command needs, because a plugin `bin/` command receives no plugin variables in the Bash tool environment: with no flag and no environment value, the allowed folder is the working folder, the output folder is `<cwd>/media files/export`, and the data folder is the platform default from `defaultDataDir`, so the plugin and a standalone install behave the same
- Tests that reuse `tests/helpers/tool-client.ts` `createSandbox`, plus process tests in the style of `tests/server/stdio.vitest.ts:90-93`

### Out of Scope
- Skill, kernel, plugin manifest and playbook changes, which are phase 005
- New tools. The CLI exposes exactly the tools the MCP server exposes

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/runtime/src/server/tool-registry.ts` | Modify | Use the shared dispatch |
| `AI Systems/Media Editor/runtime/src/core/dispatch.ts` | Create | Transport-neutral dispatch, name per research |
| `AI Systems/Media Editor/runtime/src/cli.ts` | Create | CLI entry |
| `AI Systems/Media Editor/runtime/package.json` | Modify | `bin` entry |
| `AI Systems/Media Editor/runtime/scripts/` | Modify | Ship `dist/cli.js` in bundles and the plugin |
| `AI Systems/Media Editor/runtime/tests/cli/` | Create | CLI and process tests |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | One dispatch module serves both MCP and the CLI, and the MCP registry calls it |
| REQ-002 | `media-editor list` names the same 40 tools the MCP server lists |
| REQ-003 | `media-editor <tool>` with JSON args by flag, file or stdin runs the handler and prints the result's `structuredContent` as JSON on stdout |
| REQ-004 | Tool argv never reaches `loadConfig`, so a bare token never becomes an allowed folder |
| REQ-005 | The full MCP suite passes with the baseline counts plus the new tests |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | `describe <tool>` prints the tool's JSON Schema from zod |
| REQ-007 | Exit codes distinguish success, a tool error and a usage error, as the research specifies |
| REQ-008 | SIGINT and SIGTERM stop ffmpeg children and remove temp folders |
| REQ-009 | Previews are written to a file and the JSON names its path |
| REQ-010 | `media_setup_ffmpeg` and `media_health` share state across separate CLI calls through `MEDIA_EDITOR_DATA_DIR`, or through the platform default data folder when it is unset |
| REQ-011 | With no flag and no environment value, `media-editor` takes the working folder as its allowed folder and `<cwd>/media files/export` as its output folder |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: From a scratch folder, `media-editor image_convert` converts a PNG to WebP and prints the output path as JSON
- **SC-002**: The MCP server behaves exactly as before, proven by the full suite
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | Research design for the cache and output contract | The CLI shape waits for it | Build the operator-approved shape |
| Risk | Decoupling dispatch changes MCP error behavior | High | Keep MCP error mapping in the MCP layer and rerun the whole suite |
| Risk | Per-call startup cost from capability probing | Med | The persistent cache in the data folder, measured before and after |
| Risk | Orphaned ffmpeg children on interrupt | Med | Signal tests that check no child survives |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Startup cost per call measured before and after the cache, with both numbers recorded
- **NFR-P02**: A tool run through the CLI takes no longer than the same run through MCP, beyond startup

### Security
- **NFR-S01**: The CLI enforces the same allowed folders and export folder as MCP
- **NFR-S02**: JSON args are parsed and validated by the tool's zod schema before any file is touched

### Reliability
- **NFR-R01**: No ffmpeg child or temp folder survives SIGINT or SIGTERM
- **NFR-R02**: Malformed JSON args return a usage error code, never a stack trace
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: `media-editor` with no command prints usage and exits with the usage code
- Maximum length: large JSON args read from a file or stdin, not argv
- Invalid format: malformed JSON or a schema violation returns a result with the error, not a protocol error

### Error Scenarios
- External service failure: none, the runtime is local
- Network timeout: none
- Concurrent access: two CLI calls share the data folder safely

### State Transitions
- Partial completion: an interrupted run removes its temp folder
- Session expiry: none, each call is one process
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 16/25 | A dispatch refactor, a new entry, build changes and tests |
| Risk | 16/25 | Shared dispatch touches every MCP call |
| Research | 10/20 | Designed in phase 001 |
| **Total** | **42/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- Which exit code table and cache layout did the research rank first? Answered in `../001-deep-research/research/research.md` sections 5.2 and 7: exit 0 success, 1 tool error, 2 usage error, 130 and 143 on signals, and an advisory cache under `<dataDir>/cache/`
<!-- /ANCHOR:questions -->

---
