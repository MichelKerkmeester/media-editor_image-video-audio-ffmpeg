---
title: "Output placement"
description: "Writing tools place one result in the export root and can group multi-file results in numbered folders."
trigger_phrases:
  - "Output placement"
  - "output placement"
  - "output-folder.ts"
version: "1.0.0.0"
---

# Output placement (output-folder.ts)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Writing tools place one result in the export root and can group multi-file results in numbered folders.

A call can force a new numbered folder with subfolder. Later calls can target an existing numbered folder through targetFolder. The target must be a direct child of the export root and must already exist.

---

## 2. HOW IT WORKS

A call can force a new numbered folder with subfolder. Later calls can target an existing numbered folder through targetFolder. The target must be a direct child of the export root and must already exist.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates numbered folders, validates target folders, and picks collision-free file names. |
| [../../../runtime/src/server/dispatch.ts](../../../runtime/src/server/dispatch.ts) | Shared | Adds shared placement fields to applicable tool schemas. |
| [../../../runtime/src/server/tool-context.ts](../../../runtime/src/server/tool-context.ts) | Shared | Connects tool handlers to output allocation and read-back. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/tools/media/placement.vitest.ts](../../../runtime/tests/tools/media/placement.vitest.ts) | Vitest | Covers root placement, numbered folders, targetFolder reuse, conflicts, and containment. |
| [../../../runtime/tests/core/output-folder.vitest.ts](../../../runtime/tests/core/output-folder.vitest.ts) | Vitest | Covers folder allocation and target-folder validation. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/output-placement.md

Related references:
- [Output naming](output-naming.md) - Neighboring shared tool behavior entry.
- [Path guard and allowed folders](path-guard-and-allowed-folders.md) - Neighboring shared tool behavior entry.
