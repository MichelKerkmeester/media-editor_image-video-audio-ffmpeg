---
title: "Image probe"
description: "Reads the format, pixel size, channels, bit depth, colour space, density, alpha and byte size of one image. With preview it also returns a small JPEG of the picture, to name the file by what it shows. It writes no file and never changes the input."
trigger_phrases:
  - "Image probe"
  - "image probe"
  - "image_probe"
version: "1.0.0.0"
---

# Image probe (image_probe)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Reads the format, pixel size, channels, bit depth, colour space, density, alpha and byte size of one image. With preview it also returns a small JPEG of the picture, to name the file by what it shows. It writes no file and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_probe. The probe accepts image files. With preview enabled, it adds a JPEG preview when decoding succeeds and reports preview failure as a warning.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| preview | Optional boolean | true also returns a small JPEG of the content, at most 512 pixels on the longest side, so the picture can be seen before naming the file. A video gives one frame. Audio has no picture. Defaults to false. |

### Error conditions

The handler does not declare an operation-specific MediaError code.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/image/probe.ts](../../../runtime/src/tools/image/probe.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/image/sharp-output.ts](../../../runtime/src/tools/image/sharp-output.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/tools/media/preview.ts](../../../runtime/src/tools/media/preview.ts) | Shared | Shared behavior directly used by this handler. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/image/probe.vitest.ts](../../../runtime/tests/tools/image/probe.vitest.ts) | Vitest | Exercises image_probe behavior through the test suite. |
| [runtime/tests/tools/media/preview.vitest.ts](../../../runtime/tests/tools/media/preview.vitest.ts) | Vitest | Exercises image_probe behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Image Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: image-tools/image-probe.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
