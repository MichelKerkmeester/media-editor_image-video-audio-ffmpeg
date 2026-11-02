---
title: "Implementation Plan: Media Editor tool alignment"
description: "Moves the Media Editor router into one contract file the skill, kernel and gate share, renames and rewrites the two integration references tool first, adds a 39-tool catalogue, restructures the kernel to the fleet shape, and moves the Sync Loop declaration, gates and evidence with it in one change."
trigger_phrases:
  - "media editor tool alignment plan"
  - "media editor router contract plan"
  - "media editor rename plan"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
# Implementation Plan: Media Editor tool alignment

<!-- SPECKIT_LEVEL: 2 -->

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | Markdown skill and Project documents, Python 3.9 gates, one TypeScript build script (unchanged) |
| **Framework** | Barter AI Systems skill package plus Claude Project kernel, Claude Project Sync Loop declaration |
| **Storage** | None. `systems.py` is the declaration every gate reads |
| **Testing** | `run_fixtures.sh`, a new `differential.py`, `rule_parity.py`, the Sync Loop parity, residency, divergence and evidence gates, the playbook validator, `npm test` in `mcp server/` |

### Overview
The router moves into `sk-media-editor/references/router-contract.md`, reconciled with `route_contract.py` so the two route the same way, and the kernel ends with that code minus comments under `## 8. ROUTER CODE`, held equal by a new `benchmark/router/differential.py` modelled on Product Owner's. The two integration references are renamed and rewritten tool first, a tools catalogue joins them, and the kernel, Knowledge mirrors, tables, metadata, playbook, Sync Loop declaration, gates and evidence pins move in the same change, because a stale path loads nothing and raises nothing.

Sources: `research/research.md` sections 6-12 for the change list; the four step-5 explorers for Product Owner's contract and gate (`AI Systems/Product Owner/sk-product-owner/references/router-contract.md:1-41`, `benchmark/router/differential.py:77-716`), the fleet kernel shapes (Product Owner kernel `:188-291`, Prompt Improver kernel `:94-98`), the Sync Loop consumers (`systems.py:1248-1676`, `residency_check.py:141-336`, `validate_parity.py:447-960`, `carrier_query_evidence.py:104-154,364-369`, `residency_report.py:224-321`, `record_claims.py`) and the plugin build (`mcp server/scripts/build-plugin.ts:230-237,300-354`). Each of those was read back at the cited lines before this plan used it.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [x] Problem statement clear and scope documented (`spec.md` sections 2-3)
- [x] Success criteria measurable (`spec.md` section 5, `acceptance-criteria.md`)
- [x] Dependencies identified (section 6 below)
- [ ] The pending `media files` rename and phase 012 edits are committed or set aside, so this change starts from a clean scope (task T002)
- [ ] The operator has chosen worktree or current branch (task T001)

### Definition of Done
- [ ] Every acceptance criterion `Met` with evidence
- [ ] Every gate in section 5 passes from the final state, against the baseline taken in T003
- [ ] Retired-name grep returns nothing outside the dated records
- [ ] `validate.sh AI Systems/Media Editor/specs/004-media-editor-tool-alignment --strict` prints `RESULT: PASSED`
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

### Pattern
Single-source router with derived copies, the fleet's router-in-kernel pattern (Copywriter, Deal Templates, Product Owner, Sales Direct Communication).

### Key Components
- **`references/router-contract.md`**: the one router, as commented Python under `### Smart Router Pseudocode`, with Product Owner's reference frontmatter and ON-DEMAND metadata block. Declared in `unmirrored_sources`, never mirrored, as Product Owner declares its own (`systems.py:1774-1778`).
- **`SKILL.md` section 2**: prose and judgement tables only, plus a pointer sentence naming the contract, in the shape of Product Owner `SKILL.md:148`.
- **Kernel section 2 and section 8**: section 2 keeps its prose and ends with a `### Smart Router Pseudocode` pointer ("The code itself is Section 8, Router Code, at the end of this kernel."); section 8 holds the contract's code with comments removed under the fleet intro sentence.
- **`benchmark/router/route_contract.py` and `fixtures.json`**: the executable oracle, rebound to the tool groups.
- **`benchmark/router/differential.py`**: copy parity, table parity, behaviour parity across the three host states, and coverage. It stubs `load` only and re-binds `media_tools_connected` and `verify_ffmpeg` per state, because those two decide the route.
- **Sync Loop declaration (`systems.py`)**: eight pairs, the contract unmirrored, residency rows for every kernel section including `7 project knowledge consultation` and `8 router code`.

### Router reconciliation rule
The skill block and `route_contract.py` disagree on more than tool names: the block lacks `$interactive` and `$int`, resolves two commands by model order where the contract takes the first token in the text, returns `intent` and `route` where the contract returns `mode`, `fallback` and `needs_disambiguation`, and has no `INTERACTIVE` resource entry. The rule: `SKILL.md` section 1's command table decides intent and precedence, the 17 fixtures encode it, and the contract block is brought to that behaviour. The block keeps its `route` field (tools, ffmpeg or advice), which the oracle does not model, and `differential.py` maps the block's output onto the oracle's fields through an adapter like Product Owner's `skill_route`. A behaviour change the fixtures do not already pin gets a new fixture first.

### Data Flow
`references/router-contract.md` (source) -> comment-stripped copy -> kernel `## 8. ROUTER CODE`; same source -> executed by `differential.py` -> compared with `route_contract.py` over `fixtures.json`. Skill sources -> byte copies -> `claude project/knowledge/` (8 files) -> declared in `systems.py` -> read by every Sync Loop gate. Skill folder -> `npm run plugin` -> `mcp server/claude-plugin/skills/media-editor/` (gitignored, rebuilt whole).
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:affected-surfaces -->
## FIX ADDENDUM: AFFECTED SURFACES

The change touches a shared declaration and shared gates, so every reader is inventoried. Paths are relative to `AI Systems/Media Editor/` unless they start with `AI Systems/`.

| Surface | Current Role | Action | Verification |
|---------|--------------|--------|--------------|
| `sk-media-editor/SKILL.md` | Router code and tables, `TOOL_MAP` all `ffmpeg` (`:157-163`) | Update: pointer, tables, counts, names | `differential.py` copy guard; retired-name grep |
| `claude project/Custom Instructions.md` | Router copy mid-section 2, sentence-case headings, v0.7.0 | Update: sections 1-8, v0.8.0 | `differential.py`; `run_residency.sh` |
| `benchmark/router/route_contract.py`, `fixtures.json` | Oracle bound to `imagician`/`video-audio` (`:65-72,91,106-113`) | Update; regenerate fixture expectations | `run_fixtures.sh` |
| `AI Systems/z — Claude Project Sync Loop/systems.py` | Media Editor pairs `:1252-1267`, residency `:1272-1675`, whole-router row `:1421-1428` | Update: pairs 7 to 8, contract unmirrored, rows re-keyed and added | `validate_parity.py`, `residency_check.py`, `pair_divergence.py` |
| `AI Systems/z — Claude Project Sync Loop/residency/backlog.md` | Reason per unmoved row, Media Editor block from `:88` | Update: reasons for new and changed rows | `residency_report.py` exits 0 |
| `AI Systems/z — Claude Project Sync Loop/carrier_query_evidence.py` | Expected carrier triples `:145-154,366-368` naming the old pairs | Re-derive from each replay's own walk after the rename, read against what each replay shows | `carrier_query_evidence.py` exits 0 |
| `AI Systems/z — Claude Project Sync Loop/episodes/hand-run/000-packet-record/goal.md` | States "184 declared pairs" and "318 declared statements" | Restate the counts `record_claims.py` recomputes, dated | `record_claims.py` exits 0 |
| `benchmark/gates/rule_parity.py` | Phrase counts per pair, "seven" denominators | Update: retired-name scan, eight, re-measured floor | `rule_parity.py` exits 0; scan proven red on a planted name |
| `claude project/README.md` | Tree `:14-20`, `| Project Knowledge files | 7 |` at `:46`, line-53 rationale | Update: tree, 8, paragraph, versions | `validate_parity.py` `check_manifest` |
| `sk-media-editor/manual-testing-playbook/` | One filename link, eight scenarios citing non-existent titles | Update anchors and index `:556,559` | playbook validator |
| `sk-media-editor/description.json`, `graph-metadata.json` | Old ids, paths and "drives the Imagician MCP server" text | Update | retired-name grep |
| `mcp server/claude-plugin/skills/media-editor/` | Gitignored copy still holding the old files | Regenerate whole (`copySkill` deletes first) | `tests/packaging/build-plugin.vitest.ts:281-286` |
| `mcp server/tests/**` | No test names a reference file | Unchanged | grep |
| `AGENTS.md`, `sk-media-editor/README.md`, `INSTALL-GUIDE.md`, `benchmark/router/README.md`, `benchmark/gates/README.md`, `benchmark/parity/README.md` | Prose naming old files, counts or rules | Update | retired-name grep; `check_manifest` for the README |
| `USER-GUIDE.md` | Clean | Unchanged | grep |

Required inventories, run at T003 and again at T070:
- Same-class producers: `grep -rIn -i 'imagician\|mcp-video-audio\|video-audio\|mcp video audio' "AI Systems/Media Editor" "AI Systems/z — Claude Project Sync Loop" --exclude-dir=node_modules --exclude-dir=dist`
- Consumers of the changed declaration: every reader of `SYSTEMS['media-editor']` (`rule_parity.py:133-153`, `validate_parity.py`, `pair_divergence.py:669`, `carrier_query.py:171,261,2021`, `residency_check.py`, `residency_report.py`, `record_claims.py:302-304`)
- Matrix axes for `differential.py`: 6 modes x the fixture inputs x 3 host states (tools connected, ffmpeg only, neither)
- Invariant: the kernel's section 8 equals `strip_comments(contract)` line for line and as a parsed syntax tree; `SKILL.md` holds no Python fence
<!-- /ANCHOR:affected-surfaces -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

Follow the ordered tasks in `tasks.md`. It owns the Setup, Implementation and Verification phase checkboxes and task state. Implementation phases run as change sets A to F inside one change, in the order the dependencies in section 6 allow.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Every gate runs at T003 for a baseline and again at T070 from the final state; the report states the delta. Output and exit status are both read.

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Oracle | Routing decisions, 17+ fixtures | `bash benchmark/router/run_fixtures.sh` |
| Differential | Contract block vs oracle, kernel copy, three host states | `python3 benchmark/router/differential.py` (new), also run by `run_fixtures.sh` |
| Rule parity | Phrase counts per pair, retired-name scan | `python3 benchmark/gates/rule_parity.py` from `AI Systems/Media Editor/` |
| Sync Loop | Pairs, manifest, versions, residency, divergence, evidence, record | `bash benchmark/parity/run_parity.sh`, `bash benchmark/parity/run_residency.sh`, `python3 "AI Systems/z — Claude Project Sync Loop/pair_divergence.py" media-editor`, `python3 .../residency_report.py`, `python3 .../carrier_query_evidence.py`, `python3 .../record_claims.py`, `bash .../check_criteria.sh` |
| Playbook | Package structure and anchors | `node .skilled/skills/sk-doc/sk-create-manual-testing-playbook/scripts/validate-playbook-package.cjs --repo-root "$PWD" --package "AI Systems/Media Editor/sk-media-editor/manual-testing-playbook"` |
| Server and plugin | 83 vitest tests including the plugin copy hash | `npm run bundle -- --target <key>`, `npm run plugin`, `npm test` in `mcp server/` |
| Voice | Changed Markdown | `python3 benchmark/grader/lint_replies.py` is for replies; changed docs get an HVR read against `hvr-core.md` and an em dash and semicolon grep |
| Negative | The new guards fail when they should | Plant a retired name in a scratch copy, edit one kernel router line, drop one residency row: each gate must exit 1 naming the cause |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Pending uncommitted `media files` rename and phase 012 edits in `AGENTS.md`, `INSTALL-GUIDE.md`, `SYNC.md`, `USER-GUIDE.md`, `rule_parity.py`, the kernel | Internal | Yellow | Diffs entangle; land them first (T002) |
| Product Owner `differential.py` as the model | Internal | Green | None, read only |
| `resync_statement.py` (rewrites every system's matching rows; stale global bytecode can skip rows) | Internal | Yellow | Run with a fresh `PYTHONPYCACHEPREFIX`, repeat until it reports 0, scope-check each pair |
| `carrier_query_evidence.py` replays read archived trees under today's declaration | Internal, shared | Yellow | A renamed pair changes what replays surface; re-derive sets from the walk and flag to the operator before changing a red replay's contract |
| Peer sessions in the shared tree and its gates | External | Yellow | Read the scoped diff before each gate run; findings from peer edits are not this change's |
| Plugin bundle for the local target (`dist-bundles`) | Internal | Green | `npm run plugin` refuses without it; build with `npm run bundle -- --target <key>` first |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: a gate that passed at baseline fails and cannot be fixed inside scope, or the operator rejects the change
- **Procedure**: before T010, archive every file in the affected-surfaces table to `scratch/` with `tar`; restore from it. Git is not used to roll back in this shared tree: no `reset --hard`, no checkout of paths other sessions may hold
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

```
Setup (T001-T004) ──► A Router ──► B References ──► C Skill surfaces ──► D Kernel and Knowledge ──► E Declaration and gates ──► F Records and plugin ──► Verify
```

| Phase | Depends On | Blocks |
|-------|------------|--------|
| Setup | Operator choices T001, T002 | Everything |
| A Router | Setup | C, D, E |
| B References | Setup | C, D, E |
| C Skill surfaces | A, B | D, F |
| D Kernel and Knowledge | A, B, C | E |
| E Declaration and gates | A-D | F, Verify |
| F Records and plugin | A-E | Verify |
| Verify | All | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Setup and baseline | Low | 0.5 hours |
| A Router (contract, reconciliation, oracle, differential) | High | 3-4 hours |
| B References (three rewrites, HLS) | Med | 2-3 hours |
| C and D (skill surfaces, kernel, Knowledge, playbook) | Med | 2-3 hours |
| E Declaration, gates, evidence, record | High | 2-3 hours |
| F and Verify | Med | 1-2 hours |
| **Total** | | **10-15 hours** |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:enhanced-rollback -->
## L2: ENHANCED ROLLBACK

### Pre-deployment Checklist
- [ ] `scratch/` archive of every affected file taken before the first edit
- [ ] Baseline gate outputs saved to `scratch/baseline/`
- [ ] No feature flag or monitoring applies: nothing deploys; the kernel upload is the operator's step

### Rollback Procedure
1. Stop at the failing gate and record its output
2. Restore the affected files from the `scratch/` archive
3. Rerun the baseline gates and confirm they match `scratch/baseline/`
4. Tell the operator what failed and what was restored

### Data Reversal
- **Has data migrations?** No
- **Reversal procedure**: N/A. The plugin copy is regenerated by `npm run plugin`, the declaration and documents come back from the archive
<!-- /ANCHOR:enhanced-rollback -->
