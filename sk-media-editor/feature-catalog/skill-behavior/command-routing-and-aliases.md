---
title: "Command routing and aliases"
description: "The skill routes explicit dollar commands before keyword inference and uses the first recognized command when a request contains more than one."
trigger_phrases:
  - "Command routing and aliases"
  - "command routing and aliases"
  - "router-contract.md"
version: "1.0.0.0"
---

# Command routing and aliases (router-contract.md)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The skill routes explicit dollar commands before keyword inference and uses the first recognized command when a request contains more than one.

Aliases map to the image, audio, video, repair, and interactive modes. The route contract publishes fixtures and a differential script that checks the skill router against the contract.

---

## 2. HOW IT WORKS

Aliases map to the image, audio, video, repair, and interactive modes. The route contract publishes fixtures and a differential script that checks the skill router against the contract.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../sk-media-editor/references/router-contract.md](../../../sk-media-editor/references/router-contract.md) | Reference | Defines commands, aliases, and precedence. |
| [../../../sk-media-editor/SKILL.md](../../../sk-media-editor/SKILL.md) | Shared | Loads the command routing contract. |
| [../../../benchmark/router/route_contract.py](../../../benchmark/router/route_contract.py) | Script | Implements the routing contract oracle. |
| [../../../benchmark/router/differential.py](../../../benchmark/router/differential.py) | Script | Compares the router behavior against fixtures. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../benchmark/router/fixtures.json](../../../benchmark/router/fixtures.json) | Fixture | Contains route and alias examples. |
| [../../../benchmark/router/run_fixtures.sh](../../../benchmark/router/run_fixtures.sh) | Benchmark | Runs the route fixtures. |
| [../../../sk-media-editor/manual-testing-playbook/skill-command-routing/first-command-wins.md](../../../sk-media-editor/manual-testing-playbook/skill-command-routing/first-command-wins.md) | Manual playbook | Checks first-command precedence. |
| [../../../sk-media-editor/manual-testing-playbook/skill-command-routing/video-alias-routing.md](../../../sk-media-editor/manual-testing-playbook/skill-command-routing/video-alias-routing.md) | Manual playbook | Checks a video alias. |

---

## 4. SOURCE METADATA

- Group: Skill Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: skill-behavior/command-routing-and-aliases.md

Related references:
- [Skill naming and placement gate](skill-naming-and-placement-gate.md) - Neighboring skill behavior entry.
- [Skill export delivery](skill-export-delivery.md) - Neighboring skill behavior entry.
