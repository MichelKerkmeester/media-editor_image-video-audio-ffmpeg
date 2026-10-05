---
title: "Project no-execution truth"
description: "Without connected Media Editor tools, the Project gives an exact command and check and does not claim to edit or save a file."
trigger_phrases:
  - "Project no-execution truth"
  - "project no-execution truth"
  - "Custom Instructions.md"
version: "1.0.0.0"
---

# Project no-execution truth (Custom Instructions.md)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Without connected Media Editor tools, the Project gives an exact command and check and does not claim to edit or save a file.

The Project can provide a local command, destination, and verification steps. If connected tools are present, the route may call those tools and report their returned paths. The hosted Project alone does not execute local files. In Repair Mode without the tools, the Project answers at once with the `ffprobe` diagnosis, the remux repair command under a proposed readable name, a re-encode fallback and the delivery fields. A question about the symptom follows the commands and never replaces them. The first command reply of a conversation also offers once, on the line before the attestation, to walk the user through installing the Media Editor extension. A reply that notices a mistake in a command it already gave repeats the whole corrected command, never a prose patch.

---

## 2. HOW IT WORKS

The Project can provide a local command, destination, and verification steps. If connected tools are present, the route may call those tools and report their returned paths. The hosted Project alone does not execute local files. In Repair Mode without the tools, the Project answers at once with the `ffprobe` diagnosis, the remux repair command under a proposed readable name, a re-encode fallback and the delivery fields. A question about the symptom follows the commands and never replaces them. The first command reply of a conversation also offers once, on the line before the attestation, to walk the user through installing the Media Editor extension. A reply that notices a mistake in a command it already gave repeats the whole corrected command, never a prose patch.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `../../../claude project/Custom Instructions.md` | Shared | Defines the execution truth and command hand-off. [Open](../../../claude%20project/Custom%20Instructions.md) |
| `../../../claude project/knowledge/Media Editor - Reference - Media Editor Tools.md` | Reference | Describes tool availability and setup. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20Media%20Editor%20Tools.md) |
| `../../../claude project/knowledge/Media Editor - Reference - Setup.md` | Reference | Explains setup guidance. [Open](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20Setup.md) |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/project-no-execution-truth/cannot-execute-files.md](../../../sk-media-editor/manual-testing-playbook/project-no-execution-truth/cannot-execute-files.md) | Manual playbook | Checks that the Project does not claim a local file write. |
| [../../../sk-media-editor/manual-testing-playbook/project-route-order/setup-offer-without-tools.md](../../../sk-media-editor/manual-testing-playbook/project-route-order/setup-offer-without-tools.md) | Manual playbook | Checks the setup offer without tools. |
| [../../../sk-media-editor/manual-testing-playbook/project-repair-mode/repair-guidance.md](../../../sk-media-editor/manual-testing-playbook/project-repair-mode/repair-guidance.md) | Manual playbook | Checks advisory repair guidance. |

---

## 4. SOURCE METADATA

- Group: Project Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: project-behavior/project-no-execution-truth.md

Related references:
- [Desktop extension route](desktop-extension-route.md) - Neighboring project behavior entry.
- [Project naming and placement gate](project-naming-and-placement-gate.md) - Neighboring project behavior entry.
