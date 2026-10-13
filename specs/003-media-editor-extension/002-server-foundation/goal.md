---
title: "Goal: Phase 2: server foundation"
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
    packet_pointer: "003-media-editor-extension/002-server-foundation"
    last_updated_at: "2026-09-29T02:10:00Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Met the completion criteria"
    next_safe_action: "Start 003-image-tools"
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
# Goal: Phase 2: server foundation

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Build the Media Editor MCP package and the tested core every tool depends on, proved end to end by a `media_health` tool that answers over stdio.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | No module other than `src/core/process-runner.ts` spawns a process |
| D2 | Only the five small clips are copied into `tests/fixtures/`, and larger media is generated at test time |
| D3 | `media_setup_ffmpeg` is not built here, the resolver only names it |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `npx tsc --noEmit` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] `npx vitest run` exits 0 in `AI Systems/Media Editor/mcp server/`
- [x] The path-guard test holds at least 10 adversarial rows, all passing
- [x] The stdio smoke test gets ffmpeg and ffprobe versions back from `media_health`
- [x] `find tests -size +100k` in the package prints nothing
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/002-server-foundation --strict` prints `RESULT: PASSED`
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
| T006-T009,T011 modules | verified | gate PASS after each; T011 ffprobe whitelist and detected-value fixes applied directly, contract 8.3 and 5 amended |
| T010 T012 T013 | verified | gate PASS, resolver 40 tests, capabilities 15 tests, result builders 13 tests, contract 5 and 7 read against result.ts |
| T014 T015a | verified | gate PASS, test helpers 20 tests, tool-context 12 tests, retry and cleanup logic read line by line |
| T015b T016 | verified | gate PASS, registry 12 tests with own tools/call handler, media_health 5 tests, stale empty ALL_TOOLS test fixed by me, contract section 5 amended |
| T017 | verified | gate PASS, logger 16-pair table, stdio test 3 cases, live stdio smoke: 5 replies on stdout, stderr start line only, -32601 for unknown tool, exit 0 on stdin end |
| T018 full gate | verified | tsc exit 0, vitest 261 passed and 4 skipped, hostile-env run 261 and 4, fresh npm ci copy 261 and 4, stand-in alignment gate PASS on 38 files |
| T019 live media_health | verified | stdio reply captured in implementation-summary.md, ffmpeg bundled 6.0, ffprobe system-path 9.0.2, 28 capabilities |
| T020 MiMo review | verified | findings F1 to F6 resolved and recorded in implementation-summary.md |
| Acceptance criteria | verified | AC-001 to AC-010 Met, closeable in acceptance-criteria.md |
| Phase 2 close-out | done | strict validation RESULT: PASSED with 0 errors and 0 warnings, package gate GATE: PASS on the final state |

### Deviations and findings

| Item | Note |
|------|------|
| Alignment script scope | `verify_alignment_drift.py` scans git-tracked files only and the package is untracked, so a run on the real path scans nothing and passes without checking anything. The script was run on a scratch copy that was `git init`-ed and `git add`-ed, with `--fail-on-warn`: 38 files scanned, 0 findings. The same gate also greps the sources for `: any`, untyped `catch`, `'use strict'`, `shell: true`, a missing MODULE header, lines over 100 columns, spec or task ids in comments and em dashes, and all are clean. Rerun the real script on the real path once the package is tracked. |
| Progress counts | The test counts in the progress rows are the figures at the time each task closed. The final figures, 261 passed and 4 skipped, are in `implementation-summary.md`. |
| Skipped tests | Four tests skip on this host: three Windows-only path-guard cases and one that needs a case-sensitive volume. The path-guard criterion is met by 40 passing tests, and the Windows cases are unverified. |
<!-- /ANCHOR:log -->
