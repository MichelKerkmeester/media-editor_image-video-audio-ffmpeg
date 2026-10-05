---
title: "SED-004 -- Batch naming gate"
description: "Validates that the runtime asks one question before converting four images through the image command, then puts all four in the one place the user chose under readable names."
version: 1.0.0.0
---

# SED-004 -- Batch naming gate

This scenario validates the naming and placement gate on the tool route when one clear `$image` request covers four files.

---

## 1. OVERVIEW

Four imported PNGs carry names that say nothing. The `$image` request is clear: convert them to WebP, each under 100 KB. The runtime must still ask one question before the first writing call, with a proposed readable name for each file and the choice between one numbered folder and the export root, and write nothing. After the answer, every file of the batch must land in that one place, even though each file takes its own `media-editor image_convert` call.

### Why this matters

A batch written by separate calls is where placement splits: a model that passes `subfolder: true` on the first call only leaves one file in a numbered folder and the rest in the export root. A clear command is the case most likely to skip the question. The Project counterpart is `PED-001`, which replays the live request without a command.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the runtime asks one naming and placement question before a four-file `$image` batch, then writes all four files into the place the user chose under readable names
- Real user request: `Can you turn these four screenshots into WebPs under 100 KB?`
- Prompt: `$image Convert the four PNGs in media files/import to WebP, each under 100 KB.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy, and the Claude Code plugin is loaded with `media-editor health` answering in the Bash tool
- Expected execution process: Seed four generically named PNGs, start Claude Code in the disposable copy with the Media Editor plugin loaded, submit Turn 1 and confirm one question with nothing written, submit Turn 2, then confirm the `media-editor image_convert` calls, the folder and the four files on disk
- Expected signals: Turn 1 may run `media-editor health` and `media-editor image_probe` with `preview: true`, opening the JPEG at `previewPath` with the Read tool, then asks one question that lists a readable name for each of the four files and offers one numbered folder or the export root, and waits, with no `media-editor image_convert` call and no file written. Turn 2 makes four `media-editor image_convert` calls with `format` `webp`, `maxBytes` `100000` and every `inputPath` absolute, each with its own confirmed `fileName`. The first passes `subfolder: true` with an `outputName` for the batch, and the other three set `targetFolder` to the folder name the first call returned. The reply leads with the one folder the tool returned
- Desired user-visible outcome: One question, then four readable WebP files, each at most 100,000 bytes, in one `media files/export/NNN - [description]/` folder, with nothing new in the export root
- Pass/fail: PASS if Turn 1 asked one question carrying every name and the placement choice and wrote nothing, and Turn 2 put all four files in the chosen folder under the confirmed names, each at most 100,000 bytes. FAIL if a file was written before the answer, the question was skipped or split into several, any file landed outside the chosen place, a second numbered folder appeared, or a file kept a generic name

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$image Convert the four PNGs in media files/import to WebP, each under 100 KB.` | Ask one question with a readable name for each file and the choice of one numbered folder or the export root, then wait. | No `media-editor image_convert` call and no file written. A naming preview outside `media files/` is a look, not a write. | Reply, Bash transcript and export listing before and after. |
| 2 | `One folder, and those names are fine.` | Make four `media-editor image_convert` calls with `maxBytes` `100000` and every `inputPath` absolute: the first with `subfolder: true` and an `outputName` for the batch, the others with `targetFolder` set to the folder name the first call returned, each with its confirmed `fileName`. Reply with the folder path first. | Four WebP files in one new numbered folder, nothing new in the export root. | Reply, Bash transcript, export listing and the byte size of each file. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$image Convert the four PNGs in media files/import to WebP, each under 100 KB.`

### Commands

1. `sandbox: seed four PNGs named "CleanShot 2026-10-03 at 16.46.5<n>.png" with distinct content in media files/import/, record the export baseline, then start claude --plugin-dir "<path to>/runtime/claude-plugin" in the disposable copy and confirm media-editor health answers in the Bash tool`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm one question with four names and the placement choice, and an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm the four media-editor image_convert calls and their subfolder, targetFolder, fileName, maxBytes and inputPath values -> filesystem: list the export folder and read the byte size of each WebP`

### Expected

Step 1 fixes the fixtures, the baseline and the loaded plugin with the command answering. Step 2 proves one question and no write on a clear command. Step 3 proves the batch shares one folder across separate calls, under the confirmed names and within the size cap.

### Evidence

Capture both replies, the Bash transcript with every JSON argument, the per-turn side-effect ledger, the export listing before and after and the byte size of each WebP.

### Pass / fail

- **Pass**: One question with every name and the placement choice, nothing written before the answer, and four WebP files of at most 100,000 bytes in one numbered folder under the confirmed names
- **Fail**: A write before the answer, no question or more than one, a file outside the chosen folder, a second numbered folder, or a generic file name

### Failure triage

1. Check ALWAYS 8, ESCALATE 1, the file naming and the export protocol in `SKILL.md`, and the batch question in `interactive-intelligence.md`.
2. Check the transcript for a writing call before Turn 2 and for a later call that omitted `targetFolder`.
3. Check the export listing for files in the export root or in a second folder.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SED-004 | Batch naming gate | Verify the runtime asks one naming and placement question before a four-file `$image` batch, then writes all four into the chosen place | `$image Convert the four PNGs in media files/import to WebP, each under 100 KB.` | 1. Seed four PNGs, baseline and plugin -> 2. Submit Turn 1 and confirm one question and no write -> 3. Submit Turn 2 and read back the export folder | Step 1: `media-editor health` answers in the Bash tool. Step 2: one question with four names and the placement choice, no write. Step 3: four `media-editor image_convert` calls sharing one folder through `targetFolder` | Both replies, Bash transcript, per-turn side-effect ledger, export listing, byte sizes | PASS if one question preceded every write and all four files share the chosen folder under readable names within 100,000 bytes. FAIL on an early write, a missing or split question, a split batch or a generic name | 1. Check the naming gate.<br>2. Check the transcript.<br>3. Check the export listing. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: skill naming and placement gate](../../feature-catalog/skill-behavior/skill-naming-and-placement-gate.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | File naming, export protocol, ALWAYS 8 and ESCALATE 1 |
| [`AGENTS.md`](../../../AGENTS.md) | The strict sequence and the file naming rule |
| [`interactive-intelligence.md`](../../references/interactive-intelligence.md) | The batch question and the mode questions |
| [`tools.md`](../../references/tools.md) | `targetFolder`, `subfolder`, `fileName` and `maxBytes` |

---

## 5. SOURCE METADATA

- Group: Skill export delivery
- Runtime: skill
- Playbook ID: SED-004
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-export-delivery/batch-naming-gate.md`
