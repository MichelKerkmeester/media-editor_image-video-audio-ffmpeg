---
title: "PRO-002 -- Setup offer without the tools"
description: "Validates that the Project runtime, with no Media Editor tools connected, answers with advice first, offers the guided setup once and then walks the user through installing the extension one step at a time."
version: 1.0.0.0
---

# PRO-002 -- Setup offer without the tools

This scenario validates the setup offer inside a Project: without the tools, the Project still answers, then offers to help the user install the extension.

---

## 1. OVERVIEW

A Project in claude.ai in a browser has no Media Editor tools and cannot run ffmpeg. The kernel answers such a request with advice, then offers once to walk the user through installing the Media Editor extension, with the steps in `Media Editor - Reference - Setup.md`. This scenario submits an image request in a browser Project, accepts the offer and checks the first step of the walkthrough.

### Why this matters

Without the offer, a user who does not know the extension exists keeps receiving commands they may not be able to run. With an offer that floods them with every step at once, or that claims the setup is done, the user ends up with a broken install and no way to tell.

---

## 2. SCENARIO CONTRACT

- Objective: Verify a Project without the tools advises first, offers the guided setup once and then gives one setup step at a time for the user's surface
- Real user request: `Can you make this hero photo 800 pixels wide for the blog?`
- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`
- Precondition: `PID-001` passed for this runtime in the current disposable copy
- Expected execution process: Open the Project carrying the Custom Instructions kernel and knowledge documents in claude.ai in a browser, with no extension, submit Turn 1 and confirm the advice and the offer, submit Turn 2 and confirm the first walkthrough step
- Expected signals: Turn 1 calls no Media Editor tool, gives the exact resize command with a proposed readable output name, states that nothing ran and closes with one line offering to walk the user through installing the extension. Turn 2 says the tools cannot run in a browser and that the Claude Desktop app is needed, then gives the first step only: the latest release link `https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/latest` and the file for each computer. The reply waits for the user before the next step and never says the extension is installed
- Desired user-visible outcome: Advice and a one-line setup offer, then the first install step with the release link, waiting for the user
- Pass/fail: PASS if Turn 1 advised before offering, offered once and Turn 2 named Claude Desktop, gave the release link and the file table and stopped after that step. FAIL if Turn 1 held the command back for the setup, offered more than once, Turn 2 listed every step at once, sent the user to build the extension from source, or claimed the extension was installed or working. SKIP only when claude.ai in a browser is unavailable to the operator

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize this hero photo to 800 pixels wide for the blog.` | Give the resize command with a proposed readable name, say that nothing ran, then offer the guided setup in one line. | No tool call, no claim of a result. | Reply and tool call transcript. |
| 2 | `Yes, walk me through it.` | Say the tools need the Claude Desktop app, then give the first step: the latest release link and which file to download. Wait. | No tool call, no claim the setup is done. | Reply and tool call transcript. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

### Commands

1. `session: open the Media Editor Project in claude.ai in a browser, with no extension, start fresh -> user: submit Turn 1 exactly`
2. `operator: confirm the advice, the proposed name, the nothing-ran statement and one setup offer`
3. `user: submit Turn 2 exactly -> operator: confirm Claude Desktop is named, the release link and file table appear, and the reply stops after the first step`

### Expected

Step 1 runs the Project with no tools. Step 2 proves the advice comes before the offer. Step 3 proves the walkthrough starts at the right surface, links the release and gives one step.

### Evidence

Capture both replies and the tool call transcript.

### Pass / fail

- **Pass**: Advice first, one offer, then the Claude Desktop note, the release link, the file table and a wait
- **Fail**: The command was held back, the offer repeated, every step arrived at once, the user was sent to build from source, or the reply claimed a working install

### Failure triage

1. Check the tool check and ESCALATE 2 in `Custom Instructions.md`.
2. Check that `Media Editor - Reference - Setup.md` is uploaded as Project Knowledge.
3. Check Sections 1 to 3 of the Setup reference for the order and the first step.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PRO-002 | Setup offer without the tools | Verify a Project without the tools advises first, offers the guided setup once and gives one step at a time | `$image Resize this hero photo to 800 pixels wide for the blog.` | 1. Open the Project in a browser and submit Turn 1 fresh -> 2. Confirm the advice and the offer -> 3. Submit Turn 2 and confirm the first step | Step 1: no tools. Step 2: command, proposed name, nothing ran, one offer. Step 3: Claude Desktop named, release link, file table, a wait | Both replies, tool call transcript | PASS if advice came first, the offer came once and the walkthrough gave one step with the release link. FAIL on a held-back command, a repeated offer, every step at once, a build-from-source route or a claimed install | 1. Check the kernel tool check.<br>2. Check the Knowledge upload.<br>3. Check the Setup reference. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | The tool check, the setup offer and ESCALATE 2 |
| [`setup.md`](../../references/setup.md) | The guided setup and its first steps |

---

## 5. SOURCE METADATA

- Group: Project route order
- Runtime: project
- Playbook ID: PRO-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-route-order/setup-offer-without-tools.md`
