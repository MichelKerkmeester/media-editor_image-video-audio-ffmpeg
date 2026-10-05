---
title: "Media setup ffmpeg"
description: "Finds ffmpeg and ffprobe, and downloads a pinned build of either one that is missing after the user consents. The first call returns the planned download, with its URL, size, SHA-256 and destination, for the user to review, and `consent: true` must only be passed after the user accepts it."
trigger_phrases:
  - "Media setup ffmpeg"
  - "media setup ffmpeg"
  - "media_setup_ffmpeg"
version: "1.0.0.0"
---

# Media setup ffmpeg (media_setup_ffmpeg)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Finds ffmpeg and ffprobe, and downloads a pinned build of either one that is missing after the user consents. The first call returns the planned download, with its URL, size, SHA-256 and destination, for the user to review, and `consent: true` must only be passed after the user accepts it.

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_setup_ffmpeg. The tool reports the pinned URL, size, SHA-256, and destination before installation. Missing user consent, unsupported platform, missing license text, download failure, checksum mismatch, and post-install resolution failure are explicit errors.

---

## 2. HOW IT WORKS

The schema table lists the required and optional inputs, their limits, defaults, and accepted values. The handler applies any semantic checks noted above before processing. Shared path, placement, result, capability, and process behavior is documented in the [error reference](../shared-tool-behavior/error-codes-and-result-shape.md), [output naming](../shared-tool-behavior/output-naming.md), and [output placement](../shared-tool-behavior/output-placement.md).

### Inputs

| Input | Schema limit | Role |
|---|---|---|
| component | Optional string, one of ffmpeg, ffprobe, both, default "both" | Which binary to check and, when one is missing, offer to install: ffmpeg, ffprobe or both. Both checks ffmpeg first and then ffprobe. |
| consent | Optional boolean, default false | Pass true only after the user has seen the planned download for every missing component, including its URL, size, SHA-256 and destination, and accepted it. Without it the call writes nothing. |

### Error conditions

The handler declares these MediaError codes: `CHECKSUM_MISMATCH`, `CONSENT_REQUIRED`, `DOWNLOAD_FAILED`, `INTERNAL`, `INVALID_INPUT`.

| Code | Reason | Condition |
|---|---|---|
| `INVALID_INPUT` | `unsupported-platform` | No pinned build exists for this operating system and architecture. |
| `INTERNAL` | `licence-missing` | The pinned build license text is unavailable. |
| `INTERNAL` | `install-not-resolved` | The installed binary could not be resolved after placement. |
| `DOWNLOAD_FAILED` | `write` | The installed binary could not be read back. |

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [src/tools/media/setup-ffmpeg.ts](../../../runtime/src/tools/media/setup-ffmpeg.ts) | Handler | Registers the tool schema and executes its operation. |
| [src/core/artifact-download.ts](../../../runtime/src/core/artifact-download.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/ffmpeg-resolver.ts](../../../runtime/src/core/ffmpeg-resolver.ts) | Shared | Shared behavior directly used by this handler. |
| [src/core/pinned-builds.ts](../../../runtime/src/core/pinned-builds.ts) | Shared | Shared behavior directly used by this handler. |
| [src/server/field-schemas.ts](../../../runtime/src/server/field-schemas.ts) | Shared | Defines shared output naming and placement inputs where used. |
| [src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Allocates or validates the destination and writes without replacement. |
| [src/core/result.ts](../../../runtime/src/core/result.ts) | Shared | Builds the structured result and reads back written outputs. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [runtime/tests/tools/media/setup-ffmpeg.vitest.ts](../../../runtime/tests/tools/media/setup-ffmpeg.vitest.ts) | Vitest | Exercises media_setup_ffmpeg behavior through the test suite. |

---

## 4. SOURCE METADATA

- Group: Media Utility Tools
- Canonical catalog source: `feature-catalog.md`
- Feature file path: media-utility-tools/media-setup-ffmpeg.md

Related references:
- [Output naming](../shared-tool-behavior/output-naming.md) - Shared name limits and fallback behavior.
- [Output placement](../shared-tool-behavior/output-placement.md) - Shared destination and collision behavior.
