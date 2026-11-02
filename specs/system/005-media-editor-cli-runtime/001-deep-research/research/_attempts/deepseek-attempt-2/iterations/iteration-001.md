# Iteration 001 - CLI core

Focus: how a `media-editor` CLI can sit on the same 40 tool handlers without re-implementing them,
with transport-neutral dispatch, argument errors returned as results, a separate entry point, a
config path that never feeds tool argv into `loadConfig`, and real exit and signal behavior.

Sources read this iteration: `steer.md`, `mcp server/src/server/tool-registry.ts`,
`mcp server/src/index.ts`, `mcp server/src/server/tool-context.ts`, `mcp server/src/core/result.ts`,
`mcp server/src/core/process-runner.ts`, `mcp server/src/core/config.ts`,
`mcp server/src/core/errors.ts`, `mcp server/src/server/all-tools.ts`,
`mcp server/src/server/create-server.ts`, `mcp server/src/core/capabilities.ts`,
`mcp server/src/core/ffmpeg-resolver.ts`, `mcp server/package.json`.

## 0. Baseline: the tool count and the seam

`mcp server/src/server/all-tools.ts:57-98` lists 40 tool definitions and I counted the entries, so the
packet's "40 tool handlers" is confirmed by the file rather than assumed.
`mcp server/src/server/create-server.ts:46-58` builds one `McpServer` and calls
`registerTools(server, ALL_TOOLS, context)`.

## 1. Transport-neutral dispatch

Current shape. `dispatchToolCall` is a module-private function at
`mcp server/src/server/tool-registry.ts:102-127`. It takes an `AnyToolDefinition`, a `ToolContext`,
and `unknown` args, and returns `Promise<CallToolResult>`, where `CallToolResult` is imported from
`@modelcontextprotocol/sdk/types.js` at `mcp server/src/server/tool-registry.ts:21`. It is reached
from exactly one caller, the `CallToolRequestSchema` request handler installed at
`mcp server/src/server/tool-registry.ts:194-205`, which itself lives inside `registerTools`
(`:169-206`) and needs the `McpServer` handle created at `:133`.

Two couplings block a CLI.

1. `McpServer` is only needed for registration and for `server.server.setRequestHandler`. The
   dispatch path needs neither. The index the dispatch uses is already built independently at
   `mcp server/src/server/tool-registry.ts:182-186` (`byName`).
2. `McpError` and `ErrorCode` are imported at `mcp server/src/server/tool-registry.ts:10-14` and used
   only to signal two things: a bad argument list (`:109-112`, `InvalidParams`) and an unknown tool
   (`:198-201`, `MethodNotFound`).

Proposal. Extract `mcp server/src/server/dispatch.ts` holding the index builder, the argument parse,
the placement split, and the error mapping, with zero SDK value imports. Then:

- `mcp server/src/server/tool-registry.ts` keeps `registerListedTool`, `listedInputSchema`, `defineTool`
  and `registerTools`, and imports `dispatchToolCall` and `buildToolIndex` from `dispatch.ts`.
- `mcp server/src/server/dispatch.ts` imports the result types from a new
  `mcp server/src/server/tool-result.ts` and never from `@modelcontextprotocol/sdk/types.js`.

On the result type. `mcp server/src/core/result.ts:11` imports `CallToolResult` only as a type, and
both builders are structurally simple: `successResult` returns `{ content: [{ type: 'text', text }],
structuredContent }` (`mcp server/src/core/result.ts:309-319`) and `errorResult` returns
`{ isError: true, content: [...], structuredContent: { code, message, details } }`
(`mcp server/src/core/result.ts:330-347`). Recommended sub-option: declare a local structural
interface (`ToolResult`) in `tool-result.ts`, have `result.ts` return it, and let the MCP registration
site keep receiving it because the interface is structurally assignable to `CallToolResult`. Reasoning:
the CLI then has no SDK type dependency at all, and `Core` stays free of transport words.

Rejected: keep `CallToolResult` and let the CLI import the SDK types type-only. Reason: type-only
imports erase at build, so this would work, but it leaves the CLI surface coupled to a transport
package's vocabulary for no gain, and a later `import { ... }` mistake silently adds a runtime
dependency.

Rejected: a copy of `dispatchToolCall` inside the CLI. Reason: the argument parse, the placement
split (`mcp server/src/server/tool-registry.ts:115-123`), and the `errorResult` mapping at `:124-126`
would drift, and the placement logic is exactly the code the naming bug in focus 5 depends on.

Rejected: reuse `createServer` from the CLI and drive it over an in-process transport. Reason:
`createServer` constructs `McpServer` (`mcp server/src/server/create-server.ts:50-53`), which expects
a transport and a lifecycle (`mcp server/src/index.ts:104-105`). The CLI needs one dispatch call and
one process, not a protocol lifecycle.

## 2. Argument errors returned as results, not protocol errors

Today a parse failure throws. The `safeParse` guard at `mcp server/src/server/tool-registry.ts:107-113`
sits outside the `try` block that begins at `:114`, so the `McpError` it throws escapes
`dispatchToolCall` and rejects the request handler, which the SDK turns into a JSON-RPC protocol
error. The message text is already good (`invalidArgumentsMessage`, `:65-77`, names the failing
paths), but the shape is wrong for a CLI: a protocol error carries no `structuredContent` and no code
from the fixed list.

Proposal. `dispatch.ts` returns `errorResult` for a parse failure:

- Error code `INVALID_INPUT`, which already exists in the fixed list
  (`mcp server/src/core/errors.ts:13`).
- `details.argumentErrors` as one entry per zod issue with `path`, `message`, and `code`, so an agent
  can repair a call from the JSON alone.
- The MCP adapter may keep a protocol error for unknown tools only, since an unknown tool is a client
  bug rather than a payload bug, and `ErrorCode.MethodNotFound` is what `:198-201` does today.

Rejected: keep the throw and let the CLI catch it. Reason: it discards the zod issue list, which is
the one thing that lets a terminal agent self-correct a flag.

Rejected: a JSON-RPC error code reused as an exit code. Reason: the two error surfaces are different
audiences, and the CLI needs stable process exit codes (section 5).

## 3. A separate entry, because `index.ts` self-runs

`mcp server/src/index.ts:126` executes `void main()` at module scope, and `package.json` maps
`bin: { "media-editor-mcp": "dist/index.js" }` and `main: "dist/index.js"`. Importing that module from
a CLI would start a stdio server.

Proposal. Add `mcp server/src/cli.ts` compiled to `dist/cli.js` and a second `bin` key
`media-editor` in `mcp server/package.json`. The MCP entry keeps its self-run and its stdin
close handling (`mcp server/src/index.ts:82-87`). Optionally add a
`process.argv[1] === fileURLToPath(import.meta.url)` guard to `index.ts` so the module is importable
in tests, which is additive and does not change the host contract.

Rejected: argv sniffing inside `index.ts` (branch on `process.argv[2] === "list"`). Reason: the MCP
host launches the binary with no tool argv, so the sniff would work, but the MCP entry would then own
two delivery contracts, and a bare invocation with no arguments becomes ambiguous between starting a
server and printing help.

Rejected: reusing `dist/index.js` as the CLI entry behind a `--cli` flag. Reason: the Desktop
extension spawns the server with no flags, and any flag parsing at that point is a new failure mode
in the path that currently works.

Build note, marked as inference: `tsconfig.build.json` compiles `src/` to `dist/` preserving the
relative layout, so adding `src/cli.ts` should emit `dist/cli.js` with no config change. I did not
run the compiler.

## 4. A config path that never feeds tool argv into `loadConfig`

The hazard is concrete. `loadConfig(env, argv, options)` (`mcp server/src/core/config.ts:410-414`)
runs `parseArguments(argv)` (`:418`), and `parseArguments` turns every token that does not start with
`--` into an allowed root candidate (`:167-172`, pushed at `:171`). So a CLI call such as
`media-editor image_convert --input a.png` would hand `a.png` and any other positional value to the
root list. Two mitigations exist in the loader today: a file is rejected as a root
(`canonicalRoot`, `:225-238`, with the file test at `:231-232`) and an unknown flag takes its value
along so the value never becomes a root (`:179-188`). Both only produce warnings
(`ignoredValue`, used at `:246` and `:271`), not a hard stop. A stray positional directory would
silently become an allowed root.

Proposal. Keep `loadConfig` unchanged and put a translator in front of it:

- `mcp server/src/cli/config-adapter.ts` accepts only CLI-level folder flags (`--allowed-dir`,
  `--output-dir`), a `--config <json>` file, and the existing `MEDIA_EDITOR_*` environment variables.
- It emits an argv that contains only `--allowed-dir <absolute>` and `--output-dir <absolute>` tokens,
  which are exactly the two names `parseArguments` knows
  (`mcp server/src/core/config.ts:84`, `:86`).
- Tool arguments live in a separate parsed structure and are never concatenated into the argv handed
  to `loadConfig`.

Second hazard to handle in the same place: `unknownVariableNames(env)` at
`mcp server/src/core/config.ts:421` warns for `MEDIA_EDITOR_*` names the loader does not know
(`ENV_PREFIX` at `:83`). A CLI-only variable such as a data folder override must be added to that
known set or every CLI run prints a warning.

Rejected: add a `--` separator concept to `parseArguments`. Reason: `config.ts` is shared with the MCP
boot path, and teaching it about the CLI surface inverts the dependency direction. The adapter can be
deleted without touching the server.

Rejected: environment variables only, no flags. Reason: a per-invocation `--output-dir` is the normal
terminal case, and the fixed-variable path already exists for the Desktop extension.

## 5. Exit codes plus SIGINT and SIGTERM cleanup

What exists. `mcp server/src/index.ts:23-88` has `isClosing`, `exitWithCode` with a stderr drain
(`:40-54`), `shutDown` (`:56-67`), and `armShutdown` wiring `SIGINT`, `SIGTERM`, `stdin` end, and an
already-ended stdin (`:69-88`). What does not exist: any reaping of running ffmpeg children.
`mcp server/src/core/process-runner.ts` kills a child only on its own timeout (`:471-477`, `child.kill()`
then `SIGKILL` after `killGraceMs`), tracks concurrency in counters (`:138-139`), and exposes
`removePaths` (`:650`), `cleanUpAfterFailure` (`:677`), and `withTempDir` (`:695`). `runProcess` does
clean up on failure (`:767-769`), but a SIGINT while ffmpeg runs ends the Node process, leaves the
child writing, and leaves the temp folder behind.

Proposal.

- Add a live-child registry in `mcp server/src/core/process-runner.ts` and an exported
  `terminateLiveChildren(graceMs)`, and add the same for temp directories allocated through
  `withTempDir`.
- In `mcp server/src/cli.ts`, arm `SIGINT` and `SIGTERM` to stop starting work, call
  `terminateLiveChildren`, remove registered temp folders, then exit.
- Exit codes, a convention choice with no local precedent, marked as inference:
  `0` success, `1` tool failure, `2` usage or argument error, `3` configuration failure,
  `130` SIGINT, `143` SIGTERM.

Note the deliberate divergence: `index.ts` exits `0` on a signal (`:66`), which is right for a
host-managed server and wrong for a terminal CLI where `128 + signal` is the shell convention.

Rejected: rely on `process.exit()` alone. Reason: it does not reap children, and an orphaned ffmpeg
keeps writing into the export folder, which is the same class of defect as the focus 5 placement bug.

Rejected: a `--keep-temp` flag now. Reason: no observed need, and the stderr sanitizer already hides
the temp path (`sanitizeStderr`, `mcp server/src/core/process-runner.ts:604`).

## Ruled out this iteration

1. Copying `dispatchToolCall` into the CLI.
2. Keeping the CLI coupled to `CallToolResult` from the MCP SDK.
3. Driving `createServer` over an in-process transport for a one-shot call.
4. Argv sniffing inside `index.ts`.
5. Teaching `loadConfig` about CLI separators.
6. Environment-variable-only configuration.
7. `process.exit()` without child reaping.

## Inferences recorded as inferences

- The `tsconfig.build.json` emit layout for a new `src/cli.ts`.
- The exit-code table, including `130` and `143`.
