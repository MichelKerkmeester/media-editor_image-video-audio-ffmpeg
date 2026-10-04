---
title: "PGD-001 -- Chat guidance delivery"
description: "Validates that an actionable project answer arrives in chat with the exact command, where it lands and what to check, plus the attestation line and the no-file claim."
version: 1.0.0.0
---

# PGD-001 -- Chat guidance delivery

This scenario validates the project delivery protocol for actionable requests.

---

## 1. OVERVIEW

Every actionable request must produce a chat answer with the exact ffmpeg command, the export destination and the verification step, closed by the attestation line. The answer must never claim that this Project executed, verified or saved anything.

### Why this matters

The chat hand-off is the delivery contract that separates the project packaging from the CLI runtime. A missing command, a missing destination or a false execution claim leaves the user without a workable path.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the command, destination, check and attestation arrive in chat with no execution claim
- Real user request: `How should I compress this 40MB webinar video for email?`
- Prompt: `How should I compress this 40MB webinar video for email?`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, then inspect the command, the destination, the check step, the attestation and the close
- Expected signals: The reply leads with **Run this:** an exact ffmpeg command whose output carries a proposed readable name and says it can be changed, names **Result lands in:** `media files/export/[readable-name].mp4`, names **Check this:** a verification step such as an ffprobe read or a playback test, closes with the attestation line stating execution, verification and save did not occur, and adds two to three short sentences. It never claims a processed file and never claims the output was produced here
- Desired user-visible outcome: One complete chat answer a user can run in their own terminal
- Pass/fail: PASS if all three delivery fields and the attestation are present with no execution claim. FAIL on a missing field, a claimed save or a delivery promised as produced here

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `How should I compress this 40MB webinar video for email?` | Hand back the compression command with a proposed readable name, the export destination and the check step, close with the attestation line and a short note telling the user what to run and verify. | Advisory mode, no execution claimed. | Reply transcript with the delivery fields and the attestation line. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `How should I compress this 40MB webinar video for email?`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: check the command, destination and check fields and the attestation line -> operator: grade the closing sentences`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the advisory answer. Step 3 proves the three delivery fields appear first, the attestation is honest and no execution or save is claimed.

### Evidence

Capture the full reply, the command hand-off, the destination, the check step, the attestation line and the closing sentences.

### Pass / fail

- **Pass**: The reply carries the command, destination, check and attestation fields and claims no execution, verification or save
- **Fail**: Any field missing, a delivery promised as produced here, or an attestation claiming real work

### Failure triage

1. Check the delivery protocol section of `Custom Instructions.md` for the three required fields and the attestation.
2. Check whether the reply claims execution, verification or save.
3. Check the command against the loaded video and audio knowledge mirror.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PGD-001 | Chat guidance delivery | Verify the command, destination, check and attestation arrive in chat | `How should I compress this 40MB webinar video for email?` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Check fields and attestation | Step 1: packaging confirmed. Step 2: advisory answer. Step 3: complete delivery block | Reply, command hand-off, attestation, closing sentences | PASS if all three fields and the attestation are present with no execution claim. FAIL on a missing field, a claimed save or a delivery promised as produced here | 1. Check required fields in the kernel.<br>2. Check the execution claims.<br>3. Check the command against the mirror. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | Delivery protocol, attestation line and advisory truth rules |
| [`MEDIA Framework`](../../../claude%20project/knowledge/Media%20Editor%20-%20Thinking%20-%20MEDIA%20Framework.md) | Format and quality guidance mirror |
| `Media Editor - Integrations - Video And Audio Operations` (knowledge mirror) | Video compression guidance and codec detail |

---

## 5. SOURCE METADATA

- Group: Project guidance delivery
- Runtime: project
- Playbook ID: PGD-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-guidance-delivery/chat-guidance-delivery.md`
