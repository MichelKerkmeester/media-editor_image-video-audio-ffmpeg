---
title: "Goal: Phase 11: code-documentation"
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
    packet_pointer: "003-media-editor-extension/011-code-documentation"
    last_updated_at: "2026-09-30T06:20:00Z"
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
# Goal: Phase 11: code-documentation

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Give every code folder of the Media Editor MCP server a README and the package root an architecture doc, with no claim the code contradicts.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | "mcp servers" in the request means the live package `AI Systems/Media Editor/mcp server/`, since the old `mcp servers/` folder is being deleted |
| D2 | A code folder is any folder under `src/`, `scripts/` or `tests/`. `assets/`, `licenses/` and gitignored build output are not |
| D3 | Each README follows the sk-doc code-folder shape, and the architecture doc keeps the name the operator gave it: `ARCHITECTURE.md` |
| D4 | A defect the docs expose is fixed with its whole class and a test, not written around |

<!-- /ANCHOR:directive -->

---


<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] 23 of 23 folders under `src/`, `scripts/` and `tests/` hold a `README.md`, and `ARCHITECTURE.md` sits at the package root
- [x] `validate_document.py` prints VALID for all 25 docs
- [x] The package gate prints `GATE: PASS`
- [x] Every D6 review finding is fixed or answered with evidence
- [x] `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/011-code-documentation --strict` prints `RESULT: PASSED`
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
| Phase opened | Done | 2026-09-30, on the operator's request for code-folder READMEs and an architecture doc |
| Docs | Done | `ARCHITECTURE.md`, a root `README.md`, 22 new folder READMEs and the refreshed fixture README |
| Claims against disk | Done | Every quoted test-file count matches: 83 in all. The source count and the log-level default were wrong in a draft and are fixed |
| Package-root guard | Done | `scripts/package-root.ts` in all three scripts. Each script run from an empty folder and from the staged plugin server returns 1 with its own message |
| Code review | Done | DeepSeek V4.1 Flash max on OpenCode Go, one P2 finding, fixed below |
| Doc reviews | Done | Three batches and a follow-up on the same route, no findings |
| Final gate | Done | `GATE: PASS`, both suites exit 0 with `1735` tests in 83 files, 25 docs clean in the validator and the HVR scan |

### Deviations and findings

| Item | Note |
|------|------|
| Found while documenting the scripts: two build scripts crashed outside the package root | Fixed. Phase 10 guarded only `test-pinned.ts`. `build-bundle.ts` and `build-plugin.ts` read `package.json` unguarded and threw a raw `ENOENT`. All three now share one guard |
| Code review finding 1 (P2): a copy of this `package.json` passes the guard | Fixed. `claude-plugin/server/` holds such a copy, so `test-pinned` started there would have written its downloads into the plugin folder. The guard now also wants `src/index.ts`, which no staged copy carries, and a new row fails when that check is reverted |
| `ARCHITECTURE.md` failed the sk-doc kebab-case name check | Fixed on the operator's go-ahead of 2026-09-30. `ARCHITECTURE.md` joins `TOOL_MANDATED_NAMES` in `check_no_new_snake_case.py`, in the shared `.skilled` tree, with a test row. That change is live there and uncommitted |
| User guide, asked for on 2026-09-30 | Added. `USER-GUIDE.md` sits beside `INSTALL-GUIDE.md` and shares its upper-case name, which the kebab check fails in both. The Desktop steps come from the Claude help center. Whether an extension's tools reach a Project chat is not stated there, so the guide's own check runs inside a Project chat |
| Commit | Done on 2026-09-30: `1459ff66`, `43b8899a` and `6281eb51`, the last deleting `mcp servers/` as the operator asked |
| Claims the reviews left unchecked | Checked by hand. Three were imprecise and are fixed: `-nostdin` and `-n` go to ffmpeg only, `media_setup_ffmpeg` gates the download on `consent: true` rather than on the call count, and it installs only the missing binaries |
| Oxford commas in 11 doc lines | Fixed. The HVR scan flagged 74 candidates, and 11 lines held a list comma. The README log-level row, reworded at the same time, also named the wrong default: `error` where `config.ts:305` returns `info` |
<!-- /ANCHOR:log -->
