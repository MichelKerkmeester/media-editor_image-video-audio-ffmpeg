---
title: "Claude Desktop extension bundle"
description: "The Desktop extension manifest packages the MCP server, declares its tools, and exposes allowed-directory and output-directory settings."
trigger_phrases:
  - "Claude Desktop extension bundle"
  - "claude desktop extension bundle"
  - "manifest.json"
version: "1.0.0.0"
---

# Claude Desktop extension bundle (manifest.json)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The Desktop extension manifest packages the MCP server, declares its tools, and exposes allowed-directory and output-directory settings.

The bundle includes the compiled server, production dependencies, assets, notices, and the matching pinned ffmpeg and ffprobe build. The build process validates the manifest, packs the extension, re-reads the artifact, and checks its contents.

---

## 2. HOW IT WORKS

The bundle includes the compiled server, production dependencies, assets, notices, and the matching pinned ffmpeg and ffprobe build. The build process validates the manifest, packs the extension, re-reads the artifact, and checks its contents.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/manifest.json](../../../runtime/manifest.json) | Script | Declares the extension entry, settings, and tool descriptions. |
| [../../../runtime/scripts/build-bundle.ts](../../../runtime/scripts/build-bundle.ts) | Script | Stages, validates, packs, and re-reads a platform bundle. |
| [../../../runtime/scripts/bundle/targets.ts](../../../runtime/scripts/bundle/targets.ts) | Shared | Defines platform bundle names and target manifests. |
| [../../../runtime/scripts/bundle/artifacts.ts](../../../runtime/scripts/bundle/artifacts.ts) | Shared | Fetches, extracts, hashes, and inspects artifacts. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/packaging/manifest.vitest.ts](../../../runtime/tests/packaging/manifest.vitest.ts) | Vitest | Checks extension manifest consistency. |
| [../../../runtime/tests/packaging/bundle-contents.vitest.ts](../../../runtime/tests/packaging/bundle-contents.vitest.ts) | Vitest | Checks packed bundle contents when bundles are present. |
| [../../../runtime/tests/packaging/artifacts.vitest.ts](../../../runtime/tests/packaging/artifacts.vitest.ts) | Vitest | Checks artifact and bundle helper behavior. |

---

## 4. SOURCE METADATA

- Group: Distribution
- Canonical catalog source: `feature-catalog.md`
- Feature file path: distribution/claude-desktop-extension-bundle.md

Related references:
- [MCP server entry](mcp-server-entry.md) - Neighboring distribution entry.
- [Claude Code plugin](claude-code-plugin.md) - Neighboring distribution entry.
