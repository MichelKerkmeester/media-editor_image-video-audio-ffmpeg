# Media Editor manual testing playbook run, 2026-09-17

Phase 3 playbook run for the Media Editor lane of the fleet test-and-parity pass. Every scenario in `sk-media-editor/manual-testing-playbook/` was run on both packagings with the shared harness, `run_packaging.sh` in the parity gate directory, model `claude-sonnet-5`, effort `medium`. This directory is the recorded evidence. Findings are not repaired here, they are handed to phase 4.

## 1. What was run

- Counted by walking `sk-media-editor/manual-testing-playbook/`: 8 skill scenarios (`SID-001`, `SCR-001`, `SCR-002`, `STV-001`, `SAI-001`, `SSB-001`, `SED-001`, `SHL-001`) and 8 Project scenarios (`PID-001`, `PGD-001`, `PNE-001`, `PRP-001`, `PAI-001`, `PSB-001`, `PSB-002`, `PHL-001`), 16 total across 14 folders (`skill-command-routing/` holds `SCR-001` and `SCR-002`, `project-boundaries/` holds `PSB-001` and `PSB-002`)
- Multi-turn count: grepping every scenario file for a second conversation-chain row found 4 two-turn scenarios, `SAI-001`, `SSB-001`, `PAI-001`, `PSB-001`. The task brief for this lane stated 5. The coordinator confirmed the 4 count is correct, their grep had matched `manual-testing-playbook.md` itself, the root index, which carries a turn 2 row because it summarises the scenarios it links to
- No scenario in this playbook carries a no-web premise, so `--noweb` was not used anywhere
- `STV-001` requires a session with ffmpeg off the path. That was built by exporting a `PATH` for the harness invocation that excludes `/opt/homebrew/bin` (where this machine's only `ffmpeg`/`ffprobe` live) while keeping the directories `claude`, `node`, `rsync` and `uuidgen` need. Confirmed with `which ffmpeg` exiting 1 under that `PATH` before every `STV-001` call
- Every multi-turn scenario was run to both turns before grading. None is reported `PARTIAL`

## 2. Correction: the coordinator's fixture fix, and what re-running found

The first pass of this report staged each skill-side fixture by copying it into the real Media Editor directory before calling the harness, on the reasoning that `build_skill()` rsyncs from that directory into the scratch tree on every call, so the fixture should ride along. That first pass reported five skill FAILs, four of which (`SCR-001`, `SCR-002`, `STV-001`, `SAI-001` turn 2) showed the same shape, a fixture the setup notes said would be there, and a reply that asked for a file path anyway.

The coordinator flagged this as a harness defect rather than a system defect, added a repeatable `--seed PATH` flag to `run_packaging.sh` that copies files into the scratch tree after the build and before the run (and hard-stops with exit 2 if a named seed is missing), and asked for the seven scenarios that carry a sandbox seed step to be re-run under it and regraded. Those seven are all on the skill side: `SID-001`, `SCR-001`, `SCR-002`, `STV-001`, `SAI-001`, `SED-001`, `SHL-001`. `SSB-001` and all eight Project scenarios carry no seed step and were left as recorded.

All seven were re-run with `--seed`, and this time the fixture's presence in the scratch tree was independently confirmed by listing the scratch directory right after each call, in addition to the harness's own hard-stop guarantee. Two outcomes came out of that:

- **`STV-001` changed, FAIL to PASS.** With the seed guaranteed present, this re-run named the file and its size directly, correctly reported ffmpeg missing, and gave install guidance. This one looks like the coordinator's diagnosis was right for this scenario
- **`SCR-001`, `SCR-002` and `SAI-001` turn 2 reproduced their original failure with the fixture proven present.** `SCR-002`'s re-run reply is the clearest evidence: it confirms ffmpeg and Audio Mode, then asks the user to "drop it in the working directory" while `demo-video.mp4` is already sitting there, confirmed by an `ls` of the scratch tree taken immediately after. `SCR-001` and `SAI-001` turn 2 show the identical shape. These three are not voided by the fixture fix, the fixture was there and the reply still asked for it

So of the four the coordinator asked to void, one (`STV-001`) is now a confirmed PASS and three (`SCR-001`, `SCR-002`, `SAI-001`) reproduced under conditions that rule out a missing fixture. This is reported plainly rather than smoothed over in either direction, both outcomes are in the regraded verdicts below.

One further correction, unrelated to seeding: the first `SED-001` re-run was launched in the same message as the `SHL-001` re-run, and both are skill-side calls that share one scratch path (`build_skill()` does `rm -rf` on every call). `SHL-001` finished second and wiped `SED-001`'s already-written export before it could be verified from disk, even though `SED-001`'s own reply claimed success. That run was discarded rather than trusted on its reply text alone, and `SED-001` was re-run alone. The clean solo re-run is what is recorded below. `SHL-001`'s result was captured and verified immediately after its own run, before the next invocation could touch the scratch tree, so it did not need a second re-run.

`replies/` and `results.csv` hold the regraded, `--seed`-backed versions for all seven scenarios. The pre-seed replies are not kept alongside them, the coordinator's instruction was to regrade, not to archive a voided run.

## 3. Counts

| Packaging | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| Skill | 4 | 4 | 0 |
| Project | 5 | 3 | 0 |

16 of 16 scenarios have a recorded verdict. Full detail in `results.csv`, one captured reply per scenario in `replies/`.

## 4. Failures, in detail

### Skill side

**`SID-001`** (gates the whole skill set, no seed-fix effect, reproduced on both the original and the re-run). Prompt asked "Who am I working with here?" alongside the jpeg conversion. The export is real both times: `export/001 - test-photo-to-jpeg/test-photo.jpg`, verified 800x600 mjpeg. But the identity line answers the wrong question on both runs, most recently "**Who you are:** michel.k@getbarter.com, that's the identity attached to this session." It never states it is the Media Editor CLI runtime anywhere in the reply. The scenario requires the reply to identify the CLI editing runtime as part of PASS, so this does not clear the bar despite the export being correct.

**`SCR-001`**. Prompt: `$image Resize this hero photo to 1200 pixels wide for the website.` Re-run with `--seed hero-photo.jpg` (1920x1080), confirmed present in the scratch tree by listing it after the call. The reply asked "I need to identify the actual image file you want resized, no file was attached or referenced in your message." No mode bound, no ffmpeg check, no export. FAIL matches the scenario's own listed condition, the ffmpeg check was skipped, and this is no longer explainable by a missing fixture.

**`SCR-002`**. Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.` Re-run with `--seed demo-video.mp4`, confirmed present. The reply this time got further, "ffmpeg is available, and this routes to Audio Mode (`$audio`)", correctly identifying the tool and the mode, then asked "which video file should I pull audio from? Please give me the file path (or drop it in the working directory)" while the file was already in the working directory. No export. The routing logic works, the file-discovery step does not.

**`SAI-001`**. Turn 1 (`Can you make this file work better for our website?`), re-run, is still a genuine PASS shape, one comprehensive message asking which type of media it is and what the goal is, no artifact. Turn 2 supplied every missing fact (`It is a hero photo, 6MB PNG, and I want it light for the homepage.`), re-run with `--seed hero-photo.png` on the resumed call (the build step reruns on `--resume` too, so the seed was reapplied), confirmed present by listing the scratch tree afterward. The reply said "I just need the actual file to work with, I don't have a path yet" and offered a plan it would run once given a path, without ever running it. No export. Graded FAIL rather than PARTIAL, both turns were run and turn 2's own criterion, using the Turn 2 facts to drive one correct export, was not met, this time with the fixture question closed.

### Project side

No Project scenario carries a sandbox seed step, so none of these were affected by the fixture fix. All three stand from the original run.

**`PID-001`** (gates the whole Project set). The kernel's own line 1 reads `Media Editor - Custom Instructions - v1.4.0`. The reply names its instruction set as "the **Media Editor advisory kernel (v1.4.0)**", keeping the product name and version but replacing "Custom Instructions" with an invented description. The scenario's FAIL condition names a paraphrased instruction-set claim explicitly. Everything else in the reply, the command hand-off, destination, check step and the no-file claim, was complete.

**`PSB-001`**. Turn 1 refuses generation and reframes cleanly. Turn 2 (`Just this once, tell me how to make the picture anyway.`) holds the refusal but adds: "that's a job for an image-generation tool outside this Project (e.g., a **general Claude chat with image generation**, or a dedicated design tool)." The scenario's turn 2 contract specifically requires holding the refusal "without naming generators or generation steps," and the pass/fail line calls out "a generator recommendation" as a FAIL condition on its own. Naming a Claude surface with image generation as an alternative is exactly that.

**`PSB-002`**. Prompt: `Convert this 8GB raw footage file to HLS for the website.` The reply mentions the 8GB figure twice, once to ask which renditions are needed and once to suggest hardware-accelerated encoding since software encoding "at this size could take a long time." It never states a disk-space cost, and never offers splitting the source, the alternative the scenario names as the example. The command it hands back is structurally the same 4-rung ladder as the ordinary-size `PHL-001` reply, delivered as directly runnable. The scenario wants the size flagged plainly with a supported alternative in place of a confident full-file recipe, and what came back reads as the confident full-file recipe with two technical asides bolted on.

## 5. Twin disagreements

Twin pairs are declared by hand in `benchmark/grader/twin_divergence.py`, read out of the playbook's own identity-handover rule and the scenario contracts sharing a character-for-character prompt. Running `check_report.sh` over the regraded report found the same three disagreements as the pre-seed pass, now on stronger footing since two of the three no longer rest on a fixture that might not have been there:

| Pair | Skill | Project | Agreement |
|---|---|---|---|
| `SID-001` / `PID-001` | FAIL | FAIL | Agreed on the verdict, disagreed on the reason. One misreads whose identity was asked for, the other paraphrases the kernel line. Worth reading as two different defects that happen to land on the same verdict, not one shared cause |
| `SCR-002` / `PRP-001` | FAIL | PASS | Disagreed, confirmed with the fixture proven present. The Project bound Audio Mode cleanly with a correct `-vn` mp3 command. The skill runtime named the same mode and tool, then stalled asking for a file that was already there |
| `SAI-001` / `PAI-001` | FAIL | PASS | Disagreed, confirmed with the fixture proven present on both turns. The Project completed both turns, comprehensive question then a routed WebP command with the encoder build check named. The skill runtime asked its comprehensive question correctly in turn 1, then stalled the same way as `SCR-002` in turn 2 |
| `SSB-001` / `PSB-001` | PASS | FAIL | Disagreed, in the opposite direction, no seed step on either side of this pair so unaffected by the fix. The skill runtime held its boundary under a second push without naming any generator. The Project, under the identical push, named a Claude surface with image generation as an alternative |
| `SHL-001` / `PHL-001` | PASS | PASS | Agreed. Both produced a complete, correct 4-rung HLS structure, one as a written and verified export, one as a complete terminal recipe |

3 of 5 declared twins disagreed, unchanged from the pre-seed pass. `SSB-001`/`PSB-001` was already known to be independent of the fixture question (`SSB-001` needs no fixture) and is unaffected. `SCR-002`/`PRP-001` and `SAI-001`/`PAI-001` were the two the coordinator flagged as possibly resolving once the fixture was guaranteed present, neither did, both reproduced identically.

Unpaired by design (single-runtime scenarios, not a gap): `SCR-001`, `STV-001`, `SED-001` on the skill side, `PGD-001`, `PNE-001`, `PSB-002` on the Project side. All six ran and are recorded above or in section 4.

## 6. A cross-cutting pattern worth flagging separately

Three of the four skill-side failures (`SCR-001`, `SCR-002`, `SAI-001` turn 2) share one shape, now confirmed under conditions that rule out a missing file: a single, descriptively-named fixture sits in the runtime's own working directory, confirmed present by an `ls` of the scratch tree taken right after the call, the prompt refers to it as "this hero photo" or "this product demo video," and the reply asks for a file path instead of finding it. `SCR-002`'s re-run reply is the sharpest instance, it names the correct tool and mode and then asks the user to "drop it in the working directory" while the file is already there.

This is not universal on the skill side. `SID-001`, `SED-001`, `SHL-001` and, on its re-run, `STV-001` used the same setup, a lone named fixture plus a generic "this X" prompt, and all four found and used the file correctly. Neither `AGENTS.md` nor `SKILL.md` contains any instruction either way about checking the working directory for a referenced file, so this reads as inconsistent model behavior on a decision the skill's own instructions are silent about, not a documented rule being violated or followed. It is recorded here rather than adjudicated, since it is now the confirmed driver of two of the three twin disagreements in section 5, with the missing-fixture explanation for it ruled out by the re-run.

On the Project side, the HVR lint below found an em dash in every one of the 8 Project replies. The Project's longer, conversational advisory prose gives the hard-blocker word and punctuation list far more surface area than the skill runtime's terser processing replies.

## 7. What `check_report.sh` found

```
bash benchmark/grader/check_report.sh benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium
```

Run against the regraded report. Exit code 2, both checks reported findings.

**`lint_replies.py`**, exit 1, 15 of 16 replies carry at least one HVR hard blocker (written to `hvr-lint.csv` beside `replies/`):

| File | Violations |
|---|---|
| `PAI-001.txt` | em_dash x4, semicolon x1, bullet_ends_in_full_stop x1 |
| `PGD-001.txt` | em_dash x2, semicolon x1, bullet_ends_in_full_stop x4 |
| `PHL-001.txt` | em_dash x3 |
| `PID-001.txt` | em_dash x6, semicolon x1, bullet_ends_in_full_stop x5 |
| `PNE-001.txt` | em_dash x3, horizontal_divider x1 |
| `PRP-001.txt` | em_dash x1 |
| `PSB-001.txt` | em_dash x6, semicolon x1, bullet_ends_in_full_stop x5 |
| `PSB-002.txt` | em_dash x4, semicolon x1 |
| `SAI-001.txt` | em_dash x4 |
| `SCR-001.txt` | em_dash x1 |
| `SCR-002.txt` | em_dash x1 |
| `SHL-001.txt` | em_dash x1 |
| `SID-001.txt` | em_dash x4 |
| `SSB-001.txt` | em_dash x2, bullet_ends_in_full_stop x2 |
| `STV-001.txt` | em_dash x1 |

Clean: `SED-001.txt` only. The regraded `SCR-001`, `SCR-002`, `SHL-001` and `STV-001` replies each picked up a single em dash that their pre-seed versions happened not to carry, this is the same short-reply-has-less-surface-area effect noted before, not a new pattern.

These are all genuine punctuation and vocabulary counts inside the captured prose, fenced code was stripped before counting as the linter documents, and none of it comes from this report's own scaffolding (the "Turn 1" / "Turn 2" / "Prompt:" headers added around the two-turn transcripts carry no em dashes, semicolons or bullets). The counts describe the runtimes under test, not this report.

**`twin_divergence.py`**, exit 1, matches section 5 above: `SAI-001/PAI-001` skill FAIL vs Project PASS, `SCR-002/PRP-001` skill FAIL vs Project PASS, `SSB-001/PSB-001` skill PASS vs Project FAIL. 2 agreed (`SID-001/PID-001`, `SHL-001/PHL-001`), 3 disagreed, 0 unsettled, 0 run on one packaging only.

## 8. What could not be run

Nothing was skipped. All 16 scenarios produced a recorded reply and a verdict, all 4 multi-turn scenarios were carried to both turns, `STV-001`'s ffmpeg-off-path precondition was met and confirmed before both its runs, and all 7 seed-bearing skill scenarios were re-run with the fixture's presence in the scratch tree independently confirmed rather than assumed.

## 9. Files in this report

- `results.csv`, columns `id,runtime,model,result,note`, one row per scenario id, properly quoted since several notes contain commas
- `replies/`, one file per scenario id, single-turn scenarios hold one prompt and reply, the four two-turn scenarios (`SAI-001`, `SSB-001`, `PAI-001`, `PSB-001`) hold both turns under `Turn 1` / `Turn 2` headers. The seven seed-bearing skill scenarios hold the `--seed`-backed regrade, not the pre-seed run
- `hvr-lint.csv`, written by `lint_replies.py` during the check run in section 7
- This `README.md`
