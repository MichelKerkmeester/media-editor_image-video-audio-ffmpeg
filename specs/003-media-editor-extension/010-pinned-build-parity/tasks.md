---
title: "Tasks: Phase 10: pinned-build-parity"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "task dependencies"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 10: pinned-build-parity

<!-- SPECKIT_LEVEL: 3 -->

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

Paths are relative to `AI Systems/Media Editor/mcp server/` unless given in full.

- [x] T001 List the suite's failures on the pinned darwin-arm64 build (`build/pinned-exp/`, ignored) [EVIDENCE: `1649 passed, 45 failed, 4 skipped (1698)`: 28 in `filter-escape.vitest.ts`, 9 PCM copies, 4 FFV1 copies, 3 repair cases and the fixture premise]
- [x] T002 Take scratchpad copies of every file this phase changes [EVIDENCE: scratchpad `p10-before/` holds the 11 files as they stood]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T003 The MP4 extensions and `unportableMp4Codecs` (`src/core/media-containers.ts`) [EVIDENCE: `MP4_FAMILY_EXTENSIONS`, `isMp4FamilyExtension` and `unportableMp4Codecs`, with a comment saying why ffmpeg 9 differs]
- [x] T004 `probeIntermediateCodecs` (`src/core/media-properties.ts`) [EVIDENCE: `probeIntermediateCodecs` reads every stream, so a second audio track is not missed]
- [x] T005 `assertPortableMp4`, run after every attempt (`src/tools/video/copy-then-encode.ts`) [EVIDENCE: `assertPortableMp4` runs after each attempt's ffmpeg run and before the attempt's own check, and throws a plain `PROCESS_FAILED` with `exitCode` 0 naming the refused codecs]
- [x] T006 The same check on every `runPipeline` product, which covers the no-silence copy (`src/tools/video/copy-then-encode.ts`) [EVIDENCE: `runPipeline` probes each product before its copy, and `remove-silence.ts` is unchanged because its copy runs through it]
- [x] T007 Unit tests for T003 to T006 [EVIDENCE: policy rows in `media-containers.vitest.ts`, two probe tests in `media-properties.vitest.ts`, and `assertPortableMp4`, runner and pipeline refusal tests in `copy-then-encode.vitest.ts`, 124 tests across the three files pass]
- [x] T008 The pinned run: `scripts/test-pinned.ts`, the `test:pinned` entry, the aliases in `vitest.config.ts` and the two shims [EVIDENCE: `scripts/test-pinned.ts`, `test:pinned` in `package.json`, the aliases in `vitest.config.ts` and the two shims. `test-pinned.vitest.ts` covers placement, a wrong digest, a failed fetch, and in a pinned run that both resolved binaries are the pinned pair by digest]
- [x] T009 The drawtext probe groups values by filter graph (`tests/core/filter-escape.vitest.ts`) [EVIDENCE: `expectEveryGraphHolds` requires every graph ffmpeg built to hold the values in order, so 28 tests pass on 9.0.2 and still pass on 6.0]
- [x] T010 The fixture test asserts the fixture (`tests/helpers/broken-media.vitest.ts`) [EVIDENCE: the test now asks whether the fixture can become a portable MP4 by copy on any build: ffmpeg refuses it, or the copy keeps `pcm_s16le`, which the server refuses]
- [x] T011 Contract amendments with a dated line (`../001-tool-contract/contract.md`) [EVIDENCE: 3.2 rule 5, 3.3.6, the 3.4 `remux` and `auto` rows and both `PROCESS_FAILED` rows amended, with a dated change log line naming the operator's approval]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T012 `npm test` and `npm run test:pinned` exit 0, and the package gate passes [EVIDENCE: `GATE: PASS` on the final state: tsc 0, `npm test` `1721 passed, 6 skipped (1727)`, `npm run test:pinned` on 9.0.2 `1723 passed, 4 skipped (1727)`, alignment 0 findings over 174 files]
- [x] T013 Each new test fails once with its fix reverted [EVIDENCE: 11 reverts each failed their tests: runner check (2), pipeline check (1), empty policy (7), family always true (7), first stream only (1), graph check off (28 on 9.0.2), aliases off (2 in a pinned run), no binary digest check (1), the runner check under the pinned run (18), the script guard without its catch (2) and a probe that returns no codecs on failure (1)]
- [x] T014 Rebuild the bundles and the plugin, `mcpb validate` on all five and `claude plugin validate` [EVIDENCE: five bundles repacked at 23:15, `mcpb validate` exit 0 on each and on the root with 39 tools, the same 70 JavaScript files in all five and byte-identical to a fresh build, `assertPortableMp4` in each, `claude plugin validate` exit 0 on the folder and on `plugin.json`]
- [x] T015 Read-only review on a D6 route, findings resolved [EVIDENCE: DeepSeek V4.1 Flash at max thinking through cli-pi on OpenCode Go, read-only. Finding 1 did not hold: the pinned suite with both override variables naming missing files passed. Finding 2 has no instance among the 32 call sites in 27 tool files. Both answers are in the goal log]
- [x] T016 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/010-pinned-build-parity --strict` [EVIDENCE: `Summary: Errors: 0  Warnings: 0`, `RESULT: PASSED`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [x] All tasks marked `[x]`
- [x] No `[B]` blocked tasks remaining
- [x] Both suites green on the final state, rerun by the orchestrator
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: spec section 4, REQ-001 to REQ-009]
- [x] CHK-002 [P0] Technical approach defined in plan.md [EVIDENCE: plan section 3 and ADR-001, ADR-002]
- [x] CHK-003 [P1] Dependencies identified and available (the pinned archives in `build/cache/`) [EVIDENCE: the pinned run placed 9.0.2 from `build/cache/`: `Pinned darwin-arm64 ffmpeg 9.0.2-https://www.martin-riedl.de`]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] Code passes the package gate: tsc, greps, headers, 100 columns, ids and em dashes, alignment [EVIDENCE: `GATE: PASS` on the final state: tsc 0, grep clean, headers ok, line length ok, no ephemeral ids, no em dashes, alignment 0 findings over 174 files]
- [x] CHK-011 [P0] No new console output from the server [EVIDENCE: no `console.` in the three changed server files. The script's own lines print from `scripts/`, which the server never loads]
- [x] CHK-012 [P1] A refused last attempt returns `PROCESS_FAILED` with every attempt's tail [EVIDENCE: 'fails and removes the folder when the only attempt keeps FFV1' asserts `PROCESS_FAILED` with `ffv1` in the tail. Combining the tails of several attempts is the runner's existing behavior, covered by its earlier tests]
- [x] CHK-013 [P1] Code follows the sk-code-opencode TypeScript rules the package adopted [EVIDENCE: alignment 0 findings over 174 files, headers ok, TSDoc with `@throws` on every new export]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [x] CHK-020 [P0] All acceptance criteria met [EVIDENCE: 13 of 13 rows `Met` in `acceptance-criteria.md`]
- [x] CHK-021 [P0] `npm test` and `npm run test:pinned` exit 0 on the final state [EVIDENCE: final gate: `npm test` `1721 passed, 6 skipped (1727)`, `npm run test:pinned` `1723 passed, 4 skipped (1727)`, both exit 0]
- [x] CHK-022 [P1] Edge cases of spec section 8 tested [EVIDENCE: non-MP4 never probed (`.mov`, `.mkv`, `.wav` rows), several audio streams (the second-track probe test), a failed probe (the new no-JSON test, which fails when the probe is made to return no codecs), a refused last attempt (the FFV1 runner test). The unsupported-platform stop is not unit tested, see the summary's limitations]
- [x] CHK-023 [P1] A missing archive and a wrong digest stop the pinned run [EVIDENCE: a 404 stops with `DOWNLOAD_FAILED`, a wrong binary digest with `CHECKSUM_MISMATCH`, and nothing is placed in either case]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each actionable finding has a finding class: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence`, or `test-isolation`. [EVIDENCE: the MP4 copy defect is `class-of-bug` across 15 copy-first video tools, `media_repair`, the concat join and the silence copy. Review finding 1 is `test-isolation`, finding 2 `cross-consumer`, the script guard `instance-only`]
- [x] CHK-FIX-002 [P0] Same-class producer inventory completed, or instance-only status proven by grep. [EVIDENCE: every stream copy in `src/` (29 grep hits for `'copy'` and `-c copy`) runs inside `runAttempts` or `runPipeline`, and `hls-ladder`, the only `runInOutputFolder` caller, copies nothing]
- [x] CHK-FIX-003 [P0] Consumer inventory completed for changed helpers, policies, schema fields, response fields, docs, and tests. [EVIDENCE: `assertPortableMp4` is called by the two runners only, `probeIntermediateCodecs` by `assertPortableMp4` only, the MP4 helpers by `assertPortableMp4` and their tests, and the pinned variable by `vitest.config.ts`, the two shims, the script and its test. The contract names the new behavior]
- [x] CHK-FIX-004 [P0] Security/path/parser/redaction fixes include adversarial table tests for delimiter, joined-input, outside-root, no-op, and fallback cases. [EVIDENCE: Not applicable: no security, path, parser or redaction fix. The codec policy has table tests over case, empty and non-MP4 extensions]
- [x] CHK-FIX-005 [P1] Matrix axes and row count are listed before completion is claimed. [EVIDENCE: axes: container (`.mp4`, `.m4a`, `.m4v`, `.mov`, `.mkv`, `.wav`), codec family (PCM, FFV1, other) and build (6.0, 9.0.2). Both suites run all 1,727 tests]
- [x] CHK-FIX-006 [P1] Hostile env/global-state variant executed when tests or code read process-wide state. [EVIDENCE: `npm run test:pinned` with `MEDIA_EDITOR_FFMPEG_PATH` and `MEDIA_EDITOR_FFPROBE_PATH` naming missing files passed with `1719 passed, 4 skipped (1723)`, before the last four tests were added. A rejected override stops resolution, so any test that read them would have failed]
- [x] CHK-FIX-007 [P1] Evidence is pinned to a fix SHA or explicit diff range, not a moving branch-relative range. [EVIDENCE: nothing is committed and the package is untracked, so the evidence is pinned to the file digests in the implementation summary]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No hardcoded secrets [EVIDENCE: a grep for keys, secrets, tokens and passwords in the new and changed files finds nothing]
- [x] CHK-031 [P0] The pinned run executes only binaries whose digest matches the pinned row [EVIDENCE: `extractBinary` checks each binary against its pinned `binarySha256` before placing it, and the pinned run asserts the resolved pair's digests. Reverting the binary check fails its test]
- [x] CHK-032 [P1] Not applicable: no auth surface [EVIDENCE: Not applicable: no auth surface]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec/plan/tasks synchronized [EVIDENCE: spec, plan, tasks and criteria all name the `runPipeline` design and the unchanged silence tool]
- [x] CHK-041 [P1] Code comments adequate [EVIDENCE: one comment per new constant group or guard, each giving the reason, and TSDoc on every export]
- [x] CHK-042 [P2] The package README names `npm run test:pinned` [EVIDENCE: Not applicable: the package has no README. The command is in `package.json` and plan section 2]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temp files in scratch/ only [EVIDENCE: temp files went to the session scratchpad, outside the repository]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` holds only `.gitkeep`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 15/15 |
| P1 Items | 23 | 23/23 |
| P2 Items | 9 | 9/9 |

**Verification Date**: 2026-09-29
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Architecture decisions documented in plan.md (ADR-001, ADR-002) [EVIDENCE: plan L3 section: ADR-001 and ADR-002]
- [x] CHK-101 [P1] All ADRs have status (Proposed/Accepted) [EVIDENCE: both `Accepted`]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: each ADR lists two rejected alternatives with reasons]
- [x] CHK-103 [P2] Migration path documented (if applicable) [EVIDENCE: Not applicable: no stored data. The behavior change is in the contract change log]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Development suite wall time grows by no more than 10 percent (NFR-P01) [EVIDENCE: dev suite 17.79 to 18.92 s over the last three gates, against 18.42 s before this phase, under 3 percent]
- [x] CHK-111 [P1] Pinned suite wall time recorded [EVIDENCE: pinned suite 18.64 to 19.71 s over the last three gates]
- [x] CHK-112 [P2] Not applicable: a local server [EVIDENCE: Not applicable: a local server]
- [x] CHK-113 [P2] Performance benchmarks documented [EVIDENCE: suite times recorded in the implementation summary]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure documented and tested [EVIDENCE: tested in a throwaway copy: restoring the snapshot and deleting the four new files gives tsc 0 and 1,698 tests, the count before this phase. Two plugin tests needed the sibling skill folder and passed once it was linked]
- [x] CHK-121 [P0] Not applicable: the rule is unconditional by the operator's decision [EVIDENCE: Not applicable: the rule is unconditional by the operator's decision]
- [x] CHK-122 [P1] Bundles and plugin rebuilt with the refusal [EVIDENCE: `assertPortableMp4` appears in `dist/tools/video/copy-then-encode.js` of all five bundles and of the plugin's server]
- [x] CHK-123 [P1] Runbook created [EVIDENCE: plan section 7 and the enhanced rollback give the steps, and the summary gives the commands]
- [x] CHK-124 [P2] Deployment runbook reviewed [EVIDENCE: Not applicable: no install step changed, so phase 7's install guide stands]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only review on a D6 route completed, findings resolved [EVIDENCE: see T015]
- [x] CHK-131 [P1] Dependency licenses compatible [EVIDENCE: no dependency added: `package.json` gained one script line]
- [x] CHK-132 [P2] OWASP Top 10 checklist completed [EVIDENCE: Not applicable: no new network surface. The pinned run reuses the bundle build's digest-checked download]
- [x] CHK-133 [P2] Data handling compliant with requirements [EVIDENCE: Not applicable: no user data. Temp files stay in the tool's own numbered folder]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: see CHK-040, and the parent phase map and goal log name this phase]
- [x] CHK-141 [P1] The contract amendments are dated and name the operator's approval [EVIDENCE: the 2026-09-29 change log line quotes "Re-encode like others" and records the approval]
- [x] CHK-142 [P2] User-facing documentation updated [EVIDENCE: Not applicable: no route or wording changed for users, and the contract carries the behavior]
- [x] CHK-143 [P2] Knowledge transfer documented [EVIDENCE: the implementation summary and the goal log]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Orchestrator (Claude Opus) | Technical lead, reruns every gate | [x] Approved | 2026-09-29 |
| Michel Kerkmeester | Operator, decided the MP4 rule | [x] Approved the rule | 2026-09-29 |
| D6 reviewer | Read-only reviewer | [x] Findings answered | 2026-09-29 |
<!-- /ANCHOR:sign-off -->


