---
title: "Skill export delivery"
description: "After a skill operation writes a result, the skill reports the path and reads back the file when the route supports it."
trigger_phrases:
  - "Skill export delivery"
  - "skill export delivery"
  - "sk-media-editor"
version: "1.0.0.0"
---

# Skill export delivery (sk-media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

After a skill operation writes a result, the skill reports the path and reads back the file when the route supports it.

The response distinguishes a successful file write from advice or a refusal. The operation result supplies the output path and any returned media details. A project run without execution tools cannot claim the same delivery.

---

## 2. HOW IT WORKS

The response distinguishes a successful file write from advice or a refusal. The operation result supplies the output path and any returned media details. A project run without execution tools cannot claim the same delivery.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../sk-media-editor/SKILL.md](../../../sk-media-editor/SKILL.md) | Shared | Defines export response and read-back expectations. |
| [../../../sk-media-editor/references/cli.md](../../../sk-media-editor/references/cli.md) | Reference | Documents the CLI result shape and file output. |
| [../../../sk-media-editor/references/tools.md](../../../sk-media-editor/references/tools.md) | Reference | Documents tool output and read-back behavior. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/export-first-path-response.md](../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/export-first-path-response.md) | Manual playbook | Checks the export path delivery. |
| [../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/export-root-no-subfolder.md](../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/export-root-no-subfolder.md) | Manual playbook | Checks export-root placement. |
| [../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-naming-gate.md](../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-naming-gate.md) | Manual playbook | Checks batch placement. |

---

## 4. SOURCE METADATA

- Group: Skill Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: skill-behavior/skill-export-delivery.md

Related references:
- [Command routing and aliases](command-routing-and-aliases.md) - Neighboring skill behavior entry.
