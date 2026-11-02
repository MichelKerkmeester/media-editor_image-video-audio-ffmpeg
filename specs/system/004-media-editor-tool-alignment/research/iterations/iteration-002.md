# Iteration 002 — Q4: Kernel and Knowledge (Router Code, section 2 pointer, heading case, Knowledge add/rename/drop, delivery protocol for tool runs)

- **Run:** 004-media-editor-tool-alignment, lineage `2026-10-03T14:44:01.000Z`, iteration 2 of 5
- **Focus:** Q4 — how `claude project/Custom Instructions.md` should end with a Router Code section, how section 2 reduces to a pointer, the upper-case fleet heading pass, which Knowledge files to add, rename or drop, and the delivery protocol shape once tools run.
- **Outcome:** Q4 answered. The fleet pattern is fully evidenced in six kernels; the exact precedent for a *mid-section-2* code block is Prompt Improver and Sales Direct Communication (spec 083 phases 003/004), not Copywriter or Product Owner. Media Editor is the last kernel in the fleet without a Router Code section, and spec 083 excluded it by name. Knowledge resolves to 1 rename pair, 1 add, 0 drops. The delivery protocol needs fleet `###` structure plus a named tool-delivery subsection modelled on Product Owner's ClickUp Connector Delivery.

## Actions Taken

1. Read the Media Editor kernel end to end (`claude project/Custom Instructions.md`, 335 lines, v1.6.0) — section headings, section 2 (lines 41-215, including the inline `### Smart router pseudocode` Python block), section 5 delivery protocol and section 6 checklist.
2. Pulled the heading inventory and the delivery protocol of all six other fleet kernels (Copywriter, Deal Templates, Product Owner, Prompt Improver, Sales Direct Communication, Sales HubSpot & Automation) to isolate the norm: H1 sections upper case, H2 subsections Title Case except `### ALWAYS` / `### NEVER` / `### ESCALATE IF`.
3. Read spec 083 (`specs/048-fleet-router-in-kernel/spec.md`) plus the phase 001 and 003 implementation summaries for the exact move recipe, the exclusion of Media Editor, the gate that holds the kernel code equal to the skill router minus comments, and the version-bump and Sync Loop consequences.
4. Read the Router Code sections of Copywriter (`## 11.`), Deal Templates (`## 12.`), Product Owner (`## 11.`), Prompt Improver (`## 8.`) and Sales Direct (`## 8.`) to compare intro wording, and read the `### Smart Router Pseudocode` pointer each of the latter two now leaves in section 2.
5. Read Product Owner's `## 9. DELIVERY PROTOCOL` (`### Strict Sequence`, `### ClickUp Connector Delivery`, `### Deliverable Metadata`, `### Export-Equivalent Paths`, `### HVR Self-Scan`) and Sales HubSpot's `## 7. DELIVERY PROTOCOL` + its 28-document Knowledge inventory for the tool-catalogue naming precedent.
6. Read the Media Editor Knowledge frontmatter (`title:` vs filename for all 7 documents), `claude project/README.md` (version lines and the house display-name rule at line 60), and `SYNC.md` (7 declared pairs, the v1.4.3 pointer rule, the pending kernel review for v1.5.0/v1.6.0).

## Findings

### F1 (P1) — The Media Editor kernel is the fleet's last sentence-case outlier; every other kernel uses upper-case H1 sections

Verified across 6 kernels. Norm: `## 1. OBJECTIVE`, `## 2. SMART ROUTING`, `## 3. RULES`, `## 4. QUALITY GATE`, `## 5. DELIVERY PROTOCOL`, `## 6. QUALITY CHECKLIST BEFORE REPLY`, then the terminal Router Code section. Media Editor instead ships `## 1. Objective`, `## 2. Smart routing`, `## 3. How it works`, `## 4. Rules`, `## 5. Delivery protocol`, `## 6. Quality checklist before reply`.

Subsection norm, measured on the same set: Title Case under section 2 (`### Primary Detection Signal`, `### Phase Detection`, `### Resource Domains`, `### Resource Loading Levels`, `### Smart Router Pseudocode`, `### Executable Contract`), upper case for the rule lists (`### ALWAYS`, `### NEVER`, `### ESCALATE IF`). Media Editor's subsections are sentence case (`### Primary detection signal`, `### Phase detection`, `### Resource domains`, `### Resource loading levels`, `### Smart router pseudocode`, `### Tool check`, `### Operating modes`, `### Export protocol`) with `### Escalate if` as the one rule-list heading that missed the upper-case form. `### MEDIA flow` is the single page where the fleet offers no counterpart.

Scope note: `SYNC.md` records a fleet-wide heading pass on 2026-09-11 that "touched only headings, dividers and blank lines here". That pass did not raise the case, so the heading-case gap is live and belongs to this change.

### F2 (P1) — Media Editor has no Router Code section, and spec 083 excluded it by name; this is the tail of that programme

`specs/048-fleet-router-in-kernel/spec.md` states the purpose as "Every Claude Project in the fleet except Media Editor and Barter Deal Templates ends its kernel with a Router Code section held equal to its skill's router by a gate, and none ships a Router Contract Knowledge document", and lists "Media Editor and Barter Deal Templates - excluded by the operator" under Out of Scope. Deal Templates has since shipped its own (`## 12. ROUTER CODE`); Media Editor has not.

The fleet's Router Code section is uniform, and Media Editor already mirrors all three of its client systems:

| Kernel | Section | Intro line |
| --- | --- | --- |
| Barter Copywriter | `## 11. ROUTER CODE` | "Route every request with this code. It is `references/router-contract.md` with its comments removed, and the sections above state the same rules in prose." |
| Product Owner | `## 11. ROUTER CODE` | identical |
| Barter Deal Templates | `## 12. ROUTER CODE` | identical |
| Sales Direct Communication | `## 8. ROUTER CODE` | identical |
| Prompt Improver | `## 8. ROUTER CODE` | "… It is the Smart Router Pseudocode in `SKILL.md` with its comments removed, and the sections above state the same rules in prose." |

Media Editor's kernel ends at `## 6. Quality checklist before reply`, so its terminal section is **`## 7. ROUTER CODE`**, and because Q3's plan extracts the router to `references/router-contract.md`, the intro is the Copywriter/Product Owner/Deal Templates form, not the Prompt Improver form. The section holds the Python block verbatim with comments removed. The Media Editor code currently carries a 4-line comment block at `SKILL.md:153-156` / kernel `119-122` ("Every mode names the tool the local route runs…") — per the spec 083 decision "Code-encoded rules point at Section 11, judgement tables return as prose", that comment belongs in the contract file and must not appear in the kernel.

### F3 (P1) — Section 2's exact reduction is the Prompt Improver / Sales Direct precedent: keep every prose line, replace the code with a three-line pointer

Spec 083 splits the fleet into two shapes, and Media Editor belongs to the second:

- **Router Contract carriers** (Copywriter, Product Owner): the code lived in a Knowledge document; the kernel gained the code and the pointers were repointed to the Router Code section.
- **Mid-section-2 carriers** (Prompt Improver, Sales Direct, Sales HubSpot): "move the kernel's router block from section 2 to a Router Code section at the end, keep section 2's prose, and hold the block equal to the skill's router with a gate".

Media Editor is a mid-section-2 carrier: `### Smart router pseudocode` runs kernel lines 91-215 (~125 lines of Python plus a comment block). The post-083 shape in both analogue kernels is exactly this, under the unchanged heading:

> `### Smart Router Pseudocode`
> This is the routing this Project applies: <one-sentence restatement of the routing rules>.
> The code itself is Section 8, Router Code, at the end of this kernel.

Sales Direct's variant adds the guard clause Media Editor's prose already promises: "the resource paths in Section 8 map to the loaded Knowledge docs, guarded so a missing doc degrades to a smaller set rather than a break." Media Editor's current sentence says "the resource paths below map to the loaded Knowledge docs" — `below` must become `in Section 7`, because after the move nothing is below it.

What stays as prose in section 2, on the same evidence: the route-order paragraph ("Every operation takes the first route that is available: the Media Editor tools…, then locally installed ffmpeg, then advice"), the `### Primary Detection Signal` command block, `### Phase Detection`'s five numbered rules, `### Resource Domains` and the `### Resource Loading Levels` table. Those are judgement tables, and the spec 083 decision keeps judgement tables in prose ("The kernel is always read, so the code is in context, and the tables are what the gates and the model read as guidance"). `RESOURCE_MAP` and `TOOL_MAP` are code-encoded and move with the code — which also settles the Q3 question of where the command→tool mapping is edited: the contract file is the source, and the kernel's Router Code section is its comment-free projection.

Two knock-on effects the fleet recorded: Prompt Improver remapped "111 kernel line citations in 39 files" of its manual-testing playbook after the move, and the Copywriter kernel grew from 22,700 to 42,500 characters because it now carries the code. Media Editor's kernel will grow by roughly the size of its router block.

### F4 (P2) — Knowledge rename: both integration filenames contradict their own `title:` frontmatter, and the fix is already written inside them

`claude project/README.md:60` sets the house rule: `Media Editor - <Section> - <Title> - v<version>.md`. Both integration documents violate it today:

| Filename now | `title:` inside | Decision |
| --- | --- | --- |
| `Media Editor - Integrations - MCP Imagician - v0.211.md` | `Media Editor - Integrations - FFmpeg Image Operations - v0.211` | filename must lose `MCP Imagician` |
| `Media Editor - Integrations - MCP Video Audio - v0.212.md` | `Media Editor - Integrations - FFmpeg Video Audio - v0.212` | filename must lose `MCP Video Audio` |

So the legacy vocabulary lives in the **filenames and every pointer that names them**, not in the document identities — that is why the kernel's `### Resource domains` list can say "FFmpeg image operations" and "FFmpeg video and audio" while `SKILL.md:117` and `README.md:328` still defend the `mcp-` prefixes as historical.

Recommendation: rename to media-type + operation, dropping both the legacy product words and the now-secondary `FFmpeg`, because Q2 rewrites these documents tool-first with ffmpeg as the fallback — a filename that promises ffmpeg first contradicts its own content. `Media Editor - Integrations - Image Operations - v0.213.md` and `Media Editor - Integrations - Video And Audio Operations - v0.213.md`, mirrored by `sk-media-editor/references/image-operations.md` and `video-and-audio-operations.md`. Version bumps in the same change, because the content changes; the kernel pointer text stays versionless (`Full detail: \`Media Editor - Integrations - Image Operations.md\``), matching the v1.4.3 rule that "kernel v1.4.3 names every Knowledge document it delegates to by its Project filename plus the topic that document carries".

### F5 (P2) — Knowledge add: exactly one document, a tool catalogue, and it has both a source and a fleet precedent

No tool catalogue exists on either side: 6 of 39 tools are named anywhere, 33 sit behind `image_*` / `video_*` / `audio_*` wildcards, and no surface states a tool's purpose, key parameters, defaults, consent contract or error behaviour (iteration 1, F1/F5/F6). The complete catalogue already exists at `mcp server/README.md` section 4 (all 39 tools by group) with section 5 carrying the config defaults (allowed-folder precondition, output-folder default, 1800 s timeout, `MEDIA_EDITOR_*` overrides).

The fleet precedent for a tooling catalogue is Sales HubSpot, which ships `Context - HubSpot Reference`, `Context - Sales Tooling`, `Reference - Existing Automations` and `Reference - GAS API Cookbook` — the `Reference` prefix is the fleet's word for "the durable technical catalogue". Recommended add, in the same change as the rename: skill `sk-media-editor/references/tools.md` ↔ Knowledge `Media Editor - Reference - Media Editor Tools - v0.100.md`, carrying the 39 tools grouped as the server groups them, each with purpose, key parameters, defaults, the `media_setup_ffmpeg` consent contract, and the 15 error codes with their recovery rule. It is the document `TOOL_MAP`, `RESOURCE_MAP`, the tool check and the delivery protocol all point at.

### F6 (P2) — Knowledge drop: zero, and that is a finding rather than an omission

Media Editor never shipped a Router Contract Knowledge document, so spec 083's "none ships a Router Contract Knowledge document" clause is already satisfied and there is nothing of that class to delete. All 7 Knowledge documents map to a live declared pair in `SYNC.md` (7 pairs: `human-voice-rules`, `hvr-core`, `interactive-intelligence`, `mcp-imagician`, `mcp-video-audio`, `media-framework`, `hls-video-conversion`), and the `.skilled`-style symlink pair (`human-voice-rules.md`, `hvr-core.md`) points into `z — Knowledge/`, so it is shared knowledge rather than a system mirror.

The one conditional: when the new tools catalogue lands, do **not** delete the two integration documents on the theory that the catalogue subsumes them. They carry the ffmpeg recipes and the per-media-type limits that the catalogue deliberately does not, and Q2 keeps them as the fallback layer.

### F7 (P2) — The kernel has no PROJECT KNOWLEDGE section, and the doc set is about to grow from 7 to 8

Every other kernel carries one as a top-level section: Copywriter `## 8. PROJECT KNOWLEDGE (REQUIRED vs OPTIONAL, doc granularity)`, Product Owner `## 8. PROJECT KNOWLEDGE CONSULTATION` (a table plus "consult the smallest set that can safely answer it"), Deal Templates `## 6. PROJECT KNOWLEDGE CONSULTATION` (a 12-row table of document → consult when), Sales HubSpot `## 6. PROJECT KNOWLEDGE CONSULTATION` with `### Foundational Knowledge` / `### DESIGN Knowledge` / `### AUTOMATION Knowledge`. Media Editor folds the equivalent into section 2 as `### Resource domains` + a 3-row `### Resource loading levels` table and delegates the per-document detail to "Full detail:" pointer lines scattered through sections 1, 3 and 4.

This is the load-bearing gap for the rename: the kernel names each delegate document in prose in four places today (section 1 `### When to use`, section 2 `### Resource domains`, section 3 `### Tool check` / `### Operating modes`, and the pointer on `MEDIA flow`), so a rename touches all of them and a missing one silently keeps the dead name. Recommendation: add `## 7. PROJECT KNOWLEDGE CONSULTATION` before Router Code (fleet vocabulary, table shape), listing all 8 documents by Project filename, topic and consult-when, and let section 2's `### Resource domains` shrink to a one-line pointer at it. This is also what makes the `rule_parity.py` and Sync Loop residency rows keyable on document names, which Q5 needs.

### F8 (P2) — Delivery protocol for tool runs: the fleet shape is `### Strict Sequence` plus a named tool-delivery subsection; Media Editor has neither

`## 5. Delivery protocol` currently carries two unheaded blocks ("When a Media Editor tool ran, lead with: Ran / Result is in / Check this" and the no-tool fallback) plus the attestation line, and no `###` subsections. The fleet's structure is consistent and Product Owner's tool case is the closest model:

- **`### Strict Sequence`** — a numbered pipeline (Product Owner 8 steps, Sales HubSpot 3, Deal Templates by block). For Media Editor: detect mode and route → `media_health` when tools are connected → run the mode's tool(s) → verify with `media_probe` on the output → report the returned folder → attestation.
- **`### ClickUp Connector Delivery`** is the precedent for a connected tool surface and is deliberately concrete: it names `clickup_create_task`, `clickup_update_task`, `clickup_create_document`, `clickup_create_document_page`, names the exact parameter (`markdown_description`), names the read-back requirement (`include_markdown_description=true`, "confirm the rendered body matches the pushed artifact before reporting delivery complete"), names the never-unsolicited rule, and names the failure mode ("Literal `##` visible in a ClickUp task means the wrong field was used"). Media Editor's analogue must therefore name real tools rather than wildcard families — the spec's `image_*` / `video_*` / `audio_*` shorthand cannot survive into the delivery protocol — and must state the `media_setup_ffmpeg` consent contract (`consent` default false, `component` enum, writes nothing without it) at the point of delivery rather than only in the tool check.
- **`### Export-Equivalent Paths`** is the fleet's name for Media Editor's `### Export protocol` content, and the advice-only branch (`media files/export/[###] - [description]/`) should move under it, with the file-does-not-exist caveat kept.
- **Attestation divergence worth fixing in the same pass:** the fleet's voice line is a count, not an assertion — "`HVR self-scan: N hard blockers. Fixed: <terms>. Kept with reason: <terms>.`", with Product Owner stating plainly that "This line is the count itself rather than an assertion that a count was taken, so producing it is the point". Media Editor's attestation ends `HVR = checked`, which is the assertion rather than the count.

Version and record consequences for all of the above: kernel v1.6.0 → v1.7.0 (a rule change is a minor bump per `SYNC.md`), the `claude project/README.md` version lines (11, 31) and mirror tree, the `H1` version in the kernel title, and a dated `SYNC.md` entry written as a change record rather than a review — `SYNC.md` records that the operator has not yet reviewed v1.5.0 or v1.6.0, so nothing in this change may claim review.

## Questions Answered

- **Q4 (answered).** The kernel must gain a terminal `## 7. ROUTER CODE` section in the Copywriter/Product Owner/Deal Templates wording, holding the Python block that equals `references/router-contract.md` minus comments — the tail of the programme spec 083 excluded by name. Section 2 reduces by the Prompt Improver / Sales Direct precedent: every prose line and both judgement tables stay, the code block becomes a three-line `### Smart Router Pseudocode` pointer naming Section 7, and `below` becomes `in Section 7`. All 6 H1 sections plus the H2 subsections take the fleet's upper-case / Title Case pass, with `### Escalate if` → `### ESCALATE IF`. Knowledge: 2 renames (filenames brought into line with their own `title:` frontmatter, legacy product words dropped), 1 add (a 39-tool catalogue, `Reference` prefix, sourced from `mcp server/README.md` sections 4-5), 0 drops — plus a recommended `## 7. PROJECT KNOWLEDGE CONSULTATION` section, because a rename otherwise leaves the dead name in four prose locations. Delivery protocol: `### Strict Sequence`, a named `### Media Editor Tool Delivery` subsection modelled on ClickUp Connector Delivery with real tool names, the consent contract and a `media_probe` read-back, `### Export-Equivalent Paths`, and the HVR line converted from `HVR = checked` to a blocker count.

## Questions Remaining

- Q2 integration references: the rename target above is this iteration's recommendation, but the tool-first rewrite's file/Knowledge names, and whether the tools catalogue absorbs the integration files' tool tables, are Q2's call.
- Q3 `SKILL.md` / `AGENTS.md` / `README.md`: confirmed coupling to add to Q3 — the skill's `## 2. Smart routing` (lines 73-247) is the mirror of the kernel's section 2, so the pointer sentence, the contract extraction and the heading-case pass must reach both sides in the same change or the drift is invisible.
- Q1 residual: whether `audio_extract` or `video_trim` covers audio trim (one spot-check before the change list is written).
- Q5 gates and ranked change list: this iteration adds two entries — the kernel-code ≡ `references/router-contract.md` − comments gate (Prompt Improver's `kernel_parity.py` precedent, since Media Editor's `benchmark/router/` has `route_contract.py`, `fixtures.json`, `run_fixtures.sh`, `README.md` and no differential), and residency rows for the renamed documents and the new catalogue.

## Next Focus

Q2 — the integration references: what `references/mcp-imagician.md`, `references/mcp-video-audio.md` and `assets/hls-video-conversion.md` become as files and Knowledge documents, the tool-first rewrite with the ffmpeg fallback, the legacy vocabulary to drop across every referrer (`AGENTS.md`, `sk-media-editor/README.md`, `INSTALL-GUIDE.md`, `SYNC.md`, both gates/router READMEs, the playbook, `systems.py`), and whether the new tools catalogue is the third reference file rather than an addition beside them.

## SCOPE VIOLATIONS

None. Every path read this iteration was read-only, and the only writes are this narrative, the delta file and the state-log append gateway call.

## Sources Read

- `AI Systems/Media Editor/claude project/Custom Instructions.md` (full, 335 lines)
- `AI Systems/Media Editor/claude project/README.md`, `SYNC.md`, `claude project/knowledge/*.md` frontmatter (7 files)
- `AI Systems/{Barter - Copywriter, Barter - Deal Templates, Product Owner, Prompt Improver, Sales - Direct Communication, Sales - HubSpot & Automation}/claude project/Custom Instructions.md`
- `specs/048-fleet-router-in-kernel/spec.md`, `001-barter-copywriter/implementation-summary.md`, `003-prompt-improver/implementation-summary.md`
- `AI Systems/Media Editor/sk-media-editor/SKILL.md` (heading inventory), `sk-media-editor/references/`, `sk-media-editor/assets/`
- `AI Systems/Sales - HubSpot & Automation/claude project/knowledge/` (28-document inventory)
