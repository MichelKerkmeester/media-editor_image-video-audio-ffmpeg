---
title: "Twin divergence grader and report check"
description: "The grader compares skill and Project scenario outcomes for declared twin pairs and checks the report for reply lint findings."
trigger_phrases:
  - "Twin divergence grader and report check"
  - "twin divergence grader and report check"
  - "twin_divergence.py"
version: "1.0.0.0"
---

# Twin divergence grader and report check (twin_divergence.py)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The grader compares skill and Project scenario outcomes for declared twin pairs and checks the report for reply lint findings.

The twin grader reads scenario results and identifies agreement or divergence for paired cases. check_report.sh runs the reply lint and twin comparison against a report directory. Findings remain report results and do not edit the source package.

---

## 2. HOW IT WORKS

The twin grader reads scenario results and identifies agreement or divergence for paired cases. check_report.sh runs the reply lint and twin comparison against a report directory. Findings remain report results and do not edit the source package.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../benchmark/grader/README.md](../../../benchmark/grader/README.md) | Reference | Documents the graders. |
| [../../../benchmark/grader/twin_divergence.py](../../../benchmark/grader/twin_divergence.py) | Script | Compares declared scenario twins. |
| [../../../benchmark/grader/check_report.sh](../../../benchmark/grader/check_report.sh) | Script | Runs report checks. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/README.md](../../../benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/README.md) | Benchmark | Records one completed manual playbook benchmark and check output. |

---

## 4. SOURCE METADATA

- Group: Quality Gates
- Canonical catalog source: `feature-catalog.md`
- Feature file path: quality-gates/twin-divergence-grader-and-report-check.md

Related references:
- [Rule parity script](rule-parity-script.md) - Neighboring quality gates entry.
- [Parity wrappers](parity-wrappers.md) - Neighboring quality gates entry.
