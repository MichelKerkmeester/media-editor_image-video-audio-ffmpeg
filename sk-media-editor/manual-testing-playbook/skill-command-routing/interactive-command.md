---
title: "SCR-005 -- Interactive command"
description: "Validates that $interactive overrides the image keywords in the same request and yields one comprehensive question with no operation run."
version: 1.0.0.0
---

# SCR-005 -- Interactive command

This scenario validates that the Interactive command binds Interactive Mode even when the request also scores for another mode.

---

## 1. OVERVIEW

`$interactive` and `$int` name Interactive Mode outright. The prompt also carries `resize` and `photo`, which score Image Mode, but a command beats keyword scoring, so the runtime must ask one comprehensive question and wait instead of resizing.

### Why this matters

A user types `$interactive` to be asked before anything runs. A runtime that lets the keywords win edits a file the user wanted to discuss first.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$interactive` binds Interactive Mode over the image keywords and asks one comprehensive question
- Real user request: `I want to talk through resizing this photo for the newsletter before you touch it.`
- Prompt: `$interactive Resize this photo for the newsletter.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one photo, start a fresh skill session, submit Turn 1, then confirm the reply is one question and that nothing was written
- Expected signals: The reply asks one comprehensive question, runs no ffmpeg command and writes nothing under `media files/export/`
- Desired user-visible outcome: One comprehensive question and no edit
- Pass/fail: PASS if the reply is one comprehensive question and the export folder is unchanged. FAIL if a resize ran, a file was written or the reply splits its questions across several turns

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$interactive Resize this photo for the newsletter.` | Bind Interactive Mode and ask one comprehensive question that covers what is still unknown, such as the target size, the output format and where the file is, then wait. | No operation ran and no file was written. | Reply transcript and the per-turn side-effect ledger. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$interactive Resize this photo for the newsletter.`

### Commands

1. `sandbox: seed newsletter-photo.jpg in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: count the questions in the reply -> filesystem: compare the export folder with the baseline`

### Expected

Step 1 fixes the fixture and the baseline. Step 2 binds Interactive Mode and asks. Step 3 proves no operation ran.

### Evidence

Capture the full reply, the per-turn side-effect ledger and the export folder listing before and after.

### Pass / fail

- **Pass**: The reply is one comprehensive question and the export folder matches the baseline
- **Fail**: A resize ran, a file was written, or the questions are split across several replies

### Failure triage

1. Check that `$interactive` and `$int` are in the command table in `SKILL.md` and `references/router-contract.md`.
2. Check the one-question rule in `references/interactive-intelligence.md`.
3. Check the ledger for any write.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SCR-005 | Interactive command | Verify `$interactive` binds Interactive Mode over the image keywords and asks one comprehensive question | `$interactive Resize this photo for the newsletter.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh -> 3. Count questions and compare the export folder | Step 1: fixture ready. Step 2: one comprehensive question. Step 3: no write | Reply, side-effect ledger, export listing before and after | PASS if one question and no write. FAIL on any edit or split questions | 1. Check the Interactive commands.<br>2. Check the one-question rule.<br>3. Check the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The command table and Interactive Mode |
| [`router-contract.md`](../../references/router-contract.md) | Commands beat keyword scoring |
| [`interactive-intelligence.md`](../../references/interactive-intelligence.md) | The one comprehensive question |

---

## 5. SOURCE METADATA

- Group: Skill command routing
- Runtime: skill
- Playbook ID: SCR-005
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-command-routing/interactive-command.md`
