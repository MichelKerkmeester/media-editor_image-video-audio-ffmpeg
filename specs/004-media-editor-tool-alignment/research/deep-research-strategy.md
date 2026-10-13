
# Deep Research Strategy - Session Tracking Template

Runtime template copied to `{spec_folder}/research/` during initialization. Tracks research progress across iterations.

## 1. OVERVIEW

### Purpose

Serves as the "persistent brain" for a deep research session. Records what to investigate, what worked, what failed, and where to focus next. Read by the orchestrator and agents at every iteration.

### Usage

- **Init:** Orchestrator copies this template to `{spec_folder}/research/deep-research-strategy.md` and populates Topic, Key Questions, Known Context, and Research Boundaries from config and memory context.
- **Per iteration:** Agent reads Next Focus, writes iteration evidence, and the reducer refreshes What Worked/Failed, answered questions, carried-forward questions, ruled-out directions, and Next Focus.
- **Mutability:** Mutable — analyst-owned sections remain stable, while machine-owned sections are rewritten by the reducer after each iteration. Section 3 is a generated projection from the reducer registry.
- **Protection:** Shared state with explicit ownership boundaries. Orchestrator validates consistency on resume.

### Question Injection Surface

Use `{spec_folder}/research/inbox.jsonl` to append external questions during an active run. Each line is one JSON object with:

- `id`: stable inbox record identifier
- `text`: question text to promote
- `source`: concrete source label, such as an angle bank entry, analyst strategy, or operator note
- `origin`: one of `angle-bank`, `analyst-strategy`, `operator`, or `legacy-import`
- `injectedAtIteration`: iteration number when the question was introduced
- `promotedQuestionId`: promoted registry question id, or `null` until promotion

The reducer reads the inbox on every reduce step and carries `origin` into the question registry and dashboard badges. Direct edits to Section 3 still work as a compatibility path, but they are attributed as `legacy-import`.

Question ownership is explicit:

- Inbox rows are immutable input.
- The reducer registry is canonical question state.
- Section 3 is rendered only from the registry view.

When an inbox row targets an existing registry question but carries different text, the reducer keeps the registry value, records `operatorDecision: needs_decision`, and appends a `question_conflict` event with both `inboxValue` and `registryValue`.

---

## 2. TOPIC
What must change in the Media Editor skill (SKILL.md, AGENTS.md, references/, assets/, README.md) and its Claude Project (Custom Instructions.md, knowledge/, README.md) so every surface describes the Media Editor's own MCP server, Claude Desktop extension and Claude Code plugin, uses all of their tools and options, drops the legacy third-party MCP naming (mcp-imagician, mcp-video-audio), and ends the kernel with a Router Code section like Barter Copywriter, Barter Deal Templates and Product Owner

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
- [ ] Q1 Tool surface: which of the server's tools (mcp server/src/server/all-tools.ts, src/tools/**) with their purpose, key parameters, defaults, consent rules and error codes (src/core/errors.ts) are documented, misdocumented or missing across the skill and Project, and which documented operations have no tool
- [ ] Q2 Integration references: what should references/mcp-imagician.md, references/mcp-video-audio.md and assets/hls-video-conversion.md become (file and Knowledge names, tool first with ffmpeg fallback, legacy vocabulary to drop), and is a separate tools reference needed
- [ ] Q3 SKILL.md, AGENTS.md and README: what changes in the command-to-tool mapping, TOOL_MAP and RESOURCE_MAP, tool check, export to media files/export and Desktop setup, and how to extract the router to references/router-contract.md per the fleet pattern
- [ ] Q4 Kernel and Knowledge: how should claude project/Custom Instructions.md end with a ROUTER CODE section, reduce section 2 to a pointer, adopt upper-case fleet headings, and which Knowledge files to add, rename or drop, plus the delivery protocol for tool runs
- [ ] Q5 Gates and change list: what must change in benchmark/gates/rule_parity.py, a new benchmark/router/differential.py modelled on Product Owner's, the Sync Loop pairs and residency rows in systems.py, playbook scenarios, the plugin skill copy and both guides, ranked by priority with file paths

<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS
- Changing server code under mcp server/src/: the docs follow the server
- Changing other systems' kernels: they are the pattern, not the target
- Implementing the changes: this session ends in a ranked change list

---

## 5. STOP CONDITIONS
- Five iterations completed (stop policy max-iterations)
- A route failure (401, 429, missing key) on the executor

---

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
[None yet]

<!-- /ANCHOR:answered-questions -->

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
[None yet]

<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
[None yet]

<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
[No exhausted approach categories yet]

<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
[None yet]

<!-- /ANCHOR:ruled-out-directions -->

---

<!-- ANCHOR:divergence-frontier -->
## 10A. SATURATED DIRECTIONS AND DIVERGENCE FRONTIER
- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated: none yet
- Pivot lineage: none yet
- Remaining frontier: none recorded

<!-- /ANCHOR:divergence-frontier -->

---

<!-- ANCHOR:carried-forward-open-questions -->
## 11A. CARRIED-FORWARD OPEN QUESTIONS
- Q5 gates and ranked change list (`rule_parity.py`, new `benchmark/router/differential.py`, Sync Loop pairs/residency, playbook, plugin copy, guides). (iteration 1)
- Q3 `SKILL.md`/`AGENTS.md`/`README.md` changes (command→tool mapping, `TOOL_MAP`/`RESOURCE_MAP`, tool check, export path, router extraction to `references/router-contract.md`). (iteration 1)
- Q1 residual: confirm whether `audio_extract` or `video_trim` covers audio trim before the change list is written (one spot-check in a later iteration or at implementation time). (iteration 1)
- Q2 integration references (file/Knowledge names, tool-first rewrite with ffmpeg fallback, separate tools reference?). (iteration 1)
- Q4 kernel and Knowledge (ROUTER CODE section, section 2 reduced to pointer, upper-case fleet headings, Knowledge add/rename/drop, delivery protocol for tool runs). (iteration 1)
- Q1 residual: whether `audio_extract` or `video_trim` covers audio trim (one spot-check before the change list is written). (iteration 2)
- Q3 `SKILL.md` / `AGENTS.md` / `README.md`: confirmed coupling to add to Q3 — the skill's `## 2. Smart routing` (lines 73-247) is the mirror of the kernel's section 2, so the pointer sentence, the contract extraction and the heading-case pass must reach both sides in the same change or the drift is invisible. (iteration 2)
- Q2 integration references: the rename target above is this iteration's recommendation, but the tool-first rewrite's file/Knowledge names, and whether the tools catalogue absorbs the integration files' tool tables, are Q2's call. (iteration 2)
- Q5 gates and ranked change list: this iteration adds two entries — the kernel-code ≡ `references/router-contract.md` − comments gate (Prompt Improver's `kernel_parity.py` precedent, since Media Editor's `benchmark/router/` has `route_contract.py`, `fixtures.json`, `run_fixtures.sh`, `README.md` and no differential), and residency rows for the renamed documents and the new catalogue. (iteration 2)
- **Q5 gates and ranked change list:** Q2 adds (a) the residency rows in `systems.py` and `benchmark/parity/run_residency.sh` for the two renames and the catalogue, (b) the `benchmark/gates/README.md` rows keyed on the old filenames at lines 39, 40, 43 and 76, (c) the router contract/fixtures/`route_contract.py` tool-id rebinding, (d) the visual-inspection-free risk from guarded loading that makes a missing pointer silent rather than fatal, and (e) the `description.json`/`graph-metadata.json` spot-check in the plugin copy. (iteration 3)
- **Q4 (answered, with one open tail):** the open tail is the pointer text the kernel uses to name each newly named document, which now has to change for the catalogue, the two renamed references and the HLS version bump in the same pass. (iteration 3)
- **Q3 `SKILL.md` / `AGENTS.md` / `README.md`:** now carrying four Q2-derived additions — the `TOOL_MAP`/`RESOURCE_MAP` rebinding to the renamed files and the new catalogue, the router's tool-binding vocabulary (`"tool": "video-audio"` in the contract shape), whether `assets/hls-video-conversion.md` moves under `references/`, and the `### Escalate if` → upper-case heading pass coupled to the kernel's section 2 in the same change. (iteration 3)
- **Q1 residual (carried):** whether `audio_extract` or `video_trim` covers audio trim — one spot-check before the change list is written. Still unverified after three iterations; it is a one-line fixture check at implementation time. (iteration 3)
- **Q4 tail — pointer text.** The kernel pointer must name each document as it will be called after the renames: the catalogue, the two renamed references, the HLS version bump, and now additionally the router contract, since the kernel's §2 pointer and its `## 7. ROUTER CODE` preamble both cite `references/router-contract.md`. (iteration 4)
- **Q5 tail — whether `differential.py` can execute the Media Editor fence unchanged.** PO's `differential.py` execs the md fence; the Media Editor fence calls `load()`, `media_tools_connected()` and `verify_ffmpeg()`, which are host functions rather than module-level stubs. Whether the extraction must factor those into injectable seams (and therefore whether `route_contract.py` gains a shim) is a gate-design question for iteration 5, not a naming one. (iteration 4)
- **Q2 tail — Knowledge document names.** `claude project/knowledge/` still lists `Media Editor - Integrations - MCP Imagician - v0.211.md` and `... - MCP Video Audio - v0.212.md`, and README §7/§12 publish those names. The content rename is Q2's; the published names and the seven→eight count (F5) are the coupling that Q4's knowledge set and Q5's residency rows must both absorb. (iteration 4)
- **Q5 — gates and the ranked change list.** Now carrying Q3's contributions: the `TOOL_VALUES` enum rebinding in `fixtures.json` (10 fixtures), the new `benchmark/router/differential.py` modelled on Product Owner's, the `rule_parity` blind spot for `RESOURCE_MAP`/`TOOL_MAP`, the `benchmark/gates/README.md` rows keyed on the old filenames (lines 39, 40, 43, 76), residency rows for the renamed documents and the catalogue, the README §8 seven→eight count against the SYNC declaration, the playbook scenarios, the plugin-skill copy rebuild, and both guides. (iteration 4)
- **Implementation-time verifications (not research questions):** whether the catalogue pair raises the tool-check `min_pairs` floor; whether SHL-001 needs a tools-connected state; whether the `description.json`/`graph-metadata.json` schemas hold extra path keys beyond the measured lines; and the packaging test run after the plugin rebuild. (iteration 5)
- **Q4 pointer tail (now fully specified, not open).** The kernel pointer text must name the post-rename documents verbatim: `references/image-operations.md`, `references/video-and-audio-operations.md`, `references/tools.md`, `references/router-contract.md` and HLS `v0.112`; the §2 pointer and the `## 7. ROUTER CODE` preamble both cite the contract, so they change in one pass. (iteration 5)
- **Q2 knowledge-name tail (now fully specified, not open).** Mirrors become `Media Editor - Integrations - Image Operations - v0.213.md`, `Media Editor - Integrations - Video And Audio Operations - v0.213.md`, `Media Editor - Reference - Media Editor Tools - v0.100.md` and `Media Editor - Reference - HLS Video Conversion - v0.112.md`; the seven-to-eight count and the parity declaration absorb them together. (iteration 5)

<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS
**Q2 knowledge-name tail (now fully specified, not open).** Mirrors become `Media Editor - Integrations - Image Operations - v0.213.md`, `Media Editor - Integrations - Video And Audio Operations - v0.213.md`, `Media Editor - Reference - Media Editor Tools - v0.100.md` and `Media Editor - Reference - HLS Video Conversion - v0.112.md`; the seven-to-eight count and the parity declaration absorb them together.

<!-- /ANCHOR:next-focus -->

---

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT
- Prior work: AI Systems/Media Editor/specs/003-media-editor-extension built the server (phases 1-10), integrated it (009), documented it (011) and moved results to media files/export (012)
- Fleet pattern: specs/048-fleet-router-in-kernel moved Copywriter and Product Owner routers into the kernel and removed their Router Contract Knowledge docs; it excluded the Media Editor
- resource-map.md not present; skipping coverage gate

### Bounded Context Snapshot

Populate during initialization when the target is codebase-scoped. Keep this pointer-based and small:

- Source pointers: paths, symbols, or resource-map entries relevant to the topic.
- Reuse candidates: existing utilities, patterns, docs, or agents worth extending.
- Integration points: files or contracts the research is likely to touch.
- Constraints and risks: scope limits, stale graph or memory gaps, and known non-goals.

Do not inline full source bodies. Do not dispatch the retired standalone context loop. Use `@context` for one-shot retrieval, and use this snapshot only to seed the research loop.

---

## 13. RESEARCH BOUNDARIES
- Max iterations: 5
- Convergence threshold: 0.05
- Per-iteration budget: 24 tool calls, 40 minutes
- Progressive synthesis: true (default)
- research/research.md ownership: workflow-owned canonical synthesis output
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred, not runtime-wired)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A, including Section 10A pivot lineage
- Question injection surface: `{spec_folder}/research/inbox.jsonl`
- Question conflict owner: reducer registry; `question_conflict` events surface inbox/registry disagreements for operator decision
- Canonical pause sentinel: `research/.deep-research-pause`
- Capability matrix: `.skilled/skills/system-deep-loop/deep-research/assets/runtime-capabilities.json`
- Capability matrix doc: `.skilled/skills/system-deep-loop/deep-research/references/guides/capability-matrix.md`
- Capability resolver: `.skilled/skills/system-deep-loop/deep-research/scripts/runtime-capabilities.cjs`
- Current generation: 1
- Started: 2026-10-03T14:44:01.000Z
