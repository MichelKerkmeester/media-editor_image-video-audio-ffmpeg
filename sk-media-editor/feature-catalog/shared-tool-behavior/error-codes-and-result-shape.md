---
title: "Error codes and result shape"
description: "Tool failures use a fixed error-code set, while successful calls return a common structured result with tool-specific fields."
trigger_phrases:
  - "Error codes and result shape"
  - "error codes and result shape"
  - "MediaError"
version: "1.0.0.0"
---

# Error codes and result shape (MediaError)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Tool failures use a fixed error-code set, while successful calls return a common structured result with tool-specific fields.

Successful results include tool, outputs, warnings, and elapsedMs. Each output entry reports its path, byte size, media type, and available read-back fields. Failures carry a code, message, and details object.

---

## 2. HOW IT WORKS

Successful results include tool, outputs, warnings, and elapsedMs. Each output entry reports its path, byte size, media type, and available read-back fields. Failures carry a code, message, and details object.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/core/errors.ts](../../../runtime/src/core/errors.ts) | Shared | Defines MediaError and the error-code set. |
| [../../../runtime/src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds successful and failed MCP results and output entries. |
| [../../../runtime/src/server/dispatch.ts](../../../runtime/src/server/dispatch.ts) | Shared | Converts handler results and thrown errors into the tool response. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/errors.vitest.ts](../../../runtime/tests/core/errors.vitest.ts) | Vitest | Covers error conversion and code preservation. |
| [../../../runtime/tests/core/result.vitest.ts](../../../runtime/tests/core/result.vitest.ts) | Vitest | Covers success, error, and read-back result shapes. |
| [../../../runtime/tests/server/registry.vitest.ts](../../../runtime/tests/server/registry.vitest.ts) | Vitest | Checks handler failures at the registry boundary. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/error-codes-and-result-shape.md

Related references:
- [Path guard and allowed folders](path-guard-and-allowed-folders.md) - Neighboring shared tool behavior entry.
- [Persistent probe cache](persistent-probe-cache.md) - Neighboring shared tool behavior entry.
