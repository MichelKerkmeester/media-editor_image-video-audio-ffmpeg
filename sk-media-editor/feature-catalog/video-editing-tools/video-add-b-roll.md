---
title: "Video add b roll"
description: "Overlays one or more clips onto a main video as timed overlays, each at its own position and shown length, with optional fades. Every clip starts from its first frame when its window opens. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes an input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it."
trigger_phrases:
  - "Video add b roll"
  - "video add b roll"
  - "video_add_b_roll"
version: "1.0.0.0"
---

# Video add b roll (video_add_b_roll)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Overlays one or more clips onto a main video as timed overlays, each at its own position and shown length, with optional fades. Every clip starts from its first frame when its window opens. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes an input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_b_roll. The schema permits up to fifty clips, but the handler rejects an empty list. Each insert point must precede the main video's end, each clip must have usable duration, and fullscreen clips cannot specify scale. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| clips | Required array, 0 to 50 entries | Clips to overlay, one entry each. Use 1 to 50 entries. Every clip is shown from its own insertAt for its own length, in insertAt order. |
| clips[].clipPath | Required string, at least 1 characters | Absolute path of the clip to overlay, inside an allowed root. The file is not changed. |
| clips[].insertAt | Required number or string | When the clip starts being shown, in seconds. Accepts a number of seconds, a plain numeric string, HH:MM:SS, HH:MM:SS.mmm, or MM:SS. It must be less than the main video's duration. |
| clips[].duration | Optional number, greater than 0 | Seconds of the clip to show. Defaults to the clip's own duration. Use a value greater than 0. |
| clips[].position | Optional string, one of top_left, top-left, top_center, top-center, top_right, top-right, center_left, center-left, center, center_right, center-right, bottom_left, bottom-left, bottom_center, bottom-center, bottom_right, bottom-right, fullscreen, default "fullscreen" | Where the clip sits on the frame: top_left, top_center, top_right, center_left, center, center_right, bottom_left, bottom_center, bottom_right or fullscreen. Defaults to fullscreen. |
| clips[].scale | Optional number, 0.01 to 10 | Size factor of the clip's own size for the grid positions, from 0.01 to 10. Defaults to 0.5. A fullscreen clip always fills the frame, so scale cannot be set there. |
| clips[].fadeIn | Optional boolean, default false | When true, the clip fades in from black as its window opens. Defaults to false. |
| clips[].fadeOut | Optional boolean, default false | When true, the clip fades out to black before its window ends. Defaults to false. |
| clips[].fadeDuration | Optional number, greater than 0, default 0.5 | Seconds each fade lasts. Use a value greater than 0. Defaults to 0.5. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INTERNAL`, `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `empty` | No b-roll clips were supplied. |
| `INVALID_INPUT` | `scale-with-fullscreen` | A fullscreen b-roll clip also supplied a scale. |
| `INVALID_INPUT` | `past-end` | A b-roll clip starts at or after the main video ends. |
| `INVALID_INPUT` | `duration-unavailable` | A b-roll clip has no usable duration. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/add-b-roll.ts](../../../runtime/src/tools/video/add-b-roll.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/composition/add-b-roll.vitest.ts](../../../runtime/tests/tools/composition/add-b-roll.vitest.ts) | Vitest | Exercises video_add_b_roll behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Editing Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-editing-tools/video-add-b-roll.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
