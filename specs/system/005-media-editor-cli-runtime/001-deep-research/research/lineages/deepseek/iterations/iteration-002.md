# Iteration 002 - CLI surface and output

Focus: the command surface (`list`, `describe <tool>`, `health`, `<tool>` with JSON arguments by flag, file or stdin), stdout JSON taken from `structuredContent`, the preview written to a file instead of base64, per-call startup cost, the persistent capability and resolver cache, and one shared `MEDIA_EDITOR_DATA_DIR`. All of it was verified against the live `runtime/src/cli.ts` and by running the built CLI, which is read-only for every command used here.

Sources read this iteration: `runtime/src/cli.ts`, `runtime/src/core/probe-cache.ts`, `runtime/src/server/tool-context.ts`, `runtime/src/tools/media/preview.ts`, `runtime/src/core/config.ts`, `runtime/src/tools/media/setup-ffmpeg.ts`, `runtime/src/tools/media/health.ts`, `runtime/package.json`, plus four timing runs and two CLI invocations (`list` and `describe image_convert`).

## Findings

1. The command surface landed as `list`, `describe <tool>`, `health` and `<tool>` (`runtime/src/cli.ts:413-451`). Running the built CLI confirmed the surface and the count: `node dist/cli.js list` printed exactly 40 tools with `media_health` first, and `describe image_convert` printed the schema keys `fileName`, `format`, `inputPath`, `maxBytes`, `outputName`, `quality`, `subfolder` and `targetFolder`, which shows the placement hardening fields are in the listed schema.

2. `list` prints `name`, `title` and `description` for every entry of `ALL_TOOLS` (`runtime/src/cli.ts:322-330`, the map at `:60-62`), and `describe` adds `annotations` and the full JSON Schema through `z.toJSONSchema(z.object(listedInputSchema(definition)))` at `:332-340`, so no new schema dependency is needed beyond the `zod` that is already `^4.6.5` (`runtime/package.json:30`).

3. One JSON argument source per call: `--args`, `--args-file`, or stdin when stdin is not a TTY (`runtime/src/cli.ts:248-278`), with mutual exclusion enforced at `:170-172` and a non-object payload rejected at `:274-277`. Individual tool flags are not accepted, which is a deliberate divergence from the earlier design draft that proposed per-flag parsing.

4. stdout receives exactly the `structuredContent` object (`runtime/src/cli.ts:388`), diagnostics go to stderr (`:192-194`, `:206-214`), and the exit code distinguishes a tool failure (1) from a usage or dispatch error (2) and a startup failure (3) (`:389`, `:203`, `:460`), so `media-editor image_probe --args ... | jq .code` works for both outcomes.

5. The preview lands as a file. `PreviewSink` is a CLI-only context dependency (`runtime/src/server/tool-context.ts:112`, `:126`), `withPreviewBlock` calls it and returns `previewPath` in `structuredContent` instead of appending the base64 image block (`runtime/src/tools/media/preview.ts:118-137`), and the CLI sink writes `<dataDir>/previews/preview-<uuid>.jpg` atomically through a temp file that is registered for shutdown cleanup (`runtime/src/cli.ts:280-305`). MCP keeps the inline image block because the sink stays unset there.

6. Startup cost was measured today on this machine, warm cache, one run each: `node -e "0"` baseline 0.02 seconds, `import('sharp')` 0.06, `import('./dist/server/all-tools.js')` 0.13, and `node dist/cli.js list` end to end 0.11 while printing 16,317 bytes. The whole tool graph costs about a tenth of a second per process, so the earlier open question between a build-time schema manifest and an eager import resolves to eager import being acceptable for now.

7. The persistent cache landed as one file, `<dataDir>/cache/probes.json` (`runtime/src/core/probe-cache.ts:53`, `:183-197`), storing binary resolutions and encoder and filter lists keyed by absolute path, size, mtime and version (`:21-41`), and the CLI constructs it per call from `config.dataDir` (`runtime/src/cli.ts:381`). This is the capability and resolver cache that a one-process-per-call CLI needs, and it validates with the same file identity the in-process resolver cache uses.

8. One shared data folder is preserved end to end: `MEDIA_EDITOR_DATA_DIR` is the env name (`runtime/src/core/config.ts:92`), `--data-dir` feeds it (`runtime/src/cli.ts:239-241`), `media_setup_ffmpeg` installs under `path.join(dataDir, 'bin', ...)` (`runtime/src/tools/media/setup-ffmpeg.ts:252`, `:441`), `media_health` reports `dataFolder: context.config.dataDir` (`runtime/src/tools/media/health.ts:204`), and the cache and preview sink read the same folder, so `media_setup_ffmpeg` then `media_health` work across separate CLI calls.

9. Two carried-forward observations. First, the argument parse at `runtime/src/core/dispatch.ts:116` is a plain `z.object(...)` safeParse, so a mistyped JSON key is still stripped silently with no warning, which is more likely on a CLI than on a schema-driven host. Second, CLI tests are in flight beside the implementation: `tests/cli/cli-process.vitest.ts` (19 cases), `tests/cli/dispatch.vitest.ts` (7 cases) and `tests/core/probe-cache.vitest.ts` (7 cases) are untracked in the nested repository.

## Design answer

The surface answers the terminal use case with three shapes: discovery (`list`, `describe`), a health alias, and one dispatch form per tool that takes a single JSON object from a flag, a file or stdin. That choice keeps one schema source and one parse path, and it makes every call scriptable without a per-tool flag table. Output is the machine-readable `structuredContent` only, so pipes get JSON and humans read stderr for the message. Previews become files because base64 in a terminal is unreadable and a path is what a user needs before confirming a name, which is exactly the focus 5 flow. The cache and the data folder are the two pieces that make one-shot processes behave like the long-lived server: the probe cache removes the repeated ffmpeg capability reads, and the shared data folder keeps `media_setup_ffmpeg`, `media_health`, previews and the cache in one place.

## Ruled Out

1. A build-time schema manifest (`dist/tools.json`) to keep `list` and `describe` from importing the tool graph, because the measured cost is about a tenth of a second and the manifest would add a second source of truth for names and schemas.
2. Per-flag `--key value` tool arguments, because the JSON object form is already one parse path and the schema is the documentation.
3. Printing the whole `CallToolResult` to stdout, because every consumer would have to unwrap `structuredContent` and ignore `content`.
4. Failure output on stderr only, because it breaks the pipe case and stderr is already the diagnostic channel.
5. Leaving base64 previews in the JSON, because it inflates every payload for consumers that only want the path.
6. Dropping previews from the CLI, because seeing the content before naming it is the documented reason the field exists.

## Edge Cases

- Missing dependency: none. Every file and command needed was available.
- Partial success: none. All six focus items were verifiable, four of them by running the built CLI or measuring it.

## Sources Consulted

- `AI Systems/Media Editor/runtime/src/cli.ts:1-478`
- `AI Systems/Media Editor/runtime/src/core/probe-cache.ts:1-197`
- `AI Systems/Media Editor/runtime/src/server/tool-context.ts:105-130`, `:370-395`
- `AI Systems/Media Editor/runtime/src/tools/media/preview.ts:100-145`
- `AI Systems/Media Editor/runtime/src/core/config.ts:87-103`, `:440-450`
- `AI Systems/Media Editor/runtime/src/tools/media/setup-ffmpeg.ts:240-260`, `:435-445`
- `AI Systems/Media Editor/runtime/src/tools/media/health.ts:200-210`
- `AI Systems/Media Editor/runtime/package.json:11`, `:29-30`
- Command evidence: `node dist/cli.js list`, `node dist/cli.js describe image_convert`, and four `/usr/bin/time -p` runs.

## Assessment

- New information ratio: 0.8
- Questions addressed: what CLI surface, output contract, preview handling, startup cost and shared data folder satisfy direct terminal use.
- Questions answered: what CLI surface, output contract, preview handling, startup cost and shared data folder satisfy direct terminal use.

## Reflection

- What worked: running the built CLI rather than reading only the source, which confirmed the 40 tool count and the presence of the placement fields in one step.
- What did not work: nothing failed this iteration.
- What I would do differently: repeat each timing several times and report a range, because single runs at this scale are noisy.

## Recommended Next Focus

Iteration 3: distribution. How the plugin ships the CLI, how the skill finds it in Claude Code, per-platform sharp and the pinned ffmpeg, a standalone install, and why the dist layout stays.
