---
title: "STV-003 -- Error code hand-off"
description: "Validates that a tool call refused with PATH_NOT_ALLOWED is reported by its code and next step, never as a result, and that no file is written."
version: 1.0.0.0
---

# STV-003 -- Error code hand-off

This scenario validates how the runtime reports a tool that returns an error code.

---

## 1. OVERVIEW

The tools only read and write inside the folders the user allowed. A file outside them is refused with `PATH_NOT_ALLOWED`. The runtime must name the code, give the next step from the tools reference, which is to start the session in the folder that holds the media or add that folder to the allowed folders, and never present the call as a run.

### Why this matters

A failed call reported as a result tells the user a file exists that does not. Naming the code and the next step lets the user fix the setup in one move.

---

## 2. SCENARIO CONTRACT

- Objective: Verify a `PATH_NOT_ALLOWED` refusal is reported by its code and next step with no claimed result
- Real user request: `Can you shrink the logo that is sitting in my downloads folder?`
- Prompt: `$image Resize the logo at /tmp/outside/logo.png to 400 pixels wide.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Load the Claude Code plugin with the allowed folders limited to the disposable copy, place one logo outside them, submit Turn 1, then confirm the refusal and the reply
- Expected signals: The first tool call that touches the logo, `image_probe` for the name preview or `image_resize`, returns `PATH_NOT_ALLOWED`. The refusal arrives before any name is proposed. The reply names that code, asks the user to start the session in the folder that holds the logo or to add it to the allowed folders, states that nothing ran, and names no output folder
- Desired user-visible outcome: One plain report of the refusal with the next step, and no file
- Pass/fail: PASS if the reply names `PATH_NOT_ALLOWED` and its next step and claims no output. FAIL if the reply presents a result, names an output folder or quietly copies the file into an allowed folder

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Resize the logo at /tmp/outside/logo.png to 400 pixels wide.` | Call the first tool that touches the logo, `image_probe` with `preview: true` or `image_resize`, receive `PATH_NOT_ALLOWED`, then name the code and the next step and say that nothing was written. | No file written anywhere. | Reply transcript, tool call transcript and the per-turn side-effect ledger. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Resize the logo at /tmp/outside/logo.png to 400 pixels wide.`

### Commands

1. `sandbox: start claude --plugin-dir "<path to>/mcp server/claude-plugin" in the disposable copy, place logo.png in /tmp/outside/ and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm the error code in the tool transcript -> filesystem: compare the export folder with the baseline`

### Expected

Step 1 fixes a file outside the allowed folders. Step 2 produces the refusal and the report. Step 3 proves nothing was written.

### Evidence

Capture the full reply, the tool call transcript with the returned code, the per-turn side-effect ledger and the export folder listing before and after.

### Pass / fail

- **Pass**: The reply names `PATH_NOT_ALLOWED` and the next step, claims no result and the export folder matches the baseline
- **Fail**: The reply presents a result, names an output folder, or the file was copied or written anywhere

### Failure triage

1. Check the `CONFIG_MISSING` and `PATH_NOT_ALLOWED` rule in the tool check section of `SKILL.md`.
2. Check the error code table in `references/tools.md` Section 7.
3. Check the ledger for a copy of the logo into an allowed folder.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| STV-003 | Error code hand-off | Verify a `PATH_NOT_ALLOWED` refusal is reported by its code and next step with no claimed result | `$image Resize the logo at /tmp/outside/logo.png to 400 pixels wide.` | 1. Limit the allowed folders and place the logo outside -> 2. Submit Turn 1 fresh -> 3. Confirm the code and compare the export folder | Step 1: logo outside the allowed folders. Step 2: `PATH_NOT_ALLOWED` and its next step. Step 3: no write | Reply, tool call transcript, side-effect ledger, export listing before and after | PASS if the code and next step are named and nothing is written. FAIL on a claimed result or any write | 1. Check the folder rule in `SKILL.md`.<br>2. Check the error code table.<br>3. Check the ledger. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The folder rule for `CONFIG_MISSING` and `PATH_NOT_ALLOWED` |
| [`tools.md`](../../references/tools.md) | The error code table and what to do |

---

## 5. SOURCE METADATA

- Group: Skill tool verification
- Runtime: skill
- Playbook ID: STV-003
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-tool-verification/error-code-handoff.md`
