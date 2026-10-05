---
title: "Video hls ladder"
description: "Encodes one video into an HLS ladder for streaming: one master playlist, one playlist per selected rung (1080p, 720p, 480p, 360p) and H.264 segments beside every playlist, all inside one new numbered folder. A rung taller than the source is left out and named in the result. It never changes the input and drops the audio track. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB."
trigger_phrases:
  - "Video hls ladder"
  - "video hls ladder"
  - "video_hls_ladder"
version: "1.0.0.0"
---

# Video hls ladder (video_hls_ladder)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Encodes one video into an HLS ladder for streaming: one master playlist, one playlist per selected rung (1080p, 720p, 480p, 360p) and H.264 segments beside every playlist, all inside one new numbered folder. A rung taller than the source is left out and named in the result. It never changes the input and drops the audio track. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_hls_ladder. Rungs must not repeat. Rungs taller than the source are dropped, and the call fails if no requested rung fits. Common output naming and placement limits are defined in the linked shared entries.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| inputPath | Required string, at least 1 characters | Absolute media path inside an allowed root. |
| outputName | Required string, 1 to 64 characters, pattern `^[^/\\]+$` | Output description. Required for writing tools. 1 to 64 characters, with no slash or backslash. |
| rungs | Optional array, 1 to 4 entries, default ["1080p", "720p", "480p", "360p"] | Quality rungs to build: 1 to 4 entries from 1080p, 720p, 480p and 360p with no repeats. Defaults to all four. The ladder always writes them from 1080p down to 360p, and dropping a rung is the file-size knob. A rung taller than the source is left out. |
| crf | Optional integer, 0 to 51, default 23 | H.264 quality on the CRF scale of 0 to 51, where lower is better quality and larger files. 23 is the recommended value, 18 is visually lossless and 28 is medium. |
| segmentDuration | Optional integer, 2 to 10, default 2 | Target seconds per segment, from 2 to 10. 2 is recommended, 4 is acceptable and 6 to 10 is not. The GOP follows this value. |

### Error conditions

The handler declares these MediaError codes: `INVALID_INPUT`, `PROCESS_FAILED`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `duplicate-rung` | The same HLS rung was requested more than once. |
| `INVALID_INPUT` | `larger-than-source` | No requested HLS rung fits the source dimensions. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/video/hls-ladder.ts](../../../runtime/src/tools/video/hls-ladder.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/core/hls-folders.ts](../../../runtime/src/core/hls-folders.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Shared behavior directly used by this handler. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/media/hls-ladder.vitest.ts](../../../runtime/tests/tools/media/hls-ladder.vitest.ts) | Vitest | Exercises video_hls_ladder behavior through the test suite. |
| [runtime/tests/tools/media/hls-rungs.vitest.ts](../../../runtime/tests/tools/media/hls-rungs.vitest.ts) | Vitest | Exercises video_hls_ladder behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Video Editing Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: video-editing-tools/video-hls-ladder.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
