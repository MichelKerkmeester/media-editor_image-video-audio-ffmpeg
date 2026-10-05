---
title: "Image convert"
description: "Converts one image to jpeg, png, webp, or avif. Quality from 1 to 100 is visual quality for jpeg, webp, and avif, and the palette colour target for png. maxBytes caps the file size for jpeg, webp, and avif by lowering quality, never by resizing. It writes one re-encoded file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input."
trigger_phrases:
  - "Image convert"
  - "image convert"
  - "image_convert"
version: "1.0.0.0"
---

# Image convert (image_convert)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Converts one image to jpeg, png, webp, or avif. Quality from 1 to 100 is visual quality for jpeg, webp, and avif, and the palette colour target for png. maxBytes caps the file size for jpeg, webp, and avif by lowering quality, never by resizing. It writes one re-encoded file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_convert. The maxBytes option is limited to JPEG, WebP, and AVIF. The handler rejects maxBytes with PNG, and refuses before writing if quality reduction to 1 still cannot meet the byte ceiling. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| format | Required string, one of jpeg, jpg, png, webp, avif | Target format: jpeg, png, webp, or avif. |
| quality | Optional integer, 1 to 100, default 80 | Quality from 1 to 100 on the sharp scale, higher is better. It is visual quality for jpeg, webp, and avif, and the palette colour target for png. Defaults to 80. |
| maxBytes | Optional integer, 1 to 100000000 | Largest allowed file size in bytes, for jpeg, webp and avif only. 100 KB is 100000 bytes. The tool lowers quality from the quality value toward 1 until the file fits, never resizes, and fails without writing when even quality 1 is too large. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `max-bytes-unreachable` | The output still exceeds maxBytes at the minimum quality. |
| `INVALID_INPUT` | `max-bytes-format` | maxBytes was paired with a format the handler does not size-cap. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/image/convert.ts](../../../runtime/src/tools/image/convert.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/image/sharp-output.ts](../../../runtime/src/tools/image/sharp-output.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/image/convert.vitest.ts](../../../runtime/tests/tools/image/convert.vitest.ts) | Vitest | Exercises image_convert behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Image Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: image-tools/image-convert.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
