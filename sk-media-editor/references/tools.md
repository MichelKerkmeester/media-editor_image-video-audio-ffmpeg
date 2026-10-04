---
title: "Media Editor - Reference - Media Editor Tools"
description: "Catalogue of the 40 Media Editor tools by group with purpose, parameters and defaults, the consent rule for media_setup_ffmpeg, the 15 error codes with what to do about each, the server settings and the operations no tool covers yet."
contextType: implementation
importance_tier: important
trigger_phrases:
  - "media editor tools"
  - "tool parameters and defaults"
  - "media editor error codes"
  - "consent required ffmpeg download"
  - "media_health"
  - "media_rename"
version: 1.0.0.0
---

# Media Editor - Reference - Media Editor Tools

Every tool the Media Editor server registers, with what it needs, what it returns when it fails and what no tool covers yet.

**Loading Condition:** ON-DEMAND
**Purpose:** Gives a tool's exact name, parameters and defaults, the consent rule and the error codes, for a call the mode reference does not already settle
**Scope:** The 40 tools in four groups, output naming and placement, the consent flow, the 15 error codes, the server settings and the gaps
**Source:** `mcp server/README.md` sections 4 and 5, and each tool's own schema in `mcp server/src/tools/`

---

## 1. OVERVIEW

### Purpose

The server behind the Media Editor tools runs on the user's machine as the Claude Desktop extension or the Claude Code plugin. It has 40 tools: 8 image, 6 audio, 20 video and 6 media. The image tools run on the sharp image library. The others run ffmpeg and ffprobe, either the copies the server found or a pinned build `media_setup_ffmpeg` installed.

### When to use

- A request needs a tool's exact parameter name, range or default
- A tool returned an error code and the reply has to say what happens next
- The user asks whether the tools can do something, and the answer depends on the gaps in Section 8

### Rules every tool follows

- `inputPath` and every other input path are absolute and sit inside a folder the user allowed. The input is never changed
- A writing tool takes `outputName`, a 1 to 64 character description with no `/` or `\`. A call that writes one file puts it in the output folder itself. A call that writes several files, such as `image_batch_resize` with two or more sizes, puts them in a new `NNN - description/` folder named from `outputName`. The path the tool returns is the export, so report it
- Every writing tool except `video_hls_ladder` also takes two optional fields. `fileName` is a readable name, slugged to lowercase words joined by hyphens, and the tool adds the extension: one file becomes `<name><ext>`, several become `<name>-<operation><ext>`. Without it a file is named `<input name>-<operation><ext>`. `subfolder` `true` forces a numbered folder and `false` keeps several files in the output folder. `video_hls_ladder` always writes its own folder
- Nothing is overwritten. In the output folder a taken name moves on to `-2`, `-3` and so on. A clash inside a numbered folder, or a taken `media_rename` target, returns `OUTPUT_EXISTS`
- Video and audio tools try a lossless stream copy first and re-encode only when the copy cannot work
- A tool checks the encoders and filters it needs before it runs and returns `CAPABILITY_MISSING` when its ffmpeg lacks one
- Times accept seconds, a numeric string, `HH:MM:SS`, `HH:MM:SS.mmm` or `MM:SS`. Bitrates run from `1k` to `100M`, where `k` is 1000 bit/s and `M` is 1000000 bit/s

---

## 2. MEDIA TOOLS

| Tool | Purpose | Parameters and defaults |
| --- | --- | --- |
| `media_health` | Reports the server version, where ffmpeg and ffprobe were found, their encoders and filters, the image engine versions and the folders and limits in effect. Reads no media file | None |
| `media_probe` | Reads container and stream metadata from an image, audio or video file with ffprobe. Writes nothing | `inputPath`, `preview` (default `false`) returns one small JPEG frame of a video or image to name the file from. Audio has no picture and gets a warning instead |
| `media_rename` | Gives one result inside the output folder a readable name, in the same folder, keeping its extension. Never overwrites | `path` of the file, `newName` 1 to 64 characters, slugged like `fileName`. A file outside the output folder returns `PATH_NOT_ALLOWED` |
| `media_repair` | Diagnoses a damaged audio or video file with ffprobe, then rewrites it | `inputPath`, `outputName`, `strategy` `auto` (default), `remux` (copies the streams into a fresh container, for a broken index or timestamp table) or `reencode` (rebuilds as H.264 and AAC, for damaged or cut-short streams) |
| `media_remove_silence` | Cuts silent stretches from an audio or video file | `inputPath`, `outputName`, `silenceThresholdDb` -100 to 0 (default -30), `minSilenceDurationMs` 1 to 600000 (default 500). A file with no audio stream is refused |
| `media_setup_ffmpeg` | Finds ffmpeg and ffprobe and installs a pinned build of a missing one after the user consents | `component` `ffmpeg`, `ffprobe` or `both` (default `both`), `consent` (default `false`). See Section 6 |

Call `media_health` once before the first operation of a session, and again whenever a tool fails in a way the error code does not explain.

---

## 3. IMAGE TOOLS

Image tools run on sharp and need no ffmpeg. Quality is the sharp scale from 1 to 100, higher is better, and it is the palette colour target for PNG.

| Tool | Purpose | Parameters and defaults |
| --- | --- | --- |
| `image_resize` | Resize one image | `width`, `height` 1 to 32768, one may be omitted to keep the aspect ratio. `fit` `cover` (default), `contain`, `fill`, `inside` or `outside`. `withoutEnlargement` (default `true`) |
| `image_convert` | Convert to `jpeg`, `png`, `webp` or `avif` | `format`, `quality` (default 80) |
| `image_crop` | Cut one rectangle that fits inside the image | `left`, `top` 0 to 32767, `width`, `height` 1 to 32768 |
| `image_compress` | Compress a JPEG, PNG, WebP or AVIF image in its own format | `quality` (default 80), `progressive` (default `true`, JPEG only) |
| `image_rotate` | Rotate by any angle | `angle` -360 to 360, positive is clockwise, `background` `#RRGGBB` (default `#000000`) |
| `image_flip` | Mirror | `direction` `horizontal`, `vertical` or `both` |
| `image_probe` | Read format, size, channels, bit depth, colour space, density, alpha and byte size. Writes nothing | `inputPath`, `preview` (default `false`) returns a JPEG at most 512 pixels on its longest side, to name the file from |
| `image_batch_resize` | Resize one image into 1 to 20 sizes, one file each, in one numbered folder when there are several | `sizes` entries of `width` and optional `height`, `format` (optional, keeps the input format) |

---

## 4. AUDIO TOOLS

An audio tool given a video keeps the sound and drops the picture.

| Tool | Purpose | Parameters and defaults |
| --- | --- | --- |
| `audio_extract` | Pull the audio track out of a file | `audioCodec` `libmp3lame` (default, .mp3), `aac` (.m4a), `libvorbis` (.ogg), `flac` or `pcm_s16le` (.wav) |
| `audio_convert` | Change the container | `format` `mp3`, `wav`, `m4a`, `flac` or `ogg` |
| `audio_convert_properties` | Change the container and set sound properties in one pass | `format`, optional `audioBitrate`, `sampleRate` 8000 to 384000, `channels` 1 to 8. WAV and FLAC ignore `audioBitrate` |
| `audio_set_bitrate` | Re-encode at a bitrate | `audioBitrate` |
| `audio_set_sample_rate` | Re-encode at a sample rate | `sampleRate` 8000 to 384000 |
| `audio_set_channels` | Re-encode at a channel count | `channels` 1 to 8 |

---

## 5. VIDEO TOOLS

Tools that re-encode the picture take seconds under 100 MB, up to a few minutes up to 1 GB and minutes to tens of minutes above that.

| Tool | Purpose | Parameters and defaults |
| --- | --- | --- |
| `video_convert` | Change the container, stream copy first | `format` `mp4`, `mov`, `mkv`, `webm` or `avi` |
| `video_convert_properties` | Change the container and set picture and sound properties in one pass | `format`, optional `resolution`, `codec`, `videoBitrate`, `frameRate`, `audioCodec`, `audioBitrate`, `sampleRate`, `channels` |
| `video_trim` | Cut to the span between two times, stream copy first | `startTime`, `endTime` |
| `video_concat` | Join 2 to 50 videos in order | `inputPaths`, optional `transition` (37 blends such as `dissolve` and `wipeleft`, exactly two clips) with `transitionDuration` |
| `video_set_speed` | Change playback speed, audio tempo follows | `speedFactor` above 0, at most 100 |
| `video_set_resolution` | Scale the picture | `resolution` `WIDTHxHEIGHT` or a height |
| `video_set_aspect_ratio` | Fit a ratio | `aspectRatio` such as `16:9`, `resizeMode` `pad` (default) or `crop`, `paddingColor` (default `#000000`) |
| `video_set_codec` | Re-encode the picture | `codec` `libx264`, `libx265` or `libvpx-vp9` |
| `video_set_bitrate` | Re-encode the picture at a bitrate | `videoBitrate` |
| `video_set_frame_rate` | Re-encode at a frame rate | `frameRate` above 0, at most 240 |
| `video_set_audio_codec` | Re-encode the sound, keep the picture | `audioCodec` `aac`, `libmp3lame` or `libopus` |
| `video_set_audio_bitrate` | Re-encode the sound at a bitrate | `audioBitrate` |
| `video_set_audio_sample_rate` | Re-encode the sound at a sample rate | `sampleRate` 8000 to 384000 |
| `video_set_audio_channels` | Re-encode the sound at a channel count | `channels` 1 to 8 |
| `video_add_fade` | Fade from black at the start or to black at the end | `fadeType` `fade_in` or `fade_out`, `duration` |
| `video_add_text_overlay` | Draw 1 to 50 timed text elements | `textElements` with `text`, `startTime`, `endTime`, `position` (default `bottom_center`), `fontSize` (default 24), `fontColor` (default `#FFFFFF`), `box` (default `false`), `boxColor`, `boxOpacity` (default 0.5), `boxBorderWidth`, `fontPath` |
| `video_add_image_overlay` | Place an image for a time span | `imagePath`, `position` (default `top_right`), `opacity`, `startTime`, `endTime`, `width`, `height` |
| `video_add_subtitles` | Burn in a `.srt` file with the bundled font | `subtitlePath`, optional `fontStyle` (font name, size, colours, outline, shadow, alignment, margins) |
| `video_add_b_roll` | Overlay 1 to 50 timed clips | `clips` with `clipPath`, `insertAt`, `duration`, `position` (default `fullscreen`), `scale` (default 0.5), `fadeIn`, `fadeOut`, `fadeDuration` (default 0.5) |
| `video_hls_ladder` | Encode an HLS ladder into one folder, audio dropped | `rungs` from `1080p`, `720p`, `480p`, `360p` (default all), `crf` 0 to 51 (default 23), `segmentDuration` 2 to 10 (default 2) |

---

## 6. CONSENT AND FFMPEG SETUP

The server never downloads anything without the user's agreement.

1. `media_health` reports a missing ffmpeg or ffprobe with `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND` and names `media_setup_ffmpeg` as the next step
2. Call `media_setup_ffmpeg` without `consent`. When a component is missing it returns `CONSENT_REQUIRED` with the planned download for each one: URL, size, SHA-256 and destination
3. Show the user that plan and ask. Never pass `consent: true` before the user has seen it and agreed
4. On agreement, call `media_setup_ffmpeg` again with `consent: true`. The download is checked against its SHA-256 and installed into the server's data folder

When both binaries are already present the first call reports them ready and downloads nothing. On a platform with no pinned build the tool returns `INVALID_INPUT` and names the two override variables in Section 7.

---

## 7. ERROR CODES

| Code | Meaning | What to do |
| --- | --- | --- |
| `INVALID_INPUT` | An argument is missing, out of range or malformed | Fix the named parameter and retry |
| `PATH_NOT_ALLOWED` | A path sits outside every allowed folder | Ask the user to start the session in the folder that holds the media, or to add that folder to the allowed folders, then retry |
| `CONFIG_MISSING` | No allowed folder or no usable output folder is set | Ask the user to set the folder in the extension settings, removing any empty Directory path row, or to start the session in the media folder |
| `INPUT_NOT_FOUND` | The input path does not exist | Check the path with the user |
| `OUTPUT_EXISTS` | The output would overwrite a file or land on an input | Use another `fileName`, `newName` or `outputName`, or move the output folder off the input |
| `UNSUPPORTED_FORMAT` | The tool does not accept this input format | Convert the file first, or pick the tool that takes it |
| `FFMPEG_NOT_FOUND` | No ffmpeg was found | Run the consent flow in Section 6, or fall back to ffmpeg on the path |
| `FFPROBE_NOT_FOUND` | No ffprobe was found | Run the consent flow in Section 6 for `ffprobe` |
| `CAPABILITY_MISSING` | The tool's ffmpeg lacks an encoder or filter the operation needs | Run the operation on local ffmpeg when its build has it, otherwise advise |
| `PROCESS_FAILED` | ffmpeg or ffprobe exited with an error | Run `media_probe` on the input. A damaged file goes to `media_repair` |
| `PROCESS_TIMEOUT` | The run passed the timeout, 1800 seconds by default | Split the file or trim it first, or raise `MEDIA_EDITOR_TIMEOUT_SECONDS` |
| `CONSENT_REQUIRED` | `media_setup_ffmpeg` needs the user's agreement | Show the planned download and wait for the user, Section 6 |
| `DOWNLOAD_FAILED` | The pinned build could not be downloaded or unpacked | Check the connection and retry, or install ffmpeg by hand |
| `CHECKSUM_MISMATCH` | The download did not match its SHA-256 | Do not retry blindly. Report it and install ffmpeg by hand |
| `INTERNAL` | An unexpected server error | Retry once, then report it with the tool name |

Report the code and the next step in plain words. Never present a failed call as a result.

---

## 8. SETTINGS AND GAPS

### Settings

The server reads command-line arguments first, then environment variables. The extension and the plugin set the folders for the user.

| Setting | Argument | Variable | Default |
| --- | --- | --- | --- |
| Allowed folders | `--allowed-dir` or a bare path, repeatable | `MEDIA_EDITOR_ALLOWED_DIRS` | None, every tool that opens a file fails until one is set |
| Output folder | `--output-dir` | `MEDIA_EDITOR_OUTPUT_DIR` | The first allowed folder |
| ffmpeg override | | `MEDIA_EDITOR_FFMPEG_PATH` | Unset |
| ffprobe override | | `MEDIA_EDITOR_FFPROBE_PATH` | Unset |
| Process timeout | | `MEDIA_EDITOR_TIMEOUT_SECONDS` | 1800, from 1 to 86400 |
| Data folder | | `MEDIA_EDITOR_DATA_DIR` | The platform's application data folder |
| Log level | | `MEDIA_EDITOR_LOG_LEVEL` | `info`, also `error`, `warn` or `debug` |

### Gaps

| Operation | Status | Route |
| --- | --- | --- |
| Compress a video | Partial: `video_set_bitrate` lowers the bitrate, no tool takes a CRF target | ffmpeg `-crf` for a quality-based target |
| Trim audio | No tool. `video_trim` cuts video | ffmpeg `-ss` and `-to` with `-vn` |
| Normalize loudness | No tool | ffmpeg `loudnorm` |
| Fade audio | No tool. `video_add_fade` fades the picture | ffmpeg `afade` |

A gap runs on local ffmpeg when it is on the path, otherwise as advice. Say which route ran.

---

*This reference lists the tools. For how to run image work, see Image Operations. For video and audio work, see Video And Audio Operations. For HLS, see the HLS Video Conversion asset.*
