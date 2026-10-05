---
title: "STV-001 -- Missing FFmpeg advice"
description: "Validates that the skill, with the media-editor command off the PATH and no ffmpeg on the path, processes nothing and answers with the exact command, a plain statement that nothing ran and a setup offer."
version: 1.0.0.0
---

# STV-001 -- Missing FFmpeg advice

This scenario validates the last route of the route order: advice when neither the `media-editor` command nor ffmpeg can run.

---

## 1. OVERVIEW

The skill takes the first route that is available: the `media-editor` command, then installed ffmpeg, then advice. This scenario starts the session with the command off the PATH and with ffmpeg off the path, so only advice is left, and submits a compression request. The reply must give the exact command, state plainly that nothing ran, offer once to walk the user through installing the plugin, the standalone CLI or ffmpeg from `references/setup.md` and run no processing call.

### Why this matters

The tool check is the precondition every mode shares. A skill that processes anyway, or that implies a tool handled the work, produces a result the user cannot trust or reproduce.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the tool check runs first and, with neither route available, the reply advises without processing
- Real user request: `Compress this banner image and get it under 200KB.`
- Prompt: `Compress this banner image and get it under 200KB.`
- Precondition: `SID-001` passed for the skill runtime in the current disposable copy
- Expected execution process: Seed one banner image, start a session with the `media-editor` command off the PATH and ffmpeg off the path, submit Turn 1, then confirm the advice, the setup offer and the untouched export baseline
- Expected signals: No `media-editor` call is made or claimed. The route checks run first: `media-editor health` answers `command not found` and `ffmpeg -version` fails. The reply gives the exact compression command with an output path of `media files/export/[readable-name].[ext]` that carries a name proposed from what the banner shows and says it can be changed, the reply states that nothing ran and gives a setup offer, no processing call runs, no question holds the command back and no export appears
- Desired user-visible outcome: Advice with the exact command and its proposed readable output name, a plain statement that nothing ran, a setup offer and an empty side-effect ledger
- Pass/fail: PASS if the route checks ran first, the reply gives the command with a proposed readable name in its output path, says plainly that nothing ran with a setup offer and no artifact appears. FAIL if processing started, an export appeared, the reply holds the command back to ask for a name, the reply implies a tool ran or the limitation is hidden. SKIP only when the sandbox cannot start a session with the command off the PATH and ffmpeg off the path

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Compress this banner image and get it under 200KB.` | Run the `media-editor health` check, see `command not found`, run `ffmpeg -version`, see it fail, give the command with a proposed readable name in its output path, a plain statement that nothing ran and a setup offer, and create no artifact. | Checks ran first, no processing call, no route claimed. | Reply, failed check outputs, per-turn side-effect ledger and baseline comparison. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Compress this banner image and get it under 200KB.`

### Commands

1. `sandbox: seed banner-image.png over 200KB, record the export baseline, start a session with the media-editor command off the PATH and a PATH where ffmpeg does not resolve, and confirm both checks fail`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm the checks ran first and the advice gives the command with a proposed readable name, says nothing ran and gives a setup offer -> filesystem: confirm the export baseline is unchanged`

### Expected

Step 1 fixes the fixture, the baseline and the missing-route condition. Step 2 runs the checks, sees the failures and advises. Step 3 proves no processing call or export followed, the command carries a proposed output name and the offer names a real install path.

### Evidence

Capture the full reply, the failed `media-editor health` and `ffmpeg -version` outputs, the per-turn side-effect ledger and the unchanged export baseline.

### Pass / fail

- **Pass**: The route checks ran first, the reply gives the command with a proposed readable name, states plainly that nothing ran with a setup offer and the sandbox stays unchanged
- **Fail**: Processing ran before the checks, an export appeared, the reply holds the command back to ask for a name, the reply hides the missing route or it implies a tool produced a result

### Failure triage

1. Check the tool check section, ESCALATE 2 and ALWAYS 1 in `SKILL.md`.
2. Confirm the sandbox really made `media-editor` and ffmpeg unresolvable for the session.
3. Check the export baseline for hidden writes or a fallback attempt.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| STV-001 | Missing FFmpeg advice | Verify the tool check runs first and, with neither route available, the reply advises without processing | `Compress this banner image and get it under 200KB.` | 1. Seed fixture, baseline and a session with the command and ffmpeg unresolvable -> 2. Submit Turn 1 fresh -> 3. Confirm advice, the proposed name and unchanged baseline | Step 1: fixture ready, command and ffmpeg unresolvable. Step 2: failing checks then advice. Step 3: no artifact, a proposed name in the command and a one-line setup offer | Reply, failed check outputs, per-turn side-effect ledger, baseline comparison | PASS if the checks ran first, the reply said nothing ran with the command, a proposed name and a setup offer and no artifact appeared. FAIL on processing before the checks, a held-back command, a hidden limitation or a tool claim | 1. Check the tool check gate.<br>2. Check the session setup and the failure output.<br>3. Check the ledger for writes. |

---

## 4. SOURCE FILES



| File | Role |
|---|---|
| [catalog: tool check behavior](../../feature-catalog/skill-behavior/tool-check-behavior.md) | Matching feature catalog entry |
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | ALWAYS 1, NEVER 2, ESCALATE 2 and the tool check |
| [`setup.md`](../../references/setup.md) | The guided setup the reply offers |
| [`AGENTS.md`](../../../AGENTS.md) | Deliverable export protocol and the route order |

---

## 5. SOURCE METADATA

- Group: Skill tool verification
- Runtime: skill
- Playbook ID: STV-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-tool-verification/missing-ffmpeg-refusal.md`
