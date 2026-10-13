# Iteration 002 - CLI surface and output

Focus: the command surface (`list`, `describe <tool>`, `<tool>` with JSON arguments by flag, file, or
stdin), stdout JSON taken from `structuredContent`, the preview written to a file instead of base64,
per-call startup cost, a persistent capability and resolver cache, and one shared
`MEDIA_EDITOR_DATA_DIR`.

Sources read this iteration: `mcp server/src/tools/media/preview.ts`,
`mcp server/src/tools/media/setup-ffmpeg.ts`, `mcp server/src/tools/media/health.ts`,
`mcp server/src/server/server-info.ts`, `mcp server/src/core/capabilities.ts`,
`mcp server/src/core/ffmpeg-resolver.ts`, `mcp server/src/core/config.ts`, plus three measurements I
ran with `node` and `/usr/bin/time` in `mcp server/`.

## 1. Measured per-call startup cost

Four measurements on this machine, each a cold `node` process, `real` seconds:

- `node -e "0"` baseline: 0.02
- `import('ffmpeg-static')`: 0.02
- `import('sharp')`: 0.19
- `import('./dist/server/all-tools.js')`, which pulls every tool module: 0.21

So the whole tool graph costs about 0.21 seconds per process, and `sharp` is almost all of it. For an
MCP server started once per host session this is irrelevant. For a CLI invoked once per edit it is
paid on every call, and it is paid even by `list` and `describe`, which need names and schemas but no
image decoder.

## 2. Command surface

Proposal, three subcommands plus the default tool form.

- `media-editor list` prints one row per registered tool: `name`, `title`, and the first line of
  `description`. Source of truth is `ALL_TOOLS` at `mcp server/src/server/all-tools.ts:57-98`.
- `media-editor describe <tool>` prints the JSON Schema for that tool's listed input, which means
  `listedInputSchema` from `mcp server/src/server/tool-registry.ts:91-100` including the two injected
  placement fields `fileName` and `subfolder` (`:95-99`).
- `media-editor <tool> [--key value ...]` dispatches one call.

For `describe`, zod can emit the schema itself. Verified in this repository: `zod` resolves to
4.6.5 and `z.toJSONSchema` is a function. So `describe` needs no new dependency. An earlier assumption
that a `zod-to-json-schema` package would be required is withdrawn.

Arguments arrive in three forms, in this precedence order: `--args-file <path>`, then stdin when
stdin is not a TTY and `--args-file` is absent, then individual flags. Individual flags accept both
`--key value` and `--key=value`. The raw value is parsed as JSON when it parses, and taken as a
string when it does not, so `--subfolder true` becomes boolean true and `--inputs '["a.png","b.png"]'`
becomes an array. Flags may repeat to build an array, which matters because several tools take a list
(for example `mcp server/src/tools/image/batch-resize.ts`).

A defect to fix at the same time, verified by running it: `z.object(...)` strips unknown keys silently.
`z.object({a: z.string()}).safeParse({a: 'x', typo: 1})` returns `{ success: true, data: { a: 'x' } }`.
The dispatch parse at `mcp server/src/server/tool-registry.ts:107` uses exactly
`z.object(listedInputSchema(definition))`, so a mistyped flag is dropped without any error today, on
MCP as well as on the CLI. For the CLI this is worse, because a shell typo is more likely and there is
no schema prompt in front of the user. Proposed fix, scoped to the CLI surface: after parsing, compare
the caller's key set with the schema's key set and add a `warnings` entry naming every ignored key.

Rejected: `--key=value` with string-only semantics. Reason: several fields are arrays and several are
numbers or booleans, and a string-only parser turns a valid call into an `INVALID_INPUT` failure with
no hint about the encoding.

Rejected: a positional argument form such as `media-editor image_convert in.png out.webp`. Reason: 40
tools have divergent field names, and a positional form would need a per-tool mapping table that
duplicates the zod schemas.

Rejected: reading arguments only from a JSON file. Reason: interactive terminal use is the point.

## 3. stdout JSON from `structuredContent`

Success already carries a machine-readable payload: `successResult` sets `structuredContent` to
`{ tool, outputs, warnings, elapsedMs, ...extras }` (`mcp server/src/core/result.ts:217-233`, `:309-319`).
Failure carries `{ code, message, details }` plus `isError: true` (`:330-347`).

Proposal. stdout receives exactly that object, not the envelope. One JSON object per invocation.
Pretty-printed when stdout is a TTY, compact otherwise. The text block (`:314`) is available behind a
`--text` flag and is never mixed into stdout. On failure the JSON still goes to stdout and the exit
code is 1, so `media-editor image_probe --input x.png | jq .code` works for both outcomes.

Rejected: printing the whole `CallToolResult`. Reason: every consumer would have to unwrap
`structuredContent` and ignore `content`, and the unwrapping is exactly the MCP shape the CLI exists
to avoid.

Rejected: writing the failure to stderr only. Reason: it breaks the pipe case above, and stderr stays
reserved for warnings and the log lines `writeLog` already produces (`mcp server/src/index.ts:100`).

## 4. The preview as a file instead of base64

`previewFrom` builds a JPEG at most 512 pixels on the longest side, quality 70, and returns
`{ type: 'image', data: jpeg.toString('base64'), mimeType: 'image/jpeg' }`
(`mcp server/src/tools/media/preview.ts:38-44`, constants at `:29-32`). `withPreviewBlock` appends
that block to the result `content` (`:119-124`).

Base64 in a terminal is 4/3 the bytes, unreadable, and it lands in stdout where a pipe expects JSON.
Proposal: in the CLI, `preview: true` writes the JPEG to a file and reports the path instead of the
inline block, using a new `--preview-out <path or dir>` flag with a default of a `previews` folder
under the data dir. The `structuredContent` gains `previews: [{ path, mimeType, bytes }]`. The MCP
path keeps the image block unchanged, because a chat client can render it.

Rejected: drop preview from the CLI. Reason: "so the picture can be seen before naming the file" is
the documented reason the field exists (`mcp server/src/tools/media/preview.ts:56-59`), and that
reason applies more strongly on the CLI where the user is the one naming the file.

Rejected: leave the base64 in a `--json` field. Reason: it inflates the payload for every consumer
that only wants the path, and no terminal renders it.

## 5. A persistent capability and resolver cache in the data folder

Both caches are per-process today.

- Capabilities: a module-level `capabilityCache` keyed by binary path (`mcp server/src/core/capabilities.ts:366-386`,
  written at `:379`, dropped on failure at `:381-385`, cleared by `dropCapabilities` at `:394` and
  `resetCapabilityCache` at `:401`). Reading the lists spawns ffmpeg.
- Resolver: `cache`, `cacheStamps`, and `inflight` maps (`mcp server/src/core/ffmpeg-resolver.ts:446-449`),
  with a staleness test that compares size and `mtimeMs` against the accepted file
  (`readCache`, `:467-485`, the comparison at `:476-480`).

One process per CLI call means one ffmpeg `-encoders` and `-filters` read and one `-version` read per
call, at minimum.

Proposal. Persist both to the existing data folder as `<dataDir>/cache/capabilities.json` and
`<dataDir>/cache/resolved.json`, keyed by binary absolute path, and validated with the same
size-and-mtime test `readCache` already uses (`mcp server/src/core/ffmpeg-resolver.ts:476-483`) plus the
ffmpeg version string. Three rules make it safe:

1. The persisted capability entry is advisory. `assertCapabilities`
   (`mcp server/src/core/capabilities.ts:441-460`) still runs, and any real ffmpeg failure must drop
   the persisted entry as well as the in-memory one, mirroring `:381-385`.
2. The persisted resolver entry never bypasses the override branch, which rejects a bad user path in
   `inspectOverride` (`mcp server/src/core/ffmpeg-resolver.ts:487-514`). A cache hit on an override
   must still confirm the file exists and is executable.
3. `media-editor describe` and `list` must not need the cache at all, so a corrupt cache cannot break
   the discovery commands.

Rejected: cache only the schema manifest and leave capabilities uncached. Reason: the capability read
is the expensive one, and it spawns ffmpeg twice (encoders then filters) on every tool call.

Rejected: put the cache in a project-local folder. Reason: it duplicates state per working directory
and breaks the sharing requirement in section 6.

## 6. One shared `MEDIA_EDITOR_DATA_DIR`

The data folder is already shared by construction: `DATA_DIR_ENV` is `MEDIA_EDITOR_DATA_DIR`
(`mcp server/src/core/config.ts:92`), `defaultDataDir` resolves per platform to Application Support,
APPDATA, or XDG_DATA_HOME (`:375-400`), `media_setup_ffmpeg` installs into `path.join(dataDir, 'bin', ...)`
(`mcp server/src/tools/media/setup-ffmpeg.ts:252` for the planned destination), and the resolver reads
the install record back from `path.join(config.dataDir, 'bin', 'install.json')`
(`mcp server/src/core/ffmpeg-resolver.ts:569`).

The CLI requirement is therefore negative plus one addition: the CLI must not invent a data folder and
must not default to a project-local one, and the cache from section 5 goes into the same folder.
Because `media_health` reports whatever the resolver found, a `media-editor media_setup_ffmpeg` call
followed by `media-editor media_health` then sees the same install, which is the cross-call property
the MCP server gives today through its longer-lived process.

One trap: `unknownVariableNames` warns for unrecognized `MEDIA_EDITOR_*` variable names
(`mcp server/src/core/config.ts:421`, prefix constant at `:83`). Any new CLI variable must be
registered there or every run prints a warning.

Rejected: a per-project `.media-editor/` folder inside the export root. Reason: `path-guard` roots are
caller-configured, the data folder is already platform-correct, and a project-local folder would be
written into a directory the user considers theirs.

## 7. Keeping `describe` fast

Given section 1, the honest options are:

(a) Build a schema manifest at build time. A new script beside the existing ones
(`mcp server/scripts/`) writes `dist/tools.json` containing every tool's name, title, description,
annotations, and `z.toJSONSchema` output. `list` reads it with no tool import. `describe` reads it
too. The default tool form imports only the invoked tool module through a name-to-module map.
(b) Keep importing `ALL_TOOLS` and accept 0.21 seconds. `list` and `describe` then cost the full
graph.

Recommendation: (a). It also creates the single place where declared names and descriptions live, which
focus 5 needs.

Rejected: lazy `import()` inside each tool definition to defer `sharp`. Reason: `sharp` is imported at
the top of the tool module (`mcp server/src/tools/media/preview.ts:12` is one of ten files that import
it), so the deferral would require splitting every tool file into a schema half and a handler half, 40
files of churn before the CLI exists.

## Ruled out this iteration

1. `--key=value` with string-only semantics.
2. Positional arguments mapped per tool.
3. JSON-file-only input.
4. Printing the whole `CallToolResult` to stdout.
5. Failure output on stderr only.
6. Dropping preview from the CLI, or leaving base64 in the JSON.
7. Caching only schemas and not capabilities.
8. A project-local cache or data folder.
9. Lazy imports inside tool definitions to defer `sharp`.

## Inferences recorded as inferences

- The `dist/tools.json` manifest script is a design, not an existing artifact.
- The absolute timing numbers are from this machine only and I did not measure a warm-cache repeat.
