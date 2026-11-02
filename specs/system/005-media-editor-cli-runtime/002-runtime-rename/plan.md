---
title: "Implementation Plan: Phase 2: runtime-rename"
description: "Moves mcp server/ to runtime/ with git mv in the nested repository, updates every live mention in both repositories and proves nothing else changed with the full tests, the packaging tests and a bundle build."
trigger_phrases:
  - "runtime rename plan"
  - "git mv mcp server"
  - "leftover mention check"
  - "mirror pair parity"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 2: runtime-rename

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript runtime, Markdown docs |
| **Framework** | Node with vitest |
| **Storage** | None |
| **Testing** | `npm run test:pinned`, `npx vitest run tests/packaging`, `npm run bundle -- --all`, `npm run plugin` |

### Overview
SWE 2 runs the move and the mechanical mention edits. One `git mv` in the nested repository moves the folder, and the parent repository sees the same rename. Mentions are found with `rg` and the Sync Loop's `reference_sites.py`, edited on both sides of each mirror pair, then the full gates rerun from `runtime/`.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phase 001 closed with the operator's answers recorded
- [ ] `git status` in both repositories shows no peer edit under `mcp server/`
- [ ] Baseline numbers in `../scratch/baseline.md`

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests, packaging tests and builds match the baseline
- [ ] Docs updated (spec/plan/tasks)
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Mechanical rename with no behavior change.

### Key Components
- **The move**: `git -C "AI Systems/Media Editor" mv "mcp server" runtime`
- **The mention sweep**: `rg -n "mcp server"` plus `reference_sites.py`, excluding dated records
- **The mirror pairs**: the skill's `references/setup.md` and `references/tools.md` and their Project knowledge twins

### Data Flow
Nothing flows differently. `scripts/package-root.ts` resolves the package by its `package.json` name, and every runtime path is relative, so the build and tests read the same files from the new folder.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `mcp server/` folder | Holds the runtime | Rename to `runtime/` | `git status` shows renames |
| Docs naming the folder | Tell readers where the runtime is | Update | `rg` and `reference_sites.py` |
| Mirror pairs Tools and Setup | Byte-identical skill and Project copies | Update both sides | Pair parity check |
| `runtime/src/` | Runtime code | Unchanged | `git diff --stat runtime/src` is empty |

Required inventories:
- Same-class producers: `rg -n "mcp server" --glob '!**/node_modules/**'` in both repositories, sorted into live and dated.
- Consumers of changed symbols: every script, gate or config that builds a path from the folder name.
- Matrix axes: repository (nested, parent) by file kind (doc, mirror, script, config).
- Algorithm invariant: after the move, no live text names `mcp server`, and every tracked file under the old path exists under the new one.
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
| Unit | The whole runtime suite | `npm run test:pinned` |
| Integration | Packaging and bundles | `npx vitest run tests/packaging`, `npm run bundle -- --all`, `npm run plugin` |
| Manual | Leftover mentions | `rg` and `reference_sites.py` |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phase 001 design | Internal | Pending | The rename waits for the approved design |
| `reference_sites.py` | Internal | Green | The sweep falls back to `rg` alone and says so |
| SWE 2 through cli-devin | External | Canary pending | The sub-orchestrator does the edits and reports the swap |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A test, packaging or build failure that the rename caused
- **Procedure**: `git mv runtime "mcp server"` in the nested repository and revert the mention edits file by file
<!-- /ANCHOR:rollback -->

---


---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (status check) ──► Move ──► Mention sweep ──► Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Phase 001 | Move |
| Move | Setup | Mention sweep |
| Mention sweep | Move | Verify |
| Verify | Mention sweep | Phase 003 |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 15 minutes |
| Core Implementation | Low | 1 hour |
| Verification | Med | 1 hour |
| **Total** | | **2 to 2.5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Both repositories' `git status` captured before the move
- [ ] No commit made, since commits wait for phase 006
- [ ] Baseline test numbers recorded

### Rollback Procedure
1. `git mv runtime "mcp server"` in the nested repository
2. Revert each mention edit by hand from the diff
3. Rerun `npm run test:pinned` and confirm the baseline counts
4. Report the cause to the master orchestrator

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
