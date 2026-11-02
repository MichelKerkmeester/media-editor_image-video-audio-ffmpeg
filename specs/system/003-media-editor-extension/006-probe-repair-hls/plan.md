---
title: "Implementation Plan: Phase 6: probe, repair and HLS"
description: "One dispatch per tool behind a broken-media generator, with repair strategies authored from general ffmpeg practice and proved on generated damage."
trigger_phrases:
  - "probe repair hls plan"
  - "repair strategies"
  - "hls ladder settings"
  - "broken media generator"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 6: probe, repair and HLS

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 5 strict on Node 18 or later |
| **Framework** | MCP SDK 1.x, zod, `ffmpeg-static`, `ffprobe-static`, sharp |
| **Storage** | None |
| **Testing** | vitest with generated clips and generated broken files |

### Overview
A generator for broken files comes first. `media_probe` follows. `media_repair` is two dispatches, the diagnosis with the copy pass and then the re-encode passes with `auto`, and `video_hls_ladder` two more, the ladder and then rung selection. The ladder settings come from `sk-media-editor/assets/hls-video-conversion.md`. The repair passes are the two contract 3.4 fixes, each proved on a broken file it repairs (ADR-002).
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Phase 5 gate green
- [x] Repair strategies listed in `contract.md`
- [x] HLS recipe lines confirmed (`hls-video-conversion.md:94-121`)

### Definition of Done
- [ ] Three modules and their tests
- [ ] Each strategy has a broken-file case
- [ ] Registry test expects 38
- [ ] Gate green, and `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One module per tool. Repair maps each `strategy` value to one or two attempts of the shared attempt helper

### Key Components
- **`probe.ts`**: One ffprobe JSON read into the format, summary and streams blocks
- **`repair.ts`**: The ffprobe diagnosis, then `runAttempts` with the copy pass, a re-encode pass, or both for `auto`
- **`hls-ladder.ts`**: Rung selection, then a filter graph with `split`, per-rung encode args and HLS muxer args, run in the numbered folder
- **`broken-media.ts`**: Generates an unindexed Matroska recording, MP4s cut after and before their index, a Matroska file with PCM audio named `.mp4` and an AAC file cut short

### Contract sections implemented
`../001-tool-contract/contract.md` 3.4 (the three schemas, their behavior and `Output:` lines, and the phase 6 amendment), section 5 (the codes by tool group), 8.2 (rows 36 to 38) and 8.4 (the `cwd` option and the output check).

### Data Flow
Probe reads and returns. Repair diagnoses, refuses a file with no media stream, then runs its pass or passes into a temp file and copies the survivor into a new numbered folder. The ladder probes the source, drops rungs taller than it, checks the build, creates the numbered folder and its rung folders, runs one command there and checks every playlist and segment.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

These tools consume the existing core and add no new shared producer.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `media-properties.ts` | Producer (phase 4) | Unchanged | Probe test |
| `copy-then-encode.ts` | Producer (phase 4) | An attempt may name its own extension | Helper tests, full suite |
| Registry | Lists the tools | Add 3 lines | Registry test count 38 |

Required inventories:
- `media_probe` runs no sharp code: `grep -n "sharp" src/tools/media/probe.ts` prints nothing
- Matrix axes: damage type (5) by strategy (3), and rung set by source size (1080, 720, 480, 360, portrait)
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
| Unit | Rung selection, strategy choice | vitest |
| Integration | Probe, repair and ladder on generated media | vitest with ffprobe checks |
| Refusal | Audio-only ladder, unrepairable file | vitest |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `hls-video-conversion.md` recipe | Internal | Green | No ladder settings |
| `libx264` | External | Yellow | No ladder or encode repair |
| Phase 4 properties helper | Internal | Yellow until phase 5 closes | No probe |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A strategy cannot be proved on a generated broken file, or a tool must be withdrawn
- **Procedure**: Drop that strategy from the table and from the contract with a dated note, and keep the others. To withdraw a tool, remove its module (`src/tools/media/probe.ts`, `src/tools/media/repair.ts` or `src/tools/video/hls-ladder.ts`), its line in `src/server/all-tools.ts`, its name in `tests/server/registry.vitest.ts`, and its test files (`tests/tools/media/probe.vitest.ts`; `repair-diagnose.vitest.ts` and `repair-strategies.vitest.ts`; `hls-ladder.vitest.ts` and `hls-rungs.vitest.ts`). The ladder also takes `src/core/hls-folders.ts` and its test. The shared additions, the attempt `extension` and `check` in `copy-then-encode.ts`, `readProbeJson` in `media-properties.ts` and the generators in `tests/helpers/broken-media.ts`, can stay, since other code may use them. No tool imports another tool.
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:ai-exec -->
## AI EXECUTION PROTOCOL

### Execution model

| Role | Executor |
|------|----------|
| Code, one change per dispatch | cli-pi `llmgateway/deepseek-v4.1-flash --thinking max` |
| Large reads and reviews | cli-pi `llmgateway/mimo-v2.6-pro --thinking high`, read-only tools |
| Briefs, gate reruns, integration | The orchestrator |

Build dispatch shape, from the repository root:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/deepseek-v4.1-flash --thinking max --mode text --offline --tools read,grep,find,ls,edit,write,bash </dev/null > out.log 2> err.log
```

`perl -e 'alarm shift; exec @ARGV' 2400` is the 40-minute timeout, because neither `timeout` nor `gtimeout` exists on this machine.

Each prompt carries, in this order:

1. The child-dispatch preamble from `.skilled/skills/cli-external-orchestration/shared/references/child-dispatch-preamble.md`, first
2. The `code` persona from `.claude/agents/code.md`, inlined, since `pi -p` cannot resolve an agent path
3. One change: the task id from `tasks.md`, its one file or one tool with its test, and the `contract.md` section it implements
4. ALLOWED WRITE PATHS: `AI Systems/Media Editor/mcp server/**` and `AI Systems/Media Editor/specs/003-media-editor-extension/006-probe-repair-hls/`
5. BANNED OPERATIONS: git mutations, deletes outside the allowed paths, network installs other than `npm install` inside the package
6. The gate commands from `spec.md` section 4 and the handback format below

One change per dispatch, one dispatch at a time. A five-change DeepSeek brief once read about 995,000 characters and wrote nothing (`.skilled/skills/cli-external-orchestration/cli-pi/SKILL.md:219`). Exit status proves nothing: after each dispatch the orchestrator greps `out.log` and `err.log` for `401|429|No API key|invalid model`, confirms the named files exist, then reruns the full gate itself before sending the next change.

Read-only review dispatch shape:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/mimo-v2.6-pro --thinking high --mode text --offline --tools read,grep,find,ls </dev/null > out.log 2> err.log
```

### Pre-Task Checklist

1. [ ] The `contract.md` section this task implements is read
2. [ ] The previous task's gate rerun is green
3. [ ] The dispatch brief names its allowed write paths and banned operations
4. [ ] The acceptance row this task serves is identified
5. [ ] No open `[B]` task blocks this one

### Execution Rules

| Rule | Description |
|------|-------------|
| TASK-SEQ | Tasks run in `tasks.md` order, one dispatch at a time |
| TASK-SCOPE | A dispatch touches only its named file, tool and test |
| TASK-VERIFY | The orchestrator reruns the full gate after every dispatch |
| TASK-EVIDENCE | A task is checked only with the gate output that proves it |

### Status Reporting Format

`T### | done or blocked | files touched | gate: tsc exit, vitest passed/total, greps clean | one-line note`

### Blocked Task Protocol

Mark the task `[B]` in `tasks.md` with the reason and the failing output. Three failed fixes for the same symptom stop the loop: the orchestrator reports the error, the three attempts and a proposed next step to the operator, and waits.
<!-- /ANCHOR:ai-exec -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Broken-media generator --> media_probe --> media_repair (diagnose, then strategies) --> video_hls_ladder (ladder, then rungs) --> Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Generator | Phase 5 | Probe |
| Probe | Generator | Repair |
| Repair | Probe | Verify |
| Ladder | Phase 5 | Verify |
| Verify | All three | 007-desktop-extension |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Generator and probe | Med | 3 hours |
| Repair | High | 4-6 hours |
| Ladder | Med | 3-4 hours |
| Verification | Low | 1-2 hours |
| **Total** |  | **11-15 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Gate green
- [ ] Registry lists 38
- [ ] Each repair strategy and its target damage named in the tool description

### Rollback Procedure
1. Remove the failing tool or strategy
2. Rerun the gate
3. Amend `contract.md` with a dated note
4. Record the change in `goal.md`

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
broken-media.ts --> repair tests
probe.ts --> repair.ts
media-properties.ts --> probe.ts, hls-ladder.ts
all three --> all-tools.ts
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| probe.ts | Runner | Probe blocks | None |
| repair.ts | Probe, runner | Repaired file | None |
| hls-ladder.ts | Properties helper, runner | HLS folder | None |
| Registry | Three tools | 38 registered | Phase 7 |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Generator and probe** - 3 hours - CRITICAL
2. **Repair strategies** - 5 hours - CRITICAL
3. **Ladder** - 4 hours - CRITICAL

**Total Critical Path**: About 12 hours plus gate reruns

**Parallel Opportunities**:
- The ladder does not depend on repair and can follow the probe directly
- MiMo can review the repair recipes while the ladder dispatch runs
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Probe | Probe test green | After T003 |
| M2 | Repair | Every strategy proved | After T005 |
| M3 | Ladder | Ladder and rung tests green, 38 tools | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

### ADR-001: Diagnose before repair, and never upscale a ladder rung

**Status**: Accepted

**Context**: The Media Editor's repair mode starts with ffprobe (`AI Systems/Media Editor/sk-media-editor/README.md:202-204`), and the HLS recipe scales every rung without checking the source height (`hls-video-conversion.md:97-100`).

**Decision**: `media_repair` always diagnoses first and reports the strategy it used. `video_hls_ladder` drops rungs taller than the source.

**Consequences**:
- The user learns what was wrong, not only that a file came back
- A small source yields fewer rungs. Mitigation: the result lists the dropped rungs and why

**Alternatives Rejected**:
- Blind re-encode as the only repair: slow and lossy where a remux works
- Upscaling to fill the ladder: bigger files with no quality gain

---
