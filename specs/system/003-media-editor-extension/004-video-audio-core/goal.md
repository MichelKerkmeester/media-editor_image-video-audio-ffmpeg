---
title: "Goal: Phase 4: video and audio core"
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
    packet_pointer: "003-media-editor-extension/004-video-audio-core"
    last_updated_at: "2026-09-29T09:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed the phase against the completion criteria"
    next_safe_action: "Start 005-video-composition"
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
# Goal: Phase 4: video and audio core

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Add the 19 video and audio conversion tools to the Media Editor MCP server as real ffmpeg argument arrays that pass the source's own test cases.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | Tools write real ffmpeg flags, never ffmpeg-python aliases |
| D2 | Every stream-copy tool goes through one copy-then-encode helper |
| D3 | The source pytest cases are the oracle, extended with ffprobe checks on the changed property |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `npx vitest run tests/tools/video tests/tools/audio` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] The ported suite holds all 20 source cases by name
- [x] The registry test asserts 28 registered tools and passes
- [x] `grep -rnE "'(acodec|vcodec|audio_bitrate|video_bitrate)'" src` in the package prints nothing
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/004-video-audio-core --strict` prints `RESULT: PASSED`
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
| Phase opened | Pending | - |
| T001 encoder check | verified | bundled ffmpeg 6.0 on darwin-arm64 has all six encoders plus `libvorbis`, `flac`, `pcm_s16le`, `mpeg4` and the filters `scale`, `pad`, `crop`, `atempo`, `setpts` |
| T002 T003 T003b helpers | verified | gate PASS after each; media properties 23 tests, time parsing 39, containers 48, fields 79 |
| T004 attempt helper | verified | `runAttempts` with 16 tests, the fallback warning added by me with a mutation check |
| T005 to T023 nineteen tools | verified | gate PASS after each dispatch; 310 tests across the 20 video and audio files |
| T024 registry | verified | 28 names in contract row order at `tests/server/registry.vitest.ts:258`, and a live stdio `tools/list` returned 28 |
| T025 full gate | verified | build exit 0, tsc exit 0, vitest 50 files, 1017 passed and 4 skipped, hostile-env run identical, stand-in alignment gate PASS on 108 files with 0 findings |
| T026 alias and order checks | verified | both greps print nothing, and the `trimArgs` snapshot fails when `-i` moves first |
| T027 MiMo review | verified | no findings; four test files read in full, the rest by assertion pattern |
| Acceptance criteria | verified | AC-001 to AC-006, AC-008 to AC-010 Met, AC-007 Superseded by ADR-002, closeable in acceptance-criteria.md |
| Phase 4 close | done | validate.sh --strict RESULT: PASSED, vitest 1017 passed 4 skipped, gate PASS 108 files, tools/list 28 |

### Deviations and findings

| Item | Note |
|------|------|
| Contract amendments | Logged as the phase 4 row in `001-tool-contract/contract.md`: the trim time order is a handler check, aspect-ratio sizes floor to even, the four audio-track tools need an audio stream too, an unknown audio container carries `reason: "container"`, a fallback that made the file adds its 7.2 warning, and section 5 leaves malformed pattern values to the schema |
| AC-007 | Superseded by AC-010 through ADR-002 in `decision-record.md`: the row named a field that does not exist and an error code the contract gives to the schema |
| Extra modules | T003b added `src/core/media-containers.ts` and `src/server/media-fields.ts` with tests, so every tool takes its containers, aliases and value ranges from one place |
| Registry order | `ALL_TOOLS` follows the contract's row numbers (10 to 27, then 32), not the order the tasks landed in |
| Executors | T002, T003, T003b and T005 to T018 ran through Grok 4.7 on cursor-agent until its usage ran out during T019. T019 to T023 ran on DeepSeek V4.1 Flash (max) through Pi, one tool per dispatch. T004 ran on the one Opus agent, and T027 on MiMo. The fallback warning, the acceptance tests and the doc work were written by me. |
| Lockfile | `package-lock.json` was rewritten during the T006 run. `npm ls --depth=0` shows the same eight packages and versions as phase 3, so no dependency was added. The package is untracked, so the rewrite itself cannot be diffed |
| Review coverage | MiMo returned no findings and was not asked to review the close-out edits, so its sign-off stays open in `tasks.md` |
<!-- /ANCHOR:log -->
