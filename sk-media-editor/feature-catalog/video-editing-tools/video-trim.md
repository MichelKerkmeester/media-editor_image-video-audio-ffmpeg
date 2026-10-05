---
title: "Video trim"
description: "Cuts one video to the span between two times. A stream copy is tried first, and the video is re-encoded only when that copy cannot be stored. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input."
trigger_phrases:
  - "Video trim"
  - "video trim"
  - "video_trim"
version: "1.0.0.0"
---

# Video trim (video_trim)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Cuts one video to the span between two times. A stream copy is tried first, and the video is re-encoded only when that copy cannot be stored. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_trim. The input must contain a video stream. The end time must be later than the start time. Times beyond the media duration are clamped to the end of the file. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| startTime | Required number or string | When the cut starts, in seconds. Accepts a number of seconds, a plain numeric string, HH:MM:SS, HH:MM:SS.mmm, or MM:SS. An end past the end of the file means the end of the file. |
| endTime | Required number or string | When the cut ends, in seconds. Accepts a number of seconds, a plain numeric string, HH:MM:SS, HH:MM:SS.mmm, or MM:SS. An end past the end of the file means the end of the file. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `end-not-after-start` | The end time does not follow the start time. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/trim.ts](../../../runtime/src/tools/video/trim.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/video/trim.vitest.ts](../../../runtime/tests/tools/video/trim.vitest.ts) | Vitest | Exercises video_trim behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Editing Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-editing-tools/video-trim.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
