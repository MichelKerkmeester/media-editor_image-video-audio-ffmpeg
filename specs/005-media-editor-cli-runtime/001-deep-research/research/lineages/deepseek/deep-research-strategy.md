# Deep Research Strategy - Deepseek Lineage

## Research Topic

How should the Media Editor gain a `media-editor` CLI over the same 40 tool handlers its MCP server runs, how should the skill rely on that CLI alone while the Claude Project stays on MCP, and how should the naming and placement gate be hardened so a batch gets confirmed names and one place. Deliverable: a ranked, evidenced design for four implementation phases.

## Charter

Answer the question above from the files in front of me, cite every load-bearing claim to `path:line`, name each rejected option, and rank the changes. No implementation. Nothing under `AI Systems/` is modified by this lineage.

## Non-Goals

- No reopening of the four fixed decisions.
- No implementation of any phase.
- No modification of anything outside this lineage directory.

## Stop Conditions

- `max-iterations` at 5, reached. Convergence was treated as telemetry only.

## Known Context

- The dispatch packet's line "The folder is still named `mcp server/`" is stale against the live tree, which holds `runtime/` with the rename staged in the nested repository. This lineage cites `runtime/` and recorded the contradiction as finding 7 of iteration 1.
- The implementation moved ahead of this research: 002 (rename) complete, 003 (naming hardening) complete at 90 percent with AC-005 open, 004 (CLI) in flight as untracked files while this lineage ran, 005 and 006 not started.
- Prior lineage evidence exists read-only in `research/_attempts/deepseek-attempt-1` and `deepseek-attempt-2`, used as reference and re-verified against the live tree.
- `resource-map.md` was not present in the target spec folder at initialization.

## Key Questions

- [x] How can dispatchToolCall be made transport-neutral and shared by the CLI and the MCP server while argument errors return as CLI results?
- [x] What CLI command surface, JSON output contract, preview handling, startup cost, and shared data folder satisfy direct terminal use?
- [x] How should the plugin and a standalone package expose the CLI to Claude Code and other terminal agents while preserving dist-relative assets?
- [x] How can the skill rely on the CLI alone while the Claude Project stays on MCP and the mirrored reference pairs stay byte-identical?
- [x] How should the naming and placement gate be hardened so a batch gets confirmed names and one place, and what is the ranked change list for the four phases?

## Answered Questions

- How can dispatchToolCall be made transport-neutral and shared by the CLI and the MCP server while argument errors return as CLI results? See `iterations/iteration-001.md`.
- What CLI command surface, JSON output contract, preview handling, startup cost, and shared data folder satisfy direct terminal use? See `iterations/iteration-002.md`.
- How should the plugin and a standalone package expose the CLI to Claude Code and other terminal agents while preserving dist-relative assets? See `iterations/iteration-003.md`.
- How can the skill rely on the CLI alone while the Claude Project stays on MCP and the mirrored reference pairs stay byte-identical? See `iterations/iteration-004.md`.
- How should the naming and placement gate be hardened so a batch gets confirmed names and one place, and what is the ranked change list for the four phases? See `iterations/iteration-005.md`.

## What Worked

- Reading the live implementation instead of only the prior lineage's design, which surfaced the in-flight state, the landed hardening and the stale path instruction.
- Running real commands: `node dist/cli.js list` confirmed exactly 40 tools, `describe image_convert` confirmed the hardened schema, four timing runs measured startup, and seven `cmp -s` checks held the mirror pairs byte-identical.
- Fetching both official Claude Code documentation pages at their current revision, which answered the two plugin-mechanics questions with citable sentences.
- Writing one state record per iteration directly into the lineage state log and self-checking every iteration with `verify-iteration.cjs`, which printed OK five times.

## What Failed

- Nothing failed outright. The main risk handled was line drift from parallel edits in the working tree, mitigated by anchoring every claim to the revision read and by re-measuring with commands where possible.

## Exhausted Approaches

- The build-time schema manifest, a resident daemon, per-flag tool arguments and base64 previews on stdout.
- A baked plugin path, npm publication and a single-file CLI bundle.
- Splitting `setup.md`, adding `cli.md` to `RESOURCE_MAP`, a skill-only `choose_route` and a CLI route mode.
- A hard server guard against unconfirmed names and `maxBytes` as a hard guarantee.
- Multi-input `image_convert` in place of `targetFolder`.

## Ruled-Out Directions

- Reopening the four fixed decisions. They are constraints for this research.

## Next Focus

None. The loop reached its iteration cap and the synthesis is written to `research.md`.

## Research Boundaries

- Maximum iterations: 5
- Convergence threshold: 0.05, telemetry only before the forced cap
- Stop policy: max-iterations
- Session: fanout-deepseek-1791128623066-z5dct5
- Artifact directory: this lineage directory

## Iteration 1 Update

- What worked: direct reads of the dispatcher, CLI entry, config adapter and process runner, plus the git state that exposed the stale path line.
- What failed: nothing.
- Ruled out: a second dispatcher copy, runtime SDK coupling, an in-process transport, argv sniffing, and CLI separators in `loadConfig`.

## Iteration 2 Update

- What worked: running the built CLI and timing it, which confirmed the 40 tools, the hardened schema and the startup budget in one pass.
- What failed: nothing.
- Ruled out: the schema manifest, per-flag arguments, base64 previews and a resident daemon.

## Iteration 3 Update

- What worked: the official pages settled both plugin questions, and the build script showed the shim already landing.
- What failed: nothing. The pending manifest flip was located rather than assumed.
- Ruled out: a baked path, a second MCP entry, npm publication and a single-file bundle.

## Iteration 4 Update

- What worked: seven `cmp -s` checks held the pairs byte-identical, and the gate surfaces were read live rather than from the packet.
- What failed: nothing. Phase 005 is pending, recorded as partial success.
- Ruled out: splitting `setup.md`, skill-only resources in the map, a CLI route value and a divergent router.

## Iteration 5 Update

- What worked: mapping each of the seven known bug causes to a landed fix in the kernel, the field text, the placement code and the playbook.
- What failed: nothing. AC-005 and the two scenarios remain ungraded, which is phase 006 work.
- Ruled out: a server guard, `maxBytes` as a guarantee, and multi-input `image_convert`.
