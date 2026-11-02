# Iteration 4: Skill and Project Transport Split

## Focus

Test a CLI-only skill route against the Claude Project MCP route while preserving the byte-identical shared reference pairs and updating the route contract, parity checks, twin report, Sync Loop declaration, and route-order scenarios.

## Findings

1. The skill and Project currently share one route model, and it is now the wrong model for the fixed split. `SKILL.md` says the tools are first, then local ffmpeg, then advice at `sk-media-editor/SKILL.md:73-103`, and its tool check describes connected Media Editor tools and shell ffmpeg at lines 146-159. The Project kernel says its tools are its only execution surface at `claude project/Custom Instructions.md:157`, then chooses connected tools or advice at lines 192-196. Keep that Project rule on MCP. Change the skill rule to invoke `media-editor` for a covered handler, then hand-written ffmpeg when the operation is not covered or the CLI cannot run, then advice when execution is unavailable. The operation coverage check must be specific enough to keep the fixed gaps on ffmpeg. The tool catalogue lists the handlers at `sk-media-editor/references/tools.md:70-123` and its trim-audio, loudness, and CRF gaps at lines 180-189.

2. The present router contract cannot represent the split. `choose_route()` has only `media_tools_connected()` and `verify_ffmpeg()` and returns `tools`, `ffmpeg`, or `advice` at `sk-media-editor/references/router-contract.md:147-155`. The executable oracle exposes only `route_request(text)` and a route object without host or backend at `benchmark/router/route_contract.py:87-95,215-225`. The differential gate models three host states as `(tools, ffmpeg, expected_route)` and binds those same calls for the extracted skill router at `benchmark/router/differential.py:97-104,314-343`. Give the contract a surface and operation capability input. The skill profile should resolve the requested handler through the CLI first, then permit ffmpeg, then advice. The Project profile should resolve MCP tools when connected and otherwise advise, because the Project cannot execute terminal ffmpeg (`claude project/Custom Instructions.md:157,192-196`). A mode-wide `image_*` or `audio_*` capability is insufficient for operations with no handler.

3. The transport split can preserve the current mirror invariant, but only if the shared setup reference remains dual-surface. I compared the current bytes for `references/tools.md`, `references/setup.md`, and `references/interactive-intelligence.md` against their three Project knowledge twins. All three comparisons returned `True`. `SYNC.md` requires name-matched skill and Project references and says to keep decision rules, outputs, and examples while dropping skill-only loading and routing details at `SYNC.md:8-13`. The Sync Loop declares these as pairs among seven at `AI Systems/z - Claude Project Sync Loop/systems.py:1252-1265`. Keep `tools.md` as the transport-neutral catalogue of handler names, arguments, results, and gaps, with invocation and startup flags out of that pair. Add a skill-only `references/cli.md` for CLI location, commands, JSON argument sources, exit behavior, and preview paths. Keep `setup.md` paired and byte-identical, but divide its instructions into explicit Claude Desktop MCP, Claude Code CLI, and other-terminal ffmpeg sections. This passes the mirror constraint because the existing setup already contains distinct Desktop and plugin sections at `sk-media-editor/references/setup.md:65-90,115-142`. A setup file that is CLI-only on the skill side and MCP-only on the Project side would fail the declared pair invariant. The `interactive-intelligence.md` pair should retain the shared question and confirmation behavior while naming the correct surface for each host.

4. The shared interactive reference also carries transport assumptions that need a surface-aware rewrite. It says to check connected tools and otherwise verify ffmpeg at `sk-media-editor/references/interactive-intelligence.md:43-67`, then calls the connected route a tool check at lines 73-82. Its current name and flow are still useful as paired content, but the skill-side route must describe the CLI and the Project-side route must describe MCP. Since the Project mirror is intentionally identical, express both host-specific routes in both paired copies or move only the route-specific wording into unpaired host documents. Do not leave a skill-only route sentence in the paired source.

5. The parity gate needs to distinguish shared conversation rules from each host's route contract. `rule_parity.py` compares phrase counts within every declared pair and has minimum pair counts for route order, clarification, and export rules at `benchmark/gates/rule_parity.py:14-24,71-117`. Its current route-order rule is a single tools-then-ffmpeg-then-advice family with `min_pairs: 5` at lines 72-95. Recalculate those phrase counts from the revised documents. Add an explicit source-only check for `references/cli.md` and required skill CLI route language, because an unpaired skill file is invisible to the pair loop at lines 245-265. Keep paired Project rules checking MCP-first behavior and shared naming and placement decisions. Reject preserving the old five-pair count unchanged because the route clauses now have different meanings by host.

6. The twin report's documentation overstates what its implementation compares. Its module comment says twins agree on mode, tool, and whether a file was produced at `benchmark/grader/twin_divergence.py:10-18`, but the comparator reads only `result` and compares verdict equality at lines 155-163. Add explicit surface metadata and normalized handler identity to the scenario result schema. For a skill twin, expected surface is CLI. For a Project twin, expected surface is MCP or advice. Compare the canonical handler and user-visible success semantics where both surfaces execute, and report the route difference as intentional. Keep pass/fail equality as one field rather than treating it as proof of route parity. Retain hand-declared pairs because the scenario IDs intentionally differ across skill and Project at lines 20-31 and 83-95.

7. The existing skill connected-tools scenario directly contradicts the no-MCP plugin decision. `SRO-001` says the Claude Code plugin connects Media Editor tools and forbids shell ffmpeg at `sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md:3,15,25-30`. Its setup and triage require `mcp list` to show the plugin server connected at lines 51 and 70-72. Rewrite it to prove the CLI executable runs the selected handler through the plugin, and that the plugin manifest exposes no MCP server. The Project twin `PRO-001` correctly installs the Desktop extension and expects `image_probe`, `media_health`, and `image_resize` MCP calls at `sk-media-editor/manual-testing-playbook/project-route-order/connected-tools-in-desktop.md:15,25-32,51-57`, so keep that scenario on MCP. Rewrite `SRO-002` to establish the CLI is unavailable while ffmpeg is available, rather than treating “no plugin” as equivalent to “no CLI,” since a standalone CLI can be installed separately (`skill-route-order/fallback-to-local-ffmpeg.md:15,25-30,51-57`).

8. The Sync Loop declaration already separates the shared pairs from the skill-only router. Its seven `pairs` are at `AI Systems/z - Claude Project Sync Loop/systems.py:1252-1265`, and it explicitly leaves `references/router-contract.md` unpaired because the Project kernel carries the code projection at lines 1272-1275. Preserve that shape. Add the new CLI reference as skill-only and update the existing residency rows that describe the route, the Project tool boundary, and the Project's copied router at lines 1290-1292, 1314-1315, 1360-1362, 1368-1370, and 1679-1682. Keep the Project kernel's route code fixed to its MCP host. Do not route the Project through the CLI reference.

## Tested Proposal

The current three byte comparisons passed. A mirror-safe design therefore exists: keep `tools.md`, `setup.md`, and `interactive-intelligence.md` as paired files with byte-identical, transport-aware content, add `cli.md` only under the skill, and leave the router contract unpaired as today. This is a structural compatibility check against current pair declarations and bytes, not a behavioral test of a CLI that does not yet exist. The route oracle and differential gate need new host profiles before that behavior can be tested.

## Rejected Options

- Make the paired `setup.md` CLI-only in the skill and MCP-only in the Project. Rejected because it breaks the current declared byte-identical setup pair (`SYNC.md:10-13`, `systems.py:1259-1261`).
- Keep one global tools-then-ffmpeg route contract for both systems. Rejected because the Project cannot execute shell ffmpeg and the skill's fixed route begins with the CLI (`Custom Instructions.md:157,192-196`, `SKILL.md:77,101`).
- Keep `SRO-001` as an MCP-connected plugin test. Rejected because the fixed Claude Code plugin registers no MCP server, while the Desktop Project remains MCP (`connected-tools-first.md:3,51`, `project-route-order/connected-tools-in-desktop.md:15,51`).
- Treat matching PASS verdicts as proof the two surfaces used equivalent routes. Rejected because the twin implementation compares only the verdict field (`twin_divergence.py:155-163`).

## Sources Consulted

- `steer.md:1-22`
- `AI Systems/Media Editor/SYNC.md:8-13,37`
- `AI Systems/Media Editor/sk-media-editor/SKILL.md:73-103,146-159`
- `AI Systems/Media Editor/sk-media-editor/references/tools.md:18-23,31-47,70-123,180-189`
- `AI Systems/Media Editor/sk-media-editor/references/setup.md:31-61,65-90,115-158`
- `AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md:35-82`
- `AI Systems/Media Editor/sk-media-editor/references/router-contract.md:33-41,147-181`
- `AI Systems/Media Editor/claude project/Custom Instructions.md:143-149,157-177,181-196`
- `AI Systems/z - Claude Project Sync Loop/systems.py:1248-1275,1280-1419,1679-1682`
- `AI Systems/Media Editor/benchmark/router/route_contract.py:60-95,118-125,215-225`
- `AI Systems/Media Editor/benchmark/router/differential.py:97-104,314-343,398-433`
- `AI Systems/Media Editor/benchmark/gates/rule_parity.py:14-40,59-117,245-265`
- `AI Systems/Media Editor/benchmark/grader/twin_divergence.py:6-31,83-103,143-163`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md:3,15,25-32,51,70-72`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md:15,25-30,51-57`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/project-route-order/connected-tools-in-desktop.md:15,25-32,51-57`


## Assessment

- newInfoRatio: 0.94
- Novelty justification: This pass found the single-host route assumption, verified three paired references byte-for-byte, and identified the connected-plugin playbook mismatch.
- Confidence: High for present files and mirror bytes. Medium for the unimplemented host-aware benchmark proposal.

## Reflection

- What worked: Comparing the current shared references and tracing the extracted router to its host-state gate.
- What failed: The current differential gate cannot express separate CLI skill and MCP Project routes.
- Ruled out: A global route order and an MCP-connected Claude Code plugin.

## Recommended Next Focus

Iteration 5: batch naming, placement, maximum byte targets, server guard tradeoffs, and the ranked implementation plan.
