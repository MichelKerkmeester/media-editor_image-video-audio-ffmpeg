---
title: "SRM-001 -- Broken file repair"
description: "Validates that the $r alias routes to Repair Mode, which diagnoses a damaged video with ffprobe before repairing it with ffmpeg into a new export."
version: 1.0.0.0
---

# SRM-001 -- Broken file repair

This scenario validates Repair Mode on the local ffmpeg route: diagnose first, then repair into a fresh file.

---

## 1. OVERVIEW

`$repair` and its alias `$r` route to Repair Mode. With the tools connected it runs `media_probe` then `media_repair`. On the local route it runs ffprobe to diagnose, then ffmpeg to repair, usually a remux into a fresh container for a broken index and a re-encode for a damaged stream. The source file is never overwritten.

### Why this matters

A repair that skips the diagnosis guesses at the fix, and a repair that writes over the source can destroy the only copy of the recording.

---

## 2. SCENARIO CONTRACT

- Objective: Verify `$r` routes to Repair Mode, diagnoses with ffprobe and writes a repaired copy
- Real user request: `This screen recording stops playing after ten seconds. Can you fix it?`
- Prompt: `$r This screen recording stops playing after ten seconds. Can you fix it?`
- Precondition: `SID-001` passed for this runtime in the current disposable copy
- Expected execution process: Seed one 30 second recording whose final bytes are cut off, record its checksum, start a fresh skill session, submit Turn 1 and confirm the diagnosis and the name proposal with nothing written, submit Turn 2, then confirm the repaired file and the untouched source
- Expected signals: The reply names Repair Mode, an ffprobe call precedes any ffmpeg write and the reply states the finding. Turn 1 proposes a readable name for the repaired copy and writes nothing. Turn 2 saves the repaired file as `media files/export/[readable-name].mp4` with no numbered folder, it plays past the point where the source stopped, and the source checksum is unchanged
- Desired user-visible outcome: One diagnosis and a name proposal, then one repaired copy, with the source left as it was
- Pass/fail: PASS if ffprobe ran before the repair, the name was proposed before any write, the repaired file reads back under it with a duration past ten seconds and the source checksum matches. FAIL if no diagnosis ran, a file was written before the name was confirmed, the source was overwritten or no repaired file exists

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$r This screen recording stops playing after ten seconds. Can you fix it?` | Bind Repair Mode, check ffmpeg, run ffprobe on the file and say what it found, propose a readable name for the repaired copy and wait. | Mode is Repair. The source is unchanged and no file written yet. | Reply transcript, the ffprobe diagnosis and export listing before and after. |
| 2 | `Yes, use that name.` | Repair with ffmpeg into `media files/export/` under the confirmed name, then reply with the written path first. | The source is unchanged and one repaired file exists in the export root. | Reply transcript, export listing and `ffprobe` of the repaired file. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$r This screen recording stops playing after ten seconds. Can you fix it?`

### Commands

1. `sandbox: make screen-recording.mp4 at 30 seconds, cut off its final bytes, record its checksum and the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm ffprobe ran and the proposal waited with an unchanged export folder`
3. `user: submit Turn 2 exactly -> operator: confirm ffprobe ran before ffmpeg -> filesystem: run ffprobe on the repaired file and recompute the source checksum`

### Expected

Step 1 fixes a damaged fixture. Step 2 diagnoses, proposes a name and stops. Step 3 repairs under the confirmed name and proves the repaired copy plays further than the source and that the source is unchanged.

### Evidence

Capture both replies, the command order, the per-turn side-effect ledger, the `ffprobe` output of the repaired file and both source checksums.

### Pass / fail

- **Pass**: ffprobe ran before the repair, the name was proposed before any write, the repaired copy reads back past ten seconds and the source checksum is unchanged
- **Fail**: No diagnosis ran, a file was written before the name was confirmed, the source was overwritten, or no repaired file exists

### Failure triage

1. Check that `$r` is in the Repair row of the command table in `SKILL.md`.
2. Check the Repair Mode fallback, ffprobe then ffmpeg, in `references/router-contract.md`.
3. Check the ledger for a write to the source path.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRM-001 | Broken file repair | Verify `$r` routes to Repair Mode, diagnoses with ffprobe and writes a repaired copy | `$r This screen recording stops playing after ten seconds. Can you fix it?` | 1. Seed damaged fixture, checksum and baseline -> 2. Submit Turn 1 fresh and confirm the diagnosis and the wait -> 3. Submit Turn 2, confirm order, read back and recheck the source | Step 1: damaged fixture. Step 2: ffprobe, a finding and a name proposal. Step 3: ffmpeg repair, copy past ten seconds, source unchanged | Both replies, command order, export listing, `ffprobe` output, source checksums | PASS if diagnosis came first, the name waited, the copy reads back and the source is unchanged. FAIL on no diagnosis, an early write, a source write or no copy | 1. Check the Repair commands.<br>2. Check the Repair fallback order.<br>3. Check the ledger for a source write. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | Repair Mode, its commands and its fallback |
| [`router-contract.md`](../../references/router-contract.md) | The Repair tool group and fallback |
| [`tools.md`](../../references/tools.md) | `media_probe` and `media_repair` strategies |

---

## 5. SOURCE METADATA

- Group: Skill repair mode
- Runtime: skill
- Playbook ID: SRM-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-repair-mode/broken-file-repair.md`
