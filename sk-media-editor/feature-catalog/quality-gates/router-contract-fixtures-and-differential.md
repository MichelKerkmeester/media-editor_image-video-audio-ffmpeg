---
title: "Router contract fixtures and differential"
description: "The router benchmark checks command and alias behavior against fixtures and compares the contract with the current skill router."
trigger_phrases:
  - "Router contract fixtures and differential"
  - "router contract fixtures and differential"
  - "route_contract.py"
version: "1.0.0.0"
---

# Router contract fixtures and differential (route_contract.py)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The router benchmark checks command and alias behavior against fixtures and compares the contract with the current skill router.

The fixture runner executes the routing cases. The differential script reports mismatches between contract outcomes and router behavior. Manual scenarios also exercise first-command precedence and selected aliases.

---

## 2. HOW IT WORKS

The fixture runner executes the routing cases. The differential script reports mismatches between contract outcomes and router behavior. Manual scenarios also exercise first-command precedence and selected aliases.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../benchmark/router/README.md](../../../benchmark/router/README.md) | Reference | Documents the router benchmark. |
| [../../../benchmark/router/route_contract.py](../../../benchmark/router/route_contract.py) | Script | Implements expected route outcomes. |
| [../../../benchmark/router/differential.py](../../../benchmark/router/differential.py) | Script | Compares route behavior. |
| [../../../benchmark/router/fixtures.json](../../../benchmark/router/fixtures.json) | Fixture | Stores route cases. |
| [../../../benchmark/router/run_fixtures.sh](../../../benchmark/router/run_fixtures.sh) | Benchmark | Runs the fixture checks. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../sk-media-editor/manual-testing-playbook/skill-command-routing/first-command-wins.md](../../../sk-media-editor/manual-testing-playbook/skill-command-routing/first-command-wins.md) | Manual playbook | Exercises explicit command precedence. |
| [../../../sk-media-editor/manual-testing-playbook/skill-command-routing/video-alias-routing.md](../../../sk-media-editor/manual-testing-playbook/skill-command-routing/video-alias-routing.md) | Manual playbook | Exercises a route alias. |

---

## 4. SOURCE METADATA

- Group: Quality Gates
- Canonical catalog source: `feature-catalog.md`
- Feature file path: quality-gates/router-contract-fixtures-and-differential.md

Related references:
- [Rule parity script](rule-parity-script.md) - Neighboring quality gates entry.
