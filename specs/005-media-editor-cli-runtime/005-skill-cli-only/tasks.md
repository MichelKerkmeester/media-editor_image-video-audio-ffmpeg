---
title: "Tasks: Phase 5: skill-cli-only"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "skill cli-only tasks"
  - "route gate tasks"
  - "skill cli verification checklist"
  - "plugin manifest tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 5: skill-cli-only

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:notation -->
## Task Notation

| Prefix | Meaning |
|--------|---------|
| `[ ]` | Pending |
| `[x]` | Completed |
| `[P]` | Parallelizable |
| `[B]` | Blocked |

**Task Format**: `T### [P?] Description (file path)`
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Read the approved mirror and route design and operator decisions OD-1 and OD-4 (`../001-deep-research/research/research.md`, `../001-deep-research/spec.md`) [Read research sections 9 and 11 and OD-1 and OD-4. `cli.md` is ON_DEMAND only, the Project binds the new host call false, and the mirrors stay transport-neutral]
- [x] T002 Inventory every MCP term in the skill and sort it into skill-only and mirrored (`sk-media-editor/`) [`rg -n -i "mcp|media_health|connected"` over `sk-media-editor/` sorted into skill-only files, the seven mirrored references, the `project-*` scenarios and history in `changelog/`]
- [x] T003 [P] Prepare a sandbox clone for the gates (`scratch/`) [`scratch` clone of the parent with the live Media Editor and Sync Loop trees replayed as one commit, rebuilt for each gate run]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Rewrite the skill's tool check and route order and add `references/cli.md` (`sk-media-editor/SKILL.md`, `sk-media-editor/references/cli.md`) [`SKILL.md` checks `media-editor health` and routes the command, then ffmpeg, then advice. New `references/cli.md`, its four-call example run verbatim into one folder]
- [x] T005 Make `tools.md` transport-neutral and give the one mirrored `setup.md` a section per surface, on both sides of each mirror pair (`sk-media-editor/references/`, `claude project/knowledge/`) [`tools.md` and `setup.md` carry the command beside the extension, five more references say available, all seven copied over their mirrors and checked by `cmp`]
- [x] T006 Update `router-contract.md` `choose_route` and the Python gates (`sk-media-editor/references/router-contract.md`, `benchmark/router/`, `benchmark/gates/`, `benchmark/grader/`) [`choose_route` gained `media_cli_available()` and `cli`, the kernel Router Code matches, `differential.py` has six host states, `rule_parity.py` the reworded phrases, `twin_divergence.py` the new SRO-001 note]
- [x] T007 Update the Sync Loop pairs and declared deviations (the Sync Loop's `systems.py`) [`references/cli.md` in `unmirrored_sources`, five residency statements moved through `resync_statement.py`]
- [x] T008 [P] Update the route-order playbook scenarios, both guides, the READMEs and `AGENTS.md` (`sk-media-editor/manual-testing-playbook/`, `AGENTS.md`) [SRO-001 renamed to `command-first.md`, 11 skill scenarios and the root playbook updated, `AGENTS.md`, both guides, three READMEs and `SYNC.md` updated]
- [x] T009 Drop `mcpServers` from the plugin, add `bin/media-editor`, and update the build script and packaging tests (`runtime/claude-plugin/.claude-plugin/plugin.json`, `runtime/scripts/build-plugin.ts`, `runtime/tests/packaging/`) [`plugin.json` has no `mcpServers`, `build-plugin.ts` refuses one, packaging tests assert the executable shim lists 40 tools from a scratch folder]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T010 Run router fixtures, the differential, `rule_parity`, parity, residency and `pair_divergence` in the sandbox clone (`scratch/`) [In a fresh sandbox clone: fixtures 22/22, differential 132/132, `rule_parity` 5 rules, parity 7/7, residency, `pair_divergence` 7 pairs, twin and `check_report` on the sample report, all exit 0]
- [x] T011 Run the playbook validator and the packaging tests (`sk-media-editor/manual-testing-playbook/`, `runtime/`) [Playbook validator PASS, 32 scenarios, 0 violations. Packaging 8 files, 149 passed and 2 skipped]
- [x] T012 Confirm with `rg` that no MCP route is left in the skill (`sk-media-editor/`) [The `rg` in implementation-summary.md finds no MCP route outside the mirrored references, the Project scenarios and history]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Manual verification passed [plugin shim `list` and `health` from a scratch folder, the `cli.md` four-call example run verbatim, `claude plugin validate` passed]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- **Specification**: See `spec.md`
- **Plan**: See `plan.md`
<!-- /ANCHOR:cross-refs -->

---

## Verification Checklist

<!-- ANCHOR:protocol -->
## Verification Protocol

| Priority | Handling | Completion Impact |
|----------|----------|-------------------|
| **[P0]** | HARD BLOCKER | Cannot claim done until complete |
| **[P1]** | Required | Must complete OR get user approval |
| **[P2]** | Optional | Can defer with documented reason |
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented in spec.md [spec.md REQ-001 to REQ-009]
- [x] CHK-002 [P0] Technical approach defined in plan.md [plan.md]
- [x] CHK-003 [P1] Mirror design approved, operator decision OD-4
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Python gates run without error [Every Python gate ran and exited 0 in the sandbox clone]
- [x] CHK-011 [P0] No code comment names a spec path, phase or task id [`rg` for spec paths, phase numbers and task ids over the changed code found none]
- [x] CHK-012 [P1] Every skill doc passes its format gate [`validate_skill_package.py` PASS and `validate_document.py` VALID on every changed skill doc. Four system docs keep the same blocking counts they had before]
- [x] CHK-013 [P1] Drafted text checked line by line by the sub-orchestrator [Every DeepSeek draft read in diff form, with fixes to `cli.md` (`outputName` is required), `SKILL.md` and `setup.md`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [acceptance-criteria.md AC-001 to AC-009 Met]
- [x] CHK-021 [P0] Router fixtures and differential pass with the CLI-first order [Differential 132/132 across six host states, fixtures 22/22]
- [x] CHK-022 [P1] Parity, residency and `pair_divergence` pass in the sandbox clone [Parity 7/7, residency PASSED, `pair_divergence` 7 pairs, in the sandbox clone]
- [x] CHK-023 [P1] Packaging tests pass with no `mcpServers` [Packaging 149 passed, 2 skipped, `grep -c mcpServers` prints 0]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] The route change is `cross-consumer`: skill, gates, playbook and plugin each consume the order. [Skill, router contract and kernel, gates, playbook and plugin all changed in this phase]
- [x] CHK-FIX-002 [P0] Inventory of MCP terms in the skill completed and sorted. [Inventory sorted in T002]
- [x] CHK-FIX-003 [P0] Every gate and scenario that names the route order is updated. [Every consumer in the research inventory changed, and the derived leaf manifests were regenerated]
- [x] CHK-FIX-004 [P0] Host states CLI present, ffmpeg only and neither are each covered by a fixture. [`cli available`, `cli without ffmpeg`, `ffmpeg only` and `neither` in `HOST_STATES`]
- [x] CHK-FIX-005 [P1] The surface by host state matrix is listed with its row count. [The matrix and its row count are in implementation-summary.md]
- [x] CHK-FIX-006 [P1] Gates run in a clean sandbox clone so a peer's tree does not decide the result. [A fresh clone for each gate run, never the live tree]
- [x] CHK-FIX-007 [P1] Evidence is pinned to explicit diff ranges in both repositories. [Media Editor `044df9c` and parent `805794e0` to the working tree]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets [None added]
- [x] CHK-031 [P0] The skill passes paths as JSON args, never through a shell-built string [`SKILL.md` and `cli.md` pass JSON by `--args-file` or a quoted heredoc and forbid joining shell strings]
- [x] CHK-032 [P1] The plugin grants no new permission [The manifest lost its server entry and gained nothing, the shim runs `node` on the shipped `dist/cli.js`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized [Tasks, criteria and summary updated together]
- [x] CHK-041 [P1] Mirror pairs byte-identical or declared deviations [`cmp` on all seven pairs, `cli.md` declared unmirrored]
- [x] CHK-042 [P2] Guides and READMEs describe the CLI route [`AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, the skill README and the plugin README describe the command route]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only [Gate clones and test folders lived in the session scratchpad]
- [x] CHK-051 [P1] scratch/ cleaned before completion [`scratch/` holds only `.gitkeep`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 13/13 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-04
<!-- /ANCHOR:summary -->

---
