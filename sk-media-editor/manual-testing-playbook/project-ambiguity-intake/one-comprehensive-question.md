---
title: "PAI-001 -- One comprehensive question"
description: "Validates that a project request with no command and no keyword hit asks one comprehensive question and waits instead of inventing the media type."
version: 1.0.0.0
---

# PAI-001 -- One comprehensive question

This scenario validates the ambiguity path in the advisory packaging.

---

## 1. OVERVIEW

A request carrying no `$token` and no routing keyword must not guess a media type. The Project asks one comprehensive question covering media type, file, goal and output, then waits.

### Why this matters

The intake contract is identical across packagings. A Project that guesses the media type writes a confident command for the wrong lane, which is worse than no command.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the Project asks one comprehensive question and waits rather than inventing the media type
- Real user request: `Can you make this file work better for our website?`
- Prompt: `Can you make this file work better for our website?`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, confirm the single intake question, then submit Turn 2 with the missing facts and inspect the guidance
- Expected signals: Turn 1 asks for media type, file, goal and output in one message and hands back no command yet. Turn 2 routes to Image Mode guidance with an ffmpeg command, names the encoder build check when it promises a specific format and carries the delivery fields and attestation line
- Desired user-visible outcome: One intake question followed by correct guidance once the facts arrive
- Pass/fail: PASS if Turn 1 is a single comprehensive question that waits and Turn 2 uses every supplied fact. FAIL if the Project guesses the media type, asks scattered questions or hands back a command before the answer

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Can you make this file work better for our website?` | Ask one comprehensive question covering media type, file, goal and output, then wait. Hand back no command yet. | No mode named. | Response transcript and absence of a command block. |
| 2 | `It is a hero photo, 6MB PNG, and I want it light for the homepage.` | Hand back Image Mode guidance with an ffmpeg command built from the supplied facts, the encoder check when a specific format is promised and the delivery fields. | Media type now bound to Image. | Reply using every Turn 2 fact. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Can you make this file work better for our website?`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm one waiting question and no command -> user: submit Turn 2 in the same session`
4. `operator: grade the routed guidance against the supplied facts`

### Expected

Step 1 fixes the packaging under test. Step 2 returns one intake question. Step 3 proves the wait and produces routed guidance. Step 4 confirms the guidance uses the Turn 2 facts.

### Evidence

Capture both turns, the question content and the Turn 2 command hand-off with the delivery fields.

### Pass / fail

- **Pass**: One comprehensive question waited for the user and the Turn 2 facts drove Image Mode guidance with an ffmpeg command
- **Fail**: The Project invented a media type, split the intake into rounds or handed back a command early

### Failure triage

1. Check the no-hit fallback route in the `Custom Instructions.md` phase detection.
2. Compare the question against the Interactive Intelligence knowledge mirror checklist.
3. Check whether any command was handed back before the facts arrived.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PAI-001 | One comprehensive question | Verify project ambiguity triggers one waiting intake question | `Can you make this file work better for our website?` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Confirm wait and submit Turn 2 -> 4. Grade routed guidance | Step 1: packaging confirmed. Step 2: one question. Step 3: routed guidance. Step 4: facts used | Two responses, question text, Turn 2 command hand-off | PASS if one question waited and Turn 2 facts drove the guidance. FAIL on a guessed type, scattered questions or an early command | 1. Check the no-hit fallback route.<br>2. Compare question with the intake checklist.<br>3. Check for an early command. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | Ambiguous routing and the one-question rule |
| [`Interactive Intelligence`](../../../claude%20project/knowledge/Media%20Editor%20-%20System%20-%20Interactive%20Intelligence.md) | Intake checklist and conversation flow mirror |

---

## 5. SOURCE METADATA

- Group: Project ambiguity intake
- Runtime: project
- Playbook ID: PAI-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-ambiguity-intake/one-comprehensive-question.md`
