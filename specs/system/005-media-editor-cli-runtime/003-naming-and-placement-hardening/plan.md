---
title: "Implementation Plan: Phase 3: naming-and-placement-hardening"
description: "Replaces the per-call, ambiguity-only naming wait with one hard question per request on every surface, makes runtime placement batch-aware, and proves the fix with graded Project and skill batch scenarios."
trigger_phrases:
  - "naming gate plan"
  - "batch-aware placement plan"
  - "kernel hard gate"
  - "batch playbook scenario"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 3: naming-and-placement-hardening

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript runtime, Markdown kernel and skill |
| **Framework** | MCP SDK, zod, vitest |
| **Storage** | Files under the configured export folder |
| **Testing** | vitest, the playbook validator, graded real replies |

### Overview
GPT-6 Luna writes the runtime change in `runtime/src/core/output-folder.ts` and the tool and field descriptions. DeepSeek drafts the kernel, skill, `AGENTS.md` and Interactive Intelligence wording, which the sub-orchestrator checks line by line. The fix replaces three conditions in the kernel: the wait that covers one name, the escalation that needs ambiguity and the per-call definition of several files.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phase 002 closed, paths under `runtime/`
- [x] The placement shape and the `maxBytes` and guard answers recorded in `../001-deep-research/implementation-summary.md`
- [ ] Kernel character count measured before the edit

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Tests and the playbook validator pass
- [ ] Both batch scenarios graded on a real reply
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One rule stated on every surface, with the runtime able to honor it across calls.

### Key Components
- **Kernel gate**: one question before the first writing call, names plus one place for a batch, even when the request is clear
- **Batch definition**: two or more inputs from one request, whatever the number of calls
- **Placement**: a `targetFolder` field that names an existing numbered folder under the export root, contained and collision-safe as `spec.md` states
- **Size target**: `maxBytes` on `image_convert` for lossy formats, a bounded quality search with a structured failure, never a resize
- **Descriptions**: `fileName`, `subfolder` and each writing tool say the name is one the user confirmed

### Data Flow
Turn 1: the model lists the inputs, proposes names and asks one question, writing nothing. Turn 2: the model writes every file under its confirmed name into the one place the user chose, then reports the paths.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `claude project/Custom Instructions.md:145,149,181,194` | Kernel naming, batch and escalation rules | Update | Read-back and the Project batch scenario |
| `sk-media-editor/SKILL.md`, `AGENTS.md` | Skill and CLI wrapper rules | Update | The skill batch scenario |
| Interactive Intelligence pair | One-question intake | Update both sides | `cmp` |
| `runtime/src/server/field-schemas.ts:62-80` | Field descriptions | Update | Description tests |
| `runtime/src/tools/image/convert.ts:136-141` and sibling writing tools | Tool descriptions | Update | Description tests |
| `runtime/src/core/output-folder.ts:301-341,378` | Folder allocation and the counted-name rule | Update | Placement, containment and collision tests |
| `runtime/src/server/tool-context.ts:83-86,290-295,312,405` | Placement fields and allocation | Update | Placement tests |
| `runtime/src/tools/image/convert.ts:142-166`, `sharp-output.ts` | `image_convert` schema and encode | Update | `maxBytes` tests per format |

Required inventories:
- Same-class producers: `rg -n "Omitted|fileName|subfolder" runtime/src` lists every description that presents an omitted name or folder as normal.
- Consumers of changed symbols: `rg -n "allocateOutputFolder|subfolderField|fileNameField" runtime/src runtime/tests`.
- Matrix axes: surface (Project, skill) by inputs (one, several) by request clarity (clear, ambiguous) by calls (one, several), 16 rows.
- Algorithm invariant: no writing call before the user answers, and every file from one request lands in one place.
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
| Unit | Placement across calls, folder targeting inside and outside the export folder, descriptions | vitest |
| Integration | The full runtime suite | `npm run test:pinned` |
| Manual | Project batch and skill batch, four PNGs and a clear prompt | Graded real replies against the new scenarios |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phase 001 placement design | Internal | Pending | Runtime change waits |
| Phase 002 rename | Internal | Pending | Paths differ |
| GPT-6 Luna and DeepSeek | External | Canary pending | Swap models with a stated reason |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A runtime test regression or a scenario that still writes before asking
- **Procedure**: Revert the phase's files from the diff, nothing is committed before phase 006
<!-- /ANCHOR:rollback -->

---


---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup ──► Wording (kernel, skill, AGENTS.md, II pair) ──┐
      └─► Runtime (placement, descriptions, tests) ─────┴─► Scenarios and grading
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Phases 001 and 002 | Wording, Runtime |
| Wording | Setup | Scenarios |
| Runtime | Setup | Scenarios |
| Scenarios | Wording, Runtime | Phase 004 |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 30 minutes |
| Core Implementation | High | 4 to 6 hours |
| Verification | Med | 2 hours |
| **Total** | | **6.5 to 8.5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Kernel character count recorded before and after
- [ ] Interactive Intelligence pair compared with `cmp`
- [ ] No commit made before phase 006

### Rollback Procedure
1. Revert the runtime files from the diff
2. Revert the wording on both sides of the mirror pair together
3. Rerun `npm run test:pinned` and the playbook validator
4. Report the cause to the master orchestrator

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
