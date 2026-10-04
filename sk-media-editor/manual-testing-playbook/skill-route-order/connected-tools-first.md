---
title: "SRO-001 -- Connected tools first"
description: "Validates that the CLI runtime uses the Media Editor tools when the Claude Code plugin connects them, instead of running ffmpeg from the shell."
version: 1.0.0.0
---

# SRO-001 -- Connected tools first

This scenario validates the first route of the route order: the Media Editor tools win whenever they are connected.

---

## 1. OVERVIEW

The runtime takes the first route that is available: the Media Editor tools when they are connected, then locally installed ffmpeg, then advice. This scenario loads the Claude Code plugin, so the tools are connected, and submits an image resize. The runtime must first look at the photo with `image_probe`, propose a readable name and wait. The result must then come from `image_resize` under the confirmed name, the reply must name the path the tool returned and the runtime must never run ffmpeg from the shell.

### Why this matters

The tools check their inputs against the allowed folders, never overwrite a file and write one result straight into the output folder under the name they are given. A runtime that shells out to ffmpeg while the tools are connected skips every one of those guarantees.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the connected Media Editor tools take the operation instead of shell ffmpeg
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one hero photo wider than 800 pixels, start Claude Code in the disposable copy with the Media Editor plugin loaded, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the tool calls, the returned path and the file on disk
- Expected signals: Turn 1 calls `media_health`, then `image_probe` with `preview: true`, proposes a readable name of two to five lowercase hyphenated words and waits, with no `image_resize` call and no file written. Turn 2 calls `image_resize` on the hero photo with the confirmed name as `fileName`. No shell `ffmpeg` command runs. The reply names `image_resize` and the path the tool returned, and that path is one image 800 pixels wide in the output folder under the confirmed name
- Desired user-visible outcome: One name proposal, then one 800 pixel wide image at the path the tool returned, named in the reply
- Pass/fail: PASS if the runtime proposed a name and waited, the tools did the work, no shell ffmpeg ran and the returned path reads back at 800 pixels wide under the confirmed name. FAIL if a file was written before the name was confirmed, ffmpeg ran from the shell while the tools were connected, the reply names a path the tool did not return or the file is missing or the wrong size. SKIP only when the plugin cannot be loaded in the sandbox

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Call `media_health`, then `image_probe` with `preview: true`, propose a readable name and wait. | No `image_resize` call and no file written. | Reply, tool call transcript and per-turn side-effect ledger. |
| 2 | `Yes, use that name.` | Call `image_resize` with the confirmed `fileName` and reply with the tool name and the path it returned. | Tool calls only, no shell ffmpeg, one file in the output folder under the confirmed name. | Reply, tool call transcript, per-turn side-effect ledger and `ffprobe` of the output. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `sandbox: seed hero-photo.jpg at 2400 pixels wide, record the output folder baseline, then start claude --plugin-dir "<path to>/mcp server/claude-plugin" in the disposable copy and confirm mcp list shows media-editor as Connected`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the name proposal and an unchanged output folder`
3. `user: submit Turn 2 exactly -> operator: confirm the tool calls and the absence of a shell ffmpeg call -> filesystem: read the returned path and run ffprobe on the image`

### Expected

Step 1 fixes the fixture, the baseline and the connected tools. Step 2 runs `media_health` and `image_probe`, proposes a name and stops. Step 3 runs `image_resize` and proves the file exists at 800 pixels wide at the path the reply named.

### Evidence

Capture both replies, the tool call transcript, the per-turn side-effect ledger and the `ffprobe` output of the resized image.

### Pass / fail

- **Pass**: The name was proposed and awaited, `image_resize` did the work with the confirmed `fileName`, no shell ffmpeg ran and the returned path is one image 800 pixels wide
- **Fail**: A file was written before the name was confirmed, shell ffmpeg ran while the tools were connected, the named path is not the one the tool returned, or the image is missing or the wrong width

### Failure triage

1. Check the tool check section, the route order, file naming and ALWAYS 1 in `SKILL.md`.
2. Confirm the plugin loaded and `mcp list` showed the server as Connected.
3. Check the transcript for a Bash call to ffmpeg and for an `image_resize` call before the answer, and the ledger for writes outside the returned path.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRO-001 | Connected tools first | Verify the connected Media Editor tools take the operation instead of shell ffmpeg | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Seed fixture, baseline and plugin -> 2. Submit Turn 1 and confirm the proposal and the wait -> 3. Submit Turn 2, confirm tool calls and read back the returned path | Step 1: tools connected. Step 2: `media_health`, `image_probe` and a name proposal. Step 3: `image_resize` and one 800 pixel wide image at the returned path | Both replies, tool call transcript, per-turn side-effect ledger, `ffprobe` output | PASS if the name was proposed first, the tools did the work and the returned path reads back at 800 pixels wide. FAIL on an early write, shell ffmpeg, a wrong path or a wrong size | 1. Check the route order and file naming.<br>2. Check the plugin connection.<br>3. Check the transcript and the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
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
- Feature file path: `skill-route-order/connected-tools-first.md`
