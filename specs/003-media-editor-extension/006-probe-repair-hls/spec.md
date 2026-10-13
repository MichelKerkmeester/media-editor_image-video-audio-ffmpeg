---
title: "Feature Specification: Phase 6: probe, repair and HLS"
description: "The Media Editor has inspect, repair and HLS modes that no source server covers. This phase adds media_probe, media_repair and video_hls_ladder from the Media Editor's own recipes plus authored repair strategies."
trigger_phrases:
  - "media_probe media_repair"
  - "video_hls_ladder tool"
  - "ffprobe diagnose repair"
  - "hls ladder mcp tool"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 6: probe, repair and HLS

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

The Media Editor routes three modes that neither source server offers: inspection with ffprobe, repair of broken files and an HLS ladder for streaming (`AI Systems/Media Editor/sk-media-editor/SKILL.md:48`, `:278`). This phase adds a tool for each. The probe and ladder follow recipes the Media Editor already documents. The sources hold no repair recipe (inventory section H), so the repair strategies are written from general ffmpeg practice, and each is proved on a deliberately broken file.

**Key Decisions**: `media_probe` covers every media kind while `image_probe` stays, `media_repair` diagnoses before it repairs, and the ladder never upscales (ADR-001 in `plan.md`)

**Critical Dependencies**: A green phase 5 gate and the HLS recipe in `AI Systems/Media Editor/sk-media-editor/assets/hls-video-conversion.md`

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
| **Phase** | 6 of 9 |
| **Predecessor** | `005-video-composition` |
| **Successor** | `007-desktop-extension` |
| **Handoff Criteria** | Three Media Editor tools registered, 38 tools in `tools/list`, and the full gate green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 6** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Three tool modules, broken-media test generators, their tests and their registry lines.

**Dependencies**:
- `../001-tool-contract/contract.md` rows for the three tools
- `AI Systems/Media Editor/sk-media-editor/assets/hls-video-conversion.md:94-121` for the ladder
- The phase 4 `media-properties.ts` and the phase 2 capability detector

**Deliverables**:
- `src/tools/media/probe.ts`, `src/tools/media/repair.ts` and `src/tools/video/hls-ladder.ts`
- `tests/tools/media/` cases, with generators for broken files
- Registry test expecting 38 tools

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The Media Editor sends inspection and repair work to ffprobe and then ffmpeg (`AI Systems/Media Editor/sk-media-editor/SKILL.md:86`, `:154-160`) and has an HLS mode (`:278`), but neither source server has a tool for any of them. The HLS recipe exists only as a shell command and a batch script (`sk-media-editor/assets/hls-video-conversion.md:94-119`, `:176-229`). The sources contain no concrete repair recipe at all (inventory section H), so the strategies must be authored and proved here. Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Purpose
Three tools that let Claude inspect any media file, repair a broken one with a stated strategy and produce a streaming ladder, each proved by tests on real or deliberately broken media.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `media_probe`: one ffprobe run (`-v error -print_format json -show_format -show_streams`) for any media kind, images included, returning the `format`, `summary` and `streams` blocks of contract 3.4 and omitting what a file does not carry (`vam/server.py:1244-1262`)
- `media_repair`: an ffprobe diagnosis on every call, then one rewrite pass chosen by `strategy`: `remux` (a stream copy into the input's own container), `reencode` (`libx264` and `aac`, or `aac` alone for audio) and `auto`, which copies first and re-encodes when the copy exits non-zero (contract 3.4, ADR-002)
- `video_hls_ladder`: `split`, per-rung scale and pad, `libx264` with the recipe's profile, level, CRF, maxrate, bufsize and GOP settings, each profile and level on its own stream, plus HLS muxing with a `master.m3u8` (`sk-media-editor/assets/hls-video-conversion.md:94-121`), no audio as the recipe runs `-an`, and dropping rungs taller than the source's shorter side (plan ADR-001, contract 3.4 as amended)
- Test generators for an unindexed Matroska recording, an MP4 cut short with its index first, an MP4 cut before its index, a Matroska file with PCM audio named `.mp4` and an AAC file cut short

### Out of Scope
- Folding `image_probe` into `media_probe`: both stay, `media_probe` reading every kind with ffprobe and `image_probe` staying the sharp path (contract 3.4)
- A read-only `diagnose` mode and `regenerate_timestamps` or `faststart` passes: the approved contract fixes the passes at a copy and a re-encode (ADR-002)
- Audio in the ladder: the recipe runs `-an` and records the saving (`hls-video-conversion.md:56`)
- The batch HLS script (`hls-video-conversion.md:176-229`): a single-file ladder first, as the inventory advises (section H)
- GPU encoders (`h264_nvenc`, `h264_qsv`, `h264_videotoolbox`, `:248`): absent from the bundled build
- Recovering data from a file ffmpeg cannot open at all: `media_repair` reports it as unrepairable

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/src/tools/media/probe.ts`, `src/tools/media/repair.ts` | Create | Probe and repair |
| `mcp server/src/tools/video/hls-ladder.ts` | Create | HLS ladder |
| `mcp server/tests/tools/media/*.vitest.ts`, `tests/helpers/broken-media.ts` | Create | Cases and broken-file generators |
| `mcp server/src/server/all-tools.ts`, `src/core/capabilities.ts`, `tests/server/registry.vitest.ts` | Modify | 3 registrations and their requirement rows, expected count 38 |
| `mcp server/src/tools/video/copy-then-encode.ts` | Modify | An attempt may name its own output extension, for the repair copy pass |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | The three tools are registered under their contract names with zod schemas |
| REQ-002 | `media_probe` returns the format block (format name, duration, size, bit rate), the summary block (video and audio presence, duration, width, height, frame rate, sample rate, channels, layout) and one entry per stream, for video, audio and images alike, and omits any field the file does not carry (contract 3.4) |
| REQ-003 | `media_repair` diagnoses every input with ffprobe before it writes, reports the diagnosis, and writes one new file naming the pass that made it. Album art is not a video stream (ADR-003). A file with no readable video or audio stream is `UNSUPPORTED_FORMAT` and nothing is written |
| REQ-004 | Each repair strategy is proved on a generated broken file whose repaired output probes clean and decodes with zero errors |
| REQ-005 | `video_hls_ladder` writes `master.m3u8` and one playlist per rung with its segments, using the recipe's encoder settings with each rung's own profile and level |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | The ladder drops rungs taller than the source's shorter side, names them, and returns `INVALID_INPUT` (`larger-than-source`) when no rung is left |
| REQ-007 | Ladder parameters follow contract 3.4: `rungs` 1 to 4 of 1080p, 720p, 480p and 360p with no repeats, `crf` 0 to 51 and `segmentDuration` 2 to 10 seconds. A value outside a range fails the schema, and a repeated rung is `INVALID_INPUT` (ADR-002) |
| REQ-008 | `media_repair` in `auto` mode copies first, decodes the copy once, re-encodes when the copy fails or keeps decode errors, and names the pass that made the file, with a warning when the re-encode ran (ADR-003) |

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

- **SC-001**: `npx vitest run tests/tools/media` exits 0
- **SC-002**: `tools/list` returns 38 names
- **SC-003**: Every repair pass has a broken-file case that decodes with zero errors after repair
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | Repair recipes are authored, not sourced (inventory section H) | High | Every strategy has a broken-file test, and MiMo reviews the recipes |
| Risk | Generated damage does not match real-world damage | Med | Each tool description names the damage a strategy targets, and real samples can be added later |
| Risk | HLS encode time on long inputs | Med | Tests use a 10-second 1280 by 720 clip, and the description warns about long inputs |
| Dependency | `libx264` in the bundled build | No ladder | Capability check, `CAPABILITY_MISSING` |
| Risk | `media_probe` and `image_probe` drift apart | Low | Both call one sharp metadata function |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: `media_probe` answers in under 2 seconds on a 1 GB video
- **NFR-P02**: A 10-second, three-rung ladder finishes in under 60 seconds on the operator's machine

### Security
- **NFR-S01**: `media_probe` is read-only, checked by a test that snapshots the output folder
- **NFR-S02**: The ladder writes only inside its allocated folder, with `%v` and segment names built by the tool, never from caller text

### Reliability
- **NFR-R01**: A failed repair leaves the input untouched and no partial output
- **NFR-R02**: `media_repair` reports unrepairable input as such, never as success

---

## 8. EDGE CASES

### Data Boundaries
- Audio-only input to the ladder: `UNSUPPORTED_FORMAT`, since it has no video stream
- A 640 by 360 source: the ladder keeps only the 360p rung and names the three it dropped
- A portrait 720 by 1280 source: rungs compare against the shorter side
- A file that is not media: `media_probe` returns `PROCESS_FAILED` naming `media_repair` as the next step
- A zero-byte file: `media_repair` returns `UNSUPPORTED_FORMAT` and writes nothing

### Error Scenarios
- Both passes fail in `auto` mode: `PROCESS_FAILED` with both stderr tails joined
- ffprobe times out on a damaged index: `PROCESS_TIMEOUT`, and nothing is written

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 12/25 | Files: about 10, tools: 3 |
| Risk | 14/25 | Authored recipes: Y, long encodes: Y, Breaking: N |
| Research | 14/20 | Repair strategies, HLS settings |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, MiMo review |
| Coordination | 8/15 | Depends on phases 2, 4 and 5 |
| **Total** | **56/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | A repair strategy damages a recoverable file | H | L | The input is never touched, and output is always a new file |
| R-002 | HLS output does not play | H | L | ffprobe on `master.m3u8` and each variant |
| R-003 | Rung selection wrong for portrait video | M | M | Test with a 720 by 1280 clip |

---

## 11. USER STORIES

### US-001: Fix a broken file (Priority: P0)

**As a** Media Editor user, **I want** Claude to find out why a video will not play and fix it, **so that** I get a working file and know what was wrong.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: Streaming ladder in one call (Priority: P1)

**As a** web developer, **I want** an HLS ladder from one source video, **so that** I can host adaptive streaming without writing ffmpeg commands.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- None for this phase.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: `decision-record.md` (ADR-002), the local ADR-001 in `plan.md`, `../001-tool-contract/decision-record.md` and `../002-server-foundation/decision-record.md`
- **Source inventory**: `../context/source-inventory.md`

---
