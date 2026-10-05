---
title: "Media remove silence"
description: "Finds silent stretches in an audio or video file and keeps the loud parts, so the result plays back to back. A file with no audio stream is refused. It writes one new file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB."
trigger_phrases:
  - "Media remove silence"
  - "media remove silence"
  - "media_remove_silence"
version: "1.0.0.0"
---

# Media remove silence (media_remove_silence)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Finds silent stretches in an audio or video file and keeps the loud parts, so the result plays back to back. A file with no audio stream is refused. It writes one new file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_remove_silence. The input must contain an audio stream and a readable duration. If every stretch is silent at the selected threshold, the call is rejected. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| silenceThresholdDb | Optional number, -100 to 0, default -30 | Level in dBFS below which sound counts as silence. Use a value from -100 to 0. Defaults to -30. |
| minSilenceDurationMs | Optional integer, 1 to 600000, default 500 | Shortest silent stretch to remove, in milliseconds. Use a whole number from 1 to 600000. Defaults to 500. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`, `UNSUPPORTED_FORMAT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `all-silent` | Every stretch is silent at the selected threshold. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/media/remove-silence.ts](../../../runtime/src/tools/media/remove-silence.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared behavior directly used by this handler. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/composition/remove-silence.vitest.ts](../../../runtime/tests/tools/composition/remove-silence.vitest.ts) | Vitest | Exercises media_remove_silence behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Media Utility Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: media-utility-tools/media-remove-silence.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
