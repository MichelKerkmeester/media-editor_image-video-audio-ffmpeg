---
title: "Implementation Summary: Phase 3: image tools"
description: "The eight image tools now run on sharp inside the Media Editor MCP server, so tools/list returns nine tools and no image call needs ffmpeg."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/003-image-tools"
    last_updated_at: "2026-09-29T06:17:44Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Closed phase 3"
    next_safe_action: "Start 004-video-audio-core"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/mcp server/src/tools/image/sharp-output.ts"
      - "AI Systems/Media Editor/mcp server/src/server/field-schemas.ts"
      - "AI Systems/Media Editor/mcp server/tests/tools/image/write-failure.vitest.ts"
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
| **Spec Folder** | 003-image-tools |
| **Completed** | 2026-09-29 |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The Media Editor server now edits images. `tools/list` returns nine tools: `media_health` from phase 2 and eight `image_*` tools built on sharp. No image tool starts ffmpeg or ffprobe, so they work on a machine that has neither. Every call that writes puts its files in a fresh numbered folder under the output folder and leaves the input file untouched.

### Phase 3: image-tools

The eight tools are `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe` and `image_batch_resize`. Their schemas follow contract section 3.1 field for field, and a live `tools/list` was compared against that section on 2026-09-29.

- **Resize** takes a width, a height or both, and a `fit` mode that defaults to `cover`. It never enlarges unless asked, and a call with neither dimension is refused as `INVALID_INPUT`.
- **Convert** writes jpeg, png, webp or avif at a quality from 1 to 100. `jpg` is accepted as a spelling of `jpeg`, and the descriptions list only the four canonical names.
- **Crop** checks that the region fits inside the image and says by how much it does not.
- **Compress** re-encodes in the input's own format and reports the byte count before and after.
- **Rotate** takes any angle from -360 to 360 and a `#rrggbb` background for the corners. Colour names fail the schema.
- **Flip** mirrors horizontally, vertically or both.
- **Probe** is the only read-only image tool. It reports format, size, channels, bit depth, colour space, alpha and file size, and writes nothing.
- **Batch resize** writes one file per listed size into one folder. Two sizes with the same suffix are refused before any path work.

One shared module, `src/tools/image/sharp-output.ts`, holds everything the tools have in common. It reads the first 16 bytes and refuses anything that is not a raster image (`UNSUPPORTED_FORMAT`, `reason: "image-content"`), refuses an image over 100 million pixels (`image-pixel-limit`), allocates the output folder, writes each file with an exclusive open, and removes the folder if any write fails.

Every writing tool takes `outputName` from one shared schema, `outputNameField` in `src/server/field-schemas.ts`. A name with a slash or backslash, or one outside 1 to 64 characters, fails the schema (`-32602`) before a folder exists.

### Captured output

From literal runs of each acceptance criterion over the built server, on 2026-09-29:

- A crop of a 256x256 PNG asking for a 100x100 region at (200,200) returned `INVALID_INPUT`, "The crop region does not fit the 256x256 image (left + width is 300).", with details `parameter: width`, `reason: region-exceeds-image`, `imageWidth: 256`, `imageHeight: 256`, `left: 200` and `top: 200`.
- `image_probe` on that file replied "Read s256.png: 256x256 png, 1409 bytes." with the keys `tool`, `outputs`, `warnings`, `elapsedMs`, `format`, `width`, `height`, `channels`, `bitDepth`, `colorSpace`, `hasAlpha` and `fileSize`.
- `image_compress` on the same PNG at quality 60 went from 1409 to 179 bytes.
- `image_resize` wrote `001 - ac-three/s256-resized.png`, and the input's SHA-256 was the same before and after.
- `image_rotate` with `background: "red"` returned `-32602` and created no folder.
- All eight tools returned `PATH_NOT_ALLOWED` for a path outside the allowed roots, and the output folders were unchanged.

### Files Changed

All paths are inside `AI Systems/Media Editor/mcp server/`. Nothing was staged or committed.

| File | Action | Purpose |
|------|--------|---------|
| `src/tools/image/sharp-output.ts` | Created | The shared image module: content gate, pixel limit, exclusive writes, cleanup on failure, encoder mapping |
| `src/tools/image/resize.ts`, `convert.ts`, `crop.ts`, `compress.ts`, `rotate.ts`, `flip.ts`, `probe.ts`, `batch-resize.ts` | Created | The eight tools |
| `src/server/field-schemas.ts` | Created | `outputNameField`, the shared `outputName` schema |
| `src/server/all-tools.ts` | Modified | Registers the eight tools, nine in all |
| `src/tools/media/health.ts` | Modified | Reports `imageEngine` (sharp and libvips versions) and a shorter reply text |
| `tests/tools/image/*.vitest.ts` (11 files) | Created | 256 tests: one file per tool, `sharp-output`, `output-name` and `write-failure` |
| `tests/tools/media/health.vitest.ts`, `tests/server/registry.vitest.ts` | Modified | Health text and `imageEngine`, and the registry's tool count |
| `tests/helpers/media.ts`, `tests/helpers/tool-client.ts` | Modified | Shared helpers the image tests call |

### Handoff to the next phases

- Take `outputName` from `outputNameField` in every writing tool, so a name never carries a path.
- `runBinary(name, args, { inputs })` still requires `inputs`. The image tools do not call it, and a grep confirms `writeFile`, `mkdir`, `child_process`, `process-runner` and `runBinary` appear nowhere in `src/tools/image`.
- A tool with a cross-field rule checks it in the handler and returns `INVALID_INPUT`. The registry takes a zod raw shape, so an object-level `.refine()` cannot be attached. Use `z.enum([...])` with normalisation in the handler, not a zod transform.
- For `009-media-editor-integration`: the tool names are `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe` and `image_batch_resize`. Output lands in `NNN - <description>/` under the output folder, and the seven `MEDIA_EDITOR_*` settings from phase 2 are the only configuration. The image tools need no ffmpeg, so they work when ffmpeg is missing.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Tasks T002 to T010 each ran as one dispatch to Grok 4.7 through `cursor-agent` (`grok-4.7-xhigh-fast`), one tool and its test at a time. The DeepSeek fallback through Pi never triggered. After each dispatch the orchestrator read the files, reran the type check and the full suite, and ran the alignment stand-in gate before the next one. The full gate in T011 and the fixes that followed the review were done directly, and MiMo ran the review in T013.

### Read-only review

MiMo v2.6 Pro (high) read the eight modules against their contract rows and returned three findings. Each was checked against the code before anything changed.

| Finding | Claim | Outcome |
|---------|-------|---------|
| F1 (P1) | `outputName` accepts separators, so a caller could steer the folder name toward another directory | Confirmed and fixed. All seven writing tools share `outputNameField`, and `tests/tools/image/output-name.vitest.ts` runs 56 cases: seven tools, one plain name and seven bad ones each. |
| F2 (P2) | `image_batch_resize` has no coverage of `sizes[].height` | Confirmed and fixed. Tests refuse height 0, 32769 and a fractional height, and one test checks that a given height crops to the exact box. |
| F3 (P2) | Tool descriptions list the `jpg` alias, which the contract does not | Confirmed and fixed. The descriptions name the four canonical formats and the schema still accepts `jpg`. |

MiMo did not re-review the fixes. F1 and F3 are proven by tests that fail without the fix, and F2 was a coverage gap, so its fix is the tests themselves. F1 was checked by mutation: removing the separator rule from `outputNameField` fails 28 of the 56 cases, the four names with a slash or backslash on each of seven tools. The empty and over-length names still fail on the length limits. F3 had no test when the fix landed, so one was added at close-out in `convert.vitest.ts`, and putting `jpg` back into the convert description makes it fail.

### Edge-case work that followed

- **A file deleted after the path guard.** `openForRead` in `sharp-output.ts` turns a missing file into `INPUT_NOT_FOUND`, not a raw filesystem error. A helper-level test covers it, and the tool-level race cannot be forced reliably (Known Limitations, item 4).
- **Disk full.** `write-failure.vitest.ts` mocks `node:fs/promises` so an exclusive-open handle's `write` fails with `ENOSPC`. The tool returns `INTERNAL` with `details.tool` set, and the output folder is gone afterwards. Removing the folder cleanup at `sharp-output.ts:486` failed both tests, so the test does catch it.
- **AVIF reported as `heif`.** sharp names an AVIF file `heif`. `imageFormatName` maps it to `avif` so a written file's format matches what the tool was asked for.
- **A stale registry test.** `registry.vitest.ts` still expected one tool and was corrected to nine.

Nothing was committed, staged or pushed.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| One shared module for the eight tools | Content gate, pixel limit, folder allocation, exclusive writes and cleanup exist once, so a fix lands in every tool. |
| Refuse by content, not by extension | The first 16 bytes must be a raster image signature. A PDF or SVG renamed to `.png` gets `UNSUPPORTED_FORMAT` with `reason: "image-content"`. |
| Pixel limit of 100 million | Decoding a huge image can exhaust memory before a timeout helps. The limit is passed to sharp as `limitInputPixels` and checked on the header first. |
| `outputName` fails the schema | A name with a separator gets `-32602` and no folder, and the field is shared, so no tool can forget the rule. |
| `jpg` is accepted by the schema and hidden from descriptions | Callers that type `jpg` work, and the documented list stays the contract's four. |
| Cross-field rules live in the handler | The registry takes a zod raw shape, so a rule such as "width or height" returns `INVALID_INPUT` from the handler. |
| Undecodable input is `UNSUPPORTED_FORMAT`, an unmapped write failure is `INTERNAL` | `PROCESS_FAILED` is kept for ffmpeg and ffprobe runs, and the image tools start neither. |

### Contract amendments made in this phase

`001-tool-contract/contract.md` stays at version 0.2 and its change log records two rows: the `dimension-required` handler check on `image_resize`, and `imageEngine` on `media_health` together with the shared `outputName` field.

### Dependency licences

No dependency was added in this phase. The two that carry image code were read from the installed packages on 2026-09-29.

| Package | Version | Licence | Use |
|---------|---------|---------|-----|
| `sharp` | 0.35.5 | Apache-2.0 | All eight image tools |
| libvips, inside sharp's platform binding | 8.18.7 | LGPL-3.0-or-later | The engine sharp calls |

### Inherited source defects

Section 9 of `../001-tool-contract/contract.md` lists thirteen defects in the two sources. This phase closes the image side of five and all of G12.

| Defect | Class | Closed here by | Evidence |
|--------|-------|----------------|----------|
| G3 No root limit, output may equal input | class-of-bug | Every `outputPath` became `outputName` on the shared schema, and batch suffixes cannot hold a separator | `output-name.vitest.ts`, 56 cases; the suffix pattern in `batch-resize.ts` |
| G4 Caller strings reach the engine unvalidated | class-of-bug | `rotate` background takes `#rrggbb` only | `rotate` with `red` returns `-32602` and no folder |
| G5 Overwrite policy differs per call | class-of-bug | Every output is opened exclusively, and `assertUniqueSuffixes` refuses two batch sizes that would share a file before any path work | `batch-resize.vitest.ts` "rejects a repeated suffix before any path work" |
| G10 Error taxonomy is misleading | class-of-bug | A missing input gives `INPUT_NOT_FOUND`, including after the path guard | `batch-resize.vitest.ts` "reports a missing input", and the `openForRead` helper test |
| G12 Imagician takes unvalidated input and builds directories from caller strings | class-of-bug | Typed ranges, a `fit` enum, a required dimension, `withoutEnlargement`, output only under the configured folder, and `image_probe` without `lastModified` | All eight schemas, and the live `tools/list` comparison against section 3.1 |
| G13 Doc drift | class-of-bug | The eight descriptions were written from the schemas | The description test in `convert.vitest.ts` and the live comparison |

Left to the video and audio phases: G2 (concat list quoting), G4 (filter strings), G8 (silent capability lies) and G9 (bugs), each in the tool that owns it. G13 stays open for every tool those phases write.

### Matrix

| Axis | Values | Rows exercised |
|------|--------|----------------|
| Platform | darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64 | One host observed. sharp's per-platform binding was run on darwin-arm64 only |
| Output format | jpeg, png, webp, avif | `convert.vitest.ts` runs source and target pairs over all four, and `batch-resize.vitest.ts` runs each output format |
| Input rejection | wrong signature, over the pixel limit, outside the roots, missing, relative path | Signature and pixel limit in `sharp-output.vitest.ts`. Roots, missing and relative path in the tool files, and all eight tools were run against a path outside the roots |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run build` | PASS, exit 0 |
| `npx vitest run` | PASS, exit 0: 26 files, 522 tests, 518 passed, 4 skipped, 0 failed |
| `npx vitest run tests/tools/image` | PASS, exit 0: 11 files, 256 tests in 466 ms as vitest reports it, about 172 ms of wall time across the tests, slowest test 35 ms, against the 30 s budget |
| Same suite with all seven `MEDIA_EDITOR_*` variables set to hostile values | PASS: 518 passed, 4 skipped |
| Literal run of AC-001 to AC-009 over the built server | PASS: nine of nine Met, output captured above |
| Disk-full test catches a missing folder cleanup | PASS: removing the cleanup at `sharp-output.ts:486` failed both tests |
| Description test catches a `jpg` in the description | PASS: with `jpg` put back the test fails, and it passes again once the file is restored |
| `grep` for `: any`, untyped `catch (error)` and `shell: true` in `src` | PASS, prints nothing |
| `grep` for `writeFile`, `mkdir`, `child_process`, `process-runner`, `runBinary` in `src/tools/image` | PASS, prints nothing |
| Stand-in alignment gate (the real script on a scratch git copy, plus greps and header, line-length, ephemeral-id and em-dash checks) | PASS: 60 files scanned, 0 findings |
| NFR-P01, one call on a 4000x3000 JPEG | PASS: resize 56 ms, crop 44, probe 2, batch resize (3 sizes) 147, compress 170, rotate 168, flip 121, convert to webp 922, convert to avif 2932 (slowest, under the 5 s budget) |
| `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/003-image-tools --strict` | PASS, `RESULT: PASSED`: Errors 0, Warnings 0, AC_COVERAGE 9/9 with evidence, AC_CLOSURE 9/9 met and closeable |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **No package README yet.** The P2 row for it (CHK-042) is deferred to `007-desktop-extension`, which owns packaging and user-facing docs. The packaging review (CHK-124) goes with it.
2. **The review fixes were not re-read by MiMo.** The two code fixes (F1, F3) have tests that fail without them, and the orchestrator checked both by mutation. F2 was a coverage gap closed with tests. No second review ran.
3. **Windows is unverified.** The image tools reach the filesystem through the shared path guard, whose Windows cases run against `path.win32` on this machine. Nothing in this phase ran on Windows, and sharp's bindings for the other four platforms were not run.
4. **A file deleted between the guard and the read is covered at helper level only.** `openForRead` gives `INPUT_NOT_FOUND`, and the tool-level race cannot be forced reliably in a test.
5. **AVIF is the slow path.** Converting a 4000x3000 JPEG took 2932 ms, inside the 5 s budget but well behind every other tool.
6. **Licence limits carry forward.** libvips is LGPL-3.0-or-later. The image tools never start ffmpeg, but the `ffmpeg-static` GPL and nonfree limit from phase 2 still governs any bundle that ships (contract 10.4, phase 7).
7. **The spec and the contract differ in small places.** `image_compress` reports `bytesBefore` and `bytesAfter` as integers with no percentage, and adds a growth warning that contract section 7 does not list. `image_probe` reports `bitDepth` as an integer, names AVIF `avif`, and reports density only when the file carries it. `spec.md` was corrected to the contract's error codes (`UNSUPPORTED_FORMAT` and `INTERNAL`, not `IMAGE_PROCESSING_FAILED`), and the rest are recorded here for the phase 9 docs.
8. **Sign-offs.** The Operator and MiMo sign-off rows in `tasks.md` are left unticked. They are theirs to give.
<!-- /ANCHOR:limitations -->

---
