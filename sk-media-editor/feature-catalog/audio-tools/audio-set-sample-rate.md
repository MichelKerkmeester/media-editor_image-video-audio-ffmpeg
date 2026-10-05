---
title: "Audio set sample rate"
description: "Re-encodes one audio file at a target sample rate. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input."
trigger_phrases:
  - "Audio set sample rate"
  - "audio set sample rate"
  - "audio_set_sample_rate"
version: "1.0.0.0"
---

# Audio set sample rate (audio_set_sample_rate)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Re-encodes one audio file at a target sample rate. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_set_sample_rate. The input must contain an audio stream. A video input keeps its audio and drops its picture. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| sampleRate | Required integer, 8000 to 384000 | Target sample rate in hertz, from 8000 to 384000. |
| fileName | Optional string, 1 to 64 characters, pattern `^[^/\\]+$` | Optional readable file name. 1 to 64 characters, with no slash or backslash. |
| subfolder | Optional boolean | Optional placement flag. true creates a numbered folder. false uses the export root. |
| targetFolder | Optional string, 1 to 80 characters | Optional existing numbered folder. 1 to 80 characters. Cannot pair with subfolder false. |

### Error conditions

The handler does not declare an operation-specific MediaError code.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/audio/set-sample-rate.ts](../../../runtime/src/tools/audio/set-sample-rate.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/core/process-runner.ts](../../../runtime/src/core/process-runner.ts) | Shared | Shared processing behavior used by this tool family. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/audio/set-sample-rate.vitest.ts](../../../runtime/tests/tools/audio/set-sample-rate.vitest.ts) | Vitest | Exercises audio_set_sample_rate behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Audio Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: audio-tools/audio-set-sample-rate.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
