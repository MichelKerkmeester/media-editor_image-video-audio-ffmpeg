# Iteration 2: CLI Surface and Output

## Focus

Define `list`, `describe <tool>`, JSON arguments by flag, file, or stdin, machine-readable output, preview-file handling, and data that must persist between separate CLI invocations.

## Findings

1. Tool definitions contain a Zod input shape and metadata. `listedInputSchema` adds `fileName` and `subfolder` when output placement applies, and the registry publishes title, description, schema, and annotations at `mcp server/src/server/tool-registry.ts:91-99,129-139`. Zod is already a direct dependency at `mcp server/package.json:24-29`, and the installed Zod v4 type exposes `toJSONSchema` at `mcp server/node_modules/zod/v4/classic/schemas.d.ts:7-18`. Recommended `describe <tool>` implementation: resolve the name in `ALL_TOOLS`, build `z.object(listedInputSchema(definition))`, and call `toJSONSchema()` so placement parameters appear in the caller-facing schema. `list` should emit the existing tool order with name, title, and description. This does not require a second JSON Schema dependency.

2. For `<tool>`, accept exactly one argument source: `--args-json <json>`, `--args-file <path>`, or stdin when no flag is present. Parse the resulting object before dispatch. These are CLI syntax recommendations. They keep JSON tool fields away from `loadConfig`, whose bare-token behavior was established in iteration 1.

3. Print one JSON value from `structuredContent` to stdout and send diagnostics to stderr. The common success builder always includes `structuredContent` at `mcp server/src/core/result.ts:300-319`, and the error builder also gives structured error details at lines 321-346. The CLI can preserve tool output structure without scraping human text. Exit nonzero when the result has `isError` and reserve separate statuses for CLI syntax or termination.

4. Preview data is outside `structuredContent` today. `previewFrom` converts the JPEG buffer to a base64 string in an MCP image block at `mcp server/src/tools/media/preview.ts:38-45`, and `withPreviewBlock` appends that block to `content` at lines 119-123. Both `image_probe` and `media_probe` can append the preview block at `mcp server/src/tools/image/probe.ts:139-154` and `mcp server/src/tools/media/probe.ts:361-398`. The CLI adapter should decode the image block, write a JPEG to a caller-selected path or a managed `MEDIA_EDITOR_DATA_DIR` preview area, replace base64 with `previewPath` metadata, then print JSON. A managed preview area needs bounded cleanup. This recommendation is CLI-specific and leaves the MCP Project image block intact.

5. Resolver and capability caches are process-local maps. `capabilityCache` maps binary path to an in-flight or completed promise at `mcp server/src/core/capabilities.ts:163,348-386`. The resolver maps tool name to a `CacheEntry` and in-flight lookup at `mcp server/src/core/ffmpeg-resolver.ts:446-449`. Resolver hits are revalidated against file existence, size, and modification time at lines 467-485. Tests already cover capability reuse and invalidation at `mcp server/tests/core/capabilities.vitest.ts:349-420`, plus resolver reuse and size or mtime changes at `mcp server/tests/core/ffmpeg-resolver.vitest.ts:809-861`. A one-shot CLI process loses these maps on exit. Persist only validated metadata under the data directory, using atomic writes and a versioned schema. Cache keys should include platform, architecture, config overrides, PATH identity, and data directory. Re-stat cached binaries on each process start, retain pinned install hash checks for installed binaries at `mcp server/src/core/ffmpeg-resolver.ts:552-584`, do not persist misses, and invalidate on setup or failure. These persistence details are recommendations.

6. `MEDIA_EDITOR_DATA_DIR` is an accepted config environment variable at `mcp server/src/core/config.ts:87-103`. The loader uses it for `config.dataDir` at lines 410-451 and falls back to a platform-specific default when unset at lines 324-340. `media_setup_ffmpeg` installs under `config.dataDir/bin` and writes install metadata in that tree at `mcp server/src/tools/media/setup-ffmpeg.ts:433-475,565-575`. `media_health` reports resolver, capability, and `dataFolder` values from its context at `mcp server/src/tools/media/health.ts:176-205`. Set the same absolute `MEDIA_EDITOR_DATA_DIR` for every CLI invocation so setup and health share the install and cache state.

7. A per-call CLI still pays for process startup and imports the tool registry. `ALL_TOOLS` statically imports the tool modules at `mcp server/src/server/all-tools.ts:9-50`, while its 40 definitions are enumerated at lines 57-98. Persistent cache removes repeated probing, not Node startup. Measure cold process startup separately from handler time. Start with one process per invocation. A resident daemon is a possible later optimization only if measurements show startup is material.

## Sources Consulted

- `AI Systems/Media Editor/mcp server/src/server/tool-registry.ts:91-99,129-139`
- `AI Systems/Media Editor/mcp server/src/server/all-tools.ts:9-50,57-98`
- `AI Systems/Media Editor/mcp server/src/core/result.ts:300-346`
- `AI Systems/Media Editor/mcp server/src/tools/media/preview.ts:38-45,119-123`
- `AI Systems/Media Editor/mcp server/src/tools/image/probe.ts:139-154`
- `AI Systems/Media Editor/mcp server/src/tools/media/probe.ts:361-398`
- `AI Systems/Media Editor/mcp server/src/core/capabilities.ts:163,348-403`
- `AI Systems/Media Editor/mcp server/src/core/ffmpeg-resolver.ts:446-485,552-584,666-693`
- `AI Systems/Media Editor/mcp server/src/core/config.ts:87-103,324-340,410-451`
- `AI Systems/Media Editor/mcp server/src/tools/media/setup-ffmpeg.ts:433-475,565-575`
- `AI Systems/Media Editor/mcp server/src/tools/media/health.ts:176-205`
- `AI Systems/Media Editor/mcp server/tests/core/capabilities.vitest.ts:349-420`
- `AI Systems/Media Editor/mcp server/tests/core/ffmpeg-resolver.vitest.ts:809-861`
- `AI Systems/Media Editor/mcp server/package.json:24-29`
- `AI Systems/Media Editor/mcp server/node_modules/zod/v4/classic/schemas.d.ts:7-18`
- The lineage steer review at `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/lineages/luna/steer.md:1-22`

## Assessment

- `newInfoRatio`: 0.95
- Novelty justification: This pass uncovered the base64 preview boundary, the exact in-memory cache keys and invalidation behavior, and how setup and health share the configured data directory.
- Confidence: High for the local tool result, preview, cache, and data-directory code. File-based cache design and CLI syntax are recommendations that need measurement and tests.

## Reflection

- What worked: Tracing the probe result through preview helpers and comparing process-local cache logic with the cross-call CLI lifecycle.
- What failed: The existing module caches cannot preserve resolver or capability work after a one-shot CLI exits.
- Ruled out: Returning base64 preview bytes on stdout. It enlarges and obscures a machine-readable response when a file path can carry the image.
- Ruled out: Adding a resident daemon before measuring cold startup. The daemon adds lifecycle and cache-coherency work, while a persisted cache already addresses repeated binary resolution and capability scans.

## Recommended Next Focus

Iteration 3: plugin distribution, `${CLAUDE_PLUGIN_ROOT}` access, plugin `bin/` PATH behavior, pinned ffmpeg and per-platform sharp, standalone installation, and preserving the dist layout.
