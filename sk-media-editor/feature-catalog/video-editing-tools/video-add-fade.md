---
title: "Video add fade"
description: "Adds one fade from black at the start or one fade to black at the end of a video. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB."
trigger_phrases:
  - "Video add fade"
  - "video add fade"
  - "video_add_fade"
version: "1.0.0.0"
---

# Video add fade (video_add_fade)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Adds one fade from black at the start or one fade to black at the end of a video. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_fade. The input must contain a video stream. The fade duration must be positive and no longer than the video. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| fadeType | Required string, one of fade_in, fade_out, crossfade_from_black, crossfade_to_black | Which end fades: fade_in brings the picture up from black at the start and fade_out takes it down to black at the end. |
| duration | Required number, greater than 0 | Length of the fade in seconds. Use a value greater than 0 and no longer than the video itself. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`, `UNSUPPORTED_FORMAT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `longer-than-video` | The fade duration exceeds the video duration. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/add-fade.ts](../../../runtime/src/tools/video/add-fade.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/composition/add-fade.vitest.ts](../../../runtime/tests/tools/composition/add-fade.vitest.ts) | Vitest | Exercises video_add_fade behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Editing Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-editing-tools/video-add-fade.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
