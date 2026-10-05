---
title: "Media rename"
description: "Gives one image, video or audio file inside the export folder a readable name. A generic name such as \"CleanShot 2026-10-03 at 16.46.54-converted.webp\" becomes \"team-offsite-hero.webp\" for the name \"team offsite hero\". The name is slugged to lowercase words joined by hyphens, the file keeps its extension and its folder, and an existing file is never overwritten. Files outside the export folder are refused."
trigger_phrases:
  - "Media rename"
  - "media rename"
  - "media_rename"
version: "1.0.0.0"
---

# Media rename (media_rename)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Gives one image, video or audio file inside the export folder a readable name. A generic name such as "CleanShot 2026-10-03 at 16.46.54-converted.webp" becomes "team-offsite-hero.webp" for the name "team offsite hero". The name is slugged to lowercase words joined by hyphens, the file keeps its extension and its folder, and an existing file is never overwritten. Files outside the export folder are refused.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_rename. The source must be a supported image, video, audio, playlist, or segment inside the export root. The destination keeps the extension, and an existing file is refused rather than overwritten.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| path | Required string, at least 1 characters | Absolute path of the file to rename, inside the export folder. |
| newName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Readable name of 1 to 64 characters, without a folder. A trailing extension is dropped, because the file keeps its own. |

### Error conditions

The handler declares these MediaError codes: `OUTPUT_EXISTS`, `UNSUPPORTED_FORMAT`.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/media/rename.ts](../../../runtime/src/tools/media/rename.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/path-guard.ts](../../../runtime/src/core/path-guard.ts) | Shared | Shared behavior directly used by this handler. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/media/rename.vitest.ts](../../../runtime/tests/tools/media/rename.vitest.ts) | Vitest | Exercises media_rename behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Media Utility Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: media-utility-tools/media-rename.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
