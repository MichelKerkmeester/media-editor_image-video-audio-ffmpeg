---
title: "SED-001 -- Export-first path response"
description: "Validates the blocking export protocol: the result is saved to media files/export/[###] - [description]/ and verified before a path-led two to three sentence reply."
version: 1.0.0.0
---

# SED-001 -- Export-first path response

This scenario validates the deliverable export protocol end to end.

---

## 1. OVERVIEW

The runtime must save the trimmed video to `media files/export/[###] - [description]/`, verify the save and only then reply with the path and a brief two to three sentence summary. No metadata dump, no asking whether to save.

### Why this matters

Export is the blocking gate between processing and response. A reply that names a path never written, buries it after logs or skips verification invalidates the whole delivery.

---

## 2. SCENARIO CONTRACT

- Objective: Verify save-before-response ordering, verified export and a path-led brief reply
- Real user request: `Trim the first ten seconds off this interview video.`
- Prompt: `Trim the first ten seconds off this interview video.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one interview video longer than ten seconds, start a fresh session, submit Turn 1, then confirm the export order, the verified save and the reply shape
- Expected signals: Video Mode bound from the `video` and `trim` keywords, `ffmpeg -version` checked first, the video and audio operations reference loaded, one `media files/export/[###] - [description]/` folder holding the trimmed clip from an ffmpeg `-ss` trim, and a reply leading with the path in two to three sentences with no log dump
- Desired user-visible outcome: One verified trimmed export plus a clean path-first reply
- Pass/fail: PASS if the export exists, reads back shorter than the source and the reply leads with the path briefly. FAIL if the reply precedes the save, the path is wrong or unreadable, or the reply dumps metadata

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Trim the first ten seconds off this interview video.` | Bind Video Mode, check ffmpeg, trim ten seconds, save to `media files/export/`, verify the save and reply path first. | Export written before the response. | Reply, export listing, duration readback and response order. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Trim the first ten seconds off this interview video.`

### Commands

1. `sandbox: seed interview-video.mp4 over thirty seconds and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `filesystem: read back the named export folder -> operator: grade ordering, verification and reply shape`

### Expected

Step 1 fixes the fixture and baseline. Step 2 runs the trim and the export protocol. Step 3 proves the folder exists, the clip is shorter than the source and the reply leads with the path.

### Evidence

Capture the full reply, the per-turn side-effect ledger, the ffmpeg check, the export folder listing, a duration readback of source and result, and the ordering of save versus response.

### Pass / fail

- **Pass**: The export folder exists with a readable trimmed clip and the reply leads with the path in two to three sentences
- **Fail**: The reply precedes or skips the save, the path is wrong or unreadable, or the reply shows a metadata dump or asks whether to save

### Failure triage

1. Check the export protocol sequence in `AGENTS.md` and `SKILL.md`.
2. Check the trim operation and duration against the fixture.
3. Reconcile the reply order and content with the saved folder.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SED-001 | Export-first path response | Verify verified save precedes a path-led brief reply | `Trim the first ten seconds off this interview video.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh -> 3. Read back export and grade ordering | Step 1: fixture ready. Step 2: trim plus verified save. Step 3: path-led reply and shorter clip | Reply, export listing, duration readback, ordering note | PASS if the verified export exists and the reply leads with its path briefly. FAIL on a missing save, a wrong path or a log dump | 1. Check the export sequence.<br>2. Check trim and duration.<br>3. Reconcile reply with folder. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
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
