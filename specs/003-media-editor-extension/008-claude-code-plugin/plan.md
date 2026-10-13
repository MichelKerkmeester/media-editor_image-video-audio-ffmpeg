---
title: "Implementation Plan: Phase 8: Claude Code plugin"
description: "A Node-runtime spike decides the server config shape, then one dispatch each for the plugin manifest, marketplace entry, skill copy step and media_setup_ffmpeg."
trigger_phrases:
  - "claude code plugin plan"
  - "plugin mcpServers bundle"
  - "skill copy at pack time"
  - "consent gated setup tool"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 8: Claude Code plugin

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript 7 strict on Node 20.9.0 or later (ADR-001), Claude Code plugin format |
| **Framework** | Claude Code plugins (`.claude-plugin/plugin.json`, `marketplace.json`), MCP SDK 1.x |
| **Storage** | The server's data folder, for a consented ffmpeg download |
| **Testing** | vitest, `claude plugin validate`, a `claude --plugin-dir` session |

### Overview
The spike installs a test plugin that references the darwin-arm64 bundle and checks whether the server starts without a system Node, which decides ADR-001. The plugin manifest, marketplace entry and skill copy step follow as one dispatch each. `media_setup_ffmpeg` is one dispatch with its test, using an injected fetch instead of the network, and one live download proves the real redirect path. Validation and a `--plugin-dir` session close the phase.

The phase implements contract 3.4 (the `media_setup_ffmpeg` schema and steps), section 5 (`CONSENT_REQUIRED`, `DOWNLOAD_FAILED` and `CHECKSUM_MISMATCH`), 6.5 (the `installed` lookup and its install record) and 10.5 (the download path and the licence notices a setup writes).
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Phase 7 bundles validated
- [x] Claude Code CLI available with `plugin validate` (2.1.284)
- [x] Pinned ffmpeg URLs and SHA-256 values chosen for each target (`src/core/pinned-builds.ts`)

### Definition of Done
- [x] `claude plugin validate` exits 0
- [x] A `--plugin-dir` session lists 39 tools
- [x] ADR-001 accepted with spike evidence
- [ ] Gate green, and `validate.sh` on this folder prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Plugin wrapper around the phase 7 bundle, plus one server-side tool

### Key Components
- **`plugin.json`**: Name, version, description and `mcpServers` per ADR-001
- **`marketplace.json`**: Lists the plugin for `claude plugin install`
- **`scripts/build-plugin.ts`**: Unpacks one target's bundle into `server/`, refuses a server that holds any link, and copies `sk-media-editor/` into `skills/media-editor/`
- **`setup-ffmpeg.ts` with `pinned-builds.ts`, `artifact-download.ts` and `zip-entry.ts`**: Consent check, pinned URL table, download with one allowed redirect under the server's time limit, SHA-256 checks, unpack into the data folder

### Data Flow
Claude Code reads `plugin.json` and runs the inline `node` command ADR-001 chose, with the session's project folder as the one allowed root, while the skill loads from `skills/media-editor/`. When the resolver finds no ffmpeg, the result names `media_setup_ffmpeg`. The model asks the user and calls the tool with consent only if the user agrees.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

`media_setup_ffmpeg` adds a network download, a new security surface, and the resolver gains one lookup location.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `setup-ffmpeg.ts` | New producer of a binary | Create | Consent and hash tests with an injected fetch, and one live download |
| `ffmpeg-resolver.ts` | Consumer of the data folder | Update the fourth step | Resolver test for the downloaded location |
| `manifest.json` and registry | Tool lists | Add one tool | Both lists hold 39 names |
| `sk-media-editor/` | Skill source | Unchanged, copied at pack time | Hash comparison test |

Required inventories:
- Network calls in `src/`: `grep -rnE 'fetch\(|https?\.get\(' src` lists only the default fetch in `setup-ffmpeg.ts` and `artifact-download.ts`
- Algorithm invariant: no downloaded byte reaches the resolver unless its SHA-256 matches the pinned value. Adversarial cases: wrong hash, truncated download, redirect to another host, missing consent, unknown platform
- Matrix axes: 5 targets by consent given or withheld
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
| Unit | Consent, hash check, unpack, resolver pickup | vitest with an injected fetch |
| Validation | Plugin folder | `claude plugin validate` |
| Manual | `--plugin-dir` session | Orchestrator and operator |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Claude Code CLI | External | Yellow | No validation |
| Phase 7 bundles | Internal | Yellow until phase 7 closes | Nothing to reference |
| Pinned ffmpeg builds | External | Yellow | No setup tool |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: The plugin fails validation, or the server cannot start from the plugin
- **Procedure**: Remove the plugin folder `claude-plugin/`, `scripts/build-plugin.ts` with `tests/packaging/build-plugin.vitest.ts` and the `plugin` script in `package.json`. Remove `setup-ffmpeg.ts`, `artifact-download.ts`, `zip-entry.ts` and `source-notice.ts` with their tests, the registry line in `all-tools.ts` and the tool entry in `manifest.json`, and set the tool count in the registry and manifest tests back to 38. Restore `pinned-builds.ts` without `redirectHost`, the resolver's pinned digests and the two ignore lines. The two-flag filter pattern in `capabilities.ts` stays, because the pinned ffmpeg 9 builds need it. Then repack the bundles with `npm run bundle -- --all`.
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
| `claude plugin validate` and the `--plugin-dir` session | The orchestrator, with the operator's Claude Code install |

Build dispatch shape, from the repository root:

```bash
SYSTEM_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1 PI_BLACKHOLE_PASSIVE=true perl -e 'alarm shift; exec @ARGV' 2400 pi -p "<prompt>" --model llmgateway/deepseek-v4.1-flash --thinking max --mode text --offline --tools read,grep,find,ls,edit,write,bash </dev/null > out.log 2> err.log
```

`perl -e 'alarm shift; exec @ARGV' 2400` is the 40-minute timeout, because neither `timeout` nor `gtimeout` exists on this machine.

Each prompt carries, in this order:

1. The child-dispatch preamble from `.skilled/skills/cli-external-orchestration/shared/references/child-dispatch-preamble.md`, first
2. The `code` persona from `.claude/agents/code.md`, inlined, since `pi -p` cannot resolve an agent path
3. One change: the task id from `tasks.md`, its one file or one tool with its test, and the `contract.md` section it implements
4. ALLOWED WRITE PATHS: `AI Systems/Media Editor/mcp server/**` and `AI Systems/Media Editor/specs/003-media-editor-extension/008-claude-code-plugin/`
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
Spike (Node in Claude Code) --> plugin.json, marketplace.json --> skill copy step --> media_setup_ffmpeg --> validate and plugin-dir session
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Spike | Phase 7 | plugin.json |
| Manifests | Spike | Skill copy |
| Skill copy | Manifests | Validate |
| media_setup_ffmpeg | Phase 7 | Validate |
| Validate | All | 009-media-editor-integration |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Spike | Med | 2-3 hours |
| Manifests and skill copy | Low | 2-3 hours |
| media_setup_ffmpeg | High | 4-5 hours |
| Validation | Low | 1-2 hours |
| **Total** |  | **9-13 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] ADR-001 accepted
- [ ] Pinned URLs and hashes reviewed
- [ ] Bundle path or URL filled in

### Rollback Procedure
1. Uninstall the plugin in Claude Code
2. Remove the plugin folder from the package
3. Remove `media_setup_ffmpeg` and its registry line
4. Rerun the gate

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: A consented download is removed by deleting the server's data folder, after which the resolver uses its other steps
<!-- /ANCHOR:enhanced-rollback -->

---

<!-- ANCHOR:dependency-graph -->
## L3: DEPENDENCY GRAPH

```
spike --> plugin.json (mcpServers shape)
build-plugin.ts --> skills/media-editor/ (copy of sk-media-editor)
setup-ffmpeg.ts --> ffmpeg-resolver.ts (data folder)
plugin folder --> claude plugin validate --> --plugin-dir session
```

### Dependency Matrix

| Component | Depends On | Produces | Blocks |
|-----------|------------|----------|--------|
| Spike | Phase 7 bundle | Node answer | plugin.json |
| plugin.json | Spike | Server config | Validation |
| build-plugin.ts | sk-media-editor | Skill copy | Validation |
| setup-ffmpeg.ts | Resolver | Downloaded binary | None |
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## L3: CRITICAL PATH

1. **Spike** - 3 hours - CRITICAL
2. **media_setup_ffmpeg** - 5 hours - CRITICAL
3. **Validation and session** - 2 hours - CRITICAL

**Total Critical Path**: About 10 hours

**Parallel Opportunities**:
- `media_setup_ffmpeg` does not depend on the plugin files and can follow the spike
- Choosing pinned builds and their hashes can run during the spike
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## L3: MILESTONES

| Milestone | Description | Success Criteria | Target |
|-----------|-------------|------------------|--------|
| M1 | Spike answered | ADR-001 records the result | After T001 |
| M2 | Plugin validates | `claude plugin validate` exit 0 | After T006 |
| M3 | 39 tools in a session | `--plugin-dir` session lists 39 | End of phase |
<!-- /ANCHOR:milestones -->

---

## L3: ARCHITECTURE DECISION RECORD

ADR-001 is in `decision-record.md`. The decision below is local to this plan.

### ADR-002: Download ffmpeg only with consent and a pinned hash

**Status**: Accepted

**Context**: Some platforms may have no fitting bundled ffmpeg, and the resolver names `media_setup_ffmpeg` as its last step (`../002-server-foundation/decision-record.md` ADR-002).

**Decision**: The tool refuses to download without `consent: true`, fetches only pinned https URLs and checks a pinned SHA-256 before unpacking into the server's data folder.

**Consequences**:
- No silent downloads
- Pinned builds age. Mitigation: the pins are one table, updated with a changelog note

**Alternatives Rejected**:
- Package-manager install: needs admin rights and differs per OS
- Latest-release download without a pin: no integrity check

---
