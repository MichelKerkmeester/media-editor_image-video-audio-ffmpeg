---
title: "PRP-002 -- First command wins"
description: "Validates that the project kernel binds the first command in the request, so $aud ahead of $video yields Audio Mode guidance with an ffmpeg mp3 command."
version: 1.0.0.0
---

# PRP-002 -- First command wins

This scenario validates that the kernel's Router Code applies the same first-command rule as the skill.

---

## 1. OVERVIEW

The kernel ends with the router as code, the same algorithm the skill runs. When a request carries two commands, the first one in the text decides the mode. `$aud` comes before `$video` here, so the Project must hand back Audio Mode guidance.

### Why this matters

If the Project and the CLI bind different modes for the same request, one of them advises an operation the user did not ask for.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the kernel binds Audio Mode when `$aud` precedes `$video`
- Real user request: `Can you tell me how to pull the sound out of this clip as an mp3? It is a video file.`
- Prompt: `$aud strip the track from this $video and save it as an mp3.`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, then confirm the bound mode in the guidance and the command contents
- Expected signals: The reply names Audio Mode, leads with **Run this:** an ffmpeg command that extracts audio to mp3 with `-vn` and writes to a proposed readable name, names **Result lands in:** `media files/export/[readable-name].mp3` and **Check this:**, and closes with the attestation line carrying `mode = audio` and `execution = did not occur`
- Desired user-visible outcome: One Audio Mode answer with the mp3 command and the delivery fields
- Pass/fail: PASS if the guidance binds Audio Mode to an ffmpeg mp3 command and carries the delivery fields. FAIL if Video Mode guidance appears, both modes are mixed or the command is missing

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$aud strip the track from this $video and save it as an mp3.` | Hand back an Audio Mode answer with the ffmpeg mp3 extraction command carrying a proposed readable name, its destination, the check step and the attestation line. | Mode is Audio, never Video. | Reply transcript naming mode, command and delivery fields. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$aud strip the track from this $video and save it as an mp3.`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm Audio Mode guidance and the ffmpeg command -> operator: grade the delivery fields`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the routed guidance. Step 3 proves Audio Mode was named and the command extracts mp3 audio with the delivery fields attached.

### Evidence

Capture the full reply, the named mode, the ffmpeg command and the delivery fields.

### Pass / fail

- **Pass**: The reply binds Audio Mode, hands back an ffmpeg mp3 command and carries every delivery field
- **Fail**: Video Mode guidance appears, both modes are mixed, or the command or a delivery field is missing

### Failure triage

1. Check the first-command comment and `detect_intent` in the kernel's Router Code section.
2. Run `benchmark/router/differential.py` to confirm the kernel copy equals the router contract.
3. Check the delivery block for the export-equivalent lines.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PRP-002 | First command wins | Verify the kernel binds Audio Mode when `$aud` precedes `$video` | `$aud strip the track from this $video and save it as an mp3.` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Grade mode, command and delivery fields | Step 1: packaging ready. Step 2: Audio Mode guidance. Step 3: mp3 command and delivery fields | Reply, named mode, ffmpeg command, delivery fields | PASS if Audio Mode and the mp3 command with delivery fields. FAIL on Video Mode or a missing command | 1. Check the kernel's Router Code.<br>2. Run the differential check.<br>3. Check the delivery block. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | The Router Code section and the delivery protocol |
| [`Video And Audio Operations`](../../../claude%20project/knowledge/Media%20Editor%20-%20Integrations%20-%20Video%20And%20Audio%20Operations.md) | Audio extraction recipes |

---

## 5. SOURCE METADATA

- Group: Project command routing
- Runtime: project
- Playbook ID: PRP-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-command-routing/first-command-wins.md`
