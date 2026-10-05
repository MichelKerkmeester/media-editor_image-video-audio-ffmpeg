---
title: "Runtime options"
description: "The command accepts folder, timeout, and data-directory options for one CLI process."
trigger_phrases:
  - "Runtime options"
  - "runtime options"
  - "--allowed-dir"
version: "1.0.0.0"
---

# Runtime options (--allowed-dir)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The command accepts folder, timeout, and data-directory options for one CLI process.

--allowed-dir can be repeated to add readable roots. --output-dir chooses the export destination. --data-dir chooses persistent data storage. --timeout sets the per-run limit. Command options override matching environment settings. With no flag and no matching environment value, the allowed root is the project folder and the output folder is `<project folder>/media files/export`. The project folder is the working folder, or the folder that holds `media files` when the command starts inside one.

---

## 2. HOW IT WORKS

--allowed-dir can be repeated to add readable roots. --output-dir chooses the export destination. --data-dir chooses persistent data storage. --timeout sets the per-run limit. Command options override matching environment settings. With no flag and no matching environment value, the allowed root is the project folder and the output folder is `<project folder>/media files/export`. The project folder is the working folder, or the folder that holds `media files` when the command starts inside one.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/cli.ts](../../../runtime/src/cli.ts) | Script | Reads CLI flags and passes the runtime configuration. |
| [../../../runtime/src/core/config.ts](../../../runtime/src/core/config.ts) | Shared | Defines defaults, environment precedence, validation, and warnings. |
| [../../../runtime/src/server/tool-context.ts](../../../runtime/src/server/tool-context.ts) | Shared | Applies the loaded timeout and directories to tool calls. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/config.vitest.ts](../../../runtime/tests/core/config.vitest.ts) | Vitest | Covers options, environment values, defaults, and warnings. |
| [../../../runtime/tests/cli/dispatch.vitest.ts](../../../runtime/tests/cli/dispatch.vitest.ts) | Vitest | Covers configured CLI dispatch. |
| [../../../runtime/tests/server/tool-context.vitest.ts](../../../runtime/tests/server/tool-context.vitest.ts) | Vitest | Checks runtime settings in tool context. |

---

## 4. SOURCE METADATA

- Group: Command Line
- Canonical catalog source: `feature-catalog.md`
- Feature file path: command-line/runtime-options.md

Related references:
- [Argument input](argument-input.md) - Neighboring command line entry.
- [Stdout contract exit codes and signal cleanup](stdout-contract-exit-codes-and-signal-cleanup.md) - Neighboring command line entry.
