---
title: "Tool check behavior"
description: "The skill verifies the available Media Editor command or local ffmpeg capabilities before it reports a processing result."
trigger_phrases:
  - "Tool check behavior"
  - "tool check behavior"
  - "sk-media-editor"
version: "1.0.0.0"
---

# Tool check behavior (sk-media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The skill verifies the available Media Editor command or local ffmpeg capabilities before it reports a processing result.

The command route uses media-editor health and tool descriptions. The local route checks ffmpeg and the encoders or filters needed by the selected operation. To look at a file before naming it, the local route renders one small preview into the system temp folder, never under `media files/`. It writes with `-n`, never `-y`, runs trial encodes for a size target in the temp folder and writes the confirmed name once, so no export is replaced. A missing binary or capability is reported before processing. When `media-editor health` sets `nextStep` to `media_setup_ffmpeg`, the skill runs that tool without consent in the same turn and puts the download plan in its one question.

---

## 2. HOW IT WORKS

The command route uses media-editor health and tool descriptions. The local route checks ffmpeg and the encoders or filters needed by the selected operation. To look at a file before naming it, the local route renders one small preview into the system temp folder, never under `media files/`. It writes with `-n`, never `-y`, runs trial encodes for a size target in the temp folder and writes the confirmed name once, so no export is replaced. A missing binary or capability is reported before processing. When `media-editor health` sets `nextStep` to `media_setup_ffmpeg`, the skill runs that tool without consent in the same turn and puts the download plan in its one question.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../sk-media-editor/SKILL.md](../../../sk-media-editor/SKILL.md) | Shared | Requires the tool check before a write. |
| [../../../sk-media-editor/references/tools.md](../../../sk-media-editor/references/tools.md) | Reference | Defines command health, binary, encoder, and filter checks. |
| [../../../sk-media-editor/references/cli.md](../../../sk-media-editor/references/cli.md) | Reference | Defines CLI health and schema inspection. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/missing-ffmpeg-refusal.md](../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/missing-ffmpeg-refusal.md) | Manual playbook | Checks missing-tool advice. |
| [../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/consent-before-ffmpeg-download.md](../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/consent-before-ffmpeg-download.md) | Manual playbook | Checks setup consent before install. |
| [../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/error-code-handoff.md](../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/error-code-handoff.md) | Manual playbook | Checks a path error hand-off. |

---

## 4. SOURCE METADATA

- Group: Skill Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: skill-behavior/tool-check-behavior.md

Related references:
- [Skill route order](skill-route-order.md) - Neighboring skill behavior entry.
- [Skill naming and placement gate](skill-naming-and-placement-gate.md) - Neighboring skill behavior entry.
