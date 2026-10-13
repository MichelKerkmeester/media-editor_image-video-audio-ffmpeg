# Iteration 001 - CLI core

Focus: the transport-neutral dispatch over the same 40 handlers, argument errors returned as results, a separate CLI entry, a config path that never feeds tool argv into `loadConfig`, and exit codes plus SIGINT and SIGTERM cleanup. This iteration answers the design question and records what the live tree already carries, because implementation has moved ahead of this research: child packet 004 is being built in the working tree while this lineage runs (`runtime/src/cli.ts`, `runtime/src/core/dispatch.ts` and `runtime/src/core/probe-cache.ts` are untracked with mtimes 16:50 to 17:46 local).

Sources read: `runtime/src/core/dispatch.ts`, `runtime/src/cli.ts`, `runtime/src/server/tool-registry.ts`, `runtime/src/index.ts`, `runtime/src/core/config.ts`, `runtime/src/core/process-runner.ts`, `runtime/src/server/field-schemas.ts`, `runtime/src/server/tool-context.ts`, plus `git status --short` and file mtimes in the nested repository.

## Findings

1. Transport-neutral dispatch is live. `dispatchTool(definitions, context, name, args)` at `runtime/src/core/dispatch.ts:105-162` takes a name-keyed tool map, a `ToolContext` and unknown args, and returns a discriminated `DispatchOutcome` of `result`, `unknown-tool` or `invalid-arguments`. It imports no transport value, only the type `CallToolResult` at `:20`, and the MCP adapter imports it back at `runtime/src/server/tool-registry.ts:15` while the CLI calls it at `runtime/src/cli.ts:383`.

2. Argument errors return as results on the CLI and stay protocol errors on MCP. `dispatchOutcomeErrorResult` (`runtime/src/core/dispatch.ts:170-187`) builds an `isError` result with `code: INVALID_INPUT`, a message, and `details.issues` from the zod error. The CLI prints that `structuredContent` and exits 2 (`runtime/src/cli.ts:206-214`), while the MCP request handler keeps `McpError(MethodNotFound)` for an unknown tool and `McpError(InvalidParams)` for a bad argument list (`runtime/src/server/tool-registry.ts:134-148`), preserving the host contract that exists today.

3. A separate CLI entry exists and `index.ts` still self-runs. `runtime/src/cli.ts` (untracked, 478 lines) is the new entry with a self-run guard at `:464-478`, so it is importable as a module. `runtime/src/index.ts:126` still executes `void main()` at module scope, so importing the MCP entry would start a stdio server, which is exactly why the separate entry was required.

4. Tool argv never reaches `loadConfig`. `configTokens` (`runtime/src/cli.ts:216-246`) emits only `--allowed-dir` and `--output-dir` tokens, plus `MEDIA_EDITOR_*` environment values, and tool arguments travel separately through `--args`, `--args-file` or stdin (`:142-159`, `:248-278`). This matters because `parseArguments` still turns every bare token into an allowed-root candidate (`runtime/src/core/config.ts:155-175`), so the isolation has to live in the CLI and it does.

5. Exit codes form a stable table: 0 for success and 1 for a tool failure (`runtime/src/cli.ts:388-389`), 2 for usage and dispatch errors (`:196-214`), 3 for startup failures (`:452-461`, `:468-477`), and 130 or 143 on SIGINT or SIGTERM (`:310`).

6. SIGINT and SIGTERM cleanup is real. `armSignalHandlers` (`runtime/src/cli.ts:307-320`) calls `terminateAll()` and then exits with 128 plus the signal number. `terminateAll` (`runtime/src/core/process-runner.ts:737-770`) rejects queued slot waiters, sends SIGTERM to every live child, waits a grace window, sends SIGKILL, then removes every path tracked by `registerCleanupPath` (`:705-725`). The CLI preview sink registers its temporary and target paths at `runtime/src/cli.ts:290-291`.

7. The dispatch packet's path instruction is stale against the live tree. The packet says "The folder is still named `mcp server/`. Cite it by that name.", but `AI Systems/Media Editor/` holds `runtime/` and the rename is staged in the nested repository: `git status --short` shows `RM "mcp server/..." -> runtime/...` rename entries and `runtime/` carries mtime 2026-10-04 15:53 local. This lineage cites `runtime/` and records the contradiction here. The same packet line also predates child packet 002, which is complete at 100 percent per its implementation summary.

## Design answer

The intended shape, now visible in the live tree, is one dispatcher with two thin transport adapters. `dispatch.ts` owns lookup, schema parse, the placement split and the error mapping, and returns outcomes rather than protocol errors. The MCP adapter translates the two failure outcomes into protocol errors because a host client expects them, and the CLI translates them into `INVALID_INPUT` JSON plus exit 2 because a terminal agent repairs a call from JSON. The CLI builds its own config tokens so a tool argument can never be read as an allowed folder, and it owns process-level concerns that the server does not need: an exit-code table and a signal path that reaps ffmpeg children and tracked temporary paths before exiting.

Two divergences from the earlier design draft are deliberate and worth recording. First, tool arguments are JSON only (`--args`, `--args-file`, stdin) and not per-flag `--key value` pairs, which keeps one parse path and one schema source. Second, the self-run guard landed on the CLI entry itself (`runtime/src/cli.ts:464-478`) rather than being added to `index.ts`, so the MCP entry is untouched.

## Ruled Out

1. A second copy of the dispatcher for the CLI, because the placement split and the error mapping would drift apart and placement is exactly the code the naming bug depends on.
2. Keeping the CLI coupled to the MCP SDK at runtime, because the only SDK imports on the dispatch path are type-only (`dispatch.ts:20`) and erasing types keeps the CLI free of the transport package.
3. Driving `createServer` over an in-process transport for a one-shot call, because the CLI needs one dispatch and one process, not a protocol lifecycle.
4. Argv sniffing inside `index.ts`, because `index.ts:126` self-runs and a separate entry with its own guard is cleaner.
5. Teaching `loadConfig` about CLI separators, because `config.ts` is shared with the MCP boot path and the CLI-side adapter can be deleted without touching the server.

## Edge Cases

- Contradictory evidence: the dispatch packet's "still named mcp server/" line against the staged rename in the live tree and git status. Resolved in favor of the live tree and recorded as finding 7.
- Partial success: none. All five focus items were verifiable in the live tree.

## Sources Consulted

- `AI Systems/Media Editor/runtime/src/core/dispatch.ts:1-188`
- `AI Systems/Media Editor/runtime/src/cli.ts:1-478`
- `AI Systems/Media Editor/runtime/src/server/tool-registry.ts:1-150`
- `AI Systems/Media Editor/runtime/src/index.ts:115-130`
- `AI Systems/Media Editor/runtime/src/core/config.ts:150-200`, `:405-425`
- `AI Systems/Media Editor/runtime/src/core/process-runner.ts:700-775`
- `git status --short` and `ls -la` in `AI Systems/Media Editor/` (read-only)

## Assessment

- New information ratio: 0.85
- Questions addressed: how the dispatch is made transport-neutral and how argument errors become CLI results.
- Questions answered: how the dispatch is made transport-neutral and how argument errors become CLI results.

## Reflection

- What worked: reading the live implementation instead of only the prior lineage's design, which surfaced the in-flight state and the stale path instruction.
- What did not work: nothing failed this iteration.
- What I would do differently: keep every claim anchored to the file revision read, because the tree is being edited in parallel and line numbers can move under a later reader.

## Recommended Next Focus

Iteration 2: the CLI surface and output. Verify `list`, `describe`, `health` and the tool command, the stdout JSON contract, the preview file sink, startup cost, the persistent probe cache and the shared data folder against the live `runtime/src/cli.ts`.
