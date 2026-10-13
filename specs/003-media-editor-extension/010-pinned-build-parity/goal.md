---
title: "Goal: Phase 10: pinned-build-parity"
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
    packet_pointer: "003-media-editor-extension/010-pinned-build-parity"
    last_updated_at: "2026-09-29T21:35:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed the phase with every criterion met"
    next_safe_action: "Operator: commit the Media Editor server"
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
# Goal: Phase 10: pinned-build-parity

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Make the package gate prove the server on the ffmpeg build each bundle ships, and make an MP4 copy give the same file on every platform.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | An MP4, M4A or M4V output that holds a PCM audio or FFV1 video stream counts as a refused copy on every build, by the operator's decision of 2026-09-29 |
| D2 | The pinned run changes no shipped code: it aliases the two static packages in the test config only |
| D3 | The pinned run executes only binaries whose SHA-256 matches the pinned table the bundles use |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `npm test` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] `npm run test:pinned` exits 0 there on this Mac's pinned ffmpeg 9.0.2
- [x] `mcpb validate` exits 0 on all five rebuilt bundles with 39 tools, and `claude plugin validate` exits 0
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/010-pinned-build-parity --strict` prints `RESULT: PASSED`
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
| Phase opened | Done | 2026-09-29, on the operator's answers "Re-encode like others" and "Add phase 010" |
| Failure list on 9.0.2 | Done | 45 of 1,698: 28 drawtext, 17 MP4 copies |
| Refusal and pinned run | Done | `assertPortableMp4` in both runners, `npm run test:pinned`, 11 reverts each failing its tests |
| Both suites | Done | `npm test` exit 0 `1721 passed, 6 skipped (1727)`, `npm run test:pinned` exit 0 `1723 passed, 4 skipped (1727)`, `GATE: PASS` |
| Bundles and plugin | Done | Five bundles repacked, `mcpb validate` exit 0 with 39 tools each, `claude plugin validate` exit 0 |
| D6 review | Done | DeepSeek V4.1 Flash max through cli-pi on OpenCode Go, two findings answered below |
| Closure | Done | 13 of 13 criteria `Met`, `validate.sh --strict` `RESULT: PASSED` |

### Deviations and findings

| Item | Note |
|------|------|
| Review finding 1 (P1): an exported override could win over the pinned pair | Did not hold. The resolver reads overrides from the config (`ffmpeg-resolver.ts:321`), and every in-process test passes none (`tool-client.ts:129`, `media.ts:271`). The pinned suite with both variables naming missing files passed, and a rejected override stops resolution, so any test that read them would have failed |
| Review finding 2 (P2): the refusal reads the temp name, the kept name comes from the request | No instance: all 32 call sites in 27 tool files keep the extension they wrote, and ffmpeg picks the container from the temp name, which is what the refusal must read |
| Found while checking the review: the script crashed outside the package root | Fixed. The guard read `package.json` unguarded, so a folder without one threw `ENOENT`. Three tests cover a missing, a foreign and a malformed `package.json` |
| Found while testing the rollback: two test files had no pre-edit copy | Fixed. Both copies rebuilt from the final files, and the rollback in a throwaway copy gave tsc 0 and the 1,698 tests from before this phase |
| Known limitation | The stdio smoke test starts the built server, which the swap never reaches, so it runs the development ffmpeg in both suites |
| Sibling defect found on 2026-09-30 | The package-root fix above reached only `test-pinned.ts`. `build-bundle.ts` and `build-plugin.ts` still crashed with a raw `ENOENT` outside the package root. Phase 11 fixed all three with one shared guard, and a copy of `package.json` without the source no longer passes it |
<!-- /ANCHOR:log -->
