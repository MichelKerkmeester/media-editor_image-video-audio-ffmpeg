---
title: "Implementation Plan: Phase 4: video and audio core"
description: "Three helper dispatches, then one dispatch per tool with its ported vitest cases, in the order the source tests run."
trigger_phrases:
  - "video audio core plan"
  - "ffmpeg args array tools"
  - "ported pytest cases"
  - "copy then encode helper"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 4: video and audio core

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 7 strict on Node 20.9 or later (NodeNext ESM) |
| **Framework** | MCP SDK 1.x, zod, `ffmpeg-static`, `ffprobe-static` |
| **Storage** | None |
| **Testing** | vitest, with a 10-second generated clip and an extracted MP3 as inputs |

### Overview
Helpers come first: ffprobe properties, time parsing and the copy-then-encode helper. Then each tool is one dispatch with its ported cases, in the order the source suite runs them (`vam/tests/test_video_functions.py:130-311`). Each test checks the property it changed with ffprobe, where the source only checked that a file existed.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phase 3 gate green
- [ ] `ffmpeg -encoders` from the bundled binary lists `libx264`, `aac` and `libmp3lame`
- [ ] Contract conversion rows approved

### Definition of Done
- [ ] 19 modules, 3 helpers and their tests
- [ ] All 20 ported cases present and passing
- [ ] Registry test expects 28
- [ ] Gate green, and `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One module per tool over shared helpers, each building an args array for the process runner

### Key Components
- **`media-properties.ts`**: ffprobe JSON (`-v error -print_format json -show_format -show_streams`) into duration, streams, dimensions, frame rate and audio layout, with the source's 30 fps fallback (`vam/server.py:1260-1262`)
- **`time-parse.ts`**: Seconds or `HH:MM:SS(.ms)` into seconds, rejecting anything else
- **`media-containers.ts`** and **`media-fields.ts`**: The container tables of contract 3.2.1, the alias normalizers, and the shared zod fields and value parsers, so a schema, an ffmpeg flag and a file extension come from one place
- **`copy-then-encode.ts`**: Runs an ordered list of one or two attempts. It gates capabilities before the output folder exists, writes each attempt to its own file in a private temp folder, falls back only on a plain `PROCESS_FAILED`, copies the survivor into the numbered folder with an exclusive flag, and reports which attempt produced it
- **Tool modules**: A schema plus an args builder per tool

### Data Flow
The handler validates parameters, probes the input when it needs stream facts, checks capabilities for any codec it names, builds one or two args arrays for the runner, then probes the output for the result.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

These tools consume the runner, resolver and capability detector. The copy-then-encode helper is a new shared producer.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `copy-then-encode.ts` | New producer | Create | Helper test with a forced copy failure |
| `process-runner.ts` | Producer (phase 2) | Unchanged | Every tool test |
| `capabilities.ts` | Producer (phase 2) | Unchanged | Stubbed capability test per codec tool |
| Registry | Lists the tools | Add 19 lines | Registry test count 28 |

Required inventories:
- Leftover ffmpeg-python aliases: `grep -rnE "'(acodec|vcodec|audio_bitrate|video_bitrate)'" src` prints nothing
- Input-option placement: every `-ss` and `-to` in `src/tools` comes before `-i`, checked in the trim test's args snapshot
- Matrix axes: container (mp4, avi, mov, mkv), audio format (mp3, wav, aac), copy or encode path
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
| Unit | Helpers | vitest |
| Ported | 20 source cases | vitest with ffprobe assertions |
| Refusal | Bad ratio, bad speed, missing codec, missing stream | vitest |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Bundled ffmpeg encoders | External | Yellow | Ported tests fail on a build without `libx264` |
| Phase 2 core | Internal | Yellow until phase 3 closes | No runner |
| `vam/tests/test_video_functions.py` | Reference | Green | No oracle |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A tool cannot match its source behaviour with the bundled ffmpeg
- **Procedure**: Remove that tool's module, test and registry line, record the gap in `goal.md` and continue. Tools depend only on the helpers, never on each other.
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
4. ALLOWED WRITE PATHS: `AI Systems/Media Editor/mcp server/**` and `AI Systems/Media Editor/specs/003-media-editor-extension/004-video-audio-core/`
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
Helpers (properties, time, copy-then-encode) --> audio tools --> video tools --> speed --> Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Helpers | Phase 3 | Tools |
| Audio tools | Helpers | Verify |
| Video tools | Helpers | Verify |
| Verify | All tools | 005-video-composition |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Helpers | Med | 2-3 hours |
| 19 tools | High | 10-14 hours |
| Verification | Low | 1-2 hours |
| **Total** |  | **13-19 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Gate green
- [ ] Registry lists 28 tools
- [ ] Encoder list from the bundled binary saved in `implementation-summary.md`

### Rollback Procedure
1. Remove the failing tool's module, test and registry line
2. Rerun the gate
3. Record the gap and the missing capability in `goal.md`
4. Tell the operator if the gap needs a different ffmpeg build

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
media-properties.ts --> video_set_aspect_ratio, video_set_speed, video_trim, audio tools
time-parse.ts --> video_trim
copy-then-encode.ts --> video_convert and the video_set_* tools
all 19 --> all-tools.ts
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| media-properties.ts | Runner, resolver | Probe facts | Aspect, speed, trim, audio tools |
| copy-then-encode.ts | Runner | Copy or encode result | Stream-copy tools |
| time-parse.ts | None | Seconds | Trim |
| Registry | 19 tools | 28 registered | Phase 5 |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Helpers** - 3 hours - CRITICAL
2. **19 tool dispatches** - 12 hours - CRITICAL
3. **Gate and review** - 2 hours - CRITICAL

**Total Critical Path**: About 17 hours of dispatches and reruns

**Parallel Opportunities**:
- None inside the dispatch model
- MiMo can review finished audio tools while video dispatches run
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Helpers tested | Three helper tests green | After T004 |
| M2 | Audio tools | Six audio tools green | After T010 |
| M3 | All 19 | Gate green, 28 tools | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

### ADR-001: Real ffmpeg flags and one copy-then-encode helper

**Status**: Accepted

**Context**: ffmpeg-python translates aliases that are not ffmpeg flags (inventory F.7), and the source repeats its copy-then-encode fallback (inventory section C).

**Decision**: Tools write real flags, and every tool ends in one helper that runs its attempts in order. Each attempt writes its own file in a private temp folder, guarded by `-n`. Only the survivor is copied into the numbered output folder, and two failures give one `PROCESS_FAILED` whose stderr tails are joined and capped at 4 KB (contract 3.2 rule 5).

**Consequences**:
- The args an operator sees in a log are runnable ffmpeg commands
- One place closes the missing-overwrite-flag problem (inventory G.5)
- A failed first attempt never leaves a partial file where the second attempt or the caller would see it, so no delete-between-attempts step exists to go wrong

**Alternatives Rejected**:
- An alias translation layer: keeps an unverified table alive
- Always encode: slower and lossy where a copy works

---
