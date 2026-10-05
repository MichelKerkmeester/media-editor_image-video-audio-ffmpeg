---
title: "Image batch resize"
description: "Resizes one image into each listed size. It writes one file per size, all in one new numbered folder unless subfolder is false, or in the existing folder named by targetFolder, and never changes the input."
trigger_phrases:
  - "Image batch resize"
  - "image batch resize"
  - "image_batch_resize"
version: "1.0.0.0"
---

# Image batch resize (image_batch_resize)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Resizes one image into each listed size. It writes one file per size, all in one new numbered folder unless subfolder is false, or in the existing folder named by targetFolder, and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_batch_resize. The schema allows one to twenty entries. The handler rejects repeated output suffixes before writing. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| sizes | Required array, 1 to 20 entries | One to 20 sizes. Each entry writes one file. |
| sizes[].width | Required integer, 1 to 32768 | Target width in pixels, from 1 to 32768. |
| sizes[].height | Optional integer, 1 to 32768 | Target height in pixels, from 1 to 32768. Optional. An omitted side keeps the aspect ratio. |
| sizes[].suffix | Required string, 1 to 16 characters, pattern `^[a-z0-9]([a-z0-9_-]{0,14}[a-z0-9])?$` | File-name token of 1 to 16 characters. Lowercase letters, digits, hyphens, and underscores, starting and ending with a letter or digit. |
| format | Optional string, one of jpeg, jpg, png, webp, avif | Output format: jpeg, png, webp, or avif. Optional. When omitted, the input format is kept. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `duplicate-suffix` | Two batch entries use the same suffix. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/image/batch-resize.ts](../../../runtime/src/tools/image/batch-resize.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/image/sharp-output.ts](../../../runtime/src/tools/image/sharp-output.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/image/batch-resize.vitest.ts](../../../runtime/tests/tools/image/batch-resize.vitest.ts) | Vitest | Exercises image_batch_resize behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Image Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: image-tools/image-batch-resize.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
