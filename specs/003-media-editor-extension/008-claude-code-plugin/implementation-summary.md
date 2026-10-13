---
title: "Implementation Summary"
description: "The Media Editor server and skill as a Claude Code plugin with 39 tools, a consent-gated ffmpeg setup, and a fix that let the shipped Apple Silicon build run its filter tools at all."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/008-claude-code-plugin"
    last_updated_at: "2026-09-29T20:10:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Built, reviewed and live-tested the plugin and media_setup_ffmpeg"
    next_safe_action: "Operator decides the ffmpeg 9 stream-copy question and the commit"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "scaffold-008-claude-code-plugin"
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
| **Spec Folder** | 008-claude-code-plugin |
| **Completed** | 2026-09-29 |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

Claude Code can now load the Media Editor as a plugin: the 39 tools, the skill that routes to them, and a server that runs its own pinned ffmpeg. You build it once, start Claude Code in the folder that holds your media with `--plugin-dir`, and the tools read from that folder and write every result into a new numbered folder inside it.

### Phase 8: claude-code-plugin

The plugin runs the unpacked server with `node`, because the spike showed Claude Code neither supplies Node for a bundle nor fills a bundle's folder settings (ADR-001). The session's project folder becomes the one folder the tools may use, and a consented ffmpeg install lands in Claude Code's plugin data folder, so it survives plugin updates. The build copies the tracked skill into the plugin, resolves the skill's two linked rule files into real files, and fails when any copied file differs from its source or when the unpacked server holds a link.

The 39th tool, `media_setup_ffmpeg`, covers a machine where no ffmpeg the server trusts can run. Without `consent: true` it returns the planned download (address, size, both digests, destination) and writes nothing. With consent it fetches the pinned archive, follows at most one redirect and only to the host the pinned row names, stops at the pinned size and at the server's time limit, checks the archive digest, unpacks the one expected entry, checks the binary digest, and only then moves the binary into place and records it. From then on the resolver's fourth step returns it to every tool, after checking its digest again.

The live plugin session found a defect that reached every shipped Apple Silicon bundle. The pinned ffmpeg 9.0.2 prints two flag characters per filter row where older builds print three, so the capability reader saw no filters at all and the ten filter-gated tools, such as `video_set_resolution` and `video_hls_ladder`, would have refused to run. The reader now takes both widths, and the same session then resized a clip.

### Files Changed

Paths are relative to `AI Systems/Media Editor/mcp server/`.

| File | Action | Purpose |
|------|--------|---------|
| `claude-plugin/.claude-plugin/plugin.json`, `marketplace.json` | Created | The inline `node` server with the project folder and plugin data folder, and a one-plugin local marketplace |
| `claude-plugin/README.md` | Created | Build and install steps, the Node 20.9.0 requirement, settings and troubleshooting |
| `scripts/build-plugin.ts` | Created | Unpacks one target's bundle into `claude-plugin/server/`, refuses links, copies the skill and compares it by hash |
| `src/tools/media/setup-ffmpeg.ts` | Created | `media_setup_ffmpeg`: plan, consent, download, checks, install, record, re-resolve |
| `src/core/artifact-download.ts` | Created | One pinned download with one allowed redirect, the size cap, the time limit and the digest check, and the unpack with its own digest check |
| `src/core/zip-entry.ts` | Created | An in-process reader for a single-entry zip that refuses unsafe entries and bounds inflation |
| `src/core/source-notice.ts` | Created | The source notice the bundle build and setup both write |
| `src/core/pinned-builds.ts` | Modified | `redirectHost` per row |
| `src/core/ffmpeg-resolver.ts` | Modified | Its pinned binary digests come from the build table, so a consented install resolves |
| `src/core/capabilities.ts` | Modified | Filter rows with two or three flag characters |
| `src/server/all-tools.ts`, `manifest.json` | Modified | The 39th tool |
| `package.json`, `.gitignore` | Modified | The `plugin` script, and `claude-plugin/server/` and `claude-plugin/skills/` ignored as build output |
| `tests/tools/media/setup-ffmpeg.vitest.ts`, `tests/core/artifact-download.vitest.ts`, `tests/core/zip-entry.vitest.ts`, `tests/packaging/build-plugin.vitest.ts` | Created | 22, 26, 13 and 12 tests |
| `tests/core/capabilities.vitest.ts`, `tests/server/registry.vitest.ts`, `tests/packaging/manifest.vitest.ts` | Modified | The ffmpeg 9 filter rows, and 39 tools |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

DeepSeek v4.1 Flash at max thinking wrote the zip reader, the download module, the setup tool and the plugin build, one file per dispatch, and the orchestrator reran the full gate after each. The orchestrator wrote the fixes that followed: the exclusive claim that keeps `unpackArtifact` from deleting a file that was already there, the mapping of a body that stops partway or a failed write to `DOWNLOAD_FAILED`, the install-record temp file moved into the call's own work folder, the link handling in the plugin build, and the fixes listed below. Each test file was mutation-checked: every fix was reverted once and its test failed.

One live download proved the real network path the unit tests replace with an injected fetch. The darwin-x64 ffprobe archive (25,239,438 bytes) came through `302 github.com` and then `200 release-assets.githubusercontent.com`, and the archive and binary digests both matched, in 1,449 ms. The two real darwin-arm64 zips from the bundle cache were read by the final zip reader, with both digests matching.

The read-only review went to GPT-6 Luna at max under the parent goal's D6 routes, and returned eleven findings:

| Finding | Verdict | Action |
|---------|---------|--------|
| F1 P0: the resolver hashes the installed binary, then runs it by path, so a swap in between runs other bytes | Outside the threat model | Only the user can write the data folder, and whoever can write it already runs code as the user. Recorded as a limitation |
| F2 P0: setup overwrites the licence notices | By design | The notices are setup's own files in the server's data folder, rewritten for the build just installed |
| F3 P0: the plugin build deletes `server/` and `skills/media-editor/` before rebuilding | By design | Both are ignored build output, the README says to edit the source, and a test pins the replace |
| F4 P1: inflation has no output bound | Real | `maxOutputLength` from the recorded size, with a test |
| F5 P1: a short write is taken as whole | Real | The write repeats until every byte is on disk, with a test that makes the disk take half a chunk |
| F6 P1: a failed read-back after the rename escapes raw and leaves the binary | Real | The binary is removed and the call fails as `DOWNLOAD_FAILED` `write`, through a `hashFile` seam, with a test |
| F7 P1: the install record keeps an entry whose binary is gone | Real | An earlier entry is kept only while its file is there, with a test |
| F8 P1: the unpacked server is not checked for links | Real | `server-link` refusal before the manifest is read, with a test |
| F9 P1: an open failure other than an existing file escapes raw | Real, two sites | `createExclusive` for the download and the unpack, with a test each |
| F10 P1: a body whose cancel rejects escapes before the refusal | Real, three sites | `discardBody`, with a test |
| F11 P2: a directory entry without a trailing slash passes | Real | The Unix directory type and the DOS directory attribute count too, with a test each |

Checking the spec's edge cases against the code found two more gaps, both fixed with tests. The unsupported-platform error now names `MEDIA_EDITOR_FFMPEG_PATH` and `MEDIA_EDITOR_FFPROBE_PATH`, and an unreachable host leaves nothing behind and the next call plans both downloads again. Checking NFR-P02 found that a stalled download had no time limit, so each download now stops at the server's per-run limit (`MEDIA_EDITOR_TIMEOUT_SECONDS`, 1800 seconds by default) with reason `timeout`.

Two more read-only reviews followed, each on a model that wrote none of the code under review:

| Review | Finding | Action |
|--------|---------|--------|
| DeepSeek v4.1 Flash on the fixes | P2: no test drives a write that makes no progress | A test for a write that takes 0 bytes and one for a write that rejects, each stopped by a retry limit so a spin fails instead of hanging |
| DeepSeek v4.1 Flash on the fixes | P2: the existing-destination tests would pass if `EEXIST` became a download failure | Both tests now check the `EEXIST` code and that the file is untouched |
| DeepSeek v4.1 Flash on the fixes | P2: `unpackArtifact` closes its claim outside the cleanup | The close moved inside the `try`. It has no test, because Node gives each file handle its own `close`, so a test cannot make it reject |
| GPT-6 Luna on the timeout | P1: the limit restarts for each download, so one call for both binaries can run twice as long | One deadline per call, with a test that both downloads get the same signal |
| GPT-6 Luna on the timeout | P1: a second download that times out leaves the first binary installed with no record | Both binaries are downloaded and unpacked in the work folder before either is placed, and a placed binary is removed when a later step fails, with a test for each order |

A last review on DeepSeek v4.1 Flash covered the staged placement and returned four P2 findings. A branch that could never run threw a plain `Error`, so the rows and their staged paths now travel together and the branch is gone. A cleanup removal that failed replaced the error the user should see, and the class was wider than the one site found: the download, the unpack, the read-back, the checksum refusal, the placed-binary cleanup and the work-folder removal all tried to remove a file and let the removal's own error escape, and the last of these could fail an install that had worked. All six now go through one `removeQuietly`, with tests that lock the folder read-only so every removal fails. Two overlapping calls in one server could each place a binary and one could then remove the other's, so the tool now runs one call at a time, with a test for the overlap and one that a refused call does not hold up the next. The fourth finding said the timeout test does not tell the shared deadline from the old one, which is true of that test and is why the same-deadline test exists, so nothing changed. Every fix was reverted once and its test failed, except the unpack cleanup, whose failure a test cannot trigger without a seam in the unpack path.

The plugin session exposed the ffmpeg 9 filter rows, and that raised the question of what else differs between the build the tests use and the builds that ship. The suite resolves the development `ffmpeg-static` 6.0, so it was run once more with the pinned darwin-arm64 9.0.2 pair swapped in, then the originals were restored and their digests checked. 45 tests failed, none of them a capability refusal after the fix. 28 are the drawtext escape probe, where ffmpeg 9 logs each value twice while the text itself survives intact. 17 are tests whose premise is that ffmpeg refuses to stream-copy PCM audio, FFV1 or a mislabelled Matroska file into MP4. ffmpeg 9 accepts those copies, so the tool keeps the copy and no re-encode follows. The output is valid, but an MP4 with PCM audio plays in fewer places than one with AAC, and that is a product decision for the operator.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| An inline `node` server config instead of a bundle reference (ADR-001) | Claude Code supplies no Node for a bundle and leaves a bundle's folder settings unexpanded, so a referenced bundle cannot start with a usable folder |
| The project folder as the one allowed root | It is the folder the user started the session in, and `${CLAUDE_PROJECT_DIR}` is the only folder Claude Code expands for a plugin server |
| One redirect, only to the host the pinned row names (ADR-002) | GitHub release downloads answer with a signed link on one fixed host, and the digests, not the host, make a file trusted |
| The pins stay in `pinned-builds.ts` | Phase 7 had already built the one table the bundles use, and a second file would drift from it |
| An injected fetch in tests, plus one live download | The fetch is the seam the code takes, and the live run proved the redirect path a fixture server would have imitated |
| A download timeout from the server's own per-run limit, one per call | NFR-P02 asks for the phase 2 timeout, and a stalled connection otherwise holds the call forever |
| Stage both binaries before placing either | A failure partway through a call then leaves the bin folder as it was, so the record and the files never disagree |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Package gate on the final state | PASS: tsc 0, 81 files, `1694 passed, 4 skipped (1698)`, greps, headers, 100 columns, ids and em dashes clean, alignment 0 findings over 170 files |
| `claude plugin validate` | PASS: exit 0 on the folder and on `plugin.json`, Claude Code 2.1.284 |
| Plugin session | PASS: 39 tools and the `media-editor:media-editor` skill, server `connected`, `media_health` reports the bundled ffmpeg 9.0.2 with 18 of 18 filters, and `video_set_resolution` wrote a clip ffprobe reads as `h264,160,120` |
| Bundles repacked | PASS: `npm run bundle -- --all` exit 0 after the last source change, `mcpb validate` exit 0 on the root manifest and on all five packed manifests, 39 tools each, and all five carry the same 70 compiled files with the final download and setup code |
| Plugin rebuilt | PASS: `npm run plugin` exit 0 with the 40-file skill, no link in the plugin folder, and `claude plugin validate` exit 0 again on the folder and on `plugin.json` |
| Plugin session on the final build | PASS: server `connected` with 39 tools, and the raw `media_health` result reports the bundled ffmpeg 9.0.2 with 10 of 10 encoders and 18 of 18 filters in 1,489 ms |
| Live download | PASS: darwin-x64 ffprobe through the GitHub redirect, both digests matching, 1,449 ms |
| Suite on the shipped ffmpeg 9.0.2 | 45 of 1,688 fail on premises of ffmpeg 6, none a capability refusal; see How It Was Delivered |
| Startup (NFR-P01) | `media_health` answered in 1,111 ms and 1,876 ms of tool time on the first call of two fresh sessions, under the 5-second limit. This is the tool's own `elapsedMs`, not wall time from session start |
| Download limit (NFR-P02) | Each download stops at the server's per-run limit, and the plan rows report each download's size |
| Suite runtime | 19.83 s. The slowest file is `bundle-contents.vitest.ts` at 18.8 s, the slowest test its architecture check at 2,551 ms, and the slowest phase 8 test 'copies the tracked skill byte for byte' at 319 ms |
| Read-only reviews | GPT-6 Luna on the build: 8 of 11 fixed, 3 rejected with reasons. DeepSeek v4.1 Flash on the fixes: 3 of 3 fixed. GPT-6 Luna on the timeout: 2 of 2 fixed. DeepSeek v4.1 Flash on the staging: 3 of 4 fixed, 1 answered by an existing test |

### Matrix

| Axis | Values | Rows |
|------|--------|------|
| Platform | darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64 | 5 |
| Component | ffmpeg, ffprobe | 2 |
| Archive kind | zip on darwin-arm64, gzip on the other four | 2 |
| Redirect | none on darwin-arm64, one to `release-assets.githubusercontent.com` on the rest | 2 |

Ten pinned rows cover the cells that exist. Both archive kinds and both redirect cases have unit tests, the gzip-and-redirect cell ran live, and the zip cell ran on the real cached archives.

### Bundles after the last change

| Bundle | Bytes | SHA-256 |
|--------|-------|---------|
| `media-editor-darwin-arm64.mcpb` | 70,332,320 | `d82a60721fc79c0fd6c15a47c3a2d0fcfa2e5add222c73b63fed166c36e0f7be` |
| `media-editor-darwin-x64.mcpb` | 65,761,503 | `df6e33a2f32d7831962d8911b6a490bd32be62ba47db77f3dd4ec1f5827e1415` |
| `media-editor-win32-x64.mcpb` | 73,622,802 | `dc82efee55af41c7bb0ce2f72a3efc3116cba3bb25ef96f97515e1bc35f98550` |
| `media-editor-linux-x64.mcpb` | 73,129,750 | `aa3b0c8b40c923b20c1987884f581730d6103ac2ada7f886c670a7c06c2dc385` |
| `media-editor-linux-arm64.mcpb` | 64,682,325 | `42464b8c186752996ea54d01af2e06518d393a1d0f48f3f2b4c8e5923da512bd` |

Packed 2026-09-29 between 22:19:11 and 22:19:52. The digests change on every pack because the zip records timestamps. Phase 10 repacked all five at 23:15 with the MP4 refusal, and its implementation summary holds the current digests.

### Operator notes

1. Build once per machine: `npm run bundle -- --target <key>` and `npm run plugin` in `AI Systems/Media Editor/mcp server/`.
2. Start Claude Code in the media folder with `claude --plugin-dir "<path>/mcp server/claude-plugin"`, and check `mcp list` shows the server connected.
3. Node.js 20.9.0 or later must be on the `PATH` Claude Code sees.
4. `media_setup_ffmpeg` only matters on a machine where the bundled ffmpeg cannot run. It asks before it downloads anything.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **The resolver checks a digest, then runs the file by path.** A process that can write the user's data folder could swap the binary in between. Whoever can do that already runs code as the user, so this was left as it is.
2. **The suite does not run on the builds that ship.** It resolves the development `ffmpeg-static` 6.0. The one run on the Apple Silicon 9.0.2 pair is recorded above, and making that run part of the gate is follow-up work.
3. **ffmpeg 9 stream-copies into MP4 what older builds refused.** On the Apple Silicon bundle a copy of PCM audio into MP4 now succeeds instead of falling back to AAC. The output is valid but less widely playable, and whether to force AAC is the operator's decision.
4. **The plugin build targets one platform per build.** `claude-plugin/server/` holds the server for the machine that built it, so a plugin folder is not portable across platforms.
5. **The marketplace is local.** It lists the plugin from its own folder. A hosted marketplace waits on the public hosting decision.
6. **A consented download was proven live through the module, not through the tool in a session.** The tool path is covered by the unit tests with an injected fetch.
7. **Setup calls queue inside one server, not across servers.** Two Claude Code sessions share the plugin's data folder, so two setups started at the same moment in both could still race for the same binary. The worst case is an install record that names a binary another setup removed, which the next `media_health` reports and the next setup repairs.
<!-- /ANCHOR:limitations -->

---
