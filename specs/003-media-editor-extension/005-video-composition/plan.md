---
title: "Implementation Plan: Phase 5: video composition"
description: "Escaping helper, font and test media first, then one dispatch per composition tool with its ported cases, then the gating tests."
trigger_phrases:
  - "video composition plan"
  - "filter escape helper"
  - "xfade acrossfade graph"
  - "silencedetect parsing"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 5: video composition

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 5 strict on Node 18 or later |
| **Framework** | MCP SDK 1.x, zod, `ffmpeg-static`, `ffprobe-static` |
| **Storage** | None |
| **Testing** | vitest with the five source clips, generated clips with audio, a generated SRT and a sharp PNG |

### Overview
The escaping helper comes first, with its adversarial table, because every composition tool depends on it. The bundled font and the test-media generators follow. Each tool is then one dispatch with its ported cases, and a final dispatch adds the capability-gating tests with a stubbed capability set.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Phase 4 gate green (`validate.sh` on `004-video-audio-core` printed `RESULT: PASSED`, suite 1017 passed and 4 skipped)
- [x] `ffmpeg -filters` from the bundled binary saved, showing whether `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` and `overlay` are present (all six present, see T001)
- [x] Font chosen with a redistributable licence (Source Sans 3 Regular, SIL Open Font License 1.1)

### Definition of Done
- [ ] Seven modules, the helper, the font and their tests
- [ ] 8 ported cases plus the audio xfade case passing
- [ ] Registry test expects 35
- [ ] Gate green, and `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One module per tool, each building a filter graph from validated and escaped parts, run through the process runner

### Key Components
- **`filter-escape.ts`**: Escapes values for filter-option syntax and filter-graph level, drive letters included
- **Font asset**: `assets/fonts/` with one font and its licence, resolved from the package root by `font-path.ts`
- **Tool modules**: Schema, capability check, graph builder, args array
- **Test media**: Clips with `sine` audio for xfade, a clip with silent gaps from `anullsrc` and `sine`, a generated SRT, a sharp PNG
- **`overlay-position.ts`**: The 3.3.1 position table, one set of x and y expressions per filter family
- **`concat-list.ts`**: The concat demuxer list, holding only the server's own `norm_<i>.mp4` names
- **`runPipeline`** in `copy-then-encode.ts`: The multi-step runner for concat, silence removal and b-roll, with the same gating, temp folder and exclusive copy as `runAttempts`

### Contract sections implemented
`../001-tool-contract/contract.md` 3.3 (the schemas, argv blocks and `Output:` lines of 3.3.2 to 3.3.8, the 3.3.1 position table and the 3.3.11 routes), 8.2 (rows 28 to 35 and rule 1), 8.3 (the SubRip sniff), and 8.5 and 8.6 (the two-level escape and the copy rule).

### Data Flow
The handler validates parameters, checks the filters it needs against the capability cache, escapes every caller value, builds the filter graph and args array, runs it and probes the output. Multi-step tools normalize clips into a temp folder first and remove it in `finally`.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

The escaping helper is a new security producer, and every composition tool consumes it.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `filter-escape.ts` | New producer | Create | Adversarial table, 12 rows or more |
| `capabilities.ts` | Producer (phase 2) | Unchanged | Stubbed capability test per filter |
| Path guard | Producer (phase 2) | Unchanged | Font, SRT and overlay paths refused outside the roots |
| Registry | Lists the tools | Add 7 lines | Registry test count 35 |

Required inventories:
- Graph builders that skip the helper: `grep -rnE "filter_complex|'-vf'|'-af'" src/tools`, reviewed line by line
- Algorithm invariant: for any caller string s, the option value ffmpeg parses equals s. Adversarial cases: `\ ' : , [ ] ; =`, newline, `%`, drive letter, empty string
- Matrix axes: filter present or absent (6 filters), clip audio present or absent, platform path style
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
| Unit | Escaping helper | vitest table |
| Ported | 8 source cases | vitest with ffprobe duration checks |
| New | xfade with audio, quote in a file name, trailing silence, gating per filter | vitest |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| libass and freetype in the build | External | Yellow | Subtitles and text overlay gated off |
| Font licence | External | Green | No bundled font |
| Phase 4 helpers | Internal | Yellow until phase 4 closes | No properties or time parsing |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A tool cannot build a safe graph, or its filter is missing on the build machine
- **Procedure**: Remove that tool's module, its test file, its `all-tools.ts` line, its `TOOL_REQUIREMENTS` row in `src/core/capabilities.ts` and its rows in `tests/server/registry.vitest.ts` and `tests/tools/composition/capability-gating.vitest.ts`, then record the gap. The escaping helper, the shared helpers and the other tools stay.
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
4. ALLOWED WRITE PATHS: `AI Systems/Media Editor/mcp server/**` and `AI Systems/Media Editor/specs/003-media-editor-extension/005-video-composition/`
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
Escaping helper --> font and test media --> seven tool dispatches --> gating tests --> Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Helper | Phase 4 | Tools |
| Font and media | Helper | Tools |
| Tools | Font and media | Gating |
| Gating | Tools | Verify |
| Verify | Gating | 006-probe-repair-hls |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Helper, font, media | Med | 3-4 hours |
| Seven tools | High | 10-14 hours |
| Gating and verification | Med | 2-3 hours |
| **Total** |  | **15-21 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Gate green
- [ ] Registry lists 35
- [ ] Font licence file next to the font

### Rollback Procedure
1. Remove the failing tool's module, test and registry line
2. Rerun the gate
3. Record the gap and the missing filter in `goal.md`
4. Point the operator at `MEDIA_EDITOR_FFMPEG_PATH` if a fuller build is the fix

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
filter-escape.ts --> text overlay, subtitles, image overlay, b-roll, concat
font-path.ts --> text overlay
media-properties.ts (phase 4) --> concat, b-roll, fade, remove silence
all seven --> tool-registry.ts
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| filter-escape.ts | None | Escaped values | All seven |
| Font asset | None | `fontfile` path | Text overlay |
| video_concat | Helper, properties | Joined video | None |
| Registry | Seven tools | 35 registered | Phase 6 |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Escaping helper** - 2 hours - CRITICAL
2. **Concat with xfade, and b-roll** - 5 hours - CRITICAL
3. **The other five tools** - 6 hours - CRITICAL

**Total Critical Path**: About 13 hours plus gate reruns

**Parallel Opportunities**:
- The font choice and licence check can run while the helper is built
- MiMo reviews each finished graph builder while the next dispatch runs
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Helper proven | Escaping table green | After T002 |
| M2 | Overlays | Text, subtitle and image overlays green | Midway |
| M3 | All seven | Gate green, 35 tools | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

### ADR-001: One escaping helper and a bundled font

**Status**: Accepted

**Context**: The source escapes a subset of characters in one tool and none in the others (inventory G.4), and relies on fontconfig for fonts (F.2).

**Decision**: Every caller value in a filter graph goes through `filter-escape.ts`, and text overlays always pass `fontfile=` with a bundled font.

**Consequences**:
- The same behaviour on all five platforms
- One more asset in the bundle, with its licence. Mitigation: a small font under the SIL Open Font License

**Alternatives Rejected**:
- Escaping per tool: the source's approach, which missed cases
- System fonts: minimal Linux and Windows builds have no default

---
