# Iteration 1: CLI Core

## Focus

Determine how a new `media-editor` CLI can call the same 40 registered handlers without starting the MCP stdio server, while returning validation failures as ordinary tool results and shutting down safely.

## Findings

1. `ALL_TOOLS` is already the canonical ordered array of tool definitions. I counted 40 entries at `mcp server/src/server/all-tools.ts:57-98`. `createServer` passes that array to `registerTools` by default at `mcp server/src/server/create-server.ts:43-56`. The CLI should consume this same array and must not create a parallel command-to-handler table.

2. `dispatchToolCall` contains the shared behavior needed by both transports: zod parsing of the listed schema, placement-field extraction, placement-aware context construction, handler invocation, and conversion of handler throws through `errorResult` at `mcp server/src/server/tool-registry.ts:102-127`. It is currently private and validation failure throws `McpError(InvalidParams)` at lines 107-113. `registerTools` also owns the MCP server registration and protocol request handler at lines 129-143 and 169-205. Extract or export dispatch as a transport-neutral function, leaving the server registration in an MCP adapter.

3. Validation failures should follow the same result path as other tool failures. `errorResult` returns `isError`, a text content entry, and structured `code`, `message`, and `details` at `mcp server/src/core/result.ts:321-346`. The current error-code list has no invalid-arguments code at `mcp server/src/core/errors.ts:12-28`, so add a stable CLI argument code or a dedicated validation-result helper. The existing MCP tests expect schema failures to reject as protocol `INVALID_PARAMS` at `mcp server/tests/server/registry.vitest.ts:201-225`. The behavior change therefore needs matching test updates while retaining the existing unknown-tool protocol error at lines 192-199.

4. Keep the CLI in a new entry such as `src/cli.ts`. The current `src/index.ts` invokes `main()` at module load at line 126, and its `main` loads config, creates the MCP server, and connects stdio at lines 94-105. Importing that entry from a CLI would start the MCP transport as a side effect.

5. Separate CLI command parsing from configuration parsing. `loadConfig` accepts environment plus argv and documents bare folder paths as arguments at `mcp server/src/core/config.ts:400-418`. Its parser turns every non-flag token into an allowed root at lines 155-175. The existing server passes `process.argv.slice(2)` directly at `mcp server/src/index.ts:94-99`. A CLI must consume `--config <path>`, command names, and JSON argument sources in its own parser, then call a config loader with only config-specific values or an empty argv. The current `loadConfig` signature does not itself accept a config file path at lines 410-414, so JSON config loading belongs in a separate bootstrap layer.

6. Signal handling needs a CLI-specific cancellation path. The MCP entry catches SIGINT and SIGTERM and closes the server at `mcp server/src/index.ts:56-88`. The process runner starts a local child in `spawnAndWait` at `mcp server/src/core/process-runner.ts:360-374`, and only its timeout path kills that child with a grace period at lines 466-479. `withTempDir` removes its folder in `finally` at lines 687-702. Proposed CLI behavior: a shared abort controller stops active children, the CLI awaits dispatch settlement so tool `finally` cleanup runs, then it exits with documented statuses. This process registry and signal-to-cancellation path are recommendations, not existing runtime behavior.

7. The registry tests already cover successful result passthrough, handler exceptions, unknown tools, bad argument types, and missing fields at `mcp server/tests/server/registry.vitest.ts:158-225`. Extend that coverage around the exported dispatcher and CLI contract. No tests were run in this research iteration.

## Sources Consulted

- `AI Systems/Media Editor/mcp server/src/server/all-tools.ts:57-98`
- `AI Systems/Media Editor/mcp server/src/server/create-server.ts:43-56`
- `AI Systems/Media Editor/mcp server/src/server/tool-registry.ts:102-205`
- `AI Systems/Media Editor/mcp server/src/core/result.ts:301-346`
- `AI Systems/Media Editor/mcp server/src/core/errors.ts:12-28`
- `AI Systems/Media Editor/mcp server/src/core/config.ts:155-175,400-451`
- `AI Systems/Media Editor/mcp server/src/core/process-runner.ts:360-479,687-702`
- `AI Systems/Media Editor/mcp server/src/index.ts:56-126`
- `AI Systems/Media Editor/mcp server/tests/server/registry.vitest.ts:158-225`
- The lineage `steer.md` was checked before this iteration and does not exist.

## Assessment

- `newInfoRatio`: 1.0
- Novelty justification: This is the first pass and established the exact shared handler array, protocol-coupled dispatch boundary, argv hazard, self-running MCP entry, and current child and temp cleanup mechanics.
- Confidence: High for the current code paths. The cancellation registry and result-code design are recommendations that need implementation and verification.

## Reflection

- What worked: Counting the canonical tool array and tracing registration from `createServer` into validation, placement, and handler error conversion.
- What failed: The existing dispatcher combines handler behavior with MCP validation errors, so direct reuse requires a boundary change.
- Ruled out: Starting the MCP stdio server as a child process for each CLI call. That retains the transport lifecycle and couples CLI output to protocol framing. This rejection is a design inference from the separate stdio entry and handler registry.
- Ruled out: A separately maintained CLI handler list. It duplicates the canonical 40-entry array and creates a drift point.

## Recommended Next Focus

Iteration 2: define `list`, `describe`, JSON argument input, structured stdout, preview-file output, per-call startup cost, persistent capability and resolver caches, and the shared data directory.
