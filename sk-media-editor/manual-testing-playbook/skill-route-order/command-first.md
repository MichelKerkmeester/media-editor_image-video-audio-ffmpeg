---
title: "SRO-001 -- The media-editor command first"
description: "Validates that the skill in Claude Code runs the Media Editor tools through the media-editor command in the Bash tool when the Claude Code plugin is loaded, instead of running a raw ffmpeg command."
version: 1.0.0.0
---

# SRO-001 -- The media-editor command first

This scenario validates the first route of the route order: the `media-editor` command wins whenever it is on the PATH.

---

## 1. OVERVIEW

The skill takes the first route that is available: the `media-editor` command, then hand-written ffmpeg, then advice. This scenario loads the Claude Code plugin, so the command is on the Bash tool's PATH, and submits an image resize. The skill must first run `media-editor health`, then look at the photo with `media-editor image_probe` and `preview: true`, open the returned `previewPath` with the Read tool, propose a readable name and wait. The result must then come from `media-editor image_resize` under the confirmed `fileName`, the reply must name the path the tool returned and the skill must never run a raw ffmpeg command.

### Why this matters

The tools check their inputs against the allowed folders, never overwrite a file and write one result straight into the output folder under the name they are given. A skill that shells out to raw ffmpeg while the `media-editor` command is on the PATH skips every one of those guarantees.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the `media-editor` command takes the operation instead of a raw ffmpeg command
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `SID-001` passed for the skill runtime in the current disposable copy
- Expected execution process: Seed one hero photo wider than 800 pixels, start Claude Code in the disposable copy with the Media Editor plugin loaded, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the command calls, the returned path and the file on disk
- Expected signals: Turn 1 runs `media-editor health`, then `media-editor image_probe` with `preview: true`, opens the `previewPath` with the Read tool, proposes a readable name of two to five lowercase hyphenated words and waits, with no `media-editor image_resize` call and no file written. Turn 2 runs `media-editor image_resize` on the hero photo with the confirmed name as `fileName`. No raw `ffmpeg` command runs. The reply names `image_resize` and the path the tool returned, and that path is one image 800 pixels wide in the output folder under the confirmed name
- Desired user-visible outcome: One name proposal, then one 800 pixel wide image at the path the tool returned, named in the reply
- Pass/fail: PASS if the skill proposed a name and waited, the command did the work, no raw ffmpeg ran and the returned path reads back at 800 pixels wide under the confirmed name. FAIL if a file was written before the name was confirmed, a raw ffmpeg command ran while the `media-editor` command was on the PATH, the reply names a path the tool did not return or the file is missing or the wrong size. SKIP only when the plugin cannot be loaded in the sandbox

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Run `media-editor health`, then `media-editor image_probe` with `preview: true`, open the `previewPath` with the Read tool, propose a readable name and wait. | No `media-editor image_resize` call and no file written. A naming preview outside `media files/` is a look, not a write. | Reply, Bash transcript and per-turn side-effect ledger. |
| 2 | `Yes, use that name.` | Run `media-editor image_resize` with the confirmed `fileName` and reply with the tool name and the path it returned. | Command calls only, no raw ffmpeg, one file in the output folder under the confirmed name. | Reply, Bash transcript, per-turn side-effect ledger and `ffprobe` of the output. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `sandbox: seed hero-photo.jpg at 2400 pixels wide, record the output folder baseline, then start claude --plugin-dir "<path to>/runtime/claude-plugin" in the disposable copy and confirm media-editor health answers in the Bash tool`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the name proposal and an unchanged output folder`
3. `user: submit Turn 2 exactly -> operator: confirm the command calls and the absence of a raw ffmpeg call -> filesystem: read the returned path and run ffprobe on the image`

### Expected

Step 1 fixes the fixture, the baseline and the command on the PATH. Step 2 runs `media-editor health` and `media-editor image_probe`, proposes a name and stops. Step 3 runs `media-editor image_resize` and proves the file exists at 800 pixels wide at the path the reply named.

### Evidence

Capture both replies, the Bash transcript with the `media-editor` calls and their JSON results, the per-turn side-effect ledger and the `ffprobe` output of the resized image.

### Pass / fail

- **Pass**: The name was proposed and awaited, `media-editor image_resize` did the work with the confirmed `fileName`, no raw ffmpeg ran and the returned path is one image 800 pixels wide
- **Fail**: A file was written before the name was confirmed, a raw ffmpeg command ran while the `media-editor` command was on the PATH, the named path is not the one the tool returned, or the image is missing or the wrong width

### Failure triage

1. Check the tool check section, the route order, file naming and ALWAYS 1 in `SKILL.md`.
2. Confirm the plugin loaded and `media-editor health` answered in the Bash tool.
3. Check the Bash transcript for a raw ffmpeg command and for a `media-editor image_resize` call before the answer, and the ledger for writes outside the returned path.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRO-001 | The media-editor command first | Verify the `media-editor` command takes the operation instead of a raw ffmpeg command | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Seed fixture, baseline and the plugin -> 2. Submit Turn 1 and confirm the proposal and the wait -> 3. Submit Turn 2, confirm the command calls and read back the returned path | Step 1: command on the PATH. Step 2: `media-editor health`, `media-editor image_probe` and a name proposal. Step 3: `media-editor image_resize` and one 800 pixel wide image at the returned path | Both replies, Bash transcript, per-turn side-effect ledger, `ffprobe` output | PASS if the name was proposed first, the command did the work and the returned path reads back at 800 pixels wide. FAIL on an early write, a raw ffmpeg command, a wrong path or a wrong size | 1. Check the route order and file naming.<br>2. Check the command on the PATH.<br>3. Check the transcript and the ledger. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: media editor command](../../feature-catalog/command-line/media-editor-command.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The route order, the tool check, file naming and ALWAYS 1 |
| [`AGENTS.md`](../../../AGENTS.md) | The strict sequence and the packaging list |
| [`tools.md`](../../references/tools.md) | `image_probe`, `fileName` and the rules every tool follows |

---

## 5. SOURCE METADATA

- Group: Skill route order
- Runtime: skill
- Playbook ID: SRO-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-route-order/command-first.md`
