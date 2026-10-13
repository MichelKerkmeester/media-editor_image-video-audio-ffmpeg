---
title: "Acceptance Criteria: Align the Media Editor skill and Claude Project with its own MCP server, Desktop extension and Claude Code plugin, and end the kernel with Router Code"
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
    packet_pointer: "004-media-editor-tool-alignment"
    last_updated_at: "2026-10-03T14:40:59Z"
    last_updated_by: "scaffold"
    recent_action: "Authored the acceptance criteria for this packet"
    next_safe_action: "Meet, waive or supersede the open criteria"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "[SESSION-ID]"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
# Acceptance Criteria: Align the Media Editor skill and Claude Project with its own MCP server, Desktop extension and Claude Code plugin, and end the kernel with Router Code

<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 004-media-editor-tool-alignment
**Level:** 2
**Status:** Complete
**Date:** 2026-10-03
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the research config, When the loop runs, Then five iterations complete on `opencode-go/deepseek-v4.1-flash` at max thinking, each with content and route proof | `research/deep-research-config.json:22` (model) and `:23` (max); `research/research.md:52` (method: `verify-iteration.cjs` OK with route proof for iterations 1 to 5) | Met | - |
| AC-002 | REQ-002 | Given the five iterations, When synthesis runs, Then `research/research.md` holds a ranked change list in which every row names a file path | `research/research.md:183` (section 11; first ranked row at `research/research.md:189`, 26 rows each with a path) | Met | - |
| AC-003 | REQ-003 | Given the findings, When they are reported, Then tool counts, tool names and every claimed gap were checked against `mcp server/src` | `research/research.md:316` (correction table: 39 tools, 15 error codes, the trim, extract and compression checks against the server source) | Met | - |
| AC-004 | REQ-004 | Given the change, When `python3 benchmark/router/differential.py` runs, Then it prints `PASSED` with `SKILL.md` holding no Python fence and the kernel's `## 8. ROUTER CODE` equal to the contract minus comments | `python3 benchmark/router/differential.py` prints `PASSED 66/66 differential checks (22 inputs x 3 host states, 11 commands, 6 modes in parity)`, exit 0. Copy parity holds the kernel's `## 8. ROUTER CODE` equal to the contract minus comments and finds no Python fence in `SKILL.md`. Proven red by an edited kernel router line, exit 1 | Met | - |
| AC-005 | REQ-005 | Given the tool groups, When `bash benchmark/router/run_fixtures.sh` runs, Then every fixture passes and `TOOL_VALUES` holds no retired id | `bash benchmark/router/run_fixtures.sh`: `PASSED 22/22 fixtures`, exit 0. `TOOL_VALUES` in `benchmark/router/route_contract.py` holds only the six tool groups | Met | - |
| AC-006 | REQ-006 | Given the renames, When the retired-name grep runs outside the dated records and `rule_parity.py` runs its scan, Then both find nothing, and `cmp` shows every mirror identical to its source | Retired-name grep outside the dated records: zero live hits (T071 lists the kept-by-design ones). `rule_parity.py`: `retired names: 21 files scanned, 0 finding(s)`, proven red by a planted name. `cmp` of all eight mirrors against their sources: identical | Met | - |
| AC-007 | REQ-007 | Given the declaration, When `run_residency.sh`, `run_parity.sh`, `pair_divergence.py media-editor`, `residency_report.py`, `carrier_query_evidence.py` and `record_claims.py` run, Then each exits 0 with eight pairs and no unowned kernel section | Sandbox at HEAD `5424531a` plus this change: `run_residency.sh` and `run_parity.sh` from Media Editor, `pair_divergence.py media-editor`, `residency_report.py`, `carrier_query_evidence.py` (9 of 9 PASS) and `record_claims.py` (58 claims) each exit 0, with 8 of 8 pairs and no unowned kernel section | Met | - |
| AC-008 | REQ-008 | Given `references/tools.md`, When it is compared with `mcp server/src/tools/**` and `src/core/errors.ts`, Then it lists all 39 tools, the `consent` default and `CONSENT_REQUIRED`, all 15 codes and the three gaps, and its mirror is byte-identical | `sk-media-editor/references/tools.md` lists 39 tools (8 image, 6 audio, 20 video, 5 media), `consent` default `false` and `CONSENT_REQUIRED` as in `setup-ffmpeg.ts:147-149,566-567`, all 15 codes of `src/core/errors.ts:13-27`, and the four gap rows: three gaps plus partial compression. Its mirror is byte-identical | Met | - |
| AC-009 | REQ-009 | Given the kernel, When it is read, Then its H1 reads v0.8.0, its H2s are upper case, section 2 ends with a pointer, and sections 7 and 8 exist with the HVR self-scan line in the delivery protocol | Kernel H1 reads `v0.8.0`. H2s run `## 1. OBJECTIVE` to `## 8. ROUTER CODE` in upper case, with section 7 Project Knowledge Consultation and section 8 Router Code. Section 2 points at Section 8. `### HVR Self-Scan` in section 5 carries the self-scan line | Met | - |
| AC-010 | REQ-010 | Given `SKILL.md`, `AGENTS.md` and `README.md`, When their mode tables are read, Then each mode names its tool group first and ffmpeg second, and the Knowledge count reads eight | `SKILL.md` operating modes, the `AGENTS.md` command registry (Tool and Fallback columns) and `sk-media-editor/README.md` section 3 each name the tool group first and ffmpeg second. The Knowledge count reads eight in `claude project/README.md` and the skill README | Met | - |
| AC-011 | REQ-011 | Given the records, When the playbook validator and `npm test` run after `npm run plugin`, Then both pass, and `SYNC.md` and `changelog/v0.8.0.0.md` carry the change without claiming review | `validate-playbook-package.cjs` on the final tree: PASS, 19 scenarios, 16 categories, 0 violations, exit 0. `npm run plugin` exit 0, then `npm test` showed no new failure against baseline, with the plugin skill-equality test fixed and the rest failing at baseline for absent ffmpeg. `SYNC.md` 2026-10-03 entry and `changelog/v0.8.0.0.md` carry the change, and the entry says the operator has not reviewed it | Met | - |
| AC-012 | REQ-012 | Given the follow-up, When the Media Editor tree is searched and the gates run, Then no Human Voice file, card, self-scan, attestation field, linter or rule remains and every gate passes without them | `references/hvr-core.md`, `human-voice-rules.md`, both Knowledge cards and `lint_replies.py` deleted. `bash benchmark/router/run_fixtures.sh`: 22/22 and 66/66, exit 0. `python3 benchmark/gates/rule_parity.py`: PASSED 5 rules, exit 0. `check_report.sh` on the sample report: clean, exit 0 | Met | - |
| AC-013 | REQ-013 | Given a request that writes a result, When the skill, `AGENTS.md` or the kernel is read, Then each proposes a readable name from the content, applies it only after the user confirms, and writes one result file straight into the export folder | `SKILL.md` File Naming, Export protocol, ALWAYS 8 and NEVER 8. `AGENTS.md` Strict sequence step 2 and File naming. Kernel File Naming, ALWAYS 9, NEVER 9 and Strict Sequence step 3. Playbook `SED-002` and `SED-003`, validator PASS scenarios=29 | Met | - |
| AC-014 | REQ-014 | Given the server, When its suites run on the pinned ffmpeg, Then `media_rename`, `fileName`, `subfolder`, the free-name rule and `preview` are each covered and pass, and the existing suites still pass | `npm run test:pinned`: 86 of 86 files, 1749 passed, 4 skipped, exit 0. New suites `placement.vitest.ts`, `rename.vitest.ts`, `preview.vitest.ts`. A forced-folder mutant failed 6 of 9 placement tests | Met | - |
| AC-015 | REQ-015 | Given the system root README, When it is read, Then the Desktop extension, the Claude Code plugin and the Claude Project and their setup come before the reference material | `README.md` sections 1 to 3: summary, What You Get with the three packagings first, Quick Start with a step list per packaging | Met | - |
| AC-016 | REQ-007 | Given the follow-up, When the Sync Loop gates run in a clean clone of HEAD plus this change, Then parity, residency, pair divergence, the residency report, record claims and carrier evidence each exit 0 | Sandbox clone `600e6ef7`: `run_parity.sh` PASSED 6/6, `pair_divergence.py media-editor` PASSED, `residency_report.py` exit 0 and `record_claims.py` PASSED 58 claims after the restatement, `carrier_query_evidence.py` all 9 checks PASS, exit 0. `run_residency.sh media-editor` PASSED, exit 0, after the mode-table statement was resynced to the padded table the operator kept | Met | - |
| AC-017 | REQ-016 | Given no connected tools, When the skill, `AGENTS.md` or the kernel is read, Then each offers the guided setup once after the advice, `references/setup.md` and its byte-identical mirror give one step at a time with the release link, and the gates hold the new pair | `sk-media-editor/references/setup.md`, `claude project/knowledge/Media Editor - Reference - Setup.md`, kernel tool check, ESCALATE 2 and Knowledge table, `SKILL.md` tool check, `AGENTS.md` strict sequence. Sandbox clone: `run_parity.sh` PASSED 7/7, `run_residency.sh` PASSED, `pair_divergence.py` PASSED 7 pairs, `rule_parity.py` PASSED, `record_claims.py` PASSED 58 claims after the restatement to 179 pairs. Playbook PASS scenarios=30 violations=0 with `PRO-002` | Met | - |

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

AC-001 to AC-017 are Met. The operator chose to resync the mode-table statement to the padded table, and the residency run passes.
<!-- /ANCHOR:closure -->
