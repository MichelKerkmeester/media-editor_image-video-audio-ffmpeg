---
title: "Tasks: Phase 7: desktop extension"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "desktop extension tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 7: desktop extension

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

One task is one file or one target build, so each maps to one DeepSeek dispatch. T015 is the operator's. Paths are relative to `AI Systems/Media Editor/mcp server/`.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] T001 Spike: stage darwin-x64 and linux-x64 builds on the operator's Mac with npm platform flags, run `file` on the three binaries, and record whether a CI matrix is needed (`decision-record.md` ADR-001) [EVIDENCE: 2026-09-29 on this Mac (node 26.8.2, npm 11.19.1): `npm_config_platform=linux npm_config_arch=x64 npm ci --omit=dev --os=linux --cpu=x64 --libc=glibc` exit 0 with ELF x86-64 for ffmpeg, the sharp module and libvips; the win32 run exit 0 with PE32+ x86-64; without `--libc=glibc` the Linux sharp packages are skipped. One host builds all five, no CI matrix. ADR-001]
- [x] T002 Add `@anthropic-ai/mcpb` as a dev dependency with `npm install` inside the package (`package.json`) [EVIDENCE: `@anthropic-ai/mcpb` 2.1.2 in `devDependencies`; `node node_modules/@anthropic-ai/mcpb/dist/cli/cli.js validate manifest.json` runs and exits 0]
- [x] T003 Generate `icon.png` from `AI Systems/Media Editor/Favicon.jpg` with sharp (`icon.png`) [EVIDENCE: `icon.png` is PNG 512 x 512 RGB, resized with lanczos3 from the 256 x 256 `Favicon.jpg`, because `mcpb validate` recommends 512 x 512; the manifest test reads the IHDR size]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 `manifest.json` with server config, folder settings, compatibility and the tool list (`manifest.json`) [EVIDENCE: manifest 0.3 with `dist/index.js`, `--output-dir` then the folder list last, 38 tools with their registry first sentences, `platforms` darwin, win32 and linux, `node >=20.9.0`; `mcpb validate` exit 0]
- [x] T005 Manifest test: tool list equals the registry, folder settings present (`tests/packaging/manifest.vitest.ts`) [EVIDENCE: `tests/packaging/manifest.vitest.ts` 13 tests pass, including the reference host expansion fed into the real `loadConfig` (two folders, an empty output setting, a folder named `Clips: 2026`); moving the folder list before `--output-dir` fails 4 of them and editing one tool description fails 1]
- [x] T006 `LICENSE`, `THIRD_PARTY_NOTICES` and `licenses/` per contract section 10, licence texts copied from the pinned packages and build releases (`LICENSE`, `THIRD_PARTY_NOTICES`, `licenses/`) [EVIDENCE: `LICENSE` (MIT, Michel Kerkmeester), `THIRD_PARTY_NOTICES` holding both upstream LICENSE files byte for byte (checked with a Python `in` on the bytes), and `licenses/` with the SDK, zod, sharp, libvips, ffmpeg-static and ffprobe-static texts plus one licence text per pinned build in `licenses/ffmpeg-builds/`. ADR-004]
- [x] T007 Build script with target flags, pruning, notices check and size budget, with its test (`scripts/build-bundle.ts`, `tests/packaging/build-bundle.vitest.ts`) [EVIDENCE: split into `scripts/bundle/targets.ts`, `artifacts.ts`, `notices.ts` and `scripts/build-bundle.ts`, with `tests/packaging/targets.vitest.ts` (14), `artifacts.vitest.ts` (17) and `notices.vitest.ts` (16); mutations caught: Linux arm64 without `--libc`, no deep copy, no size cap, no binary digest check, any zip entry list, a leftover build folder, a missing version, a second arch folder, a README with no licensing section and a CRLF heading. `artifacts.vitest.ts` later grew to 22 with the native and packed-file checks]
- [x] T008 Build and validate darwin-arm64 (`dist-bundles/media-editor-darwin-arm64.mcpb`) [EVIDENCE: `npm run bundle -- --all` exit 0: `media-editor-darwin-arm64.mcpb 70319714 bytes`; `mcpb validate` on its packed manifest exit 0, `platforms` `['darwin']`]
- [x] T009 Build and validate darwin-x64 (`dist-bundles/media-editor-darwin-x64.mcpb`) [EVIDENCE: same run: `media-editor-darwin-x64.mcpb 65748895 bytes`; packed manifest validate exit 0, `['darwin']`]
- [x] T010 Build and validate win32-x64 (`dist-bundles/media-editor-win32-x64.mcpb`) [EVIDENCE: same run: `media-editor-win32-x64.mcpb 73610195 bytes`; packed manifest validate exit 0, `['win32']`]
- [x] T011 Build and validate linux-x64 (`dist-bundles/media-editor-linux-x64.mcpb`) [EVIDENCE: same run: `media-editor-linux-x64.mcpb 73117142 bytes`; packed manifest validate exit 0, `['linux']`]
- [x] T012 Build and validate linux-arm64 (`dist-bundles/media-editor-linux-arm64.mcpb`) [EVIDENCE: same run: `media-editor-linux-arm64.mcpb 64669717 bytes`; packed manifest validate exit 0, `['linux']`]
- [x] T013 Archive allow-list check and `file` check on each bundle's binaries (`tests/packaging/bundle-contents.vitest.ts`) [EVIDENCE: `tests/packaging/bundle-contents.vitest.ts` 48 tests pass, none skipped: allow-list, one ffprobe, own sharp packages, pinned digests, `file` on ffmpeg, ffprobe, the sharp module and libvips per bundle, every notice, and the unpacked darwin-arm64 bundle started over stdio (39 tools after the phase 8 repack, `media_health` source `bundled` inside the bundle, `image_resize` to 32 px). The linux-x64 file put in the linux-arm64 slot fails 4 of them]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T014 Full package gate on the final state [EVIDENCE: `bash gate.sh` exit 0, rerun 2026-09-29 on the final state after phase 8 repacked the five bundles: tsc 0, `Test Files 81 passed`, `Tests 1694 passed | 4 skipped (1698)`, both greps empty, headers, 100-column check, ids and em dashes clean, alignment 0 findings over 170 files, `GATE: PASS`]
- [ ] T015 Operator installs one bundle on a clean machine, sets the folders and runs `media_health` and `image_resize`. The result goes in the `goal.md` log
- [x] T016 Sizes of all five bundles recorded in `implementation-summary.md` [EVIDENCE: the five sizes of the final pack are in `implementation-summary.md`; the largest is win32-x64 at 73,621,223 bytes against the 150,000,000-byte budget. T008 to T012 keep the sizes of the first pack, before phase 8 added one tool]
- [x] T017 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/007-desktop-extension --strict` [EVIDENCE: `Summary: Errors: 0  Warnings: 0`, `RESULT: PASSED` on 2026-09-29 after the final-number update]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [ ] All tasks marked `[x]`
- [ ] No `[B]` blocked tasks remaining
- [x] Package gate green on the final state, rerun by the orchestrator [EVIDENCE: T014]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- **Specification**: See `spec.md`
- **Plan**: See `plan.md`
- **Acceptance criteria**: See `acceptance-criteria.md`
- **Contract**: See `../001-tool-contract/contract.md`
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

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: spec.md section 4 holds REQ-001 to REQ-009, with REQ-003 aligned to contract 10.1 through ADR-004]
- [x] CHK-002 [P0] Technical approach and execution model defined in plan.md [EVIDENCE: plan.md sections 3 and 4 and the AI execution protocol, with the stack line, components and data flow updated at build time]
- [x] CHK-003 [P1] The approved `001-tool-contract/contract.md` sections this phase implements are named in plan.md [EVIDENCE: plan.md names contract 4.1, 6, 6.3 and 10 to 10.1; the 4.1 bare-path amendment is written back into the contract with a change-log row]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `npx tsc --noEmit` exits 0 [EVIDENCE: `tsc exit 0` in the final gate run of 2026-09-29]
- [x] CHK-011 [P0] The `: any` and untyped `catch` greps print nothing [EVIDENCE: the gate's `: any`, untyped `catch`, `'use strict'` and `shell: true` greps over `src`, `tests` and `scripts` print nothing]
- [x] CHK-012 [P1] Every failure surfaces as a `MediaError` carrying a contract error code [EVIDENCE: every build failure is a `MediaError` from `runStep`, `fetchArtifact`, `extractBinary`, `parseBuildArgs`, `checkBundleSize` or `buildBundle` (`PROCESS_FAILED`, `DOWNLOAD_FAILED`, `CHECKSUM_MISMATCH`, `INVALID_INPUT`, `INTERNAL` with a `reason`), and `main` prints each as one `BUILD FAILED` line]
- [x] CHK-013 [P1] MODULE headers, section dividers and naming follow the adopted rules (drift script or its recorded stand-in) [EVIDENCE: stand-in gate: MODULE headers, dividers, the 100-column check and the ids and em dash greps pass over `src`, `tests` and `scripts`, and the alignment script exits 0 on a tracked copy]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [ ] CHK-020 [P0] All acceptance criteria met
- [x] CHK-021 [P0] `npx vitest run` exits 0 on the full suite, not a filtered run [EVIDENCE: `vitest exit 0`, `Test Files 81 passed (81)`, `Tests 1694 passed | 4 skipped (1698)` in the final gate run of 2026-09-29]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a test [EVIDENCE: no folder picked: `manifest.vitest.ts` 'returns no configuration while the required folder list is missing'; spaces and colons: 'keeps a folder whose name has a colon and a space as one root', plus a cold start from `Extensión ü` with the root `Clips: café 2026` answering `media_health` (Windows names stay a smoke note); `mcpb validate` failure stops the build because `runStep` throws before `pack`; a missing binary: `checkNotices` names the missing ffmpeg or ffprobe and `findMissingNatives` names the missing sharp package (`artifacts.vitest.ts`); over budget: 'refuses a bundle over the size limit and reports the measurement'. Rosetta is a recommendation for the install guide, not a testable case]
- [x] CHK-023 [P1] Error paths assert the contract error code, not an stderr substring [EVIDENCE: packaging tests assert `code` and `details.reason` on the caught `MediaError` (`artifacts`, `targets`, `pinned-builds`); the notice checks assert the problem count, and no test reads stderr text]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each source defect this phase inherits (`../context/source-inventory.md` section G) is classified: `instance-only`, `class-of-bug`, `cross-consumer`, `algorithmic`, `matrix/evidence` or `test-isolation` [EVIDENCE: no source defect in `../context/source-inventory.md` section G belongs to packaging; the ffprobe-static platform gap of contract 6.3 is classified `matrix/evidence` and closed by the pinned build table (ADR-002)]
- [x] CHK-FIX-002 [P0] Same-class producers found by grep across `src/`, not only in the tool at hand [EVIDENCE: the stage-versus-packed-file gap the review found in the binary check (F1) was checked across the build: the sharp packages had the same gap (F3), and one `checkPackedBundle` closes both]
- [x] CHK-FIX-003 [P0] Consumers of any changed core helper rerun through the full suite [EVIDENCE: `src/core/config.ts` changed (bare-path roots); the full suite reran on the final state]
- [x] CHK-FIX-004 [P0] Path and filter-string handling has adversarial table tests for delimiter, joined-input, outside-root, no-op and fallback cases [EVIDENCE: `config.vitest.ts` covers a bare path, two bare paths, a mistyped flag that takes its value along, and an empty output setting; `manifest.vitest.ts` runs the MCPB reference expansion into `loadConfig` for two folders, a colon-and-space folder and an unset output folder]
- [x] CHK-FIX-005 [P1] Matrix axes (platform, codec or filter availability, input kind) and their row count listed before completion is claimed [EVIDENCE: matrix listed in `implementation-summary.md`: five targets by three checked binaries (ffmpeg, ffprobe, the sharp module with libvips) by two archive kinds (gzip, zip)]
- [x] CHK-FIX-006 [P1] Tests that read `MEDIA_EDITOR_*` variables also run with a hostile environment variant [EVIDENCE: phase 7 adds no read of a `MEDIA_EDITOR_*` variable; the review's colon-path finding on `MEDIA_EDITOR_ALLOWED_DIRS` is the documented contract 6.8 limit]
- [x] CHK-FIX-007 [P1] Evidence names the file list and gate output it was taken on, not a moving branch range [EVIDENCE: the summary names the file list and the gate run it was taken on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal machine paths in code or fixtures [EVIDENCE: no secret, token or personal path in `scripts/`, the manifest or the tests; the pinned URLs are public release links]
- [x] CHK-031 [P0] Every path parameter passes through the path guard before use [EVIDENCE: the build takes no user path; the server's folder settings reach `loadConfig` as roots and go through the phase 2 path guard, tested through the MCPB expansion]
- [x] CHK-032 [P1] `grep -rn "shell: true" src` prints nothing and no command line is built as one string [EVIDENCE: `grep -rn "shell: true" src scripts` prints nothing; `runStep` spawns with `shell: false` and an argument list]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec (file table, status), plan, tasks, acceptance criteria and ADR-001 to ADR-004 updated together at close]
- [x] CHK-041 [P1] TSDoc on every export, with `@throws` where it throws [EVIDENCE: every export of `scripts/bundle/*.ts`, `scripts/build-bundle.ts` and `src/core/pinned-builds.ts` has TSDoc, with `@throws` on each that throws]
- [ ] CHK-042 [P2] Package README explains installing from a `.mcpb` file
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: test output goes under the OS temp folder, and the build writes only `build/` and `dist-bundles/`, both ignored]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` holds only `.gitkeep`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 0/15 |
| P1 Items | 23 | 0/23 |
| P2 Items | 9 | 0/9 |

**Verification Date**: 2026-09-28
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Architecture decisions documented in decision-record.md, here or in the phase that owns them [EVIDENCE: `decision-record.md` ADR-001 to ADR-004]
- [x] CHK-101 [P1] All ADRs this phase relies on have a status [EVIDENCE: ADR-001 to ADR-004 are Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: each ADR scores its alternatives with a reason for each rejection]
- [x] CHK-103 [P2] Any contract amendment this phase needed is written back into `001-tool-contract/contract.md` [EVIDENCE: contract 4.1 amended with the operator's approval on 2026-09-29, with its change-log row]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Process timeout enforced as NFR-P01 states [EVIDENCE: NFR-P01: `media_health` answered 1,581 ms after a cold start of the unpacked darwin-arm64 bundle and about 240 ms on the next two starts, against the 5-second limit (outside Claude Desktop)]
- [x] CHK-111 [P1] Full suite runtime within the NFR-P02 budget [EVIDENCE: NFR-P02 is the bundle budget: the largest bundle is 73.6 MB against 150 MB, and `checkBundleSize` enforces it]
- [x] CHK-112 [P2] Slowest test named with its runtime [EVIDENCE: `tests/packaging/bundle-contents.vitest.ts` is the slowest file, about 15 s, most of it unzipping five bundles]
- [x] CHK-113 [P2] Runtime numbers recorded in implementation-summary.md [EVIDENCE: runtime numbers are in `implementation-summary.md`]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback procedure in plan.md section 7 checked against the files this phase created [EVIDENCE: `plan.md` section 7 lists every file this phase created and the six it modified with how each is restored, and deleting `build/` and `dist-bundles/` removes all build output]
- [x] CHK-121 [P0] Each bundle installs only on its declared platform (`compatibility.platforms`) [EVIDENCE: each packed manifest names only its own OS in `compatibility.platforms`, checked by `bundle-contents.vitest.ts` 'narrows the manifest to its own platform'; the manifest has no architecture field, recorded as a limitation]
- [ ] CHK-122 [P1] `media_health` in the smoke test reports the bundled ffmpeg and ffprobe
- [x] CHK-123 [P1] Operator notes for this phase written in implementation-summary.md [EVIDENCE: operator notes in `implementation-summary.md`: which file fits which machine, the unsigned warning, and the smoke steps]
- [ ] CHK-124 [P2] Packaging steps reviewed by the operator before the smoke test
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] Read-only MiMo review of path and filter handling completed, findings resolved [EVIDENCE: the MiMo review timed out at 40 minutes without a report, so the review ran again on GPT-6 Luna under D6: 2 P1 and 2 P2. F1 and F3 fixed at source with `checkPackedBundle` and tests; F2 rejected as the documented contract 6.8 limit; F4 moved to the smoke test]
- [x] CHK-131 [P1] Licence of every new dependency recorded for THIRD_PARTY_NOTICES [EVIDENCE: `licenses/node-modules.txt` lists every bundled package with its declared licence and `checkNotices` refuses an unlicensed one; the one new dev dependency, `@anthropic-ai/mcpb`, is MIT and not bundled]
- [x] CHK-132 [P2] Injection, path traversal and resource exhaustion cases reviewed [EVIDENCE: archive entries: exactly the pinned entry (`archive-entries` tests); traversal: no archive entry name reaches a path; exhaustion: the download is capped at the pinned size (`size-exceeded` test) and the bundle at 150 MB]
- [x] CHK-133 [P2] No user media or metadata leaves the machine [EVIDENCE: the build fetches only the ten pinned URLs, and the bundle contains no network code of its own; the server's network use stays the consented setup of phase 8]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: all phase 7 documents updated together at close]
- [x] CHK-141 [P1] Registered tool descriptions match `contract.md` [EVIDENCE: `manifest.vitest.ts` checks each manifest description equals the registry's first sentence; the registry descriptions come from the contract]
- [x] CHK-142 [P2] User-facing docs noted for `009-media-editor-integration` [EVIDENCE: handed to `009-media-editor-integration`: which bundle fits which machine, the unsigned warning and the folder list]
- [x] CHK-143 [P2] Handoff notes for the next phase written [EVIDENCE: handoff notes for `008-claude-code-plugin` in `implementation-summary.md`]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Michel Kerkmeester | Operator and product owner | [ ] Approved |  |
| Orchestrator (Claude Opus) | Technical lead, reruns every gate | [ ] Approved |  |
| MiMo v2.6 Pro | Read-only reviewer | [ ] Approved |  |
<!-- /ANCHOR:sign-off -->
