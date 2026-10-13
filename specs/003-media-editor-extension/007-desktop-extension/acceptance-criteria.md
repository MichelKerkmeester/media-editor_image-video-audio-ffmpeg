---
title: "Acceptance Criteria: Phase 7: desktop extension"
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
    packet_pointer: "003-media-editor-extension/007-desktop-extension"
    last_updated_at: "2026-09-29T18:45:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Recorded eight met criteria and the two waiting on the smoke test"
    next_safe_action: "Record the operator smoke test, then close AC-004 and AC-008"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 7: desktop extension

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/007-desktop-extension
**Level:** 3
**Status:** In progress
**Date:** 2026-09-28
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given `manifest.json` for a target, When `npx mcpb validate manifest.json` runs, Then it exits 0 | `mcpb validate` exit 0 on the root manifest and on the manifest packed in each of the five bundles, 2026-09-29 (`implementation-summary.md`) | Met | - |
| AC-002 | REQ-002 | Given each of the five bundles, When its archive is listed and `file` runs on its ffmpeg, ffprobe and sharp binaries, Then every binary matches the bundle's platform and architecture | `tests/packaging/bundle-contents.vitest.ts`: `file` on ffmpeg, ffprobe, the sharp module and libvips matches each target (Mach-O arm64 and x86_64, PE32+ x86-64, ELF x86-64 and aarch64); a wrong-arch file in the linux-arm64 slot fails 4 tests | Met | - |
| AC-003 | REQ-003 | Given any bundle, When its archive is listed, Then `LICENSE` holds both upstream copyright lines and `THIRD_PARTY_NOTICES.md` names every bundled binary's licence | Replaced by AC-010, which checks the files contract 10.1 names | Superseded | ADR-004 |
| AC-004 | REQ-004 | Given a clean machine with no ffmpeg and no Node, When the operator installs the bundle and sets the folders, Then `media_health` reports the bundled binaries and `image_resize` writes a file into the output folder | Operator's smoke note in the `goal.md` log with date and platform. An automated stand-in passed on 2026-09-29 (the unpacked darwin-arm64 bundle started over stdio, `media_health` found both binaries `bundled`, `image_resize` wrote a 32 px PNG), but it is not a clean machine or Claude Desktop | Unmet | - |
| AC-005 | REQ-005 | Given the manifest, When its tool list is compared with the registry, Then both hold the same 38 names | `tests/packaging/manifest.vitest.ts`: the 38 manifest names equal `ALL_TOOLS` in order, and each description is the registry's first sentence | Met | - |
| AC-006 | REQ-006 | Given the five bundles, When their sizes are measured, Then each is 150 MB or less | `npm run bundle -- --all`: 70,319,714, 65,748,895, 73,610,195, 73,117,142 and 64,669,717 bytes, each under the 150,000,000-byte check in `checkBundleSize` | Met | - |
| AC-007 | REQ-007 | Given the spike, When it finishes, Then ADR-001 records the chosen build method and the command that proved it | `decision-record.md` ADR-001, accepted 2026-09-29 with the npm commands and their `file` results | Met | - |
| AC-008 | REQ-008 | Given two allowed folders in the settings, When the server starts, Then both are accepted roots | Automated half met: the manifest test runs the MCPB reference expansion of two folders into `loadConfig` and gets both roots in order, and `tests/core/config.vitest.ts` covers bare paths. The smoke note in Claude Desktop itself is still due | Unmet | - |
| AC-009 | REQ-009 | Given `Favicon.jpg`, When the icon step runs, Then `icon.png` exists at the documented size | `file icon.png`: PNG 512 x 512, the size `mcpb validate` recommends | Met | - |
| AC-010 | REQ-003 | Given any of the five bundles, When its archive is listed and read, Then `LICENSE`, `THIRD_PARTY_NOTICES` with both upstream copyright lines, and `licenses/ffmpeg-LICENSE.txt`, `ffmpeg-SOURCE.md` naming the shipped build's version, `libvips-LICENSE.txt` and `node-modules.txt` are present and non-empty | `bundle-contents.vitest.ts` "carries every licence notice" for all five, and the pack-time `checkNotices`, which stopped two builds on real gaps before they were fixed | Met | - |

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

**Closeable:** No

Eight criteria are met (AC-001, AC-002, AC-005 to AC-007, AC-009 and AC-010) and AC-003 is superseded by AC-010 through ADR-004. Two stay unmet, and both wait on the operator's clean-machine install in Claude Desktop: AC-004 (the bundled binaries and a real `image_resize`) and the Claude Desktop half of AC-008 (two folders become two roots). Their automated stand-ins pass, as each row says, but a stand-in is not the install, so the phase stays open until the smoke note lands in `goal.md`.
<!-- /ANCHOR:closure -->
