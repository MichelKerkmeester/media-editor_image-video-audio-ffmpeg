---
title: "Implementation Plan: Phase 6: verify-and-release"
description: "Reruns every gate on the finished work in a sandbox clone, then live, records the deltas against the baseline, smoke-tests the CLI and walks the operator through the version, commits, push and release one approval at a time."
trigger_phrases:
  - "verify and release plan"
  - "sandbox clone gates"
  - "release approval sequence"
  - "baseline delta report"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 6: verify-and-release

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Node, Python, Bash gates |
| **Framework** | vitest, Sync Loop gates, spec-kit validator |
| **Storage** | `scratch/gates.md` |
| **Testing** | Every gate named in the spec |

### Overview
The sub-orchestrator runs every gate and the smoke test, and the master orchestrator reruns them before accepting. The operator answers one AskUserQuestion for the version and gives a yes before each commit, the push and the release.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phases 001 to 005 closed with strict validation passed
- [ ] Baseline in `../scratch/baseline.md`
- [ ] A sandbox clone of both repositories

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Every gate green with deltas reported
- [ ] Release published after the operator's yes
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Gate, approve, ship, gate again.

### Key Components
- **Sandbox run**: every gate against a clone of both repositories
- **Approval**: the version, then each commit, the push and the release
- **Live run**: the Sync Loop gates against the live tree after the parent commit

### Data Flow
Gate outputs go to `scratch/gates.md` with their exit status and the baseline delta. Commits stage explicit paths only.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| Runtime tests and builds | Prove the runtime | Rerun | Counts against the baseline |
| Sync Loop and router gates | Prove parity and routing | Rerun in a sandbox, then live | Output and exit status |
| Spec packet | Records the work | Validate | `RESULT: PASSED` on 088 and every child |

Required inventories:
- Same-class producers: every gate the spec names, one row each in `scratch/gates.md`.
- Consumers of changed symbols: not applicable, this phase changes no code.
- Matrix axes: gate by run (sandbox, live).
- Algorithm invariant: no commit before every sandbox gate passes and the operator says yes.
<!-- /ANCHOR:affected-surfaces -->


---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

Follow the ordered tasks in `tasks.md`. It owns the Setup, Implementation and Verification phase checkboxes and task state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | Runtime suite | `npm run test:pinned` |
| Integration | Packaging, builds, Sync Loop, router, playbook, skill package, spec packet | The named gates |
| Manual | Four PNGs through `media-editor` | Live CLI smoke test |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phases 001 to 005 | Internal | Pending | Nothing to verify |
| Operator approval | External | Pending | No commit, push or release |
| Remote push access | External | Pending | No release |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A live gate fails after the commit, or the release breaks an install
- **Procedure**: `git revert` the release commits in both repositories after the operator's yes, never a hard reset
<!-- /ANCHOR:rollback -->

---


---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Sandbox gates ──► Smoke test ──► Version question ──► Commits ──► Live gates ──► Push and release
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Sandbox gates | Phases 001 to 005 | Smoke test |
| Smoke test and version | Sandbox gates | Commits |
| Commits and live gates | Version | Push |
| Push and release | Live gates | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 30 minutes |
| Core Implementation | Med | 2 to 3 hours |
| Verification | Med | 1 to 2 hours |
| **Total** | | **3.5 to 5.5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Every sandbox gate green
- [ ] Version approved by the operator
- [ ] Staged paths listed and checked against the packet's scope

### Rollback Procedure
1. Stop before the push if a live gate fails
2. `git revert` the commits after the operator's yes
3. Rerun the whole gate set
4. Report the cause to the master orchestrator

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
