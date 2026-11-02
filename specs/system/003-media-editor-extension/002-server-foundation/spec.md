---
title: "Feature Specification: Phase 2: server foundation"
description: "Nothing exists yet at AI Systems/Media Editor/mcp server/. This phase builds the package and the core every tool depends on: resolver, path guard, process runner, errors, results and the media_health tool."
trigger_phrases:
  - "media editor server foundation"
  - "ffmpeg resolver path guard"
  - "mcp server package scaffold"
  - "media_health tool"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 2: server foundation

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

This phase creates the package and the shared core that all 38 later tools call: configuration, errors, path guard, output folders, ffmpeg and ffprobe resolution, the process runner, capability detection, result formatting and the tool registry. It ends with a green gate and one working tool, `media_health`, reachable over stdio.

**Key Decisions**: Module layout, resolver order and how tests find fixtures (ADR-001 to ADR-003 in `decision-record.md`)

**Critical Dependencies**: Approved `../001-tool-contract/contract.md`, and npm registry access for `npm install` inside the package

---
<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P0 |
| **Status** | Complete |
| **Created** | 2026-09-28 |
| **Branch** | `main` |
| **Parent Spec** | `../spec.md` |
| **Phase** | 2 of 9 |
| **Predecessor** | `001-tool-contract` |
| **Successor** | `003-image-tools` |
| **Handoff Criteria** | Package gate green, and `media_health` reports ffmpeg and ffprobe versions from the resolved binaries |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 2** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Package scaffold, core modules and `media_health`. No image, video or audio tool.

**Dependencies**:
- `../001-tool-contract/contract.md` sections 4 to 8
- `@modelcontextprotocol/sdk` 1.x, zod, sharp, `ffmpeg-static`, `ffprobe-static`, TypeScript and vitest
- The five small clips in `../context/video-audio-mcp-main/tests/sample_files/`

**Deliverables**:
- Package files: `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- `src/` core modules, server wiring and `src/tools/media/health.ts`
- `tests/` with fixtures, helpers and one test file per module
- `decision-record.md` with ADR-001 to ADR-003

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Every tool needs the same things: validated configuration, a path check, an output folder, a located ffmpeg, a safe way to run it and a uniform result. The sources do none of this in one place. Video-audio assumes `ffmpeg` on `PATH` (`vam/server.py:892,1429`), sets no timeout (inventory G.11) and repeats its copy-then-encode fallback in five tools (inventory section C). Imagician creates any directory a caller names (`imagician/src/index.ts:207`). Built per tool by separate dispatches, these would drift. Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Purpose
One tested core, proved end to end by `media_health` over stdio, that phases 3 to 8 build tools on without re-deciding anything.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `package.json` (ESM, Node 18 or later, pinned SDK 1.x, zod, sharp, `ffmpeg-static`, `ffprobe-static`), `tsconfig.json` (NodeNext, `strict: true`) and `vitest.config.ts`
- Core modules: `config.ts`, `errors.ts`, `path-guard.ts`, `output-folder.ts`, `ffmpeg-resolver.ts`, `process-runner.ts`, `capabilities.ts` and `result.ts`
- Server modules: `tool-registry.ts`, `create-server.ts` and the stdio entry `src/index.ts`
- `media_health` (source `health_check`, `vam/server.py:13-16`) reporting versions, binary sources and capabilities
- Fixtures: only the five small clips from `../context/video-audio-mcp-main/tests/sample_files/` (about 33 KB in total, `../context/source-inventory.md:319-323`) copied to `tests/fixtures/`, plus helpers that generate larger media at test time with ffmpeg `lavfi` sources or sharp
- A check that `verify_alignment_drift.py` accepts the package root

### Out of Scope
- `tests/sample.mp4` (10,498,677 bytes) and `tests/sample.png` (3,208,752 bytes) - too large for the tracked repo (`../context/source-inventory.md:317-318`), so tests generate equivalents
- Image, video and audio tools - phases 3 to 6
- `media_setup_ffmpeg` - `008-claude-code-plugin` builds it, and the resolver here only names it
- Manifest and bundle work - `007-desktop-extension`

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/package.json`, `mcp server/package-lock.json` | Create | Package and pinned dependencies |
| `mcp server/tsconfig.json`, `mcp server/vitest.config.ts`, `mcp server/.gitignore` | Create | Strict NodeNext build, test config, ignores for `node_modules/` and `dist/` |
| `mcp server/src/index.ts`, `mcp server/src/server/*.ts` | Create | stdio entry, server factory, registry |
| `mcp server/src/core/*.ts` (8 modules) | Create | Config, errors, path guard, output folder, resolver, runner, capabilities, result |
| `mcp server/src/tools/media/health.ts` | Create | `media_health` |
| `mcp server/tests/core/`, `tests/server/`, `tests/tools/media/`, `tests/helpers/` | Create | One vitest file per module, shared helpers |
| `mcp server/tests/fixtures/*.mp4`, `tests/fixtures/README.md` | Create | Five small clips with their source and licence |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | The package installs and builds: `npm install` then `npx tsc --noEmit` exit 0 with `strict: true` and NodeNext |
| REQ-002 | The path guard resolves real paths, accepts only paths inside an allowed root by whole path segment, rejects an output equal to any input and passes the contract's adversarial cases |
| REQ-003 | The resolver follows the contract order for ffmpeg and for ffprobe: `MEDIA_EDITOR_FFMPEG_PATH` or `MEDIA_EDITOR_FFPROBE_PATH`, the bundled binary, system `PATH`, then `FFMPEG_NOT_FOUND` naming `media_setup_ffmpeg` |
| REQ-004 | The process runner spawns with an args array and `shell: false`, enforces the timeout, keeps a 64 KB stderr tail and maps failures to contract codes |
| REQ-005 | `media_health` answers over stdio with the ffmpeg and ffprobe versions, the lookup step that supplied each and the encoder and filter capabilities found |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | The output folder allocator creates `<output folder>/NNN - <description>/` with the next free number and never reuses one |
| REQ-007 | The registry registers zod-typed tools on `McpServer`, and a test asserts the registered name list |
| REQ-008 | Fixtures: the five small clips copied with a README naming their MIT source, and a helper that generates larger media at test time |
| REQ-009 | The alignment drift script runs on the package root, or its stand-in is recorded as a deviation |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.

### Code standard

This package lives outside `.skilled/`, so sk-code-opencode's surface does not auto-detect it (`.skilled/skills/sk-code/shared/references/stack-detection.md:84`). It adopts the sk-code-opencode TypeScript rules on purpose:

- A 67-character box `MODULE:` header, then imports
- Numbered ALL-CAPS section dividers
- No `'use strict'`
- kebab-case files, PascalCase types, camelCase functions, UPPER_SNAKE constants, `as const` objects instead of `enum`
- Two-space indent, semicolons, single quotes, lines of at most 100 columns
- NodeNext modules with `.js` relative specifiers and `node:` built-in imports
- `strict: true` in `tsconfig.json`
- No `any` in exported signatures, and explicit return types on every export
- `catch (error: unknown)` with narrowing, never an untyped catch
- Custom errors carry a `code` from the contract's error list
- TSDoc on every export, with `@throws` where it throws
- No commented-out code, at most three comments per ten lines, and no spec, phase or requirement ids in comments
- Tests are `*.vitest.ts` files under `tests/`

Gate, run in `AI Systems/Media Editor/mcp server/`:

```bash
npx tsc --noEmit
npx vitest run
grep -rnE ':[[:space:]]*any([^A-Za-z0-9_]|$)' src tests
grep -rnE 'catch \((error|err|e)\)' src tests
```

Both greps must print nothing. Then, from the repository root:

```bash
python3 .skilled/skills/sk-code/sk-code-opencode/assets/scripts/verify_alignment_drift.py --root "AI Systems/Media Editor/mcp server" --fail-on-warn
```

This phase confirms the script accepts a root outside `.skilled/`. If it does not, the two greps plus a `MODULE:` header check (`grep -rL 'MODULE:' src` prints nothing) stand in, and the substitution is recorded as a deviation in `goal.md` and `implementation-summary.md`.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: The full gate is green on a clean copy after `npm install`
- **SC-002**: A stdio smoke test calls `media_health` and gets both versions back
- **SC-003**: The path guard's adversarial table has at least 10 rows, all passing
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | npm registry and the `ffmpeg-static` install script, which downloads a binary | No build | Record the download source, retry, and set `MEDIA_EDITOR_FFMPEG_PATH` locally if the download fails |
| Risk | The SDK 1.x API differs from the 0.5 code (`imagician/src/index.ts:2-9`) | Med | Registry test and stdio smoke test prove it before any tool |
| Risk | `verify_alignment_drift.py` rejects a root outside `.skilled/` | Low | Greps plus a `MODULE:` header check stand in, recorded as a deviation |
| Risk | The bundled ffmpeg lacks encoders or filters later phases need (inventory F.5) | High | `capabilities.ts` reads `-encoders` and `-filters`, and `media_health` reports them, so the gap shows in phase 2 |
| Risk | Symlinked temp folders on macOS (`/var` and `/private/var`) confuse the path guard | Med | Compare real paths on both sides and test inside the OS temp folder |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Default run timeout of 1800 seconds, overridable by `MEDIA_EDITOR_TIMEOUT_SECONDS`
- **NFR-P02**: This phase's vitest suite finishes in under 60 seconds on the operator's machine
- **NFR-P03**: Capability detection runs once per process and is cached

### Security
- **NFR-S01**: No module other than `process-runner.ts` spawns a process
- **NFR-S02**: No path reaches `fs` or a spawn before the path guard accepts it

### Reliability
- **NFR-R01**: A failed or timed-out run removes its output folder
- **NFR-R02**: The server starts and answers `media_health` even when ffmpeg is missing, reporting the gap instead of crashing

---

## 8. EDGE CASES

### Data Boundaries
- Allowed roots not configured: file tools return `CONFIG_MISSING`, and `media_health` still answers and reports the missing setting
- Output description with slashes, dots or 200 characters: sanitized to a safe folder name of at most 60 characters
- Output folder already holding `999 - x/`: the next folder is `1000 - <description>/`, the number widens and never wraps
- Allowed root given with a trailing separator: normalized to an absolute real path, while a relative root is rejected

### Error Scenarios
- `ffmpeg-static` binary present but not executable: the resolver skips it and `media_health` says why
- ffmpeg exits 0 but writes no file: the runner reports `PROCESS_FAILED` with the stderr tail
- A timed-out run on Windows leaves a locked file: cleanup retries, then reports the leftover path

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 16/25 | Files: about 25, LOC: about 1,500 |
| Risk | 16/25 | Security surface: Y, new SDK API: Y, Breaking: N |
| Research | 10/20 | SDK 1.x API, resolver behaviour per OS |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, MiMo review |
| Coordination | 10/15 | Every later phase builds on this core |
| **Total** | **60/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | SDK 1.x registry shape differs from its docs | M | M | Registry test first |
| R-002 | Path guard bypass through a symlink or shared prefix | H | M | Real paths, segment comparison, adversarial table |
| R-003 | `ffmpeg-static` build missing codecs | H | M | Capability report in `media_health` |
| R-004 | Drift script rejects the root | L | M | Recorded stand-in |

---

## 11. USER STORIES

### US-001: A server that starts and reports (Priority: P0)

**As a** Claude Desktop user, **I want** the extension to start and tell me what it can do, **so that** I know before editing whether ffmpeg is ready.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: A core later tools reuse (Priority: P0)

**As a** orchestrator, **I want** one tested runner, guard and resolver, **so that** each later dispatch writes only the tool itself.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- Does `verify_alignment_drift.py` accept a root outside `.skilled/`? T005 answers it and `implementation-summary.md` records the answer.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: See `decision-record.md`
- **Source inventory**: `../context/source-inventory.md`

---
