---
title: "Deep Research: Media Editor CLI runtime, skill and Project split, naming hardening"
description: "Merged synthesis of two five-iteration lineages, DeepSeek V4.1 Flash max and GPT-6 Luna max, on a media-editor CLI over the 40 Media Editor tool handlers, its distribution, the CLI-only skill beside an MCP Project, and the batch naming and placement gate. Each lineage disagreement is adjudicated against the code, and the synthesis ends in a ranked, file-pathed change list for phases 002 to 005."
trigger_phrases:
  - "media editor cli research"
  - "media editor cli ranked change list"
  - "media editor batch naming research"
importance_tier: "important"
contextType: "research"
---
# Deep Research: Media Editor CLI runtime, skill and Project split, naming hardening

**Packet**: `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research`
**Run**: fan-out `1791117729260-kpn1og`, two lineages, concurrency 2, stop policy `max-iterations`
**Lineages**: `deepseek` (cli-pi, `opencode-go/deepseek-v4.1-flash`, thinking max, 5 iterations) and `luna` (cli-codex, `gpt-6-luna`, reasoning max, fast tier, live web search, 5 iterations)
**Synthesis**: the depth-1 orchestrator, with every load-bearing claim spot-checked against `AI Systems/Media Editor/` (section 17)

All Media Editor paths below use the folder's current name, `mcp server/`, relative to `AI Systems/Media Editor/`. After phase 002 they live under `runtime/`. Line numbers are pinned to Media Editor commit `2749c54`, the baseline in `../scratch/baseline.md`, and that repository had no uncommitted change during the run.

---

## 1. EXECUTIVE OVERVIEW

The two lineages agree on the core. A `media-editor` CLI is a second transport over the same `ALL_TOOLS` array (`mcp server/src/server/all-tools.ts:57-98`, 40 entries), reached through a dispatch function lifted out of the MCP registration (`mcp server/src/server/tool-registry.ts:102-127`), from its own entry file because `mcp server/src/index.ts:126` runs `void main()` on import. Tool arguments never reach `loadConfig`, because every bare argv token becomes an allowed root (`mcp server/src/core/config.ts:168-175`). Output is the `structuredContent` JSON on stdout, the probe preview becomes a written file instead of base64 (`mcp server/src/tools/media/preview.ts:38-45`), and the per-process capability and resolver caches (`mcp server/src/core/capabilities.ts:163`, `mcp server/src/core/ffmpeg-resolver.ts:446-485`) persist under the data folder. Neither lineage wants a daemon or a server guard.

They disagree on six points, each adjudicated in section 5. The two that matter most for the operator:

- **Install route.** Both lineages lean to an inline `${CLAUDE_PLUGIN_ROOT}` path in the skill. The official reference supports both routes and gives each a cost (section 8), so this stays an operator choice. My recommendation is a plugin `bin/media-editor` shim, for one bare command shared with the standalone install, unless the operator wants the plugin eligible for claude.ai and Cowork.
- **Batch placement.** DeepSeek proposes a find-or-create folder by slug, Luna a multi-input `image_convert`. Both have a real cost (section 10). My recommendation is a third shape: target an existing numbered folder by its exact name, validated as a direct child of the export root, which fixes every writing tool at the one allocation point.

Two findings neither lineage stated, both from the orchestrator's checks: removing `mcpServers` from `plugin.json` also removes the three values it hands the server today (allowed root, output folder and data folder, `mcp server/claude-plugin/.claude-plugin/plugin.json:10-22`), so the CLI adapter must supply defaults. And returning argument errors as results changes MCP behaviour unless the MCP adapter keeps throwing `McpError`, which phase 004's scope forbids changing.

---

## 2. BACKGROUND & CONTEXT

The Media Editor runtime under `mcp server/` serves 40 handlers over MCP to a Claude Desktop extension and to a Claude Code plugin whose manifest registers it as `media-editor` (`plugin.json:10-22`). The skill `sk-media-editor/` routes tools, then ffmpeg, then advice (`sk-media-editor/SKILL.md:77`, `sk-media-editor/references/router-contract.md:147-155`). The Claude Project kernel carries the same router code minus comments (`claude project/Custom Instructions.md:354-358`), held equal by `benchmark/router/differential.py:171`.

The live bug: a Desktop Project converted four PNGs to WebP without asking about names or a folder, passed `subfolder: true` only on the first of four `image_convert` calls, and split the results across `001 - webp-under-100kb/` and the export root. The kernel's folder rule is per call (`Custom Instructions.md:149`), its only hard wait is one name (`:194`) or ambiguity (`:181`), the field text calls an omitted name normal (`mcp server/src/server/field-schemas.ts:62-80`), and `allocateOutputFolder` always creates the next number (`mcp server/src/core/output-folder.ts:301-341`).

Fixed decisions, not reopened: the plugin ships the skill and the CLI with no MCP server, the Project stays on MCP, the skill route order is CLI, then ffmpeg, then advice, and no new tools for audio trim, loudness or CRF.

---

## 3. RESEARCH QUESTIONS

1. CLI core: transport-neutral dispatch, argument errors, a separate entry, config isolation, exit codes and signal cleanup.
2. CLI surface and output: `list`, `describe`, `<tool>`, argument sources, stdout JSON, preview files, startup cost and caches.
3. Distribution: how the skill finds the CLI in Claude Code, platform bundles, a standalone install and the dist layout.
4. Skill and Project split: mirror pairs, a skill-only `cli.md`, the `setup.md` split, the Sync Loop declaration, and the router gates.
5. Naming and placement hardening, `maxBytes`, a server guard, playbook scenarios, and the ranked change list.

All five were answered by both lineages (section 16).

---

## 4. METHODOLOGY

The run followed `.skilled/commands/deep/research.md` with `deep-research-auto.yaml`, through `fanout-run.cjs` with both executors in one fan-out config. Each lineage ran its five iterations from one shared brief (`research/dispatch-prompt.md`), one focus per iteration, reading `mcp server/src`, the skill, the kernel, the benchmarks and the Sync Loop declaration. Luna had live web search and fetched the official Claude Code docs. DeepSeek fetched the same pages through its shell.

A lead-review channel, `lineages/<label>/steer.md`, told each lineage to write route-proof fields into every state record. Luna followed it. DeepSeek's first attempt wrote state records without route proof and with invented future timestamps, so it was redispatched once under the workflow's route-proof redispatch rule, after Luna finished. Attempt 1 is archived at `research/_attempts/deepseek-attempt-1/`. Every one of the 10 kept iterations passes `verify-iteration.cjs` (narrative, route proof and delta).

Merge used `fanout-merge.cjs`, the resource map `reduce-state.cjs --emit-resource-map --fanout-resource-map-only`. The orchestrator then read both lineage syntheses and checked 35 claims against the source (section 17).

---

## 5. KEY FINDINGS AND LINEAGE DISAGREEMENTS

### 5.1 Where both lineages agree (confirmed against code)

| Finding | Evidence |
|---|---|
| Reuse `ALL_TOOLS`, never a second registry | `mcp server/src/server/all-tools.ts:57-98` (40 entries counted) |
| The CLI needs its own entry file | `mcp server/src/index.ts:126` (`void main()`) |
| CLI argv must never reach `loadConfig` | `mcp server/src/core/config.ts:168-175` |
| Preview leaves stdout as a written file | `mcp server/src/tools/media/preview.ts:38-45,119-124` |
| Persist capability and resolver caches under the data folder | `mcp server/src/core/capabilities.ts:163`, `mcp server/src/core/ffmpeg-resolver.ts:446-485` |
| Reap ffmpeg children and temp folders on signals | `mcp server/src/core/process-runner.ts:471-477,695-701` |
| Keep the dist layout, two reads are relative | `mcp server/src/server/server-info.ts:42`, `mcp server/src/core/font-path.ts:51` |
| `dist/cli.js` rides the existing bundle | `mcp server/scripts/build-bundle.ts:76` stages `dist` whole |
| `tools.md` stays transport-neutral and mirrored, a new `cli.md` is skill-only | Sync Loop `systems.py:1252-1265` pairs |
| The Project keeps MCP then advice | `claude project/Custom Instructions.md:157,192-196` |
| The gate is an ALWAYS rule before the first writing call, not an ESCALATE | `Custom Instructions.md:165,181,194` |
| No server guard | `mcp server/src/server/tool-registry.ts:102-127` receives tool arguments only |
| No silent downscale for a size cap | `mcp server/src/tools/image/convert.ts:142-166` |

### 5.2 Disagreements and adjudication

| # | Topic | DeepSeek | Luna | Adjudication against the code |
|---|---|---|---|---|
| D1 | Install route | Attempt 1 rejected `bin/`. Attempt 2: inline `${CLAUDE_PLUGIN_ROOT}`, `bin/` only a human convenience | Inline `${CLAUDE_PLUGIN_ROOT}`, keep `bin/` as convenience, omits the claude.ai and Cowork cost | Open operator choice, section 8 and 12. Both routes are documented. Recommend `bin/` |
| D2 | Batch placement | `subfolderName` find-or-create by slug, every tool | Multi-input `image_convert`, no existing-folder targeting yet | Both carry a cost the lineages understate. Recommend targeting an existing numbered folder by exact name, section 10 |
| D3 | `maxBytes` | Worth it as its own change, never a hard guarantee, or report achieved `bytes` | Add it in the hardening phase with a bounded quality search and a structured failure | Both agree on the outcome rules, they differ on timing. Recommend a separate task in 003 after the gate, lossy formats only |
| D4 | `choose_route` | One function gains `media_cli_available()` first, a `cli` route value, the Project binds it false | Make `router-contract.md` and `route_contract.py` surface-aware with host profiles | DeepSeek is right on the mechanism: `route` is not in `ROUTE_FIELDS` (`benchmark/router/route_contract.py:87-89`), so `route_contract.py` needs no change. But its summary order "CLI, tools, ffmpeg, advice" breaks the fixed skill order, so the skill must bind `media_tools_connected()` false |
| D5 | Argument errors | Return `errorResult` with `INVALID_INPUT` instead of throwing `McpError` | Return validation failures as ordinary results on the CLI | Luna's scoping is right. Dispatch returns a typed outcome, the MCP adapter still throws `McpError(InvalidParams)` as at `tool-registry.ts:109`, the CLI prints a result. Phase 004 must leave MCP behaviour unchanged |
| D6 | Dispatch module and result type | New `src/server/dispatch.ts` plus a local `ToolResult` in `src/server/tool-result.ts` replacing `CallToolResult` | Extract `dispatchToolCall` from the MCP adapter | `mcp server/src/core/result.ts` imports `CallToolResult` as a type only, erased at runtime, so no SDK value leaks into the CLI. Recommend `src/server/dispatch.ts` and skip the result-type churn across 40 handlers |
| D7 | Exit codes | Attempt 1: 0, 1, 2, 3. Attempt 2: failures on stdout with exit 1, signals 130 and 143 | Exit codes unspecified | Recommend 0 success, 1 tool error result, 2 usage error (unknown tool, bad JSON, invalid arguments), 130 and 143 on signals. JSON on stdout for 0, 1 and 2, diagnostics on stderr |
| D8 | `setup.md` | Keep mirrored, surface sections | Keep mirrored, surface sections | Both reject the plan's split by surface. Deviation from the phase 001 brief, flagged for the operator in section 12 |
| D9 | Playbook placement of the batch scenarios | `project-ambiguity-intake/` and `skill-ambiguity-intake/`, paired in `twin_divergence.py` | `skill-export-delivery/` and `project-route-order/` | Recommend DeepSeek's ambiguity-intake pair: both categories exist on both sides and already hold a twin, `SAI-001` and `PAI-001` (`benchmark/grader/twin_divergence.py:90`) |
| D10 | The "CLI runtime" wording | Rename to "the Claude Code skill", 2 files named | Not raised | Confirmed and wider: 23 Markdown files outside changelogs use the phrase. Fold into phase 005, when the CLI lands |

### 5.3 Findings added or sharpened by the orchestrator

- **The plugin manifest feeds the server three values.** `plugin.json:10-22` passes `${CLAUDE_PROJECT_DIR}` as the allowed root, `${CLAUDE_PROJECT_DIR}/media files/export` as the output folder and `MEDIA_EDITOR_DATA_DIR=${CLAUDE_PLUGIN_DATA}`. With `mcpServers` gone nothing sets them, and the Bash tool environment carries none of these variables (plugins-reference, "The variables aren't present in the environment of commands Claude runs through the Bash tool"). Without an output folder, `allocateOutputFolder` throws `missingOutputFolder(tool, 'unset')` (`mcp server/src/core/output-folder.ts:306-308`). The CLI adapter needs defaults: the working folder as allowed root and `<cwd>/media files/export` as output, with the data folder falling back to `defaultDataDir` (`mcp server/src/core/config.ts:331,375`).
- **The kernel's folder rule is per call, not per request.** `Custom Instructions.md:149` puts "several files from one call" into one folder. The four PNGs were four calls, so no written rule covered the batch. DeepSeek's "the rule existed and was bypassed" is half right.
- **Unknown argument keys are dropped silently** on both transports today. DeepSeek found this and the orchestrator reproduced it (zod 4.6.5 strips them, run in the package). On the CLI a mistyped key silently changes the operation, so the CLI should reject keys outside the schema before dispatch. MCP stays as is in 004.

---

## 6. FINDINGS: Q1 CLI CORE

- `dispatchToolCall` parses with the tool's schema, splits placement through `withPlacement` (`mcp server/src/server/tool-registry.ts:118-122`, `mcp server/src/server/tool-context.ts:308-323`), and maps a handler throw to `errorResult` (`tool-registry.ts:125`). Only the parse failure at `:109` and the unknown-tool path at `:194-205` raise protocol errors. Extract parse, placement and dispatch into `src/server/dispatch.ts` returning a typed outcome, and keep the `McpError` mapping in the MCP adapter (D5, D6).
- **Config cases, run against the built `loadConfig`.** Empty argv and no environment gives no allowed root and no output folder, so every tool would fail. A bare path token becomes an allowed root and, because the output folder falls back to the first root (`mcp server/src/core/config.ts:282`), silently becomes the output folder too, while a bare tool name is ignored with a warning. `--allowed-dir` and `--output-dir` behave as written. An input outside every root is rejected as `outside-root` (`mcp server/src/core/path-guard.ts:348-376`). The CLI adapter therefore builds `--allowed-dir <cwd>` and `--output-dir <cwd>/media files/export` itself and passes no tool argument through.
- `createServer` builds one `createToolContext(config)` and registers `ALL_TOOLS` (`mcp server/src/server/create-server.ts:43-56`). The CLI builds the same context per process.
- `loadConfig(env, argv)` is pure, so the CLI adapter can call it with an empty argv plus `--allowed-dir` and `--output-dir` tokens it builds itself. Unknown flags only warn and swallow their value (`config.ts:176-188`).
- Shutdown in `index.ts` exits 0 after `server.close()` (`mcp server/src/index.ts:60-67`). `runProcess` kills a child only on its own timeout (`process-runner.ts:471-477`) and `withTempDir` cleans up only in `finally` (`:695-701`). A live-child and temp registry with an exported terminate lets SIGINT and SIGTERM reap both, then exit 130 or 143.

## 7. FINDINGS: Q2 CLI SURFACE AND OUTPUT

- Commands: `list`, `describe <tool>`, `<tool>`. `describe` uses `z.toJSONSchema`, present in the installed zod 4.6.5. Arguments from exactly one of `--json '<object>'`, `--args-file <path>` or stdin.
- stdout carries the `structuredContent` object only. A failure result also goes to stdout with exit 1, so `| jq .code` works on both outcomes (DeepSeek). The `CallToolResult` text block goes to stderr or is dropped.
- Preview: `previewFrom` returns base64 `ImageContent` (`preview.ts:38-45`) attached by `withPreviewBlock` (`:119-124`). On the CLI, write a JPEG beside the output and return its path. MCP keeps the image block.
- Startup: importing `dist/server/all-tools.js` took 0.25 s cold and 0.10 s warm on this machine, against 0.02 s for bare `node` (orchestrator's run). DeepSeek measured 0.21 s with sharp most of it. No daemon. A build-time `dist/tools.json` for `list` and `describe` is optional, measure first.
- Caches: persist capability and resolver results under `<dataDir>/cache/`, validated by size and mtime, advisory so a corrupt cache never skips a real check. `media_setup_ffmpeg` and `media_health` already share the configured data folder.

## 8. FINDINGS: Q3 DISTRIBUTION

Official docs, fetched 2026-10-04 from https://code.claude.com/docs/en/plugins-reference:

- `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` resolve "Anywhere in the Markdown body" of skill, command and agent content (line 575 of the fetched page).
- "The variables aren't present in the environment of commands Claude runs through the Bash tool" (line 577).
- `bin/`: "Files here are on the Bash tool's `PATH` while the plugin is enabled ... claude.ai and Cowork don't install a plugin that has this directory" (line 626). The same row links org-sync guidance to keep executables out of a top-level `bin/`.
- `${CLAUDE_PLUGIN_DATA}` is `~/.claude/plugins/data/<id>/` and survives updates (line 557).

Supporting pages: https://code.claude.com/docs/en/skills and https://code.claude.com/docs/en/plugins.

**The install route is an operator choice.**

| Route | For | Against |
|---|---|---|
| A. Plugin `bin/media-editor` shim | One bare `media-editor` command in the plugin and in a standalone `npm link` or package install, so `cli.md` states one invocation for every surface the skill runs on. The repo copy of the skill, used directly by CLI agents through `AGENTS.md`, cannot use `${CLAUDE_PLUGIN_ROOT}` at all | claude.ai and Cowork do not install the plugin. The shim must find its own folder because the variables are absent in Bash, and cannot learn `${CLAUDE_PLUGIN_DATA}`, so it uses the platform default data folder |
| B. Inline `node "${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js"` in skill Markdown | Keeps the plugin eligible everywhere. Can pass `MEDIA_EDITOR_DATA_DIR="${CLAUDE_PLUGIN_DATA}"` inline | Two invocations in one skill source, plugin and standalone, because the substitution happens only when the plugin loads the skill. Whether a Node CLI with native sharp runs inside Cowork is UNKNOWN |

Recommendation: A, because the plugin targets Claude Code and the Project already covers claude.ai over MCP. Choose B if the operator distributes the plugin to claude.ai organisations or Cowork. Either way the CLI ships at `server/dist/cli.js` and `package.json` gains a `bin` entry for the standalone install.

Platform payload: the per-platform bundle already carries sharp and the pinned ffmpeg (`mcp server/scripts/build-bundle.ts:68-76`), and `build-plugin.ts` unpacks it into `claude-plugin/server` and checks `dist/index.js` (`mcp server/scripts/build-plugin.ts:303-336`). Add a `dist/cli.js` presence check beside it.

## 9. FINDINGS: Q4 SKILL AND PROJECT SPLIT

- Mirror pairs: the Sync Loop declares seven pairs (`systems.py:1252-1265`) and `router-contract.md` as unmirrored (`:1271-1276`). The tools, setup and interactive-intelligence pairs are byte-identical today (checked with `cmp`). `cli.md` joins `unmirrored_sources`.
- `cli.md` is ON_DEMAND only and must stay out of `RESOURCE_MAP` and `ALWAYS` (`sk-media-editor/references/router-contract.md:71,101`), because `differential.py:341-343` compares the skill's resource list with the contract's.
- `choose_route` (`router-contract.md:147-155`) gains `media_cli_available()` as its first predicate and a `cli` route value. The skill binds `media_tools_connected()` false, the Project binds `media_cli_available()` and `verify_ffmpeg()` false in its prose as it already does for ffmpeg (`Custom Instructions.md:96`). The kernel's Router Code copy (`:354-358`) changes with it, kept equal by the copy-parity check (`differential.py:171`).
- `differential.py`: `HOST_STATES` (`:100-104`) is a three-field tuple and `bind_host` (`:314-317`) binds two predicates. Both widen by one. `route_contract.py` is unchanged (D4).
- `rule_parity.py`: the route-order rule needs five pairs and five phrases with the tools-first clause (`benchmark/gates/rule_parity.py:71-95`). Re-measure after the rewording. A phrase carried only by the unpaired `cli.md` counts zero pairs.
- `twin_divergence.py`: keep `SRO-001` and `PRO-001` paired on deliverable outcome (`:93`) and keep route assertions in the unpaired ids where `SRO-002` sits (`:100-104`).
- **Consumer inventory of the route order** (grep for `choose_route`, `HOST_STATES`, `media_tools_connected`, `verify_ffmpeg`, "tools when they are connected" and `connected-tools-first`): `benchmark/gates/rule_parity.py`, `benchmark/router/differential.py`, `benchmark/router/README.md`, `sk-media-editor/references/router-contract.md`, `sk-media-editor/SKILL.md`, `sk-media-editor/README.md`, `AGENTS.md`, `sk-media-editor/references/interactive-intelligence.md` and `sk-media-editor/references/media-framework.md` with their Project mirrors, `sk-media-editor/manual-testing-playbook/manual-testing-playbook.md`, `skill-route-order/connected-tools-first.md`, `claude project/README.md`, `claude project/Custom Instructions.md`, the derived `sk-media-editor/leaf-manifest.json` and `leaf-aliases.json`, and the Sync Loop's `systems.py`, whose residency statements quote kernel route wording verbatim (`systems.py:1290,1314,1376,1419`, the last one with "runs only in the CLI runtime").

## 10. FINDINGS: Q5 NAMING AND PLACEMENT HARDENING

- **Gate wording.** One question before the first writing call, listing every proposed name and, for two or more inputs in one request, the export-root versus one-numbered-folder choice. Even when the request is clear. Kernel: extend ALWAYS 9 (`Custom Instructions.md:165`), Strict Sequence step 3 (`:194`), and make the export paragraph per request (`:149`). `:145` keeps `media_rename` for later renames only, which the tool supports within one folder (`mcp server/src/tools/media/rename.ts:138-169`).
- **Batch template.** Beside the output-preferences block of `sk-media-editor/references/interactive-intelligence.md:109-113`, and change the folder rule at `:116`, which asks about a folder only when one operation writes several files. Mirror byte for byte.
- **Field text.** `fileNameField` and `subfolderField` (`field-schemas.ts:62-80`) say an omitted value is normal. Rewrite to say the caller asks first and every call in one request passes the same placement. Same for `image_convert`'s description (`convert.ts:136-141`).
- **Same-class inventory.** The omission-as-normal text exists in one place only, `field-schemas.ts:67` and `:78`, and reaches every writing tool because `tool-registry.ts:97-98` attaches both fields centrally. Separately, 28 tool files under `mcp server/src/tools/` describe "a numbered folder on request" (42 mentions of "numbered folder" in 32 files). That wording is accurate and is not the defect, so it is reviewed, not rewritten.
- **Batch test matrix.** Four axes of two values: surface (Project over MCP, skill over the CLI), placement (export root, one numbered folder), tool mix (uniform `image_convert`, mixed tools), names (user-given, proposed). 16 rows. The playbook carries the two surface rows over the observed four-PNG prompt, and the runtime tests carry the placement and tool-mix rows.
- **Placement options, with their real cost.**
  - Multi-input `image_convert` (Luna). Folder choice is already per call: `writeImageOutputs` passes `'many'` when `request.plans.length > 1` (`mcp server/src/tools/image/sharp-output.ts:493-497`) and `wantsFolder` returns true for `many` (`tool-context.ts:290-295`). But `ImageOutputRequest` carries one `input`, and `context.placement?.fileName` (`sharp-output.ts:498`) is one name applied to every plan. Multi-input needs a per-plan input, a per-plan file name, and an `inputPaths` and `fileNames` pair aligned in the schema. It covers one tool and only a uniform batch.
  - `subfolderName` find-or-create by slug (DeepSeek). It fixes every tool at the allocation point. But folders are `NNN - slug` (`output-folder.ts:327`), so a slug can match several earlier folders, or an unrelated folder from an earlier session.
  - Target an existing numbered folder by exact name (recommended). The first call allocates as today and returns its folder. Later calls pass `targetFolder: "014 - webp under 100kb"`, accepted only when it exists as a direct child of the real export root, carries no path separator and matches `NNN - slug`. Folders are allocated at only two sites, `sharp-output.ts:496` and `mcp server/src/tools/video/copy-then-encode.ts:297`, both through `context.allocateOutputFolder` (`tool-context.ts:312,405`), so one change covers every writing tool and mixed batches. Both lineages rejected an arbitrary path, and this is not one.
- **`maxBytes`.** The schema has `format` and `quality` and no byte target (`convert.ts:142-166`). Add an integer byte count for jpeg, webp and avif, search quality at fixed dimensions, and on a miss return a structured failure with the smallest size reached and publish nothing. PNG quality is a palette target (`convert.ts:137-139`), so leave it out until tested. Results already report `bytes` (`mcp server/src/core/result.ts:45-46`).
- **Server guard.** Rejected by both lineages and by me. A boolean cannot prove a person confirmed anything, because the handler sees tool arguments only (`tool-registry.ts:102-127`).
- **Playbook.** Two twin scenarios over the same four-file prompt, one per surface (D9), an index row, and a twin entry.

---

## 11. RECOMMENDATIONS: RANKED CHANGE LIST FOR PHASES 002 TO 005

Paths are relative to `AI Systems/Media Editor/`. The Sync Loop's `systems.py` sits in the Sync Loop folder beside the systems (find it with `find "AI Systems" -maxdepth 2 -name systems.py`). Rank is execution order within each phase.

### Phase 002: rename `mcp server/` to `runtime/`

43 tracked files mention the folder name. The 11 copies under `mcp server/claude-plugin/skills/` are git-ignored build output (`mcp server/.gitignore:10`) and regenerate. The three changelogs under `sk-media-editor/changelog/` stay as history.

1. Move the folder `mcp server/` to `runtime/`, contents unchanged, inner layout kept (`build-bundle.ts:76`, `font-path.ts:51`).
2. System docs: `AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `SYNC.md` (live references plus one new dated entry, dated lines untouched).
3. Skill: `sk-media-editor/SKILL.md`, `sk-media-editor/README.md`, `sk-media-editor/references/setup.md`, `sk-media-editor/references/tools.md`.
4. Mirrors, kept byte-identical with step 3: `claude project/knowledge/Media Editor - Reference - Setup.md`, `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md`. Two Knowledge re-uploads for the operator.
5. Playbook: `sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md`, `skill-route-order/connected-tools-first.md`, `skill-tool-verification/consent-before-ffmpeg-download.md`, `skill-tool-verification/error-code-handoff.md`.
6. Inside the folder: `runtime/ARCHITECTURE.md`, `runtime/README.md`, `runtime/claude-plugin/README.md`, `runtime/scripts/README.md`, `runtime/scripts/bundle/README.md`, `runtime/src/README.md`, `runtime/src/core/README.md`, `runtime/src/server/README.md`, `runtime/src/types/README.md`, `runtime/src/tools/README.md` and its `audio/`, `image/`, `media/`, `video/` READMEs, `runtime/tests/README.md` and its `core/`, `helpers/`, `packaging/`, `server/`, `tools/` READMEs, plus `runtime/tests/tools/` `audio/`, `composition/`, `image/`, `media/`, `video/` READMEs.
7. Check: no live `mcp server` mention remains outside changelogs and ignored build output, both builds pass from `runtime/`.

Finding classes: items 1, 2, 3, 5, 6 `instance-only` (mechanical rename), item 4 `cross-consumer` (mirror pairs and Knowledge uploads), item 7 `matrix/evidence`.

### Phase 003: naming and placement hardening

1. `claude project/Custom Instructions.md`: ALWAYS gate before the first writing call with names and batch folder choice (`:165`), Strict Sequence step 3 (`:194`), per-request folder paragraph (`:149`), version bump.
2. `AGENTS.md` and `sk-media-editor/SKILL.md`: the same gate for the skill.
3. `sk-media-editor/references/interactive-intelligence.md` batch template and folder rule (`:109-116`), mirrored into `claude project/knowledge/Media Editor - System - Interactive Intelligence.md`. One Knowledge re-upload.
4. `mcp server/src/server/field-schemas.ts` (`:62-80` text, new `targetFolder` field), `mcp server/src/tools/image/convert.ts` (`:136-141` text).
5. Placement: `mcp server/src/server/tool-context.ts` (placement type `:83-86`, `wantsFolder` `:290-295`, allocation `:312,405`), `mcp server/src/core/output-folder.ts` (resolve an existing numbered child), `mcp server/src/server/tool-registry.ts` (placement split `:118-122`), `mcp server/src/core/errors.ts` (unknown or invalid target folder code). Tests: `mcp server/tests/core/output-folder.vitest.ts`, `mcp server/tests/server/tool-context.vitest.ts`, `mcp server/tests/server/registry.vitest.ts`.
6. If chosen, `maxBytes`: `mcp server/src/tools/image/convert.ts`, `mcp server/src/tools/image/sharp-output.ts`, `mcp server/src/core/errors.ts`, `mcp server/tests/tools/image/convert.vitest.ts`, `sk-media-editor/references/tools.md` and its Project mirror.
7. If chosen, multi-input `image_convert`: `convert.ts` schema, `sharp-output.ts` per-plan input and file name (`:493-498`), `field-schemas.ts` `fileNames`, `mcp server/tests/tools/image/convert.vitest.ts`.
8. Playbook: `sk-media-editor/manual-testing-playbook/project-ambiguity-intake/batch-names-and-folder.md` (new), `sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/batch-names-and-folder.md` (new), `manual-testing-playbook.md` index, `benchmark/grader/twin_divergence.py` `TWIN_PAIRS` (`:87-95`). Regenerate `sk-media-editor/leaf-manifest.json` and `leaf-aliases.json` for the two new leaves.
9. `SYNC.md` dated entry, and the Sync Loop's `systems.py` residency statements for every kernel section the gate wording changes (`:1461` quotes the export paragraph, `:1605` the ESCALATE 1 rule).

Finding classes: items 1 to 4 `class-of-bug` (one gate missing on every surface and in the shared field text), items 5 to 7 `algorithmic` (placement, size search, multi-input), item 8 `matrix/evidence` (the batch matrix in section 10), item 9 `cross-consumer` (residency statements).

### Phase 004: the CLI (runtime only)

1. `mcp server/src/server/dispatch.ts` (new): parse, placement split, dispatch, typed outcome. `mcp server/src/server/tool-registry.ts` keeps `McpError` for the MCP adapter.
2. `mcp server/src/cli.ts` (new): `list`, `describe`, `<tool>`, one argument source, unknown-key rejection, stdout JSON, exit codes 0, 1, 2, 130, 143, and a config adapter with cwd defaults that never passes tool arguments to `loadConfig`.
3. `mcp server/src/core/process-runner.ts`: live-child and temp registry, exported terminate.
4. `mcp server/src/tools/media/preview.ts`: preview to file on the CLI.
5. `mcp server/src/core/capabilities.ts`, `mcp server/src/core/ffmpeg-resolver.ts`: persistent advisory cache under the data folder.
6. `mcp server/package.json`: `bin` `media-editor` to `dist/cli.js`. `mcp server/scripts/build-plugin.ts`: `dist/cli.js` presence check beside `:336`. `mcp server/scripts/build-bundle.ts`: no change expected, verify.
7. Tests: `mcp server/tests/cli.vitest.ts` (new), `mcp server/tests/server/dispatch.vitest.ts` (new, 40-handler parity with MCP), `mcp server/tests/server/registry.vitest.ts`, `mcp server/tests/tools/media/preview.vitest.ts`, `mcp server/tests/core/capabilities.vitest.ts`, `mcp server/tests/core/ffmpeg-resolver.vitest.ts`, `mcp server/tests/packaging/build-plugin.vitest.ts`, `mcp server/tests/packaging/bundle-contents.vitest.ts`.
8. Docs: `mcp server/README.md`, `mcp server/ARCHITECTURE.md`, `mcp server/src/README.md`, `mcp server/src/server/README.md`.

Finding classes: item 1 `cross-consumer` (one dispatch for two transports), items 2, 3 and 5 `algorithmic`, item 4 `cross-consumer` (preview differs by transport), item 6 `instance-only`, item 7 `matrix/evidence` (40-handler parity), item 8 `instance-only`.

### Phase 005: skill CLI-only, plugin without MCP

1. `mcp server/claude-plugin/.claude-plugin/plugin.json`: remove `mcpServers`, reword the description. Route A adds `mcp server/claude-plugin/bin/media-editor` (new). `mcp server/scripts/build-plugin.ts` and `mcp server/tests/packaging/build-plugin.vitest.ts` drop the plugin's `dist/index.js` expectation. `mcp server/claude-plugin/README.md`.
2. `sk-media-editor/references/cli.md` (new, skill-only, ON_DEMAND).
3. `sk-media-editor/references/router-contract.md` (`choose_route` `:147-155`, predicates `:40-41`), `claude project/Custom Instructions.md` (Router Code `:354-358`, binding prose `:96`), `benchmark/router/differential.py` (`HOST_STATES` `:100-104`, `bind_host` `:314-317`).
4. `sk-media-editor/SKILL.md` route statements (`:12,44-48,77,101,127,139`), `AGENTS.md` (`:167`).
5. `sk-media-editor/references/tools.md` and `setup.md` with their Project mirrors (surface sections, transport-neutral catalogue), and `interactive-intelligence.md` with its mirror if the route language moves.
6. `benchmark/gates/rule_parity.py` (`:71-95` phrases and `min_pairs`), `benchmark/grader/twin_divergence.py` (`:87-103`).
7. Playbook: `sk-media-editor/manual-testing-playbook/manual-testing-playbook.md` (`:57`), `skill-route-order/connected-tools-first.md`, `skill-route-order/fallback-to-local-ffmpeg.md`, `project-route-order/connected-tools-in-desktop.md`.
8. The "CLI runtime" wording in the 23 Markdown files that carry it, starting with `sk-media-editor/README.md:329` and `AGENTS.md:167`, plus the kernel sentence the Sync Loop quotes at `systems.py:1419`.
9. The Sync Loop's `systems.py` (`references/cli.md` in `unmirrored_sources`, residency statements at `:1290,1314,1376,1419` for the changed kernel route wording), the regenerated `sk-media-editor/leaf-manifest.json` and `leaf-aliases.json` for `cli.md`, `SYNC.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`.

Finding classes: items 1, 3, 5 and 9 `cross-consumer` (plugin, router copy, mirrors, Sync Loop), item 2 `instance-only`, items 4 and 8 `class-of-bug` (route wording and the "CLI runtime" phrase everywhere they occur), items 6 and 7 `matrix/evidence` (gates and route-order scenarios).

---

## ELIMINATED ALTERNATIVES

| Approach | Reason Eliminated | Evidence | Iteration(s) |
|---|---|---|---|
| A second handler registry for the CLI | Duplicates the 40-entry source | `all-tools.ts:57-98` | deepseek 1, luna 1 |
| Driving the MCP server over stdio or an in-process transport per CLI call | Couples terminal use to protocol framing and server lifecycle | `index.ts:94-126` | deepseek 1, luna 1 |
| Argv sniffing inside `index.ts` or teaching `loadConfig` a CLI separator | Bare tokens become allowed roots | `config.ts:168-175` | deepseek 1 |
| Base64 preview in stdout JSON | Not machine-clean output | `preview.ts:38-45,119-124` | deepseek 2, luna 2 |
| A long-lived daemon | No measured need, startup is 0.10 to 0.25 s | orchestrator timing, section 7 | deepseek 2, luna 2 |
| Plugin MCP registration | Contradicts the fixed no-MCP plugin decision | `plugin.json:10-22` | deepseek 3, luna 3 |
| A shim reading `$CLAUDE_PLUGIN_ROOT` at run time | Variables are absent in the Bash tool environment | plugins-reference line 577 | deepseek 3 |
| Splitting `setup.md` by surface | Renames a Knowledge file and the kernel table for no Project gain | `systems.py:1252-1265` | deepseek 4, luna 4 |
| `cli.md` in `RESOURCE_MAP` or `ALWAYS` | Fails every differential fixture | `differential.py:341-343` | deepseek 4 |
| A skill-only `choose_route` differing from the kernel copy | Breaks copy parity | `differential.py:171` | deepseek 4 |
| Reusing the `tools` route value for a CLI run | Hides which transport ran | `router-contract.md:147-155` | deepseek 4 |
| An arbitrary absolute `targetFolder` path | Escapes the export root contract | `output-folder.ts:301-341` | deepseek 5, luna 5 |
| One new folder per call for a batch | Splits one request across folders, the live bug | `output-folder.ts:322-327` | deepseek 5, luna 5 |
| A confirmation boolean or a soft server guard | No trusted user answer at the tool boundary | `tool-registry.ts:102-127` | deepseek 5, luna 5 |
| Quality alone as a size cap, or silent downscaling | No byte field, and resizing changes the confirmed request | `convert.ts:142-166` | deepseek 5, luna 5 |
| Renaming the folder to `server/` | Ambiguous once one folder holds two transports | deepseek iteration 5 | deepseek 5 |

## DIVERGENCE MAP

- Completed pivots: 0. Failed pivots: 0. Audited overrides: 0. Breadth came from two independent lineages on one shared brief, convergence mode `default`.
- Saturated directions: CLI core shape, output contract, server guard. Both lineages reached the same conclusion from the same code.
- Divergent directions, adjudicated in section 5.2: install route, batch placement, `maxBytes` timing, `choose_route` shape, argument errors, exit codes, playbook placement.
- Remaining frontier: the operator choices in section 12, and the implementation-time checks there. Breadth is not convergence: no claim here is implementation evidence.

---

## 12. OPEN QUESTIONS

Operator choices, each with a recommendation:

1. **Install route** (section 8). Recommended: A, a plugin `bin/media-editor` shim plus a standalone package `bin`, one invocation everywhere. Choose B, inline `${CLAUDE_PLUGIN_ROOT}`, if the plugin must stay installable through claude.ai organisations or Cowork.
2. **Batch placement shape** (section 10). Recommended: `targetFolder` naming an existing numbered folder, validated under the export root. Alternatives: multi-input `image_convert` (one tool, needs per-plan input and file name), or find-or-create by slug (may reuse an unrelated folder).
3. **`maxBytes` on `image_convert`.** Recommended: yes, in phase 003 as its own task after the gate, jpeg, webp and avif only, structured failure on a miss, no resizing. Alternative: defer, and report the achieved `bytes` against the stated target.
4. **Server guard.** Recommended: no. Both lineages and the orchestrator agree.
5. **`setup.md` split.** The phase 001 brief proposed a split by surface. Both lineages rejected it. Recommended: accept the deviation and keep the pair mirrored with surface sections.
6. **Unknown argument keys.** Recommended: reject them on the CLI in phase 004, leave MCP stripping as it is unless the operator wants both strict.

Checks for implementation time:

7. Whether Cowork can run a Node CLI with native sharp (UNKNOWN, only matters for route B).
8. Whether `${CLAUDE_PROJECT_DIR}` substitutes in skill Markdown like `${CLAUDE_PLUGIN_ROOT}` (the docs table says `${...}` resolves anywhere in the body, untested).
9. Encoder behaviour of a `maxBytes` quality search per format, and the KB unit convention.
10. Partial-failure cleanup when a batch spans several calls into one target folder.

---

## 13. REFERENCES

- Lineage evidence: `research/lineages/deepseek/` and `research/lineages/luna/`, each with `iterations/iteration-001.md` to `iteration-005.md`, `deltas/iter-001.jsonl` to `iter-005.jsonl`, `deep-research-state.jsonl`, `findings-registry.json` and the lineage `research.md`.
- Provenance: the DeepSeek evidence this synthesis cites is the second attempt, now kept under `research/_attempts/deepseek-attempt-2/`. `research/lineages/deepseek/` holds a later rerun made to prove a runtime fix, and its findings were not merged into this document.
- Merged registry: `research/findings-registry.json` and `research/deep-research-findings-registry.json`. Attribution: `research/fanout-attribution.md`. Run ledger: `research/orchestration-status.log`, `research/orchestration-summary.json`, `research/observability-events.jsonl`.
- Resource map: `research/resource-map.md` (see section 15).
- Archived first DeepSeek attempt: `research/_attempts/deepseek-attempt-1/`, with the first run's ledger in `research/_attempts/`.
- Official docs: https://code.claude.com/docs/en/plugins-reference, https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/plugins.

## 14. SOURCES CONSULTED (aggregate)

Code under `mcp server/src/` (server, core, tools/image, tools/media, tools/video), `mcp server/scripts/`, `mcp server/claude-plugin/`, `mcp server/package.json`. Documents: `sk-media-editor/` (SKILL, README, references, playbook), `claude project/` (kernel and Knowledge), `AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `SYNC.md`. Gates: `benchmark/router/`, `benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py`. The media-editor entry in the Sync Loop's `systems.py`. Per-iteration lists sit in each iteration file.

## 15. RESOURCE MAP

`resource-map.md` was absent at init. The fan-out emission wrote `research/resource-map.md` listing the 10 lineage delta sources and 0 counted references, because the deltas cite files in prose rather than in the structured fields the reducer counts. Section 11 is the usable file map.

## 16. CONVERGENCE REPORT

- Stop reason: `maxIterationsReached` (stop policy `max-iterations`, convergence was telemetry only)
- Total iterations: 10, five per lineage. The merged registry reports 6 for `luna` because its state log holds two records for iteration 1: the original without route proof and the backfilled one with it, written when the lineage obeyed `steer.md`. The log is append-only, so both stay.
- Questions answered: `luna` strategy 5 of 5. `deepseek` strategy keeps no checkbox list, so the reducer counts 0 of 0. Evidence level: 5 of 5 per lineage.
- Remaining questions: section 12
- Last 3 iteration summaries: deepseek run 3 distribution (0.80), run 4 skill and Project split (0.75), run 5 naming and ranked list (0.70). luna run 3 distribution (0.90), run 4 skill and Project split (0.94), run 5 naming and ranked list (0.95).
- Convergence threshold: 0.05
- Merged registry: 58 key findings, 65 source findings, convergence score 0.475, one schema warning (`deepseek` used the key `findings`, 22 entries coerced to `keyFindings`).
- Divergence summary: no divergent pivots recorded. Two-lineage disagreements are in section 5.2.
- Closeout gate: `synthesis-closeout.cjs` exited 2 and the gateway recorded `synthesis_incomplete` in `research/deep-research-state.jsonl`, with invariants `count_only_state_findings_not_reconstructed` and `state_finding_reconstruction_gap`. Cause: all 10 lineage deltas hold only their iteration row and no finding rows, and 9 of the 11 lineage state records carry a bare `findingsCount` (74 findings in all) with no finding list, so the merge could rebuild 65 and left a gap of 24. The findings themselves live in the iteration Markdown, which this synthesis read directly and spot-checked (section 17). Debugged afterwards in `../scratch/closeout-fix.md`: the gap is DeepSeek's alone (46 claimed findings minus the 22 its registry lists), and a scratch replay of Luna alone closes with exit 0. The CLI lineage prompt never carries the finding contract, and `verify-iteration.cjs` does not check that claimed findings are enumerated.

## 17. APPENDIX: EXECUTION LOG AND SPOT-CHECKS

**Execution log**

- Run 1, both lineages: `luna` completed 5 of 5, one non-fatal `stall_detected` warning. `deepseek` attempt 1 completed 5 iterations whose state records lacked route proof and carried invented timestamps.
- Run 2, `deepseek` only, redispatched once under the route-proof rule with `steer.md` in place: 5 of 5. Its timestamps were backfilled from real `date -u` readings, which are clock values but not the moments the iterations ran.
- No hang reruns. No empty-at-output-cap reruns. Both `fanout-run.cjs` invocations exited 0.
- `git -C "AI Systems/Media Editor" status --porcelain` was empty before and after the run.
- Step `step_stage_artifact_dir` (`git add`) was not run: this phase's write scope excludes the git index and the tree is shared with peer sessions.

**Spot-checks** (orchestrator, against the source on 2026-10-04)

| # | Claim | Source checked | Result |
|---|---|---|---|
| 1 | 40 handlers in `ALL_TOOLS` | `mcp server/src/server/all-tools.ts:57-98`, entries counted | Confirmed |
| 2 | Parse failure throws `McpError(InvalidParams)`, handler throws map to `errorResult` | `tool-registry.ts:102-127,109,125` | Confirmed |
| 3 | Entry self-runs | `index.ts:126` `void main()` | Confirmed |
| 4 | Bare argv tokens become allowed roots | `config.ts:168-175` | Confirmed (DeepSeek cited `:167-172`) |
| 5 | Unknown flags warn and swallow their value | `config.ts:176-188` | Confirmed |
| 6 | zod 4.6.5, `z.toJSONSchema` exists, unknown keys stripped | run in `mcp server/` with node | Confirmed |
| 7 | One-shot import cost about 0.21 s | `/usr/bin/time -p` three runs: 0.25, 0.10, 0.10 s, bare node 0.02 s | Confirmed in range |
| 8 | Capability and resolver caches are per process | `capabilities.ts:163,366`, `ffmpeg-resolver.ts:446-485` | Confirmed |
| 9 | Preview is base64 image content | `preview.ts:38-45,119-124` | Confirmed |
| 10 | Children killed only on own timeout, temp cleanup only in `finally` | `process-runner.ts:471-477,695-701` | Confirmed |
| 11 | `result.ts` needs no SDK value | `result.ts` imports `type { CallToolResult }` only | Confirmed, so the `ToolResult` rewrite is optional (D6) |
| 12 | Relative reads pin the dist layout | `server-info.ts:42`, `font-path.ts:51` | Confirmed |
| 13 | Plugin build checks `dist/index.js` and copies the skill | `build-plugin.ts:303-336,347-350` | Confirmed |
| 14 | Bundle stages `dist`, `assets`, `licenses` | `build-bundle.ts:76` | Confirmed |
| 15 | Plugin manifest supplies root, output and data folder | `plugin.json:10-22` | Confirmed, new finding (5.3) |
| 16 | `image_convert` is one input, one plan, no byte target | `convert.ts:100-125,142-166` | Confirmed |
| 17 | Multi-plan calls get a folder, one `fileName` for all plans | `sharp-output.ts:493-498`, `tool-context.ts:290-295` | Confirmed, reviewer correction folded into section 10 |
| 18 | Allocation always takes the next number, two call sites | `output-folder.ts:301-341,322`, `sharp-output.ts:496`, `copy-then-encode.ts:297` | Confirmed |
| 19 | Field text presents omission as normal | `field-schemas.ts:62-80` | Confirmed |
| 20 | Kernel folder rule | `Custom Instructions.md:149` | Confirmed, per call not per request (5.3) |
| 21 | Kernel name rule, ESCALATE and sequence | `Custom Instructions.md:145,165,181,194` | Confirmed |
| 22 | Project has no shell execution | `Custom Instructions.md:157,192-196` | Confirmed |
| 23 | `route` is outside the contract schema | `route_contract.py:87-89`, `differential.py:331-332,341-343` | Confirmed, `route_contract.py` needs no change (D4) |
| 24 | Host states and bindings | `differential.py:100-104,314-317` | Confirmed |
| 25 | Kernel carries the router copy under parity | `Custom Instructions.md:96,354-358`, `differential.py:171` | Confirmed |
| 26 | Route-order rule floor | `rule_parity.py:71-95`, `min_pairs` 5 at `:95` | Confirmed. DeepSeek's `:208` for the retired-name set is wrong, `RETIRED_NAMES` is at `:127-131` |
| 27 | Twin pairs | `twin_divergence.py:87-103` | Confirmed |
| 28 | Interactive Intelligence folder rule | `interactive-intelligence.md:116` | Corrected line, Luna cited `:118` |
| 29 | `media_rename` stays in one folder | `rename.ts:138-169` | Confirmed |
| 30 | "CLI runtime" collision | grep of Markdown outside changelogs | Confirmed and wider, 23 files not 2 |
| 31 | Folder-name mentions | grep, excluding `node_modules`, `dist` and build output | 43 tracked files, plus 11 ignored plugin copies (`mcp server/.gitignore:9-10`). DeepSeek's 42 is close |
| 32 | Mirror pairs byte-identical | `cmp -s` on tools, setup, interactive-intelligence pairs | Confirmed |
| 33 | Docs: Markdown substitution, no Bash env, `bin/` on PATH and not installed on claude.ai or Cowork, data path | plugins-reference fetched with curl, lines 557, 575, 577, 626 | Confirmed |
| 34 | Empty argv leaves no root and no output, a bare token sets both | `loadConfig` from `mcp server/dist/core/config.js` run with three argv shapes, `config.ts:282` | Confirmed, new finding (section 6) |
| 35 | Inputs outside every root are rejected | `path-guard.ts:348-376` | Confirmed |
