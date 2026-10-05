---
title: "PED-001 -- Batch naming gate in Claude Desktop"
description: "Validates that a Claude Desktop Project with the Media Editor extension asks one question before converting four images, then puts all four in the one place the user chose under readable names."
version: 1.0.0.0
---

# PED-001 -- Batch naming gate in Claude Desktop

This scenario validates the naming and placement gate inside a Project when one clear request covers four files.

---

## 1. OVERVIEW

Four imported PNGs carry names that say nothing. The request is clear: convert them to WebP, each under 100 KB. The Project must still ask one question before the first writing call, with a proposed readable name for each file and the choice between one numbered folder and the export root, and write nothing. After the answer, every file of the batch must land in that one place, even though each file takes its own `image_convert` call.

### Why this matters

In the live failure this scenario replays, a Project asked nothing, passed `subfolder: true` on the first call only and split the batch: one file in `001 - webp-under-100kb/` and three in the export root as `CleanShot ...-converted.webp`. A clear request is the case that skipped the question, and a batch written by separate calls is the case that split the folder.

---

## 2. SCENARIO CONTRACT

- Objective: Verify a Claude Desktop Project asks one naming and placement question before a four-file batch, then writes all four files into the place the user chose under readable names
- Real user request: `Can you turn these four screenshots into WebPs under 100 KB?`
- Prompt: `Convert the four PNGs in media files/import to WebP, each under 100 KB: CleanShot 2026-10-03 at 16.46.50.png, CleanShot 2026-10-03 at 16.46.51.png, CleanShot 2026-10-03 at 16.46.52.png and CleanShot 2026-10-03 at 16.46.53.png.`
- Precondition: `PID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed four generically named PNGs, install the Media Editor extension in Claude Desktop with the fixture folder allowed, open the Project carrying the Custom Instructions kernel and knowledge documents, submit Turn 1 and confirm one question with nothing written, submit Turn 2, then confirm the tool calls, the folder and the four files on disk
- Expected signals: Turn 1 may call `media_health` and `image_probe` with `preview: true`, then asks one question that lists a readable name for each of the four files and offers one numbered folder or the export root, and waits, with no `image_convert` call and no file written. Turn 2 makes four `image_convert` calls with `format` `webp` and `maxBytes` `100000`, each with its own confirmed `fileName`. The first passes `subfolder: true` with an `outputName` for the batch, and the other three pass the returned folder name as `targetFolder`. The reply names the one folder the tool returned
- Desired user-visible outcome: One question, then four readable WebP files, each at most 100,000 bytes, in one `media files/export/NNN - [description]/` folder, with nothing new in the export root
- Pass/fail: PASS if Turn 1 asked one question carrying every name and the placement choice and wrote nothing, and Turn 2 put all four files in the chosen folder under the confirmed names, each at most 100,000 bytes. FAIL if a file was written before the answer, the question was skipped or split into several, any file landed outside the chosen place, a second numbered folder appeared, or a file kept a generic name. SKIP only when Claude Desktop with the extension is unavailable to the operator

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Convert the four PNGs in media files/import to WebP, each under 100 KB: CleanShot 2026-10-03 at 16.46.50.png, CleanShot 2026-10-03 at 16.46.51.png, CleanShot 2026-10-03 at 16.46.52.png and CleanShot 2026-10-03 at 16.46.53.png.` | Ask one question with a readable name for each file and the choice of one numbered folder or the export root, then wait. Claim no result. | No `image_convert` call and no file written. | Reply, tool call transcript and export listing before and after. |
| 2 | `One folder, and those names are fine.` | Make four `image_convert` calls with `maxBytes` `100000`: the first with `subfolder: true`, the others with `targetFolder` set to the folder it returned, each with its confirmed `fileName`. Reply with the folder path first. | Four WebP files in one new numbered folder, nothing new in the export root. | Reply, tool call transcript, export listing and the byte size of each file. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Convert the four PNGs in media files/import to WebP, each under 100 KB: CleanShot 2026-10-03 at 16.46.50.png, CleanShot 2026-10-03 at 16.46.51.png, CleanShot 2026-10-03 at 16.46.52.png and CleanShot 2026-10-03 at 16.46.53.png.`

### Commands

1. `sandbox: seed four PNGs named "CleanShot 2026-10-03 at 16.46.5<n>.png" with distinct content in media files/import/, install media-editor-<platform>.mcpb in Claude Desktop, allow the folder and record the export baseline`
2. `session: open the Media Editor Project in Claude Desktop, start fresh -> user: submit Turn 1 exactly -> operator: confirm one question with four names and the placement choice, and an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm the four image_convert calls and their subfolder, targetFolder, fileName and maxBytes values -> filesystem: list the export folder and read the byte size of each WebP`

### Expected

Step 1 fixes the fixtures, the extension and the baseline. Step 2 proves one question and no write on a clear request. Step 3 proves the batch shares one folder across separate calls, under the confirmed names and within the size cap.

### Evidence

Capture both replies, the tool call transcript with every placement value, the per-turn side-effect ledger, the export listing before and after and the byte size of each WebP.

### Pass / fail

- **Pass**: One question with every name and the placement choice, nothing written before the answer, and four WebP files of at most 100,000 bytes in one numbered folder under the confirmed names
- **Fail**: A write before the answer, no question or more than one, a file outside the chosen folder, a second numbered folder, or a generic file name

### Failure triage

1. Check ALWAYS 9, ESCALATE 1, the export protocol and the strict sequence in `Custom Instructions.md`.
2. Check the transcript for a writing call before Turn 2 and for a later call that omitted `targetFolder`.
3. Check the export listing for files in the export root or in a second folder.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| PED-001 | Batch naming gate in Claude Desktop | Verify a Project asks one naming and placement question before a four-file batch, then writes all four into the chosen place | `Convert the four PNGs in media files/import to WebP, each under 100 KB: CleanShot 2026-10-03 at 16.46.50.png, CleanShot 2026-10-03 at 16.46.51.png, CleanShot 2026-10-03 at 16.46.52.png and CleanShot 2026-10-03 at 16.46.53.png.` | 1. Seed four PNGs, install the extension and record the baseline -> 2. Submit Turn 1 fresh and confirm one question and no write -> 3. Submit Turn 2 and read back the export folder | Step 1: tools connected. Step 2: one question with four names and the placement choice, no write. Step 3: four `image_convert` calls sharing one folder through `targetFolder` | Both replies, tool call transcript, per-turn side-effect ledger, export listing, byte sizes | PASS if one question preceded every write and all four files share the chosen folder under readable names within 100,000 bytes. FAIL on an early write, a missing or split question, a split batch or a generic name | 1. Check the kernel gate.<br>2. Check the transcript.<br>3. Check the export listing. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: project naming and placement gate](../../feature-catalog/project-behavior/project-naming-and-placement-gate.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`Custom Instructions.md`](../../../claude%20project/Custom%20Instructions.md) | File naming, the export protocol, ALWAYS 9, ESCALATE 1 and the strict sequence |
| [`tools.md`](../../references/tools.md) | `targetFolder`, `subfolder`, `fileName` and `maxBytes` |

---

## 5. SOURCE METADATA

- Group: Project export delivery
- Runtime: project
- Playbook ID: PED-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `project-export-delivery/batch-naming-gate.md`
