---
title: "Media Editor - Integrations - Video And Audio Operations"
description: "The twenty Media Editor video tools, the six audio tools and media_remove_silence with their parameters and defaults, then the FFmpeg and ffprobe commands that run the same operations when the tools are not connected, with codec, format and timing guidance."
contextType: implementation
importance_tier: important
trigger_phrases:
  - "video tools"
  - "audio tools"
  - "transcode trim concatenate"
  - "extract audio remove silence"
  - "ffmpeg video audio fallback"
version: 1.7.0.0
---

# Media Editor - Integrations - Video And Audio Operations

Technical reference for video and audio processing: the Media Editor video and audio tools first, locally installed FFmpeg and ffprobe when the tools are not connected.

---

## 1. OVERVIEW

### Purpose

Defines how each video and audio operation runs. Sections 2 and 3 cover the tools, which run the server's own ffmpeg. Section 4 maps every operation to its tool and names the three operations that have no tool yet. Sections 5 to 7 cover the FFmpeg commands for the same operations, which run when the tools are not connected or as advice when nothing can run.

### When to use

- Loaded for any video or audio processing operation
- Looking up a video or audio tool's parameters and defaults
- Looking up FFmpeg commands, codecs, formats and limits for the fallback route

### Route order

1. **Media Editor tools connected:** call the tool. The tools bring their own ffmpeg, check the encoders and filters an operation needs and return `CAPABILITY_MISSING` when their build lacks one
2. **No tools, FFmpeg on the path:** run the FFmpeg recipe. Check for FFmpeg once per session with `ffmpeg -version`, and check `ffmpeg -encoders` and `ffmpeg -filters` before promising a codec or a burn-in

If neither the tools nor the check answers, give the command as advice with install guidance and run nothing. Say where the result would land.

`references/tools.md` lists every tool with its parameters, the error codes and what to do about each one. Adaptive streaming with `video_hls_ladder` lives in the HLS Video Conversion asset.

---

## 2. VIDEO TOOLS

Every tool takes `inputPath`, an absolute path inside a folder the user allowed, and never changes that file. Every tool also takes `outputName`, a 1 to 64 character description that names the new numbered output folder, and writes its result there. Times accept seconds, a numeric string, `HH:MM:SS`, `HH:MM:SS.mmm` or `MM:SS`.

| Tool | Operation | Key parameters and defaults |
| --- | --- | --- |
| `video_convert` | Change the container | `format` is `mp4`, `mov`, `mkv`, `webm` or `avi`. A stream copy runs first, a re-encode only when the container rejects it |
| `video_convert_properties` | Change the container and any picture or sound property in one pass | `format` as above. Optional `resolution`, `codec`, `videoBitrate`, `frameRate`, `audioCodec`, `audioBitrate`, `sampleRate`, `channels` |
| `video_trim` | Cut to the span between two times | `startTime`, `endTime`. A stream copy runs first, a re-encode only when the copy cannot be stored |
| `video_concat` | Join 2 to 50 videos in order | `inputPaths`. Without `transition` every clip is normalized to the first clip's size and frame rate. With `transition` (`dissolve`, `fade`, `wipeleft` and 34 more) exactly two clips blend for `transitionDuration` seconds |
| `video_set_speed` | Speed up or slow down | `speedFactor` above 0 and at most 100, the audio tempo follows. Writes MP4 |
| `video_set_resolution` | Scale the picture | `resolution` as `WIDTHxHEIGHT` or a height, each side 1 to 32768 |
| `video_set_aspect_ratio` | Fit a target ratio | `aspectRatio` such as `16:9`. `resizeMode` `pad` or `crop`, default `pad`. `paddingColor` default `#000000` |
| `video_set_codec` | Re-encode the picture | `codec` is `libx264`, `libx265` or `libvpx-vp9` |
| `video_set_bitrate` | Re-encode the picture at a bitrate | `videoBitrate` 1k to 100M, such as `2M` |
| `video_set_frame_rate` | Re-encode at a frame rate | `frameRate` above 0 and at most 240 |
| `video_set_audio_codec` | Re-encode the sound, copy the picture when it can | `audioCodec` is `aac`, `libmp3lame` or `libopus` |
| `video_set_audio_bitrate` | Re-encode the sound at a bitrate | `audioBitrate` such as `128k` or `192k` |
| `video_set_audio_sample_rate` | Re-encode the sound at a sample rate | `sampleRate` 8000 to 384000 |
| `video_set_audio_channels` | Re-encode the sound at a channel count | `channels` 1 to 8 |
| `video_add_fade` | Fade from black at the start or to black at the end | `fadeType` `fade_in` or `fade_out`, `duration` in seconds. Writes MP4 |
| `video_add_text_overlay` | Draw timed text | `textElements`, 1 to 50 entries of `text`, `startTime`, `endTime`, `position` (default `bottom_center`), `fontSize` (default 24), `fontColor` (default `#FFFFFF`), `box` (default `false`) with its colour, opacity and border, and an optional `fontPath`. Writes MP4 |
| `video_add_image_overlay` | Place an image for a time span | `imagePath`, `position` (default `top_right`), optional `opacity` 0 to 1, `startTime`, `endTime`, `width`, `height`. Writes MP4 |
| `video_add_subtitles` | Burn in a SubRip file | `subtitlePath` to a `.srt` file, optional `fontStyle` with font name, size, colours, outline, shadow, alignment and margins. Writes MP4 |
| `video_add_b_roll` | Overlay timed clips | `clips`, 1 to 50 entries of `clipPath`, `insertAt`, optional `duration`, `position` (default `fullscreen`), `scale` (default 0.5), `fadeIn`, `fadeOut` and `fadeDuration` (default 0.5). Writes MP4 |
| `video_hls_ladder` | Encode an HLS ladder | `rungs` from `1080p`, `720p`, `480p`, `360p` (default all four), `crf` default 23, `segmentDuration` default 2. Drops the audio. See the HLS Video Conversion asset |

---

## 3. AUDIO TOOLS

| Tool | Operation | Key parameters and defaults |
| --- | --- | --- |
| `audio_extract` | Pull the audio track out of a video or audio file | `audioCodec` `libmp3lame` (.mp3, the default), `aac` (.m4a), `libvorbis` (.ogg), `flac` (.flac) or `pcm_s16le` (.wav) |
| `audio_convert` | Change the container | `format` is `mp3`, `wav`, `m4a`, `flac` or `ogg` |
| `audio_convert_properties` | Change the container and any sound property in one pass | `format` as above. Optional `audioBitrate`, `sampleRate`, `channels` |
| `audio_set_bitrate` | Re-encode at a bitrate | `audioBitrate` 1k to 100M |
| `audio_set_sample_rate` | Re-encode at a sample rate | `sampleRate` 8000 to 384000 |
| `audio_set_channels` | Re-encode at a channel count | `channels` 1 to 8, 1 is mono and 2 is stereo |
| `media_remove_silence` | Cut silent stretches from audio or video | `silenceThresholdDb` -100 to 0, default -30. `minSilenceDurationMs` default 500. A file with no audio stream is refused |

An audio tool given a video keeps the sound and drops the picture. A lossless container such as WAV or FLAC ignores `audioBitrate`.

---

## 4. CORE CAPABILITIES

| Operation | Media Editor tool | FFmpeg fallback |
| --- | --- | --- |
| Convert container | `video_convert`, `audio_convert` | Section 5, Format conversion |
| Trim video | `video_trim` | Section 5, Trim |
| Concatenate | `video_concat` | Section 5, Concatenate |
| Speed | `video_set_speed` | Section 5, Speed |
| Resolution and aspect ratio | `video_set_resolution`, `video_set_aspect_ratio` | Section 5, Resolution and aspect ratio |
| Codec, bitrate and frame rate | `video_set_codec`, `video_set_bitrate`, `video_set_frame_rate`, or `video_convert_properties` for several at once | Section 5, Codec, bitrate and frame rate |
| Compress video | Partial: `video_set_bitrate` lowers the bitrate. No tool takes a CRF target | Section 5, `-crf` |
| Fades | `video_add_fade`, picture only | Section 7 |
| Text, image and b-roll overlays | `video_add_text_overlay`, `video_add_image_overlay`, `video_add_b_roll` | Section 7 |
| Subtitle burn-in | `video_add_subtitles` | `subtitles` filter, when the build has it |
| Extract and convert audio | `audio_extract`, `audio_convert`, `audio_convert_properties` | Section 6 |
| Audio bitrate, sample rate and channels | `audio_set_*`, or `video_set_audio_*` to keep the picture | Section 6 |
| Remove silence | `media_remove_silence` | Section 6, `silenceremove` |
| Trim audio | No tool. `video_trim` is for video | Section 6, `-ss` and `-to` with `-vn` |
| Normalize loudness | No tool | Section 6, `loudnorm` |
| Inspect | `media_probe` | `ffprobe` |
| HLS | `video_hls_ladder` | The HLS Video Conversion asset |

An operation with no tool runs on the FFmpeg route, or as advice when FFmpeg is not on the path either. Say which route ran.

Build-dependent work on the FFmpeg route: text burn-in and subtitle burn-in need the `drawtext`, `subtitles` or `ass` filters, which some builds omit. Check before promising them:

```bash
ffmpeg -filters | grep -E "drawtext|subtitles|ass "
```

---

## 5. VIDEO OPERATIONS (FFMPEG FALLBACK)

Write results to `media files/export/[###] - [description]/` in the runtime. Encoder availability varies by build. Check the common encoders before promising a format:

```bash
ffmpeg -encoders | grep -E "libx264|libx265|libvpx|aac|libmp3lame"
```

### Format conversion

```bash
ffmpeg -i INPUT.mov OUTPUT.mp4
```

The plain command picks sensible defaults for the container. For explicit control:

```bash
ffmpeg -i INPUT.mov -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k OUTPUT.mp4
```

### Trim

```bash
ffmpeg -ss 00:00:30 -to 00:02:00 -i INPUT.mp4 -c copy OUTPUT.mp4
```

`-c copy` is fast and cuts at the nearest keyframe. Drop `-c copy` for a frame-accurate cut at the cost of a re-encode.

### Concatenate

```bash
printf "file '%s'\n" clip-1.mp4 clip-2.mp4 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy OUTPUT.mp4
```

All clips need the same codecs, frame size and frame rate for `-c copy`. Re-encode when they differ.

### Speed

```bash
ffmpeg -i INPUT.mp4 -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" OUTPUT.mp4
```

`setpts=0.5*PTS` doubles speed and `setpts=2.0*PTS` halves it. `atempo` accepts 0.5 to 2.0 per instance, so chain it for stronger changes, for example `atempo=2.0,atempo=2.0` for four times.

### Resolution and aspect ratio

```bash
ffmpeg -i INPUT.mp4 -vf scale=1280:720 -c:a copy OUTPUT.mp4
ffmpeg -i INPUT.mp4 -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2" -c:a copy OUTPUT.mp4
```

| Ratio | Use case | Common resolutions |
| --- | --- | --- |
| 16:9 | Standard video, YouTube and TV | 1920x1080, 1280x720 |
| 1:1 | Social media square | 1080x1080, 720x720 |
| 9:16 | Vertical video, Stories and TikTok | 1080x1920, 720x1280 |
| 21:9 | Cinematic ultrawide | 2560x1080, 3440x1440 |

### Codec, bitrate and frame rate

```bash
ffmpeg -i INPUT.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k OUTPUT.mp4
ffmpeg -i INPUT.mp4 -c:v libx265 -crf 28 -c:a aac OUTPUT.mp4
ffmpeg -i INPUT.mp4 -c:v libvpx-vp9 -crf 32 -b:v 0 -c:a libopus OUTPUT.webm
ffmpeg -i INPUT.mp4 -b:v 5M OUTPUT.mp4
ffmpeg -i INPUT.mp4 -r 30 -c:a copy OUTPUT.mp4
```

---

## 6. AUDIO OPERATIONS (FFMPEG FALLBACK)

```bash
ffmpeg -ss 00:00:30 -to 00:02:00 -i INPUT.mp3 -c copy OUTPUT.mp3
ffmpeg -i INPUT.mp4 -vn -c:a libmp3lame -b:a 192k OUTPUT.mp3
ffmpeg -i INPUT.mp4 -vn -c:a copy OUTPUT.m4a
ffmpeg -i INPUT.wav -c:a aac -b:a 192k OUTPUT.m4a
ffmpeg -i INPUT.mp4 -vn -af loudnorm OUTPUT.wav
ffmpeg -i INPUT.mp4 -af "silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-40dB" -vn OUTPUT.wav
```

- `-ss` and `-to` cut an audio span, the same way as a video trim
- `-vn` drops the video stream
- `-c:a copy` keeps the original audio without re-encoding
- `loudnorm` applies EBU R128 loudness normalization in one pass
- `silenceremove` removes silence above the threshold and for longer than the duration

### Audio quality guidelines

| Preset | Bitrate | Use case | Quality |
| --- | --- | --- | --- |
| Voice only | 96k | Speech and podcasts | Acceptable for voice |
| Standard | 128k | General audio | Good for most uses |
| Music streaming | 192k | Music, good quality | High quality audio |
| High quality | 256k | High quality music | Very high quality |
| Maximum | 320k | Archival and production | Maximum quality |

Sample rates: 22.05 kHz for minimal voice, 44.1 kHz for CD quality, 48 kHz for professional work. Channels: 1 for mono voice, 2 for stereo music and video.

---

## 7. FADES AND OVERLAYS (FFMPEG FALLBACK)

```bash
ffmpeg -i INPUT.mp4 -vf "fade=t=in:st=0:d=1" -c:a copy OUTPUT.mp4
ffmpeg -i INPUT.mp4 -af "afade=t=in:st=0:d=1" -vn OUTPUT.wav
ffmpeg -i INPUT.mp4 -i logo.png -filter_complex "[1:v]scale=120:-1[logo];[0:v][logo]overlay=20:20" -c:a copy OUTPUT.mp4
ffmpeg -i CLIP-A.mp4 -i CLIP-B.mp4 -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=4" -c:a copy OUTPUT.mp4
```

The overlay position is x and y from the top left corner. A watermark usually sits at `20:20` for the top left or `main_w-overlay_w-20:20` for the top right. `xfade` needs both clips at the same frame size and pixel format, so scale them to match first.

---

## 8. FORMAT SUPPORT

**Media Editor tools:**
- Video containers: MP4, MOV, MKV, WebM and AVI. The overlay, fade, speed, subtitle and b-roll tools write MP4
- Video codecs: H.264 (`libx264`), H.265 (`libx265`) and VP9 (`libvpx-vp9`)
- Audio containers: MP3, WAV, M4A, FLAC and OGG
- Audio codecs: AAC, MP3 (`libmp3lame`), Opus (`libopus`), Vorbis, FLAC and PCM through `audio_extract`

**FFmpeg fallback, video:**
- MP4 (H.264, H.265, AAC and MP3): universal compatibility
- MOV (H.264, ProRes, AAC and PCM): Apple ecosystem
- AVI: legacy systems
- MKV: maximum flexibility
- WebM (VP8, VP9 and Opus): web streaming

**FFmpeg fallback, audio:**
- MP3: lossy, universal playback
- WAV (PCM): lossless, editing and production
- AAC: lossy, modern devices
- FLAC: lossless, archival
- OGG (Vorbis): lossy, open source

The container must accept the chosen streams. MP4 does not carry VP9 or Opus reliably, so WebM is the container for that pair.

---

## 9. CODEC SPECIFICATIONS

**Video codecs:**
- H.264 (libx264): universal compatibility, good compression, fast. Default choice
- H.265 (libx265): modern devices, about half the size of H.264 at the same quality, slower. Size optimization
- VP9 (libvpx-vp9): web browsers, good compression, slow. Web streaming and WebM
- ProRes: professional editing, minimal compression, very fast. Production workflow

**Audio codecs:**
- AAC: modern standard, excellent quality at low bitrates. Default choice
- MP3 (libmp3lame): universal compatibility, good quality
- PCM: uncompressed, perfect quality. Editing and production
- FLAC: lossless, perfect quality. Archival
- Opus (libopus): modern, excellent quality. Streaming efficiency

---

## 10. PERFORMANCE AND LIMITATIONS

| File size | Trim | Convert | Compress or re-encode |
| --- | --- | --- | --- |
| Under 100MB | 1-5s | 5-15s | 10-30s |
| 100MB to 1GB | 5-20s | 30-120s | 60-300s |
| Over 1GB | 20-60s | 2-10min | 5-20min |

- Required: the Media Editor tools or FFmpeg on the path, sufficient disk space, and the file inside a folder the tools may read or that the terminal can reach
- A tool call returns when the work ends or the server's timeout stops it, 1800 seconds by default. Tell the user the expected time for a large file and suggest splitting it when that is acceptable
- Can do: format conversion, transcoding, trimming, concatenation, speed, resolution and aspect changes, fades, text, image and b-roll overlays, subtitle burn-in, audio extraction, audio conversion and silence removal. Audio trim, loudness normalization and CRF compression run on FFmpeg only
- Cannot do: AI content generation, complex non-linear editing, real-time processing, direct upload to platforms
- A stream copy keeps quality and speed but cuts at keyframes and cannot change the encoding. `video_trim` and `video_convert` try the copy first and re-encode when it cannot work

---

*This reference covers video and audio processing with the Media Editor tools and with installed FFmpeg. For every tool's parameters and error codes, see the Media Editor Tools reference. For adaptive streaming, see the HLS Video Conversion asset. For the MEDIA thinking method, see the MEDIA Framework. For conversation flow and error handling, see Interactive Intelligence.*
