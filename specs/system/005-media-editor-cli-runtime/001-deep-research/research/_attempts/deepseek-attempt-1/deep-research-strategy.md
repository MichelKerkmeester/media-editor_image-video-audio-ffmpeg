# Deep Research Strategy

Lineage: deepseek. Session: fanout-deepseek-1791115841524-lv22uz.
Artifact dir: `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/lineages/deepseek`
Spec folder: `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research`
Executor: cli-pi, model opencode-go/deepseek-v4.1-flash, loop_type research.
Stop policy: max-iterations, maxIterations 5. Convergence threshold 0.05 is telemetry only.

## Research Topic

How should the Media Editor gain a `media-editor` CLI over the same 40 tool handlers its MCP
server runs, how should the skill rely on that CLI alone while the Claude Project stays on MCP,
and how should the naming and placement gate be hardened so a batch gets confirmed names and one
place? Deliver a ranked, evidenced design for four implementation phases: rename `mcp server/` to
`runtime/`, harden naming and placement, build the CLI, move the skill to the CLI.

The folder under study is still named `mcp server/` on disk. Every citation keeps that name.

## Known Context

- The Media Editor root is `AI Systems/Media Editor/`.
- The MCP server lives at `AI Systems/Media Editor/mcp server/`, an npm package named
  `media-editor-mcp` with `bin.media-editor-mcp` pointing at `dist/index.js`
  (`mcp server/package.json:2`, `:9-11`).
- Source tree holds 43 TypeScript files under `mcp server/src/tools` (counted with
  `find "mcp server/src/tools" -name "*.ts" | wc -l`), and the router in
  `mcp server/src/server/all-tools.ts` publishes the tool list.
- The skill lives at `AI Systems/Media Editor/sk-media-editor/` and the Claude Project package at
  `AI Systems/Media Editor/claude project/`.
- A live Project bug drove focus 5: four PNGs converted to WebP with one `subfolder: true` call out
  of four, so one file landed in a numbered folder and three landed in the export root.
- Fixed decisions that must not be reopened: the Claude Code plugin ships the skill and CLI
  runtime with no MCP server. The Claude Project stays on the Desktop extension and MCP. The
  skill route order is CLI first, then hand-written ffmpeg, then advice. No new tools for audio
  trim, loudness normalization or CRF compression.

### Packet Layout

| File | Purpose |
| --- | --- |
| `deep-research-strategy.md` | This plan, reducer-managed |
| `deep-research-state.jsonl` | Append-only structured log |
| `deltas/iter-NNN.jsonl` | Per-iteration structured delta |
| `iterations/iteration-NNN.md` | Write-once narrative |
| `deep-research-dashboard.md` | Operator summary |
| `findings-registry.json` | Findings and question state |
| `research.md` | Progressive then final synthesis |

## Key Questions

| # | Question | Status |
| --- | --- | --- |
| Q1 | What must be decoupled so one dispatch path serves both MCP and CLI, and where exactly does the current code block that? | open |
| Q2 | How should argument errors, exit codes, signals and child cleanup behave in a CLI that shares handlers with a long-lived server? | open |
| Q3 | What CLI surface (verbs, argument intake, stdout shape, preview output, caches, data dir) matches the 40 handlers without a second contract to maintain? | open |
| Q4 | How does the Claude Code plugin ship and locate the CLI, and what do the official docs actually say about `${CLAUDE_PLUGIN_ROOT}` and plugin `bin/` on PATH? | open |
| Q5 | Can the skill go CLI-only while the three byte-identical mirror pairs keep parity with the Claude Project, and what does the Sync Loop declaration require? | open |
| Q6 | Which commands and files carry the route-order rewrite, and what breaks in the router benchmark when route order changes? | open |
| Q7 | What naming and placement gate wording makes a batch ask once about names and one place? | open |
| Q8 | Which batch placement mechanism is worth building, and is a `maxBytes` target or a server guard worth the friction? | open |
| Q9 | What is the ranked change list across the four phases, naming every file? | open |

## Answered Questions

(none yet)

## What Worked

(none yet)

## What Failed

(none yet)

## Exhausted Approaches

(none yet)

## Ruled-Out Directions

(none yet)

## Next Focus

Iteration 1, CLI core. Read `mcp server/src/server/tool-registry.ts`,
`mcp server/src/index.ts`, `mcp server/src/core/config.ts`,
`mcp server/src/server/tool-context.ts`, `mcp server/src/core/result.ts` and
`mcp server/src/core/process-runner.ts`. Decide the transport-neutral dispatch shape, the argument
error to result path, the separate entry file, the config path that never feeds tool argv to
`loadConfig`, and the exit-code plus signal cleanup contract.
