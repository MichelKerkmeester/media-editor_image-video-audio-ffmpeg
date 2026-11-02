# Iteration 2: CLI Surface and Output

## Focus

Design the CLI's own surface over the same 40 handlers: verbs (`list`, `describe`, `<tool>`),
JSON argument intake (flag, file, stdin), stdout shape from `structuredContent`, writing previews to
files instead of base64, the per-call startup cost with a persistent capability and resolver cache,
and the shared `MEDIA_EDITOR_DATA_DIR` that lets `media_setup_ffmpeg` and `media_health` work across
separate processes.

## Findings

### F2.1 The tool surface is exactly 40 definitions in a single exported list

`ALL_TOOLS` is one readonly array of 40 tool definitions
(`mcp server/src/server/all-tools.ts:57-98`, counted with
`sed -n '57,98p' ... | grep -c "Tool,"` which returned 40). The names come back as `name` on each
definition (`mcp server/src/server/tool-registry.ts:41`). A CLI can therefore enumerate tools from
that one list and never keep a second registry. This is the second half of the F1.1 seam: one list,
one dispatch, two transports.

The names themselves are also constrained by `ToolName` in `capabilities.ts:153`, derived from
`TOOL_NAMES` (`mcp server/src/core/capabilities.ts:151-153`), and every name has a row in
`TOOL_REQUIREMENTS` (`:177-...`). Adding a CLI does not change that map.

**Rejected option:** generate the CLI's `list` output from a checked-in JSON manifest. Rejected
because `ALL_TOOLS` and `TOOL_REQUIREMENTS` already key on the same union, and a third list would
drift on the first rename.

### F2.2 `describe` can produce JSON Schema from zod with the installed zod, no new dependency

The installed zod is 4.6.5 (`node -e "require('./mcp server/node_modules/zod/package.json').version"`).
`z.toJSONSchema` is present as a function in that install
(`node -e "const z=require('./mcp server/node_modules/zod') then console.log(typeof z.toJSONSchema)"`
printed `function`). So `describe <tool>` is
`z.toJSONSchema(z.object(listedInputSchema(definition)))` plus the tool's `title`, `description` and
`annotations` (`tool-registry.ts:41-45`), and the placement fields come along for free because
`listedInputSchema` composes them (`:91-100`).

This is worth calling out because it means `describe` reports exactly what the MCP client would
receive, including `fileName` and `subfolder`, and the live-bug surface from focus 5 becomes
inspectable from a terminal (`mcp server/src/server/field-schemas.ts:62-80`).

**Rejected option:** hand-maintained `--help` text per tool. Rejected because description text is
already the authority in the schema and there are two copies to keep in step, not three.

**Rejected option:** shell out to the MCP server's `tools/list` and parse it. Rejected because the
CLI would then need a live server process, which the fixed decision that the plugin registers no
MCP server forbids.

### F2.3 Argument intake should accept one JSON object, three ways, and no per-field flags

The handlers take a flat object of typed fields, and the schema parse is
`z.object(listedInputSchema(definition)).safeParse(args)` (`tool-registry.ts:107`). That is exactly
one JSON object. Three intake modes cover every caller:

| Mode | Form | When |
| --- | --- | --- |
| Flag | `media-editor image_convert --args '{"inputPath":...}'` | Default, scripted |
| File | `media-editor image_convert --args-file call.json` | Long or generated payloads |
| Stdin | `media-editor image_convert --args -` or no `--args` with piped stdin | Piping from another tool |

The flag value is parsed with `JSON.parse` and handed to dispatch unchanged, which means the CLI
never re-declares a field and never re-implements defaults. A zod parse failure returns the
argument error result from F1.2 and exits 2.

**Rejected option:** per-field CLI flags such as `--input-path x --format webp --quality 80`.
This is the most familiar CLI shape and it is the wrong one here. It needs a mapping from 40 schemas
to argv, it cannot express nested or array fields without a mini-language, and it duplicates the
default values that already live in the zod schemas (`mcp server/src/tools/image/convert.ts:162-163`
shows a `.default(80)` that a flag layer would have to mirror). It also silently disagrees with MCP
on type coercion, since argv is all strings.

**Rejected option:** positional JSON as the tool's only argument. Ambiguous with the `list` and
`describe` verbs and awkward for paths with spaces.

### F2.4 stdout should carry `structuredContent`, and the human line should go to stderr

`successResult` writes two things at once: a one-line `content[0].text` and the
`structuredContent` object with `tool`, `outputs`, `warnings`, `elapsedMs` and tool extras
(`mcp server/src/core/result.ts:309-319`, `:217-233`). `errorResult` writes
`structuredContent` with `code`, `message`, `details` and `isError: true` (`:330-347`).

The clean CLI contract is:

- stdout gets `JSON.stringify(structuredContent)` on success and on handler failure,
- stderr gets the same one-line summary a client would show (`content[0].text`), so a human
  reading a terminal sees the summary and a script sees pure JSON,
- no JSON is ever printed for `list` and `describe` on stderr, those are stdout-only.

This keeps the handler contract untouched: the CLI reads the fields the server already sends to an
MCP client. `outputs[].path` is already absolute (`core/result.ts:42-43`), so a script can chain
calls by reading `.outputs[0].path` without any CLI-specific shape.

**Rejected option:** print `content[0].text` to stdout as the primary output. Rejected because it
drops `outputs[].bytes`, `elapsedMs` and every tool extra, which is the information the skill needs
to report a size target such as the live bug's "under 100 KB".

**Rejected option:** wrap the result in a CLI envelope such as `{ok, data, error}`. Rejected because
it invents a second contract to keep in step with `CallToolResult`. `isError` already carries the
success and failure split (`core/result.ts:334`).

### F2.5 Preview must become a file path, since base64 image blocks are useless on a pipe

`previewFrom` resizes with sharp and returns
`{ type: 'image', data: jpeg.toString('base64'), mimeType: 'image/jpeg' }`
(`mcp server/src/tools/media/preview.ts:38-45`). `withPreviewBlock` appends that block to
`result.content` (`:120-126`). A CLI printing that JSON would emit a base64 blob with no consumer.
A terminal agent that wants to look at the picture needs a path it can open.

Design: keep `imagePreview` and `videoPreview` returning `ImageContent` so the MCP surface is
unchanged (`preview.ts:68-70`, `:83-119`), and add a CLI-side adapter that, when a result contains
an image block, writes the bytes to a file under the data folder's `previews/` subdirectory and
replaces the block with `{ previewPath }` in the JSON that goes to stdout. The temp folder the
video path already uses is removed by `withTempDir`
(`preview.ts:89`, and the runner's `tempDir` handling), so the write must land somewhere durable
before that returns.

Two consequences worth recording. First, the preview path must be printed to stderr as well, since
the one-line summary is what a human reads. Second, the CLI needs a policy on preview file
accumulation: the simplest is one file per call named from the tool name plus a timestamp under
`<dataDir>/previews/`, with no automatic deletion.

**Rejected option:** keep base64 in stdout and let the caller decode. Rejected on size, since a
512-pixel JPEG at quality 70 runs tens of kilobytes of base64 that a shell caller cannot use
without a decoder, and stdout JSON is meant to be readable by a model.

**Rejected option:** write the preview to the export root beside the outputs. Rejected because it
puts a non-deliverable into the folder the user is asked to review, which is the same class of
mistake the live bug made.

### F2.6 The capability cache is in-process only, and the resolver's durable state is a file, so the CLI needs one thing and gets one thing free

`capabilityCache` is a module-level `Map<string, Promise<Capabilities>>`
(`mcp server/src/core/capabilities.ts:163`) with `dropCapabilities` and `resetCapabilityCache`
builders (`:394-402`). It dies with the process. Spawning ffmpeg once per CLI call to re-read the
encoder and filter lists is real per-call cost, and the read has a 30 second timeout
(`capabilities.ts:156`).

The resolver half is already durable. `resolveBinary` reads the install record at
`path.join(config.dataDir, 'bin', 'install.json')` (`mcp server/src/core/ffmpeg-resolver.ts:569`)
and checks the installed binary's digest against both the record and the pin (`:570-573`), and the
data dir is part of the resolver's config slice
(`ffmpeg-resolver.ts:135`, `BinaryConfig`).

So the CLI needs exactly one addition: a JSON capability cache file under the data folder, keyed by
the resolved binary path plus its size and mtime, holding the encoder and filter lists. On each CLI
call, `getCapabilities` (`mcp server/src/server/tool-context.ts:344-373`) checks the in-process map,
then the file, then runs ffmpeg. Staleness is handled by the same key the resolver uses plus the
existing `invalidateBinary` and `dropCapabilities` calls on spawn failure (`:356-363`), which must
also delete the file entry.

Note the second-order effect: `getCapabilities` already retries once after a spawn failure and
invalidates on that path (`tool-context.ts:355-372`), so the cache writer is inside an
already-guarded path.

**Rejected option:** no cache, accept roughly one extra ffmpeg spawn per call. Rejected because
`media_health` and every encode already resolve and read capabilities, and the CLI is the surface
most likely to be called in a loop by an agent.

**Rejected option:** a daemon or a long-lived CLI server process. Rejected as a much larger change
that reproduces the MCP transport's lifetime problems, and the fixed decision says the plugin
registers no MCP server, not that it runs a background process.

### F2.7 The shared `MEDIA_EDITOR_DATA_DIR` is already the mechanism, and it is what makes setup and health coherent across calls

The env constant is `MEDIA_EDITOR_DATA_DIR` (`mcp server/src/core/config.ts:92`) and it is read by
`readDataDir`, which accepts an absolute path that is not an existing file and otherwise falls back
to the platform default (`:324-341`, defaults at `:375-397`). Absent the variable, macOS resolves
`~/Library/Application Support/media-editor` (`:388-390`).

Three consumers make the sharing load bearing:

- `media_setup_ffmpeg` writes the downloaded binary to `path.join(dataDir, 'bin', <file>)`
  (`mcp server/src/tools/media/setup-ffmpeg.ts:252`) and reports that destination in its plan
  (`:565`).
- `resolveBinary` finds that same `bin` folder and validates its digest
  (`mcp server/src/core/ffmpeg-resolver.ts:646`, `:569-573`).
- `media_health` reports `dataFolder` in its extras (`mcp server/src/tools/media/health.ts:204`).

Because each CLI call is a new process, a user who runs `media-editor media_setup_ffmpeg` in one
shell and then `media-editor media_health` in another gets a coherent answer only if both processes
see the same `dataDir`. The default already guarantees that on one machine. The gap is in an
isolated environment, where a caller sets a per-session data folder and then loses the binaries on
the next call.

Design: the CLI exports `MEDIA_EDITOR_DATA_DIR` into the environment it passes to nothing (the
handlers read the config, not the env), so the real requirement is that the CLI does not override
`dataDir` per call. Recommended: document that the CLI must not add a `--data-dir` flag, and let
the env variable and the platform default be the only two sources, which matches
`readDataDir` exactly (`config.ts:324-341`). A `--data-dir` flag would let one invocation install an
ffmpeg that the next invocation cannot see, which is the failure mode this finding is about.

**Rejected option:** a per-project data folder derived from the allowed roots. Rejected because it
would silently duplicate the ffmpeg download per project and break the resolver's install record
lookup (`ffmpeg-resolver.ts:569`).

## Sources Consulted

- `AI Systems/Media Editor/mcp server/src/server/all-tools.ts` (`:57-98`)
- `AI Systems/Media Editor/mcp server/src/server/tool-registry.ts` (`:41-45`, `:91-100`, `:107`)
- `AI Systems/Media Editor/mcp server/src/core/result.ts` (`:42-43`, `:217-233`, `:309-347`)
- `AI Systems/Media Editor/mcp server/src/tools/media/preview.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/core/capabilities.ts` (`:151-163`, `:394-402`)
- `AI Systems/Media Editor/mcp server/src/core/ffmpeg-resolver.ts` (`:135`, `:569-573`, `:646`)
- `AI Systems/Media Editor/mcp server/src/server/tool-context.ts` (`:344-373`)
- `AI Systems/Media Editor/mcp server/src/core/config.ts` (`:92`, `:324-341`, `:375-397`)
- `AI Systems/Media Editor/mcp server/src/tools/media/setup-ffmpeg.ts` (`:252`, `:565`)
- `AI Systems/Media Editor/mcp server/src/tools/media/health.ts` (`:190-223`)
- `AI Systems/Media Editor/mcp server/src/tools/image/convert.ts` (`:100-165`)
- `AI Systems/Media Editor/mcp server/src/server/field-schemas.ts` (whole file)
- Commands: `node -e` on the installed zod for version and `toJSONSchema`, `grep -c` on the tool
  array, `ls "mcp server/dist/"` confirming no `cli.js` exists today

## Assessment

newInfoRatio: 0.7
Novelty justification: the surface design is new, and three findings are new facts rather than
design (zod 4.6.5 ships `toJSONSchema`, the capability cache is process-local while the resolver
record is file-based, and `dist/cli.js` does not exist). The rejected-option reasoning overlaps
iteration 1's seam only loosely.
Confidence: high for F2.1, F2.2, F2.6 and F2.7, which rest on executed commands and cited lines.
Medium for F2.5's preview-file policy, which is a design choice with no code to confirm it.

## Reflection

What worked: running the installed zod directly settled the `describe` question in one command
instead of guessing. The `grep -c` on the tool array confirmed the prompt's 40-tool count.

What failed: an early attempt to count tool names with
`grep -o "name: '[a-z_]*'"` returned zero, because the definitions use a `TOOL_NAME` constant
rather than a literal. The array count was the reliable measure.

What was ruled out: a checked-in tool manifest (F2.1), hand-written help text (F2.2), shelling to
`tools/list` (F2.2), per-field argv flags (F2.3), positional JSON (F2.3), a text-only stdout
(F2.4), a CLI envelope (F2.4), base64 previews on stdout (F2.5), previews in the export root
(F2.5), no capability cache (F2.6), a daemon (F2.6), per-project data folders (F2.7), and a
`--data-dir` flag (F2.7).

## Recommended Next Focus

Iteration 3, distribution. Read `mcp server/claude-plugin/`, `mcp server/scripts/build-plugin.ts`,
`mcp server/scripts/bundle/`, `mcp server/scripts/test-pinned.ts`,
`mcp server/src/server/server-info.ts:42`, the font path in
`mcp server/src/tools/video/add-subtitles.ts` and `add-text-overlay.ts`, and
`mcp server/manifest.json`. Then answer how the skill finds the CLI inside a Claude Code plugin,
whether `${CLAUDE_PLUGIN_ROOT}` is readable from a skill and whether a plugin `bin/` folder goes on
PATH, using the official Claude Code documentation and citing each URL, plus the per-platform sharp
and pinned ffmpeg story and a standalone install for other terminal agents.
