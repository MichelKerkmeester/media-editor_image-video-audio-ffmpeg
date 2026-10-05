---
title: "SAI-001 -- One comprehensive question"
description: "Validates that a request with no command and no keyword hit enters Interactive Mode, asks one comprehensive question and waits without inventing the media type."
version: 1.0.0.0
---

# SAI-001 -- One comprehensive question

This scenario validates the ambiguity path into Interactive Mode.

---

## 1. OVERVIEW

A request carrying no `$token` and no routing keyword must not guess a media type. The runtime asks one comprehensive question covering media type, file, goal and output, then waits for the user.

### Why this matters

Guessing the media type commits the runtime to the wrong lane and wastes a tool call. The single-question intake is the contract that keeps ambiguous requests cheap and reversible.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the runtime asks one comprehensive question and waits instead of inventing the media type
- Real user request: `Can you make this file work better for our website?`
- Prompt: `Can you make this file work better for our website?`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Start a fresh session, submit Turn 1, confirm the single intake question, then submit Turn 2 with the missing facts and inspect the result
- Expected signals: Turn 1 asks for media type, file, goal, output and a proposed readable file name in one message, creates no artifact and does not process anything. Turn 2 confirms the name, routes to the confirmed media type, checks ffmpeg and exports in a format the installed build supports straight into `media files/export/` under the confirmed name, and reports the encoder check when the preferred format is unavailable
- Desired user-visible outcome: One intake question followed by a correct delivery once the facts arrive
- Pass/fail: PASS if Turn 1 is a single comprehensive question that carries a proposed name and waits and Turn 2 uses every supplied fact. Finding the file through the allowed listing and probing, saying which file was picked and inviting a correction is not a guess. FAIL if the runtime guesses the media type, asks scattered questions, leaves out the proposed name or processes before the answer

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Can you make this file work better for our website?` | Ask one comprehensive question covering media type, file, goal, output and a proposed readable file name, then wait. Create no artifact. | No processing or writing call and nothing written under `media files/`. The route checks, listing and probing that the skill runs before asking are allowed. A naming preview outside `media files/` is a look, not a write. | Response transcript and clean side-effect ledger. |
| 2 | `It is a hero photo, 6MB PNG, and I want it light for the homepage. Keep the name you proposed.` | Route to Image Mode, check ffmpeg, pick a web target, convert or compress, export under the confirmed name and reply path first. | Media type now bound to Image. | Response, format choice, export listing and readback. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Can you make this file work better for our website?`

### Commands

1. `sandbox: seed hero-photo.png in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm one waiting question that carries a proposed name and no artifact -> user: submit Turn 2 in the same session`
4. `filesystem: inspect the resulting export -> operator: grade state retention and the format choice`

### Expected

Step 1 fixes the fixture and baseline. Step 2 returns one intake question with a proposed name. Step 3 proves the wait and produces the routed answer. Step 4 finds the expected image export built from the Turn 2 facts under the confirmed name.

### Evidence

Capture both turns, the side-effect ledger, the question content with its proposed name, the ffmpeg check, the chosen format and the export readback.

### Pass / fail

- **Pass**: One comprehensive question waited for the user, and the Turn 2 facts drove one correct image export
- **Fail**: The runtime invented a media type, split the intake into rounds, processed early or lost the supplied facts

### Failure triage

1. Check the fallback routing rule in `SKILL.md` for no command and no keyword hit.
2. Compare the question against the intake checklist in `interactive-intelligence.md`.
3. Check session state and the export ledger for early writes.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SAI-001 | One comprehensive question | Verify ambiguity triggers one waiting intake question | `Can you make this file work better for our website?` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh -> 3. Confirm wait and submit Turn 2 -> 4. Inspect export | Step 1: baseline known. Step 2: one question. Step 3: routed answer. Step 4: correct export | Two responses, ledger, question text, export readback | PASS if one question waited and Turn 2 facts drove the export. FAIL on a guessed type, scattered questions or early processing | 1. Check the no-hit fallback route.<br>2. Compare question with intake checklist.<br>3. Check ledger for early writes. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: skill naming and placement gate](../../feature-catalog/skill-behavior/skill-naming-and-placement-gate.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | Ambiguous routing, disambiguation checklist and the ffmpeg check |
| [`interactive-intelligence.md`](../../references/interactive-intelligence.md) | Conversation flow and the comprehensive question |

---

## 5. SOURCE METADATA

- Group: Skill ambiguity intake
- Runtime: skill
- Playbook ID: SAI-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-ambiguity-intake/one-comprehensive-question.md`
