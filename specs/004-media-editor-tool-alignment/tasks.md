---
title: "Tasks: Media Editor tool alignment"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "media editor tool alignment tasks"
  - "media editor router contract tasks"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Media Editor tool alignment

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

**Task Format**: `T### [P?] Description (file path)`. Paths are relative to `AI Systems/Media Editor/` unless they start with `AI Systems/` or `specs/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Operator chose B) the current branch (`main`, shared tree, no worktree)
- [x] T002 The pending `media files` rename and phase 012 edits landed as commit `d8cfca2e` before this change started
- [x] T003 Baseline: run every gate in `plan.md` section 5 and the retired-name inventory, save outputs and exit codes to `AI Systems/Media Editor/specs/004-media-editor-tool-alignment/scratch/baseline/` Done before the first edit, with one known gap: the playbook validator cannot run outside the repo, so its baseline came from a clean extraction
- [x] T004 Archive every file in the `plan.md` affected-surfaces table to `AI Systems/Media Editor/specs/004-media-editor-tool-alignment/scratch/pre-change.tar` Taken with `git archive HEAD` after the first edits started, which still holds the pre-change bytes because those files were clean at HEAD
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

### A. Router
- [x] T010 Create the contract from the `SKILL.md` section 2 router code, with Product Owner's reference frontmatter and ON-DEMAND metadata block, `### Smart Router Pseudocode` in Title Case (`sk-media-editor/references/router-contract.md`)
- [x] T011 Reconcile the contract block with `route_contract.py` per the `plan.md` reconciliation rule: add `$interactive`/`$int`, first-token precedence, an `INTERACTIVE` resource entry, tool groups in `TOOL_MAP`; add a fixture first for any behaviour change the 17 do not pin (`sk-media-editor/references/router-contract.md`, `benchmark/router/fixtures.json`)
- [x] T012 Rebind `TOOL_MAP`, `TOOL_VALUES`, `FALLBACK_MAP` and `RESOURCE_MAP` to the tool groups and the new reference names (`benchmark/router/route_contract.py`)
- [x] T013 Regenerate the `tool` and `resources` expectations from the contract and read each changed row (`benchmark/router/fixtures.json`)
- [x] T014 Write the differential gate: copy, table, behaviour and coverage parity, `load` stubbed, `media_tools_connected`/`verify_ffmpeg` re-bound per host state, `KERNEL_ROUTER_HEADING = "## 8. ROUTER CODE"`, `strip_comments` by `tokenize` (`benchmark/router/differential.py`)
- [x] T015 Run both gates from `run_fixtures.sh`, and document files, run and the tool-binding rule; remove the stray fence at line 76 since the file is open (`benchmark/router/run_fixtures.sh`, `benchmark/router/README.md`)

### B. References
- [x] T020 [P] Rename and rewrite tool first: the 8 `sharp` image tools, then the ffmpeg recipes as the fallback layer (`sk-media-editor/references/mcp-imagician.md` to `image-operations.md`)
- [x] T021 [P] Rename and rewrite tool first: 6 `audio_*` and 20 `video_*` tools, then the ffmpeg fallback (`sk-media-editor/references/mcp-video-audio.md` to `video-and-audio-operations.md`)
- [x] T022 [P] Write the catalogue from `mcp server/README.md` sections 4-5 and `mcp server/src/tools/**`: 39 tools with purpose, key parameters and defaults, `consent` (default `false`) and `CONSENT_REQUIRED`, the 15 error codes with recovery, settings, a partial row for bitrate compression and gap rows for audio trim, loudness normalization and CRF compress (`sk-media-editor/references/tools.md`)
- [x] T023 [P] `video_hls_ladder` first, ffmpeg pack second, v0.111 to v0.112 (`sk-media-editor/assets/hls-video-conversion.md`)

### C. Skill surfaces
- [x] T030 Section 2 pointer and router code removed; tables at 44-46, 124, 288-295 (header `Local tool`), 356-357; contract and catalogue rows in section 5; self-descriptions 366, 414, 425; `### ESCALATE IF`; the `:117` prefix defence; version bump (`sk-media-editor/SKILL.md`)
- [x] T031 [P] Command registry `Tool` column tool first, load tree 95-96 and 128-129, pointers 147 and 164 (`AGENTS.md`)
- [x] T032 [P] Sections 1 (six intents), 2, 3, 7, 8 (eight files), 12, and the `:328` prefix defence (`sk-media-editor/README.md`)
- [x] T033 [P] Ids, paths and the "drives the Imagician MCP server" descriptions at `description.json:3,12-13` and `graph-metadata.json:12,38-39,96-97,114-122,138,145-146`; keep `mcp-tooling` (`sk-media-editor/description.json`, `sk-media-editor/graph-metadata.json`)
- [x] T034 [P] The filename link at `skill-route-order/fallback-to-local-ffmpeg.md:87`, the eight scenarios citing non-existent titles, index rows `:556,559`, and the SHL-001 premise check (`sk-media-editor/manual-testing-playbook/`)
- [x] T035 [P] The two legacy links at 262-263 (`INSTALL-GUIDE.md`)

### D. Kernel and Knowledge
- [x] T040 Restructure to v0.8.0: upper-case H2 and Title Case H3, section 2 pointer, `## 7. PROJECT KNOWLEDGE CONSULTATION` (Product Owner table shape, eight documents), delivery protocol with `### Strict Sequence`, a Media Editor tool-delivery subsection, `### Export-Equivalent Paths` and the `HVR self-scan: N hard blockers. Fixed: <terms>. Kept with reason: <terms>.` line, consent parameter and `CONSENT_REQUIRED` near 226, legacy pointers 21, 224, 232, and `## 8. ROUTER CODE` (`claude project/Custom Instructions.md`)
- [x] T041 Rename two mirrors, add the catalogue mirror, bump the HLS mirror, each a byte copy of its source checked with `cmp` (`claude project/knowledge/`)
- [x] T042 Tree 14-20, `| Project Knowledge files | 8 |`, the line-53 paragraph, version lines (`claude project/README.md`)

### E. Declaration and gates
- [x] T050 Pairs 7 to 8 with the renamed keys and values, the contract under `unmirrored_sources` with Product Owner's reason, residency rows for sections 7 and 8, the whole-router row moved to `8 router code`, edited rows re-keyed with `resync_statement.py` under a fresh `PYTHONPYCACHEPREFIX` until it reports 0, scope-checked per pair (`AI Systems/z — Claude Project Sync Loop/systems.py`) Applied with `scratchpad/me/declare.py`, which rewrites only the media-editor block and re-keys from exact kernel spans, instead of `resync_statement.py`. A peer commit, `5023b914`, swept this block into HEAD before the operator committed the rest
- [x] T051 A carried reason for every new or changed unmoved row (`AI Systems/z — Claude Project Sync Loop/residency/backlog.md`)
- [x] T052 `RETIRED_NAMES` zero-tolerance scan over the pairs, `SKILL.md`, `AGENTS.md`, the kernel and both metadata files, with its own spelling list so `video-and-audio-operations` does not match; seven to eight; docstring; re-measure the tool-check `min_pairs` floor and record why it moved (`benchmark/gates/rule_parity.py`)
- [x] T053 [P] Rows 39, 40, 43, 76 to the new names, eight pairs, the scan (`benchmark/gates/README.md`)
- [x] T054 [P] The wrapper count against its five-row table (`benchmark/parity/README.md`) Operator chose all seven byte-identical copies: five wrappers documented, seven systems, the identity section rewritten to what the wrappers actually share
- [x] T055 [B] Run `carrier_query_evidence.py` after T050; for each replay whose surfaced set moved, print the walk whole, read it against what that replay is meant to show, and re-pin; stop and ask the operator before changing a red replay's blocking contract (`AI Systems/z — Claude Project Sync Loop/carrier_query_evidence.py`) Green HubSpot and Copywriter sets re-pinned: HLS v0.112, and the two retired pairs dropped with a comment. Asked the operator about the red fleet replay, who chose to drop its Media Editor site. Final run in the sandbox: all 9 checks PASS, exit 0
- [x] T056 Restate the pair and statement counts `record_claims.py` recomputes, dated, without renumbering historical rows (`AI Systems/z — Claude Project Sync Loop/episodes/hand-run/000-packet-record/goal.md`) Restated in both the ignored working copy, `specs/040-skill-to-project-sync/goal.md`, which `record_claims.py` reads first, and the committed snapshot. `record_claims.py` PASSED 58 claims

### F. Records and plugin
- [x] T060 Dated change record naming kernel v0.8.0 and Skill v0.8.0, the renames, the contract, the gates, and that the operator has not reviewed it (`SYNC.md`)
- [x] T061 [P] Version record; dated carriers stay unchanged (`sk-media-editor/changelog/v0.8.0.0.md`)
- [x] T062 Rebuild the plugin copy with `npm run bundle -- --target <key>` and `npm run plugin` (`mcp server/claude-plugin/skills/media-editor/**`) `npm run bundle -- --target darwin-arm64` and `npm run plugin` exit 0. Rebuilt again after the last skill edit, and `diff -rq` shows the copy identical

### G. Added by the operator during implementation
- [x] T063 A standalone repository README in the style of the Product Owner and Prompt Improver READMEs, replacing the symlink to the skill README, for the new public repository `media-editor_image-video-audio-ffmpeg` (`README.md`). Every number in it was read from the tree or from a command run on 2026-10-03
- [x] T064 A `.gitignore` for the nested repository that keeps `media files/` contents local except the three `.gitkeep` files, chosen by the operator (`.gitignore`)
- [x] T065 The retired-name scan tightened so `video-audio` must stand alone, because the repository name `image-video-audio-ffmpeg` carries it (`benchmark/gates/rule_parity.py`, `benchmark/gates/README.md`)
- [x] T066 Audit follow-up, Media Editor only: upper-case every numbered heading in `SKILL.md`, `README.md`, the six references and the HLS asset, recopy the six Knowledge mirrors byte for byte, add the four missing section separators in the video and audio reference, fix the README version, list comma and audio wording, and the `SKILL.md` voice-card loading levels, keywords and folder name. `validate_document.py` exit 0 on all nine, `rule_parity.py` exit 0
- [x] T067 Playbook results path points at the system-root `benchmark/reports/`, and `SID-001` passes only when the reply names `AGENTS.md`, proved absent from the Project load surface by grep (`manual-testing-playbook.md`, `skill-identity-handover/identity-handover.md`). Three skill scenarios link `references/*.md` instead of the Knowledge mirror names
- [x] T068 Eight new scenarios: `SCR-003` to `SCR-005`, `SRM-001`, `STV-002`, `STV-003`, `PRP-002` and `PRM-001`, indexed in the root with a dated coverage note and declared in `benchmark/grader/twin_divergence.py`. Playbook validator: 27 scenarios, 18 categories, 0 violations. Every playbook id is declared in the grader, and the grader's fixture run exits 0
- [x] T069 Changelog `v0.8.0.0` rewritten in the expanded shape with a 200-character description, covering the fleet alignment in packet 086 as part of the same release. `validate_document.py --type changelog` exit 0

### H. Follow-up added by the operator on 2026-10-04
- [x] T080 Remove Human Voice Rules: both references, both Knowledge cards, the kernel self-scan section, delivery step and attestation field, `ALWAYS` loading in the router, 22 fixture entries, the linter and its sample CSV, the build-plugin card test, the two vendored pairs and the self-scan residency row (`sk-media-editor/`, `claude project/`, `benchmark/`, `AI Systems/z — Claude Project Sync Loop/systems.py`). Evidence: router 22/22 and 66/66, `rule_parity.py` PASSED 5 rules, `check_report.sh` clean
- [x] T081 Server placement: `useOutputRoot`, `placedFileName`, `writeUnderFreeName`, `withPlacement`, the registry adding `fileName` and `subfolder` to every tool that takes `outputName` except `video_hls_ladder`, both writers following the layout (`mcp server/src/`). Evidence: `npx tsc --noEmit` exit 0
- [x] T082 `media_rename` and the probe `preview`, with the tool registered, listed in `manifest.json` and counted 40 (`mcp server/src/tools/media/rename.ts`, `preview.ts`, both probe tools). Evidence: `tests/server/registry.vitest.ts` lists 40 in contract order
- [x] T083 Tests: three new suites, the test client pinning `subfolder: true` for the numbered-folder suites, five direct-call tests pinned. Evidence: `npm run test:pinned` 86 of 86 files, 1749 passed, 4 skipped, exit 0. Red proof: forcing every call into a numbered folder and disabling the free-name counter failed 6 of 9 placement tests, restored to 9 of 9
- [x] T084 Naming and placement rules in `SKILL.md` (File Naming, Export protocol, ALWAYS 8, NEVER 8, gates), `AGENTS.md`, the kernel, `references/tools.md`, both operation references and the interactive flow, each mirror carrying the same text (`sk-media-editor/`, `claude project/`). Evidence: `diff` of each reference against its mirror empty
- [x] T085 Nine kernel statements resynced through `resync_statement.py`, rerun until it reported 0, every changed line inside the Media Editor block; `rule_parity.py` export rule pointed at the new shared sentence (`systems.py`, `benchmark/gates/rule_parity.py`). Evidence: third run reported 0 statements resynced
- [x] T086 Playbook: a naming turn in every scenario that writes, advice scenarios carrying the proposed name, `SED-002` and `SED-003`, twin grader unpaired set and README (`sk-media-editor/manual-testing-playbook/`, `benchmark/grader/`). Evidence: validator PASS scenarios=29 violations=0 warnings=0, `check_report.sh` exit 0
- [x] T087 Version 1.0.0.0: `SKILL.md`, the references, `claude project/README.md`, kernel H1 v1.0.0, `changelog/v1.0.0.0.md`, `SYNC.md` record, tool counts in every README and guide. Evidence: `validate_skill_package.py --strict` PASS, leaf manifests regenerated
- [x] T088 Root README rewritten in the marketing style with the three packagings and their setup first (`README.md`). Evidence: counts read from the tree, 86 test files, 6 references, 6 Knowledge files, the route object from `route_contract.py`
- [x] T089 All five Desktop bundles and the plugin rebuilt (`mcp server/dist-bundles/`, `mcp server/claude-plugin/`). Evidence: `npm run bundle -- --all` and `npm run plugin` exit 0, packaging tests pass
- [x] T090 Residency records and goal counts restated for 320 statements and 178 pairs (`residency/counts.md`, `residency/backlog.md`, both `goal.md` records). Evidence: in the sandbox clone `residency_report.py` exit 0, `record_claims.py` PASSED 58 claims
- [x] T091 `run_residency.sh` green after the follow-up. The kernel mode table was re-padded by a peer pass, and the operator chose to resync its declared statement to the padded form (`systems.py`). Evidence: in the sandbox clone `run_residency.sh media-editor` PASSED, exit 0
- [x] T092 Server code aligned with sk-code-opencode: `nodeErrorCode` moved to `core/errors.ts` and its three copies removed, `readableFileName` and `readableNameSchema` shared by placement and `media_rename`, typed narrowing instead of casts in registry dispatch, `media_rename` added to `TOOL_NAMES` and `TOOL_REQUIREMENTS`, eight code READMEs and `ARCHITECTURE.md` updated (`mcp server/src/`, `tests/`). Evidence: `tsc --noEmit` exit 0, `npm run test:pinned` 86 of 86 files, 1749 passed, 4 skipped, exit 0, every code folder README names every file in its folder, bundles and plugin rebuilt
- [x] T093 Guided setup: `references/setup.md` and its Knowledge mirror, the setup offer in the tool check of `SKILL.md`, `AGENTS.md` and the kernel, the kernel Knowledge table, the Interactive Intelligence recovery line, `PRO-002` and the updated `STV-001`, the release link in `INSTALL-GUIDE.md`, `USER-GUIDE.md` and the root README, the seventh pair and three resynced statements in `systems.py`, both goal records restated to 179 pairs, leaf manifests, changelog and `SYNC.md`. Evidence: in the sandbox clone parity PASSED 7/7, residency, pair divergence, rule parity and record claims PASSED. `validate_skill_package.py --strict` and `ci-skill-root-metadata.cjs` exit 0. Playbook PASS 30 scenarios. Packaging tests 139 passed, 2 skipped
- [x] T094 Version 1 for the three public systems, at the operator's request: Media Editor, Product Owner and Prompt Improver each now ship Skill 1.0.0.0 and kernel 1.0.0, every earlier release moved to 0.(minor+1).patch, changelog files renamed, frontmatter, `SYNC.md`, READMEs and the 52 spec packets that cite those versions renumbered, and the server, extension and plugin set to 1.0.0. Playbook revisions, example versions, library versions, other systems' versions and captured evidence kept. Evidence: 1,552 rows reviewed by DeepSeek V4.1 Flash max, two wrong attributions overridden; 29 of the 52 packets pass `validate.sh --strict` and the other 23 fail only on rules that failed on the original files
- [x] T095 Public history of the three repos rewritten with `git filter-repo` (version tokens and four long subjects), trees identical, old heads kept as `refs/pre-rewrite/main`, and 138 authored hash citations repointed in 35 files, the Prompt Improver collector self-test among them. Two Sync Loop statements resynced to the padded Product Owner and Prompt Improver kernel tables (`systems.py`). Evidence: `selftest.py` all checks passed; in the sandbox clone parity, residency and pair divergence pass for all three systems, `record_claims.py` 58 claims, `carrier_query_evidence.py` all checks PASS
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T070 Rerun every baseline gate from the final state, read output and exit status, and report the delta against `scratch/baseline/` Sandbox at HEAD `5424531a` plus this change as `28390ba4`. Router, rule parity, Media Editor parity, residency, pair divergence, `residency_report.py`, `record_claims.py`, carrier evidence and the playbook validator all exit 0. `npm test` went from 204 failures to 203, none new. Six other systems fail one parity check and four fail residency, all from peer commit `5424531a`
- [x] T071 Retired-name grep over `AI Systems/Media Editor/` and the Sync Loop, excluding `changelog/*`, dated `SYNC.md` entries, `benchmark/reports/2026-09-17--*` and both `THIRD_PARTY_NOTICES`: zero hits Zero live hits. Kept by design: the scan definition in `rule_parity.py` and its README, the upstream licence attribution in `mcp server/tests/fixtures/README.md`, and dated Sync Loop records (episode logs, verdicts, `runtime-register.md` seeded 2026-09-14, the ignored walk state)
- [x] T072 Negative proofs: a planted retired name, an edited kernel router line and a dropped residency row each make their gate exit 1 naming the cause, then are reverted Planted retired name: `rule_parity.py` exit 1. Edited kernel router line: `differential.py` exit 1 on copy parity. Dropped Media Editor section 8 row: `residency_check.py` exit 1 naming the unowned section. Each was reverted and reran at exit 0
- [x] T073 Voice check of every changed Markdown file: no em dash outside folder names, no semicolon, the HVR hard blockers 36 changed Markdown files: no em dash or semicolon in any added prose line. One pre-existing hard blocker, "seamless" in the HLS asset, reworded and recopied to its mirror
- [x] T074 Scoped diff review: only files in the affected-surfaces table changed; peer edits named, not absorbed 48 changed paths are this packet's, plus the six parity README copies the operator approved and `Media Editor/.gitignore`. Not absorbed: `Media Editor/LICENSE` and the peer kernel padding, since committed as `5424531a`
- [x] T075 Mark `acceptance-criteria.md` rows with evidence and run `validate.sh AI Systems/Media Editor/specs/004-media-editor-tool-alignment --strict` to `RESULT: PASSED` All eleven criteria Met. `validate.sh --strict` result recorded below the closure statement
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Every acceptance criterion `Met` with evidence
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- **Specification**: See `spec.md`
- **Plan**: See `plan.md`
- **Research**: See `research/research.md`
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

- [x] CHK-001 [P0] Requirements documented in spec.md (REQ-004 to REQ-011)
- [x] CHK-002 [P0] Technical approach defined in plan.md
- [x] CHK-003 [P1] Dependencies available: T001 and T002 answered by the operator (current branch; commit `d8cfca2e`)
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `differential.py`, `route_contract.py` and `rule_parity.py` parse and run on Python 3.9. Evidence: Python 3.9.6 ran `differential.py`, `route_contract.py` and `rule_parity.py`, exit 0 each
- [x] CHK-011 [P0] No gate prints a traceback. Evidence: No traceback in any captured gate output (`grep -l Traceback` over the final run found none)
- [x] CHK-012 [P1] Gates refuse with exit 2 on unreadable input, as the existing ones do. Evidence: `differential.py` with the contract missing prints `differential input unusable` and exits 2. `rule_parity.py` with no declaration beside it exits 2
- [x] CHK-013 [P1] Gate code follows the existing banner and `COMPONENT:` header layout. Evidence: `differential.py` opens with the `COMPONENT:` banner, and `run_fixtures.sh` carries `COMPONENT: ROUTE CONTRACT GATE`
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met. Evidence: AC-001 to AC-011 all Met in `acceptance-criteria.md`
- [x] CHK-021 [P0] Every baseline gate rerun from the final state with the delta reported. Evidence: T070: every baseline gate rerun from the final state, delta reported
- [x] CHK-022 [P1] Negative proofs in T072 each exit 1 naming the cause. Evidence: T072: three proofs, each exit 1 naming the cause
- [x] CHK-023 [P1] Each of the three host states exercised by `differential.py`. Evidence: `differential.py` binds tools connected, ffmpeg only and neither, 22 inputs each
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Finding class recorded: `class-of-bug` for the retired names and the router copies, `cross-consumer` for the declaration readers. Evidence: `class-of-bug`: the retired names and the three router copies, closed by the scan and the differential. `cross-consumer`: every reader of `SYSTEMS['media-editor']`, run green under CHK-FIX-003
- [x] CHK-FIX-002 [P0] Same-class producer inventory rerun at T071 with zero live hits. Evidence: T071 rerun on the final tree: zero live hits
- [x] CHK-FIX-003 [P0] Every reader of `SYSTEMS['media-editor']` run green: `rule_parity.py`, `validate_parity.py`, `pair_divergence.py`, `carrier_query.py` evidence, `residency_check.py`, `residency_report.py`, `record_claims.py`. Evidence: `rule_parity.py`, `validate_parity.py`, `pair_divergence.py`, `carrier_query_evidence.py`, `residency_check.py`, `residency_report.py` and `record_claims.py` all exit 0 on the sandbox
- [x] CHK-FIX-004 [P0] Not applicable: no security, path, parser or redaction code changes. Evidence: Not applicable, confirmed: no security, path, parser or redaction code changed
- [x] CHK-FIX-005 [P1] Differential matrix stated: modes x fixture inputs x 3 host states, with its row count. Evidence: 6 modes covered by 22 fixture inputs x 3 host states = 66 differential rows, all PASS
- [x] CHK-FIX-006 [P1] Gates run with a fresh `PYTHONPYCACHEPREFIX` so stale global bytecode cannot answer. Evidence: Every gate reran green under a fresh `PYTHONPYCACHEPREFIX` (`scratchpad/pyc.4uPW`)
- [x] CHK-FIX-007 [P1] Evidence pinned to a commit or an explicit diff range once the operator commits. Evidence: Pinned to the sandbox commit `28390ba4` over HEAD `5424531a`, holding exactly this change. To be re-pinned to the operator's commit once made
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secret, token or personal path enters a changed file. Evidence: Added lines across 51 changed files scanned for home paths, e-mail addresses and key or token values: none
- [x] CHK-031 [P0] No change under `mcp server/src/`. Evidence: `git status` shows no path under `mcp server/src/`
- [x] CHK-032 [P1] Consent wording in the catalogue matches `setup-ffmpeg.ts`: nothing downloads without `consent: true`. Evidence: `tools.md` matches `setup-ffmpeg.ts:147-149` (`consent` default `false`) and `:566-567` (no consent throws the plan)
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized with what shipped. Evidence: `spec.md` status, scope and files table, `tasks.md` T063 to T065 and this checklist updated to what shipped
- [x] CHK-041 [P1] Gate code comments carry the durable why, no packet or task ids. Evidence: Added comment lines in changed code scanned for packet, task, REQ, AC, ADR and CHK ids: none
- [x] CHK-042 [P2] `SYNC.md` record and changelog written. Evidence: `SYNC.md` 2026-10-03 entry and `changelog/v0.8.0.0.md` written
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Baselines and archives in `scratch/` only. Evidence: Baselines, the pre-change archive and fixture and kernel copies sit in `scratch/` only
- [x] CHK-051 [P1] `scratch/` cleaned before completion, keeping only what the evidence cites. Evidence: `scratch/` holds only what the evidence cites: `baseline/`, `pre-change.tar`, `fixtures.before.json`, `kernel-v0.7.0.md`, `run-gates.sh`
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 12 | 12/12 |
| P1 Items | 13 | 13/13 |
| P2 Items | 1 | 1/1 |

**Verification Date**: 2026-10-03 (implemented and verified, uncommitted)
<!-- /ANCHOR:summary -->
