---
title: "Video add image overlay"
description: "Places one scaled image over a video for a time span, at a chosen position and with an optional opacity. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own."
trigger_phrases:
  - "Video add image overlay"
  - "video add image overlay"
  - "video_add_image_overlay"
version: "1.0.0.0"
---

# Video add image overlay (video_add_image_overlay)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Places one scaled image over a video for a time span, at a chosen position and with an optional opacity. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_image_overlay. The video and overlay image must resolve inside allowed roots. End time, when supplied with start time, must be later. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| imagePath | Required string, at least 1 characters | Absolute path of the image to place over the video, inside an allowed root. The file is not changed. |
| position | Optional string, one of top_left, top-left, top_center, top-center, top_right, top-right, center_left, center-left, center, center_right, center-right, bottom_left, bottom-left, bottom_center, bottom-center, bottom_right, bottom-right, default "top_right" | Where the image sits on the frame: top_left, top_center, top_right, center_left, center, center_right, bottom_left, bottom_center or bottom_right. Defaults to top_right. |
| opacity | Optional number, 0 to 1 | Opacity of the image from 0 to 1, where 0 is invisible and 1 is solid. Omitted keeps the alpha the image itself carries. |
| startTime | Optional number or string | When the image starts being drawn, in seconds. Accepts a number of seconds, a plain numeric string, HH:MM:SS, HH:MM:SS.mmm, or MM:SS. Omitted starts at the beginning of the video. |
| endTime | Optional number or string | When the image stops being drawn, in seconds. Accepts a number of seconds, a plain numeric string, HH:MM:SS, HH:MM:SS.mmm, or MM:SS. It must be later than startTime. Omitted runs to the end of the video. |
| width | Optional integer, 1 to 32768 | Width of the image in pixels, from 1 to 32768. Omitted means the width follows from height. |
| height | Optional integer, 1 to 32768 | Height of the image in pixels, from 1 to 32768. Omitted means the height follows from width. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `end-not-after-start` | The overlay end time does not follow its start time. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/add-image-overlay.ts](../../../runtime/src/tools/video/add-image-overlay.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/composition/add-image-overlay.vitest.ts](../../../runtime/tests/tools/composition/add-image-overlay.vitest.ts) | Vitest | Exercises video_add_image_overlay behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Editing Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-editing-tools/video-add-image-overlay.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
