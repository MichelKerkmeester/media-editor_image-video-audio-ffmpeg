---
title: "Feature Specification: Phase 4: video and audio core"
description: "Nineteen video-audio conversion tools exist only as Python on ffmpeg-python. This phase rebuilds them as ffmpeg argument arrays on the shared core, with the matching pytest cases carried over as vitest cases."
trigger_phrases:
  - "media editor video audio tools"
  - "video_trim audio_extract"
  - "ffmpeg conversion tools typescript"
  - "pytest to vitest cases"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 4: video and audio core

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

This phase adds the 19 conversion tools from the video-audio source: audio extraction, trim, format and property conversion, codec, bitrate, frame rate, resolution, sample rate, channels, aspect ratio and speed. Each becomes an ffmpeg argument array with real flags instead of ffmpeg-python aliases, and each matching pytest case becomes a vitest case. The source's copy-then-encode fallback lives in one helper instead of one helper plus five inline copies.

**Key Decisions**: Real ffmpeg flags replace ffmpeg-python aliases, the stream-copy fallback lives in one helper, and the source tests are the behavioural oracle (ADR-001 in `plan.md`)

**Critical Dependencies**: A green phase 3 gate, and a bundled ffmpeg with `libx264`, `aac` and `libmp3lame`, which the source tests need (`vam/tests/test_video_functions.py:130`, `:161`, `:252`, `:279`)

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
| **Phase** | 4 of 9 |
| **Predecessor** | `003-image-tools` |
| **Successor** | `005-video-composition` |
| **Handoff Criteria** | Nineteen conversion tools registered with their ported test cases, and the gate green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 4** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Nineteen tool modules under `src/tools/video/` and `src/tools/audio/`, three shared helpers, their tests and their registry lines.

**Dependencies**:
- `../001-tool-contract/contract.md` conversion rows
- Phase 2 core: runner, resolver, capabilities, path guard, output folder
- `tests/helpers/media.ts` generators for a 10-second 640 by 360 clip with a `sine` audio track, standing in for the 10.5 MB `sample.mp4`

**Deliverables**:
- Three helpers: `src/core/media-properties.ts`, `src/core/time-parse.ts` and `src/tools/video/copy-then-encode.ts`
- 13 modules under `src/tools/video/` and 6 under `src/tools/audio/`
- `tests/tools/video/` and `tests/tools/audio/` holding the ported cases
- Registry test expecting 28 tools

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The 19 tools are Python functions that call ffmpeg through ffmpeg-python. Its keyword aliases (`audio_bitrate`, `vcodec`, `ar`, `ac`, `vf`) are not ffmpeg flags, and the translation table is not in the repo (inventory F.7). `ss` and `to` are input options that must come before `-i` (`vam/server.py:55`). The copy-then-encode fallback is one helper for nine tools (`_run_ffmpeg_with_fallback`, `vam/server.py:332-348`) and is copied inline in `change_aspect_ratio` (`:221-233`). No run passes `-y` or `-n`, so an existing output makes ffmpeg wait on stdin (inventory G.5), and success and failure both come back as strings (inventory section B). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Purpose
Nineteen conversion tools that run real ffmpeg flags through the shared runner and pass the source's own test cases.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Audio: `audio_extract` (`extract_audio_from_video`, `vam/server.py:30-32`), `audio_convert_properties` (`:92-103`), `audio_convert` (`:257`), `audio_set_bitrate` (`:278`), `audio_set_sample_rate` (`:299`), `audio_set_channels` (`:320`)
- Video: `video_trim` (`:55-66`), `video_convert_properties` (`:128-147`), `video_set_aspect_ratio` (`:166-233`), `video_convert` (`:360-362`), `video_set_resolution` (`:374-383`), `video_set_codec` (`:395-397`), `video_set_bitrate` (`:409-411`), `video_set_frame_rate` (`:423-425`)
- Audio inside video: `video_set_audio_codec`, `video_set_audio_bitrate`, `video_set_audio_sample_rate` and `video_set_audio_channels` (`:437-481`)
- `video_set_speed` (`change_video_speed`, `:1048-1100`) with the `atempo` chain for factors below 0.5 and above 2.0
- Helpers: ffprobe properties with the 30 fps fallback (`_get_media_properties`, `:1237-1268`), time parsing (`_parse_time_to_seconds`, `:1223-1235`) and one copy-then-encode helper
- Vitest ports of the 20 matching pytest cases (`vam/tests/test_video_functions.py:130-311`, `:430`, `:471`)

### Out of Scope
- Subtitles, overlays, concat, b-roll, fades and silence removal - `005-video-composition`
- The source's string results - the contract's result format replaces them
- The dead `_prepare_clip_for_concat` helper (`vam/server.py:1271`, referenced nowhere, inventory section C)
- The unused `codec_to_use` variable in `change_aspect_ratio` (`:181,201`) - the new tool states its re-encode behaviour instead

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/src/core/media-properties.ts`, `src/core/time-parse.ts` | Create | ffprobe properties and time parsing |
| `mcp server/src/tools/video/copy-then-encode.ts` | Create | Stream copy first, re-encode on failure |
| `mcp server/src/tools/video/*.ts` (13) | Create | Video tools |
| `mcp server/src/tools/audio/*.ts` (6) | Create | Audio tools |
| `mcp server/tests/tools/video/`, `tests/tools/audio/`, `tests/core/` | Create | Ported cases and helper tests |
| `mcp server/src/server/all-tools.ts`, `tests/server/registry.vitest.ts` | Modify | 19 registrations, expected count 28 |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | Each of the 19 tools is registered under its contract name with its zod schema |
| REQ-002 | Every tool builds real ffmpeg flags (`-b:a`, `-b:v`, `-c:a`, `-c:v`, `-ar`, `-ac`, `-r`, `-f`, `-vf`), places `-ss` and `-to` before `-i` and runs through the process runner with `-n` |
| REQ-003 | The 20 matching pytest cases pass as vitest cases, including the trim duration check within 0.1 seconds (`vam/tests/test_video_functions.py:482-492`) |
| REQ-004 | Stream-copy tools try copy first and re-encode on failure through one helper, and the result says which path ran |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | `video_set_speed` rejects a factor of 0 or below and chains `atempo` so each stage stays within 0.5 to 2.0 |
| REQ-006 | `video_set_aspect_ratio` rejects a ratio that is not `W:H` with positive integers, and supports `pad` and `crop` modes |
| REQ-007 | Codec parameters are checked against the resolved build's encoders, returning `CAPABILITY_MISSING` for an absent one |
| REQ-008 | `media_health` lists the encoders these tools use: `libx264`, `aac`, `libmp3lame`, `libx265`, `libvpx-vp9` and `libopus` |

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

- **SC-001**: `npx vitest run tests/tools/video tests/tools/audio` exits 0 with all 20 ported cases present
- **SC-002**: `tools/list` returns 28 names
- **SC-003**: `grep -rnE "'(acodec|vcodec|audio_bitrate|video_bitrate)'" src` prints nothing
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | `libx264`, `aac` and `libmp3lame` in the bundled ffmpeg | Most ported tests fail | Run `ffmpeg -encoders` from the bundled binary in T001, before any tool |
| Risk | ffmpeg-python alias mapped to the wrong flag (inventory F.7) | High | Each test probes the output with ffprobe for the property it set, not only that a file exists |
| Risk | Codec-copy trim cuts on keyframes, so durations drift | Med | The duration test runs on the encode path and records which path ran |
| Risk | Codecs missing from `ffmpeg-static` (inventory F.5) | High | Capability check before spawn, `CAPABILITY_MISSING`, and a test with a stubbed capability set |
| Risk | The output container rejects copied streams, such as AAC in AVI | Med | The helper retries with encoding, and the `video_convert` to AVI test covers it (`vam/tests/test_video_functions.py:234`) |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Every run uses the phase 2 timeout, 1800 seconds by default
- **NFR-P02**: The video and audio tests finish in under 3 minutes together on the operator's machine, using 10-second generated clips

### Security
- **NFR-S01**: Codec, format and bitrate strings are enum or pattern validated before they reach the args array, closing inventory G.4 for these tools
- **NFR-S02**: Resolution strings match `^\d+x\d+$` or a bare height before they reach `scale=`

### Reliability
- **NFR-R01**: A failed copy attempt deletes its partial output before the encode starts, which removes the stdin prompt the source could hit (inventory G.5)

---

## 8. EDGE CASES

### Data Boundaries
- `startTime` after `endTime` in `video_trim`: `INVALID_INPUT`
- Speed factor 0.25 or 4.0: two `atempo` stages, each within range
- Audio tool, or one of the four audio-track video tools, on a video with no audio stream: `UNSUPPORTED_FORMAT` with `detected` and `accepted`, found by ffprobe before any command starts
- Target aspect ratio already matching: stream copy, and the reply says the file was copied unchanged

### Error Scenarios
- Encoder missing from the build: `CAPABILITY_MISSING` before spawn
- Copy and encode both fail: `PROCESS_FAILED` with both stderr tails
- ffprobe cannot read the input: `PROCESS_FAILED` from the probe run
- The input has no stream of the kind the tool needs: `UNSUPPORTED_FORMAT` with `detected` and `accepted`

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 18/25 | Files: about 50, tools: 19 |
| Risk | 14/25 | Port fidelity: Y, codec availability: Y, Breaking: N |
| Research | 10/20 | ffmpeg-python alias mapping, flag placement |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, MiMo review |
| Coordination | 8/15 | Depends on the phase 2 core and phase 3 registry |
| **Total** | **58/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | Alias mapped to the wrong flag | H | M | ffprobe assertion on the changed property |
| R-002 | Codec missing on one platform | H | M | Capability gating plus the per-platform check in phase 7 |
| R-003 | Trim duration outside 0.1 seconds | M | M | Duration test on the encode path |
| R-004 | `atempo` chain wrong at extreme factors | M | L | Tests at 0.25, 1.5 and 4.0 |

---

## 11. USER STORIES

### US-001: Convert without a terminal (Priority: P0)

**As a** Claude Desktop user, **I want** to convert, trim or re-encode a video by asking Claude, **so that** I get the file without learning ffmpeg.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: Honest codec errors (Priority: P1)

**As a** Media Editor user, **I want** a plain message when my build lacks a codec, **so that** I pick another format instead of reading an ffmpeg log.

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
- **Decision Records**: None in this phase. It builds on `../001-tool-contract/decision-record.md` and `../002-server-foundation/decision-record.md`, plus the local ADR in `plan.md`
- **Source inventory**: `../context/source-inventory.md`

---
