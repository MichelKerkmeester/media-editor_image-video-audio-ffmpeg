---
title: "Feature Specification: Media Editor tool alignment"
description: "The Media Editor skill and Claude Project still name the two third-party MCP servers the system replaced, describe ffmpeg recipes rather than its own 39 tools, and keep the router mid-kernel. This packet finds every change needed through five deep-research iterations, then aligns every surface with the server, extension and plugin."
trigger_phrases:
  - "media editor tool alignment"
  - "media editor router code"
  - "mcp imagician rename"
  - "media editor knowledge refresh"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Media Editor tool alignment

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete: the 2026-10-03 work is committed, and the 2026-10-04 follow-up is implemented, verified and uncommitted |
| **Created** | 2026-10-03 |
| **Branch** | `main`, nothing committed |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The Media Editor now ships its own MCP server with 39 tools, as a Claude Desktop extension and a Claude Code plugin. Its skill and Claude Project still carry the shape of the two third-party servers it replaced: `references/mcp-imagician.md` and `references/mcp-video-audio.md` and their Knowledge mirrors keep those servers' names, their content is ffmpeg recipes that name one of our tools each, and the router sits inside `SKILL.md` and in the middle of kernel section 2. Barter Copywriter, Deal Templates and Product Owner instead keep the router in `references/router-contract.md` and end their kernel with a Router Code section held equal to it by a gate.

### Purpose
Every Media Editor surface describes and routes to its own server, extension and plugin, and the Project kernel ends with Router Code like the rest of the fleet.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Research (done): five deep-research iterations with DeepSeek V4.1 Flash max through cli-pi on OpenCode Go, ending in the ranked change list in `research/research.md` section 11
- Implementation of that list, with the operator's decisions of 2026-10-03:
  - The router `tool` field carries tool groups: `image_*`, `video_*`, `audio_*`, `video_hls_ladder`, `media_probe` then `media_repair`, and `auto`
  - The kernel gains `## 7. PROJECT KNOWLEDGE CONSULTATION` and ends with `## 8. ROUTER CODE`
  - The proposed names: `references/image-operations.md`, `references/video-and-audio-operations.md`, `references/tools.md` and `references/router-contract.md`, with Knowledge mirrors `Media Editor - Integrations - Image Operations - v0.213.md`, `Media Editor - Integrations - Video And Audio Operations - v0.213.md`, `Media Editor - Reference - Media Editor Tools - v0.100.md` and `Media Editor - Reference - HLS Video Conversion - v0.112.md`
- The gates that hold the change: a new `benchmark/router/differential.py`, a retired-name scan in `rule_parity.py`, and the Sync Loop pairs and residency rows
- Follow-up added by the operator on 2026-10-04, release Skill v1.0.0.0 and kernel v1.0.0:
  - Rewrite the system root `README.md` in the marketing style of the Product Owner, Prompt Improver and Skilled READMEs, with the Desktop extension, the Claude Code plugin and the Claude Project and their setup first
  - Remove Human Voice Rules from the Media Editor: both references, both Knowledge cards, the kernel self-scan, the attestation field, the reply linter and their pairs and rules in the gates
  - Readable names: the skill, `AGENTS.md` and the kernel propose a name from the content and ask before applying it
  - Placement: one result file goes straight into the export folder, several files get one numbered folder, and an optional folder is asked about first
  - Server support for both: `media_rename`, `fileName` and `subfolder` on every one-folder writing tool, and `preview` on `image_probe` and `media_probe`

### Out of Scope
- Server code under `mcp server/src/` beyond the 2026-10-04 naming and placement support, including the three missing tools (audio trim, loudness normalization, CRF video compress) - those belong to a server packet
- Other systems' kernels - the fleet is the pattern, not the target
- Dated records: `changelog/*`, earlier `SYNC.md` entries, `benchmark/reports/2026-09-17--*` and both `THIRD_PARTY_NOTICES` keep the retired names
- Uploading the kernel and Knowledge to claude.ai, and any commit or push - the operator's steps

### Files to Change

Paths are relative to `AI Systems/Media Editor/` unless they start with `AI Systems/`.

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `sk-media-editor/references/router-contract.md` | Create | The router code moved out of `SKILL.md`, the single source for the skill, the kernel and the gate |
| `sk-media-editor/references/tools.md` | Create | Catalogue of the 39 tools, consent, error codes, settings and gaps |
| `sk-media-editor/references/image-operations.md` | Rename + Modify | From `mcp-imagician.md`, tool first with ffmpeg as fallback |
| `sk-media-editor/references/video-and-audio-operations.md` | Rename + Modify | From `mcp-video-audio.md`, tool first with ffmpeg as fallback |
| `sk-media-editor/assets/hls-video-conversion.md` | Modify | `video_hls_ladder` first, v0.112 |
| `sk-media-editor/SKILL.md`, `README.md`, `description.json`, `graph-metadata.json`, `manual-testing-playbook/`, `changelog/v0.8.0.0.md` | Modify / Create | Pointer, tables, counts, names, metadata, playbook anchors, version record |
| `AGENTS.md`, `INSTALL-GUIDE.md`, `SYNC.md` | Modify | Command registry and load tree, two legacy links, dated change record |
| `claude project/Custom Instructions.md`, `claude project/README.md`, `claude project/knowledge/` | Modify / Rename / Create | Kernel v0.8.0 and eight byte-identical mirrors |
| `benchmark/router/route_contract.py`, `fixtures.json`, `README.md`, `differential.py` | Modify / Create | Tool vocabulary, regenerated fixtures, the differential gate |
| `benchmark/gates/rule_parity.py`, `benchmark/gates/README.md` | Modify | Retired-name scan, eight pairs |
| `benchmark/parity/README.md` in all seven systems | Modify | Wrapper count and system count in the one byte-identical text, the operator's choice of all seven copies |
| `mcp server/claude-plugin/skills/media-editor/**` | Regenerate | `npm run plugin` after the skill changes |
| `AI Systems/z — Claude Project Sync Loop/systems.py` | Modify | Eight pairs and the residency rows for the new and edited kernel sections |
| `AI Systems/z — Claude Project Sync Loop/residency/backlog.md`, `residency/counts.md`, `carrier_query_evidence.py`, `episodes/hand-run/000-packet-record/goal.md` | Modify | Regenerated residency records, re-pinned replays, restated counts |
| `README.md`, `.gitignore` | Create | Repository README in the Product Owner and Prompt Improver style, and ignore rules for the new nested repository, both added by the operator during implementation |
| `README.md` | Rewrite | 2026-10-04: marketing style, the three Claude packagings and their setup first, 40 tools, naming and export |
| `sk-media-editor/references/hvr-core.md`, `human-voice-rules.md`, `claude project/knowledge/Media Editor - Rules - Human Voice*.md`, `benchmark/grader/lint_replies.py`, `benchmark/grader/fixtures/sample-report/hvr-lint.csv` | Delete | 2026-10-04: Human Voice Rules leave the system |
| `mcp server/src/core/output-folder.ts`, `src/server/tool-context.ts`, `tool-registry.ts`, `field-schemas.ts`, `all-tools.ts`, `src/tools/video/copy-then-encode.ts`, `src/tools/image/sharp-output.ts`, both probe tools, every writing tool's description, `manifest.json` | Modify | 2026-10-04: export-root placement, `fileName`, `subfolder`, free names, `preview` |
| `mcp server/src/tools/media/rename.ts`, `src/tools/media/preview.ts`, `tests/tools/media/placement.vitest.ts`, `rename.vitest.ts`, `preview.vitest.ts` | Create | 2026-10-04: `media_rename`, the preview helper and their tests |
| `sk-media-editor/manual-testing-playbook/` | Modify / Create | 2026-10-04: a naming turn in every writing scenario, `SED-002` and `SED-003` |
| `sk-media-editor/changelog/v1.0.0.0.md` | Create | 2026-10-04 release record |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | Five research iterations run on `opencode-go/deepseek-v4.1-flash` at max thinking, each with content and route-proof fields |
| REQ-002 | `research/research.md` holds a ranked change list in which every load-bearing finding cites a file path |
| REQ-004 | The router lives once, in `sk-media-editor/references/router-contract.md`: `SKILL.md` carries no router code and points at it, and the kernel ends with `## 8. ROUTER CODE` equal to the contract with its comments removed, held by a new `benchmark/router/differential.py` |
| REQ-005 | The router `tool` field carries the tool groups in the contract, `route_contract.py` (`TOOL_MAP`, `TOOL_VALUES`) and `fixtures.json`, and `run_fixtures.sh` passes |
| REQ-006 | The two integration references and their Knowledge mirrors carry the new names with tool-first bodies, every mirror is byte-identical to its source, and no live surface names `mcp-imagician`, `mcp-video-audio`, `imagician` or `video-audio` |
| REQ-007 | `systems.py` declares eight Media Editor pairs and a residency row for every kernel section, and the residency and parity runs pass |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-003 | Tool counts, tool names and every claimed gap are spot-checked against `mcp server/src` before the list is reported |
| REQ-008 | `references/tools.md` and its mirror document all 39 tools with purpose, key parameters and defaults, the `consent` parameter and `CONSENT_REQUIRED`, the 15 error codes, the settings, and the three gaps |
| REQ-009 | The kernel uses fleet heading case, reduces section 2 to a pointer, adds `## 7. PROJECT KNOWLEDGE CONSULTATION` and the tool-run delivery protocol, and reads v0.8.0 |
| REQ-010 | `SKILL.md`, `AGENTS.md` and `README.md` bind modes to tool groups with ffmpeg named second, count eight Knowledge files, and drop the ffmpeg-first self-descriptions |
| REQ-011 | Metadata, playbook anchors, `INSTALL-GUIDE.md`, the plugin copy, a dated `SYNC.md` record and `changelog/v0.8.0.0.md` reflect the change |
| REQ-012 | No Human Voice Rules file, card, self-scan, attestation field, linter or gate rule remains in the Media Editor, and the gates pass without them |
| REQ-013 | The skill, `AGENTS.md` and the kernel propose a readable name from the content and apply it only after the user confirms, and write one result file straight into the export folder |
| REQ-014 | The server offers `media_rename`, `fileName`, `subfolder` and `preview`, never overwrites a file, and its tests cover each |
| REQ-015 | The system root README leads with the Desktop extension, the Claude Code plugin and the Claude Project and how to set each up |
| REQ-016 | Without the tools, the skill and the Project answer with advice, then offer once to walk the user through setup from a Setup reference mirrored as Project Knowledge, with the extension downloaded from the latest GitHub release |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: A ranked change list covers the skill, references, assets, Knowledge and kernel, each item with a file path
- **SC-002**: No finding in the list is contradicted by the server code
- **SC-003**: `run_fixtures.sh`, `differential.py`, `rule_parity.py`, the residency run, the Sync Loop parity gate and the plugin tests all pass from the final state
- **SC-004**: A retired-name grep over `AI Systems/Media Editor/`, excluding the dated records, returns nothing
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | OpenCode Go quota for DeepSeek V4.1 Flash | High | A canary call answered `OK` with `stopReason: stop` on 2026-10-03 before the run |
| Risk | A max-thinking turn spends its output cap thinking and returns empty text with exit 0 | Med | Every iteration file was checked for content |
| Risk | A model finding names a tool or gap the code does not have | Med | Spot-checks against `mcp server/src`; seven corrections applied |
| Risk | A renamed reference left in one `RESOURCE_MAP` copy loads nothing and raises nothing | High | One change for renames, contract, fixtures and gates; `differential.py` and the retired-name scan |
| Risk | Edited residency statements fail by hash before presence is checked | Med | Recompute each `statement_key` with `resync_statement.py` under a fresh `PYTHONPYCACHEPREFIX`, repeated until it reports 0 |
| Risk | Peer sessions share this tree and its gates | Med | Read the scoped diff before each gate run; stage only this packet's files when the operator asks for a commit |
| Dependency | The plugin build (`npm run plugin`) copies the skill | Med | Rebuild last, then run the packaging tests |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Each iteration keeps to one focus so a turn stays under the output cap
- **NFR-P02**: Five iterations, no more, by `--stop-policy=max-iterations`

### Security
- **NFR-S01**: The research leaf reads only. Writes stay in this packet
- **NFR-S02**: No secret or personal path enters a prompt or a finding

### Reliability
- **NFR-R01**: Exit status is never the success signal for pi. The answer text and `stopReason` are
- **NFR-R02**: A route failure stops the loop rather than falling back to another model
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: an iteration with no answer text reruns with half its focus
- Maximum length: the 32,768-token output cap per turn
- Invalid format: an iteration record without route-proof fields counts as not delegated

### Error Scenarios
- External service failure: a 401, 429 or missing key stops the run and is reported
- Network timeout: the workflow's lineage timeout applies
- Concurrent access: peer sessions share the tree, so the research only reads outside this packet

### State Transitions
- Partial completion: the workflow's state log lets a stopped run resume
- Session expiry: continuity lives in this packet
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 12/25 | One system's skill, Project, gates and Sync Loop rows |
| Risk | 8/25 | Shared declaration and gates, kernel behaviour |
| Research | 14/20 | Five iterations across the server, skill, Project and fleet pattern |
| **Total** | **34/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- What the integration references should be called and whether a tools reference joins them: answered in `research/research.md` section 7
- What must change in the Media Editor skill and Claude Project so every surface describes its own MCP server, Desktop extension and Claude Code plugin, uses all of their tools, drops the legacy third-party MCP naming and ends the kernel with Router Code
- Research context: deep research ran five iterations for this topic, and `research/research.md` is canonical for its findings
- Decisions of 2026-10-03: tool groups for the router `tool` field, a `PROJECT KNOWLEDGE CONSULTATION` kernel section, and the proposed names (see Scope)
- Implementation-time checks: whether the catalogue pair raises the tool-check `min_pairs` floor, whether SHL-001 needs a tools-connected state, and whether the two metadata files hold further path keys

<!-- BEGIN GENERATED: deep-research/spec-findings -->
**Research findings (abridged from `research/research.md`, 2026-10-03):**
- Only 6 of 39 server tools are named in the skill or Project; a new `references/tools.md` catalogue, mirrored as `Media Editor - Reference - Media Editor Tools - v0.100.md`, fills the gap
- `references/mcp-imagician.md` becomes `references/image-operations.md` (image tools run on `sharp`) and `references/mcp-video-audio.md` becomes `references/video-and-audio-operations.md`, both tool first with ffmpeg as the fallback layer
- The router exists in three disagreeing copies; it moves to `references/router-contract.md`, the kernel ends with a `ROUTER CODE` section, and a new `benchmark/router/differential.py` holds them equal
- The rename fails silently through guarded loading, so `systems.py`, the contract, `fixtures.json` and the gates change in one pass, with a `RETIRED_NAMES` scan added to `rule_parity.py`
- Decisions owed before planning: the router `tool` vocabulary, a `PROJECT KNOWLEDGE CONSULTATION` kernel section, and the Knowledge filenames (`research/research.md` section 12)
<!-- END GENERATED: deep-research/spec-findings -->
<!-- /ANCHOR:questions -->

---
