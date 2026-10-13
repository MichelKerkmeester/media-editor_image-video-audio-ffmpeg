---
title: "Implementation Plan: Phase 10: pinned-build-parity"
description: "A shared MP4 refusal in the attempt runner and the silence copy, and a pinned-build suite run through test-only aliases for the two static packages."
trigger_phrases:
  - "implementation plan"
  - "technical approach"
  - "architecture decisions"
  - "testing strategy"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 10: pinned-build-parity

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 7 strict, NodeNext, Node 26 |
| **Framework** | MCP SDK 1.31 with zod 4 |
| **Storage** | None. Temp folders and the ignored `build/` folder |
| **Testing** | vitest 5, on the development ffmpeg 6.0 and on the pinned build |

### Overview
After each attempt writes its temp file, and on the file each pipeline step returns, the runner reads the codec of every stream when the file is MP4, M4A or M4V, and a PCM or FFV1 stream makes the attempt count as refused, so the next attempt re-encodes, or fails the pipeline call. A script extracts this machine's pinned pair from the build cache, checks both digests and runs the suite with an environment variable that makes `vitest.config.ts` alias `ffmpeg-static` and `ffprobe-static` to shims naming those binaries.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Problem statement clear and scope documented
- [x] Success criteria measurable
- [x] Dependencies identified

### Definition of Done
- [x] All acceptance criteria met
- [x] `npm test` and `npm run test:pinned` exit 0, and the package gate passes
- [x] Docs updated (spec, plan, tasks, contract)
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
One policy function, one probe helper and one assertion, called from the two runners every copy goes through.

### Key Components
- **`unportableMp4Codecs`** in `media-containers.ts`: returns the PCM and FFV1 codec names in a list
- **`probeIntermediateCodecs`** in `media-properties.ts`: the codec of every stream in a server temp file
- **`assertPortableMp4`** in `copy-then-encode.ts`: throws a plain `PROCESS_FAILED` for an MP4 that holds one, which the runner already treats as a failed attempt
- **`scripts/test-pinned.ts`**: fetch if missing, extract, check, then run vitest with `MEDIA_EDITOR_TEST_BIN_DIR`
- **Shims** in `tests/helpers/`: export the pinned paths in the shapes the two packages export

### Data Flow
attempt argv -> ffmpeg writes the temp file -> `assertPortableMp4` probes it -> refused: next attempt, kept: the attempt's own check, then the survivor is copied into the numbered folder. A pipeline step's product takes the same probe before its copy.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `runAttempts` in `copy-then-encode.ts` | Runs every copy-first tool and `media_repair` | Update: the check after each attempt | The 16 tool and repair tests on 9.0.2 |
| Silence copy in `remove-silence.ts` | The one copy outside `runAttempts`, run through `runPipeline` | Unchanged: `runPipeline` applies the check to every product | The 'runPipeline MP4 refusal' test |
| `concat.ts` join pass | Copies clips it normalized to H.264 and AAC, through `runPipeline` | Checked by `runPipeline`, never refused, since its copy cannot carry PCM or FFV1 | Read of `joinArgs` and the normalize pass |
| `runPipeline` product of b-roll | Re-encoded | Checked, never refused | Read of its argv |
| `runInOutputFolder` of the HLS ladder | Re-encodes into segments | Unchanged: no copy | Read of its argv |
| Tool descriptions | Say the copy is re-encoded when it cannot be stored | Unchanged: still true | Read |
| Contract 3.2, 3.3.6, 3.4, section 5 | Describe copy and fallback | Update: dated amendment | Diff |

Required inventories:
- Same-class producers: `rg -n "copy'" src/tools` lists 18 files, 16 on `runAttempts`, `concat.ts` and `remove-silence.ts` on `runPipeline`.
- Consumers of changed symbols: `assertPortableMp4` and `probeIntermediateCodecs` are new; `runAttempts` callers are unchanged.
- Matrix axes: output extension (MP4 family or other) by stream codec (PCM, FFV1, other) by attempt position (first, middle, last).
- Algorithm invariant: a file the server keeps in an MP4 family container never holds a PCM or FFV1 stream, on any build.
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
| Unit | The codec policy, the probe helper, the assertion with a stub runner, the silence copy | vitest |
| Integration | Every tool test, on the development ffmpeg and on the pinned build | `npm test`, `npm run test:pinned` |
| Manual | None | - |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Pinned archives in `build/cache/` | Internal | Green | Fetched again through the digest-checked download |
| ffmpeg 9.0.2 and ffprobe 9.0.2, darwin-arm64 | External | Green | The pinned run cannot run on this Mac |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: the refusal re-encodes a file it should keep, or the pinned run misleads
- **Procedure**: restore the changed files from the session scratchpad copies taken before each edit, delete the four files this phase created, then rebuild the bundles and the plugin. Nothing is committed
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:ai-exec -->
## AI EXECUTION PROTOCOL

### Execution model

| Role | Executor |
|------|----------|
| Code, tests and contract amendments | The orchestrator, per the executor note |
| Read-only review | The parent goal's D6 routes in order: `opencode-go/deepseek-v4.1-flash` max, `cline-pass/cline-pass/deepseek-v4.1-flash` xhigh, `openai-codex/gpt-6-luna` max, then `llmgateway/mimo-v2.6-pro` high |
| Gate reruns, rebuild and docs | The orchestrator |
| The MP4 rule and any commit | The operator |

Review dispatch shape, from the repository root:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 1800 pi -p "<prompt>" --model opencode-go/deepseek-v4.1-flash --thinking max --mode json --offline --tools read,grep,find,ls </dev/null > out.jsonl 2> err.log
```

`--mode json` keeps the final message readable when a max-thinking answer reaches the output cap, where text mode returns nothing with exit 0. Exit status proves nothing: read the report, then confirm each finding against the code before acting on it.

### Pre-Task Checklist

1. [x] The failure list on 9.0.2 names the test this task serves
2. [x] A copy of each file is in the scratchpad before its first edit
3. [x] The acceptance row this task serves is identified
4. [x] No path under `mcp servers/` is in the edit set

### Execution Rules

| Rule | Description |
|------|-------------|
| TASK-SEQ | Refusal, then pinned run, then test fixes, then gate, rebuild and review |
| TASK-SCOPE | The package, the contract's affected sections and this folder only |
| TASK-VERIFY | Both suites after each change, and a revert that fails each new test |
| TASK-EVIDENCE | Every ticked task names the command output that proves it |

### Status Reporting Format

`T### | done or blocked | files changed | both suites and their counts | open question for the operator`

### Blocked Task Protocol

Mark the task `[B]` in `tasks.md` with the reason and the failing output. Three failed fixes for the same symptom stop the loop: the orchestrator reports the error, the three attempts and a proposed next step to the operator, and waits.
<!-- /ANCHOR:ai-exec -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (failure list) --> Refusal --> Pinned run --> Test fixes --> Verify, rebuild, review
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | None | Refusal, Pinned run |
| Refusal | Setup | Verify |
| Pinned run | Setup | Verify |
| Verify | Refusal, Pinned run | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Low | Done: 45 failures listed on 9.0.2 |
| Core Implementation | Med | 2-3 hours |
| Verification | Med | 1-2 hours with the rebuild and review |
| **Total** | | **3-5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [x] Scratchpad copies of every changed file taken before the edit, two of them rebuilt from the final files when the rollback test found them missing
- [x] Not applicable: no feature flag, the rule is unconditional by the operator's decision
- [x] Not applicable: no monitoring, the server is local

### Rollback Procedure
1. Restore the eleven package files and the contract from the session scratchpad folder `p10-before/`, whose file names spell their paths
2. Delete the four files this phase created: `scripts/test-pinned.ts`, `tests/helpers/pinned-ffmpeg-static.ts`, `tests/helpers/pinned-ffprobe-static.ts` and `tests/packaging/test-pinned.vitest.ts`
3. Rebuild with `npm run bundle -- --all` and `npm run plugin`
4. Rerun `npm test` and `mcpb validate`
5. Tell the operator the MP4 rule is back to build-dependent

Once the operator commits this work, `git revert` of that commit replaces steps 1 and 2.

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---


---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
media-containers (policy) --+
                            +--> copy-then-encode (assertPortableMp4) --> runAttempts tools, media_repair
media-properties (probe) ---+                                        \--> runPipeline products
build cache --> test-pinned script --> vitest aliases --> whole suite on the pinned pair
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| Codec policy | None | `unportableMp4Codecs` | Assertion |
| Probe helper | None | `probeIntermediateCodecs` | Assertion |
| Assertion | Policy, probe | `assertPortableMp4` | Runner, silence copy |
| Pinned run | Build cache, shims | A suite result on 9.0.2 | Verification |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Refusal and its unit tests** - 1 hour - CRITICAL
2. **Pinned run** - 1 hour - CRITICAL
3. **Both suites green, rebuild, review** - 1-2 hours - CRITICAL

**Total Critical Path**: 3-4 hours

**Parallel Opportunities**:
- The drawtext probe fix and the fixture test fix are independent of the refusal
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Refusal in place | Unit tests pass on 6.0 | Implementation |
| M2 | Pinned run green | `npm run test:pinned` exits 0 on 9.0.2 | Implementation |
| M3 | Release ready | Gate, bundles, plugin and review all pass | Verification |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

### ADR-001: An MP4 copy that holds PCM or FFV1 counts as refused on every build

**Status**: Accepted

**Context**: ffmpeg 9.0.2, shipped on Apple Silicon, stores PCM audio and FFV1 video in MP4 by stream copy. ffmpeg 6.1 and 7.0, shipped on the other four platforms, refuse, and the tools re-encode. The operator chose on 2026-09-29 to re-encode like the other platforms.

**Decision**: After an attempt writes an MP4, M4A or M4V file, the server reads the codec of every stream. A PCM or FFV1 stream makes the attempt fail as a plain `PROCESS_FAILED`, so the next attempt runs, and a call with no attempt left fails. The silence tool's copy applies the same rule and, having no fallback, fails the same way ffmpeg 6 already fails there.

**Consequences**:
- One request gives the same MP4 on every platform, playable wherever AAC and H.264 play
- One extra ffprobe of a local temp file after each MP4 attempt, measured on the suite

**Alternatives Rejected**:
- An allowlist of MP4 codecs: every codec the table left out would re-encode, including copies the older builds keep today, which the operator did not ask for
- Keeping ffmpeg 9's copy: the operator chose against it

### ADR-002: The pinned run aliases the static packages in the test config only

**Status**: Accepted

**Context**: The resolver finds its bundled binaries through `ffmpeg-static` and `ffprobe-static`. `ffmpeg-static` honors an environment override, `ffprobe-static` has none, and the shipped server must not read a test variable.

**Decision**: `vitest.config.ts` aliases both packages to shims in `tests/helpers/` when `MEDIA_EDITOR_TEST_BIN_DIR` is set, and `scripts/test-pinned.ts` sets it after checking both binaries against the pinned digests.

**Consequences**:
- The whole suite, the resolver included, runs on the pinned pair with no change to shipped code
- A test that asserts the development package's own path sees the shim instead, and says so where it matters

**Alternatives Rejected**:
- Overwriting the binaries in `node_modules`: it changes a shared install and a failed run can leave it changed
- A server variable for the bundled path: it would put a test seam into the shipped resolver

### Executor note

The parent plan dispatched code phases to DeepSeek. This phase is small and rests on context the orchestrator already holds, so the orchestrator writes it and the read-only review goes to a D6 route, which keeps the rule that no model reviews its own code.

---
