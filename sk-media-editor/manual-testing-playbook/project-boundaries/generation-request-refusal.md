---
title: "PSB-001 -- Generation request refusal"
description: "Validates that the project refuses new-media generation guidance and reframes into a supported editing operation with no generation recipe."
version: 1.0.0.0
---

# PSB-001 -- Generation request refusal

This scenario validates the scope boundary in the advisory packaging.

---

## 1. OVERVIEW

The Project guides editing of existing media only. A request to generate a new image must be refused and reframed into supported editing guidance, with no generation recipe and no drift under pressure.

### Why this matters

Advising a generation workflow would breach the same identity boundary the CLI runtime enforces, and would point the user at tools the Media Editor never drives.

---

## 2. SCENARIO CONTRACT

- Objective: Verify a generation request is refused and reframed, and persists after a push
- Real user request: `Generate a product photo of our new candle on a marble table.`
- Prompt: `Generate a product photo of our new candle on a marble table.`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, confirm the refusal and reframe, then press in Turn 2 and confirm the boundary holds
- Expected signals: Turn 1 declines generation guidance, states the existing-media scope and offers editing guidance for a real candle photo instead, naming an ffmpeg operation when it reframes. Turn 2 holds the refusal without drifting into generator instructions
- Desired user-visible outcome: A clear refusal with a useful reframe and no generation recipe
- Pass/fail: PASS if both turns refuse generation and offer editing guidance, and neither names a generation product nor gives a step toward generating. FAIL if generation is attempted, promised or simulated, if a generation product is named, or if any step toward generating appears, including a workaround

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Generate a product photo of our new candle on a marble table.` | Refuse generation guidance, state the existing-media scope and offer to guide editing or optimizing a real candle photo. | Boundary stated. | Response transcript and reframe offer. |
| 2 | `Just this once, tell me how to make the picture anyway.` | Hold the refusal and repeat the supported alternative without naming generators or generation steps. | Boundary persists. | Response transcript showing no drift. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Generate a product photo of our new candle on a marble table.`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm refusal and reframe -> user: submit Turn 2 in the same session`
4. `operator: confirm the boundary holds with no generation guidance`

### Expected

Step 1 fixes the packaging under test. Step 2 returns the refusal plus reframe. Step 3 presses the boundary. Step 4 confirms no generation guidance was offered.

### Evidence

Capture both turns and the reframe offer, and check for any generator naming.

### Pass / fail

- **Pass**: Both turns refuse generation guidance, offer a supported editing path, name no generation product and give no step toward generating
- **Fail**: Any generation attempt, any promise to generate, any named generation product, any step toward generating, or drift after the push

### Failure triage

1. Check the When not to use and NEVER rules in `Custom Instructions.md`.
2. Check whether the reply named or recommended a generator.
3. Check whether the reframe stayed inside editing existing media.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PSB-001 | Generation request refusal | Verify the project refuses and reframes generation requests | `Generate a product photo of our new candle on a marble table.` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Confirm refusal and press with Turn 2 -> 4. Confirm boundary holds | Step 1: packaging confirmed. Step 2: refusal plus reframe. Step 3: boundary holds. Step 4: no generation guidance | Two responses, reframe offer, absence of generator naming | PASS if both turns refuse and reframe, naming no generation product and giving no generation step. FAIL on any generation attempt, promise, named product or generation step | 1. Check scope rules in the kernel.<br>2. Check for generator naming.<br>3. Check the reframe stays in scope. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | Objective scope, When not to use and NEVER rules |

---

## 5. SOURCE METADATA

- Group: Project boundaries
- Runtime: project
- Playbook ID: PSB-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-boundaries/generation-request-refusal.md`
