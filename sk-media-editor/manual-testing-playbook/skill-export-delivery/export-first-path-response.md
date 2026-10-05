---
title: "SED-001 -- Export-first path response"
description: "Validates the blocking export protocol: the result is saved straight into media files/export/ under a confirmed readable name and verified before a path-led two to three sentence reply."
version: 1.0.0.0
---

# SED-001 -- Export-first path response

This scenario validates the deliverable export protocol end to end.

---

## 1. OVERVIEW

The runtime must propose a readable name for the trimmed video and wait for the answer. It must then save the trimmed video straight into `media files/export/` under the confirmed name, verify the save and only then reply with the path and a brief two to three sentence summary. No metadata dump, no asking whether to save.

### Why this matters

Export is the blocking gate between processing and response. A reply that names a path never written, buries it after logs or skips verification invalidates the whole delivery.

---

## 2. SCENARIO CONTRACT

- Objective: Verify save-before-response ordering, verified export and a path-led brief reply
- Real user request: `Trim the first ten seconds off this interview video.`
- Prompt: `Trim the first ten seconds off this interview video.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one interview video longer than ten seconds, start a fresh session, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the export order, the verified save and the reply shape
- Expected signals: Video Mode bound from the `video` and `trim` keywords, `ffmpeg -version` checked first, the video and audio operations reference loaded. Turn 1 proposes a readable name of two to five lowercase hyphenated words, asks no folder question for the single file and writes nothing. Turn 2 saves one trimmed clip from an ffmpeg `-ss` trim as `media files/export/[readable-name].mp4` with no `[###] - ` folder, and the reply leads with the path in two to three sentences with no log dump
- Desired user-visible outcome: One name proposal, then one verified trimmed export plus a clean path-first reply
- Pass/fail: PASS if the name was proposed before any write, the export exists in the export root under the confirmed name, reads back shorter than the source and the reply leads with the path briefly. FAIL if a file is written before the name is confirmed, the reply precedes the save, the path is wrong or unreadable, a numbered folder holds the single file or the reply dumps metadata

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Trim the first ten seconds off this interview video.` | Bind Video Mode, check ffmpeg, propose a readable name for the trimmed clip and wait. | No file written yet. A naming preview outside `media files/` is a look, not a write. | Reply, ffmpeg check and export listing before and after. |
| 2 | `Yes, use that name.` | Trim ten seconds, save to `media files/export/` under the confirmed name, verify the save and reply path first. | Export written before the response, one file in the export root. | Reply, export listing, duration readback and response order. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Trim the first ten seconds off this interview video.`

### Commands

1. `sandbox: seed interview-video.mp4 over thirty seconds and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the name proposal and an unchanged export folder`
3. `user: submit Turn 2 exactly -> filesystem: read back the named export file -> operator: grade ordering, verification and reply shape`

### Expected

Step 1 fixes the fixture and baseline. Step 2 checks ffmpeg, proposes a name and stops. Step 3 runs the trim and the export protocol and proves the file exists in the export root, the clip is shorter than the source and the reply leads with the path.

### Evidence

Capture both replies, the per-turn side-effect ledger, the ffmpeg check, the export folder listing, a duration readback of source and result, and the ordering of save versus response.

### Pass / fail

- **Pass**: The name was proposed before any write, the export file exists in the export root under the confirmed name with a readable trimmed clip and the reply leads with the path in two to three sentences
- **Fail**: A file was written before the name was confirmed, the reply precedes or skips the save, the path is wrong or unreadable, a numbered folder holds the single file, or the reply shows a metadata dump or asks whether to save

### Failure triage

1. Check the file naming and export protocol sections in `AGENTS.md` and `SKILL.md`.
2. Check the trim operation and duration against the fixture.
3. Reconcile the reply order and content with the saved file.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SED-001 | Export-first path response | Verify verified save precedes a path-led brief reply | `Trim the first ten seconds off this interview video.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 and confirm the proposal and the wait -> 3. Submit Turn 2 and read back export and ordering | Step 1: fixture ready. Step 2: name proposal and no write. Step 3: trim, verified save in the export root, path-led reply and shorter clip | Both replies, export listing, duration readback, ordering note | PASS if the name waited, the verified export exists under it and the reply leads with its path briefly. FAIL on an early write, a missing save, a wrong path, a folder around one file or a log dump | 1. Check the naming and export sequence.<br>2. Check trim and duration.<br>3. Reconcile reply with file. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: skill export delivery](../../feature-catalog/skill-behavior/skill-export-delivery.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`AGENTS.md`](../../../AGENTS.md) | Deliverable export protocol and prohibited response shapes |
| [`SKILL.md`](../../SKILL.md) | Export protocol, Video Mode and the ffmpeg check |
| [`video-and-audio-operations.md`](../../references/video-and-audio-operations.md) | Trim recipes, `-ss` handling and the build checks |

---

## 5. SOURCE METADATA

- Group: Skill export delivery
- Runtime: skill
- Playbook ID: SED-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-export-delivery/export-first-path-response.md`
