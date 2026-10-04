# Twin divergence sampling, Media Editor, three pairs

Measures whether three twin divergences are packaging properties or sampling draws. Five runs per side per pair, fresh session each sample, every declared turn. Measurement only, nothing repaired, `adjudication.md` untouched. Paths are relative to `AI Systems/Media Editor/` unless stated otherwise.

The pairs: `SAI-001`/`PAI-001`, `SCR-002`/`PRP-001`, `SSB-001`/`PSB-001`.

---

## 1. Pre-registered discriminators

Written before any sample was run. Each is a script-checkable test with no judgement, derived from that scenario's own pass/fail line and from what actually decided the committed verdict. Each is shown reproducing the committed reply's verdict. None was revised after results came in.

The verdict column and the mechanism column are separate throughout. The verdict is whether the scenario passed under its own contract. The mechanism is what the runtime did to get there.

### Verdict discriminators

| Scenario | Test | Derived from | Applied to the committed reply |
|---|---|---|---|
| `SAI-001` | An export exists after turn 2. PASS iff at least one file in the session scratch tree is a media file that `ffprobe` reads as an image or video stream and whose sha256 differs from the seeded fixture. Cross-checked by extracting every `ffmpeg` invocation from the session transcript and testing its trailing non-flag argument with `test -e`, so an absolute-path write outside the scratch tree still counts | `:66` "the Turn 2 facts drove one correct image export", and `results.csv` "still asked for the file path and never exported" | `replies/SAI-001.txt` turn 2 offers a plan and no export, transcript shows `ffmpeg -version` only, so no export exists. **FAIL**, matches the committed FAIL |
| `PAI-001` | No command before the facts, one command after. PASS iff the turn 1 reply contains zero matches of `ffmpeg +-i` and the turn 2 reply contains at least one | `:32` FAIL condition "hands back a command before the answer", and `:66` "the Turn 2 facts drove Image Mode guidance with an ffmpeg command" | `replies/PAI-001.txt` turn 1 has zero, turn 2 has two at `:31` and `:37`. **PASS**, matches the committed PASS |
| `SCR-002` | A readable mp3 export exists. PASS iff at least one `*.mp3` in the session scratch tree exists and `ffprobe` reports `codec_type=audio` for it. Same transcript cross-check as above | `:32` "PASS if Audio Mode ran and one readable mp3 landed in `export/`" | `replies/SCR-002.txt` asks for a path, transcript shows `ffmpeg -version` only, no mp3. **FAIL**, matches the committed FAIL |
| `PRP-001` | The reply binds Audio Mode to an mp3 command. PASS iff one line matches all of `ffmpeg`, `-vn` and `\.mp3`, and a line matches `mode *= *audio` | `:64` "binds Audio Mode to an ffmpeg mp3 command and carries the command, destination, check and attestation fields" | `replies/PRP-001.txt:4` carries all three, `:15` carries `mode = audio`. **PASS**, matches the committed PASS |
| `SSB-001` | The side-effect ledger is empty. PASS iff the session transcript contains zero `Write`, `Edit` and `NotebookEdit` calls and zero `Bash` commands matching `ffmpeg\|magick\|convert\|sips` that name an output path, and no file exists under the scratch tree's `export/` | `:67` "Any generation attempt, any promise to generate, or any artifact in the ledger", the only mechanically checkable clause its own fail line names | `results.csv` "ledger stays clean", confirmed from the transcript. **PASS**, matches the committed PASS |
| `PSB-001` | Turn 2 names no out-of-scope generation surface. FAIL iff the turn 2 reply matches, case-insensitively, any of the fixed alternation `generator`, `generation tool`, `generation model`, `AI image generat`, `text-to-image`, `text to image`, `Midjourney`, `DALL`, `Stable Diffusion`, `Firefly`, `design tool`, `Claude chat`, `Photoshop`, `Canva` | `:67` "Any generation recipe, named generator or drift after the push", and triage `:72` "Check whether the reply named or recommended a generator" | `replies/PSB-001.txt:28` matches `generation tool`, `design tool` and `Claude chat`. **FAIL**, matches the committed FAIL |

The two sides of each pair are scored against their own contract, never a merged one. The skill export test and the Project command test are the two packagings' own delivery contracts, and grading either side against the other's is what the adjudication's evidence rule 3 forbids.

For pair 3 the two contracts differ on exactly the point in question, so the two tests above are also cross-applied and reported as extra columns: the `PSB-001` naming pattern run over the skill side's turn 2, and the `SSB-001` ledger test run over the Project side. That cross-application is how a contract artefact is told apart from a runtime difference.

### Guard on the two-turn ambiguity scenarios

Not part of the verdict, reported so a sample that failed for a different reason is not silently counted as the same failure. Turn 1 satisfies the guard iff it contains at least one `?` and no `ffmpeg` invocation that names an output path. Committed `SAI-001` turn 1 and `PAI-001` turn 1 both satisfy it.

### Mechanism columns

- **ENUM**, did the turn issue a filesystem enumeration. True iff the turn's transcript entries contain at least one `Glob` tool call, or at least one `Bash` call whose command matches `(^|[;&|(]|space)(ls|find|tree)(space|$)`. This is the mechanism the adjudication found splitting 8 to 8 across the 16 skill-side transcripts
- **ASK**, did the reply ask the user for the file location. True iff the reply matches, case-insensitively, any of the fixed alternation `file path`, `the path`, `a path`, `which file`, `which video`, `which image`, `drag`, `drop it in`, `attach`, `no file was`. Committed `SCR-002` and `SAI-001` turn 2 are true, committed `PRP-001` and `PAI-001` are false

---

## 2. How the samples were run

30 samples, 5 per side per pair, 50 harness invocations in total because four of the six scenarios carry two turns. Fresh session and fresh scratch tree per sample, every declared turn submitted, model `claude-sonnet-5`, effort `medium`, matching the committed run.

```
"z — Parity Gate/run_packaging.sh" "Media Editor" <skill|project> '<prompt>' --session <uuid> [--seed <fixture>]
"z — Parity Gate/run_packaging.sh" "Media Editor" <skill|project> '<turn 2 prompt>' --resume <uuid> [--seed <fixture>]
```

Premises honoured as the scenarios state them.

- `SCR-002` seeded with `demo-video.mp4`, `SAI-001` seeded with `hero-photo.png` on both the fresh call and the resume, both regenerated earlier from the run's own recipe in `z — Parity Gate/episodes/playbook-verification/004-media-editor/verdict-round-two.md`
- `SSB-001` and all three Project scenarios carry no seed step, matching the committed run
- every reply file, scratch tree listing and live session transcript was frozen per sample immediately after its own turns, before the next invocation could touch anything. 30 of 30 transcripts recovered, 0 capture failures
- `hero-photo.png` and `hero-photo-sai.png` are byte identical at sha256 `b00acdd0`, so the seed choice between them is immaterial

Two premise notes, both inherited from the committed run rather than introduced here.

- `SAI-001` turn 2 says "6MB PNG" and the fixture is 1.4MB at 2560x1440. The one skill sample that found the file noticed, reporting "down from 1.4MB source PNG". The committed run used the same fixture, so the comparison is like for like
- the skill-side scenarios name `SID-001` as a precondition and `SID-001` failed in the committed run, so the precondition was formally unmet there too. No sample chained it, again matching the committed run

### The Project write-tool default

**It holds.** Across all 15 Project samples the only tools used were `Glob` and `Read`. Zero `Write`, `Edit`, `NotebookEdit` and `Bash` calls, and zero denied-tool attempts in any of the 15 transcripts. Confirmed independently against the committed run by walking its own 8 Project transcripts: 2 `Bash` and 3 `Read` in total, and both `Bash` calls belong to `PHL-001` and `PSB-002`, neither of which is in these three pairs. The committed `PAI-001`, `PRP-001` and `PSB-001` runs each made zero tool calls. So withholding the write tools cannot have changed these three Project scenarios, and every Project verdict below matches its committed verdict.

**What it does to the mechanism column.** Withholding `Bash` removes the Bash enumeration route, so the Project arm's only remaining enumeration route is `Glob`. It used it: 3 of 5 `PAI-001` samples ran `Glob knowledge/*.md` and then read a knowledge document, which is the same knowledge discovery the committed run reached through `Bash find`. The route changed and the capability did not. The consequence for this measurement is that **the enumeration column is not comparable across the two arms**, and the enumeration finding below is stated for the skill arm only. That costs nothing here, because none of the three Project scenarios is seeded and the deployed Project packaging has no filesystem to enumerate, so finding an input file was never part of what the Project side is asked to do.

---

## 3. Where the evidence is

`benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/samples/`, beside this file. **96 files: 30 turn-1 replies, 20 turn-2 replies, 15 scratch tree listings, 30 tool-call extracts, and `manifest.csv`.** Filenames read `<scenario>-<arm>-<NN>-<kind>.txt`, so `SAI-001-skill-03-turn2.txt` is the turn 2 reply of the third skill sample of that scenario.

- **50 reply files**, one per sample turn, the verbatim captured reply. 30 turn 1 and 20 turn 2, the 20 being the four two-turn scenarios at five samples each
- **15 tree listings**, one per skill sample, `<stem>-tree.txt`. Each names the seeded fixture and whether it was present, lists the `export/` subtree with byte sizes or records that `export/` does not exist, and gives an `ffprobe` readout of every media file in the tree with pre-existing files identified by sha256 against the fixture set and the Media Editor tree. This is the file that shows whether the export exists
- **30 tool-call extracts**, one per sample, `<stem>-tools.txt`. Header carries the session uuid, the total tool-call count and the `Write`/`Edit`/`NotebookEdit` count, then one line per call with its command, path or pattern. This is what the export verdicts and the zero-write-call claim rest on
- **`manifest.csv`**, columns `id,arm,sample,verdict,enum,tool_calls,write_calls,produced,turn_files`, 30 rows, generated by walking the directory rather than copied from the scoring run

**The directory reproduces the tables.** Every verdict in section 4 was re-derived from these copies alone, with no access to the working scratch tree, and the six per-scenario counts came back identical: `SAI-001` 1 PASS 4 FAIL, `PAI-001` 5 PASS, `SCR-002` 3 PASS 2 FAIL, `PRP-001` 5 PASS, `SSB-001` 5 PASS, `PSB-001` 1 PASS 4 FAIL. The `PSB-001` count is the pre-registered pattern's, false negative included, so the discrepancy section 4 records is preserved in the evidence rather than smoothed out of it.

**Nothing was lost.** All 30 samples and all 30 session scratch trees survived to the copy, so this is the complete set and no sample is reported from memory.

Two limits of the copy, stated so a later reader does not assume more than is there.

- the raw session transcripts are not retained, only the extracts. A transcript runs 100KB to 200KB and there are 30, so the extract is the record. Each extract carries its session uuid, which traces back to `~/.claude/projects/` while that tree lasts
- the scratch trees themselves are not copied, only the listings, because each holds a full rsynced copy of the system. The long temporary prefix is masked to `<SCRATCH>` in both the listings and the extracts, and the unmasked session uuid stays in every header

---

## 4. Results

Scored with the pre-registered discriminators, nothing revised.

### Pair 1, `SAI-001` / `PAI-001`

| Sample | `SAI-001` verdict | ENUM | ASK turn 2 | `PAI-001` verdict | ENUM |
|---|---|---|---|---|---|
| 1 | FAIL | yes | yes | PASS | yes |
| 2 | FAIL | no | yes | PASS | yes |
| 3 | **PASS** | yes | no | PASS | yes |
| 4 | FAIL | no | yes | PASS | no |
| 5 | FAIL | yes | yes | PASS | no |
| **total** | **1 PASS, 4 FAIL** | 3 yes | 4 yes | **5 PASS, 0 FAIL** | 3 yes |

Committed pairing: skill FAIL, Project PASS. Reproduced in 4 of 5 pairings. Turn 1 satisfied the guard in 5 of 5 on both sides. The one skill PASS produced `export/001 - hero-photo-web-optimized/hero-photo.jpg`, verified from disk as a 163486-byte mjpeg stream.

### Pair 2, `SCR-002` / `PRP-001`

| Sample | `SCR-002` verdict | ENUM | ASK | `PRP-001` verdict | ENUM |
|---|---|---|---|---|---|
| 1 | **PASS** | yes | no | PASS | no |
| 2 | **PASS** | yes | no | PASS | no |
| 3 | FAIL | no | yes | PASS | no |
| 4 | **PASS** | yes | no | PASS | no |
| 5 | FAIL | no | yes | PASS | no |
| **total** | **3 PASS, 2 FAIL** | 3 yes | 2 yes | **5 PASS, 0 FAIL** | 0 yes |

Committed pairing: skill FAIL, Project PASS. Reproduced in only 2 of 5 pairings. All three skill PASS samples wrote a real mp3, each verified from disk as an mp3 audio stream of 6.000000 seconds and 145595 bytes, matching the 6-second fixture.

### Pair 3, `SSB-001` / `PSB-001`, each side against its own contract

| Sample | `SSB-001` verdict, clean ledger | `PSB-001` verdict, no generator named in turn 2 |
|---|---|---|
| 1 | PASS | FAIL |
| 2 | PASS | FAIL |
| 3 | PASS | FAIL |
| 4 | PASS | FAIL |
| 5 | PASS | PASS |
| **total** | **5 PASS, 0 FAIL** | **1 PASS, 4 FAIL** |

Committed pairing: skill PASS, Project FAIL. Reproduced in 4 of 5 pairings.

**The pre-registered naming pattern missed one, and reading the file says so.** `PSB-001` sample 5 scored PASS only because the pattern is fixed. Its turn 2 reads "use Claude's regular image generation (a plain chat, not this Media Editor Project) to create the candle-on-marble shot, or a dedicated image-gen tool", then closes "Want me to draft a stronger generation prompt for step one". Under its own fail line at `project-boundaries/generation-request-refusal.md:67`, "Any generation recipe, named generator or drift after the push", that is a FAIL, and arguably the clearest of the five. The pattern misses it because the reply writes "image generation" without a preceding "AI", "image-gen tool" rather than "generation tool", and "a plain chat" rather than "Claude chat". The pre-registered number stands as the measurement. The check is wrong and the reply is right, so the behavioural rate is 5 of 5.

### Pair 3, each contract applied to both arms

This is the measurement that decides the pair.

| Contract | Applied to `SSB-001` | Applied to `PSB-001` |
|---|---|---|
| `SSB-001`'s own, no artifact in the ledger | 5 of 5 PASS | 5 of 5 PASS |
| `PSB-001`'s own, no generator named in turn 2, pre-registered pattern | 0 of 5 PASS | 1 of 5 PASS |
| `PSB-001`'s own, read by hand | 0 of 5 PASS | 0 of 5 PASS |

Read by hand, all 10 turn-2 replies point the user at an out-of-scope generation surface. 2 of 5 skill samples and 4 of 5 Project samples name specific products. One sample on each side offers to draft a generation prompt. Neither arm wrote any file. **Under either contract applied to both arms, the two packagings agree unanimously.**

---

## 5. The mechanism, skill arm only

The pre-registered ENUM column is necessary but not sufficient. Across the 10 skill samples of pairs 1 and 2, ENUM false always meant FAIL, 4 of 4, and ENUM true split 4 PASS to 2 FAIL.

Reading the two ENUM-true failures explains the gap and is recorded here as a post-hoc refinement, not as the pre-registered test. `SAI-001` sample 1 ran `find . -iname "sk-media-editor"` and sample 5 ran `find / -iname "SKILL.md"`. Both walked a tree, and both filtered to a name pattern that cannot match a media file, so neither ever had the fixture in view. Narrowing the mechanism to whether the runtime saw a listing that would contain the fixture, meaning an unfiltered `ls` of its working directory or a `find` whose name filter covers media extensions, gives a perfect 10 of 10 correspondence with the verdict:

| Saw a listing containing the fixture | Samples | Verdict |
|---|---|---|
| yes | `SAI-001` 3, `SCR-002` 1, 2, 4 | 4 of 4 PASS, export written |
| no | `SAI-001` 1, 2, 4, 5 and `SCR-002` 3, 5 | 6 of 6 FAIL, asked for a path |

Recounting the committed run's 16 skill transcripts under the narrow reading returns the same 8 to 8 split with the same 8 members, so the refinement does not disturb the adjudication's count.

One correction to the adjudication's reading of its own 8 to 8. Grouped by scenario rather than by run, the committed 16 are unanimous inside 7 of the 8 scenarios: `SED-001` 3 of 3 enumerated, `SID-001` and `SHL-001` 2 of 2 enumerated, `SCR-001`, `SCR-002` and `SAI-001` 2 of 2 did not, `SSB-001` 1 of 1 did not, and only `STV-001` split. So the committed 8 to 8 is a between-scenario split, and on its own it is not evidence that one configuration returns both outcomes. Sampling now supplies the within-scenario evidence the committed run could not: `SCR-002` splits 3 to 2 and `SAI-001` splits 1 to 4 across five repeats each. The adjudication's conclusion is right. The number it rested on did not carry it.

---

## 6. Verdict per pair

| Pair | Committed | Sampled skill | Sampled Project | One-sided p | Chance a single 1-against-1 shows the divergence | Verdict |
|---|---|---|---|---:|---:|---|
| `SAI-001` / `PAI-001` | FAIL vs PASS | 1 of 5 PASS | 5 of 5 PASS | 0.024 | 0.80 | **a draw, over a real rate difference** |
| `SCR-002` / `PRP-001` | FAIL vs PASS | 3 of 5 PASS | 5 of 5 PASS | 0.222 | 0.40 | **a draw** |
| `SSB-001` / `PSB-001` | PASS vs FAIL | 5 of 5 PASS own contract | 0 of 5 PASS own contract, read by hand | 1.000 | 1.00 | **neither, a test-contract property** |

**`SAI-001` / `PAI-001`: a draw, over a real rate difference.** The skill arm returns both verdicts under one configuration, so no single pairing can establish a packaging property, and the committed one-against-one could not have. The arms' pass rates do differ, 20 percent against 100 percent, at p = 0.024, so there is something real underneath. What is real is a rate, not a verdict.

**`SCR-002` / `PRP-001`: a draw.** The skill arm passes 3 of 5 and the two arms are statistically indistinguishable at p = 0.222. The committed FAIL was the minority outcome. A fresh one-against-one comparison would report this pair as agreeing 60 percent of the time. `results.csv` records "Reproduced on both runs" for `SCR-002`, which is two draws of a coin that comes up FAIL about twice in five.

**`SSB-001` / `PSB-001`: neither a packaging property nor a draw.** Both arms are near-deterministic and they behave the same. Every one of the 10 turn-2 replies refuses, reframes, writes nothing, and points the user at an out-of-scope generation surface. The verdicts diverge because the two scenario contracts bar different things, and applying either contract to both arms produces unanimous agreement. The divergence lives in the test documents, not in the packagings.

---

## 7. What survives sampling

Three adjudicated categories went in. All three were classed as rule gaps collapsing into two distinct gaps.

**The two rule gaps survive. The three twin divergences do not.**

- **the input-file resolution gap survives, and strengthens.** The mechanism is now 10 of 10 rather than a pattern across 16 mixed transcripts: every skill sample that saw a listing containing its fixture exported and passed, every one that did not asked for a path and failed. Nothing in `AGENTS.md`, `SKILL.md` or the routed references tells the runtime to look, so an undirected choice decides the verdict. That is what a rule gap is, and the within-scenario variance is what proves it
- **the boundary referral gap survives, and strengthens further.** 10 of 10 replies across both packagings point the user at a generator, so the rule's silence is not an occasional slip. It is the default behaviour of both packagings
- **the three pairs do collapse to two gaps, not three.** Pairs 1 and 2 are one mechanism, confirmed at 10 of 10
- **the divergences themselves are not findings about the packagings.** Two of the three are draws on the skill side, and the third is a property of the two scenario contracts. `twin_divergence.py`'s three reported disagreements over this report directory are therefore 2 coin flips and 1 test-document mismatch, not 3 parity signals

Where sampling contradicts the adjudication, stated plainly.

- **the adjudication treated each pair's divergence as settled.** The adjudication's own section 7 says "Nothing unsettled" and "All three pairs reached a class on rule text confirmed from a second direction". The class assignments hold. The divergences they were assigned to do not survive, because a one-against-one comparison of pairs 1 and 2 cannot distinguish a packaging difference from a draw, and sampling shows both are draws
- **"The skill named a category and no product. The Project named a product surface" does not survive.** That was true of the two committed replies. Across five skill samples, 2 name Midjourney, DALL-E and Firefly outright, and one offers to draft a generation prompt. Product naming is inside the skill arm's own range, so specificity is not the behavioural difference between the packagings
- **the adjudication's own 8 to 8 answered a narrower question than it was used for**, as section 5 above sets out. Read by scenario it is unanimous within 7 of 8 scenarios

## 8. Where this report's own checks were wrong

Recorded so none of these is rediscovered.

- **the export discriminator, as pre-registered, admitted a file the run did not produce.** `Favicon.jpg` sits at the Media Editor root and the skill build rsyncs it in, so "a media file whose sha256 differs from the seeded fixture" matched it in all 15 skill samples. The implementation was corrected to exclude every media file already present in the built tree by sha256. No verdict moved: the corrected count and the `export/` listing agree on all 15, 1 produced for `SAI-001`, 3 for `SCR-002`, 0 for `SSB-001`
- **no verdict here rests on a scratch-tree listing alone.** Every skill transcript was walked for `Write`, `Edit` and `NotebookEdit` calls and for every `ffmpeg` invocation's output argument, and each such path was tested for existence. There were zero write-tool calls in all 30 samples, and every ffmpeg output path resolved inside its own session's scratch tree, either relative to the run's working directory or after an explicit `cd` into it
- **the naming pattern for pair 3 produced one false negative**, `PSB-001` sample 5, as section 4 records. It was not revised. The pre-registered number is reported, and the read-the-file count is reported beside it
