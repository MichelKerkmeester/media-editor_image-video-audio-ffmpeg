---
title: "Feature Specification: Phase 8: Claude Code plugin"
description: "Claude Code users cannot install a Desktop extension by opening it. This phase ships a Claude Code plugin that points at the same bundle, carries the media-editor skill and adds the consent-gated media_setup_ffmpeg tool."
trigger_phrases:
  - "media editor claude code plugin"
  - "plugin json mcpServers mcpb"
  - "media_setup_ffmpeg consent"
  - "claude plugin validate"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 8: Claude Code plugin

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

This phase packages the server for Claude Code: a `plugin.json` whose `mcpServers` entry points at the phase 7 bundle, a `marketplace.json` so it installs from a marketplace, and the media-editor skill inside the plugin so Claude Code gets the Media Editor's routing along with the tools. It also adds the 39th tool, `media_setup_ffmpeg`, which fetches a pinned ffmpeg build only after the user agrees. A spike settles whether Claude Code supplies Node for a node-type bundle.

**Key Decisions**: Bundle reference or inline server config in `mcpServers`, settled by the Node-runtime spike (ADR-001)

**Critical Dependencies**: The phase 7 bundles, the Claude Code CLI with `claude plugin validate`, and `AI Systems/Media Editor/sk-media-editor/` as the skill source

---
<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-09-28 |
| **Branch** | `main` |
| **Parent Spec** | `../spec.md` |
| **Phase** | 8 of 9 |
| **Predecessor** | `007-desktop-extension` |
| **Successor** | `009-media-editor-integration` |
| **Handoff Criteria** | `claude plugin validate` passes, and a `--plugin-dir` session lists the 39 tools |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 8** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Plugin manifests, the skill copy step, `media_setup_ffmpeg` and their tests. The skill's content does not change here, that is phase 9's work.

**Dependencies**:
- The phase 7 bundles and build script
- Claude Code plugin documentation: `mcpServers` accepts a `.mcpb` path or https URL and extracts it to `.mcpb-cache/` (code.claude.com/docs/en/plugins-reference)
- `../001-tool-contract/contract.md` row for `media_setup_ffmpeg`

**Deliverables**:
- `claude-plugin/.claude-plugin/plugin.json` and `marketplace.json`
- A pack step that copies `sk-media-editor/` into `claude-plugin/skills/media-editor/`
- `src/tools/media/setup-ffmpeg.ts` with its test
- `decision-record.md` ADR-001 with the spike result

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Claude Code does not install Desktop extensions by opening them, so a Claude Code user today gets the Media Editor skill with no tools behind it. Claude Code plugins can declare MCP servers and ship skills, and their `mcpServers` field accepts a `.mcpb` path or URL (code.claude.com/docs/en/plugins-reference). Two things are unknown: whether Claude Code supplies Node for a node-type bundle the way Claude Desktop does, and what happens on a platform with no bundled ffmpeg. The phase 2 resolver already names `media_setup_ffmpeg` as its last step, and nothing implements it yet.

### Purpose
A Claude Code plugin that installs the same server and the media-editor skill in one step, passes `claude plugin validate`, and offers a consent-gated way to obtain ffmpeg where no bundled build fits.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Spike: does Claude Code supply Node for a node-type `.mcpb`? If not, the plugin's server config runs `node` and the README states Node 18 or later as a requirement
- `plugin.json`: name `media-editor`, version, description, author and `mcpServers` per ADR-001
- `marketplace.json` listing the plugin, placed where `claude plugin validate` accepts it
- A pack step that copies `AI Systems/Media Editor/sk-media-editor/` into the plugin as `skills/media-editor/`, so the tracked skill stays the only source
- `media_setup_ffmpeg`: without `consent: true` it returns what it would download (URL, size, SHA-256, destination). With consent it downloads a pinned static build for the platform, checks the hash, unpacks it into the server's data folder, and the resolver's fourth step picks it up
- A local install test with `claude --plugin-dir` and a session that lists the 39 tools

### Out of Scope
- Editing the skill's routing - `009-media-editor-integration`
- Publishing the marketplace publicly: deferred, the plugin uses local bundle files for now (operator, 2026-09-28)
- Package-manager installs of ffmpeg (`brew`, `winget`, `apt`) - they need admin rights and differ per OS

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/claude-plugin/.claude-plugin/plugin.json`, `marketplace.json` | Create | Plugin manifest with an inline `node` server (ADR-001) and the marketplace entry |
| `mcp server/claude-plugin/README.md` | Create | Install steps and requirements |
| `mcp server/scripts/build-plugin.ts` | Create | Unpacks one target's bundle into `claude-plugin/server/` and copies the skill at pack time |
| `mcp server/src/tools/media/setup-ffmpeg.ts` | Create | Consent-gated setup |
| `mcp server/src/core/zip-entry.ts`, `src/core/artifact-download.ts` | Create | In-process zip reading, and the pinned download with its one-hop redirect rule (ADR-002) |
| `mcp server/src/core/source-notice.ts` | Create | The build's source notice, moved from the bundle scripts so setup writes the same file |
| `mcp server/src/core/pinned-builds.ts` | Modify | `redirectHost` per row; the table itself came from `007-desktop-extension` and replaces a separate pins file |
| `mcp server/src/core/ffmpeg-resolver.ts` | Modify | Its pinned binary digests come from the build table, so step 4 accepts a consented install |
| `mcp server/src/core/capabilities.ts` | Modify | Reads filter rows with two flag characters as well as three. The pinned ffmpeg 9 builds print two, so every filter-gated tool refused in the shipped bundles until this change. The plugin session found it |
| `mcp server/src/server/all-tools.ts`, `manifest.json`, `tests/**` | Modify | 39th tool in the registry, the manifest and the tests |
| `mcp server/package.json`, `.gitignore` | Modify | The `plugin` script; ignore `claude-plugin/server/` and `claude-plugin/skills/`, which are build output |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `claude plugin validate` exits 0 on the plugin folder |
| REQ-002 | A `claude --plugin-dir` session starts the server and lists 39 tools |
| REQ-003 | `media_setup_ffmpeg` downloads nothing without `consent: true`, and with consent it checks the SHA-256 of a pinned https URL before unpacking |
| REQ-004 | The plugin carries the media-editor skill copied byte for byte from `sk-media-editor/` at pack time |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | The Node-runtime spike result is recorded in ADR-001 with the command and output that proved it |
| REQ-006 | If Claude Code does not supply Node, the plugin README states Node 18 or later and the server config runs `node` from `PATH` |
| REQ-007 | After a consented setup, the resolver finds the downloaded binary and `media_health` reports it as the source |
| REQ-008 | The Desktop manifest's tool list and the registry both hold 39 names |

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

- **SC-001**: `claude plugin validate` exits 0
- **SC-002**: A `--plugin-dir` session lists 39 tools and `media_health` answers
- **SC-003**: `media_setup_ffmpeg` without consent writes nothing, proved by a folder snapshot
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | Claude Code may not supply Node for node-type bundles, unverified | High | Spike T001, and the inline config with Node 18 or later as a stated requirement if it does not |
| Risk | A local bundle path only works on the machine that holds the files | Med | Operator chose local files for now; a hosted URL replaces the path once public hosting is decided |
| Risk | A downloaded ffmpeg is a supply-chain risk | High | Pinned URL and SHA-256 per platform in the source, consent required, no redirect to another host |
| Risk | The skill copy drifts from `sk-media-editor/` | Med | Copied at pack time only, compared by hash in a test and ignored by git |
| Dependency | A `claude` CLI version with `plugin validate` | No validation | Record the CLI version used |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The plugin's server answers `media_health` within 5 seconds of session start
- **NFR-P02**: `media_setup_ffmpeg` respects the phase 2 timeout and reports the downloaded size

### Security
- **NFR-S01**: `media_setup_ffmpeg` fetches only from https URLs pinned in source and rejects a hash mismatch
- **NFR-S02**: The downloaded binary lands in the server's own data folder, never on `PATH` or in a system folder

### Reliability
- **NFR-R01**: A failed or interrupted download leaves no partial binary for the resolver to pick
- **NFR-R02**: Once installed, the plugin works offline when the bundle's ffmpeg fits the platform

---

## 8. EDGE CASES

### Data Boundaries
- Consent given on a platform that already has a bundled ffmpeg: the tool reports nothing to do
- Hash mismatch: the file is deleted and the tool returns an error naming the mismatch
- A platform outside the pinned list: the tool refuses and names `MEDIA_EDITOR_FFMPEG_PATH` as the way to use a local build

### Error Scenarios
- Network unavailable: the tool fails with a plain message and the resolver state is unchanged
- No Node on the machine, if the spike shows Claude Code does not supply it: the server fails to start and the README names the requirement

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 10/25 | Files: about 10, tools: 1 |
| Risk | 16/25 | Download with consent: Y, runtime unknown: Y, Breaking: N |
| Research | 14/20 | Node supply in Claude Code, plugin schema |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, operator check |
| Coordination | 10/15 | Depends on the phase 7 bundles |
| **Total** | **58/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | No Node in Claude Code | H | M | Inline config plus a stated requirement |
| R-002 | A pinned download URL compromised | H | L | Pinned SHA-256 |
| R-003 | Skill copy stale | M | M | Pack-time copy and a hash test |

---

## 11. USER STORIES

### US-001: Tools in Claude Code (Priority: P0)

**As a** Claude Code user, **I want** to install the Media Editor tools and skill as one plugin, **so that** Claude Code can edit media on my machine.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: ffmpeg on an unusual platform (Priority: P2)

**As a** user on a platform without a bundled build, **I want** Claude to offer a verified ffmpeg download only when I agree, **so that** I can still use the tools without hunting for a build.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- None open. Hosting was answered: `mcpServers` points at local bundle files for now (operator, 2026-09-28).
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: See `decision-record.md`
- **Source inventory**: `../context/source-inventory.md`

---
