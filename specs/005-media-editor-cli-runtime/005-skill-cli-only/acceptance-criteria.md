---
title: "Acceptance Criteria: Phase 5: skill-cli-only"
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
    packet_pointer: "005-media-editor-cli-runtime/005-skill-cli-only"
    last_updated_at: "2026-10-04T19:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Marked all nine criteria Met with evidence"
    next_safe_action: "Start 006-verify-and-release"
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
# Acceptance Criteria: Phase 5: skill-cli-only

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 005-media-editor-cli-runtime/005-skill-cli-only
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
| AC-001 | REQ-001 | Given `sk-media-editor/`, When it is searched for MCP routes and `media_health` calls, Then none is left outside the mirrored transport-neutral references, and the tool check is `media-editor health` | The `rg` in implementation-summary.md returns only Project-labelled lines and the router binding the kernel copies. `rg -i mcp` outside `changelog/` finds only `.mcpb` file names and the npm package name. `SKILL.md` checks `media-editor health` | Met | - |
| AC-002 | REQ-002 | Given `SKILL.md` and `router-contract.md`, When the route order is read, Then it is the CLI, then hand-written ffmpeg, then advice | `SKILL.md` section 2 and rule ALWAYS 1 read the command, then ffmpeg, then advice. `choose_route` returns `cli` first, and the differential passes 132/132 across six host states | Met | - |
| AC-003 | REQ-003 | Given the built plugin, When `plugin.json` is read and the packaging tests run, Then it has no `mcpServers`, it ships `server/`, the skill and an executable `bin/media-editor` that runs `media-editor list`, and the tests pass | `grep -c mcpServers` on `plugin.json` prints 0. The built plugin has `server/`, `skills/sk-media-editor/` and an executable `bin/media-editor` that listed 40 tools from a scratch folder. `npx vitest run tests/packaging`: 8 files, 149 passed, 2 skipped | Met | - |
| AC-004 | REQ-004 | Given a sandbox clone, When router fixtures, the differential, `rule_parity`, twin divergence and parity run, Then each passes | Fresh sandbox clone: fixtures 22/22, differential 132/132, `rule_parity` 5 rules, twin divergence and `check_report` on the sample report, parity 7/7, each exit 0 | Met | - |
| AC-005 | REQ-005 | Given the Sync Loop declaration, When parity and `pair_divergence` run, Then every pair is identical or a declared deviation | Sandbox clone: `run_parity.sh` PASSED 7/7 declared pairs with `cli.md` declared unmirrored, `pair_divergence media-editor` PASSED 7 pairs, residency PASSED | Met | - |
| AC-006 | REQ-006 | Given `references/cli.md`, When it is compared with the CLI, Then it covers every command, the args sources, the output and the exit codes | `cli.md` covers `list`, `describe`, `health` and `<tool>`, all three args sources, stdout and stderr, and exit codes 0, 1, 2, 3, 130 and 143, matching `runtime/README.md` section 5 and the usage line. Its four-call example ran verbatim into one folder, exit 0 each | Met | - |
| AC-007 | REQ-007 | Given the setup pair, When both sides are read and compared, Then one file carries a plugin and standalone CLI section and a Desktop extension section, and the pair is byte-identical | `setup.md` section 3 to 5 is the extension and section 6 the command, with a check table per surface in section 8. `cmp` with `Media Editor - Reference - Setup.md` is silent | Met | - |
| AC-008 | REQ-008 | Given the playbook, When the validator runs, Then it passes and the route-order scenarios match the new order | Playbook validator in the sandbox clone: PASS, 32 scenarios, 19 categories, 0 violations. SRO-001 is now `command-first.md`, and SRO-002 falls back when the command is off the PATH | Met | - |
| AC-009 | REQ-009 | Given the guides, READMEs and `AGENTS.md`, When each is read, Then each describes the CLI route for the skill | Read back after the drafts: `AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, the skill README and the plugin README name the `media-editor` command as the skill route. `rg` finds no `mcp list` and no plugin MCP server claim | Met | - |

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

All nine criteria are Met with observed evidence on 2026-10-04. A live Claude Code session with the plugin, spec success criterion SC-001, is left to phase 006 with the other live runs.
<!-- /ANCHOR:closure -->
