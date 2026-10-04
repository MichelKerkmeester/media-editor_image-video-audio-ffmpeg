---
title: "SED-002 -- Readable name proposal"
description: "Validates that the runtime looks at what an imported image shows, proposes a readable name, waits for the answer and writes one file into the export root under the name the user chooses."
version: 1.0.0.0
---

# SED-002 -- Readable name proposal

This scenario validates the file naming rule on the tool route end to end.

---

## 1. OVERVIEW

An imported screenshot carries a name that says nothing. With the Media Editor tools connected, the runtime must look at the picture with `image_probe` and `preview: true`, propose a readable name of two to five lowercase hyphenated words and wait. When the user answers with a different name, `image_convert` must write one file into the export root under that name with no new folder, and the reply must lead with the path the tool returned.

### Why this matters

A generic name such as `CleanShot 2026-10-03 at 16.46.54` makes the export folder unreadable within a week. The runtime has to name from the content, ask before it writes and never override the name the user gives. A subfolder around one file only hides the result.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the runtime proposes a readable name from the image, waits and writes one file under the name the user chooses
- Real user request: `Can you turn this screenshot into a WebP for the website?`
- Prompt: `Convert this screenshot to WebP for the website.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy, and the Media Editor tools are connected through the Claude Code plugin
- Expected execution process: Seed one generically named screenshot of a team on a beach, start Claude Code in the disposable copy with the Media Editor plugin loaded, submit Turn 1 and confirm the proposal with nothing written, submit Turn 2, then confirm the tool call, the file name and the export folder
- Expected signals: Turn 1 calls `media_health`, then `image_probe` with `preview: true`, proposes a readable name such as `team-beach-offsite.webp` and waits, with no `image_convert` call and no file written. Turn 2 calls `image_convert` with `fileName` `team-offsite-hero`, which writes one file `media files/export/team-offsite-hero.webp` into the export root with no new folder, and the reply leads with that path
- Desired user-visible outcome: One name proposal from the picture, then one WebP at `media files/export/team-offsite-hero.webp` under the name the user chose
- Pass/fail: PASS if the proposal is readable and nothing is written before the answer, and the one file lands in the export root under the user's name with no new folder. FAIL if a file is written before the answer, the proposed name is generic, a subfolder is created or the user's name is not used

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Convert this screenshot to WebP for the website.` | Call `media_health`, then `image_probe` with `preview: true`, propose a readable name such as `team-beach-offsite.webp` and wait. | No `image_convert` call and no file written. | Reply, tool call transcript and export listing before and after. |
| 2 | `Call it team-offsite-hero instead.` | Call `image_convert` with `fileName` `team-offsite-hero` and reply with the path the tool returned first. | One file `media files/export/team-offsite-hero.webp` in the export root and no new folder. | Reply, tool call transcript, export listing and `ffprobe` of the WebP. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Convert this screenshot to WebP for the website.`

### Commands

1. `sandbox: seed "CleanShot 2026-10-03 at 16.46.54.png" in media files/import/, record the export baseline, then start claude --plugin-dir "<path to>/mcp server/claude-plugin" in the disposable copy and confirm mcp list shows media-editor as Connected`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the probe preview, the proposed name and an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm the image_convert call and its fileName value -> filesystem: list the export folder and run ffprobe on the WebP`

### Expected

Step 1 fixes the fixture, the baseline and the connected tools. Step 2 proves the preview, a readable proposal and the wait. Step 3 proves the user's name was applied, one file sits in the export root and no folder was created.

### Evidence

Capture both replies, the tool call transcript with the `fileName` value, the per-turn side-effect ledger, the export listing before and after and the `ffprobe` output of the WebP.

### Pass / fail

- **Pass**: The proposal is readable and came from the picture, nothing was written before the answer and `media files/export/team-offsite-hero.webp` is the only new entry in the export root
- **Fail**: A file was written before the answer, the proposed name is generic, a subfolder was created or the file does not carry the name the user gave

### Failure triage

1. Check the file naming and export protocol sections in `SKILL.md`.
2. Check the transcript for an `image_convert` call before Turn 2 and for the `fileName` value it carried.
3. Check the export listing for a new folder or a changed name.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SED-002 | Readable name proposal | Verify the runtime proposes a readable name from the image, waits and writes one file under the name the user chooses | `Convert this screenshot to WebP for the website.` | 1. Seed fixture, baseline and plugin -> 2. Submit Turn 1 and confirm the proposal and the wait -> 3. Submit Turn 2 and read back the export root | Step 1: tools connected. Step 2: preview, a readable proposal and no write. Step 3: one WebP named `team-offsite-hero` in the export root | Both replies, tool call transcript, per-turn side-effect ledger, export listing, `ffprobe` output | PASS if the proposal waited and the file landed under the user's name with no folder. FAIL on an early write, a generic name, a subfolder or an ignored name | 1. Check the naming rule.<br>2. Check the transcript.<br>3. Check the export listing. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | File naming, export protocol and ALWAYS 6 and 8 |
| [`AGENTS.md`](../../../AGENTS.md) | The strict sequence and the file naming rule |
| [`tools.md`](../../references/tools.md) | `image_probe`, `fileName` and the rules every tool follows |

---

## 5. SOURCE METADATA

- Group: Skill export delivery
- Runtime: skill
- Playbook ID: SED-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-export-delivery/readable-name-proposal.md`
