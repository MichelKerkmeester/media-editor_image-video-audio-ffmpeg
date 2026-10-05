---
title: "Parity wrappers"
description: "The parity directory exposes Media Editor wrapper commands for shared parity, query, residency, and receipt checks."
trigger_phrases:
  - "Parity wrappers"
  - "parity wrappers"
  - "run_parity.sh"
version: "1.0.0.0"
---

# Parity wrappers (run_parity.sh)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The parity directory exposes Media Editor wrapper commands for shared parity, query, residency, and receipt checks.

Each wrapper changes to the parity directory and invokes the corresponding shared script with the Media Editor system identifier. The wrappers declare exit behavior in their headers.

---

## 2. HOW IT WORKS

Each wrapper changes to the parity directory and invokes the corresponding shared script with the Media Editor system identifier. The wrappers declare exit behavior in their headers.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../benchmark/parity/README.md](../../../benchmark/parity/README.md) | Reference | Describes available wrappers and shared ownership. |
| [../../../benchmark/parity/run_parity.sh](../../../benchmark/parity/run_parity.sh) | Script | Runs the shared parity validator. |
| [../../../benchmark/parity/run_query.sh](../../../benchmark/parity/run_query.sh) | Script | Runs shared query checks. |
| [../../../benchmark/parity/run_receipt_write.sh](../../../benchmark/parity/run_receipt_write.sh) | Script | Writes a shared upload receipt. |
| [../../../benchmark/parity/run_receipts.sh](../../../benchmark/parity/run_receipts.sh) | Script | Validates shared receipt records. |
| [../../../benchmark/parity/run_residency.sh](../../../benchmark/parity/run_residency.sh) | Script | Runs the shared residency check. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../benchmark/parity/run_parity.sh](../../../benchmark/parity/run_parity.sh) | Benchmark | Validates parity behavior. |
| [../../../benchmark/parity/run_residency.sh](../../../benchmark/parity/run_residency.sh) | Benchmark | Validates residency behavior. |

---

## 4. SOURCE METADATA

- Group: Quality Gates
- Canonical catalog source: `feature-catalog.md`
- Feature file path: quality-gates/parity-wrappers.md

Related references:
- [Twin divergence grader and report check](twin-divergence-grader-and-report-check.md) - Neighboring quality gates entry.
- [Runtime test suites and pinned run](runtime-test-suites-and-pinned-run.md) - Neighboring quality gates entry.
