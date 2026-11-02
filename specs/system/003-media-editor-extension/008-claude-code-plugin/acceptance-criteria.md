---
title: "Acceptance Criteria: Phase 8: Claude Code plugin"
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
    packet_pointer: "003-media-editor-extension/008-claude-code-plugin"
    last_updated_at: "2026-09-28T16:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Authored the acceptance criteria for this packet"
    next_safe_action: "Meet, waive or supersede the open criteria"
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
# Acceptance Criteria: Phase 8: Claude Code plugin

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 003-media-editor-extension/008-claude-code-plugin
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
| AC-001 | REQ-001 | Given the plugin folder, When `claude plugin validate` runs on it, Then it exits 0 | Validate output in `implementation-summary.md`: exit 0 on the folder and on `plugin.json`, Claude Code 2.1.284 | Met | - |
| AC-002 | REQ-002 | Given `claude --plugin-dir <plugin folder>`, When a session starts, Then the tool list shows 39 Media Editor tools and `media_health` answers | Session summary in the `goal.md` log: the init lists 39 `mcp__plugin_media-editor_media-editor__*` tools, the server is `connected`, and `media_health` reports the bundled ffmpeg 9.0.2 | Met | - |
| AC-003 | REQ-003 | Given no `consent` flag, When `media_setup_ffmpeg` is called, Then it returns the planned URL, size, hash and destination and writes nothing | `setup-ffmpeg.vitest.ts` 'plans both downloads and writes nothing without consent': `CONSENT_REQUIRED` with URL, size, both digests and destination per row, no fetch made, and the data folder listing unchanged | Met | - |
| AC-004 | REQ-003 | Given consent and a fixture serving a file with the wrong hash, When the tool downloads it, Then it deletes the file and returns an error naming the mismatch | `setup-ffmpeg.vitest.ts` 'refuses a body whose digest does not match and leaves no trace': `CHECKSUM_MISMATCH` naming `expected`, `actual` and `url`, and no archive, binary, record or work folder left. An injected fetch serves the body instead of a local HTTP fixture | Met | - |
| AC-005 | REQ-004 | Given a packed plugin, When `skills/media-editor/` is hashed against `sk-media-editor/`, Then every file matches | `build-plugin.vitest.ts` 'copies the tracked skill byte for byte' and 'keeps the built plugin skill equal to its source' over the built plugin's 40 files | Met | - |
| AC-006 | REQ-005 | Given the spike, When it finishes, Then ADR-001 records whether Claude Code supplied Node, with the command and output | `decision-record.md` ADR-001: four `claude --plugin-dir <plugin> mcp list` runs with and without Node, and their output | Met | - |
| AC-007 | REQ-006 | Given a spike result of no Node, When the plugin is built, Then `plugin.json` runs `node` and the README states Node 18 or later | `plugin.json` runs `node`, and the README states Node.js 20.9.0 or later, the package's own `engines` floor, instead of Node 18 | Superseded | ADR-001 |
| AC-008 | REQ-007 | Given a consented setup on a machine with no other ffmpeg, When `media_health` runs, Then it reports the downloaded binary as the source | `setup-ffmpeg.vitest.ts` 'installs both binaries with consent and records them' re-resolves through the real resolver to `source: 'installed'`, `ffmpeg-resolver.vitest.ts` 'accepts an installed binary when the pin and the record match', and `media_health` reports the resolver's `source` as it is | Met | - |
| AC-009 | REQ-008 | Given the registry and the Desktop manifest, When their tool lists are compared, Then both hold the same 39 names | `manifest.vitest.ts` with `TOOL_COUNT = 39` and `registry.vitest.ts` listing `media_setup_ffmpeg`, both passing | Met | - |
| AC-010 | REQ-008 | Given the five repacked phase 7 bundles, When each is unpacked and its server lists tools, Then every bundle holds the same 39 names, including `media_setup_ffmpeg` | `mcpb validate` exit 0 on all five packed manifests, each with 39 tools, and the five bundles carry the same 70 compiled server files. The darwin-arm64 server, the one this Mac can run, lists 39 tools in the plugin session | Met | - |

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

Nine criteria are met and AC-007 is superseded by ADR-001, which found that Claude Code supplies no Node and set the floor at the package's own 20.9.0. The plugin validates, a live session lists the 39 tools and runs them, and the setup tests prove the consent gate, the digest refusal and the resolver pickup. Consciously left out: a local HTTP fixture, replaced by an injected fetch plus one live download over the real redirect, and a consented download run through the tool inside a session.
<!-- /ANCHOR:closure -->
