---
title: "Goal: Phase 3: image tools"
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
    packet_pointer: "003-media-editor-extension/003-image-tools"
    last_updated_at: "2026-09-29T06:20:00Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Closed the phase against the completion criteria"
    next_safe_action: "Start 004-video-audio-core"
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
# Goal: Phase 3: image tools

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Add the eight image tools to the Media Editor MCP server on sharp, each validated, bound by the path policy and proved by its own vitest file.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | Every image tool uses sharp, none calls ffmpeg |
| D2 | Test images are generated with sharp at test time, never downloaded |
| D3 | `image_probe` stays a separate tool in this phase |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `npx vitest run tests/tools/image` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] `tests/tools/image/` holds 8 tool test files plus the helper test
- [x] The registry test asserts 9 registered tools and passes
- [x] `grep -rn process-runner src/tools/image` in the package prints nothing
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/003-image-tools --strict` prints `RESULT: PASSED`
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
| T001 T002 helper | verified | gate PASS, `sharp-output.ts` with 21 tests, folder removal proven on a throwing plan, a duplicate name and a truncated body |
| T003 to T010 eight tools | verified | gate PASS after each; resize 23 tests, convert 30, crop 21, compress 18, rotate 25, flip 16, probe 17, batch resize 27 |
| T011 registry | verified | `tests/server/registry.vitest.ts:258` lists 9 names and the read-only pair, stale expectation fixed by me |
| T012 full gate | verified | tsc exit 0, build exit 0, vitest 26 files, 518 passed and 4 skipped, hostile-env run identical, stand-in alignment gate PASS on 60 files with 0 findings |
| T013 MiMo review | verified | three findings (`outputName` separators, batch resize height coverage, jpg alias in descriptions) fixed. F1 and F3 are proven by tests that fail without the fix (the description test was added at close-out), and F2 was a coverage gap closed by adding tests |
| Edge cases | verified | a file removed after the guard gives `INPUT_NOT_FOUND`, and a refused disk write removes the folder and returns `INTERNAL`, both proven by mutation checks |
| Acceptance criteria | verified | AC-001 to AC-009 Met, closeable in acceptance-criteria.md |

### Deviations and findings

| Item | Note |
|------|------|
| Contract amendments | Two, both logged in `001-tool-contract/contract.md`. The neither-dimension check of `image_resize` is a handler check (`dimension-required`), because the registry takes a field shape. `media_health` reports `imageEngine`, and `outputName` is one shared field that fails on `/` and `\` and on a length outside 1 to 64. |
| Test file count | The criterion names 8 tool files plus the helper. The folder holds 11: those nine, plus `output-name.vitest.ts` and `write-failure.vitest.ts`. The criterion holds, and the two extra files close the `outputName` breach and the disk-full edge. |
| Spec text against the contract | `spec.md` used `IMAGE_PROCESSING_FAILED`, which is not a contract code. An undecodable image is `UNSUPPORTED_FORMAT`, and an unmapped write failure is `INTERNAL`. It also named `tool-registry.ts`, and the registry list lives in `all-tools.ts`. Both are corrected in the phase documents. |
| Result fields beyond the contract | `image_compress` returns `bytesBefore` and `bytesAfter` as integers with no percentage, a `format` key on its `UNSUPPORTED_FORMAT` detail, and a warning when the output grows. `image_probe` returns `bitDepth` as an integer, names the format `avif`, and returns `density` only when the file carries it. Contract section 7 does not list these. |
| Executors | Tasks T002 to T010 ran through Grok 4.7 on cursor-agent. The DeepSeek fallback never triggered. T011 and the review fixes were written by me, and T013 ran on MiMo. |
| Review coverage | MiMo did not review its own fixes, so its sign-off stays open in `tasks.md`. |
| Progress counts | The test counts in the progress rows are the figures at the time each task closed. The final figures, 26 files, 518 passed and 4 skipped, are in `implementation-summary.md`. |
<!-- /ANCHOR:log -->
