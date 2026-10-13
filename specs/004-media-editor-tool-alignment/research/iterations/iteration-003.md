# Iteration 003 — Q2: The integration references (tool-first rewrite, ffmpeg fallback, legacy vocabulary, and the third document)

- **Run:** 004-media-editor-tool-alignment, lineage `2026-10-03T14:44:01.000Z`, iteration 3 of 5
- **Focus:** Q2 — what `references/mcp-imagician.md`, `references/mcp-video-audio.md` and `assets/hls-video-conversion.md` become as files and Knowledge documents, how the tool-first rewrite relates to the ffmpeg fallback, which referrers carry the retired vocabulary, and whether the tools catalogue is a third reference file or an addition beside them.
- **Outcome:** Q2 answered. The load-bearing discovery is that the server's tool layer is **not** ffmpeg for images — the Image group is `sharp`-backed (8 tools) while Audio, Video and Media are ffmpeg-backed (31 tools). That makes the two integration documents' titles wrong at the primary layer, not merely stale in their prefixes. The legacy-vocabulary inventory is now measured rather than assumed: three of the prompt's named referrers carry **zero** hits, and two carriers the prompt did not name do. The tools catalogue belongs in a **third** reference file on layer-split terms, and the dated change records must be excluded from the vocabulary sweep.

## Actions Taken

1. Mapped the system tree and the three target files: `sk-media-editor/references/mcp-imagician.md` (214 lines), `sk-media-editor/references/mcp-video-audio.md` (247), `sk-media-editor/assets/hls-video-conversion.md` (261), plus the 7-document `claude project/knowledge/` inventory and the plugin's own copy of all three.
2. Read the head of both integration references in full down to `## 3. Core capabilities`, including their `title:` frontmatter, `### Purpose`, `### When to use` and `### Precondition`.
3. Read `mcp server/README.md` section 4 (the 39-tool catalogue by group) and section 5 (the configuration table with the allowed-folder precondition, the output-folder default and the 1800 s timeout), and listed `mcp server/src/server/` to locate the tool registry files.
4. Ran a per-file vocabulary grep across every named referrer (`AGENTS.md`, `INSTALL-GUIDE.md`, `SYNC.md`, `USER-GUIDE.md`, `sk-media-editor/README.md`, `sk-media-editor/SKILL.md`, `benchmark/gates/README.md`, `benchmark/gates/rule_parity.py`, `benchmark/router/README.md`) with line numbers, and a second scoped run over the playbook and the app-level surfaces (`AI Systems/Commands/`, both `AGENTS.md` files).
5. Read `SYNC.md` end to end (the manual parity method, the version-bump rule, and all ten dated review/change entries) and `benchmark/router/README.md`'s output example and durable decision rules.
6. Read the Media Editor block of `AI Systems/z — Claude Project Sync Loop/systems.py` (lines 1234-1400) to see how the 7 declared pairs and the kernel residency statements are keyed.

## Findings

### F1 (P1) — The primary image route is `sharp`, not ffmpeg: both integration titles misname their own tool-first layer

`mcp server/README.md` section 4 groups all 39 tools as `Image (sharp)` 8, `Audio (ffmpeg)` 6, `Video (ffmpeg)` 20, `Media` 5. The parenthetical is the toolchain, and it is the decisive fact for Q2:

| Route | Tool layer | Document that describes it now |
| --- | --- | --- |
| Image | `sharp` — `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` | `mcp-imagician.md`, titled **"FFmpeg Image Operations"** |
| Video / Audio | ffmpeg-backed tools (26 of them, including `video_add_broll`-family options, `video_hls_ladder`, `audio_extract`) | `mcp-video-audio.md`, titled "FFmpeg Video Audio" |
| Cross-media | `media_health`, `media_probe`, `media_repair`, `media_remove_silence`, `media_setup_ffmpeg` | nowhere |

So the image document promises ffmpeg for the layer that does not use it: when the tools are connected, an image resize runs through `sharp` and never touches ffmpeg at all, and ffmpeg appears only on the fallback route (the CLI's local install) or inside `media_setup_ffmpeg` provisioning. A rename that merely strips `MCP Imagician` while keeping `FFmpeg` in the title would install a *new* falsehood in place of the old one. This is the strongest evidence in the iteration and it settles a question iteration 2 left open when it proposed `Media Editor - Integrations - Image Operations - v0.213.md`: the drop of `FFmpeg` from the image document's name is not cosmetic tidiness, it is required by the layer split.

### F2 (P1) — The tool-first rewrite is a body rewrite, not a new framing: both documents already concede the tool layer in one paragraph and then never name a tool again

Both references open with the same `### Precondition` shape, verbatim in substance:

> "When the Media Editor tools are connected, use them: they bring their own ffmpeg, and `media_health` reports what it can do. Otherwise use FFmpeg on the path, and when neither answers, give the exact command as advice and say that nothing ran."

That paragraph is already correct and already tool-first — and then `## 2. Tool overview` and everything after it is 100 % ffmpeg commands, with exactly one incidental mention of "A Media Editor tool writes its own `NNN - description/` folder". So the documents do not need a new route-order framing; they need their bodies reorganised so the paragraph that currently opens is the layer the body actually documents. The rewrite shape the evidence supports, per document:

1. `### Purpose` and `### When to use` stay, with "FFmpeg and ffprobe" replaced by the tool layer plus the fallback.
2. A new tool-first section naming the group's tools, each with its purpose and key parameters in the reference's own voice, pointing at the catalogue (F5) for schemas, defaults, consent and error codes rather than repeating them.
3. The existing ffmpeg sections demoted to an explicit **fallback layer** — the same commands, retitled so a reader knows they apply when the tools are absent, which is exactly the route order the kernel already states.
4. The `### Precondition` paragraph replaced by the layer statement and the one-check cost (`media_health` once per session instead of `ffmpeg -version` once per session, with `ffmpeg -version` surviving only on the local route).

The image document additionally needs its capability list re-derived: its current bullets are ffmpeg verbs (`scale`, `crop`, `transpose`, encoder quality) while the tools expose eight operations with their own option names, and `image_batch_resize` has no ffmpeg counterpart in the document at all — the batch story there is a shell loop. The video/audio document has an analogous gap on the tool side only: its own tool layer *is* ffmpeg, so the fallback and the primary route share a vocabulary, and the rewrite there is chiefly about naming the 26 tools and their option surfaces (`video_add_fade`, `video_add_text_overlay`, `video_add_image_overlay`, `video_add_subtitles`, `video_add_b_roll`, `video_concat`, `video_hls_ladder`) that the document currently covers as raw filter recipes or not at all.

### F3 (P1) — `assets/hls-video-conversion.md` needs no rename; it needs the tool and a version bump, and its `assets/` placement is a Q3 question rather than a Q2 one

The HLS document is the clean case. Its filename and its Knowledge title (`Media Editor - Reference - HLS Video Conversion - v0.111.md`) carry no retired vocabulary, its frontmatter already carries the correct `Reference` prefix, and its section layout (§1 Overview with `### Connection verification`, §4 operation specifications with complete/single/test commands, §7 batch processing, §8 quick reference with `### Troubleshooting` / `### GPU acceleration` / `### Limitations`) is the richest of the three. What is stale is its content layer: `video_hls_ladder` exists in the Video group and the document never mentions it, so its ladder recipe is the fallback presented as the whole story. Its change is therefore: tool-first `### Connection verification`, `video_hls_ladder` as the primary recipe with its options, the existing command pack retained under a fallback heading, and a content-driven version bump (0.111 → 0.112 or later), with the matching skill-side mirror. One question I am deliberately not answering here: whether the file moves from `assets/` to `references/`. `RESOURCE_MAP` routes `"HLS": ["assets/hls-video-conversion.md"]` and the Knowledge name is already `Reference`, so the placement is a `RESOURCE_MAP`/`TOOL_MAP` question and belongs to Q3, where the map is edited.

### F4 (P1) — Measured legacy-vocabulary inventory: 8 live carrier groups, and three of the prompt's named referrers are already clean

Counted by line this iteration, live (non-historical) carriers of `mcp-imagician` / `mcp-video-audio` / `MCP Imagician` / `MCP Video Audio`:

| Surface | Lines | What it is |
| --- | --- | --- |
| `sk-media-editor/references/mcp-imagician.md`, `mcp-video-audio.md` | the filenames | the two files themselves |
| `claude project/knowledge/…MCP Imagician…`, `…MCP Video Audio…` | the filenames | knowledge mirrors; their `title:` frontmatter is already corrected |
| `mcp server/claude-plugin/skills/media-editor/{references,assets}/` | the filenames | generated plugin copy of the skill |
| `AGENTS.md` | 95, 96, 128, 129 | routed-resource bullets and the `+->` load tree |
| `sk-media-editor/README.md` | 64, 316, 317, 396, 397 | ASCII tree comment, resource table, link table |
| `sk-media-editor/SKILL.md` | 124, 146, 147, 148, 356, 357 | `RESOURCE_MAP` entries plus the CONDITIONAL loading row and the resource table |
| `benchmark/router/README.md` | 41, 66 | the example output's `resources` array and the "Tool binding" decision rule |
| `benchmark/gates/README.md` | 39, 40, 43, 76 | coverage-table rows keyed on the filenames and the gate's own named-pair example |
| `AI Systems/z — Claude Project Sync Loop/systems.py` | 1242-1247 | the residency pair keys (Knowledge filename → skill source path) |
| playbook | `skill-route-order/fallback-to-local-ffmpeg.md:87`, `skill-hls-streaming/ffmpeg-only-hls-conversion.md:70,87`, `manual-testing-playbook.md:551` | scenario reference tables |
| `SYNC.md` | 24-27, 32 | dated change records |

And the **zero-hit** surfaces, each of which the brief for this iteration listed as a referrer to change:

- `INSTALL-GUIDE.md` — zero hits. It was rewritten on 2026-09-17 as an ffmpeg-install and verification guide, and that rewrite already removed the retired names.
- `USER-GUIDE.md` — zero hits, despite being the operator-facing entry point that names the extension, the plugin and the server by role.
- `benchmark/gates/rule_parity.py` — zero hits. The gate is filename-agnostic: it matches rule text, and `benchmark/gates/README.md` is the file that names the pairs.
- `AI Systems/Commands/` and both `AGENTS.md` files at app level — zero hits. The retired vocabulary is contained entirely inside the system directory.

This matters for Q5's change list: two files the brief expected to touch cost nothing, and `rule_parity.py` demonstrates that the parity gate reads rule content rather than file names, so the rename's gate exposure is in the **residency** rows (`systems.py`, `benchmark/parity/run_residency.sh`) and the **router** contract/fixtures, not in `rule_parity.py` itself.

### F5 (P1) — The tools catalogue is a third reference file, and the layer split is what makes it a third rather than an addition beside them

Iteration 2 recommended adding a catalogue; Q2's question is whether it *replaces* the integration documents or sits beside them. The evidence now settles the structure:

- **The Media group has no media-type home.** `media_health`, `media_probe`, `media_repair`, `media_remove_silence` and `media_setup_ffmpeg` are cross-media. Splitting the catalogue per media type would either duplicate all five or leave them in no document.
- **The cross-cutting contracts are singular.** The `media_setup_ffmpeg` consent contract (`consent` defaults false, a `component` enum, writes nothing without it) and the 15 error codes in `src/core/errors.ts` are properties of the server, not of a media type. One home, or two copies that drift.
- **The server already ships exactly this artefact.** `mcp server/README.md` §4 groups the 39 tools; §5 carries the configuration table (allowed-folder precondition with "every tool that opens a file fails until one is set", output folder defaulting to the first allowed folder, 1800 s timeout with the 1-86400 range, `MEDIA_EDITOR_*` overrides and their defaults). The reference file is a restatement of §4-5 in reference voice, which makes it verifiable against a source rather than newly invented — the same property the two integration documents have.
- **The catalogue cannot absorb the media references.** They carry per-media operation semantics, format and quality tables and the ffmpeg fallback recipes that the catalogue deliberately does not: the server's §4 is a one-line-per-tool list, not a recipe book. Iteration 2's F6 already ruled the two integration documents out of deletion on this ground; Q2 confirms it and adds the sharper reason — the fallback layer is the *only* layer that exists on claude.ai on the web, in the CLI without the plugin, and in the reply a tool-less runtime hands back.

Therefore: three reference documents, layer-split by ownership, with no schema duplication.

| File | Owns | Knowledge name |
| --- | --- | --- |
| `sk-media-editor/references/tools.md` **(new)** | the 39 tools by group, purpose, key parameters, defaults, the `media_setup_ffmpeg` consent contract, the error codes and the §5 configuration/limits | `Media Editor - Reference - Media Editor Tools - v0.100.md` |
| `sk-media-editor/references/image-operations.md` **(rename)** | image operation semantics, format and quality tables, the `sharp` tool layer and the ffmpeg fallback recipes | `Media Editor - Integrations - Image Operations - v0.213.md` |
| `sk-media-editor/references/video-and-audio-operations.md` **(rename)** | video/audio operation semantics, codec tables and limits, the tool layer and the ffmpeg fallback recipes | `Media Editor - Integrations - Video And Audio Operations - v0.213.md` |
| `sk-media-editor/assets/hls-video-conversion.md` **(content only)** | the HLS ladder, its tool and its ffmpeg command pack | `Media Editor - Reference - HLS Video Conversion - v0.112.md` |

A useful side effect for Q3: because the Media-group tools and the error codes live in the catalogue, `TOOL_MAP` can bind every mode to the catalogue plus its own media reference, and `RESOURCE_MAP`'s five mode rows gain a shared base without any mode losing its specific document.

### F6 (P1) — The rename degrades silently, not loudly, which inverts the usual change-list risk

`benchmark/router/README.md` publishes the router's durable rationale, and this is the load-bearing rule for the whole change:

> "**Runtime discovery + guarded loading**: every routing call resolves resource names against the live `references/*.md` and `assets/*.md` inventory (discover, existence-check, dedupe). A renamed or deleted reference degrades to a smaller resource set instead of a dead path or crash. Missing bases contribute nothing without failing."

So a rename that misses a pointer does not break the router — it quietly loads fewer documents, and the runtime answers with less knowledge while every check still passes. The same README also shows the legacy vocabulary inside the contract's own output shape: its example response carries `"tool": "video-audio"`, `"fallback": "ffmpeg"` and a `resources` array containing `references/mcp-video-audio.md`, and its "Tool binding" rule reads "IMAGE binds Imagician, VIDEO/AUDIO bind Video-Audio, HLS and Repair bind FFmpeg/auto" — the retired product names are the *contract's* tool ids, not just document titles.

Consequences: (a) the change must move contract, fixtures, `route_contract.py`, `RESOURCE_MAP`, the `systems.py` residency keys, the playbook reference tables and the gate README rows in one change, because the failure mode of splitting them is silence; (b) the router's tool-binding vocabulary needs a decision that Q3/Q5 should carry rather than Q2 — rebinding an id used by the fixtures is a contract change with a fixture count behind it, and the operator's "drop the legacy naming" instruction plainly reaches it; (c) the guarded-loading rule is a good property to keep and worth stating in the new catalogue's own loading note, since it is what lets a Project with only some documents loaded still answer.

### F7 (P2) — The dated change records keep the legacy names, and the vocabulary sweep must exclude them by rule rather than by accident

`SYNC.md` lines 24-27 and 32 quote the retired servers by name in five entries — including the 2026-09-16 re-scope that says "The Imagician and Video-Audio MCP servers are no longer drivers and no longer a fallback relationship, the two integration references now carry ffmpeg commands under their historical filenames". Those entries are the system's record of why the filenames say `mcp-` at all: they are history, and the same file's own method says a review note is written "as a change record rather than a review". Rewriting them would erase the reason the state existed and make the new change record unreadable next to it. The same applies to `benchmark/reports/**`, which quotes paths from completed runs.

So the requirement "drop the legacy third-party MCP naming" needs an explicit scope sentence in the change: **live descriptive surfaces drop it; dated records and completed benchmark reports keep it**. This is also what makes the new `SYNC.md` entry honest — it can say the historical filenames are gone from every live surface *and* that the entries which explain them remain.

A second, cheaper carrier sits in the generated packaging: `mcp server/claude-plugin/skills/media-editor/` holds its own `references/`, `assets/`, `changelog/`, `manual-testing-playbook/`, `description.json` and `graph-metadata.json`. The two JSON files are very likely a rename surface (a plugin description and a skill graph commonly name a skill's resources), and I did not read them this iteration. That is the one spot-check Q5's list should carry from Q2 rather than a claim: confirm `description.json` and `graph-metadata.json` name no reference path, or add them to the sweep.

## Questions Answered

- **Q2 (answered).** `mcp-imagician.md` → `references/image-operations.md` and `mcp-video-audio.md` → `references/video-and-audio-operations.md`, with `FFmpeg` leaving the image document's title because its primary layer is `sharp` (F1, F2). `assets/hls-video-conversion.md` keeps its name and gains the tool-first rewrite plus a version bump (F3). A **third** reference file, `references/tools.md` (`Media Editor - Reference - Media Editor Tools - v0.100.md`), carries the 39 tools, the consent contract, the error codes and the §5 configuration, on a layer split that leaves the media references their recipes and their fallback (F5). The tool-first rewrite is a body rewrite in all three: the preconditions already concede the tool layer, and the ffmpeg material demotes to the fallback layer under the route order the kernel already states (F2). The legacy vocabulary lives in 8 carrier groups, three of the brief's expected referrers are already clean, dated records are excluded by rule, and the router contract carries the retired tool ids inside its own output shape — which is where the silent-degradation risk lives (F4, F6, F7).

## Questions Remaining

- **Q1 residual (carried):** whether `audio_extract` or `video_trim` covers audio trim — one spot-check before the change list is written. Still unverified after three iterations; it is a one-line fixture check at implementation time.
- **Q3 `SKILL.md` / `AGENTS.md` / `README.md`:** now carrying four Q2-derived additions — the `TOOL_MAP`/`RESOURCE_MAP` rebinding to the renamed files and the new catalogue, the router's tool-binding vocabulary (`"tool": "video-audio"` in the contract shape), whether `assets/hls-video-conversion.md` moves under `references/`, and the `### Escalate if` → upper-case heading pass coupled to the kernel's section 2 in the same change.
- **Q4 (answered, with one open tail):** the open tail is the pointer text the kernel uses to name each newly named document, which now has to change for the catalogue, the two renamed references and the HLS version bump in the same pass.
- **Q5 gates and ranked change list:** Q2 adds (a) the residency rows in `systems.py` and `benchmark/parity/run_residency.sh` for the two renames and the catalogue, (b) the `benchmark/gates/README.md` rows keyed on the old filenames at lines 39, 40, 43 and 76, (c) the router contract/fixtures/`route_contract.py` tool-id rebinding, (d) the visual-inspection-free risk from guarded loading that makes a missing pointer silent rather than fatal, and (e) the `description.json`/`graph-metadata.json` spot-check in the plugin copy.

## Next Focus

Q5 — the gates and the ranked change list: what must change in `benchmark/gates/rule_parity.py`, the new `benchmark/router/differential.py` modelled on Product Owner's, the Sync Loop pairs and residency rows in `systems.py`, the playbook scenarios, the plugin skill copy and both guides, ranked by priority with file paths — carrying the Q2 findings above as change-list entries.

## SCOPE VIOLATIONS

None. Every researched path was read-only. The only writes are this narrative (`research/iterations/iteration-003.md`), the delta file (`research/deltas/iter-003.jsonl`), the single-record event file `research/.iter-003-record.json` inside this run's own packet directory (created because the append gateway requires a single-record `--event-json` input file and the multi-line delta is explicitly not a valid input), and the gateway's own write into `research/deep-research-state.jsonl`.
