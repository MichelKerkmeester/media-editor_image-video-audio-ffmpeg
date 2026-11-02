---
title: "Implementation Plan: Phase 4: cli"
description: "Extracts a transport-neutral dispatch from the MCP registry, adds a separate CLI entry built to dist/cli.js with the media-editor bin, and tests it with sandboxed handler tests and process tests while the MCP suite stays green."
trigger_phrases:
  - "cli implementation plan"
  - "dispatch extraction"
  - "cli exit codes"
  - "cli process tests"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 4: cli

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript on Node |
| **Framework** | MCP SDK for the server, plain Node for the CLI, zod for schemas |
| **Storage** | `MEDIA_EDITOR_DATA_DIR` for the shared cache and ffmpeg setup |
| **Testing** | vitest, `createSandbox`, spawned process tests |

### Overview
GPT-6 Luna writes the dispatch extraction and the CLI core. SWE 2 writes the tests. DeepSeek reviews the code neither of them wrote. The MCP layer keeps its own error mapping, so its behavior does not change.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phase 003 closed
- [ ] The research's command set, output contract, exit codes and cache layout approved
- [ ] Baseline test counts recorded

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Full suite and CLI tests passing
- [ ] Code reviewed by a model that did not write it
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One core, two transports.

### Key Components
- **Dispatch module**: validates args with the tool's zod schema, runs the handler and returns a result with errors as results
- **MCP registry**: calls the dispatch module and maps its result to MCP, as today
- **CLI entry**: parses the command, reads JSON args from a flag, file or stdin, builds its own config without passing tool argv to `loadConfig`, calls the dispatch module and prints JSON
- **Cleanup**: a signal handler that stops ffmpeg children and removes temp folders

### Data Flow
`media-editor <tool> --args '{...}'` reads the args, loads the config from the environment and data folder, calls the dispatch module, writes any preview to a file, prints `structuredContent` as JSON on stdout and exits with the mapped code.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `runtime/src/server/tool-registry.ts` | Private dispatch and MCP errors | Update to call the shared module | Full suite |
| `runtime/src/index.ts` | MCP entry that self-runs | Unchanged | stdio tests |
| `runtime/src/core/config.ts` | Turns bare argv tokens into allowed folders | Unchanged, the CLI bypasses it for tool argv | CLI config test |
| `runtime/src/tools/media/preview.ts` | Returns base64 previews | Add a file output for the CLI | Preview test |
| `runtime/scripts/` | Bundle and plugin builds | Include `dist/cli.js` | Packaging tests |

Required inventories:
- Same-class producers: every place that raises `McpError` inside a handler path.
- Consumers of changed symbols: `rg -n "dispatchToolCall|McpError" runtime/src runtime/tests`.
- Matrix axes: args source (flag, file, stdin) by outcome (success, tool error, usage error) by signal (none, SIGINT, SIGTERM).
- Algorithm invariant: the same args produce the same `structuredContent` through MCP and the CLI.
<!-- /ANCHOR:affected-surfaces -->


---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

Follow the ordered tasks in `tasks.md`. It owns the Setup, Implementation and Verification phase checkboxes and task state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | Dispatch module, arg parsing, exit code mapping, config isolation | vitest with `createSandbox` |
| Integration | Spawned `dist/cli.js` runs, signals, stdin args, shared data folder | vitest process tests |
| Manual | Four PNGs converted from a scratch folder | `media-editor image_convert` |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phase 001 CLI design | Internal | Pending | No approved shape |
| Phase 003 descriptions and placement | Internal | Pending | CLI inherits stale text |
| GPT-6 Luna and SWE 2 | External | Canary pending | Swap models with a stated reason |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: An MCP regression in the full suite
- **Procedure**: Revert `tool-registry.ts` to its private dispatch and remove the CLI files, nothing is committed before phase 006
<!-- /ANCHOR:rollback -->

---


---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup ──► Dispatch extraction ──► CLI entry and build ──► Tests and review
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Phase 003 | Dispatch |
| Dispatch | Setup | CLI entry |
| CLI entry | Dispatch | Tests |
| Tests and review | CLI entry | Phase 005 |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 30 minutes |
| Core Implementation | High | 6 to 10 hours |
| Verification | Med | 2 to 3 hours |
| **Total** | | **8.5 to 13.5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Baseline test counts recorded
- [ ] Startup cost measured before the cache
- [ ] No commit made before phase 006

### Rollback Procedure
1. Revert `tool-registry.ts`
2. Remove the CLI entry, the dispatch module and the CLI tests
3. Rerun `npm run test:pinned` and confirm the baseline counts
4. Report the cause to the master orchestrator

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
