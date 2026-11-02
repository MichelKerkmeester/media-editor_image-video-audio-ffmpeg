---
title: "Goal: Phase 6: verify-and-release"
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
    packet_pointer: "005-media-editor-cli-runtime/006-verify-and-release"
    last_updated_at: "2026-10-04T12:00:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Authored the durable directive"
    next_safe_action: "Execute against the completion criteria"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
# Goal: Phase 6: verify-and-release

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->
<!-- GOAL_AUTHORING: .skilled/skills/sk-doc/sk-create-goal/SKILL.md -->

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Prove the finished Media Editor change against every gate with the baseline delta reported, then ship it through commits, a push and a release that the operator approves one by one.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | Every gate runs in a sandbox clone before the first commit, and the Sync Loop gates run live again after the parent commit |
| D2 | One AskUserQuestion settles the version before any commit, because the skill dropping MCP is a breaking change |
| D3 | A gate failure is fixed in its owning phase's files and the whole gate set reruns, and no gate is weakened |

<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [ ] `npm run test:pinned`, `npx vitest run tests/packaging`, `npm run bundle -- --all` and `npm run plugin` pass in `runtime/`, with counts compared with the baseline in `scratch/gates.md`
- [ ] The router, parity, residency, `pair_divergence`, `record_claims` and `carrier_query_evidence` gates pass in a sandbox clone and again live after the parent commit
- [ ] The playbook validator, `ci-skill-root-metadata` and `validate_skill_package --strict` pass on `sk-media-editor`
- [ ] Four PNGs converted through `media-editor` from a scratch folder give four WebP files whose paths the JSON names
- [ ] `HEAD` equals `origin/main` in the Media Editor repository and the parent repository, and every release commit has a body, a `Spec:` trailer and no attribution line
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
| Phase opened | Done | Coordinator start, commits and release held for the operator |
| Gate run | Done | Every gate exit 0 from the final state, table in `scratch/gates.md` |
| Live skill reply, plain project | FAIL | Sonnet 5.5 never loaded the skill and wrote four WebP files beside the PNGs in Turn 1 without a question (`scratch/graded-replies/live-plain-turn1.md`) |
| Live skill reply, SED-004 as written | PASS | With `AGENTS.md` and `$image`, one question with four names and the folder choice, then one folder with four files under 100 KB |
| Project reply | Waiting | Operator script in `scratch/operator-ped-001.md` |
| Version, commits, push, release | Waiting | Each needs the operator's yes |

### Deviations and findings

| Item | Note |
|------|------|
| Skill trigger | In a plain project the plugin skill was listed but not invoked, so the original bug returns for plugin users without `AGENTS.md`. Proposed fix in implementation-summary.md, not applied |
| Root `ARCHITECTURE.md:62` | Still names a retired `mcp servers/` folder that no longer exists, left for the operator |
<!-- /ANCHOR:log -->
