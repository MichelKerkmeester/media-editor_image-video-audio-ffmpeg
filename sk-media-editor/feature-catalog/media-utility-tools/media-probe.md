---
title: "Media probe"
description: "Reads container and stream metadata from one image, audio or video file with ffprobe: format name, duration, size and bit rate, plus the codec, pixel size, frame rate, sample rate and channel layout of every stream. With preview it also returns one small JPEG frame, to name the file by what it shows. It writes nothing, creates no output folder, and never changes the input."
trigger_phrases:
  - "Media probe"
  - "media probe"
  - "media_probe"
version: "1.0.0.0"
---

# Media probe (media_probe)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Reads container and stream metadata from one image, audio or video file with ffprobe: format name, duration, size and bit rate, plus the codec, pixel size, frame rate, sample rate and channel layout of every stream. With preview it also returns one small JPEG frame, to name the file by what it shows. It writes nothing, creates no output folder, and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_probe. The input must be readable by ffprobe. Preview failure is a warning and does not discard metadata.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| preview | Optional boolean | true also returns a small JPEG of the content, at most 512 pixels on the longest side, so the picture can be seen before naming the file. A video gives one frame. Audio has no picture. Defaults to false. |

### Error conditions

The handler declares these MediaError codes: `PROCESS_FAILED`.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/media/probe.ts](../../../runtime/src/tools/media/probe.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/media/preview.ts](../../../runtime/src/tools/media/preview.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared behavior directly used by this handler. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/media/probe.vitest.ts](../../../runtime/tests/tools/media/probe.vitest.ts) | Vitest | Exercises media_probe behavior through the test suite. |
| [runtime/tests/tools/media/preview.vitest.ts](../../../runtime/tests/tools/media/preview.vitest.ts) | Vitest | Exercises media_probe behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Media Utility Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: media-utility-tools/media-probe.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
