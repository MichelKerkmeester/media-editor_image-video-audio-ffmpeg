---
title: "Path guard and allowed folders"
description: "Media Editor resolves input files only inside configured allowed roots and checks paths again before a process uses them."
trigger_phrases:
  - "Path guard and allowed folders"
  - "path guard and allowed folders"
  - "path-guard.ts"
version: "1.0.0.0"
---

# Path guard and allowed folders (path-guard.ts)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Media Editor resolves input files only inside configured allowed roots and checks paths again before a process uses them.

Input paths must be absolute and identify readable regular files. The path guard resolves roots and candidates, rejects paths outside configured roots, and detects changed inputs before processing.

---

## 2. HOW IT WORKS

Input paths must be absolute and identify readable regular files. The path guard resolves roots and candidates, rejects paths outside configured roots, and detects changed inputs before processing.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/core/path-guard.ts](../../../runtime/src/core/path-guard.ts) | Shared | Resolves allowed inputs and verifies them before processing. |
| [../../../runtime/src/server/tool-context.ts](../../../runtime/src/server/tool-context.ts) | Shared | Provides guarded input resolution to handlers. |
| [../../../runtime/src/core/config.ts](../../../runtime/src/core/config.ts) | Shared | Loads allowed folders and runtime settings. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/path-guard.vitest.ts](../../../runtime/tests/core/path-guard.vitest.ts) | Vitest | Covers roots, path forms, symlinks, changed inputs, and output-on-input refusals. |
| [../../../runtime/tests/server/tool-context.vitest.ts](../../../runtime/tests/server/tool-context.vitest.ts) | Vitest | Checks guarded context behavior and warnings. |
| [../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/error-code-handoff.md](../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/error-code-handoff.md) | Manual playbook | Covers a PATH_NOT_ALLOWED refusal. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/path-guard-and-allowed-folders.md

Related references:
- [Output placement](output-placement.md) - Neighboring shared tool behavior entry.
- [Error codes and result shape](error-codes-and-result-shape.md) - Neighboring shared tool behavior entry.
