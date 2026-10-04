---
title: "PRP-001 -- Command overrides keywords"
description: "Validates that the project kernel applies the same command-wins routing rule, so $audio on a video file yields Audio Mode guidance with an ffmpeg mp3 command."
version: 1.0.0.0
---

# PRP-001 -- Command overrides keywords

This scenario validates routing parity between the project kernel and the CLI contract.

---

## 1. OVERVIEW

The project kernel carries the same routing contract as the skill: an explicit `$token` wins over keyword scoring. A request to pull `$audio` from a video file must produce Audio Mode guidance with an ffmpeg mp3 command, never Video Mode guidance.

### Why this matters

If the two packagings route differently, the Project advises the wrong lane and the CLI executes the right one, which makes the advisory layer actively misleading.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$audio` produces Audio Mode guidance with an ffmpeg mp3 command despite the video context
- Real user request: `Can you pull just the audio out of this product demo video as an mp3 for the podcast feed?`
- Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, then confirm the bound mode named in the guidance and the command contents
- Expected signals: The reply names Audio Mode, hands back an ffmpeg command that extracts audio to mp3 with `-vn`, names the export destination and the check step, closes with the attestation line, and mixes in no video editing command
- Desired user-visible outcome: One Audio Mode answer with the mp3 command and the delivery fields
- Pass/fail: PASS if the guidance binds Audio Mode to an ffmpeg mp3 command and carries the delivery fields. FAIL if Video Mode guidance appears, both modes are mixed or the command is missing

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `I need $audio from this product demo video as an mp3 for the podcast feed.` | Hand back an Audio Mode answer with the ffmpeg mp3 extraction command, its destination, the check step and the attestation line. | Mode is Audio, never Video. | Reply transcript naming mode, command and delivery fields. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm Audio Mode guidance and the ffmpeg command -> operator: grade the delivery fields`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the routed guidance. Step 3 proves Audio Mode was named and the command extracts mp3 audio with the delivery fields attached.

### Evidence

Capture the full reply, the named mode, the ffmpeg command and the delivery fields.

### Pass / fail

- **Pass**: The reply binds Audio Mode to an ffmpeg mp3 command and carries the command, destination, check and attestation fields
- **Fail**: Video Mode guidance, mixed modes or a missing command

### Failure triage

1. Check the command-wins rule in the `Custom Instructions.md` phase detection.
2. Check the named mode and command against the video and audio knowledge mirror.
3. Check the command for audio extraction versus video editing steps.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PRP-001 | Command overrides keywords | Verify `$audio` routes project guidance to Audio Mode | `I need $audio from this product demo video as an mp3 for the podcast feed.` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Confirm mode, command and fields | Step 1: packaging confirmed. Step 2: routed guidance. Step 3: Audio Mode with ffmpeg mp3 command | Reply, mode name, command, delivery fields | PASS if Audio Mode guidance carries an ffmpeg mp3 command and the delivery fields. FAIL on Video Mode, mixed modes or a missing command | 1. Check command-wins phase detection.<br>2. Check the command against the mirror.<br>3. Check the operation type. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | Routing authority and command-wins phase detection |
| `Media Editor - Integrations - Video And Audio Operations` (knowledge mirror) | Audio extraction commands and codec guidance |

---

## 5. SOURCE METADATA

- Group: Project command routing
- Runtime: project
- Playbook ID: PRP-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-command-routing/command-overrides-keywords.md`
