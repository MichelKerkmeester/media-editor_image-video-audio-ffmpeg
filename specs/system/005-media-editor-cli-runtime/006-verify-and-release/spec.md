---
title: "Feature Specification: Phase 6: verify-and-release"
description: "Runs every Media Editor, Sync Loop, playbook, skill and spec gate against the finished work, smoke-tests the CLI on four PNGs, then asks the operator for the version and for each commit, push and release."
trigger_phrases:
  - "media editor verify and release"
  - "088 release gates"
  - "media editor cli smoke test"
  - "breaking release approval"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 6: verify-and-release

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Draft |
| **Created** | 2026-10-04 |
| **Branch** | `main` |
| **Parent Spec** | ../spec.md |
| **Phase** | 6 of 6 |
| **Predecessor** | 005-skill-cli-only |
| **Successor** | None |
| **Handoff Criteria** | Every gate green with the delta against the baseline reported, and the operator's yes recorded for the version, each commit, the push and the release |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 6** of the Media Editor runtime rename, CLI-only skill and naming hardening specification.

**Scope Boundary**: Verification, then the commits, push and release the operator approves. No new feature work.

**Dependencies**:
- Phases 001 to 005 closed
- The baseline in `../scratch/baseline.md`

**Deliverables**:
- A gate report with each command's output, exit status and delta against the baseline
- A live CLI smoke test on four PNGs from a scratch folder
- Commits in the nested Media Editor repository and the parent repository, the push and the release, each after the operator's yes

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Phases 002 to 005 touch two repositories, a runtime with 86 test files, mirror pairs the Sync Loop checks, five Python gates and a plugin. Each phase runs its own checks, but the Sync Loop gates read the live tree and only judge the whole change after the parent commit, and the skill dropping MCP is a breaking change that needs a version decision.

### Purpose
Every gate passes on the finished work with the delta against the baseline reported, and the release ships only after the operator approves the version, each commit, the push and the release.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Media Editor `npm run test:pinned`, `npx vitest run tests/packaging`, `npm run bundle -- --all` and `npm run plugin`
- Router fixtures and differential, `rule_parity`, parity, residency, `pair_divergence`, `record_claims` and `carrier_query_evidence`, in a sandbox clone first, then live after the parent commit
- The playbook validator, `ci-skill-root-metadata` and `validate_skill_package --strict`
- `validate.sh --strict` on 088 and every child
- A live CLI smoke test: four PNGs converted through `media-editor` from a scratch folder
- One AskUserQuestion for the version, then commits in both repositories, the push and the release, each with the operator's yes

### Out of Scope
- Fixing a gate failure by weakening the gate
- Any commit without a body and a `Spec:` trailer, or with attribution lines

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/006-verify-and-release/scratch/gates.md` | Create | Gate outputs and deltas |
| `AI Systems/Media Editor/sk-media-editor/changelog/` | Create | Release entry for the approved version |
| `AI Systems/Media Editor/runtime/package.json`, `runtime/manifest.json`, `runtime/claude-plugin/.claude-plugin/plugin.json` | Modify | Version, if the operator approves one |
| `AI Systems/Media Editor/sk-media-editor/feature-catalog/` | Create | Media Editor feature catalog, operator amendment |
| `AI Systems/z — Claude Project Sync Loop/feature-catalog/` | Modify | Sync Loop catalog audit fixes, operator amendment |
| `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/` | Modify | Catalog cross-references and any scenario fix the full run proves necessary |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | `npm run test:pinned`, the packaging tests, `npm run bundle -- --all` and `npm run plugin` pass, with counts reported against the baseline |
| REQ-002 | Every Sync Loop and router gate passes in a sandbox clone, then live after the parent commit |
| REQ-003 | The playbook validator, `ci-skill-root-metadata` and `validate_skill_package --strict` pass |
| REQ-004 | `validate.sh --strict` prints `RESULT: PASSED` on 088 and on all six children |
| REQ-005 | The operator approves the version, each commit, the push and the release before each happens |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | Four PNGs convert through `media-editor` from a scratch folder, and the JSON and files are recorded |
| REQ-007 | Each commit has a body and a `Spec:` trailer and no attribution lines, in the nested repository and the parent repository |

### P0 - Operator amendment, 2026-10-04

The operator asked that no test or manual playbook scenario fails and that the feature catalog is fully current, written to the sk-doc mode standards. Asked which catalog, the operator chose both.

| ID | Requirement |
|----|-------------|
| REQ-008 | Every scenario in `sk-media-editor/manual-testing-playbook/` runs one at a time on its own packaging through `run_packaging.sh` at Sonnet 5.5 medium effort, every multi-turn scenario to its last turn, and passes its own criteria. Each first-run and final verdict is reported, and each failure is classified and fixed at its cause |
| REQ-009 | A new Media Editor feature catalog, written to `sk-create-feature-catalog`, covers the 40 tools, the `media-editor` command, the Desktop extension, the Claude Code plugin and its shim, the route order, the naming and placement gate and the gates and graders. Every anchor resolves, the mode's validators pass and the playbook scenarios cross-reference its entries |
| REQ-010 | The Sync Loop feature catalog is audited against the current Sync Loop code and the same standard, with stale or missing entries and broken anchors fixed and its validators passing |
| REQ-011 | After REQ-008 to REQ-010, every gate and the three plain-project live skill runs rerun from the final state |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: A gate report where every row passed and every count is compared with `../scratch/baseline.md`
- **SC-002**: The release is published with the version the operator chose, and `HEAD` equals `origin/main` in both repositories
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | Push access to both remotes | No release | The account the operator names, then switch back |
| Risk | A Sync Loop gate reads a peer's stale tree | Med | Sandbox clone first, judge in a clean worktree |
| Risk | A push gate blocks a large rename | Med | Verify the paths, then ask the operator for the one-push override |
| Risk | Breaking change shipped under a minor version | High | One AskUserQuestion for the version before any commit |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Test run time reported against the baseline
- **NFR-P02**: Bundle sizes reported against the baseline

### Security
- **NFR-S01**: No secret or environment value in a commit, log or release note
- **NFR-S02**: No hook bypassed without the operator's yes for that push

### Reliability
- **NFR-R01**: Each gate's output and exit status read, not the exit status alone
- **NFR-R02**: A failed gate blocks the commit until it passes on a rerun of the whole gate
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: none
- Maximum length: the rename touches many files, so check the push gate's deletion count first
- Invalid format: a commit message the hook rejects is rewritten, never bypassed

### Error Scenarios
- External service failure: a push or release error is reported with the exact message
- Network timeout: retry the push once, then report
- Concurrent access: peer sessions with uncommitted work are left alone and only intended files are staged

### State Transitions
- Partial completion: a pushed nested repository with an unpushed parent is reported, never hidden
- Session expiry: gate outputs live in `scratch/gates.md`
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 12/25 | Gates across two repositories and one release |
| Risk | 18/25 | Breaking release and pushes to two remotes |
| Research | 2/20 | None |
| **Total** | **32/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- Which version does the operator choose for a skill that no longer uses MCP? Answered 2026-10-04: 1.1.0 for the runtime, extension, plugin and marketplace, Skill 1.1.0.0 and kernel v1.1.0
<!-- /ANCHOR:questions -->

---
