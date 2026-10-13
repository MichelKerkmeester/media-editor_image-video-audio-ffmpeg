---
title: "Implementation Summary: Phase 6: probe, repair and HLS"
description: "The Media Editor server now inspects any media file, repairs a damaged one with a proved pass and builds an HLS ladder, so tools/list returns 38 tools and every repair pass is tested on a file it actually fixes."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/006-probe-repair-hls"
    last_updated_at: "2026-09-29T15:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed phase 6"
    next_safe_action: "Start 007-desktop-extension"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/mcp server/src/tools/media/probe.ts"
      - "AI Systems/Media Editor/mcp server/src/tools/media/repair.ts"
      - "AI Systems/Media Editor/mcp server/src/tools/video/hls-ladder.ts"
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
| **Spec Folder** | 006-probe-repair-hls |
| **Completed** | 2026-09-29 |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The Media Editor server can now look inside any media file, repair a damaged one and turn a video into an HLS ladder. `tools/list` returns 38 tools: the 35 from earlier phases and `media_probe`, `media_repair` and `video_hls_ladder`, in the row order of the contract's tool table. Every repair pass is proved on a generated file it actually fixes, and the output is checked with a full decode, not only an exit status.

### Phase 6: probe-repair-hls

- **`media_probe` reads, never writes.** One ffprobe run returns three blocks: `format` (name, duration, size, bit rate), `summary` (video and audio presence, duration, picture size, frame rate, sample rate, channels, layout) and one `streams` entry per stream. A field the file does not carry is left out, and only a missing frame rate falls back to 30. A still image arrives as a single-frame video stream. Album art is kept in `streams` but is not the file's video. When ffprobe cannot read the file, the call returns `PROCESS_FAILED` and names `media_repair` as the next step. No folder is ever created.
- **`media_repair` diagnoses, then rewrites.** Every call first runs ffprobe with `-show_entries format=format_name,duration:stream=codec_name,codec_type:stream_disposition=attached_pic` and reports what it could read, with an error excerpt when the probe failed. A file with no video and no audio stream is `UNSUPPORTED_FORMAT`, and nothing is written. The `remux` pass copies the streams into a fresh container of the input's own type, which fixes a missing index. The `reencode` pass rebuilds the streams as H.264 and AAC in `.mp4`, or AAC alone in `.m4a`, which fixes a cut stream. `auto` copies first, decodes the copy once, and re-encodes when the copy fails or still has decode errors.
- **Album art stays audio.** A song's cover is a video stream flagged `attached_pic`. The diagnosis reads the flag, so a song with a cover takes the audio branch. The audio re-encode drops the picture with `-vn`, because the M4A muxer refuses it, and one warning says the art was left out.
- **`video_hls_ladder` builds one ladder in one ffmpeg run.** The graph splits the picture once per rung, fits it inside the rung frame and pads it centered, so a portrait source is letterboxed, not cropped. Each rung takes the recipe's rate ceiling, and its profile and level carry the rung's stream index, so 720p encodes as Main 4.0 and 480p and 360p as Constrained Baseline 3.1. The keyframe interval is the source frame rate times `segmentDuration`. The run's working directory is the numbered folder, so every pattern is relative and server-made, and a `%` in the description never reaches ffmpeg's pattern reader. A rung taller than the source's shorter side is dropped and named in `droppedRungs` with one warning. When no rung is left, the call returns `INVALID_INPUT` before any folder exists.
- **Two shared runner additions.** `runAttempts` gained an attempt-level `extension`, so the copy keeps the input's container while a re-encode names its own, and an attempt-level `check`, which `auto` uses for its decode. `runInOutputFolder` runs a multi-file step inside a gated numbered folder and removes the folder on any failure.

### Captured output

From literal runs over the built server, stdio against `dist/index.js`, on 2026-09-29:

- `tools/list` returned 38 names, ending `media_probe media_repair video_hls_ladder`.
- `media_probe` on a 6-second 1280x720 clip with sound reported `hasVideo`, `hasAudio`, 6 seconds, 1280x720, 25 fps, 44100 Hz mono.
- `media_repair` with defaults on an unindexed Matroska recording (ffprobe `duration=N/A`) chose the copy and wrote `rec-repaired.mkv`, which reads 4.063 seconds.
- `video_hls_ladder` with defaults on the same 1280x720 clip dropped 1080p with "The 1080p rung is taller than the 1280x720 source, so it was left out." ffprobe opened `master.m3u8` (h264 at 1280x720, 854x480 and 640x360) and each rung's `playlist.m3u8`, with 3 segments per rung.
- `media_probe` on a 1.08 GB video answered in 342 ms cold and 36 ms warm, and the output folder stayed empty.
- A 10-second three-rung ladder took 887 ms.

### Files Changed

All paths are inside `AI Systems/Media Editor/mcp server/`. Nothing was staged or committed.

| File | Action | Purpose |
|------|--------|---------|
| `src/tools/media/probe.ts` | Created | `media_probe` |
| `src/tools/media/repair.ts` | Created | `media_repair`, with the pure `parseDiagnosis` |
| `src/tools/video/hls-ladder.ts` | Created | `video_hls_ladder`, with the pure `ladderArgs` and `selectRungs` |
| `src/core/hls-folders.ts` | Created | Rung folders, segment count, and the folder's file count and bytes |
| `src/tools/video/copy-then-encode.ts` | Modified | The attempt `extension` and `check`, `runInOutputFolder` |
| `src/core/media-properties.ts` | Modified | `readProbeJson`, the raw probe JSON for `media_probe` |
| `src/server/all-tools.ts` | Modified | Registers the three tools, 38 in all |
| `tests/helpers/broken-media.ts`, `tests/helpers/broken-media.vitest.ts` | Created | Seven damaged or awkward files (unindexed Matroska, cut MP4, indexless MP4, mislabeled Matroska, cut M4A, empty file, MP3 with album art) and a decode-error counter, with 10 tests |
| `tests/tools/media/probe.vitest.ts` | Created | 12 tests |
| `tests/tools/media/repair-diagnose.vitest.ts`, `repair-strategies.vitest.ts` | Created | 13 and 16 tests |
| `tests/tools/media/hls-ladder.vitest.ts`, `hls-rungs.vitest.ts` | Created | 21 and 23 tests |
| `tests/core/hls-folders.vitest.ts` | Created | 3 tests |
| `tests/tools/video/copy-then-encode.vitest.ts`, `tests/core/media-properties.vitest.ts`, `tests/server/registry.vitest.ts` | Modified | The new runner paths, `readProbeJson`, and the 38 names with `media_probe` read-only |

### Inherited source defects

Section G of `../context/source-inventory.md` lists the source defects. These are the ones the three new tools could have repeated.

| Defect | Class | Closed here by | Evidence |
|--------|-------|----------------|----------|
| G3 No path policy | class-of-bug | Every handler resolves its input through the path guard before anything runs | `PATH_NOT_ALLOWED` and `INPUT_NOT_FOUND` tests in all five tool test files |
| G4 Caller strings in argv and filters | class-of-bug | The repair passes are fixed flags picked by one enum, and the ladder's values are enums and bounded integers, with relative server-made patterns | the exact-argv test, the `%` test, MiMo's review |
| G5 Overwrite policy | class-of-bug | `-n` on every ffmpeg argv, a fresh numbered folder per call | the argv tests, `copy-then-encode.vitest.ts` |
| G6 The HLS asset's fixed `hls_output` folder | instance-only | The ladder writes into the call's numbered folder | `hls-ladder.vitest.ts` folder assertions |
| G11 Unbounded work | class-of-bug | Every run goes through `runBinary` with the configured timeout | the diagnosis timeout test |
| G13 Doc drift | class-of-bug | The three descriptions were written from contract 3.4 | the live `tools/list` |
| Inventory gap: no repair recipes in the sources | algorithmic | Contract 3.4 fixed two passes from the recipes that exist, and each is proved on a broken file | AC-004, AC-012 to AC-014 |

### Matrix

| Axis | Rows | Covered here |
|------|------|--------------|
| Platform | 5 | darwin-arm64 only; the other four are `007-desktop-extension`'s bundles |
| Input kind for the probe | 5 | video with sound, silent video, audio, PNG, crafted JSON with a missing rate |
| Damaged input for repair | 7 | unindexed Matroska, cut MP4, indexless MP4, mislabeled Matroska, cut M4A, empty file, MP3 with album art |
| Repair strategy | 3 | `remux`, `reencode`, `auto` with both branches and the decode check |
| Source shape for the ladder | 8 | 1920x1080, 1280x720, 854x480, 640x360, 320x240, 720x1280, 360x640, and an audio file |
| Capability missing | 4 | `libx264` for the ladder and both repair re-encodes, `pad` for the ladder, `aac` with `libx264` for `auto`'s copy |

### Handoff to the next phases

- For `007-desktop-extension`: the ladder needs `libx264`, `split`, `scale` and `pad`, and the repair re-encodes need `libx264` and `aac`. Every build the bundles ship must carry them; `media_health` lists each. The bundled darwin-arm64 ffprobe is an x86_64 binary, and the operator chose on 2026-09-29 to replace the darwin-arm64 ffmpeg and ffprobe with the martin-riedl.de 9.0.2 build, because ffmpeg-static's arm64 build is non-free.
- For `009-media-editor-integration`: the three names are above. `media_probe` writes nothing. `media_repair` writes `<stem>-repaired.<input extension>` for a copy, and `<stem>-repaired.mp4` or `.m4a` for a re-encode, in `NNN - <description>/`. `video_hls_ladder` writes `master.m3u8` and `<rung>/playlist.m3u8` with `<rung>/segment_NNN.ts` in the same kind of folder. The warnings a result can carry are "The stream copy failed or kept decode errors, so the file was re-encoded as H.264 and AAC." (or "as AAC."), "The album art was left out, because the re-encoded file is audio only." and "The 1080p rung is taller than the 1280x720 source, so it was left out." (plural for several rungs).
- A later copy-first tool can use the attempt-level `check` the same way `auto` does.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

T001, T002b, T008 to T013 were the orchestrator's. T002 to T007 went to DeepSeek V4.1 Flash at max through Pi, one dispatch per tool or helper. After each dispatch the orchestrator read the handback and the module against contract 3.4, broke the tool's key lines on purpose to prove the tests catch them, and reran the full gate before the next dispatch. Three breaks passed at first, and each got a test that now catches it: a changed probe frame-rate fallback, a dropped re-encode extension and a GOP that ignored `segmentDuration`. A fourth, a silent video's re-encode also asking for `aac`, still passes and is left untested, because only a build without ffmpeg's native `aac` encoder would notice it. MiMo v2.6 Pro reviewed the three tools read-only. Its five findings were checked against the cited lines: two were fixed, one was rejected with its reason, and two went to the operator, who approved them with the decode check as ADR-003.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| Build to contract 3.4 and supersede four early criteria (ADR-002) | The approved contract replaced the `diagnose` mode, the extra repair passes and the handler range check the spec was written with |
| Drop rungs taller than the source's shorter side | `force_original_aspect_ratio=decrease` enlarges a small source to the rung frame, checked on ffmpeg 6.0 |
| Stream-indexed profile and level | The recipe's unindexed flags gave every rung the last value, so 720p came out Baseline 3.1 |
| Album art is not video, `auto` decodes its copy, and the ladder keeps the shared frame-rate rule (ADR-003, operator-approved) | Each fixes a failure checked on ffmpeg 6.0, or aligns the contract with the probe every other tool already uses |
| Keep the copy's lowercased extension | It still names the input's own container, which is what the rule protects |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Package gate on the final state (`tsc --noEmit`, `vitest run`, the four greps, headers, 100 columns, ids, em dashes) | PASS: 1494 passed, 4 skipped, 146 files |
| `npx vitest run tests/tools/media` | PASS: 6 files, 91 tests, 3.97 s |
| Full suite with all seven `MEDIA_EDITOR_*` variables hostile | PASS: 1488 passed, 4 skipped, taken before the last six tests were added |
| Live stdio against `dist/index.js` | 38 tools; probe, repair and ladder as under Captured output |
| NFR-P01, `media_probe` on 1.08 GB | 342 ms cold, 36 ms warm, against 2 s |
| NFR-P02, 10-second three-rung ladder | 887 ms, against 60 s |
| Slowest phase 6 test | 591 ms, 're-encodes cut audio into a single AAC stream' |
| Mutation checks | 20 breaks across the three tools and the runner, each failing at least one test; one more is left uncaught by choice (How It Was Delivered) |
| `validate.sh --strict` on this folder | recorded in `tasks.md` T012 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **One platform tested.** Everything above ran on darwin-arm64 with the bundled ffmpeg 6.0 and Homebrew's ffprobe 9.0.2. The other four platforms are proved when `007-desktop-extension` builds and smoke-tests their bundles.
2. **The re-encoded song has no cover.** `-vn` drops album art on the audio re-encode, and the warning says so. The copy pass keeps it.
3. **`auto` costs one extra decode.** The decode check reads the whole copy once. A caller who wants the copy alone uses `remux`.
4. **No `hls` muxer check.** Contract 8.1 reads encoders and filters only, so a build without the `hls` muxer fails the ladder's run as `PROCESS_FAILED` rather than `CAPABILITY_MISSING`. No folder is left behind.
<!-- /ANCHOR:limitations -->

---
