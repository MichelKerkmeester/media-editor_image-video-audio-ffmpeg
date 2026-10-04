---
title: "PRM-001 -- Repair guidance"
description: "Validates that the project kernel answers $repair with an ffprobe diagnosis command followed by an ffmpeg repair command, and claims no repair of its own."
version: 1.0.0.0
---

# PRM-001 -- Repair guidance

This scenario validates Repair Mode in the Project when no tool is connected.

---

## 1. OVERVIEW

A claude.ai Project without the tools cannot open the user's file. On `$repair` it must hand back the diagnosis first, an ffprobe command, then the repair, an ffmpeg remux into a fresh container with a re-encode as the next step if the remux fails. It never claims to have repaired anything.

### Why this matters

A Project that says it fixed a file it never opened sends the user looking for a repaired copy that does not exist.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$repair` yields an ffprobe diagnosis command, then an ffmpeg repair command, with no claimed repair
- Real user request: `This screen recording stops playing after ten seconds. What do I do?`
- Prompt: `$repair This screen recording stops playing after ten seconds. Can you fix it?`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, then confirm the command order and the delivery fields
- Expected signals: The reply names Repair Mode, leads with **Run this:** an ffprobe command before the ffmpeg repair command, whose output carries a proposed readable name, offers a re-encode when the remux does not fix playback, names **Result lands in:** `media files/export/[readable-name].[ext]` and **Check this:**, and closes with the attestation line carrying `mode = repair` and `execution = did not occur`
- Desired user-visible outcome: One Repair Mode answer with the diagnosis and repair commands and no claimed repair
- Pass/fail: PASS if the ffprobe diagnosis precedes the ffmpeg repair, the delivery fields are present and no repair is claimed. FAIL if the diagnosis is missing, the reply claims the file was repaired or saved, or another mode binds

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$repair This screen recording stops playing after ten seconds. Can you fix it?` | Hand back Repair Mode guidance: the ffprobe diagnosis command, then the ffmpeg repair command with a proposed readable name and a re-encode as the fallback, its destination, the check step and the attestation line. | Mode is Repair. No claim of a repaired file. | Reply transcript naming mode, both commands and delivery fields. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$repair This screen recording stops playing after ten seconds. Can you fix it?`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm the command order -> operator: grade the delivery fields and the attestation line`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the Repair guidance. Step 3 proves the diagnosis comes first and that nothing claims to have run.

### Evidence

Capture the full reply, the named mode, both commands in order and the delivery fields.

### Pass / fail

- **Pass**: The ffprobe diagnosis precedes the ffmpeg repair, every delivery field is present and no repair is claimed
- **Fail**: The diagnosis is missing, the reply claims a repaired or saved file, or another mode binds

### Failure triage

1. Check the Repair row in the kernel's mode table and its ffprobe then ffmpeg fallback.
2. Check the export-equivalent delivery block in the kernel.
3. Check the Repair intake in the Interactive Intelligence Knowledge document.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PRM-001 | Repair guidance | Verify `$repair` yields an ffprobe diagnosis command, then an ffmpeg repair command, with no claimed repair | `$repair This screen recording stops playing after ten seconds. Can you fix it?` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Grade order, delivery fields and attestation | Step 1: packaging ready. Step 2: ffprobe then ffmpeg guidance. Step 3: delivery fields, no claimed repair | Reply, named mode, both commands, delivery fields | PASS if diagnosis first and no claimed repair. FAIL on a missing diagnosis or a claimed result | 1. Check the kernel's Repair row.<br>2. Check the delivery block.<br>3. Check the Repair intake. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | The Repair row, the Router Code and the delivery protocol |
| [`Interactive Intelligence`](../../../claude%20project/knowledge/Media%20Editor%20-%20System%20-%20Interactive%20Intelligence.md) | Repair intake |
| [`Media Editor Tools`](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20Media%20Editor%20Tools.md) | `media_probe` and `media_repair` when the tools are connected |

---

## 5. SOURCE METADATA

- Group: Project repair mode
- Runtime: project
- Playbook ID: PRM-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-repair-mode/repair-guidance.md`
