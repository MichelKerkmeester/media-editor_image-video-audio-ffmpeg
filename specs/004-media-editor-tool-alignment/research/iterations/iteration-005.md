# Iteration 005 — Q5: gates and the ranked change list (with Q1–Q4 couplings carried as ordering constraints)

Scope: the change-delivery surfaces Q1–Q4's answers now have to land in — `AI Systems/Media Editor/benchmark/gates/rule_parity.py` (267 lines) and its README (84), `benchmark/router/` (`route_contract.py` 362, `fixtures.json` 257, `run_fixtures.sh` 18, `README.md` 76, no `differential.py`), `benchmark/parity/` (five wrappers + README), `AI Systems/z — Claude Project Sync Loop/systems.py` (media-editor block, lines 1237–1670: 7 declared pairs, 44 residency rows) with `residency_check.py` and `run_residency.sh`, `sk-media-editor/manual-testing-playbook/` (19 scenarios), `mcp server/scripts/build-plugin.ts` + `package.json` (the plugin copy), `sk-media-editor/description.json` / `graph-metadata.json`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `claude project/README.md` and `SYNC.md`. Read-only throughout; nothing on this list was mutated.

---

## Actions Taken

1. Read the four predecessor iterations' answers in full (it3 F1/F2/F5/F6 for the rename targets and the guarded-loading failure mode, it4 F1–F9 for the enum, the extraction order, the tables and the plugin copy) and carried their couplings forward as ordering constraints rather than footnotes.
2. Read `benchmark/gates/rule_parity.py` end to end and `benchmark/gates/README.md`, captured the RULES dict, the `min_pairs` floor semantics, the `declared_pairs()` reader and every "seven pairs / six rules" denominator.
3. Read the shared residency machinery: `z — Claude Project Sync Loop/residency_check.py` (section ownership, moved-statement presence, `statement_key = sha256(statement)` at lines 236–237), `run_residency.sh`, and the media-editor block of `systems.py` (pairs 1241–1254; 44 residency rows counted by section label: 5 objective, 8 smart routing, 5 how it works, 24 rules, 2 delivery protocol, 1 quality checklist, 3 Header; none for a seventh kernel section).
4. Read Product Owner's `benchmark/router/differential.py` purpose block, guard list and `build_skill_router()` (lines 400–436: `load`/`show_user` module-level stubs, `__file__` pointer, `exec(compile(...))`), and Product Owner's `benchmark/router/README.md` rows for the gate and its corpus file.
5. Measured the rebinding surfaces: `route_contract.py` 60–120 (TOOL_MAP, FALLBACK_MAP, MODE/VALUES, ROUTE_FIELDS, RESOURCE_MAP, ALWAYS), `fixtures.json` tool/resource rows, `SKILL.md` 114/124/145–151/356–357, `AGENTS.md` 95–96/128–129, `router/README.md` 27–47 and 66–70.
6. Verified the plugin copy: `mcp server/claude-plugin/skills/media-editor/` holds `SKILL.md`, `README.md`, `references/`, `assets/`, `changelog/`, `manual-testing-playbook/`, `description.json` and `graph-metadata.json`; `package.json` `plugin` script is `tsc -p tsconfig.scripts.json && node build/tools/scripts/build-plugin.js`; `build-plugin.ts` line 345 sets `skills/media-editor` as the destination.
7. Swept the legacy-name carriers and the version-pinned anchors across the live tree (excluding `node_modules` and `/build/`), and separated live carriers from historical ones.
8. Checked whether any runner or registry invokes `rule_parity.py` or a router differential outside this system: none found (Sync Loop hits are episode archives and this system's own docs).

---

## Findings

### F1 (P1) — `rule_parity.py` needs a retired-name scan, a seven-to-eight denominator, and one stale sentence fixed; a count gate cannot express a ban

The gate's whole mechanism is equality of `count()` per phrase with an absolute `min_pairs` floor (lines 69–126, 230–248). Equality can only catch a name that reappears on **one** side of a pair: a name restored on both sides in equal numbers passes with every check green. The rename therefore needs a second axis, not a seventh rule: a `RETIRED_NAMES` zero-tolerance scan, checked per pair side, plus four non-pair carriers the pairs do not reach — `sk-media-editor/SKILL.md`, `AGENTS.md`, `claude project/Custom Instructions.md`, and the two metadata files (F5). Phrasing the ban as a phrase-count rule would misdescribe the mechanism and would let an equal-count restore through.

Concrete edits this forces:
- `RETIRED_NAMES` = the two product names in their filename and prose spellings, plus the bare `imagician` / `video-audio` ids; `video-and-audio-operations` must not match the second name, so the scan needs its own spelling list rather than substring reuse.
- Every "seven declared pairs" denominator and "all seven declared pairs" sentence (docstring lines 26–35, README lines 2, 10, 16, 20, 22, 23, 31, 37, 58) becomes eight once Q2's catalogue pair is declared.
- The docstring's opening claim, "This system has no gate that reads what a document says" (lines 8–12), is stale for the file that is that gate; it needs the same durable-why rewrite the README already received.
- `min_pairs` must be re-measured, not assumed: the catalogue pair teaches the tool-check rule (it carries the `media_health` / consent contract), so the tool-check floor at line 89 likely rises from 5 to 6. The gate's own doctrine (lines 63–68) says a rise is a deliberate update after reading why it changed, so the re-measure must be recorded, not silently bumped.
- Verified: no script in this system invokes `rule_parity.py` (`benchmark/parity/run_parity.sh` execs `validate_parity.py`, not this gate), so the new scan is run by hand like the existing rules until something wires it.

### F2 (P1) — The new `benchmark/router/differential.py` cannot reuse Product Owner's stub set unchanged: two of Media Editor's three host functions are routing decisions

Product Owner's `build_skill_router()` stubs `load` and `show_user` because both are side effects "rather than routing decisions, so stubbing them changes nothing the gate compares" (differential.py 417–436). Media Editor's fence calls three host functions: `load()` (side effect, stubbable), and `media_tools_connected()` / `verify_ffmpeg()`, which feed `choose_route()` and decide whether the returned route is tools, ffmpeg or advice. Stubbing those to constants would certify a router whose two thirds of route states are never exercised — and the runtime contract legitimately does not simulate them ("Live tool verification is a runtime concern and is intentionally not simulated here; this contract fixes only the routing decision", `route_contract.py` 61–64 and `router/README.md` 66–70).

Recommended gate design (default):
- Stub `load` at module level, re-bind `media_tools_connected` / `verify_ffmpeg` per host state over the same input, and compare `mode`/`tool`/`source`/`needs_disambiguation`/`resources` against the contract for every state;
- assert the fence's `route` field directly against the three expected states (tools when both true, ffmpeg when only the check answers, advice when neither does — the last one must bind no tool);
- guards: copy parity (SKILL.md carries no python fence **and** its §2 names `references/router-contract.md`; the kernel's `## 7. ROUTER CODE` equals the contract fence minus comments, as a parsed syntax tree as well as line for line), table parity (`TOOL_MAP`, `TOOL_VALUES`, `FALLBACK_MAP`, `RESOURCE_MAP`, `ALWAYS`, intent model, disambiguation checklist value-for-value), behavior parity, and coverage (every mode, token and alias in `fixtures.json` exercised);
- corpus: reuse `fixtures.json` inputs and add an in-file host-state table rather than a second oracle file, so one file stays the source of truth for both gates.
Product Owner splits kernel copy parity into its own `kernel_parity.py`, but Media Editor's kernel fence **is** the same fence, so a single `differential.py` with a copy-parity guard matches Product Owner's own shape and avoids a third md↔py pair nothing needs.

### F3 (P1) — `systems.py` is the rename's control plane: 8 pairs, 44 residency rows, one sha256-keyed edit set, and a new `7 router code` row the ownership rule forces

Measured against the live declaration:
- `pairs` (lines 1241–1254) keys 7 Project mirrors to skill-relative sources; the rename changes two keys and two values, the catalogue adds an eighth.
- `residency` holds 44 rows, 43 homed on `kernel` and one on the MEDIA Framework mirror. Section labels are lower-case (`1 objective` … `6 quality checklist`, `Header`); **no `7 router code` row exists**, and `residency_check.py` fails any kernel section that no row maps, so adding `## 7. ROUTER CODE` without a row turns the residency run red.
- Every edited row's `statement_key` is exactly `sha256(statement)` (residency_check.py 236–237) — no folding — so each statement edit is a hash recompute, and an edited row fails *before* presence is even asked. The affected rows are the 8 `2 smart routing` statements (the fence becomes a pointer), the rule rows whose text names a renamed or renumbered document, and the Header row naming the knowledge set.
- `unmirrored_sources` is empty and stays empty: the catalogue is mirrored.
- Correction to the carried note: `benchmark/parity/run_residency.sh` is a 16-line id-only shim (`exec bash "../../../z — Claude Project Sync Loop/run_residency.sh" media-editor`) and needs **no change**; the rows live only in `systems.py`.

### F4 (P1) — `fixtures.json` is a 20-row rebinding, not the carried 13, and the oracle must be regenerated from the contract

Measured: 17 `tool` values, of which 10 carry retired ids (3 `imagician`, 7 `video-audio`, plus 2 `ffmpeg` and 5 `auto` that may survive the vocabulary change), and 10 `resources` entries naming the two legacy paths (3 `references/mcp-imagician.md`, 7 `references/mcp-video-audio.md`). The HLS `assets/hls-video-conversion.md` resource row survives with its version bump. Because `run_fixtures.sh` is the loud end of the chain (`route_contract.py fixtures.json`), the fixtures must move in the same commit as the enum, and the expected objects should be produced by the contract under the new enum rather than retyped — hand-typed expectations are the one way a vocabulary change can ship green while wrong.

### F5 (P1) — Two legacy carriers are outside every gate and outside the carried sweep list: `description.json` and `graph-metadata.json`

`sk-media-editor/description.json` lines 12–13 and `graph-metadata.json` lines 38–39, 96–97, 114–122 and 145–146 name both references by id **and** by path, and both files are copied into the plugin (`claude-plugin/skills/media-editor/` contains them beside `SKILL.md`). `graph-metadata.json` lines 10 and 28 name `mcp-tooling`, which is a live fleet skill id and must stay. No live reader inside the Sync Loop folder names either file, so a missed rename leaves dangling machine metadata that no gate in this system reports. They belong in F1's `RETIRED_NAMES` scan list.

### F6 (P2) — The playbook is a rename carrier because its anchor tables pin the versioned names, and the plugin copies it

Twelve-plus scenario source-anchor tables print the versioned badge or mirror name, for example `skill-command-routing/image-command-routing.md:88`, `skill-command-routing/command-overrides-keywords.md:88`, `skill-export-delivery/export-first-path-response.md:88`, `skill-identity-handover/identity-handover.md:110`, `project-command-routing/command-overrides-keywords.md:87`, `project-identity-handover/identity-handover.md:109–110`, `project-guidance-delivery/chat-guidance-delivery.md:88`, `project-boundaries/size-limit-escalation.md:88`, `project-hls-recipe/ffmpeg-terminal-recipe.md:87`, `project-ambiguity-intake/one-comprehensive-question.md:89`, and the index rows in `manual-testing-playbook.md`. `skill-route-order/fallback-to-local-ffmpeg.md:87` is the only *filename* link still carrying `mcp-imagician.md`. One premise to verify at implementation rather than assume: `skill-hls-streaming/ffmpeg-only-hls-conversion.md` (SHL-001) is named for an ffmpeg-only path while the HLS rule now opens with `video_hls_ladder`; the scenario may need a tools-connected state rather than a rename.

### F7 (P2) — The four Q3 couplings as ordering constraints, plus three content corrections the list must carry

Ordering constraints (not footnotes):
1. **Enum coupling.** The `tool` vocabulary must be one decision landing in `SKILL.md`, the kernel fence, `route_contract.py` (`TOOL_MAP` + `TOOL_VALUES`), `fixtures.json` and the router README example in one pass; today `SKILL.md` emits `ffprobe and ffmpeg`, a phrase the contract's own enum would reject. Recommended default: the server's real tool names as lane tokens (`image_*`, `video_*`, `audio_*`, `video_hls_ladder`, `media_probe`/`media_repair`, `auto`), since `SKILL.md` 297 already states them in prose and the enum can hold them verbatim.
2. **Atomic rename.** `RESOURCE_MAP` is triple-copied (`SKILL.md` 145–151, kernel fence, `route_contract.py` 106–113) and guarded loading makes a stale entry silent; `fixtures.json` is the only loud check, at the far end.
3. **Count coupling.** `README.md` §8's "seven knowledge files" becomes eight; the SYNC declaration's pair count and `rule_parity.py`'s denominators move with it.
4. **Plugin coupling.** `### Escalate if`, the renames and the playbook anchors must be rebuilt into `claude-plugin/skills/media-editor/`, and `description.json`/`graph-metadata.json` move with them.

Content corrections:
- Compression is **not** toolless: `video_set_bitrate`, `audio_set_bitrate` and `video_set_audio_bitrate` reduce size by bitrate; only a CRF/quality-target video compress is missing (`crf` exists only inside `video_hls_ladder`). The catalogue must say that, not "no tool".
- The consent flow is already described at `SKILL.md` 270, kernel `Custom Instructions.md` 226 and `references/interactive-intelligence.md` 202; what is missing is the consent parameter's name, its `false` default and the `CONSENT_REQUIRED` error, which the catalogue owns.
- Two genuine tool gaps stay gaps in the catalogue: audio trim (`video_trim` requires a video stream and writes `.mp4`; `audio_extract` has no time fields) and loudness normalization.

---

## Questions Answered

**Q5 — `rule_parity.py` additions.** Answered by F1: a `RETIRED_NAMES` zero-tolerance scan (pairs + four non-pair live carriers and the two metadata files), seven-to-eight denominators, the stale docstring, and a recorded `min_pairs` re-measure; the ban cannot be a count rule.

**Q5 — the new `benchmark/router/differential.py` and the host-function seam.** Answered by F2: Product Owner's five-guard shape with `load` stubbed and `media_tools_connected`/`verify_ffmpeg` re-bound per host state, with the contract's no-runtime-simulation scope left intact; one gate, not a separate `kernel_parity.py`.

**Q5 — Sync Loop pairs and residency rows.** Answered by F3: eight pairs, the edited-row hash recompute, the new `7 router code` row that section ownership forces, and the correction that `benchmark/parity/run_residency.sh` needs no change.

**Q5 — playbook scenarios.** Answered by F6: the 12+ version-pinned anchor tables, the one filename link, and SHL-001 as the premise to verify.

**Q5 — plugin skill copy.** Answered by F5 and F7-4: rebuild after every skill-side change, and treat `description.json` / `graph-metadata.json` as rename carriers inside the copy.

**Q5 — both guides.** Answered below and in the table: `INSTALL-GUIDE.md` §7 (261–263) carries two legacy links; `USER-GUIDE.md` was verified clean (already tool-first, its "39 tools" count consistent with the server); `claude project/README.md` 14–20 and 53 carry the published names and the stale rationale.

---

## Questions Remaining

1. **Q4 pointer tail (now fully specified, not open).** The kernel pointer text must name the post-rename documents verbatim: `references/image-operations.md`, `references/video-and-audio-operations.md`, `references/tools.md`, `references/router-contract.md` and HLS `v0.112`; the §2 pointer and the `## 7. ROUTER CODE` preamble both cite the contract, so they change in one pass.
2. **Q2 knowledge-name tail (now fully specified, not open).** Mirrors become `Media Editor - Integrations - Image Operations - v0.213.md`, `Media Editor - Integrations - Video And Audio Operations - v0.213.md`, `Media Editor - Reference - Media Editor Tools - v0.100.md` and `Media Editor - Reference - HLS Video Conversion - v0.112.md`; the seven-to-eight count and the parity declaration absorb them together.
3. **Implementation-time verifications (not research questions):** whether the catalogue pair raises the tool-check `min_pairs` floor; whether SHL-001 needs a tools-connected state; whether the `description.json`/`graph-metadata.json` schemas hold extra path keys beyond the measured lines; and the packaging test run after the plugin rebuild.

---

## THE RANKED CHANGE LIST

| Rank | File path | Change | Depends on |
|---|---|---|---|
| 1 | `AI Systems/z — Claude Project Sync Loop/systems.py` | Pairs 7→8 (two renamed mirror keys, the catalogue pair); edit the 8 `2 smart routing` statements and every rule row naming a renamed/renumbered document; recompute each `statement_key` as `sha256(statement)`; add the `7 router code` row section ownership forces; `unmirrored_sources` stays empty | rename targets (rows 2–5) fixed first; nothing in-repo |
| 2 | `sk-media-editor/references/image-operations.md` (rename of `mcp-imagician.md`) | Tool-first body: `sharp` tool layer (8 image tools) first, ffmpeg demoted to an explicit fallback layer; drop the ffmpeg-first capability list; routed name changes | 1 |
| 3 | `sk-media-editor/references/video-and-audio-operations.md` (rename of `mcp-video-audio.md`) | Same layer rewrite for the 26 ffmpeg-backed video/audio tools; the `media_extract`/audio and 20 video tool names and options documented tool-first | 1 |
| 4 | `sk-media-editor/references/tools.md` (new catalogue) | The 39 tools by group, purpose, key parameters, defaults, the `media_setup_ffmpeg` consent parameter + `false` default + `CONSENT_REQUIRED`, the 15 error codes, §5 config/limits; partial-coverage rows for bitrate compression; gap rows for CRF video compress, audio trim, loudness normalization | 1 |
| 5 | `sk-media-editor/assets/hls-video-conversion.md` | `video_hls_ladder` first, ffmpeg command pack second; version bump v0.111→v0.112 | 1 |
| 6 | `benchmark/router/route_contract.py` | `TOOL_MAP`/`TOOL_VALUES`/`FALLBACK_MAP` comments/`RESOURCE_MAP` rebind (lines 61–70, 91, 106–113); keep "runtime tool verification not simulated"; no route-state seam | enum decision (F7-1), rows 2–5 |
| 7 | `benchmark/router/fixtures.json` | 17 `tool` rows (10 legacy) and 10 resource rows regenerated from the contract under the new enum | 6 |
| 8 | `benchmark/router/differential.py` (new) | Copy parity (SKILL.md no fence + names the contract; kernel ≡ contract − comments), table parity, behaviour parity across the three host states, coverage; `load` stub + re-bindable `media_tools_connected`/`verify_ffmpeg`; corpus = fixtures inputs + in-file host-state table | 6, 7, 10, 11, 14 |
| 9 | `benchmark/router/README.md` | Files row and Run section for `differential.py`; example route object's `tool` value; the tool-binding decision rule (line 66); guarded-loading note kept | 6, 8 |
| 10 | `sk-media-editor/references/router-contract.md` (new) | The fence moved out of `SKILL.md` §2, with Product Owner's reference frontmatter and ON_DEMAND body block (Routed By nothing automatic, Hands Off To nothing) | 11 (pointer) or before it — order within one commit |
| 11 | `sk-media-editor/SKILL.md` | §2 pointer sentence; fence removed; `TOOL_MAP`/`RESOURCE_MAP`/`tool` return; §1 rows 44–46; §3 header `Local tool` and rows 288–295; CONDITIONAL row 124; §5 rows 356–357 plus the contract and catalogue entries; §7 pointer 368; self-descriptions 366, 414, 425; `### ESCALATE IF` 337; version bump | enumeration rows 2–5, 6; 10 |
| 12 | `AGENTS.md` | Command registry Tool column 107–116 (tool-first, fallback second, L116 qualifier absorbed); DAG 128–129; 95–96; pointers 147, 164 | 11 |
| 13 | `sk-media-editor/README.md` | §1 core-layer table and "Five media intents"; §2 104–111; §3 117–124; §7 inventory 310–318; §8 seven→eight and the plugin-copy sentence; §12 related names | 11 |
| 14 | `claude project/Custom Instructions.md` | §2 reduced to a three-line pointer; new final `## 7. ROUTER CODE` (comment-free copy); upper-case fleet headings; `### ESCALATE IF` 289; legacy carriers 21, 112–114, 224, 232; consent parameter name/default/`CONSENT_REQUIRED` at ~226; H1 version bump | 10, 11, 15 |
| 15 | `claude project/knowledge/` | Rename both integration mirrors, add the catalogue mirror (8 files), byte identity with the new sources, pointer targets updated to the renamed/renumbered documents and the contract | 2–5, 1 |
| 16 | `claude project/README.md` | Knowledge listing 14–20; the line-53 rationale paragraph (it currently explains why the MCP names are kept); any count | 15 |
| 17 | `sk-media-editor/manual-testing-playbook/` | 12+ version-pinned anchor tables; `skill-route-order/fallback-to-local-ffmpeg.md` 87 filename link; SHL-001 premise check; index rows in `manual-testing-playbook.md` | 2–5, 15 |
| 18 | `benchmark/gates/rule_parity.py` | `RETIRED_NAMES` scan (pairs + SKILL.md + AGENTS.md + kernel + the two metadata files); seven→eight; stale docstring; recorded `min_pairs` re-measure | 2–5, 11, 14, 15 |
| 19 | `benchmark/gates/README.md` | Rule rows 39, 40, 43, 76 rewritten to the new filenames; eight pairs; six rules plus the scan; run/exit prose | 18 |
| 20 | `benchmark/parity/README.md` and `run_residency.sh` | README's "three wrappers" vs its five-row table made consistent; `run_residency.sh` itself: **no change owed** (id-only shim) | — |
| 21 | `sk-media-editor/description.json` + `graph-metadata.json` | Name and path rows (12–13; 38–39, 96–97, 114–122, 145–146) rebound; `mcp-tooling` at 10 and 28 kept | 2–5 |
| 22 | `mcp server/claude-plugin/skills/media-editor/**` | Rebuild via `npm run plugin` after all skill-side changes; confirm SKILL.md, references, assets, playbook, description.json and graph-metadata.json are fresh; packaging tests | 11, 13, 17, 21 |
| 23 | `INSTALL-GUIDE.md` | §7 rows 261–263: two legacy links and their descriptions | 2–5 |
| 24 | `USER-GUIDE.md` | **No change owed** (verified tool-first and clean); optional pointer to the tools catalogue where it cites "39 tools" | 4 |
| 25 | `SYNC.md` | Dated change record plus the kernel review note placeholder; version movement named on both sides | all |
| 26 | `sk-media-editor/changelog/v1.7.0.0.md` (new) | The version-move record; historical carriers (changelog v1.*, dated SYNC records, `benchmark/reports/2026-09-17--*`, both `THIRD_PARTY_NOTICES`) stay as they are | all |

**Sequencing.** (i) Declaration and renames plus the contract, fixtures, catalogue and gates in one change, because the guarded-loading failure mode is silence rather than an error. (ii) Kernel, knowledge mirrors and README in the same change, because the parity gate reads rulers, not wording. (iii) Playbook, metadata and guides, then the plugin rebuild last so the copy carries the finished state. (iv) SYNC record and changelog close the change.

---

## SCOPE VIOLATIONS

None. Every read was read-only; the only writes were this iteration's three declared artifacts plus the append-gateway call into the run directory.

**Would-be mutations recorded as findings, not executed** (all outside the allowed-write list): `systems.py`, `rule_parity.py`, `benchmark/gates/README.md`, `route_contract.py`, `fixtures.json`, `router/README.md`, `SKILL.md`, `AGENTS.md`, `sk-media-editor/README.md`, `claude project/Custom Instructions.md`, `claude project/knowledge/*`, `claude project/README.md`, `manual-testing-playbook/**`, `description.json`, `graph-metadata.json`, the plugin copy, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `benchmark/parity/README.md`, `SYNC.md`.

---

## Sources Read

- `AI Systems/Media Editor/benchmark/gates/rule_parity.py` (267 lines, full)
- `AI Systems/Media Editor/benchmark/gates/README.md` (84 lines, full)
- `AI Systems/Media Editor/benchmark/router/README.md` (76 lines, full), `route_contract.py` 60–120 + symbol map, `fixtures.json` tool/resource rows, `run_fixtures.sh`
- `AI Systems/Media Editor/benchmark/parity/` listing, `README.md` 1–45, `run_parity.sh`, `run_residency.sh` (16 lines)
- `AI Systems/z — Claude Project Sync Loop/systems.py` media-editor block (pairs 1241–1254; residency rows and section labels; the router statement), `residency_check.py` docstring + 200–270, `run_residency.sh` (23 lines)
- `AI Systems/Product Owner/benchmark/router/differential.py` docstring + 400–445; `benchmark/router/README.md` differential rows
- `AI Systems/Media Editor/sk-media-editor/SKILL.md` legacy/path rows (114, 124, 145–151, 356–357) and `AGENTS.md` (95–96, 128–129)
- `AI Systems/Media Editor/INSTALL-GUIDE.md` 250–266; `USER-GUIDE.md` tool mentions 9–102; `claude project/README.md` 12–20 and 50–56
- `AI Systems/Media Editor/sk-media-editor/description.json` + `graph-metadata.json` legacy rows; `mcp server/claude-plugin/skills/media-editor/` listing; `package.json` scripts; `build-plugin.ts` 289–345
- `AI Systems/Media Editor/SYNC.md` (33 lines, full); predecessor iterations 001–004
