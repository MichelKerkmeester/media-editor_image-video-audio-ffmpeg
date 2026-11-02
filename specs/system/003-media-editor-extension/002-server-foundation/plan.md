---
title: "Implementation Plan: Phase 2: server foundation"
description: "Scaffold the package, then build each core module with its test in one dispatch each, ending with media_health over stdio."
trigger_phrases:
  - "server foundation plan"
  - "mcp server core modules"
  - "process runner design"
  - "one change per dispatch"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 2: server foundation

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 5 (strict, NodeNext ESM) on Node 18 or later |
| **Framework** | `@modelcontextprotocol/sdk` 1.x `McpServer`, zod, `ffmpeg-static`, `ffprobe-static`, sharp |
| **Storage** | None. Files live on the user's disk under the allowed roots and the output folder |
| **Testing** | vitest (`*.vitest.ts` under `tests/`) |

### Overview
Single-change dispatches build the package from its manifest up: errors and configuration first, then the path guard and output folder, the resolver, runner and capability detector, the result builders, the registry and server factory, `media_health` and the stdio entry. Each dispatch adds one module and its test, and the orchestrator reruns the full gate after each.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] `../001-tool-contract/contract.md` approved
- [ ] `AI Systems/Media Editor/mcp server/` absent or empty
- [ ] `mcp servers/` deletions left untouched and unstaged

### Definition of Done
- [ ] Gate green: tsc, vitest, both greps, drift script or its stand-in
- [ ] `media_health` answers over stdio
- [ ] All acceptance rows met
- [ ] `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Layered: `src/index.ts` entry, `src/server/` wiring, `src/core/` shared services, `src/tools/<kind>/` with one module per tool

### Key Components
- **`src/core/config.ts`**: Reads `MEDIA_EDITOR_ALLOWED_DIRS`, `MEDIA_EDITOR_OUTPUT_DIR`, the binary overrides and the timeout from the environment, plus `--allowed-dir` and `--output-dir` arguments
- **`src/core/errors.ts`**: `MediaError` with a `code` from the contract list
- **`src/core/path-guard.ts`**: Real-path check against the allowed roots, with the input and output rules
- **`src/core/output-folder.ts`**: Allocates `NNN - <description>/` in the output folder
- **`src/core/ffmpeg-resolver.ts`**: Four-step lookup for ffmpeg and ffprobe
- **`src/core/process-runner.ts`**: The only spawn: args array, no shell, timeout, stderr tail, cleanup
- **`src/core/capabilities.ts`**: Parses `-encoders` and `-filters` once per process
- **`src/core/result.ts`**: Success and error result builders
- **`src/server/tool-registry.ts` and `create-server.ts`**: Register each tool's zod schema and handler on `McpServer`
- **`src/tools/media/health.ts`**: `media_health`

### Contract Sections Implemented

Each module implements these sections of `../001-tool-contract/contract.md`:

| Module | Sections |
|--------|----------|
| `config.ts` | 4.1 allowed roots and output folder, 6.8 variables and arguments, 6.9 hostile values |
| `errors.ts` and `tool-registry.ts` | 5 error model, including the registry's own protocol errors |
| `path-guard.ts` | 4.1, 4.2 input resolution, 4.4 adversarial cases |
| `output-folder.ts` | 4.3 numbering and file names |
| `ffmpeg-resolver.ts` | 6.1 to 6.7 lookup order, overrides, bundled, PATH, installed, failure and cache |
| `process-runner.ts` | 8.3 how a process runs, 8.4 timeout, stderr and cleanup |
| `capabilities.ts` | 8.1 the two cached lists |
| `result.ts` | 7.1 text line, 7.2 structured result |
| `tools/media/health.ts` | 2 row 9 and 3.3.9 |

Not built here: 8.5 and 8.6 (the filter escaping helper, phase 5), 6.5 filling the data folder (`media_setup_ffmpeg`, phase 8) and section 10 (licences, phase 7).

### Data Flow
A `tools/call` arrives over stdio and the SDK validates it against the zod schema. The handler asks the path guard about every path, allocates an output folder, builds an args array and runs it through the process runner with the resolved binary. `result.ts` builds the reply, and any `MediaError` becomes an `isError` result.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

The path guard and the process runner are security surfaces, and every later tool consumes both.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `path-guard.ts` | Producer of the path policy | Create | Adversarial table test, at least 10 rows |
| `process-runner.ts` | Only spawner | Create | `grep -rn "spawn(" src` finds it in one file |
| `ffmpeg-resolver.ts` | Binary source for every tool | Create | One resolver test per lookup step |
| Every later tool module | Consumer | Unchanged here | Registry test in each phase |

Required inventories:
- Same-class producers: `grep -rnE 'child_process|\bspawn(Sync)?\(|\bexecFile(Sync)?\(|\bexecSync\(' src` lists only `process-runner.ts` (an `exec\(` pattern also matches `RegExp.exec(` and lists four unrelated files)
- Consumers of error codes: `grep -rn "code: '" src`
- Matrix axes: platform (5), binary source (4 steps), configuration source (environment, arguments, missing)
- Path guard invariant: an accepted path's real path equals an allowed root's real path or starts with it followed by a separator, and no output equals an input. Adversarial cases: `..`, symlink escape, shared prefix, case-folded path on macOS, Windows drive letter, trailing separator
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
| Unit | Each core module | vitest |
| Integration | Registry plus `media_health` through an in-memory transport | vitest |
| Smoke | Built server over stdio: `tools/list` and `media_health` | vitest spawning `node dist/index.js` |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `@modelcontextprotocol/sdk` 1.x | External | Yellow | No server API |
| `ffmpeg-static`, `ffprobe-static` | External | Yellow | Resolver falls back to `PATH` for local work |
| zod | External | Green | No schemas |
| vitest | External | Green | No tests |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: The gate cannot go green, or the SDK API blocks the registry design
- **Procedure**: Delete `AI Systems/Media Editor/mcp server/`, which is new and untracked, amend the ADR and rerun from T001. No tracked file outside the package changes in this phase.
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
4. ALLOWED WRITE PATHS: `AI Systems/Media Editor/mcp server/**` and `AI Systems/Media Editor/specs/003-media-editor-extension/002-server-foundation/`
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
Setup (package, fixtures) --> Core (errors, config, guard, resolver, runner) --> Server (registry, health, entry) --> Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Approved contract | Core |
| Core | Setup | Server |
| Server | Core | Verify |
| Verify | Server | 003-image-tools |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | 1-2 hours |
| Core modules | High | 6-8 hours |
| Server and health | Med | 2-3 hours |
| Verification | Low | 1 hour |
| **Total** |  | **10-14 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Gate green on the final state
- [ ] `media_health` output captured
- [ ] `git status` shows only new files under the package and nothing staged in `mcp servers/`

### Rollback Procedure
1. Stop dispatches
2. Remove `AI Systems/Media Editor/mcp server/`, which is untracked
3. Amend the relevant ADR
4. Restart from the first failing task

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A, the package is new and holds no user data
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
errors.ts --> config.ts --> path-guard.ts --> output-folder.ts
config.ts --> ffmpeg-resolver.ts --> capabilities.ts
ffmpeg-resolver.ts --> process-runner.ts
process-runner.ts, capabilities.ts, result.ts --> health.ts
health.ts --> tool-registry.ts --> create-server.ts --> index.ts
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| errors.ts | None | MediaError | All modules |
| config.ts | errors.ts | Config object | Guard, resolver, runner |
| path-guard.ts | config.ts | Accepted paths | Every tool |
| ffmpeg-resolver.ts | config.ts | Binary paths | Runner, capabilities |
| process-runner.ts | Resolver, errors | Run results | Every video and audio tool |
| tool-registry.ts | result.ts, tools | Registered server | index.ts |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Path guard with adversarial tests** - 2 hours - CRITICAL
2. **Resolver and runner** - 3 hours - CRITICAL
3. **Registry, health and stdio entry** - 3 hours - CRITICAL

**Total Critical Path**: About 8 hours of dispatches plus gate reruns

**Parallel Opportunities**:
- The fixture copy and its README can run beside the core modules
- `result.ts` and `output-folder.ts` do not depend on the runner
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Package builds | `npx tsc --noEmit` exit 0 | After T003 |
| M2 | Core tested | All core tests green | After T013 |
| M3 | Health over stdio | Smoke test green | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

ADR-001 to ADR-003 are in `decision-record.md`. The decision below is local to this plan.

### ADR-004: Report tool failures as results, not protocol errors

**Status**: Accepted, implemented in `src/server/tool-registry.ts` and covered by `tests/server/registry.vitest.ts`

**Context**: Contract section 5 fixes the codes. The SDK can surface a failure as a thrown `McpError` or as a result with `isError: true`.

**Decision**: The registry's own `tools/call` handler catches every error a tool handler throws and returns an `isError` result. A `MediaError` keeps its code and any other error becomes `INTERNAL`, so the model sees the reason. Only schema failures and unknown tools stay protocol errors.

**Consequences**:
- The model reads `PATH_NOT_ALLOWED` and can tell the user what to change
- Tests assert codes, not message text

**Alternatives Rejected**:
- Throwing `McpError` as Imagician does (`imagician/src/index.ts:451-459`): the model gets a generic protocol error
- Returning status strings as video-audio does: success and failure look alike (inventory section B)

---
