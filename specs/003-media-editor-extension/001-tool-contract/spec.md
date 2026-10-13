---
title: "Feature Specification: Phase 1: tool contract"
description: "The two MIT sources disagree on errors, parameter names, quality units and overwrite behaviour, and neither restricts paths. This phase writes one contract for all 39 tools before any code exists."
trigger_phrases:
  - "media editor tool contract"
  - "unified mcp tool names"
  - "media editor path policy"
  - "ffmpeg resolution order"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 1: tool contract

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

Phases 2 to 8 are built one change at a time by a dispatched model, so any design question left open here would be answered differently in each dispatch. This phase settles them in one document, `contract.md`: the new name and parameter schema for each of the 35 source tools and four new ones, where files may be read and written, how errors come back, how ffmpeg is found, what a result looks like and whose copyright lines ship.

**Key Decisions**: TypeScript on Node rather than Python, the MCP SDK 1.x `McpServer` with zod schemas, and `spawn` with an args array and no shell (ADR-001 to ADR-003)

**Critical Dependencies**: `../context/source-inventory.md`, the tool-by-tool read of both sources, and the operator's approval of `contract.md`

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
| **Phase** | 1 of 9 |
| **Predecessor** | None |
| **Successor** | `002-server-foundation` |
| **Handoff Criteria** | `contract.md` maps all 39 tools with schemas, and the operator approved it |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 1** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Documents only, inside this phase folder. No package file is created here.

**Dependencies**:
- `../context/source-inventory.md` sections A to I
- `AI Systems/Media Editor/sk-media-editor/assets/hls-video-conversion.md` and `references/mcp-video-audio.md` for the three Media Editor tools
- The MCP SDK 1.x and MCPB documentation for result and configuration shapes

**Deliverables**:
- `contract.md` in this folder
- `decision-record.md` with ADR-001 to ADR-003

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The two sources cannot be combined as they stand. Imagician throws `McpError` for every failure (`imagician/src/index.ts:451-459`), while video-audio returns success and failure alike as plain strings that its tests tell apart by substring (`vam/server.py:36`, `vam/tests/test_video_functions.py:134`). Imagician names parameters in camelCase and video-audio in snake_case (`imagician/src/index.ts:34-35`, `vam/server.py:19`). Quality means 1 to 100 in one and a bitrate string in the other (`imagician/src/index.ts:68-71`, `vam/server.py:268`). Neither restricts where files are read or written, and an output path equal to its input destroys the source (`../context/source-inventory.md` section G.3). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Purpose
One approved contract that every later phase implements and tests against, so a tool's name, schema, errors and file behaviour are decided once.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Unified tool table: the 8 Imagician tools and 27 video-audio tools, each mapped to one new name with an `image_`, `video_`, `audio_` or `media_` prefix (starting from the rename map in `../context/source-inventory.md` section E), plus `media_probe`, `media_repair`, `video_hls_ladder` and `media_setup_ffmpeg`, for 39 rows
- A zod-level schema per tool: camelCase names, types, required flags, defaults, ranges and enums, with the unit of every quality, bitrate and time parameter stated
- Path policy: allowed roots from the extension's user config, inputs never overwritten, outputs written to `<output folder>/NNN - <description>/` in the Media Editor's export naming (`AI Systems/Media Editor/AGENTS.md:40`)
- Error model: typed error codes returned as tool results with `isError: true`
- ffmpeg and ffprobe resolution order: environment override, bundled `ffmpeg-static` and `ffprobe-static`, system `PATH`, then the consent-gated `media_setup_ffmpeg` tool
- Result format, capability gating, process policy (timeouts, temp folders, no overwrite) and the fix for each source defect in inventory section G
- MIT attribution plan: a THIRD_PARTY_NOTICES file with both upstream copyright lines verbatim, plus the licences still to fetch for sharp, libvips, the ffmpeg builds, zod and the SDK

### Out of Scope
- Package code - `002-server-foundation` onward builds it
- Manifest and plugin fields - phases 7 and 8 own them, this contract only fixes the environment variables and arguments they feed
- Media Editor documentation - `009-media-editor-integration` changes it
- Dropping overlapping tools such as `video_convert_properties` - the operator chose every source tool, so the contract keeps them and disambiguates their descriptions

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract/contract.md` | Create | The contract |
| `AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract/decision-record.md` | Create | ADR-001 to ADR-003 |
| `AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract/scratch/` | Create | Inventory spot checks and review notes, removed at close |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `contract.md` maps each of the 35 source tools (8 Imagician, 27 video-audio, counted in `../context/source-inventory.md` sections A and B) to exactly one new name, and adds `media_probe`, `media_repair`, `video_hls_ladder` and `media_setup_ffmpeg`, for 39 rows |
| REQ-002 | Every tool has a zod-level schema: camelCase names, a type, a required flag or default, plus a range or enum wherever the source passed a raw string into ffmpeg (inventory G.4) |
| REQ-003 | Path policy: every input resolves by real path inside an allowed root, no tool writes to an input path, outputs go to `<output folder>/NNN - <description>/`, and ffmpeg runs with `-n` so it never overwrites |
| REQ-004 | Error model: a fixed list of error codes, each returned as a tool result with `isError: true` and a structured `{ code, message, details }` body. Protocol errors are kept for unknown tools and schema failures |
| REQ-005 | Resolution order for ffmpeg and ffprobe: `MEDIA_EDITOR_FFMPEG_PATH` or `MEDIA_EDITOR_FFPROBE_PATH`, then bundled `ffmpeg-static` or `ffprobe-static`, then system `PATH`, then `media_setup_ffmpeg` after explicit user consent |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | Result format: a one-line text summary plus structured content listing each output file with path and bytes, and for media its duration and dimensions |
| REQ-007 | Capability gating: a tool that needs an encoder or filter (`libx264`, `aac`, `libmp3lame`, `drawtext`, `subtitles`, `xfade`) checks the resolved binary and returns `CAPABILITY_MISSING` naming what is absent |
| REQ-008 | Process policy: a default timeout per run, a capped stderr tail, temp folders removed in `finally` and no command line built as one string |
| REQ-009 | Each defect in `../context/source-inventory.md` section G has one line in the contract naming how the new tool avoids it |
| REQ-010 | Attribution plan: THIRD_PARTY_NOTICES carries "Copyright (c) 2024 Hongyi Wang" (`imagician/LICENSE:3`) and "Copyright (c) 2025 misbahsy" (`vam/LICENSE:3`) verbatim, and lists each bundled dependency whose licence text must be fetched upstream (inventory section I) |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: The unified table in `contract.md` has 39 rows, and a name-by-name check against the source registrations finds no source tool unmapped
- **SC-002**: The operator approves `contract.md`, recorded with a date in `goal.md`'s log
- **SC-003**: Every error code in the contract is used by at least one tool row or core rule
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | `../context/source-inventory.md` accuracy | A wrong citation carries into every later phase | Spot-check ten citations against the sources before writing (T002) |
| Dependency | Operator approval | Phase 2 cannot start | Hand over one document with a summary of every choice |
| Risk | ffmpeg-python translates keyword aliases (`audio_bitrate`, `vcodec`, `ar`) that are not ffmpeg flags, and its mapping table is not in the repo (inventory F.7) | Med | The contract writes real flags (`-b:a`, `-c:v`, `-ar`) and the ported tests in phases 4 and 5 are the oracle |
| Risk | Licences for `ffmpeg-static`, `ffprobe-static`, zod and sharp's prebuilt libvips are unknown from the sources, and a bundled ffmpeg build is GPL (inventory I.3) | High | The attribution plan lists each one to fetch, and `007-desktop-extension` blocks packing until the notices exist |
| Risk | A name or schema chosen here proves wrong in phases 3 to 8 | Med | Amend `contract.md` in place with a dated note, never fork it per phase |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The contract sets a default timeout of 1800 seconds per ffmpeg or ffprobe run, overridable by `MEDIA_EDITOR_TIMEOUT_SECONDS`
- **NFR-P02**: The contract caps captured stderr at the last 64 KB per run

### Security
- **NFR-S01**: No tool reads or writes outside the allowed roots and the output folder
- **NFR-S02**: No subprocess runs through a shell, and every caller string that reaches a filter graph passes through one escaping helper

### Reliability
- **NFR-R01**: A failed run leaves no partial output and no temp folder behind
- **NFR-R02**: Every failure maps to exactly one contract error code

---

## 8. EDGE CASES

### Data Boundaries
- Allowed roots not configured: every file tool fails with `CONFIG_MISSING` rather than falling back to the working directory
- A symlink inside an allowed root pointing outside it: rejected with `PATH_NOT_ALLOWED`, because the check runs on the real path
- A sibling folder sharing a prefix (`/media` and `/media-private`): rejected, because the check compares whole path segments
- A Windows drive-letter path reaching a filter string (`subtitles='C:\clips\a.srt'`): escaped by the helper, where the source breaks (inventory G.4)

### Error Scenarios
- ffmpeg missing at every lookup step: `FFMPEG_NOT_FOUND`, naming `media_setup_ffmpeg` as the next step
- A run past its timeout: the process is killed, the partial output removed and `PROCESS_TIMEOUT` returned
- A requested encoder or filter absent from the build: `CAPABILITY_MISSING` before ffmpeg starts

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 10/25 | Files: 2, tools specified: 39 |
| Risk | 14/25 | Security policy: Y, API contract: Y, Breaking: N |
| Research | 15/20 | Two sources, SDK 1.x and MCPB shapes, licence audit |
| Multi-Agent | 5/15 | Workstreams: MiMo read, writer |
| Coordination | 10/15 | Dependencies: every later phase reads this contract |
| **Total** | **54/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | Inventory citation wrong | M | L | Spot check in T002 |
| R-002 | GPL obligations for bundled ffmpeg missed | H | M | Attribution plan names the obligation, and phase 7 blocks packing on it |
| R-003 | Contract too loose to constrain a one-change dispatch | H | M | Every tool row carries its schema and error codes, not prose |
| R-004 | Output folder naming clashes with folders the user already has | L | M | Next free `NNN`, never a reused number |

---

## 11. USER STORIES

### US-001: One contract per tool (Priority: P0)

**As a** orchestrator dispatching one change at a time, **I want** each tool's name, schema and errors fixed in one document, **so that** a dispatch implements a decision instead of making one.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: Originals stay safe (Priority: P0)

**As a** Media Editor user, **I want** no tool to overwrite or delete my input files, **so that** a bad edit never costs me the original.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- None for this phase. The parent spec holds the two packaging questions.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: See `decision-record.md`
- **Source inventory**: `../context/source-inventory.md`

---
