---
title: "Implementation Plan: Phase 9: Media Editor integration"
description: "Re-verify the inventory, edit skill and kernel to one routing order, refresh mirrors, update playbook and gates in the same change, and rebuild the plugin."
trigger_phrases:
  - "media editor integration plan"
  - "routing order mcp ffmpeg advisory"
  - "kernel version bump"
  - "rule parity residency repin"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 9: Media Editor integration

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown sources, Python gates |
| **Framework** | Media Editor skill and Project package, sync loop at `AI Systems/z — Claude Project Sync Loop/` |
| **Storage** | None |
| **Testing** | `benchmark/parity/run_parity.sh`, `benchmark/gates/rule_parity.py`, `benchmark/parity/run_residency.sh`, playbook scenarios |

### Overview
MiMo re-reads every cited line so edits land where the inventory says. The writer edits the skill first, since it is the source of truth, then the kernel, Project README and byte-copy mirrors, then AGENTS.md and the install guide, then the playbook. Gate pins move in the same change as the text they pin, and each gate reruns after its surface. The plugin is rebuilt last so it ships the new skill.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phases 7 and 8 closed
- [ ] Operator asked about the `mcp servers/` directories and answered
- [ ] Inventory lines re-verified

### Definition of Done
- [ ] All sites edited
- [ ] `run_parity.sh`, `rule_parity.py` and `run_residency.sh` green
- [ ] New scenarios written, one run in Claude Desktop
- [ ] Changelog written, review note waiting on the operator
- [ ] `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Source first, then derived packaging, then gates, following `AI Systems/Media Editor/SYNC.md:8-13`

### Key Components
- **Skill**: Routing order, tool checks, references
- **Project package**: Kernel with the version bump, README, byte-copy mirrors
- **Playbook**: Advisory scenarios kept, connected-tools and fallback scenarios added
- **Gates**: Rule-parity phrases, residency rows, grader fixtures, twin declarations

### Data Flow
The line re-check feeds the edit list. Skill edits flow to the mirrors by byte copy and to the kernel by hand synthesis. Pinned wording flows to `rule_parity.py` and `systems.py` in the same change, and the updated skill flows into the plugin at rebuild.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

Several gates pin the advisory premise. Each consumes kernel or skill wording and moves with it.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| Kernel `Custom Instructions.md` | Producer of the Project's wording | Update | `run_residency.sh` |
| `systems.py` Media Editor rows | Consumer, pins kernel lines | Update | `run_residency.sh` |
| `rule_parity.py` RULES | Consumer, counts phrases per pair | Update | `python3 benchmark/gates/rule_parity.py` |
| Grader fixtures and `twin_divergence.py` | Consumers of the advisory shape | Update | Grader self-checks |
| Benchmark router | Consumer of an older contract | Unchanged, follow-up | Recorded in the log |

Required inventories:
- Advisory-premise sites: package inventory section B
- CLI-only assumptions: package inventory section C
- Gates asserting advisory behaviour: package inventory section E
- Matrix axes: runtime (Claude Desktop with the extension, Claude Code with the plugin, CLI with local ffmpeg, claude.ai web) by tools connected or not
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
| Parity | Skill and mirror pairs | `bash benchmark/parity/run_parity.sh` |
| Rule parity | Pinned phrases | `python3 benchmark/gates/rule_parity.py` |
| Residency | Kernel statements | `bash benchmark/parity/run_residency.sh` |
| Manual | Connected-tools and web scenarios | Operator in Claude Desktop and claude.ai |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Phases 7 and 8 | Internal | Yellow | Nothing to route to |
| `../001-tool-contract/contract.md` | Internal | Green | The 39 tool names, the `MEDIA_EDITOR_*` variables and the error codes the routing text and Project files quote come from it, so a rename there reaches every file this phase writes |
| Sync-loop owner | Internal | Yellow | Residency rows need agreement |
| Operator | Internal | Yellow | No review note, no `mcp servers/` decision |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A gate cannot be made green, or the operator rejects the routing wording
- **Procedure**: The Media Editor files are tracked, so the operator can restore each edited file from git. Nothing is committed without the operator, so the working tree is the only state to restore.
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:ai-exec -->
## AI EXECUTION PROTOCOL

### Execution model

| Role | Executor |
|------|----------|
| Re-inventory of cited lines, and review | cli-pi `llmgateway/mimo-v2.6-pro --thinking high`, read-only tools |
| Media Editor edits and gate re-pins | One `opus-high` writer agent |
| Gate reruns, operator questions, plugin rebuild | The orchestrator |
| Kernel review, live upload, commit decisions | The operator |

Read dispatch shape, from the repository root:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/mimo-v2.6-pro --thinking high --mode text --offline --tools read,grep,find,ls </dev/null > out.log 2> err.log
```

`perl -e 'alarm shift; exec @ARGV' 2400` is the 40-minute timeout, because neither `timeout` nor `gtimeout` exists on this machine. The prompt opens with the child-dispatch preamble from `.skilled/skills/cli-external-orchestration/shared/references/child-dispatch-preamble.md`, then the inlined persona, then the brief. MiMo gets read-only tools, so its output lands in `out.log` and the writer saves what it keeps. Exit status proves nothing: grep both logs for `401|429|No API key|invalid model` and read the output before using it.

The edits here are prose plus small Python pin changes, so the writer makes them directly and no DeepSeek dispatch runs. MiMo re-reads every cited line first, because the package inventory is a snapshot. Edits to `rule_parity.py` and `systems.py` keep each file's existing style and are proved by running the gate.

### Pre-Task Checklist

1. [ ] The cited line for this site still matches the package inventory
2. [ ] Both sides of any rule-parity pair are open together
3. [ ] The sync-loop row for any moved kernel line is identified
4. [ ] No path under `mcp servers/` is in the edit set
5. [ ] The acceptance row this task serves is identified

### Execution Rules

| Rule | Description |
|------|-------------|
| TASK-SEQ | Skill first, then kernel and mirrors, then AGENTS.md and guide, then playbook, then gates |
| TASK-SCOPE | Only sites the package inventory lists, and only Media Editor rows in the sync loop |
| TASK-VERIFY | Rerun `run_parity.sh`, `rule_parity.py` and `run_residency.sh` after each surface |
| TASK-EVIDENCE | Every edit cites the inventory line it changed |

### Status Reporting Format

`T### | done or blocked | file:line edited | gates rerun and their result | open question for the operator`

### Blocked Task Protocol

Mark the task `[B]` in `tasks.md` with the reason and the failing output. Three failed fixes for the same symptom stop the loop: the orchestrator reports the error, the three attempts and a proposed next step to the operator, and waits.
<!-- /ANCHOR:ai-exec -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Re-verify lines --> skill --> kernel and mirrors --> AGENTS.md and guide --> playbook --> gates --> changelog --> plugin rebuild --> Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Re-verify | Phase 8 | Skill |
| Skill | Re-verify | Kernel, mirrors |
| Kernel, mirrors | Skill | Gates |
| Playbook | Skill | Verify |
| Gates | Kernel, mirrors | Verify |
| Plugin rebuild | Skill | Verify |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Re-verify | Low | 1-2 hours |
| Skill, kernel, mirrors | High | 5-7 hours |
| Guide, playbook | Med | 3-4 hours |
| Gates and verification | Med | 3-4 hours |
| **Total** |  | **12-17 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] All gates green
- [ ] Kernel size measured
- [ ] Operator told what changes in the live Project

### Rollback Procedure
1. Stop edits
2. The operator restores edited Media Editor files from git if wanted
3. Restore the sync-loop rows the same way
4. Rerun the gates to confirm the old state

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A, documentation and gate pins only
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
SKILL.md --> references --> knowledge mirrors (byte copy)
SKILL.md --> Custom Instructions.md (hand synthesis) --> systems.py rows
references --> rule_parity.py phrases
SKILL.md --> plugin rebuild
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| SKILL.md | Inventory | Routing order | Kernel, plugin |
| Kernel | SKILL.md | Project wording | Residency rows |
| Mirrors | References | Byte copies | Parity gate |
| Gates | Kernel, mirrors | Green checks | Close |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Skill and kernel** - 6 hours - CRITICAL
2. **Gate re-pins** - 3 hours - CRITICAL
3. **Playbook scenarios** - 3 hours - CRITICAL

**Total Critical Path**: About 12 hours plus operator review

**Parallel Opportunities**:
- The install guide and changelog can be written while gates are re-pinned
- MiMo can review the playbook scenarios while the kernel is written
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Lines verified | Mismatch list empty or answered | After T002 |
| M2 | Sources updated | Skill, kernel, mirrors, guide done | Midway |
| M3 | Gates green | Parity, rule parity and residency green | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

### ADR-001: One routing order in every packaging

**Status**: Accepted

**Context**: The skill and kernel describe two runtimes on different premises (package inventory section B), and the sync loop pins the kernel's advisory lines.

**Decision**: Both state the same order: MCP tools when connected, local ffmpeg otherwise, chat advice when neither exists. The kernel keeps its no-false-claims rule for the advisory route.

**Consequences**:
- One rule to test across runtimes
- Pinned lines move. Mitigation: re-pin in the same change

**Alternatives Rejected**:
- Keep the kernel advisory-only: wrong for Desktop Projects with the extension
- Separate kernels per runtime: a second authority for one system

---
