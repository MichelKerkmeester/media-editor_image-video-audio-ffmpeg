---
title: "PRO-001 -- Connected tools in Claude Desktop"
description: "Validates that the Project runtime runs the Media Editor tools when a Claude Desktop Project has the extension connected, and reports only what the tool did."
version: 1.0.0.0
---

# PRO-001 -- Connected tools in Claude Desktop

This scenario validates the tools route inside a Project: with the extension connected, the Project edits the file instead of handing back a command.

---

## 1. OVERVIEW

Without the Media Editor tools a Project can only advise. In Claude Desktop with the Media Editor extension installed, the same Project runs the tools. This scenario submits the `SRO-001` resize in such a Project. The Project must first look at the photo with `image_probe`, propose a readable name and wait. The result must then come from `image_resize` under the confirmed name, and the reply must lead with the tool that ran and the path it returned and close with the attestation line that names the tool run.

### Why this matters

The kernel claims execution only for what a Media Editor tool did in the conversation. A Project that still hands back a command when the tools are connected wastes them, and one that claims a result no tool produced breaks the rule every Project scenario rests on.

---

## 2. SCENARIO CONTRACT

- Objective: Verify a Claude Desktop Project with the extension connected runs the tools and reports only what they did
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `PID-001` passed for this runtime in the current disposable copy
- Expected execution process: Install the Media Editor extension in Claude Desktop with the fixture folder allowed, open the Project carrying the Custom Instructions kernel and knowledge documents, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the tool calls, the reply fields and the file on disk
- Expected signals: Turn 1 calls `image_probe` with `preview: true`, proposes a readable name of two to five lowercase hyphenated words and waits, with no `image_resize` call and no file written. Turn 2 calls `media_health`, then `image_resize` with the confirmed name as `fileName`. The reply leads with **Ran:** naming `image_resize`, **Result is in:** naming the path the tool returned and **Check this:** naming a verification step, and it closes with an attestation line stating `execution = tool ran` and the returned path. No command is handed back as the user's job
- Desired user-visible outcome: One name proposal, then one 800 pixel wide image at the path the tool returned, with a reply that names the tool and the path
- Pass/fail: PASS if the Project proposed a name and waited, the tools did the work, the returned path reads back at 800 pixels wide and the reply claims nothing beyond the tool run. FAIL if a file was written before the name was confirmed, the Project handed back a command while the tools were connected, claimed a path the tool did not return or claimed a check it did not run. SKIP only when Claude Desktop with the extension is unavailable to the operator

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Call `image_probe` with `preview: true`, propose a readable name and wait. Claim no result. | No `image_resize` call and no file written. | Reply, tool call transcript and per-turn side-effect ledger. |
| 2 | `Yes, use that name.` | Call `media_health`, then `image_resize` with the confirmed `fileName`, and reply with Ran, Result is in, Check this and the tool-run attestation. | Tool calls only, one file in the allowed output folder under the confirmed name. | Reply, tool call transcript, per-turn side-effect ledger and `ffprobe` of the output. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `sandbox: seed hero-photo.jpg at 2400 pixels wide in a folder, install media-editor-<platform>.mcpb in Claude Desktop, allow that folder and record its baseline`
2. `session: open the Media Editor Project in Claude Desktop, start fresh -> user: submit Turn 1 exactly -> operator: confirm the name proposal and an unchanged output folder`
3. `user: submit Turn 2 exactly -> operator: confirm the tool calls, the reply fields and the attestation -> filesystem: read the returned path and run ffprobe on the image`

### Expected

Step 1 fixes the fixture, the extension and the allowed folder. Step 2 runs `image_probe` from the Project, proposes a name and stops. Step 3 runs `media_health` and `image_resize` and proves the file exists at 800 pixels wide at the path the reply named.

### Evidence

Capture both replies, the tool call transcript, the per-turn side-effect ledger and the `ffprobe` output of the resized image.

### Pass / fail

- **Pass**: The name was proposed and awaited, `image_resize` did the work with the confirmed `fileName`, the reply leads with the tool and its path and the returned path is one image 800 pixels wide
- **Fail**: A file was written before the name was confirmed, the Project handed back a command with the tools connected, named a path the tool did not return, or claimed a check or save no tool made

### Failure triage

1. Check the route order, the tool check and the delivery protocol in `Custom Instructions.md`.
2. Confirm the extension is enabled and the fixture folder is among its allowed folders.
3. Check the ledger for writes outside the returned path and for an `image_resize` call before the answer.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PRO-001 | Connected tools in Claude Desktop | Verify a Claude Desktop Project with the extension connected runs the tools and reports only what they did | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Seed fixture, install the extension and allow the folder -> 2. Submit Turn 1 fresh in the Project and confirm the proposal and the wait -> 3. Submit Turn 2, confirm tool calls and read back the returned path | Step 1: tools connected. Step 2: `image_probe` and a name proposal. Step 3: `media_health`, `image_resize`, one 800 pixel wide image and a tool-run attestation | Both replies, tool call transcript, per-turn side-effect ledger, `ffprobe` output | PASS if the name waited, the tools did the work and the reply claims nothing beyond the tool run. FAIL on an early write, a handed-back command, a wrong path or an unearned claim | 1. Check the kernel route order and file naming.<br>2. Check the extension settings.<br>3. Check the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | The route order, the tool check, file naming, ALWAYS 1 and the delivery protocol |
| [`INSTALL-GUIDE.md`](../../../INSTALL-GUIDE.md) | Installing the Claude Desktop extension |

---

## 5. SOURCE METADATA

- Group: Project route order
- Runtime: project
- Playbook ID: PRO-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-route-order/connected-tools-in-desktop.md`
