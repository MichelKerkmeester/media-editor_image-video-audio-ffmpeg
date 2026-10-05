---
title: "Media editor command"
description: "The media-editor command exposes tool discovery, schema inspection, health reporting, and one-tool execution."
trigger_phrases:
  - "Media editor command"
  - "media editor command"
  - "media-editor"
version: "1.0.0.0"
---

# Media editor command (media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The media-editor command exposes tool discovery, schema inspection, health reporting, and one-tool execution.

list returns the registered tool names and descriptions. describe prints one tool schema. health reports the runtime environment. A tool-name subcommand runs that handler as a single call.

---

## 2. HOW IT WORKS

list returns the registered tool names and descriptions. describe prints one tool schema. health reports the runtime environment. A tool-name subcommand runs that handler as a single call.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/cli.ts](../../../runtime/src/cli.ts) | Script | Parses subcommands and dispatches list, describe, health, and named tool calls. |
| [../../../runtime/src/server/all-tools.ts](../../../runtime/src/server/all-tools.ts) | Shared | Defines the runtime tool roster. |
| [../../../runtime/package.json](../../../runtime/package.json) | Script | Maps the media-editor binary to dist/cli.js. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/cli/dispatch.vitest.ts](../../../runtime/tests/cli/dispatch.vitest.ts) | Vitest | Covers command dispatch and tool lookup. |
| [../../../runtime/tests/cli/cli-process.vitest.ts](../../../runtime/tests/cli/cli-process.vitest.ts) | Vitest | Covers spawned CLI calls and process output. |
| [../../../runtime/tests/README.md](../../../runtime/tests/README.md) | Reference | Documents CLI test commands and suite scope. |

---

## 4. SOURCE METADATA

- Group: Command Line
- Canonical catalog source: `feature-catalog.md`
- Feature file path: command-line/media-editor-command.md

Related references:
- [Argument input](argument-input.md) - Neighboring command line entry.
