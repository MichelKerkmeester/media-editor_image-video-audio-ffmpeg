All reading complete. Report follows.

# Media Editor Package Inventory: read-only report

All claims below carry `file:line`. Paths are relative to `AI Systems/Media Editor/` unless prefixed otherwise. The seven `claude project/knowledge/*.md` files are byte-identical to their skill counterparts (verified by `shasum -a 256` and `diff -q`, all seven pairs equal), so line numbers cited for a skill reference apply verbatim to its knowledge mirror. Anything unread is marked UNKNOWN.

## A. Package map: `claude project/`

`wc -c` on `claude project/Custom Instructions.md` = **18086** (bytes; `wc -l` = 313).

| File | Lines | Bytes | Version in name/title | Purpose |
|---|---:|---:|---|---|
| `Custom Instructions.md` | 313 | 18086 | H1 `Media Editor - Custom Instructions - v1.4.3` (:1) | Advisory-only claude.ai Project kernel: routing, MEDIA, ffmpeg-check narration, ALWAYS/NEVER/ESCALATE, chat delivery protocol with attestation line |
| `README.md` | 79 | 5306 | none in name; states "advisory Project kernel v1.4.3, Skill v1.4.3 aligned" (:11), "synthesized ... v1.4.3, aligned to Media Editor Skill v1.4.3" (:31) | Packaging manifest, parity contract, live-upload steps and smoke matrix |
| `kernel-review.json` | 13 | 848 | fields `kernelVersion: 1.1.0`, `alignedSkillVersion: 1.2.0` (:10-11) | Dated one-shot kernel review record; self-declares "Nothing reads this file" (:12) |
| `knowledge/Media Editor - Integrations - MCP Imagician - v0.211.md` | 214 | 6839 | v0.211 (filename + frontmatter title :2 + H1 :15) | ffmpeg image operations reference (mirror of `references/mcp-imagician.md`) |
| `knowledge/Media Editor - Integrations - MCP Video Audio - v0.212.md` | 247 | 9114 | v0.212 (:2, :15) | ffmpeg video/audio operations reference (mirror of `references/mcp-video-audio.md`) |
| `knowledge/Media Editor - Reference - HLS Video Conversion - v0.111.md` | 260 | 11354 | v0.111 (:2, :15) | HLS ladder recipes + bash batch script (mirror of `assets/hls-video-conversion.md`) |
| `knowledge/Media Editor - Rules - Human Voice - EN - v0.210.md` | 692 | 27861 | v0.210 | Full EN Human Voice standard (mirror of symlink target `z — Knowledge/Rules - Human Voice - EN - v0.210.md`) |
| `knowledge/Media Editor - Rules - Human Voice Core - v0.100.md` | 134 | 10328 | v0.100 | Human Voice hard-blocker card (mirror of `z — Knowledge/Rules - Human Voice Core - v0.100.md`) |
| `knowledge/Media Editor - System - Interactive Intelligence - v0.220.md` | 266 | 8958 | v0.220 (:2, :15) | Conversation flow, state machine, question templates (mirror of `references/interactive-intelligence.md`) |
| `knowledge/Media Editor - Thinking - MEDIA Framework - v0.233.md` | 302 | 14994 | v0.233 (:2, :15) | MEDIA thinking framework, RICCE, quality gates (mirror of `references/media-framework.md`) |

Non-package context: `sk-media-editor/SKILL.md` 405 lines/20724 bytes (`version: 1.4.3`, :5); `sk-media-editor/README.md` 401/22352 (`version: 1.4.3.0`, :11).

## B. Advisory-premise sites (exhaustive)

**Kernel `claude project/Custom Instructions.md`**
- `:5` "This is an advisory-only Project kernel. A claude.ai Project cannot run ffmpeg, so it cannot execute media edits, inspect local files or produce edited media."
- `:5` "It answers in chat with the exact command to run, where the result lands and what to check."
- `:15` "Your output is guidance only. Explain which operation to run... Do not claim that this Project processed a file, verified a file on disk or saved an export."
- `:66` "When ffmpeg is missing the operation cannot run, so say so plainly"
- `:72` "Consult Project Knowledge as advisory reference material, not as executable access."
- `:206` "This pseudocode is reference material... it does not execute it. `load(...)` and `verify_ffmpeg(...)` run only in the CLI runtime, never here."
- `:220` "The runtime runs `ffmpeg -version` before any operation... The Project never runs these commands itself."
- `:226` table header "| Mode | Trigger | Advisory output | Runtime tool |"
- `:251` "Export is a runtime action, not a Project action. Recommend saving every processed result to `export/NNN - [description]/` in the CLI runtime or the user's terminal"
- `:251` "...do not claim the file was produced here."
- `:259` ALWAYS 1 "**ALWAYS state the advisory truth.** This Project cannot execute ffmpeg or terminal commands."
- `:259` "Whatever execution or file tools appear to be available, never claim to have run a command, inspected a file or produced media"
- `:260` ALWAYS 2 "ALWAYS answer in chat with the exact command to run, where the result lands and what to check. Never deliver the output as a Canvas Artifact"
- `:265` ALWAYS 7 "ALWAYS recommend saving to `export/NNN - [description]/` in the runtime and tell the user to verify the save"
- `:276` NEVER 7 "NEVER claim this Project uploaded, executed, verified or saved anything."
- `:277` NEVER 8 "NEVER deliver the answer as a Canvas Artifact or claim that one was created."
- `:290` "Answer in chat. Do not deliver a Canvas Artifact. For every actionable request, lead with:"
- `:292` "**Run this:** the exact ffmpeg command or command sequence, with the input and output paths the user must set"
- `:293` "**Result lands in:** `export/[###] - [description]/` in the CLI runtime or the user's terminal"
- `:298` attestation "`... | execution = did not occur | verification = did not occur | save = did not occur | HVR = checked`"
- `:300` "After the block, add two to three short sentences telling the user what to run, where to save the result and what to verify."
- `:306` checklist "The reply is advisory-only and does not claim execution, verification or save"
- `:307` checklist "The reply answers in chat and does not deliver or promise a Canvas Artifact"

**`claude project/README.md`**
- `:3` "Hand-maintained local package for the advisory claude.ai Media Editor Project."
- `:25` "| `Custom Instructions.md` | The advisory-only kernel pasted into the claude.ai Project custom instructions field |"
- `:33` "Tool execution becomes advisory recipes in chat... media export becomes a user-run `export/NNN - [description]/` path in the CLI runtime or terminal."
- `:35` "The kernel must stay advisory-only. Do not add language that claims claude.ai can run ffmpeg, terminal commands or save edited media files"
- `:37` "The Project is a chat-advisory variant. A claude.ai Project cannot run ffmpeg, so it cannot execute media edits."
- `:43` "| Project role | Advisory-only Media Editor for claude.ai Projects |"
- `:61` smoke matrix step 5 "Smoke test `$image`, `$video`, `$audio`, `$hls`, `$repair`, `$interactive` and one ambiguous request"
- `:62` step 6 "Confirm the reply leads with the command to run, the destination and the check step"
- `:63` step 7 "Confirm the reply never claims execution, verification or save, never promises a Canvas Artifact"
- `:77` "This Project is advisory only. It never gains tool execution inside claude.ai"
- `:79` "Preserve the no-execution limitation whenever runtime behavior changes"

**`AGENTS.md`**
- `:150` "`claude project/` is a CHAT-ADVISORY variant. A claude.ai Project cannot run ffmpeg, so it answers in chat with the exact command to run... and it states the no-execution limitation plainly"
- `:152` "When ffmpeg is missing, stop with install guidance, since there is no fallback tool to reach for."
- `:38` (tells the runtime/user to run the check itself) "Check the tool: run `ffmpeg -version`. A missing ffmpeg blocks the work"

**`SYNC.md`**
- `:26` "the Project kernel stops claiming Canvas Artifact delivery and answers in chat with the command to run, where the result lands and what to check."
- `:29` "made the no-filesystem constraint prescriptive... so never claim to have run a command, inspected a file or produced media."
- `:28` "a claude.ai Project has no working directory and legitimately hands back a command with paths the user sets."

**`sk-media-editor/SKILL.md`**
- `:349` "`claude project/Custom Instructions.md` is the chat-advisory Project synthesis, which cannot execute ffmpeg and hands back commands instead"
- `:401` "`claude project/` is the chat-advisory mirror. It cannot execute ffmpeg and instead answers in chat with the exact command to run"

**`sk-media-editor/README.md`**
- `:35` "a second, chat-advisory packaging... for claude.ai, where no terminal is reachable. That variant answers in chat with the exact command to run"
- `:326` "`Custom Instructions.md` remains a hand-synthesized kernel that cannot execute a tool... The no-execution limitation is stated plainly."
- `:363-364` FAQ "Does the claude.ai Project run ffmpeg or save files? No. The Project is advisory only."

**`INSTALL-GUIDE.md`**
- `:53` "`claude project/` cannot execute anything. It answers in chat with the exact command to run... so a reader there still needs ffmpeg on their own machine"

**Knowledge files (mirrors; note: no knowledge file states the advisory premise itself: verified by grep)**
- `Media Editor - Thinking - MEDIA Framework - v0.233.md:179` (= `media-framework.md:179`) "| Implement | Convert the decision into FFmpeg commands | Provide runnable commands for the user |"
- `MEDIA Framework:234` "BLOCKING, check ffmpeg, provide install guidance"
- `MCP Imagician:41` / `MCP Video Audio:41` "If the check fails, stop and give install guidance before any operation."
- `HLS Video Conversion:43` "Unavailable: \"FFmpeg not found, installation required.\""; `:186-189` install-echo lines ("macOS: brew install ffmpeg" / "Ubuntu: sudo apt install ffmpeg" / "Windows: Download from ffmpeg.org")
- `Interactive Intelligence:199` "**FFmpeg not available:** explain that every operation needs ffmpeg on the path, give install commands for macOS, Ubuntu and Windows, and offer to recheck once it is installed."

**Playbook (`sk-media-editor/manual-testing-playbook/`)**
- root `manual-testing-playbook.md:11` "The project set covers... where the answer is chat guidance with the exact command, the destination and the check, and no file is written."
- `:37` coverage row "| Project | ... | No-execution truth | `PNE-001` |"
- `:55` "`PID-001` passes when... claims no file was written and hands back the command with its destination and check."
- `:80` "Project scenarios never create files because the project runtime cannot execute tools."
- `:115` "...the project reply hands back a runnable command with no file claim."
- `:127` blocking defect "A project runtime claim that a file was processed, verified or saved"
- `:128` "A project reply that claims the result was produced here instead of handing back the command"
- `:318` "Verify the project runtime proves itself with the kernel instruction set line... and delivers chat guidance with the no-file claim."
- `:322` PID prompt "...be clear about whether you run it or I do."
- `:338` PGD "Verify the command, destination, check and attestation arrive in chat with no execution claim."
- `:352-364` PNE block ("Cannot execute files", "A plain no-execution statement plus a runnable command, never a fabricated result.")
- `project-no-execution-truth/cannot-execute-files.md:15` "the reply must state plainly that this Project cannot execute ffmpeg or terminal commands... It must never claim it processed, verified or saved anything."
- `:30` "...closes with the attestation line marking execution, verification and save as did not occur"
- `:38` "State that this Project cannot execute tools or produce a file, then hand back the compression command with its destination and check for the user to run."
- `project-identity-handover/identity-handover.md:15` "claiming plainly that no file was written. A reply that could have come from either runtime is a `FAIL`."
- `:19` "Every other project scenario assumes this runtime advises rather than executes."
- `:52` "...closes with the attestation line stating execution, verification and save did not occur, and never claims a written export path as its own work"
- `:60` "then state plainly that nothing was executed or saved here."
- `project-guidance-delivery/chat-guidance-delivery.md:15` "The answer must never claim that this Project executed, verified or saved anything."
- `:30` "...closes with the attestation line stating execution, verification and save did not occur... It never claims a processed file"
- `:31` "One complete chat answer a user can run in their own terminal"
- `project-hls-recipe/ffmpeg-terminal-recipe.md:15` "The Project must hand back the multi-quality ladder command for the user's own terminal... and state plainly that it did not run the conversion."
- `:30` "...closes with the attestation line, and never claims execution"
- `:31` "One complete HLS answer the user can paste into their own terminal"
- `project-command-routing/command-overrides-keywords.md:19` "the Project advises the wrong lane and the CLI executes the right one"
- `project-ambiguity-intake/one-comprehensive-question.md:9` / `project-boundaries/generation-request-refusal.md:9` / `project-boundaries/size-limit-escalation.md:9` "validates ... in the advisory packaging."
- `skill-identity-handover/identity-handover.md:52` "...never claims that no file was written" (skill-side counter-assertion)

**Benchmark fixtures and graders**
- `benchmark/grader/fixtures/sample-report/replies/PID-001.txt:1` "Instruction set: Media Editor claude.ai Project, advisory only, aligned with its uploaded Project Knowledge mirrors."
- `PID-001.txt:13` "mode = image | tool = ffmpeg | execution = did not occur | verification = did not occur | save = did not occur | HVR = checked"
- `PID-001.txt:15` "I do not run commands or touch your files. You run the command above and verify the result yourself."
- `replies/PHL-001.txt:1` "...advisory only. This Project cannot run ffmpeg, so the conversion below is guidance, not a completed job."
- `PHL-001.txt:19` same attestation line, `execution = did not occur`
- `benchmark/grader/twin_divergence.py:13-14` "the Project runtime can only ever hand back a command"
- `:35-36` "`PGD-001` and `PNE-001` test the Project's chat-only limits"
- `:94` `UNPAIRED_IDS = {... "PGD-001", "PNE-001", "PSB-002",  # Project-only`
- `benchmark/grader/lint_replies.py:22-24` "this system's own kernel delivery protocol requires bold field labels such as `**Run this:**`... a blanket ban would fail the shape the kernel itself mandates"
- `benchmark/grader/README.md:17` "eight against the CLI skill runtime and eight against the advisory claude.ai Project"
- `benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/verdict.md` (see E/H; e.g. its section 4 records `AGENTS.md:152` as skill-side-only because "a claude.ai Project has no working directory to enumerate")

**Sync loop (`../z — Claude Project Sync Loop/`)**
- `systems.py:2098` pins verbatim: "'This is an advisory-only Project kernel. A claude.ai Project cannot run ffmpeg...'"
- `systems.py:2129` pins "Your output is guidance only..."
- `systems.py:2449` pins "Export is a runtime action, not a Project action..."
- `systems.py:2462` pins ALWAYS 1 "ALWAYS state the advisory truth..."
- `systems.py:2470` pins ALWAYS 2 "ALWAYS answer in chat with the exact command to run..."
- `systems.py:2515` pins ALWAYS 7 recommend saving to `export/NNN`
- `systems.py:2585` pins NEVER 7 "NEVER claim this Project uploaded, executed, verified or saved anything."
- `systems.py:2593` pins NEVER 8 Canvas Artifact ban
- `runtime-register.md:29` claim 6 "A claude.ai Project cannot write files and cannot run MCP servers or terminal tools", graded **inferred**, with the settling experiment "check whether a connector or code tool changes the result"

## C. CLI-only assumptions that would break in a claude.ai sandbox

**Local export paths / filesystem protocol**
- `AGENTS.md:34` "Save ALL processed media to `export/` before responding to the user. This is non-negotiable."; `:40` `export/[###] - [description]/`; `:52-53` examples `export/001 - resized-product-images/`; `:139` "Export | Save to `export/[###] - [description]/`. Blocking."
- `sk-media-editor/SKILL.md:293` "Export is blocking. Save every processed result to `export/[###] - [description]/` before responding"; `:306` ALWAYS 6; `:370` "Results saved to `export/` and verified before the chat response"
- `sk-media-editor/README.md:35` "Every processed result lands in `../export/`"; `:288-302` export-and-delivery section
- Kernel: `:251`, `:265`, `:293` recommend `export/NNN - [description]/` "in the CLI runtime or the user's terminal" (adapted but path scheme retained)
- `mcp-imagician.md:52` "Write results to `export/[###] - [description]/` in the runtime"; `:157-160` bash batch loop `for file in *.jpg` into `export/001 - resized/`
- `mcp-video-audio.md:52` same export line
- `Interactive Intelligence:50` "saved to `export/` in the runtime"; `:142` "Saved to: export/[### - description]/"; `:158` "delivery -> create output files, save to export/"; `:252` "| Location | export/ folder |"
- `MEDIA Framework:296` checklist "Results validated and saved to `export/`"
- HLS asset `:80-86` `output/` tree, `:180` `OUTPUT_BASE="hls_output"`, `:231` "Test playback: `ffplay ...` or serve with `python3 -m http.server 8000`" (local serving)
- `INSTALL-GUIDE.md:118-123` "mkdir -p export" from "the Media Editor system directory"; `:158-181` round-trip proof in `/tmp/ffmpeg-check.*` with `rm -f` cleanup; `:197` "Permission denied writing the result"

**Working-directory / local-file discovery**
- `AGENTS.md:152` "Before asking for a file path, list the working directory and use the file whose name or type matches the request."
- `SYNC.md:28` "This is skill-side only, since a claude.ai Project has no working directory" (explicit acknowledgment the rule is CLI-shaped)
- `Interactive Intelligence:205` "**File access error:** show the path, then suggest verifying the location, the file permissions and the free disk space."
- `mcp-video-audio.md:238` "Required: FFmpeg on the path, sufficient disk space, read and write permission on the working folders"

**`ffmpeg -version` gate wording (assumes a local shell)**
- `AGENTS.md:38` "run `ffmpeg -version`. A missing ffmpeg blocks the work"; `:134` "Confirm `ffmpeg -version` answers. Block only if ffmpeg is missing"
- `SKILL.md:98` "Confirm `ffmpeg -version` answers before any operation"; `:250` "Check ffmpeg with `ffmpeg -version`"; `:261-266` run `ffmpeg -version`, `ffprobe -version`, `ffmpeg -encoders`, `ffmpeg -filters`; `:301` ALWAYS 1; `:360`, `:366`
- Kernel `:66` "The CLI runtime checks `ffmpeg -version` before any operation"; `:220` "The runtime runs `ffmpeg -version`... The Project never runs these commands itself."
- `mcp-imagician.md:35-41` / `mcp-video-audio.md:35-41` "FFmpeg must be on the path. Check once per session: `ffmpeg -version`"
- HLS asset `:41-45` "Verify FFmpeg before all operations with `ffmpeg -version`... Required: FFmpeg installed, terminal access, write permissions"
- `Interactive Intelligence:45` "FFmpeg check first: confirm `ffmpeg -version` answers in the runtime before any operation"; `:74-80` reply template "Checking FFmpeg. - FFmpeg: [Available/Not available]"; `:256`
- HLS batch script `:184-193` `check_ffmpeg()` using `command -v ffmpeg`

**Install guidance aimed at a personal machine (not a sandbox)**
- `INSTALL-GUIDE.md:86` "brew install ffmpeg"; `:94-95` "sudo apt update / sudo apt install ffmpeg"; `:103` "winget install ffmpeg"; `:106` "Reopen the terminal afterwards, since PATH is read at shell start"; `:190` "reopen the terminal so PATH is re-read"
- `SKILL.md:389` "Installation: `brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Ubuntu, the package manager or a build from ffmpeg.org on Windows"
- HLS asset `:34-36` yaml `installation: macos: "brew install ffmpeg"` etc.; `:187-189` same in script echo
- `sk-media-editor/README.md:378` troubleshooting "Install ffmpeg (`brew install ffmpeg`, `sudo apt install ffmpeg`, or a build from ffmpeg.org)"
- `mcp-imagician.md:41` / `mcp-video-audio.md:41` "If the check fails, stop and give install guidance before any operation."
- `Interactive Intelligence:199` "give install commands for macOS, Ubuntu and Windows" (no pip/apt-in-sandbox option anywhere in the corpus)
- Nothing in the corpus mentions `pip install imageio-ffmpeg`, static binaries, or sandbox package installation. UNKNOWN by absence.

**Docker/MCP leftovers (Imagician / Video-Audio naming)**
- Filenames kept on purpose: `AGENTS.md:84-85`, `:90` "The two integration reference files keep their `mcp-` file names"; `:115-116` DAG rows
- `SKILL.md:115` "keep their historical `mcp-` prefixes"; `:338-339` reference list; `:350` "byte-identical copies... for claude.ai upload"
- Kernel `:21`, `:110-112` (RESOURCE_MAP paths `references/mcp-imagician.md`, `references/mcp-video-audio.md`), `:218`, `:224` "Full detail: `Media Editor - Integrations - MCP Imagician.md`..."
- `claude project/README.md:16-17` structure tree "MCP Imagician" / "MCP Video Audio"; `:53` "keep their `MCP Imagician` and `MCP Video Audio` upload names because the parity declaration and every cross reference point at them"
- Knowledge filenames themselves carry `MCP Imagician` / `MCP Video Audio` (all 7 pairs' declared names in `z — Claude Project Sync Loop/systems.py:2066-2079`)
- Physical leftovers: `mcp servers/imagician/`, `mcp servers/video-audio/` (Dockerfiles, compose files, `dist/index.js`), `mcp servers/RETIRED.md:1` "These two server directories are no longer part of the Media Editor system."
- **Stale benchmark router (pre-re-scope)**: `benchmark/router/route_contract.py:65-72` `TOOL_MAP = {"IMAGE": "imagician", "VIDEO": "video-audio", "AUDIO": "video-audio", ...}` and `:73-79` `FALLBACK_MAP` with `"ffmpeg"` fallback; `:60-62` comment "the fallback is Terminal FFmpeg for image, video and audio when the MCP server is down"; `:91` `TOOL_VALUES = ["imagician", "video-audio", "ffmpeg", "auto"]`
- `benchmark/router/fixtures.json:6-7` `"tool": "imagician", "fallback": "ffmpeg"` (and `:22-23`, `:37-38`, `:52-53`, `:67-68`, `:82-83`, `:142`, `:157`, `:172`, `:186`, `:217` same shape)
- `benchmark/router/README.md` route-object example shows `"tool": "video-audio", "fallback": "ffmpeg"` and the "Tool binding" bullet "IMAGE binds Imagician, VIDEO/AUDIO bind Video-Audio... Image, video and audio declare a Terminal FFmpeg fallback"
- Historical (read-only context): `sk-media-editor/changelog/v1.2.0.0.md:25`, `:84`, `:100` (MCP-first + `fallback = [none|Terminal FFmpeg]` attestation field)

**Barter / owner-specific assumptions**
- `AGENTS.md:7` "You are the **Media Editor** for Barter."; `sk-media-editor/SKILL.md:12` "Media editing specialist for Barter"; `sk-media-editor/README.md:3` "Media Editor skill for Barter" (kernel itself carries no "Barter", verified)
- `SYNC.md:22` onward: review notes are owner-signed ("Michel Kerkmeester, with Claude Code") and machine-specific ("this fleet's machine", `:27`; `INSTALL-GUIDE.md:89` "Measured on this fleet's machine, Homebrew's ffmpeg 9.0.1...")
- `INSTALL-GUIDE.md:21` "My media workspace location is: [your path]" (single-operator workspace framing)

## D. What the kernel says about ffmpeg missing / install guidance (quoted)

- `Custom Instructions.md:66` "When ffmpeg is missing the operation cannot run, so say so plainly"
- `:220` "...and stops with install guidance when ffmpeg is missing. The Project never runs these commands itself."
- `:282` ESCALATE 2 "**ESCALATE IF ffmpeg is missing.** State that every operation needs ffmpeg on the path and give install guidance"
- `:283` ESCALATE 3 "...exceeds the installed build or practical limits. Explain the limit and suggest a supported alternative such as another format or splitting the file"

The kernel names no install command itself (no brew/apt/pip text in `Custom Instructions.md`, verified); the commands live in the knowledge mirrors (`HLS Video Conversion:34-36`, `:187-189`; `Interactive Intelligence:199`) and in `SKILL.md:389` / `INSTALL-GUIDE.md`.

## E. Tests and gates asserting the advisory behavior

**Playbook scenarios (contracts that would fail if the Project starts executing)**
- `PNE-001`: `manual-testing-playbook.md:352-368` + `project-no-execution-truth/cannot-execute-files.md:15,30,38,64,75`: asserts a plain no-execution statement + attestation `execution = did not occur`; FAIL on "a fabricated result" (which today means any claimed output).
- `PID-001`: `manual-testing-playbook.md:312-328` + `project-identity-handover/identity-handover.md:52-54,86,97`: asserts "claims no file was written", attestation with "did not occur", and "FAIL if... could have come from either runtime"; grades on the kernel "instruction set line as it reads at run time" (`:42`).
- `PGD-001`: `manual-testing-playbook.md:332-348` + `project-guidance-delivery/chat-guidance-delivery.md:15,30,75`: asserts the `Run this / Result lands in / Check this` block + attestation "did not occur"; FAIL on "a delivery promised as produced here".
- `PHL-001`: `manual-testing-playbook.md:448-464` + `project-hls-recipe/ffmpeg-terminal-recipe.md:30-31,65`: asserts the ladder is "for the user's own terminal", "never claims execution"; FAIL if "execution is claimed".
- `PRP-001`: `manual-testing-playbook.md:372-388` + `project-command-routing/command-overrides-keywords.md:30`: asserts "hands back an ffmpeg command" with attestation.
- `PAI-001`: `manual-testing-playbook.md:392-408` + `project-ambiguity-intake/one-comprehensive-question.md:30-32`: asserts "hands back no command yet" in Turn 1, delivery fields + attestation in Turn 2.
- `PSB-001` / `PSB-002`: `manual-testing-playbook.md:412-444`: generation refusal and 8GB size escalation "in the advisory packaging" (`size-limit-escalation.md:9`).
- Root policy: `manual-testing-playbook.md:80` "Project scenarios never create files because the project runtime cannot execute tools"; `:127-128` blocking defects for any project claim of processing/producing.
- Skill-side twins that encode the opposite runtime: `skill-identity-handover/identity-handover.md:52,54,87` FAIL "if... the reply claims no file was written"; `SED-001` (`manual-testing-playbook.md:282-288`) expects a real `export/[###]` folder.
- `STV-001` (`manual-testing-playbook.md:212-228`, `skill-tool-verification/missing-ffmpeg-refusal.md`): expects a stop + "install guidance... for macOS, Ubuntu and Windows": the skill-runtime missing-ffmpeg contract.

**Graders / gates**
- `benchmark/grader/twin_divergence.py:82-95`: `TWIN_PAIRS` (SID/PID, SCR-002/PRP-001, SAI/PAI, SSB-001/PSB-001, SHL/PHL) and `UNPAIRED_IDS` declaring `PGD-001`, `PNE-001`, `PSB-002` "Project-only" because they "test the Project's chat-only limits" (`:35-36`).
- `benchmark/grader/lint_replies.py:22-24` + `grader/README.md:66-70`: exempts asterisk emphasis *because* the kernel mandates bold `**Run this:**` labels: i.e. the linter encodes the advisory delivery shape.
- `benchmark/grader/fixtures/sample-report/`: `results.csv` (17 rows incl. `SID-001-rerun`) and replies `PID-001.txt`, `PHL-001.txt` carrying "advisory only" / "did not occur" strings (B above).
- `benchmark/gates/rule_parity.py:69-120` RULES pin verbatim phrases that a Project rewrite would move: e.g. `:77-81` five ffmpeg-precondition phrases ("FFmpeg must be on the path. Check once per session:", "If the check fails, stop and give install guidance before any operation.", etc., `min_pairs: 5`), `:86` "Encoder availability varies by build.", `:104` "Write results to `export/[###] - [description]/` in the runtime" (`min_pairs: 2`). Any wording change on one side of a pair fails the gate (`:230-233`).
- `benchmark/router/run_fixtures.sh` + `fixtures.json` (17 fixtures): currently green against the **pre-re-scope** MCP tool binding (C above): the routing oracle itself would need re-contracting.
- Sync-loop gates (`../z — Claude Project Sync Loop/`):
  - `systems.py:2085-2760` `residency` rows pin ~45 kernel statements verbatim with `statement_key` hashes, including the advisory ones (`:2098`, `:2129`, `:2449`, `:2462`, `:2470`, `:2515`, `:2585`, `:2593`); `residency_check.py` (`statement_present`, `check_system`) fails when a pinned statement leaves its home.
  - `validate_parity.py` (via `benchmark/parity/run_parity.sh`) checks the seven declared pairs + inventory; `run_receipts.sh`/`write_receipt.py` hash kernel + knowledge dir into an upload receipt (example line: `z — Claude Project Sync Loop/benchmark/reports/2026-09-15-gate-landing/receipt-check.md:17` "kernel H1 v1.3.1 key sha256:... uploaded 7 files key sha256:...").
  - `carrier_query_evidence.py:153-162, 306-307, 392-394` names media-editor mirrors as evidence pairs for carrier queries.
  - `runtime-register.md:29` grades the no-execution premise **inferred** and names the settling experiment ("check whether a connector or code tool changes the result"): the premise the new spec overturns is itself registered as unverified.
- Format gates: `z — Claude Project Sync Loop/validate-output-format.cjs` contains no Media Editor-specific rule (grep for "media" returned nothing relevant; its `ATTESTATION` regex at `:455` targets document footers, not the kernel's `execution = did not occur` line). `run_packaging.sh` has no media-editor block. No format gate asserts advisory behavior (no-hit, confirmed by grep).

## F. Sync contract (`SYNC.md` + `claude project/README.md`)

- Derivation: `SYNC.md:8-13`: the AI System Sync Compiler is retired; kernel and every knowledge file are hand-written from skill sources; the four-step manual parity method (pair by name against `SKILL.md`, `references/*.md`, `assets/**/*.md`; drop loading/routing lines, keep decision rules; check the read-only commit-timestamp drift list; record each review as a dated sentence in `SYNC.md` or the system README).
- Byte parity: `claude project/README.md:51` "Every knowledge file is a byte-for-byte copy of its skill source... refreshed by copying the source file"; `:70-71` run `bash benchmark/parity/run_parity.sh` before live upload; `SKILL.md:401` "every reference pair is byte identical."
- No manifest: `SYNC.md:15` "No manifest, lock file or checksum ledger is kept."
- Kernel versioning: `SYNC.md:17` "Bump the version in the `Custom Instructions.md` H1 in the same change that edits it... A rule change is a minor bump, a wording or typo fix is a patch." Skill and kernel versions move independently (`SYNC.md:22`).
- Knowledge naming: `claude project/README.md:60` "Keep the house display name for each mirror, `Media Editor - <Section> - <Title> - v<version>.md`, and remove any superseded mirror when a copy is refreshed"; `:53` integration mirrors keep `MCP Imagician` / `MCP Video Audio` upload names because "the parity declaration and every cross reference point at them."
- Kernel review recording: `SYNC.md:13` "Record each review as a dated sentence below or in the system README: who reviewed, what changed, what was decided"; `claude project/README.md:69` same, as a checklist step; `SYNC.md:19-21` review-notes template. `kernel-review.json:12` is explicitly non-authoritative ("Nothing reads this file... parity is checked by benchmark/parity/run_parity.sh plus hand-reading").
- Upload is manual and unverifiable from the repo: `claude project/README.md:5` "The live Project is push-only from this folder because the claude.ai UI has no repository lock"; `:72` "Re-upload changed files to the live Project and confirm the upload took."
- Shared-knowledge rule (relevant here): `SYNC.md:22` "this system holds no shared-knowledge mirror": but the two HVR sources are symlinks into `z — Knowledge/` (`sk-media-editor/references/hvr-core.md` -> `../../../z — Knowledge/Rules - Human Voice Core - v0.100.md`, confirmed by `ls -la`; `rule_parity.py:176-182` documents the symlink shape).

## G. Statements on size limits, uploads, output delivery, sandbox capabilities

- Size limits: `SKILL.md:313` NEVER 3 "Flag very large inputs plainly and suggest splitting"; kernel `:272` NEVER 3 same; kernel `:283` ESCALATE 3; `mcp-video-audio.md:232-239` performance table (Under 100MB / 100MB-1GB / Over 1GB timings) + "Large files take minutes"; `sk-media-editor/README.md:357-358` "What is the file size limit? There is no MCP ceiling any more. Practical limits are disk space and processing time."; `HLS:242` "Large file size: raise CRF to 26... or drop the 1080p variant"; `mcp-imagician.md:210` "Keep enough free disk space for the output"; PSB-002 scenario uses an "8GB raw footage" prompt (`manual-testing-playbook.md:438`), PGD-001 uses "40MB webinar video" (`:342`).
- Upload handling: every "upload" mention concerns either uploading to external platforms (banned: kernel `:17`, `:35`; `SKILL.md:67`, `:317`) or uploading knowledge files to claude.ai (`README.md:26`, `:59`). No statement exists about receiving, size-capping, or processing user-uploaded media inside the Project. UNKNOWN by absence.
- Output delivery: kernel Section 5 (`:288-300`) "Run this / Result lands in / Check this" + attestation + 2-3 closing sentences; Canvas Artifact bans (`:260`, `:277`, `:290`); skill-side export-first (`AGENTS.md:32-61`, `SKILL.md:291-293`).
- Sandbox/platform capabilities: `claude project/README.md:78` "Project Knowledge may be retrieved as chunks rather than full files"; `SYNC.md:29` no-filesystem constraint "prescriptive... whatever tools appear available"; `runtime-register.md:27` custom-instructions size cap "unmeasured"; `runtime-register.md:29` "A claude.ai Project cannot write files and cannot run MCP servers or terminal tools" graded **inferred** (2026-09-14): the corpus contains no evidence about the code-execution sandbox described in the task brief. UNKNOWN here; the brief's premise is not evidenced in any file read.

## H. Open risks

- The sync loop pins the advisory kernel statements verbatim (`z — Claude Project Sync Loop/systems.py:2098, 2449, 2462, 2585` etc.); an execution-capable kernel rewrite turns `residency_check.py` red unless the shared declaration is amended in the same change, and that file is owned outside this lane (`rule_parity.py:130-136`).
- `benchmark/gates/rule_parity.py:75-105` counts verbatim phrases like "Write results to `export/[###] - [description]/` in the runtime" across pairs; any sandbox-adapted wording in the shared knowledge mirrors breaks the count on one side only.
- The benchmark router is stale against the 2026-09-16 re-scope (`route_contract.py:65-79` binds imagician/video-audio with a "Terminal FFmpeg" fallback; `fixtures.json:6-7`), contradicting `SKILL.md:98`/`:397` "no MCP layer... no fallback relationship": the 17 "passing" fixtures prove the retired contract.
- Four playbook scenarios (PNE/PID/PGD/PHL) hard-code "did not occur" attestations and no-file claims as PASS conditions (`project-no-execution-truth/cannot-execute-files.md:30`, `project-identity-handover/identity-handover.md:52`); execution capability inverts these verdicts, and PID-001's "instruction set line" grading (`:42`) couples to the kernel H1.
- `twin_divergence.py:92-95` declares PGD/PNE/PSB-002 Project-only "by design"; if execution lands, the twin scheme and its docstring rationale need re-declaring or divergence reporting goes silent on changed behavior.
- Last run's blocking gates `SID-001` and `PID-001` are both FAIL with no adjudication (`verdict.md`, "What nobody recorded"): the system already misses its own release-readiness rule (`manual-testing-playbook.md:138`).
- `verdict.md` also found the generation-refusal scenario files internally inconsistent (`### Pass / fail` prose vs section 2 contract after commit `3f2f931`): a live contradiction in the test documents any new contract work will sit next to.
- `claude project/kernel-review.json:10-12` is stale (kernelVersion 1.1.0, 2026-07-18, "Nothing reads this file") and `runtime-register.md:27` describes a README byte-count note that no longer exists in `claude project/README.md`: record-keeping drift around the package.
- The very premise being replaced is registered as unverified (`runtime-register.md:29`, grade "inferred"), and the corpus carries no evidence for the code-execution-sandbox claim either; both sides of the coming change rest on claims no local artifact settles.
- Barter identity is baked into `AGENTS.md:7`, `SKILL.md:12`, `sk-media-editor/README.md:3` while the kernel is already de-Bartered; a "for any claude.ai user" packaging diverges further from the skill identity that `PID-001`/`SID-001` use for runtime discrimination (`skill-identity-handover/identity-handover.md:42`).

REPORT_END