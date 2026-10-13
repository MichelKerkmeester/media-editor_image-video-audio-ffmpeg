---
title: "Acceptance Criteria: Phase 10: pinned-build-parity"
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
    packet_pointer: "003-media-editor-extension/010-pinned-build-parity"
    last_updated_at: "2026-09-29T20:55:15Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Authored the acceptance criteria for this packet"
    next_safe_action: "Meet, waive or supersede the open criteria"
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
# Acceptance Criteria: Phase 10: pinned-build-parity

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/010-pinned-build-parity
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
| AC-001 | REQ-001 | Given ffmpeg 9.0.2 and a clip with PCM audio, When a copy-first tool writes MP4, Then the result holds AAC and carries the fallback warning | The nine PCM tool tests in `npm run test:pinned`: trim, set-codec, set-bitrate, set-frame-rate, set-resolution, set-aspect-ratio, add-subtitles, add-text-overlay and add-image-overlay each assert AAC, H.264 and one warning, and all pass on 9.0.2 in the final pinned run, where each failed before | Met | - |
| AC-002 | REQ-001 | Given ffmpeg 9.0.2 and an FFV1 clip, When an audio tool writes MP4, Then the picture is re-encoded | The four FFV1 tool tests in `npm run test:pinned`: set-audio-codec, set-audio-bitrate, set-audio-channels and set-audio-sample-rate each assert an H.264 picture that differs from the FFV1 source, and all pass on 9.0.2 | Met | - |
| AC-003 | REQ-001 | Given the mislabelled Matroska file with PCM audio, When `media_repair` runs `remux`, Then it returns `PROCESS_FAILED`, and in `auto` it re-encodes or stops at a missing encoder | The three repair tests in `npm run test:pinned`: 'returns PROCESS_FAILED when the copy cannot enter the container', 'auto re-encodes when the stream copy cannot enter the container' and 'auto stops before the re-encode when libx264 is absent' pass on 9.0.2 | Met | - |
| AC-004 | REQ-001 | Given a stub probe that reports `pcm_s16le`, `ffv1`, `aac` or a MOV path, When `assertPortableMp4` runs, Then only the MP4 family with PCM or FFV1 is refused | Unit tests in `npm test`: the 'assertPortableMp4' block refuses `pcm_s16le` in `.mp4`, `ffv1` in `.m4v` and `pcm_f32le` in `.M4A`, keeps H.264 with AAC, and never probes `.mov`, `.mkv` or `.wav`, in both suites | Met | - |
| AC-005 | REQ-002 | Given this Mac, When `npm run test:pinned` runs, Then the resolved ffmpeg reports 9.0.2 and both digests match the pinned rows | Script output and a resolver test in the pinned run: the script prints `Pinned darwin-arm64 ffmpeg 9.0.2-https://www.martin-riedl.de`, and 'resolves the pinned ffmpeg the bundles ship' and its ffprobe twin pass with the folder and the pinned binary digest | Met | - |
| AC-006 | REQ-002 | Given a missing or wrong archive, When the pinned run starts, Then it stops before any test and names the problem | Unit test of the script's preparation step: a wrong binary digest stops with `CHECKSUM_MISMATCH` and places nothing, a 404 stops with `DOWNLOAD_FAILED` and creates no pinned folder, and a run from a folder that is not the package root returns 1 with its own message in three shapes | Met | - |
| AC-007 | REQ-003 | Given the final state, When both suites run, Then both exit 0 | `npm test` and `npm run test:pinned` outputs: `npm test` exit 0 with `1721 passed, 6 skipped (1727)`, `npm run test:pinned` exit 0 with `1723 passed, 4 skipped (1727)`, `GATE: PASS` | Met | - |
| AC-008 | REQ-004 | Given ffmpeg 6.0 and 9.0.2, When the drawtext round trip runs, Then every filter graph holds every value unchanged | `filter-escape.vitest.ts` in both suites: all 28 drawtext tests pass on 6.0 and 9.0.2, and with the graph check reverted 28 fail on 9.0.2 | Met | - |
| AC-009 | REQ-005 | Given the mislabelled fixture, When its test runs, Then it asserts Matroska content, PCM audio and an `.mp4` name | `broken-media.vitest.ts` in both suites: 'cannot become a portable MP4 by stream copy on any build' passes on 6.0, where ffmpeg refuses the copy, and on 9.0.2, where the copy keeps `pcm_s16le` | Met | - |
| AC-010 | REQ-006 | Given a stub probe reporting PCM in a pipeline product, When `runPipeline` keeps it, Then it returns `PROCESS_FAILED` and removes the folder, which is the path `media_remove_silence` takes for its no-silence copy | 'runPipeline MP4 refusal' in `npm test`: the test passes, and with the pipeline check reverted it fails | Met | - |
| AC-011 | REQ-007 | Given the contract, When its change log is read, Then a dated line records the amendments and the operator's approval | `contract.md` change log: a 2026-09-29 line records the amendments to 3.2, 3.3.6, 3.4 and section 5 and quotes the operator's "Re-encode like others" | Met | - |
| AC-012 | REQ-008 | Given the rebuilt bundles and plugin, When they are validated, Then `mcpb validate` exits 0 on five manifests with 39 tools and `claude plugin validate` exits 0 | Command outputs: `mcpb validate` exits 0 on the five bundle manifests and the root, each with 39 tools, the five carry the same 70 JavaScript files, and `claude plugin validate` exits 0 on the folder and on `plugin.json` | Met | - |
| AC-013 | REQ-009 | Given the change set, When a D6 reviewer reads it, Then every finding is fixed with a test or answered with a reason | Review report in the goal log: DeepSeek V4.1 Flash at max thinking raised two findings, both answered with evidence in the goal log, and the verification that followed found one more defect, fixed with a test | Met | - |

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

All 13 criteria are `Met` on the final state of 2026-09-29, with no waiver. Both suites exit 0, the rebuilt bundles and plugin validate, and the D6 review is answered.
<!-- /ANCHOR:closure -->
