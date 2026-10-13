---
title: "Goal: Phase 6: probe, repair and HLS"
description: "The durable directive this packet executes against and the criteria that decide when it is done."
trigger_phrases:
  - "packet goal"
  - "durable directive"
  - "completion criteria"
  - "goal binding"
importance_tier: "important"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/006-probe-repair-hls"
    last_updated_at: "2026-09-29T15:25:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed phase 6 with every criterion evidenced"
    next_safe_action: "Start 007-desktop-extension"
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
<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
# Goal: Phase 6: probe, repair and HLS

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Add `media_probe`, `media_repair` and `video_hls_ladder` to the Media Editor MCP server so Claude can inspect any media file, repair a broken one with a stated strategy and build an HLS ladder.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | `media_repair` always diagnoses before it writes, and never modifies the input |
| D2 | A repair strategy ships only with a broken-file test that proves it |
| D3 | The ladder never upscales a rung |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `npx vitest run tests/tools/media` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] Each repair pass (the copy, the video re-encode, the audio re-encode) and both branches of `auto` have a passing broken-file case
- [x] The ladder test finds `master.m3u8` and 3 variant playlists for a 1280 by 720 source
- [x] The registry test asserts 38 registered tools and passes
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/006-probe-repair-hls --strict` prints `RESULT: PASSED`
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:log -->
## 4. LOG

Everything below is VOLATILE. It is not part of the directive, it is not copied
into the objective, and it is expected to grow. Progress, evidence, deviations
and findings belong here.

### Progress

| Item | State | Evidence |
|------|-------|----------|
| Phase opened | Done | Contract 3.4 read and amended, spec aligned through ADR-002, Definition of Ready ticked, 2026-09-29 |
| Probe, repair and ladder built | Done | T002 to T008 and T013: 91 tests in `tests/tools/media` exit 0 (6 files, 3.97 s), plus the generator, folder-helper and runner tests; each tool's key lines broken on purpose and caught |
| Repair passes proved | Done | The copy on an unindexed Matroska, the video re-encode on a cut MP4, the audio re-encode on cut audio and on a song with album art, `auto` copying (unindexed) and re-encoding (mislabeled Matroska, cut MP4), each with 0 decode errors on the output |
| Ladder on 1280 by 720 | Done | `master.m3u8` lists 720p, 480p and 360p, 1080p dropped with one warning; ffprobe opened the master and each variant playlist live (T010) |
| Registry at 38 | Done | `tests/server/registry.vitest.ts` pins 38 names; live `tools/list` returned 38 |
| MiMo review | Done | 5 P2 findings: 2 fixed, 1 rejected with its reason, 2 settled by the operator (T011) |
| Final gate | Done | `GATE: PASS`, 1494 passed, 4 skipped, 146 files |

### Deviations and findings

| Item | Note |
|------|------|
| Repair criterion recounted | The criterion named four strategies; the approved contract fixes two passes and `auto` (ADR-002), so it counts those |
| Contract 3.4 amended | The ladder drops rungs taller than the source's shorter side, and profile and level carry a stream index (checked on ffmpeg 6.0) |
| Operator-approved amendments | On 2026-09-29 the operator approved three amendments (ADR-003): album art is not video in the repair diagnosis, whose audio re-encode gains `-vn`; `auto` decodes its copy once; the ladder's frame rate is the shared probe's |
| Found at close | Two spec edge cases had no test (both `auto` passes failing, a diagnosis timeout) and got one; `PipelineStep` had lost its TSDoc to an earlier insertion and got it back |
<!-- /ANCHOR:log -->
