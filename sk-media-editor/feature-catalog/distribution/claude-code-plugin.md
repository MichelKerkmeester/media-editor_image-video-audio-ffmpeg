---
title: "Claude Code plugin"
description: "The Claude Code plugin ships the Media Editor skill and bin shims that invoke the media-editor CLI."
trigger_phrases:
  - "Claude Code plugin"
  - "claude code plugin"
  - "media-editor"
version: "1.0.0.0"
---

# Claude Code plugin (media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The Claude Code plugin ships the Media Editor skill and bin shims that invoke the media-editor CLI.

The POSIX and Windows shims run node against server/dist/cli.js. The plugin manifest contains no MCP server registration. The plugin build rejects an MCP registration and checks the copied skill and staged server.

---

## 2. HOW IT WORKS

The POSIX and Windows shims run node against server/dist/cli.js. The plugin manifest contains no MCP server registration. The plugin build rejects an MCP registration and checks the copied skill and staged server.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/claude-plugin/.claude-plugin/plugin.json](../../../runtime/claude-plugin/.claude-plugin/plugin.json) | Script | Declares the plugin metadata without an MCP server field. |
| [../../../runtime/claude-plugin/bin/media-editor](../../../runtime/claude-plugin/bin/media-editor) | Script | Starts the CLI from the plugin server folder on POSIX. |
| [../../../runtime/claude-plugin/bin/media-editor.cmd](../../../runtime/claude-plugin/bin/media-editor.cmd) | Script | Starts the CLI from the plugin server folder on Windows. |
| [../../../runtime/scripts/build-plugin.ts](../../../runtime/scripts/build-plugin.ts) | Script | Unpacks a Desktop bundle, copies the skill, and writes shims. |
| [../../../runtime/claude-plugin/README.md](../../../runtime/claude-plugin/README.md) | Reference | Documents plugin routes, requirements, and boundaries. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/packaging/build-plugin.vitest.ts](../../../runtime/tests/packaging/build-plugin.vitest.ts) | Vitest | Covers plugin filling and its registration boundary. |
| [../../../runtime/tests/packaging/targets.vitest.ts](../../../runtime/tests/packaging/targets.vitest.ts) | Vitest | Checks platform bundle targets. |

---

## 4. SOURCE METADATA

- Group: Distribution
- Canonical catalog source: `feature-catalog.md`
- Feature file path: distribution/claude-code-plugin.md

Related references:
- [Claude Desktop extension bundle](claude-desktop-extension-bundle.md) - Neighboring distribution entry.
- [Bundle and plugin build scripts](bundle-and-plugin-build-scripts.md) - Neighboring distribution entry.
