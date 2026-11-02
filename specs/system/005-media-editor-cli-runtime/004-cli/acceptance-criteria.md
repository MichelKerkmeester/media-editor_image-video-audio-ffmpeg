---
title: "Acceptance Criteria: Phase 4: cli"
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
    packet_pointer: "005-media-editor-cli-runtime/004-cli"
    last_updated_at: "2026-10-04T18:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Marked all eleven criteria Met with evidence"
    next_safe_action: "Start 005-skill-cli-only"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "088-scaffold-session"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Phase 4: cli

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 005-media-editor-cli-runtime/004-cli
**Level:** 2
**Status:** Complete
**Date:** 2026-10-04
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the runtime, When MCP and the CLI each run a tool, Then both call the same exported dispatch module | `tool-registry.ts:138` and `cli.ts:382` both call `dispatchTool`. `returns the same structured body through dispatch as MCP` in `tests/cli/dispatch.vitest.ts` passes | Met | - |
| AC-002 | REQ-002 | Given the built CLI, When `media-editor list` runs, Then it names the same 40 tools the MCP server lists | `lists the same tools in the same order as MCP` and `lists every tool as one JSON object on stdout` pass. The plugin shim `list` from a scratch folder printed 40 tools with exit 0 | Met | - |
| AC-003 | REQ-003 | Given JSON args by flag, file or stdin, When `media-editor <tool>` runs, Then the handler runs and stdout holds the result's `structuredContent` as JSON | `converts into one numbered folder with --args`, `with --args-file` and `with stdin` pass | Met | - |
| AC-004 | REQ-004 | Given tool argv with a bare token, When the CLI loads its config, Then the token is not an allowed folder | `rejects a bare token and never opens that folder` passes. A bare token exits 2 and the folder stays outside the allowed roots | Met | - |
| AC-005 | REQ-005 | Given the changed runtime, When `npm run test:pinned` runs, Then it passes with the baseline counts plus the new tests | `npm run test:pinned`: 91 files passed, 1,821 passed and 4 skipped of 1,825, against 86 files and 1,771 passed before this phase (1,749 in `../scratch/baseline.md` before phase 002). Packaging 146 passed and 2 skipped | Met | - |
| AC-006 | REQ-006 | Given a tool name, When `media-editor describe <tool>` runs, Then it prints the tool's JSON Schema | `describes image_convert with the placement and size fields` and `describes the same property names MCP publishes for every tool` pass. `describe` uses the MCP schema conversion | Met | - |
| AC-007 | REQ-007 | Given success, a tool error and a usage error, When each runs, Then each exits with its own documented code | Exit 0 for the conversions, 1 for `PATH_NOT_ALLOWED`, 2 for the seven usage cases in `reports bad input as exit 2 with INVALID_INPUT` | Met | - |
| AC-008 | REQ-008 | Given a running ffmpeg job, When SIGINT or SIGTERM arrives, Then no ffmpeg child and no temp folder remain | `kills the encode and cleans up on SIGTERM` (143), `on SIGINT` (130) and `exits promptly on SIGTERM while an encode runs` pass under `test:pinned` | Met | - |
| AC-009 | REQ-009 | Given a preview request, When the CLI runs it, Then the preview is a file and the JSON names its path | `writes image_probe previews under the data folder as JPEG` passes, and the JSON carries `previewPath` under `<dataDir>/previews` | Met | - |
| AC-010 | REQ-010 | Given `MEDIA_EDITOR_DATA_DIR`, When `media_setup_ffmpeg` runs in one call and `media_health` in a later one, Then the later call sees the setup | Live run on a plugin copy with its bundled binaries removed and a scratch data folder: `media_setup_ffmpeg` with consent installed ffmpeg and ffprobe 9.0.2 into `<data>/bin`, and a later `health` call reported both found with source `installed`. `persists the probe cache in the shared data folder between runs` also passes | Met | - |
| AC-011 | REQ-011 | Given a scratch folder with no flag and no `MEDIA_EDITOR_*` value set, When `media-editor image_convert` runs there, Then the input is allowed from that folder and the result lands under `<cwd>/media files/export` | `converts into one numbered folder with --args` runs with no flag in a scratch folder and asserts the folder sits under `<cwd>/media files/export`. Only `MEDIA_EDITOR_DATA_DIR` is set, to keep tests off the real data folder. The shim proof landed four files in `<scratch>/media files/export/001 - webp-under-100kb/` | Met | - |

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

All eleven criteria are Met with observed evidence on 2026-10-04. The `mcpServers` entry in the plugin stays for phase 005, which removes it.
<!-- /ANCHOR:closure -->
