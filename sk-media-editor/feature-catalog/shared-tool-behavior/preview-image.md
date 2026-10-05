---
title: "Preview image"
description: "Probe tools can return a small JPEG preview for image and video input."
trigger_phrases:
  - "Preview image"
  - "preview image"
  - "previewField"
version: "1.0.0.0"
---

# Preview image (previewField)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Probe tools can return a small JPEG preview for image and video input.

Image previews are scaled inside a 512-pixel longest edge. Video previews extract one frame at one quarter of the reported duration, then apply the same image scaling. Audio has no picture. A failed optional preview becomes a warning.

---

## 2. HOW IT WORKS

Image previews are scaled inside a 512-pixel longest edge. Video previews extract one frame at one quarter of the reported duration, then apply the same image scaling. Audio has no picture. A failed optional preview becomes a warning.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/tools/media/preview.ts](../../../runtime/src/tools/media/preview.ts) | Shared | Defines preview input, image conversion, video frame extraction, and result attachment. |
| [../../../runtime/src/tools/image/probe.ts](../../../runtime/src/tools/image/probe.ts) | Handler | Adds an optional preview to image_probe. |
| [../../../runtime/src/tools/media/probe.ts](../../../runtime/src/tools/media/probe.ts) | Handler | Adds an optional preview to media_probe. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/tools/media/preview.vitest.ts](../../../runtime/tests/tools/media/preview.vitest.ts) | Vitest | Covers image and video preview output, plus audio warning behavior. |
| [../../../runtime/tests/tools/image/probe.vitest.ts](../../../runtime/tests/tools/image/probe.vitest.ts) | Vitest | Covers image metadata probing. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/preview-image.md

Related references:
- [Persistent probe cache](persistent-probe-cache.md) - Neighboring shared tool behavior entry.
- [FFmpeg resolution and pinned builds](ffmpeg-resolution-and-pinned-builds.md) - Neighboring shared tool behavior entry.
