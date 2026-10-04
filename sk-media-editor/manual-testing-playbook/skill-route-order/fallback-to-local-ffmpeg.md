---
title: "SRO-002 -- Fallback to local ffmpeg"
description: "Validates that the CLI runtime falls back to locally installed ffmpeg when the Media Editor tools are not connected, and says which route answered."
version: 1.0.0.0
---

# SRO-002 -- Fallback to local ffmpeg

This scenario validates the second route of the route order: installed ffmpeg when the Media Editor tools are absent.

---

## 1. OVERVIEW

The runtime takes the first route that is available. This scenario starts the session without the plugin, so no Media Editor tool is connected, with ffmpeg on the path. The same resize as `SRO-001` must then run through installed ffmpeg after `ffmpeg -version` answers. The runtime must propose a readable name first, wait for the answer and then write the result straight into `media files/export/` under the confirmed name.

### Why this matters

A runtime that stops when the tools are missing, or claims a tool that is not connected, fails users who installed ffmpeg themselves. The fallback keeps the skill working in any terminal.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the runtime falls back to installed ffmpeg when no Media Editor tool is connected
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one hero photo wider than 800 pixels, start the CLI runtime without the plugin and with ffmpeg on the path, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the route, the ffmpeg check and the export
- Expected signals: No Media Editor tool is called or claimed. `ffmpeg -version` runs before the resize. Turn 1 proposes a readable name of two to five lowercase hyphenated words and writes nothing. Turn 2 writes one image 800 pixels wide as `media files/export/[readable-name].jpg` with no numbered folder, and the reply names that path
- Desired user-visible outcome: One name proposal, then one 800 pixel wide image export through installed ffmpeg, with the path leading the reply
- Pass/fail: PASS if the ffmpeg check ran first, the name was proposed before any write, the export reads back at 800 pixels wide under the confirmed name and no tool was claimed. FAIL if the runtime stopped because the tools were missing, claimed a Media Editor tool ran, wrote a file before the name was confirmed or produced no readable export. SKIP only when the sandbox cannot run with ffmpeg on the path and the plugin unloaded

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Find no Media Editor tools, run `ffmpeg -version`, propose a readable name for the resized image and wait. | No tool claim, check ran first, no file written. | Reply, check output and per-turn side-effect ledger. |
| 2 | `Yes, use that name.` | Resize with ffmpeg, save as `media files/export/[confirmed-name].jpg`, verify the save and reply path first. | One file in the export root under the confirmed name and no folder. | Reply, per-turn side-effect ledger and `ffprobe` of the export. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `sandbox: seed hero-photo.jpg at 2400 pixels wide, record the export baseline, start the runtime without the plugin and confirm ffmpeg -version answers`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the check ran first and the proposal waited with an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm no tool was called or claimed -> filesystem: read the export root and run ffprobe on the image`

### Expected

Step 1 fixes the fixture, the baseline and the tool-free session. Step 2 checks ffmpeg, proposes a name and stops. Step 3 resizes under the confirmed name and proves the export exists at 800 pixels wide at the path the reply named.

### Evidence

Capture both replies, the `ffmpeg -version` output, the per-turn side-effect ledger and the `ffprobe` output of the export.

### Pass / fail

- **Pass**: The ffmpeg check ran first, the name was proposed before any write, the export reads back at 800 pixels wide under the confirmed name and the reply claims no Media Editor tool
- **Fail**: The runtime stopped for want of the tools, a tool was claimed, a file was written before the name was confirmed, or the export is missing or the wrong width

### Failure triage

1. Check the route order, the tool check and file naming sections in `SKILL.md`.
2. Confirm the plugin was really unloaded and ffmpeg resolves in the session.
3. Check the export baseline for a missing file or an extra folder, and the ledger for a write before the answer.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRO-002 | Fallback to local ffmpeg | Verify the runtime falls back to installed ffmpeg when no Media Editor tool is connected | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Seed fixture, baseline and a tool-free session -> 2. Submit Turn 1 and confirm the proposal and the wait -> 3. Submit Turn 2 and read back the export | Step 1: no tools, ffmpeg answers. Step 2: check, then a name proposal and a wait. Step 3: resize under the confirmed name and one 800 pixel wide export | Both replies, check output, per-turn side-effect ledger, `ffprobe` output | PASS if the check ran first, the name waited and the export reads back at 800 pixels wide with no tool claimed. FAIL on a stop, a tool claim, an early write or a missing export | 1. Check the route order and file naming.<br>2. Check the session setup.<br>3. Check the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The route order, the tool check and file naming |
| [`image-operations.md`](../../references/image-operations.md) | The route order and the resize recipe |

---

## 5. SOURCE METADATA

- Group: Skill route order
- Runtime: skill
- Playbook ID: SRO-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-route-order/fallback-to-local-ffmpeg.md`
