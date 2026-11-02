---
title: "Feature Specification: Phase 5: video composition"
description: "The seven composition tools build filter graphs from raw caller strings, depend on filters ffmpeg-static may lack and carry a malformed xfade audio graph. This phase rebuilds them with escaping, capability checks and a bundled font."
trigger_phrases:
  - "media editor video composition"
  - "subtitles text overlay concat"
  - "xfade b-roll silence removal"
  - "ffmpeg filter escaping"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 5: video composition

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

This phase adds the seven tools that combine or annotate video: burned-in subtitles, text overlays, image overlays, concatenation with optional transitions, b-roll inserts, fades and silence removal. These are where the source is weakest: filter graphs assembled from raw caller strings (inventory G.4), a font that depends on the OS (F.2), filters the build may lack (F.3, F.4) and an xfade audio graph that is malformed as written (F.1). Each tool gets escaping, a capability check and ported tests, and the xfade audio path gets its first test.

**Key Decisions**: One escaping helper for every filter value, a bundled font always passed as `fontfile=`, and capability checks before spawning (ADR-001 in `plan.md`)

**Critical Dependencies**: A green phase 4 gate and a font whose licence allows redistribution

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
| **Phase** | 5 of 9 |
| **Predecessor** | `004-video-audio-core` |
| **Successor** | `006-probe-repair-hls` |
| **Handoff Criteria** | Seven composition tools registered, with capability gating tested for `drawtext`, `subtitles` and `xfade` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 5** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Seven tool modules, the escaping helper, the bundled font, their tests and their registry lines.

**Dependencies**:
- `../001-tool-contract/contract.md` composition rows and escaping table
- Phase 4 helpers: media properties, time parsing, copy-then-encode
- The five source clips in `tests/fixtures/` for the b-roll and xfade cases (`vam/tests/test_video_functions.py:503-505`, `:663-664`)

**Deliverables**:
- `src/core/filter-escape.ts` with an adversarial table test
- `assets/fonts/` with one redistributable font, and its licence in `assets/licenses/`, because libass reads every file in the `fontsdir` folder
- Seven tool modules and their tests
- Registry test expecting 35 tools

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Every composition tool builds its filter graph by string formatting. `drawtext` escapes some characters but not `[ ] ; =` or newlines, and `enable=between(t\,S\,E)` takes raw caller strings (`vam/server.py:610-619`). The subtitles path goes in unescaped, so any Windows drive letter breaks the filter (`:540`). The concat list breaks on a `'` in a file name (`:1012`). `drawtext` without `fontfile` depends on fontconfig finding a default font, which differs per OS (`:630-632`). The xfade audio branch emits no output labels, so it is malformed, and no test caught it because the fixtures have no audio (`:932-950`, `vam/tests/test_video_functions.py:74-78`). `add_b_roll` accepts `audio_mix` and slide transitions and ignores both (`vam/server.py:1506-1531`). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Purpose
Seven composition tools whose filter graphs no caller text can break, that say plainly when the build lacks a filter, and that pass the source tests plus the audio cases the source missed.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `video_add_subtitles` (`add_subtitles`, `vam/server.py:514-566`) with the SRT path escaped and `force_style` values validated
- `video_add_text_overlay` (`add_text_overlay`, `:605-663`) with text escaped or passed through `textfile=`, and the bundled font always set
- `video_add_image_overlay` (`add_image_overlay`, `:689-771`) with position, size and opacity validated
- `video_concat` (`concatenate_videos`, `:815-1033`): one input, two inputs with `xfade` and `acrossfade` built correctly, and more inputs through an escaped list or the concat filter
- `video_add_b_roll` (`add_b_roll`, `:1353-1571`) with positions and fades, and `audioMix` and slide transitions either built or refused
- `video_add_fade` (`add_basic_transitions`, `:1586-1645`) for fade in and fade out
- `media_remove_silence` (`remove_silence`, `:1117-1219`) for audio or video, parsing `silencedetect` output including a trailing silence with no `silence_end`
- Vitest ports of the 8 matching pytest cases (`vam/tests/test_video_functions.py:315-468`, `:500-729`)

### Out of Scope
- Slide transitions and audio mixing in b-roll beyond what the contract approves - the source never implemented them (`vam/server.py:1506-1531`), and the contract decides build or refuse
- Transitions outside the 37-entry xfade list (`:826-836`)
- A font picker - one bundled font, plus a `fontFile` parameter for a user font under an allowed root

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/src/core/filter-escape.ts`, `src/core/font-path.ts` | Create | Escaping helper and font resolver |
| `mcp server/assets/fonts/`, `assets/licenses/` | Create | One redistributable font, and its licence outside the font folder |
| `mcp server/src/tools/video/*.ts` (6), `src/tools/media/remove-silence.ts` | Create | Seven composition tools |
| `mcp server/tests/tools/composition/*.vitest.ts`, `tests/core/filter-escape.vitest.ts` | Create | Ported and new cases |
| `mcp server/src/server/all-tools.ts`, `tests/server/registry.vitest.ts` | Modify | 7 registrations, expected count 35 |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | Each of the 7 tools is registered under its contract name with its zod schema |
| REQ-002 | Every caller value that enters a filter graph passes through `filter-escape.ts`, whose adversarial test covers `\ ' : , [ ] ; =`, newlines and Windows drive letters |
| REQ-003 | Tools that need `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` or `overlay` check the resolved build first and return `CAPABILITY_MISSING` when a filter is absent |
| REQ-004 | The 8 matching pytest cases pass as vitest cases |
| REQ-005 | `video_concat` with a transition builds a well-formed graph for clips with audio, labelled `[v]` and `[a]`, and a test with audio-bearing clips proves it |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | `video_add_text_overlay` always passes `fontfile=`, with the bundled font unless the caller names a font under an allowed root |
| REQ-007 | The concat list escapes quotes in file names, or the tool uses the concat filter, and a test with a `'` in a file name passes |
| REQ-008 | `video_add_b_roll` never accepts `audioMix` or a slide transition and then ignores it. The contract removed both keys, so a strict entry schema refuses them with `-32602` (ADR-002 in `decision-record.md`, AC-010) |
| REQ-009 | `media_remove_silence` handles a trailing silence with no `silence_end` line |

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

- **SC-001**: `npx vitest run tests/tools/composition` exits 0 with the 8 ported cases present
- **SC-002**: `tools/list` returns 35 names
- **SC-003**: The escaping helper's table has at least 12 rows, all passing
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | `libass` for the `subtitles` filter in `ffmpeg-static`, unknown per build (inventory F.3) | No burned-in subtitles | Capability check, `CAPABILITY_MISSING` and the `MEDIA_EDITOR_FFMPEG_PATH` override |
| Dependency | `libfreetype` for `drawtext` (inventory F.2) | No text overlays | Same gating, checked on each platform build in phase 7 |
| Risk | drawtext font lookup differs per OS (inventory F.2) | High | Bundle one font and always pass `fontfile=`, checked by a render test on each platform build |
| Risk | `xfade` missing from an older or minimal build (inventory F.4) | Med | `ffmpeg -filters` check before spawn, tested with a stubbed capability set |
| Risk | The escaping helper misses a case and caller text changes the graph | High | Adversarial table test in T002, reviewed by MiMo |
| Risk | Windows file locks keep temp folders alive (inventory F.6) | Low | Cleanup with `force` and retries, leftover path reported |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Every run uses the phase 2 timeout
- **NFR-P02**: The composition tests finish in under 4 minutes together on the operator's machine

### Security
- **NFR-S01**: No caller string reaches a filter graph without the escaping helper, checked by `grep -rnE "filter_complex|'-vf'|'-af'" src/tools` and review
- **NFR-S02**: Font, SRT and overlay image paths pass the path guard like any other input

### Reliability
- **NFR-R01**: Temp folders for normalized clips are removed in `finally`, also on Windows
- **NFR-R02**: A tool never reports success while ignoring a parameter the caller set

---

## 8. EDGE CASES

### Data Boundaries
- Text containing `'`, `:`, `%`, a newline or a backslash: rendered as written, proved by the escaping table
- SRT path `C:\Users\me\a.srt`: escaped so the filter parses it
- Concat of one clip: refused by the schema, since `inputPaths` takes 2 to 50 entries and a one-clip re-encode is `video_convert`'s job (contract 3.3.5, `vam/server.py:846-854`)
- Fade longer than the clip: `INVALID_INPUT`, as the source test expects (`vam/tests/test_video_functions.py:650`)
- Input with no silence: stream copy of the original, reported as unchanged

### Error Scenarios
- Clips with different sizes or frame rates in `video_concat`: normalized first, as the source does (`vam/server.py:891-917`)
- Unknown transition name: fails the schema as protocol error `-32602`, and the listed schema names the 37 allowed values (contract 3.3.5)
- More than two clips with a transition: `INVALID_INPUT`, as the source test expects (`vam/tests/test_video_functions.py:729`)

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 16/25 | Files: about 20, tools: 7, filter graphs: 7 |
| Risk | 18/25 | Injection surface: Y, platform filters: Y, Breaking: N |
| Research | 12/20 | Filter escaping rules, libass and freetype per build |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, MiMo review |
| Coordination | 8/15 | Depends on the phase 4 helpers |
| **Total** | **62/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | An escaping gap lets caller text alter a graph | H | M | Adversarial table and MiMo review |
| R-002 | libass absent from a platform build | H | M | Gating plus the override |
| R-003 | Font licence forbids bundling | M | L | Pick a font under the SIL Open Font License and ship its licence |
| R-004 | xfade offset arithmetic wrong for short clips | M | M | Duration test within 15 percent, as the source does (`vam/tests/test_video_functions.py:680-683`) |

---

## 11. USER STORIES

### US-001: Captions and titles (Priority: P0)

**As a** Claude Desktop user, **I want** to burn in subtitles or add a title by asking, **so that** I can publish a captioned clip without an editor.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: Joined clips (Priority: P1)

**As a** Media Editor user, **I want** to join clips with a dissolve, **so that** I get one video with smooth cuts.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- Answered: `assets/fonts/SourceSans3-Regular.ttf`, Adobe Source Sans 3 Regular under the SIL Open Font License 1.1, from the npm package `source-sans` 3.52.0 (tarball sha1 `637688392a05cb5d016d9bec03dd84212e7d69dd`, matching the registry).
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: None in this phase. It builds on `../001-tool-contract/decision-record.md` and `../002-server-foundation/decision-record.md`, plus the local ADR in `plan.md`
- **Source inventory**: `../context/source-inventory.md`

---
