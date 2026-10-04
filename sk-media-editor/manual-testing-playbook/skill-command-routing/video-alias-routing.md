---
title: "SCR-004 -- Video alias routing"
description: "Validates that the short alias $vid routes to Video Mode and yields one MP4 conversion of a MOV source."
version: 1.0.0.0
---

# SCR-004 -- Video alias routing

This scenario validates that a short command alias routes exactly like its full command.

---

## 1. OVERVIEW

Every mode has a full command and a short alias: `$video` and `$vid`, `$image` and `$img`, `$audio` and `$aud`, `$repair` and `$r`, `$interactive` and `$int`. This scenario submits `$vid` with a MOV to MP4 conversion and checks it lands in Video Mode with the H.264 default, after a readable name is proposed and confirmed.

### Why this matters

An alias that misses the command table falls through to keyword scoring, which can pick another mode or none. The aliases are the fastest way users type a mode, so each one has to bind.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the `$vid` alias routes to Video Mode and converts a MOV to MP4
- Real user request: `Can you turn this MOV into an MP4 that plays on the website?`
- Prompt: `$vid Convert this MOV to an MP4 for the website.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one short MOV, start a fresh skill session, submit Turn 1 and confirm the name proposal with nothing written, submit Turn 2, then confirm the bound mode, the codec and the export
- Expected signals: The reply names Video Mode. Turn 1 proposes a readable name and writes nothing. Turn 2 encodes H.264 video and AAC audio into an MP4 through the ffmpeg route, and the reply names the path `media files/export/[readable-name].mp4`, one readable MP4 in the export root with no numbered folder
- Desired user-visible outcome: One Video Mode name proposal, then one H.264 MP4 export
- Pass/fail: PASS if Video Mode bound, the name was proposed before any write and the named path holds one MP4 that `ffprobe` reads as H.264. FAIL if another mode bound, the reply asks which mode was meant, a file was written before the name was confirmed or the MP4 is missing

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$vid Convert this MOV to an MP4 for the website.` | Bind Video Mode, check ffmpeg, propose a readable name for the MP4 and wait. | Mode is Video. No file written yet. | Reply transcript and export listing. |
| 2 | `Yes, use that name.` | Convert to H.264 MP4 into `media files/export/` under the confirmed name, then reply with the written path first. | One MP4 file in the export root, no folder. | Reply transcript, export listing and `ffprobe` of the MP4. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$vid Convert this MOV to an MP4 for the website.`

### Commands

1. `sandbox: seed promo.mov in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: record the bound mode and confirm an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: record the encode -> filesystem: run ffprobe on the named MP4`

### Expected

Step 1 fixes the fixture and the baseline. Step 2 binds Video Mode, proposes a name and stops. Step 3 converts the file and proves the MP4 exists under the confirmed name and carries an H.264 video stream.

### Evidence

Capture both replies, the bound mode, the per-turn side-effect ledger, the export folder listing and the `ffprobe` output of the MP4.

### Pass / fail

- **Pass**: Video Mode bound, the name was proposed before any write and the named path holds one H.264 MP4
- **Fail**: Another mode bound, the reply asked which mode was meant, a file was written before the name was confirmed, or the MP4 is missing or not H.264

### Failure triage

1. Check that `$vid` is in the Video row of the command table in `SKILL.md` and `references/router-contract.md`.
2. Run the router fixtures in `benchmark/router/` for the alias.
3. Check the encode settings against the Video Mode defaults.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SCR-004 | Video alias routing | Verify the `$vid` alias routes to Video Mode and converts a MOV to MP4 | `$vid Convert this MOV to an MP4 for the website.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh and confirm the proposal and the wait -> 3. Submit Turn 2 and read back the MP4 | Step 1: fixture ready. Step 2: Video Mode and a name proposal. Step 3: one H.264 MP4 | Both replies, bound mode, export listing, `ffprobe` output | PASS if Video Mode bound after a name proposal and one H.264 MP4 reads back. FAIL on another mode, an early write or a missing MP4 | 1. Check the alias in the command table.<br>2. Run the router fixtures.<br>3. Check the encode settings. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The command table, the aliases and Video Mode |
| [`router-contract.md`](../../references/router-contract.md) | `$video` and `$vid` in the command table |
| [`video-and-audio-operations.md`](../../references/video-and-audio-operations.md) | Conversion recipes and codec defaults |

---

## 5. SOURCE METADATA

- Group: Skill command routing
- Runtime: skill
- Playbook ID: SCR-004
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-command-routing/video-alias-routing.md`
