---
title: "SHL-001 -- FFmpeg-only HLS conversion"
description: "Validates that $hls falls back to installed ffmpeg alone when the Media Editor tools are not connected and produces a multi-quality HLS export with a master playlist."
version: 1.0.0.0
---

# SHL-001 -- FFmpeg-only HLS conversion

This scenario validates the HLS mode binding and the ffmpeg fallback path.

---

## 1. OVERVIEW

`$hls` routes to HLS Mode, which runs `video_hls_ladder` when the Media Editor tools are connected and installed ffmpeg when they are not. This scenario runs with the tools disconnected, so it tests the ffmpeg route. The runtime checks `ffmpeg -version`, converts the source into a multi-quality stream and exports segments plus a master playlist under `media files/export/`.

### Why this matters

HLS is the most structure-sensitive mode. If the runtime skips the ffmpeg check or returns an export without variant playlists and segments, the stream will not play or switch quality.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$hls` binds installed ffmpeg only and exports a working multi-quality stream
- Real user request: `Can you convert this keynote recording for adaptive streaming on the site?`
- Prompt: `$hls Convert this keynote recording for adaptive streaming on the site.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy, and the Media Editor tools are not connected in this session, neither the Claude Desktop extension nor the Claude Code plugin. With the tools connected, `$hls` correctly runs `video_hls_ladder` instead, and this scenario does not apply
- Expected execution process: Seed one keynote recording, start a fresh session, submit Turn 1, then confirm the ffmpeg-only path and the exported playlist structure
- Expected signals: HLS Mode selected from the `$hls` token, `ffmpeg -version` checked first, the HLS conversion asset loaded, an `media files/export/` folder holding variant playlists, segments and a master `m3u8`, no second tool consulted, and a path-led brief reply
- Desired user-visible outcome: One HLS export folder with a readable master playlist and at least two quality levels
- Pass/fail: PASS if ffmpeg ran alone and the export holds a master playlist plus variant segments. FAIL if the ffmpeg check was skipped, another tool was claimed or the playlist structure is missing. SKIP when ffmpeg itself is unavailable in the sandbox or the tools cannot be disconnected

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$hls Convert this keynote recording for adaptive streaming on the site.` | Bind HLS Mode, check `ffmpeg -version`, run the multi-quality conversion on installed ffmpeg, export and reply path first. | Tool is installed ffmpeg only. | Reply, ffmpeg check note, playlist and segment listing. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$hls Convert this keynote recording for adaptive streaming on the site.`

### Commands

1. `sandbox: seed keynote-recording.mp4 and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm HLS Mode and ffmpeg-only execution -> filesystem: read back the master playlist and segment folders`

### Expected

Step 1 fixes the fixture and baseline. Step 2 binds HLS Mode and runs ffmpeg. Step 3 proves the export holds a master `m3u8`, variant playlists and segments, with no other tool involved.

### Evidence

Capture the full reply, the ffmpeg check note, the per-turn side-effect ledger, the export folder tree and the master playlist contents.

### Pass / fail

- **Pass**: Installed ffmpeg alone produced an export with a master playlist, variant playlists and segments
- **Fail**: `ffmpeg -version` never ran, another tool was claimed for HLS, or the playlist structure is incomplete

### Failure triage

1. Check the `$hls` routing row and the route order in `SKILL.md`: the tools first, ffmpeg when they are not connected.
2. Check the ladder recipe against `assets/hls-video-conversion.md`.
3. Reconcile the export tree with the recipe output shape.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SHL-001 | FFmpeg-only HLS conversion | Verify `$hls` binds installed ffmpeg alone and exports a ladder | `$hls Convert this keynote recording for adaptive streaming on the site.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh -> 3. Confirm ffmpeg-only path and read back playlist | Step 1: fixture ready. Step 2: HLS Mode on ffmpeg. Step 3: master playlist plus segments | Reply, check note, export tree, playlist contents | PASS if ffmpeg alone produced master plus variant playlists and segments. FAIL on a skipped check, a wrong tool claim or missing structure | 1. Check the `$hls` route order.<br>2. Check the recipe against the HLS asset.<br>3. Reconcile export tree shape. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | HLS mode binding, lane routing and the ffmpeg check |
| [`hls-video-conversion.md`](../../assets/hls-video-conversion.md) | Multi-quality recipe, segment and playlist shape |

---

## 5. SOURCE METADATA

- Group: Skill HLS streaming
- Runtime: skill
- Playbook ID: SHL-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-hls-streaming/ffmpeg-only-hls-conversion.md`
