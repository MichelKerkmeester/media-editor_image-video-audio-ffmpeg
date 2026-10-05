---
title: "sk-media-editor"
description: "Media Editor skill for Barter: drives the Media Editor tools through the `media-editor` command, otherwise locally installed ffmpeg and ffprobe, to edit, convert, compress and stream existing images, video and audio."
trigger_phrases:
  - "media editor"
  - "$image"
  - "$video"
  - "$audio"
  - "$hls"
  - "$repair"
version: 1.0.0.0
---

# sk-media-editor

> Checks for the `media-editor` command, then for ffmpeg on the path, then turns a request to resize, convert, compress or stream existing media into a saved, verified export. It never generates a new image, video or audio clip from a prompt.

| Core layer | What it adds |
|---|---|
| 🧭 **Smart Router** | Six intents behind exact commands and keyword-weighted semantic scoring, each bound to a tool group and an ffmpeg fallback |
| 🔒 **Tool Check** | Runs `media-editor health` when the command is available, otherwise confirms ffmpeg is on the path, otherwise advises with the exact command and says that nothing ran |
| 🧠 **MEDIA Thinking** | Five phases (Measure, Evaluate, Decide, Implement, Analyze) with two-layer transparency |
| 🎚️ **Format & Quality Intelligence** | Use-case-driven format and quality selection, with the trade-off named in plain language |
| 📤 **Export-First Delivery** | Every result saves to `media files/export/` and is verified before the chat response |
| 🎬 **HLS Streaming** | `video_hls_ladder` for multi-quality adaptive delivery, with an ffmpeg command pack as the fallback |

---

## 1. OVERVIEW

### What this is

This folder is the skill packaging of the Media Editor system: one skill that edits, converts, compresses and streams media that already exists. `SKILL.md` carries the identity, the router, the tool check and every rule. `references/` holds the MEDIA thinking framework, the interactive conversation flow, the image and the video and audio operation references, the catalogue of all 40 tools, the command reference and the router contract. `assets/` holds HLS conversion with `video_hls_ladder` and the ffmpeg command pack. A cold model bootstraps through `../AGENTS.md`, and from that point on it IS the Media Editor: scope, tool check and export rules replace generic assistant behavior.

Every operation takes the first route that is available: the `media-editor` command, then locally installed ffmpeg, then advice with the exact command when neither can run. The tools come from the Media Editor runtime in `../runtime/`, packaged as the Media Editor extension and as the `media-editor` command the Claude Code plugin ships, and bring their own pinned ffmpeg. Every processed result lands in `../media files/export/` before any response is written: one file directly under a readable name the skill proposes and the user confirms, several files from one operation in one numbered folder. A second packaging of the same brain lives in `../claude project/` for claude.ai. It runs the tools in a Claude Desktop Project with the Media Editor extension, and otherwise answers in chat with the exact command to run, where the result lands and what to check.

### How a request flows

```text
                      YOUR REQUEST
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│                    SMART ROUTER                     │
│                                                    │
│  1. Exact commands   $image $video $audio $hls      │
│                      $repair $interactive           │
│  2. Keyword scoring  weighted media-type signals    │
│  3. Interactive      one comprehensive question     │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│   TOOL CHECK                                        │
│   media-editor command -> media-editor health       │
│   otherwise ffmpeg -version, ffprobe -version       │
│   encoders and filters checked before any promise   │
│   neither -> advise, say that nothing ran           │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│   MODE REFERENCE + INTEGRATION SPEC                 │
│   (image, video and audio operations, or HLS)       │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│   MEDIA: Measure → Evaluate → Decide                │
│          → Implement → Analyze                      │
│                                                    │
│   Gates: build reality check, format and quality    │
│          fit, disk and time                         │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│   media files/export/[###] - [description]/  +  verified save   │
└────────────────────────────────────────────────────┘
                           │
                           ▼
        chat response: path plus a brief summary
```

---

## 2. QUICK START

Point any capable model at `../AGENTS.md` and ask:

```text
$image resize photo.jpg to 1920px and convert to webp
$video trim presentation.mp4 from 00:30 to 02:00
$audio extract the audio track and normalize levels
$hls convert this video to adaptive streaming
$repair diagnose this broken file
compress my vacation photos for the web
```

An exact command token routes before any keyword scoring runs. Plain language falls through to weighted keyword detection by media type, and a request that matches no command and scores zero on every keyword set lands in Interactive Mode with one comprehensive question.

### Detection, by example

| Request | Routes to |
|---|---|
| `$image resize photo.jpg` | Image Mode, `image_*` tools, else ffmpeg (exact command) |
| "compress this video for email" | Video Mode, `video_*` tools, else ffmpeg (the word "video" scores highest) |
| "$hls convert this clip" | HLS Mode, `video_hls_ladder`, else ffmpeg (exact command) |
| "the file is corrupted, please recover it" | Repair Mode, `media_probe` then `media_repair`, else ffprobe then ffmpeg ("corrupted" plus "recover") |
| "extract audio and remove silence" | Audio Mode, `audio_*` tools and `media_remove_silence`, else ffmpeg ("audio" plus "silence") |
| "help with my media" | Interactive Mode, one comprehensive question (no signal scores) |

---

## 3. THE OPERATING MODES

| Mode | Tools, then fallback | Use |
|---|---|---|
| Interactive (default, `$interactive` / `$int`) | Chosen after the question | Guided discovery for ambiguous requests |
| Image (`$image` / `$img`) | `image_*`, then ffmpeg | Resize, convert, compress, crop, rotate, flip |
| Video (`$video` / `$vid`) | `video_*`, then ffmpeg | Transcode, trim, overlay, concatenate |
| Audio (`$audio` / `$aud`) | `audio_*` and `media_remove_silence`, then ffmpeg | Extract, convert, normalize, remove silence |
| HLS (`$hls`) | `video_hls_ladder`, then ffmpeg | Multi-quality adaptive streaming |
| Repair (`$repair` / `$r`) | `media_probe` then `media_repair`, then ffprobe and ffmpeg | Diagnose and fix a broken media file |

Audio trim, loudness normalization and CRF compression have no tool yet, so they run on ffmpeg in every mode.

### Image mode

Uses the `image_*` tools through the `media-editor` command, otherwise locally installed ffmpeg. Check the route before any operation and the encoders before promising a format.

Processing order matters: crop first to remove unwanted area, then resize, then rotate or flip, then convert format, then compress as the final step.

```bash
ffmpeg -i INPUT.png -q:v 3 OUTPUT.jpg
ffmpeg -i INPUT.jpg -vf scale=1920:-1 -q:v 5 OUTPUT.jpg
ffmpeg -i INPUT.jpg -vf "crop=800:600:100:50" OUTPUT.jpg
ffmpeg -i INPUT.png -c:v libsvtav1 -crf 30 OUTPUT.avif
```

| Preset | Quality guidance |
|---|---|
| Archive | JPEG `-q:v 2`, PNG `-compression_level 9`, largest file |
| High quality | JPEG `-q:v 2` to `-q:v 4`, prints and professional work |
| Standard web | JPEG `-q:v 5`, or WebP and AVIF when the build encodes them |
| Good compression | JPEG `-q:v 6` to `-q:v 8`, size priority with acceptable quality |
| Heavy compression | JPEG `-q:v 10` to `-q:v 12`, extreme size limits |

JPEG quality runs from 2 to 31 where lower is better. PNG compression runs from 0 to 9. AVIF uses `-crf` with an AV1 encoder. WebP output needs a build that carries a WebP encoder, so check before promising it.

### Video mode

Uses the `video_*` and `audio_*` tools through the `media-editor` command, otherwise the same ffmpeg. Check the route before any operation.

```bash
ffmpeg -i INPUT.mov -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k OUTPUT.mp4
ffmpeg -ss 00:00:30 -to 00:02:00 -i INPUT.mp4 -c copy OUTPUT.mp4
ffmpeg -i INPUT.mp4 -vf scale=1280:720 -c:a copy OUTPUT.mp4
```

Formats: MP4, MOV, AVI, MKV, WebM. Codecs default to H.264 for compatibility, with H.265 or VP9 when size matters. `-c copy` trims at the nearest keyframe and re-encoding gives a frame-accurate cut.

### Audio mode

Uses the `audio_*` tools for extraction, format conversion and bitrate, sample rate or channel changes, and `media_remove_silence` for silence removal, through the `media-editor` command. Loudness normalization has no tool and always runs on ffmpeg, as does every audio operation when the command is missing.

```bash
ffmpeg -i INPUT.mp4 -vn -c:a libmp3lame -b:a 192k OUTPUT.mp3
ffmpeg -i INPUT.mp4 -vn -c:a copy OUTPUT.m4a
ffmpeg -i INPUT.mp4 -vn -af loudnorm OUTPUT.wav
ffmpeg -i INPUT.mp4 -af "silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-40dB" -vn OUTPUT.wav
```

| Preset | Bitrate and use case |
|---|---|
| Voice only | 96k, speech and podcasts |
| Standard | 128k, general audio |
| Music streaming | 192k, good-quality music |
| High quality | 256k, high-quality music |
| Maximum | 320k, archival and production |

### HLS mode

Uses `video_hls_ladder` through the `media-editor` command, otherwise ffmpeg directly. Check the route before any operation. Generates a master playlist plus four quality variants from one source file.

```text
output/
  master.m3u8
  1080p/ playlist.m3u8 + segment_*.ts
  720p/  playlist.m3u8 + segment_*.ts
  480p/  playlist.m3u8 + segment_*.ts
  360p/  playlist.m3u8 + segment_*.ts
```

| Quality | Maxrate, profile |
|---|---|
| 1080p | 2500k, main profile, desktop displays |
| 720p | 1500k, main profile, desktop and tablets |
| 480p | 800k, baseline profile, mobile and slower connections |
| 360p | 500k, baseline profile, very slow connections |

Segments run 2 seconds by default for a fast start and quick quality switching. `-an` strips audio for a further 20 to 30 percent size saving where the delivery does not need it. The full command pack, the batch script and GPU-acceleration notes live in `assets/hls-video-conversion.md`.

### Repair mode

Starts with ffprobe, or `media_probe` through the `media-editor` command, to read the streams, the duration and the error, then applies the matching repair through ffmpeg or `media_repair`. `$repair` alone with no other context runs the tool check first.

```bash
ffprobe -v error -show_entries format=format_name,duration:stream=codec_name,codec_type INPUT
ffmpeg -i INPUT -c copy OUTPUT
```

### Interactive mode

The fallback for a request naming no media type and no command. One comprehensive question replaces a multi-turn interview:

```markdown
Please provide the following at once:

1. Media type: image, video, audio or HLS streaming
2. File information: location, current format, approximate size
3. Processing goal: target use case and the size-versus-quality priority
4. Output preferences: save location and a specific format, or let the system choose
```

A direct command (`$image`, `$video`, `$audio`, `$hls`, `$repair`) narrows this to one focused question for that media type only. Either way, the system waits for the complete response before processing starts.

---

## 4. FORMAT AND QUALITY INTELLIGENCE

Every operation selects a format and a quality level by use case, then names the trade-off in a sentence or two.

| Use case | Recommendation |
|---|---|
| Web images | WebP at 85% when the build encodes it, AVIF when compatibility allows, JPEG at quality 5 otherwise |
| Email images | JPEG at 80% for universal client support, PNG when transparency matters |
| Web video | H.264 MP4 for universal playback, H.265 or VP9 when size matters and support allows |
| Streaming video | HLS multi-quality (1080p, 720p, 480p, 360p) for adaptive bandwidth delivery |
| Podcast audio | MP3 at 192 kbps for universal playback, AAC for modern devices, FLAC for archival |

The MEDIA framework runs this selection through five phases, each showing a short external update while the full comparison stays internal:

| Phase | What the user sees |
|---|---|
| Measure (20%) | "Analyzing source (4K PNG, 8.5MB)" |
| Evaluate (30%) | "Evaluating (WebP optimal)" |
| Decide (20%) | "Deciding (85% quality, 1080p)" |
| Implement (10%) | "Processing (95% reduction)" |
| Analyze (20%) | "Complete (quality verified)" |

A quality metric below its threshold, an unsupported format or a missing encoder triggers the improvement protocol: identify the issue, try an alternative format or quality, then fall back to the best compromise, capped at three iterations. When neither the `media-editor` command nor ffmpeg is available, the operation stops and reports install guidance instead of an unverified promise.

---

## 5. OUTPUT FORMAT

Chat responses follow fixed formatting rules: dash bullets only, never emoji bullets, no horizontal dividers or decorative lines, one bullet per line, and headers with a line break before the next block. The response never pastes a full processing log or a metadata dump.

The visual feedback shape:

```markdown
[Media Type] processing complete

Input:
- File: [name] ([size])
- Format: [format]

Processing:
- Step 1: [description] done
- Step 2: [description] done

Results:
- Size: [original] to [new] ([percentage]% reduction)
- Quality: [percentage]% maintained
- Format: [original] to [new]

Output:
- Saved to: media files/export/[### - description]/

Next steps:
- [Suggestion 1]
- [Suggestion 2]
```

---

## 6. EXPORT AND DELIVERY

Export is blocking. The strict sequence: check the route, process the media, save the output, verify the save succeeded, and only then respond with the path and a two-to-three sentence summary.

```text
media files/export/[###] - [description]/
```

Source files to edit go in `media files/import/` and test files in `media files/tests/`. The system reads both in place and never writes to them. Media exports use a folder rather than a single file, since one operation often produces several outputs (an HLS conversion alone yields a master playlist, four variant playlists and a segment set per quality).

Examples:
- `media files/export/001 - resized-product-images/`
- `media files/export/002 - compressed-hero-video/`

Prohibited every time: showing full processing logs or metadata dumps in chat, showing the output path after a long inline description instead of leading with it, and asking whether to save. Saving is mandatory, not a question.

Blocking gates that stand between processing and delivery: no operation runs before the tool check picks a route, the deliverable stays inside what the installed build can produce, and the export folder is saved and verified before the response is written.

---

## 7. ASSETS AND REFERENCE INVENTORY

The first seven files below are mirrored byte for byte into `claude project/knowledge/`. `references/cli.md` and `references/router-contract.md` are the two references with no mirror: the command reference is skill-only, and the Claude Project kernel ends with the router contract's code.

| File | What it covers |
|---|---|
| `references/media-framework.md` | MEDIA methodology, RICCE validation, quality gates and the two-layer transparency model. ALWAYS-loaded |
| `references/interactive-intelligence.md` | Conversation flow, state machine, the comprehensive question and the per-mode question templates |
| `references/image-operations.md` | The eight image tools with parameters and defaults, then the ffmpeg image recipes, format and quality tables |
| `references/video-and-audio-operations.md` | The video and audio tools with parameters and defaults, the operations no tool covers, then the ffmpeg recipes and codec tables |
| `references/tools.md` | All 40 tools, the consent rule, the 15 error codes, the server settings and the gaps. ON_DEMAND |
| `references/setup.md` | Guided setup when the Media Editor tools are not available: where they can run, the Media Editor extension from the latest release, its folders, ffmpeg with consent, the plugin and local ffmpeg. ON_DEMAND |
| `assets/hls-video-conversion.md` | `video_hls_ladder`, then the ffmpeg HLS command recipes, quality tables and the batch conversion script |
| `references/cli.md` | The `media-editor` command: health, arguments, output, exit codes, previews, ffmpeg consent and the batch pattern with a worked example. ON_DEMAND, not mirrored |
| `references/router-contract.md` | The Smart Router as running Python, checked by `../benchmark/router/differential.py`. ON_DEMAND, not mirrored |

The router loads `media-framework.md` on every invocation, and loads exactly one integration reference on demand, so a request never triggers a bulk read of the whole set.

---

## 8. DUAL PACKAGING

`sk-media-editor/` is the source of truth and the skill runtime: it checks the route, runs the operation through the `media-editor` command or ffmpeg and saves the result. `claude project/` is a derived package: the same six knowledge files are copied byte for byte from the skill sources, while `Custom Instructions.md` remains a hand-synthesized kernel that ends with the router contract's code. It runs the Media Editor tools in a Claude Desktop Project with the Media Editor extension. Without the extension it cannot execute a tool, so it applies the same MEDIA thinking and format intelligence and answers in chat with the exact command to run, where the result lands and what to check. The no-execution limitation is stated plainly whenever no tool ran. The Claude Code plugin in `../runtime/claude-plugin/` ships `bin/media-editor`, `server/` with the command's code, and a copy of this skill. It registers no tool server. Claude Code puts the plugin's `bin/` on the Bash tool's PATH, so the bare `media-editor` works there, and the check is `media-editor health`. claude.ai and Cowork do not install a plugin that has a `bin/` folder, an accepted cost: a claude.ai user takes the extension route in Claude Desktop.

`../SYNC.md` holds the hand-authored parity note. There is no local derive step. Every reference pair is byte identical between the skill source and its Project mirror.

---

## 9. EXTERNAL RESOURCES

Format and codec references worth bookmarking.

| Resource | Link |
|---|---|
| FFmpeg documentation | https://ffmpeg.org/documentation.html |
| FFmpeg filters | https://ffmpeg.org/ffmpeg-filters.html |
| WebP guide | https://developers.google.com/speed/webp |
| HLS specification (RFC 8216) | https://datatracker.ietf.org/doc/html/rfc8216 |
| H.264 overview | https://en.wikipedia.org/wiki/Advanced_Video_Coding |
| Audio formats comparison | https://www.adobe.com/creativecloud/video/discover/audio-file-formats.html |

---

## 10. FAQ

**What happens when ffmpeg is not on the path?**
With the `media-editor` command available, nothing: it brings its own ffmpeg. Without it, the reply gives the exact command as advice, says plainly that nothing ran and points to a Claude Desktop Project with the Media Editor extension, the Claude Code plugin or an ffmpeg install for macOS, Ubuntu and Windows.

**Can it generate a new image, video or clip from a text prompt?**
No. The Media Editor edits, converts, compresses and streams media that already exists. A generation request gets refused and reframed into a supported editing operation where one applies.

**What is the file size limit?**
Practical limits are disk space and processing time, and the Media Editor tools add their own input size limits, which `media-editor health` reports. A large transcode can run for minutes or longer, so the system tells the user the expected time and suggests splitting when that is acceptable.

**Why did a WebP or AVIF command fail?**
The installed build may not carry that encoder. Check `media-editor health` for the command's encoders, or `ffmpeg -encoders | grep -E "libwebp|libsvtav1"` on a local install. When the encoder is absent, choose JPEG, PNG or another format the build can produce.

**Does the claude.ai Project run ffmpeg or save files?**
Only through the Media Editor tools, in a Claude Desktop Project with the Media Editor extension. On claude.ai on the web it cannot: it applies the same MEDIA thinking and format intelligence, then answers in chat with the exact command to run, where the result lands and what to check.

**What if my request does not name a media type?**
It lands in Interactive Mode, which asks one comprehensive question covering media type, file information, processing goal and output preferences, then waits for the full answer before processing.

**Can it do color grading, effects or non-linear editing?**
No. That is out of scope and gets refused and reframed into a supported operation, the same as an upload-to-platform request.

---

## 11. TROUBLESHOOTING

| What you see | What to do |
|---|---|
| The response gives advice with a missing-ffmpeg warning instead of processing | Install the Media Editor extension in Claude Desktop, or the Claude Code plugin, which puts `media-editor` on the Bash tool's PATH and brings its own ffmpeg, or install ffmpeg (`brew install ffmpeg`, `sudo apt install ffmpeg` or a build from ffmpeg.org) and run `ffmpeg -version` to confirm |
| A response shows a wall of processing log or metadata | That violates the export protocol. Treat the response as non-compliant and ask for the path and summary form instead |
| A request routed to the wrong mode | Add the exact command token (`$image`, `$video`, `$audio`, `$hls`, `$repair`) instead of relying on keyword scoring |
| The system keeps asking one comprehensive question | No command and no keyword scored above zero. Answer the question in one reply, or add a command token to skip straight to that mode |
| A promised encoder or filter failed | Check `media-editor health` for the command's encoders and filters, or `ffmpeg -encoders` and `ffmpeg -filters` on a local install, and choose a format or filter the build carries |
| A generation or upload request got refused | Working as intended. Rephrase as an edit of a file that already exists, or use a different tool for generation or platform upload |

---

## 12. RELATED DOCUMENTS

| Document | Purpose |
|---|---|
| [`SKILL.md`](./SKILL.md) | Executable identity, routing rules, MEDIA methodology, rules and integration points |
| [`../AGENTS.md`](../AGENTS.md) | CLI bootstrap, context override and the manual-load DAG |
| [`../SYNC.md`](../SYNC.md) | Hand-authored parity note for the Claude Project package |
| [`references/media-framework.md`](./references/media-framework.md) | MEDIA methodology, RICCE validation and quality gates |
| [`references/interactive-intelligence.md`](./references/interactive-intelligence.md) | Conversation flow, state machine and response templates |
| [`references/image-operations.md`](./references/image-operations.md) | Image tools first, then ffmpeg image recipes |
| [`references/video-and-audio-operations.md`](./references/video-and-audio-operations.md) | Video and audio tools first, then ffmpeg recipes |
| [`references/tools.md`](./references/tools.md) | All 40 tools, consent, error codes, settings and gaps |
| [`references/setup.md`](./references/setup.md) | Guided setup of the extension, the plugin or ffmpeg |
| [`references/cli.md`](./references/cli.md) | The `media-editor` command: health, arguments, output, exit codes, previews and the batch pattern |
| [`references/router-contract.md`](./references/router-contract.md) | The exact routing algorithm the kernel's Router Code copies |
| [`assets/hls-video-conversion.md`](./assets/hls-video-conversion.md) | `video_hls_ladder`, then ffmpeg HLS recipes, quality tables and the batch script |
| [`../claude%20project/README.md`](../claude%20project/README.md) | Upload and parity manifest for the Claude Project packaging |
