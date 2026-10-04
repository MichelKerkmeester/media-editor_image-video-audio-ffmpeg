---
title: "SCR-001 -- Image command routing"
description: "Validates that an explicit $image command binds Image Mode to the installed ffmpeg lane and produces one resize export."
version: 1.0.0.0
---

# SCR-001 -- Image command routing

This scenario validates that the `$image` command selects Image Mode outright and binds the installed ffmpeg lane.

---

## 1. OVERVIEW

An explicit `$image` token must win routing without keyword scoring. The runtime checks `ffmpeg -version`, loads the image operations reference and proposes a readable name for the result. Once the name is confirmed it delivers one resized export through the installed ffmpeg.

### Why this matters

Command routing is the primary detection signal. If `$image` does not bind Image Mode and the installed tool, every downstream image operation is untrustworthy.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$image` selects Image Mode, binds the installed tool and exports the resize
- Real user request: `Can you resize this hero photo to 1200 pixels wide for the website?`
- Prompt: `$image Resize this hero photo to 1200 pixels wide for the website.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one hero photo, start a fresh session, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the mode, the tool and the export
- Expected signals: Image Mode selected from the `$image` token, `ffmpeg -version` checked first, the image operations reference loaded. Turn 1 proposes a readable name and writes nothing. Turn 2 saves a 1200 pixel wide export as `media files/export/[readable-name].jpg` by an ffmpeg `scale` filter, with no numbered folder
- Desired user-visible outcome: One name proposal, then one resized image export plus a path-led brief reply
- Pass/fail: PASS if Image Mode bound the installed ffmpeg lane, the name was proposed before any write and the export reads back at 1200 pixels wide under the confirmed name. FAIL if a different mode ran, the ffmpeg check was skipped, a file was written before the name was confirmed or the export is wrong

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 1200 pixels wide for the website.` | Bind Image Mode from the `$image` token, check ffmpeg, propose a readable name for the resized image and wait. | Mode is Image, tool is installed ffmpeg, no file written yet. | Reply, tool check and export listing. |
| 2 | `Yes, use that name.` | Resize the fixture to 1200 pixels wide, save to `media files/export/` under the confirmed name and reply path first. | One file in the export root under the confirmed name. | Reply, export listing and width readback. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 1200 pixels wide for the website.`

### Commands

1. `sandbox: seed hero-photo.jpg in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the name proposal and an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm Image Mode and the ffmpeg check -> filesystem: read back the export width`

### Expected

Step 1 fixes the fixture and baseline. Step 2 binds Image Mode through the command token, checks ffmpeg, proposes a name and stops. Step 3 runs the resize and proves the export is 1200 pixels wide under the confirmed name.

### Evidence

Capture both replies, the observed mode and tool check, the per-turn side-effect ledger, the export folder listing and the image width readback.

### Pass / fail

- **Pass**: `$image` proposed a name, waited and then produced one 1200 pixel wide export under that name through the checked ffmpeg lane
- **Fail**: Another mode ran, the ffmpeg check was skipped, a file was written before the name was confirmed, the width is wrong or the reply claims a tool other than the one that ran

### Failure triage

1. Check the command detection rule in `SKILL.md` that exact `$token`s win outright.
2. Check the ffmpeg check with `ffmpeg -version` and the loaded image operations reference.
3. Reconcile the export dimensions with the fixture and the reply.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SCR-001 | Image command routing | Verify `$image` binds Image Mode to the installed ffmpeg lane | `$image Resize this hero photo to 1200 pixels wide for the website.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh and confirm the proposal and the wait -> 3. Submit Turn 2 and read back width | Step 1: fixture ready. Step 2: Image Mode and a name proposal. Step 3: 1200 pixel export under the confirmed name | Both replies, tool check, export listing, width readback | PASS if Image Mode ran on checked ffmpeg after a name proposal and the export reads 1200 pixels wide. FAIL on wrong mode, skipped check, an early write or a false tool claim | 1. Check `$token` detection.<br>2. Check the ffmpeg check and image reference.<br>3. Reconcile export width. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | Command triggers, phase detection and the ffmpeg check |
| [`AGENTS.md`](../../../AGENTS.md) | Command registry and processing hierarchy |
| [`image-operations.md`](../../references/image-operations.md) | Resize recipes, format support and encoder build checks |

---

## 5. SOURCE METADATA

- Group: Skill command routing
- Runtime: skill
- Playbook ID: SCR-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-command-routing/image-command-routing.md`
