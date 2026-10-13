---
title: "Implementation Plan: Phase 7: desktop extension"
description: "A spike on per-platform binaries decides the build shape, then one dispatch each for the manifest, icon, notices and build script, one build per target and the operator's smoke test."
trigger_phrases:
  - "desktop extension plan"
  - "mcpb build script"
  - "per platform binaries spike"
  - "clean machine smoke test"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 7: desktop extension

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 7 on Node 20.9 or later (the package `engines` range), MCPB manifest 0.3 |
| **Framework** | `@anthropic-ai/mcpb` CLI (`mcpb validate`, `mcpb pack`), sharp, `ffmpeg-static`, `ffprobe-static` |
| **Storage** | `dist-bundles/` build output, ignored by git |
| **Testing** | vitest manifest and bundle checks, `mcpb validate`, operator smoke install |

### Overview
The spike comes first because it decides whether one machine can build all five bundles or a CI matrix of native runners is needed. The manifest, icon, notices and build script are one dispatch each, and each target build is its own dispatch so a failure names one platform. The operator's clean-machine install closes the phase.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Phase 6 gate green with 38 tools
- [ ] Attribution plan in contract section 10
- [ ] Operator has named the clean machine and its platform

### Definition of Done
- [ ] Five bundles validated and within budget
- [ ] Notices complete
- [ ] Smoke test recorded
- [ ] ADR-001 accepted with the spike evidence
- [ ] `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Build pipeline: compile, stage, install for the target, prune, write the manifest, check, validate, pack

### Key Components
- **`manifest.json`**: Template with the folder settings and tool list, `compatibility.platforms` filled per target
- **`scripts/build-bundle.ts`**: Takes `--target <key>` or `--all`, runs the pipeline, fails on a digest mismatch, a missing notice or a size over budget
- **`THIRD_PARTY_NOTICES` and `licenses/`**: Both upstream copyright lines, the dependency index and every licence text (contract 10.1)
- **`src/core/pinned-builds.ts`**: The pinned ffmpeg and ffprobe build per platform, with archive and binary digests, shared with the next phase's `media_setup_ffmpeg`
- **Packaging tests**: Manifest tool list against the registry, archive contents against an allow list

### Data Flow
The build script compiles `src/` into `dist/`, copies it with the assets and notices into a staging folder, installs production dependencies for the target with install scripts off, places the pinned ffmpeg and ffprobe after checking both digests, prunes other platforms' ffprobe binaries, writes the notices and the target manifest, checks them, runs `mcpb validate` and `mcpb pack`, then checks the size. On install, Claude Desktop reads the manifest, asks for the folders and starts `node dist/index.js` with the settings passed in.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

The manifest's folder settings feed the configuration reader, so the manifest consumes contract section 6.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `manifest.json` folder settings | Producer of the folder values | Create | Manifest test and smoke test |
| `src/core/config.ts` | Consumer (phase 2) | Unchanged unless multi-folder passing needs arguments | Config test with repeated `--allowed-dir` |
| `ffmpeg-resolver.ts` | Finds the bundled binary | Unchanged | `media_health` in the smoke test |
| Registry | Source of the tool list | Unchanged | Manifest tool list equals the registry |

Required inventories:
- Bundle contents: list each archive and diff it against an allow list (no `tests/`, no `src/`, no dev dependencies)
- Platform binaries: `file` on each bundle's ffmpeg, ffprobe and sharp binaries reports the target platform and architecture
- Matrix axes: 5 targets by 3 native packages, 15 rows
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
| Unit | Manifest shape and tool list | vitest |
| Build | Each target bundle | `mcpb validate`, archive listing, `file` on binaries |
| Manual | Clean-machine install | Operator |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `@anthropic-ai/mcpb` CLI | External | Yellow | No validate or pack |
| Per-platform binary fetch | External | Red until the spike | No cross builds |
| CI runners, if the spike needs them | External | Yellow | Builds wait for runners |
| Operator's clean machine | Internal | Yellow | No smoke test |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A bundle fails validation or the smoke test
- **Procedure**: Delete `dist-bundles/` and `build/`, fix the manifest, the pinned table or the build script, and rebuild that target with `npm run bundle -- --target <key>`. Bundles, the stage and the download cache are build output and are git-ignored.
- **Files this phase created, all under `AI Systems/Media Editor/mcp server/`**: `manifest.json`, `icon.png`, `LICENSE`, `THIRD_PARTY_NOTICES`, `licenses/` (with `licenses/ffmpeg-builds/`), `src/core/pinned-builds.ts`, `scripts/build-bundle.ts`, `scripts/bundle/targets.ts`, `scripts/bundle/artifacts.ts`, `scripts/bundle/notices.ts`, `tsconfig.scripts.json`, `tests/core/pinned-builds.vitest.ts` and `tests/packaging/` (five files). Removing them all returns the package to its phase 6 state.
- **Files this phase modified**: `src/core/config.ts` and `tests/core/config.vitest.ts` (bare-path roots; restore from the contract 4.1 change-log row), `package.json` and `package-lock.json` (the `bundle` script and the mcpb dev dependency), `tsconfig.json` (the `scripts/` include), `.gitignore` (`build/`, `dist-bundles/`).
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
| Clean-machine smoke install | The operator |

Build dispatch shape, from the repository root:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/deepseek-v4.1-flash --thinking max --mode text --offline --tools read,grep,find,ls,edit,write,bash </dev/null > out.log 2> err.log
```

`perl -e 'alarm shift; exec @ARGV' 2400` is the 40-minute timeout, because neither `timeout` nor `gtimeout` exists on this machine.

Each prompt carries, in this order:

1. The child-dispatch preamble from `.skilled/skills/cli-external-orchestration/shared/references/child-dispatch-preamble.md`, first
2. The `code` persona from `.claude/agents/code.md`, inlined, since `pi -p` cannot resolve an agent path
3. One change: the task id from `tasks.md`, its one file or one tool with its test, and the `contract.md` section it implements
4. ALLOWED WRITE PATHS: `AI Systems/Media Editor/mcp server/**` and `AI Systems/Media Editor/specs/003-media-editor-extension/007-desktop-extension/`
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
Spike (binaries) --> manifest, icon, notices --> build script --> five target builds --> validate and size --> operator smoke
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Spike | Phase 6 | Build script |
| Manifest, icon, notices | Phase 6 | Build script |
| Build script | Spike, manifest | Target builds |
| Target builds | Build script | Smoke |
| Smoke | One bundle | 008-claude-code-plugin |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Spike | High | 3-5 hours |
| Manifest, icon, notices | Med | 3-4 hours |
| Build script and five builds | High | 5-8 hours |
| Smoke and verification | Med | 1-2 hours plus operator time |
| **Total** |  | **12-19 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] Notices file complete
- [ ] Five bundles validated
- [ ] Sizes recorded
- [ ] Operator machine ready

### Rollback Procedure
1. Uninstall the extension from Claude Desktop
2. Delete `dist-bundles/`
3. Fix and rebuild the failing target
4. Repeat the smoke test

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A, the extension writes only into the user's chosen output folder
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
spike --> build-bundle.ts
manifest.json, icon.png, THIRD_PARTY_NOTICES, licenses/, pinned-builds.ts --> build-bundle.ts
build-bundle.ts --> darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64
one bundle --> operator smoke test
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| Spike | None | Build method | Build script |
| manifest.json | Registry, contract section 6 | Manifest | Build script |
| build-bundle.ts | Spike, manifest | Bundles | Validation |
| Smoke test | One bundle | Install evidence | Phase 8 |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Spike** - 4 hours - CRITICAL
2. **Build script** - 3 hours - CRITICAL
3. **Five builds and validation** - 4 hours - CRITICAL
4. **Operator smoke** - operator time - CRITICAL

**Total Critical Path**: About 11 hours plus the operator's smoke test

**Parallel Opportunities**:
- Manifest, icon and notices can be built while the spike runs
- Target builds are independent once the script works, still one dispatch at a time
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Build method known | Spike result in ADR-001 | After T001 |
| M2 | First bundle | darwin-arm64 validated | After T008 |
| M3 | All five plus smoke | Five validated, smoke recorded | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

ADR-001 is in `decision-record.md`. The decision below is local to this plan.

### ADR-002: Packing stops on incomplete notices

**Status**: Accepted

**Context**: Bundles redistribute GPL-licensed ffmpeg builds and sharp's libvips, whose licences are unknown from the sources (inventory I.3 and I.4).

**Decision**: The build script refuses to pack when `THIRD_PARTY_NOTICES` names a licence file the stage lacks, or when a notice does not match the binaries in the stage.

**Consequences**:
- No bundle ships without its notices
- The notices must keep pace with dependencies. Mitigation: the script derives the package list from the staged `node_modules`

**Alternatives Rejected**:
- Notices as a manual release step: easy to skip
- One generic notice: does not meet per-licence obligations

---
