---
title: "Goal: Phase 5: video composition"
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
    packet_pointer: "003-media-editor-extension/005-video-composition"
    last_updated_at: "2026-09-29T12:58:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed phase 5 against the completion criteria"
    next_safe_action: "Start 006-probe-repair-hls"
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
# Goal: Phase 5: video composition

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Add the seven video composition tools to the Media Editor MCP server with filter graphs no caller text can break, a plain refusal when the build lacks a filter, and the source's tests plus the audio cases it missed.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | Every caller value in a filter graph passes through `src/core/filter-escape.ts` |
| D2 | Text overlays always pass `fontfile=`, with a bundled font by default |
| D3 | A tool refuses a parameter it cannot honour rather than ignoring it |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `npx vitest run tests/tools/composition` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] The escaping test holds at least 12 rows, all passing
- [x] The xfade test with audio-bearing clips passes
- [x] The registry test asserts 35 registered tools and passes
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/005-video-composition --strict` prints `RESULT: PASSED`
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
| Phase opened | Done | Definition of Ready ticked in `plan.md`, 2026-09-29 |
| Helpers and test media (T001 to T004) | Done | Filter list recorded, escaping helper with 20 rows, a 27-string round trip and a 200-string fuzz, bundled font, composition test media |
| Seven tools (T005 to T013) | Done | One DeepSeek dispatch per tool, each read, mutation-checked and gated by the orchestrator |
| Registry at 35 (T014) | Done | `tests/server/registry.vitest.ts:258` pins the 35 names in contract row order |
| Composition suite | Done | 9 files, 196 tests, exit 0 |
| xfade with sound | Done | `tests/tools/composition/concat-xfade.vitest.ts:313`, one video and one audio stream |
| Full gate (T015) | Done | 64 files, 1388 passed, 4 skipped; tsc 0; alignment 134 files, 0 findings; build 0; live `COUNT: 35` |
| Strict validate (T017) | Done | `RESULT: PASSED`, exit 0 |
| MiMo review (T016) | Done | Two P2 findings, both confirmed and fixed with a failing-when-reverted test each |

### Deviations and findings

| Item | Note |
|------|------|
| Contract 3.3.6 amended | Silence removal retimes with `N/FRAME_RATE/TB` and `N/SR/TB`, because `PTS-STARTPTS` kept interior gaps |
| Contract 3.3.7, 8.1 and 8.2 amended | B-roll shifts each clip with `setpts` and floors its grid scale to even |
| Contract 8.2 amended | The image overlay gates `scale` only when a size is given, per rule 1 |
| AC-008 superseded | ADR-002: the removed b-roll keys fail a strict schema as `-32602`, stated by AC-010 |
| Copy-route test gap | Skipping the 8.6 copy passed every dispatched test; argv-recording tests now catch it |
| Review fixes | The xfade offset now comes from the normalized first clip, and a subtitle is sniffed before it is copied |
| Brief error | The T009 brief named the wrong blend sample time; the worker used the right one |
| Test title id | One test title carried a criterion id; it was renamed, and the no-ids rule now covers test titles |
| ffprobe on darwin-arm64 | `ffprobe-static` ships an x86_64 binary there; recorded in `007-desktop-extension/goal.md` |
<!-- /ANCHOR:log -->
