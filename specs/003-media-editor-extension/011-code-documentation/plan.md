---
title: "Implementation Plan: Phase 11: code-documentation"
description: "Write a README for each code folder and an architecture doc for the package from the code itself, check every claim against disk and by a D6 reviewer, and fix the build-script defect the docs exposed."
trigger_phrases:
  - "code folder readme plan"
  - "architecture doc plan"
  - "package root guard"
  - "documentation verification"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Phase 11: code-documentation

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown docs over a TypeScript package, NodeNext and strict |
| **Framework** | MCP SDK 1.31, zod 4, sharp, ffmpeg and ffprobe |
| **Storage** | None |
| **Testing** | vitest in two suites, `validate_document.py`, the package gate |

### Overview
Each README is written from the folder's files after reading them, in the sk-doc code-folder shape: numbered headings, a tree for a folder with subfolders and a complete file table for a flat one. `ARCHITECTURE.md` takes the import direction measured with grep, not assumed. Every count is checked against disk before a D6 reviewer checks the claims again. Documenting the build scripts exposed a defect that phase 10 fixed in only one of three scripts, so the whole class is fixed here with one shared guard.
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
- [x] Tests passing
- [x] Docs updated (spec/plan/tasks)
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Layered server: `index.ts` starts `server/`, which registers `tools/`, and every layer draws on `core/`.

### Key Components
- **`ARCHITECTURE.md`**: the whole package on one page, from the stdio entry point to the pinned bundles
- **Code-folder READMEs**: one per folder, each naming its files, boundaries and the suite that covers it
- **`scripts/package-root.ts`**: the one check every build script runs before any work

### Data Flow
A tool call enters through stdio, passes the registry's schema check, gets a tool context with the path guard and capability snapshot, runs one of four runners and returns a result the host reads. The architecture doc follows that path section by section.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

The package-root defect is a `class-of-bug` finding: one check copied into three scripts, fixed in one.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `scripts/package-root.ts` | New owner of the check | Create | `package-root.vitest.ts`, four wrong-folder shapes and the real root |
| `scripts/build-bundle.ts` | Read `package.json` unguarded | Call the shared guard | Returns 1 with its own message outside the root |
| `scripts/build-plugin.ts` | Read `package.json` unguarded | Call the shared guard | Returns 1 with its own message outside the root |
| `scripts/test-pinned.ts` | Guarded locally since phase 10 | Call the shared guard, drop the local copy | Its three `main` rows still pass |
| `src/` | `server-info.ts` reads its own `package.json` next to the module, never the working folder | Unchanged, not a consumer | `rg -n "package.json" src` finds only that read |

Required inventories:
- Same-class producers: `rg -n "package.json" scripts` finds the root check in the three scripts. The other reads run after the guard (`build-bundle.ts:153`, `build-plugin.ts:309`) or read packages inside `node_modules` (`notices.ts:178`).
- Consumers of changed symbols: `rg -n "PACKAGE_NAME|packageName|assertPackageRoot" scripts tests` finds only the new module, the three scripts, `package-root.vitest.ts` and two README rows.
- Matrix axes: the folder shape (no file, another package, not JSON, a list, the real root) against the three scripts.
- Algorithm invariant: a script does nothing before the guard, and the guard throws `MediaError` for every shape but the real root.
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
| Unit | `assertPackageRoot` and both build `main` functions outside the root | vitest |
| Integration | The whole package gate: tsc, both suites, greps, headers, widths, alignment | `gate.sh` |
| Manual | Every count and name in the docs against disk, then a D6 read-only review | `find`, `grep`, cli-pi |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| The finished server from phases 2 to 10 | Internal | Green | Nothing to describe |
| `validate_document.py` in sk-doc | Internal | Green | No format check for the docs |
| The D6 executor routes | External | Green | No independent claim check |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: the gate fails after the script change, or the operator rejects the docs
- **Procedure**: delete the 23 new READMEs and `ARCHITECTURE.md`, restore the fixture README from its scratchpad copy, delete `scripts/package-root.ts` and its test, and restore the three scripts' local checks
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:ai-exec -->
## AI EXECUTION PROTOCOL

### Execution model

| Role | Executor |
|------|----------|
| Docs, the guard and its tests | The orchestrator |
| Read-only review | The parent goal's D6 routes in order: `opencode-go/deepseek-v4.1-flash` max, `cline-pass/cline-pass/deepseek-v4.1-flash` xhigh, `openai-codex/gpt-6-luna` max, then `llmgateway/mimo-v2.6-pro` high |
| Any commit and the name-check amendment | The operator |

Each review runs from the repository root with `--mode json --tools read,grep,find,ls`, one brief per batch of docs so no answer reaches the output cap. Exit status proves nothing: read the report, then confirm each finding against the code before acting on it.

### Pre-Task Checklist

1. [x] The folder's files are read before its README is written
2. [x] A copy of each changed file is in the scratchpad before its first edit
3. [x] The acceptance row this task serves is identified
4. [x] No path under `mcp servers/` is in the edit set

### Execution Rules

| Rule | Description |
|------|-------------|
| TASK-SEQ | Architecture doc, then folder READMEs, then the guard, then checks and review |
| TASK-SCOPE | The package and this folder only |
| TASK-VERIFY | Validator and scans after each doc, the gate after the code change |
| TASK-EVIDENCE | Every ticked task names the command output that proves it |

### Status Reporting Format

`T### | done or blocked | files changed | check and its result | open question for the operator`

### Blocked Task Protocol

Mark the task `[B]` in `tasks.md` with the reason and the failing output. Three failed fixes for the same symptom stop the loop: the orchestrator reports the error, the three attempts and a proposed next step to the operator, and waits.
<!-- /ANCHOR:ai-exec -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (read code) ──► Docs ──► Guard fix ──► Verify (gate, review)
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | None | Docs |
| Docs | Setup | Guard fix, Verify |
| Guard fix | Docs, where the defect surfaced | Verify |
| Verify | Docs, Guard fix | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup | Med | 1 hour |
| Core Implementation | Med | 3 hours |
| Verification | Med | 1 hour |
| **Total** | | **5 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [x] Backup created: the fixture README's earlier copy is in the scratchpad
- [x] Feature flag configured: not applicable, docs and a build-time check
- [x] Monitoring alerts set: not applicable

### Rollback Procedure
1. Delete the new docs and restore the fixture README
2. Delete `scripts/package-root.ts` and `tests/packaging/package-root.vitest.ts`, and restore each script's local check
3. Rerun the package gate
4. Tell the operator, since nothing is committed

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A
<!-- /ANCHOR:enhanced-rollback -->

---
