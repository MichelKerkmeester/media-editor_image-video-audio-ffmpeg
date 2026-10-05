---
title: "Architecture: Media Editor MCP server"
description: "Current package architecture for the Media Editor MCP server: stdio entry point, tool registry, tool context, shared ffmpeg runners, path and output policy, pinned ffmpeg builds and packaging."
trigger_phrases:
  - "media editor mcp architecture"
  - "media editor server architecture"
  - "runtime package topology"
  - "copy then encode runner"
  - "pinned ffmpeg builds"
importance_tier: "important"
---

# Architecture: Media Editor MCP server

> Current architecture of the local MCP server that edits images, video and audio for the Media Editor. One Node process serves 40 tools over stdio and runs its own pinned ffmpeg.

---

## 1. OVERVIEW

The server is a strict TypeScript package compiled to ESM. A host starts it as a child process and talks to it over stdio: Claude Desktop through a `.mcpb` extension. The Claude Code plugin in `claude-plugin/` ships `src/cli.ts` as the `media-editor` command instead, which runs one tool per process with no host. It registers 40 tools. The 8 image tools run on sharp and the 26 video and audio tools on ffmpeg. The 6 media tools report health, probe, rename a result, repair, remove silence and install ffmpeg.

Three rules hold for every tool:

- **Inputs come from allowed folders only.** `core/path-guard.ts` resolves each caller path to a regular file inside a configured root, and the process runner checks it again right before each spawn.
- **Nothing is overwritten.** A call that writes one file puts it in the output folder itself, and a taken name moves on to `-2`, `-3` and so on. A call that writes several files, or one called with `subfolder: true`, creates the next numbered folder, `NNN - <slug>`. Every write is an exclusive create, and `media_rename` renames by hard link, never over an existing file.
- **No shell runs.** ffmpeg and ffprobe start from argument arrays through `core/process-runner.ts`, at most two at a time, with an allowlisted environment and a timeout.

### Architecture diagram

```text
╭──────────────────────────────────────────────────────────╮
│ Host: Claude Desktop (.mcpb)                             │
╰──────────────────────────────────────────────────────────╯
                             │ stdio, JSON-RPC
                             ▼
┌──────────────────────────────────────────────────────────┐
│ src/index.ts                                             │
│ loadConfig, createServer, StdioServerTransport, shutdown │
└──────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ server/tool-registry.ts                                  │
│ tools/list, tools/call, zod parse, errorResult           │
└──────────────────────────────────────────────────────────┘
                             │ handler(args, ToolContext)
                             ▼
┌──────────────────────────────────────────────────────────┐
│ tools/image, tools/audio, tools/video, tools/media       │
└──────────────────────────────────────────────────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ path-guard       │ │ copy-then-encode │ │ sharp-output     │
│ output-folder    │ │ runAttempts      │ │ image encoders   │
│ media-properties │ │ runPipeline      │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ core/process-runner.ts ──▶ ffmpeg, ffprobe               │
│ core/ffmpeg-resolver.ts: override, bundled, PATH, setup  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. PACKAGE TOPOLOGY

```text
runtime/
├── src/                  # The server
│   ├── index.ts          # Process entry: config, server, stdio, shutdown
│   ├── cli.ts            # Command line entry: media-editor, one tool per process
│   ├── server/           # MCP server, tool registry, tool context, field schemas
│   ├── tools/            # One file per tool in image/, audio/, video/ and media/
│   ├── core/             # Policies and helpers every tool shares
│   └── types/            # Type declaration for ffprobe-static
├── scripts/              # Bundle, plugin and pinned-test builds
├── tests/                # Vitest suites, helpers and fixture clips
├── assets/               # Bundled font and its licence
├── licenses/             # Licence texts the bundles carry
├── claude-plugin/        # Claude Code plugin, server/ and skills/ filled by the build
├── manifest.json         # MCPB manifest for Claude Desktop
├── ARCHITECTURE.md       # This file
└── README.md             # Package overview and commands
```

`dist/`, `build/`, `dist-bundles/` and `node_modules/` are generated and ignored by git.

Allowed dependency direction:

```text
src/index.ts      ──▶ server/, core/
src/cli.ts        ──▶ server/, core/
server/           ──▶ core/
server/all-tools  ──▶ tools/*          (the only server file that imports tools)
tools/*           ──▶ server/, core/   (registry, context, field schemas)
tools/audio/      ──▶ tools/video/copy-then-encode.ts
tools/media/      ──▶ tools/video/copy-then-encode.ts
scripts/          ──▶ core/
```

`core/` imports `server/tool-context.ts` once, as `import type` in `media-properties.ts`, so no runtime cycle exists. Nothing under `src/` imports `scripts/` or `tests/`.

---

## 3. REQUEST FLOW

A `tools/call` request for a copy-first video tool follows this path:

1. `tool-registry.ts` passes the call to `server/dispatch.ts`, which finds the tool by name and parses the arguments with its zod schema. Over MCP an unknown tool is a `MethodNotFound` protocol error and a bad argument list is `InvalidParams`. The command line in `cli.ts` calls the same dispatch and prints those two as a JSON error with exit code 2.
2. The handler resolves each input with `context.resolveInput`, reads its streams with `probeMedia` and checks the encoders and filters it needs with `assertCapabilities`.
3. `runAttempts` runs each ffmpeg attempt in a private temp folder. The first attempt usually copies streams. When ffmpeg refuses the copy, or the kept MP4 would hold PCM audio or FFV1 video, the next attempt re-encodes and its warning joins the result.
4. The first attempt that passes is copied into the call's destination, the output folder or a new numbered folder, and `context.readBack` probes the written file.
5. `successResult` returns the outputs with path, size, duration, picture size and codec, plus warnings and elapsed time. Any `MediaError` thrown on the way becomes an `errorResult` with its code, message and details.

Other tools use the same services with a different runner:

| Runner | Used by | What it does |
|--------|---------|--------------|
| `runAttempts` | Video and audio conversions, trims, overlays, `media_repair` | Ordered attempts, first success kept |
| `runPipeline` | `video_concat`, `video_add_b_roll`, `media_remove_silence` | Several ffmpeg passes, one kept file |
| `runInOutputFolder` | `video_hls_ladder` | Many files written straight into the numbered folder |
| `writeImageOutputs` | Every writing image tool | sharp encodes each planned image into the output folder, or a numbered folder for several files |

---

## 4. RUNTIME SUBSYSTEMS

**Configuration.** `core/config.ts` reads `--allowed-dir`, bare folder paths and `--output-dir` from the arguments, then seven `MEDIA_EDITOR_*` variables. The output folder falls back to the first allowed folder. A value that cannot be used is dropped with a warning that names the setting, never the value.

**Binary resolution.** `core/ffmpeg-resolver.ts` tries four steps in order: the `MEDIA_EDITOR_FFMPEG_PATH` or `MEDIA_EDITOR_FFPROBE_PATH` override, the bundled binary from `ffmpeg-static` or `ffprobe-static`, the `PATH`, then the copy `media_setup_ffmpeg` installed in the data folder. An override that is set but unusable stops the lookup, because a different binary would hide the mistake. Each accepted binary must answer `-version`.

**Capabilities.** `core/capabilities.ts` reads ffmpeg's encoder and filter lists once per binary. `TOOL_REQUIREMENTS` names what each tool needs, and a missing name fails the call with `CAPABILITY_MISSING` before any work starts.

**Process policy.** `core/process-runner.ts` adds `-hide_banner` and a file-only protocol whitelist to every media run, plus `-nostdin` and `-n` to ffmpeg, so no run reads the terminal or overwrites a file. It forces a C locale, passes only allowlisted variables, runs two children at most and kills a run after `MEDIA_EDITOR_TIMEOUT_SECONDS` (1800 by default). A failed run keeps the last 4 KiB of sanitized stderr for the result.

**Output policy.** The registry adds `fileName`, `subfolder` and `targetFolder` to every tool that writes into one folder and hands the handler a context carrying that placement. `core/output-folder.ts` picks the destination, allocates numbered folders, resolves a `targetFolder` to an existing numbered folder directly inside the export root, and names files `<stem>-<operation><extension>`, or the slugged `fileName`, within 120 UTF-8 bytes. `core/result.ts` builds one structured result shape for every tool.

**Rename and preview.** `tools/media/rename.ts` renames one file inside the output folder. It slugs the new name with the same `readableFileName` the placement uses, keeps the extension and the folder, and moves by hard link and unlink, so an existing file is never replaced. `tools/media/preview.ts` adds an optional small JPEG to `image_probe` and `media_probe`, so the model can see what it is naming.

**Filter safety.** `core/filter-escape.ts` escapes caller text for filter graphs and copies a subtitle, font or image into the temp folder when its path cannot enter a graph unchanged. Text filters use the font `core/font-path.ts` points at in `assets/fonts/`.

**ffmpeg install.** `tools/media/setup-ffmpeg.ts` reports what it found when every binary the call asks for resolves. When one is missing, it answers a call without `consent: true` with a `CONSENT_REQUIRED` error that carries the planned download: URL, size, SHA-256 and destination. Its description tells the model to show that plan and pass consent only after the user agrees. With `consent: true` it downloads the pinned archive, checks the archive and the binary against their SHA-256 pins and installs each missing binary into the data folder. Calls run one at a time.

---

## 5. PACKAGING

`npm run bundle -- --all` builds one Desktop extension per platform into `dist-bundles/media-editor-<key>.mcpb`. Each build stages `dist/`, `assets/` and `licenses/` with the icon, licence, notices and package files, installs production dependencies for the target, replaces the static binaries with the pinned build, limits the manifest to that platform and re-reads the packed file before it reports success.

| Key | Pinned ffmpeg |
|-----|---------------|
| `darwin-arm64` | 9.0.2, martin-riedl.de |
| `darwin-x64` | 6.1.1, tessus |
| `win32-x64` | 6.1.1, gyan.dev essentials |
| `linux-x64` | 7.0.2, johnvansickle.com |
| `linux-arm64` | 7.0.2, johnvansickle.com |

`npm run plugin` unpacks the host's bundle into `claude-plugin/server/` and copies the Media Editor skill from `../sk-media-editor/` into `claude-plugin/skills/sk-media-editor/`, replacing the whole `skills/` folder. The plugin starts the server with the project folder as its one allowed folder and the plugin data folder as its data folder.

---

## 6. VERIFICATION

| Check | Command | What it proves |
|-------|---------|----------------|
| Types | `npm run typecheck` | The strict compile passes |
| Suite | `npm test` | Every test passes on the development binaries |
| Pinned suite | `npm run test:pinned` | Every test passes on this machine's pinned ffmpeg, checked by digest |
| Bundles | `npx mcpb validate <unpacked manifest.json>` | A packed manifest is valid |
| Plugin | `claude plugin validate claude-plugin` | The plugin folder is valid |

---

## 7. KEY DECISIONS

| Decision | Why |
|----------|-----|
| TypeScript on Node, with sharp and static ffmpeg packages | An MCPB Node bundle carries its `node_modules`, and a Python bundle cannot carry compiled dependencies portably |
| Copy first, then re-encode | A stream copy is fast and lossless, and the re-encode covers every copy ffmpeg or the MP4 rule refuses |
| An MP4 copy may not keep PCM or FFV1 | Every platform then returns the same widely playable file, whatever its pinned ffmpeg accepts |
| Exclusive writes, free names in the output folder and numbered folders for several files | No call can overwrite an input or an earlier result |
| ffmpeg install only after consent | The user sees the address, size and digest before anything downloads |
| Pinned builds checked by SHA-256 | A bundle, an install and the pinned test run all use the exact binary the table names |

---

## 8. RELATED

- [README.md](./README.md): Package overview, commands and configuration
- [src/README.md](./src/README.md): Source layout and dependency direction
- [scripts/README.md](./scripts/README.md): Bundle, plugin and pinned-test builds
- [tests/README.md](./tests/README.md): Suite layout and how to run it
- [claude-plugin/README.md](./claude-plugin/README.md): Claude Code plugin install and use
- [../INSTALL-GUIDE.md](../INSTALL-GUIDE.md): Media Editor install guide
- [../sk-media-editor/SKILL.md](../sk-media-editor/SKILL.md): The skill that routes to these tools
