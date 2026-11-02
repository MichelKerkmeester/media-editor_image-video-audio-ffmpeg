---
title: "Implementation Plan: Phase 1: tool contract"
description: "Write contract.md from the source inventory, review it with MiMo and get the operator's approval before any package code exists."
trigger_phrases:
  - "tool contract plan"
  - "contract.md sections"
  - "media editor naming conventions"
  - "mimo contract review"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 1: tool contract

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown contract for a TypeScript server on Node 18 or later |
| **Framework** | Target: MCP SDK 1.x `McpServer` with zod, sharp, `ffmpeg-static`, `ffprobe-static` |
| **Storage** | None |
| **Testing** | Name-by-name diff against the source registrations, MiMo review, operator approval |

### Overview
The writer drafts `contract.md` section by section from `../context/source-inventory.md`: its rename map (section E), porting hazards (section F), defects (section G) and gap-tool recipes (section H). MiMo reviews the draft against the sources, read-only. The operator approves it, and phases 2 to 8 treat it as frozen, amending it only in place with a dated note.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Source inventory present with fixture sizes filled in (`../context/source-inventory.md:313-323`)
- [x] Parent spec and phase map written
- [x] Operator decisions recorded in the parent spec

### Definition of Done
- [x] `contract.md` holds the ten sections listed in section 3
- [x] 39 rows in the unified table, no source tool unmapped
- [x] MiMo findings resolved or answered
- [x] Operator approval recorded in the `goal.md` log
- [x] `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Specification document: one contract file with numbered sections, each consumed by named later phases

### Key Components
- **Section 1, conventions**: Prefixes, camelCase, units for quality and bitrate, time format (seconds or `HH:MM:SS`)
- **Section 2, unified tool table**: 39 rows: new name, source name with file:line, building phase
- **Section 3, schemas**: One zod-level block per tool, grouped by phase
- **Section 4, path policy**: Allowed roots, real-path check, output folder naming, no overwrite, adversarial cases
- **Section 5, error model**: Code list, error result shape, protocol errors
- **Section 6, binary resolution**: Four-step lookup and the `MEDIA_EDITOR_*` variables and arguments
- **Section 7, result format**: Text summary plus structured outputs, with an example
- **Section 8, capability and process policy**: Encoder and filter checks, timeout, stderr cap, temp folders, escaping helper
- **Section 9, source defects**: One line per inventory section G item
- **Section 10, attribution**: THIRD_PARTY_NOTICES outline and the licences to fetch

### Data Flow
The source inventory and the Media Editor recipes feed the draft. MiMo's review comes back as findings, the writer resolves them, and the approved contract feeds every dispatch brief in phases 2 to 8.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

The path policy and filter escaping are security surfaces. This phase defines them, and the table names who builds and who consumes each.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| Path guard | Defined here, built in `002-server-foundation` | Define | Adversarial case list in contract section 4 |
| Filter-string escaping helper | Defined here, built in `005-video-composition` | Define | Escaping table in contract section 8 |
| Every tool with a path parameter | Consumer | Uses the guard | Schema rows in section 3 mark guarded parameters |
| Manifest `user_config` and plugin config | Consumers of the section 6 variables | Unchanged here | Same names reused in phases 7 and 8 |

Required inventories:
- Source registrations: `grep -n '@mcp.tool()' ../context/video-audio-mcp-main/server.py` and the tool list at `imagician/src/index.ts:31-194`
- Unguarded path uses in the sources: inventory section G.3
- Raw caller strings reaching filter graphs: inventory section G.4
- Matrix axes: platform (5), media kind (image, video, audio), binary source (4 lookup steps)
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
| Completeness | Unified table against both source registrations | grep and a name diff |
| Review | Whole contract against the sources | MiMo read-only dispatch |
| Approval | Whole contract | Operator |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `../context/source-inventory.md` | Internal | Green | No evidence base |
| MCP SDK 1.x documentation | External | Yellow | Result and schema shapes confirmed in phase 2 |
| MCPB manifest documentation | External | Yellow | Variable passing confirmed in phase 7 |
| Operator approval | Internal | Yellow | Phase 2 waits |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: The operator rejects the contract, or phase 2 finds a section it cannot implement
- **Procedure**: Amend `contract.md` in place with a dated note in its change log. No code depends on it yet, so nothing else rolls back.
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:ai-exec -->
## AI EXECUTION PROTOCOL

### Execution model

| Role | Executor |
|------|----------|
| Setup reads (T001 to T003) and the review pass (T019) | cli-pi `llmgateway/mimo-v2.6-pro --thinking high`, read-only tools |
| Section drafts (T004 to T016), one section per dispatch, each to its own file in `scratch/sections/`, at most three running at once | cli-pi `llmgateway/deepseek-v4.1-flash --thinking max`, writes limited to `scratch/sections/` |
| Assembling `contract.md` from the drafts (T022) and checking `decision-record.md` (T017) | The one `opus-high` writer agent |
| Name diff, validation, review handoff and approval | The orchestrator, then the operator |

The operator chose multi-agent dispatch on 2026-09-28: MiMo and DeepSeek do the work, with no more than one opus agent. [DEVIATION: the first draft of this plan ran no DeepSeek dispatch in this phase; the operator's dispatch choice replaced that.]

Read dispatch shape, from the repository root:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/mimo-v2.6-pro --thinking high --mode text --offline --tools read,grep,find,ls </dev/null > out.log 2> err.log
```

`perl -e 'alarm shift; exec @ARGV' 2400` is the 40-minute timeout, because neither `timeout` nor `gtimeout` exists on this machine. The prompt opens with the child-dispatch preamble from `.skilled/skills/cli-external-orchestration/shared/references/child-dispatch-preamble.md`, then the inlined persona, then the brief. MiMo gets read-only tools, so its output lands in `out.log` and the writer saves what it keeps. Exit status proves nothing: grep both logs for `401|429|No API key|invalid model` and read the output before using it.

Draft dispatch shape, from the repository root, one section per run:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/deepseek-v4.1-flash --thinking max --mode text --offline --tools read,grep,find,ls,write </dev/null > out.log 2> err.log
```

Each draft prompt names its one target file under `scratch/sections/`, the inventory sections it draws on and the acceptance row it serves. Two runs never share a target file. The writer then assembles the drafts into `contract.md` in section order, resolving any disagreement between drafts, and a MiMo pass reviews the result against the sources.

### Pre-Task Checklist

1. [ ] `../context/source-inventory.md` read for the section being written
2. [ ] The rename-map row or recipe being used is cited with file:line
3. [ ] No earlier contract section contradicts the new one
4. [ ] The acceptance row this section serves is identified
5. [ ] Source folders untouched (`find` counts 10 and 23 files)

### Execution Rules

| Rule | Description |
|------|-------------|
| TASK-SEQ | Sections in `tasks.md` order, schemas after the table |
| TASK-SCOPE | Writes only inside this phase folder |
| TASK-VERIFY | Name diff after the table, `validate.sh` after each document |
| TASK-EVIDENCE | Every claim about a source carries its file:line |

### Status Reporting Format

`T### | done or blocked | contract section written | rows or schemas added | open question`

### Blocked Task Protocol

Mark the task `[B]` in `tasks.md` with the reason and the failing output. Three failed fixes for the same symptom stop the loop: the orchestrator reports the error, the three attempts and a proposed next step to the operator, and waits.
<!-- /ANCHOR:ai-exec -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (read, spot check) --> Draft sections 1-10 --> Review (MiMo) --> Approval (operator)
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Source inventory | Draft |
| Draft | Setup | Review |
| Review | Draft | Approval |
| Approval | Review | 002-server-foundation |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 1 hour |
| Draft | Med | 4-6 hours |
| Review and approval | Med | 1-2 hours plus operator time |
| **Total** |  | **6-9 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [x] Contract reviewed by MiMo
- [x] Operator approval recorded
- [x] Source folders unchanged (`find` counts 10 and 23 files)

### Rollback Procedure
1. Mark the section in question as amended, with the date
2. Rewrite the section
3. Rerun the name diff and `validate.sh`
4. Tell the orchestrator which later tasks read the changed section

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A, no data changes
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
source-inventory.md ------+
                          +--> contract.md --> MiMo review --> approval --> phases 2 to 8
sk-media-editor recipes --+
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| Inventory | None | Evidence | Contract |
| contract.md | Inventory, recipes | Tool table, schemas, policies | Review |
| MiMo review | contract.md | Findings | Approval |
| Approval | Review | Frozen contract | Phase 2 |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Draft sections 2 and 3** - 3 hours - CRITICAL
2. **MiMo review** - 1 hour - CRITICAL
3. **Operator approval** - operator time - CRITICAL

**Total Critical Path**: About 5 hours of work plus the operator's review

**Parallel Opportunities**:
- Sections 4 to 8 can be drafted while section 3's schemas are written
- The attribution section needs only inventory section I
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Draft complete | Ten sections present, 39 rows | Day 1 |
| M2 | Review resolved | No open MiMo finding | Day 1 |
| M3 | Approved | Operator approval in the log | Before phase 2 |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

ADR-001 to ADR-003 are in `decision-record.md`. The decision below is local to this plan.

### ADR-004: Keep every source tool and disambiguate by description

**Status**: Accepted

**Context**: The sources overlap: `convert_video_properties` repeats the five `set_video_*` tools, and `convert_audio_properties` repeats `convert_audio_format` and three `set_audio_*` tools (inventory E.4).

**Decision**: Keep all of them, as the operator chose, and write each description so the model can tell the composite tool from the single-property one.

**Consequences**:
- No source capability disappears
- The tool list grows to 39 entries. Mitigation: consistent prefixes and one-line descriptions that name the difference

**Alternatives Rejected**:
- Dropping the composite tools: removes a one-call path source users had
- Dropping the single-property tools: loses the stream-copy fast path (`vam/server.py:395-481`)

---
