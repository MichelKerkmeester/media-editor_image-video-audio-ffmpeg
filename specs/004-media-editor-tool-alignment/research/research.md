---
title: "Deep Research: Media Editor tool alignment"
description: "Five research iterations on what the Media Editor skill and Claude Project must change to describe and route to their own MCP server, Desktop extension and Claude Code plugin, end the kernel with Router Code, and drop the retired third-party MCP names. Ends in a ranked, file-pathed change list checked against the code."
trigger_phrases:
  - "media editor tool alignment research"
  - "media editor ranked change list"
  - "media editor router code research"
importance_tier: "important"
contextType: "research"
---
# Deep Research: Media Editor tool alignment

**Packet**: `AI Systems/Media Editor/specs/004-media-editor-tool-alignment`
**Session**: `2026-10-03T14:44:01.000Z` (generation 1)
**Iterations**: 5 (insight x5), stop policy `max-iterations`
**Executor**: `cli-pi`, model `opencode-go/deepseek-v4.1-flash`, thinking `max`

---

## 1. EXECUTIVE OVERVIEW

The Media Editor ships its own MCP server with 39 tools, packaged as a Claude Desktop extension and a Claude Code plugin. Its skill, Claude Project, router gate and metadata still describe the two third-party servers it replaced, route every mode to ffmpeg, and keep three unchecked copies of the router.

**Headline conclusions**

1. Only 6 of the 39 tools are named anywhere in the skill or Project. The other 33 sit behind `image_*`, `video_*` and `audio_*` wildcards, and no surface gives a tool's parameters, defaults or errors. A new tools catalogue (`references/tools.md`, Knowledge `Media Editor - Reference - Media Editor Tools - v0.100.md`) fills that gap, sourced from `mcp server/README.md` sections 4 and 5.
2. The two `mcp-*` references are renamed and rewritten tool first: `references/image-operations.md` (the image tools run on `sharp`, so "FFmpeg" leaves that title too) and `references/video-and-audio-operations.md`. The HLS asset keeps its name and opens with `video_hls_ladder`.
3. The router is written three times (`SKILL.md`, the kernel, `benchmark/router/route_contract.py`) and the copies disagree: the skill binds every mode to `"ffmpeg"`, the contract validates against the retired ids `imagician` and `video-audio`. The fix follows Product Owner: move the code to `references/router-contract.md`, end the kernel with `## 7. ROUTER CODE`, and add `benchmark/router/differential.py` to hold them equal.
4. The kernel is the fleet's last sentence-case kernel and has no Router Code. Spec 083 excluded it by name, so this change finishes that programme.
5. The rename's real risk is silence: loading is guarded, so a stale `RESOURCE_MAP` path loads nothing and raises nothing. `rule_parity.py` cannot see it, and only `fixtures.json` fails loudly. Declaration, renames, contract, fixtures and gates therefore land in one change.

---

## 2. BACKGROUND & CONTEXT

- The server (`AI Systems/Media Editor/mcp server/`) registers 39 tools in `src/server/all-tools.ts:56-96`: 8 image (on `sharp`), 6 audio and 20 video (on ffmpeg), 5 media. `src/core/errors.ts` defines 15 error codes.
- The skill (`sk-media-editor/`) and the Project (`claude project/`) were written when the system drove the Imagician and Video-Audio MCP servers. Packet 081 replaced those servers with the system's own; the docs kept the old shape.
- Barter Copywriter, Barter Deal Templates and Product Owner keep the router in `references/router-contract.md`, end their kernel with a `ROUTER CODE` section ("Route every request with this code. It is `references/router-contract.md` with its comments removed, and the sections above state the same rules in prose."), and hold the two equal with `benchmark/router/differential.py`.

---

## 3. RESEARCH QUESTIONS

- **Q1** Tool surface: which tools, with purpose, key parameters, defaults, consent rules and error codes, are documented, misdocumented or missing, and which documented operations have no tool?
- **Q2** Integration references: what do `references/mcp-imagician.md`, `references/mcp-video-audio.md` and `assets/hls-video-conversion.md` become, and is a tools reference needed?
- **Q3** `SKILL.md`, `AGENTS.md` and the README: command-to-tool mapping, `TOOL_MAP` and `RESOURCE_MAP`, tool check, export, Desktop setup, and extracting the router to `references/router-contract.md`.
- **Q4** Kernel and Knowledge: a closing `ROUTER CODE` section, section 2 as a pointer, fleet heading case, Knowledge to add, rename or drop, delivery protocol for tool runs.
- **Q5** Gates and the ranked change list: `rule_parity.py`, a new `differential.py`, Sync Loop pairs and residency rows, playbook, plugin copy, both guides.

---

## 4. METHODOLOGY

Five sequential iterations of the `/deep:research:auto` workflow. Each one dispatched a fresh `deep-research` leaf through `buildLineageCommand` (cli-pi), then ran `verify-iteration.cjs`, `reduce-state.cjs`, the coverage-graph upsert and `convergence.cjs`. Focus order: Q1, Q4, Q2, Q3, Q5, one question per iteration, with Q5 last because it ranks the rest.

Every iteration passed verification with route proof (`target_agent: deep-research`, `agent_definition_loaded: true`) and wrote nothing outside `research/`, which the git status hash confirmed before and after each dispatch. After each iteration, its load-bearing claims were spot-checked against `mcp server/src` and the named files. Seven claims needed correction, and the corrections are applied throughout this document and listed in section 17.

---

## 5. KEY FINDINGS SUMMARY

- 63 key findings in the reducer registry across 5 iterations; newInfoRatio 0.95, 0.88, 0.86, 0.80, 0.70.
- Legacy names: 174 hits in 41 files under `AI Systems/Media Editor/` (excluding `node_modules` and `dist`). The live carriers are listed in section 11; dated records stay.
- Router: three copies, two vocabularies, no differential gate.
- Documentation gaps: 33 tools unnamed, 12 of 15 error codes unnamed, the `consent` parameter undocumented.
- Real tool gaps (server side, out of scope here): audio trim, loudness normalization, and a quality-target (CRF) video compress.

---

## 6. FINDINGS: Q1 TOOL SURFACE

- **6 of 39 tools named** (`media_health`, `media_setup_ffmpeg`, `media_probe`, `media_repair`, `media_remove_silence`, `video_hls_ladder`). The other 33 appear only as wildcards at `SKILL.md:297`, kernel `Custom Instructions.md:243` and `sk-media-editor/README.md:128,151`. [iteration-001 F1; verified: 39 unique `TOOL_NAME` values in `src/tools/**`]
- **Mode maps route to ffmpeg documents, not tools.** `TOOL_MAP` binds every mode to `"ffmpeg"` (`SKILL.md:157-163`) and `RESOURCE_MAP` binds modes to the two `mcp-*` references. `SKILL.md:117` and `README.md:328` still defend the `mcp-` prefixes. [iteration-001 F2]
- **Error codes:** 3 of 15 named (`CAPABILITY_MISSING`, `CONFIG_MISSING`, `PATH_NOT_ALLOWED`), none with recovery semantics. [iteration-001 F4; verified 15 codes in `src/core/errors.ts`]
- **Consent:** the flow is already described at `SKILL.md:270`, kernel `:226` and `interactive-intelligence.md:202`. Missing: the `consent` parameter name, its `false` default (`setup-ffmpeg.ts:147-153`) and the `CONSENT_REQUIRED` error that carries the plan. [iteration-001 F5, corrected by spot-check]
- **Operations without a tool:**
  - Audio trim: `video_trim` calls `requireVideoStream` and writes `.mp4` (`trim.ts:43,112`); `audio_extract` has no time fields (`extract.ts:107-120`).
  - Loudness normalization: no `loudnorm` anywhere in `src`.
  - Compression is only partly covered: `video_set_bitrate`, `audio_set_bitrate` and `video_set_audio_bitrate` reduce size by bitrate, and only a CRF or quality-target video compress is missing (`crf` exists only in `hls-ladder.ts`). [iteration-001 F3; compression corrected by spot-check]
- **The complete source already exists:** `mcp server/README.md` sections 4 (tools by group) and 5 (settings, limits). [iteration-001 F7]

---

## 7. FINDINGS: Q2 INTEGRATION REFERENCES

- **Image route is `sharp`.** All 8 image tools import `sharp` (`package.json:28`), so the image document's title "FFmpeg Image Operations" is wrong for its primary layer. The rename drops "FFmpeg" as well as "MCP Imagician". [iteration-003 F1; verified]
- **Targets:**

  | Today | Skill source | Knowledge mirror |
  | --- | --- | --- |
  | `references/mcp-imagician.md` | `references/image-operations.md` | `Media Editor - Integrations - Image Operations - v0.213.md` |
  | `references/mcp-video-audio.md` | `references/video-and-audio-operations.md` | `Media Editor - Integrations - Video And Audio Operations - v0.213.md` |
  | (new) | `references/tools.md` | `Media Editor - Reference - Media Editor Tools - v0.100.md` |
  | `assets/hls-video-conversion.md` | same name | `Media Editor - Reference - HLS Video Conversion - v0.112.md` |

- **Body rewrite, not framing.** Both references concede the tool layer in one paragraph and then give only ffmpeg recipes. The rewrite puts the tool first and moves the recipes to an explicit fallback layer under the route order the kernel already states. [iteration-003 F2]
- **Third file, not a merge.** The media group, the consent contract and the error codes are cross-media, so splitting them per media type would scatter or duplicate them. The two operation references keep their recipes and limits as the fallback. [iteration-003 F5, ruled-out alternative]
- **Knowledge filenames already contradict their own `title:`** ("MCP Imagician" file, "FFmpeg Image Operations" title), so the rename aligns names with an identity already written. [iteration-002 F4; verified]

---

## 8. FINDINGS: Q3 SKILL.md, AGENTS.md, README AND ROUTER EXTRACTION

- **Router vocabulary conflict.** `SKILL.md:157-163` binds `"ffmpeg"` everywhere and `"ffprobe and ffmpeg"` for Repair. `route_contract.py:66,91` binds `imagician` and `video-audio` under a closed `TOOL_VALUES` enum that would reject the skill's own Repair value. One vocabulary decision must land in `SKILL.md`, the kernel fence, `route_contract.py` (`TOOL_MAP` and `TOOL_VALUES`), `fixtures.json` and the router README together. [iteration-004 F1; verified]
- **Extraction order (Product Owner):**
  1. `SKILL.md` section 2 keeps its prose and gains a pointer sentence.
  2. The code moves to `references/router-contract.md` with reference frontmatter and an ON_DEMAND body block.
  3. `SKILL.md` section 5 lists it.
  4. The kernel ends with the comment-free copy.
  5. `differential.py` guards the pair.

  Doing step 4 before step 2 leaves a pointer to a missing file that nothing reports. [iteration-004 F2]
- **`RESOURCE_MAP` is triple-copied** (`SKILL.md:145-151`, kernel fence, `route_contract.py:106-113`), and a stale path is skipped silently by `load_if_available`. [iteration-004 F3]
- **Command-to-tool mapping:** correct only in the prose at `SKILL.md:297`. Five tables say "ffmpeg": `SKILL.md:44-46` and `:288-295` (header `Local tool`), `AGENTS.md:107-116`, `README.md:104-111` and `:117-124`. They need rebinding to tool groups, with the fallback named second. [iteration-004 F4]
- **Count and self-descriptions:**
  - `README.md:308,326` say "seven knowledge files", which becomes eight.
  - `SKILL.md:366`, `:414` and `:425` still describe a skill that "drives ffmpeg" or runs "tools or ffmpeg".
  - README section 1 says "Five media intents" against six modes.

  [iteration-004 F5, F8; verified]
- **No change owed:** the tool check (`SKILL.md:263-285`), the export path `media files/export/`, and the Desktop setup facts, which live in `INSTALL-GUIDE.md` alone (including the empty Directory path row). [iteration-004 F6]

---

## 9. FINDINGS: Q4 KERNEL AND KNOWLEDGE

- **Headings:** sections run `## 1. Objective` to `## 6. Quality checklist before reply`, all sentence case, against the fleet's upper-case H1 and Title Case H2. `### Escalate if` becomes `### ESCALATE IF` in the kernel, the skill and the plugin copy. [iteration-002 F1, iteration-004 F7; verified]
- **Router Code:** a closing `ROUTER CODE` section with the fleet's intro sentence, holding the contract minus comments. The 4-line comment at `SKILL.md:153-156` (kernel `:119-122`) stays in the contract only. [iteration-002 F2]
- **Section 2 shrinks to a pointer.** It keeps all prose and both judgement tables and replaces about 125 lines of code with a three-line `### Smart Router Pseudocode` pointer, per the Prompt Improver and Sales Direct precedent. [iteration-002 F3]
- **Knowledge:**
  - 2 renames and 1 add, taking the set from 7 to 8 documents.
  - 0 drops. There is no Router Contract Knowledge document to delete.
  - The operation references are kept beside the catalogue.

  [iteration-002 F4-F6]
- **Pointers:** the kernel names Knowledge documents in at least four prose places, including three "Full detail" lines at `:21`, `:224` and `:232` that name unversioned files. A `PROJECT KNOWLEDGE CONSULTATION` section, as in Product Owner, Deal Templates and Sales HubSpot, would make one table the only place names live. [iteration-002 F7; see section 12]
- **Delivery protocol:**
  - Add `### Strict Sequence`: route, `media_health`, run the tool, `media_probe` read-back, report the folder, attestation.
  - Add a named tool-delivery subsection with real tool names and the consent contract.
  - Add `### Export-Equivalent Paths`.
  - Turn the `HVR = checked` line into the fleet's blocker count.
  - Bump the kernel to v1.7.0, with a dated `SYNC.md` record that claims no review.

  [iteration-002 F8]

---

## 10. FINDINGS: Q5 GATES

- **`benchmark/gates/rule_parity.py`** compares phrase counts per declared pair (`min_pairs`, lines 69-126). Count equality cannot catch a name restored equally on both sides, so the ban needs a separate `RETIRED_NAMES` zero-tolerance scan. The scan covers the pairs plus:
  - `SKILL.md`
  - `AGENTS.md`
  - the kernel
  - `description.json`
  - `graph-metadata.json`

  The other `rule_parity.py` changes:
  - "Seven" becomes eight at lines 31, 63, 72 and 182.
  - The stale docstring at lines 8-12 is rewritten.
  - The tool-check floor (`min_pairs: 5`, line 89) is re-measured on purpose, and the reason recorded.

  Nothing invokes the gate automatically. [iteration-005 F1; verified]
- **`benchmark/router/differential.py` (new).** Product Owner's stubs cannot be copied unchanged: `media_tools_connected()` and `verify_ffmpeg()` decide the route (`SKILL.md:211,213`). The design:
  - Stub `load` only.
  - Re-bind both host checks per state (tools, ffmpeg, advice).
  - Assert the `route` field for each state.
  - Guard copy parity: the kernel equals the contract minus comments, and `SKILL.md` has no fence.
  - Guard table, behaviour and coverage parity over the `fixtures.json` inputs.

  It is one gate with no separate `kernel_parity.py`, and the contract gains no route-state seam. [iteration-005 F2]
- **`AI Systems/z — Claude Project Sync Loop/systems.py` is the rename's control plane.** `SYSTEMS['media-editor']` holds 7 pairs and 44 residency rows. Each row key is `sha256(statement)` (`residency_check.py:236-237`), so every edited statement needs its key recomputed. The changes:
  - Pairs go from 7 to 8.
  - The 8 `2 smart routing` rows and every row naming a renamed document are edited.
  - Each new kernel section needs a row, or the residency run fails.

  `benchmark/parity/run_residency.sh` is a 16-line shim and needs no change. [iteration-005 F3; verified]
- **`fixtures.json`** has 17 `tool` values, 10 of them retired (`video-audio` 7, `imagician` 3), and 10 retired resource rows. Regenerate the expectations from the contract under the new enum; do not retype them. [iteration-005 F4; verified]
- **Metadata outside every gate.** `description.json:12-13` and `graph-metadata.json:38-39,96-97,114-122,145-146` name the references. `description.json:3` and `graph-metadata.json:12,138` also say the skill "drives the Imagician MCP server, the Video-Audio MCP server". Both files are copied into the plugin. [iteration-005 F5, extended by spot-check]
- **Playbook** anchor tables pin versioned names in 12 or more scenarios. `skill-route-order/fallback-to-local-ffmpeg.md:87` is the one filename link. SHL-001 may need a tools-connected state rather than a rename. [iteration-005 F6]

---

## 11. RECOMMENDATIONS

The ranked change list below is iteration 5's list with the spot-check corrections applied: rows 3, 14 and 21 are corrected, and rows 16 and 23 are completed. Paths are relative to `AI Systems/Media Editor/` unless they start with `AI Systems/`.

| Rank | File | Change | Depends on |
| --- | --- | --- | --- |
| 1 | `AI Systems/z — Claude Project Sync Loop/systems.py` | Pairs 7 to 8 (two renamed keys, the catalogue pair). Edit the `2 smart routing` rows and every row naming a renamed document, recompute each `statement_key`, add a row per new kernel section | Rename targets fixed |
| 2 | `sk-media-editor/references/image-operations.md` (from `mcp-imagician.md`) | Tool-first body: the 8 `sharp` image tools first, ffmpeg recipes as the fallback layer | 1 |
| 3 | `sk-media-editor/references/video-and-audio-operations.md` (from `mcp-video-audio.md`) | Same rewrite for the 26 ffmpeg-backed tools (6 `audio_*`, 20 `video_*`) | 1 |
| 4 | `sk-media-editor/references/tools.md` (new) | 39 tools by group with purpose, key parameters and defaults; `consent` (default `false`) and `CONSENT_REQUIRED`; 15 error codes with recovery; settings and limits from `mcp server/README.md` section 5; partial row for bitrate compression; gap rows for CRF compress, audio trim, loudness normalization | 1 |
| 5 | `sk-media-editor/assets/hls-video-conversion.md` | `video_hls_ladder` first, ffmpeg pack second, v0.111 to v0.112 | 1 |
| 6 | `benchmark/router/route_contract.py` | Rebind `TOOL_MAP`, `TOOL_VALUES` and `RESOURCE_MAP` (lines 61-70, 91, 106-113); keep "runtime tool verification not simulated" | Vocabulary decision (section 12), 2-5 |
| 7 | `benchmark/router/fixtures.json` | Regenerate the 17 `tool` and 10 legacy resource expectations from the contract | 6 |
| 8 | `benchmark/router/differential.py` (new) | Copy, table, behaviour and coverage parity across the three host states | 6, 7, 10, 11, 14 |
| 9 | `benchmark/router/README.md` | Files row and run line for `differential.py`; example `tool` value; the tool-binding rule at line 66 | 6, 8 |
| 10 | `sk-media-editor/references/router-contract.md` (new) | The router code moved out of `SKILL.md` section 2, with reference frontmatter and ON_DEMAND body block | Same commit as 11 |
| 11 | `sk-media-editor/SKILL.md` | Section 2 pointer, code removed; `TOOL_MAP`/`RESOURCE_MAP`/`tool` return; rows 44-46, 124, 288-295 (header `Local tool`), 356-357; contract and catalogue in section 5; self-descriptions 366, 414, 425; `### ESCALATE IF` at 337; `:117` prefix defence removed; version bump | 2-6, 10 |
| 12 | `AGENTS.md` | Command registry `Tool` column 107-116 tool first, fallback second; load tree 95-96, 128-129; pointers 147, 164 | 11 |
| 13 | `sk-media-editor/README.md` | Sections 1 (Five to six intents), 2 (104-111), 3 (117-124), 7 inventory (310-318), 8 seven to eight (308, 326), 12 related names; `:328` prefix defence removed | 11 |
| 14 | `claude project/Custom Instructions.md` | Section 2 to a pointer; final `ROUTER CODE` section; fleet heading case; `### ESCALATE IF` at 289; legacy carriers 21, 112-114, 224, 232; consent parameter, default and `CONSENT_REQUIRED` near 226; delivery protocol subsections; v1.7.0 | 10, 11, 15 |
| 15 | `claude project/knowledge/` | Two renamed mirrors, the catalogue mirror (8 files), byte identity with the sources | 2-5, 1 |
| 16 | `claude project/README.md` | Tree 14-20 (16-17 legacy), the line-53 paragraph defending the old upload names, the count, version lines 11 and 31 | 15 |
| 17 | `sk-media-editor/manual-testing-playbook/` | Version-pinned anchor tables; `skill-route-order/fallback-to-local-ffmpeg.md:87`; SHL-001 premise check; index rows | 2-5, 15 |
| 18 | `benchmark/gates/rule_parity.py` | `RETIRED_NAMES` scan, seven to eight, docstring, recorded `min_pairs` re-measure | 2-5, 11, 14, 15 |
| 19 | `benchmark/gates/README.md` | Rows 39, 40, 43, 76 to the new filenames; eight pairs; the scan | 18 |
| 20 | `benchmark/parity/README.md` | "Three wrappers" against its five-row table made consistent; `run_residency.sh` unchanged | None |
| 21 | `sk-media-editor/description.json`, `graph-metadata.json` | Names and paths (12-13; 38-39, 96-97, 114-122, 145-146) and the false descriptions (`description.json:3`, `graph-metadata.json:12,138`); keep `mcp-tooling` at 10 and 28 | 2-5 |
| 22 | `mcp server/claude-plugin/skills/media-editor/**` | Rebuild with `npm run plugin` after all skill changes, then the packaging tests | 11, 13, 17, 21 |
| 23 | `INSTALL-GUIDE.md` | Lines 262-263: the two legacy links and their descriptions | 2-5 |
| 24 | `USER-GUIDE.md` | No change owed (verified clean); optional pointer to the catalogue | 4 |
| 25 | `SYNC.md` | Dated change record; no review claimed | All |
| 26 | `sk-media-editor/changelog/v1.7.0.0.md` (new) | Version record; dated carriers stay unchanged | All |

**Sequencing**

1. One change for the declaration, the renames, the catalogue, the contract, the fixtures and the gates, because the failure mode is silence.
2. In that same change: the kernel, the Knowledge mirrors and both READMEs.
3. Then the playbook, the metadata and the guides.
4. The plugin rebuild comes last, so the copy carries the finished state.
5. `SYNC.md` and the changelog close the change.

**Verification for the implementation**

Run each of these and read both its output and its exit status:
- `benchmark/router/run_fixtures.sh`
- the new `differential.py`
- `rule_parity.py` with the retired-name scan
- `bash benchmark/parity/run_residency.sh`
- the Sync Loop parity gate
- the plugin packaging tests
- a final retired-name grep that excludes the dated carriers (`changelog/v1.*`, `SYNC.md` records, `benchmark/reports/2026-09-17--*`, both `THIRD_PARTY_NOTICES`)

---

## ELIMINATED ALTERNATIVES

| Approach | Reason Eliminated | Evidence | Iteration(s) |
| --- | --- | --- | --- |
| Change `mcp server/src` first for tool visibility | Docs follow the server, which is out of scope, and the server README already has the full table | `spec.md` Out of Scope; `mcp server/README.md` sections 4-5 | 001 |
| Fold the tool tables into the two media references, no third file | The media group, consent and error codes are cross-media; a split scatters or duplicates them | `mcp server/README.md` section 4 grouping | 003 |
| Rename the files and keep ffmpeg-first bodies | Image tools run on `sharp`; a renamed ffmpeg-first body still misdescribes the primary route | `package.json:28`; `src/tools/image/*.ts` | 003 |
| Sweep legacy names repo-wide, dated records included | Dated `SYNC.md` entries, changelogs and reports record decisions taken; rewriting them destroys the audit trail | `SYNC.md:24-32` | 003 |
| Reuse Product Owner's stub set unchanged | The two host checks are routing decisions; constants would certify one of three route states | `SKILL.md:211,213` | 005 |
| Add a route-state seam to `route_contract.py` | The contract's scope is the routing decision and it does not simulate live tools | `route_contract.py:61-64`; `benchmark/router/README.md:66-70` | 005 |
| Express the retired-name ban as a phrase-count rule | Count equality misses a name restored equally on both sides | `rule_parity.py:69-126,230-248` | 005 |
| Separate `kernel_parity.py` for the kernel copy | The kernel fence is the same fence; one gate with a copy-parity guard is smaller and complete | Product Owner `benchmark/router/differential.py` | 005 |
| Drop the two operation references once the catalogue exists | They hold the recipes and per-media limits the catalogue does not | iteration-002 F6 | 002 |

---

## DIVERGENCE MAP

- Completed pivots: 0. Failed pivots: 0. Audited overrides: 0. Single lineage, convergence mode `default`.
- Saturated directions: none marked.
- Remaining frontier: the router `tool` vocabulary decision, the Project Knowledge section decision, and the implementation-time checks in section 12.

---

## 12. OPEN QUESTIONS

Decisions for the operator before planning:

1. **Router `tool` vocabulary.** Recommended: the server's tool groups as the value (`image_*`, `video_*`, `audio_*`, `video_hls_ladder`, `media_probe` then `media_repair`, `auto`), matching the prose at `SKILL.md:297`. The alternative is a neutral lane token such as `tools`, with the group named only in prose.
2. **`PROJECT KNOWLEDGE CONSULTATION` section in the kernel.** Recommended, for one place that names all 8 documents. If adopted, it becomes section 7, Router Code becomes `## 8. ROUTER CODE`, and both need residency rows.
3. **Knowledge filenames** as listed in section 7, including whether the image document keeps the `Integrations` prefix.

Checks for implementation time:

4. Whether the catalogue pair raises the tool-check `min_pairs` floor from 5.
5. Whether SHL-001 needs a tools-connected state.
6. Whether `description.json` and `graph-metadata.json` hold further path keys beyond the lines measured.

Out of scope here, for a server packet: tools for audio trim, loudness normalization and CRF video compression.

---

## 13. REFERENCES

- Iteration evidence: `research/iterations/iteration-001.md` to `iteration-005.md`; `research/deltas/iter-001.jsonl` to `iter-005.jsonl`; `research/findings-registry.json`; `research/deep-research-strategy.md`; `research/deep-research-dashboard.md`.
- Resource map: `research/resource-map.md` (emitted at synthesis; see section 15).
- Subjects (read only): `AI Systems/Media Editor/` (`mcp server/src`, `mcp server/README.md`, `sk-media-editor/`, `claude project/`, `AGENTS.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `SYNC.md`, `benchmark/`); `AI Systems/z — Claude Project Sync Loop/systems.py` and `residency_check.py`; the kernels and `benchmark/router/` of Barter Copywriter, Barter Deal Templates, Product Owner and Prompt Improver; `specs/048-fleet-router-in-kernel/spec.md`.

## 14. SOURCES CONSULTED (aggregate)

Code: `mcp server/src/server/all-tools.ts`, `src/core/errors.ts`, `src/tools/**`. Documents: the Media Editor skill, Project, guides and benchmark files listed in section 11, plus six fleet kernels and three fleet router gates. Per-iteration lists are in each iteration file's Sources Read section.

## 15. RESOURCE MAP

`resource-map.md` was absent at init. The synthesis emission (`reduce-state.cjs --emit-resource-map`) wrote `research/resource-map.md` with 0 references, because the iteration deltas cite files in prose rather than in the structured fields the reducer counts. Section 11 is the usable file map.

## 16. CONVERGENCE REPORT

- Stop reason: `maxIterationsReached` (stop policy `max-iterations`; convergence was telemetry only)
- Total iterations: 5
- Questions answered: reducer count 0 of 5; evidence-level 5 of 5. The reducer ticks a question only when the iteration `focus` equals the question text exactly (`reduce-state.cjs:2320-2328`), and the leaves paraphrased it.
- Remaining questions: the decisions and checks in section 12
- Last 3 iteration summaries: run 3 Q2 integration references (0.86); run 4 Q3 skill, AGENTS and README (0.80); run 5 Q5 gates and ranked list (0.70)
- Graph convergence: STOP_BLOCKED at score 0.49 (blockers `source_diversity_guard`, `evidence_depth_guard`, `unverified_claims`), telemetry under the stop policy
- Divergence summary: no divergent pivots recorded

## 17. APPENDIX: EXECUTION LOG

- Lock owner 99218. Each dispatch: `pi -p --offline --model opencode-go/deepseek-v4.1-flash --thinking max`, about 4 to 9 minutes per iteration, exit 0, `verify-iteration` OK.
- Graph: iteration 1's events were backfilled after the post-step first read the state-log projection, which omits them. Iteration 3 wrote 9 edges and no nodes, so nothing was upserted for it.

**Focus deviations**

| Iteration | Deviation | Why |
| --- | --- | --- |
| 3 | Focus from iteration 2's `## Next Focus`, not the strategy's machine focus | `reduce-state.cjs:1794` reads a `Recommended Next Focus` heading the prompt pack never asks for, so it fell back to the first carried-forward question (Q5) |
| 4 | Q3 instead of the leaf's Q5 | Q3 had never been a focus (the YAML's `least_explored`), and Q5 ranks the rest |
| 4, 5 | Orchestrator's verified corrections added to the focus | So later iterations do not inherit overstated claims |

**Spot-check corrections against the code**

| Claim (iteration) | Result |
| --- | --- |
| Compression has no tool (001) | Partly wrong: bitrate tools reduce size; only CRF compress is missing |
| Consent contract undocumented (001) | Overstated: the flow is documented in three places; the parameter, default and error are not |
| `INSTALL-GUIDE.md` has no legacy names (003) | Wrong: lines 262-263 |
| Legacy inventory complete (003) | Missed the kernel (21, 112-114, 224, 232), `claude project/README.md` (16-17, 53), `route_contract.py` (66, 91, 107-109), `fixtures.json` |
| Metadata carriers (005) | Missed `description.json:3`, `graph-metadata.json:12,138` (false "drives the Imagician MCP server" descriptions) |
| `media_extract` (005 ranked list) | No such tool; it is `audio_extract` |
| 39 tools, 15 codes, `sharp` image route, router mismatch, residency counts, fixture counts | Confirmed |
