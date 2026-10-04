---
title: "SID-001 -- Identity handover"
description: "Validates that the skill runtime names AGENTS.md as its instruction set and proves it with a real written export path, gating every other skill scenario."
version: 1.0.0.0
---

# SID-001 -- Identity handover

This scenario validates that the running system is genuinely the CLI Media Editor runtime, not the advisory project packaging.

---

## 1. OVERVIEW

The skill runtime must answer a combined identity and processing request by naming `AGENTS.md` as the instruction set it runs, producing a real export and naming the path it wrote. A reply that could have come from either runtime is a `FAIL`, because only the CLI runtime can drive installed tools and write to disk.

### Why this matters

Every other skill scenario assumes this runtime drives locally installed ffmpeg and ffprobe and writes real files. If the handover cannot prove that, downstream verdicts are meaningless, so `SID-001` is the named precondition for the whole skill set.

### Identity split proof

The skill identity string was chosen by grep so it is verbatim in the skill's own load surface and absent from the other runtime's whole load surface. The project identity is not spelled here because the proof reads it from the kernel's opening line at run time. Counts and exit codes were captured from the repository root:

```text
$ grep -c "AGENTS.md" "AI Systems/Media Editor/sk-media-editor/SKILL.md"
1
exit=0
$ grep -Rl "AGENTS.md" "AI Systems/Media Editor/claude project/Custom Instructions.md" "AI Systems/Media Editor/claude project/knowledge" | wc -l
0
$ J=$(sed -n '1s/^# //p' "AI Systems/Media Editor/claude project/Custom Instructions.md")
$ printf 'kernel line 1: %s\n' "$J"
$ grep -c "$J" "AI Systems/Media Editor/AGENTS.md"
0
exit=1
$ grep -rl "$J" "AI Systems/Media Editor/sk-media-editor" --include="*.md" | grep -vc manual-testing-playbook
0
exit=1
```

Skill identity string: `AGENTS.md`, the file the CLI runtime boots from. It counts one in `SKILL.md` and zero across the Project load surface, the kernel and every Knowledge document. Project identity: the instruction set line, read at run time from the opening line of the kernel. That line counts zero in `AGENTS.md` and zero across the skill load surface outside this playbook, both greps exiting 1. The proof prints the instruction set line at run time rather than pasting it, so the fenced counts survive a kernel bump. The reply passes only when it names `AGENTS.md` as its instruction set and honors the delivery contract, a real written export only this runtime can make.

---

## 2. SCENARIO CONTRACT

- Objective: Verify the skill runtime names `AGENTS.md` and proves it with a real written export
- Real user request: `Who am I talking to, and can you convert this test photo to jpeg and tell me which tools you use and where the file ended up?`
- Prompt: `Which instruction set are you running right now? Convert this test photo to jpeg and tell me exactly which tools you drive and where the result landed.`
- Expected execution process: Seed one small test photo, start a fresh skill session, submit Turn 1, then confirm the identity statement, the export on disk and the tool names
- Expected signals: The reply names `AGENTS.md` as the instruction set it runs, names `ffmpeg` and `ffprobe` as the tools it drives, names a path under `media files/export/[###] - [description]/` that exists and holds a readable jpeg, and never claims that no file was written
- Desired user-visible outcome: One honest identity answer plus one verified jpeg export
- Pass/fail: PASS if the reply names `AGENTS.md` as its instruction set and a real export path that reads back as a jpeg. FAIL if `AGENTS.md` is missing from the reply, the path is missing or unreadable, the reply claims no file was written, or the reply could have come from either runtime

### Conversation chain

| Turn | Exact user input | Expected assistant behavior | State check | Evidence |
|---|---|---|---|---|
| 1 | `Which instruction set are you running right now? Convert this test photo to jpeg and tell me exactly which tools you drive and where the result landed.` | Name `AGENTS.md` as the instruction set, check ffmpeg, convert the fixture to jpeg, save to `media files/export/`, then reply with the written path first. | Runtime is the CLI skill, not the project packaging. | Reply transcript, the instruction set named, export listing and jpeg readback. |

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Which instruction set are you running right now? Convert this test photo to jpeg and tell me exactly which tools you drive and where the result landed.`

### Commands

1. `sandbox: seed test-photo.png in the disposable copy and record the export baseline`
2. `session: start fresh -> user: submit Turn 1 exactly`
3. `operator: record the identity statement -> filesystem: read back the named export path`

### Expected

Step 1 fixes the fixture and baseline. Step 2 produces the identity answer naming `AGENTS.md` plus the conversion. Step 3 proves the reply names a real written path under `media files/export/` and that the path reads back as a jpeg.

### Evidence

Capture the full reply, the instruction set it names, the per-turn side-effect ledger, the export folder listing and a readback of the jpeg file.

### Pass / fail

- **Pass**: The reply names `AGENTS.md` as its instruction set and a real `media files/export/` path that reads back as a jpeg
- **Fail**: The reply does not name `AGENTS.md`, the path does not resolve to a readable file, the reply claims no file was written, or the reply could have come from either runtime

### Failure triage

1. Confirm the session ran against `AGENTS.md` with `sk-media-editor/` loaded, not the project kernel.
2. Check whether the ffmpeg check ran and whether the reply named ffmpeg and ffprobe as its tools.
3. Reconcile the named path with the actual `media files/export/` folder contents.

| Feature ID | Feature Name | Scenario Name / Objective | Exact Prompt | Exact Command Sequence | Expected Signals | Evidence | Pass/Fail Criteria | Failure Triage |
|---|---|---|---|---|---|---|---|---|
| SID-001 | Identity handover | Verify the skill runtime names `AGENTS.md` and proves it with a real written export | `Which instruction set are you running right now? Convert this test photo to jpeg and tell me exactly which tools you drive and where the result landed.` | 1. Seed fixture and baseline -> 2. Submit Turn 1 fresh -> 3. Record identity and read back export | Step 1: fixture ready. Step 2: identity reply naming `AGENTS.md` plus conversion. Step 3: readable jpeg and honest tool names | Reply, instruction set named, export listing, jpeg readback | PASS if the reply names `AGENTS.md` and a real export path that reads back as a jpeg. FAIL if `AGENTS.md` is missing or the reply could have come from either runtime | 1. Confirm the skill runtime ran.<br>2. Check the ffmpeg check and named tools.<br>3. Reconcile named path with disk. |

---

## 4. SOURCE FILES

No feature catalog exists. Current runtime sources are the evidence authority.

| File | Role |
|---|---|
| [Root playbook](../manual-testing-playbook.md) | Shared execution policy and root summary |
| [`AGENTS.md`](../../../AGENTS.md) | Skill identity, export protocol and processing hierarchy |
| [`SKILL.md`](../../SKILL.md) | Routing, ffmpeg check and export rules |
| [`image-operations.md`](../../references/image-operations.md) | Current image operation recipes and the encoder build check |

---

## 5. SOURCE METADATA

- Group: Skill identity handover
- Runtime: skill
- Playbook ID: SID-001
- Canonical root source: `../manual-testing-playbook.md`
- Feature file path: `skill-identity-handover/identity-handover.md`
