---
title: "Goal: Phase 3: naming-and-placement-hardening"
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
    packet_pointer: "005-media-editor-cli-runtime/003-naming-and-placement-hardening"
    last_updated_at: "2026-10-04T12:00:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Built and proved the gate, targetFolder and maxBytes"
    next_safe_action: "Operator grades the two batch scenarios on real replies"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 85
    open_questions: []
    answered_questions: []
---
# Goal: Phase 3: naming-and-placement-hardening

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Make every Media Editor surface ask one question before the first write that settles the file names and, for a batch, one place for all of its files, and make the runtime able to put a batch written by separate calls into that one place.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | The gate holds even when the request is clear. Clarity never skips the one question before the first write |
| D2 | A batch is two or more inputs from one request, whatever the number of tool calls |
| D3 | The Interactive Intelligence skill reference and its Project mirror change together and stay byte-identical |
| D4 | Batch placement is a `targetFolder` field naming an existing `NNN - ` folder inside the export root, with no traversal, and a collision takes the next counted name without replacing a file. No multi-input `image_convert` |
| D5 | `maxBytes` on `image_convert` covers JPEG, WebP and AVIF, searches quality within bounds, fails with a structured error when unreachable and never resizes |
| D6 | No server guard against unconfirmed names |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] `claude project/Custom Instructions.md` asks one question before the first writing call with the proposed names and, for two or more inputs from one request, the choice of export root or one numbered folder, even for a clear request
- [x] `sk-media-editor/SKILL.md`, `AGENTS.md` and `references/interactive-intelligence.md` carry the same gate, and `cmp` finds no difference in the Interactive Intelligence pair
- [x] A vitest test writes one batch through separate tool calls into one chosen numbered folder via `targetFolder` and passes, and tests reject an outside, missing or traversing target
- [x] A vitest test per lossy format proves `maxBytes` meets the target or returns a structured failure without resizing
- [ ] A graded real Project reply and a graded real skill reply to four PNGs and a clear WebP prompt each ask one question with no write in Turn 1 and put all four files in one place with readable names in Turn 2
- [x] `npm run test:pinned` passes and the playbook validator passes with the two batch scenarios counted
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
| Phase opened | Done | 2026-10-04 |
| Gate wording on every surface | Done | Kernel v1.1.0, `SKILL.md`, `AGENTS.md`, Interactive Intelligence with a Batch question, `cmp` silent on four mirror pairs |
| `targetFolder` and `maxBytes` | Done | Unit and MCP tests, live stdio smoke on the four live-bug PNGs |
| Batch scenarios | Done | `PED-001`, `SED-004`, validator 32 scenarios, 19 categories, 0 violations |
| Graded real replies | Deferred | Deferred to 006, pending operator upload and live runs |

### Deviations and findings

| Item | Note |
|------|------|
| Error codes | No new codes. `INVALID_INPUT` and `PATH_NOT_ALLOWED` carry `details.reason` instead, a deviation from the spec file table |
| Scenario ids | `PED-001` and `SED-004`, because the grader id shape needs `P` for a Project scenario. Both declared unpaired, prompts differ on purpose |
| Same-class siblings | Every writing tool description, two more operation-reference pairs and the runtime READMEs took `targetFolder` in the same change |
| Review | DeepSeek code review: 7 findings, 3 rejected with evidence, 4 fixed by SWE 2 |
<!-- /ANCHOR:log -->
