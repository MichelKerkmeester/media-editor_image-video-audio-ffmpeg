---
title: "Skill route order"
description: "The skill tries the media-editor command first, uses hand-written ffmpeg guidance when the command is unavailable, and falls back to advice when neither route can execute."
trigger_phrases:
  - "Skill route order"
  - "skill route order"
  - "sk-media-editor"
version: "1.0.0.0"
---

# Skill route order (sk-media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The skill tries the media-editor command first, uses hand-written ffmpeg guidance when the command is unavailable, and falls back to advice when neither route can execute.

The skill checks command availability before processing. When the CLI is unavailable, it checks for local ffmpeg and ffprobe. Unsupported or unavailable execution becomes exact command guidance or a setup offer, without a claimed file write.

---

## 2. HOW IT WORKS

The skill checks command availability before processing. When the CLI is unavailable, it checks for local ffmpeg and ffprobe. Unsupported or unavailable execution becomes exact command guidance or a setup offer, without a claimed file write.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../sk-media-editor/SKILL.md](../../../sk-media-editor/SKILL.md) | Shared | Defines the route order and execution boundaries. |
| [../../../sk-media-editor/references/cli.md](../../../sk-media-editor/references/cli.md) | Reference | Documents command-first use and allowed CLI route. |
| [../../../sk-media-editor/references/tools.md](../../../sk-media-editor/references/tools.md) | Reference | Documents tool checks and capability fallbacks. |
| [../../../sk-media-editor/references/router-contract.md](../../../sk-media-editor/references/router-contract.md) | Reference | Defines mode routing and aliases. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/skill-route-order/command-first.md](../../../sk-media-editor/manual-testing-playbook/skill-route-order/command-first.md) | Manual playbook | Checks the CLI route. |
| [../../../sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md](../../../sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md) | Manual playbook | Checks the local ffmpeg fallback. |
| [../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/missing-ffmpeg-refusal.md](../../../sk-media-editor/manual-testing-playbook/skill-tool-verification/missing-ffmpeg-refusal.md) | Manual playbook | Checks advice when execution tools are absent. |

---

## 4. SOURCE METADATA

- Group: Skill Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: skill-behavior/skill-route-order.md

Related references:
- [Tool check behavior](tool-check-behavior.md) - Neighboring skill behavior entry.
