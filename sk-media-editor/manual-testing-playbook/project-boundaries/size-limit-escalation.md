---
title: "PSB-002 -- Size limit escalation"
description: "Validates that an oversized HLS request is flagged plainly with a supported alternative instead of a confident full-file recipe."
version: 1.0.0.0
---

# PSB-002 -- Size limit escalation

This scenario validates practical-limit escalation in the advisory packaging.

---

## 1. OVERVIEW

Large inputs carry real cost: minutes to hours of processing, disk space and a higher chance of interruption. An 8GB HLS request must get a plain size flag and a supported alternative such as splitting the source or dropping the heaviest ladder rung, never a full-file recipe presented as quick and easy.

### Why this matters

A command that ignores the size wastes the user's time and hides the real constraint. Naming the cost and the alternative keeps the guidance honest.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the oversized request triggers a plain size flag and a supported alternative
- Real user request: `Convert this 8GB raw footage file to HLS for the website.`
- Prompt: `Convert this 8GB raw footage file to HLS for the website.`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, then confirm the size flag and the alternative
- Expected signals: The reply names the 8GB input as very large, states the practical cost in time and disk space, suggests a supported alternative such as splitting the source or reducing the quality ladder, and does not present the full-file conversion as quick or guaranteed
- Desired user-visible outcome: An honest escalation that still leaves the user a workable path
- Pass/fail: PASS if the size is flagged plainly and a supported alternative is given. FAIL if the full-file recipe is presented as quick or guaranteed, or the size is ignored

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Convert this 8GB raw footage file to HLS for the website.` | Flag the 8GB input as very large, state the practical cost and suggest a supported alternative such as splitting the file, instead of a confident full-file recipe. | Escalation, not a happy-path hand-off. | Response transcript naming the size flag and the alternative. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Convert this 8GB raw footage file to HLS for the website.`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm the size is flagged and a supported alternative is given`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the escalation. Step 3 proves the size flag is plain and the alternative is a real supported path.

### Evidence

Capture the full reply, the stated size cost and the suggested alternative.

### Pass / fail

- **Pass**: The reply flags the 8GB input plainly and offers a supported alternative such as splitting the file
- **Fail**: A confident full-file recipe, an ignored size or a refusal with no path forward

### Failure triage

1. Check the practical-limit rules in NEVER 3 and ESCALATE 3 of `Custom Instructions.md`.
2. Check whether the suggested alternative is genuinely supported.
3. Check that no over-limit command was presented as quick or guaranteed.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PSB-002 | Size limit escalation | Verify the oversized HLS request triggers an honest escalation | `Convert this 8GB raw footage file to HLS for the website.` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Confirm size flag and alternative | Step 1: packaging confirmed. Step 2: escalation. Step 3: plain size flag plus supported alternative | Reply, stated size cost, suggested alternative | PASS if the size is flagged and a supported alternative is given. FAIL on a confident over-limit command or an ignored size | 1. Check the practical-limit rules.<br>2. Check the alternative is supported.<br>3. Check the command for a missing caveat. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: project kernel and knowledge files](../../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | NEVER 3 and ESCALATE 3 practical-limit rules |
| [`HLS Video Conversion`](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20HLS%20Video%20Conversion.md) | HLS recipe and constraint mirror |
| `Media Editor - Integrations - Video And Audio Operations` (knowledge mirror) | Large-file timing table and splitting guidance |

---

## 5. SOURCE METADATA

- Group: Project boundaries
- Runtime: project
- Playbook ID: PSB-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-boundaries/size-limit-escalation.md`
