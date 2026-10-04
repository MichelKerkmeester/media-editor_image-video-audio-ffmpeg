---
title: "server: MCP server layer"
description: "Builds the MCP server, registers the 39 tools, owns tools/call dispatch and gives every handler its ToolContext services."
trigger_phrases:
  - "tool registry"
  - "tool context"
  - "media editor mcp server layer"
---

# server: MCP server layer

---

## 1. OVERVIEW

`src/server/` turns the tool modules into one MCP server. It creates the `McpServer`, registers every tool for `tools/list`, handles `tools/call` itself and hands each handler a `ToolContext`: the services a tool uses to resolve paths, find binaries, run them, allocate output folders and read results back.

Current state:

- `ALL_TOOLS` lists the 39 tools in the order `tools/list` returns them.
- An unknown tool name is a `MethodNotFound` protocol error and arguments that fail the zod schema are `InvalidParams`. Every other failure becomes an error result.
- The field schemas here keep shared arguments, such as `outputName`, bitrates and resolutions, identical across tools.

---

## 2. ARCHITECTURE

```text
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ create-server.ts │ ──▶ │ tool-registry.ts │ ──▶ │ tool handler     │
│ McpServer        │     │ list, call,      │     │ (args, context)  │
│                  │     │ zod parse        │     │                  │
└────────┬─────────┘     └──────────────────┘     └────────┬─────────┘
         │                                                  │
         ▼                                                  ▼
┌──────────────────┐                             ┌──────────────────┐
│ all-tools.ts     │                             │ tool-context.ts  │
│ ALL_TOOLS        │                             │ core services    │
└──────────────────┘                             └──────────────────┘
```

---

## 3. KEY FILES

| File | Responsibility |
|------|----------------|
| `create-server.ts` | `createServer(config, options)`: builds the `McpServer`, the default context and the registrations |
| `tool-registry.ts` | `defineTool` keeps a schema's type for its handler. `registerTools` lists tools and owns `tools/call` |
| `tool-context.ts` | `createToolContext`: `resolveBinary`, `getCapabilities`, `resolveInput`, `resolveInputs`, `allocateOutputFolder`, `runBinary`, `readBack` |
| `all-tools.ts` | `ALL_TOOLS`, the only place that imports the tool modules |
| `field-schemas.ts` | `outputNameField`, the `outputName` argument every writing tool shares |
| `media-fields.ts` | Bitrate, sample rate, channels, frame rate, resolution, aspect ratio, padding colour and time fields, with their parsers |
| `server-info.ts` | `SERVER_NAME` and `readServerVersion`, which reads the version from `package.json` |

---

## 4. BOUNDARIES AND FLOW

| Boundary | Rule |
|----------|------|
| Imports | `core/` for policies, and `tools/` only from `all-tools.ts` |
| Exports | Tool modules import `defineTool`, `ToolContext` and the field schemas from here |
| Ownership | Protocol handling and service wiring live here. Media logic belongs in `tools/` or `core/` |

`runBinary` resolves the binary and runs it through `core/process-runner.ts`. When the spawn itself fails, it resolves the binary once more and runs again. Any other failure, a miss on that second lookup included, removes the call's cleanup folders.

---

## 5. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/server
```

Expected result: `Test Files  4 passed (4)`.

---

## 6. RELATED

- [`../README.md`](../README.md): Source layout
- [`../tools/README.md`](../tools/README.md): The tool modules this layer registers
- [`../core/README.md`](../core/README.md): The services behind `ToolContext`
- [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md): Request flow
