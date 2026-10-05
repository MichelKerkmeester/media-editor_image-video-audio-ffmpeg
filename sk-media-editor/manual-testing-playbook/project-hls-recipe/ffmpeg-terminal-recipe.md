---
title: "PHL-001 -- FFmpeg terminal recipe"
description: "Validates that $hls guidance in the project names installed ffmpeg and hands the user verifiable ladder commands for their own terminal."
version: 1.0.0.0
---

# PHL-001 -- FFmpeg terminal recipe

This scenario validates HLS guidance in the advisory packaging.

---

## 1. OVERVIEW

`$hls` routes to HLS Mode, which runs on installed ffmpeg. The Project must hand back the multi-quality ladder command for the user's own terminal, name the export destination and the check step, and state plainly that it did not run the conversion.

### Why this matters

Guidance that claims the Project ran the conversion fabricates a result. Guidance that omits the ladder structure or the verification step leaves the user with a command that cannot be checked.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$hls` guidance hands back a runnable ffmpeg ladder command with the delivery fields
- Real user request: `Can you convert this keynote recording for adaptive streaming on the site?`
- Prompt: `$hls Convert this keynote recording for adaptive streaming on the site.`
- Precondition: `PID-001` passed for this runtime in the current Project session
- Expected execution process: Open the Project, submit Turn 1, then inspect the command, the destination, the check step and the attestation
- Expected signals: The reply names HLS Mode and installed ffmpeg as its processing route. Naming ffmpeg's own `ffprobe` or `ffplay`, or a plain file server, for the check is allowed and never required. It hands back a multi-quality command with `-f hls` and `-var_stream_map`, names **Result lands in:** one `media files/export/[###] - [description]/` folder whose description is a proposed readable name, because a ladder writes several files, names **Check this:** a verification step such as reading the master playlist or running `ffprobe`, closes with the attestation line, and never claims execution
- Desired user-visible outcome: One complete HLS answer the user can paste into their own terminal
- Pass/fail: PASS if installed ffmpeg is the only processing route named, with no Media Editor tool or other converter claimed, and the ladder command is complete with the delivery fields. FAIL if the command is missing steps, the structure is wrong or execution is claimed

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$hls Convert this keynote recording for adaptive streaming on the site.` | Hand back an HLS Mode answer with the ffmpeg ladder command writing to a numbered folder with a proposed readable description, its destination, the check step and the attestation line. | The processing route is installed ffmpeg only. | Reply transcript with the command and the delivery fields. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$hls Convert this keynote recording for adaptive streaming on the site.`

### Commands

1. `sandbox: confirm the Project carries Custom Instructions and the knowledge documents`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: check the named tool, the ladder command and the attestation`

### Expected

Step 1 fixes the packaging under test. Step 2 produces the HLS guidance. Step 3 proves installed ffmpeg is the only processing route named and the command covers the ladder conversion, the playlist output and the check.

### Evidence

Capture the full reply, the named tool, the ladder command and the attestation line.

### Pass / fail

- **Pass**: The reply names installed ffmpeg as its only processing route and carries a complete runnable ladder command with the delivery fields and an honest attestation
- **Fail**: Another tool is named for HLS, the command cannot run as written or execution is claimed

### Failure triage

1. Check the `$hls` routing row and the ffmpeg-only rule in `Custom Instructions.md`.
2. Compare the command against the HLS Video Conversion knowledge mirror.
3. Check the attestation fields and the recommended export destination.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PHL-001 | FFmpeg terminal recipe | Verify `$hls` guidance names installed ffmpeg only with a runnable ladder command | `$hls Convert this keynote recording for adaptive streaming on the site.` | 1. Confirm packaging -> 2. Submit Turn 1 fresh -> 3. Check tool, command and attestation | Step 1: packaging confirmed. Step 2: HLS guidance. Step 3: ffmpeg-only ladder command plus attestation | Reply, ladder command, attestation | PASS if installed ffmpeg is the only processing route named and the ladder command is complete. FAIL on a Media Editor tool or another converter named, an incomplete command or execution claims | 1. Check the `$hls` ffmpeg-only rule.<br>2. Compare the command with the HLS mirror.<br>3. Check attestation and save advice. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: project kernel and knowledge files](../../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | HLS mode routing and delivery protocol |
| [`HLS Video Conversion`](../../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20HLS%20Video%20Conversion.md) | Ladder recipe and verification mirror |

---

## 5. SOURCE METADATA

- Group: Project HLS recipe
- Runtime: project
- Playbook ID: PHL-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-hls-recipe/ffmpeg-terminal-recipe.md`
