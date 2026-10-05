---
title: "Video convert properties"
description: "Changes a video's container and can set its resolution, codecs, bitrates, frame rate, and audio properties. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input."
trigger_phrases:
  - "Video convert properties"
  - "video convert properties"
  - "video_convert_properties"
version: "1.0.0.0"
---

# Video convert properties (video_convert_properties)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Changes a video's container and can set its resolution, codecs, bitrates, frame rate, and audio properties. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_convert_properties. The input must contain a video stream. Resolution values accept the forms described by the schema. The handler rejects values outside its supported range. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| format | Required string, one of mp4, mov, mkv, webm, avi | Video container. mp4, mov, mkv, webm, or avi. |
| resolution | Optional string | Picture size in pixels. A width and height such as 160x100, or a height such as 120, each side from 1 to 32768. preserve keeps the original size. |
| codec | Optional string, one of libx264, libx265, libvpx-vp9, vp9 | Video encoder. libx264, libx265, or libvpx-vp9. When omitted, the container's default encoder is used. |
| videoBitrate | Optional string, pattern `^\d+(?:\.\d+)?[kM]$` | Video bitrate from 1k to 100M, for example 1M. k is 1000 bit/s and M is 1000000 bit/s. |
| frameRate | Optional number, maximum 240, greater than 0 | Frame rate in frames per second, greater than 0 and at most 240. |
| audioCodec | Optional string, one of aac, libmp3lame, libopus | Audio encoder. aac, libmp3lame, or libopus. When omitted, the container's default encoder is used. |
| audioBitrate | Optional string, pattern `^\d+(?:\.\d+)?[kM]$` | Audio bitrate from 1k to 100M, for example 128k. k is 1000 bit/s and M is 1000000 bit/s. |
| sampleRate | Optional integer, 8000 to 384000 | Sample rate in hertz, from 8000 to 384000. |
| channels | Optional integer, 1 to 8 | Channel count from 1 to 8. 1 is mono and 2 is stereo. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `out-of-range` | A parsed media value is outside its supported range. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/convert-properties.ts](../../../runtime/src/tools/video/convert-properties.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/video/convert-properties.vitest.ts](../../../runtime/tests/tools/video/convert-properties.vitest.ts) | Vitest | Exercises video_convert_properties behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Format Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-format-tools/video-convert-properties.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
