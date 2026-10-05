---
title: "Video add subtitles"
description: "Burns one SubRip subtitle file into one video, using the subtitles filter and the font folder that ships with the server. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own."
trigger_phrases:
  - "Video add subtitles"
  - "video add subtitles"
  - "video_add_subtitles"
version: "1.0.0.0"
---

# Video add subtitles (video_add_subtitles)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Burns one SubRip subtitle file into one video, using the subtitles filter and the font folder that ships with the server. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_subtitles. The input must contain a video stream. The subtitle file must resolve inside an allowed root and be readable as a supported subtitle input. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| subtitlePath | Required string, at least 1 characters | Absolute path of a .srt subtitle file under an allowed root, burned into the video. The file is not changed. |
| fontStyle | Optional object | Optional styling for the burned-in subtitles. An omitted key keeps the default styling of the subtitles filter. |
| fontStyle.fontName | Optional string, 1 to 64 characters, pattern `^[A-Za-z0-9 -]+$` | Font family to draw with. |
| fontStyle.fontSize | Optional integer, 1 to 1000 | Text height in pixels. |
| fontStyle.fontColor | Optional string, pattern `^#[0-9A-Fa-f]{6}$` | Colour of the text as #RRGGBB. |
| fontStyle.outlineColor | Optional string, pattern `^#[0-9A-Fa-f]{6}$` | Colour of the outline as #RRGGBB. |
| fontStyle.outlineWidth | Optional number, 0 to 100 | Outline thickness in pixels. |
| fontStyle.shadowColor | Optional string, pattern `^#[0-9A-Fa-f]{6}$` | Colour of the shadow as #RRGGBB. |
| fontStyle.shadowOffset | Optional number, 0 to 100 | Shadow distance in pixels. |
| fontStyle.alignment | Optional integer, 1 to 9 | ASS numpad position of the text, where 1 is bottom-left and 7 is top-left. |
| fontStyle.marginV | Optional integer, 0 to 1000 | Vertical margin in pixels. |
| fontStyle.marginL | Optional integer, 0 to 1000 | Left margin in pixels. |
| fontStyle.marginR | Optional integer, 0 to 1000 | Right margin in pixels. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `UNSUPPORTED_FORMAT`.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/add-subtitles.ts](../../../runtime/src/tools/video/add-subtitles.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/composition/add-subtitles.vitest.ts](../../../runtime/tests/tools/composition/add-subtitles.vitest.ts) | Vitest | Exercises video_add_subtitles behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Editing Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-editing-tools/video-add-subtitles.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
