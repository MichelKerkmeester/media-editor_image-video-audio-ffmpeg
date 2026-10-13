---
title: "Implementation Summary"
description: "The package gate now runs the whole suite on the ffmpeg build each bundle ships, and an MP4 copy gives the same file on every platform."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/010-pinned-build-parity"
    last_updated_at: "2026-09-29T21:35:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed the pinned-build phase with both suites green and the bundles rebuilt"
    next_safe_action: "Operator: commit the Media Editor server and run the open smoke tests"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
# Implementation Summary

<!-- SPECKIT_LEVEL: 3 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 010-pinned-build-parity |
| **Completed** | 2026-09-29 |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The gate used to prove the server on ffmpeg 6.0, a build no user gets. `npm run test:pinned` now runs all 1,727 tests on the pinned build of the machine you run it on, and on this Mac that is the ffmpeg 9.0.2 the Apple Silicon bundle ships. Its first run found 45 failures, and this phase fixed each one at its cause.

### Phase 10: pinned-build-parity

People using the extension get one change. An MP4, M4A or M4V copy that would keep PCM audio or an FFV1 picture now re-encodes on every platform, as the operator chose on 2026-09-29 ("Re-encode like others"). Before, ffmpeg 9 on Apple Silicon kept those streams while the other four platforms re-encoded, so the same request gave a file that plays in fewer places. The check sits in the two runners every copy goes through, so the 15 copy-first video tools, `media_repair`, the concat join and the silence tool's copy all follow it without code of their own.

The maintainer gets a gate that tests what ships. The pinned run reuses or fetches the pinned archives, checks each binary against the digest table the bundles use and points the test config at them. Shipped code does not change: the swap lives in `vitest.config.ts` and applies only when the script sets its variable.

### Files Changed

Paths are relative to `AI Systems/Media Editor/mcp server/`, except the contract. Nothing is committed and the package is untracked, so each row carries the first 16 characters of the file's SHA-256 on the final state.

| File | Action | Purpose | SHA-256 |
|------|--------|---------|---------|
| `src/core/media-containers.ts` | Modified | The MP4 family and the codecs an MP4 copy may not keep | `41f4b429348546ed` |
| `src/core/media-properties.ts` | Modified | `probeIntermediateCodecs`, the codec of every stream in a temp file | `f9f7ab846824d951` |
| `src/tools/video/copy-then-encode.ts` | Modified | `assertPortableMp4`, run after each attempt and on each pipeline product | `bf523c1428417993` |
| `scripts/test-pinned.ts` | Created | Places the pinned pair and runs vitest on it | `4627f6e99acdf595` |
| `package.json` | Modified | The `test:pinned` script | `bf646a08eceda7c8` |
| `vitest.config.ts` | Modified | Aliases the two static packages to the shims in a pinned run only | `e8a47dc5d492b338` |
| `tests/helpers/pinned-ffmpeg-static.ts` | Created | Names the pinned ffmpeg | `040f0eb4e3979f8a` |
| `tests/helpers/pinned-ffprobe-static.ts` | Created | Names the pinned ffprobe | `fedb4f660ca7d2a8` |
| `tests/core/filter-escape.vitest.ts` | Modified | Every filter graph must hold every drawtext value | `7df2f1c2b995f4cc` |
| `tests/helpers/broken-media.vitest.ts` | Modified | Asserts what the mislabelled fixture is on any build | `f36d042c1aefb25f` |
| `tests/tools/video/copy-then-encode.vitest.ts` | Modified | The refusal in both runners | `4bf8c5e14c6b4326` |
| `tests/core/media-containers.vitest.ts` | Modified | The MP4 policy | `ba77b6ed5a130718` |
| `tests/core/media-properties.vitest.ts` | Modified | The probe, a failed probe included | `d5f712146a6fe8bc` |
| `tests/packaging/test-pinned.vitest.ts` | Created | Placement, a wrong digest, a failed fetch, a wrong folder and the resolved pair | `b3c0abd7d19019e7` |
| `../001-tool-contract/contract.md` (spec folder) | Modified | Dated amendments to 3.2, 3.3.6, 3.4 and section 5 | `922335032e3d77a0` |

`src/tools/media/remove-silence.ts` is unchanged because its copy runs through `runPipeline`.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

The suite ran on 9.0.2 first, and its 45 failures set the work: 28 drawtext tests that expected one filter graph where ffmpeg 9 builds two, and 17 tests where ffmpeg 9 kept a PCM or FFV1 copy in MP4. The orchestrator wrote the change, as the plan's executor note says, and a D6 route reviewed it read-only: DeepSeek V4.1 Flash at max thinking through cli-pi on OpenCode Go. Each new test was proven by reverting its fix, 11 reverts in all, and each failed its tests. The bundles and the plugin were rebuilt and validated, and the rollback was run in a throwaway copy of the package.

Checking the review turned up one more defect. Started from a folder without a `package.json`, the pinned script crashed with a raw `ENOENT` instead of its own message. The guard now treats any folder it cannot read as not the package root, with three tests over the shapes a wrong folder takes.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| An MP4 copy that holds PCM or FFV1 counts as refused on every build (ADR-001) | The operator chose "Re-encode like others", and a refusal lets each tool's existing fallback run, so no tool needed its own code |
| The pinned run aliases the two static packages in the test config only (ADR-002) | The shipped resolver keeps no test seam, and `ffprobe-static` has no override of its own |
| The refusal reads the temp file's extension | ffmpeg picks the container from that name, and all 32 call sites in 27 tool files keep the extension they wrote |
| The drawtext check requires every graph to hold every value | ffmpeg 9 builds the graph twice, and requiring each run to match is stricter than the single-run check it replaced |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Package gate, final state | PASS: tsc 0, grep clean, headers ok, line length ok, no ephemeral ids, no em dashes, alignment 0 findings over 174 files |
| `npm test` on ffmpeg 6.0 | Exit 0, `1721 passed, 6 skipped (1727)`, 18.92 s |
| `npm run test:pinned` on ffmpeg 9.0.2 | Exit 0, `1723 passed, 4 skipped (1727)`, 18.64 s |
| Hostile environment | The pinned suite with both override variables naming missing files: `1719 passed, 4 skipped (1723)`, run before the last four tests were added |
| Reverts | 11, each failing its tests: runner check (2), pipeline check (1), empty policy (7), family always true (7), first stream only (1), graph check off (28 on 9.0.2), aliases off (2), binary digest check off (1), runner check under the pinned run (18), guard without its catch (2), probe returning no codecs on failure (1) |
| Bundles | `mcpb validate` exit 0 on all five and on the root, 39 tools each, the same 70 JavaScript files, byte-identical to a fresh build |
| Plugin | `claude plugin validate` exit 0 on the folder and on `plugin.json`, 39 tools, server code identical to the bundles |
| Rollback | Throwaway copy: tsc 0 and 1,698 tests, the count before this phase. Two plugin tests needed the sibling skill folder and passed once it was linked |
| NFR-P01 | Dev suite 17.79 to 18.92 s over the last three gates against 18.42 s before, under 3 percent |
| D6 review | Two findings, both answered with evidence in the goal log |
| `validate.sh --strict` | `RESULT: PASSED` |

### Bundles

| Bundle | Bytes | SHA-256 |
|--------|-------|---------|
| darwin-arm64 | 70,333,562 | `b10eb2af6e2c28ee…` |
| darwin-x64 | 65,762,745 | `a193e5efc63756fa…` |
| win32-x64 | 73,624,044 | `b1faa518a0831c3c…` |
| linux-x64 | 73,130,992 | `e580b61fe021ad72…` |
| linux-arm64 | 64,683,567 | `321a5339b9209859…` |

These replace the digests phases 7 and 8 recorded at 22:19, which predate the refusal.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **Each machine proves only its own build.** This Mac runs darwin-arm64 9.0.2. The x64, Windows and Linux builds (6.1.1 and 7.0.2) are proved when someone runs `npm run test:pinned` on those machines, and any codec difference beyond PCM and FFV1 shows up there first.
2. **The stdio smoke test runs outside the swap.** `tests/server/stdio.vitest.ts` starts the built server as its own process, which reads `ffmpeg-static` directly, so it runs the development ffmpeg in both suites. Its assertions do not depend on the build, and it passes even when the named binaries are missing, as the hostile run showed.
3. **The unsupported-platform stop has no test.** `main` reads the platform from the process, so that branch rests on `platformKeyOf`'s own tests and a reading of the code.
4. **The rollback copies live in the session scratchpad** until the operator commits. After a commit, `git revert` replaces them.
5. **The refusal adds one ffprobe per MP4 attempt.** The suite shows no measurable cost.
<!-- /ANCHOR:limitations -->

---
