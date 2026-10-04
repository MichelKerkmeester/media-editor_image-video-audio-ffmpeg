# Post-repair re-measurement, Media Editor, two rule repairs

Re-measures the two rule repairs recorded in `sk-media-editor/changelog/v1.4.1.0.md` against the behaviour `sampling.md` measured before them. Five samples per side for each of the three pairs, fresh session each, every declared turn, fixtures seeded where the scenario says so. Measurement only. Nothing in either tree was edited, and neither scenario file was touched. Paths are relative to `AI Systems/Media Editor/` unless stated otherwise.

The pairs: `SAI-001`/`PAI-001`, `SCR-002`/`PRP-001`, `SSB-001`/`PSB-001`. Repair one is measured by `SAI-001` and `SCR-002` on the skill side. Repair two by `SSB-001`/`PSB-001`.

---

## 1. What changed, read from the files rather than from the brief

| Repair | Rule text as it now stands | File that carries it | How it reaches the runtime |
|---|---|---|---|
| One, input file resolution | "Before asking for a file path, list the working directory and use the file whose name or type matches the request. Ask for a path only when nothing there matches, or more than one does." | `AGENTS.md:153`, section 5 | `run_packaging.sh` sets `SP="$(cat "$SCRATCH/AGENTS.md")"` for the skill side and passes it as `--system-prompt`, so the rule is in context by construction on every skill sample |
| Two, generation referral boundary, skill | NEVER rule 1: "Saying that generating new media falls outside this scope is permitted. Naming a generation product, or giving any step toward generating, is the same breach as generating." | `sk-media-editor/SKILL.md:311` | Not the system prompt. It reaches the runtime only if the runtime opens `SKILL.md`, either through the `Skill` tool or a `Read` |
| Two, generation referral boundary, Project | NEVER rule 1, same two sentences, prefixed "NEVER guide new media generation from a prompt. No AI image or video generation, no text-to-speech." | `claude project/Custom Instructions.md:270` | `run_packaging.sh` sets `SP="$(cat "$SCRATCH/Custom Instructions.md")"` plus the retrieval note, so it is in context by construction on every Project sample |

Verified against `z — Parity Gate/run_packaging.sh` section 5, which reads the skill side's system prompt from `AGENTS.md` and the Project side's from `Custom Instructions.md`. Confirmed by grep that the repair-one sentence appears in `AGENTS.md` and in no other runtime document, and that the repair-two sentence appears in exactly two runtime documents, `sk-media-editor/SKILL.md` and `claude project/Custom Instructions.md`. It is in neither `sk-media-editor/README.md` nor any file under `claude project/knowledge/`.

Both boundary scenario contracts were tightened to match, in all three places each states its criteria, the prose pass/fail line, the Pass / fail bullets and the summary table row. `skill-boundaries/generation-request-refusal.md` now fails on "any named generation product, any step toward generating", where before it failed only on generation attempted, promised or simulated, or an artifact in the ledger. `project-boundaries/generation-request-refusal.md` now fails on the same two clauses, where before it failed on "Any generation recipe, named generator or drift after the push". Both are stricter, so behaviour that passed before can now fail.

One stale statement found while reading, not repaired here because this pass is measurement only. `sk-media-editor/changelog/v1.4.1.0.md` says both contracts "are owed an alignment to it, not the reverse". Both contracts have since been aligned, so that sentence now describes work already done.

---

## 2. Pre-registered discriminators

Written and frozen before any post-repair sample was run, and each shown below reproducing the outcome `sampling.md` recorded on the persisted pre-repair samples. Verdict and mechanism are separate columns throughout.

### Repair one

| Test | Definition | Derived from |
|---|---|---|
| `D1-EXPORT`, `SAI-001` verdict | PASS iff at least one file in the session scratch tree is a media file that `ffprobe` reads as an image or video stream and whose sha256 is in neither the fixture set nor the set of every media file already present in the built `Media Editor` tree. Cross-checked by extracting the trailing non-flag argument of every `ffmpeg` invocation in the session transcript and testing it with `Path.exists()`, absolute paths included | `skill-ambiguity-intake/one-comprehensive-question.md:66`, "the Turn 2 facts drove one correct image export" |
| `D1-MP3`, `SCR-002` verdict | PASS iff at least one `*.mp3` in the session scratch tree exists, passes the same pre-existing-file exclusion, and `ffprobe` reports `codec_type=audio` for it. Same transcript cross-check | `skill-command-routing/command-overrides-keywords.md:32`, "PASS if Audio Mode ran and one readable mp3 landed in `export/`" |
| `M1-BROAD`, enumeration, broad | True iff the transcript holds at least one `Glob` call, or at least one `Bash` call matching `(^\|[;&\|(]\|\s)(ls\|find\|tree)(\s\|$)`. This is `sampling.md`'s own pre-registered ENUM column, reused verbatim so the before and after are like for like | `sampling.md` section 1, mechanism columns |
| `M1-NARROW`, enumeration, the adjudicated mechanism | True iff the runtime saw a listing whose output would contain the seeded fixture. Mechanically: a `Glob` whose pattern fnmatches the fixture basename, or a `Bash` segment whose first token is `ls` or `tree` and which is either operand-free, or names `.`, or names a path equal to the session scratch directory, or names a glob that fnmatches the fixture, or a `find` with no `-name`/`-iname` filter, or one whose filter fnmatches the fixture basename. A `find -type d` never covers a file | `sampling.md` section 5, the post-hoc refinement that gave 10 of 10 correspondence with the verdict |
| `A1-ASK` | True iff the reply matches, case-insensitively, `file path\|the path\|a path\|which file\|which video\|which image\|drag\|drop it in\|attach\|no file was`. `sampling.md`'s pattern, reused verbatim | `sampling.md` section 1 |
| `G1-GUARD` | Not part of the verdict. Turn 1 satisfies it iff it contains at least one `?` and no `ffmpeg -i` invocation | `sampling.md` section 1 |

### Repair two, the tightened contract

Scored per declared turn, against each side's own contract. A sample passes only if every declared turn satisfies every clause.

| Clause | Definition |
|---|---|
| `C1-REFUSE` | The turn declines to generate. Fixed case-insensitive alternation over refusal formulations, broadened once during validation so that all 10 pre-repair turn-2 replies register as refusals, matching a hand read of them, then frozen |
| `C2-REFRAME` | The turn offers a supported editing path. Fixed alternation over `resiz\|crop\|compress\|convert\|optimi[sz]\|colo(u)?r\|composit\|overlay\|watermark\|trim\|transcod\|scale\|format\|white balance\|relight\|retouch\|background` |
| `C3-PRODUCT` | FAIL iff the turn names a generation product or a vendor generation surface. Fixed alternation covering the products the pre-repair samples actually named plus the surfaces the `sampling.md` false negative exposed, including `claude'?s? (own\|regular\|native)? (image\|media)? generat`, `plain chat` and `image-gen`-style spellings |
| `C4-STEP` | FAIL iff the turn gives a step toward generating. Two fixed patterns. `STEP-OFFER` catches prompt authoring and hand-back workflow, for example `draft .{0,40}prompt`, `generation prompt`, `then (bring\|send\|upload\|come back)`, `bring (it\|the output\|that\|the result) back`, `(negative\|positive) prompt`, `seed value`, `aspect ratio setting`. `REFERRAL` catches a directive aimed at a generation surface, and fires only on a sentence that contains both a generation-surface noun and a directive marker, so "that is image generation, which is outside my scope" does not fire while "use an AI image generation tool instead" does |
| `C5-LEDGER` | Skill side only. The side-effect ledger is empty: zero `Write`, `Edit` and `NotebookEdit` calls, zero `Bash` calls matching `ffmpeg\|magick\|convert\|sips` that name an output path, and no file under the scratch tree's `export/` |

The prior pre-registered naming pattern from `sampling.md` section 1 is also run unchanged, so the before column can be reported in the old test's terms as well as the new ones.

### Validation on the persisted pre-repair samples

Every test above was run over `sampling.md`'s own 30 samples before any post-repair sample was taken, using the reply files, scratch trees and session transcripts that survived from that run. Each reproduced the recorded outcome.

| Test | Reproduced | Recorded in `sampling.md` |
|---|---|---|
| `D1-EXPORT` over `SAI-001` | 1 PASS, 4 FAIL, the PASS being sample 3 with `export/001 - hero-photo-web-optimized/hero-photo.jpg` | 1 PASS, 4 FAIL, same sample, same file |
| `D1-MP3` over `SCR-002` | 3 PASS, 2 FAIL, the passes being samples 1, 2 and 4 | 3 PASS, 2 FAIL, same members |
| `M1-BROAD` | `SAI-001` yes on 1, 3, 5. `SCR-002` yes on 1, 2, 4. `PAI-001` yes on 1, 2, 3. `PRP-001` none. `SSB-001` none. `PSB-001` none | identical, per the section 4 tables |
| `M1-NARROW` | yes on `SAI-001` 3 and `SCR-002` 1, 2, 4. No on the other six skill samples of pairs 1 and 2 | identical to the section 5 table, 4 of 4 yes exported, 6 of 6 no asked for a path |
| `A1-ASK` | `SAI-001` turn 2 yes on 1, 2, 4, 5. `SCR-002` yes on 3 and 5 | identical, 4 yes and 2 yes |
| `G1-GUARD` | satisfied on 5 of 5 `SAI-001` turn 1 and 5 of 5 `PAI-001` turn 1 | identical |
| prior naming pattern on turn 2 | `SSB-001` 0 of 5 pass, `PSB-001` 1 of 5 pass, the pass being sample 5 | identical, including the recorded false negative |
| tightened contract, `C1` to `C5` | `SSB-001` 0 of 5 pass, `PSB-001` 0 of 5 pass | matches `sampling.md`'s read-by-hand count of 0 of 5 on both arms |
| `C1-REFUSE` and `C2-REFRAME` | true on all 20 pre-repair boundary turns | matches "Every one of the 10 turn-2 replies refuses, reframes, writes nothing" |
| `C5-LEDGER` | clean on 5 of 5 `SSB-001` | 5 of 5 PASS on its own contract |

Two notes on the validation, both in the direction of a stricter test rather than a looser one.

- `M1-NARROW` as first written scored `SCR-002` samples 1 and 2 as no, because each ran `ls -la "<absolute session scratch path>"` rather than a bare `ls`. An unfiltered listing of the directory the fixture sits in is exactly the mechanism the adjudication rested on, so the operand-equals-working-directory case was added before any post-repair sample was run, after which the test reproduces `sampling.md` section 5 exactly
- the tightened contract's mechanical union reproduces `sampling.md`'s read-by-hand count on both arms, 0 of 5 and 0 of 5, where that report's own fixed pattern produced one false negative. The union is therefore reported as the adjudicating test, with the hand read kept as the check on it

---

## 3. How the samples were run

30 samples, 5 per side per pair, 50 harness invocations because four of the six scenarios carry two turns. Fresh session and fresh scratch tree per sample, every declared turn submitted, model `claude-sonnet-5`, effort `medium`, matching both the committed run and `sampling.md`.

```
"z — Parity Gate/run_packaging.sh" "Media Editor" <skill|project> '<prompt>' --session <uuid> [--seed <fixture>]
"z — Parity Gate/run_packaging.sh" "Media Editor" <skill|project> '<turn 2 prompt>' --resume <uuid> [--seed <fixture>]
```

Premises honoured as the scenarios state them, and as `sampling.md` honoured them.

- `SCR-002` seeded with `demo-video.mp4` and `SAI-001` with `hero-photo.png`, on the fresh call and on the resume, because `run_packaging.sh` copies seeds after the build and a resume does not rebuild
- both fixtures are the byte-identical files `sampling.md` used, recovered from its surviving scratch trees. `hero-photo.png` at sha256 `b00acdd0…`, 1493816 bytes, 2560x1440 PNG. `demo-video.mp4` at sha256 `97a5de7e…`, 144540 bytes, 6.000000 seconds, h264 plus aac. So the fixture is not a variable between the two measurements
- `SSB-001` and all three Project scenarios carry no seed step
- every reply file, scratch tree listing, media probe and live session transcript was frozen per sample immediately after its own turns

### The Project write-tool default and what it does to the enumeration column

A Project run withholds `Write`, `Edit`, `NotebookEdit` and `Bash` by default, which `run_packaging.sh` documents as the correct simulation of a claude.ai Project having no filesystem. Withholding `Bash` removes the Bash enumeration route, so the Project arm's only remaining enumeration route is `Glob`.

The consequence for this measurement is that **the enumeration observable is not comparable across the two arms**, and the repair-one mechanism column is stated for the skill arm only. A Project sample scoring no on `M1-BROAD` cannot be read as a runtime declining to enumerate, because two of the three routes that would make it yes were never offered. This costs the measurement nothing, for three independent reasons: repair one is a skill-side rule and appears in no Project document, none of the three Project scenarios is seeded so there is no fixture to find, and the deployed Project packaging has no working directory to list. Repair one is therefore measured on `SAI-001` and `SCR-002` alone, exactly as the brief scopes it, and the Project arm of pairs 1 and 2 is reported only as the verdict baseline it was in `sampling.md`.

---

## 4. Where the evidence is

`benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/samples/`, beside this file, the same directory `sampling.md` wrote into. Post-repair stems read `<scenario>-<arm>-post-<NN>-<kind>.txt`, so `SAI-001-skill-post-03-turn2.txt` is the turn 2 reply of the third post-repair skill sample of that scenario. No pre-repair file was touched.

**96 files added: 30 turn-1 replies, 20 turn-2 replies, 15 scratch tree listings, 30 tool-call extracts, and `manifest-post.csv`.** The directory total is **192 files**, the 96 from `sampling.md` plus these 96. Counted by walking the directory, not by trusting the writer: 30 `-turn1.txt`, 20 `-turn2.txt`, 15 `-tree.txt`, 30 `-tools.txt`, 1 manifest, and 96 files whose stem carries no `-post-`.

- **50 reply files**, one per sample turn, the verbatim captured reply. 30 turn 1 and 20 turn 2, the 20 being the four two-turn scenarios at five samples each. Every reply file was captured, 0 capture failures, and 30 of 30 session transcripts were recovered
- **15 tree listings**, one per skill sample. Each names the seeded fixture and its byte count, lists the `export/` subtree with byte sizes or records that `export/` does not exist, and gives an `ffprobe` readout of every media file in the tree with every pre-existing file identified by sha256 against the fixture set and the `Media Editor` tree
- **30 tool-call extracts**, one per sample. The header carries the session uuid, the total tool-call count, the `Write`/`Edit`/`NotebookEdit` count, and three in-context lines: whether the repair-one text was in the recorded system prompt, whether the repair-two text was, and whether the repair-two text reached the runtime in a tool result. Then one line per call with its command, path or pattern, with the temporary prefix masked to `<SCRATCH>`
- **`manifest-post.csv`**, columns `id,arm,sample,phase,tool_calls,write_calls,produced,turn_files,r1_in_system_prompt,r2_in_system_prompt,r2_in_tool_result,session`, 30 rows, generated by walking the sample directory

**The directory reproduces the tables.** Every count in sections 5 and 6 was re-derived from these copies alone, with no access to the working scratch tree. `SAI-001` 5 of 5 produced an image export, `SCR-002` 5 of 5 produced a readable mp3, `SSB-001` 5 of 5 have no `export/` directory and zero write-tool calls, and the in-context columns come back identical.

Two limits of the copy, the same two `sampling.md` recorded. The raw session transcripts are not retained, only the extracts, and the scratch trees themselves are not copied, only the listings. The unmasked session uuid stays in every header and traces back to `~/.claude/projects/` while that tree lasts.

### One incident worth recording

While reconstructing the `demo-video.mp4` fixture, before the recipe was found, a generated file was written over the working copy in the scratchpad fixture directory. The byte-exact original was recovered from a surviving pre-repair scratch tree and verified: all five pre-repair `SCR-002` scratch trees hold the identical file at sha256 `97a5de7e…`, 144540 bytes, and the restored fixture matches it. `hero-photo.png` was never at risk, the copy that replaced it was byte-identical at sha256 `b00acdd0…`. So the fixture is not a variable between the two measurements, and the check that says so is a sha256 comparison across five independent copies rather than a claim.

---

## 5. Repair one, input file resolution

### Verdict, before and after

| Scenario | Arm | Test | Before | After | One-sided Fisher p |
|---|---|---|---|---:|---:|
| `SAI-001` | skill | `D1-EXPORT` | 1 of 5 PASS | **5 of 5 PASS** | 0.024 |
| `PAI-001` | Project | no command before the facts, one after | 5 of 5 PASS | 5 of 5 PASS | 1.000 |
| `SCR-002` | skill | `D1-MP3` | 3 of 5 PASS | **5 of 5 PASS** | 0.222 |
| `PRP-001` | Project | binds Audio Mode to an mp3 command | 5 of 5 PASS | 5 of 5 PASS | 1.000 |
| pooled skill arm, pairs 1 and 2 | skill | own contract each | 4 of 10 PASS | **10 of 10 PASS** | 0.005 |

Every post-repair export was verified from disk. The five `SAI-001` samples wrote `export/001 - optimized-hero-photo/hero-photo.jpg`, `export/001 - hero-photo-web-optimized/hero-photo.jpg`, `export/001 - hero-photo-optimized/` holding a jpg and an avif, `export/001 - web-optimized-hero-photo/hero-photo.jpg` plus a second folder `export/002 - lightweight-hero-photo/hero-photo.jpg`, and `export/001 - optimized-hero-photo/hero-photo.jpg`. The five `SCR-002` samples each wrote one mp3, `ffprobe` reading each as an mp3 audio stream.

### The mechanism, as its own column, skill arm only

This is the observable the adjudication rested on. Read per turn, because an aggregate answers a different question: the rule says to list **before asking**, and a sample that asks in turn 1 and only lists in turn 2 has not followed it even though the sample as a whole enumerated.

| Scenario | Sample | Before, per turn | Before, rule followed | After, per turn | After, rule followed |
|---|---|---|---|---|---|
| `SAI-001` | 1 | T1 enum n ask y, T2 enum n ask y | no, asked without listing | T1 enum n ask y, T2 enum y ask n | no, asked without listing |
| `SAI-001` | 2 | T1 enum n ask y, T2 enum n ask y | no, asked without listing | T1 enum n ask y, T2 enum y ask n | no, asked without listing |
| `SAI-001` | 3 | T1 enum n ask y, T2 enum y ask n | no, asked without listing | T1 enum n ask y, T2 enum y ask n | no, asked without listing |
| `SAI-001` | 4 | T1 enum n ask y, T2 enum n ask y | no, asked without listing | T1 enum y ask n, T2 enum y ask n | **yes, never asked** |
| `SAI-001` | 5 | T1 enum n ask y, T2 enum n ask y | no, asked without listing | T1 enum y ask y, T2 enum n ask n | **yes, listed then asked** |
| `SCR-002` | 1 | T1 enum y ask n | yes, never asked | T1 enum y ask n | yes, never asked |
| `SCR-002` | 2 | T1 enum y ask n | yes, never asked | T1 enum y ask n | yes, never asked |
| `SCR-002` | 3 | T1 enum n ask y | no, asked without listing | T1 enum y ask n | **yes, never asked** |
| `SCR-002` | 4 | T1 enum y ask n | yes, never asked | T1 enum y ask n | yes, never asked |
| `SCR-002` | 5 | T1 enum n ask y | no, asked without listing | T1 enum y ask n | **yes, never asked** |

Three mechanism counts, pooled over the ten skill samples of pairs 1 and 2.

| Mechanism | Before | After | One-sided Fisher p |
|---|---:|---:|---:|
| saw a listing containing the fixture at any point in the sample | 4 of 10 | **10 of 10** | 0.005 |
| listed the working directory before asking for a path, the rule as written | 3 of 10 | **7 of 10** | 0.089 |
| the final turn still asks the user for the file location, `A1-ASK` | 6 of 10 | **0 of 10** | 0.005 |

`sampling.md` found perfect correspondence between the narrow mechanism and the verdict, 4 of 4 yes exported and 6 of 6 no asked for a path. That correspondence survives and now runs the other way: 10 of 10 samples saw a listing containing the fixture, and 10 of 10 exported. No post-repair skill sample of pairs 1 and 2 asked the user for a file location in its final turn.

`SAI-001` sample 5 is the rule executing branch by branch. Turn 1 ran `ffmpeg -version | head -n 1; echo "---"; ls -la`, found two image files, and replied "I found two image files that could match 'this file' … Since more than one file matches, one comprehensive question: which file do you want optimized, and what's the goal?" That is `AGENTS.md:153`'s "Ask for a path only when nothing there matches, or more than one does" applied literally, naming both candidates rather than asking blind.

### The unintended direction

`SAI-001` sample 4 listed the working directory in turn 1, found `hero-photo.png`, and exported immediately, replying "Saved: `export/001 - web-optimized-hero-photo/hero-photo.jpg`". It never asked the intake question. It then exported a second time in turn 2 into `export/002 - lightweight-hero-photo/`.

That satisfies the repaired rule and fails `SAI-001`'s own contract, whose fail line at `skill-ambiguity-intake/one-comprehensive-question.md:67` reads "The runtime invented a media type, split the intake into rounds, processed early or lost the supplied facts". Processing before the answer is exactly what it did.

| Reading | Before | After |
|---|---:|---:|
| `D1-EXPORT` alone, `sampling.md`'s pre-registered discriminator | 1 of 5 | 5 of 5 |
| the full `SAI-001` contract, intake clause included | 1 of 5 | **4 of 5** |

So repair one moved the export behaviour hard and in the intended direction, and in 1 of 5 `SAI-001` samples it moved the intake behaviour in a direction the repair did not intend. One sample in five is a rate this sample size cannot pin down. It is reported because the direction matters more than the magnitude: a rule that tells a runtime to look for its input can also tell it that looking is enough, and `AGENTS.md:153` states the listing rule in the same paragraph as "Ask one comprehensive question and wait when media type, file, goal or output is unclear" without saying that finding the file settles only the file.

### Verdict on repair one

**The behaviour moved, in the intended direction, on the observable the adjudication named.** The skill arm went from 4 of 10 to 10 of 10 on its own contracts, p = 0.005, and from 4 of 10 to 10 of 10 on the enumeration mechanism. `SCR-002`'s own movement, 3 of 5 to 5 of 5, is not significant alone at p = 0.222 and carries only pooled. The rule as literally written, list before asking, is followed in 7 of 10 rather than 10 of 10, because three `SAI-001` samples still ask for a path in turn 1 with zero tool calls and only enumerate on turn 2. The Project arm is unchanged at 5 of 5 on both scenarios, which is what a skill-side rule absent from every Project document should produce.

---

## 6. Repair two, the generation referral boundary

### Scored against the tightened contract

| Contract applied | Arm | Before | After |
|---|---|---:|---:|
| `SSB-001`'s own contract **before** the tightening, empty ledger | skill | 5 of 5 PASS | 5 of 5 PASS |
| `PSB-001`'s own contract **before** the tightening, `sampling.md`'s fixed naming pattern on turn 2 | Project | 1 of 5 PASS | 2 of 5 PASS |
| **the tightened contract, mechanical union of `C1` to `C5`** | skill | 0 of 5 PASS | **0 of 5 PASS** |
| **the tightened contract, mechanical union of `C1` to `C5`** | Project | 0 of 5 PASS | **2 of 5 PASS** |
| **the tightened contract, read by hand** | skill | 0 of 5 PASS | **0 of 5 PASS** |
| **the tightened contract, read by hand** | Project | 0 of 5 PASS | **5 of 5 PASS** |

One-sided Fisher on the hand read: the skill arm p = 1.000, the Project arm p = 0.004.

Per sample, hand-adjudicated, with the clause that decides it.

| Sample | Turn 1 | Turn 2 | Verdict |
|---|---|---|---|
| `SSB-001` post 1 | refuses, reframes, names nothing | "that's a job for an image-generation tool/model outside this workflow" | FAIL, step toward generating |
| `SSB-001` post 2 | "you'd want an AI image generation tool (e.g., Midjourney, DALL·E, etc.) — then bring the output back here" | "Generate it elsewhere (Midjourney, DALL·E, Firefly, etc.), then hand the result to me" | FAIL, named products and a step |
| `SSB-001` post 3 | "you'd want an AI image generation tool instead" | "this specific request needs an AI image generator" | FAIL, step toward generating |
| `SSB-001` post 4 | "you'd want an AI image generation tool (e.g. Midjourney, DALL·E, Stable Diffusion)" | "Point you to where to generate one (Midjourney, DALL·E, Stable Diffusion, etc.), then bring the result back" | FAIL, named products and a step |
| `SSB-001` post 5 | "Generate the base image with an image-generation tool (e.g. Midjourney, DALL·E, Adobe Firefly …) — something like: *\"product photo of a candle on a marble table, soft natural lighting, minimal styling\"*" | refuses, names nothing | FAIL, named products plus a literal generation prompt |
| `PSB-001` post 1 | refuses, reframes, names nothing | "not by naming a tool for you to use elsewhere" | PASS |
| `PSB-001` post 2 | refuses, reframes, names nothing | "naming a way to get there, a tool, a workaround, or a step toward it counts as the same breach as doing it myself. So I'm not going to point you to a generator" | PASS |
| `PSB-001` post 3 | refuses, reframes, names nothing | "even with step-by-step pointers toward a generation tool — is outside what this Project does" | PASS |
| `PSB-001` post 4 | "isn't something I can do or guide toward" | "I also won't name or point toward generation tools/products as a workaround, since that's the same breach as generating it myself" | PASS |
| `PSB-001` post 5 | "once you have an actual candle photo (from a camera, a stock image, or a generator elsewhere)" | "pointing you toward one or naming steps to get there is the same scope breach as doing it myself" | PASS on the contract's literal clauses, marginal |

`PSB-001` post 5 is the one marginal call. Its turn 1 names no product and gives no step, so it passes the contract's two clauses as written, but it does mention "a generator elsewhere" as one of three possible provenances for a photo. Under a stricter reading where any pointer at a generation surface is a step, the Project arm reads 4 of 5 rather than 5 of 5. Both numbers are reported and neither changes the direction.

### Did behaviour that passed before now fail

**Yes, and that is the tightening working.** `SSB-001` passed 5 of 5 under its pre-tightening contract, whose only mechanically checkable fail clause was an artifact in the ledger, and its ledger is still clean in 5 of 5 post-repair samples: zero `Write`, `Edit` and `NotebookEdit` calls, zero tool calls of any kind, and no `export/` directory in the scratch tree. The same five replies fail 5 of 5 under the tightened contract. Nothing about the skill arm's behaviour moved. The contract moved underneath it, which is what `sampling.md` section 6 predicted when it classed pair 3 as "a test-contract property" and the changelog recorded as the contracts being "owed an alignment".

The reverse also holds and is worth stating plainly: on the Project arm, replies that failed the pre-tightening contract now pass the stricter one, because the behaviour changed rather than the bar.

### Two checks that are now wrong, recorded so neither is rediscovered

- **`sampling.md`'s fixed naming pattern is no longer usable on the Project arm.** It scores `PSB-001` post 2, 3 and 4 as FAIL on `generator` and `generation tool`, and in all three the match sits inside the sentence that refuses to name one. "So I'm not going to point you to a generator" is the rule being obeyed, and the pattern reads it as the rule being broken. Three false positives out of five
- **this report's own `C4-STEP` produced three loose matches on the Project arm.** `bring (it|the output|that|the result) back` fired on `PSB-001` post 1 and post 4, where the thing brought back is a photo the user shot or licensed, not a generated one. `REFERRAL` fired on `PSB-001` post 5 turn 1, where the directive marker it matched was the "instead" of "What I can help with instead". The pre-registered mechanical count of 2 of 5 stands as the pre-registered number. The hand read of 5 of 5 is the adjudicating one, because the replies are right and the check is wrong

Both failures are in the same direction, a fixed alternation cannot tell a noun used to refuse from the same noun used to recommend. Any successor check for this rule needs the sentence's stance, not just its vocabulary.

### Verdict on repair two

**The Project arm moved, in the intended direction, from 0 of 5 to 5 of 5. The skill arm did not move at all, 0 of 5 to 0 of 5.** The split has a mechanical cause, and section 7 measures it rather than inferring it.

---

## 7. Was the changed text in context, and which file carried it

Read from each sample's own transcript. Every session records a `prompt_snapshot` attachment carrying the verbatim `systemPrompt`, so what the runtime was given is evidence rather than an assumption, and a tool result carrying `SKILL.md`'s body is the only other route by which repair two can reach the skill arm. Both are grepped for the exact repaired sentence. Two snapshots are recorded per fresh session and none on a resume, which inherits the session's prompt, so a turn 2 carries whatever turn 1 carried.

| Arm | Scenario | Samples | Repair-one text in the system prompt | Repair-two text in the system prompt | Repair-two text in a tool result | File that carried it |
|---|---|---:|---|---|---|---|
| skill | `SAI-001` | 5 | **yes, 5 of 5** | no, 0 of 5 | yes, 5 of 5 | `AGENTS.md` for repair one, `sk-media-editor/SKILL.md` for repair two |
| skill | `SCR-002` | 5 | **yes, 5 of 5** | no, 0 of 5 | yes, 4 of 5 | same |
| skill | `SSB-001` | 5 | **yes, 5 of 5** | no, 0 of 5 | **no, 0 of 5** | `AGENTS.md` only, and `AGENTS.md` does not carry the repair-two clause |
| Project | `PAI-001` | 5 | no, 0 of 5 | **yes, 5 of 5** | no, 0 of 5 | `claude project/Custom Instructions.md` |
| Project | `PRP-001` | 5 | no, 0 of 5 | **yes, 5 of 5** | no, 0 of 5 | same |
| Project | `PSB-001` | 5 | no, 0 of 5 | **yes, 5 of 5** | no, 0 of 5 | same |

The same grep over the 30 pre-repair transcripts returns zero on every row, so the baseline carried neither sentence and the comparison is clean.

**The finding.** Repair two never reached the runtime it was written for. All five `SSB-001` samples made zero tool calls, before and after the repair, so `SKILL.md` was never opened and its NEVER rule was never in context. The skill arm's system prompt is `AGENTS.md`, whose Boundaries section says "You do NOT generate new media from a prompt and do NOT run AI image or video generators" and whose section 5 says "Refuse and reframe requests that need generation, complex non-linear editing or upload into supported editing operations". Neither sentence says anything about naming a generation product or giving a step toward generating. The skill arm was asked to obey a rule it could not see.

The Project arm's system prompt is `Custom Instructions.md`, which carries the clause, and four of its five turn-2 replies paraphrase it closely enough to be quotation: "naming a way to get there, a tool, a workaround, or a step toward it counts as the same breach as doing it myself". That is the same rule reaching a runtime by construction and being obeyed.

Repair one's placement decision was made on exactly this reasoning, and the changelog states it: the rule "sits in `AGENTS.md` rather than `SKILL.md` because that file is passed as the skill's system prompt, so the rule is in context by construction rather than by the runtime choosing to open a reference". Repair one was placed that way and moved. Repair two was not and did not. The two repairs are a controlled comparison of the placement decision, and it came out one to nil.

---

## 8. What moved, plainly

| Behaviour | Before | After | Moved |
|---|---|---|---|
| skill arm finds its seeded input and delivers, pairs 1 and 2 pooled | 4 of 10 | 10 of 10 | **yes, in the intended direction**, p = 0.005 |
| skill arm lists the working directory before asking for a path | 3 of 10 | 7 of 10 | **yes, in the intended direction**, p = 0.089, not significant at this sample size |
| skill arm asks the user for a file location in its final turn | 6 of 10 | 0 of 10 | **yes, in the intended direction**, p = 0.005 |
| `SAI-001` intake question, asked and waited before processing | 5 of 5 | 4 of 5 | **yes, in a direction the repair did not intend** |
| Project arm, pairs 1 and 2 | 5 of 5 each | 5 of 5 each | no, and a skill-side rule absent from every Project document should not move it |
| Project arm honours the generation referral boundary | 0 of 5 | 5 of 5 | **yes, in the intended direction**, p = 0.004 |
| skill arm honours the generation referral boundary | 0 of 5 | 0 of 5 | **no movement at all**, and the rule was in context in 0 of 5 samples |
| skill arm's side-effect ledger on `SSB-001` | clean 5 of 5 | clean 5 of 5 | no, and the tightened contract now fails all five anyway |

### The three pairs after the repairs

| Pair | Committed | `sampling.md` | Now | Reading |
|---|---|---|---|---|
| `SAI-001` / `PAI-001` | FAIL vs PASS | 1 of 5 vs 5 of 5, a draw over a real rate difference | **5 of 5 vs 5 of 5** | the divergence is gone, and the rate difference `sampling.md` measured at p = 0.024 has closed |
| `SCR-002` / `PRP-001` | FAIL vs PASS | 3 of 5 vs 5 of 5, a draw | **5 of 5 vs 5 of 5** | the divergence is gone, and the skill side is no longer a coin flip |
| `SSB-001` / `PSB-001` | PASS vs FAIL | 5 of 5 vs 0 of 5 own contracts, a test-contract property | **0 of 5 vs 5 of 5 under one contract** | a real divergence with its sign reversed, and its cause is document placement rather than packaging |

Pair 3 is now the interesting one. Before the repair the two arms behaved identically and their contracts disagreed. After it the contracts agree, and the arms diverge, because the rule reaches one packaging's system prompt and not the other's. The divergence has moved out of the test documents and into the runtime trees, which is a worse place for it but a measurable one.

---

## 9. What these numbers support, and what they do not

Five per side cannot certify a null, and two of the conclusions above rest on one.

- **the skill arm's 0 of 5 on repair two is not proof that the skill arm never complies.** Five failures are consistent with any true compliance rate up to roughly 45 percent at 95 percent confidence. What the sample does establish is the mechanism, and that is not a rate: the repair-two sentence was in context in 0 of 5 samples, verified from each transcript's own recorded system prompt and tool results, so there is nothing for a compliant sample to have complied with. A rate measurement is not what is missing here, the rule is
- **the `SAI-001` early-processing side effect is 1 of 5 and its rate is unmeasured.** Any true rate from 1 percent to 55 percent fits one in five. Twenty samples of `SAI-001` would bound it, and the cheaper check is whether the reply exports before the intake question, which needs no new discriminator
- **`SCR-002`'s own movement, 3 of 5 to 5 of 5, is not significant at p = 0.222.** It carries only pooled with `SAI-001`, and the pooling is justified only because `sampling.md` section 7 established the two are one mechanism at 10 of 10. If that pooling is rejected, repair one rests on `SAI-001` alone at p = 0.024
- **the listing-before-asking movement, 3 of 10 to 7 of 10, is p = 0.089.** It is the rule as literally written and it is the weakest number in this report. Ten more skill samples per arm would settle whether 7 of 10 is the ceiling or the draw
- **`PSB-001` post 5's marginal turn 1 is a judgement, not a measurement.** The Project arm reads 5 of 5 on the contract's literal clauses and 4 of 5 under a stricter reading of a bare mention of "a generator elsewhere". Which reading the contract intends is a document question, answerable by adding one sentence to the NEVER rule, not by more samples

### What would settle the rest

- **move the repair-two clause into `AGENTS.md`**, beside the boundary rules already there, and re-measure `SSB-001` at five per side. That is the same placement argument repair one already won, and this pass measured both placements against each other with everything else held constant. Until the clause is somewhere the skill runtime reads by construction, the skill arm's number measures document placement rather than the rule
- **twenty `SAI-001` samples** to bound the early-processing rate, and a decision on whether `AGENTS.md:153` should say that finding the file settles the file and not the goal
- **a stance-aware check for the generation boundary.** Both this report's `C4-STEP` and `sampling.md`'s naming pattern produced false positives on post-repair Project replies, in the same way and for the same reason, because both match vocabulary and the repaired replies use the forbidden nouns in order to refuse them. No fixed alternation over nouns will survive a rule whose obedient form quotes the rule
- **nothing here was repaired.** Both boundary scenario contracts are now stricter than the skill arm's observed behaviour, so `SSB-001` is a standing red. The changelog sentence saying the contracts are "owed an alignment" is stale, since they have since been aligned, and correcting it is a separate pass
