---
title: "Media Editor: Manual Testing Playbook"
description: "Operator-facing directory, execution policy and release-readiness guide for the Media Editor manual validation inventory covering the CLI skill runtime and the claude.ai Project runtime, with and without the Media Editor tools."
version: 1.0.0.0
---

# Media Editor: Manual Testing Playbook

This package turns the Media Editor system into reproducible conversations for the skill runtime and the project runtime. The root owns shared policy and indexing. Each linked scenario file owns one synchronized Turn 1 prompt, a conversation chain, one nine-field execution table and current source anchors.

The system ships in two packagings from one source of truth, so the inventory runs twice rather than once. The skill set covers the system as it runs from `AGENTS.md` with `sk-media-editor/` loaded, where the `media-editor` command or locally installed ffmpeg and ffprobe do the work and real files land straight in `media files/export/` under a confirmed readable name, in one numbered folder when an operation writes several files, or at the path a tool returns. The project set covers the same system as it runs from `claude project/Custom Instructions.md` with the Project knowledge documents attached, where the answer without the tools is chat guidance with the exact command, the destination and the check, and no file is written. The route order scenarios cover the `media-editor` command in Claude Code, the connected tools in Claude Desktop and the fallback to installed ffmpeg. A scenario verdict is only meaningful for the runtime named in its Source metadata.

### Result persistence

<!-- MANUAL_PLAYBOOK_RESULT_PERSISTENCE_CONTRACT -->
A scenario run is complete only after its `PASS`, `FAIL`, or `SKIP` outcome and reason are recorded into `benchmark/reports/<dated-run-label>/` at the Media Editor system root, beside `sk-media-editor/`. Generated report Markdown is renderer-owned and never hand-authored.

---

## 1. OVERVIEW

The playbook covers a skill set and a project set. The validator derives the scenario and category counts from the scenario files, so this document does not repeat them. No alternate or supplemental scenario files are part of the package.

Coverage note (2026-10-04): 32 scenarios across 19 categories, 19 for the skill runtime and 13 for the project runtime. Every mode has a scenario, including Repair, and every short alias is covered by `SCR-004`, `SCR-005` and `SRM-001` or by the router fixtures in `benchmark/router/`. The tool route is covered by `SRO-001`, `SED-002`, `SED-004`, `STV-002`, `STV-003`, `PRO-001` and `PED-001`. File naming and the split between the export root and a numbered folder are covered by `SED-001..SED-003`. The one question before a batch and one place for all of its files, across separate calls, are covered by `SED-004` for the skill and `PED-001` for the Project. The setup offer without the tools is covered by `STV-001` for the skill and `PRO-002` for the Project. `CAPABILITY_MISSING` has no scenario, because arranging a tool ffmpeg that lacks one encoder needs a custom build. The router fixtures and the tools reference carry that hand-off instead.

### Coverage map

| Set | Runtime | Category | IDs | Count |
|---|---|---|---|---:|
| Skill | `AGENTS.md` plus `sk-media-editor/` | Identity handover | `SID-001` | 1 |
| Skill | `AGENTS.md` plus `sk-media-editor/` | Command routing | `SCR-001..SCR-005` | 5 |
| Skill | `AGENTS.md` plus `sk-media-editor/`, plugin for `STV-002..STV-003` | Tool verification | `STV-001..STV-003` | 3 |
| Skill | `AGENTS.md` plus `sk-media-editor/` | Ambiguity intake | `SAI-001` | 1 |
| Skill | `AGENTS.md` plus `sk-media-editor/` | Boundaries | `SSB-001` | 1 |
| Skill | `AGENTS.md` plus `sk-media-editor/`, plugin for `SED-002` and `SED-004` | Export delivery | `SED-001..SED-004` | 4 |
| Skill | `AGENTS.md` plus `sk-media-editor/` | HLS streaming | `SHL-001` | 1 |
| Skill | `AGENTS.md` plus `sk-media-editor/`, plugin for `SRO-001` | Route order | `SRO-001..SRO-002` | 2 |
| Skill | `AGENTS.md` plus `sk-media-editor/` | Repair mode | `SRM-001` | 1 |
| Project | `claude project/` package | Identity handover | `PID-001` | 1 |
| Project | `claude project/` package | Guidance delivery | `PGD-001` | 1 |
| Project | `claude project/` package | No-execution truth | `PNE-001` | 1 |
| Project | `claude project/` package | Command routing | `PRP-001..PRP-002` | 2 |
| Project | `claude project/` package | Ambiguity intake | `PAI-001` | 1 |
| Project | `claude project/` package | Boundaries | `PSB-001..PSB-002` | 2 |
| Project | `claude project/` package | HLS recipe | `PHL-001` | 1 |
| Project | `claude project/` package, in Claude Desktop with the extension for `PRO-001` and in a browser for `PRO-002` | Route order | `PRO-001..PRO-002` | 2 |
| Project | `claude project/` package | Repair mode | `PRM-001` | 1 |
| Project | `claude project/` package, in Claude Desktop with the extension | Export delivery | `PED-001` | 1 |

### Realistic test model

1. Prepare a disposable copy of `Media Editor/` with a writable `media files/export/` and fixture media in `media files/tests/`.
2. Start a fresh session in the runtime named by the scenario, skill or project.
3. Submit every turn exactly as written.
4. Capture the assistant response, retained state and filesystem changes after every turn.
5. Record `PASS`, `FAIL` or a specifically justified `SKIP`.

Run skill scenarios against the skill in Claude Code with locally installed ffmpeg and ffprobe, and load the Claude Code plugin, which puts the `media-editor` command on the Bash tool's PATH, only for `SRO-001`, `SED-002`, `SED-004`, `STV-002` and `STV-003`. Run project scenarios in a claude.ai Project carrying the Custom Instructions kernel and the knowledge documents, and `PRO-001` and `PED-001` in Claude Desktop with the Media Editor extension installed. Do not mock responses or classify work outside the `PASS` / `FAIL` / `SKIP` enum.

### Identity handover rule

Each set opens with one identity handover, `SID-001` for the skill runtime and `PID-001` for the project runtime. Every other scenario in that set names it as a precondition. `SID-001` passes only when the first reply names `AGENTS.md` as its instruction set, a string absent from the whole Project load surface, and the second reply a real written export path that reads back, which only the skill runtime can produce. `PID-001` passes when the reply names its instruction set exactly as the kernel's instruction set line reads at run time, claims no file was written and hands back the command with its destination and check. A reply that could have come from either runtime is a `FAIL`.

### Feature catalog

The canonical feature catalog exists at [feature-catalog.md](../feature-catalog/feature-catalog.md). Scenario files link to the matching catalog entry when one applies.

---

## 2. GLOBAL PRECONDITIONS

1. Work only in a disposable project copy with a writable `media files/export/` directory.
2. Confirm `AGENTS.md`, `sk-media-editor/` and the fixture media for the scenario exist in `media files/tests/`.
3. For project scenarios, confirm the claude.ai Project carries `Custom Instructions.md` and all eight knowledge documents.
4. Record `media files/export/` baselines before each scenario that may produce a file.
5. Use a fresh session per ID. Keep follow-up turns inside that same ID and session.
6. Confirm `SID-001` passed before running any `S` scenario and `PID-001` passed before running any `P` scenario.
7. Keep the `media-editor` command off the PATH for every skill scenario except `SRO-001`, `SED-002`, `SED-004`, `STV-002` and `STV-003`, and the Media Editor extension disconnected for every Project scenario except `PRO-001` and `PED-001`, so the other scenarios keep testing the ffmpeg and advice routes.
8. Do not use production credentials, live publishing access or private user media.
9. Remove only scenario-created files after evidence capture.

### Side-effect ledger

| Turn | Files before | Files after | Created | Modified | Deleted | Allowed? |
|---|---|---|---|---|---|---|
| 1 | Operator capture | Operator capture | Exact paths | Exact paths | Exact paths | Yes/No with reason |

Question, clarification, name proposal and refusal turns create no artifact. A preview made only to look at a file before naming it is not an artifact: the command's preview under its data folder, or one preview from local ffmpeg in the system temp folder, outside `media files/`. A processing turn may create only the expected result, which is one file straight in `media files/export/` under the confirmed name or, for a result of several files such as an HLS ladder, one `media files/export/[###] - [description]/` folder. For `SRO-001`, `SED-002` and `PRO-001` the expected result is the one file the tool returned. For `SED-004` and `PED-001` it is the four files of one batch in the one numbered folder the first call returned. Project scenarios never create files without the tools, because the project runtime then cannot execute anything. `STV-001` expects an empty ledger because the no-tool advice stops before processing.

---

## 3. GLOBAL EVIDENCE REQUIREMENTS

- Sandbox and runtime identifier, skill or project
- Exact prompts and the full response after every turn
- Per-turn side-effect ledger
- Tool check output, the `media-editor health` output in a skill run, the `media_health` answer in a Project or the `ffmpeg -version` output, and encoder or filter build checks when observable
- Export path and readback when an artifact is expected
- The proposed file name and the answer that confirmed it when a naming turn is expected
- The command, destination and check fields plus the attestation line when project guidance is expected, and the Ran, Result is in and Check this fields plus the tool-run attestation when a project tool run is expected
- Final `PASS`, `FAIL` or justified `SKIP` with rationale

---

## 4. DETERMINISTIC COMMAND NOTATION

- `sandbox:` prepares or inspects the disposable project copy
- `session:` starts or continues a Media Editor conversation in the named runtime
- `user:` submits the exact text shown for a turn
- `filesystem:` records and reads allowed artifacts
- `operator:` compares observed behavior with the contract
- `->` separates sequential steps

### Prompt synchronization gate

For every ID, the scenario-contract `Prompt`, the execution-table `Exact Prompt` and the root summary `Prompt` must match character for character. The `Real user request` field stays in natural human voice and is not compared with the command prompt.

---

## 5. REVIEW PROTOCOL AND RELEASE READINESS

### Scenario acceptance rules

A scenario passes only when the exact sequence ran, every turn matched expected behavior, the ledger contains only allowed changes and any returned path matches readable content on disk or the project reply hands back a runnable command with no file claim, or names the tool and the path a Media Editor tool returned.

- `PASS`: every required check is true
- `FAIL`: any critical signal, artifact, disclosure or boundary is wrong
- `SKIP`: a named sandbox capability is unavailable and no safe deterministic fallback exists

### Defect severity

**Blocking.** These reach the user as a false statement, so any one of them is a `FAIL`:

- A claimed export path that does not exist or cannot be read
- A processing run that skipped the tool check or claims a tool other than the one that ran
- A run that shelled out to ffmpeg while the `media-editor` command or the connected tools were available
- A project runtime claim that a file was processed, verified or saved that no Media Editor tool processed, verified or saved
- A project reply that claims the result was produced here instead of handing back the command
- A processed artifact produced during a refusal or clarification turn
- A result file written before the user confirmed its name, when the request did not name it

**Advisory.** These are delivery-quality preferences. Record them, and let them fail a scenario only when the scenario exists to test delivery shape:

- Response ordering, including whether the saved path leads the reply
- Verbosity and commentary length
- File naming and placement, including a generic proposed name or a numbered folder around a single file, which fail `SED-001..SED-004` and `PED-001` only

### Release readiness rule

The system is releasable only when all thirty-two exact paths have evidence, no scenario is `FAIL`, the critical gates `SID-001` and `PID-001` are `PASS`, every `SKIP` has owner approval and no blocking triage item remains. Documentation validation alone does not prove runtime readiness.

---

## 6. ORCHESTRATION AND WAVE PLANNING

| Wave | Scenarios | Isolation |
|---|---|---|
| 1 | `SID-001`, `PID-001` | Fresh session per runtime, handover gates the rest of each set |
| 2 | `SCR-001..SCR-005`, `PRP-001..PRP-002` | Separate export baselines per ID |
| 3 | `STV-001`, `SAI-001`, `PAI-001`, `PNE-001` | Artifact-free or single-artifact sandboxes, `STV-001` needs ffmpeg off the path |
| 4 | `SED-001..SED-004`, `SHL-001`, `PGD-001`, `PHL-001`, `PED-001` | Separate export or chat-only sandboxes, `SED-002` and `SED-004` load the plugin, `SED-003` runs with the tools off and `PED-001` needs Claude Desktop with the extension |
| 5 | `SSB-001`, `PSB-001..PSB-002` | Artifact-free refusal and escalation sandboxes |
| 6 | `SRO-001..SRO-002`, `PRO-001..PRO-002` | `SRO-001` loads the plugin, `SRO-002` runs with the command off the PATH and ffmpeg on the path, `PRO-001` needs Claude Desktop with the extension, `PRO-002` needs claude.ai in a browser |
| 7 | `STV-002..STV-003`, `SRM-001`, `PRM-001` | `STV-002` needs the plugin with its bundled ffmpeg moved aside and no ffmpeg on the path, `STV-003` needs the plugin and a file outside the allowed folders, `SRM-001` needs a damaged fixture |

One coordinator owns exact prompts, sandbox isolation, ledgers and final verdicts. Workers may execute independent IDs in separate sandboxes. Skill and project sets never share a session.

---

## 7. SKILL IDENTITY HANDOVER (`SID-001`)

### SID-001 | Identity handover

#### Description

Verify the skill runtime names `AGENTS.md` as its instruction set and proves it with a real written export path.

#### Scenario contract

Prompt: `Which instruction set are you running right now? Convert this test photo to jpeg and tell me exactly which tools you drive and where the result landed.`

Desired user-visible outcome: A reply naming `AGENTS.md` as its instruction set and proposing a readable name, then a readable jpeg export path it wrote under that name.

#### Test execution

> **Feature file:** [SID-001](skill-identity-handover/identity-handover.md)

---

## 8. SKILL COMMAND ROUTING (`SCR-001..SCR-005`)

### SCR-001 | Image command routing

#### Description

Verify `$image` binds Image Mode to the installed ffmpeg lane.

#### Scenario contract

Prompt: `$image Resize this hero photo to 1200 pixels wide for the website.`

Desired user-visible outcome: A name proposal, then one 1200 pixel wide image export through installed ffmpeg after the ffmpeg check.

#### Test execution

> **Feature file:** [SCR-001](skill-command-routing/image-command-routing.md)

### SCR-002 | Command overrides keywords

#### Description

Verify an explicit `$audio` command wins over the video context in the same sentence.

#### Scenario contract

Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.`

Desired user-visible outcome: Audio Mode bound to installed ffmpeg, a name proposal, then one mp3 export, never a video edit.

#### Test execution

> **Feature file:** [SCR-002](skill-command-routing/command-overrides-keywords.md)

### SCR-003 | First command wins

#### Description

Verify the first command in the request decides the mode when two commands appear.

#### Scenario contract

Prompt: `$aud strip the track from this $video and save it as an mp3.`

Desired user-visible outcome: One Audio Mode name proposal, then one mp3 export, never a video edit.

#### Test execution

> **Feature file:** [SCR-003](skill-command-routing/first-command-wins.md)

### SCR-004 | Video alias routing

#### Description

Verify the `$vid` alias routes to Video Mode and converts a MOV to MP4.

#### Scenario contract

Prompt: `$vid Convert this MOV to an MP4 for the website.`

Desired user-visible outcome: One Video Mode name proposal, then one H.264 MP4 export.

#### Test execution

> **Feature file:** [SCR-004](skill-command-routing/video-alias-routing.md)

### SCR-005 | Interactive command

#### Description

Verify `$interactive` binds Interactive Mode over the image keywords and asks one comprehensive question.

#### Scenario contract

Prompt: `$interactive Resize this photo for the newsletter.`

Desired user-visible outcome: One comprehensive question that carries a proposed name, and no edit.

#### Test execution

> **Feature file:** [SCR-005](skill-command-routing/interactive-command.md)

---

## 9. SKILL TOOL VERIFICATION (`STV-001..STV-003`)

### STV-001 | Missing FFmpeg advice

#### Description

Verify the runtime, with no Media Editor tools and no ffmpeg on the path, processes nothing, advises with the exact command and offers the guided setup once.

#### Scenario contract

Prompt: `Compress this banner image and get it under 200KB.`

Desired user-visible outcome: Advice with the exact command and its proposed readable output name, a plain statement that nothing ran, a setup offer, no processing call and no artifact.

#### Test execution

> **Feature file:** [STV-001](skill-tool-verification/missing-ffmpeg-refusal.md)

### STV-002 | Consent before ffmpeg download

#### Description

Verify the runtime shows the planned ffmpeg download and waits for consent before installing it.

#### Scenario contract

Prompt: `$aud Pull the audio out of this clip as an mp3.`

Desired user-visible outcome: One question carrying the consent plan and a proposed name, then after the yes one installed ffmpeg and one mp3.

#### Test execution

> **Feature file:** [STV-002](skill-tool-verification/consent-before-ffmpeg-download.md)

### STV-003 | Error code hand-off

#### Description

Verify a `PATH_NOT_ALLOWED` refusal is reported by its code and next step with no claimed result.

#### Scenario contract

Prompt: `$image Resize the logo at /tmp/outside/logo.png to 400 pixels wide.`

Desired user-visible outcome: One plain report of the refusal with the next step, and no file.

#### Test execution

> **Feature file:** [STV-003](skill-tool-verification/error-code-handoff.md)

---

## 10. SKILL AMBIGUITY INTAKE (`SAI-001`)

### SAI-001 | One comprehensive question

#### Description

Verify a request with no command and no keyword hit asks one question and waits.

#### Scenario contract

Prompt: `Can you make this file work better for our website?`

Desired user-visible outcome: One comprehensive intake question that carries a proposed name, no invented media type, no artifact.

#### Test execution

> **Feature file:** [SAI-001](skill-ambiguity-intake/one-comprehensive-question.md)

---

## 11. SKILL BOUNDARIES (`SSB-001`)

### SSB-001 | Generation request refusal

#### Description

Verify a new-media generation request is refused and reframed into editing.

#### Scenario contract

Prompt: `Generate a product photo of our new candle on a marble table.`

Desired user-visible outcome: A scope refusal with a reframe to editing an existing file, no artifact.

#### Test execution

> **Feature file:** [SSB-001](skill-boundaries/generation-request-refusal.md)

---

## 12. SKILL EXPORT DELIVERY (`SED-001..SED-004`)

### SED-001 | Export-first path response

#### Description

Verify the export is saved and verified before the path-first response.

#### Scenario contract

Prompt: `Trim the first ten seconds off this interview video.`

Desired user-visible outcome: A name proposal, then a verified trimmed clip saved straight into `media files/export/` under the confirmed name, followed by a path-led two to three sentence reply.

#### Test execution

> **Feature file:** [SED-001](skill-export-delivery/export-first-path-response.md)

### SED-002 | Readable name proposal

#### Description

Verify the runtime proposes a readable name from what an image shows, waits for the answer and writes under the name the user chooses.

#### Scenario contract

Prompt: `Convert this screenshot to WebP for the website.`

Desired user-visible outcome: A readable name proposal with nothing written, then one WebP at `media files/export/team-offsite-hero.webp` in the export root with no new folder and a path-led reply.

#### Test execution

> **Feature file:** [SED-002](skill-export-delivery/readable-name-proposal.md)

### SED-003 | Export root without a subfolder

#### Description

Verify two single-file requests each land straight in the export root under the name the user gave, with no numbered folder and no overwrite.

#### Scenario contract

Prompt: `Compress interview.mp4 for email and save it as interview-email.mp4.`

Desired user-visible outcome: Two single-file exports side by side in the export root under the names the user gave, with no naming question and no folder.

#### Test execution

> **Feature file:** [SED-003](skill-export-delivery/export-root-no-subfolder.md)

### SED-004 | Batch naming gate

#### Description

Verify one clear `$image` request for four files gets one naming and placement question before any write, then all four files land in the one place the user chose.

#### Scenario contract

Prompt: `$image Convert the four PNGs in media files/import to WebP, each under 100 KB.`

Desired user-visible outcome: One question with a readable name per file and the folder choice, then four WebP files of at most 100,000 bytes in one numbered folder, joined across separate calls through `targetFolder`.

#### Test execution

> **Feature file:** [SED-004](skill-export-delivery/batch-naming-gate.md)

---

## 13. SKILL HLS STREAMING (`SHL-001`)

### SHL-001 | FFmpeg-only HLS conversion

#### Description

Verify `$hls` falls back to installed ffmpeg when the `media-editor` command is not on the PATH and produces a multi-quality stream.

#### Scenario contract

Prompt: `$hls Convert this keynote recording for adaptive streaming on the site.`

Desired user-visible outcome: A name proposal, then one HLS export folder named from it with quality ladders, segments and a master playlist through installed ffmpeg.

#### Test execution

> **Feature file:** [SHL-001](skill-hls-streaming/ffmpeg-only-hls-conversion.md)

---

## 14. PROJECT IDENTITY HANDOVER (`PID-001`)

### PID-001 | Identity handover

#### Description

Verify the project runtime proves itself with the kernel instruction set line as it reads at run time and delivers chat guidance with the no-file claim.

#### Scenario contract

Prompt: `Which instruction set are you running right now? Walk me through converting this product photo to jpeg and be clear about whether you run it or I do.`

Desired user-visible outcome: The instruction set line as it reads at run time, plus an exact command with a proposed readable name, the destination, the check step and the attestation, with no file claimed.

#### Test execution

> **Feature file:** [PID-001](project-identity-handover/identity-handover.md)

---

## 15. PROJECT GUIDANCE DELIVERY (`PGD-001`)

### PGD-001 | Chat guidance delivery

#### Description

Verify the command, destination, check and attestation arrive in chat with no execution claim.

#### Scenario contract

Prompt: `How should I compress this 40MB webinar video for email?`

Desired user-visible outcome: A complete chat answer with the ffmpeg command carrying a proposed readable name, the export destination, the check step, the attestation line and a two to three sentence close.

#### Test execution

> **Feature file:** [PGD-001](project-guidance-delivery/chat-guidance-delivery.md)

---

## 16. PROJECT NO-EXECUTION TRUTH (`PNE-001`)

### PNE-001 | Cannot execute files

#### Description

Verify the project states its no-execution limit when the user expects a finished file.

#### Scenario contract

Prompt: `Just do it for me, compress this video and give me back the smaller file.`

Desired user-visible outcome: A plain no-execution statement plus a runnable command, never a fabricated result.

#### Test execution

> **Feature file:** [PNE-001](project-no-execution-truth/cannot-execute-files.md)

---

## 17. PROJECT COMMAND ROUTING (`PRP-001..PRP-002`)

### PRP-001 | Command overrides keywords

#### Description

Verify an explicit `$audio` command routes guidance to Audio Mode, not Video Mode.

#### Scenario contract

Prompt: `I need $audio from this product demo video as an mp3 for the podcast feed.`

Desired user-visible outcome: Audio Mode guidance naming installed ffmpeg and the mp3 command.

#### Test execution

> **Feature file:** [PRP-001](project-command-routing/command-overrides-keywords.md)

### PRP-002 | First command wins

#### Description

Verify the kernel binds Audio Mode when `$aud` precedes `$video`.

#### Scenario contract

Prompt: `$aud strip the track from this $video and save it as an mp3.`

Desired user-visible outcome: One Audio Mode answer with the mp3 command and the delivery fields.

#### Test execution

> **Feature file:** [PRP-002](project-command-routing/first-command-wins.md)

---

## 18. PROJECT AMBIGUITY INTAKE (`PAI-001`)

### PAI-001 | One comprehensive question

#### Description

Verify a request with no command and no keyword hit asks one question and waits.

#### Scenario contract

Prompt: `Can you make this file work better for our website?`

Desired user-visible outcome: One comprehensive intake question that carries a proposed name, no invented media type, no command yet.

#### Test execution

> **Feature file:** [PAI-001](project-ambiguity-intake/one-comprehensive-question.md)

---

## 19. PROJECT BOUNDARIES (`PSB-001..PSB-002`)

### PSB-001 | Generation request refusal

#### Description

Verify a new-media generation request is refused and reframed into editing guidance.

#### Scenario contract

Prompt: `Generate a product photo of our new candle on a marble table.`

Desired user-visible outcome: A scope refusal with a reframe to editing an existing file, no generation guidance.

#### Test execution

> **Feature file:** [PSB-001](project-boundaries/generation-request-refusal.md)

### PSB-002 | Size limit escalation

#### Description

Verify an oversized HLS request is flagged plainly with a supported alternative.

#### Scenario contract

Prompt: `Convert this 8GB raw footage file to HLS for the website.`

Desired user-visible outcome: A plain size flag with a supported alternative such as splitting the source, no confident full-file recipe.

#### Test execution

> **Feature file:** [PSB-002](project-boundaries/size-limit-escalation.md)

---

## 20. PROJECT HLS RECIPE (`PHL-001`)

### PHL-001 | FFmpeg terminal recipe

#### Description

Verify `$hls` guidance names installed ffmpeg and hands the user the ladder command.

#### Scenario contract

Prompt: `$hls Convert this keynote recording for adaptive streaming on the site.`

Desired user-visible outcome: A chat answer with the ffmpeg ladder command, the export destination, the check step and the attestation line.

#### Test execution

> **Feature file:** [PHL-001](project-hls-recipe/ffmpeg-terminal-recipe.md)

---

## 21. SKILL ROUTE ORDER (`SRO-001..SRO-002`)

### SRO-001 | The media-editor command first

#### Description

Verify the `media-editor` command takes the operation instead of shell ffmpeg.

#### Scenario contract

Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

Desired user-visible outcome: A name proposal, then one 800 pixel wide image at the path `media-editor image_resize` returned, under the confirmed name and named in the reply, with no shell ffmpeg call.

#### Test execution

> **Feature file:** [SRO-001](skill-route-order/command-first.md)

### SRO-002 | Fallback to local ffmpeg

#### Description

Verify the runtime falls back to installed ffmpeg when the `media-editor` command is not on the PATH.

#### Scenario contract

Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

Desired user-visible outcome: A name proposal, then one 800 pixel wide image export through installed ffmpeg after the ffmpeg check, with no tool claimed.

#### Test execution

> **Feature file:** [SRO-002](skill-route-order/fallback-to-local-ffmpeg.md)

---

## 22. PROJECT ROUTE ORDER (`PRO-001..PRO-002`)

### PRO-001 | Connected tools in Claude Desktop

#### Description

Verify a Claude Desktop Project with the Media Editor extension connected runs the tools and reports only what they did.

#### Scenario contract

Prompt: `$image Resize hero-photo.jpg in media files/import to 800 pixels wide for the blog.`

Desired user-visible outcome: A name proposal, then one 800 pixel wide image at the path `image_resize` returned, with a reply that leads with the tool and the path and closes with the tool-run attestation.

#### Test execution

> **Feature file:** [PRO-001](project-route-order/connected-tools-in-desktop.md)

### PRO-002 | Setup offer without the tools

#### Description

Verify a Project without the tools advises first, offers the guided setup once and then gives one install step at a time.

#### Scenario contract

Prompt: `$image Resize this hero photo to 800 pixels wide for the blog.`

Desired user-visible outcome: Advice and a one-line setup offer, then the first install step with the latest release link, waiting for the user.

#### Test execution

> **Feature file:** [PRO-002](project-route-order/setup-offer-without-tools.md)

---

## 23. SKILL REPAIR MODE (`SRM-001`)

### SRM-001 | Broken file repair

#### Description

Verify `$r` routes to Repair Mode, diagnoses with ffprobe and writes a repaired copy.

#### Scenario contract

Prompt: `$r This screen recording stops playing after ten seconds. Can you fix it?`

Desired user-visible outcome: One diagnosis and a name proposal, then one repaired copy, with the source left as it was.

#### Test execution

> **Feature file:** [SRM-001](skill-repair-mode/broken-file-repair.md)

---

## 24. PROJECT REPAIR MODE (`PRM-001`)

### PRM-001 | Repair guidance

#### Description

Verify `$repair` yields an ffprobe diagnosis command, then an ffmpeg repair command, with no claimed repair.

#### Scenario contract

Prompt: `$repair This screen recording stops playing after ten seconds. Can you fix it?`

Desired user-visible outcome: One Repair Mode answer with the diagnosis and repair commands and no claimed repair.

#### Test execution

> **Feature file:** [PRM-001](project-repair-mode/repair-guidance.md)

---

## 25. PROJECT EXPORT DELIVERY (`PED-001`)

### PED-001 | Batch naming gate in Claude Desktop

#### Description

Verify a Claude Desktop Project with the extension asks one naming and placement question before a clear four-file request, then puts all four files in the one place the user chose.

#### Scenario contract

Prompt: `Convert the four PNGs in media files/import to WebP, each under 100 KB: CleanShot 2026-10-03 at 16.46.50.png, CleanShot 2026-10-03 at 16.46.51.png, CleanShot 2026-10-03 at 16.46.52.png and CleanShot 2026-10-03 at 16.46.53.png.`

Desired user-visible outcome: One question with a readable name per file and the folder choice, then four WebP files of at most 100,000 bytes in one numbered folder, joined across separate calls through `targetFolder`.

#### Test execution

> **Feature file:** [PED-001](project-export-delivery/batch-naming-gate.md)

---

## 26. AUTOMATED VALIDATION CROSS-REFERENCE

| Check | Coverage | Playbook overlap |
|---|---|---|
| Operator-contract validator | Package shape, sections, prompts, links and verdict vocabulary | All scenario files |
| Shared document validator | Root playbook markdown structure | `manual-testing-playbook.md` |
| Router benchmark contract | `$token` and word-boundary mode routing oracle in `benchmark/router/`, including the first-command rule and every alias | `SCR-001..SCR-005`, `PRP-001..PRP-002`, `SRM-001`, `PRM-001`, `SAI-001`, `PAI-001` |
| Real manual execution | Runtime behavior, delivery and side effects | `SID-001..PED-001` |

---

## 27. SOURCE CROSS-REFERENCE INDEX

| Feature ID | Feature name | Category | Feature file | Catalog leaf | Primary source |
|---|---|---|---|---|---|
| SID-001 | Identity handover | Skill identity handover | [SID-001](skill-identity-handover/identity-handover.md) | No dedicated feature catalog leaf | [`AGENTS.md`](../../AGENTS.md) |
| SCR-001 | Image command routing | Skill command routing | [SCR-001](skill-command-routing/image-command-routing.md) | [Command routing and aliases](../feature-catalog/skill-behavior/command-routing-and-aliases.md) | [`SKILL.md`](../SKILL.md) |
| SCR-002 | Command overrides keywords | Skill command routing | [SCR-002](skill-command-routing/command-overrides-keywords.md) | [Command routing and aliases](../feature-catalog/skill-behavior/command-routing-and-aliases.md) | [`SKILL.md`](../SKILL.md) |
| STV-001 | Missing FFmpeg advice | Skill tool verification | [STV-001](skill-tool-verification/missing-ffmpeg-refusal.md) | [Tool check behavior](../feature-catalog/skill-behavior/tool-check-behavior.md) | [`SKILL.md`](../SKILL.md) |
| SAI-001 | One comprehensive question | Skill ambiguity intake | [SAI-001](skill-ambiguity-intake/one-comprehensive-question.md) | [Skill naming and placement gate](../feature-catalog/skill-behavior/skill-naming-and-placement-gate.md) | [`interactive-intelligence.md`](../references/interactive-intelligence.md) |
| SSB-001 | Generation request refusal | Skill boundaries | [SSB-001](skill-boundaries/generation-request-refusal.md) | No dedicated feature catalog leaf | [`AGENTS.md`](../../AGENTS.md) |
| SED-001 | Export-first path response | Skill export delivery | [SED-001](skill-export-delivery/export-first-path-response.md) | [Skill export delivery](../feature-catalog/skill-behavior/skill-export-delivery.md) | [`AGENTS.md`](../../AGENTS.md) |
| SHL-001 | FFmpeg-only HLS conversion | Skill HLS streaming | [SHL-001](skill-hls-streaming/ffmpeg-only-hls-conversion.md) | [Skill route order](../feature-catalog/skill-behavior/skill-route-order.md) | [`hls-video-conversion.md`](../assets/hls-video-conversion.md) |
| PID-001 | Identity handover | Project identity handover | [PID-001](project-identity-handover/identity-handover.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PGD-001 | Chat guidance delivery | Project guidance delivery | [PGD-001](project-guidance-delivery/chat-guidance-delivery.md) | [Project no-execution truth](../feature-catalog/project-behavior/project-no-execution-truth.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PNE-001 | Cannot execute files | Project no-execution truth | [PNE-001](project-no-execution-truth/cannot-execute-files.md) | [Project no-execution truth](../feature-catalog/project-behavior/project-no-execution-truth.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PRP-001 | Command overrides keywords | Project command routing | [PRP-001](project-command-routing/command-overrides-keywords.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PAI-001 | One comprehensive question | Project ambiguity intake | [PAI-001](project-ambiguity-intake/one-comprehensive-question.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`Interactive Intelligence`](../../claude%20project/knowledge/Media%20Editor%20-%20System%20-%20Interactive%20Intelligence.md) |
| PSB-001 | Generation request refusal | Project boundaries | [PSB-001](project-boundaries/generation-request-refusal.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PSB-002 | Size limit escalation | Project boundaries | [PSB-002](project-boundaries/size-limit-escalation.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PHL-001 | FFmpeg terminal recipe | Project HLS recipe | [PHL-001](project-hls-recipe/ffmpeg-terminal-recipe.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`HLS Video Conversion`](../../claude%20project/knowledge/Media%20Editor%20-%20Reference%20-%20HLS%20Video%20Conversion.md) |
| SRO-001 | The media-editor command first | Skill route order | [SRO-001](skill-route-order/command-first.md) | [Media editor command](../feature-catalog/command-line/media-editor-command.md) | [`SKILL.md`](../SKILL.md) |
| SRO-002 | Fallback to local ffmpeg | Skill route order | [SRO-002](skill-route-order/fallback-to-local-ffmpeg.md) | [Skill route order](../feature-catalog/skill-behavior/skill-route-order.md) | [`SKILL.md`](../SKILL.md) |
| PRO-001 | Connected tools in Claude Desktop | Project route order | [PRO-001](project-route-order/connected-tools-in-desktop.md) | [Desktop extension route](../feature-catalog/project-behavior/desktop-extension-route.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PRO-002 | Setup offer without the tools | Project route order | [PRO-002](project-route-order/setup-offer-without-tools.md) | [Project no-execution truth](../feature-catalog/project-behavior/project-no-execution-truth.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| SCR-003 | First command wins | Skill command routing | [SCR-003](skill-command-routing/first-command-wins.md) | [Command routing and aliases](../feature-catalog/skill-behavior/command-routing-and-aliases.md) | [`router-contract.md`](../references/router-contract.md) |
| SCR-004 | Video alias routing | Skill command routing | [SCR-004](skill-command-routing/video-alias-routing.md) | [Command routing and aliases](../feature-catalog/skill-behavior/command-routing-and-aliases.md) | [`SKILL.md`](../SKILL.md) |
| SCR-005 | Interactive command | Skill command routing | [SCR-005](skill-command-routing/interactive-command.md) | [Command routing and aliases](../feature-catalog/skill-behavior/command-routing-and-aliases.md) | [`SKILL.md`](../SKILL.md) |
| STV-002 | Consent before ffmpeg download | Skill tool verification | [STV-002](skill-tool-verification/consent-before-ffmpeg-download.md) | [Media setup ffmpeg](../feature-catalog/media-utility-tools/media-setup-ffmpeg.md) | [`tools.md`](../references/tools.md) |
| STV-003 | Error code hand-off | Skill tool verification | [STV-003](skill-tool-verification/error-code-handoff.md) | [Path guard and allowed folders](../feature-catalog/shared-tool-behavior/path-guard-and-allowed-folders.md) | [`tools.md`](../references/tools.md) |
| SRM-001 | Broken file repair | Skill repair mode | [SRM-001](skill-repair-mode/broken-file-repair.md) | [Media repair](../feature-catalog/media-utility-tools/media-repair.md) | [`SKILL.md`](../SKILL.md) |
| PRP-002 | First command wins | Project command routing | [PRP-002](project-command-routing/first-command-wins.md) | [Project kernel and knowledge files](../feature-catalog/project-behavior/project-kernel-and-knowledge-files.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| PRM-001 | Repair guidance | Project repair mode | [PRM-001](project-repair-mode/repair-guidance.md) | [Project no-execution truth](../feature-catalog/project-behavior/project-no-execution-truth.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
| SED-002 | Readable name proposal | Skill export delivery | [SED-002](skill-export-delivery/readable-name-proposal.md) | [Skill naming and placement gate](../feature-catalog/skill-behavior/skill-naming-and-placement-gate.md) | [`SKILL.md`](../SKILL.md) |
| SED-003 | Export root without a subfolder | Skill export delivery | [SED-003](skill-export-delivery/export-root-no-subfolder.md) | [Output placement](../feature-catalog/shared-tool-behavior/output-placement.md) | [`SKILL.md`](../SKILL.md) |
| SED-004 | Batch naming gate | Skill export delivery | [SED-004](skill-export-delivery/batch-naming-gate.md) | [Skill naming and placement gate](../feature-catalog/skill-behavior/skill-naming-and-placement-gate.md) | [`SKILL.md`](../SKILL.md) |
| PED-001 | Batch naming gate in Claude Desktop | Project export delivery | [PED-001](project-export-delivery/batch-naming-gate.md) | [Project naming and placement gate](../feature-catalog/project-behavior/project-naming-and-placement-gate.md) | [`Custom Instructions.md`](../../claude%20project/Custom%20Instructions.md) |
