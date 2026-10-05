---
title: "Skill naming and placement gate"
description: "Before the first write, the skill asks one question that proposes readable names and one destination for the requested outputs."
trigger_phrases:
  - "Skill naming and placement gate"
  - "skill naming and placement gate"
  - "sk-media-editor"
version: "1.0.0.0"
---

# Skill naming and placement gate (sk-media-editor)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Before the first write, the skill asks one question that proposes readable names and one destination for the requested outputs.

The gate confirms the output name or names and whether files go in the export root or one numbered folder. For a multi-call batch, the skill carries the first returned targetFolder into later tool calls. Every other clarification joins the same question. A reply that confirms the proposal without answering one of its points accepts the recommendation the question stated for that point. When the request does not yet say what the media shows, the question proposes a working name from the stated purpose, and the answer refines it. When every output already has a name the user gave and its place is settled, nothing is left to ask, so unstated settings take their smart defaults, named in the reply.

---

## 2. HOW IT WORKS

The gate confirms the output name or names and whether files go in the export root or one numbered folder. For a multi-call batch, the skill carries the first returned targetFolder into later tool calls. Every other clarification joins the same question. A reply that confirms the proposal without answering one of its points accepts the recommendation the question stated for that point. When the request does not yet say what the media shows, the question proposes a working name from the stated purpose, and the answer refines it. When every output already has a name the user gave and its place is settled, nothing is left to ask, so unstated settings take their smart defaults, named in the reply.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../sk-media-editor/SKILL.md](../../../sk-media-editor/SKILL.md) | Shared | Defines the pre-write naming and placement gate. |
| [../../../sk-media-editor/references/cli.md](../../../sk-media-editor/references/cli.md) | Reference | Documents fileName, subfolder, and targetFolder arguments. |
| [../../../sk-media-editor/references/tools.md](../../../sk-media-editor/references/tools.md) | Reference | Documents output naming and placement fields. |
| [../../../runtime/src/core/output-folder.ts](../../../runtime/src/core/output-folder.ts) | Shared | Implements shared readable names and destinations. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/one-comprehensive-question.md](../../../sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/one-comprehensive-question.md) | Manual playbook | Checks one comprehensive intake question. |
| [../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md](../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md) | Manual playbook | Checks a readable name proposal. |
| [../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-naming-gate.md](../../../sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-naming-gate.md) | Manual playbook | Checks one question and one destination for a batch. |

---

## 4. SOURCE METADATA

- Group: Skill Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: skill-behavior/skill-naming-and-placement-gate.md

Related references:
- [Tool check behavior](tool-check-behavior.md) - Neighboring skill behavior entry.
- [Command routing and aliases](command-routing-and-aliases.md) - Neighboring skill behavior entry.
