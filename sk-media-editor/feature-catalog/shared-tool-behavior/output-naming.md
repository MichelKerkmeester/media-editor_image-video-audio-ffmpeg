---
title: "Output naming"
description: "Media Editor derives stable output names from the input and operation or from a readable name supplied by the caller."
trigger_phrases:
  - "Output naming"
  - "output naming"
  - "output-folder.ts"
version: "1.0.0.0"
---

# Output naming (output-folder.ts)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Media Editor derives stable output names from the input and operation or from a readable name supplied by the caller.

outputName names numbered folders. fileName names a result file and is limited to one path segment. The shared writer slugifies names, preserves the output extension, and avoids overwriting an existing result.

---

## 2. HOW IT WORKS

outputName names numbered folders. fileName names a result file and is limited to one path segment. The shared writer slugifies names, preserves the output extension, and avoids overwriting an existing result.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Builds output slugs, readable file names, operation suffixes, and exclusive writes. |
| [../../../runtime/src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines outputName and fileName schema limits. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/output-folder.vitest.ts](../../../runtime/tests/core/output-folder.vitest.ts) | Vitest | Covers slug rules, readable file names, UTF-8 byte limits, and non-overwriting writes. |
| [../../../runtime/tests/tools/image/output-name.vitest.ts](../../../runtime/tests/tools/image/output-name.vitest.ts) | Vitest | Checks output names across writing image tools. |
| [../../../runtime/tests/tools/media/placement.vitest.ts](../../../runtime/tests/tools/media/placement.vitest.ts) | Vitest | Covers registered tools and output naming fields. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/output-naming.md

Related references:
- [Output placement](output-placement.md) - Neighboring shared tool behavior entry.
