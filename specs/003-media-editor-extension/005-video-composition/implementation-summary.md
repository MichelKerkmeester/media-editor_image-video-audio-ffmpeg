---
title: "Implementation Summary: Phase 5: video composition"
description: "The seven video composition tools now run in the Media Editor MCP server with filter graphs no caller text can break, so tools/list returns 35 tools and every source composition test passes."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/005-video-composition"
    last_updated_at: "2026-09-29T12:55:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Closed phase 5"
    next_safe_action: "Start 006-probe-repair-hls"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/mcp server/src/core/filter-escape.ts"
      - "AI Systems/Media Editor/mcp server/src/tools/video/copy-then-encode.ts"
      - "AI Systems/Media Editor/mcp server/src/tools/video/concat.ts"
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
| **Spec Folder** | 005-video-composition |
| **Completed** | 2026-09-29 |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The Media Editor server now composes video. `tools/list` returns 35 tools: the 28 from earlier phases and the seven of this phase, in the row order of the contract's tool table. Each composition tool builds its filter graph from parsed values and escaped text, refuses a build that lacks a filter it needs before anything runs, writes one file into a fresh numbered folder and never changes an input.

### Phase 5: video-composition

The seven tools are `video_add_subtitles`, `video_add_text_overlay`, `video_add_image_overlay`, `video_concat`, `media_remove_silence`, `video_add_b_roll` and `video_add_fade`. Their schemas follow contract 3.3 field for field, and a live `tools/list` was compared against it on 2026-09-29.

- **One escaping helper.** Every caller string that enters a graph, whether overlay text, a subtitle path or a font path, goes through `src/core/filter-escape.ts`: the filter-option escape, then the graph escape, inside single quotes. drawtext always carries `expansion=none`, so `%{localtime}` renders as written. A path outside the safe set (ASCII letters, digits, `.`, `-`, `_`, `/`, `\`, `:` and the space) is never escaped at all: the file is copied into the run's temp folder under a server name and the copy's path is used instead. A subtitle is sniffed as SubRip before that copy and again after it. The helper round-trips 27 hostile strings and a 200-string fuzz through the real ffmpeg with nothing lost.
- **A bundled font.** Source Sans 3 Regular ships in `assets/fonts/` with its OFL licence, and `video_add_text_overlay` passes it as `fontfile=` unless the caller names a font, so text never depends on the machine's fonts.
- **Capability gates first.** Each tool checks the encoders and filters its graph writes before the numbered folder exists, and a conditional filter is checked only when the call uses it: `scale` only for an image overlay with a size, `format` and `colorchannelmixer` only with an opacity, `xfade` and `acrossfade` only with a transition. A missing one is `CAPABILITY_MISSING` naming it, with no ffmpeg run.
- **Multi-step runs share one runner.** `runPipeline` in `copy-then-encode.ts` gives concat, silence removal and b-roll the same gate, temp folder, exclusive copy and cleanup as the one-step tools. `runAttempts` gained a `prepare` hook, which copies fonts into the temp folder, and `otherInputs`, so a subtitle, font, overlay image or b-roll clip is re-checked and sniffed by the runner like the main input.
- **Concat carries no caller bytes into its list.** Clips are normalized to `norm_<i>.mp4` in the temp folder and the list names only those, under `-safe 1`, so a clip named `it's.mp4` joins like any other. With a transition, both clips are normalized to the larger size and rate, at least 640x360 and 30 fps and rounded up to even, and the blend starts at the normalized first clip's duration minus the transition. The audio chain appears only when both clips have sound, with both chains labelled, which fixes the source's malformed graph.
- **Silence removal rebuilds its timeline.** `silencedetect` finds the gaps, a trailing silence with no `silence_end` runs to the end, and the kept parts are selected and retimed with `N/FRAME_RATE/TB` and `N/SR/TB`, so an interior gap leaves the output shorter by its length. Input with no silence is copied unchanged with a warning, and an all-silent input is `INVALID_INPUT`.
- **B-roll shows each clip from its own start.** Each clip is shifted with `setpts=PTS-STARTPTS+<insertAt>/TB` before its overlay and scaled to an even size, so its fade-in is visible at `insertAt`. The source's `audio_mix` and slide transitions, which it accepted and ignored, now fail the strict entry schema.

### Captured output

From the bundled ffmpeg 6.0 on darwin-arm64 (T001):

- `ffmpeg -hide_banner -filters` lists `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` and `overlay`, plus `select`, `aselect`, `setpts`, `asetpts`, `fade`, `scale`, `format` and `colorchannelmixer`. `-buildconf` shows `--enable-libass`, `--enable-libfreetype` and `--enable-fontconfig`.

From literal runs over the built server, stdio against `dist/index.js`, on 2026-09-29:

- `tools/list` returned 35 names.
- `video_add_b_roll` with `audioMix: 0.5` on a clip returned `-32602`, and the output folder stayed empty.
- `video_concat` of two 2-second clips with sound and a 1-second `dissolve` returned one video and one audio stream, 3.07 seconds long.
- `media_remove_silence` on a 4-second file with a 2-second gap in the middle returned 2.02 seconds.
- `video_add_text_overlay` with the text `it's 50% off: now` wrote `a-text-overlay.mp4`.
- `media_health` listed `drawtext`, `subtitles`, `xfade`, `acrossfade`, `silencedetect` and `overlay`, all present.

### Files Changed

All paths are inside `AI Systems/Media Editor/mcp server/`. Nothing was staged or committed.

| File | Action | Purpose |
|------|--------|---------|
| `src/core/filter-escape.ts` | Created | The two-level escape, caller-text normalization, the safe path set and the three copy helpers |
| `src/core/font-path.ts` | Created | The bundled font's path and its presence check |
| `src/core/overlay-position.ts` | Created | The 3.3.1 position table with its hyphen aliases, for drawtext, overlay and b-roll |
| `src/core/concat-list.ts` | Created | The concat list of server names |
| `src/tools/video/add-subtitles.ts`, `add-text-overlay.ts`, `add-image-overlay.ts`, `concat.ts`, `add-b-roll.ts`, `add-fade.ts` | Created | Six composition tools |
| `src/tools/media/remove-silence.ts` | Created | `media_remove_silence` |
| `src/tools/video/copy-then-encode.ts` | Modified | `runPipeline`, the `prepare` hook and `otherInputs` |
| `src/core/media-properties.ts` | Modified | `probeIntermediate`, a probe of the server's own temp files |
| `src/core/capabilities.ts` | Modified | The seven `TOOL_REQUIREMENTS` rows |
| `src/server/all-tools.ts` | Modified | Registers the seven tools, 35 in all, in contract row order |
| `assets/fonts/SourceSans3-Regular.ttf`, `assets/licenses/SourceSans3-OFL.md` | Created | The bundled font, sha256 `4644c81b86ec9caaa76b634889968ed3c4f4f52f054855933acc7c2b21e53b0f`, and its licence |
| `tests/core/filter-escape.vitest.ts`, `font-path.vitest.ts`, `overlay-position.vitest.ts`, `concat-list.vitest.ts` | Created | 156 helper tests |
| `tests/helpers/composition-media.ts`, `tests/helpers/composition-media.vitest.ts` | Created | Silence-pattern media, a SubRip writer, an alpha PNG, and frame brightness and colour readers, with 10 tests |
| `tests/tools/composition/*.vitest.ts` (9 files) | Created | 196 tests: one file per tool, a second concat file for transitions, and the capability gates |
| `tests/tools/video/copy-then-encode.vitest.ts`, `tests/core/media-properties.vitest.ts`, `tests/core/capabilities.vitest.ts`, `tests/server/registry.vitest.ts`, `tests/tools/media/health.vitest.ts` | Modified | The new runner paths, `probeIntermediate`, the image overlay requirement row, the 35 names in order, and the six filters `media_health` must name |

### Handoff to the next phases

- A graph that takes caller text uses `quoteFilterValue` after `normalizeCallerText`, and a path a filter opens goes through `filterSafePath`, `filterSafeSubtitle` or `filterSafeFontDir` inside the run's temp folder. A tool never writes an escape of its own.
- A tool with more than one ffmpeg run ends in `runPipeline`. A file the server wrote into the temp folder is probed with `probeIntermediate`; `probeMedia` is for caller inputs.
- Every caller file a run opens goes in that run's `inputs` or `otherInputs`, so the runner re-checks and sniffs it before the spawn.
- A key the contract removed fails a strict schema as `-32602` (ADR-002). A conditional filter is gated only when the call uses it (8.2 rule 1).
- For `007-desktop-extension`: every bundle must carry the font and its licence file, and `assertBundledFont` returns `INTERNAL` when the font is missing. THIRD_PARTY_NOTICES needs the SIL OFL 1.1 entry for Source Sans 3. The bundled ffprobe for darwin-arm64 is an x86_64 binary (limitation 1).
- For `009-media-editor-integration`: the seven names are listed above. The files are `<stem>-subtitled.mp4`, `<stem>-text-overlay.mp4`, `<stem>-image-overlay.mp4`, `<first stem>-joined.mp4`, `<stem>-without-silence.mp4` or `.m4a` (a no-silence copy keeps the input's extension), `<stem>-b-roll.mp4`, and `<stem>-fade-in.mp4` or `<stem>-fade-out.mp4`, each in `NNN - <description>/`. The warnings a result can carry are "The audio could not be copied into MP4, so it was re-encoded as aac." (subtitles, text overlay, image overlay and fade), "No silence was found at this threshold, so the file was copied unchanged.", "Some clips had no sound, so the joined audio covers only the clips that had it." and "Only one clip had sound, so the joined video has no audio."
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

T001 and T014 were the orchestrator's. T002 to T013 went to DeepSeek V4.1 Flash at max through Pi, one dispatch per helper or tool, since the Cursor usage for Grok had run out in phase 4. After each dispatch the orchestrator read the handback and the new module against its contract section, broke the tool's key line on purpose to prove the tests catch it, and reran the full gate before the next dispatch.

### Read-only review

MiMo v2.6 Pro (high) read the seven tools, the helpers and the tests against contract 3.3, 8.2, 8.3, 8.5, 8.6 and the phase 5 change-log rows, with the escaping invariant first. It found the invariant, every argv block, the gates, the handler checks, the output names and the caller-file inputs sound, and returned two P2 findings. Both were confirmed by reading the cited lines and fixed:

- **The xfade offset came from the wrong clip.** It used the caller clip's probe, where 3.3.5 names the normalized first clip. The code comment said a temp file could not be probed, but the runner guards only caller inputs, so `probeIntermediate` now probes `norm_0.mp4`. A test that reports a different normalized length fails when the old source comes back.
- **A subtitle was copied before its sniff.** `filterSafeSubtitle` copied the file and then sniffed the copy, where 8.6 sniffs the original first, so a large file named `.srt` would have been copied before its refusal. It now sniffs the original, copies, then sniffs the copy, and the refusal test checks that no copy was written.

### Work that followed the dispatches

- **Shared runner work.** The orchestrator wrote `runPipeline`, the `prepare` hook and `otherInputs` before the dispatches that needed them, with seven tests of their own in the helper file.
- **The copy route made visible.** Skipping the 8.6 copy passed every dispatched test, because the original path also works on this machine. Tests that record the `-vf` argument now prove that a quoted subtitle and a quoted font folder reach the filter only as temp copies.
- **Image overlay gating.** The first build gated `scale` on every call, against 8.2 rule 1. The tool, its requirement row, the test pin and the contract row now gate it only when a size is given.
- **Test titles.** Titles carry no task or criterion ids and fit in 100 columns. One title that carried a criterion id was renamed. The 8 source test names appear in the ported cases.
- **A brief error the worker caught.** The T009 brief named the wrong sample time for the blended frame. The worker worked the right one out from the offset and used it.
- **Registry and health pins.** Each tool went in at its contract row as it landed, and the `media_health` test now names the six composition filters.

Nothing was committed, staged or pushed.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| One escaping helper for every graph value (ADR-001 in `plan.md`) | The source escaped per tool and missed `[ ] ; =`, newlines and drive letters. One helper, tested against the real parser, removes the class. |
| Copy an unsafe path instead of escaping it | A quote, percent or bracket in a path has no escape that survives the graph parser, the option parser and libass together. |
| The bundled font always passed as `fontfile=` | drawtext's default font comes from fontconfig and differs per OS. |
| `runPipeline` instead of temp handling in each tool | Concat, silence removal and b-roll need several runs, and gating, the temp folder, the exclusive copy and cleanup stay in one place. |
| Strict entry schemas, AC-008 superseded by AC-010 (ADR-002) | The contract removed `audioMix` and the slide transitions, and a strict object turns them into a visible refusal instead of a silent drop. |
| The xfade offset from the normalized first clip | Contract 3.3.5 and the source both measure the clip that is actually blended. |

### Contract amendments made in this phase

`001-tool-contract/contract.md` stays at version 0.2. Its change log has two phase 5 rows carrying three amendments, each checked on ffmpeg 6.0:

- Silence removal (3.3.6) retimes with `setpts=N/FRAME_RATE/TB` and `asetpts=N/SR/TB`, because `PTS-STARTPTS` left interior gaps in the timeline, and the parser reads a signed `silence_start`.
- B-roll (3.3.7, 8.1 and 8.2) shifts each clip with `setpts=PTS-STARTPTS+<insertAt>/TB` and floors its grid scale to even, because the unshifted clip started partway through and its fade-in never showed.
- The 8.2 row for `video_add_image_overlay` gates `scale` only when a size is given.

### Dependency licences

No npm dependency was added: `npm ls --depth=0` lists the same eight packages as phase 4. The one new third-party file is Source Sans 3 Regular, copyright 2010-2024 Adobe, under the SIL Open Font License 1.1, whose text is in `assets/licenses/SourceSans3-OFL.md`. The OFL allows bundling the font with software when the licence travels with it. `007-desktop-extension` T006 carries it into THIRD_PARTY_NOTICES.

### Inherited source defects

Section G and F of `../context/source-inventory.md` list the source defects. This phase closes the composition side of these.

| Defect | Class | Closed here by | Evidence |
|--------|-------|----------------|----------|
| G2 Concat list quoting under `-safe 0` | class-of-bug | The list holds only `norm_<i>.mp4` names, under `-safe 1` | `tests/tools/composition/concat.vitest.ts:451`, `tests/core/concat-list.vitest.ts` |
| G4 Caller strings in filter graphs: drawtext text, `enable`, the font file, the subtitle path, `force_style`, overlay positions and sizes, `scale_factor` | class-of-bug | One escaping helper, parsed times and colours, closed position enums and numeric ranges | `tests/core/filter-escape.vitest.ts:535` and `:546`, MiMo's review |
| G5 Overwrite policy | class-of-bug | `-n` on every argv, a temp file per run and an exclusive copy | the argv snapshots, `tests/tools/video/copy-then-encode.vitest.ts` |
| G7 Windows drive letters break the filter | class-of-bug | The `:` and `\` escape rows keep `C:\clips\a.srt` whole | `tests/tools/composition/add-subtitles.vitest.ts:504`, the escape table |
| G8 `audio_mix` and slide transitions accepted and ignored | instance-only | A strict entry schema, `-32602` (ADR-002) | `tests/tools/composition/add-b-roll.vitest.ts:602`, the live refusal |
| G13 Doc drift | class-of-bug | The seven descriptions were written from the schemas | the live `tools/list` comparison with contract 3.3 |
| F1 Malformed xfade audio graph | instance-only | Both chains labelled, the audio chain only when both clips have sound | `tests/tools/composition/concat-xfade.vitest.ts:313` |
| F2 drawtext's font depends on the OS | cross-consumer | The bundled font, always passed as `fontfile=` | `tests/tools/composition/add-text-overlay.vitest.ts:501` |
| F3 `subtitles` needs libass | matrix/evidence | The bundled build has libass (T001), and a build without `subtitles` gets `CAPABILITY_MISSING` | `tests/tools/composition/capability-gating.vitest.ts:491` |
| F4 `xfade` and other filters absent from minimal builds | matrix/evidence | Every filter a graph writes is gated before the folder exists | the 13 refusal rows in the same file |

G13 stays open for every tool the later phases write.

### Matrix

| Axis | Values | Rows exercised |
|------|--------|----------------|
| Platform | darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64 | One host observed, darwin-arm64 with the bundled ffmpeg 6.0 and Homebrew's ffprobe 9.0.2 |
| Filter availability | present, missing upfront, missing when a call needs it | 13 refusal rows and 2 controls in `capability-gating.vitest.ts` |
| Caller text | plain, quote, colon, percent, comma, semicolon, brackets, equals, backslash, newline, tab, edge whitespace, non-ASCII, emoji, graph injection | 20 escape rows, 27 round-trip strings and 200 fuzz strings |
| Paths a filter opens | inside the safe set, outside it, a drive letter | escape-in-place and copy-route tests for subtitles and fonts; the drive letter as a graph string |
| Input streams | picture and sound, picture only, sound only | each tool runs its accepted kinds and refuses the rest; concat with mixed sound warns |
| Silence position | leading, interior, trailing, none, all | each in `remove-silence.vitest.ts` |
| Clip count | 1, 2, 3 | one clip refused by the schema, two and three joined, three with a transition refused |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run build` | PASS, exit 0 |
| `npx vitest run` | PASS, exit 0: 64 files, 1392 tests, 1388 passed, 4 skipped, 0 failed |
| `npx vitest run tests/tools/composition` | PASS, exit 0: 9 files, 196 tests in 3.1 s of wall time, against the 4 minute budget; slowest test 676 ms, `test_concatenate_videos_with_xfade: dissolve` |
| Same full suite with all seven `MEDIA_EDITOR_*` variables set to hostile values | PASS: 1388 passed, 4 skipped |
| Literal runs of the acceptance criteria over the built server | PASS: output captured above |
| Mutation checks | PASS: each of these fails its tests: no colon escape (8), no quote wrapping (8), no `expansion=none` (3), no `fontfile=` (2), no subtitle escaping (2), the subtitle copy skipped (1), the font copy skipped (1), no start-only overlay window (2), no `-r` in concat normalization (2), no xfade audio chain (1), `PTS-STARTPTS` back in silence removal (3), no b-roll `setpts` shift (6), a fade-out from 0 (2), no `subtitles` gate (1), the xfade offset from the caller clip (1), the subtitle copied before its sniff (1) |
| `grep` for `: any`, untyped `catch (error)`, `shell: true` and `'use strict'` in `src` | PASS, prints nothing |
| `grep` for fetch, http and net imports in `src` | PASS, prints nothing |
| TSDoc on the phase's exports | PASS: 76 of 76, with `@throws` on every function that throws directly |
| Live `tools/list` schemas against contract 3.3 | PASS: names, types, ranges, enums with their aliases, defaults, required lists and annotations match |
| Stand-in alignment gate (the real script on a scratch git copy, plus greps and header, line-length, ephemeral-id and em-dash checks) | PASS: 134 files scanned, 0 findings |
| `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/005-video-composition --strict` | Run at close, recorded in `tasks.md` T017 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **Only one platform ran, with the system ffprobe.** Everything ran on darwin-arm64 with the bundled ffmpeg 6.0. Probes ran on Homebrew's ffprobe 9.0.2, because `ffprobe-static` 3.1.0 ships an x86_64 binary for darwin-arm64 (phase 4, limitation 3). `007-desktop-extension` owns the fix.
2. **The Windows drive-letter case ran on macOS.** Contract 8.5 asks this phase to say whether a Windows runner exercised it: none did. The `C:\clips\a.srt` graph string is tested as a string and its escape round-trips through ffmpeg on macOS. A real Windows subtitle burn waits for the Windows build in phase 7.
3. **The copy route shows only in the argv.** A path outside the safe set also works on this machine, so the tests prove the copy by recording the filter argument, not by a run that fails without it.
4. **A plain join with mixed sound.** The concat demuxer joins the clips as they are, so when some clips lack sound the audio covers only the clips that have it, and the result says so in a warning.
5. **An odd first-clip size fails the plain join.** Without a transition, every clip is scaled to the first clip's size, as the source does, and an odd size fails the H.264 encoder with `PROCESS_FAILED`. The transition path rounds up to even.
6. **Variable frame rate input in silence removal.** The kept parts are retimed with `N/FRAME_RATE/TB`, which assumes a constant rate, so a variable-rate video comes out at its nominal rate and its timing can drift slightly from the original.
7. **Sign-offs.** The Operator and MiMo sign-off rows in `tasks.md` are left unticked. They are theirs to give. The package README (CHK-042) and the packaging review (CHK-124) are deferred to `007-desktop-extension`.
<!-- /ANCHOR:limitations -->

---
