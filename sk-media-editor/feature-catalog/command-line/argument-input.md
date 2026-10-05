---
title: "Argument input"
description: "A media-editor tool call reads its JSON arguments from exactly one of --args, --args-file, or standard input."
trigger_phrases:
  - "Argument input"
  - "argument input"
  - "--args"
version: "1.0.0.0"
---

# Argument input (--args)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

A media-editor tool call reads its JSON arguments from exactly one of --args, --args-file, or standard input.

--args parses inline JSON. --args-file reads JSON from the named file. With neither option, a piped standard input supplies the argument object. On an interactive terminal the call starts from an empty object. Conflicting argument sources are rejected as usage errors.

---

## 2. HOW IT WORKS

--args parses inline JSON. --args-file reads JSON from the named file. With neither option, a piped standard input supplies the argument object. On an interactive terminal the call starts from an empty object. Conflicting argument sources are rejected as usage errors.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/cli.ts](../../../runtime/src/cli.ts) | Script | Parses the three argument sources and validates their exclusivity. |
| [../../../runtime/src/core/config.ts](../../../runtime/src/core/config.ts) | Shared | Parses command-line configuration values. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/cli/cli-process.vitest.ts](../../../runtime/tests/cli/cli-process.vitest.ts) | Vitest | Covers argument parsing and JSON input paths. |
| [../../../runtime/tests/cli/dispatch.vitest.ts](../../../runtime/tests/cli/dispatch.vitest.ts) | Vitest | Covers invalid and valid CLI dispatch input. |

---

## 4. SOURCE METADATA

- Group: Command Line
- Canonical catalog source: `feature-catalog.md`
- Feature file path: command-line/argument-input.md

Related references:
- [Media editor command](media-editor-command.md) - Neighboring command line entry.
- [Runtime options](runtime-options.md) - Neighboring command line entry.
