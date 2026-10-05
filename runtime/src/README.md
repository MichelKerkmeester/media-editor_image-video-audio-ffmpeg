---
title: "src: Media Editor server source"
description: "Source of the Media Editor MCP server: the process entry point, the MCP server layer, one module per tool and the shared core."
trigger_phrases:
  - "media editor server source"
  - "runtime src layout"
---

# src: Media Editor server source

---

## 1. OVERVIEW

`src/` holds everything the server runs. `npm run build` compiles it into `dist/`, and the bundles and the plugin ship that output. Nothing here imports `scripts/` or `tests/`.

Current state:

- `index.ts` is the process entry point that MCP hosts start.
- `cli.ts` is the `media-editor` command line. It runs the same tools through `server/dispatch.ts` and never starts the MCP server.
- `server/` turns the tool definitions into an MCP server.
- `tools/` holds one module per tool, grouped by media type.
- `core/` holds the policies and helpers every tool shares.

---

## 2. ARCHITECTURE

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ index.ts     │ ──▶ │ server/      │ ──▶ │ tools/*      │
│ process entry│     │ registry,    │     │ one module   │
│              │     │ context      │     │ per tool     │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                    │
                            ▼                    ▼
                     ┌─────────────────────────────────┐
                     │ core/                           │
                     │ paths, output, processes,       │
                     │ ffmpeg resolution, results      │
                     └─────────────────────────────────┘
```

---

## 3. DIRECTORY TREE

```text
src/
├── index.ts     # Loads config, builds the server, connects stdio, handles shutdown
├── cli.ts       # media-editor: list, describe, health and one tool per call, JSON on stdout
├── server/      # MCP server factory, tool registry, tool context, field schemas
├── tools/       # image/, audio/, video/ and media/ tool modules
├── core/        # Shared policies and helpers
└── types/       # Type declaration for ffprobe-static
```

---

## 4. BOUNDARIES

| Boundary | Rule |
|----------|------|
| `index.ts`, `cli.ts` | Import `server/` and `core/` only |
| `server/` | Imports `core/`. Only `server/all-tools.ts` imports `tools/` |
| `tools/*` | Import `server/` for the registry, context and field schemas, and `core/` for everything else |
| `core/` | Imports no tool. Its one `server/` import is type-only |

---

## 5. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|------------|------|---------|
| `index.ts` | Process | What `node dist/index.js` runs. Reads arguments and `MEDIA_EDITOR_*` variables, logs to stderr, closes on SIGINT, SIGTERM or the end of stdin |
| `cli.ts` | Process | What `media-editor` and `node dist/cli.js` run. Builds its configuration from its own flags, `MEDIA_EDITOR_*` variables and working-folder defaults, prints one JSON object, exits 0, 1, 2, 3, 130 or 143 |
| `server/create-server.ts` `createServer` | Function | Builds a server with every tool registered, used by `index.ts` and the in-memory test client |

---

## 6. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npm run typecheck
npm run build
```

Expected result: both commands print nothing and exit 0.

---

## 7. RELATED

- [`../README.md`](../README.md): Package overview and commands
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): Request flow and runtime subsystems
- [`server/README.md`](./server/README.md), [`tools/README.md`](./tools/README.md), [`core/README.md`](./core/README.md), [`types/README.md`](./types/README.md)
