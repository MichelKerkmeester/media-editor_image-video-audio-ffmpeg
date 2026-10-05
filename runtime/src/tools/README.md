---
title: "tools: Media Editor tool modules"
description: "One module per MCP tool, grouped into image, audio, video and media, each a defineTool definition with a zod schema and a handler."
trigger_phrases:
  - "media editor tool modules"
  - "add a media editor tool"
  - "defineTool definition"
---

# tools: Media Editor tool modules

---

## 1. OVERVIEW

`src/tools/` holds the 40 tools the server offers, one module per tool. Each module exports one `defineTool({...})` value with a `name`, `title`, `description`, zod `inputSchema`, `annotations` and a `handler(args, context)`. The handler receives parsed arguments and the `ToolContext` services, and returns a result built by `core/result.ts`.

Current state:

- Tool names follow `<group>_<action>`, and the file is named after the action: `video_set_codec` lives in `video/set-codec.ts`.
- Every writing tool takes `outputName`. The registry also offers each one-folder writing tool `fileName`, `subfolder` and `targetFolder`: one file goes to the export root by default, several files get a numbered folder, `targetFolder` names an existing numbered folder an earlier call made, and `video_hls_ladder` always gets one. Read-only tools set `readOnlyHint: true`.
- Two shared runners carry most of the work: `video/copy-then-encode.ts` for ffmpeg and `image/sharp-output.ts` for sharp.

---

## 2. DIRECTORY TREE

```text
tools/
├── image/    # 8 image tools on sharp, plus sharp-output.ts
├── audio/    # 6 audio tools on ffmpeg
├── video/    # 20 video tools on ffmpeg, plus copy-then-encode.ts
└── media/    # media_health, media_probe, media_rename, media_repair, media_remove_silence, media_setup_ffmpeg
```

---

## 3. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Imports | `../server/` for `defineTool`, `ToolContext` and the field schemas. `../core/` for paths, probing, capabilities and results |
| Shared runner | `audio/` and `media/` import `video/copy-then-encode.ts`. `image/probe.ts` imports the preview from `media/preview.ts`, which reads the pixel limit from `image/sharp-output.ts`. No other cross-group import exists |
| Registration | A new tool is registered by adding it to `../server/all-tools.ts` and to `TOOL_NAMES` and `TOOL_REQUIREMENTS` in `../core/capabilities.ts` |
| Side effects | A handler touches the filesystem and child processes through `ToolContext`, the core helpers and its group's shared writer. Two tools move files themselves: `media_rename` inside the export folder and `media_setup_ffmpeg` inside the data folder |

---

## 4. MAIN FLOW

```text
handler(args, context)
  │
  ├─▶ context.resolveInput           path inside an allowed folder
  ├─▶ probeMedia / readImageMetadata  what the input holds
  ├─▶ assertCapabilities             encoders and filters present
  ├─▶ runAttempts, runPipeline,      temp folder, then one
  │   runInOutputFolder or           numbered output folder
  │   writeImageOutputs
  └─▶ successResult                  outputs, warnings, elapsed time
```

A thrown `MediaError` never escapes: the registry turns it into an error result with its code.

---

## 5. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/tools
```

Expected result: `Test Files  50 passed (50)`.

---

## 6. RELATED

- [`image/README.md`](./image/README.md), [`audio/README.md`](./audio/README.md), [`video/README.md`](./video/README.md), [`media/README.md`](./media/README.md)
- [`../server/README.md`](../server/README.md): Registry and `ToolContext`
- [`../core/README.md`](../core/README.md): Shared policies
- [`../../tests/tools/README.md`](../../tests/tools/README.md): Tool tests
