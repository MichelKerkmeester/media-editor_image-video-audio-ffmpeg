---
title: "Implementation Summary"
description: "Every Media Editor surface now asks one question before the first write, a batch shares one folder across calls through targetFolder, and image_convert takes maxBytes."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "005-media-editor-cli-runtime/003-naming-and-placement-hardening"
    last_updated_at: "2026-10-04T16:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Built the naming gate, targetFolder and maxBytes, with tests, scenarios and a live smoke"
    next_safe_action: "Grade PED-001 and SED-004 in phase 006"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 90
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
# Implementation Summary

<!-- SPECKIT_LEVEL: 2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 003-naming-and-placement-hardening |
| **Completed** | 2026-10-04, except the graded real replies in AC-005 |
| **Level** | 2 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

### Phase 3: naming-and-placement-hardening

Every surface now asks one question before the first writing call, even when the request is clear. The question carries a proposed name for every output file and, for two or more inputs from one request, the choice between the export root and one numbered folder. Several files means per request, not per call. `media_rename` covers renaming afterwards only. ESCALATE 1 now fires when a request is ambiguous or will write a file.

The runtime gained `targetFolder` on every writing tool that takes placement. It names an existing `NNN - ` folder directly inside the export root, so the later calls of one batch land in the folder the first call made. `image_convert` gained `maxBytes` for JPEG, WebP and AVIF.

### Files Changed

All paths are under `AI Systems/Media Editor/` unless they name the Sync Loop.

| File | Action | Purpose |
|------|--------|---------|
| `claude project/Custom Instructions.md` | Modified | H1 v1.1.0, File Naming, Export Protocol, ALWAYS 9, ESCALATE 1, Strict Sequence steps 3 and 4 |
| `sk-media-editor/SKILL.md`, `AGENTS.md` | Modified | The same gate, per-request batches, `targetFolder` placement |
| `sk-media-editor/references/interactive-intelligence.md` and its Knowledge mirror | Modified | Core rule 7, output preferences, a new Batch question template, mode questions, location default |
| `sk-media-editor/references/tools.md` and its Knowledge mirror | Modified | `targetFolder`, the collision rule, `maxBytes` with 1 KB = 1,000 bytes |
| `sk-media-editor/references/image-operations.md`, `video-and-audio-operations.md` and their Knowledge mirrors | Modified | Same-class fix: the placement fields and the batch flow |
| `runtime/src/core/output-folder.ts` | Modified | `resolveTargetFolder` with the containment checks |
| `runtime/src/server/field-schemas.ts`, `tool-registry.ts`, `tool-context.ts` | Modified | `targetFolderField`, new `fileName` and `subfolder` descriptions, the conflict error, placement routing |
| `runtime/src/tools/image/convert.ts` | Modified | `maxBytes` quality search and the new description |
| `runtime/src/tools/**/*.ts` | Modified | Same-class fix: every writing tool's placement sentence names `targetFolder` |
| `runtime/tests/core/output-folder.vitest.ts`, `tests/tools/media/placement.vitest.ts`, `tests/tools/image/convert.vitest.ts` | Modified | Containment, batch, collision, conflict, failure, listing, description and `maxBytes` tests |
| `sk-media-editor/manual-testing-playbook/` | Modified | `PED-001` and `SED-004`, the root index, counts and waves |
| `benchmark/grader/twin_divergence.py` | Modified | `PED-001` and `SED-004` declared unpaired |
| `sk-media-editor/leaf-manifest.json`, `leaf-aliases.json` | Regenerated | The two new scenario files |
| `README.md`, `INSTALL-GUIDE.md`, `claude project/README.md`, `SYNC.md`, runtime READMEs and `ARCHITECTURE.md` | Modified | Kernel version, batch wording, `targetFolder`, dated change record |
| Sync Loop `systems.py` | Modified | Two kernel statements resynced |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

SWE 2 (`devin --model swe-2-max`) wrote the server TypeScript and tests in three runs: the build, then the review fixes with the same-class description sweep, then the race fix. DeepSeek V4.1 Flash drafted the wording in three batches and reviewed the code in three. The last review ran on llmgateway after opencode-go refused with a region error, and it found nothing. The orchestrator reviewed the wording, applied it and ran every proof. No model reviewed its own work.

Review outcome. Code, tests batch: 4 findings, 1 rejected because `successResult` copies `extras` into the top level (`runtime/src/core/result.ts:227-231`), 3 fixed. Code, source batch: 3 findings, 2 rejected (the tests were reviewed in the other batch, and the `fileName` wording is REQ-006 itself), 1 fixed (the `lstat` and `realpath` calls now map a race to a coded error, with a test SWE 2 showed fails on the old code). Follow-up: 0 findings. Wording: the orchestrator sent item I1 with the wrong line, core rule 3, which `rule_parity.py` pins verbatim, so its draft was discarded and rule 7 was written by hand. S5 and K4 broke the `ESCALATE IF` form, and S3, A3 and I5 sent every batch to a folder, so all of those were rewritten.

### Coverage matrix

| Surface | Inputs | Request | Calls | Before the first write | Placement | Covered by |
|---|---|---|---|---|---|---|
| Project | One | Clear | One | One question with the proposed name | Export root, `fileName` | PRO-001 |
| Project | One | Clear | Several | One question with the proposed name | Each call `fileName`, root by default | Wording only, no scenario |
| Project | One | Ambiguous | One | One question with the proposed name, plus what is ambiguous | Export root, `fileName` | PAI-001 |
| Project | One | Ambiguous | Several | One question with the proposed name, plus what is ambiguous | Each call `fileName`, root by default | Wording only, no scenario |
| Project | Two or more | Clear | One | One question with the proposed names and the place | One call writes all, `subfolder` per the answer | Wording only, no scenario |
| Project | Two or more | Clear | Several | One question with the proposed names and the place | First call `subfolder: true`, later calls `targetFolder`, or `subfolder: false` for the root | PED-001, placement tests |
| Project | Two or more | Ambiguous | One | One question with the proposed names and the place, plus what is ambiguous | One call writes all, `subfolder` per the answer | Wording only, no scenario |
| Project | Two or more | Ambiguous | Several | One question with the proposed names and the place, plus what is ambiguous | First call `subfolder: true`, later calls `targetFolder`, or `subfolder: false` for the root | Wording only, no scenario |
| Skill | One | Clear | One | One question with the proposed name | Export root, `fileName` | SED-002 |
| Skill | One | Clear | Several | One question with the proposed name | Each call `fileName`, root by default | Wording only, no scenario |
| Skill | One | Ambiguous | One | One question with the proposed name, plus what is ambiguous | Export root, `fileName` | SAI-001 |
| Skill | One | Ambiguous | Several | One question with the proposed name, plus what is ambiguous | Each call `fileName`, root by default | Wording only, no scenario |
| Skill | Two or more | Clear | One | One question with the proposed names and the place | One call writes all, `subfolder` per the answer | Wording only, no scenario |
| Skill | Two or more | Clear | Several | One question with the proposed names and the place | First call `subfolder: true`, later calls `targetFolder`, or `subfolder: false` for the root | SED-004, placement tests |
| Skill | Two or more | Ambiguous | One | One question with the proposed names and the place, plus what is ambiguous | One call writes all, `subfolder` per the answer | Wording only, no scenario |
| Skill | Two or more | Ambiguous | Several | One question with the proposed names and the place, plus what is ambiguous | First call `subfolder: true`, later calls `targetFolder`, or `subfolder: false` for the root | Wording only, no scenario |
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| No new error codes | `INVALID_INPUT` and `PATH_NOT_ALLOWED` with `details.reason` (`target-folder-with-subfolder-false`, `target-folder-name`, `target-folder-missing`, `target-folder-outside-export`, `max-bytes-format`, `max-bytes-unreachable`) keep the error table stable. This deviates from the spec's `errors.ts` row |
| `targetFolder` does not apply to `video_hls_ladder` | It writes a tree that must own its folder, and it already sets `outputPlacement: false` |
| A targeted folder returns `created: false` | `writeUnderFreeName` then moves a taken name to `-2`, `-3`, and both failure paths remove only a folder the call created |
| 1 KB = 1,000 bytes | Matches the decimal sizes a browser and an upload limit report. Stated in `tools.md`, the operation reference and the field description |
| The `maxBytes` search runs before any folder exists | A failure creates nothing and writes nothing, proven by test and by the live smoke |
| REQ-006 is met through the shared `fileName` field | Its description says the name is one the user confirmed, and a test checks it on every placement tool. Each tool's own description names the placement, not the gate |
| Scenario ids `PED-001` and `SED-004` | The grader's id shape is `[SP][A-Z]{2}-\d{3}`, so a Project scenario cannot carry `SED`. Both are declared unpaired because their prompts differ on purpose: the Project replays the live request, the skill asks through `$image` |
| Kernel v1.1.0 | Provisional. The operator sets the release number |
| No server guard against unconfirmed names | Operator decision OD-4 |
| The no-semicolon rule covers prose and comments | TypeScript statements keep the files' existing style |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

Evidence range: the Media Editor repository from `2749c54` to the working tree, and the parent repository from `0d9d802a` to the working tree. Nothing is committed.

| Check | Result |
|-------|--------|
| `npm run build`, `npm run typecheck` | Exit 0, exit 0 |
| `npm run test:pinned` | 86 files, 1,771 passed, 4 skipped, exit 0. The baseline was 1,749 passed, so 22 tests are new |
| `npx vitest run tests/packaging` | 8 files, 139 passed, 2 skipped, exit 0, after `npm run plugin` rebuilt the plugin skill copy |
| Playbook validator | 32 scenarios, 19 categories, 0 violations |
| `ci-skill-root-metadata` | Passed after `--fix` regenerated the leaf manifest |
| `validate_skill_package.py --strict` | PASS |
| Sandbox clone: parity, residency, `rule_parity`, `pair_divergence media-editor`, `record_claims` | All five PASSED in a fresh clone of the parent with the tree replayed as one commit: parity 7/7, residency, `rule_parity` 5 rules, `pair_divergence` 7 pairs, `record_claims` 58 claims. The first parity run failed on `claude project/README.md` still claiming kernel v1.0.0, which was fixed |
| `cmp` on the four changed mirror pairs and the setup pair | No difference |
| Twin grader on its sample report | PASSED |
| Kernel size | 26,262 characters before, 27,556 after |
| Live MCP smoke over stdio, the four live-bug PNGs | One folder `001 - webp-under-100kb` for all four calls, sizes 99,728, 70,670, 78,556 and 61,128 bytes, nothing in the export root. PNG with `maxBytes`, an unreachable cap and `../in` returned coded errors. A taken name became `first-shot-2.webp`. A 60,000-byte cap lowered quality from 80 to 47 and wrote 59,892 bytes |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **AC-005 is deferred to 006, pending operator upload and live runs.** The skill side changes again in 005, and the Project reply needs the uploaded kernel and Knowledge files. It is not Met here.
2. **The live Project is stale** until the kernel and four Knowledge files are uploaded again.
<!-- /ANCHOR:limitations -->

---
