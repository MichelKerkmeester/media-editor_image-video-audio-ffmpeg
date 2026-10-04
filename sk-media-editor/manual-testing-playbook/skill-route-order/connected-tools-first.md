---
title: "SRO-001 -- Connected tools first"
description: "Validates that the CLI runtime uses the Media Editor tools when the Claude Code plugin connects them, instead of running ffmpeg from the shell."
version: 1.0.0.0
---

# SRO-001 -- Connected tools first

This scenario validates the first route of the route order: the Media Editor tools win whenever they are connected.

---

## 1. OVERVIEW

The runtime takes the first route that is available: the Media Editor tools when they are connected, then locally installed ffmpeg, then advice. This scenario loads the Claude Code plugin, so the tools are connected, and submits an image resize. The reply must come from `image_resize`, name the numbered folder the tool returned and never run ffmpeg from the shell.

### Why this matters

The tools check their inputs against the allowed folders, never overwrite a source and write one fresh numbered folder per call. A runtime that shells out to ffmpeg while the tools are connected skips every one of those guarantees.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the connected Media Editor tools take the operation instead of shell ffmpeg
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one hero photo wider than 800 pixels, start Claude Code in the disposable copy with the Media Editor plugin loaded, submit Turn 1, then confirm the tool calls, the returned folder and the file on disk
- Expected signals: The session calls `media_health`, then `image_resize` on the hero photo. No shell `ffmpeg` command runs. The reply names `image_resize` and the numbered folder it returned, and that folder holds one image 800 pixels wide
- Desired user-visible outcome: One 800 pixel wide image in the folder the tool returned, named in the reply
- Pass/fail: PASS if the tools did the work, no shell ffmpeg ran and the returned folder reads back at 800 pixels wide. FAIL if ffmpeg ran from the shell while the tools were connected, the reply names a folder the tool did not return or the file is missing or the wrong size. SKIP only when the plugin cannot be loaded in the sandbox

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Call `media_health`, then `image_resize`, and reply with the tool name and the folder it returned. | Tool calls only, no shell ffmpeg, one numbered folder. | Reply, tool call transcript, per-turn side-effect ledger and `ffprobe` of the output. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `sandbox: seed hero-photo.jpg at 2400 pixels wide, record the folder baseline, then start claude --plugin-dir "<path to>/mcp server/claude-plugin" in the disposable copy and confirm mcp list shows media-editor as Connected`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm the tool calls and the absence of a shell ffmpeg call -> filesystem: read the returned folder and run ffprobe on the image`

### Expected

Step 1 fixes the fixture, the baseline and the connected tools. Step 2 runs `media_health` and `image_resize`. Step 3 proves the file exists at 800 pixels wide in the folder the reply named.

### Evidence

Capture the full reply, the tool call transcript, the per-turn side-effect ledger and the `ffprobe` output of the resized image.

### Pass / fail

- **Pass**: `image_resize` did the work, no shell ffmpeg ran and the returned folder holds one image 800 pixels wide
- **Fail**: Shell ffmpeg ran while the tools were connected, the named folder is not the one the tool returned, or the image is missing or the wrong width

### Failure triage

1. Check the tool check section, the route order and ALWAYS 1 in `SKILL.md`.
2. Confirm the plugin loaded and `mcp list` showed the server as Connected.
3. Check the transcript for a Bash call to ffmpeg and the ledger for writes outside the returned folder.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRO-001 | Connected tools first | Verify the connected Media Editor tools take the operation instead of shell ffmpeg | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Seed fixture, baseline and plugin -> 2. Submit Turn 1 fresh -> 3. Confirm tool calls and read back the returned folder | Step 1: tools connected. Step 2: `media_health` then `image_resize`. Step 3: one 800 pixel wide image in the returned folder | Reply, tool call transcript, per-turn side-effect ledger, `ffprobe` output | PASS if the tools did the work and the returned folder reads back at 800 pixels wide. FAIL on shell ffmpeg, a wrong folder or a wrong size | 1. Check the route order.<br>2. Check the plugin connection.<br>3. Check the transcript and the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The route order, the tool check and ALWAYS 1 |
| [`AGENTS.md`](../../../AGENTS.md) | The strict sequence and the packaging list |

---

## 5. SOURCE METADATA

- Group: Skill route order
- Runtime: skill
- Playbook ID: SRO-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-route-order/connected-tools-first.md`
