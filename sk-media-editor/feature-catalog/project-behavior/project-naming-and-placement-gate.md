---
title: "Project naming and placement gate"
description: "Before a connected Project tool writes, it asks one question that confirms readable names and one output location for the requested files."
trigger_phrases:
  - "Project naming and placement gate"
  - "project naming and placement gate"
  - "Custom Instructions.md"
version: "1.0.0.0"
---

# Project naming and placement gate (Custom Instructions.md)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Before a connected Project tool writes, it asks one question that confirms readable names and one output location for the requested files.

The Project presents names and destination before the first write. For a multi-call batch, it reuses the returned numbered target folder so the outputs stay together. A reply that confirms the proposal without answering one of its points accepts the recommendation the question stated for that point. When the request does not yet say what the media shows, the question proposes a working name from the stated purpose, and the answer refines it. When every output already has a name the user gave and its place is settled, nothing is left to ask, so unstated settings take their smart defaults, named in the reply.

---

## 2. HOW IT WORKS

The Project presents names and destination before the first write. For a multi-call batch, it reuses the returned numbered target folder so the outputs stay together. A reply that confirms the proposal without answering one of its points accepts the recommendation the question stated for that point. When the request does not yet say what the media shows, the question proposes a working name from the stated purpose, and the answer refines it. When every output already has a name the user gave and its place is settled, nothing is left to ask, so unstated settings take their smart defaults, named in the reply.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `../../../claude project/Custom Instructions.md` | Shared | Defines the naming and placement gate. [Open](../../../claude%20project/Custom%20Instructions.md) |
| `../../../claude project/knowledge/Media Editor - Integrations - Image Operations.md` | Reference | Documents image output guidance. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Integrations%20-%20Image%20Operations.md) |
| `../../../claude project/knowledge/Media Editor - Integrations - Video And Audio Operations.md` | Reference | Documents video and audio output guidance. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Integrations%20-%20Video%20And%20Audio%20Operations.md) |
| [../../../runtime/src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Implements the tool destination behavior. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/project-export-delivery/batch-naming-gate.md](../../../sk-media-editor/manual-testing-playbook/project-export-delivery/batch-naming-gate.md) | Manual playbook | Checks the name and destination question in Claude Desktop. |

---

## 4. SOURCE METADATA

- Group: Project Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: project-behavior/project-naming-and-placement-gate.md

Related references:
- [Project no-execution truth](project-no-execution-truth.md) - Neighboring project behavior entry.
