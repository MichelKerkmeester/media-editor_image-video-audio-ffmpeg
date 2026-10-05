---
title: "Stdout contract exit codes and signal cleanup"
description: "The CLI writes one JSON result to stdout, sends logs to stderr, and returns distinct process exit codes for success, tool error, usage error, startup error, and signals."
trigger_phrases:
  - "Stdout contract exit codes and signal cleanup"
  - "stdout contract exit codes and signal cleanup"
  - "media-editor"
version: "1.0.0.0"
---

# Stdout contract exit codes and signal cleanup (media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The CLI writes one JSON result to stdout, sends logs to stderr, and returns distinct process exit codes for success, tool error, usage error, startup error, and signals.

Success exits with 0. A tool error exits with 1. Usage and argument errors exit with 2. Startup errors exit with 3. SIGINT and SIGTERM return 130 and 143 after active child processes and temporary outputs are cleaned up.

---

## 2. HOW IT WORKS

Success exits with 0. A tool error exits with 1. Usage and argument errors exit with 2. Startup errors exit with 3. SIGINT and SIGTERM return 130 and 143 after active child processes and temporary outputs are cleaned up.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/cli.ts](../../../runtime/src/cli.ts) | Script | Formats the JSON output and maps dispatch outcomes to process exit codes. |
| [../../../runtime/src/core/process-runner.ts](../../../runtime/src/core/process-runner.ts) | Shared | Tracks child processes and performs signal cleanup. |
| [../../../runtime/src/core/errors.ts](../../../runtime/src/core/errors.ts) | Shared | Defines structured failure codes. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/cli/cli-process.vitest.ts](../../../runtime/tests/cli/cli-process.vitest.ts) | Vitest | Checks stdout JSON and process exit behavior. |
| [../../../runtime/tests/cli/in-flight-outputs.vitest.ts](../../../runtime/tests/cli/in-flight-outputs.vitest.ts) | Vitest | Checks cleanup for interrupted output work. |
| [../../../runtime/tests/core/process-runner.vitest.ts](../../../runtime/tests/core/process-runner.vitest.ts) | Vitest | Covers process limits, stderr, timeouts, and cleanup. |

---

## 4. SOURCE METADATA

- Group: Command Line
- Canonical catalog source: `feature-catalog.md`
- Feature file path: command-line/stdout-contract-exit-codes-and-signal-cleanup.md

Related references:
- [Runtime options](runtime-options.md) - Neighboring command line entry.
