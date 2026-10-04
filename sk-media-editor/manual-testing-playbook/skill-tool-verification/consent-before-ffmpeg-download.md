---
title: "STV-002 -- Consent before ffmpeg download"
description: "Validates that with the tools connected and no ffmpeg found, the runtime shows the planned download and waits for consent before media_setup_ffmpeg installs anything."
version: 1.0.0.0
---

# STV-002 -- Consent before ffmpeg download

This scenario validates the consent flow behind `media_setup_ffmpeg`.

---

## 1. OVERVIEW

When the server finds no ffmpeg, `media_health` names `media_setup_ffmpeg` as the next step. Called without consent, that tool returns `CONSENT_REQUIRED` with the planned download: URL, size, SHA-256 and destination. The runtime must show that plan and wait. Only after the user agrees may it call the tool again with `consent: true`.

### Why this matters

The server never downloads anything without the user's agreement. A runtime that passes `consent: true` on its own installs software the user never approved.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the runtime shows the planned ffmpeg download and waits for consent before installing it
- Real user request: `Can you pull the audio out of this clip as an mp3?`
- Prompt: `$aud Pull the audio out of this clip as an mp3.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Move the plugin's bundled ffmpeg aside in the disposable copy, load the plugin with an empty server data folder and a path without ffmpeg or ffprobe, seed one short clip with an audio track, submit Turn 1, confirm nothing was downloaded, then submit Turn 2 and confirm the install and the extraction
- Expected signals: Turn 1 shows the plan with all four fields and asks, in the same question, whether to use a proposed readable name for the mp3, with no `consent: true` call and an empty data folder. Turn 2 makes the consented call, then `audio_extract` writes one mp3 into the output folder under the confirmed name and returns its path. Image tools run on sharp and need no ffmpeg, which is why this scenario asks for audio
- Desired user-visible outcome: One question carrying the consent plan and a proposed name, then after the yes one installed ffmpeg and one mp3
- Pass/fail: PASS if Turn 1 shows the full plan and a proposed name and installs nothing, and Turn 2 installs and extracts under the confirmed name. FAIL if `consent: true` was passed before the user agreed, the plan lacks a field, the question has no proposed name or the extraction ran before the install

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$aud Pull the audio out of this clip as an mp3.` | Call `media_health`, then `media_setup_ffmpeg` without consent, show the planned download with its URL, size, SHA-256 and destination, and ask in one question whether to install it and whether to use a proposed readable name for the mp3. | No download, no extraction and no file yet. | Reply transcript, tool call transcript and the server data folder listing. |
| 2 | `Yes, install it and use that name.` | Call `media_setup_ffmpeg` with `consent: true`, then run `audio_extract` with the confirmed `fileName` and reply with the tool, the path it returned and the check. | ffmpeg installed in the server data folder and one mp3 at the returned path under the confirmed name. | Reply transcript, tool call transcript and `ffprobe` of the mp3. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$aud Pull the audio out of this clip as an mp3.`

### Commands

1. `sandbox: move claude-plugin/server/node_modules/ffmpeg-static/ffmpeg aside in the disposable copy, start claude --plugin-dir "<path to>/mcp server/claude-plugin" with an empty MEDIA_EDITOR_DATA_DIR and a PATH without ffmpeg or ffprobe, seed clip.mp4 and record the data folder listing`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm no consent call and an unchanged data folder`
3. `user: submit Turn 2 exactly -> operator: confirm the consented call -> filesystem: run ffprobe on the mp3`

### Expected

Step 1 fixes a host with no ffmpeg anywhere. Step 2 shows the plan and stops. Step 3 installs after the yes and proves the mp3 exists.

### Evidence

Capture both replies, the tool call transcript with every `consent` value, the data folder listing after each turn and the `ffprobe` output of the mp3.

### Pass / fail

- **Pass**: Turn 1 shows the URL, size, SHA-256 and destination with a proposed name and installs nothing, and Turn 2 installs and extracts under the confirmed name
- **Fail**: `consent: true` came before the user agreed, the plan lacks a field, the question has no proposed name, or the extraction ran before the install

### Failure triage

1. Check the consent bullet in the tool check section of `SKILL.md`.
2. Check the consent flow in `references/tools.md` Section 6.
3. Check the transcript for the first call that carries `consent: true`.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| STV-002 | Consent before ffmpeg download | Verify the runtime shows the planned ffmpeg download and waits for consent before installing it | `$aud Pull the audio out of this clip as an mp3.` | 1. Hide ffmpeg, load the plugin, seed and record -> 2. Submit Turn 1 and confirm no install -> 3. Submit Turn 2 and read back the mp3 | Step 1: no ffmpeg anywhere. Step 2: the plan, a proposed name and one question. Step 3: install after the yes and one mp3 under the confirmed name | Both replies, tool calls with consent values, data folder listings, `ffprobe` output | PASS if nothing installs before the yes and the mp3 exists under the confirmed name after it. FAIL on unapproved consent, a missing plan field or a missing proposed name | 1. Check the consent rule in `SKILL.md`.<br>2. Check the consent flow in `tools.md`.<br>3. Check the first consented call. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | The tool check and the consent rule |
| [`tools.md`](../../references/tools.md) | `media_setup_ffmpeg` and the consent flow |

---

## 5. SOURCE METADATA

- Group: Skill tool verification
- Runtime: skill
- Playbook ID: STV-002
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-tool-verification/consent-before-ffmpeg-download.md`
