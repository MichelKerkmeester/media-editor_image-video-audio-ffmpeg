---
title: "SRO-002 -- Fallback to local ffmpeg"
description: "Validates that the CLI runtime falls back to locally installed ffmpeg when the Media Editor tools are not connected, and says which route answered."
version: 1.0.0.0
---

# SRO-002 -- Fallback to local ffmpeg

This scenario validates the second route of the route order: installed ffmpeg when the Media Editor tools are absent.

---

## 1. OVERVIEW

The runtime takes the first route that is available. This scenario starts the session without the plugin, so no Media Editor tool is connected, with ffmpeg on the path. The same resize as `SRO-001` must then run through installed ffmpeg after `ffmpeg -version` answers, and land in `media files/export/[###] - [description]/`.

### Why this matters

A runtime that stops when the tools are missing, or claims a tool that is not connected, fails users who installed ffmpeg themselves. The fallback keeps the skill working in any terminal.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the runtime falls back to installed ffmpeg when no Media Editor tool is connected
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one hero photo wider than 800 pixels, start the CLI runtime without the plugin and with ffmpeg on the path, submit Turn 1, then confirm the route, the ffmpeg check and the export
- Expected signals: No Media Editor tool is called or claimed. `ffmpeg -version` runs before the resize. One `media files/export/[###] - [description]/` folder holds one image 800 pixels wide, and the reply names that path
- Desired user-visible outcome: One 800 pixel wide image export through installed ffmpeg, with the path leading the reply
- Pass/fail: PASS if the ffmpeg check ran first, the export reads back at 800 pixels wide and no tool was claimed. FAIL if the runtime stopped because the tools were missing, claimed a Media Editor tool ran or produced no readable export. SKIP only when the sandbox cannot run with ffmpeg on the path and the plugin unloaded

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Find no Media Editor tools, run `ffmpeg -version`, resize with ffmpeg and save to a numbered export folder. | No tool claim, check ran first, one export folder. | Reply, check output, per-turn side-effect ledger and `ffprobe` of the export. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `sandbox: seed hero-photo.jpg at 2400 pixels wide, record the export baseline, start the runtime without the plugin and confirm ffmpeg -version answers`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm no tool was called or claimed and the check ran first -> filesystem: read the export folder and run ffprobe on the image`

### Expected

Step 1 fixes the fixture, the baseline and the tool-free session. Step 2 checks ffmpeg and resizes. Step 3 proves the export exists at 800 pixels wide at the path the reply named.

### Evidence

Capture the full reply, the `ffmpeg -version` output, the per-turn side-effect ledger and the `ffprobe` output of the export.

### Pass / fail

- **Pass**: The ffmpeg check ran first, the export reads back at 800 pixels wide and the reply claims no Media Editor tool
- **Fail**: The runtime stopped for want of the tools, a tool was claimed, or the export is missing or the wrong width

### Failure triage

1. Check the route order and the tool check section in `SKILL.md`.
2. Confirm the plugin was really unloaded and ffmpeg resolves in the session.
3. Check the export baseline for a missing or extra folder.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRO-002 | Fallback to local ffmpeg | Verify the runtime falls back to installed ffmpeg when no Media Editor tool is connected | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Seed fixture, baseline and a tool-free session -> 2. Submit Turn 1 fresh -> 3. Confirm the route and read back the export | Step 1: no tools, ffmpeg answers. Step 2: check then resize. Step 3: one 800 pixel wide export | Reply, check output, per-turn side-effect ledger, `ffprobe` output | PASS if the check ran first and the export reads back at 800 pixels wide with no tool claimed. FAIL on a stop, a tool claim or a missing export | 1. Check the route order.<br>2. Check the session setup.<br>3. Check the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The route order and the tool check |
| [`image-operations.md`](../../references/image-operations.md) | The route order and the resize recipe |

---

## 5. SOURCE METADATA

- Group: Skill route order
- Runtime: skill
- Playbook ID: SRO-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-route-order/fallback-to-local-ffmpeg.md`
