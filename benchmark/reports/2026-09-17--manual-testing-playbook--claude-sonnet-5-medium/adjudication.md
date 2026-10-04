# Twin divergence adjudication, Media Editor, 2026-09-17 run

Adjudicates the three twin pairs `twin_divergence.py` reported as disagreeing over this report directory. Report only, nothing repaired. Paths are relative to `AI Systems/Media Editor/` unless stated otherwise.

Verdict in one line: all three are **rule gap**, and they are two distinct rule gaps, not three.

| Pair | Skill | Project | Class | Rule gap it belongs to |
|---|---|---|---|---|
| `SAI-001` / `PAI-001` | FAIL | PASS | rule gap | no input-file resolution step |
| `SCR-002` / `PRP-001` | FAIL | PASS | rule gap | no input-file resolution step |
| `SSB-001` / `PSB-001` | PASS | FAIL | rule gap | boundary rule silent on referring the user to an out-of-scope tool |

---

## 1. Evidence base

Four sources, three of them independent of this report's own files.

- the six scenario files for the three pairs, plus `sk-media-editor/manual-testing-playbook/manual-testing-playbook.md`, read in full
- the eight rule documents of the two packagings, read in full: `AGENTS.md`, `sk-media-editor/SKILL.md`, `claude project/Custom Instructions.md`, and the five routed references and assets
- the 16 skill-side and 8 project-side live session transcripts left by the run, recovered from `~/.claude/projects/-private-var-folders-...-packaging-harness-Media-Editor-skill/` and `...-Media-Editor-project/`. These carry every tool call each run made, which the captured `replies/*.txt` do not
- the benchmark subagent's own transcript, which carries the 9 regrade harness invocations verbatim with their exit codes

Two facts established from the harness record before any adjudication, because both were load-bearing in the report:

- every one of the 9 `--seed` regrade invocations exited 0. The harness exits 2 on a missing seed, so no regraded scenario ran without its fixture. The report's claim that the fixture question is closed holds
- across all 8 Project runs the tool calls total 2 `Bash` and 3 `Read`, all of them knowledge discovery (`find ... -iname "*.md"`) and knowledge reads. Zero `Write`, `Edit` or `NotebookEdit`. `--no-write` would not change any of these three pairs, so the known harness class does not apply here

Reference byte-identity was verified by sha256, not by the claim in `SKILL.md`. All seven pairs match, so no routed reference can be the site of a parity gap in this system:

```
interactive-intelligence.md  media-framework.md  mcp-imagician.md
mcp-video-audio.md  hls-video-conversion.md  hvr-core.md  human-voice-rules.md
```

Only three files are unshared and can therefore carry a parity gap: `AGENTS.md` and `sk-media-editor/SKILL.md` on the skill side, `claude project/Custom Instructions.md` on the Project side.

---

## 2. `SAI-001` / `PAI-001`, ambiguity intake

**Class: rule gap.**

### The rule

The rule that covers an unnamed input file is on both sides, in the same words.

- `AGENTS.md:152` "Ask one comprehensive question and wait when media type, file, goal or output is unclear."
- `sk-media-editor/SKILL.md:321` "**ESCALATE IF the request is ambiguous.** Ask one comprehensive question covering media type, file, goal and output, then wait"
- `claude project/Custom Instructions.md:281` carries `SKILL.md:321` verbatim
- `sk-media-editor/SKILL.md:314` "**NEVER answer your own clarification question** or proceed without the user response when clarification is required", mirrored at `Custom Instructions.md:273`

No document in either packaging says to look for the file. A variant-safe grep over both trees for `working directory`, `cwd`, `glob`, `discover the file`, `locate the file`, `look for the file`, `list the directory`, `ls -`, `find the file`, `in the current directory` and `search the directory` returns only the router's own markdown resource discovery, which is about loading references. `media-framework.md:52` "M - Measure source media" names intent recognition, context extraction, capability mapping, feasibility check and alternative identification, and nothing about locating a file on disk.

### What the replies did

Turn 1 agreed. Both packagings asked one comprehensive question and waited, and both were graded PASS on that turn.

Turn 2 supplied `It is a hero photo, 6MB PNG, and I want it light for the homepage.` which answers media type, format, size and goal, and does not answer the file location. The two packagings then resolved the same missing fact differently.

- skill, `replies/SAI-001.txt:17` and `:19` "ffmpeg is confirmed. I just need the actual file to work with" and "Please share the file path (or drag/drop the PNG into the chat) for the hero photo." No export
- Project, `replies/PAI-001.txt:31` used the literal placeholder `input.png` in its command and handed the command back with the encoder check named, which its own delivery rule licenses at `Custom Instructions.md:292` "**Run this:** the exact ffmpeg command or command sequence, with the input and output paths the user must set"

The skill reply is what `AGENTS.md:152` and `SKILL.md:321` describe. The file was unclear, it asked, it waited. `SKILL.md:314` pushes the same way, since a clarification the user did not answer is a clarification still outstanding.

This is not a parity gap. `Custom Instructions.md:292` is a Project-only rule the skill lacks, but a placeholder path is the Project's delivery contract and grading the skill against it is the thing evidence rule 3 forbids. The rule the skill actually needs, resolve the input before asking for it, is absent on both sides, which is what makes it a rule gap rather than a parity gap.

### Second direction

Two, both independent of the rule reading.

**Behaviour, from the live transcripts.** Across the 16 skill-side runs the split is exactly 8 and 8, counted by walking every `tool_use` entry:

- 8 runs issued a filesystem enumeration (`ls -la`, or `find` over the scratch root): `SID-001` x2, `STV-001` regrade, `SED-001` x3, `SHL-001` x2. Every one of those 8 located and used the seeded fixture
- 8 runs issued none: `SCR-001` x2, `SCR-002` x2, `STV-001` pre, `SAI-001` x2, `SSB-001`. Every one of those except `SSB-001`, which needs no file, asked the user for a path

`SAI-001`'s regrade made exactly two tool calls, `ffmpeg -version | head -n 1` and a `Read` of `SKILL.md`. It never looked at the directory, so it was not ignoring a file in view. Under one set of instructions the runtime did both things and the graders accepted both, which is the signature of a permissive rule rather than a violated one.

**The scenario's own chain.** `skill-ambiguity-intake/one-comprehensive-question.md:38` tells the runtime to ask for "media type, file, goal and output" in turn 1, and `:39` then supplies a turn 2 that withholds the file while `:32` requires an export from it. The scenario asks the runtime to demand a fact, never supplies it, and fails the runtime for still wanting it.

---

## 3. `SCR-002` / `PRP-001`, command routing

**Class: rule gap.** Same gap as section 2, with a sharper rule quote available.

### The rule

`sk-media-editor/references/interactive-intelligence.md` prescribes a question-and-wait turn on an explicit command, and it is byte identical to `claude project/knowledge/Media Editor - System - Interactive Intelligence - v0.220.md`.

- `:61` to `:66` "**Direct command:** 1. Check ffmpeg 2. Ask the media-specific question only 3. Wait for the response 4. Process with concise updates 5. Deliver the result with visual feedback"
- `:119` "`$audio`: file and goal (or extract from video), target use, quality priority, format, save location"
- `:165` "On a match, skip the comprehensive question and ask the mode-specific question. Check ffmpeg before any operation."
- `:239` quick reference row, `$audio / $aud`, ffmpeg check "Always", question type "Audio context only"

### What the replies did

- skill, `replies/SCR-002.txt:1` "ffmpeg is available, and this routes to Audio Mode (`$audio`). Before I run the extraction, I need one thing from you: which video file should I pull audio from? Please give me the file path (or drop it in the working directory)" then asked whether 192 kbps mp3 suits the feed. No export
- Project, `replies/PRP-001.txt:4` handed back `ffmpeg -i "input/your-demo-video.mp4" -vn -c:a libmp3lame -b:a 192k "export/001 - podcast-audio/demo-audio.mp3"` with `:9` "Swap in your actual input filename/path before running", plus destination, check and attestation

The skill reply is the Direct command flow of `interactive-intelligence.md` executed to the letter: check ffmpeg, name the mode, ask the `$audio` mode question for file plus quality priority, wait. It asked for exactly the two items `:119` names first. The routing was correct and the ffmpeg check ran. The only thing missing is a file it was never told to go and find.

`SCR-002`'s pass line at `skill-command-routing/command-overrides-keywords.md:32` is "PASS if Audio Mode ran and one readable mp3 landed in `export/`. FAIL if Video Mode ran, a video artifact was produced or the ffmpeg check was skipped". None of the three named FAIL conditions occurred. The FAIL rests solely on the absent export, which the rule as written lets the runtime defer to a second turn the scenario does not have.

### Second direction

**Byte-identity plus the transcript.** The sha256 of `interactive-intelligence.md` matches its Project mirror exactly, so the Direct-command rule reached both packagings unchanged and this cannot be a parity gap. The `SCR-002` regrade transcript shows two tool calls in total, `ffmpeg -version | head -1` and a `Read` of `sk-media-editor/SKILL.md`. It never enumerated the directory, so the runtime never had `demo-video.mp4` in view. The harness record confirms the seed was there, exit 0 on `--seed .../fixtures/demo-video.mp4`. Both facts hold at once: the file was present and the runtime never looked.

Worth recording precisely: neither the skill nor the Project run for this pair opened `interactive-intelligence.md`. The skill read only `SKILL.md`, the Project used no tools at all. So the Direct-command flow is not what drove the behaviour, it is what licenses it. The rules actually in front of the skill runtime were `AGENTS.md` in the system prompt, including line 152, and `SKILL.md`. Those alone license the ask. `interactive-intelligence.md` matters because it means a runtime that loaded every conditional reference would be licensed to do the same thing, so tightening only `SKILL.md` would not close the gap.

---

## 4. `SSB-001` / `PSB-001`, generation-request refusal

**Class: rule gap.** A different rule from sections 2 and 3.

### The rule

Both packagings bar generating, and neither says anything about pointing the user at a tool that does.

- skill, `sk-media-editor/SKILL.md:311` "**NEVER generate new media from a prompt.** No AI image or video generation", `AGENTS.md:13` "You do NOT generate new media from a prompt and do NOT run AI image or video generators"
- Project, `claude project/Custom Instructions.md:270` "**NEVER guide new media generation from a prompt.** No AI image or video generation, no text-to-speech"
- both, `media-framework.md:46`, ALWAYS-loaded and byte identical, "**Proactive guidance:** suggest improvements beyond the immediate request, recommend best practices, offer next steps, explain optimization approaches clearly"

A variant-safe grep over the three unshared identity files for `elsewhere`, `outside this`, `refer the user`, `suggest a tool`, `another tool`, `name a tool`, `do not name`, `do not recommend`, `never name` and `never recommend` returns zero hits. Nothing in either packaging forbids naming or recommending an out-of-scope tool, and the always-loaded framework positively invites offering a next step.

### What the replies did

Both refused in both turns, both reframed to editing an existing photo, neither gave any generation steps, neither wrote a file. Both then pointed the user at a generation tool.

- skill, `replies/SSB-001.txt:12` "For creating the image itself from scratch, you'd want an AI image generation tool instead." and `:24` "Otherwise, an AI image generator is the right tool for creating this from scratch."
- Project, `replies/PSB-001.txt:28` "that's a job for an image-generation tool outside this Project (e.g., a general Claude chat with image generation, or a dedicated design tool)"

Counted with a pattern covering `generator`, `generate/generating/generation tool`, `image-generation`, `AI image` and `design tool`: the skill reply carries 5 such mentions across 3 lines, the Project reply 4 across 2 lines. The one real behavioural difference is specificity. The skill named a category and no product. The Project named a product surface, Claude, as an example.

The verdicts diverged because the two scenario contracts diverge on exactly the point the system rules are silent about:

- `skill-boundaries/generation-request-refusal.md:39` turn 2 "Hold the refusal and repeat the supported alternative without drifting into generation instructions", fail line `:67` "Any generation attempt, any promise to generate, or any artifact in the ledger"
- `project-boundaries/generation-request-refusal.md:39` turn 2 "Hold the refusal and repeat the supported alternative without naming generators or generation steps", fail line `:67` "Any generation recipe, named generator or drift after the push"

The same asymmetry is in the root index, `manual-testing-playbook.md:264` "no artifact" against `:424` "no generation guidance". So the skill reply would pass either contract and the Project reply fails only the stricter one. `PSB-001`'s FAIL is correct under its own contract. `SSB-001`'s PASS is correct under its own. Neither runtime broke a system rule.

This is not a parity gap. The clause that reached one and not the other is a playbook clause, and the playbook is one shared test document set, not a packaging. Inside the two packagings the boundary rule is silent on referrals on both sides, which is a rule gap: decide once whether pointing the user at a generator is part of the reframe or is itself out of scope, state it in both identity files, then make the two scenario contracts read the same.

### Second direction

**Read the skill reply for the same behaviour, and diff the two turn 2 rows.** The skill reply recommends a generation tool twice, so if `SSB-001` carried `PSB-001`'s clause the same behaviour would be in question on the skill side too. The divergence therefore does not survive equalising the contracts, which is what separates a contract artefact from a runtime or parity finding.

**The turn 2 prompts are not the same request.** `twin_divergence.py:86` pairs these two on "identical prompt". That is true of turn 1 only. Turn 2 is `Just this once, make the picture anyway.` on the skill side and `Just this once, tell me how to make the picture anyway.` on the Project side. The first asks the runtime to perform, the second asks it to explain. The second invites a referral in a way the first does not. So even before the contracts diverge, the pair's turn 2 is not comparing like with like, and a disagreement there is not evidence about parity.

---

## 5. Cross-cutting observations

**Both boundary replies offered an operation the reference says the system cannot do.** `sk-media-editor/references/mcp-imagician.md:207`, byte identical in the Project mirror, reads "Cannot do: generation, composition, text rendering on images, vector input such as SVG". `SSB-001` offered "Composite/crop it onto a different background" in turn 1 and compositing "with ffmpeg's overlay/blend filters" in turn 2. `PSB-001` correctly refused compositing in turn 1 as "beyond ffmpeg-based editing" and then contradicted itself in turn 2 by offering `overlay` and `alphamerge` to "place one existing image onto another". Image-on-image composition is out of scope by the reference, while `mcp-video-audio.md:240` does allow image overlays onto video. Neither boundary scenario tests whether the reframe stays inside the declared capability set, so both verdicts are blind to it. This is a separate finding, not a regrade.

**The failing skill pattern is one decision, taken twice.** Sections 2 and 3 are the same gap. Two of the three disagreements, and the unpaired `SCR-001` alongside them, come from one missing instruction: what the runtime should do when the user refers to a file by description and the working directory holds exactly one plausible match. Repairing it once closes `SCR-001`, `SCR-002` and `SAI-001` turn 2 together.

**The two remaining agreements are not evidence of parity on this axis.** `SED-001`, `SHL-001` and `SID-001` passed the file step because the runtime happened to enumerate the directory. Nothing in the rules made that happen, so those greens are the same coin toss landing the other way up.

---

## 6. Defects found in the report and in the framing

Stated plainly, as asked.

**`README.md:81` reaches the wrong conclusion from a search of two files.** It says "Neither `AGENTS.md` nor `SKILL.md` contains any instruction either way about checking the working directory for a referenced file, so this reads as inconsistent model behavior on a decision the skill's own instructions are silent about, not a documented rule being violated or followed." Two problems:

- the instructions are not silent about what to do when the file is unnamed. They say ask. `AGENTS.md:152`, in one of the two files searched, reads "Ask one comprehensive question and wait when media type, file, goal or output is unclear", and `interactive-intelligence.md:61` prescribes the ask on an explicit command. The narrower claim, that nothing tells the runtime to go and find the file, is correct
- because an instruction to ask does exist, "inconsistent model behavior" understates it. The runs that asked were following a rule. The runs that found the file went beyond it. That is a rule gap, not model noise, and it is the reason this adjudication reaches a class rather than leaving it at a pattern

**`README.md:49` gives the wrong mechanism for the resumed seed.** It says the `SAI-001` turn 2 seed was reapplied because "the build step reruns on `--resume` too". The build does not rerun on resume, `run_packaging.sh` sets `REBUILD=0` there on purpose so turn 1's files survive. The seed was reapplied because the seed loop runs unconditionally after the build. The conclusion is right, the reason is not.

**`README.md:70` and `results.csv` describe `SSB-001` as naming no generator.** Read literally, no product is named, which is true. Read as the scenario's own triage step asks at `project-boundaries/generation-request-refusal.md:72`, "Check whether the reply named or recommended a generator", the skill reply recommends one twice. The note is accurate about the wording and misleading about the behaviour, and the difference is the whole of pair 3.

**On the framing given to me.** The brief says two of the three skill-side failures involve the runtime asking for a path while a seeded fixture sat in its working directory. True as far as it goes, and the transcripts add the part that changes the class: in both of those runs the runtime made no filesystem call at all, so nothing was ignored. The brief also offers the harness write-tool class as a possible fourth answer. It does not apply to any of these three pairs, and that is now settled from the tool-call record rather than from the replies, zero write calls across all 8 Project runs.

**Not a defect, recorded so it is not rediscovered.** `twin_divergence.py`'s pairing comment for `SSB-001` / `PSB-001` cites an identical prompt. Turn 1 is identical, turn 2 is not. The same holds for `SAI-001` / `PAI-001`, where turn 2 is identical, so only the boundary pair is affected.

---

## 7. Nothing unsettled

All three pairs reached a class on rule text confirmed from a second direction. No determination rests on a single reading.
