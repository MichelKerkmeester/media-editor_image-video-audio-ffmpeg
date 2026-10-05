---
title: "Media repair"
description: "Diagnoses a damaged or partly readable video or audio file with ffprobe, then rewrites it with a matching ffmpeg pass: remux copies the streams into a fresh container, which repairs a missing or broken index or timestamp table. Reencode rebuilds the streams as H.264 and AAC (AAC alone for audio), which repairs damaged or cut-short streams. It writes one new file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB."
trigger_phrases:
  - "Media repair"
  - "media repair"
  - "media_repair"
version: "1.0.0.0"
---

# Media repair (media_repair)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Diagnoses a damaged or partly readable video or audio file with ffprobe, then rewrites it with a matching ffmpeg pass: remux copies the streams into a fresh container, which repairs a missing or broken index or timestamp table. Reencode rebuilds the streams as H.264 and AAC (AAC alone for audio), which repairs damaged or cut-short streams. It writes one new file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_repair. The diagnosis must find at least one audio or video stream. Strategy selects remux, reencode, or an automatic copy followed by decode check and a reencode fallback. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| strategy | Optional string, one of auto, remux, reencode, default "auto" | How the file is rewritten. remux copies the streams into a fresh container, which repairs a missing or broken index or timestamp table, reencode rebuilds the streams as H.264 and AAC (AAC alone for audio), which repairs damaged or cut-short streams, auto copies first, decodes the copy once, and re-encodes when the copy fails or still has decode errors. Defaults to auto. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler declares these MediaError codes: `PROCESS_FAILED`, `UNSUPPORTED_FORMAT`.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/media/repair.ts](../../../runtime/src/tools/media/repair.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/tools/video/copy-then-encode.ts](../../../runtime/src/tools/video/copy-then-encode.ts) | Shared | Shared behavior directly used by this handler. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/media/repair-diagnose.vitest.ts](../../../runtime/tests/tools/media/repair-diagnose.vitest.ts) | Vitest | Exercises media_repair behavior through the test suite. |
| [runtime/tests/tools/media/repair-strategies.vitest.ts](../../../runtime/tests/tools/media/repair-strategies.vitest.ts) | Vitest | Exercises media_repair behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Media Utility Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: media-utility-tools/media-repair.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
