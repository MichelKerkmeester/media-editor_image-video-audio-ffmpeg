---
title: "SCR-002 -- Command overrides keywords"
description: "Validates that an explicit $audio command wins over the video keywords in the same request and binds Audio Mode to installed ffmpeg."
version: 1.0.0.0
---

# SCR-002 -- Command overrides keywords

This scenario validates that `$audio` selects Audio Mode even when the surrounding words point at video.

---

## 1. OVERVIEW

The routing contract states an explicit command selects the mode outright and overrides every natural-language signal. A request to pull `$audio` from a video file must bind Audio Mode to installed ffmpeg, never Video Mode. The runtime proposes a readable name for the mp3 before it writes anything.

### Why this matters

Mixed-signal requests are the common real-world case. If keyword scoring can override the explicit command, the user loses control of the mode and the wrong resource lane loads.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$audio` binds Audio Mode to installed ffmpeg despite the video context in the same sentence
- Real user request: `Can you pull just the audio out of this product demo video as an mp3 for the podcast feed?`
- Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one short demo video, start a fresh session, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the bound mode, the tool and the exported audio
- Expected signals: Audio Mode selected from the `$audio` token, `ffmpeg -version` checked first, the video and audio operations reference loaded. Turn 1 proposes a readable name and writes nothing. Turn 2 saves one mp3 as `media files/export/[readable-name].mp3` by an ffmpeg `-vn` audio extraction, with no numbered folder and no video edit attempted
- Desired user-visible outcome: One name proposal, then one mp3 export plus a path-led brief reply naming Audio Mode
- Pass/fail: PASS if Audio Mode ran, the name was proposed before any write and one readable mp3 landed in `media files/export/` under the confirmed name. FAIL if Video Mode ran, a video artifact was produced, the ffmpeg check was skipped or a file was written before the name was confirmed

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `I need $audio from this product demo video as an mp3 for the podcast feed.` | Bind Audio Mode from the `$audio` token, check ffmpeg, propose a readable name for the mp3 and wait. | Mode is Audio, never Video. No file written yet. A naming preview outside `media files/` is a look, not a write. | Reply, mode label and export listing. |
| 2 | `Yes, use that name.` | Extract the audio as mp3, save to `media files/export/` under the confirmed name and reply path first. | One mp3 in the export root under the confirmed name. | Reply, export listing and mp3 readback. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.`

### Commands

1. `sandbox: seed demo-video.mp4 in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm the name proposal and an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm Audio Mode and the ffmpeg check -> filesystem: read back the mp3 export`

### Expected

Step 1 fixes the fixture and baseline. Step 2 binds Audio Mode through the command token, proposes a name and stops. Step 3 extracts the audio and proves one mp3 export exists under the confirmed name and no video artifact was created.

### Evidence

Capture both replies, the observed mode and tool check, the per-turn side-effect ledger, the export folder listing and the mp3 readback.

### Pass / fail

- **Pass**: `$audio` proposed a name, waited and then produced one readable mp3 under that name through the checked ffmpeg lane
- **Fail**: Video Mode ran, both modes loaded, a file was written before the name was confirmed, no mp3 exists or the reply claims a tool other than the one that ran

### Failure triage

1. Check the phase detection order in `SKILL.md`, where command tokens are matched before keyword scoring.
2. Check the ffmpeg check with `ffmpeg -version` and the loaded video and audio operations reference.
3. Reconcile the produced artifact type with the requested mp3.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SCR-002 | Command overrides keywords | Verify `$audio` wins over video keywords and binds Audio Mode | `I need $audio from this product demo video as an mp3 for the podcast feed.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh and confirm the proposal and the wait -> 3. Submit Turn 2 and read back mp3 | Step 1: fixture ready. Step 2: Audio Mode and a name proposal. Step 3: one mp3 export under the confirmed name | Both replies, mode label, export listing, mp3 readback | PASS if Audio Mode ran on checked ffmpeg after a name proposal and one readable mp3 landed. FAIL on Video Mode, a video artifact, an early write or a skipped check | 1. Check token-first detection order.<br>2. Check the ffmpeg check and audio reference.<br>3. Reconcile artifact type with the request. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: command routing and aliases](../../feature-catalog/skill-behavior/command-routing-and-aliases.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | Command-wins routing rule and phase detection |
| [`AGENTS.md`](../../../AGENTS.md) | Command registry and processing hierarchy |
| [`video-and-audio-operations.md`](../../references/video-and-audio-operations.md) | Audio extraction recipes, codec guidance and the build checks |

---

## 5. SOURCE METADATA

- Group: Skill command routing
- Runtime: skill
- Playbook ID: SCR-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-command-routing/command-overrides-keywords.md`
