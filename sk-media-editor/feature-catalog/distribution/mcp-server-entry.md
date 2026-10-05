---
title: "MCP server entry"
description: "The MCP server starts on stdio and registers the runtime tool roster with the server SDK."
trigger_phrases:
  - "MCP server entry"
  - "mcp server entry"
  - "media-editor-mcp"
version: "1.0.0.0"
---

# MCP server entry (media-editor-mcp)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The MCP server starts on stdio and registers the runtime tool roster with the server SDK.

The server creates tool context and exposes registered tools through the MCP protocol. The Desktop extension manifest starts dist/index.js. The Claude Code plugin uses the separate CLI entry and does not register an MCP server.

---

## 2. HOW IT WORKS

The server creates tool context and exposes registered tools through the MCP protocol. The Desktop extension manifest starts dist/index.js. The Claude Code plugin uses the separate CLI entry and does not register an MCP server.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/index.ts](../../../runtime/src/index.ts) | Handler | Starts the stdio server entry. |
| [../../../runtime/src/server/create-server.ts](../../../runtime/src/server/create-server.ts) | Shared | Creates the MCP server and registers tools. |
| [../../../runtime/src/server/all-tools.ts](../../../runtime/src/server/all-tools.ts) | Shared | Collects the registered tool definitions. |
| [../../../runtime/package.json](../../../runtime/package.json) | Script | Declares the media-editor-mcp entry point. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/server/stdio.vitest.ts](../../../runtime/tests/server/stdio.vitest.ts) | MCP integration test | Checks tools/list and media_health through the built stdio server. |
| [../../../runtime/tests/server/registry.vitest.ts](../../../runtime/tests/server/registry.vitest.ts) | Vitest | Checks registration, listing, and dispatch errors. |

---

## 4. SOURCE METADATA

- Group: Distribution
- Canonical catalog source: `feature-catalog.md`
- Feature file path: distribution/mcp-server-entry.md

Related references:
- [Claude Desktop extension bundle](claude-desktop-extension-bundle.md) - Neighboring distribution entry.
