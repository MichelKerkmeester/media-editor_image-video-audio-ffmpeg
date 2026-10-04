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
- Expected execution process: Seed one 30 second recording whose final bytes are cut off, record its checksum, start a fresh skill session, submit Turn 1, then confirm the diagnosis, the repaired file and the untouched source
- Expected signals: The reply names Repair Mode, an ffprobe call precedes any ffmpeg write, the reply states the finding, the repaired file sits under `media files/export/[###] - [description]/` and plays past the point where the source stopped, and the source checksum is unchanged
- Desired user-visible outcome: One diagnosis and one repaired copy, with the source left as it was
- Pass/fail: PASS if ffprobe ran before the repair, the repaired file reads back with a duration past ten seconds and the source checksum matches. FAIL if no diagnosis ran, the source was overwritten or no repaired file exists

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `$r This screen recording stops playing after ten seconds. Can you fix it?` | Bind Repair Mode, run ffprobe on the file and say what it found, repair with ffmpeg into `media files/export/`, then reply with the written path first. | Mode is Repair. The source is unchanged and one repaired file exists. | Reply transcript, the ffprobe diagnosis, export listing and `ffprobe` of the repaired file. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `$r This screen recording stops playing after ten seconds. Can you fix it?`

### Commands

1. `sandbox: make screen-recording.mp4 at 30 seconds, cut off its final bytes, record its checksum and the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: confirm ffprobe ran before ffmpeg -> filesystem: run ffprobe on the repaired file and recompute the source checksum`

### Expected

Step 1 fixes a damaged fixture. Step 2 diagnoses and repairs. Step 3 proves the repaired copy plays further than the source and that the source is unchanged.

### Evidence

Capture the full reply, the command order, the per-turn side-effect ledger, the `ffprobe` output of the repaired file and both source checksums.

### Pass / fail

- **Pass**: ffprobe ran before the repair, the repaired copy reads back past ten seconds and the source checksum is unchanged
- **Fail**: No diagnosis ran, the source was overwritten, or no repaired file exists

### Failure triage

1. Check that `$r` is in the Repair row of the command table in `SKILL.md`.
2. Check the Repair Mode fallback, ffprobe then ffmpeg, in `references/router-contract.md`.
3. Check the ledger for a write to the source path.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SRM-001 | Broken file repair | Verify `$r` routes to Repair Mode, diagnoses with ffprobe and writes a repaired copy | `$r This screen recording stops playing after ten seconds. Can you fix it?` | 1. Seed damaged fixture, checksum and baseline -> 2. Submit Turn 1 fresh -> 3. Confirm order, read back and recheck the source | Step 1: damaged fixture. Step 2: ffprobe then ffmpeg. Step 3: repaired copy past ten seconds, source unchanged | Reply, command order, export listing, `ffprobe` output, source checksums | PASS if diagnosis came first, the copy reads back and the source is unchanged. FAIL on no diagnosis, a source write or no copy | 1. Check the Repair commands.<br>2. Check the Repair fallback order.<br>3. Check the ledger for a source write. |

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
