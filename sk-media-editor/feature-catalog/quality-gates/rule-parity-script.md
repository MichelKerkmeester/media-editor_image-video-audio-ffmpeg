---
title: "Rule parity script"
description: "The rule parity script compares selected skill rules with their Claude Project counterparts and reports parity findings."
trigger_phrases:
  - "Rule parity script"
  - "rule parity script"
  - "rule_parity.py"
version: "1.0.0.0"
---

# Rule parity script (rule_parity.py)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The rule parity script compares selected skill rules with their Claude Project counterparts and reports parity findings.

The script reads a declared set of source and Project text, normalizes the selected rules, and checks the parity contract. The parity benchmark wrappers call shared validators in the Claude Project Sync Loop.

---

## 2. HOW IT WORKS

The script reads a declared set of source and Project text, normalizes the selected rules, and checks the parity contract. The parity benchmark wrappers call shared validators in the Claude Project Sync Loop.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../benchmark/gates/README.md](../../../benchmark/gates/README.md) | Reference | Describes rule parity checks. |
| [../../../benchmark/gates/rule_parity.py](../../../benchmark/gates/rule_parity.py) | Script | Compares the declared rule pairs. |
| [../../../benchmark/parity/README.md](../../../benchmark/parity/README.md) | Reference | Documents per-system parity wrappers. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/packaging/notices.vitest.ts](../../../runtime/tests/packaging/notices.vitest.ts) | Vitest | Checks packaging notices, not rule content parity. |
| [../../../benchmark/gates/rule_parity.py](../../../benchmark/gates/rule_parity.py) | Benchmark | Runs the selected rule comparison. |

---

## 4. SOURCE METADATA

- Group: Quality Gates
- Canonical catalog source: `feature-catalog.md`
- Feature file path: quality-gates/rule-parity-script.md

Related references:
- [Router contract fixtures and differential](router-contract-fixtures-and-differential.md) - Neighboring quality gates entry.
- [Twin divergence grader and report check](twin-divergence-grader-and-report-check.md) - Neighboring quality gates entry.
