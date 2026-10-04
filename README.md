# Media Editor - Image, Video & Audio with FFmpeg

[![GitHub Stars](https://img.shields.io/github/stars/MichelKerkmeester/media-editor_image-video-audio-ffmpeg?style=for-the-badge&logo=github&color=fce566&labelColor=222222)](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/stargazers)
[![License](https://img.shields.io/github/license/MichelKerkmeester/media-editor_image-video-audio-ffmpeg?style=for-the-badge&color=7bd88f&labelColor=222222)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/MichelKerkmeester/media-editor_image-video-audio-ffmpeg?style=for-the-badge&color=5ad4e6&labelColor=222222)](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/commits/main)

> Like it? https://buymeacoffee.com/michelkerkmeester

&nbsp;

## 1. 📝 SUMMARY

A media editor in a folder: it resizes, converts, compresses, trims, repairs and streams images, video and audio you already have.

It edits existing media and never generates new media from a prompt. Every result lands in a numbered folder on disk before the reply names it, and a reply where nothing ran says so.

Runs in agent CLIs that read `AGENTS.md`, in Claude Desktop or Claude Code through its own MCP server and in claude.ai Projects through `claude project/`

**What's inside**

- **Smart Router** - eleven exact `$` commands and word-boundary keyword scores resolve each request to Image, Video, Audio, HLS, Repair or Interactive
- **Tool Check** - the Media Editor tools when they are connected, then ffmpeg on the path, then advice with the exact command that says nothing ran
- **Media Editor Tools** - a local MCP server with 39 tools (8 image, 6 audio, 20 video, 5 media) and its own pinned ffmpeg for five platforms
- **MEDIA Thinking** - Measure, Evaluate, Decide, Implement and Analyze, with a short visible update per phase and the full comparison kept internal
- **Format and Quality Intelligence** - format and quality chosen by use case, and no WebP or AVIF promised before a build check finds the encoder
- **Export-First Delivery** - one numbered folder per operation under `media files/export/`, saved and checked before the reply
- **Checks Without a Model** - 22 router fixtures and 66 differential checks run from a fresh clone

**Why it earns a place**

- Your files never leave your machine. The tools open only the folders you allow and write every result into a new folder, never over a file
- A missing ffmpeg is never a silent failure: `media_setup_ffmpeg` shows the download address, size and SHA-256 and fetches nothing until you agree
- One 19-scenario playbook runs against both the CLI skill and the claude.ai package, and a captured run sits in `benchmark/reports/`

&nbsp;

## 2. 🗺️ OVERVIEW

### THE FOUNDATION

Three building blocks carry a request through the Media Editor:

1. **Routing**

   `sk-media-editor/references/router-contract.md` resolves one mode before any reference loads. A command wins first, then the keyword score, then one question.

2. **Running**

   The tool check picks the first route that answers: the mode's tool group, then ffmpeg, then advice. The route decides what runs, never what the mode is.

3. **Gates and delivery**

   MEDIA thinking, the build check and the Human Voice card run before export. The result is saved and checked before the reply names its folder.

From request to delivered media:

```text
                          YOUR REQUEST
                               │
                               ▼
        ┌────────────────────────────────────────────┐
        │                SMART ROUTER                │
        │                                            │
        │  1. Exact command   $image $video $audio   │
        │                     $hls $repair $int      │
        │  2. Keyword score   word boundary, weights │
        │  3. No signal       one question           │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
        ┌────────────────────────────────────────────┐
        │  ALWAYS LOADED          ONE ROUTED FILE    │
        │  media-framework.md     operations, HLS    │
        │  hvr-core.md            or interactive     │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
        ┌────────────────────────────────────────────┐
        │                 TOOL CHECK                 │
        │                                            │
        │  Tools connected   media_health, then the  │
        │                    mode's tool group       │
        │  ffmpeg on path    ffmpeg -version, then   │
        │                    the recipe              │
        │  Neither           advice, nothing ran     │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
        ┌────────────────────────────────────────────┐
        │  Measure → Evaluate → Decide               │
        │          → Implement → Analyze             │
        │                                            │
        │  Build check   encoder before any promise  │
        │  Quality fit   format chosen by use case   │
        │  Voice card    every hard blocker inline   │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
              media files/export/[###] - [description]/
                       saved, then checked
                               │
                               ▼
               path plus a two to three sentence summary
```

### Smart Router

One request, one mode.

Exact commands set the mode before any wording is scored.

- `$image`, `$video`, `$audio`, `$hls`, `$repair` and `$interactive` match only as whole tokens, so `$rotate` and `$images` carry no command
- With two commands, the first one in the text wins: `$aud strip the track from this $video` is Audio
- `benchmark/router/route_contract.py` prints the route any request gets, with no model involved

### Tool Check

Tools first, then ffmpeg, then advice.

No operation runs before a route answers.

- With the Media Editor tools connected, `media_health` reports the ffmpeg and ffprobe it found, their encoders and filters and the folders in effect
- Without the tools, `ffmpeg -version` and `ffprobe -version` decide whether the recipe runs
- With neither, the reply gives the exact command with install guidance and states that nothing ran

### MEDIA Thinking

Five phases, one visible line each.

The user sees a short status per phase, such as "Evaluating (WebP optimal)", while the comparison of formats and settings stays internal.

- Measure reads the source, Evaluate compares formats, Decide fixes the settings
- Implement runs the bound route, Analyze checks the result against the goal
- A missed quality target, an unsupported format or a missing encoder triggers up to three improvement passes

### Format and Quality Intelligence

The use case picks the format.

- Web images get WebP or AVIF when the build encodes them, JPEG otherwise
- Web video gets H.264 MP4 for playback everywhere, H.265 or VP9 when size matters
- The reply names the trade-off in a sentence or two, never as a wall of settings

### Export-First Delivery

Saved, checked, then reported.

- Every operation writes one numbered folder, because one operation often produces several files
- A Media Editor tool writes its own numbered folder and returns the path, and that folder is the export
- The reply leads with the path and never pastes a processing log or a metadata dump

&nbsp;

## 3. 🚀 QUICK START

### Installation

```bash
git clone https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg.git
cd media-editor_image-video-audio-ffmpeg
```

Open the folder in an agent CLI that reads `AGENTS.md` and point the model at that file. It reads `sk-media-editor/SKILL.md` and works as the Media Editor from then on. The router checks need Bash and Python 3. The editing itself needs one of two things: the Media Editor tools, or ffmpeg with ffprobe on the path.

### Install the Tools

The tools ship as a Claude Desktop extension and as a Claude Code plugin, both built from `mcp server/` with Node.js and npm:

```bash
cd "mcp server"
npm install
npm run bundle -- --target darwin-arm64
npm run plugin
```

Use your own platform key: `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64`.

- **Claude Desktop:** install `mcp server/dist-bundles/media-editor-<key>.mcpb` from Settings, Extensions. Set **Folders Media Editor may open** to `media files/` and **Output folder** to `media files/export/`. Leave no empty **Directory path** row
- **Claude Code:** start a session in the folder that holds your media with `claude --plugin-dir "<path to>/mcp server/claude-plugin"`. The plugin needs Node.js 20.9.0 or newer on the path

Neither route needs ffmpeg installed, since both bring their own. [INSTALL-GUIDE.md](INSTALL-GUIDE.md) covers both installs and a manual ffmpeg install for macOS, Ubuntu and Windows.

### Verify Installation

```bash
bash benchmark/router/run_fixtures.sh
```

```text
PASSED 22/22 fixtures
PASSED 66/66 differential checks (22 inputs x 3 host states, 11 commands, 6 modes in parity)
```

The check calls no model and no network. With the tools installed, ask the session to run `media_health`: it names the ffmpeg it found, where it came from and the folders it may use.

### First Use

```text
$image resize photo.jpg in media files/import to 800 pixels wide as WebP
```

With the tools connected, the reply names the tool that ran and the numbered folder it returned under `media files/export/`. With only ffmpeg, the CLI checks the build for a WebP encoder first and offers JPEG or AVIF when it has none. With neither, the reply hands back the command and says that nothing ran.

### Use It in a claude.ai Project

1. Paste `claude project/Custom Instructions.md` into the custom instructions of a Project named **Media Editor**
2. Remove superseded knowledge uploads, then upload all 8 files in `claude project/knowledge/` with their filenames unchanged
3. Open the Project in Claude Desktop with the extension installed and switch Media Editor on under **+ > Connectors** so the tools run. On claude.ai in a browser the Project advises only

[USER-GUIDE.md](USER-GUIDE.md) walks through the Claude Desktop setup step by step.

&nbsp;

## 4. 🧭 MODES AND ROUTING

Every request resolves to one route object before a reference loads. The tool check decides what runs, never the mode.

#### Commands

| Command | Shortcut | Mode | Tools | Fallback | Routed file |
|---|---|---|---|---|---|
| `$image` | `$img` | Image | `image_*` | ffmpeg | `image-operations.md` |
| `$video` | `$vid` | Video | `video_*` | ffmpeg | `video-and-audio-operations.md` |
| `$audio` | `$aud` | Audio | `audio_*`, `media_remove_silence` | ffmpeg | `video-and-audio-operations.md` |
| `$hls` | none | HLS | `video_hls_ladder` | ffmpeg | `hls-video-conversion.md` |
| `$repair` | `$r` | Repair | `media_probe` then `media_repair` | ffprobe then ffmpeg | `interactive-intelligence.md` |
| `$interactive` | `$int` | Interactive | Chosen after the question | Chosen after the question | `interactive-intelligence.md` |

Tokens match whole, after case normalization. `$rotate`, `$images` and `$repairs` are not commands. [AGENTS.md](AGENTS.md) holds the command registry.

#### Detection Order

1. Take the first exact command in the text. Its mode wins over every keyword
2. With no command, score six keyword sets on word boundaries. The highest score wins, and table order breaks a tie
3. With no command and no keyword hit, route to Interactive and ask one question
4. Load `media-framework.md` and `hvr-core.md`, then the one file the mode routes to, never a second pack
5. Run the tool check and bind the route: tools, ffmpeg or advice

#### Keywords and Weights

Each word-boundary hit adds its weight. `image`, `video`, `audio`, `hls` and `repair` weigh 4, as does the phrase `extract audio`, and every other keyword weighs 3.

- Image: `image`, `photo`, `jpeg`, `png`, `webp`, `avif`, `resize`, `crop`
- Video: `video`, `mp4`, `mov`, `transcode`, `trim`, `overlay`, `subtitle`
- Audio: `audio`, `mp3`, `aac`, `wav`, `extract audio`, `silence`
- HLS: `hls`, `streaming`, `adaptive`, `m3u8`, `playlist`, `segment`
- Repair: `repair`, `broken`, `corrupted`, `recover`

`photo` matches "compress this photo" and never "photography". The trigger words live in [router-contract.md](sk-media-editor/references/router-contract.md).

#### Precedence, By Example

Each line is the output of `route_contract.py` on this tree.

- `$audio from this video file` routes to Audio, because one command beats every word after it
- `$aud strip the track from this $video` routes to Audio, because the first command in the text wins
- `compress this video for email` routes to Video on the keyword `video`
- `turn this into adaptive streaming` routes to HLS on `adaptive` plus `streaming`
- `the file is corrupted, please recover it` routes to Repair on `corrupted` plus `recover`
- `$images for the deck, resize them` routes to Image on keywords, because `$images` is not a command
- `$rotate the logo` routes to Interactive, because `$rotate` is not a command and no keyword scores

#### The Route Object

Run any request through the same code the fixtures test:

```bash
python3 benchmark/router/route_contract.py "\$audio from this video file"
```

```json
{
  "mode": "AUDIO",
  "tool": "audio_*",
  "fallback": "ffmpeg",
  "source": "command",
  "needs_disambiguation": false,
  "resources": [
    "references/media-framework.md",
    "references/hvr-core.md",
    "references/video-and-audio-operations.md"
  ]
}
```

`tool` is the tool group the mode calls when the tools are connected, and `fallback` is what runs when they are not. `source` is `command`, `semantic` or `fallback`, and `needs_disambiguation` is true exactly when the mode is Interactive. The schema rejects any tool or fallback outside its fixed list, so the fixtures cannot drift from the contract unseen.

#### The One Question

A request with no command and no keyword gets one question covering everything at once, then waits:

```markdown
Please provide the following at once:

1. Media type: image, video, audio or HLS streaming
2. File information: location, current format, approximate size
3. Processing goal: target use case and the size-versus-quality priority
4. Output preferences: save location and a specific format, or let the system choose
```

Before asking for a path, the CLI lists `media files/import/` and the working directory and uses the file whose name or type matches. It asks only when nothing matches or more than one file does.

&nbsp;

## 5. 🛠️ THE MEDIA EDITOR TOOLS

The tools come from the Media Editor MCP server in `mcp server/`. A host starts it on your machine and calls its 39 tools over stdio.

#### Every Tool Follows the Same Rules

- It opens files only inside the folders you allow, and an input path outside them fails with `PATH_NOT_ALLOWED`
- It writes each result into a new numbered folder under the output folder and never overwrites a file
- Video and audio tools try a lossless stream copy first and re-encode only when the copy cannot work
- Image tools run on the sharp image library and need no ffmpeg at all

#### The 39 Tools

| Group | Count | Tools |
|---|---:|---|
| Image | 8 | `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` |
| Audio | 6 | `audio_extract`, `audio_convert`, `audio_convert_properties`, `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels` |
| Video | 20 | `video_trim`, `video_convert`, `video_convert_properties`, `video_set_aspect_ratio`, `video_set_resolution`, `video_set_codec`, `video_set_bitrate`, `video_set_frame_rate`, `video_set_audio_codec`, `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels`, `video_set_speed`, `video_add_fade`, `video_add_text_overlay`, `video_add_image_overlay`, `video_add_subtitles`, `video_add_b_roll`, `video_concat`, `video_hls_ladder` |
| Media | 5 | `media_health`, `media_probe`, `media_repair`, `media_remove_silence`, `media_setup_ffmpeg` |

[tools.md](sk-media-editor/references/tools.md) lists every parameter and default. `media_health` is the first call to make when something fails.

#### Consent Before Any Download

The server never downloads anything without your agreement.

1. `media_health` reports a missing ffmpeg or ffprobe and names `media_setup_ffmpeg` as the next step
2. A first call to `media_setup_ffmpeg` returns `CONSENT_REQUIRED` with the planned download for each binary: address, size, SHA-256 and destination
3. The plan is shown to you, and the second call with `consent: true` runs only after you agree
4. The download is checked against its SHA-256 before it is installed into the server's data folder

#### Error Codes

A tool that returns an error code has not produced a result. The reply names the code and the next step and never presents the call as a run. The 15 codes:

| Code | What to do |
|---|---|
| `INVALID_INPUT` | Fix the named parameter and retry |
| `PATH_NOT_ALLOWED` | Start the session in the media folder, or add that folder to the allowed folders |
| `CONFIG_MISSING` | Set the folders in the extension settings and remove any empty Directory path row |
| `INPUT_NOT_FOUND` | Check the path |
| `OUTPUT_EXISTS` | Use another `outputName`, or move the output folder off the input |
| `UNSUPPORTED_FORMAT` | Convert the file first, or pick the tool that takes it |
| `FFMPEG_NOT_FOUND` | Run the consent flow, or fall back to ffmpeg on the path |
| `FFPROBE_NOT_FOUND` | Run the consent flow for ffprobe |
| `CAPABILITY_MISSING` | Run the operation on local ffmpeg when its build has the encoder or filter, otherwise advise |
| `PROCESS_FAILED` | Run `media_probe` on the input, and send a damaged file to `media_repair` |
| `PROCESS_TIMEOUT` | Split or trim the file, or raise `MEDIA_EDITOR_TIMEOUT_SECONDS` from its 1800-second default |
| `CONSENT_REQUIRED` | Show the planned download and wait for the user |
| `DOWNLOAD_FAILED` | Check the connection and retry, or install ffmpeg by hand |
| `CHECKSUM_MISMATCH` | Do not retry blindly. Report it and install ffmpeg by hand |
| `INTERNAL` | Retry once, then report it with the tool name |

#### What No Tool Covers

Four operations have no tool yet and run on local ffmpeg when it is on the path, otherwise as advice. The reply says which route ran.

| Operation | Status | Route |
|---|---|---|
| Compress a video to a quality target | Partial: `video_set_bitrate` lowers the bitrate, no tool takes a CRF target | ffmpeg `-crf` |
| Trim audio | No tool. `video_trim` cuts video | ffmpeg `-ss` and `-to` with `-vn` |
| Normalize loudness | No tool | ffmpeg `loudnorm` |
| Fade audio | No tool. `video_add_fade` fades the picture | ffmpeg `afade` |

&nbsp;

## 6. 🎚️ FORMAT AND QUALITY

Every operation picks a format and a quality level by use case, then names the trade-off in plain words.

#### By Use Case

| Use case | Recommendation |
|---|---|
| Web images | WebP at 85% when the build encodes it, AVIF when compatibility allows, JPEG otherwise |
| Email images | JPEG at 80% for every mail client, PNG when transparency matters |
| Web video | H.264 MP4 for playback everywhere, H.265 or VP9 when size matters and support allows |
| Streaming video | HLS at 1080p, 720p, 480p and 360p for adaptive bandwidth |
| Podcast audio | MP3 at 192 kbps for playback everywhere, AAC for modern devices, FLAC for archive |

#### Image Processing Order

Crop first to remove the unwanted area, then resize, then rotate or flip, then convert the format, and compress as the last step. Each tool call writes a new folder, so a chain reads the previous call's output as its next input.

#### The Build Check

On the ffmpeg route, an encoder check decides the promise. A format list is not evidence: a stock Homebrew ffmpeg lists `webp` as writable and carries no WebP encoder.

```bash
ffmpeg -encoders | grep -E "libwebp|libsvtav1|libx264|libx265|aac"
```

The tools carry their own encoders for JPEG, PNG, WebP and AVIF, so the image tools need no such check.

#### The Five Phases

| Phase | What the user sees |
|---|---|
| Measure | "Analyzing source (4K PNG, 8.5MB)" |
| Evaluate | "Evaluating (WebP optimal)" |
| Decide | "Deciding (85% quality, 1080p)" |
| Implement | "Processing (95% reduction)" |
| Analyze | "Complete (quality verified)" |

A result below its quality threshold, an unsupported format or a missing encoder triggers the improvement loop: name the issue, try another format or setting, then settle on the best compromise. Three passes is the ceiling.

#### Voice Rules

`hvr-core.md` is the Human Voice card. It loads on every request and carries every hard blocker inline, including bans on em dashes, semicolons and the Oxford comma. A reply that reports a run or gives a command carries one self-scan line:

```text
HVR self-scan: N hard blockers. Fixed: <terms>. Kept with reason: <terms>.
```

`human-voice-rules.md` holds the full standard and loads only when a borderline term needs a ruling.

&nbsp;

## 7. 📤 EXPORT AND DELIVERY

The save happens before the reply, and the reply reports only what ran.

#### Folder Naming

```text
media files/export/[###] - [description]/
```

Examples:

- `media files/export/001 - resized-product-images/`
- `media files/export/002 - compressed-hero-video/`

A new operation takes the next free three-digit number and a short lowercase hyphenated description. A folder rather than a file, because one operation often writes several: an HLS conversion alone writes a master playlist, four variant playlists and a segment set per quality.

#### The Media Folders

```text
media files/
├── import/   source files to edit, read in place and never written
├── export/   every processed result, one numbered folder per operation
└── tests/    sample and test files for checks and the playbook
```

Set the extension's **Output folder** to `media files/export/` so tool results and ffmpeg results land in the same place.

#### What Git Keeps

`.gitignore` ignores everything in the three folders except their `.gitkeep` files. Your media and your results stay on your machine, and the repository carries only the empty folders.

#### Save Before Reply

1. Check the route: the tools when connected, otherwise `ffmpeg -version`
2. Process the media through the bound route
3. Save to `media files/export/[###] - [description]/`, or keep the folder a tool returned
4. Check that the files saved
5. Only then reply with the path and a two to three sentence summary

Showing a full processing log, putting the path after a long description and asking whether to save are all prohibited. Saving is not a question.

#### Reply Shape

```markdown
[Media Type] processing complete

Input:
- File: [name] ([size])
- Format: [format]

Results:
- Size: [original] to [new] ([percentage]% reduction)
- Format: [original] to [new]

Output:
- Saved to: media files/export/[### - description]/
```

Replies use dash bullets only, no horizontal dividers and no emoji bullets.

&nbsp;

## 8. 🎬 HLS STREAMING

`$hls` turns one video into a multi-quality adaptive stream: a master playlist plus one variant per quality.

#### The Ladder

| Quality | Maxrate | Profile | For |
|---|---:|---|---|
| 1080p | 2500k | main | desktop displays |
| 720p | 1500k | main | desktop and tablets |
| 480p | 800k | baseline | mobile and slower connections |
| 360p | 500k | baseline | very slow connections |

```text
media files/export/[###] - [description]/
├── master.m3u8
├── 1080p/   playlist.m3u8 + segment_*.ts
├── 720p/    playlist.m3u8 + segment_*.ts
├── 480p/    playlist.m3u8 + segment_*.ts
└── 360p/    playlist.m3u8 + segment_*.ts
```

#### With the Tools

`video_hls_ladder` encodes the same ladder in one call, with aligned keyframes and MPEG-TS segments.

- `rungs` picks 1 to 4 of the four qualities, always from 1080p down, and a rung taller than the source is left out and named
- `crf` defaults to 23, where 18 is visually lossless and 28 is medium
- `segmentDuration` defaults to 2 seconds for a fast start and quick quality switching, with 2 to 10 allowed
- The audio track is dropped, the same as `-an` in the commands

#### Without the Tools

[hls-video-conversion.md](sk-media-editor/assets/hls-video-conversion.md) holds the ffmpeg command pack for the same ladder, the batch script and the GPU acceleration notes.

&nbsp;

## 9. 🧩 CLAUDE PROJECT PACKAGE

`claude project/` carries the same system for a claude.ai Project, which never loads `SKILL.md`.

- `Custom Instructions.md` is the kernel, v1.7.0, aligned to skill v1.7.0. Its eight sections end with Section 8, Router Code, and it is the routing authority inside the Project
- `knowledge/` holds 8 files: the MEDIA framework, Interactive Intelligence, the image and the video and audio operation references, the tools reference, HLS conversion and the two Human Voice cards
- `README.md` holds the upload steps, the parity rule and the smoke checks
- `kernel-review.json` is a dated record of one kernel review, read by no tool

#### What Changes in a Project

| Skill in a CLI | Project in Claude Desktop with the extension | Project on claude.ai in a browser |
|---|---|---|
| Runs the tools, or ffmpeg on the path | Runs the tools on your machine | Runs nothing |
| Saves to `media files/export/` and checks the save | Reports the folder the tool returned | Hands back the command, where the result lands and the check |
| Loads files from `references/` and `assets/` | Consults the matching knowledge document | Consults the matching knowledge document |

A Project reply where no tool ran leads with **Run this**, **Result lands in** and **Check this**, then closes with an attestation line that reads `execution = did not occur`. The kernel never claims a run, a check or a save that no tool made.

#### Byte Copies and the Router Code

Every knowledge file is a byte-for-byte copy of its skill source. The router contract is the one skill reference with no mirror: the kernel ends with that code minus its comments, and `benchmark/router/differential.py` holds the two equal. An uploaded Router Contract document would be a second router that nothing compares. [SYNC.md](SYNC.md) holds the parity method and the dated change records.

The live Project is a separate manual upload, so a matching local package proves nothing about what is deployed.

&nbsp;

## 10. 🧪 BENCHMARKS AND CHECKS

#### Checks That Run From a Clone

| Command | What it checks | Result on this tree |
|---|---|---|
| `bash benchmark/router/run_fixtures.sh` | 22 route fixtures, then the differential against `router-contract.md` | `PASSED 22/22 fixtures` and `PASSED 66/66 differential checks` |
| `python3 benchmark/router/route_contract.py "<request>"` | One request through the oracle | The route object |
| `bash benchmark/grader/check_report.sh <report-folder>` | The voice lint of every captured reply, then twin agreement | `all 2 report checks clean` on the sample report |

The server has its own suites. In `mcp server/`, `npm test` runs 83 vitest files over the tools, the server and the packaging on the development ffmpeg, so it needs ffmpeg and ffprobe on the path. `npm run test:pinned` runs the same suites on this machine's pinned ffmpeg after checking its digest.

#### What the Router Differential Proves

`route_contract.py` is the router as a program. `router-contract.md` carries the same router as Python inside markdown, which is what the skill reads. `differential.py` lifts that code out, runs it and compares the copies on four guards:

- Copy parity: the kernel's Router Code section is the contract's code with its comments removed, and `SKILL.md` carries no second copy
- Table parity: commands, keywords in table order, resource lanes, tool groups, fallbacks and the token pattern match the oracle value for value
- Behavior parity: every fixture input routes the same in three host states, tools connected, ffmpeg only and neither, while the live route moves from `tools` to `ffmpeg` to `advice`
- Coverage: every command, every mode by command and by keyword, the fallback and the false prefixes `$rotate` and `$images` appear in the fixtures

Prose and code cannot drift apart without one of the four failing.

#### The Reply Grader

`benchmark/grader/` re-reads a finished playbook run. `lint_replies.py` checks every captured reply for em dashes, semicolons, curly quotes, horizontal dividers, bullets ending in a full stop and the card's hard-blocker words and phrases. `twin_divergence.py` pairs the six scenarios that run on both packagings with their twins and reports any pair whose verdicts disagree. `check_report.sh` runs both, keeps going past the first finding and exits with how many reported.

#### The Manual Testing Playbook

[The playbook](sk-media-editor/manual-testing-playbook/manual-testing-playbook.md) turns the contract into 27 conversations in 18 category folders: 16 for the skill (`S` IDs) and 11 for the Project (`P` IDs). They cover the identity handover, command routing with the aliases and the first-command rule, the tool check with the ffmpeg consent flow and an error code hand-off, one-question intake, the generation boundary, export delivery, HLS, Repair Mode and the route order with the tools connected in Claude Code and in Claude Desktop.

#### The Captured Run

One run of the playbook sits in `benchmark/reports/`, with its verdicts, adjudication and captured replies. The 2026-09-17 run, Claude Sonnet 5 at medium effort, covered the 16 scenarios of that day and scored 4 PASS and 4 FAIL on the skill and 5 PASS and 3 FAIL on the Project. Three of the five twin pairs then declared disagreed.

What the run found:

- Three of the four skill failures shared one shape: the fixture sat in the working directory and the reply asked for a file path anyway. The CLI now lists `media files/import/` and the working directory before it asks
- The Project named its instruction set in its own words instead of the kernel's line, and under a second push it named a generation surface as an alternative. Naming a generation product is now the same breach as generating
- The three route-order scenarios postdate the run and have no captured verdict yet

#### Maintainer Scripts

`benchmark/parity/` holds five wrappers and `benchmark/gates/` holds `rule_parity.py`. They compare the Claude Project package against the skill sources by calling a shared sync toolkit that lives one folder above this repository in the maintainer's monorepo and is not published. From a clone they stop on the missing file and exit 2. Use the checks above instead.

&nbsp;

## 11. 🗂️ REPOSITORY STRUCTURE

```text
.
├── .gitignore                       keeps the media in media files/ local
├── AGENTS.md                        CLI entry point, export protocol and command registry
├── Favicon.jpg                      repository icon
├── INSTALL-GUIDE.md                 extension, plugin and manual ffmpeg install
├── LICENSE                          MIT license
├── README.md                        this guide
├── SYNC.md                          parity method and dated change records
├── USER-GUIDE.md                    Claude Desktop setup for the Media Editor Project
├── benchmark/
│   ├── gates/                       rule_parity.py, maintainer only
│   ├── grader/                      reply linter, twin comparison and a sample report
│   ├── parity/                      five wrappers into the shared parity gate, maintainer only
│   ├── reports/                     one captured playbook run
│   └── router/                      route_contract.py, 22 fixtures and the differential
├── claude project/
│   ├── Custom Instructions.md       claude.ai kernel v1.7.0, ends with the router code
│   ├── README.md                    upload steps, parity rule and smoke checks
│   ├── kernel-review.json           dated record of one kernel review
│   └── knowledge/                   8 knowledge files
├── mcp server/
│   ├── src/                         server source and the 39 tools
│   ├── scripts/                     bundle, plugin and pinned-test builds
│   ├── tests/                       83 vitest files
│   ├── claude-plugin/               Claude Code plugin
│   ├── manifest.json                Claude Desktop extension manifest
│   └── THIRD_PARTY_NOTICES          licences of the code it derives from and the parts it bundles
├── media files/
│   ├── import/                      source files to edit
│   ├── export/                      every result, one numbered folder per operation
│   └── tests/                       sample media for checks and the playbook
└── sk-media-editor/
    ├── README.md                    skill guide
    ├── SKILL.md                     router rules, tool check and delivery protocol
    ├── graph-metadata.json          skill graph edges and trigger phrases
    ├── leaf-manifest.config.json    which folders hold the routed docs
    ├── leaf-manifest.json           generated list of the routed docs
    ├── leaf-aliases.json            generated identity map of those docs
    ├── assets/                      HLS conversion with video_hls_ladder and ffmpeg
    ├── changelog/                   11 release notes, v1.0.0.0 to v1.7.0.0
    ├── manual-testing-playbook/     27 scenarios in 18 category folders
    └── references/                  8 reference files, loaded always, per route or on demand
```

`AGENTS.md` points an agent CLI at the skill. A claude.ai Project reads `claude project/Custom Instructions.md` and the files under `claude project/knowledge/` instead. The Claude Code plugin carries its own copy of the skill beside the server.

&nbsp;

## 12. ❓ FAQ

**Q: Can it generate a new image, video or clip from a prompt?**

No. It edits, converts, compresses and streams media that already exists. A generation request is refused and reframed into an editing operation where one applies, and the reply never names a generation product.

**Q: Do I need ffmpeg installed?**

Not with the Claude Desktop extension or the Claude Code plugin, which bring their own. Without them, the CLI uses ffmpeg and ffprobe from the path, and without either it hands back the command and says nothing ran.

**Q: Do my files leave my machine?**

No. The tools run locally, open only the folders you allow and write only into the output folder.

**Q: Why did it refuse WebP or AVIF?**

On the ffmpeg route the build carries no encoder for it. Check with `ffmpeg -encoders | grep -E "libwebp|libsvtav1"`, or use the tools, which encode both.

**Q: Why is every result a folder?**

One operation often writes several files. An HLS ladder alone is a master playlist, four variant playlists and their segments.

**Q: Does the claude.ai Project run anything?**

Only through the tools, in Claude Desktop with the extension installed. On claude.ai in a browser it gives the exact command, where the result lands and how to check it, and says that nothing ran.

**Q: Can it do color grading, effects or multi-track editing?**

No. Those are out of scope and get reframed into a supported operation, the same as a request to upload to a platform.

**Q: Do I need the claude.ai package?**

No. The CLI skill and the tools are complete on their own. The Project package exists for people who work in Claude Desktop or claude.ai.

&nbsp;

## 13. 🔧 TROUBLESHOOTING

**The reply gives an ffmpeg command instead of editing**

Neither the tools nor ffmpeg answered. Install the extension or the plugin, or install ffmpeg and confirm `ffmpeg -version` answers. In Claude Desktop, check that Media Editor is on under **+ > Connectors**.

**"Unable to connect to extension server" in Claude Desktop**

An empty **Directory path** row under **Folders Media Editor may open** reads as a missing required setting. Remove every empty row, click **Save**, then switch the extension off and on.

**A tool returns `PATH_NOT_ALLOWED`**

The file sits outside the allowed folders. Add its folder in the extension settings, move the file into `media files/import/`, or start Claude Code in the folder that holds it.

**`media_health` says ffmpeg is missing**

The bundled ffmpeg cannot run on this machine. Ask for `media_setup_ffmpeg`, read the planned download and agree to it.

**The request routed to the wrong mode**

A keyword outscored the one you meant. Check the route with `python3 benchmark/router/route_contract.py "<request>"`, then add the exact command.

**It keeps asking one question**

No command and no keyword scored. Answer in one reply, or add a command to go straight to that mode.

**`Unknown encoder 'libwebp'`**

The installed build has no WebP encoder, true of stock Homebrew ffmpeg. Choose JPEG, PNG or AVIF, or use the tools.

**A long transcode looks stuck**

Large sources take minutes. A tool stops at `PROCESS_TIMEOUT` after 1800 seconds by default, so split or trim the file, or raise `MEDIA_EDITOR_TIMEOUT_SECONDS`.

**`run_parity.sh` or `rule_parity.py` exits 2**

They need a sync toolkit outside this repository, in the maintainer's monorepo. Use the router checks, which run from a clone.

**`check_report.sh` changed a report folder**

It writes `hvr-lint.csv` beside the replies it lints. Run it on a copy of the folder.

&nbsp;

## 14. 📚 RELATED DOCUMENTS

**System guides**

- **[→ Agent Bootstrap](AGENTS.md)** - entry point, export protocol and command registry
- **[→ Media Editor Skill](sk-media-editor/SKILL.md)** - router rules, tool check and delivery protocol
- **[→ Skill README](sk-media-editor/README.md)** - mode-by-mode guide to the skill folder
- **[→ Image Operations](sk-media-editor/references/image-operations.md)** - the image tools first, then ffmpeg image recipes
- **[→ Video and Audio Operations](sk-media-editor/references/video-and-audio-operations.md)** - the video and audio tools first, then ffmpeg recipes
- **[→ Media Editor Tools](sk-media-editor/references/tools.md)** - all 39 tools, consent, error codes, settings and gaps
- **[→ HLS Video Conversion](sk-media-editor/assets/hls-video-conversion.md)** - `video_hls_ladder`, then the ffmpeg command pack
- **[→ MEDIA Framework](sk-media-editor/references/media-framework.md)** - the five phases, validation and quality gates
- **[→ Interactive Intelligence](sk-media-editor/references/interactive-intelligence.md)** - the one-question flow and its templates
- **[→ Router Contract](sk-media-editor/references/router-contract.md)** - the router as running Python
- **[→ Manual Testing Playbook](sk-media-editor/manual-testing-playbook/manual-testing-playbook.md)** - the 27 scenarios and their pass criteria
- **[→ Latest Release Notes](sk-media-editor/changelog/v1.7.0.0.md)** - v1.7.0.0, the tool groups and the router contract

**Install and setup**

- **[→ Install Guide](INSTALL-GUIDE.md)** - extension, plugin and manual ffmpeg install
- **[→ User Guide](USER-GUIDE.md)** - Claude Desktop setup for the Media Editor Project
- **[→ MCP Server](mcp%20server/README.md)** - build, test and configure the server
- **[→ Claude Code Plugin](mcp%20server/claude-plugin/README.md)** - plugin install and use

**Claude Project package**

- **[→ Project Setup](claude%20project/README.md)** - upload steps, parity rule and smoke checks
- **[→ Project Kernel](claude%20project/Custom%20Instructions.md)** - the claude.ai custom instructions
- **[→ Parity Notes](SYNC.md)** - parity method and dated change records

**Benchmark guides**

- **[→ Router Checks](benchmark/router/README.md)** - route object, decision rules and the differential
- **[→ Reply Grader](benchmark/grader/README.md)** - voice lint and twin comparison
- **[→ Rule Parity Gate](benchmark/gates/README.md)** - maintainer check of rules across the two packages
- **[→ Parity Wrappers](benchmark/parity/README.md)** - maintainer wrappers into the shared parity gate
- **[→ Claude Sonnet 5 Run](benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/README.md)** - verdicts, twin comparison and findings
