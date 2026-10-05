---
title: "Desktop extension route"
description: "Claude Desktop connects to the Media Editor MCP server through the extension bundle and supplies its configured allowed and output directories."
trigger_phrases:
  - "Desktop extension route"
  - "desktop extension route"
  - "manifest.json"
version: "1.0.0.0"
---

# Desktop extension route (manifest.json)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Claude Desktop connects to the Media Editor MCP server through the extension bundle and supplies its configured allowed and output directories.

The extension manifest starts the Node MCP server, declares its tools, and asks for allowed directories. With the extension connected, the Project routes work through those tools. The Project hand-off still depends on host availability. The tools take absolute paths and cannot list a folder, so the Project builds each input path from the allowed folders `media_health` reports and the file name the user gave. When a request names no file, the Project asks for its name instead of guessing one.

---

## 2. HOW IT WORKS

The extension manifest starts the Node MCP server, declares its tools, and asks for allowed directories. With the extension connected, the Project routes work through those tools. The Project hand-off still depends on host availability. The tools take absolute paths and cannot list a folder, so the Project builds each input path from the allowed folders `media_health` reports and the file name the user gave. When a request names no file, the Project asks for its name instead of guessing one.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/manifest.json](../../../runtime/manifest.json) | Script | Declares the MCP server entry and extension settings. |
| [../../../runtime/src/index.ts](../../../runtime/src/index.ts) | Handler | Starts the stdio MCP server. |
| [../../../runtime/src/server/create-server.ts](../../../runtime/src/server/create-server.ts) | Shared | Creates the server and registers tools. |
| [../../../INSTALL-GUIDE.md](../../../INSTALL-GUIDE.md) | Reference | Documents the Desktop extension installation route. |
| `../../../claude project/Custom Instructions.md` | Shared | Defines the tool check and how the Project builds input paths. [Open](../../../claude%20project/Custom%20Instructions.md) |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/project-route-order/connected-tools-in-desktop.md](../../../sk-media-editor/manual-testing-playbook/project-route-order/connected-tools-in-desktop.md) | Manual playbook | Checks connected tools in Claude Desktop. |
| [../../../runtime/tests/server/stdio.vitest.ts](../../../runtime/tests/server/stdio.vitest.ts) | MCP integration test | Checks server protocol behavior. |

---

## 4. SOURCE METADATA

- Group: Project Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: project-behavior/desktop-extension-route.md

Related references:
- [Project kernel and knowledge files](project-kernel-and-knowledge-files.md) - Neighboring project behavior entry.
- [Project no-execution truth](project-no-execution-truth.md) - Neighboring project behavior entry.
