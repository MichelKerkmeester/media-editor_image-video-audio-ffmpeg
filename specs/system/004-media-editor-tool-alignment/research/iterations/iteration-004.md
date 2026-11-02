# Iteration 004 — Q3: `SKILL.md`, `AGENTS.md` and `README.md` (command→tool mapping, `TOOL_MAP`/`RESOURCE_MAP`, tool check, export, Desktop setup, router extraction)

Scope: the skill package's three outer surfaces — `AI Systems/Media Editor/sk-media-editor/SKILL.md` (429 lines), `AI Systems/Media Editor/AGENTS.md` (168), `AI Systems/Media Editor/sk-media-editor/README.md` (401) — plus the two files that mirror them (`claude project/Custom Instructions.md`, 335) and the pieces they are bound to (`benchmark/router/route_contract.py`, `fixtures.json`, `benchmark/gates/script rule_parity.py`, `INSTALL-GUIDE.md`). Read-only throughout.

---

## Actions Taken

1. Read `sk-media-editor/SKILL.md` end to end in three passes (1-120, 120-300, 301-429) with line hashes, capturing §1 command triggers, §2 routing prose + the 116-line pseudocode fence + `RESOURCE_MAP`/`TOOL_MAP`, §3 tool check + operating-mode table, §4 rules, §5 references, §7 integration points.
2. Read `AGENTS.md` end to end (command registry, manual-load DAG, processing hierarchy, packaging), and mapped `sk-media-editor/README.md` by heading plus the tool-bearing tables (§2 L104-111, §3 L117-124, §7 L310-318, §8 L324-338, §12) and the quick-start/FAQ/troubleshooting sections.
3. Read the Media Editor router machine surface: `benchmark/router/route_contract.py` (362 lines, route-object schema and tool binding), `benchmark/router/fixtures.json` (257 lines, 10 fixtures asserting the `resources` list per mode) and the `benchmark/` inventory that shows no `differential.py`.
4. Read the fleet precedent for the requested extraction: Product Owner's `sk-product-owner/references/router-contract.md` (906 lines, frontmatter + Loading Condition/Purpose/Scope/Routed By block), its `SKILL.md` pointer sentences (L99, L148, L325), its kernel `## 11. ROUTER CODE` ("It is `references/router-contract.md` with its comments removed"), and `benchmark/router/differential.py` (extracts the md fence and executes it against `route_contract.py`). Cross-checked Barter Copywriter (`## 11. ROUTER CODE`) and Barter Deal Templates (`## 12. ROUTER CODE`) for heading position.
5. Verified the Desktop setup facts in `INSTALL-GUIDE.md` (allow `media files/`, output folder `media files/export/`, the empty **Directory path** row) against `mcp server/manifest.json`'s `user_config` keys, and checked whether `SKILL.md`/`AGENTS.md`/`README.md` restate any of them.
6. Grepped the fleet for the `### ESCALATE IF` heading convention and diffed the plugin's shipped copy of the skill against the source copy.

---

## Findings

### F1 (P1) — The router contract validates against the legacy product names as a closed enum, and it disagrees with `SKILL.md` about what `tool` even means

`benchmark/router/route_contract.py` fixes the route object's tool vocabulary twice:

```python
TOOL_MAP = {"IMAGE": "imagician", "VIDEO": "video-audio", "AUDIO": "video-audio",
            "HLS": "ffmpeg", "REPAIR": "auto", "INTERACTIVE": "auto"}
TOOL_VALUES = ["imagician", "video-audio", "ffmpeg", "auto"]
```

`SKILL.md` L157-163 fixes the same field differently — every mode binds the literal `"ffmpeg"`, with Repair as `"ffprobe and ffmpeg"`, and L242 returns `"tool": TOOL_MAP[intent]`. So the two copies of one contract currently emit *different values for the same field*, and neither value names a real Media Editor tool. `"imagician"` and `"video-audio"` are the retired third-party server names promoted to a validated enum, and `"ffprobe and ffmpeg"` (a phrase) is not in `TOOL_VALUES` at all, so the skill's own `tool` value would be rejected by the contract that claims to characterize it.

The Q3 change is therefore not a rename but a vocabulary decision, and it has to land in four places in one pass: `SKILL.md`'s `TOOL_MAP` and its `"tool":` return, `route_contract.py`'s `TOOL_MAP` **and** `TOOL_VALUES`, `fixtures.json`'s expected `tool` per fixture, and the kernel fence's `TOOL_MAP`/`choose_route` return. The tool-group names the change should bind are already stated in prose at `SKILL.md` L297 (`image_*`, `video_*`, `audio_*` plus `media_remove_silence`, `video_hls_ladder`, `media_probe` then `media_repair`), so the vocabulary exists — it is simply absent from every table and from the enum.

### F2 (P1) — The router exists in three copies and nothing proves any two of them agree; the extraction order is fixed by the Product Owner precedent

The router is written three times: `SKILL.md` §2 fence (L129-244, 116 lines), the kernel §2 fence (L91 onward, under "### Smart router pseudocode"), and `route_contract.py` (362 lines). `benchmark/router/` holds only `route_contract.py`, `fixtures.json`, `run_fixtures.sh` and `README.md` — there is no `differential.py` in this system, so the pair *skill fence ↔ contract* is unchecked. `run_fixtures.sh` only proves `route_contract.py` still satisfies its own fixtures.

The Product Owner precedent gives the order to follow, and it is a five-step move, not one file:

1. `SKILL.md` §2 keeps its prose (`### Primary detection signal`, `### Phase detection`, `### Resource domains`, `### Resource loading levels`) and gains a pointer sentence in Product Owner's shape: `references/router-contract.md` carries this router as running Python, the exact algorithm `benchmark/router/route_contract.py` is checked against… It is ON_DEMAND, read only when a request needs the precise implementation rather than the rule (PO `SKILL.md` L148).
2. The fence moves into `references/router-contract.md` with PO's reference frontmatter (`title`, `description`, `version`, `contextType: reference`, `importance_tier`, `trigger_phrases`) and its body metadata block (`Loading Condition`, `Purpose`, `Scope`, `Output Path`, `Loads With`, `Routed By`, `Hands Off To` — PO answers these as ON_DEMAND, "Routed By: nothing automatic", "Hands Off To: nothing").
3. `SKILL.md` §5 References adds the contract as an ON_DEMAND entry (PO `SKILL.md` L325 is the model line).
4. The kernel's copy is re-derived rather than rewritten: the router section moves out of §2 to the **end** of the kernel, as `## 7. ROUTER CODE`, whose preamble states it is `references/router-contract.md` with its comments removed. Verified fleet position: Product Owner `## 11. ROUTER CODE` and Barter Copywriter `## 11. ROUTER CODE` are their kernels' last sections, Barter Deal Templates' is `## 12. ROUTER CODE`. The Media Editor kernel has six sections today (§1 Objective … §6 Quality checklist), so seven is the correct number and it lands after the quality checklist.
5. `benchmark/router/differential.py` is added so the fence and the contract cannot drift again.

Note the direction of the coupling the extraction creates: today the kernel fence is a copy of the skill fence; after the change both md copies derive from the contract, and the kernel copy is the one that must lose its comments, per `routes` line 4 above. Doing step 4 before step 2 leaves the kernel pointing at a file that does not exist yet — the pointer is prose, so nothing fails loudly.

### F3 (P1) — `RESOURCE_MAP` is triple-copied, ungated by the rule gate, and fails silently on a stale path

`RESOURCE_MAP` appears in `SKILL.md` L145-151, in the kernel fence, and in `route_contract.py` L106-113 — the same three files as the router, with the same three copies of the two `mcp-` paths. Three separate facts make a rename here dangerous rather than merely untidy:

- Loading is guarded: `route_media_editor_resources` calls `load_if_available`, which checks `discover_markdown_resources()` and silently skips an absent path. A renamed-but-not-updated `RESOURCE_MAP` entry produces *no error and no load* — the mode answers with a thinner reference set.
- `benchmark/gates/rule_parity.py` does not read `RESOURCE_MAP` or `TOOL_MAP`. Its own machinery is `declared_pairs()` / `body()` / `inside()` — it walks declared skill↔Project pairs, so the rename is invisible to it.
- What does catch it is `benchmark/router/run_fixtures.sh` via `fixtures.json`, which asserts the per-mode `resources` list in 10 fixtures naming the old files (L13, L28, L43, L58, L73, L88, L148, L163, L178, L223). That is a loud failure, but it lives at the contract's end of the chain, not the skill's.

Practical consequence for the change list: the rename must be atomic across `SKILL.md`, the kernel fence and `route_contract.py`, and `fixtures.json` must move in the same commit or `run_fixtures.sh` fails. The new `differential.py` gate from F2 is the only thing that would then protect the md↔py pair.

### F4 (P1) — The command→tool mapping is stated correctly in one prose sentence and wrong in all three tables a router actually reads

The server-side binding is already written down at `SKILL.md` L297: "the `image_*` tools for Image, the `video_*` tools for Video, the `audio_*` tools and `media_remove_silence` for Audio, `video_hls_ladder` for HLS and `media_probe` then `media_repair` for Repair." Every table says something else or says less:

| Surface | Where | What it says | Defect |
| --- | --- | --- | --- |
| `SKILL.md` §1 | L44-46 | `$image`/`$img` "route to Image Mode and the ffmpeg image reference"; `$video`/`$vid` and `$audio`/`$aud` "route to Video/Audio Mode and the ffmpeg video and audio reference" | Names the *reference document* as the routing destination instead of the tool; points two commands at one shared document |
| `SKILL.md` §3 | L288-295 | operating-mode table, column header literally `Local tool`, every row `ffmpeg` (Repair: `ffprobe then ffmpeg`) | The header concedes the point: it describes only the fallback |
| `AGENTS.md` §3 | L107-116 | `Command registry` with a `Tool` column carrying `ffmpeg` / `ffprobe then ffmpeg`, then L116: "The Tool column names the local route. With the Media Editor tools connected, every command runs through them first" | The qualifier makes the table half-true after the fact; the table itself carries no tool-first binding |
| `README.md` §2 | L104-111 | `Detection, by example` — "Image Mode, ffmpeg (exact command)" etc. | Same |
| `README.md` §3 | L117-124 | operating modes, "Tool, triggered by" — every row `ffmpeg`/`ffprobe then ffmpeg` | Same |

So the required change is a *mapping* change in five tables (bind the mode to its tool group and name the fallback second), not a find-and-replace, and the L297 sentence is the source the tables should be rewritten from. `SKILL.md` §3's column header should also change, since `Local tool` cannot hold a tool-first value.

### F5 (P2) — Two corrections to the carried change list: there is no README "section 4 tool table", and README §8 carries a hard count the third document breaks

The carried Q3 note asks about "the README section 4 tool table". README §4 is `## 4. Format and quality intelligence` (L228-248) and holds two tables — a use-case/recommendation table and a MEDIA-phase/progress table — neither of which names a tool. The tool-bearing README surfaces are §2 (L104-111), §3 (L117-124), §7 `Assets and reference inventory` (L310-318) and §12 `Related documents` (L~397). Looking for §4 wastes the pass.

Second correction, and the one with a real coupling: README §8 states "the same **seven** knowledge files are copied byte for byte from the skill sources", and `claude project/knowledge/` holds exactly seven (`MEDIA Framework`, `Human Voice Core`, `Human Voice EN`, `Interactive Intelligence`, `Integrations - MCP Imagician`, `Integrations - MCP Video Audio`, `Reference - HLS Video Conversion`). Q2's third document (the tools catalogue) makes it eight, so README §8's count and §7's inventory both change in the same pass — as does the SYNC declaration's pair count, which Q5 owns. A related observation from the same listing: the Knowledge document *names* still carry `MCP Imagician` / `MCP Video Audio`, so a Knowledge-name decision is owed even where content is tool-first (Q2's call, recorded here because README §7 and §12 publish those names too).

### F6 (P2) — The Desktop setup facts are correctly placed and need no new home; only the pointers to them must survive the renames

`SKILL.md`, `AGENTS.md` and `README.md` all describe the packaging but state no extension setting. `SKILL.md` L408 says "Installation: the Claude Desktop extension or the Claude Code plugin, both built from `mcp server/`. `INSTALL-GUIDE.md` covers both"; `AGENTS.md` L164 does the same at packaging level; README §8/§10/§11 discuss the extension's effect without its settings. The setup facts themselves live only in `INSTALL-GUIDE.md`, and they are already correct and specific there:

- Allow `media files/` (plus any media folder) under **Folders Media Editor may open**; set **Output folder** to `media files/export/` (L103).
- Leave no empty **Directory path** row — "Claude Desktop does not start the tools while one is there", and the troubleshooting table repeats it as the cause of "Unable to connect to extension server" (L241).
- The plugin needs no settings: `run_receipts`/plugin README shows `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"` (L68), matching `plugin.json` L17.

Answer for Q3: leave the setup facts in the guide; do not duplicate them, because three copies of a settings recipe is the same failure mode as the three-copy router. The setting names line up with `manifest.json`'s `user_config` keys `allowed_directories` and `output_directory`, so a rename pass that touches only the software-name vocabulary (`mcp-imagician`, `mcp-video-audio`) leaves every setting untouched. The only setup-adjacent edits owed in these three files are the pointers at `SKILL.md` L368 (`mcp server/` "packaged as the Claude Desktop extension and the Claude Code plugin"), `AGENTS.md` L164, and README §8/§12 — keep them, they are the route a reader takes to the settings.

### F7 (P1) — `### Escalate if` is the fleet's only lowercase outlier, and the fix is a three-file pass because the plugin ships a copy

Verified convention across the fleet: `### ESCALATE IF` in Product Owner's skill **and** kernel, Barter Copywriter's skill, Prompt Improver's skill and kernel, Sales - HubSpot & Automation's skill, and Sales - Direct Communication's kernel. The Media Editor is the sole lowercase surface, at `sk-media-editor/SKILL.md:337` and `claude project/Custom Instructions.md:289`.

The third file is the one that gets missed: `mcp server/claude-plugin/skills/media-editor/SKILL.md:337` is a *shipped copy* of the skill inside the plugin, confirmed identical to the source copy. A heading pass that stops at the skill and kernel leaves the artifact users actually install carrying the outlier — and that copy is regenerated by a build step (`npm run plugin`) rather than edited, so the pass is "change the source, rebuild, then verify the copy". README §8 and AGENTS.md §5 both describe the plugin as carrying a copy of the skill, which is why the rebuild is not optional.

### F8 (P2) — Three self-descriptions still say the skill drives ffmpeg, so a filename-only sweep leaves them untrue

The tool-first rewrite already landed in some sentences (`SKILL.md` L403 "drives two tool surfaces and reimplements neither", L421 "the Media Editor tools when connected, then ffmpeg, then advice") but not in the self-descriptions that frame the package:

- `SKILL.md` L366 — "`sk-media-editor/SKILL.md` is the executable Media Editor identity and router **that drives ffmpeg**".
- `SKILL.md` L414 — FFmpeg's Purpose reads "**every** image, video and audio operation", which contradicts the tool-first order stated four lines below it.
- `SKILL.md` L425 / README §8 — "It runs the Media Editor tools **or** ffmpeg" (additive, where the system's own rule is ordered preference).

These are vocabulary-carrying sentences in the same sense as the `mcp-` prefixes: leaving them makes the package describe a fallback-first system in its own cover text. Small, but they are the lines a reader sees first (README §1 core-layer table L20-25 has the same shape, and L20's "**Five** media intents" undercounts the six modes in its own §3 table).

### F9 (P2) — One carried Q1 residual closes against the code, as the state summary indicates

The state summary's orchestrator check is consistent with what this iteration's surfaces imply: no server tool trims an audio-only file (`src/tools/video/trim.ts` calls `requireVideoStream` and writes `.mp4`; `src/tools/audio/extract.ts` has no time fields), so audio trim remains an ffmpeg-fallback operation. That is the right shape for `TOOL_MAP`/the tools catalogue to record — a mode whose tool group does not cover every listed operation — and it means the tools catalogue cannot be written as a one-line-per-mode capability claim.

---

## Questions Answered

**Q3 — command→tool mapping.** Answered by F4: five tables plus one column header rebind to the tool-first vocabulary already stated at `SKILL.md` L297; the fallback is named second, not first.

**Q3 — `TOOL_MAP` / `RESOURCE_MAP`.** Answered by F1 and F3: `TOOL_MAP` needs a vocabulary decision plus a four-place rebinding (`SKILL.md`, kernel fence, `route_contract.py` `TOOL_MAP`+`TOOL_VALUES`, `fixtures.json`); `RESOURCE_MAP` needs an atomic three-file rename with `fixtures.json` in the same pass, because the runtime guards make a stale entry silent and `rule_parity.py` does not look at it.

**Q3 — tool check.** No change owed in substance: `SKILL.md` §3 (L263-285) already carries the tool-first check (`media_health` once, the pinned ffmpeg inside the server, `media_setup_ffmpeg` consent, the `CAPABILITY_MISSING` → `CONFIG_MISSING`/`PATH_NOT_ALLOWED` handoffs), and `AGENTS.md` L147 and the kernel §3 state the same three routes. The change is confined to the vocabulary of the tables that feed it (F4) and to keeping `TOOL_MAP` consistent with it (F1).

**Q3 — export to `media files/export/`.** No change owed. Verified consistent across `SKILL.md` L16/L260/L311/L324, `AGENTS.md` L34-64 (including the tool-settings sentence at L64: set the tool's output folder to `media files/export/` so tool and ffmpeg results land together), README §8 and the kernel. This is already the v1.6.0 path and the rename pass does not touch it.

**Q3 — Desktop setup.** Answered by F6: the facts belong in `INSTALL-GUIDE.md` alone; the three surfaces under review keep only their pointers, and the setting keys (`allowed_directories`, `output_directory`) are unaffected by the software-name vocabulary change.

**Q3 — router extraction to `references/router-contract.md`.** Answered by F2: five steps in the Product Owner order, with the kernel section landing as `## 7. ROUTER CODE` (final section, after the quality checklist) and a new `benchmark/router/differential.py` as the anti-drift gate.

**Q3 — `### Escalate if` case pass.** Answered by F7: three files (skill, kernel, plugin copy), the plugin copy via rebuild, and the case is the fleet's only outlier.

**Q1 residual (carried, closed).** Answered by F9: audio trim stays an ffmpeg-fallback operation; recorded here rather than deferred, so iteration 5's change list can cite a closed question.

---

## Questions Remaining

1. **Q5 — gates and the ranked change list.** Now carrying Q3's contributions: the `TOOL_VALUES` enum rebinding in `fixtures.json` (10 fixtures), the new `benchmark/router/differential.py` modelled on Product Owner's, the `rule_parity` blind spot for `RESOURCE_MAP`/`TOOL_MAP`, the `benchmark/gates/README.md` rows keyed on the old filenames (lines 39, 40, 43, 76), residency rows for the renamed documents and the catalogue, the README §8 seven→eight count against the SYNC declaration, the playbook scenarios, the plugin-skill copy rebuild, and both guides.
2. **Q4 tail — pointer text.** The kernel pointer must name each document as it will be called after the renames: the catalogue, the two renamed references, the HLS version bump, and now additionally the router contract, since the kernel's §2 pointer and its `## 7. ROUTER CODE` preamble both cite `references/router-contract.md`.
3. **Q2 tail — Knowledge document names.** `claude project/knowledge/` still lists `Media Editor - Integrations - MCP Imagician - v0.211.md` and `... - MCP Video Audio - v0.212.md`, and README §7/§12 publish those names. The content rename is Q2's; the published names and the seven→eight count (F5) are the coupling that Q4's knowledge set and Q5's residency rows must both absorb.
4. **Q5 tail — whether `differential.py` can execute the Media Editor fence unchanged.** PO's `differential.py` execs the md fence; the Media Editor fence calls `load()`, `media_tools_connected()` and `verify_ffmpeg()`, which are host functions rather than module-level stubs. Whether the extraction must factor those into injectable seams (and therefore whether `route_contract.py` gains a shim) is a gate-design question for iteration 5, not a naming one.

---

## Next Focus

**Q5 — gates and the ranked change list.** Build the ranked, file-pathed change list from the five answered questions, deciding `benchmark/gates/rule_parity.py`'s additions, the new `benchmark/router/differential.py` (including the host-function seam question above), the Sync Loop pairs and residency rows in `systems.py` and `benchmark/parity/run_residency.sh`, the playbook scenarios, the plugin-skill rebuild, and the guide updates — with the four Q3 couplings (F1 enum, F3 atomic rename, F5 count, F7 plugin copy) carried in as explicit ordering constraints rather than footnotes.

---

## SCOPE VIOLATIONS

None. All reads were read-only; the only writes were this iteration's three declared artifacts, plus the append-gateway call into the run directory.

**Would-be mutations recorded as findings, not executed** (all outside the allowed-write list, and out of scope during research by design): `sk-media-editor/SKILL.md`, `AGENTS.md`, `sk-media-editor/README.md`, `claude project/Custom Instructions.md`, `benchmark/router/route_contract.py`, `benchmark/router/fixtures.json`, `benchmark/gates/rule_parity.py`, `mcp server/claude-plugin/skills/media-editor/SKILL.md`, `INSTALL-GUIDE.md`, `claude project/knowledge/*`. Each is named as a change target in F1-F8 and is left untouched.
