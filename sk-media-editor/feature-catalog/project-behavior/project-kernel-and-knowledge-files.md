---
title: "Project kernel and knowledge files"
description: "The Claude Project package combines its Custom Instructions kernel with attached knowledge files for operation recipes and decision rules."
trigger_phrases:
  - "Project kernel and knowledge files"
  - "project kernel and knowledge files"
  - "Custom Instructions.md"
version: "1.0.0.0"
---

# Project kernel and knowledge files (Custom Instructions.md)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The Claude Project package combines its Custom Instructions kernel with attached knowledge files for operation recipes and decision rules.

The kernel defines project identity, routing, clarification, boundaries, and the no-execution truth. Its boundaries lead an oversized request with the limit: the input is named as very large with its cost in time and disk, and a lighter path such as splitting the source or a shorter quality ladder comes before the full-file route. Knowledge files provide image, video, audio, HLS, setup, and interactive guidance. These files describe behavior for the hosted Project surface.

---

## 2. HOW IT WORKS

The kernel defines project identity, routing, clarification, boundaries, and the no-execution truth. Its boundaries lead an oversized request with the limit: the input is named as very large with its cost in time and disk, and a lighter path such as splitting the source or a shorter quality ladder comes before the full-file route. Knowledge files provide image, video, audio, HLS, setup, and interactive guidance. These files describe behavior for the hosted Project surface.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `../../../claude project/Custom Instructions.md` | Shared | Defines project identity and instruction kernel. [Open](../../../claude%20project/Custom%20Instructions.md) |
| `../../../claude project/knowledge/Media Editor - Integrations - Image Operations.md` | Reference | Provides image operation guidance. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Integrations%20-%20Image%20Operations.md) |
| `../../../claude project/knowledge/Media Editor - Integrations - Video And Audio Operations.md` | Reference | Provides video and audio guidance. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Integrations%20-%20Video%20And%20Audio%20Operations.md) |
| `../../../claude project/knowledge/Media Editor - Reference - HLS Video Conversion.md` | Reference | Provides the HLS recipe. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20HLS%20Video%20Conversion.md) |
| `../../../claude project/knowledge/Media Editor - Reference - Media Editor Tools.md` | Reference | Describes tools and setup. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20Media%20Editor%20Tools.md) |
| `../../../claude project/knowledge/Media Editor - Reference - Setup.md` | Reference | Provides setup instructions. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20Setup.md) |
| `../../../claude project/knowledge/Media Editor - System - Interactive Intelligence.md` | Reference | Provides interactive intake guidance. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20System%20-%20Interactive%20Intelligence.md) |
| `../../../claude project/knowledge/Media Editor - Thinking - MEDIA Framework.md` | Reference | Provides the MEDIA optimization framework. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Thinking%20-%20MEDIA%20Framework.md) |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `../../../claude project/README.md` | Reference | Documents the Project package. [Open](../../../claude%20project/README.md) |
| `../../../claude project/kernel-review.json` | Reference | Records the kernel review metadata. [Open](../../../claude%20project/kernel-review.json) |

---

## 4. SOURCE METADATA

- Group: Project Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: project-behavior/project-kernel-and-knowledge-files.md

Related references:
- [Desktop extension route](desktop-extension-route.md) - Neighboring project behavior entry.
