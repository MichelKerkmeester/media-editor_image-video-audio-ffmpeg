---
title: "SED-003 -- Export root without a subfolder"
description: "Validates that two separate single-file requests on the local ffmpeg route each land straight in the export root under the name the user gave, with no numbered folder, no naming question and no overwrite."
version: 1.0.0.0
---

# SED-003 -- Export root without a subfolder

This scenario validates the placement rule for single-file results on the ffmpeg route.

---

## 1. OVERVIEW

Each of the two requests names its result, so the runtime must not ask for a name and must not create a `[###] - ` folder. The Media Editor tools are not connected, so both requests run on installed ffmpeg. The first file must land at `media files/export/interview-email.mp4` and the second at `media files/export/interview-720p.mp4`, side by side in the export root.

### Why this matters

A numbered folder around one file hides the result one level deeper. Questioning a name the user already gave wastes a turn, and a result written over an earlier file destroys work. The export root has to take each new file under its own name and leave the earlier files untouched.

---

## 2. SCENARIO CONTRACT

- Objective: Verify single-file results land in the export root under the names the user gave, with no folder and no overwrite
- Real user request: `Can you compress interview.mp4 for email and save it as interview-email.mp4?`
- Prompt: `Compress interview.mp4 for email and save it as interview-email.mp4.`
- Precondition: `SID-001` passed for this runtime in the current disposable copy, and the Media Editor tools are not connected in this session
- Expected execution process: Seed one interview video and one unrelated earlier export, record the export baseline with checksums, start the CLI runtime without the plugin and with ffmpeg on the path, submit Turn 1 and confirm the first export, submit Turn 2 in the same session, then confirm the second export and the earlier files
- Expected signals: No Media Editor tool is called or claimed and `ffmpeg -version` runs before the first compression. Turn 1 asks no naming question and writes `media files/export/interview-email.mp4` with no `[###] - ` folder. Turn 2 asks no naming question and writes `media files/export/interview-720p.mp4`, a copy 720 pixels tall, with no folder. The earlier export keeps its checksum
- Desired user-visible outcome: Two single-file exports side by side in the export root under the names the user gave
- Pass/fail: PASS if both files exist in the export root under the given names, no numbered folder appears, no name was questioned and the earlier export is unchanged. FAIL if any numbered folder appears for a single file, a name the user gave is questioned or an existing file is overwritten

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Compress interview.mp4 for email and save it as interview-email.mp4.` | Find no Media Editor tools, run `ffmpeg -version`, ask no naming question, compress with ffmpeg and save as `media files/export/interview-email.mp4`, verify the save and reply path first. | One file in the export root and no numbered folder. | Reply, check output, export listing and `ffprobe` of the file. |
| 2 | `Now make a 720p copy called interview-720p.` | Ask no naming question, scale to 720 pixels tall with ffmpeg and save as `media files/export/interview-720p.mp4`, verify the save and reply path first. | A second file beside the first, no folder and nothing overwritten. | Reply, export listing, `ffprobe` of the file and checksums of the earlier files. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Compress interview.mp4 for email and save it as interview-email.mp4.`

### Commands

1. `sandbox: seed interview.mp4 in media files/import/ and earlier-result.mp4 in media files/export/, record the export baseline with checksums, start the runtime without the plugin and confirm ffmpeg -version answers`
2. `session: start fresh -> user: submit Turn 1 exactly -> operator: confirm no tool claim and no naming question -> filesystem: list the export folder and run ffprobe on interview-email.mp4`
3. `user: submit Turn 2 exactly -> operator: confirm no naming question -> filesystem: list the export folder, run ffprobe on interview-720p.mp4 and recompute the checksums of the earlier files`

### Expected

Step 1 fixes the fixture, the baseline and the tool-free session. Step 2 compresses under the name the user gave and proves one file in the export root. Step 3 proves the second file sits beside the first, no folder appeared and no earlier file changed.

### Evidence

Capture both replies, the `ffmpeg -version` output, the per-turn side-effect ledger, the export listing after each turn, the `ffprobe` output of both files and the checksums before and after.

### Pass / fail

- **Pass**: Both files exist in the export root under the names the user gave, no numbered folder appeared, no naming question was asked and the earlier files match their checksums
- **Fail**: A numbered folder appeared for a single file, a name the user gave was questioned, a file was overwritten or an export is missing or unreadable

### Failure triage

1. Check the file naming and export protocol sections in `SKILL.md` and `AGENTS.md`.
2. Check the ledger for a `[###] - ` folder and the transcript for a naming question.
3. Compare the checksums of the earlier files with the baseline.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SED-003 | Export root without a subfolder | Verify single-file results land in the export root under the user's names with no folder and no overwrite | `Compress interview.mp4 for email and save it as interview-email.mp4.` | 1. Seed fixture, baseline and a tool-free session -> 2. Submit Turn 1 and read back the first export -> 3. Submit Turn 2, read back the second export and recheck the earlier files | Step 1: no tools, ffmpeg answers. Step 2: `interview-email.mp4` in the export root, no question. Step 3: `interview-720p.mp4` beside it, no folder, nothing overwritten | Both replies, check output, per-turn side-effect ledger, export listings, `ffprobe` output, checksums | PASS if both files sit in the export root under the given names with no folder, no naming question and no overwrite. FAIL on a numbered folder, a questioned name or an overwritten file | 1. Check the naming and export rules.<br>2. Check the ledger and the transcript.<br>3. Check the checksums. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`SKILL.md`](../../SKILL.md) | File naming, export protocol and the ffmpeg check |
| [`AGENTS.md`](../../../AGENTS.md) | The strict sequence and the file naming rule |
| [`video-and-audio-operations.md`](../../references/video-and-audio-operations.md) | Compression and scaling recipes and the build checks |

---

## 5. SOURCE METADATA

- Group: Skill export delivery
- Runtime: skill
- Playbook ID: SED-003
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-export-delivery/export-root-no-subfolder.md`
