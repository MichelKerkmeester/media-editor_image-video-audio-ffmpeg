---
title: "Media health"
description: "Reports the server version, where ffmpeg and ffprobe were found, which encoders and filters they offer, the image engine versions, and the folders and limits in effect. It runs without reading any media file. It reports local paths."
trigger_phrases:
  - "Media health"
  - "media health"
  - "media_health"
version: "1.0.0.0"
---

# Media health (media_health)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Reports the server version, where ffmpeg and ffprobe were found, which encoders and filters they offer, the image engine versions, and the folders and limits in effect. It runs without reading any media file. It reports local paths.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_health. The call succeeds as a report when binaries are missing. Missing ffmpeg or ffprobe is reported in the returned fields. Its `nextStep` field names `media_setup_ffmpeg` when a binary is missing and is null otherwise, so the command line and MCP clients read the same next step.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| none | No input fields | The tool takes no arguments. |

### Error conditions

The handler does not declare an operation-specific MediaError code.

Operation-specific refusal conditions are summarized in the overview above. Shared path, capability, process, and output failures use the codes in the error reference.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/media/health.ts](../../../runtime/src/tools/media/health.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/core/capabilities.ts](../../../runtime/src/core/capabilities.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/ffmpeg-resolver.ts](../../../runtime/src/core/ffmpeg-resolver.ts) | Shared | Shared behavior directly used by this handler. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/media/health.vitest.ts](../../../runtime/tests/tools/media/health.vitest.ts) | Vitest | Exercises media_health behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Media Utility Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: media-utility-tools/media-health.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
