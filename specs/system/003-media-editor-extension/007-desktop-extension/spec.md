---
title: "Feature Specification: Phase 7: desktop extension"
description: "The server exists but nobody can install it. This phase writes the MCPB manifest with user-chosen folders, builds five per-platform bundles with their native binaries, validates and packs them, and proves one on a clean machine."
trigger_phrases:
  - "media editor mcpb bundle"
  - "claude desktop extension manifest"
  - "per platform mcpb build"
  - "mcpb validate pack"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 7: desktop extension

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

This phase turns the package into something a Claude Desktop user installs by opening one file: a `.mcpb` bundle per platform, each carrying the compiled server, its `node_modules` and the matching ffmpeg, ffprobe and sharp binaries. The manifest asks the user which folders the server may read and which folder it writes to. A spike settles how the three native packages fetch per-platform binaries at build time, and a decision record weighs one bundle per platform against a universal bundle.

**Key Decisions**: One bundle per platform or one universal bundle, with the per-platform build method settled by a spike (ADR-001)

**Critical Dependencies**: A green phase 6 gate, the `@anthropic-ai/mcpb` CLI as a package dev dependency, licence texts for every bundled binary and a clean machine for the operator's smoke test

---
<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P0 |
| **Status** | In progress: built and verified, awaiting the operator smoke test |
| **Created** | 2026-09-28 |
| **Branch** | `main` |
| **Parent Spec** | `../spec.md` |
| **Phase** | 7 of 9 |
| **Predecessor** | `006-probe-repair-hls` |
| **Successor** | `008-claude-code-plugin` |
| **Handoff Criteria** | Five `.mcpb` files packed and validated, and the operator installed one on a clean machine and ran `media_health` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 7** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Manifest, icon, build script, notices and the five bundles. No new tool.

**Dependencies**:
- All 38 tools from phases 2 to 6
- `../001-tool-contract/contract.md` section 6 (variables and arguments) and section 10 (attribution plan)
- MCPB manifest and CLI documentation (github.com/modelcontextprotocol/mcpb)
- `AI Systems/Media Editor/Favicon.jpg` as the icon source

**Deliverables**:
- `manifest.json` and `icon.png`
- A build script producing `dist-bundles/media-editor-<platform>-<arch>.mcpb`
- `LICENSE`, `THIRD_PARTY_NOTICES` and `licenses/` inside every bundle, laid out as contract section 10.1 fixes
- `decision-record.md` ADR-001 with the spike result
- The operator's smoke note in `goal.md`

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Nobody can install the server yet. Claude Desktop installs MCPB bundles, which carry a manifest plus the server and its `node_modules`. This server depends on three native packages: sharp loads a platform-specific libvips build, and `ffmpeg-static` and `ffprobe-static` ship per-platform binaries. A bundle built on the operator's Mac holds macOS binaries only, five targets need five correct binary sets, and how each package fetches a binary for a platform other than the build host is not known yet. The ffmpeg builds are GPL-licensed, so redistributing them brings notice obligations (`../context/source-inventory.md` section I.3).

### Purpose
Five installable bundles, one per target, each passing `mcpb validate`, within a size budget and with complete notices, and one of them proved on a clean machine.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `manifest.json`: `server.type: node`, entry point `dist/index.js` (the server finds its fonts and `package.json` relative to `dist/`), an `mcp_config` passing the output folder as `--output-dir` and the folder list as one bare argument per folder, `user_config` for the allowed folders (directory, multiple, required) and the output folder (directory, optional, the first folder when empty), `compatibility.platforms`, a Node runtime range and the 38 tools
- Spike: how `ffmpeg-static`, `ffprobe-static` and sharp fetch binaries for a platform other than the build host, comparing npm platform flags (`npm_config_platform`, `npm_config_arch`, `--os`, `--cpu`) with a CI matrix of native runners
- Build script: compile, stage, install production dependencies for one target, prune other platforms' binaries, write the manifest for that target, check notices and size, run `mcpb pack`
- Bundles for darwin-arm64, darwin-x64, win32-x64, linux-x64 and linux-arm64
- `mcpb validate` on each manifest, and a size check against the budget
- `icon.png` generated from `AI Systems/Media Editor/Favicon.jpg`
- `LICENSE` for the merged work, and `THIRD_PARTY_NOTICES` with both upstream copyright lines plus `licenses/`, per the contract's attribution plan (section 10)
- Operator smoke install on a clean machine: install the bundle, set the folders, run `media_health` and `image_resize`

### Out of Scope
- Signing the bundles: the operator chose unsigned for now (2026-09-28)
- Hosting release artifacts: bundles stay local files for now (operator, 2026-09-28)
- The Claude Code plugin - `008-claude-code-plugin`
- Listing in an extension directory - not requested

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/manifest.json`, `mcp server/icon.png` | Create | MCPB manifest and icon |
| `mcp server/scripts/build-bundle.ts` | Create | Per-platform build and pack |
| `mcp server/scripts/bundle/targets.ts`, `artifacts.ts`, `notices.ts` | Create | Target flags, pinned downloads and extraction, the native and packed-file checks, and the notice check |
| `mcp server/src/core/pinned-builds.ts` | Create | The pinned ffmpeg and ffprobe build per platform (ADR-002) |
| `mcp server/src/core/config.ts` | Modify | Bare path arguments are roots (ADR-003) |
| `mcp server/LICENSE`, `mcp server/THIRD_PARTY_NOTICES`, `mcp server/licenses/` | Create | Licence, notices and licence texts |
| `mcp server/tests/packaging/*.vitest.ts`, `mcp server/tests/core/pinned-builds.vitest.ts` | Create | Manifest, target, artifact, notice, pin and bundle-content checks |
| `mcp server/tests/core/config.vitest.ts` | Modify | Bare-path and mistyped-flag cases |
| `mcp server/package.json`, `tsconfig.json`, `tsconfig.scripts.json` | Modify or create | `@anthropic-ai/mcpb` dev dependency, the `bundle` script and the scripts build |
| `mcp server/.gitignore` | Modify | Ignore `build/` and `dist-bundles/` |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `manifest.json` passes `mcpb validate` and declares `server.type: node`, the entry point, the two folder settings and the target platform |
| REQ-002 | Five bundles are built, one per target, and each holds the ffmpeg, ffprobe and sharp binaries for its own platform only |
| REQ-003 | Every bundle carries `LICENSE`, and `THIRD_PARTY_NOTICES` with both upstream copyright lines and an entry for every bundled binary's licence, the GPL text and source pointer for ffmpeg included (contract 10.1 to 10.4) |
| REQ-004 | The operator installs one bundle on a clean machine with no ffmpeg and no Node installed, sets the folders, and `media_health` and `image_resize` succeed |
| REQ-005 | The tool list in the manifest equals the registry's 38 names |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | Each bundle stays within a 150 MB budget, and its size is recorded |
| REQ-007 | The spike result, npm platform flags or a CI matrix, is recorded in ADR-001 with the command that proved it |
| REQ-008 | The folder settings reach the server on every platform, including more than one allowed folder |
| REQ-009 | `icon.png` is generated from `AI Systems/Media Editor/Favicon.jpg` at the size the manifest documentation asks for |

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

If `002-server-foundation` recorded that the script rejects this root, the stand-in recorded there applies here.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Five `.mcpb` files exist, and `mcpb validate` passes on each manifest
- **SC-002**: The operator's clean-machine smoke test is recorded with date and platform
- **SC-003**: No bundle exceeds 150 MB
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | `ffmpeg-static` may fetch only the host platform's binary at install time, unverified | High | Spike T001 tries `npm_config_platform` and `npm_config_arch`, with a CI matrix of native runners as the fallback |
| Risk | sharp needs the matching `@img/sharp-<platform>` package, unverified for cross installs | High | Spike T001 tries `npm install --os --cpu`, with the same fallback |
| Risk | Bundle size, about 70 to 80 MB of ffmpeg per platform in the approved plan | Med | Prune other platforms' binaries and measure against 150 MB |
| Risk | `ffprobe-static` 3.1.0 has an x86_64 binary under `darwin/arm64`, no `linux/arm64` binary, and carries all six platform binaries (about 330 MB); observed 2026-09-28, `../001-tool-contract/contract.md` section 6.3 | High | Spike T001 picks a native ffprobe source for `darwin-arm64` and `linux-arm64` (a per-platform ffprobe package, or a fetch after consent) and prunes the other binaries per bundle |
| Risk | GPL obligations for redistributed ffmpeg builds (inventory I.3) | High | Notices name the licence and the upstream source, and packing stops until they exist |
| Risk | Unsigned bundles show a warning in Claude Desktop | Med | Operator accepted unsigned for now; the install guide says to expect the warning. Signing comes before any public release |
| Risk | A multi-folder setting may not map onto one environment variable | Med | The server also accepts repeated `--allowed-dir` arguments, per contract section 6 |
| Dependency | A clean machine for the smoke test | Operator time | The operator names the machine and platform in advance |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The installed extension answers `media_health` within 5 seconds of first start
- **NFR-P02**: Each bundle is 150 MB or less

### Security
- **NFR-S01**: The manifest requests only the folders the user picks, and the server reads nothing else
- **NFR-S02**: Bundles hold no development dependencies, tests or fixtures, checked by listing each archive

### Reliability
- **NFR-R01**: A bundle opened on the wrong platform is refused through `compatibility.platforms` instead of failing at runtime
- **NFR-R02**: The build is repeatable: two builds of one target contain the same file list

---

## 8. EDGE CASES

### Data Boundaries
- No allowed folder picked: the manifest marks the setting required, and the server still answers `media_health` with `CONFIG_MISSING`
- Folder names with spaces or non-ASCII characters on Windows: passed through intact, checked in the smoke notes
- An arm64 Mac running the x64 bundle under Rosetta: works more slowly, and the arm64 bundle is the recommended one

### Error Scenarios
- `mcpb validate` fails: the build stops before `mcpb pack`
- A binary for the target is missing after install: the build stops and names the package
- A bundle over budget: the build fails with the measured size

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 12/25 | Files: about 10, bundles: 5 |
| Risk | 18/25 | Native binaries per platform: Y, licensing: Y, Breaking: N |
| Research | 16/20 | Cross-platform binary fetch, MCPB config passing |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, operator smoke |
| Coordination | 12/15 | Operator machine, possible CI runners |
| **Total** | **66/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | Cross-platform binary fetch impossible from one host | H | M | CI matrix with native runners |
| R-002 | Bundle over budget | M | M | Prune and measure |
| R-003 | GPL notice missing | H | L | Packing stops on an incomplete notices file |
| R-004 | Folder settings not reaching the server | H | L | Manifest test plus the smoke test |

---

## 11. USER STORIES

### US-001: One-click install (Priority: P0)

**As a** Claude Desktop user without ffmpeg, **I want** to install the Media Editor tools by opening one file, **so that** Claude can edit my media without any setup.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: I choose the folders (Priority: P0)

**As a** privacy-minded user, **I want** to pick which folders the tools may read and where they write, **so that** the extension cannot touch anything else.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- None open. Signing was answered: unsigned for now (operator, 2026-09-28).
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: See `decision-record.md`
- **Source inventory**: `../context/source-inventory.md`

---
