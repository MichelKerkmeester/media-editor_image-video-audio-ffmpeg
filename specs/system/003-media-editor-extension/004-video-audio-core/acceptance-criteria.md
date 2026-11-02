---
title: "Acceptance Criteria: Phase 4: video and audio core"
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
    packet_pointer: "003-media-editor-extension/004-video-audio-core"
    last_updated_at: "2026-09-29T09:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Marked every criterion met or superseded"
    next_safe_action: "Start 005-video-composition"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 4: video and audio core

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/004-video-audio-core
**Level:** 3
**Status:** Complete
**Date:** 2026-09-28
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the built server, When `tools/list` runs, Then it returns 28 names, including the 19 from this phase | `npx vitest run tests/server/registry.vitest.ts`. Observed 2026-09-29: a stdio `tools/list` on the built server returned 28 names, `media_health`, the eight `image_*` tools and the 19 of this phase in contract row order, and the registry test pins the same 28. Evidence: tests/server/registry.vitest.ts:258. | Met | - |
| AC-002 | REQ-002 | Given `video_trim` with `startTime: 5` and `endTime: 10`, When its args are built, Then `-ss` and `-to` come before `-i` and every flag is a real ffmpeg flag | Args snapshot in `tests/tools/video/trim.vitest.ts`. Observed 2026-09-29: `trimArgs` for 5 and 10 returns `-n -ss 5 -to 10 -i <input> -c copy <output>` exactly, with no ffmpeg-python alias, and moving `-i` first fails two tests. Evidence: tests/tools/video/trim.vitest.ts:604. | Met | - |
| AC-003 | REQ-003 | Given the 10-second generated clip, When `video_trim` cuts 5 seconds, Then ffprobe reports a duration within 0.1 seconds of 5.0 | `tests/tools/video/trim.vitest.ts`, from `vam/tests/test_video_functions.py:482-492`. Observed 2026-09-29: a literal cut of 5 to 10 seconds from a 10-second clip over the built server read back 5.0 seconds, and the ported tests cut 0 to 5 and 5 to 10, each within 0.1 seconds. Evidence: tests/tools/video/trim.vitest.ts:645. | Met | - |
| AC-004 | REQ-003 | Given the ported suite, When `npx vitest run tests/tools/video tests/tools/audio` runs, Then all 20 ported cases pass | vitest summary listing the case names. Observed 2026-09-29: the run reported 20 files and 310 tests passed, exit 0, and its verbose listing carries all 20 source names, from `test_extract_audio` to `test_trim_video_with_duration_check`, each checked against `def` lines in the source file. Evidence: tests/tools/audio/extract.vitest.ts:290. | Met | - |
| AC-005 | REQ-004 | Given `video_convert` to AVI, When the copy attempt fails, Then the partial file is removed, the encode runs and the result reports the encode path | `tests/tools/video/convert.vitest.ts` and `tests/tools/video/copy-then-encode.vitest.ts`. Observed 2026-09-29: a VP9 and Opus WebM converted to AVI over the built server: AVI refused the copied Opus track, which leaves a 4500-byte partial when ffmpeg runs alone, and the call returned one mpeg4 and mp3 file with the warning `The streams could not be copied into the avi container, so they were re-encoded as mpeg4 and libmp3lame.` The folder holds only that file. An H.264 and AAC MP4 copies into AVI without a fallback. Evidence: tests/tools/video/convert.vitest.ts:441. | Met | - |
| AC-006 | REQ-005 | Given `speedFactor: 4.0`, When `video_set_speed` builds its filter, Then it chains two `atempo=2.0` stages and the output lasts a quarter of the input within 0.2 seconds | `tests/tools/video/set-speed.vitest.ts`. Observed 2026-09-29: `atempoChain(4)` returns `atempo=2.0,atempo=2.0`, and a literal 4.0 call on a 4-second clip over the built server read back 1.08 seconds. Evidence: tests/tools/video/set-speed.vitest.ts:330. | Met | - |
| AC-007 | REQ-006 | Given `targetAspectRatio: '4-3'`, When `video_set_aspect_ratio` runs, Then it returns `INVALID_INPUT` | `tests/tools/video/set-aspect-ratio.vitest.ts`. The field is `aspectRatio`, and contract 3.2.6 and the section 5 protocol table make a malformed value a schema failure, so this row cannot pass as written. AC-010 replaces it. | Superseded | ADR-002 |
| AC-008 | REQ-007 | Given a capability set without `libx265`, When `video_set_codec` asks for it, Then it returns `CAPABILITY_MISSING` before spawning | `tests/tools/video/set-codec.vitest.ts`. Observed 2026-09-29: with a capability set of `libx264` and `aac`, a `libx265` call returned `CAPABILITY_MISSING` naming `libx265`, ran ffmpeg zero times and left no folder, and removing the upfront gate fails the test. Evidence: tests/tools/video/set-codec.vitest.ts:482. | Met | - |
| AC-009 | REQ-008 | Given the bundled binary, When `media_health` runs, Then its encoder list names the six encoders these tools use, present or absent | `tests/tools/media/health.vitest.ts`. Observed 2026-09-29: a literal `media_health` over the built server listed `libx264`, `libx265`, `libvpx-vp9`, `aac`, `libmp3lame`, `libopus`, `libvorbis`, `flac`, `pcm_s16le` and `mpeg4`, all present, and the test asserts the six names. Evidence: tests/tools/media/health.vitest.ts:261. | Met | - |
| AC-010 | REQ-006 | Given `aspectRatio: '4-3'`, When `video_set_aspect_ratio` is called, Then the call fails the schema with protocol error `-32602` and no folder is created | `tests/tools/video/set-aspect-ratio.vitest.ts`. Observed 2026-09-29: a literal call over the built server returned `-32602` naming `aspectRatio` and created no folder, and the schema table runs the same value with `16/9`, `0:9` and `1000:1`. Evidence: tests/tools/video/set-aspect-ratio.vitest.ts:255. | Met | - |

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

AC-001 to AC-006, AC-008, AC-009 and AC-010 are Met on evidence observed on 2026-09-29 from the final state: literal runs over the built server, the 20 video and audio test files at 310 passed, and the full suite at 1017 passed and 4 skipped. AC-007 is Superseded by AC-010 through ADR-002 in `decision-record.md`.

Consciously left out, each named in the row or the note that carries it:

- **AC-007 as written.** It names a field that does not exist and an error code the contract gives to the schema, so it is superseded rather than bent to pass.
- **AC-005's premise.** An H.264 and AAC MP4 copies into AVI without failing on ffmpeg 6, so the row is met with a WebM input whose Opus track AVI refuses.
- **AC-002 and the argv.** The snapshot covers `video_trim`. The other 18 argv blocks are held to the contract by MiMo's review and by the probed output of each tool, not by snapshots.
- **Reviewer sign-off.** MiMo returned no findings. Its sign-off row in `tasks.md` stays open for it to give.
<!-- /ANCHOR:closure -->

