# Media Editor Installation Guide

Installing the Media Editor tools as a Claude Desktop extension, a Claude Code plugin or a standalone `media-editor` command for any terminal agent, such as Codex, OpenCode or Pi, and locally installed ffmpeg with ffprobe as the fallback.

---

## AI-FIRST INSTALL GUIDE

**Copy and paste this prompt to your AI assistant to get installation help:**

```
I want to set up the Media Editor system. It uses the Media Editor tools through a Claude Desktop extension or the `media-editor` command in a terminal agent such as Claude Code, Codex, OpenCode or Pi, and falls back to locally installed ffmpeg.

Please help me:
1. Build and install the Media Editor extension for Claude Desktop, the plugin for Claude Code, or the standalone `media-editor` command for my terminal agent, and choose the folders it may open
2. Check whether ffmpeg and ffprobe are already on my PATH for the fallback
3. Install ffmpeg for my platform if they are not (I'm on: [macOS / Ubuntu / Windows])
4. Show me which encoders my build carries, especially WebP and AVIF
5. Create the `media files/` folders the system reads from and writes results into
6. Run one real image command and one real video command to prove the build works

My media workspace location is: [your path]

Give me the exact commands and tell me what each output should look like.
```

**What the AI will do:**

- Build the extension, the plugin or the standalone command and confirm the health check answers: `media_health` in the extension, `media-editor health` in a terminal agent
- Run `ffmpeg -version` and `ffprobe -version` and read the answers
- Install ffmpeg through your platform's package manager
- List the encoders your build carries, so nothing is promised that it cannot produce
- Create `media files/import/` for source files, `media files/export/` where every processed result lands and `media files/tests/` for test files
- Run a real command of each kind rather than reporting that the tool looks present

**Expected setup time:** 5 minutes

---

## 1. OVERVIEW

The Media Editor edits existing images, video and audio. Every operation takes the first route that is available: the Media Editor tools when they are available, then locally installed ffmpeg, then advice with the exact command when neither can run. The tools are the easier route, since they bring their own ffmpeg. This guide covers every install.

### Key features

- **Image operations**: resize, crop, rotate, compress, convert between JPEG, PNG, WebP and AVIF, each subject to the encoder check in section 5
- **Video operations**: transcode, trim, scale, extract audio, adjust bitrate and frame rate
- **Audio operations**: convert, normalize, trim, extract from video
- **HLS streaming**: segment a source into a playable ladder
- **Repair**: diagnose with ffprobe, then fix with ffmpeg

### What each packaging needs

- `sk-media-editor/` in any terminal agent, such as Claude Code, Codex, OpenCode or Pi, runs the Media Editor tools through the `media-editor` command, or ffmpeg from the PATH, and writes real files. It needs no MCP server
- `claude project/` runs the tools in a Claude Desktop Project with the extension installed. On claude.ai on the web it cannot execute anything, so it answers in chat with the exact command to run, where the result lands and what to check, and a reader there still needs ffmpeg on their own machine

---

## 2. PREREQUISITES

### For the extension, the plugin or the command

- **Claude Desktop** for the extension, or **Node.js 20.9.0** or later on the PATH for the Claude Code plugin and the standalone command
- **npm**, only to build the bundle from `runtime/` instead of downloading it

### For the manual route

- **ffmpeg** with **ffprobe**, both on the PATH

  ```bash
  ffmpeg -version
  ffprobe -version
  ```

  Both print a version banner and exit 0. ffprobe ships with ffmpeg, so a build that answers the first and not the second is an incomplete install rather than a working one.

- **Terminal access**, Terminal on macOS, a shell on Linux, PowerShell on Windows

### Recommended

- **Free disk space** of a few times the size of the largest file you intend to process, since ffmpeg writes a new file rather than editing in place
- **A build carrying the encoders you need**, checked in section 5 with `-encoders` rather than assumed from the format list

Nothing else. No Docker and no container runtime.

---

## 3. INSTALLATION

### Claude Desktop extension (recommended)

The extension is one `.mcpb` file per platform. Download the file for your platform from the [latest release](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/latest), or build it from `runtime/`:

```bash
cd runtime
npm install
npm run bundle -- --target darwin-arm64
```

Use your own platform key: `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64`. The file lands in `runtime/dist-bundles/media-editor-<key>.mcpb`.

1. Open the `.mcpb` file with Claude Desktop, or use Install Extension on the Extensions page of its settings
2. Set **Folders Media Editor may open** to the `media files/` folder, plus any other folder that holds media you want to edit. Leave no empty **Directory path** row: Claude Desktop does not start the tools while one is there
3. Set **Output folder** to `media files/export/`, so every result lands there, one file directly and several files from one operation in a numbered folder
4. Start a chat, or open the Media Editor Project, and ask it to run `media_health`

The extension carries its own ffmpeg and ffprobe for that platform, and Claude Desktop supplies Node to run it.

### Claude Code plugin

```bash
cd runtime
npm run bundle -- --target darwin-arm64
npm run plugin
claude --plugin-dir "<path to>/runtime/claude-plugin"
```

The plugin ships the `media-editor` command in its `bin/` folder, the command's code in `server/` and a copy of the skill. Claude Code puts the plugin's `bin/` on the Bash tool's PATH, so the bare `media-editor` works there, and the check is `media-editor health`. The command runs on `node`, so Node.js 20.9.0 or later must be on the PATH. Start Claude Code in the folder that holds your media: the tools may read that folder, and each result goes into its `media files/export/`, created on first use, with a numbered folder only for several files from one operation. `runtime/claude-plugin/README.md` has the details.

claude.ai and Cowork do not install a plugin that has a `bin/` folder. On those surfaces, take the extension route in Claude Desktop.

### Standalone install for any terminal agent (npm link)

The `media-editor` command can be installed on its own, for Codex, OpenCode, Pi or any other agent that can run a shell command. The agent loads the skill through `AGENTS.md`, so the command is all it needs. In a copy of the repository, with Node.js 20.9.0 or later:

```bash
cd runtime
npm install
npm run build
npm link
```

Then `media-editor health` works from any folder. `npm unlink -g media-editor-mcp` removes it.

### When the server finds no ffmpeg

`media_health` names `media_setup_ffmpeg` when neither the bundled nor an installed ffmpeg can run. That tool shows the pinned download it would make, with its address, size and SHA-256, and downloads it only after you agree.

### Manual ffmpeg

Use this route in a terminal without the `media-editor` command, or to run the commands a claude.ai web Project hands back.

#### macOS

```bash
brew install ffmpeg
```

If `brew` is missing, install it from brew.sh first. Measured on this fleet's machine, Homebrew's ffmpeg 9.0.1 carries `libsvtav1` for AVIF, `libx264`, `libx265` and `aac`, and carries no `libwebp`, so WebP output is unavailable without a custom build. Run section 5 rather than trusting this paragraph, since a formula changes.

#### Ubuntu and Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

Distribution builds are often a release or two behind and sometimes omit AVIF. Check section 5 before relying on either format.

#### Windows

```powershell
winget install ffmpeg
```

Or download a build from ffmpeg.org, extract it and add its `bin` directory to PATH. Reopen the terminal afterwards, since PATH is read at shell start.

#### Any platform, from source

Build from ffmpeg.org when you need an encoder no packaged build carries. Configure with the encoders you want enabled, since an encoder left out at configure time is absent for good.

---

## 4. CONFIGURATION

The extension's two settings are covered in section 3, and the plugin needs none. For the manual route there is nothing to configure in the tool. The one thing to create is the `media files/` folder with its three subfolders.

```bash
# From the Media Editor system directory
mkdir -p "media files/import" "media files/export" "media files/tests"
```

An operation that writes one file saves it straight into `media files/export/` under a readable name the system proposes and you confirm, such as `team-offsite-hero.webp`. An operation that writes several files, such as an HLS ladder, saves them in one `media files/export/[###] - [description]/` folder, numbered in order. For a batch of several inputs, the system asks once, before it writes anything, for every name and whether the files go straight into `media files/export/` or into one numbered folder. A taken name gets `-2` rather than replacing a file. The save happens before the response is written, and the response names the path.

Put source files in `media files/import/` and test files in `media files/tests/`, or leave them wherever they are. The system reads them in place and never writes over them. In the extension settings, add `media files/` under **Folders Media Editor may open** and set **Output folder** to `media files/export/`, so tool results land beside ffmpeg results.

---

## 5. VERIFICATION

Each check runs a command rather than reading a claim.

### The Media Editor tools answer

With the extension installed, ask for `media_health`. Expected: the server version, where ffmpeg and ffprobe were found, the encoders and filters they offer and the folders in effect. With the plugin or a standalone install, run `media-editor health`. Expected: which ffmpeg and ffprobe it found, the encoders and filters they offer and the folders in effect.

The checks below are for the manual route.

### ffmpeg answers

```bash
ffmpeg -version
ffprobe -version
```

Expected: a version banner from each, exit 0. This is the precondition the manual route checks before any operation.

### The build carries the encoders you need

```bash
ffmpeg -encoders | grep -E "libwebp|libaom-av1|libsvtav1|libx264|libx265|aac|mjpeg|png"
```

Expected: a row per encoder present. An encoder absent here is a format the system will refuse rather than promise, which is correct behavior and not a fault. WebP output needs `libwebp`. AVIF output needs an AV1 encoder, either `libaom-av1` or `libsvtav1`.

Ask this question of `-encoders` and never of `-formats`. A stock Homebrew ffmpeg 9.0.1 lists both `webp` and `avif` as writable formats and carries an encoder for neither WebP nor `libaom-av1`, so a format list says yes where the conversion then fails at encoder selection. The muxer that writes a container and the encoder that fills it are separate build options.

### A real file survives a round trip

Use JPEG here, which every build can write. Prove WebP or AVIF separately, once the encoder check above has shown the encoder.

```bash
# Image: make a test source, convert it, read the result back
ffmpeg -y -v error -f lavfi -i testsrc=size=640x480:duration=1 -frames:v 1 /tmp/ffmpeg-check.png
ffmpeg -y -v error -i /tmp/ffmpeg-check.png -q:v 5 /tmp/ffmpeg-check.jpg
ffprobe -v error -show_entries stream=width,height,codec_name /tmp/ffmpeg-check.jpg

# Video: one second of colour bars with silent audio, transcoded
ffmpeg -y -v error -f lavfi -i testsrc=size=640x480:rate=30:duration=1 \
       -f lavfi -i anullsrc=r=48000:cl=stereo -shortest \
       -c:v libx264 -c:a aac /tmp/ffmpeg-check.mp4
ffprobe -v error -show_entries stream=codec_name,width,height /tmp/ffmpeg-check.mp4
```

Expected: `codec_name=mjpeg` at 640x480 from the first `ffprobe`, then `h264` at 640x480 and `aac` from the second. A build that lists its encoders and then fails here is the case worth catching, which is why this check runs a file through rather than stopping at the list.

For each of WebP and AVIF the encoder check named, run the conversion rather than assume it:

```bash
ffmpeg -y -i /tmp/ffmpeg-check.png -c:v libwebp /tmp/ffmpeg-check.webp
ffmpeg -y -i /tmp/ffmpeg-check.png -c:v libsvtav1 -crf 30 /tmp/ffmpeg-check.avif
```

Expected on a build carrying them: a file each, `codec_name=webp` and `codec_name=av1` under `ffprobe`. On a build without `libwebp` the first stops at `Unknown encoder 'libwebp'`, which is the honest answer and the reason the system refuses WebP rather than promising it.

```bash
rm -f /tmp/ffmpeg-check.png /tmp/ffmpeg-check.jpg /tmp/ffmpeg-check.webp /tmp/ffmpeg-check.avif /tmp/ffmpeg-check.mp4
```

---

## 6. TROUBLESHOOTING

| Symptom | Cause | Fix |
|---|---|---|
| "Unable to connect to extension server" in the extension settings | An empty **Directory path** row under **Folders Media Editor may open**, which Claude Desktop reads as a missing required setting | Remove the empty row, click **Save**, then switch the extension off and on |
| `media_health` is not listed | The extension is not installed or enabled | Install per section 3, then start a new chat |
| `command not found: media-editor` | The plugin was not built or loaded, or the standalone install was not linked | Install per section 3, then start a new session or a new terminal |
| `CONFIG_MISSING` from a tool | No folders are set, or the output folder cannot take a new folder | Set the folders in the extension settings, or start your terminal agent in the media folder |
| `FFMPEG_NOT_FOUND` from a tool | Neither the bundled nor an installed ffmpeg can run on this machine | Run `media_setup_ffmpeg`, read the planned download and agree to it |
| `command not found: ffmpeg` | Not installed, or installed outside PATH | Install per section 3, then reopen the terminal so PATH is re-read |
| `ffmpeg` answers, `ffprobe` does not | A partial install, or a wrapper script standing in for the real binary | Reinstall from the package manager rather than patching the PATH |
| `Unknown encoder 'libwebp'` | The build omits that encoder, true of stock Homebrew ffmpeg 9.0.1 | Choose JPEG, PNG or AVIF, or install a build carrying `libwebp` |
| `Default encoder for format webp is probably disabled` | The same cause reached through the format rather than the codec, because the WebP muxer is present without its encoder | Same fix. `ffmpeg -formats` is not evidence of an encoder, only `-encoders` is |
| `Unknown encoder 'libaom-av1'` | That AVIF encoder is absent | Use `libsvtav1 -crf 30` instead, which stock Homebrew does carry, or build with libaom |
| Conversion runs but the output will not open | The container and codec disagree, often an extension chosen without a matching codec | Name the codec explicitly with `-c:v` and `-c:a` rather than relying on the extension |
| A long transcode looks stuck | Large sources take minutes, progress prints to stderr | Watch the `frame=` and `time=` counters, and split the source if the wait is unacceptable |
| `Permission denied` writing the result | The export folder is missing or not writable | Create `media files/export/` per section 4 and check its permissions |

---

## 7. RELATED

- [`AGENTS.md`](AGENTS.md), the CLI bootstrap and identity handoff for this system
- [`sk-media-editor/SKILL.md`](sk-media-editor/SKILL.md), the routing rules that pick the tools, then ffmpeg, then advice
- [`runtime/claude-plugin/README.md`](runtime/claude-plugin/README.md), the Claude Code plugin
- `runtime/manifest.json`, the Claude Desktop extension manifest
- [`sk-media-editor/references/image-operations.md`](sk-media-editor/references/image-operations.md), the image tools first, then ffmpeg image recipes
- [`sk-media-editor/references/video-and-audio-operations.md`](sk-media-editor/references/video-and-audio-operations.md), the video and audio tools first, then ffmpeg recipes
- [`sk-media-editor/references/tools.md`](sk-media-editor/references/tools.md), every tool's parameters, the consent rule and the error codes
- [`sk-media-editor/references/setup.md`](sk-media-editor/references/setup.md), the guided setup the system offers when the tools are not available
- [`sk-media-editor/assets/hls-video-conversion.md`](sk-media-editor/assets/hls-video-conversion.md), `video_hls_ladder` and the HLS conversion recipes
- [`USER-GUIDE.md`](USER-GUIDE.md), the short setup for using the tools from the Media Editor Project in Claude Desktop
- [`runtime/README.md`](runtime/README.md), the server behind the tools
