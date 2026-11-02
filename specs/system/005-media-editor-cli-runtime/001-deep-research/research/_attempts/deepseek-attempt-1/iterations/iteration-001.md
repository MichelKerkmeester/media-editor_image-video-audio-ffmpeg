# Iteration 1: CLI Core

## Focus

Decide the transport-neutral core that lets one `media-editor` CLI reuse the same tool handlers the
MCP server runs. Five sub-questions: the dispatch seam, argument errors as results instead of
protocol errors, a separate entry point, a config path that never lets tool argv become allowed
folders, and the exit code plus signal contract for ffmpeg children and temp folders.

## Findings

### F1.1 `dispatchToolCall` is already transport-neutral in body and only two call-site details are not

`dispatchToolCall` at `mcp server/src/server/tool-registry.ts:102-127` does four things, all of them
usable outside MCP:

- parses args with `z.object(listedInputSchema(definition)).safeParse(args)` (`:107`),
- on parse failure throws `McpError(ErrorCode.InvalidParams, ...)` (`:109-112`),
- splits `fileName` and `subfolder` out of the parsed data and rebuilds the context with
  `withPlacement` (`:118-122`),
- calls `definition.handler(rest, placed)` inside a try/catch that maps any throw to
  `errorResult(error, definition.name)` (`:114-126`).

The only MCP coupling is the `McpError` import plus `ErrorCode` from
`@modelcontextprotocol/sdk/types.js` (`:10-14`), and the `CallToolResult` return type
(`:21`). The handler contract itself is transport-free: `ToolDefinition.handler` takes
`(args, context)` and returns `Promise<CallToolResult>` (`:52-55`), and `ToolContext` is built by
`createToolContext` with no server reference at all
(`mcp server/src/server/tool-context.ts:332-503`).

The result builders are also transport-free. `successResult` returns a plain object with `content`
and `structuredContent` (`mcp server/src/core/result.ts:309-319`) and `errorResult` returns
`isError: true` with `code`, `message`, `details` in `structuredContent` (`:330-347`). Neither
touches the SDK except a type-only import at `:11`.

**Design.** Export `dispatchToolCall` from a new transport-neutral module (proposed
`mcp server/src/core/dispatch.ts`) and have `tool-registry.ts` import it. The parse failure stops
throwing `McpError` and instead returns `errorResult(...)`. That single change makes the function
usable by both surfaces and removes the `McpError` import from the shared path. The MCP call
handler keeps only the unknown-tool branch, which stays a protocol error because
`ErrorCode.MethodNotFound` is a protocol-level concern (`tool-registry.ts:197-202`).

Rejected option: keep `dispatchToolCall` in `tool-registry.ts` and re-export it. It still imports
`McpServer` and `McpError` at module scope, so a CLI entry importing the module drags the MCP SDK
server runtime into the CLI process graph. That is a real cold-start cost for a per-call CLI and a
dependence on a server class the CLI never instantiates.

Rejected option: duplicate the dispatch logic in the CLI. Two parse-and-place paths would drift on
the very `fileName` and `subfolder` handling the live bug implicates
(`tool-registry.ts:118-122`).

### F1.2 Argument errors are already result-shaped, so the change is to stop throwing the MCP error

`errorResult` already produces the exact shape a CLI wants (`mcp server/src/core/result.ts:330-347`).
`invalidArgumentsMessage` already builds a readable list of offending paths
(`tool-registry.ts:65-77`). So the argument-error path needs no new formatting, only a return
instead of a throw. The cleanest seam: `dispatchToolCall` returns
`errorResult(new MediaError(...))` or, simpler, constructs the message and returns
`errorResult` with the message string, which `toMediaError` accepts (`core/errors.ts:120-137`).

Two exit-code consequences follow and are discussed in F1.5: a parse failure is a caller error and
should exit with a distinct code from a handler failure.

Rejected option: return a synthetic `CallToolResult` with `isError` and let the CLI inspect it to
pick an exit code. It works, but it puts a string comparison or a `code` field read in the CLI
entry, away from the one place that knows whether the error came from the schema. Returning the
result and letting the CLI read `structuredContent.code` is sufficient if the parse failure gets
its own `code` value such as `INVALID_ARGUMENTS`. The package already has a code catalogue at
`mcp server/src/core/errors.ts:12-31` to extend.

### F1.3 `index.ts` self-runs, so the CLI needs its own entry and the server should be import-safe

`mcp server/src/index.ts:126` calls `void main()` at module scope, guarded only by `export {}` at
`:128`. Any import of that file starts a stdio server and waits on stdin. The CLI therefore cannot
import it. Two entries are needed:

- keep `dist/index.js` as the MCP stdio server entry (`mcp server/package.json:8-11`), and
- add a CLI entry, proposed `mcp server/src/cli.ts` compiled to `dist/cli.js`, registered as a
  second `bin` key such as `"media-editor": "dist/cli.js"` beside the existing
  `media-editor-mcp` (`mcp server/package.json:9-11`).

The CLI entry imports `loadConfig` from `core/config.js`, `createToolContext`,
`dispatchToolCall` and the tool list, and never imports `createServer` or
`StdioServerTransport` (`mcp server/src/index.ts:10`, `:14`).

Rejected option: add a `--cli` flag to `index.ts` and branch at `:126`. That keeps one entry but
makes the module do two jobs, and any accidental import still self-runs. The repository's own
authority rule prefers authoritative source over a branching shim.

### F1.4 `loadConfig` treats every bare argv token as an allowed folder, so tool args must never reach it

`parseArguments` pushes every non-`--` token into `allowedDirs` (`mcp server/src/core/config.ts:167-175`),
and `collectRoots` then realpaths each one and keeps it as an allowed root
(`:240-258`). A CLI invocation such as `media-editor image_convert input.png --output-name x` has a
bare path token that is a tool argument, not a server root. Under the current parser it would
become an allowed root if the path happened to be an absolute directory, or be silently warned and
dropped otherwise (`:245-248`).

Worse is the flag path: unknown flags are warned and their value token is skipped
(`:179-188`), so `--output-name x` is warned and `x` is skipped. That is safe by accident today
but produces a warning storm on every CLI call and, if a tool flag name ever matches
`--allowed-dir` or `--output-dir` (`:178`), the CLI would reconcile real roots from tool args.

Three candidate config paths:

1. **Separate argv spaces (recommended).** The CLI parses its own argv first into
   `{ configArgv, toolArgs }`, passes only the recognized server flags
   (`--allowed-dir`, `--output-dir`, plus a new explicit root flag such as `--root`) to
   `loadConfig`, and passes everything after `--` or after the tool name to the tool parser. The
   invariant is structural: `loadConfig` never sees a token it did not classify.
2. **Env-only config for the CLI.** `loadConfig(process.env, [])`. Simple and safe, but it
   removes the operator's ability to point one CLI call at a folder, and it makes `--output-dir`
   unusable in a terminal session.
3. **Teach `loadConfig` about tool args.** Give it a schema of known tool flags to skip. This
   couples the config loader to the 40 handler schemas and would drift.

Candidate 1 is recommended. It is the only one that removes the bare-token hazard by construction
rather than by a skip list. Note that even candidate 1 needs one guard: a tool value that is a bare
path must not sit before the `--` separator the CLI reserves for config.

Rejected option: keep passing raw `process.argv.slice(2)` to `loadConfig` and accept the warnings.
Rejected because a bare absolute directory used as a tool input path would silently widen the
allowed root set, which is a path-guard scope change, not a cosmetic warning.

### F1.5 Exit codes and signals need a small explicit contract, and today's shutdown is MCP-specific

What exists today:

- `exitWithCode(code)` drains stderr and exits (`mcp server/src/index.ts:40-54`).
- Signal handling is `armShutdown(server)`: SIGINT and SIGTERM call `shutDown`, which closes the
  `McpServer` then exits 0, and a second signal exits 0 immediately (`:56-88`).
- Child processes are killed by the runner with `child.kill()` then `SIGKILL` after a grace period
  (`mcp server/src/core/process-runner.ts:472-477`).
- Failure cleanup removes planned folders but leaves an existing output untouched
  (`process-runner.ts:769`, `:671`, `:710`).

The CLI has no server to close. What it needs instead:

| Situation | Exit code | Rationale |
| --- | --- | --- |
| Success, result written to stdout | 0 | Convention |
| Invalid tool name | 2 | Caller misuse, distinct from runtime failure |
| Argument parse failure from zod | 2 | Caller misuse |
| Handler failure (`isError: true` result) | 1 | Runtime failure with a code in `structuredContent` |
| Config fatal (`loadConfig` throws or no roots usable) | 3 | Environment failure, distinct and scriptable |

The exact numbers are a design choice, but the split between caller misuse and runtime failure must
exist, because a script that retries on runtime failure should not retry a typo.

For signals, the CLI must reuse the same child registry the runner already keeps so that SIGINT and
SIGTERM kill live ffmpeg children and remove temp folders. Today the runner owns the child
reference inside `runProcess` and there is no process-wide registry to walk
(`process-runner.ts:434-477` handles one child in a closure). Two options:

- **(A) Exported registry plus a `killAllChildren()` helper.** The runner records each live child
  in a module-level set and removes it on close, and a new export walks the set and kills with the
  same SIGTERM-then-SIGKILL grace the runner already uses (`process-runner.ts:472-477`). The CLI
  entry installs SIGINT and SIGTERM handlers that call `killAllChildren()`, run the same folder
  cleanup, then `exitWithCode(130)` for SIGINT and `143` for SIGTERM.
- **(B) Per-call `AbortSignal` threaded through `RunOptions`.** Cleaner TypeScript, but every
  handler signature and `RunBinaryOptions` would need the signal
  (`mcp server/src/server/tool-context.ts:60-71`), and the CLI is the only caller that needs it.
  High blast radius for the phase that is supposed to be a seam, not a refactor.

Recommend (A). It is additive, touches one module, and serves the MCP server too, which currently
leaves an ffmpeg child running if the host closes stdin during a long encode (`index.ts:82-87`
closes the server without walking children).

A supporting fact for (A): cleanup is already a function the runner exports and calls on failure
(`process-runner.ts:769`), so the CLI can call the same path from its signal handler rather than
reimplementing folder removal.

## Sources Consulted

- `AI Systems/Media Editor/mcp server/src/server/tool-registry.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/index.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/core/config.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/server/tool-context.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/core/result.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/core/process-runner.ts` (grepped signal, kill, cleanup,
  exit paths)
- `AI Systems/Media Editor/mcp server/src/core/errors.ts` (grepped code catalogue)
- `AI Systems/Media Editor/mcp server/src/core/output-folder.ts` (`allocateOutputFolder` region)
- `AI Systems/Media Editor/mcp server/package.json` (whole file)
- Commands: `find "mcp server/src/tools" -name "*.ts" | wc -l` returned 43, `ls "mcp server/src"`
  and the source tree listing

## Assessment

newInfoRatio: 1.0
Novelty justification: first pass, every finding is new to this packet.
Confidence: high for F1.1 through F1.4 because they read the exact cited lines. F1.5 is medium for
the exact exit-code numbering, which is an inference about consumer ergonomics rather than a fact
in the tree, and high for the registry gap, which the grep of `process-runner.ts` confirms.

## Reflection

What worked: reading `dispatchToolCall` and `createToolContext` together showed the seam is already
narrower than the prompt assumed. The dispatch function's only MCP coupling is one import and one
throw.

What failed: nothing yet. No claim here needed a network source.

What was ruled out: re-exporting the registry module from the CLI (F1.1), duplicating dispatch
(F1.1), an `--cli` branch in the existing entry (F1.3), env-only config for the CLI (F1.4), and an
`AbortSignal` refactor of every handler signature (F1.5).

## Recommended Next Focus

Iteration 2, CLI surface and output. Enumerate the 40 tool names from
`mcp server/src/server/all-tools.ts`, then decide the `list` and `describe` verbs, the JSON
argument intake (flag, file, stdin), the stdout shape from `structuredContent`
(`mcp server/src/core/result.ts:309-319`), the preview-to-file change at
`mcp server/src/tools/media/preview.ts:119`, the startup-cost and cache question, and the shared
`MEDIA_EDITOR_DATA_DIR` behavior that makes `media_setup_ffmpeg` and `media_health` work across
separate CLI processes.
