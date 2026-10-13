---
title: "Acceptance Criteria: Phase 3: image tools"
description: "The criteria this packet must satisfy before it may be closed, each one met, waived by a decision record, or superseded by one."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/003-image-tools"
    last_updated_at: "2026-09-29T06:15:00Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Marked every criterion met"
    next_safe_action: "Start 004-video-audio-core"
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
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 3: image tools

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/003-image-tools
**Level:** 3
**Status:** Complete
**Date:** 2026-09-28
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the built server, When `tools/list` runs, Then it returns `media_health` and the eight `image_*` names from the contract | `npx vitest run tests/server/registry.vitest.ts`. Observed 2026-09-29: a `tools/list` call over the built server returned `media_health`, `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe` and `image_batch_resize`, and the registry test pins the same nine names. Evidence: tests/server/registry.vitest.ts:258. | Met | - |
| AC-002 | REQ-002 | Given an input outside every allowed root, When any image tool is called, Then it returns `PATH_NOT_ALLOWED` and writes nothing | Refusal case in each `tests/tools/image/*.vitest.ts`. Observed 2026-09-29: a file outside every allowed root gave `PATH_NOT_ALLOWED` from all eight tools in a literal run, with the output folder list unchanged. The eight tool files each hold the refusal test. Evidence: tests/tools/image/resize.vitest.ts:402. | Met | - |
| AC-003 | REQ-002 | Given a successful call, When the output is listed, Then it sits in a new `NNN - <description>/` folder and the input's hash is unchanged | Hash-before and hash-after assertion in `tests/tools/image/resize.vitest.ts`. Observed 2026-09-29: a literal `image_resize` call wrote `001 - ac-three/s256-resized.png` and the input's sha256 was identical before and after. The suite asserts the same on every tool. Evidence: tests/tools/image/resize.vitest.ts:257. | Met | - |
| AC-004 | REQ-003 | Given a 256 by 256 image, When `image_crop` asks for a 100 by 100 region at (200, 200), Then it returns `INVALID_INPUT` naming the image size | `npx vitest run tests/tools/image/crop.vitest.ts`. Observed 2026-09-29: a literal 256 by 256 image with a 100 by 100 region at (200, 200) returned `INVALID_INPUT` with the message `The crop region does not fit the 256x256 image (left + width is 300).` and `details` carrying `imageWidth` 256, `imageHeight` 256 and `reason` `region-exceeds-image`. The suite uses other sizes, one pixel past each edge and past both. Evidence: tests/tools/image/crop.vitest.ts:443. | Met | - |
| AC-005 | REQ-004 | Given the image tests, When `npx vitest run tests/tools/image` runs, Then 8 tool files and the helper file pass | vitest summary. Observed 2026-09-29: `npx vitest run tests/tools/image` reported 11 files and 256 tests passed, exit 0. That is the 8 tool files and the helper file, plus `output-name.vitest.ts` and `write-failure.vitest.ts`, which the row does not name. Evidence: tests/tools/image/sharp-output.vitest.ts:1. | Met | - |
| AC-006 | REQ-005 | Given a 100 by 100 image with `width: 400` and `withoutEnlargement: true`, When `image_resize` runs, Then the output stays 100 by 100 | `tests/tools/image/resize.vitest.ts`. Observed 2026-09-29: a literal 100 by 100 image with `width: 400` and `withoutEnlargement: true` came back 100 by 100. The suite runs the same rule on a 64 by 48 image at width 500 and covers the opposite setting at line 311. Evidence: tests/tools/image/resize.vitest.ts:294. | Met | - |
| AC-007 | REQ-006 | Given `background: 'red'`, When `image_rotate` is called, Then the call fails the schema with protocol error `-32602` and no folder is created | `tests/tools/image/rotate.vitest.ts`. Observed 2026-09-29: a literal call with `background: 'red'` failed with protocol error -32602 and created no folder. The schema takes the hex form only, as the contract says. Evidence: tests/tools/image/rotate.vitest.ts:69. | Met | - |
| AC-008 | REQ-007 | Given any image, When `image_probe` runs, Then the result has format, width, height and byte size but no modification time | `tests/tools/image/probe.vitest.ts`. Observed 2026-09-29: a literal probe returned `format`, `width`, `height`, `channels`, `bitDepth`, `colorSpace`, `hasAlpha` and `fileSize` with the text `Read s256.png: 256x256 png, 1409 bytes.` and no modification time. The suite asserts `lastModified`, `exif`, `icc`, `xmp` and `iptc` are absent. Evidence: tests/tools/image/probe.vitest.ts:170. | Met | - |
| AC-009 | REQ-008 | Given a PNG, When `image_compress` runs at quality 60, Then the result reports both byte counts as `bytesBefore` and `bytesAfter` | `tests/tools/image/compress.vitest.ts`. Observed 2026-09-29: a literal PNG compressed at quality 60 reported `bytesBefore` 1409 and `bytesAfter` 179, both integers. The suite asserts the two field names and their types. Evidence: tests/tools/image/compress.vitest.ts:234. | Met | - |

### Status values

| Value | Meaning |
|-------|---------|
| `Met` | Verified. The Verification cell names evidence that was actually observed. |
| `Unmet` | Not yet satisfied. Blocks closure. |
| `Waived` | Deliberately not pursued. Requires an ADR in the Waiver cell. |
| `Superseded` | Replaced by a different criterion or decision. Requires an ADR in the Waiver cell. |

### Waiver cell

Write `-` when the row is `Met` or `Unmet`. Write `ADR-NNN` when the row is
`Waived` or `Superseded`, naming a decision record that exists in
`decision-record.md`. A waiver naming an ADR that is not there fails validation:
the point of a waiver is that someone recorded the reasoning, so an unbacked
waiver is treated as an unmet criterion rather than as a pass.
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** Yes

AC-001 to AC-009 are Met on evidence observed on 2026-09-29 from the final state: a literal run of each criterion over the built server, the 11 image test files at 256 passed, and the full suite at 518 passed and 4 skipped.

Consciously left out, each named in the row or the note that carries it:

- **Test numbers against criterion numbers.** Several criteria name inputs the suite does not use, such as the 256 by 256 crop (AC-004), the 100 by 100 resize (AC-006) and quality 60 on a PNG (AC-009). A literal run over the built server covers each one, and the suite covers the same rule on its own sizes.
- **AC-005 count.** The row names 8 tool files and the helper. The run has 11 files, because `output-name.vitest.ts` and `write-failure.vitest.ts` were added after the row was written.
- **Reviewer sign-off.** MiMo found three issues, all fixed and each proven by a test that fails without the fix. MiMo did not review the fixes, so its sign-off stays open in `tasks.md`.
- **REQ-006.** The row follows the contract: hex only, and a named colour fails the schema.
- **A file removed between the guard and the read.** It is tested at the helper level and not through a full tool call.
<!-- /ANCHOR:closure -->
