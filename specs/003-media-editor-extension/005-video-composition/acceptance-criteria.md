---
title: "Acceptance Criteria: Phase 5: video composition"
description: "The criteria this packet must satisfy before it may be closed, each one met, waived by a decision record, or superseded by one."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/005-video-composition"
    last_updated_at: "2026-09-29T12:35:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed every criterion with evidence"
    next_safe_action: "None for this packet; phase 6 is next"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 5: video composition

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/005-video-composition
**Level:** 3
**Status:** Complete
**Date:** 2026-09-29
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the built server, When `tools/list` runs, Then it returns 35 names, including the 7 from this phase | `tests/server/registry.vitest.ts:258` pins all 35 names in contract row order; live stdio `tools/list` over `dist/index.js` printed `COUNT: 35` on 2026-09-29 | Met | - |
| AC-002 | REQ-002 | Given the escaping table (`\ ' : , [ ] ; =`, newline, `%`, drive letter, empty string), When each value is escaped and parsed back by ffmpeg, Then the parsed value equals the input | `tests/core/filter-escape.vitest.ts:535` runs 27 battery rows through the resolved ffmpeg and `:546` a 200-string fuzz in batches of 20, all parsed back equal; the 20-row escape table sits above them | Met | - |
| AC-003 | REQ-003 | Given a capability set without `subtitles`, When `video_add_subtitles` is called, Then it returns `CAPABILITY_MISSING` naming `subtitles` and spawns nothing | `tests/tools/composition/capability-gating.vitest.ts:491` (`it.each`, the `subtitles` row at `:291`): `CAPABILITY_MISSING`, `details.name` `subtitles`, 0 ffmpeg runs, no folder | Met | - |
| AC-004 | REQ-004 | Given the ported suite, When `npx vitest run tests/tools/composition` runs, Then all 8 source cases pass | All 8 source names present and passing: `test_add_b_roll` 5, `test_add_basic_transitions` 4, `test_add_image_overlay` 2, `test_add_subtitles` 2, `test_add_text_overlay` 3, `test_concatenate_videos` 3, `test_concatenate_videos_with_xfade` 5, `test_remove_silence` 2 | Met | - |
| AC-005 | REQ-005 | Given two clips with audio, When `video_concat` joins them with `dissolve` for 1 second, Then the output has one video and one audio stream and lasts their sum minus 1 second within 15 percent | `tests/tools/composition/concat-xfade.vitest.ts:313`; live run: two 2-second clips joined with `dissolve` gave video plus audio at 3.07 seconds | Met | - |
| AC-006 | REQ-006 | Given a text overlay with no `fontFile`, When the args are built, Then they contain `fontfile=` pointing at the bundled font | `tests/tools/composition/add-text-overlay.vitest.ts:501`: the full args snapshot carries `fontfile=` at `SourceSans3-Regular.ttf`. The contract names the parameter `fontPath`, so the criterion is met under that name | Met | - |
| AC-007 | REQ-007 | Given a clip named `it's.mp4`, When `video_concat` joins it with another, Then the run succeeds | `tests/tools/composition/concat.vitest.ts:451` | Met | - |
| AC-008 | REQ-008 | Given `audioMix: 0.5` or a slide transition, When `video_add_b_roll` runs, Then it applies the value (checked by ffprobe) or returns `INVALID_INPUT`, never success with the value ignored | Superseded by AC-010: the contract removed both keys, so the refusal is a schema failure rather than `INVALID_INPUT` | Superseded | ADR-002 |
| AC-009 | REQ-009 | Given audio ending in 3 seconds of silence, When `media_remove_silence` runs, Then the trailing silence is gone from the output | `tests/tools/composition/remove-silence.vitest.ts:373`; live run: a 4-second file with a 2-second middle gap came back at 2.02 seconds | Met | - |
| AC-010 | REQ-008 | Given a `clips` entry carrying `audioMix`, `audio_mix`, `transitionIn` or `transition_in`, When `video_add_b_roll` is called, Then the call fails its schema with `-32602`, nothing runs and no folder is created | `tests/tools/composition/add-b-roll.vitest.ts:602` (four rows); live stdio call with `audioMix: 0.5` returned `-32602` and left the output folder empty | Met | - |

### Status values

| Value | Meaning |
|-------|---------|
| `Met` | Verified. The Verification cell names evidence that was actually observed. |
| `Unmet` | Not yet satisfied. Blocks closure. |
| `Waived` | Deliberately not pursued. Requires an ADR in the Waiver cell. |
| `Superseded` | Replaced by a different criterion or decision. Requires an ADR in the Waiver cell. |

### Waiver cell

Write `-` when the row is `Met` or `Unmet`. Write `ADR-NNN` when the row is
`Waived` or `Superseded`, naming a decision record that exists in
`decision-record.md`. A waiver naming an ADR that is not there fails validation:
the point of a waiver is that someone recorded the reasoning, so an unbacked
waiver is treated as an unmet criterion rather than as a pass.
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** Yes

Nine criteria are met with observed evidence, from the full gate on the final state and a live stdio run over the built server. AC-008 is superseded by AC-010 under ADR-002: the contract removed `audioMix` and the slide transitions, so a caller who sends them now gets a schema refusal instead of the silent drop the source gave. Nothing was consciously left out. Two checks belong to later phases and are recorded in `tasks.md`: the other four platforms run in phase 7, and so does the bundled font check inside a packed extension.
<!-- /ANCHOR:closure -->
