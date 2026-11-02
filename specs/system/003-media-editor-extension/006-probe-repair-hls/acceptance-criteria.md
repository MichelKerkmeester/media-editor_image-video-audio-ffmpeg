---
title: "Acceptance Criteria: Phase 6: probe, repair and HLS"
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
    packet_pointer: "003-media-editor-extension/006-probe-repair-hls"
    last_updated_at: "2026-09-29T15:10:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed every criterion with evidence"
    next_safe_action: "None for this packet; phase 7 is next"
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
# Acceptance Criteria: Phase 6: probe, repair and HLS

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/006-probe-repair-hls
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
| AC-001 | REQ-001 | Given the built server, When `tools/list` runs, Then it returns 38 names, including the 3 from this phase | `tests/server/registry.vitest.ts:308` pins 38 names ending `media_probe`, `media_repair`, `video_hls_ladder`; live stdio against `dist/index.js` on 2026-09-29 printed `COUNT: 38` | Met | - |
| AC-002 | REQ-002 | Given a generated video with audio and a sharp PNG, When `media_probe` runs on each, Then each result carries the fields REQ-002 lists | Superseded by AC-009: contract 3.4 reads images with ffprobe, not sharp | Superseded | ADR-002 |
| AC-003 | REQ-003 | Given a truncated MP4, When `media_repair` runs in `diagnose` mode, Then it reports the problems and the output folder is unchanged | Superseded by AC-010: contract 3.4 has no `diagnose` mode, and `media_probe` is the read-only inspection | Superseded | ADR-002 |
| AC-004 | REQ-004 | Given each generated broken file, When `media_repair` runs its matching strategy, Then the output probes clean and `ffmpeg -v error -i OUT -f null -` prints nothing | `repair-strategies.vitest.ts:245` (cut MP4 re-encoded, 0 decode errors), `:274` (cut audio, 0), `:349` (`auto` on a cut MP4, 0), `repair-diagnose.vitest.ts:247` (unindexed Matroska copied, duration within 0.3 s of 4 s, 0), and `repair-strategies.vitest.ts:329` (mislabeled Matroska re-encoded, 0) | Met | - |
| AC-005 | REQ-005 | Given a 10-second 1280 by 720 clip, When `video_hls_ladder` runs with defaults, Then the folder holds `master.m3u8` listing 720p, 480p and 360p, and each playlist has segments | `hls-rungs.vitest.ts:433`: defaults on a 10-second 1280x720 clip write `master.m3u8` listing 720p, 480p and 360p, each rung folder with its playlist and segments, and no `1080p` folder | Met | - |
| AC-006 | REQ-006 | Given a 640 by 360 source, When the ladder runs, Then only the 360p rung is written and the result names the dropped rungs | `hls-rungs.vitest.ts:489`: a 640x360 clip with defaults writes only 360p, with `droppedRungs` `['1080p', '720p', '480p']` and one warning | Met | - |
| AC-007 | REQ-007 | Given `segmentSeconds: 30`, When the ladder is called, Then it returns `INVALID_INPUT` | Superseded by AC-011: the contract bounds `segmentDuration` in the schema, so the refusal is `-32602` | Superseded | ADR-002 |
| AC-008 | REQ-008 | Given an MP4 with its index at the end, When `media_repair` runs in `auto` mode, Then it picks `faststart` and says why | Superseded by AC-012: the contract's passes are a copy and a re-encode | Superseded | ADR-002 |
| AC-009 | REQ-002 | Given a generated video with sound and a PNG, When `media_probe` runs on each, Then each result carries the `format`, `summary` and `streams` blocks of contract 3.4, the PNG arrives as a single-frame video stream with its pixel format, no field the file lacks is present, and no folder is created | `probe.vitest.ts:210` (video with sound: `format`, `summary` and both `streams`), `:296` (PNG as one video stream with its pixel format), absent keys omitted at `:260`, `:276` and `:322`, output folder unchanged at `:356` | Met | - |
| AC-010 | REQ-003 | Given an MP4 cut before its index, When `media_probe` runs, Then it returns `PROCESS_FAILED` naming `media_repair`; When `media_repair` runs, Then it returns `UNSUPPORTED_FORMAT` with `accepted: ["video", "audio"]`; and neither call creates a folder | `probe.vitest.ts:374` (`PROCESS_FAILED` naming `media_repair`, no folder) and `repair-diagnose.vitest.ts:297` (`UNSUPPORTED_FORMAT`, `accepted` `['video', 'audio']`, no folder) on the same indexless MP4 | Met | - |
| AC-011 | REQ-007 | Given `segmentDuration: 30` or `crf: 60`, When the ladder is called, Then the call fails its schema with `-32602` and creates no folder; Given `rungs: ['720p', '720p']`, Then it returns `INVALID_INPUT` | `hls-ladder.vitest.ts:659` (`segmentDuration: 30`, `crf: 60`, empty, unknown and five rungs each `-32602` with no folder) and `:642` (`duplicate-rung`) | Met | - |
| AC-012 | REQ-008 | Given an unindexed Matroska recording, When `media_repair` runs with `auto`, Then the copy pass makes the file and the result names pass `remux`; Given a Matroska file with PCM audio named `.mp4`, Then the copy fails, the re-encode makes `<stem>-repaired.mp4`, and the result names pass `reencode` with one warning | `repair-strategies.vitest.ts:309` (unindexed recording, pass `remux`, no warning) and `:329` (mislabeled Matroska, `mislabeled-repaired.mp4`, pass `reencode`, one warning, audio `aac`) | Met | - |
| AC-013 | REQ-004 | Given an MP3 with album art, When `media_repair` runs `reencode`, Then the output is `<stem>-repaired.m4a` with one AAC stream, the diagnosis marks the picture `attachedPicture: true`, and one warning says the art was left out | `repair-strategies.vitest.ts:365` and the parse case at `repair-diagnose.vitest.ts:212`; `auto` copies the same file to `.mp3` at `repair-strategies.vitest.ts:383`; behavior from ADR-003 | Met | - |
| AC-014 | REQ-008 | Given an MP4 cut short with its index at the front, When `media_repair` runs `auto`, Then the copy's decode check finds errors, the re-encode makes `<stem>-repaired.mp4` with 0 decode errors, and the result names pass `reencode` with one warning | `repair-strategies.vitest.ts:349`; behavior from ADR-003 | Met | - |

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

Ten criteria are met: AC-001, AC-004 to AC-006 and AC-009 to AC-014. AC-002, AC-003, AC-007 and AC-008 are superseded through ADR-002, because the operator-approved contract fixes the three tools differently from the draft requirements, and AC-009 to AC-012 test the contract's version of each. The three behavior amendments the operator approved after the review are recorded in ADR-003.
<!-- /ANCHOR:closure -->
