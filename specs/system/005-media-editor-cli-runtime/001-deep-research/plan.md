---
title: "Implementation Plan: Phase 1: deep-research"
description: "Runs /deep:research:auto with two lineages, DeepSeek V4.1 Flash max through cli-pi and GPT-6 Luna max through cli-codex, 5 iterations each over five shared focuses, then merges them into research/research.md."
trigger_phrases:
  - "deep research plan"
  - "two lineage fan-out"
  - "media editor research focuses"
  - "research spot-check"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 1: deep-research

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown findings about a TypeScript runtime and Python gates |
| **Framework** | `/deep:research:auto` (`.skilled/commands/deep/assets/deep-research-auto.yaml`) |
| **Storage** | `research/` state logs, iterations and deltas |
| **Testing** | The workflow's leaf-reliability gate and a manual spot-check |

### Overview
The sub-orchestrator follows `.skilled/commands/deep/research.md` and its auto YAML with a `PRE-BOUND SETUP ANSWERS` block. Two lineages run at concurrency 2, each for 5 iterations over the same five focuses, and the workflow synthesizes `research/research.md`. The master orchestrator spot-checks the claims and brings the open choices to the operator.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] cli-pi, cli-codex and cli-devin canaries answered `OK`, recorded in `../scratch/baseline.md`
- [ ] The five focuses and both executor lines are written into the setup answers
- [ ] Baseline numbers captured before any change

### Definition of Done
- [ ] 10 iteration files with route-proof fields
- [ ] `research/research.md` merged and ranked
- [ ] Spot-checks recorded and the operator's answers captured
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Fan-out research: two isolated lineages under `research/lineages/<label>/`, then one synthesis.

### Key Components
- **deepseek lineage**: `pi -p --model opencode-go/deepseek-v4.1-flash --thinking max --mode json`, run from the repo root with `AI_SESSION_CHILD=1`
- **luna lineage**: `codex exec --model gpt-6-luna -c model_reasoning_effort="max" -c service_tier="fast"` in a read-only sandbox
- **synthesis**: the workflow writes `research/research.md` from both lineages' iterations and deltas

### Data Flow
Each iteration reads the Media Editor source and writes `iterations/iteration-NNN.md`, a state record and a delta. The leaf-reliability gate checks each record before the next iteration. Synthesis reads both lineages and writes `research/research.md`.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

This phase changes no product surface. It reads the surfaces later phases change.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `mcp server/src/server/tool-registry.ts` | Owns `dispatchToolCall` | Read only | Cited in iteration 1 |
| `mcp server/src/core/output-folder.ts` | Owns folder allocation | Read only | Cited in iteration 5 |
| `benchmark/` Python gates | Encode the route order | Read only | Cited in iteration 4 |

Required inventories:
- Same-class producers: iteration 5 lists every tool description that presents an omitted `fileName` as normal.
- Consumers of changed symbols: iteration 4 lists every gate that reads the route order.
- Matrix axes: surface (Project, skill) by batch size (one file, several files) by request clarity.
- Algorithm invariant: one question before the first write, and one place per batch.
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
| Unit | Each iteration record | The workflow's leaf-reliability gate |
| Integration | Both lineages merged | `research/research.md` synthesis |
| Manual | Load-bearing claims | Spot-check against the source by the master orchestrator |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| OpenCode Go DeepSeek V4.1 Flash | External | Canary pending | Switch to Cline at xhigh and report it |
| Codex GPT-6 Luna fast tier | External | Canary pending | Report the error, no substitute without the operator |
| `deep-research-auto.yaml` | Internal | Green | No research route |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A lineage writes outside `research/` or produces records without route proof
- **Procedure**: Delete the run's own files under `research/` with guarded paths and rerun the workflow
<!-- /ANCHOR:rollback -->

---


---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (canaries, setup answers) ──► Fan-out (deepseek, luna) ──► Synthesis ──► Spot-check and operator choices
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | None | Fan-out |
| Fan-out | Setup | Synthesis |
| Synthesis | Fan-out | Spot-check |
| Spot-check | Synthesis | Phase 002 |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 30 minutes |
| Core Implementation | High | 2 to 4 hours of unattended runs |
| Verification | Med | 1 hour |
| **Total** | | **3.5 to 5.5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] No file outside `research/` and this phase's docs changed, checked with `git status`
- [ ] Lock file released
- [ ] Canary results recorded

### Rollback Procedure
1. Stop the workflow
2. Remove the run's own files under `research/` with `${VAR:?}` guarded paths
3. Confirm `git status` shows no change under `AI Systems/`
4. Report the cause to the master orchestrator

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
