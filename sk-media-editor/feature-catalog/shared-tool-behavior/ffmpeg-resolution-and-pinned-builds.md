---
title: "FFmpeg resolution and pinned builds"
description: "Media Editor locates ffmpeg and ffprobe through configured, bundled, installed, and system candidates, with pinned build metadata for supported platforms."
trigger_phrases:
  - "FFmpeg resolution and pinned builds"
  - "ffmpeg resolution and pinned builds"
  - "ffmpeg-resolver.ts"
version: "1.0.0.0"
---

# FFmpeg resolution and pinned builds (ffmpeg-resolver.ts)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Media Editor locates ffmpeg and ffprobe through configured, bundled, installed, and system candidates, with pinned build metadata for supported platforms.

The resolver verifies candidates before accepting them and caches successful resolutions. The pinned-build table defines platform keys, artifact URLs, archive formats, digests, versions, and executable names. The setup tool installs only after consent.

---

## 2. HOW IT WORKS

The resolver verifies candidates before accepting them and caches successful resolutions. The pinned-build table defines platform keys, artifact URLs, archive formats, digests, versions, and executable names. The setup tool installs only after consent.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/core/ffmpeg-resolver.ts](../../../runtime/src/core/ffmpeg-resolver.ts) | Shared | Resolves and validates ffmpeg and ffprobe binaries. |
| [../../../runtime/src/core/pinned-builds.ts](../../../runtime/src/core/pinned-builds.ts) | Shared | Defines platform-specific pinned artifacts and expected digests. |
| [../../../runtime/src/core/artifact-download.ts](../../../runtime/src/core/artifact-download.ts) | Shared | Downloads and verifies pinned artifacts. |
| [../../../runtime/src/tools/media/setup-ffmpeg.ts](../../../runtime/src/tools/media/setup-ffmpeg.ts) | Handler | Offers and installs missing pinned binaries after consent. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/ffmpeg-resolver.vitest.ts](../../../runtime/tests/core/ffmpeg-resolver.vitest.ts) | Vitest | Covers binary lookup order, rejection, and cached resolution. |
| [../../../runtime/tests/core/pinned-builds.vitest.ts](../../../runtime/tests/core/pinned-builds.vitest.ts) | Vitest | Checks supported platforms and pinned artifact metadata. |
| [../../../runtime/tests/core/artifact-download.vitest.ts](../../../runtime/tests/core/artifact-download.vitest.ts) | Vitest | Checks archive digest validation and cleanup. |
| [../../../runtime/tests/tools/media/setup-ffmpeg.vitest.ts](../../../runtime/tests/tools/media/setup-ffmpeg.vitest.ts) | Vitest | Covers consent and installation using test doubles. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/ffmpeg-resolution-and-pinned-builds.md

Related references:
- [Preview image](preview-image.md) - Neighboring shared tool behavior entry.
