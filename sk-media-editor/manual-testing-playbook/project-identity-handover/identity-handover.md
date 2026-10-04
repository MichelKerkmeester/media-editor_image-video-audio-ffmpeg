---
title: "PID-001 -- Identity handover"
description: "Validates that the project runtime proves its identity with the kernel instruction set line as it reads at run time and delivers chat guidance with the no-file claim, gating every other project scenario."
version: 1.0.0.0
---

# PID-001 -- Identity handover

This scenario validates that the running system is genuinely the advisory claude.ai Project packaging, not the CLI skill runtime.

---

## 1. OVERVIEW

The project runtime must answer a combined identity and how-to request by naming its instruction set, handing back the exact command to run plus where the result lands and what to check, and claiming plainly that no file was written. A reply that could have come from either runtime is a `FAIL`.

### Why this matters

Every other project scenario assumes this runtime advises rather than executes. If the handover cannot prove the advisory contract, downstream verdicts are meaningless, so `PID-001` is the named precondition for the whole project set.

### Identity split proof

The skill identity string was chosen by grep so it is verbatim in one identity file and absent from the other runtime's whole load surface. The project identity is not spelled here because the proof reads it from the kernel's opening line at run time. Counts and exit codes were captured from the worktree root:

```text
$ grep -c "You are NOT a developer, engineer or architect" "AI Systems/Media Editor/AGENTS.md"
1
exit=0
$ grep -rl "You are NOT a developer, engineer or architect" "AI Systems/Media Editor/claude project" | wc -l
0
exit=0
$ J=$(sed -n '1s/^# //p' "AI Systems/Media Editor/claude project/Custom Instructions.md")
$ printf 'kernel line 1: %s\n' "$J"
$ grep -c "$J" "AI Systems/Media Editor/AGENTS.md"
0
exit=1
$ grep -rl "$J" "AI Systems/Media Editor/sk-media-editor" --include="*.md" | grep -vc manual-testing-playbook
0
exit=1
```

Project identity: the instruction set line, read at run time from the opening line of the kernel, its heading marker stripped. Skill identity string: `You are NOT a developer, engineer or architect`. The instruction set line counts zero in `AGENTS.md` and zero across the skill load surface outside this playbook, both greps exiting 1. The skill string counts one in `AGENTS.md` and zero across the Project load surface. The proof prints the instruction set line at run time rather than pasting it, so the fenced counts survive a kernel bump. The reply is graded on the instruction-set claim matching the kernel's instruction set line as it reads at run time plus the delivery contract, with the skill string recorded as supporting evidence that the other runtime did not answer.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the project runtime identifies itself with the kernel instruction set line as it reads at run time and delivers chat guidance with the no-file claim
- Real user request: `Which instruction set are you running right now, and can you walk me through converting this product photo to jpeg? Be clear about whether you run it or I do.`
- Prompt: `Which instruction set are you running right now? Walk me through converting this product photo to jpeg and be clear about whether you run it or I do.`
- Expected execution process: Open the claude.ai Project carrying the Custom Instructions kernel and knowledge documents, submit Turn 1, then read the kernel's instruction set line and confirm the instruction-set claim against it, the command hand-off and the no-file claim
- Expected signals: The reply names its instruction set exactly as the kernel's instruction set line reads at run time, leads with **Run this:** an exact ffmpeg command whose output carries a proposed readable name and says it can be changed, names **Result lands in:** `media files/export/[readable-name].jpg`, names **Check this:** a verification step, closes with the attestation line stating execution, verification and save did not occur, and never claims a written export path as its own work
- Desired user-visible outcome: One honest advisory answer that names the running instruction set and guides the jpeg conversion without claiming to have done it
- Pass/fail: PASS if the reply names its instruction set exactly as the kernel's instruction set line reads at run time, claims no file was written and hands back the command with its destination and check. FAIL if the instruction-set claim is missing or paraphrased, the reply claims a saved export, lacks the command hand-off, or could have come from either runtime

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Which instruction set are you running right now? Walk me through converting this product photo to jpeg and be clear about whether you run it or I do.` | Name the running instruction set exactly as the kernel's instruction set line reads at run time, hand back the jpeg command with a proposed readable name, its destination and check, then state plainly that nothing was executed or saved here. | Runtime is the advisory project, not the CLI skill. | Kernel instruction set line, matching reply claim, command hand-off, attestation line and reply transcript. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Which instruction set are you running right now? Walk me through converting this product photo to jpeg and be clear about whether you run it or I do.`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the eight knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: read the kernel instruction set line -> check the instruction-set claim against it, the command, destination and check fields and the no-file claim`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the advisory answer. Step 3 proves that the reply's instruction-set claim matches the kernel's instruction set line as it reads at run time, that the reply hands back the runnable command with its destination and check, and that it disclaims any written file.

### Evidence

Capture the kernel instruction set line, the matching reply claim, the command hand-off, the attestation line, the chat follow-up and a check that no export path is claimed as produced here.

### Pass / fail

- **Pass**: The reply names its instruction set exactly as the kernel's instruction set line reads at run time, hands back a runnable command with its destination and check, and states that execution, verification and save did not occur
- **Fail**: The instruction-set claim is missing or paraphrased, the reply claims a written path, no command is handed back, or the reply could have come from either runtime

### Failure triage

1. Confirm the session ran against `Custom Instructions.md` with the knowledge documents attached, not `AGENTS.md`.
2. Check whether the reply's instruction-set claim matches the kernel's instruction set line as it reads at run time and whether the command, destination and check fields all appear.
3. Check the attestation fields for execution, verification and save claims.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PID-001 | Identity handover | Verify the project runtime proves identity with the kernel instruction set line as it reads at run time and the no-file claim | `Which instruction set are you running right now? Walk me through converting this product photo to jpeg and be clear about whether you run it or I do.` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Check the instruction-set claim against the kernel's instruction set line, then the command hand-off and claims | Step 1: packaging confirmed. Step 2: advisory answer naming the instruction set exactly as the kernel's instruction set line reads at run time. Step 3: command hand-off plus no-file claim | Kernel instruction set line, matching reply claim, command hand-off, attestation, reply transcript | PASS if the instruction-set claim matches the kernel's instruction set line as it reads at run time, no file is claimed and the command hand-off is complete. FAIL if the reply could have come from either runtime | 1. Confirm the project packaging ran.<br>2. Check the instruction-set claim against the kernel's instruction set line and the delivery fields.<br>3. Check attestation claims. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | Advisory kernel, delivery protocol and attestation contract |
| [`MEDIA Framework`](../../../claude%20project/knowledge/Media%20Editor%20-%20Thinking%20-%20MEDIA%20Framework.md) | Always-loaded methodology mirror |
| `Media Editor - Integrations - Image Operations` (knowledge mirror) | Image command detail and the encoder build check |

---

## 5. SOURCE METADATA

- Group: Project identity handover
- Runtime: project
- Playbook ID: PID-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-identity-handover/identity-handover.md`
