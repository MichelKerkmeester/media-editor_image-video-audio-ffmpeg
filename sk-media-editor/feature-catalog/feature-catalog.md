---
title: "Media Editor: Feature Catalog"
description: "Unified current-state inventory of the Media Editor tools, runtime interfaces, package behavior, and quality gates."
trigger_phrases:
  - "Media Editor"
  - "media editing tools"
  - "feature catalog"
last_updated: "2026-10-04"
version: "1.0.0.0"
---

# Media Editor: Feature Catalog

This document catalogs the Media Editor runtime and the skill and Project behaviors built around it. Each entry summarizes current behavior and links to one feature file with implementation and validation anchors.

---

## 1. OVERVIEW

Use this catalog as the current inventory for the Media Editor system. It covers the registered media tools, shared runtime behavior, command-line and distribution surfaces, skill and Project routes, and quality checks.

---

## 2. IMAGE TOOLS

### Image resize

#### Description

Resizes one image to a width, a height, or both. It writes one file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_resize. The schema permits either dimension to be omitted, but the handler rejects a call with neither width nor height. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image resize](image-tools/image-resize.md) for full implementation and test file listings.

### Image convert

#### Description

Converts one image to jpeg, png, webp, or avif. Quality from 1 to 100 is visual quality for jpeg, webp, and avif, and the palette colour target for png. maxBytes caps the file size for jpeg, webp, and avif by lowering quality, never by resizing. It writes one re-encoded file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_convert. The maxBytes option is limited to JPEG, WebP, and AVIF. The handler rejects maxBytes with PNG, and refuses before writing if quality reduction to 1 still cannot meet the byte ceiling. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image convert](image-tools/image-convert.md) for full implementation and test file listings.

### Image crop

#### Description

Crops one rectangular region from an image. The region must fit inside the image. It writes one file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_crop. The requested rectangle must fit inside the decoded image. A region outside the source bounds is rejected. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image crop](image-tools/image-crop.md) for full implementation and test file listings.

### Image compress

#### Description

Compresses one jpeg, png, webp, or avif image in its own format. Quality from 1 to 100 is visual quality for jpeg, webp, and avif, and the palette colour target for png. Progressive applies to jpeg only. It writes one re-encoded file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_compress. The handler accepts supported image inputs and preserves their source format. An unsupported image format is refused. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image compress](image-tools/image-compress.md) for full implementation and test file listings.

### Image rotate

#### Description

Rotates one image by an angle in degrees. A turn that is not a multiple of 90 enlarges the canvas and fills the new corners with the background colour. It writes one file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_rotate. The handler uses the supplied angle and fills expanded corners with the requested background color. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image rotate](image-tools/image-rotate.md) for full implementation and test file listings.

### Image flip

#### Description

Mirrors one image horizontally, vertically, or both ways. The width and height stay the same. It writes one file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_flip. The direction must match one of the three schema enum values. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image flip](image-tools/image-flip.md) for full implementation and test file listings.

### Image probe

#### Description

Reads the format, pixel size, channels, bit depth, colour space, density, alpha and byte size of one image. With preview it also returns a small JPEG of the picture, to name the file by what it shows. It writes no file and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_probe. The probe accepts image files. With preview enabled, it adds a JPEG preview when decoding succeeds and reports preview failure as a warning.

#### Source Files

See [Image probe](image-tools/image-probe.md) for full implementation and test file listings.

### Image batch resize

#### Description

Resizes one image into each listed size. It writes one file per size, all in one new numbered folder unless subfolder is false, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe image_batch_resize. The schema allows one to twenty entries. The handler rejects repeated output suffixes before writing. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Image batch resize](image-tools/image-batch-resize.md) for full implementation and test file listings.


---

## 3. AUDIO TOOLS

### Audio extract

#### Description

Extracts the audio track from a video or audio file into a file of its own. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_extract. The input must contain an audio stream. A video input contributes its audio track. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Audio extract](audio-tools/audio-extract.md) for full implementation and test file listings.

### Audio convert

#### Description

Changes the container of one audio file. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_convert. The input must contain an audio stream. A video input keeps its audio and drops its picture. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Audio convert](audio-tools/audio-convert.md) for full implementation and test file listings.

### Audio convert properties

#### Description

Changes an audio file's container and can set its bitrate, sample rate, and channel count. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_convert_properties. The input must contain an audio stream. A video input keeps its audio and drops its picture. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Audio convert properties](audio-tools/audio-convert-properties.md) for full implementation and test file listings.

### Audio set bitrate

#### Description

Re-encodes one audio file at a target bitrate. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_set_bitrate. The input must contain an audio stream. A video input keeps its audio and drops its picture. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Audio set bitrate](audio-tools/audio-set-bitrate.md) for full implementation and test file listings.

### Audio set sample rate

#### Description

Re-encodes one audio file at a target sample rate. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_set_sample_rate. The input must contain an audio stream. A video input keeps its audio and drops its picture. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Audio set sample rate](audio-tools/audio-set-sample-rate.md) for full implementation and test file listings.

### Audio set channels

#### Description

Re-encodes one audio file at a target channel count. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe audio_set_channels. The input must contain an audio stream. A video input keeps its audio and drops its picture. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Audio set channels](audio-tools/audio-set-channels.md) for full implementation and test file listings.


---

## 4. VIDEO FORMAT TOOLS

### Video convert

#### Description

Changes the container of one video. A stream copy is tried first, and both streams are re-encoded only when the new container rejects that copy. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_convert. The input must contain a video stream. Requested container and codec combinations are checked before output. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video convert](video-format-tools/video-convert.md) for full implementation and test file listings.

### Video convert properties

#### Description

Changes a video's container and can set its resolution, codecs, bitrates, frame rate, and audio properties. It writes that file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_convert_properties. The input must contain a video stream. Resolution values accept the forms described by the schema. The handler rejects values outside its supported range. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video convert properties](video-format-tools/video-convert-properties.md) for full implementation and test file listings.

### Video set resolution

#### Description

Scales one video to a target picture size. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_resolution. The input must contain a video stream. The handler rejects a requested dimension outside the supported range. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set resolution](video-format-tools/video-set-resolution.md) for full implementation and test file listings.

### Video set codec

#### Description

Re-encodes the picture of one video as libx264, libx265, or libvpx-vp9. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_codec. The input must contain a video stream. The chosen codec must be supported by the runtime and the installed ffmpeg build. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set codec](video-format-tools/video-set-codec.md) for full implementation and test file listings.

### Video set bitrate

#### Description

Re-encodes the picture of one video at a target bitrate. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_bitrate. The input must contain a video stream. The requested bitrate must be valid and the encoder available. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set bitrate](video-format-tools/video-set-bitrate.md) for full implementation and test file listings.

### Video set frame rate

#### Description

Re-encodes the picture of one video at a target frame rate. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_frame_rate. The input must contain a video stream. The frame rate is bounded by the schema and capability checks. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set frame rate](video-format-tools/video-set-frame-rate.md) for full implementation and test file listings.

### Video set aspect ratio

#### Description

Fits one video to a target aspect ratio by padding it or by cropping it. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_aspect_ratio. The input must contain a video stream. The ratio must parse as a valid width-to-height pair, and the selected crop or pad mode must be supported. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set aspect ratio](video-format-tools/video-set-aspect-ratio.md) for full implementation and test file listings.

### Video set audio codec

#### Description

Re-encodes the audio track of one video as aac, libmp3lame, or libopus, copying the picture when it can. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_audio_codec. The input must contain both a video stream and an audio stream. The requested audio encoder must be available. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set audio codec](video-format-tools/video-set-audio-codec.md) for full implementation and test file listings.

### Video set audio bitrate

#### Description

Re-encodes the audio track of one video at a target bitrate, copying the picture when it can. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_audio_bitrate. The input must contain video and audio streams. The requested audio bitrate is checked before encoding. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set audio bitrate](video-format-tools/video-set-audio-bitrate.md) for full implementation and test file listings.

### Video set audio sample rate

#### Description

Re-encodes the audio track of one video at a target sample rate in hertz, copying the picture when it can. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_audio_sample_rate. The input must contain video and audio streams. The requested sample rate is checked before encoding. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set audio sample rate](video-format-tools/video-set-audio-sample-rate.md) for full implementation and test file listings.

### Video set audio channels

#### Description

Re-encodes the audio track of one video at a target channel count, copying the picture when it can. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_audio_channels. The input must contain video and audio streams. The requested channel count is checked before encoding. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set audio channels](video-format-tools/video-set-audio-channels.md) for full implementation and test file listings.


---

## 5. VIDEO EDITING TOOLS

### Video trim

#### Description

Cuts one video to the span between two times. A stream copy is tried first, and the video is re-encoded only when that copy cannot be stored. It writes the file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_trim. The input must contain a video stream. The end time must be later than the start time. Times beyond the media duration are clamped to the end of the file. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video trim](video-editing-tools/video-trim.md) for full implementation and test file listings.

### Video concat

#### Description

Joins two or more videos into one file, in the order they are given. Without a transition every clip is normalized to the size and frame rate of the first clip and the clips are joined end to end. With a transition exactly two clips are blended into one another. It writes one MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with the total file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_concat. The input list has two to fifty paths. A transition requires exactly two clips and a duration. A duration without a transition is rejected, and the transition must be shorter than the first clip. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video concat](video-editing-tools/video-concat.md) for full implementation and test file listings.

### Video set speed

#### Description

Changes how fast a video plays, speeding the picture up or slowing it down while the audio tempo follows the same factor. It writes the result as an MP4 file in the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_set_speed. The input must contain a video stream. The speed factor is greater than zero and no more than 100. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video set speed](video-editing-tools/video-set-speed.md) for full implementation and test file listings.

### Video add subtitles

#### Description

Burns one SubRip subtitle file into one video, using the subtitles filter and the font folder that ships with the server. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_subtitles. The input must contain a video stream. The subtitle file must resolve inside an allowed root and be readable as a supported subtitle input. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video add subtitles](video-editing-tools/video-add-subtitles.md) for full implementation and test file listings.

### Video add text overlay

#### Description

Draws one or more timed text overlays over a video, one drawtext filter per element. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_text_overlay. The input must contain a video stream. End time must follow start time. A requested font path must be allowed, and the selected font must exist. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video add text overlay](video-editing-tools/video-add-text-overlay.md) for full implementation and test file listings.

### Video add image overlay

#### Description

Places one scaled image over a video for a time span, at a chosen position and with an optional opacity. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it, and splitting the file is a suggestion for the caller rather than something the server does on its own.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_image_overlay. The video and overlay image must resolve inside allowed roots. End time, when supplied with start time, must be later. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video add image overlay](video-editing-tools/video-add-image-overlay.md) for full implementation and test file listings.

### Video add b roll

#### Description

Overlays one or more clips onto a main video as timed overlays, each at its own position and shown length, with optional fades. Every clip starts from its first frame when its window opens. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes an input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB. The call returns when the work ends or when the timeout stops it.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_b_roll. The schema permits up to fifty clips, but the handler rejects an empty list. Each insert point must precede the main video's end, each clip must have usable duration, and fullscreen clips cannot specify scale. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video add b roll](video-editing-tools/video-add-b-roll.md) for full implementation and test file listings.

### Video add fade

#### Description

Adds one fade from black at the start or one fade to black at the end of a video. It writes one new MP4 file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. The picture is re-encoded, so run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_add_fade. The input must contain a video stream. The fade duration must be positive and no longer than the video. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video add fade](video-editing-tools/video-add-fade.md) for full implementation and test file listings.

### Video hls ladder

#### Description

Encodes one video into an HLS ladder for streaming: one master playlist, one playlist per selected rung (1080p, 720p, 480p, 360p) and H.264 segments beside every playlist, all inside one new numbered folder. A rung taller than the source is left out and named in the result. It never changes the input and drops the audio track. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe video_hls_ladder. Rungs must not repeat. Rungs taller than the source are dropped, and the call fails if no requested rung fits. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Video hls ladder](video-editing-tools/video-hls-ladder.md) for full implementation and test file listings.


---

## 6. MEDIA UTILITY TOOLS

### Media health

#### Description

Reports the server version, where ffmpeg and ffprobe were found, which encoders and filters they offer, the image engine versions, and the folders and limits in effect. It runs without reading any media file. It reports local paths.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_health. The call succeeds as a report when binaries are missing. Missing ffmpeg or ffprobe is reported in the returned fields. Its `nextStep` field names `media_setup_ffmpeg` when a binary is missing and is null otherwise, so the command line and MCP clients read the same next step.

#### Source Files

See [Media health](media-utility-tools/media-health.md) for full implementation and test file listings.

### Media probe

#### Description

Reads container and stream metadata from one image, audio or video file with ffprobe: format name, duration, size and bit rate, plus the codec, pixel size, frame rate, sample rate and channel layout of every stream. With preview it also returns one small JPEG frame, to name the file by what it shows. It writes nothing, creates no output folder, and never changes the input.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_probe. The input must be readable by ffprobe. Preview failure is a warning and does not discard metadata.

#### Source Files

See [Media probe](media-utility-tools/media-probe.md) for full implementation and test file listings.

### Media rename

#### Description

Gives one image, video or audio file inside the export folder a readable name. A generic name such as "CleanShot 2026-10-03 at 16.46.54-converted.webp" becomes "team-offsite-hero.webp" for the name "team offsite hero". The name is slugged to lowercase words joined by hyphens, the file keeps its extension and its folder, and an existing file is never overwritten. Files outside the export folder are refused.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_rename. The source must be a supported image, video, audio, playlist, or segment inside the export root. The destination keeps the extension, and an existing file is refused rather than overwritten.

#### Source Files

See [Media rename](media-utility-tools/media-rename.md) for full implementation and test file listings.

### Media repair

#### Description

Diagnoses a damaged or partly readable video or audio file with ffprobe, then rewrites it with a matching ffmpeg pass: remux copies the streams into a fresh container, which repairs a missing or broken index or timestamp table. Reencode rebuilds the streams as H.264 and AAC (AAC alone for audio), which repairs damaged or cut-short streams. It writes one new file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_repair. The diagnosis must find at least one audio or video stream. Strategy selects remux, reencode, or an automatic copy followed by decode check and a reencode fallback. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Media repair](media-utility-tools/media-repair.md) for full implementation and test file listings.

### Media remove silence

#### Description

Finds silent stretches in an audio or video file and keeps the loud parts, so the result plays back to back. A file with no audio stream is refused. It writes one new file into the export root, in a new numbered folder when subfolder is true, or in the existing folder named by targetFolder, and never changes the input. Run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes above 1 GB.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_remove_silence. The input must contain an audio stream and a readable duration. If every stretch is silent at the selected threshold, the call is rejected. Common output naming and placement limits are defined in the linked shared entries.

#### Source Files

See [Media remove silence](media-utility-tools/media-remove-silence.md) for full implementation and test file listings.

### Media setup ffmpeg

#### Description

Finds ffmpeg and ffprobe, and downloads a pinned build of either one that is missing after the user consents. The first call returns the planned download, with its URL, size, SHA-256 and destination, for the user to review, and `consent: true` must only be passed after the user accepts it.

#### Current Reality

The handler is registered in the runtime tool registry. Its published schema is available through media-editor describe media_setup_ffmpeg. The tool reports the pinned URL, size, SHA-256, and destination before installation. Missing user consent, unsupported platform, missing license text, download failure, checksum mismatch, and post-install resolution failure are explicit errors.

#### Source Files

See [Media setup ffmpeg](media-utility-tools/media-setup-ffmpeg.md) for full implementation and test file listings.


---

## 7. SHARED TOOL BEHAVIOR

### Output naming

#### Description

Media Editor derives stable output names from the input and operation or from a readable name supplied by the caller.

#### Current Reality

outputName names numbered folders. fileName names a result file and is limited to one path segment. The shared writer slugifies names, preserves the output extension, and avoids overwriting an existing result.

#### Source Files

See [Output naming](shared-tool-behavior/output-naming.md) for full implementation and test file listings.

### Output placement

#### Description

Writing tools place one result in the export root and can group multi-file results in numbered folders.

#### Current Reality

A call can force a new numbered folder with subfolder. Later calls can target an existing numbered folder through targetFolder. The target must be a direct child of the export root and must already exist.

#### Source Files

See [Output placement](shared-tool-behavior/output-placement.md) for full implementation and test file listings.

### Path guard and allowed folders

#### Description

Media Editor resolves input files only inside configured allowed roots and checks paths again before a process uses them.

#### Current Reality

Input paths must be absolute and identify readable regular files. The path guard resolves roots and candidates, rejects paths outside configured roots, and detects changed inputs before processing.

#### Source Files

See [Path guard and allowed folders](shared-tool-behavior/path-guard-and-allowed-folders.md) for full implementation and test file listings.

### Error codes and result shape

#### Description

Tool failures use a fixed error-code set, while successful calls return a common structured result with tool-specific fields.

#### Current Reality

Successful results include tool, outputs, warnings, and elapsedMs. Each output entry reports its path, byte size, media type, and available read-back fields. Failures carry a code, message, and details object.

#### Source Files

See [Error codes and result shape](shared-tool-behavior/error-codes-and-result-shape.md) for full implementation and test file listings.

### Persistent probe cache

#### Description

Probe results are cached under the configured data folder and reused only when the binary identity still matches.

#### Current Reality

The cache stores entries in probes.json and writes updates atomically. Its identity includes the resolved probe binary path, binary version, and the binary file's size and modification time. Media probes of input files are not cached. Concurrent requests for the same probe share in-flight work.

#### Source Files

See [Persistent probe cache](shared-tool-behavior/persistent-probe-cache.md) for full implementation and test file listings.

### Preview image

#### Description

Probe tools can return a small JPEG preview for image and video input.

#### Current Reality

Image previews are scaled inside a 512-pixel longest edge. Video previews extract one frame at one quarter of the reported duration, then apply the same image scaling. Audio has no picture. A failed optional preview becomes a warning.

#### Source Files

See [Preview image](shared-tool-behavior/preview-image.md) for full implementation and test file listings.

### FFmpeg resolution and pinned builds

#### Description

Media Editor locates ffmpeg and ffprobe through configured, bundled, installed, and system candidates, with pinned build metadata for supported platforms.

#### Current Reality

The resolver verifies candidates before accepting them and caches successful resolutions. The pinned-build table defines platform keys, artifact URLs, archive formats, digests, versions, and executable names. The setup tool installs only after consent.

#### Source Files

See [FFmpeg resolution and pinned builds](shared-tool-behavior/ffmpeg-resolution-and-pinned-builds.md) for full implementation and test file listings.


---

## 8. COMMAND LINE

### Media editor command

#### Description

The media-editor command exposes tool discovery, schema inspection, health reporting, and one-tool execution.

#### Current Reality

list returns the registered tool names and descriptions. describe prints one tool schema. health reports the runtime environment. A tool-name subcommand runs that handler as a single call.

#### Source Files

See [Media editor command](command-line/media-editor-command.md) for full implementation and test file listings.

### Argument input

#### Description

A media-editor tool call reads its JSON arguments from exactly one of --args, --args-file, or standard input.

#### Current Reality

--args parses inline JSON. --args-file reads JSON from the named file. With neither option, a piped standard input supplies the argument object. On an interactive terminal the call starts from an empty object. Conflicting argument sources are rejected as usage errors.

#### Source Files

See [Argument input](command-line/argument-input.md) for full implementation and test file listings.

### Runtime options

#### Description

The command accepts folder, timeout, and data-directory options for one CLI process.

#### Current Reality

--allowed-dir can be repeated to add readable roots. --output-dir chooses the export destination. --data-dir chooses persistent data storage. --timeout sets the per-run limit. Command options override matching environment settings. With no flag and no matching environment value, the allowed root is the project folder and the output folder is `<project folder>/media files/export`. The project folder is the working folder, or the folder that holds `media files` when the command starts inside one.

#### Source Files

See [Runtime options](command-line/runtime-options.md) for full implementation and test file listings.

### Stdout contract exit codes and signal cleanup

#### Description

The CLI writes one JSON result to stdout, sends logs to stderr, and returns distinct process exit codes for success, tool error, usage error, startup error, and signals.

#### Current Reality

Success exits with 0. A tool error exits with 1. Usage and argument errors exit with 2. Startup errors exit with 3. SIGINT and SIGTERM return 130 and 143 after active child processes and temporary outputs are cleaned up.

#### Source Files

See [Stdout contract exit codes and signal cleanup](command-line/stdout-contract-exit-codes-and-signal-cleanup.md) for full implementation and test file listings.


---

## 9. DISTRIBUTION

### MCP server entry

#### Description

The MCP server starts on stdio and registers the runtime tool roster with the server SDK.

#### Current Reality

The server creates tool context and exposes registered tools through the MCP protocol. The Desktop extension manifest starts dist/index.js. The Claude Code plugin uses the separate CLI entry and does not register an MCP server.

#### Source Files

See [MCP server entry](distribution/mcp-server-entry.md) for full implementation and test file listings.

### Claude Desktop extension bundle

#### Description

The Desktop extension manifest packages the MCP server, declares its tools, and exposes allowed-directory and output-directory settings.

#### Current Reality

The bundle includes the compiled server, production dependencies, assets, notices, and the matching pinned ffmpeg and ffprobe build. The build process validates the manifest, packs the extension, re-reads the artifact, and checks its contents.

#### Source Files

See [Claude Desktop extension bundle](distribution/claude-desktop-extension-bundle.md) for full implementation and test file listings.

### Claude Code plugin

#### Description

The Claude Code plugin ships the Media Editor skill and bin shims that invoke the media-editor CLI.

#### Current Reality

The POSIX and Windows shims run node against server/dist/cli.js. The plugin manifest contains no MCP server registration. The plugin build rejects an MCP registration and checks the copied skill and staged server.

#### Source Files

See [Claude Code plugin](distribution/claude-code-plugin.md) for full implementation and test file listings.

### Bundle and plugin build scripts

#### Description

Build scripts compile the runtime, create per-platform Desktop extension bundles, fill the Claude Code plugin, and run tests on pinned binaries.

#### Current Reality

npm run bundle accepts one platform target or all supported targets. npm run plugin fills the plugin from a built bundle. npm run test:pinned places the machine's pinned binaries and runs Vitest with the pinned binary directory configured.

#### Source Files

See [Bundle and plugin build scripts](distribution/bundle-and-plugin-build-scripts.md) for full implementation and test file listings.


---

## 10. SKILL BEHAVIOR

### Skill route order

#### Description

The skill tries the media-editor command first, uses hand-written ffmpeg guidance when the command is unavailable, and falls back to advice when neither route can execute.

#### Current Reality

The skill checks command availability before processing. When the CLI is unavailable, it checks for local ffmpeg and ffprobe. Unsupported or unavailable execution becomes exact command guidance or a setup offer, without a claimed file write.

#### Source Files

See [Skill route order](skill-behavior/skill-route-order.md) for full implementation and test file listings.

### Tool check behavior

#### Description

The skill verifies the available Media Editor command or local ffmpeg capabilities before it reports a processing result.

#### Current Reality

The command route uses media-editor health and tool descriptions. The local route checks ffmpeg and the encoders or filters needed by the selected operation. To look at a file before naming it, the local route renders one small preview into the system temp folder, never under `media files/`. It writes with `-n`, never `-y`, runs trial encodes for a size target in the temp folder and writes the confirmed name once, so no export is replaced. A missing binary or capability is reported before processing. When `media-editor health` sets `nextStep` to `media_setup_ffmpeg`, the skill runs that tool without consent in the same turn and puts the download plan in its one question.

#### Source Files

See [Tool check behavior](skill-behavior/tool-check-behavior.md) for full implementation and test file listings.

### Skill naming and placement gate

#### Description

Before the first write, the skill asks one question that proposes readable names and one destination for the requested outputs.

#### Current Reality

The gate confirms the output name or names and whether files go in the export root or one numbered folder. For a multi-call batch, the skill carries the first returned targetFolder into later tool calls. Every other clarification joins the same question. A reply that confirms the proposal without answering one of its points accepts the recommendation the question stated for that point. When the request does not yet say what the media shows, the question proposes a working name from the stated purpose, and the answer refines it. When every output already has a name the user gave and its place is settled, nothing is left to ask, so unstated settings take their smart defaults, named in the reply.

#### Source Files

See [Skill naming and placement gate](skill-behavior/skill-naming-and-placement-gate.md) for full implementation and test file listings.

### Command routing and aliases

#### Description

The skill routes explicit dollar commands before keyword inference and uses the first recognized command when a request contains more than one.

#### Current Reality

Aliases map to the image, audio, video, repair, and interactive modes. The route contract publishes fixtures and a differential script that checks the skill router against the contract.

#### Source Files

See [Command routing and aliases](skill-behavior/command-routing-and-aliases.md) for full implementation and test file listings.

### Skill export delivery

#### Description

After a skill operation writes a result, the skill reports the path and reads back the file when the route supports it.

#### Current Reality

The response distinguishes a successful file write from advice or a refusal. The operation result supplies the output path and any returned media details. A project run without execution tools cannot claim the same delivery.

#### Source Files

See [Skill export delivery](skill-behavior/skill-export-delivery.md) for full implementation and test file listings.


---

## 11. PROJECT BEHAVIOR

### Project kernel and knowledge files

#### Description

The Claude Project package combines its Custom Instructions kernel with attached knowledge files for operation recipes and decision rules.

#### Current Reality

The kernel defines project identity, routing, clarification, boundaries, and the no-execution truth. Its boundaries lead an oversized request with the limit: the input is named as very large with its cost in time and disk, and a lighter path such as splitting the source or a shorter quality ladder comes before the full-file route. Knowledge files provide image, video, audio, HLS, setup, and interactive guidance. These files describe behavior for the hosted Project surface.

#### Source Files

See [Project kernel and knowledge files](project-behavior/project-kernel-and-knowledge-files.md) for full implementation and test file listings.

### Desktop extension route

#### Description

Claude Desktop connects to the Media Editor MCP server through the extension bundle and supplies its configured allowed and output directories.

#### Current Reality

The extension manifest starts the Node MCP server, declares its tools, and asks for allowed directories. With the extension connected, the Project routes work through those tools. The Project hand-off still depends on host availability. The tools take absolute paths and cannot list a folder, so the Project builds each input path from the allowed folders `media_health` reports and the file name the user gave. When a request names no file, the Project asks for its name instead of guessing one.

#### Source Files

See [Desktop extension route](project-behavior/desktop-extension-route.md) for full implementation and test file listings.

### Project no-execution truth

#### Description

Without connected Media Editor tools, the Project gives an exact command and check and does not claim to edit or save a file.

#### Current Reality

The Project can provide a local command, destination, and verification steps. If connected tools are present, the route may call those tools and report their returned paths. The hosted Project alone does not execute local files. In Repair Mode without the tools, the Project answers at once with the `ffprobe` diagnosis, the remux repair command under a proposed readable name, a re-encode fallback and the delivery fields. A question about the symptom follows the commands and never replaces them. The first command reply of a conversation also offers once, on the line before the attestation, to walk the user through installing the Media Editor extension. A reply that notices a mistake in a command it already gave repeats the whole corrected command, never a prose patch.

#### Source Files

See [Project no-execution truth](project-behavior/project-no-execution-truth.md) for full implementation and test file listings.

### Project naming and placement gate

#### Description

Before a connected Project tool writes, it asks one question that confirms readable names and one output location for the requested files.

#### Current Reality

The Project presents names and destination before the first write. For a multi-call batch, it reuses the returned numbered target folder so the outputs stay together. A reply that confirms the proposal without answering one of its points accepts the recommendation the question stated for that point. When the request does not yet say what the media shows, the question proposes a working name from the stated purpose, and the answer refines it. When every output already has a name the user gave and its place is settled, nothing is left to ask, so unstated settings take their smart defaults, named in the reply.

#### Source Files

See [Project naming and placement gate](project-behavior/project-naming-and-placement-gate.md) for full implementation and test file listings.


---

## 12. QUALITY GATES

### Router contract fixtures and differential

#### Description

The router benchmark checks command and alias behavior against fixtures and compares the contract with the current skill router.

#### Current Reality

The fixture runner executes the routing cases. The differential script reports mismatches between contract outcomes and router behavior. Manual scenarios also exercise first-command precedence and selected aliases.

#### Source Files

See [Router contract fixtures and differential](quality-gates/router-contract-fixtures-and-differential.md) for full implementation and test file listings.

### Rule parity script

#### Description

The rule parity script compares selected skill rules with their Claude Project counterparts and reports parity findings.

#### Current Reality

The script reads a declared set of source and Project text, normalizes the selected rules, and checks the parity contract. The parity benchmark wrappers call shared validators in the Claude Project Sync Loop.

#### Source Files

See [Rule parity script](quality-gates/rule-parity-script.md) for full implementation and test file listings.

### Twin divergence grader and report check

#### Description

The grader compares skill and Project scenario outcomes for declared twin pairs and checks the report for reply lint findings.

#### Current Reality

The twin grader reads scenario results and identifies agreement or divergence for paired cases. check_report.sh runs the reply lint and twin comparison against a report directory. Findings remain report results and do not edit the source package.

#### Source Files

See [Twin divergence grader and report check](quality-gates/twin-divergence-grader-and-report-check.md) for full implementation and test file listings.

### Parity wrappers

#### Description

The parity directory exposes Media Editor wrapper commands for shared parity, query, residency, and receipt checks.

#### Current Reality

Each wrapper changes to the parity directory and invokes the corresponding shared script with the Media Editor system identifier. The wrappers declare exit behavior in their headers.

#### Source Files

See [Parity wrappers](quality-gates/parity-wrappers.md) for full implementation and test file listings.

### Runtime test suites and pinned run

#### Description

The Vitest suites cover runtime modules, server dispatch, every tool family, CLI behavior, and package builds, with a separate runner for pinned ffmpeg binaries.

#### Current Reality

The tool suites use generated media and a local in-memory MCP client. test:pinned places verified platform binaries and runs Vitest with the pinned directory. Package scripts also cover bundle and plugin contents.

#### Source Files

See [Runtime test suites and pinned run](quality-gates/runtime-test-suites-and-pinned-run.md) for full implementation and test file listings.
