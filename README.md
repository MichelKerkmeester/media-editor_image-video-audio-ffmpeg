# Media Editor - Image, Video & Audio with FFmpeg

[![GitHub Stars](https://img.shields.io/github/stars/MichelKerkmeester/media-editor_image-video-audio-ffmpeg?style=for-the-badge&logo=github&color=fce566&labelColor=222222)](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/stargazers)
[![License](https://img.shields.io/github/license/MichelKerkmeester/media-editor_image-video-audio-ffmpeg?style=for-the-badge&color=7bd88f&labelColor=222222)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/MichelKerkmeester/media-editor_image-video-audio-ffmpeg?style=for-the-badge&color=5ad4e6&labelColor=222222)](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/commits/main)

> Like it? https://buymeacoffee.com/michelkerkmeester

&nbsp;

## 1. 📝 SUMMARY

Ask Claude to resize a photo, cut a clip, pull the audio out of a video or build a streaming ladder, and it does the work on your own computer.

The Media Editor is 40 editing tools with their own ffmpeg, plus the skill that tells Claude how to use them. Your files never leave your machine, nothing is ever overwritten, and every result gets a name that says what it shows instead of `CleanShot 2026-10-03 at 16.46.54-converted.webp`.

Works in Claude Desktop and in a claude.ai Project, and in any terminal agent, such as Claude Code, Codex, OpenCode or Pi, through the `media-editor` command

**What's inside**

- **Claude Desktop Extension** - one `.mcpb` file per platform, installed from Settings, with its own ffmpeg and ffprobe inside
- **The `media-editor` Command** - the 40 tools as one terminal command, for Claude Code, Codex, OpenCode, Pi or any agent that can run a shell command
- **Claude Code Plugin** - the command plus the skill, packaged for Claude Code
- **Claude Project Package** - a kernel and seven Knowledge files that turn a Project into the Media Editor, running the tools in Claude Desktop and advising everywhere else
- **40 Tools** - 8 image, 6 audio, 20 video and 6 media tools, from `image_resize` to `video_hls_ladder` and `media_rename`
- **Readable Names** - Claude looks at the content, proposes a name such as `team-offsite-hero.webp` and asks before it writes
- **A Tidy Export Folder** - one result lands straight in `media files/export/`, a batch of files goes into the one place you choose before anything is written, and an operation that writes several files gets a numbered folder
- **Checks Without a Model** - 22 router fixtures, 110 differential checks and 91 server test files

**Why it earns a place**

- Private by construction: the tools open only the folders you allow, write only into the export folder and never replace a file
- Honest about what ran: a reply where no tool and no ffmpeg ran hands back the exact command and says that nothing ran
- No surprise downloads: a missing ffmpeg is fetched only after you have seen its address, size and SHA-256 and said yes

&nbsp;

## 2. 🎁 WHAT YOU GET

### 🖥️ Claude Desktop Extension

The easiest way in. One file, no terminal, no ffmpeg install.

- Download `media-editor-<platform>.mcpb` from the [latest release](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/latest), install it from **Settings > Extensions**, pick the folders it may open and where results go
- Chat normally, or open the Media Editor Project, and Claude calls the tools for you
- ffmpeg and ffprobe ship inside the extension for macOS on Apple and Intel chips, Windows and Linux on x64 and arm64

### ⌨️ Any Terminal Agent

The same 40 tools through the `media-editor` command, plus the skill that drives them. The skill needs no MCP server, so any agent that can run a shell command can use it: Claude Code, Codex, OpenCode, Pi and the rest.

- Start the agent in the folder that holds your media, and the command reads that folder and nothing else
- Results land in that folder's `media files/export/`, created on first use
- `media-editor health` is the check, and it reports the ffmpeg it found and the folders it may use
- **Claude Code** gets the command and the skill from the plugin, which puts the command on the Bash tool's path and registers no MCP server
- **Codex, OpenCode, Pi and other agents** get the command from a one-time `npm link`, and load the skill through `AGENTS.md`

claude.ai and Cowork do not install a plugin that has a `bin/` folder, so a claude.ai user takes the extension route in Claude Desktop.

### 💬 Claude Project

The Media Editor as a Project, for people who live in the Claude app.

- `claude project/Custom Instructions.md` plus seven Knowledge files set up the Project in a few minutes
- In Claude Desktop with the extension switched on, the Project runs the tools and reports the path each one returned
- On claude.ai in a browser or the mobile app, where no local tool can run, it gives the exact ffmpeg command, where the result lands and how to check it, and says plainly that nothing ran

### 🏷️ Names That Mean Something

Imports arrive as `IMG_4821.MOV`, `CleanShot 2026-10-03 at 16.46.54.png` or a chat placeholder like `[Image #2]`.

- Before it writes, Claude looks at the content, with a small preview from `image_probe` or `media_probe`, and proposes two to five plain words
- You confirm or change the name in the same question as anything else it needs, and nothing is renamed without your yes
- `media_rename` renames a result that is already written, in place, and never over another file

### 📁 One Export Folder, No Clutter

Four quick conversions used to leave four folders holding one file each. Not anymore.

- One result goes straight into `media files/export/` under its readable name
- An HLS ladder or a batch resize, which write several files, get one numbered folder such as `001 - product-shot-sizes/`
- A name that is already taken becomes `-2`, `-3` and so on, so an earlier result is never replaced

&nbsp;

## 3. 🚀 QUICK START

Pick the row for where you chat with Claude. You need one of them, not all.

| Where you work | Install | What it can do |
|---|---|---|
| Claude Desktop | The Desktop extension, then optionally the Project | Edit your files and save the results |
| Claude Code | The Claude Code plugin | Edit your files and save the results |
| Codex, OpenCode, Pi or another terminal agent | The `media-editor` command, linked once, or ffmpeg on the path | Edit your files and save the results |
| claude.ai in a browser, or mobile | Only the Project | Advise with the exact command to run yourself |

### Get the Code

```bash
git clone https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg.git
cd media-editor_image-video-audio-ffmpeg
```

### Claude Desktop

Download `media-editor-<key>.mcpb` for your platform from the [latest release](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/latest), or build it with Node.js and npm:

```bash
cd runtime
npm install
npm run bundle -- --target darwin-arm64
```

Use your own key: `darwin-arm64` for a Mac with an Apple chip, `darwin-x64` for an Intel Mac, `win32-x64`, `linux-x64` or `linux-arm64`. The file lands in `runtime/dist-bundles/media-editor-<key>.mcpb`.

1. In Claude Desktop, open **Settings > Extensions > Advanced settings** and click **Install Extension…** under **Extension Developer**, then choose the `.mcpb` file
2. Set **Folders Media Editor may open** to the `media files/` folder of this repository, plus any other folder that holds media. Leave no empty **Directory path** row, or the tools will not start
3. Set **Output folder** to `media files/export/`
4. In a chat, open **+ > Connectors** and switch Media Editor on
5. Ask `Run media_health and tell me what it found.` It names the ffmpeg it found and the folders it may use

[USER-GUIDE.md](USER-GUIDE.md) walks through every screen, including the checks that prove it works.

### Claude Code

```bash
cd runtime
npm install
npm run bundle -- --target darwin-arm64
npm run plugin
```

Then start Claude Code in the folder that holds your media, with the plugin loaded:

```bash
claude --plugin-dir "<path to>/runtime/claude-plugin"
```

`media-editor health` in the session should report the ffmpeg it found and the folders it may use. Claude Code puts the plugin's `bin/` folder on the Bash tool's path, so the bare command works. The plugin needs Node.js 20.9.0 or later on the path and no settings. [The plugin README](runtime/claude-plugin/README.md) has the details.

### Claude Project

1. Create a Project named **Media Editor** and paste `claude project/Custom Instructions.md` into its custom instructions
2. Upload the six files in `claude project/knowledge/` with their filenames unchanged, after removing any older upload of the same document
3. Open the Project in Claude Desktop with the extension switched on, so the tools run. On claude.ai in a browser the Project advises only

### Codex, OpenCode, Pi and Other Terminal Agents

Open the folder in Codex, OpenCode, Pi or any other agent that reads `AGENTS.md`, and point the model at that file. It loads `sk-media-editor/SKILL.md` and works as the Media Editor from then on.

The tools come from the `media-editor` command. Install it once from a copy of this repository, with Node.js 20.9.0 or later:

```bash
cd runtime
npm install
npm run build
npm link
```

Then `media-editor health` works from any folder, and `npm unlink -g media-editor-mcp` removes it. Without the command it runs ffmpeg and ffprobe from your path, and [INSTALL-GUIDE.md](INSTALL-GUIDE.md) covers a manual ffmpeg install for macOS, Ubuntu and Windows.

### First Use

Drop a photo into `media files/import/` and ask:

```text
$image make CleanShot 2026-10-03 at 16.46.54.png a WebP for the website
```

Claude checks the route, looks at the picture and proposes a name:

```text
This looks like the team on the beach at the offsite. I'd save it as
team-beach-offsite.webp in media files/export/. Keep that name, or give me another?
```

Say yes, or give your own name, and the reply leads with the path of the new file.

### Verify Installation

The router checks need Bash and Python 3, and call no model and no network:

```bash
bash benchmark/router/run_fixtures.sh
```

```text
PASSED 22/22 fixtures
PASSED 110/110 differential checks (22 inputs x 5 host states, 11 commands, 6 modes in parity)
```

&nbsp;

## 4. 🗺️ HOW IT WORKS

Three steps carry a request through the Media Editor:

1. **Routing**

   `sk-media-editor/references/router-contract.md` resolves one mode before any reference loads. A command wins first, then the keyword score, then one question.

2. **Running**

   The tool check picks the first route that answers: the `media-editor` command, then hand-written ffmpeg, then advice. The route decides what runs, never what the mode is.

3. **Naming and delivery**

   MEDIA thinking and the build check run before anything is written. The result gets a confirmed readable name, is saved and checked, and only then does the reply name its path.

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
        │                 TOOL CHECK                 │
        │                                            │
        │  media-editor      media-editor health,    │
        │                    then the tool           │
        │  ffmpeg on path    ffmpeg -version, then   │
        │                    the recipe              │
        │  Neither           advice, nothing ran     │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
        ┌────────────────────────────────────────────┐
        │                  NAMING                    │
        │                                            │
        │  Preview     image_probe or media_probe    │
        │  Propose     team-offsite-hero.webp        │
        │  Wait        nothing written before yes    │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
        ┌────────────────────────────────────────────┐
        │  Measure → Evaluate → Decide               │
        │          → Implement → Analyze             │
        │                                            │
        │  Build check   encoder before any promise  │
        │  Quality fit   format chosen by use case   │
        └──────────────────────┬─────────────────────┘
                               │
                               ▼
              media files/export/team-offsite-hero.webp
          or  media files/export/001 - several-files/
                       saved, then checked
                               │
                               ▼
               path plus a two to three sentence summary
```

### Smart Router

One request, one mode. `$image`, `$video`, `$audio`, `$hls`, `$repair` and `$interactive` match only as whole tokens, so `$rotate` and `$images` carry no command. With two commands, the first one in the text wins.

### Tool Check

The `media-editor` command first, then hand-written ffmpeg, then advice. With the command available, `media-editor health` reports the ffmpeg it found, its encoders and filters and the folders in effect. Without it, `ffmpeg -version` decides whether the recipe runs. With neither, the reply gives the exact command and says that nothing ran.

### MEDIA Thinking

Five phases, one visible line each, such as "Evaluating (WebP optimal)". The comparison of formats and settings stays internal, and a missed quality target, an unsupported format or a missing encoder triggers up to three improvement passes.

&nbsp;

## 5. 📤 NAMING AND EXPORT

The save happens before the reply, and the reply reports only what ran.

#### How a Name Is Chosen

1. The skill looks at what the media shows. With the command available, `image_probe` or `media_probe` with `preview: true` writes a small JPEG, one frame for a video
2. It proposes two to five lowercase words joined by hyphens and keeps the extension: `team-offsite-hero.webp`, `product-demo-720p.mp4`, `standup-voice-memo.mp3`
3. It asks you to confirm or change the name in the same question as anything else it needs, then waits
4. It writes the result under the confirmed name, through the tool's `fileName`, or renames an existing result with `media_rename`

A name you already gave in the request is used as given, with no question. Advice writes no file, so it puts the proposed name straight into the command.

#### Where Results Land

```text
media files/
├── import/   source files to edit, read in place and never written
├── export/   every result, one file directly, several in one numbered folder
└── tests/    sample and test files for checks and the playbook
```

- One result: `media files/export/team-offsite-hero.webp`
- Several results from one operation: `media files/export/001 - product-shot-sizes/`
- A folder that is optional is asked about first, and a subfolder is never added unasked
- A taken name becomes `team-offsite-hero-2.webp`, so nothing is replaced

`.gitignore` ignores everything in the three folders except their `.gitkeep` files. Your media stays on your machine, and the repository carries only the empty folders.

#### Save Before Reply

1. Check the route: `media-editor health`, otherwise `ffmpeg -version`
2. Propose a readable name and wait for the answer
3. Process the media through the bound route
4. Save to `media files/export/` under the confirmed name
5. Check that the files saved
6. Only then reply with the path and a two to three sentence summary

A full processing log, a path buried after a long description and a question about whether to save are all prohibited. Saving is not a question. Naming is.

&nbsp;

## 6. 🛠️ THE 40 TOOLS

The tools come from the Media Editor runtime in `runtime/`, shipped as the Claude Desktop extension and as the `media-editor` command, which any terminal agent can run and the Claude Code plugin carries. The extension serves the tools over stdio, and the command runs the same tools, one process per call.

#### Every Tool Follows the Same Rules

- It opens files only inside the folders you allow, and an input path outside them fails with `PATH_NOT_ALLOWED`
- A writing tool takes `outputName`, plus an optional `fileName` for a readable name, an optional `subfolder` to force or skip a numbered folder and an optional `targetFolder` that puts later calls of one batch into the folder the first call made. `video_hls_ladder` always writes its own folder
- Every write is an exclusive create, so no call can overwrite an input or an earlier result
- Video and audio tools try a lossless stream copy first and re-encode only when the copy cannot work
- Image tools run on the sharp image library and need no ffmpeg at all

#### The Tool List

| Group | Count | Tools |
|---|---:|---|
| Image | 8 | `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` |
| Audio | 6 | `audio_extract`, `audio_convert`, `audio_convert_properties`, `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels` |
| Video | 20 | `video_trim`, `video_convert`, `video_convert_properties`, `video_set_aspect_ratio`, `video_set_resolution`, `video_set_codec`, `video_set_bitrate`, `video_set_frame_rate`, `video_set_audio_codec`, `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels`, `video_set_speed`, `video_add_fade`, `video_add_text_overlay`, `video_add_image_overlay`, `video_add_subtitles`, `video_add_b_roll`, `video_concat`, `video_hls_ladder` |
| Media | 6 | `media_health`, `media_probe`, `media_rename`, `media_repair`, `media_remove_silence`, `media_setup_ffmpeg` |

[tools.md](sk-media-editor/references/tools.md) lists every parameter and default. `media-editor health` is the first call to make when something fails.

#### Consent Before Any Download

1. `media-editor health` reports a missing ffmpeg or ffprobe and names `media_setup_ffmpeg` as the next step
2. A first call to `media_setup_ffmpeg` returns `CONSENT_REQUIRED` with the planned download for each binary: address, size, SHA-256 and destination
3. The plan is shown to you, and the second call with `consent: true` runs only after you agree
4. The download is checked against its SHA-256 before it is installed into the server's data folder

#### Error Codes

A tool that returns an error code has not produced a result. The reply names the code and the next step and never presents the call as a run.

| Code | What to do |
|---|---|
| `INVALID_INPUT` | Fix the named parameter and retry |
| `PATH_NOT_ALLOWED` | Start the session in the media folder, or add that folder to the allowed folders |
| `CONFIG_MISSING` | Set the folders in the extension settings and remove any empty Directory path row |
| `INPUT_NOT_FOUND` | Check the path |
| `OUTPUT_EXISTS` | Use another `fileName`, `newName` or `outputName`, or move the output folder off the input |
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

## 7. 🧭 MODES AND ROUTING

Every request resolves to one route object before a reference loads.

#### Commands

| Command | Shortcut | Mode | Tools | Fallback | Routed file |
|---|---|---|---|---|---|
| `$image` | `$img` | Image | `image_*` | ffmpeg | `image-operations.md` |
| `$video` | `$vid` | Video | `video_*` | ffmpeg | `video-and-audio-operations.md` |
| `$audio` | `$aud` | Audio | `audio_*`, `media_remove_silence` | ffmpeg | `video-and-audio-operations.md` |
| `$hls` | none | HLS | `video_hls_ladder` | ffmpeg | `hls-video-conversion.md` |
| `$repair` | `$r` | Repair | `media_probe` then `media_repair` | ffprobe then ffmpeg | `interactive-intelligence.md` |
| `$interactive` | `$int` | Interactive | Chosen after the question | Chosen after the question | `interactive-intelligence.md` |

Tokens match whole, after case normalization. [AGENTS.md](AGENTS.md) holds the command registry.

#### Detection Order

1. Take the first exact command in the text. Its mode wins over every keyword
2. With no command, score six keyword sets on word boundaries. The highest score wins, and table order breaks a tie
3. With no command and no keyword hit, route to Interactive and ask one question
4. Load `media-framework.md`, then the one file the mode routes to, never a second pack
5. Run the tool check and bind the route: the `media-editor` command, hand-written ffmpeg or advice

#### Keywords

`image`, `video`, `audio`, `hls` and `repair` weigh 4, as does the phrase `extract audio`, and every other keyword weighs 3.

- Image: `image`, `photo`, `jpeg`, `png`, `webp`, `avif`, `resize`, `crop`
- Video: `video`, `mp4`, `mov`, `transcode`, `trim`, `overlay`, `subtitle`
- Audio: `audio`, `mp3`, `aac`, `wav`, `extract audio`, `silence`
- HLS: `hls`, `streaming`, `adaptive`, `m3u8`, `playlist`, `segment`
- Repair: `repair`, `broken`, `corrupted`, `recover`

#### Precedence, By Example

- `$audio from this video file` routes to Audio, because one command beats every word after it
- `$aud strip the track from this $video` routes to Audio, because the first command in the text wins
- `compress this video for email` routes to Video on the keyword `video`
- `turn this into adaptive streaming` routes to HLS on `adaptive` plus `streaming`
- `the file is corrupted, please recover it` routes to Repair on `corrupted` plus `recover`
- `$rotate the logo` routes to Interactive, because `$rotate` is not a command and no keyword scores

#### The Route Object

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
    "references/video-and-audio-operations.md"
  ]
}
```

`tool` is the tool group the mode calls when the `media-editor` command is available, and `fallback` is what runs when it is not. `needs_disambiguation` is true exactly when the mode is Interactive.

#### The One Question

A request with no command and no keyword gets one question covering everything at once, including the proposed file name, then waits. Before asking for a path, the skill lists `media files/import/` and the working directory and uses the file whose name or type matches.

&nbsp;

## 8. 🎚️ FORMAT AND QUALITY

Every operation picks a format and a quality level by use case, then names the trade-off in plain words.

| Use case | Recommendation |
|---|---|
| Web images | WebP at 85% when the build encodes it, AVIF when compatibility allows, JPEG otherwise |
| Email images | JPEG at 80% for every mail client, PNG when transparency matters |
| Web video | H.264 MP4 for playback everywhere, H.265 or VP9 when size matters and support allows |
| Streaming video | HLS at 1080p, 720p, 480p and 360p for adaptive bandwidth |
| Podcast audio | MP3 at 192 kbps for playback everywhere, AAC for modern devices, FLAC for archive |

#### Image Processing Order

Crop first, then resize, then rotate or flip, then convert the format, and compress as the last step. A chain reads the previous call's output as its next input, and the confirmed name goes on the last step.

#### The Build Check

On the ffmpeg route, an encoder check decides the promise. A format list is not evidence: a stock Homebrew ffmpeg lists `webp` as writable and carries no WebP encoder.

```bash
ffmpeg -encoders | grep -E "libwebp|libsvtav1|libx264|libx265|aac"
```

The tools carry their own encoders for JPEG, PNG, WebP and AVIF, so the image tools need no such check.

&nbsp;

## 9. 🎬 HLS STREAMING

`$hls` turns one video into a multi-quality adaptive stream: a master playlist plus one variant per quality, in one numbered folder.

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

`video_hls_ladder` encodes the ladder in one call with aligned keyframes and MPEG-TS segments. `rungs` picks 1 to 4 qualities, `crf` defaults to 23 and `segmentDuration` to 2 seconds, and the audio track is dropped. Without the command, [hls-video-conversion.md](sk-media-editor/assets/hls-video-conversion.md) holds the ffmpeg command pack for the same ladder.

&nbsp;

## 10. 🧩 CLAUDE PROJECT PACKAGE

`claude project/` carries the same system for a claude.ai Project, which never loads `SKILL.md`.

- `Custom Instructions.md` is the kernel, v1.1.0, aligned to skill v1.1.0.0. Its eight sections end with Section 8, Router Code, and it is the routing authority inside the Project
- `knowledge/` holds 6 files: the MEDIA framework, Interactive Intelligence, the image and the video and audio operation references, the tools reference and HLS conversion
- `README.md` holds the upload steps, the parity rule and the smoke checks
- `kernel-review.json` is a dated record of one kernel review, read by no tool

#### What Changes in a Project

| Skill in a terminal agent | Project in Claude Desktop with the extension | Project on claude.ai in a browser |
|---|---|---|
| Runs the tools through the `media-editor` command, or ffmpeg on the path | Runs the tools on your machine | Runs nothing |
| Saves to `media files/export/` and checks the save | Reports the path the tool returned | Hands back the command, where the result lands and the check |
| Loads files from `references/` and `assets/` | Consults the matching Knowledge document | Consults the matching Knowledge document |

A Project reply where no tool ran leads with **Run this**, **Result lands in** and **Check this**, then closes with an attestation line that reads `execution = did not occur`. The kernel never claims a run, a check or a save that no tool made.

Every Knowledge file is a copy of its skill source. The router contract has no mirror: the kernel ends with that code minus its comments, and `benchmark/router/differential.py` holds the two equal. [SYNC.md](SYNC.md) holds the parity method and the dated change records. The live Project is a separate manual upload, so a matching local package proves nothing about what is deployed.

&nbsp;

## 11. 🧪 BENCHMARKS AND CHECKS

| Command | What it checks | Result on this tree |
|---|---|---|
| `bash benchmark/router/run_fixtures.sh` | 22 route fixtures, then the differential against `router-contract.md` | `PASSED 22/22 fixtures` and `PASSED 110/110 differential checks` |
| `python3 benchmark/router/route_contract.py "<request>"` | One request through the oracle | The route object |
| `bash benchmark/grader/check_report.sh <report-folder>` | Twin agreement between the skill and Project verdicts of a captured run | Exit 0 when every pair agrees |

The server has its own suites. In `runtime/`, `npm test` runs 91 vitest files over the tools, the server and the packaging on the development ffmpeg. `npm run test:pinned` runs the same suites on this machine's pinned ffmpeg after checking its digest, which is the route to use on a Mac with an Apple chip, where the development `ffprobe-static` binary is Intel only.

#### What the Router Differential Proves

`differential.py` lifts the router code out of `router-contract.md`, runs it and compares it with `route_contract.py` and the kernel copy on four guards: copy parity, table parity, behavior parity in five host states (the command, the command beside connected tools, connected tools, ffmpeg only and neither) and coverage of every command, mode and false prefix. Prose and code cannot drift apart without one of the four failing.

#### The Manual Testing Playbook

[The playbook](sk-media-editor/manual-testing-playbook/manual-testing-playbook.md) turns the contract into 32 conversations in 19 category folders, run against both the skill in Claude Code and the Project. They cover the identity handover, command routing, the tool check with the ffmpeg consent flow, one-question intake, the generation boundary, readable names, export without needless folders, HLS, Repair Mode and the route order with the `media-editor` command in Claude Code and the connected tools in Claude Desktop.

#### The Captured Run

One run sits in `benchmark/reports/`: the 2026-09-17 run, Claude Sonnet 5 at medium effort, over the 16 scenarios of that day. It found that the skill asked for a file path it could have found, so the skill now lists `media files/import/` and the working directory before it asks.

#### Maintainer Scripts

`benchmark/parity/` and `benchmark/gates/rule_parity.py` compare the Project package against the skill sources through a shared toolkit that lives outside this repository. From a clone they exit 2. Use the checks above instead.

&nbsp;

## 12. 🗂️ REPOSITORY STRUCTURE

```text
.
├── AGENTS.md                        CLI entry point, export protocol and command registry
├── INSTALL-GUIDE.md                 extension, plugin, standalone command and manual ffmpeg install
├── USER-GUIDE.md                    Claude Desktop setup for the Media Editor Project
├── README.md                        this guide
├── SYNC.md                          parity method and dated change records
├── LICENSE                          MIT license
├── benchmark/
│   ├── gates/                       rule_parity.py, maintainer only
│   ├── grader/                      twin comparison and a sample report
│   ├── parity/                      wrappers into the shared parity gate, maintainer only
│   ├── reports/                     one captured playbook run
│   └── router/                      route_contract.py, 22 fixtures and the differential
├── claude project/
│   ├── Custom Instructions.md       claude.ai kernel v1.1.0, ends with the router code
│   ├── README.md                    upload steps, parity rule and smoke checks
│   ├── kernel-review.json           dated record of one kernel review
│   └── knowledge/                   7 Knowledge files
├── media files/
│   ├── import/                      source files to edit
│   ├── export/                      every result, one file directly, several in a numbered folder
│   └── tests/                       sample media for checks and the playbook
├── runtime/
│   ├── src/                         server source and the 40 tools
│   ├── scripts/                     bundle, plugin and pinned-test builds
│   ├── tests/                       91 vitest files
│   ├── claude-plugin/               Claude Code plugin
│   └── manifest.json                Claude Desktop extension manifest
└── sk-media-editor/
    ├── SKILL.md                     router rules, tool check, naming and delivery protocol
    ├── README.md                    skill guide
    ├── assets/                      HLS conversion with video_hls_ladder and ffmpeg
    ├── changelog/                   release notes, v0.1.0.0 to v1.1.0.0
    ├── manual-testing-playbook/     32 scenarios in 19 category folders
    └── references/                  8 reference files, loaded always, per route or on demand
```

&nbsp;

## 13. ❓ FAQ

**Q: Which one should I install?**

The Desktop extension if you chat in Claude Desktop, the plugin if you work in Claude Code, and the `media-editor` command on its own if you work in Codex, OpenCode, Pi or another terminal agent. The Project is optional on top of the extension, and it is the only part that does anything on claude.ai in a browser, where it advises.

**Q: Do I need ffmpeg installed?**

Not with the extension or the plugin, which bring their own. Without them, the skill uses ffmpeg and ffprobe from the path, and without either it hands back the command and says nothing ran.

**Q: Do my files leave my machine?**

No. The tools run locally, open only the folders you allow and write only into the export folder.

**Q: Why does it ask me about the file name?**

Because imported names rarely say what a file shows, and a rename you did not ask for is worse than a question. Name the result in your request, as in `save it as hero-800.webp`, and it will not ask.

**Q: Why is my result not in a numbered folder anymore?**

A folder for one file is clutter. One result goes straight into `media files/export/`, and an operation that writes several files still gets one folder. For a batch of files, the system asks once before writing whether they go straight into `media files/export/` or into one numbered folder, and every file lands there. Ask for a folder and you get one.

**Q: Can it generate a new image, video or clip from a prompt?**

No. It edits, converts, compresses and streams media that already exists. A generation request is refused and reframed into an editing operation where one applies.

**Q: Why did it refuse WebP or AVIF?**

On the ffmpeg route the build carries no encoder for it. Check with `ffmpeg -encoders | grep -E "libwebp|libsvtav1"`, or use the tools, which encode both.

**Q: Can it do color grading, effects or multi-track editing?**

No. Those are out of scope and get reframed into a supported operation, the same as a request to upload to a platform.

&nbsp;

## 14. 🔧 TROUBLESHOOTING

**The reply gives an ffmpeg command instead of editing**

Neither the `media-editor` command nor ffmpeg answered. Install the extension, the plugin or a standalone command, or install ffmpeg and confirm `ffmpeg -version` answers. In Claude Desktop, check that Media Editor is on under **+ > Connectors**.

**"Unable to connect to extension server" in Claude Desktop**

An empty **Directory path** row under **Folders Media Editor may open** reads as a missing required setting. Remove every empty row, click **Save**, then switch the extension off and on.

**Claude says it cannot rename a file**

The extension or plugin predates `media_rename`. Rebuild with `npm run bundle` or `npm run plugin`, reinstall, and start a new chat. The tool list should now include `media_rename`.

**A tool returns `PATH_NOT_ALLOWED`**

The file sits outside the allowed folders. Add its folder in the extension settings, move the file into `media files/import/`, start your terminal agent in the folder that holds it, or pass `--allowed-dir` with that folder. `media_rename` only renames files inside the export folder.

**`media-editor health` says ffmpeg is missing**

The bundled ffmpeg cannot run on this machine. Run `media-editor media_setup_ffmpeg --args '{}'`, read the planned download and agree to it.

**The request routed to the wrong mode**

A keyword outscored the one you meant. Check the route with `python3 benchmark/router/route_contract.py "<request>"`, then add the exact command.

**`npm test` fails with `FFPROBE_NOT_FOUND` on a Mac with an Apple chip**

The development `ffprobe-static` binary is Intel only. Run `npm run test:pinned`, which uses the pinned arm64 build.

**A long transcode looks stuck**

Large sources take minutes. A tool stops at `PROCESS_TIMEOUT` after 1800 seconds by default, so split or trim the file, or raise `MEDIA_EDITOR_TIMEOUT_SECONDS`.

&nbsp;

## 15. 📚 RELATED DOCUMENTS

**Install and setup**

- **[→ User Guide](USER-GUIDE.md)** - Claude Desktop setup for the Media Editor Project
- **[→ Install Guide](INSTALL-GUIDE.md)** - extension, plugin, the standalone command for any terminal agent and manual ffmpeg install
- **[→ Claude Code Plugin](runtime/claude-plugin/README.md)** - plugin install and use
- **[→ MCP Server](runtime/README.md)** - build, test and configure the server

**Claude Project package**

- **[→ Project Setup](claude%20project/README.md)** - upload steps, parity rule and smoke checks
- **[→ Project Kernel](claude%20project/Custom%20Instructions.md)** - the claude.ai custom instructions
- **[→ Parity Notes](SYNC.md)** - parity method and dated change records

**System guides**

- **[→ Agent Bootstrap](AGENTS.md)** - entry point, export protocol and command registry
- **[→ Media Editor Skill](sk-media-editor/SKILL.md)** - router rules, tool check, naming and delivery protocol
- **[→ Skill README](sk-media-editor/README.md)** - mode-by-mode guide to the skill folder
- **[→ Media Editor Tools](sk-media-editor/references/tools.md)** - all 40 tools, consent, error codes, settings and gaps
- **[→ Setup](sk-media-editor/references/setup.md)** - the guided setup offered when the command is missing
- **[→ Command Line](sk-media-editor/references/cli.md)** - the `media-editor` command: health, arguments, output, exit codes, previews and the batch pattern
- **[→ Image Operations](sk-media-editor/references/image-operations.md)** - the image tools first, then ffmpeg image recipes
- **[→ Video and Audio Operations](sk-media-editor/references/video-and-audio-operations.md)** - the video and audio tools first, then ffmpeg recipes
- **[→ HLS Video Conversion](sk-media-editor/assets/hls-video-conversion.md)** - `video_hls_ladder`, then the ffmpeg command pack
- **[→ MEDIA Framework](sk-media-editor/references/media-framework.md)** - the five phases, validation and quality gates
- **[→ Interactive Intelligence](sk-media-editor/references/interactive-intelligence.md)** - the one-question flow and its templates
- **[→ Router Contract](sk-media-editor/references/router-contract.md)** - the router as running Python
- **[→ Manual Testing Playbook](sk-media-editor/manual-testing-playbook/manual-testing-playbook.md)** - the scenarios and their pass criteria
- **[→ Latest Release Notes](sk-media-editor/changelog/v1.0.0.0.md)** - v1.0.0.0, readable names and a tidy export folder

**Benchmark guides**

- **[→ Router Checks](benchmark/router/README.md)** - route object, decision rules and the differential
- **[→ Reply Grader](benchmark/grader/README.md)** - twin comparison
- **[→ Rule Parity Gate](benchmark/gates/README.md)** - maintainer check of rules across the two packages
- **[→ Parity Wrappers](benchmark/parity/README.md)** - maintainer wrappers into the shared parity gate
- **[→ Claude Sonnet 5 Run](benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium/README.md)** - verdicts, twin comparison and findings
