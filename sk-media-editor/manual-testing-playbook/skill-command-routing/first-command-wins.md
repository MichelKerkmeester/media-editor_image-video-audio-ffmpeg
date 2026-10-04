---
title: "SCR-003 -- First command wins"
description: "Validates that the skill runtime binds the mode of the first command in the request, so $aud ahead of $video yields Audio Mode and one mp3 export."
version: 1.0.0.0
---

# SCR-003 -- First command wins

This scenario validates the router rule that the first command in the text decides the mode when a request carries two.

---

## 1. OVERVIEW

A request can carry more than one `$token`. The router reads the commands in the order they appear and binds the first one it knows, wherever that mode sits in the router table. `$aud` comes first in this prompt, so the request is Audio Mode even though `$video` follows it.

### Why this matters

Before this rule the earlier row in the router table won, so `$video` beat `$aud` and the user got a video operation they did not ask for. The rule makes the user's own ordering decide.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the first command in the request decides the mode when two commands appear
- Real user request: `Can you pull the sound out of this clip as an mp3? It is a video file.`
- Prompt: `$aud strip the track from this $video and save it as an mp3.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one short video with an audio track, start a fresh skill session, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the bound mode, the export and the absence of any video output
- Expected signals: The reply names Audio Mode. Turn 1 proposes a readable name and writes nothing. Turn 2 extracts the audio with `-vn` to an mp3 through the ffmpeg route, and the reply names the path `media files/export/[readable-name].mp3`, one readable mp3 in the export root with no numbered folder, and no video file is written
- Desired user-visible outcome: One Audio Mode name proposal, then one mp3 export
- Pass/fail: PASS if Audio Mode bound, the name was proposed before any write and the named path holds one mp3 with an audio stream and no video stream. FAIL if Video Mode bound, a video file was written, a file was written before the name was confirmed or the mp3 is missing

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$aud strip the track from this $video and save it as an mp3.` | Bind Audio Mode, check ffmpeg, propose a readable name for the mp3 and wait. | Mode is Audio, never Video. No file written yet. | Reply transcript and export listing. |
| 2 | `Yes, use that name.` | Extract the audio track to mp3 into `media files/export/` under the confirmed name, then reply with the written path first. | One mp3 file, no edited video. | Reply transcript, export listing and `ffprobe` of the mp3. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$aud strip the track from this $video and save it as an mp3.`

### Commands

1. `sandbox: seed demo-clip.mp4 with an audio track in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: record the bound mode and confirm an unchanged export folder`
3. `user: submit Turn 2 exactly -> filesystem: run ffprobe on the named mp3 and list the export folder`

### Expected

Step 1 fixes the fixture and the baseline. Step 2 binds Audio Mode, proposes a name and stops. Step 3 extracts the track and proves the mp3 exists with one audio stream and that no video output was written.

### Evidence

Capture both replies, the bound mode, the per-turn side-effect ledger, the export folder listing and the `ffprobe` output of the mp3.

### Pass / fail

- **Pass**: Audio Mode bound, the name was proposed before any write and the named path holds one mp3 with an audio stream and no video stream
- **Fail**: Video Mode bound, a video file was written, both modes were mixed, a file was written before the name was confirmed or the mp3 is missing

### Failure triage

1. Check the first-command rule in `references/router-contract.md` and the command table in `SKILL.md`.
2. Run the router fixtures in `benchmark/router/` and confirm the two-command case binds AUDIO.
3. Check the ledger for a video write and the reply for a second mode.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SCR-003 | First command wins | Verify the first command in the request decides the mode when two commands appear | `$aud strip the track from this $video and save it as an mp3.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh and confirm the proposal and the wait -> 3. Submit Turn 2 and read back the mp3 | Step 1: fixture ready. Step 2: Audio Mode and a name proposal. Step 3: one mp3, no video output | Both replies, bound mode, export listing, `ffprobe` output | PASS if Audio Mode bound after a name proposal and one mp3 reads back. FAIL on Video Mode, a video write, an early write or a missing mp3 | 1. Check the first-command rule.<br>2. Run the router fixtures.<br>3. Check the ledger and the reply. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`router-contract.md`](../../references/router-contract.md) | The first command in the text wins |
| [`SKILL.md`](../../SKILL.md) | The command table and Audio Mode |
| [`video-and-audio-operations.md`](../../references/video-and-audio-operations.md) | Audio extraction recipes |

---

## 5. SOURCE METADATA

- Group: Skill command routing
- Runtime: skill
- Playbook ID: SCR-003
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-command-routing/first-command-wins.md`
