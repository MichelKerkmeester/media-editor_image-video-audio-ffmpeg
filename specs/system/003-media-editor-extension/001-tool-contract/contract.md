---
title: "Contract: Media Editor MCP tools"
description: "The one contract phases 2 to 8 build against: names, schemas, path policy, errors, ffmpeg lookup, results, process rules, defect fixes and attribution for all 39 Media Editor MCP tools."
trigger_phrases:
  - "media editor tool contract"
  - "media editor mcp schemas"
  - "media editor error codes"
  - "media editor path policy"
  - "ffmpeg resolution order"
importance_tier: "important"
contextType: "implementation"
---
# Contract: Media Editor MCP tools

**Version** 0.2, assembled 2026-09-28 from the section drafts in `scratch/sections/`. Status: approved by the operator on 2026-09-29, as built and with every dated amendment in the change log.

## How to use this contract

Phases `002-server-foundation` to `008-claude-code-plugin` implement against this document and test against it. Each section names the phase that builds it. When a later phase finds a name, a schema or a rule that does not work, it amends this file in place and adds a dated line to the change log at the end, stating what changed and why. It never forks a copy per phase, because two contracts would drift apart the way the two sources did. Sections 1 and 2 are canonical for names, section 5 for error codes, section 8.2 for capability gates and section 9 for source defects. Every other section points at them instead of repeating them.

## 1. Naming and parameter conventions

These rules fix the name and schema vocabulary for all 39 tools. Every phase from `002-server-foundation` to `008-claude-code-plugin` applies them. Section 3 restates them tool by tool, and no later section overrides them.

Citations use the inventory shorthands (`../context/source-inventory.md:4-6`): `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, and `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

The five structural conflicts inventory section E records (`../context/source-inventory.md:152-156`) are settled here, except the result and error shape, which section 5 owns.

### 1.1 Tool names

Every tool name is lowercase snake_case in the shape `<prefix>_<verb>[_<object>]`, for example `image_resize` and `video_trim`. The prefix is always one of four and is never dropped:

| Prefix | Count | What belongs under it | Where the tools come from |
|---|---|---|---|
| `image_` | 8 | A still image in and a still image out, processed by sharp | The 8 Imagician tools (`imagician/src/index.ts:31-194`) |
| `video_` | 20 | A video file in and a video file or its streaming outputs out, processed by ffmpeg | The 19 ported video-audio tools plus the new `video_hls_ladder` |
| `audio_` | 6 | An audio file in and an audio file out, processed by ffmpeg | The 6 ported audio tools |
| `media_` | 5 | Any media kind, or the server's own ffmpeg handling | `media_health` and `media_remove_silence`, both ported, plus the new `media_probe`, `media_repair` and `media_setup_ffmpeg` |

Every name under each prefix, so the assignment is checkable:

- `image_`: `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize`.
- `video_`: `video_trim`, `video_convert`, `video_convert_properties`, `video_set_resolution`, `video_set_codec`, `video_set_bitrate`, `video_set_frame_rate`, `video_set_speed`, `video_set_aspect_ratio`, `video_set_audio_codec`, `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels`, `video_add_subtitles`, `video_add_text_overlay`, `video_add_image_overlay`, `video_add_b_roll`, `video_add_fade`, `video_concat`, `video_hls_ladder`.
- `audio_`: `audio_extract`, `audio_convert`, `audio_convert_properties`, `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels`.
- `media_`: `media_health`, `media_probe`, `media_repair`, `media_remove_silence`, `media_setup_ffmpeg`.

Rules the assignment follows:

- The prefix names the file type the tool reads and writes, not the stream it edits. `video_set_audio_bitrate` changes the audio track of a video file and keeps `video_` (`vam/server.py:427-481`), while `audio_set_bitrate` changes an audio file (`vam/server.py:267-286`). This is the fix for the near-name collisions in inventory E.5 (`../context/source-inventory.md:156`).
- After the prefix comes the verb, then an object only where the verb alone is ambiguous. `video_set_resolution` needs its object, `video_trim` does not.
- One media kind per prefix settles the other collision family: `image_convert`, `audio_convert` and `video_convert` share the verb but never collide, and the composite tools keep `properties` in their names to mark the one-call, many-settings form (`../context/source-inventory.md:155`).
- The overlaps stay as separate tools, as the operator decided (ADR-004 in `plan.md`). `video_convert_properties` re-encodes with several settings in one call while the `video_set_*` tools change one setting and copy the rest. `video_set_aspect_ratio` pads or crops to a target ratio while `video_set_resolution` changes pixel dimensions. The same split holds for `audio_convert_properties` against `audio_convert` and the `audio_set_*` tools. Descriptions, not extra names, carry the difference.
- `image_probe` and `media_probe` both stay. `image_probe` reads image metadata through sharp and needs no ffmpeg. `media_probe` reads container and stream metadata through ffprobe for any media kind. `image_batch_resize` generates several image sizes and `video_hls_ladder` generates a streaming ladder, which keeps the two multi-size tools apart (`../context/source-inventory.md:155,198`).
- No source name survives. Section 2 maps all 35 source tools to these names, and the 4 new tools have rows of their own.
- One result shape for every tool. Failure comes back as a tool result with `isError: true` and a `{ code, message, details }` body, and a protocol error remains only for an unknown tool name or a schema-invalid call (section 5). The sources split two ways and neither survives: `imagician` throws `McpError` (`imagician/src/index.ts:451-459`), and `vam` returns error strings as results (`vam/server.py:36`).

### 1.2 Parameter names

- camelCase always: first word lowercase, later words capitalized, no underscores. The `vam` snake_case does not carry over (`vam/server.py:19`), and the `imagician` spellings are kept only where they already comply (`imagician/src/index.ts:34-35`).
- Every parameter is typed: a number with its unit stated, a boolean, an enum from a closed list, or a bitrate string with a suffix. No parameter is a free-form ffmpeg fragment, because raw caller strings reaching filter graphs are one of the source defects (`../context/source-inventory.md:241-248`).
- `format` is the standard name and replaces every source `target_format` (`imagician/src/index.ts:61`, `vam/server.py:77`).
- `codec` names a codec. Where one schema must distinguish two streams, the audio side takes `audioCodec`, the video side keeps `codec`, and there is no `videoCodec` name. This is the same split as `audioBitrate` and `videoBitrate`.
- A name states the real behavior. The source `preserveAspectRatio` toggles upscaling, not aspect-ratio handling (`imagician/src/index.ts:216`), so the port exposes `withoutEnlargement`.
- Colors are `#RRGGBB` strings, never named colors, because the sources accepted both and validated neither (`imagician/src/index.ts:129-133`, `vam/server.py:159`).

The standard names:

| Name | Type | Unit | Range and default | Notes |
|---|---|---|---|---|
| `inputPath` | string | path | an existing file under an allowed root | read only, resolved by real path (section 4) |
| `outputName` | string | text | 1 to 64 characters, no path separators | a description, never a path (1.4) |
| `startTime` | number or string | seconds | 0 up to the media duration | string forms in 1.3 |
| `endTime` | number or string | seconds | greater than `startTime`, end of input when past the last timestamp | string forms in 1.3 |
| `quality` | integer | sharp quality scale, higher is better | 1 to 100, default 80 | sharp image tools only |
| `crf` | integer | CRF scale, lower is better | 0 to 51, default 23 where a tool needs one | CRF-capable encoders only |
| `videoBitrate` | string | `k` is 1000 bit/s, `M` is 1000000 bit/s | `1k` to `100M`, suffix required, no default | for example `2500k` |
| `audioBitrate` | string | same as `videoBitrate` | `1k` to `100M`, no default | typical values `64k` to `320k` |
| `sampleRate` | integer | Hz | 8000 to 384000, no default | for example 44100 and 48000 |
| `channels` | integer | channel count | 1 to 8, no default | 1 is mono, 2 is stereo |
| `frameRate` | number | frames per second | greater than 0, at most 240, no default | for example 24 and 30 |
| `width` | integer | pixels | 1 to 32768 | at least one of `width` and `height` where a tool resizes |
| `height` | integer | pixels | 1 to 32768 | the omitted side keeps the aspect ratio (`skill/references/mcp-imagician.md:107`) |
| `format` | string enum | none | per tool, for example `jpeg`, `png`, `mp4` | a container or file format |
| `codec` | string enum | none | per tool, for example `libx264`, `aac` | checked against the resolved binary before the run (section 8) |

Parameters outside the list follow the same rules and state their unit in the name when it is not seconds: `aspectRatio` as a `"16:9"` string (`vam/server.py:174`), `minSilenceDurationMs` in milliseconds (`vam/server.py:1105`), `silenceThresholdDb` in dBFS (`vam/server.py:1104`).

### 1.3 Quality, bitrate and time values

Inventory E.3 records the trap: one shared `quality` parameter cannot serve several engines (`../context/source-inventory.md:154`). The contract keeps the scales apart by name, unit and direction:

- `quality` is the sharp scale only: an integer from 1 to 100, higher is better, default 80 (`imagician/src/index.ts:66-71`, `:101-106`). It appears only on the sharp image tools. The meaning per encoder is stated in each description, because the source passes the same 1 to 100 value into JPEG, PNG, WebP and AVIF encoders (`imagician/src/index.ts:242-252`, `:295-302`).
- `crf` is the ffmpeg constant rate factor scale: an integer from 0 to 51, lower is better, with 23 recommended (`skill/assets/hls-video-conversion.md:158`), which the recipe also calls visually transparent (`:121`). It appears only on tools that run a CRF-capable encoder, never on an image tool.
- `videoBitrate` and `audioBitrate` are ffmpeg bitrate strings, never plain numbers: a decimal number and a mandatory `k` or `M` suffix, for example `192k`, `320k`, `2M` (`vam/server.py:268-273`, `vam/tests/test_video_functions.py:202,264,291`). `k` is 1000 bits per second and `M` is 1000000. The accepted range is `1k` to `100M`. A value without a suffix fails validation instead of reaching ffmpeg.
- The ffmpeg `-q:v` scale (2 to 31) and the `-compression_level` scale (0 to 9) that the skill reference documents (`skill/references/mcp-imagician.md:117`) are not exposed anywhere, because image output goes through sharp and does not depend on ffmpeg encoders (`../context/source-inventory.md:221`).

Time values:

- The canonical form is a number of seconds, integer or decimal, 0 or more. Every `startTime` and `endTime` schema states "seconds", and this is the form used in examples and results.
- The accepted alternative is a string in `HH:MM:SS`, `HH:MM:SS.mmm`, `MM:SS` or plain numeric form. One shared parser normalizes it to seconds before any ffmpeg argument is built, mirroring `_parse_time_to_seconds` (`vam/server.py:1223-1235`). The source documented the same pair, "HH:MM:SS or seconds", for both trim parameters (`vam/server.py:49-50`). A string that does not parse fails validation, and unit suffixes such as `30s` or `1m` are never accepted.
- Ranges: `0 <= startTime < endTime`. An `endTime` past the last timestamp means end of input, the `-to` behavior the skill recipes use (`skill/references/mcp-video-audio.md:103`). A duration parameter must be greater than 0 and no longer than the media it applies to, the check the source makes for a fade (`vam/server.py:1595-1596`). `minSilenceDurationMs` must be a positive integer (`vam/server.py:1119-1120`).
- Nested time fields, such as a text overlay window or a B-roll insert point, follow the same rule as top-level parameters.
- Every schema description states the unit, and for `quality` and `crf` the direction, because the schemas in section 3 are the surface a caller reads.

### 1.4 Output naming

- A writing tool takes `outputName`, a short description of the result such as `"resized product images"`. It is never a path and never a filename. The source parameters `outputPath` and `outputDir`, which let a caller write anywhere (`imagician/src/index.ts:35,173`, `vam/server.py:19`), do not exist in the merged contract (`../context/source-inventory.md:240`).
- For each call the server creates `<output folder>/<NNN> - <description>/` and writes every output file inside it. `<output folder>` is the configured output root (section 4), `<NNN>` is the next free three-digit number in that folder and is never reused, and `<description>` is the slug of `outputName`: lowercase, spaces to single hyphens, every other character outside `a-z`, `0-9` and the hyphen dropped, an empty slug rejected (the full slug rule is section 4.3). The shape matches the Media Editor export convention (`AI Systems/Media Editor/AGENTS.md:40,46-53`).
- `outputName` never selects a file name or an extension, because one call can produce several files (`image_batch_resize` produces one per size, `video_hls_ladder` produces a master playlist, per-rung playlists and segments). Each tool's description states the file naming pattern inside the folder.
- Inputs cannot be overwritten. No tool accepts an output path, every output folder is new, and every ffmpeg run gets `-n` (sections 4 and 8).

### 1.5 Enum values

- Spelling: lowercase ASCII, single words or words joined by single underscores, one canonical spelling per value. Examples: `cover`, `fade_in`, `top_left`, `jpeg`. Never spaces, mixed case or hyphens.
- An enum lists only values the tool implements. A value the tool would accept and then ignore is removed rather than documented: the source listed `slide_*` B-roll transitions as valid (`vam/server.py:1363`) and its slide branch produces a plain overlay with no slide motion (`vam/server.py:1506-1512`, `../context/source-inventory.md:252`). `z.enum` is the only schema form for a closed set.
- Aliases the sources accepted stay accepted and normalize before use, while descriptions list canonical values only:
  - `jpg` becomes `jpeg` (`imagician/src/index.ts:63,189`).
  - `crossfade_from_black` becomes `fade_in` and `crossfade_to_black` becomes `fade_out` (`vam/server.py:1604-1610`).
  - The hyphen form of a multiword value, for example `top-left`, becomes the canonical `top_left` (`vam/server.py:1362`).
- An unknown value fails schema validation and the error names the canonical set (section 5). No caller string reaches ffmpeg as an enum candidate.

## 2. Unified tool table

The merged server exposes 39 tools: 8 from Imagician, 27 from video-audio, and 4 that are new. Every name carries one of the fixed prefixes (`image_`, `video_`, `audio_`, `media_`). Source renames follow section E of the source inventory (`AI Systems/Media Editor/specs/003-media-editor-extension/context/source-inventory.md`), with the single name change recorded in the note below.

Source paths use the inventory shorthands: `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, and `skill/` is `AI Systems/Media Editor/sk-media-editor/`. The registration column points at the line that declares the tool in its own source: the `name:` entry in the `imagician/src/index.ts` tools array, or the `@mcp.tool()` decorator in `vam/server.py`. The building phase column names the phase folder that implements the row.

| # | New name | Source (imagician, video-audio, new) | Source tool name | Source file:line of its registration | One-line purpose | Building phase |
|---|----------|--------------------------------------|------------------|--------------------------------------|------------------|----------------|
| 1 | `image_resize` | imagician | `resize_image` | `imagician/src/index.ts:29` | Resize one image to a target width and height, with a fit mode that handles the leftover space | `003-image-tools` |
| 2 | `image_convert` | imagician | `convert_format` | `imagician/src/index.ts:54` | Convert one image to jpeg, png, webp or avif at a quality from 1 (smallest) to 100 (best) | `003-image-tools` |
| 3 | `image_crop` | imagician | `crop_image` | `imagician/src/index.ts:78` | Extract one rectangular region from an image by its left, top, width and height | `003-image-tools` |
| 4 | `image_compress` | imagician | `compress_image` | `imagician/src/index.ts:94` | Re-encode one image smaller at a chosen quality and report the byte size before and after | `003-image-tools` |
| 5 | `image_rotate` | imagician | `rotate_image` | `imagician/src/index.ts:118` | Rotate one image by an arbitrary angle over a chosen background colour | `003-image-tools` |
| 6 | `image_flip` | imagician | `flip_image` | `imagician/src/index.ts:139` | Mirror one image horizontally, vertically or both | `003-image-tools` |
| 7 | `image_probe` | imagician | `get_image_info` | `imagician/src/index.ts:156` | Read image metadata with sharp: format, dimensions, channels, bit depth, colour space, density, alpha and file size | `003-image-tools` |
| 8 | `image_batch_resize` | imagician | `batch_resize` | `imagician/src/index.ts:167` | Resize one image into several named sizes in a single call, one output file per entry in the list | `003-image-tools` |
| 9 | `media_health` | video-audio | `health_check` | `vam/server.py:13` | Report server status and the versions of the resolved ffmpeg and ffprobe binaries, without reading any media file | `002-server-foundation` |
| 10 | `audio_extract` | video-audio | `extract_audio_from_video` | `vam/server.py:18` | Extract the audio track of a video into its own file with a chosen audio encoder | `004-video-audio-core` |
| 11 | `video_trim` | video-audio | `trim_video` | `vam/server.py:42` | Cut one video to the span between two times, trying a stream copy first and re-encoding only on failure (`vam/server.py:55-66`) | `004-video-audio-core` |
| 12 | `audio_convert_properties` | video-audio | `convert_audio_properties` | `vam/server.py:76` | Change an audio file's container and set its bitrate, sample rate and channels in one call | `004-video-audio-core` |
| 13 | `video_convert_properties` | video-audio | `convert_video_properties` | `vam/server.py:113` | Change a video's container and set its resolution, codecs, bitrates, frame rate and audio properties in one call | `004-video-audio-core` |
| 14 | `video_set_aspect_ratio` | video-audio | `change_aspect_ratio` | `vam/server.py:157` | Fit one video to a target aspect ratio, either by padding it with a colour or by cropping the overflow | `004-video-audio-core` |
| 15 | `audio_convert` | video-audio | `convert_audio_format` | `vam/server.py:246` | Change the container format of one audio file | `004-video-audio-core` |
| 16 | `audio_set_bitrate` | video-audio | `set_audio_bitrate` | `vam/server.py:267` | Re-encode one audio file at a target bitrate such as 192k | `004-video-audio-core` |
| 17 | `audio_set_sample_rate` | video-audio | `set_audio_sample_rate` | `vam/server.py:288` | Re-encode one audio file at a target sample rate in Hz | `004-video-audio-core` |
| 18 | `audio_set_channels` | video-audio | `set_audio_channels` | `vam/server.py:309` | Re-encode one audio file with a target channel count | `004-video-audio-core` |
| 19 | `video_convert` | video-audio | `convert_video_format` | `vam/server.py:350` | Change the container format of one video, copying both streams first and re-encoding on failure (`vam/server.py:360-362`) | `004-video-audio-core` |
| 20 | `video_set_resolution` | video-audio | `set_video_resolution` | `vam/server.py:364` | Scale the picture of one video to a target resolution | `004-video-audio-core` |
| 21 | `video_set_codec` | video-audio | `set_video_codec` | `vam/server.py:385` | Re-encode the video stream with a named encoder such as libx264 | `004-video-audio-core` |
| 22 | `video_set_bitrate` | video-audio | `set_video_bitrate` | `vam/server.py:399` | Re-encode the video stream at a target bitrate such as 2M | `004-video-audio-core` |
| 23 | `video_set_frame_rate` | video-audio | `set_video_frame_rate` | `vam/server.py:413` | Re-encode the video stream at a target frame rate in frames per second | `004-video-audio-core` |
| 24 | `video_set_audio_codec` | video-audio | `set_video_audio_track_codec` | `vam/server.py:427` | Re-encode the audio track inside a video with a named encoder such as aac | `004-video-audio-core` |
| 25 | `video_set_audio_bitrate` | video-audio | `set_video_audio_track_bitrate` | `vam/server.py:441` | Re-encode the audio track inside a video at a target bitrate such as 128k | `004-video-audio-core` |
| 26 | `video_set_audio_sample_rate` | video-audio | `set_video_audio_track_sample_rate` | `vam/server.py:455` | Re-encode the audio track inside a video at a target sample rate in Hz | `004-video-audio-core` |
| 27 | `video_set_audio_channels` | video-audio | `set_video_audio_track_channels` | `vam/server.py:469` | Re-encode the audio track inside a video with a target channel count | `004-video-audio-core` |
| 28 | `video_add_subtitles` | video-audio | `add_subtitles` | `vam/server.py:485` | Burn a SubRip (SRT) subtitle file into a video with optional ASS style settings (`vam/server.py:521-542`) | `005-video-composition` |
| 29 | `video_add_text_overlay` | video-audio | `add_text_overlay` | `vam/server.py:568` | Draw timed text elements over a video with position, size, colour and box options | `005-video-composition` |
| 30 | `video_add_image_overlay` | video-audio | `add_image_overlay` | `vam/server.py:665` | Place a scaled image over a video for a time span, with a position mode and an optional opacity | `005-video-composition` |
| 31 | `video_concat` | video-audio | `concatenate_videos` | `vam/server.py:775` | Join two or more videos, with an xfade transition only when exactly two clips and an effect are given (`vam/server.py:857-970`) | `005-video-composition` |
| 32 | `video_set_speed` | video-audio | `change_video_speed` | `vam/server.py:1035` | Speed one video up or down by a factor and adjust the audio tempo to match (`vam/server.py:1059-1089`) | `004-video-audio-core` |
| 33 | `media_remove_silence` | video-audio | `remove_silence` | `vam/server.py:1102` | Find silent stretches in an audio or video file and cut them out, keeping the loud parts | `005-video-composition` |
| 34 | `video_add_b_roll` | video-audio | `add_b_roll` | `vam/server.py:1348` | Overlay timed b-roll clips from a list onto a main video at set positions and times | `005-video-composition` |
| 35 | `video_add_fade` | video-audio | `add_basic_transitions` | `vam/server.py:1573` | Add a fade from black at the start or a fade to black at the end of one video | `005-video-composition` |
| 36 | `media_probe` | new | none | n/a (new tool) | Inspect any image, audio or video file with ffprobe and report streams, duration, dimensions, frame rate, sample rate and channel layout (`vam/server.py:1244-1262`) | `006-probe-repair-hls` |
| 37 | `media_repair` | new | none | n/a (new tool) | Diagnose a damaged or partly readable file with ffprobe, then rewrite it with a matching ffmpeg pass such as a remux or a re-encode (`skill/README.md:202-204`) | `006-probe-repair-hls` |
| 38 | `video_hls_ladder` | new | none | n/a (new tool) | Encode one video into the 1080p, 720p, 480p and 360p ladder with per-rung playlists and a master playlist (`skill/assets/hls-video-conversion.md:94-118`) | `006-probe-repair-hls` |
| 39 | `media_setup_ffmpeg` | new | none | n/a (new tool) | Find an ffmpeg and ffprobe pair, offer a download after explicit user consent, and report the resolved paths | `008-claude-code-plugin` |

**Count check.** The 8 Imagician rows come from the eight `name:` entries in the tools array at `imagician/src/index.ts:27-196`. The 27 video-audio rows come from the twenty-seven `@mcp.tool()` decorators in `vam/server.py`, the first at line 13 and the last at line 1573.

**Name note.** Row 9 uses `media_health` in place of the `media_health_check` proposed in inventory section E. The fixed decisions for this phase give the former `health_check` the name `media_health`, and phase 002 builds it under that name. Every other row keeps its section E name unchanged.

### Overlaps kept on purpose

The operator kept every source tool, so several tools overlap on purpose. Each description carries the distinction, so a model can route a request to one tool:

- `video_convert_properties` against the single-property `video_set_*` tools: the composite description says it converts the container and takes several properties in one pass, and each setter says it changes exactly one named property. A request with several changes lands on the composite, a one-property fix lands on the setter.
- `audio_convert_properties` against `audio_convert` and the `audio_set_*` tools: the same split on the audio side, with the composite taking a target format plus up to three properties in one call.
- `video_set_aspect_ratio` against `video_set_resolution`: the aspect ratio description states a ratio string such as `16:9` plus a pad or crop mode, and the resolution description states pixels, either as a width x height pair or as a bare height.
- `image_probe` against `media_probe`: `image_probe` is the image-only sharp path and its description names the image fields it returns (channels, bit depth, colour space, density, alpha, file size). `media_probe` is the ffprobe path for any media kind and its description names the stream fields it returns (codecs, duration, frame rate, sample rate, channel layout). Each description opens with the media kinds it accepts.
- `image_resize` against `image_batch_resize`: resize writes one output file for one size, and batch resize takes a list of sizes and writes one file per entry. The batch description states that it writes several sizes in one call.
- `image_batch_resize` against `video_hls_ladder`: both generate several sizes, but batch resize writes image files named by suffix while the HLS ladder writes video segments and playlists. Each description names its output shape.
- `video_add_fade` against `video_concat` with a transition: the fade runs from or to black inside one clip, and the concat transition blends two clips into each other. Each description states the clip count it works on.
- `media_remove_silence` against `video_trim`: remove silence finds its own cut points from a silence threshold, and trim takes caller-given start and end times. Each description states who chooses the boundaries.
- `media_health` against `media_probe`: health takes no path and reports the resolved binary versions, and probe takes a path and reads that file. The health description states that it runs without reading media.

Row counts per source: imagician 8, video-audio 27, new 4. Total: 39.

## 3. Tool schemas

One subsection per building phase: 3.1 for the image tools (`003-image-tools`), 3.2 for the conversion tools (`004-video-audio-core`), 3.3 for the composition tools and `media_health` (`005-video-composition` and `002-server-foundation`), and 3.4 for the four new tools (`006-probe-repair-hls` and `008-claude-code-plugin`). Every row is one zod field on the tool schema that the SDK 1.x `McpServer` registers (ADR-002 in `decision-record.md`). The subsections carry parameters, commands and outputs only: the codes each tool returns are listed in section 5, the encoders and filters each tool checks in section 8.2, and the source defects each schema closes in section 9.

### 3.1 Image tool schemas

These eight schemas are the zod contracts behind rows 1 to 8 of the unified table. Section 1.1 fixes the names, section 1.2 fixes the shared parameter names and ranges, section 1.3 fixes the meaning of `quality`, and the tables below add the tool-specific fields. A call that fails its schema is the SDK's `-32602` protocol error (section 5). A call that passes its schema and then fails a handler check returns a tool result with one code from the section 5 list.

Every table reads `parameter | type | required or default | range or enum | unit | notes`, in that order.

Six rules hold for the whole group before the tool tables:

- Each `inputPath` is resolved by the section 4.2 real-path check before sharp opens the file. Every writing tool writes into `<output folder>/NNN - <slug>/` as section 4.3 defines, one fresh folder per call, and never onto an input.
- No image tool runs ffmpeg or ffprobe on a successful path. sharp encodes jpeg, png, webp and avif itself, so image output never depends on an ffmpeg encoder (inventory section F.5, `../context/source-inventory.md:221`).
- A file sharp cannot decode fails with `UNSUPPORTED_FORMAT`, the section 5 code for an image tool given a video.
- Only real raster images reach sharp. The tool reads the first 16 bytes of every image input and accepts a JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), WebP (`RIFF`, four size bytes, `WEBP`), GIF (`GIF87a` or `GIF89a`), TIFF (`II*` then a zero byte, or `MM` then a zero byte and `*`) or AVIF (`ftyp` at byte 4 with an `avif` or `avis` brand) signature and nothing else. An SVG, a PDF, a PostScript file or any other content fails with `UNSUPPORTED_FORMAT` and `reason: "image-content"`, because the libvips build behind sharp can load those formats and a vector or document loader is a larger surface than an image tool needs.
- Every sharp read passes `limitInputPixels: 100000000` (100 Mpx), so an image that declares more pixels fails before it is decoded, with `UNSUPPORTED_FORMAT` and `reason: "image-pixel-limit"`. Sharp's own default is about 268 Mpx, and a decompression bomb inside a small file is bounded only by this limit.
- `quality` appears only on `image_convert` and `image_compress`. `image_batch_resize` keeps the source's fixed 80, the four transform tools (`image_resize`, `image_crop`, `image_rotate`, `image_flip`) re-encode at sharp defaults, and `image_probe` writes nothing.

The output lines below use `<basename>` for the input's base name without its extension (`imagician/src/index.ts:398`) and `<ext>` for the format written, where `jpeg` writes `.jpg`.

#### `image_resize`

Source: `resize_image` (`imagician/src/index.ts:29`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `width` | integer | optional | 1 to 32768 | pixels | at least one of `width` and `height` is required, enforced by the handler as `INVALID_INPUT` with `reason: "dimension-required"`, because the tool registry takes a field shape and cannot carry an object-level check |
| `height` | integer | optional | 1 to 32768 | pixels | the omitted side keeps the aspect ratio (`skill/references/mcp-imagician.md:107`) |
| `fit` | enum | default `cover` | `cover`, `contain`, `fill`, `inside`, `outside` | none | the source's list, passed to sharp unchanged (`imagician/src/index.ts:40`) |
| `withoutEnlargement` | boolean | default true | true or false | none | replaces the source `preserveAspectRatio`, which toggled upscaling and nothing else (`imagician/src/index.ts:47,216`) |

**Behavior**: `sharp(inputPath).resize({ width, height, fit, withoutEnlargement })`, then `.toFile(target)` (`imagician/src/index.ts:209-217`, `:220`). The source cast `fit as any` (`:215`), allowed a call with neither dimension that wrote an unchanged copy (`:211`), and created whatever directory the caller's `outputPath` implied (`:207`). The schema validates the enum, requires one dimension and drops the caller-chosen output path.

**Output**: one file, `<basename>-resized.<ext>`.

#### `image_convert`

Source: `convert_format` (`imagician/src/index.ts:54`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `format` | enum | required | `jpeg`, `png`, `webp`, `avif`, plus the alias `jpg` that normalizes to `jpeg` | none | the source enum (`imagician/src/index.ts:63`), descriptions list the canonical four only (section 1.5) |
| `quality` | integer | default 80 | 1 to 100 | sharp quality scale, higher is better | the lossy encoders read it as visual quality, png reads it as the palette colour target (`imagician/src/index.ts:242-252`) |

**Behavior**: one encoder call per format, `.jpeg({ quality, progressive: true })`, `.png({ quality })`, `.webp({ quality })` or `.avif({ quality })`, then `.toFile` (`imagician/src/index.ts:242-252`, `:255`). sharp carries webp and avif itself, so no ffmpeg encoder check applies (inventory section F.5).

**Output**: one file, `<basename>-converted.<ext>`, where the extension follows the target format.

#### `image_crop`

Source: `crop_image` (`imagician/src/index.ts:78`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `left` | integer | required | 0 to 32767 | pixels | distance from the left edge, `left + width` must fit the image |
| `top` | integer | required | 0 to 32767 | pixels | distance from the top edge, `top + height` must fit the image |
| `width` | integer | required | 1 to 32768 | pixels | required in the source too (`imagician/src/index.ts:90`) |
| `height` | integer | required | 1 to 32768 | pixels | required in the source too (`imagician/src/index.ts:90`) |

**Behavior**: the handler reads `sharp(inputPath).metadata()` and checks the region against the real image width and height, then runs `sharp(inputPath).extract({ left, top, width, height }).toFile(target)` (`imagician/src/index.ts:272-274`). The source had no bounds check, so an oversized region surfaced from sharp as a generic `Image processing error` (`imagician/src/index.ts:451-459`, inventory section G.12). A region that does not fit now returns `INVALID_INPUT` with `parameter`, `value` and `reason`, the worked example in section 5.

**Output**: one file, `<basename>-cropped.<ext>`.

#### `image_compress`

Source: `compress_image` (`imagician/src/index.ts:94`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `quality` | integer | default 80 | 1 to 100 | sharp quality scale, higher is better | applied with the encoder of the input's own format (`imagician/src/index.ts:295-303`) |
| `progressive` | boolean | default true | true or false | none | JPEG only, the source default (`imagician/src/index.ts:111`) |

**Behavior**: reads `sharp(inputPath).metadata()` (`imagician/src/index.ts:291`), re-encodes with the branch for the detected format (`.jpeg({ quality, progressive })`, `.png({ quality })`, `.webp({ quality })`, `.avif({ quality })`, `:295-303`), writes the file (`:305`), and compares the two byte counts with `fs.stat` (`:307-315`). Only those four input formats are accepted. The source applied no encoder to anything else and still printed a `Size reduction` figure, so the new contract fails earlier with `UNSUPPORTED_FORMAT`, whose `accepted` field names the four. The byte delta is reported as the two byte counts in the structured result of section 7, so a file that grew shows as growth instead of the source's negative percentage (`imagician/src/index.ts:309,315`).

**Output**: one file, `<basename>-compressed.<ext>`. The extension stays that of the input format.

#### `image_rotate`

Source: `rotate_image` (`imagician/src/index.ts:118`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `angle` | number | required | -360 to 360 | degrees, positive clockwise | any angle, not quarter turns only (`imagician/src/index.ts:127`) |
| `background` | string | default `#000000` | `#RRGGBB`, the hex pattern only, either case | none | fills the exposed corners, named colours are rejected (`imagician/src/index.ts:129-133`) |

**Behavior**: `sharp(inputPath).rotate(angle, { background }).toFile(target)` (`imagician/src/index.ts:326-328`). The source accepted any string, named colours included, and passed it to sharp unvalidated (`imagician/src/index.ts:129-133`). The schema accepts the six-digit hex form only, the colour rule of section 1.2.

**Output**: one file, `<basename>-rotated.<ext>`.

#### `image_flip`

Source: `flip_image` (`imagician/src/index.ts:139`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `direction` | enum | required | `horizontal`, `vertical`, `both` | none | the source enum and its required flag (`imagician/src/index.ts:148,152`) |

**Behavior**: `.flop()` when the direction is `horizontal` or `both`, `.flip()` when it is `vertical` or `both`, then `.toFile` (`imagician/src/index.ts:347-354`). An unlisted value applied neither flip and wrote a copy, because the source had no runtime validation. The required enum turns that call into a `-32602` schema failure (section 5).

**Output**: one file, `<basename>-flipped.<ext>`.

#### `image_probe`

Source: `get_image_info` (`imagician/src/index.ts:156`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, no write anywhere (section 4.3) |

**Behavior**: `sharp(inputPath).metadata()` plus `fs.stat` (`imagician/src/index.ts:369-370`), returned as the fields the source dumped (`:376-387`): `format`, `width` (pixels), `height` (pixels), `channels`, `bitDepth`, `colorSpace`, `density` (pixels per inch when the file carries it), `hasAlpha` and `fileSize` (bytes). `lastModified` is dropped, because the source leaked the local file mtime (inventory section G.12), and fields the file does not carry are omitted. This is the image-only sharp path, and `media_probe` stays the ffprobe path for any media kind (section 2).

**Output**: none. A read-only tool creates no output folder (section 4.3). The fields arrive as structured content with the section 7 result shape.

#### `image_batch_resize`

Source: `batch_resize` (`imagician/src/index.ts:167`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `sizes` | array of objects | required | 1 to 20 entries | count | one output file per entry (`imagician/src/index.ts:401-432`) |
| `sizes[].width` | integer | required | 1 to 32768 | pixels | required in the source too (`imagician/src/index.ts:183`) |
| `sizes[].height` | integer | optional | 1 to 32768 | pixels | the omitted side keeps the aspect ratio |
| `sizes[].suffix` | string | required | 1 to 16 characters, `^[a-z0-9]([a-z0-9_-]{0,14}[a-z0-9])?$` | text | becomes part of the file name, no two entries may share one |
| `format` | enum | optional, default: the input's own format | `jpeg`, `png`, `webp`, `avif`, plus the alias `jpg` that normalizes to `jpeg` | none | the source enum (`imagician/src/index.ts:189`) |

**Behavior**: for each entry, `sharp(inputPath).resize({ width, height, fit: 'cover', withoutEnlargement: true })` (`imagician/src/index.ts:405-411`), then the format encoder when `format` is given (`.jpeg({ quality: 80, progressive: true })`, `.png()`, `.webp({ quality: 80 })`, `.avif({ quality: 80 })`, `:413-428`), then `.toFile` (`:431`). Quality is fixed at 80 for the lossy encoders, the value the source hardcoded (`:417,423,426`), and no `quality` parameter is exposed, as the source schema carries none. The source pasted the caller's suffix into the file name unvalidated (`:402-403`), so a suffix could introduce a path separator or collide with another entry. The schema restricts the alphabet, forbids dots and separators, forces lowercase, and rejects duplicate suffixes so no entry can overwrite another.

**Output**: one file per entry, `<basename>-<suffix>.<ext>`, all inside the single numbered folder of the call.

#### Error codes, gates and defects

The codes these eight tools return are listed in section 5 (codes by tool group). They need no capability gate (section 8.2). The image-side defects these schemas close are listed in section 9.

### 3.2 Video and audio conversion tool schemas

This subsection fixes the 19 tools built in `004-video-audio-core`: section 2 rows 10 to 27 and row 32. Section 1 rules hold without restatement: lowercase snake_case names, camelCase parameters, `inputPath` and `outputName` as the only path-shaped fields, seconds for a plain time parameter, `#RRGGBB` colours, the bitrate strings `videoBitrate` and `audioBitrate`, and enum values spelled in lowercase with single underscores. Every table reads `parameter | type | required or default | range or enum | unit | notes`, and every code block is the argv array for `spawn(bin, args, { shell: false })`, one element per token (ADR-003). `-n` appears on every command, and every run is bounded by the section 8 process policy: 1800 seconds by default (`MEDIA_EDITOR_TIMEOUT_SECONDS`), the last 64 KB of stderr kept in process and 4 KB of it returned in a result (8.4), and the private temp folder removed in `finally`.

Source shorthands: `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/` and `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

Five rules hold for the whole subsection.

1. **Each tool writes into one fresh numbered folder.** Every output goes to `<output folder>/NNN - <slug>/` (sections 1.4 and 4.3), never onto an input, and no parameter can name an output file or directory. The source sent every output to a caller-chosen path and never compared it with the input, so an output equal to its input destroyed the source file (inventory G.3 at `../context/source-inventory.md:240`, the source's output parameters at `vam/server.py:19`).
2. **Every raw source value becomes an enum, a range or a parsed pattern.** The source passed caller strings straight into `-f`, `-c:v`, `-c:a`, `-b:v`, `-b:a` and `-vf scale=` (`vam/server.py:100,144,278,360,376-378`), and its numeric parameters had no bounds either (`vam/server.py:299`, `:320`, `:423`). Inventory G.4 records the string half (`../context/source-inventory.md:241-248`). Codecs, formats and containers are closed enums in the tables below, and every number states its range. `resolution` and `aspectRatio` are regular expressions the server parses and then rebuilds as `scale=<W>:<H>`, `scale=-2:<H>`, `crop=...` or `pad=...`, so no caller byte reaches a filter graph.
3. **ffmpeg-python keyword aliases become real flags.** `vcodec`, `acodec`, `video_bitrate`, `audio_bitrate`, `vf`, `ar`, `ac`, `r`, `format`, `ss` and `to` are library options, not ffmpeg flags, and the translation table is not in either source (inventory F.7 at `../context/source-inventory.md:227`). The argv blocks below carry `-c:v`, `-c:a`, `-b:v`, `-b:a`, `-vf`, `-ar`, `-ac`, `-r`, `-f`, `-ss` and `-to`. The two input options come before `-i` (`../context/source-inventory.md:228`).
4. **Every run is checked before it starts.** Each tool probes its input and requires a stream: the video tools need a video stream, the audio tools need an audio stream, the four tools that edit a video's audio track (3.2.16 to 3.2.19) need both, and a mismatch returns `UNSUPPORTED_FORMAT` with `detected` and `accepted` (section 5). The source ran ffmpeg first and returned the failure as a string (`vam/server.py:34-36`). Encoders and filters are then gated against the resolved binary (section 8.2), so a missing `libx264` is `CAPABILITY_MISSING` before the command starts, never a half-written file.
5. **Two-attempt tools write each attempt to its own temp path.** Nine tools route through the source's shared helper `_run_ffmpeg_with_fallback` (`vam/server.py:332-348`, used at `:362, :383, :397, :411, :425, :439, :453, :467, :481`): a primary call, then a fallback call after the first failure. `video_trim` and `video_set_aspect_ratio` build the same shape inline (`vam/server.py:60-70`, `:221-233`). The port keeps the shape and fixes the collision the source had: both attempts went to the same path with no `-n`, so a partial file from attempt 1 could break attempt 2 and ffmpeg could prompt on stdin (inventory G.5 at `../context/source-inventory.md:249`). Here each attempt writes its own file inside the run's private temp folder, `-n` guards both, and only the surviving file moves into the output folder. When both fail, the result is one `PROCESS_FAILED` whose `stderrTail` is the two tails joined and capped at 4 KB (section 8.4). The other eight tools run one command. An attempt whose MP4, M4A or M4V file holds a PCM audio or an FFV1 video stream counts as failed on every build, because ffmpeg 9 stores both by stream copy where 6.1 and 7.0 refuse, and few players read them in MP4. The server reads the codec of every stream of that file with ffprobe, and the next attempt re-encodes.

#### 3.2.1 Container tables

Every container-shaped value in this subsection comes from one of these two tables, so the schema, the `-f` argument and the file extension cannot drift apart.

**Video containers** (`video_convert`, `video_convert_properties`, and the default pair of every re-encode in this subsection):

| `format` | `-f` argument | Extension | Default video encoder | Default audio encoder |
|---------|---------------|-----------|-----------------------|-----------------------|
| `mp4` | `mp4` | `.mp4` | `libx264` | `aac` |
| `mov` | `mov` | `.mov` | `libx264` | `aac` |
| `mkv` | `matroska` | `.mkv` | `libx264` | `aac` |
| `webm` | `webm` | `.webm` | `libvpx-vp9` | `libopus` |
| `avi` | `avi` | `.avi` | `mpeg4` | `libmp3lame` |

The pairs follow the skill's format and codec tables (`skill/references/mcp-video-audio.md:196-209`, `:216-226`). The source passed the caller's container string to `-f` and let ffmpeg choose every unset encoder (`vam/server.py:360-361`, `:144`), so the same call could produce a different codec per machine. The contract names the pair, and section 8.2 gates it.

**Audio containers** (the six `audio_*` tools of this subsection and the audio settings of the composite tools):

| `format` | `-f` argument | Extension | Default encoder |
|---------|---------------|-----------|-----------------|
| `mp3` | `mp3` | `.mp3` | `libmp3lame` |
| `wav` | `wav` | `.wav` | `pcm_s16le` |
| `m4a` | `mp4` | `.m4a` | `aac` |
| `flac` | `flac` | `.flac` | `flac` |
| `ogg` | `ogg` | `.ogg` | `libvorbis` |

`aac` is accepted as an alias of `m4a` and normalizes before use, because the source's docstring offered it as a target (`vam/server.py:84`) and the skill writes AAC into `.m4a` (`skill/references/mcp-video-audio.md:156`). The five containers are the audio formats the skill lists (`skill/references/mcp-video-audio.md:202-209`). A tool that keeps the input's container reads it from ffprobe and maps it to this table. Anything outside the five is `UNSUPPORTED_FORMAT` with `accepted` naming them and `reason: "container"`.

#### 3.2.2 `audio_extract`

Source: `extract_audio_from_video` (`vam/server.py:18-40`, inventory section B row 2 at `../context/source-inventory.md:42`). Writes the audio track of one video into a file of its own.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video or audio file, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name (sections 1.4 and 4.3) |
| `audioCodec` | string enum | default `libmp3lame` | `libmp3lame`, `aac`, `libvorbis`, `flac`, `pcm_s16le`, plus the aliases `mp3` and `wav` | none | replaces the source's free string with its default `mp3` (`vam/server.py:19`). `mp3` normalizes to `libmp3lame` and `wav` to `pcm_s16le` (section 1.5). The container follows the codec: `libmp3lame` writes `.mp3`, `aac` writes `.m4a`, `libvorbis` writes `.ogg`, `flac` writes `.flac`, `pcm_s16le` writes `.wav`. The source listed `mp3`, `aac` and `wav` (`vam/server.py:25`), the other two encoders come from the skill's audio list (`skill/references/mcp-video-audio.md:204-207`) |

Args:

```text
-n -i <input> -vn -c:a <audioCodec> <temp>/extracted.<ext>
```

- `-vn` drops the video stream, the skill's own audio recipe (`skill/references/mcp-video-audio.md:154-158`). The source passed only `acodec` and depended on ffmpeg's default stream selection for the caller's container (`vam/server.py:30-32`).
- The input needs an audio stream. A file with none returns `UNSUPPORTED_FORMAT` with `detected` and `accepted` (section 5) before any command starts.

Output: one file, `<basename>-audio.<ext>`. Gates: section 8.2.

#### 3.2.3 `video_trim`

Source: `trim_video` (`vam/server.py:42-74`, inventory section B row 3 at `../context/source-inventory.md:43`). Cuts one video to the span between two times, trying a stream copy first and re-encoding only on failure (`vam/server.py:55-66`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `startTime` | number or string | required | 0 or more, less than `endTime` | seconds | string forms `HH:MM:SS`, `HH:MM:SS.mmm`, `MM:SS` or plain numeric (section 1.3) |
| `endTime` | number or string | required | greater than `startTime`, a value past the last timestamp means end of input | seconds | the source documented `HH:MM:SS or seconds` for both (`vam/server.py:49-50`) and passed the strings into `ss=` and `to=` (`:55`). The handler parses both times and returns `INVALID_INPUT` with `reason: "end-not-after-start"` unless `startTime < endTime`. The registry validates a field shape, so this cross-field rule cannot be a schema `.refine()` |

Args, attempt 1:

```text
-n -ss <start> -to <end> -i <input> -c copy <temp>/trimmed.mp4
```

Args, attempt 2:

```text
-n -ss <start> -to <end> -i <input> -c:v libx264 -c:a aac <temp>/trimmed.mp4
```

- `<start>` and `<end>` are parsed numbers in seconds, so no caller time string reaches the command (section 1.3).
- `-ss` and `-to` are input options and precede `-i`, the source's own ordering (`../context/source-inventory.md:228`).
- A copy cut lands on the nearest keyframe and a re-encode cut is frame accurate, the trade the skill states (`skill/references/mcp-video-audio.md:103,106`).
- The fallback carried no codec in the source and left the choice to ffmpeg (`vam/server.py:64-66`). The contract names `libx264` and `aac` for the MP4 it writes, so the gate has names to check.

Output: one file, `<basename>-trimmed.mp4`. Gates: section 8.2.

#### 3.2.4 `audio_convert_properties`

Source: `convert_audio_properties` (`vam/server.py:76-111`, inventory section B row 4 at `../context/source-inventory.md:44`). Change an audio file's container and set its bitrate, sample rate and channels in one call, the audio composite of section 2 row 12.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing audio file under an allowed root | path | probed first, an audio stream is required (section 5). The source checked nothing and returned the ffmpeg failure as a string (`vam/server.py:105-111`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `format` | string enum | required | `mp3`, `wav`, `m4a`, `flac`, `ogg`, plus the alias `aac` | none | replaces `target_format` (`vam/server.py:77`). The audio table of 3.2.1 fixes `-f` and the extension |
| `audioBitrate` | string | optional | `1k` to `100M`, suffix required, for example `192k` | `k` is 1000 bit/s, `M` is 1000000 bit/s | the source's own examples (`vam/server.py:85`), and its test passes `192k` (`vam/tests/test_video_functions.py:155`). A lossless container ignores the value, as it did in the source |
| `sampleRate` | integer | optional | 8000 to 384000 | Hz | source examples 44100 and 48000 (`vam/server.py:86`) |
| `channels` | integer | optional | 1 to 8 | channel count | 1 is mono, 2 is stereo (`vam/server.py:87`) |

Args:

```text
-n -i <input> -vn -c:a <format default encoder> [-b:a <audioBitrate>] [-ar <sampleRate>] [-ac <channels>] -f <muxer> <temp>/converted.<ext>
```

- Each optional group appears only when its parameter is given, the source's conditional kwargs (`vam/server.py:94-100`).
- The source passed no codec and left the encoder to the container (`vam/server.py:100-102`). The contract writes the table's encoder so the gate has a name to check.

Output: one file, `<basename>-converted.<ext>`, the extension of `format`. Gates: section 8.2.

#### 3.2.5 `video_convert_properties`

Source: `convert_video_properties` (`vam/server.py:113-155`, inventory section B row 5 at `../context/source-inventory.md:45`). Change a video's container and set its resolution, codecs, bitrates, frame rate and audio properties in one call. It re-encodes every stream it is not told to keep, which is the line between it and the `video_set_*` setters (section 2, ADR-004 in `plan.md`). The source docstring said `Args listed in PRD` (`vam/server.py:119`), so this schema is written fresh (inventory G.13 at `../context/source-inventory.md:257`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `format` | string enum | required | `mp4`, `mov`, `mkv`, `webm`, `avi` | none | replaces `target_format` (`vam/server.py:114`). The video table of 3.2.1 fixes `-f`, the extension and the default pair |
| `resolution` | string pattern | optional | `^\d{1,5}x\d{1,5}$` (width x height) or `^\d{1,5}$` (height only), each side 1 to 32768, plus the alias `preserve` meaning no scaling | pixels | the source pasted the caller's string into `scale=` (`vam/server.py:128-132`, inventory G.4). A width form becomes `scale=<width>:<height>` and a bare height becomes `scale=-2:<height>` (`:130-132`), the forms the skill documents (`skill/references/mcp-video-audio.md:128-129`). `preserve` is the source's skip value (`vam/server.py:128`) and normalizes to absent |
| `codec` | string enum | optional, default the `format` video encoder | `libx264`, `libx265`, `libvpx-vp9`, plus the alias `vp9` | none | the source's `video_codec` examples and their spellings (`vam/server.py:115`, `:391`) |
| `videoBitrate` | string | optional | `1k` to `100M`, suffix required, for example `1M` | `k` is 1000 bit/s, `M` is 1000000 bit/s | the source's test passes `1M` (`vam/tests/test_video_functions.py:166`) |
| `frameRate` | number | optional | greater than 0, at most 240 | frames per second | the source's test passes 30 (`vam/tests/test_video_functions.py:166`) |
| `audioCodec` | string enum | optional, default the `format` audio encoder | `aac`, `libmp3lame`, `libopus` | none | the source's test passes `aac` (`vam/tests/test_video_functions.py:166`) |
| `audioBitrate` | string | optional | `1k` to `100M`, suffix required | `k` and `M` as above | the source's test passes `128k` (`vam/tests/test_video_functions.py:166`) |
| `sampleRate` | integer | optional | 8000 to 384000 | Hz | the source's test passes 44100 (`vam/tests/test_video_functions.py:166`) |
| `channels` | integer | optional | 1 to 8 | channel count | the source's test passes 2 (`vam/tests/test_video_functions.py:166`) |

Args:

```text
-n -i <input> [-vf scale=<W>:<H> or scale=-2:<H>] [-c:v <codec>] [-b:v <videoBitrate>] [-r <frameRate>] [-c:a <audioCodec>] [-b:a <audioBitrate>] [-ar <sampleRate>] [-ac <channels>] -f <muxer> <temp>/converted.<ext>
```

- Every group appears only when its parameter is present, the source's conditional kwargs (`vam/server.py:128-144`).
- An unset `codec` or `audioCodec` falls to the container's default pair from 3.2.1, so the re-encode stays deterministic and gateable. The source let ffmpeg choose the pair (`vam/server.py:144`).

Output: one file, `<basename>-converted.<ext>`, the extension of `format`. Gates: section 8.2.

#### 3.2.6 `video_set_aspect_ratio`

Source: `change_aspect_ratio` (`vam/server.py:157-244`, inventory section B row 6 at `../context/source-inventory.md:46`). Fit one video to a target aspect ratio, by padding it with a colour or by cropping the overflow. The server probes the dimensions (`vam/server.py:166-172`) and computes the frame from the ratio and the source's larger side (`:193-200`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `aspectRatio` | string pattern | required | `^\d{1,3}:\d{1,3}$`, both sides positive and at most 999 | none | replaces `target_aspect_ratio` (`vam/server.py:158`), which the source split on `:` and divided without validation (`:174-175`). Only a named ratio reached the filters, so no free expression reaches `scale=`, `pad=` or `crop=` |
| `resizeMode` | string enum | default `pad` | `pad`, `crop` | none | the source's default and its only two modes (`vam/server.py:159`, `:218-219`) |
| `paddingColor` | string | default `#000000` | `#RRGGBB`, either case | none | replaces `padding_color` (`vam/server.py:159`), which accepted any string, default `black`, and reached the pad filter raw (`:196`, inventory G.4). Named colours do not carry over (section 1.2) |

Args, attempt 1, pad mode:

```text
-n -i <input> -vf scale=<W>:<H>:force_original_aspect_ratio=decrease,pad=<W>:<H>:(ow-iw)/2:(oh-ih)/2:<paddingColor> -c:v libx264 -c:a copy <temp>/aspect.mp4
```

Args, attempt 1, crop mode:

```text
-n -i <input> -vf crop=<cropW>:<cropH>:<x>:<y> -c:v libx264 -c:a copy <temp>/aspect.mp4
```

Args, attempt 2: the same `-vf` value, with `-c:a aac` in place of `-c:a copy`. The source left the encoder to the container there (`vam/server.py:228`), and the contract names `aac` for the gate (section 8.2 rule 3).

Args when the ratio already matches, the source's two-step shortcut (`vam/server.py:184-191`):

```text
-n -i <input> -c copy <temp>/aspect.mp4
```

and when that copy fails:

```text
-n -i <input> -c:v libx264 -c:a aac <temp>/aspect.mp4
```

- The pad filter is the source's own string with the colour validated: `scale=<W>:<H>:force_original_aspect_ratio=decrease,pad=<W>:<H>:(ow-iw)/2:(oh-ih)/2:<colour>` (`vam/server.py:196`, `:200`). `<W>` and `<H>` are computed integers: when the source is wider than the ratio, `W = trunc(height x ratio)` and `H = height`, otherwise `W = width` and `H = trunc(width / ratio)` (`:193-200`). `trunc` drops the fraction, the source's `int()` (`vam/server.py:194`, `:199`), so the sizes match the oracle tests.
- The crop filter is the source's geometry with computed integers: when the source is wider, `cropW = trunc(height x ratio)`, `cropH = height`, `x = (iw - cropW)/2`, `y = 0`, otherwise `cropW = width`, `cropH = trunc(width / ratio)`, `x = 0` (the source uses `int()` here too, `vam/server.py:213`, `:216`), `y = (ih - cropH)/2` (`vam/server.py:212-217`).
- Every computed size (`W`, `H`, `cropW`, `cropH`) is then floored to an even number of at least 2. libx264 with 4:2:0 chroma refuses an odd width or height, so a plain `trunc` failed both attempts on common inputs, for example 320x240 to `21:9` (a height of 137). With the oracle's ratios on even-sized inputs the sizes equal the `trunc` values.
- The video is re-encoded on every path that resizes, because a scale or crop cannot be stream-copied. The source initialized `codec_to_use = None` (`vam/server.py:181`), set it to `'copy'` (`:201`), never read it, and re-encoded anyway (inventory G.9 at `../context/source-inventory.md:253`). The contract states the re-encode instead of carrying the dead variable.
- The ratio equality test keeps the source's threshold, `abs(originalRatio - targetRatio) < 1e-4` (`vam/server.py:184`, `:204`).

Output: one file, `<basename>-aspect.mp4`. Gates: section 8.2.

#### 3.2.7 `audio_convert`

Source: `convert_audio_format` (`vam/server.py:246-265`, inventory section B row 7 at `../context/source-inventory.md:47`). Change the container of one audio file and nothing else, the single-property sibling of `audio_convert_properties`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing audio file under an allowed root | path | probed first, an audio stream is required (section 5) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `format` | string enum | required | `mp3`, `wav`, `m4a`, `flac`, `ogg`, plus the alias `aac` | none | replaces `target_format` (`vam/server.py:247`). The audio table of 3.2.1 fixes `-f` and the extension |

Args:

```text
-n -i <input> -vn -c:a <format default encoder> -f <muxer> <temp>/converted.<ext>
```

- The source passed `format` alone and left the encoder to the container (`vam/server.py:257`). The table's encoder is written explicitly so the gate has a name to check.

Output: one file, `<basename>-converted.<ext>`. Gates: section 8.2.

#### 3.2.8 `audio_set_bitrate`

Source: `set_audio_bitrate` (`vam/server.py:267-286`, inventory section B row 8 at `../context/source-inventory.md:48`). Re-encode one audio file at a target bitrate such as `192k`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing audio file under an allowed root | path | probed first, an audio stream is required (section 5) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `audioBitrate` | string | required | `1k` to `100M`, suffix required, for example `192k` and `320k` | `k` is 1000 bit/s, `M` is 1000000 bit/s | the source's examples (`vam/server.py:273`), and its test passes `320k` (`vam/tests/test_video_functions.py:202`) |

Args:

```text
-n -i <input> -vn -c:a <input container default encoder> -b:a <audioBitrate> <temp>/bitrate.<ext>
```

- The input's container comes from ffprobe and must be one of the five in 3.2.1. The encoder is that container's default. The source passed only `audio_bitrate` (`vam/server.py:278`) and let the caller's extension choose the encoder.
- A lossless container (`wav`, `flac`) ignores the bitrate value, the same outcome the source produced.

Output: one file, `<basename>-bitrate.<ext>`, with the input container's extension. Gates: section 8.2.

#### 3.2.9 `audio_set_sample_rate`

Source: `set_audio_sample_rate` (`vam/server.py:288-307`, inventory section B row 9 at `../context/source-inventory.md:49`). Re-encode one audio file at a target sample rate in Hz.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing audio file under an allowed root | path | probed first, an audio stream is required (section 5) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `sampleRate` | integer | required | 8000 to 384000, for example 44100 and 48000 | Hz | the source's examples (`vam/server.py:294`), and its test passes 48000 (`vam/tests/test_video_functions.py:215`) |

Args:

```text
-n -i <input> -vn -c:a <input container default encoder> -ar <sampleRate> <temp>/sample-rate.<ext>
```

- The source passed only `ar` (`vam/server.py:299`) and left the encoder to the container. The table's encoder is written explicitly.
- Output: one file, `<basename>-sample-rate.<ext>`. Gates: section 8.2.

#### 3.2.10 `audio_set_channels`

Source: `set_audio_channels` (`vam/server.py:309-329`, inventory section B row 10 at `../context/source-inventory.md:50`). Re-encode one audio file with a target channel count.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing audio file under an allowed root | path | probed first, an audio stream is required (section 5) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `channels` | integer | required | 1 to 8 | channel count | 1 is mono, 2 is stereo (`vam/server.py:315`), and the source's test passes 1 (`vam/tests/test_video_functions.py:228`) |

Args:

```text
-n -i <input> -vn -c:a <input container default encoder> -ac <channels> <temp>/channels.<ext>
```

- The source passed only `ac` (`vam/server.py:320`) and left the encoder to the container. The table's encoder is written explicitly.
- Output: one file, `<basename>-channels.<ext>`. Gates: section 8.2.

#### 3.2.11 `video_convert`

Source: `convert_video_format` (`vam/server.py:350-362`, inventory section B row 11 at `../context/source-inventory.md:51`). Change the container of one video, copying both streams first and re-encoding when the new container rejects the copy (`vam/server.py:360-362`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `format` | string enum | required | `mp4`, `mov`, `mkv`, `webm`, `avi` | none | replaces `target_format` (`vam/server.py:351`). The video table of 3.2.1 fixes `-f`, the extension and the default pair |

Args, attempt 1:

```text
-n -i <input> -c:v copy -c:a copy -f <muxer> <temp>/converted.<ext>
```

Args, attempt 2:

```text
-n -i <input> -c:v <format default video encoder> -c:a <format default audio encoder> -f <muxer> <temp>/converted.<ext>
```

- The source's primary and fallback kwargs (`vam/server.py:360-361`) went through `_run_ffmpeg_with_fallback` (`:332-348`). The fallback carried no codec and left the pair to ffmpeg. The contract names the pair, so attempt 2 is deterministic and gateable.
- The copy can only land in a container that accepts the input codecs. When it cannot, ffmpeg fails and attempt 2 defines the result.

Output: one file, `<basename>-converted.<ext>`. Gates: section 8.2.

#### 3.2.12 `video_set_resolution`

Source: `set_video_resolution` (`vam/server.py:364-383`, inventory section B row 12 at `../context/source-inventory.md:52`). Scale the picture of one video to a target resolution.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `resolution` | string pattern | required | `^\d{1,5}x\d{1,5}$` (width x height) or `^\d{1,5}$` (height only), each side 1 to 32768 | pixels | the source pasted the caller's string into `scale=` (`vam/server.py:374-378`, inventory G.4). A width form becomes `scale=<W>:<H>` and a bare height becomes `scale=-2:<H>` (`:376-378`), the forms the skill documents (`skill/references/mcp-video-audio.md:128-129`) |

Args, attempt 1:

```text
-n -i <input> -vf scale=<W>:<H> -c:v libx264 -c:a copy <temp>/resized.mp4
```

Args, attempt 2:

```text
-n -i <input> -vf scale=<W>:<H> -c:v libx264 -c:a aac <temp>/resized.mp4
```

- Attempt 1 is the source's primary, `vf` plus an audio copy (`vam/server.py:381`), attempt 2 its audio re-encode (`:382`).
- The video is re-encoded on both attempts, because a scale cannot be stream-copied, and `libx264` is written explicitly where the source left the container default.
- Output: one file, `<basename>-<W>x<H>.mp4`, or `<basename>-h<H>.mp4` for the height-only form. Gates: section 8.2.

#### 3.2.13 `video_set_codec`

Source: `set_video_codec` (`vam/server.py:385-397`, inventory section B row 13 at `../context/source-inventory.md:53`). Re-encode the video stream with a named encoder such as `libx264`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `codec` | string enum | required | `libx264`, `libx265`, `libvpx-vp9`, plus the alias `vp9` | none | the source's examples (`vam/server.py:391`) validated as a closed set. `vp9` normalizes to `libvpx-vp9` (section 1.5) |

Args, attempt 1:

```text
-n -i <input> -c:v <codec> -c:a copy <temp>/reencoded.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v <codec> -c:a aac <temp>/reencoded.mp4
```

- Attempt 1 is the source's primary, the named codec plus an audio copy (`vam/server.py:395`), attempt 2 its audio re-encode (`:396`).
- Output: one file, `<basename>-<codec>.mp4`. Gates: section 8.2.

#### 3.2.14 `video_set_bitrate`

Source: `set_video_bitrate` (`vam/server.py:399-411`, inventory section B row 14 at `../context/source-inventory.md:54`). Re-encode the video stream at a target bitrate such as `2M`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `videoBitrate` | string | required | `1k` to `100M`, suffix required, for example `2M` and `2500k` | `k` is 1000 bit/s, `M` is 1000000 bit/s | the source's examples (`vam/server.py:405`), and its test passes `2M` (`vam/tests/test_video_functions.py:264`) |

Args, attempt 1:

```text
-n -i <input> -c:v libx264 -b:v <videoBitrate> -c:a copy <temp>/bitrate.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v libx264 -b:v <videoBitrate> -c:a aac <temp>/bitrate.mp4
```

- The source passed only the bitrate and copied the audio (`vam/server.py:409-410`). The video re-encode used the container default, which for the MP4 written here is `libx264`, so the contract writes it.
- Output: one file, `<basename>-<videoBitrate>.mp4`. Gates: section 8.2.

#### 3.2.15 `video_set_frame_rate`

Source: `set_video_frame_rate` (`vam/server.py:413-425`, inventory section B row 15 at `../context/source-inventory.md:55`). Re-encode the video stream at a target frame rate in frames per second.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `frameRate` | number | required | greater than 0, at most 240, for example 24, 30 and 60 | frames per second | the source's examples (`vam/server.py:419`), and its test passes 24 (`vam/tests/test_video_functions.py:273`) |

Args, attempt 1:

```text
-n -i <input> -c:v libx264 -r <frameRate> -c:a copy <temp>/framerate.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v libx264 -r <frameRate> -c:a aac <temp>/framerate.mp4
```

- `-r` is an output option and forces the video re-encode, the source's `r` (`vam/server.py:423-424`).
- Output: one file, `<basename>-<frameRate>fps.mp4`. Gates: section 8.2.

#### 3.2.16 `video_set_audio_codec`

Source: `set_video_audio_track_codec` (`vam/server.py:427-439`, inventory section B row 16 at `../context/source-inventory.md:56`). Re-encode the audio track inside a video with a named encoder such as `aac`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `audioCodec` | string enum | required | `aac`, `libmp3lame`, `libopus` | none | the source's examples `aac` and `mp3` (`vam/server.py:433`) validated as a closed set. The alias `mp3` normalizes to `libmp3lame` (section 1.5). The source's test passes `aac` (`vam/tests/test_video_functions.py:282`) |

Args, attempt 1:

```text
-n -i <input> -c:v copy -c:a <audioCodec> <temp>/audio-codec.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v libx264 -c:a <audioCodec> <temp>/audio-codec.mp4
```

- Attempt 1 is the source's primary, the audio codec plus a video copy (`vam/server.py:437`), attempt 2 its video re-encode (`:438`).
- The video copy needs a codec the MP4 container accepts. When it does not, attempt 2 defines the result.
- Output: one file, `<basename>-audio-<audioCodec>.mp4`. Gates: section 8.2.

#### 3.2.17 `video_set_audio_bitrate`

Source: `set_video_audio_track_bitrate` (`vam/server.py:441-453`, inventory section B row 17 at `../context/source-inventory.md:57`). Re-encode the audio track inside a video at a target bitrate such as `192k`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `audioBitrate` | string | required | `1k` to `100M`, suffix required, for example `128k` and `192k` | `k` is 1000 bit/s, `M` is 1000000 bit/s | the source's examples (`vam/server.py:447`), and its test passes `192k` (`vam/tests/test_video_functions.py:291`) |

Args, attempt 1:

```text
-n -i <input> -c:v copy -c:a aac -b:a <audioBitrate> <temp>/audio-bitrate.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v libx264 -c:a aac -b:a <audioBitrate> <temp>/audio-bitrate.mp4
```

- The source re-encoded the audio with the container default and copied the video (`vam/server.py:451-452`). MP4's default is `aac`, written explicitly here and in `video_set_audio_codec` above.
- Output: one file, `<basename>-audio-<audioBitrate>.mp4`. Gates: section 8.2.

#### 3.2.18 `video_set_audio_sample_rate`

Source: `set_video_audio_track_sample_rate` (`vam/server.py:455-467`, inventory section B row 18 at `../context/source-inventory.md:58`). Re-encode the audio track inside a video at a target sample rate in Hz.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `sampleRate` | integer | required | 8000 to 384000, for example 44100 and 48000 | Hz | the source's examples (`vam/server.py:461`), and its test passes 48000 (`vam/tests/test_video_functions.py:300`) |

Args, attempt 1:

```text
-n -i <input> -c:v copy -c:a aac -ar <sampleRate> <temp>/audio-rate.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v libx264 -c:a aac -ar <sampleRate> <temp>/audio-rate.mp4
```

- The source re-encoded the audio with the container default and copied the video (`vam/server.py:465-466`). MP4's default is `aac`, written explicitly here.
- Output: one file, `<basename>-audio-<sampleRate>hz.mp4`. Gates: section 8.2.

#### 3.2.19 `video_set_audio_channels`

Source: `set_video_audio_track_channels` (`vam/server.py:469-481`, inventory section B row 19 at `../context/source-inventory.md:59`). Re-encode the audio track inside a video with a target channel count.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `channels` | integer | required | 1 to 8 | channel count | 1 is mono, 2 is stereo (`vam/server.py:475`), and the source's test passes 1 (`vam/tests/test_video_functions.py:309`) |

Args, attempt 1:

```text
-n -i <input> -c:v copy -c:a aac -ac <channels> <temp>/audio-channels.mp4
```

Args, attempt 2:

```text
-n -i <input> -c:v libx264 -c:a aac -ac <channels> <temp>/audio-channels.mp4
```

- The source re-encoded the audio with the container default and copied the video (`vam/server.py:479-480`). MP4's default is `aac`, written explicitly here.
- Output: one file, `<basename>-audio-<channels>ch.mp4`. Gates: section 8.2.

#### 3.2.20 `video_set_speed`

Source: `change_video_speed` (`vam/server.py:1035-1100`, inventory section B row 24 at `../context/source-inventory.md:64`). Speed one video up or down by a factor and adjust the audio tempo to match (`vam/server.py:1059-1093`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `speedFactor` | number | required | greater than 0 and at most 100, for example 2.0 doubles and 0.5 halves | factor | the source's only check was `speed_factor <= 0` (`vam/server.py:1048-1049`) and its docstring states `2.0` and `0.5` (`:1042`). Its test passes 1.5 (`vam/tests/test_video_functions.py:434-440`) |

Args:

```text
-n -i <input> -filter:v setpts=<1/speedFactor>*PTS -filter:a <atempo chain> -c:v libx264 -c:a aac <temp>/speed.mp4
```

- The video filter is `setpts=<1/speedFactor>*PTS`, the source's string (`vam/server.py:1081`). Factor 2.0 writes `setpts=0.5*PTS`, factor 0.5 writes `setpts=2*PTS`. The number is formatted by the server, so no caller byte reaches the filter.
- `atempo` accepts 0.5 to 2.0 per instance, so the chain repeats until the remainder sits in that band, the source's loop (`vam/server.py:1059-1077`) and the skill's rule (`skill/references/mcp-video-audio.md:123`). Factor 4 becomes `atempo=2.0,atempo=2.0`, factor 0.25 becomes `atempo=0.5,atempo=0.5`, and factor 1.5 stays one `atempo=1.5`.
- The audio filter is emitted only when the input carries an audio stream. The source built one unconditionally (`vam/server.py:1084-1093`), which fails on a silent file.
- The source had no fallback: one command, filters on both streams, and the two codecs left to the container (`vam/server.py:1092-1093`). The contract writes `libx264` and `aac` for the MP4 it produces.

Output: one file, `<basename>-<speedFactor>x.mp4`. Gates: section 8.2.

#### 3.2.21 Error codes, gates and defects

The codes these 19 tools return are listed in section 5 (codes by tool group), the encoders and filters each one checks in section 8.2, and the source defects this subsection closes in section 9.

### 3.3 Composition tool schemas and media_health

This subsection fixes the seven composition tools built in `005-video-composition` (section 2 rows 28 to 35) and `media_health`, built in `002-server-foundation` (section 2 row 9, where the name note replaces the inventory's `media_health_check`). Section 1 rules hold here without change: camelCase names, seconds for a plain time parameter and an `Ms` suffix where the unit is not seconds, `#RRGGBB` colours, enum spellings with single underscores. Every row below is one zod field on the tool schema that the SDK 1.x `McpServer` registers (ADR-002), so a value outside its range or enum is rejected before the handler runs (REQ-002), and the same schema documents the tool.

Source shorthands again: `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

Four rules hold for every tool in this subsection.

1. **The server builds every filter value.** A number is parsed and re-serialized, an enum is checked against its fixed list, and every caller string that reaches a graph is passed through the one escaping helper that section 8 defines and that `005-video-composition` builds. The source concatenated caller bytes into filter strings directly (`vam/server.py:610`, `:619`, `:540`), which inventory G.4 records as the defect this rule closes.
2. **Every command is an argv array for `spawn`.** The code blocks below are the argument array in order, one element per token, with `-n` on every run and no shell (ADR-003). A `<placeholder>` stands for one element even when the value it carries contains spaces. No command line is ever built as one string.
3. **One output folder per call, and no attempt blocks the next.** A tool that tries an audio copy and then an audio re-encode writes each attempt to its own path inside the run's private temp folder, and only the surviving file is moved into `<output folder>/NNN - <description>/` (section 4.3). The source sent both attempts to the same final path, so a partial file from the first attempt could break the second one (G.5, `vam/server.py:546-558`).
4. **A capability is checked before a command starts.** Each tool gates the encoders and filters of its graph against the resolved binary (section 8) and returns `CAPABILITY_MISSING` naming the absent element, never a failed encode (REQ-007). The full check list is section 8.2.

#### 3.3.1 Shared position vocabulary

`video_add_text_overlay`, `video_add_image_overlay` and `video_add_b_roll` share one position enum. The server turns the value into the coordinate expression, so no caller string is ever an expression. The sources interpolated caller strings into `x=` and `y=` (`vam/server.py:617-618`, `:728-735`, inventory G.4).

| Value | Anchor | Expression |
|-------|--------|------------|
| `top_left` | top-left corner, 10 px inset | `x=10:y=10` |
| `top_center` | top edge, horizontally centered | `x=(w-text_w)/2:y=10` |
| `top_right` | top-right corner, 10 px inset | `x=w-text_w-10:y=10` |
| `center_left` | left edge, vertically centered | `x=10:y=(h-text_h)/2` |
| `center` | both axes centered | `x=(w-text_w)/2:y=(h-text_h)/2` |
| `center_right` | right edge, vertically centered | `x=w-text_w-10:y=(h-text_h)/2` |
| `bottom_left` | bottom-left corner, 10 px inset | `x=10:y=h-text_h-10` |
| `bottom_center` | bottom edge, horizontally centered | `x=(w-text_w)/2:y=h-text_h-10` |
| `bottom_right` | bottom-right corner, 10 px inset | `x=w-text_w-10:y=h-text_h-10` |
| `fullscreen` | the whole frame, `video_add_b_roll` only | the clip is scaled to the main frame so the overlay covers it (`vam/server.py:1405-1406`) |

The drawtext form uses `w`, `h`, `text_w` and `text_h`. The two overlay tools use the same nine anchors with `main_w`, `main_h`, `overlay_w` and `overlay_h`, which is the source's spelling (`vam/server.py:721-727`), and b-roll uses `W`, `w`, `H` and `h` (`vam/server.py:1447-1453`). The 10 px inset is the source's own constant (`vam/server.py:719-727`, `:1448-1451`). The custom `x=..:y=..` form of the image overlay (`vam/server.py:678`, `:728-733`) does not carry over, because a raw coordinate string is the G.4 defect.

#### 3.3.2 `video_add_subtitles`

Burns one SubRip file into one video. It replaces `add_subtitles` (`vam/server.py:485-566`). The burn always re-encodes video and tries to copy the audio track first, then re-encodes audio when the container rejects the copy (`vam/server.py:545-558`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `subtitlePath` | string | required | existing `.srt` file under an allowed root | path | checked as an input with role `subtitle` (section 5), then read against the SubRip sniff of 8.3, because the `subtitles` filter opens the file itself. The source checked existence only (`vam/server.py:516-517`) |
| `fontStyle` | object | optional | keys below | none | absent means the filter's own styling, the source's behaviour when `font_style` is `None` (`vam/server.py:507`, `:522`) |
| `fontStyle.fontName` | string | optional, emitted when present | 1 to 64 characters, ASCII letters, digits, spaces and hyphens | none | written as `FontName` (`vam/server.py:523`) |
| `fontStyle.fontSize` | integer | optional, emitted when present | 1 to 1000 | px | `FontSize` (`vam/server.py:524`) |
| `fontStyle.fontColor` | string | optional, emitted when present | `#RRGGBB` | none | `PrimaryColour`, converted to ASS `&H00BBGGRR` order by the server. The source accepted `white` and `&H00FFFFFF` unchecked (`vam/server.py:525`, `:497`) |
| `fontStyle.outlineColor` | string | optional, emitted when present | `#RRGGBB` | none | `OutlineColour` (`vam/server.py:526`) |
| `fontStyle.outlineWidth` | number | optional, emitted when present | 0 to 100 | px | `Outline` (`vam/server.py:527`) |
| `fontStyle.shadowColor` | string | optional, emitted when present | `#RRGGBB` | none | `ShadowColour` (`vam/server.py:528`) |
| `fontStyle.shadowOffset` | number | optional, emitted when present | 0 to 100 | px | one value, because the source collapsed `shadow_offset_x` and `shadow_offset_y` into one `Shadow` (`vam/server.py:529-533`) |
| `fontStyle.alignment` | integer | optional, emitted when present | 1 to 9 | ASS numpad position | `Alignment`, the source documented 1 as bottom-left and 7 as top-left (`vam/server.py:503`, `:534`) |
| `fontStyle.marginV` | integer | optional, emitted when present | 0 to 1000 | px | `MarginV` (`vam/server.py:535`) |
| `fontStyle.marginL` | integer | optional, emitted when present | 0 to 1000 | px | `MarginL` (`vam/server.py:536`) |
| `fontStyle.marginR` | integer | optional, emitted when present | 0 to 1000 | px | `MarginR` (`vam/server.py:537`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name (section 1.4) |

Args, attempt 1:

```text
-n -i <input> -vf subtitles='<esc subtitlePath>':fontsdir='<esc fontDir>'[:force_style='<styleList>'] -c:v libx264 -c:a copy <temp>/subtitled.mp4
```

Attempt 2 is the same argv with `-c:a aac` in place of `-c:a copy`, after `aac` is checked again. The source left the audio encoder to the container there (`vam/server.py:551`), and the contract names `aac` so the gate has a name to check (section 8.2 rule 3). `<styleList>` is built from the validated keys only, for example `FontName=Inter,FontSize=24,PrimaryColour=&H00FFFFFF,MarginV=10`. The `force_style=` part is emitted only when `fontStyle` carries at least one key, and its value is always single-quoted, because the list is comma-joined and an unquoted comma would start a new filter (`vam/server.py:541-542` quotes it). `<esc fontDir>` is the bundled font folder, fixed at pack time, escaped the way section 8.6 escapes the bundled font file, and holding font files only, because libass reads every file in it. `<esc subtitlePath>` is the section 8.5 helper's output for a filter path value, which also covers a Windows drive letter. Both values sit inside single quotes in the argv element, as `subtitles='...'` and `fontsdir='...'`, the shape the helper's two levels assume (checked on ffmpeg 6.0 with a path holding a space). The spec names `subtitles='C:\clips\a.srt'` as the case that corrupts the source's filter (`vam/server.py:540`, spec section 8).

Output: one file, `<basename>-subtitled.mp4`. Gates: section 8.2. The bundled font folder is passed through the filter's `fontsdir` option, so a `fontStyle.fontName` that names a bundled family resolves on every machine. Any other name resolves through the system fonts when the build can see them, and libass substitutes a default face when it cannot (inventory F.2).

#### 3.3.3 `video_add_text_overlay`

Draws timed text over one video. It replaces `add_text_overlay` (`vam/server.py:568-663`). One `drawtext` filter is built per element and the elements are joined with `,` into one `-vf` value (`vam/server.py:635-639`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the video |
| `textElements` | array | required | 1 to 50 entries | none | each entry is one overlay (`vam/server.py:594-595` rejected an empty list at runtime, here the schema does it) |
| `textElements[].text` | string | required | 1 to 1000 characters, no NUL, no unpaired surrogate and no control character other than TAB and LF (CR and CRLF become LF) | text | escaped by the two-level helper of 8.5. The source escaped `\ ' : ,` with a single-level rule and left newlines raw (`vam/server.py:610`, G.4) |
| `textElements[].startTime` | number or string | required | 0 or more and less than `endTime` | seconds | string forms `HH:MM:SS`, `HH:MM:SS.mmm` or `MM:SS` (section 1.3) |
| `textElements[].endTime` | number or string | required | greater than `startTime`, past the last timestamp means end of input | seconds | section 1.3 |
| `textElements[].position` | string enum | default `bottom_center` | the nine values of 3.3.1 | none | replaces `x_pos` and `y_pos` (`vam/server.py:617-618`). The default matches the source's default expressions `(w-text_w)/2` and `h-text_h-10` |
| `textElements[].fontSize` | integer | default 24 | 1 to 1000 | px | source default (`vam/server.py:615`) |
| `textElements[].fontColor` | string | default `#FFFFFF` | `#RRGGBB` | none | source default `white` (`vam/server.py:616`), named colours do not carry over (section 1.2) |
| `textElements[].box` | boolean | default false | true or false | none | `box=1` when true (`vam/server.py:623-624`) |
| `textElements[].boxColor` | string | default `#000000` | `#RRGGBB` | none | the colour half of the source's `black@0.5` (`vam/server.py:625`) |
| `textElements[].boxOpacity` | number | default 0.5 | 0.0 to 1.0 | fraction | the source's `@0.5` alpha (`vam/server.py:586`), joined to the colour as `#RRGGBB@<value>` |
| `textElements[].boxBorderWidth` | integer | default 0 | 0 to 100 | px | `boxborderw`, emitted when non-zero (`vam/server.py:626-627`) |
| `textElements[].fontPath` | string | default the bundled font | existing font file under an allowed root | path | role `font` (section 5). Always passed as `fontfile=`, so drawtext never falls back to a system font. The source passed none unless the caller supplied one (`vam/server.py:630-632`, inventory F.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Args, attempt 1, with one `drawtext=...` group per element joined by `,`:

```text
-n -i <input> -vf drawtext=text='<esc text>':expansion=none:fontfile='<esc fontPath>':fontsize=<size>:fontcolor=<colour>:x=<x>:y=<y>:enable='between(t,<start>,<end>)'[:box=1:boxcolor=<colour>@<opacity>:boxborderw=<width>][,drawtext=...] -c:v libx264 -c:a copy <temp>/text-overlay.mp4
```

- `<x>` and `<y>` come from the position table, and `<start>` and `<end>` are parsed numbers, so the commas inside `enable` are the server's own separators. They sit inside single quotes, where the filtergraph parser keeps them literal and `between` reads them as arguments (checked on ffmpeg 6.0). The source interpolated raw caller times (`vam/server.py:619`, G.4).
- The box group appears only when `box` is true (`vam/server.py:623-627`). It joins with `:` inside the same `drawtext`, as the source does (`vam/server.py:635`), and only `,` starts the next `drawtext`.
- `expansion=none` is always present, so a `%` in the caller text is drawn as written and never read as an expansion (8.5).

Attempt 2 is the same argv with `-c:a aac` in place of `-c:a copy`, after `aac` is checked again (the source left the encoder to the container, `vam/server.py:649`).

Output: one file, `<basename>-text-overlay.mp4`. Gates: section 8.2.

#### 3.3.4 `video_add_image_overlay`

Places one scaled image over one video for a time span. It replaces `add_image_overlay` (`vam/server.py:665-771`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the video |
| `imagePath` | string | required | existing image under an allowed root | path | role `overlay-image` (section 5) |
| `position` | string enum | default `top_right` | the nine values of 3.3.1 | none | source default (`vam/server.py:667`) |
| `opacity` | number | optional, absent uses the image's own alpha | 0.0 to 1.0 | fraction | when present the graph gains `format=rgba,colorchannelmixer=aa=<value>` (`vam/server.py:710-713`) |
| `startTime` | number or string | optional, default start of input | 0 or more | seconds | with only this value the enable is `gte(t,<start>)` (`vam/server.py:742-743`) |
| `endTime` | number or string | optional, default end of input | greater than `startTime` | seconds | both values mean `between(t,<start>,<end>)` (`vam/server.py:740-741`) |
| `width` | integer | optional | 1 to 32768 | px | at least one of `width` and `height` is needed to scale, and the omitted side keeps the aspect ratio (`vam/server.py:701-707`, section 1.2) |
| `height` | integer | optional | 1 to 32768 | px | same rule |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Args, attempt 1:

```text
-n -i <video> -i <image> -filter_complex "[1:v]scale=<w>:<h>,format=rgba,colorchannelmixer=aa=<opacity>[ov];[0:v][ov]overlay=x=<x>:y=<y>:enable='between(t,<start>,<end>)'[v]" -map [v] -map 0:a -c:v libx264 -c:a copy <temp>/image-overlay.mp4
```

- The `scale` token appears only when `width` or `height` is given, with `-1` on the omitted side (`vam/server.py:701-707`).
- The `format` and `colorchannelmixer` tokens appear only when `opacity` is given (`vam/server.py:710-713`).
- With neither a size nor `opacity` the overlay input needs no chain, so the graph is `[0:v][1:v]overlay=x=<x>:y=<y>[v]` with no `[ov]` label.
- The `enable` part appears only when a time bound is given, otherwise the overlay covers the whole clip (`vam/server.py:738-744`).
- `<x>` and `<y>` come from the position table with `main_w`, `main_h`, `overlay_w` and `overlay_h` (`vam/server.py:721-727`).
- `-map 0:a` is emitted when the probed input carries an audio stream, and then attempt 2 is the same argv with `-c:a aac` in place of `-c:a copy`. A video with no audio stream runs once with no audio map. The source mapped audio unconditionally (`vam/server.py:749-757`).

Output: one file, `<basename>-image-overlay.mp4`. Gates: section 8.2.

#### 3.3.5 `video_concat`

Joins two or more videos in order. It replaces `concatenate_videos` (`vam/server.py:775-1033`). Without `transition` the join normalizes every clip and runs the concat demuxer (`vam/server.py:975-1033`). With `transition`, exactly two clips run the xfade path (`vam/server.py:857-970`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPaths` | string array | required | 2 to 50 entries, each under an allowed root | path | every entry is checked before the output folder exists (section 4.4). A single input is refused, because a one-clip re-encode is `video_convert`'s job (`vam/server.py:846-854`) |
| `transition` | string enum | optional, absent means a plain join | `dissolve`, `fade`, `fadeblack`, `fadewhite`, `fadegrays`, `distance`, `wipeleft`, `wiperight`, `wipeup`, `wipedown`, `slideleft`, `slideright`, `slideup`, `slidedown`, `smoothleft`, `smoothright`, `smoothup`, `smoothdown`, `circlecrop`, `rectcrop`, `circleopen`, `circleclose`, `vertopen`, `vertclose`, `horzopen`, `horzclose`, `diagtl`, `diagtr`, `diagbl`, `diagbr`, `hlslice`, `hrslice`, `vuslice`, `vdslice`, `pixelize`, `radial`, `hblur` | none | the source's 37-value allowlist, kept whole (`vam/server.py:826-836`). An entry count other than two is `INVALID_INPUT` (`vam/server.py:972-973`) |
| `transitionDuration` | number | required when `transition` is given | greater than 0 and less than the first clip's duration | seconds | source checks (`vam/server.py:820-823`, `:869-870`, `:925-926`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Args, no transition, per clip, with `W`, `H` and `fps` taken from the first clip (`vam/server.py:983-986`). When the first clip reports no width or height the source falls back to 1280x720 (`vam/server.py:984-985`), and the 30 fps fallback is `vam/server.py:1260-1262`:

```text
-n -i <clip> -vf scale=<W>:<H> -r <fps> -c:v libx264 -c:a aac <temp>/norm_<i>.mp4
```

Then the list file, with one `file 'norm_<i>.mp4'` line per normalized clip and no other content (`vam/server.py:1009-1012`), and the join itself:

```text
-n -f concat -safe 1 -protocol_whitelist file -i <temp>/concat_list.txt -c copy <temp>/joined.mp4
```

The list holds only the relative names the server generated for its own intermediates, which sit in the folder of the list file, so no caller byte reaches the demuxer and no path needs quoting. `-safe 1` makes the demuxer refuse an absolute or parent-relative entry, and `-protocol_whitelist file` keeps every entry on the local file protocol. The source wrote the caller's path into the list with no escaping and ran the join with `-safe 0` (`vam/server.py:1012`, `:1019`, G.2), so a path holding a quote could add a `file` line of the caller's choosing. Checked on ffmpeg 6.0: relative `norm_<i>.mp4` entries join under `-safe 1`, and an absolute entry fails with `Unsafe file name`.

Args, xfade, exactly two clips. Normalize each clip first, with `W`, `H` and `fps` as the maximum of the two clips and a floor of 640x360 and 30 fps (`vam/server.py:879-884`):

```text
-n -i <clip> -vf scale=<W>:<H> -r <fps> -c:v libx264 -c:a aac <temp>/norm_<i>.mp4
```

Then the join, with `D` the transition duration and `offset` the first normalized clip's duration minus `D` (`vam/server.py:929`):

```text
-n -i <temp>/norm_0.mp4 -i <temp>/norm_1.mp4 -filter_complex "[0:v][1:v]xfade=transition=<transition>:duration=<D>:offset=<offset>[v];[0:a][1:a]acrossfade=d=<D>:c1=tri:c2=tri[a]" -map [v] -map [a] -c:v libx264 -c:a aac <temp>/joined.mp4
```

The `acrossfade` chain and the `[a]` map appear only when both clips carry an audio stream (`vam/server.py:872-874`). The source's audio branch emitted no `[v]` and no `[a]` label while still mapping both, so its own graph was malformed as written and its fixtures never exercised it (inventory F.1, `vam/server.py:943-950`). The contract labels both chain outputs.

Output: one file, `<basename>-joined.mp4`, with `<basename>` taken from the first input. Gates: section 8.2.

#### 3.3.6 `media_remove_silence`

Finds silent stretches with `silencedetect` and keeps the loud parts. It replaces `remove_silence` (`vam/server.py:1102-1219`) and accepts an audio file or a video file with an audio stream, which is why the prefix is `media_` (`vam/server.py:1103-1105`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | audio or video file under an allowed root | path | a file with no audio stream fails with `UNSUPPORTED_FORMAT` before any ffmpeg run. The source checked existence only (`vam/server.py:1117-1120`) |
| `silenceThresholdDb` | number | default -30.0 | -100 to 0 | dBFS | the level below which audio counts as silence (`vam/server.py:1104`, `:1130`) |
| `minSilenceDurationMs` | integer | default 500 | 1 to 600000 | ms | the source's only check was a positive value (`vam/server.py:1119-1120`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Args, detect, with `T` the threshold and `D` the minimum duration converted to seconds:

```text
-n -i <input> -vn -af silencedetect=n=<T>dB:d=<D> -f null -
```

The detection reads `silence_start:` and `silence_end:` pairs from the capped stderr tail (`vam/server.py:1127-1139`, the cap is section 8), and a trailing silence with no `silence_end` runs to the end of the file (`vam/server.py:1173`, with the pairing caveat noted at `:1156-1161`). A value may carry a minus sign, which the source's pattern `\d+\.?\d*` dropped (`vam/server.py:1138-1139`): a negative start counts as 0, and an end past the probed duration counts as the duration.

Args, keep, with one `between(t,<s>,<e>)` term per kept segment joined by `+` (`vam/server.py:1189-1193`):

```text
-n -i <input> -filter_complex "[0:v]select='<expr>',setpts=N/FRAME_RATE/TB[v];[0:a]aselect='<expr>',asetpts=N/SR/TB[a]" -map [v] -map [a] -c:v libx264 -c:a aac <temp>/without-silence.mp4
```

- The video chain appears only for a video input, the audio chain is always present because a file without audio is refused (`vam/server.py:1198-1207`). For an audio input the argv drops the video chain and the video map: `-n -i <input> -filter_complex "[0:a]aselect='<expr>',asetpts=N/SR/TB[a]" -map [a] -c:a aac <temp>/without-silence.m4a`.
- The timestamps are rebuilt from the frame and sample counts, `setpts=N/FRAME_RATE/TB` and `asetpts=N/SR/TB`, so the kept segments play back to back. The source's `PTS-STARTPTS` (`vam/server.py:1203`, `:1206`) only moves the first kept frame to zero and leaves every interior gap in the timeline: on ffmpeg 6.0 a 7-second file keeping 0 to 1 and 3 to 4 seconds came out 4.02 seconds long with `PTS-STARTPTS` and 2.02 seconds with the count-based form. Both forms use only the gated `setpts` and `asetpts` filters.
- `<expr>` is single-quoted in both chains, because its `between(t,<s>,<e>)` terms carry commas and a comma outside quotes ends the filter. The source's ffmpeg-python layer escaped those commas for the caller (inventory F.7, `vam/server.py:1189-1193`), and an argv port has no such layer.
- When the detection finds no silence at the threshold, the tool stream-copies the input into the output folder and says so, exactly the source's fallback (`vam/server.py:1148-1152`), with `-n -i <input> -c copy <temp>/without-silence.<ext>` as the argv, `<ext>` being the input's own extension. When that copy is an MP4-family file holding a PCM or FFV1 stream, the call fails with `PROCESS_FAILED` on every build, the way ffmpeg 6.1 and 7.0 already fail the copy itself.
- When every stretch is silent, no keep segment exists and the call is `INVALID_INPUT` (`vam/server.py:1182-1183`).

Output: one file, `<basename>-without-silence.mp4` for a video input, `<basename>-without-silence.m4a` for an audio input, and `<basename>-without-silence.<ext>` with the input's own extension when nothing was silent. Gates: section 8.2.

#### 3.3.7 `video_add_b_roll`

Overlays timed clips onto a main video. It replaces `add_b_roll` (`vam/server.py:1348-1571`). The server sorts the entries by insertion time, processes each clip once and chains one overlay per entry (`vam/server.py:1381`, `:1485-1523`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the main video |
| `clips` | array | required | 1 to 50 entries | none | an empty list is `INVALID_INPUT` (section 5). The source copied the main video instead (`vam/server.py:1355-1360`) |
| `clips[].clipPath` | string | required | existing video under an allowed root | path | |
| `clips[].insertAt` | number or string | required | 0 or more and less than the main video's duration | seconds | the source's `insert_at_timestamp` (`vam/server.py:1382`, `:1391`) |
| `clips[].duration` | number | default the clip's own duration | greater than 0 | seconds | source default (`vam/server.py:1392`) |
| `clips[].position` | string enum | default `fullscreen` | the grid plus `fullscreen` (3.3.1) | none | source default (`vam/server.py:1393`), and the source's hyphen spellings normalize to underscores (section 1.5, `vam/server.py:1362`) |
| `clips[].scale` | number | default 0.5 for the overlay positions | 0.01 to 10 | factor of the clip's own size | with `fullscreen` the clip always fills the frame, so a `scale` value there is `INVALID_INPUT` (`vam/server.py:1400-1408`) |
| `clips[].fadeIn` | boolean | default false | true or false | none | `fade=t=in:st=0:d=<fadeDuration>` (`vam/server.py:1415-1416`) |
| `clips[].fadeOut` | boolean | default false | true or false | none | `fade=t=out:st=<clip length minus fadeDuration>:d=<fadeDuration>`, clamped at 0 (`vam/server.py:1418-1421`) |
| `clips[].fadeDuration` | number | default 0.5 | greater than 0 | seconds | source default (`vam/server.py:1413`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Two source keys are removed because the source accepted each one and then ignored it, which is the G.8 defect. `audio_mix` was accepted in every clip and never mixed (`vam/server.py:1466`, `:1528-1531`), and the `slide_*` transition values produced a plain overlay with no motion (`vam/server.py:1363`, `:1506-1520`), so `transition_in` and `transition_out` become the two booleans above.

Args, pass 1 per clip, with the fade groups only when requested (`vam/server.py:1428-1436`):

```text
-n -i <clipPath> -vf scale=<scale token>[,fade=t=in:st=0:d=<fadeDuration>][,fade=t=out:st=<t>:d=<fadeDuration>] -c:v libx264 -c:a aac <temp>/clip_<n>.mp4
```

The scale token is `scale=<mainWidth>:<mainHeight>` for `fullscreen` and `scale=trunc(iw*<scale>/2)*2:trunc(ih*<scale>/2)*2` for every other position. The source wrote `iw*<scale>:ih*<scale>` (`vam/server.py:1405-1408`), which gives odd sizes such as 0.33 of 320, and libx264 refuses an odd 4:2:0 size, so the server floors each side to an even number, as 3.2.6 does for the aspect-ratio sizes.

Args, pass 2, with the main video first and one input per processed clip (`vam/server.py:1534-1548`):

```text
-n -i <main> -i <temp>/clip_0.mp4 -i <temp>/clip_1.mp4 -filter_complex "[1:v]setpts=PTS-STARTPTS+<s>/TB[b0];[2:v]setpts=PTS-STARTPTS+<s>/TB[b1];[0:v][b0]overlay=x=<x>:y=<y>:enable='between(t,<s>,<s+d>)'[v0];[v0][b1]overlay=...[v]" -map [v] -map 0:a -c:v libx264 -c:a aac <temp>/b-roll.mp4
```

- `<x>` and `<y>` come from the position table, so no position string reaches the graph (`vam/server.py:1441-1453`).
- Each clip's timestamps are shifted to its own `insertAt` with `setpts=PTS-STARTPTS+<s>/TB`, so the clip plays from its first frame when its window opens and its fades land inside the window. The source overlaid the unshifted clip (`vam/server.py:1493-1496`), so the window showed the clip from `<s>` seconds into it and a fade-in at the clip's start was never on screen: on ffmpeg 6.0, a clip of 1 second of red then 2 seconds of blue inserted at 2 seconds showed blue at 2.5 seconds without the shift and red with it.
- `-map 0:a` appears only when the main video has an audio stream (`vam/server.py:1530-1531`).
- The source's slide branch wrote the same overlay as its plain branch (`vam/server.py:1506-1520`), which is why the contract has no slide value at all.

Output: one file, `<basename>-b-roll.mp4`. Gates: section 8.2.

#### 3.3.8 `video_add_fade`

Adds one fade from black at the start or one fade to black at the end of one video. It replaces `add_basic_transitions` (`vam/server.py:1573-1645`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the video |
| `fadeType` | string enum | required | `fade_in`, `fade_out` | none | the aliases `crossfade_from_black` and `crossfade_to_black` are accepted and normalize to the canonical values (section 1.5, `vam/server.py:1604-1610`) |
| `duration` | number | required | greater than 0 and no longer than the video's duration | seconds | source checks (`vam/server.py:1588-1589`, `:1595-1596`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Args, with `D` the duration and `total` the probed video duration, attempt 1 of each (`vam/server.py:1605-1608`, `:1625`):

```text
fade_in:  -n -i <input> -vf fade=t=in:st=0:d=<D> -c:v libx264 -c:a copy <temp>/fade.mp4
fade_out: -n -i <input> -vf fade=t=out:st=<total-D>:d=<D> -c:v libx264 -c:a copy <temp>/fade.mp4
```

Attempt 2 is the same argv with `-c:a aac` in place of `-c:a copy`, after `aac` is checked again (the source left the encoder to the container, `vam/server.py:1630`).

Output: one file, `<basename>-fade-in.mp4` or `<basename>-fade-out.mp4`, following `fadeType`. Gates: section 8.2.

#### 3.3.9 `media_health`

Reports the server state without reading any media file. It replaces `health_check`, which returned one fixed sentence (`vam/server.py:13-16`), and it takes the name fixed in section 2's name note.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| none | | | | | the tool takes no input, creates no output folder, and works when no allowed root is configured (section 4.1) |

The report is the text summary plus these structured fields.

| Field | Content |
|-------|---------|
| `serverVersion` | the one version the server registers, read from the package manifest, so the source's mismatch between registered `0.1.0` and package `0.1.1` cannot recur (`imagician/src/index.ts:17`, `imagician/package.json:3`, inventory G.13) |
| `ffmpeg` | object with `found`, `path`, `source`, `version` and, when `found` is false, `lookedIn`, or, when `found` is true and an earlier candidate could not run, `skipped`, the fields section 6.7 defines. `version` is the first line of `ffmpeg -version` (`skill/SKILL.md:261`). `source` is one of `env-override`, `bundled`, `system-path` or `installed`, the four lookup steps of section 6.1 |
| `ffprobe` | the same object for ffprobe (`skill/SKILL.md:262`) |
| `capabilities` | one `{ kind, name, present }` entry per encoder and filter in the section 8 capability list, read from one parse each of `ffmpeg -encoders` and `ffmpeg -filters` (`skill/SKILL.md:263-264`, `skill/references/mcp-imagician.md:56-58`, `skill/references/mcp-video-audio.md:56-58`, `:80-82`) |
| `imageEngine` | object with `sharp` and `libvips`, the two version strings the loaded sharp package reports, so an operator can tell which image build a bundle carries |
| `allowedRoots` | the roots that took effect after canonicalization, so a dropped config entry is visible instead of silent (section 4.1) |
| `outputFolder` | the resolved output folder, `null` only when nothing sets it (section 4.1) |
| `timeoutSeconds`, `logLevel`, `dataFolder` | the effective values of `MEDIA_EDITOR_TIMEOUT_SECONDS`, `MEDIA_EDITOR_LOG_LEVEL` and `MEDIA_EDITOR_DATA_DIR` after the fallbacks of section 6.8 |

Args, four short runs under the section 8 process policy:

```text
ffmpeg -version
ffprobe -version
ffmpeg -hide_banner -encoders
ffmpeg -hide_banner -filters
```

A binary that no lookup step resolves is reported as data (`found: false`, `path: null`, no `source`, the `lookedIn` list of section 6.6, and the summary names `media_setup_ffmpeg` as the next step) rather than failing the call, because telling the user what is missing is the tool's purpose. Section 6 owns the lookup that raises `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND` for every tool that cannot run without a binary.

#### 3.3.10 Error codes and gates

The codes these eight tools return are listed in section 5 (codes by tool group), and the encoders and filters each one checks, including the `drawtext` case of REQ-007, in section 8.2.

#### 3.3.11 How caller text reaches a filter

Every route below ends in a validated value or in the section 8 escaping helper, never in a raw caller string. The source's raw routes are `vam/server.py:610`, `:619`, `:540` and `:631-632`, all recorded as G.4.

| Caller value | Example | Route into the graph |
|--------------|---------|----------------------|
| Overlay text | `50% off, today` | escaped by the two-level helper of 8.5, then written as `text='...'`. The source escaped `\ ' : ,` with a single-level rule (`vam/server.py:610`) |
| Subtitle path | `C:\clips\a.srt` | escaped by the same helper as a filter path value (`vam/server.py:540` interpolated it raw, the spec's Windows drive-letter case) |
| Font path | `C:\fonts\Inter.ttf` | escaped by the same helper, and existence is checked before the run. The source escaped partially and never checked (`vam/server.py:631-632`) |
| Position | `bottom_right` | an enum member, and the server writes the expression from the 3.3.1 table |
| Times and sizes | `2.5`, `640`, `0.5` | parsed to a number and re-serialized, so no caller byte survives (`vam/server.py:619` interpolated raw times into `enable`) |
| Colours | `#FF8800` | validated as `#RRGGBB`, then converted to the filter's own colour order (`vam/server.py:523-537` accepted named and `&H` forms unchecked) |
| Style name | `Inter` | validate as letters, digits, spaces and hyphens before it enters `force_style` (`vam/server.py:523`) |
| Concat list member | `it's a clip.mp4` | never written: the list holds only `norm_<i>.mp4`, names the server generates for its own intermediates, and the join runs under `-safe 1` (3.3.5, `vam/server.py:1012` with `-safe 0` at `:1019`, G.2) |

#### 3.3.12 Defects this subsection closes

The source defects these schemas close, G.2, G.4, G.5, G.7, G.8, G.13 and the porting hazards F.1 to F.3, are listed in section 9.

### 3.4 Media Editor tool schemas

These four schemas are the zod contracts behind rows 36 to 39 of the unified table. Rows 36 to 38 are built in `006-probe-repair-hls` and row 39 in `008-claude-code-plugin` (section 2). Section 1.1 fixes the names, section 1.2 fixes the shared parameter names and ranges, section 1.3 fixes `crf`, and the tables below add the tool-specific fields. A call that fails its schema is the SDK's `-32602` protocol error. A call that passes its schema and then fails a handler check returns a tool result with one code from the section 5 list.

Every table reads `parameter | type | required or default | range or enum | unit | notes`, in that order.

Four rules hold for the whole group before the tool tables:

- The three media tools read their input through the section 4.2 real-path check. `media_repair` and `video_hls_ladder` write into one fresh `<output folder>/NNN - <slug>/` folder (sections 1.4 and 4.3) and never onto an input. `media_probe` and `media_setup_ffmpeg` create no output folder at all. Setup writes only inside the server data folder, which section 4 counts as a package asset and exempts from the root check, and it keeps working when no allowed roots are configured, because it takes no path parameter.
- Every subprocess comes from the section 6 resolver. A missing ffprobe returns `FFPROBE_NOT_FOUND` and a missing ffmpeg returns `FFMPEG_NOT_FOUND`, each naming `media_setup_ffmpeg` as the next step (section 5).
- No caller string reaches a child process argument or a filter graph as syntax. The ladder's every value is a closed enum or a bounded integer, and the repair passes are fixed flags picked by one enum, so the unvalidated string family of defects cannot recur here (section G.4, `../context/source-inventory.md:241-248`). Section 8 owns the escaping helper for the tools that carry caller text.
- Every run takes the section 8 timeout (1800 seconds by default, `MEDIA_EDITOR_TIMEOUT_SECONDS` overrides it), keeps the last 64 KB of stderr in process and returns 4 KB of it, and every ffmpeg run carries `-n` (ffprobe writes no file, section 8.3).

#### `media_probe`

Source: new tool in row 36. It is the ffprobe inspection path for any media kind (section 2), read-only, with no output folder.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2), any image, audio or video file |

**Behavior**: one ffprobe run, `ffprobe -v error -print_format json -show_format -show_streams` (`../context/source-inventory.md:226` gives this as the TypeScript form that replaces `ffmpeg.probe` at `vam/server.py:1240`), then one `JSON.parse`. The result reports three blocks:

- `format`: `formatName`, `durationSeconds` (a number, parsed from the string ffprobe returns, `../context/source-inventory.md:226`), `sizeBytes` and `bitRate` (bits per second).
- `summary`: `hasVideo` and `hasAudio` (the source picks the first stream of each type, `vam/server.py:1241-1242`), `durationSeconds`, `width` and `height` in pixels from the first video stream (`:1248-1249`), `frameRate` in frames per second from `avg_frame_rate` (`:1255-1262`), and `sampleRate` in Hz with `channels` and `channelLayout` from the first audio stream (`:1251-1253`). A picture attached as album art (ffprobe `disposition.attached_pic` 1) is not the first video stream: it stays in `streams`, but an audio file with a cover reports `hasVideo: false` and no picture fields, the rule the input probe of 3.2 and 3.3 already follows.
- `streams`: one entry per stream with `index`, `type` (the ffprobe `codec_type`: `video`, `audio`, `subtitle`, `data` or `attachment`), `codecName`, plus the fields that stream carries from `width`, `height`, `frameRate`, `pixelFormat`, `sampleRate`, `channels` and `channelLayout`. A still image arrives as a single-frame video stream, which is how the image metadata recipe reads one with ffprobe (`skill/references/mcp-imagician.md:151`).

The frame rate keeps the source's fallback of 30 when `avg_frame_rate` is missing, `0/0`, or over a zero denominator (`vam/server.py:1260-1262`). Every other field is omitted when the file does not carry it, the rule `image_probe` follows (section 3.1), so a file with no audio never reports a fabricated sample rate. This is the ffprobe path for any media kind, and `image_probe` stays the sharp path for images (section 2). No ffmpeg code runs, and no sharp code runs.

When ffprobe exits zero, the report above returns. When it exits non-zero, the call returns `PROCESS_FAILED` with the capped stderr tail, and the message names `media_repair` as the next step, the same way `FFMPEG_NOT_FOUND` names `media_setup_ffmpeg` (section 5).

**Output**: none. A read-only tool writes nothing and creates no output folder (section 4.3). The blocks above arrive as structured content with the section 7 result shape.

#### `media_repair`

Source: new tool in row 37, built on the repair flow the skill documents: `$repair` and `$r` route to Repair Mode with ffprobe diagnosis then ffmpeg repair (`skill/SKILL.md:48`), the route line `ffprobe then ffmpeg` (`:86`), and the mode's one-line purpose "Diagnose and fix a broken media file" (`:279`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2), must carry at least one video or audio stream |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `strategy` | enum | default `auto` | `auto`, `remux`, `reencode` | none | `auto` copies first and re-encodes only on failure, the copy-first order of `video_trim` and `video_convert` (`vam/server.py:55-66`, `:360-362`) |

**Behavior**: the tool always runs the two repair-mode steps, diagnosis then rewrite (`skill/README.md:202-204`).

**Diagnosis** is one ffprobe run, `ffprobe -v error -show_entries format=format_name,duration:stream=codec_name,codec_type:stream_disposition=attached_pic INPUT` (`skill/README.md:207`, with the attached-picture flag added). A stream flagged as an attached picture is reported with `attachedPicture: true` and never counts as a video stream, so a song with album art takes the audio branch: checked on ffmpeg 6.0, the video branch turned such a file into an MP4 with a one-frame picture track. Partial output is accepted, because the damaged file is the reason for the call: the streams, the duration and the format name that could be read are reported together with a capped excerpt of the error text (`skill/README.md:204`). The diagnosis decides the re-encode branch and fills the result's `diagnosis` block. A file whose diagnosis read no video and no audio stream returns `UNSUPPORTED_FORMAT` with `detected` naming the format ffprobe reported and `accepted: ["video", "audio"]`, because both passes rewrite media streams and this file is past their scope.

**Rewrite** is one ffmpeg pass, chosen by `strategy`:

| Requested `strategy` | Pass that runs | Command shape |
|---|---|---|
| `remux` | Stream copy | `ffmpeg -n -i INPUT -c copy TARGET`, the repair flow's stream-copy command (`skill/README.md:208`) and the copy form of the plain conversion (`skill/references/mcp-video-audio.md:91`). The container stays the input's, which already accepts its streams (`skill/references/mcp-video-audio.md:209`). An MP4-family copy that holds a PCM or FFV1 stream counts as a failed copy (3.2, rule 5) |
| `reencode`, a video stream is present | Re-encode | `ffmpeg -n -i INPUT -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k TARGET` (`skill/references/mcp-video-audio.md:97`), with the audio flags only when the diagnosis found an audio stream |
| `reencode`, audio only | Re-encode | `ffmpeg -n -i INPUT -vn -c:a aac -b:a 192k TARGET` (`skill/references/mcp-video-audio.md:156`). `-vn` drops album art: checked on ffmpeg 6.0, without it the M4A muxer refuses the picture stream and the pass exits 1. A dropped picture adds one warning |
| `auto` | Copy first, re-encode on failure | The `remux` row, then one decode check of the copy, `ffmpeg -v error -i COPY -f null -`, then the re-encode row that fits the diagnosis when the copy exits non-zero, keeps a PCM or FFV1 stream in an MP4-family file, or the check prints an error line (`vam/server.py:55-66`, `:360-362`). The check is needed because a copy of a cut MP4 exits 0 and keeps the damage (checked on ffmpeg 6.0) |

The two passes are the recovery primitives the reference documents, and the re-encode is the last resort: the copy repairs what a container index or a timestamp table can repair, and the re-encode rebuilds the elementary streams. No other flags are added, so every run is one of the command shapes above plus `-n`. The output name is `<basename>-repaired.<ext>`, where the extension is the input's own on the copy branch and `.mp4` or `.m4a` on the re-encode branches. A failed pass leaves nothing behind: the runner removes its partial output before the next pass starts (section 8).

The re-encode branches check the resolved build before they start, and the copy pass needs no check. The names checked are in section 8.2.

**Output**: one file, `<basename>-repaired.<ext>`, inside the call's single numbered folder. The structured result carries the diagnosis (`formatName`, `durationSeconds`, the readable streams, the error excerpt when there was one) and the repair (the requested `strategy`, the `pass` that succeeded, `outputPath` and `bytes`), with the section 7 shape.

#### `video_hls_ladder`

Source: new tool in row 38, built from the Media Editor HLS recipe (`skill/assets/hls-video-conversion.md`): the four-rung ladder at `:51` and its quality table at `:151-156`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2), must carry a video stream |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `rungs` | array of enum | default all four | `1080p`, `720p`, `480p`, `360p` | none | 1 to 4 entries, no repeats. The ladder order is always 1080p down to 360p, the stream map renumbers from `v:0`, and dropping a rung is the file-size knob of `skill/assets/hls-video-conversion.md:242` |
| `crf` | integer | default 23 | 0 to 51 | CRF scale, lower is better | the recipe's recommended value (`skill/assets/hls-video-conversion.md:158`), which it calls visually transparent (`:121`). The asset's size and quality knobs raise it to 26 or lower it to 20 (`:242-243`) |
| `segmentDuration` | integer | default 2 | 2 to 10 | seconds | the `-hls_time` value (`:111`). 2 seconds is recommended, 4 acceptable, 6 to 10 not recommended (`:170`), and the GOP derives from it (`:168`) |

**Rung selection**: before the run, the ffprobe read that gives the frame rate also gives the input's width and height, and every requested rung taller than the source's shorter side is dropped, so no rung is ever enlarged. The shorter side is the height of a landscape source and the width of a portrait one, so a 720 by 1280 phone video keeps 720p and below. This rule is needed because the recipe's `force_original_aspect_ratio=decrease` fits the picture to the rung frame in both directions, despite the asset calling it downscale-only (`:121`): checked on ffmpeg 6.0, a 640x360 source came out 1920x1080. The result names the dropped rungs in `droppedRungs` and carries one warning. When every requested rung is dropped, the call returns `INVALID_INPUT` with `parameter: "rungs"`, the requested list as `value` and `reason: "larger-than-source"`, before the numbered folder exists.

**Behavior**: one ffmpeg run builds the whole ladder, following the multi-quality command (`skill/assets/hls-video-conversion.md:94-118`). The filter graph splits the picture once per selected rung and scales each copy to fit inside its rung frame, then pads it centered to the exact size (`:97-100`, `:121`), so a portrait or ultrawide source is letterboxed rather than cropped. Each rung then takes the settings of the quality table (`:151-156`):

| Rung | Frame size | `maxrate` | `bufsize` | Profile | Level |
|---|---|---|---|---|---|
| `1080p` | 1920x1080 | 2500k | 5000k | main | 4.0 |
| `720p` | 1280x720 | 1500k | 3000k | main | 4.0 |
| `480p` | 854x480 | 800k | 1600k | baseline | 3.1 |
| `360p` | 640x360 | 500k | 1000k | baseline | 3.1 |

Every rung encodes with `-c:v libx264 -preset fast -tune fastdecode -crf <crf>`, its own `-maxrate` and `-bufsize`, `-g` and `-keyint_min` set to the input's average frame rate times `segmentDuration` (`:101-108`, `:168`), which is 48 at the recipe's 24 fps and 2-second segment (`:121`), and `-sc_threshold 0`. The profile and level carry the rung's stream index, `-profile:v:<n>` and `-level:v:<n>`, the way `-maxrate:v:<n>` does, because the recipe's unindexed `-profile:v` and `-level` apply to every video stream of the one output and the last value wins: checked on ffmpeg 6.0, the recipe's form encoded a 720p rung as Constrained Baseline 3.1. The frame rate comes from one ffprobe read of the input before the run, the shared input probe of 3.2: `avg_frame_rate`, then the nominal `r_frame_rate` when the average is missing or zero, then the 30 frames per second fallback (`vam/server.py:1260-1262`). The rate control, the profiles and the levels are libx264 settings, so the ladder is fixed to `libx264` and the asset's GPU substitutes (`:248`) are not exposed. Audio is not carried: the recipe runs `-an` (`:109`) and records the 20 to 30 percent saving it brings (`:56`). The encoder and filter check before the encode is in section 8.2.

The mux options are the recipe's: `-f hls -hls_time <segmentDuration> -hls_playlist_type vod -hls_flags independent_segments -hls_segment_type mpegts`, with the segment pattern `%v/segment_%03d.ts`, `-master_pl_name master.m3u8`, the stream map `-var_stream_map "v:0,name:1080p v:1,name:720p v:2,name:480p v:3,name:360p"`, and the output pattern `%v/playlist.m3u8` (`:110-118`).

The run's working directory is the call's numbered folder (the `cwd` option of 8.4), so every pattern is relative and server-generated. No caller byte and no `%` in a folder name reaches ffmpeg's pattern reader, which does not collapse a doubled `%%` (checked on ffmpeg 6.0: files landed in a literal `p%%q` folder). The tool creates each rung folder (`1080p/` and so on) before the spawn. After the run it checks that `master.m3u8`, one `playlist.m3u8` per rung and at least one segment per rung exist (the output check of 8.4), because ffmpeg exits 0 after `Failed to open file`.

**Output**: the fixed names of the HLS structure (`:77-86`), all inside the call's single numbered folder:

- `master.m3u8`, the master playlist (`:116`)
- one directory per selected rung (for example `1080p/`) holding `playlist.m3u8` and the segments `segment_000.ts`, `segment_001.ts` and so on (`:115`)

The structured result lists the master playlist path, the playlist path and the segment count per rung, and the total bytes, with the section 7 shape.

#### `media_setup_ffmpeg`

Source: new tool in row 39. It is the fourth step of the section 6 lookup order for the case where the first three fail, and it is the tool the `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND` messages point at (section 5).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `component` | enum | default `both` | `ffmpeg`, `ffprobe`, `both` | none | which pinned artifact the call resolves, plans and, with consent, installs |
| `consent` | boolean | default false | true or false | none | `true` accepts the download for every requested component that stays unresolved. Without it the call writes nothing and section 5's `CONSENT_REQUIRED` is the result |

**Behavior**: a call works through four steps in this order.

1. **Resolve.** The four lookup steps of section 6.1 run for every requested component: the `MEDIA_EDITOR_FFMPEG_PATH` or `MEDIA_EDITOR_FFPROBE_PATH` override, the bundled static package, system `PATH`, then the data folder an earlier setup call filled. Every path found is reported with the step that found it. A component any step resolves is never planned and never downloaded, so consent is only ever asked for what is actually missing.
2. **Plan.** Each requested component that stays unresolved gets one plan row from the pinned build table. That table ships with the server, holds one row per platform and component, and is fixed at pack time: no value in it is computed or fetched at call time.

| Plan field | Value |
|---|---|
| `component` | `ffmpeg` or `ffprobe` |
| `platform` | one of the five keys `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64` (`decision-record.md:56`) |
| `url` | the pinned `https` artifact for that platform |
| `redirectHost` | the one `https` host a redirect from `url` may land on, or `null` when the pinned host serves the file itself |
| `bytes` | the archive size in bytes |
| `sha256` | the pinned digest of the archive, lowercase hex |
| `binarySha256` | the pinned digest of the extracted binary, lowercase hex, checked after unpacking and again by the resolver before it runs the installed file (6.5) |
| `destination` | the file path inside the server data folder that step 4 of section 6.1 (`installed`) reads |

A platform outside the five has no pinned row. The call returns `INVALID_INPUT` with `parameter: "platform"`, the detected key and `reason: "unsupported-platform"` instead of guessing a build.

3. **Consent gate.** Without `consent: true` the call ends here and writes nothing. When at least one requested component is unresolved the result is `isError: true` with code `CONSENT_REQUIRED`, `details.action` is `download-ffmpeg` when the ffmpeg artifact is unresolved and `download-ffprobe` when only ffprobe is, and `details.downloads` carries the plan rows, so the caller can show the URL, the byte count and the digest before it asks the user. The section 5 example message names the next step: "Downloading an ffmpeg build needs explicit consent. Call media_setup_ffmpeg again to accept it." When every requested component resolved in step 1, the call is a plain success and no consent question arises, and a `consent: true` call with nothing missing downloads nothing and reports the same paths. `consent` is a caller assertion the server cannot verify, so the client is the gate: the tool description tells the caller to pass `consent: true` only after the user has seen the plan rows, and a client that auto-approves tool calls has removed that gate. The hard limits are the pinned URL, the two digests and the size cap below, which hold whatever the caller asserts.
4. **Download.** With `consent: true`, each planned artifact is fetched from its pinned URL with automatic redirects disabled. A row may name one `redirectHost`. A redirect from such a row is followed once, and only when its `Location` is an `https` URL on exactly that host; the second response must be 200 itself. Any other redirect, a second hop, or a redirect from a row with no `redirectHost` is `DOWNLOAD_FAILED` with `reason: "redirect"` before any body is read, so no host beyond the pinned URL's own and the one it names is ever contacted. GitHub release URLs answer 302 with a signed link on `release-assets.githubusercontent.com` that expires, so their rows name that host; the two digests below, not the host, are what make a file trusted. The body is streamed to a temp file beside its destination inside the server data folder and hashed while it arrives. A body whose SHA-256 differs from the pinned digest ends the call with `CHECKSUM_MISMATCH` (`expected`, `actual`, `url`) and the archive is discarded before any unpacking. A matching body is unpacked with the archiver its pinned row names, the binary is moved to `destination` and made executable where the platform has the concept, the install record `install.json` and the licence notices of section 10.5 are written beside it, and the temp file is removed. Nothing lands at `destination` before the hash matches. A connection error, any HTTP status other than 200, a failed write or an archive that does not unpack is `DOWNLOAD_FAILED` with `url`, `httpStatus` and `reason`. Five rules harden the step. The body is capped at the pinned `bytes`, and a longer body is `DOWNLOAD_FAILED` with `reason: "size-exceeded"`. The archive unpacks into a fresh directory the call created, and the extraction rejects an entry with an absolute path, a `..` segment, a symlink or a hard link. The unpacked binary's SHA-256 must equal `binarySha256` before it moves to `destination`, and a mismatch is `CHECKSUM_MISMATCH`. Only the one binary a row names moves out of the unpacked tree. The temp file and the fresh directory are removed in `finally` on every path.

**Output**: none of the media output classes apply. Setup takes no path parameter, needs no allowed roots, and creates no numbered folder (section 4). Its only writes are the archive temp file, the unpacked binary, the install record (section 6.5) and the licence notices (section 10.5), all inside the server data folder, which section 4 counts as a package asset and exempts from the root check. The structured result lists each component with `path` and `source`, where `source` names the lookup step that found it exactly as section 6 names it, plus `bytes` and `sha256` for a component that was installed by this call. From then on step 4 of the resolver (`installed`, section 6.5) returns the installed binary to every tool in this contract.

#### Error codes, gates and defects

The codes these four tools return, including the three download codes that belong to `media_setup_ffmpeg` alone, are listed in section 5 (codes by tool group). The encoders and filters each one checks are in section 8.2, and the source defects and gaps they close are in section 9.

## 4. Path policy

This section fixes where the server may read and write. It answers the path defects in inventory section G (listed in 4.5): no tool restricts a path today (G.3), the two sources disagree on overwrite behavior (G.5), the sources assume a working directory (G.6) and the platform's path quirks (G.7), and Imagician creates directory trees from caller strings (G.12).

The guard defined here is built in `002-server-foundation`, and every later phase uses it. Filter strings that carry a path are escaped by the helper in section 8. Binary paths come from the resolver in section 6. Section 6 also holds the full variable and argument table, and it must carry the four path entries defined here: `MEDIA_EDITOR_ALLOWED_DIRS`, `MEDIA_EDITOR_OUTPUT_DIR`, `--allowed-dir` and `--output-dir`.

Source shorthands: `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

The server touches four path classes, and each class has one rule:

| Class | Location | Rule |
|-------|----------|------|
| Inputs | Every path the caller names: media, subtitle files, overlay images, font files | Must resolve by real path inside an allowed root |
| Outputs | `<output folder>/NNN - <description>/` | Written only there, never onto an input |
| Temp | One private folder per run under the OS temp directory | Created and removed by the server, never a caller path |
| Package assets | The bundled font, the resolved binaries, the folder `media_setup_ffmpeg` writes into | Server-owned, exempt from the root check |

### 4.1 Allowed roots and the output folder

Allowed roots come from two sources and merge into one set:

- `MEDIA_EDITOR_ALLOWED_DIRS`, one string holding a list. Entries are separated by the platform path delimiter, `:` on macOS and Linux and `;` on Windows, and each entry is trimmed of surrounding whitespace. An empty entry is ignored.
- `--allowed-dir`, repeated once per root. A path that contains the delimiter character (a colon on macOS or Linux) can only be given this way or as a bare path.
- A bare path argument, one per root. This is the shape a bundle host produces when it expands a folder-list setting into one argument per folder (the MCPB `${user_config.KEY}` array expansion), so the manifest passes the list with no flag in front. An unknown `--` flag takes the token after it along as its value, so a mistyped flag never turns its path into a root.

Order is the argument entries first, `--allowed-dir` values and bare paths in the order given, then the variable entries, and duplicates collapse after canonicalization. Every root must be absolute. Each root is canonicalized at startup with the native real path call, so a root that is itself a symlink is fine. An entry that is not absolute, does not resolve, or resolves to a file is dropped, and `media_health` reports the roots that took effect so a dropped entry is visible instead of silent.

When no root remains, every tool with a path parameter fails with `CONFIG_MISSING`, naming `MEDIA_EDITOR_ALLOWED_DIRS` and `--allowed-dir`. There is no fallback to the process working directory, the user's home folder or the package folder. Tools without a path parameter, `media_health` and `media_setup_ffmpeg`, keep working.

The output folder is resolved from the first of these that is set:

1. `--output-dir`, last occurrence wins if the argument repeats.
2. `MEDIA_EDITOR_OUTPUT_DIR`.
3. The first allowed root.

It must be absolute and is canonicalized before the first write. The default of the first root keeps the whole loop inside the roots: an output from one run can be the input of the next. An output folder outside every root is legal (it is a write location, not a read location), with one consequence: its files can only be used as inputs again when the operator adds that folder as a root too. The output folder is created on demand with `recursive: true`.

### 4.2 Input resolution by real path

Every caller path goes through the same five steps before use, font files and subtitle files included:

1. The string must round-trip through UTF-8 (`Buffer.from(s, "utf8").toString("utf8")` equals the original), contain no NUL, and be absolute. A failure is `INVALID_INPUT` with `parameter`, `value` and a `reason` of `not-utf8`, `nul-byte`, `relative-path` or `windows-special-path`. On Windows a path with the `\\?\` or `\\.\` prefix (written with either separator, so `//?/` and `//./` count), or with a `:` anywhere past the drive letter (an alternate data stream), is `windows-special-path`, because those forms name a file the segment compare cannot see. A replacement character is never substituted for a path byte, because that would silently point at a different file. Relative paths are rejected for the same reason: the server's working directory belongs to the host application, not to the user's project (inventory G.6).
2. On Windows a UNC path (it starts with two separators, `\\`, `//` or one of each, and is neither an extended-length nor a device form) is first compared with the roots as a string, segment by segment, after the string is normalized so both separators fold to one and `.` and `..` segments resolve. No file system call is made for it. Canonicalizing a UNC path can open a network connection to a host the operator never chose, so a UNC path that no root names is `PATH_NOT_ALLOWED` with `outside-root` right there. Every other path, and a UNC path that a root names, is canonicalized with the native real path call, which resolves every symlink in every segment and returns the on-disk case. This also proves that the input exists. A canonicalization failure is `INPUT_NOT_FOUND`, with the failing path in `details`.
3. The real path is compared with each canonical root segment by segment. It is inside when it equals the root or begins with the root's full sequence of segments. A shared string prefix is not enough: root `/media` does not contain `/media-private`, and root `C:\media` does not contain `C:\media-private`.
4. The compare is byte-exact on every platform, after both sides are normalized to NFC. It never folds case, because the same platform can hold a case-sensitive volume (a case-sensitive APFS volume, a Linux mount on either system). The native real path call returns the on-disk case (Node's `fs.realpathSync.native` does on macOS, checked here, where the JS `fs.realpathSync` does not, and Windows is expected to from `GetFinalPathNameByHandle`), and each root is canonicalized the same way at startup, so a case variant of a root on a case-insensitive volume resolves to the root's own spelling and passes, and on a case-sensitive volume it is a different folder and fails. NFC normalization makes an NFD spelling and its NFC twin compare equal, and the tool opens the real path, never the normalized form.
5. A containment failure is `PATH_NOT_ALLOWED`, with the roots listed in `details.allowedRoots` and `details.reason` naming the case (`outside-root`, `sibling-prefix` or `symlink-target`, section 5), and the tool returns before it opens the file or starts a process.

Three consequences worth stating:

- A symlink anywhere in the path is resolved before the check, so a link that sits inside a root but points outside it fails. A root that is itself a symlink passes, because the root and the input are canonicalized the same way.
- Every entry of a list parameter (`video_concat` inputs, `video_add_b_roll` clip paths) is checked with the same steps. One entry outside the roots rejects the whole call before the output folder exists, so a run never performs half of its reads.
- The tool passes the real path this check returned to sharp or ffmpeg, never the caller's string, and the runner resolves each input again immediately before its spawn and compares the result with the first one. A different real path, such as a symlink swapped in after the first check, is `PATH_NOT_ALLOWED` with `reason: "changed-after-check"`. This narrows the window and does not close it, because the child opens the file itself, and the allowed roots are folders the operator chose.

### 4.3 Output folder, numbering and file names

A call that writes creates exactly one fresh folder and puts every one of its files inside it:

```text
<output folder>/NNN - <description>/
019 - compressed-hero-video/
```

The folder per call follows the Media Editor export naming (`AI Systems/Media Editor/AGENTS.md:40`, examples at `:52-53`), and it holds outputs even when the call writes a single file, so a later multi-file operation such as `video_hls_ladder` needs no special case. Tools that only read (`image_probe`, `media_probe`, `media_health`, `media_setup_ffmpeg`) create no folder.

**Numbering.** `NNN` is zero-padded to three digits and strictly increases. The server scans the output folder for names matching `NNN - `, takes the highest number present and adds one. A gap left by a deleted folder is not filled, so a number is never reused (spec risk R-004). The folder is then created with `fs.mkdirSync(path)` without `recursive`, which fails with `EEXIST` on anything that already owns the name, a stale folder and a foreign symlink included. On `EEXIST` the run increments and retries, so two concurrent runs can never enter the same folder and the race is settled by the file system, not by a check. The retry is bounded at 100 attempts, after which the call fails the way an unusable folder does (`CONFIG_MISSING`, `reason: "unusable"`), so a hostile or full folder cannot hold a call in a loop. Any other creation failure is `CONFIG_MISSING` with `setting: "outputFolder"` and `reason: "unusable"`, because the configured output folder cannot take a new folder and only the operator can fix that. Past `999` the width grows to four digits, and numbers compare by value, never as strings. A failed run removes the folder it created, so a failed run leaves no partial output behind.

**Description and slug.** The description text is the `outputName` every writing tool requires (section 1.4). Its schema already rejects path separators and anything over 64 characters, and the server slugs the text before use:

- Lowercase, ASCII only. Each run of white space becomes one `-`, and every other character outside `a-z`, `0-9` and `-` is dropped, which covers dots, quotes, colons and non-ASCII letters.
- Runs of `-` collapse to one, and both ends are trimmed.
- The slug is cut to 60 characters, then a trailing `-` left by the cut is trimmed.
- An empty result is rejected with `INVALID_INPUT` (`parameter: "outputName"`, `reason: "empty-slug"`) before any folder exists.
- A Windows device name (`con`, `prn`, `aux`, `nul`, `com1` to `com9`, `lpt1` to `lpt9`) gets `-out` appended, because those names cannot be created on Windows.
- The slug is one path segment by construction, so the folder name cannot leave the output folder, and two calls with the same description get different numbers.

**File names.** A generated file name is the input's base name plus the operation (`hero-compressed.jpg`), cut to 120 UTF-8 bytes at a code point boundary, so no multi-byte character is split, with the extension kept, which stays well under the 255-byte segment limit of mainstream file systems.

**Writes fail closed.** Inputs are opened read-only and are never deleted, renamed or truncated. Every ffmpeg command carries `-n`, the process-level expression of this rule (section 8 repeats it for intermediates). Image writes open the target with `fs.open(path, 'wx')`, an exclusive create that fails on anything already there, a symlink included. Sharp encodes to a buffer and the buffer is written through that handle, so a file swapped in between a check and the write is never followed, and an `EEXIST` is `OUTPUT_EXISTS` with `stage: "run"`. Before the folder is created, and again before each file is written, the guard compares the planned output path against every input path: no output may equal an input path, and no output may sit inside an input path. A match is refused with `OUTPUT_EXISTS` (`stage: "pre-check"`, `details.input` naming the input it collides with) and the input stays untouched, even when a symlink was swapped in after the folder was created. The reread before each write is what gives the check teeth, because the folder creation and the writes are two separate steps.

### 4.4 Adversarial cases

| Case | Input | Expected result | Error code |
|------|-------|-----------------|------------|
| Traversal that exits the roots | `inputPath = "/roots/media/../secret.png"` | Rejected before any read or write, no output folder is created | `PATH_NOT_ALLOWED`, `outside-root` |
| Traversal that stays inside | `inputPath = "/roots/media/clips/../clip.mp4"` | Accepted, the real path is `/roots/media/clip.mp4` | none |
| Sibling folder with a shared string prefix | Root `/media`, `inputPath = "/media-private/pic.png"` | Rejected, containment compares whole segments | `PATH_NOT_ALLOWED`, `sibling-prefix` |
| Symlink inside a root that points outside | `/roots/media/link.png` pointing at `/elsewhere/secret.png` | Rejected, the check runs on the real path | `PATH_NOT_ALLOWED`, `symlink-target` |
| Root that is itself a symlink | Root `/data/media` pointing at `/mnt/big/media`, `inputPath = "/data/media/pic.png"` | Accepted, root and input are canonicalized the same way | none |
| Absolute path outside every root | `inputPath = "/other/file.png"` | Rejected | `PATH_NOT_ALLOWED`, `outside-root` |
| Relative path | `inputPath = "clip.mp4"` | Rejected, the host application's working directory is not the user's folder | `INVALID_INPUT`, `relative-path` |
| Windows drive letter inside the roots | Root `C:\media`, `inputPath = "C:\media\a.mp4"` | Accepted, the compare handles the drive letter as a segment | none |
| Windows drive letter outside the roots | Root `C:\media`, `inputPath = "D:\clips\a.mp4"` | Rejected | `PATH_NOT_ALLOWED`, `outside-root` |
| UNC path | `inputPath = "\\server\share\a.mp4"` or `"//server/share/a.mp4"` on Windows | Rejected unless a root names the same share, compared as a string before any file system call | `PATH_NOT_ALLOWED`, `outside-root` |
| Case-insensitive volume | Root `C:\Media`, `inputPath = "c:\media\pic.png"` on Windows or macOS | Accepted, both sides are canonicalized to the on-disk case before the byte-exact compare | none |
| Case-sensitive volume on macOS or Windows | Root `/Volumes/Data/Media` on a case-sensitive volume, `inputPath = "/Volumes/Data/media/pic.png"` | Rejected when `media` is a different folder, the compare never folds case | `PATH_NOT_ALLOWED`, `outside-root` |
| Unicode normalization | Root `/roots/café` stored NFC, `inputPath` spelled NFD | Accepted, both sides are NFC-normalized for the compare and the tool opens the real path | none |
| Windows extended-length or stream path | `inputPath = "\\?\C:\media\a.mp4"` or `"C:\media\a.mp4:stream"` on Windows | Rejected before any file system call | `INVALID_INPUT`, `windows-special-path` |
| Path swapped after the check | A symlink replaced by one that points outside the roots between the first check and the spawn | Rejected at the re-resolve before the child starts | `PATH_NOT_ALLOWED`, `changed-after-check` |
| Output name with path separators | `outputName = "../../Pictures/evil"` | Rejected by the schema before the handler runs, no folder is created | protocol error `-32602` (section 5) |
| Output name with punctuation | `outputName = "Pictures: evil!"` | Slugged to `pictures-evil`, created as `017 - pictures-evil` directly under the output folder | none |
| Output name with no slug left | `outputName = "!!!"` | Rejected before any folder exists | `INVALID_INPUT`, `empty-slug` |
| Output equal to or inside an input path | A planned target that resolves onto an input file, or a fresh folder that resolves inside an input directory | Write refused before the file is opened, the input stays byte-identical | `OUTPUT_EXISTS`, `pre-check` |
| Very long output name | A 300 character `outputName` | Rejected by the schema, which caps it at 64 characters | protocol error `-32602` (section 5) |
| Non-UTF-8 name, NUL, or a lone surrogate | A JSON string with a lone surrogate, a Linux file name whose bytes are not valid UTF-8, or a string containing `\u0000` | Rejected before any file system call, no replacement character is substituted | `INVALID_INPUT`, `not-utf8` or `nul-byte` |
| Joined input list with one entry outside | `video_concat inputPaths = ["/roots/a.mp4", "/etc/passwd"]` | Whole call rejected before the output folder exists, no entry is read | `PATH_NOT_ALLOWED`, `outside-root` |
| No root configured | Any tool with a path parameter, roots empty | Fails naming `MEDIA_EDITOR_ALLOWED_DIRS` and `--allowed-dir`, no fallback to the working directory or the home folder | `CONFIG_MISSING` |
| Output folder not configured | Roots `/roots/media` | Output folder is `/roots/media`, the numbered folder is created on demand | none |
| Output folder not writable | Output folder on a read-only volume | Fails before any ffmpeg run | `CONFIG_MISSING`, `unusable` |

The drive-letter and UNC rows describe a Windows host. On macOS and Linux those strings are relative paths, so they fail step 1 as `INVALID_INPUT` with `relative-path`. A doubled forward slash such as `//server/share/a.mp4` is an ordinary absolute path there and takes the real path call.
| Name containing a quote or a colon, file inside a root | `inputPath = "/roots/media/it's a clip.mp4"` | Path stays legal. The argv array carries it as one element, the section 8.5 helper carries it inside a filter value, and no caller name is written into a concat list | none |

Every code above comes from the section 5 list, and the second word in a code cell is the `details.reason` (or `stage`) value that tells the cases apart. The path set is `CONFIG_MISSING`, `PATH_NOT_ALLOWED`, `OUTPUT_EXISTS`, `INVALID_INPUT` and `INPUT_NOT_FOUND`.

### 4.5 Defects this section closes

The path-side defects this section closes, G.2 to G.7 and G.12, are listed with their evidence in section 9.

## 5. Error model

A tool call ends in one of three ways:

- **Success**: a normal result with the text summary and the structured outputs of section 7. `isError` is false or absent.
- **Tool failure**: a result with `isError: true` and a structured body `{ code, message, details }` under `structuredContent`. The `content` array holds one line, `"<code>: <message>"`, so a text-only client still shows the machine code.
- **Protocol error**: a JSON-RPC error raised by the SDK before any handler runs. Only two triggers produce one, both listed below.

Three rules keep the failure channel predictable:

1. Every failure maps to exactly one code from the list below. One shared helper picks the most specific code that fits, so no tool invents a code of its own.
2. `message` is one plain sentence for the user. `details` is always a JSON object, `{}` when a code has nothing more to add, and it never carries more stderr than the capped tail (4 KB, sanitized, see section 8.4). A cleanup that could not remove a path adds `leftover`, the list of those paths, to the error that caused the cleanup and never replaces that error (8.4).
3. A test asserts `structuredContent.code`, never a message substring. Wording stays free to change in later phases without breaking a suite.

### The fixed code list

Phase 2 writes this object as the single source for the codes, and the type is derived from it, not retyped:

```ts
export const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  PATH_NOT_ALLOWED: "PATH_NOT_ALLOWED",
  CONFIG_MISSING: "CONFIG_MISSING",
  INPUT_NOT_FOUND: "INPUT_NOT_FOUND",
  OUTPUT_EXISTS: "OUTPUT_EXISTS",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  FFMPEG_NOT_FOUND: "FFMPEG_NOT_FOUND",
  FFPROBE_NOT_FOUND: "FFPROBE_NOT_FOUND",
  CAPABILITY_MISSING: "CAPABILITY_MISSING",
  PROCESS_FAILED: "PROCESS_FAILED",
  PROCESS_TIMEOUT: "PROCESS_TIMEOUT",
  CONSENT_REQUIRED: "CONSENT_REQUIRED",
  DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
  CHECKSUM_MISMATCH: "CHECKSUM_MISMATCH",
  INTERNAL: "INTERNAL"
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
```

One row per code.

| Code | When | Details fields | Example message |
|------|------|----------------|-----------------|
| `INVALID_INPUT` | A value passes the zod schema but fails a handler check against the file or between fields: a crop region that does not fit the image, an end time at or before the start time, an empty clip list, a time, colour or ratio string that passes its field pattern and then fails a handler check. Also a path string that is not valid UTF-8, holds a NUL, is relative or is a Windows extended-length or stream path (section 4.2), a caller text value holding a control character the filter escaper refuses (8.5, `reason: "control-character"`), and an `outputName` that leaves no slug (section 4.3) | `parameter`, `value`, `reason` | crop region does not fit the 1920x1080 image (left + width is 2100) |
| `PATH_NOT_ALLOWED` | The real path leaves every allowed root: a direct outside path, a sibling folder that only shares a text prefix (`/media` against `/media-private`), or a symlink whose target escapes its root. A symlink whose target escapes its root returns `PATH_NOT_ALLOWED` with `reason: "symlink-target"`, and an input whose real path differs between the first check and the re-resolve before its spawn returns `reason: "changed-after-check"` (4.2) | `path`, `realPath`, `allowedRoots`, `reason` (`outside-root`, `sibling-prefix`, `symlink-target`, `changed-after-check`) | Path is outside the allowed roots: /tmp/clip.mp4 |
| `CONFIG_MISSING` | The extension config has no allowed roots or no output folder, so a file tool cannot decide where a read is legal or where an output belongs. Also an output folder that is set but cannot take a new numbered folder: a read-only volume, a permission error, a path that is a file (section 4.3). No fallback to the working directory, and nothing is written | `setting` (`allowedRoots` or `outputFolder`), `tool`, `reason` (`unset` or `unusable`) | No allowed roots are configured. Set them in the extension settings. |
| `INPUT_NOT_FOUND` | An input path that passed the path policy does not exist or is not a regular file. Also a subtitle file, overlay image or font file named by a parameter | `path`, `role` (`input`, `subtitle`, `overlay-image`, `font`) | Input file not found: /media/clips/intro.mp4 |
| `OUTPUT_EXISTS` | The target output file exists when the tool checks, or appears between that check and the run: `-n` refuses to overwrite it for ffmpeg, and the exclusive create refuses it for an image write. The run helper records the path's state before the spawn, so the mapping never parses ffmpeg's wording. Also a planned output that resolves onto an input path or inside one (section 4.3), with `stage: "pre-check"` and `input` set | `path`, `stage` (`pre-check` or `run`), `input` when the collision is with an input | Output already exists and is never overwritten: /media/exports/001 - trim/clip.mp4 |
| `UNSUPPORTED_FORMAT` | The file's real content does not match what the tool accepts: a video tool given an audio-only file, an image tool given a video, or streams that cannot be mapped to the accepted set. Detection reads ffprobe streams, not the file extension. Also a file a content gate refuses: an image input whose first bytes are not a raster signature or whose pixel count is over the limit (3.1), a playlist or scripting container given to any tool that reads media (8.3), a subtitle file that is not SubRip (3.3.2) | `path`, `detected`, `accepted`, and `reason` when a gate refused the file (`image-content`, `image-pixel-limit`, `indirection-container`, `not-subrip`, and `container` for an audio container outside the 3.2.1 table) | video_trim needs a video stream, and this file has audio only. |
| `FFMPEG_NOT_FOUND` | No usable ffmpeg was found at any of the four lookup steps of section 6.1: `MEDIA_EDITOR_FFMPEG_PATH`, the bundled `ffmpeg-static` binary, system `PATH`, the data folder `media_setup_ffmpeg` fills. Also a set override that names a broken binary, which stops the lookup at step 1 (section 6.2). The message names `media_setup_ffmpeg` as the next step, or the variable to fix for a broken override | `lookedIn`, `envVar`, `nextStep` | ffmpeg was not found. Run media_setup_ffmpeg to install a bundled build. |
| `FFPROBE_NOT_FOUND` | The same four steps and the same override rule for `ffprobe`, for any tool that probes a file or reads stream metadata | `lookedIn`, `envVar`, `nextStep` | ffprobe was not found. Run media_setup_ffmpeg to install a bundled build. |
| `CAPABILITY_MISSING` | The resolved binary runs but lacks an encoder or filter the tool needs (`libx264`, `aac`, `libmp3lame`, `drawtext`, `subtitles`, `xfade`). The check runs before the command starts, so a missing filter never shows up as a failed encode | `binary`, `kind` (`encoder` or `filter`), `name`, `neededBy` | The resolved ffmpeg has no drawtext filter, which video_add_text_overlay needs. |
| `PROCESS_FAILED` | ffmpeg or ffprobe ran and exited non-zero, and no more specific code fits (a damaged stream, a filter graph ffmpeg rejected, a codec error). Also a run that exited 0 and left a promised output missing or empty (the output check of 8.4), because ffmpeg exits 0 after `Failed to open file`. The partial output and the temp folder are removed before the result returns. Also a run that exited 0 and left an MP4, M4A or M4V file holding a PCM or FFV1 stream (3.2, rule 5), with `exitCode` `0`. Also a binary that resolved but would not start (deleted since the lookup, no execute bit, wrong CPU type): the server looks the binary up once more and returns this only when the second start fails as well, with `exitCode` `-1` and `spawnFailed` `true` | `binary`, `exitCode`, `signal`, `stderrTail`, and only when they apply `spawnFailed`, `spawnCode` (the system's error code for a child that never started) | ffmpeg exited with code 1 while reading the input. |
| `PROCESS_TIMEOUT` | A run passed its timeout (1800 seconds by default, `MEDIA_EDITOR_TIMEOUT_SECONDS` changes it). The process is killed, the partial output and the temp folder are removed, then this result returns | `binary`, `timeoutSeconds`, `elapsedSeconds` | ffmpeg did not finish within 1800 seconds and was stopped. |
| `CONSENT_REQUIRED` | `media_setup_ffmpeg` was asked to fetch a build without the caller accepting the download on the call, so nothing was downloaded and no file was written | `action` (`download-ffmpeg` or `download-ffprobe`) | Downloading an ffmpeg build needs explicit consent. Call media_setup_ffmpeg again to accept it. |
| `DOWNLOAD_FAILED` | The consented download failed partway: a connection error, an HTTP status other than 200, a body longer than the pinned size (`reason: "size-exceeded"`), an archive entry with an absolute path, a `..` segment or a link, or a body that is not the expected archive. Nothing is installed and the temp file and extraction directory are removed | `url`, `httpStatus`, `reason` | The ffmpeg download failed with HTTP 403. Nothing was installed. |
| `CHECKSUM_MISMATCH` | The downloaded archive failed its pinned SHA-256 check, or the binary unpacked from it failed its pinned `binarySha256` check. The archive or the unpacked file is discarded before anything moves, so a half-verified binary never reaches the install folder | `expected`, `actual`, `url`, `subject` (`archive` or `binary`) | The downloaded archive failed its checksum check and was discarded. |
| `INTERNAL` | An unmapped error reached the handler boundary, which converts it instead of letting the SDK turn it into a protocol error. The last resort when no other code fits | `tool`, `cause`, or `reason` when the runner refuses a call that broke its own rule (`relative-binary`, a binary path that is not absolute) | Unexpected server error in media_probe. Report it if it repeats. |

### Protocol errors

| Trigger | JSON-RPC error | Who raises it |
|---------|----------------|---------------|
| A call names a tool that is not registered | `-32601`, method not found | The server's own `tools/call` handler, before dispatch. The Imagician source already sent this for its unknown-tool branch (`imagician/src/index.ts:445-449`) |
| Arguments fail the zod schema of a registered tool (wrong type, missing required field, a value outside an enum or range) | `-32602`, invalid params | The server's own `tools/call` handler, which validates each call against the tool's schema before the tool handler runs |

The SDK's `McpServer` (1.31) does not raise either code on its own: it catches an unknown tool name and a schema failure and returns them as a plain `isError` result with no code. The server therefore replaces the SDK's call handler with one that raises both as protocol errors, so these two rows hold and a client can tell a malformed call from a failed one.

No third trigger exists. A failure inside a running tool never becomes a protocol error: the shared handler wrapper catches what it can reach and maps it to a code from the list, with `INTERNAL` as the last resort.

### How the sources fail

The two sources disagree about what a failure is, and both choices cost the caller something.

- Imagician raises protocol errors for everything. Its one catch block turns any non-MCP error into `new McpError(ErrorCode.InternalError, "Image processing error: ...")` (`imagician/src/index.ts:451-459`). A missing input, a crop region that does not fit and a sharp bug all arrive as the same internal error, told apart only by the English of the message.
- Video-audio never throws for a tool failure. `extract_audio_from_video` returns `f"Error extracting audio: {error_message}"` as an ordinary string (`vam/server.py:36`), so success and failure share one type and the `isError` flag stays false for both. The suite separates them by matching words: `assert "Audio extracted successfully" in result` (`vam/tests/test_video_functions.py:134`), which breaks on any rewording.

The merged server replaces both conventions. A failure comes back as a readable result rather than a protocol error, and that result carries a code, so a client branches on `structuredContent.code` and a test asserts the same field. Message wording never appears in a test.

### Worked error result

A call to `video_trim` with a schema-valid path that does not exist returns:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "INPUT_NOT_FOUND: Input file not found: /media/clips/intro.mp4"
    }
  ],
  "structuredContent": {
    "code": "INPUT_NOT_FOUND",
    "message": "Input file not found: /media/clips/intro.mp4",
    "details": {
      "path": "/media/clips/intro.mp4",
      "role": "input"
    }
  }
}
```

Every code in the list has an owner. Section 4 owns the checks behind `PATH_NOT_ALLOWED`, `CONFIG_MISSING` and `OUTPUT_EXISTS`, section 6 owns the lookup that raises `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND`, and section 8 owns the checks that raise `CAPABILITY_MISSING`, `PROCESS_FAILED` and `PROCESS_TIMEOUT`. The remaining codes sit with the tool rows that return them, listed in the table below: `INVALID_INPUT`, `INPUT_NOT_FOUND` and `UNSUPPORTED_FORMAT` across section 3, and `CONSENT_REQUIRED`, `DOWNLOAD_FAILED` and `CHECKSUM_MISMATCH` in `media_setup_ffmpeg` alone. `002-server-foundation` builds the shared error helper and the object above, phases `003-image-tools` to `006-probe-repair-hls` return these codes from their tools and assert them in tests, and `008-claude-code-plugin` ships `media_setup_ffmpeg` and its download codes.

### Codes by tool group

This table is the only list of which tool returns which code. Section 3 describes each tool's behavior and points here. "Path tools" means every tool with a path parameter (`inputPath`, `inputPaths`, `subtitlePath`, `imagePath`, `textElements[].fontPath`, `clips[].clipPath`), which is every tool except `media_health` and `media_setup_ffmpeg`. "Writing tools" means every path tool except `image_probe` and `media_probe`.

| Code | Returned by | Tool-specific triggers |
|------|-------------|------------------------|
| `INVALID_INPUT` | Path tools, plus `media_setup_ffmpeg` | Any path tool: a path string that fails section 4.2 step 1, an `outputName` with no slug left (4.3). Image tools (3.1): a resize call with neither `width` nor `height` (`reason: "dimension-required"`), a crop region that does not fit the image, two `sizes` entries sharing a suffix. Conversion tools (3.2): `endTime` at or before `startTime`. A time string that does not parse, a ratio or resolution side outside its range and a speed factor outside its range fail the schema instead, as protocol error `-32602`. Composition tools (3.3): a `transition` with other than two clips (`video_concat`, `vam/server.py:972-973`), an empty clip list or a `scale` given with `fullscreen` (`video_add_b_roll`), no stretch left after silence removal (`media_remove_silence`, `vam/server.py:1182-1183`), a fade longer than the video (`video_add_fade`). New tools (3.4): a repeated `rungs` entry, or every requested rung taller than the source's shorter side (`reason: "larger-than-source"`) (`video_hls_ladder`), a host platform with no pinned build (`media_setup_ffmpeg`, `parameter: "platform"`, `reason: "unsupported-platform"`) |
| `PATH_NOT_ALLOWED` | Path tools | Any path parameter whose real path leaves every allowed root (4.2), or whose real path changed between the first check and the re-resolve before the spawn (`changed-after-check`). One entry of a list parameter outside the roots rejects the whole call (4.2) |
| `CONFIG_MISSING` | Path tools | No allowed roots (4.1), or an unusable output folder (4.3). `media_health` and `media_setup_ffmpeg` take no path and keep working (4.1) |
| `INPUT_NOT_FOUND` | Path tools | The resolved input is not a readable file. The source's `FileNotFoundError` branches were the ones that never fired, because ffmpeg reported the failure first (inventory G.10 at `../context/source-inventory.md:254`). Role `subtitle` for `video_add_subtitles`, `overlay-image` for `video_add_image_overlay`, `font` for `video_add_text_overlay` |
| `OUTPUT_EXISTS` | Writing tools | The image tools create the planned file exclusively (`wx`) and map an `EEXIST` to this code (4.3). The ffmpeg tools check before the spawn and map a collision during the `-n` run through `stage` (8.4). Any writing tool refuses a planned output on or inside an input (4.3) |
| `UNSUPPORTED_FORMAT` | Every tool that reads media | Image tools: the first bytes are not a JPEG, PNG, WebP, GIF, TIFF or AVIF signature (`reason: "image-content"`, so an SVG or a PDF stops here), the declared pixels are over 100 Mpx (`image-pixel-limit`), sharp cannot decode the file, for example a video or an audio file, and `image_compress` given a format outside jpeg, png, webp and avif, with `accepted` naming the four. Conversion tools: a video tool given a file with no video stream, an audio tool given one with no audio stream, a container outside the tables of 3.2.1, a playlist or scripting container (`indirection-container`, 8.3). Composition tools: a video tool given a file with no video stream, `media_remove_silence` given a file with no audio stream, `video_add_subtitles` given a subtitle file that is not SubRip (`not-subrip`, 8.3). New tools: `media_repair` given a file whose diagnosis read no video and no audio stream (`accepted: ["video", "audio"]`), `video_hls_ladder` given one with no video stream |
| `FFMPEG_NOT_FOUND` | Every tool that runs ffmpeg: rows 10 to 35, `media_repair` and `video_hls_ladder` | The section 6 lookup fails. `media_health` reports a missing binary as data instead (3.3.9), and the image tools and `media_probe` never ask for ffmpeg |
| `FFPROBE_NOT_FOUND` | Every tool that probes its input: the conversion and composition tools that read streams before a run (3.2 rule 4, 3.3), `media_probe`, `media_repair` and `video_hls_ladder` | The section 6 lookup fails. A read-back after a successful run that cannot find ffprobe is a warning, never this code (7.2) |
| `CAPABILITY_MISSING` | Every tool with a non-empty row in section 8.2 | A name its command needs is absent from the resolved build, checked before the command that needs it starts (8.2) |
| `PROCESS_FAILED` | Every tool that runs ffmpeg or ffprobe | A run exited non-zero and no more specific code fits, or exited 0 with a promised output missing (8.4) or with an MP4-family file holding PCM or FFV1 (3.2, rule 5). For a two-attempt tool this comes after the second attempt, with `stderrTail` holding the two tails joined and capped at 4 KB (3.2 rule 5, section 8.4). `media_probe` returns it for a file ffprobe cannot read and names `media_repair` as the next step (3.4). `media_repair` returns it when every pass failed. A build without the concat demuxer fails here (8.1) |
| `PROCESS_TIMEOUT` | Every tool that runs ffmpeg or ffprobe | A run passed `MEDIA_EDITOR_TIMEOUT_SECONDS`, 1800 by default. The process is killed, the partial output and the temp folder are removed, then this result returns (8.4) |
| `CONSENT_REQUIRED` | `media_setup_ffmpeg` alone | A requested component stays unresolved and the call did not accept the download (3.4) |
| `DOWNLOAD_FAILED` | `media_setup_ffmpeg` alone | The consented fetch failed: a redirect other than the one hop the pinned row allows, any status other than 200, a connection error, a failed write, a body past the pinned size, an unsafe archive entry, or an archive that will not unpack (3.4) |
| `CHECKSUM_MISMATCH` | `media_setup_ffmpeg` alone | The downloaded body failed the pinned archive SHA-256 check and was discarded before unpacking, or the unpacked binary failed its pinned `binarySha256` check and was discarded before the move (3.4) |
| `INTERNAL` | Every tool | An unmapped error reached the handler boundary. On the image side the source wrapped every failure into one `McpError` (`imagician/src/index.ts:451-459`), and on the video-audio side it returned one catch-all `An unexpected error occurred` string (`vam/server.py:39-40` and each tool's last branch) |

## 6. ffmpeg and ffprobe resolution

Most of the 39 tools run a child process, and every one of those processes needs a binary that neither source ever looks for. Video-audio spawns the bare names `ffmpeg` and `ffprobe` and assumes both are on `PATH` (`vam/server.py:892,1429`), its suite states the same requirement (`vam/tests/test_video_functions.py:58,97`), and its probe helper goes through `ffmpeg.probe` (`vam/server.py:1237-1240`, `../context/source-inventory.md:226`). On a machine without ffmpeg that assumption yields either an unattributed failure or an error string that names nothing useful (inventory G.7 and G.10, `../context/source-inventory.md:251,254`). The skill behaves better but still ends the work: it treats a failed `ffmpeg -version` as a full stop with install guidance (`skill/SKILL.md:261`, `skill/SKILL.md:266`). This section keeps that honesty and removes the dead end. It fixes one ordered lookup, run separately for each binary, plus every variable and argument that feeds it. AC-005 is what this section is checked against.

`002-server-foundation` builds the resolver and the cache, `006-probe-repair-hls` and every media tool call it, `007-desktop-extension` packs the bundled pair, and `008-claude-code-plugin` passes the variables through its plugin config.

Boundaries: section 5 owns `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND`, the codes this lookup raises. Section 4 owns the allowed roots, the output folder and the rule that this table carries `MEDIA_EDITOR_ALLOWED_DIRS`, `MEDIA_EDITOR_OUTPUT_DIR`, `--allowed-dir` and `--output-dir` (the entries in 6.8). Section 8 owns the capability checks and the per-run timeout that run against the resolved paths. Section 3 owns the `media_setup_ffmpeg` schema, and the phase spec leaves the manifest and plugin fields that pass these values to phases 7 and 8, which reuse the names unchanged (`spec.md:96`, `plan.md:89`).

### 6.1 The lookup order

ffmpeg and ffprobe are resolved independently. They have separate variables, separate steps and separate cache entries, and resolving one never resolves the other. A tool asks for the binary it needs and no more, so the eight `image_*` tools, which run through sharp, need neither binary and keep working on a machine with no ffmpeg at all.

Both binaries follow the same four steps, in this order:

| Step | ffmpeg candidate | ffprobe candidate | Accepted when | Recorded source |
|------|------------------|-------------------|---------------|-----------------|
| 1 | `MEDIA_EDITOR_FFMPEG_PATH` | `MEDIA_EDITOR_FFPROBE_PATH` | the value is an absolute path to an existing regular file, the file is executable and it answers `-version` | `env-override` |
| 2 | the path the `ffmpeg-static` package exports | the path the `ffprobe-static` package exports | the export is a non-empty string and names an existing executable file that answers `-version` | `bundled` |
| 3 | `ffmpeg` in each `PATH` entry, in order (`ffmpeg.exe` on Windows) | `ffprobe` in each `PATH` entry, in order (`ffprobe.exe` on Windows) | the first entry whose file exists, is executable and answers `-version` | `system-path` |
| 4 | `<data dir>/bin/ffmpeg` (`ffmpeg.exe` on Windows) | `<data dir>/bin/ffprobe` (`ffprobe.exe` on Windows) | the file exists, is executable, answers `-version`, and its SHA-256 matches both the install record beside it and the `binarySha256` the server pins for this platform (6.5) | `installed` |

Steps 2 to 4 fall through to the next step when their candidate is unusable, because a missing candidate is the normal case the order is built for. Step 1 does not fall through, for the reason 6.2 gives. The two binaries need not come from the same step: a system ffmpeg beside an installed ffprobe is a valid pair, and each source is recorded on its own.

`-version` is the acceptance test at every step, run once per candidate, because a file that exists is not yet a working binary. A binary that cannot print its version within ten seconds is treated as unusable at steps 2 to 4 and as a broken override at step 1. The first line of that output is the version string, the form the skill's own check reads (`skill/SKILL.md:262`, `skill/assets/hls-video-conversion.md:192`). That line must also begin with `ffmpeg version ` (`ffprobe version ` for the probe), the shape every ffmpeg build prints, so an executable that only prints some line is not accepted and cached as ffmpeg. This is an identity sanity check, not authentication: a hostile binary can print the same words, and only step 4 compares a digest. A candidate that will not start at all counts the same as one that cannot print its version: an `ENOEXEC`, a `bad CPU type` or an `EACCES` at spawn (an x86_64 file on an Apple Silicon Mac with no Rosetta fails this way) makes the candidate unusable at steps 2 to 4 and a broken override at step 1.

### 6.2 Step 1: the override variables

`MEDIA_EDITOR_FFMPEG_PATH` and `MEDIA_EDITOR_FFPROBE_PATH` name one binary file each. They exist so a user with a fuller build, one that carries libass or libx265 where the bundled build does not (inventory F.3 and F.5, `../context/source-inventory.md:217,221`), can point the server at it without touching its code.

The value must be absolute, must name an existing regular file, must be executable, and must answer `-version`. A value that fails any of those produces a hard failure naming the variable, and the lookup stops there:

```text
FFMPEG_NOT_FOUND   (FFPROBE_NOT_FOUND for MEDIA_EDITOR_FFPROBE_PATH)
details: { "lookedIn": ["env-override: /opt/tools/ffmpeg does not exist"], "envVar": "MEDIA_EDITOR_FFMPEG_PATH",
           "nextStep": "fix or unset MEDIA_EDITOR_FFMPEG_PATH" }
message: "MEDIA_EDITOR_FFMPEG_PATH names /opt/tools/ffmpeg, which does not exist."
```

The lookup does not continue to steps 2 to 4. A user who set the variable stated which binary to run, and running a different one instead hides the mistake until a run fails much later, with a capability error or wrong output that no longer points at the cause. Contrast this with the `MEDIA_EDITOR_TIMEOUT_SECONDS` and `MEDIA_EDITOR_LOG_LEVEL` rules in 6.8: those two have a safe default and a warn line, while a binary override has no safe substitute.

An empty or whitespace-only value is not a broken override. It counts as unset, because a manifest that leaves an unfilled field behind passes an empty string, and the lookup then starts at step 2.

### 6.3 Step 2: the bundled binaries

`ffmpeg-static` and `ffprobe-static` each export the path of a binary that ships with the package, so a packed bundle carries its own pair. This is the step that removes the `PATH` assumption for the common case, and it also removes the install instructions the skill has to hand out today (`skill/SKILL.md:266`).

The exported value is checked before it is used, because the package can return a null or empty value on a platform it has no build for, and because an install with scripts disabled has no binary behind the exported path. Either case falls through to step 3, which is the case the whole order is built for. Three further rules apply:

- The resolver never downloads anything and never runs a package manager. Installing a build is `media_setup_ffmpeg`'s job, after consent (6.5).
- The bundled pair is read only. Nothing is written beside it, because the package folder can be read only after installation.
- The pack step must keep the pair for the target platform inside the bundle. A bundle that pruned its own binaries lands on step 3 for every user, and the size checks in phase 7 are the place that fact is caught.

The ffprobe half of the pair does not hold on every platform, and this was observed rather than assumed. `ffprobe-static` 3.1.0 ships binaries for `darwin/x64`, `darwin/arm64`, `linux/ia32`, `linux/x64`, `win32/ia32` and `win32/x64` only. Its `darwin/arm64` file is an x86_64 Mach-O executable, so on an Apple Silicon Mac it runs only where Rosetta 2 is installed and otherwise fails to launch. It has no `linux/arm64` binary, so the path it exports there names a file that does not exist. Both cases fail the step 2 acceptance test and fall through to step 3, which is the behaviour this order was built for. The consequence sits in phase 7, not here: two of the five bundles (`darwin-arm64`, `linux-arm64`) need a different source for a native ffprobe, or they resolve one from `PATH` or through `media_setup_ffmpeg`. The package also carries all six binaries, about 330 MB, so each platform bundle must prune the other five (the 150 MB per-bundle budget in `../007-desktop-extension/spec.md:136` counts a pruned pair, not the package as installed).

The pinned `ffmpeg-static` 5.3.0 build for `darwin-arm64` was run on 2026-09-28 (`ffmpeg version 6.0`, configured `--enable-gpl --enable-version3 --enable-nonfree`). Its filter list carries `drawtext`, `subtitles`, `ass`, `xfade`, `acrossfade`, `fade`, `overlay`, `select`, `aselect`, `atempo`, `silencedetect`, `pad`, `crop` and `scale`, and its encoder list carries `libx264`, `libx265`, `aac`, `libmp3lame`, `libopus`, `libvpx`, `libvpx-vp9`, `libaom-av1` and `libvorbis`. That settles the presence questions for this one platform. The other four builds are still unverified, and the capability gate in 8.1 covers them either way.

Whether a given bundled build carries libass, libx265 or libvpx is not evidenced by the sources (inventory F.3 and F.5, `../context/source-inventory.md:217,221`). That is a capability question, not a resolution question, and section 8 owns it. The licence obligations of shipping an ffmpeg build are section 10's.

### 6.4 Step 3: the system PATH

The lookup splits `PATH` on the platform's path delimiter and checks the entries in order, taking the first file that exists and is executable: `ffmpeg` or `ffprobe` on macOS and Linux, `ffmpeg.exe` or `ffprobe.exe` on Windows. This step is where a user's own install is found, which is the situation both sources and the whole skill assume for every run.

Two rules keep the step honest:

- The entries are read and checked directly. The server never runs `which`, `where`, or any other lookup program, because it spawns nothing through a shell (inventory G.1, `../context/source-inventory.md:238`) and a shell-built answer is not checkable.
- An empty entry is skipped, never treated as the process working directory. On macOS and Linux an empty `PATH` entry means the current directory, and that directory belongs to the host application (inventory G.6, `../context/source-inventory.md:250`).

### 6.5 Step 4: the data folder that `media_setup_ffmpeg` fills

`media_setup_ffmpeg` is the consented route to a working pair. Without consent it reports what it would fetch (URL, size, SHA-256, destination) and writes nothing. With `consent: true` (section 3) it downloads a pinned build for the platform, checks the pinned SHA-256, and unpacks it into the server's own data folder:

```text
<data dir>/bin/ffmpeg        ffmpeg.exe on Windows
<data dir>/bin/ffprobe       ffprobe.exe on Windows
<data dir>/bin/install.json  file names, archive and binary SHA-256 values, platform, pinned versions
```

Step 4 accepts only a file the server itself can vouch for. The file must exist, be executable, answer `-version`, and its current SHA-256 must equal both the value recorded in `install.json` and the `binarySha256` in the table pinned inside the server for this platform and version (3.4). A truncated download is never run, and someone who can write the data folder cannot replace the binary and its record together, because the pinned value lives in the package and not in the data folder. An install also hashes the file again at its destination after the move and removes it on a mismatch, and a file replaced after installation fails the digest on its next resolution (6.7 re-stats a cached binary before each reuse). The data folder is server owned (section 4 classes it as a package asset) and is the only location outside the output folder that the server writes to. The resolver itself never writes there, and the folder is never added to `PATH`: the absolute path is passed to `spawn` as an argument, so no other program on the machine can pick the binary up.

The tool's own behaviour, the consent check, the pinned URL table and the download codes, belongs to section 3 and to phase `008-claude-code-plugin`. This section owns only what the resolver reads.

### 6.6 When every step fails

When no candidate is usable at any of the four steps, the tool that needed the binary returns `FFMPEG_NOT_FOUND` (`FFPROBE_NOT_FOUND` for the probe binary) as a tool result with `isError: true`, in the shape section 5 fixes:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "FFMPEG_NOT_FOUND: ffmpeg was not found. Run media_setup_ffmpeg to install a bundled build."
    }
  ],
  "structuredContent": {
    "code": "FFMPEG_NOT_FOUND",
    "message": "ffmpeg was not found. Run media_setup_ffmpeg to install a bundled build.",
    "details": {
      "lookedIn": [
        "env-override: unset",
        "bundled: /Applications/Media Editor.app/Contents/Resources/app/node_modules/ffmpeg-static/ffmpeg absent",
        "system-path: /usr/local/bin, /usr/bin, /bin absent",
        "installed: /Users/me/Library/Application Support/media-editor/bin/ffmpeg absent"
      ],
      "envVar": "MEDIA_EDITOR_FFMPEG_PATH",
      "nextStep": "media_setup_ffmpeg"
    }
  }
}
```

`details.lookedIn` carries one entry per step that was tried, naming the concrete path or directories that step checked, so the caller can see which of the four failed and why. These are local paths, and `media_health` returns local paths too (its `path`, the allowed roots, the output folder and the data folder, 6.7). That disclosure is deliberate and stays: a caller cannot fix a broken install without the path, and the user chose these folders. The tool descriptions say that `lookedIn` and `media_health` report local paths, and neither carries an environment value beyond the names section 6.8 lists. The run stops before a command line is built, before an output folder is created and before a temp file is written, so a missing binary leaves nothing behind.

Each entry says what it found. `absent` means the location holds no file. `unusable` means a file is there and could not run (no execute bit, a wrong CPU type, no version line), and a system `PATH` candidate of that kind gets its own `system-path: <path> unusable` entry instead of counting toward the `absent` directories.

`media_setup_ffmpeg` is reachable exactly when this result arrives, because it needs no resolved binary of its own. `media_health` is the other exception. It reports a missing binary as `found: false` with the same `lookedIn` list instead of failing, because a health report that cannot answer is not a health report (section 2).

### 6.7 One lookup per process

A resolution is computed on first need and kept for the life of the process. The cache holds, per binary, the absolute path, the step that supplied it and the version string from `-version`. It is keyed by binary, so one binary can come from an override while the other comes from the system `PATH`. Once a binary has resolved, no step of the order runs again for that binary, and the `-version` call happens once rather than once per tool call.

Three deliberate exceptions:

- A failed lookup is not cached. After all four steps fail, `media_setup_ffmpeg` can install a pair inside the same process, and the next tool call then resolves at step 4 instead of repeating the failure until the process restarts.
- A cached path that fails to spawn, because the file was deleted or replaced after the lookup, drops its cache entry, and the resolver runs the order again from step 1 before it reports anything. A later step may still hold a working binary, and only when all four steps fail does the caller get the not-found result.
- A cached path is re-stat'ed before each reuse. The entry holds the file's size and modification time from its acceptance run, and any difference drops the entry and runs the order again (and re-hashes at step 4), so a binary swapped after first use is checked instead of run on trust. One `stat` per spawn is the whole cost.

`media_health` takes no path parameter, reads no media file, and is the surface that makes the cache visible. It forces both resolutions and reports each one on its own:

| Field | Meaning |
|-------|---------|
| `found` | whether the binary resolved at all |
| `path` | the absolute path that will be passed to `spawn` |
| `source` | the step that supplied it: `env-override`, `bundled`, `system-path` or `installed` |
| `version` | the first line of its `-version` output, for example the ffmpeg version and build line |
| `lookedIn` | present only when `found` is false, listing the four steps and the paths they checked |
| `skipped` | present only when `found` is true and an earlier candidate was passed over because it exists but could not run (no execute bit, a wrong CPU type, no version line). One `step: path unusable` entry each, in lookup order. A location that holds nothing is not listed |

The same response carries the settings that decide whether a call can run: the allowed roots that took effect (section 4.1), the effective output folder, the effective timeout and log level from 6.8, and the encoder and filter capabilities that section 8 gates on.

### 6.8 The variables and arguments the server reads

The server reads the settings below and nothing else. The names are fixed here, and the desktop manifest and the plugin config reuse them unchanged in phases 7 and 8 (`spec.md:96`, `plan.md:89`). Manifests may render the path settings as their own argument form, but they pass the same values.

| Name | Meaning | Default | Set by |
|------|---------|---------|--------|
| `MEDIA_EDITOR_ALLOWED_DIRS` | The read roots, one list separated by the platform path delimiter, `:` on macOS and Linux and `;` on Windows. A path that contains the delimiter can only be given as `--allowed-dir` | none, so a tool with a path parameter fails with `CONFIG_MISSING` until a root exists (section 4.1) | `.mcpb` user config, plugin config |
| `MEDIA_EDITOR_OUTPUT_DIR` | The folder that receives the numbered output folders | the first allowed root (section 4.1) | `.mcpb` user config, plugin config |
| `--allowed-dir <path>` | One read root per occurrence, repeatable, ordered before the variable's entries | none | `.mcpb` user config, plugin config |
| `--output-dir <path>` | The output folder, last occurrence wins | none | `.mcpb` user config, plugin config |
| `MEDIA_EDITOR_FFMPEG_PATH` | Absolute path of the ffmpeg to run, in place of steps 2 to 4 (6.2) | unset | user |
| `MEDIA_EDITOR_FFPROBE_PATH` | The same for ffprobe | unset | user |
| `MEDIA_EDITOR_TIMEOUT_SECONDS` | The per-run limit for one ffmpeg or ffprobe process, in seconds, a positive integer up to 86400 | 1800 | user |
| `MEDIA_EDITOR_DATA_DIR` | The server's data folder, which holds what `media_setup_ffmpeg` installs | `~/Library/Application Support/media-editor` on macOS, `%APPDATA%\media-editor` on Windows, `$XDG_DATA_HOME/media-editor` or `~/.local/share/media-editor` on Linux | `.mcpb` user config, plugin config, user |
| `MEDIA_EDITOR_LOG_LEVEL` | How much the server writes to stderr: `error`, `warn`, `info` or `debug` | `info` | user |
| `PATH` | Read for step 3 only, never modified by the server | the value the host process supplies | user, read only for the server |

Rules that hold for the whole list:

- A path value must be absolute. The process working directory belongs to the host application, so a relative value is never resolved against it (inventory G.6, `../context/source-inventory.md:250`).
- The two binary overrides are the only settings where a bad value is an error rather than a fallback (6.2). Everywhere else a value that cannot be used is ignored with one warn line naming the variable, the documented default stays in force, and `media_health` reports the value that took effect. A rejected timeout or log level never stops a tool from running.
- The four path entries are parsed and merged exactly as section 4.1 states, including the argument order, the trimming and the dropping of unusable roots.
- The server reads `MEDIA_EDITOR_*` names from this list alone. At startup it names any other `MEDIA_EDITOR_*` variable it can see in one warn line, because a typo such as `MEDIA_EDITOR_FFMPEG` would otherwise stay invisible until a run failed for a reason that no longer points at the cause.
- An argument the server does not know is ignored with one warn line naming it, so a stale manifest shows up in the host log instead of stopping the server. `--name=value` and `--name value` are both accepted.
- The warn lines this section names appear at the default level, so a dropped entry or a broken override is never silent.
- Log lines go to stderr. stdout stays free for the JSON-RPC stream, and no tool ever returns a log line inside a result.

### 6.9 Hostile and wrong values

| Name | Value | Result |
|------|-------|--------|
| `MEDIA_EDITOR_FFMPEG_PATH` | `/opt/tools/ffmpeg` that does not exist, a directory, a file with no execute bit, a relative `ffmpeg`, or a file that cannot answer `-version` | `FFMPEG_NOT_FOUND` naming the variable, no fallthrough to steps 2 to 4 |
| `MEDIA_EDITOR_FFMPEG_PATH` | an empty string or spaces only | Treated as unset, the lookup starts at step 2 |
| `MEDIA_EDITOR_FFPROBE_PATH` | any of the values above | `FFPROBE_NOT_FOUND` on the same rules |
| `MEDIA_EDITOR_ALLOWED_DIRS` | `/does/not/exist`, a path that resolves to a file, or a relative entry | The entry is dropped with one warn line, no fallback to the working directory or the home folder (section 4.1) |
| `MEDIA_EDITOR_OUTPUT_DIR` | a read-only volume, or a path that cannot be created | Building the folder fails with `CONFIG_MISSING` (`reason: "unusable"`) before any ffmpeg run (section 4.4) |
| `MEDIA_EDITOR_TIMEOUT_SECONDS` | `0`, `-5`, `abc`, `1800.5`, `1e9` | The default 1800 applies, one warn line, and `media_health` reports the effective value |
| `MEDIA_EDITOR_DATA_DIR` | a relative path, or a path that is an existing file | Treated as unset, the platform default applies, and `media_health` reports the folder that was used |
| `MEDIA_EDITOR_LOG_LEVEL` | `verbose`, `DEBUG`, an empty string | `info` applies, one warn line |
| `PATH` | an empty entry, or an entry holding neither file name | Skipped, the working directory is never searched |
| an unknown argument | `--allowed-dirs /tmp` | Ignored with one warn line naming it, the real setting keeps its own value or its default |

### 6.10 Test matrix axes

Resolution is tested along three axes, and a test names the cell it covers.

| Axis | Values |
|------|--------|
| Platform (5) | `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64`, `linux-arm64` |
| Media kind (3) | image, video, audio. Image tools use `sharp` and never call the resolver. Video and audio tools call it |
| Lookup step (4) | the override variables, the bundled pair, the system `PATH`, the data folder that `media_setup_ffmpeg` fills |

A platform whose bundled pair is missing or cannot run (the `ffprobe-static` gaps in 6.3) must end on step 3 or step 4 and never fail before them. `002-server-foundation` covers the lookup steps on the platform it runs on, and `007-desktop-extension` covers the platform axis per bundle. A cell that the test machine cannot run is reported as skipped and never as passed.

### 6.11 Defects this section closes

The resolution-side defects this section closes, G.7, G.10 and G.11, are listed with their evidence in section 9.

## 7. Result format

Every tool returns one of two shapes: the success shape this section owns, and the section 5 failure body when `isError` is true. `002-server-foundation` builds the single result builder that produces both, and phases `003-image-tools` to `008-claude-code-plugin` call it, so no tool formats a result of its own. A handler that throws an error no rule maps still ends in the same builder, as `INTERNAL`, never as a protocol error (section 5). AC-006 is the row this section is checked against: a successful run carries a text summary and structured outputs with `path` and `bytes` per output.

No result carries a processing log or a metadata dump. The Media Editor forbids showing either in a response (`AI Systems/Media Editor/AGENTS.md:57`, inside its Prohibited list at `:55-61`) and asks for the path plus a brief summary instead (`:140`). The same rule governs the text line of a tool result, and server log lines go to stderr, never into a result (section 6.8).

### 7.1 The text line

A success carries exactly one `content` entry, `{ "type": "text", "text": "<line>" }`. The line follows four rules.

1. One line, no line breaks, kept short. It stays under 300 characters, with one exception: a path the line must name is written in full even when it pushes the line past the cap.
2. It states what the call did, naming the input's base name, and where the result is. A call that wrote one file names that file's absolute path. A call that wrote several names the output folder's absolute path plus the file count. A call that wrote no file names the item it read or resolved, such as a probe's input or the binaries a setup call checked.
3. It is not a log and not a dump. No stderr text, no ffmpeg output, no field-by-field listing, no JSON, no per-file list when the call wrote many files. This is the Media Editor rule above applied inside the result, and the stderr side of it is section 6.8.
4. Wording is free. A test asserts that the line exists, that it has no line break, and that it names the location rule 2 requires. Everything else is asserted through `structuredContent`, the rule section 5 sets for messages.

Two accepted lines:

- `Trimmed intro.mp4 from 2 to 7 seconds. Output saved to /media/exports/021 - trimmed-intro/intro-trimmed.mp4.`
- `Resized hero.jpg into 3 sizes. Output saved to /media/exports/022 - hero-sizes/ (3 files).`

### 7.2 The structured result

Every success carries `structuredContent` with four common keys. They are present for every tool, read-only and setup calls included.

| Key | Type | Content |
|-----|------|---------|
| `tool` | string | The registered tool name exactly as section 2 lists it, for example `video_trim`. |
| `outputs` | array | One entry per file the caller keeps, in the order the call wrote them. `[]` when the call wrote no file. |
| `warnings` | array of strings | What the caller should know but what is not a failure. Normally `[]`, defined below. |
| `elapsedMs` | integer | Milliseconds for the whole call, from handler entry to this result, read-backs included. |

Each entry of `outputs` reports one file the call wrote. The first three fields are always present, and each media field is present when the read-back finds it:

| Field | Unit | Content |
|-------|------|---------|
| `path` | | The absolute path of the written file, inside the call's numbered folder (section 4.3). |
| `bytes` | bytes | The file's size, read from the file after it was written. |
| `mediaType` | | The kind of file the entry names: `image`, `video`, `audio`, `playlist` or `segment`. |
| `durationSeconds` | seconds | Present when the file carries a duration, so a video or an audio file. Absent for a still image and for a playlist. |
| `width`, `height` | pixels | Present when the file carries a picture, so an image or a video. Absent for an audio file and for a playlist. |
| `codec` | | The encoder of the file's primary stream as the read-back reports it, for example `h264` or `aac`. For a sharp image it is the output format: `jpeg`, `png`, `webp` or `avif`. |

**Where the media fields come from.** They describe the file that now exists, never the request that produced it. The server reads every output back after the run, the way the source suite checked a trim by probing the saved file (`vam/tests/test_video_functions.py:481-492`), and fills the fields from what it finds:

- An output written by an ffmpeg run gets one ffprobe pass, the `-v error -print_format json -show_format -show_streams` call `media_probe` uses (`../context/source-inventory.md:226`). `durationSeconds` is the probed format duration parsed to a number, `width` and `height` come from the first video stream (`vam/server.py:1248-1249`), and `codec` is the codec name of the primary stream.
- An output written by a sharp image tool gets one sharp metadata read of the written file, the call `image_probe` already makes (`imagician/src/index.ts:369-379`). The eight `image_*` tools therefore run no ffprobe and need neither binary (sections 3.1 and 6.1).
- A field the read-back does not report is omitted, never defaulted. The source's probe helper answered `44100`, `2` and `stereo` for a file with no audio and `0` for a missing dimension (`vam/server.py:1248-1253`), and this section removes that habit.
- If the probe cannot run or cannot read the output, the entry keeps `path` and `bytes`, the media fields are omitted, and `warnings` carries one entry naming the file. The call stays a success, because the file exists and a reporting step never deletes a deliverable.

**Tool-specific payload.** The four common keys keep their names in every tool, and a tool adds its own keys beside them: the probe blocks of `media_probe` and the diagnosis and repair blocks of `media_repair` (section 3.4), the health report of `media_health` (3.3.9), the component rows of `media_setup_ffmpeg` (3.4), the before and after byte counts of `image_compress` (3.1), and the per-rung playlists, segment counts and total bytes of `video_hls_ladder` (3.4). Nothing tool-specific reaches the text line.

**`warnings`.** One short server-authored sentence per incident, and never a log line. Two triggers produce one in this contract: a fallback the call took, such as the audio re-encode after a container refused the copied track (`vam/server.py:545-558`) or the stream copy `media_remove_silence` falls back to when it finds no silence (`:1148-1152`), and a read-back that could not fill the media fields. The list stays deliberately short so a warning stays worth reading.

### 7.3 Success example: `video_trim`

A call to `video_trim` with `inputPath` `/media/clips/intro.mp4`, `startTime` `2`, `endTime` `7` and `outputName` `trimmed intro` returns:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Trimmed intro.mp4 from 2 to 7 seconds. Output saved to /media/exports/021 - trimmed-intro/intro-trimmed.mp4."
    }
  ],
  "structuredContent": {
    "tool": "video_trim",
    "outputs": [
      {
        "path": "/media/exports/021 - trimmed-intro/intro-trimmed.mp4",
        "bytes": 1876543,
        "mediaType": "video",
        "durationSeconds": 5.0,
        "width": 1920,
        "height": 1080,
        "codec": "h264"
      }
    ],
    "warnings": [],
    "elapsedMs": 1240
  }
}
```

Success omits `isError` (section 5 allows false or absent). The media fields describe the file in `path`, not the arguments: `durationSeconds` is what the written file now runs, and `bytes`, `width`, `height` and `codec` were read back from it after the run.

### 7.4 Error example: `PATH_NOT_ALLOWED`

The same call with `inputPath` `/tmp/clip.mp4`, outside every allowed root, returns the section 5 body instead:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "PATH_NOT_ALLOWED: Path is outside the allowed roots: /tmp/clip.mp4"
    }
  ],
  "structuredContent": {
    "code": "PATH_NOT_ALLOWED",
    "message": "Path is outside the allowed roots: /tmp/clip.mp4",
    "details": {
      "path": "/tmp/clip.mp4",
      "realPath": "/tmp/clip.mp4",
      "allowedRoots": ["/media"],
      "reason": "outside-root"
    }
  }
}
```

The one-line `content` rule holds on both paths: the text is `"<code>: <message>"`, so a text-only client sees the machine code. The structured body is `{ code, message, details }` (section 5), and the success keys of 7.2 do not appear, because a failed call has no completed output to report.

### 7.5 What this section replaces

Before the port, results were prose. Each habit below becomes a field:

- `video_trim` answered with a sentence and the suite matched a substring of it (`vam/server.py:59`, `vam/tests/test_video_functions.py:143`). The new result states the same facts in `structuredContent`, and no test matches message wording (section 5).
- `image_compress` mixed a two-line size report into the text, a line break inside the string (`imagician/src/index.ts:311-318`). The text line stays one line, and the before and after byte counts become structured fields (section 3.1).
- `get_image_info` returned a pretty-printed JSON metadata dump inside the text content, including the local file's `lastModified` (`imagician/src/index.ts:375-388`, the dump half of inventory G.12 at `../context/source-inventory.md:256`). The probe fields return as structure and `lastModified` is dropped (section 3.1).
- The source suite checked a trim's duration by probing the saved file (`vam/tests/test_video_functions.py:481-492`). The result now performs that read-back itself and reports `durationSeconds`, `width`, `height` and `codec` in `outputs`.

## 8. Capability gating, process policy and escaping

This section fixes what the server reads before a run, how a run happens, and how caller text survives the trip into a filter graph. It serves REQ-007 and REQ-008 (`spec.md:129-130`), and it is the section AC-007 and AC-008 are checked against.

Boundaries. Section 6 owns the binary lookup, so a capability check runs only after a binary resolves (section 6.7), and `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND` wins over `CAPABILITY_MISSING` when both would apply. Section 5 owns the three codes this section raises, `CAPABILITY_MISSING`, `PROCESS_FAILED` and `PROCESS_TIMEOUT`, plus the `{ code, message, details }` body and the field names in it. Section 3 fixes each tool's commands and points here, and 8.2 is the only per-tool gate list in the contract. Section 4 owns the allowed roots, the numbered output folder and the file-level side of `-n`. The runner defined here is built once in `002-server-foundation` and used unchanged by every later phase. The escaping helper is built in `005-video-composition`, as the affected-surfaces table in `plan.md` states.

The sources show the gap this section fills. The skill demands both checks before it promises anything: `ffmpeg -encoders` before a format (`skill/SKILL.md:263`, `skill/references/mcp-video-audio.md:54-58`, `skill/references/mcp-imagician.md:54-60`) and `ffmpeg -filters` before `drawtext` or `subtitles` (`skill/SKILL.md:264`, `skill/references/mcp-video-audio.md:78-82`), under the rule that the tool never promises a capability the build cannot deliver (`skill/SKILL.md:268`). Neither server checks anything: video-audio runs ffmpeg and returns whatever stderr says (`vam/server.py:32-36`), and imagician has no build to check because sharp carries its own encoders (`imagician/src/index.ts:242-252`). Whether a bundled `ffmpeg-static` build carries libass, libx264 or the `xfade` filter is not evidenced by any source file (inventory F.2 to F.5, `../context/source-inventory.md:215-221`), so the contract answers with a runtime read instead of a promise.

Source shorthands: `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, and `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

### 8.1 The two lists the server caches

The server reads two lists once and keeps them for the life of the process:

| List | Command | Shape |
|------|---------|-------|
| Encoders | `ffmpeg -hide_banner -encoders` | one line per encoder, `FLAGS NAME DESCRIPTION`, the name column is the capability name |
| Filters | `ffmpeg -hide_banner -filters` | the same shape, one line per filter |

Five rules hold for both reads:

1. **One read per resolved binary path.** The cache is keyed by the absolute path section 6 resolves, so two tools, or two calls, share one parse. The cache entry is dropped together with the resolver entry when a cached binary fails to spawn (section 6.7), and a later phase that installs a binary through `media_setup_ffmpeg` resolves a new path and therefore reads its own lists.
2. **The reads obey the process policy of 8.3 and 8.4.** They are ordinary runs with an argv array, `shell: false`, a 30 second timeout (a list read ends in well under a second, and the 1800 second job limit would hold a tool call for half an hour on a wedged binary), the stderr cap and stdout capture, and their stdout is one of the few streams the server parses (the other two are the `-version` first line in section 6.1 and the ffprobe JSON body of section 3.4).
3. **The parse reads the name column, as a whole word.** A name counts as present when it appears in that column, never as a substring of a description. This is the difference between this check and the `grep` form the skill uses, where `grep libx264` can match a description line (`skill/references/mcp-video-audio.md:56-58`, `:80-82`).
4. **The check is a presence test, never a version or feature test.** The contract asks whether the build carries a name, and it does not try to infer settings from a build string.
5. **`media_health` reports the same cache as data**, one `{ kind, name, present }` entry per name below, so an operator can see the whole list in one call (`3.3.9`, `skill/SKILL.md:263-264`).

The list is closed. These are the names a tool may gate on, and no tool gates on anything else. Encoders:

| Name | Gated for |
|------|-----------|
| `libx264` | every video re-encode (sections 3.2 to 3.4) and the ladder (`skill/assets/hls-video-conversion.md:94-118`) |
| `libx265` | the video codec values a caller may choose (`../context/source-inventory.md:221`) |
| `libvpx-vp9` | the same choice (`../context/source-inventory.md:221`) |
| `aac` | every audio re-encode (sections 3.2 to 3.4) and the `m4a` container (3.2.1) |
| `libmp3lame` | the mp3 side of the audio tools (`skill/references/mcp-video-audio.md:154`) |
| `libopus` | the opus side of the audio tools and the `webm` audio default (3.2.1, `../context/source-inventory.md:221`) |
| `libvorbis` | the `ogg` container and the `audio_extract` choice (3.2.1, 3.2.2) |
| `flac` | the `flac` container and the `audio_extract` choice (3.2.1). A native ffmpeg encoder, listed so every table value has a name to check |
| `pcm_s16le` | the `wav` container and the `audio_extract` choice (3.2.1). A native encoder, listed for the same reason |
| `mpeg4` | the `avi` video default (3.2.1). A native encoder, listed for the same reason |

Filters:

| Name | Gated for |
|------|-----------|
| `drawtext` | `video_add_text_overlay` (3.3.3), a libfreetype build plus a font file (`skill/references/mcp-video-audio.md:78-82`, inventory F.2) |
| `subtitles` | `video_add_subtitles` (3.3.2), a libass build (inventory F.3, `../context/source-inventory.md:217`) |
| `xfade`, `acrossfade` | `video_concat` when a transition is given (3.3.5, `vam/server.py:932-945`) |
| `silencedetect` | `media_remove_silence` (`vam/server.py:1130`) |
| `select`, `setpts`, `aselect`, `asetpts` | `media_remove_silence` (`vam/server.py:1185-1207`), and `setpts` also `video_set_speed` (`vam/server.py:1081-1089`) and `video_add_b_roll` (3.3.7) |
| `atempo` | `video_set_speed` (`vam/server.py:1084-1089`) |
| `fade` | `video_add_fade` (3.3.8) and `video_add_b_roll` when a fade is requested (3.3.7, `vam/server.py:1416-1421`, `:1605-1608`) |
| `overlay` | `video_add_image_overlay` (3.3.4) and `video_add_b_roll` (`vam/server.py:748`) |
| `scale` | `video_set_resolution` (`vam/server.py:374-379`), `video_set_aspect_ratio` (`:196-217`), `video_add_image_overlay` when a size is given (`:701-707`), `video_concat` (`:891-900`) and the ladder (`skill/assets/hls-video-conversion.md:97-100`) |
| `pad`, `crop` | `video_set_aspect_ratio` (`vam/server.py:196-217`), and `pad` also the ladder (`skill/assets/hls-video-conversion.md:97-100`) |
| `split` | the ladder (`skill/assets/hls-video-conversion.md:97-100`) |
| `format`, `colorchannelmixer` | `video_add_image_overlay` when `opacity` is given (3.3.4, `vam/server.py:710-713`) |

Three exclusions are deliberate, so no reader mistakes the list for a full build audit:

- **The image encoders are not here.** `mjpeg`, `png` and the WebP or AVIF encoders the image recipes mention (`skill/references/mcp-imagician.md:54-60`) are ffmpeg names this server never runs, because `image_convert`, `image_compress` and `image_batch_resize` encode through sharp (`imagician/src/index.ts:242-252`, `:295-303`). Inventory F.5 records the decision behind it: image output must not depend on the ffmpeg build (`../context/source-inventory.md:221`).
- **`loudnorm` is not here.** The skill documents loudness normalization (`skill/references/mcp-video-audio.md:74`, `:157-163`) and none of the 39 tools exposes it, so there is no consumer to gate. A later phase that adds a normalize tool adds the name to this list in the same change.
- **Muxers and demuxers are outside both reads.** The concat demuxer, the hls muxer and the mp3 muxer do not appear in `-encoders` or `-filters`, and section 5 fixes `kind` to `encoder` or `filter`. Inventory F.4 records the concat demuxer as build-dependent (`../context/source-inventory.md:219`). A build without it fails at the run, as `PROCESS_FAILED` with the capped stderr tail.

### 8.2 What each tool checks

Five rules turn the list into a per-tool gate:

1. **A tool checks exactly the names its fixed commands write, and the gate runs before the first spawn of the call.** It also runs before the numbered output folder is created, so a capability failure leaves no folder, no temp file and no child process behind. For a tool that makes several runs, such as `video_concat` or `video_add_b_roll`, one gate covers the whole call, because the same names apply to every pass. The one exception is a two-attempt tool (3.2 rule 5, 3.3 rule 3): names that only its second attempt needs are checked just before that attempt starts, because the first attempt may succeed with no encoder at all. A miss there is `CAPABILITY_MISSING`, and the cleanup of 8.4 removes what the first attempt left.
2. **A copy pass needs nothing.** Where a command copies a stream, its row lists nothing for that attempt. The ladder is the same at the demuxer level, where no encoder runs for a remux.
3. **Every video re-encode names `libx264` for the picture and `aac` for the audio** unless its own row names another encoder, the pair every fixed command in sections 3.2 to 3.4 uses outside the container table of 3.2.1. A row below that re-encodes therefore reads the pair, so a build without it fails at the gate rather than mid-encode.
4. **Where a schema carries a codec value, the caller's value is the name checked**, after alias normalization (1.5). The video codec values are checked against the encoder list (inventory E, `../context/source-inventory.md:171`, and F.5, `:221`), and the audio codec values the same way (`vam/server.py:19`, `:31`).
5. **A container fixes the encoder where the caller names none.** The audio tools write the default encoder of their container from the 3.2.1 audio table (`mp3` needs `libmp3lame`, `wav` needs `pcm_s16le`, `m4a` needs `aac`, `flac` needs `flac`, `ogg` needs `libvorbis`), and a video conversion without a caller codec writes the default pair of the 3.2.1 video table. An `audio_set_*` tool keeps the input's container, read from ffprobe, and checks that container's default. A container outside the tables is `UNSUPPORTED_FORMAT` before any gate runs (3.2.1), so no pass runs with an encoder the gate never saw.

| Tool (section 2 row) | Encoders to check | Filters to check | Notes |
|----------------------|-------------------|------------------|-------|
| `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` (1 to 8) | none | none | sharp encodes every image format in process (`imagician/src/index.ts:242-252`, `:295-303`), so these eight never resolve a binary and never read the two lists (inventory F.5, `../context/source-inventory.md:221`) |
| `media_health` (9) | none | none | reports the lists as data (3.3.9), its four short runs are named there |
| `audio_extract` (10) | the encoder the caller names through `audioCodec` | none | the check the inventory asks of the enum (`../context/source-inventory.md:171`), on the value the source passed straight to `acodec` (`vam/server.py:19`, `:31`) |
| `video_trim` (11) | none on the copy attempt, `libx264` and `aac` before attempt 2 | none | the copy attempt is the fast path (`vam/server.py:55-58`), the fallback re-encodes (`:64-66`) |
| `audio_convert_properties` (12) | the `format` default encoder (rule 5) | none | the source passed bitrate, sample rate and channels with no codec name (`vam/server.py:92-103`) |
| `video_convert_properties` (13) | the encoders named by `codec` and `audioCodec` when the caller sets them, otherwise the `format` default pair (rule 5) | `scale` when `resolution` is given | `vf=scale=...` (`vam/server.py:128-135`) |
| `video_set_aspect_ratio` (14) | `libx264`, and `aac` before attempt 2 | `scale` and `pad` in pad mode, `crop` in crop mode, none on the copy shortcut when the ratio already matches | the pad path re-encodes the picture (`vam/server.py:196-200`, `:223`), the crop path the same (`:214-217`) |
| `audio_convert` (15) | the `format` default encoder (rule 5) | none | a container change with no codec name in the source (`vam/server.py:257`) |
| `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels` (16 to 18) | the input container's default encoder (rule 5) | none | each re-encodes the stream it keeps (`vam/server.py:267-328`) |
| `video_convert` (19) | none on the copy attempt, the `format` default pair before attempt 2 (rule 5) | none | copy streams first, re-encode on failure (`vam/server.py:360-362`) |
| `video_set_resolution` (20) | `libx264`, and `aac` before attempt 2 | `scale` | `vf=scale=...` forces a video re-encode (`vam/server.py:374-379`) |
| `video_set_codec` (21) | the encoder the caller names through `codec`, and `aac` before attempt 2 | none | the value the source passed to `vcodec` (`vam/server.py:395-397`) |
| `video_set_bitrate` (22) | `libx264`, and `aac` before attempt 2 | none | the source named no video codec (`vam/server.py:409-411`) |
| `video_set_frame_rate` (23) | `libx264`, and `aac` before attempt 2 | none | `vam/server.py:423-425` |
| `video_set_audio_codec` (24) | the encoder the caller names through `audioCodec`, and `libx264` before attempt 2 | none | `vam/server.py:437-439` |
| `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels` (25 to 27) | `aac`, and `libx264` before attempt 2 | none | the audio track is re-encoded as `aac`, the picture copied on attempt 1 (`vam/server.py:451-481`) |
| `video_add_subtitles` (28) | `libx264`, and `aac` before attempt 2 | `subtitles` | 3.3.2, a libass build (inventory F.3), with the bundled font folder passed through `fontsdir` (inventory F.2) |
| `video_add_text_overlay` (29) | `libx264`, and `aac` before attempt 2 | `drawtext` | 3.3.3, the REQ-007 case, a libfreetype build plus a font file, which the tool always passes (inventory F.2, `skill/references/mcp-video-audio.md:78-82`) |
| `video_add_image_overlay` (30) | `libx264`, and `aac` before attempt 2 when the input has audio | `overlay`, plus `scale` when `width` or `height` is given, plus `format` and `colorchannelmixer` when `opacity` is given | 3.3.4, rule 1: the graph writes `scale` only for a size |
| `video_concat` (31) | `libx264`, `aac` | `scale`, plus `xfade` and `acrossfade` when `transition` is given | 3.3.5, the two transition filters are build-dependent (inventory F.4, `../context/source-inventory.md:219`) |
| `video_set_speed` (32) | `libx264`, `aac` | `setpts`, plus `atempo` when the input has audio | the tempo chain (`vam/server.py:1059-1093`) |
| `media_remove_silence` (33) | `libx264` and `aac` for a video input, `aac` alone for an audio input | `silencedetect`, `select`, `setpts`, `aselect`, `asetpts` | 3.3.6, the detect run scrapes stderr (`vam/server.py:1127-1139`) |
| `video_add_b_roll` (34) | `libx264`, `aac` | `overlay`, `scale`, `setpts`, plus `fade` when a fade is requested | 3.3.7, `setpts` shifts each clip to its insertion time |
| `video_add_fade` (35) | `libx264`, and `aac` before attempt 2 | `fade` | 3.3.8 |
| `media_probe` (36) | none | none | ffprobe only, no encoder and no filter runs (3.4) |
| `media_repair` (37) | none on the copy pass. `libx264` and `aac` before the video re-encode, `aac` alone before the audio re-encode | none | 3.4, the copy pass copies what is already encoded. The inventory records both encoders as build-dependent (`../context/source-inventory.md:221`) |
| `video_hls_ladder` (38) | `libx264` | `split`, `scale`, `pad` | the graph splits, scales and pads each rung (`skill/assets/hls-video-conversion.md:97-100`), and the asset's own prerequisite is a libx264 build (`:240`) |
| `media_setup_ffmpeg` (39) | none | none | its only runs are `-version` checks against a candidate (section 6.5) |

A missing name returns `CAPABILITY_MISSING` (section 5) before the run starts. One result names one missing piece, because section 5 fixes `details.name` to a single name: encoders first in the order the command would use them, then filters in graph order. The worked case of AC-007 is a build without `drawtext`:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "CAPABILITY_MISSING: The resolved ffmpeg has no drawtext filter, which video_add_text_overlay needs."
    }
  ],
  "structuredContent": {
    "code": "CAPABILITY_MISSING",
    "message": "The resolved ffmpeg has no drawtext filter, which video_add_text_overlay needs.",
    "details": {
      "binary": "/Applications/Media Editor.app/Contents/Resources/app/node_modules/ffmpeg-static/ffmpeg",
      "kind": "filter",
      "name": "drawtext",
      "neededBy": "video_add_text_overlay"
    }
  }
}
```

The ways out are named where the user can act on them: `MEDIA_EDITOR_FFMPEG_PATH` points the resolver at a fuller build (section 6.2), and `media_health` shows which of the two lists is missing what (3.3.9). A name that is present but still fails at the run, because the input, the graph or the settings are wrong, is `PROCESS_FAILED` (section 5), never this code.

### 8.3 How a process runs

Every child process comes from the same runner, and the runner never builds a command line as one string (REQ-008, `spec.md:130`). Its shape:

```text
spawn(absoluteBinaryPath, argsArray, { shell: false, stdio: [...], env: {...} })
```

| Element | Rule |
|---------|------|
| Binary | the absolute path section 6 resolved. No bare name, no `PATH` lookup at spawn time, no shell |
| Arguments | a `string[]` with one element per token. No concatenation, no template string that joins tokens, no `-vf` value assembled by a caller |
| Shell | `shell: false`, always. Inventory G.1 records that both sources already used arg arrays for `subprocess.run` and that the port keeps it (`../context/source-inventory.md:238`, `vam/server.py:891-900`, `:1016-1024`, `:1428-1436`) |
| stdin | `ignore`, so a child can never read the JSON-RPC stream the host writes to the server's own stdin. ffmpeg additionally gets `-nostdin`, so a prompt can never wait on a console that does not exist (G.5, `../context/source-inventory.md:249`) |
| stdout | `ignore` unless the run needs it. Three kinds of run need it: the resolver reads a `-version` first line (section 6.1), the capability reads parse the two lists (8.1), and every ffprobe read parses its output: `media_probe` and `media_repair` (3.4), the input probes of 3.2 and 3.3, and the output read-back of section 7.2. An inherited stdout is never allowed, because stdout carries the protocol stream (section 6.8) |
| stderr | `pipe`, capped as 8.4 states, because the cap is the only reason a failure is readable |
| Environment | an allowlist, never the host environment: `PATH`, `HOME`, `USERPROFILE`, `TMPDIR`, `TEMP`, `TMP`, `SystemRoot`, `APPDATA`, `LOCALAPPDATA`, `XDG_CACHE_HOME`, `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `FONTCONFIG_PATH` and `FONTCONFIG_FILE` are copied when set, and `LC_ALL` and `LANG` are set to `C` so every line the server parses or shows keeps one spelling across machines. Everything else is dropped, so a token in the host environment never reaches a child (the operating system may still add a key of its own: macOS adds `__CF_USER_TEXT_ENCODING` to every child, so a check compares against the allowlist plus that key), and ffmpeg's own control variables (`FFREPORT` writes a log file to a path the environment names) can never be set from outside |

Every ffmpeg argv begins with three flags, and the runner adds them. The command shapes in section 3 show `-n` for the reader, and the runner never adds a flag twice:

| Flag | Reason |
|------|--------|
| `-hide_banner` | keeps the build banner out of the capped tail, so the tail holds the failing lines. The capability reads of 8.1 and the checks in `media_health` use it for the same reason (`3.3.9`) |
| `-nostdin` | ffmpeg never reads a console or the server's stdin (G.5, `../context/source-inventory.md:249`) |
| `-n` | ffmpeg never overwrites an existing file (REQ-003, `spec.md:120`). The sources split on this: every `subprocess.run` carried a hard `-y` (`vam/server.py:898`, `:1434`, `:1547`) while the ffmpeg-python runs carried neither flag and could prompt on stdin instead (inventory F.7, `../context/source-inventory.md:231`). One policy replaces both, and `-y` never appears in this contract |

An ffprobe argv begins with `-hide_banner -v error` instead, which is the error level the probe command of 3.4 already uses. `-n` does not apply to ffprobe, which writes no file.

**Every input is opened under a file-only protocol whitelist.** The runner writes `-protocol_whitelist file` immediately before every `-i` of an ffmpeg argv. An ffprobe argv reads one input, given as `-i` or as a positional name, so the flag goes once at the start of the argv, after `-hide_banner -v error` (ffprobe accepts the option before a positional input, checked on ffmpeg 6.0). The runner never adds it twice. The concat join carries it after `-safe 1` and before its `-i` (3.3.5). Without it, a playlist or a filter script can name `http:`, `tcp:` or `concat:` inputs, and a run would open a network connection or a second local file the caller never named. The whitelist alone is not enough: ffmpeg reads a local playlist, and follows an absolute segment path outside every allowed root, even with `-protocol_whitelist file` set (checked on ffmpeg 6.0 with a `.m3u8` whose `.ts` segment sat outside the root). The runner therefore also sniffs every input before the first spawn.

**The runner is handed every resolved input.** A tool that passes a caller file to a child gives the runner the resolved inputs and the allowed roots with the call, and the runner re-resolves each input and reads its first 512 bytes before the spawn (4.2). The list is a required argument, and an empty list is how a run says it opens no caller file, so a tool cannot skip the check by leaving the argument out.

**Content gates run after the section 4.2 real-path check and before ffprobe reads the file.** The runner reads the first 512 bytes of each input and each subtitle file:

| Gate | Applies to | Rejects | Result |
|------|-----------|---------|--------|
| Indirection container | every ffmpeg input, including overlay images and b-roll clips | a file whose first byte after an optional UTF-8 byte order mark and leading white space is `#`, `<` or `[`, or whose text starts with `ffconcat` or `v=0` (HLS and other `#` playlists, DASH and other XML manifests, INI-style playlists, concat scripts, SDP) | `UNSUPPORTED_FORMAT` with `reason: "indirection-container"` |
| SubRip positive sniff | the `subtitlePath` of `video_add_subtitles`, and the temp copy of 8.6 | any file that is not SubRip: after the byte order mark and white space, the first line is digits only and the second matches `HH:MM:SS,mmm --> HH:MM:SS,mmm` (a dot is accepted before the milliseconds) | `UNSUPPORTED_FORMAT` with `reason: "not-subrip"` |

Real media containers start with binary signatures, so the first gate refuses nothing a tool accepts. The second gate is a positive match, because the `subtitles` filter opens its file through libass with no `-protocol_whitelist` in reach, so only the file's own content can keep it from reading a script or another file's bytes. Section 5's `UNSUPPORTED_FORMAT` details carry `reason` for these two gates and the two image gates of 3.1. For the two gates of this table `detected` is `indirection-container` when a playlist or script was refused and `unknown` when a subtitle file was not SubRip.

Two Windows notes belong here. The binary file names come from section 6, so no `which` or `where` output is ever spliced into a command (section 6.4). And no shell means no batch script, so a path with spaces, `&` or `%` in it is one argv element with no meaning to anything but ffmpeg itself. The escaping that filter values need is a separate question, owned by 8.5, and it exists because of the filter grammar, not because of a shell.

### 8.4 Timeout, stderr and cleanup

| Rule | Value |
|------|-------|
| Timeout | 1800 seconds per process by default, `MEDIA_EDITOR_TIMEOUT_SECONDS` overrides it (NFR-P01, `spec.md:169`, section 6.8). The budget is per process, not per call: `video_concat` runs one process per clip plus one join, and each gets its own |
| On expiry | the runner ends the process, then enlarges the wait: a termination signal first, five seconds, then a force kill. On Windows both steps terminate the process, and the wait only gives it time to exit. The partial output is removed and `PROCESS_TIMEOUT` returns with `binary`, `timeoutSeconds` and `elapsedSeconds` (section 5) |
| The resolver's probe | the `-version` check keeps its own ten-second bound (section 6.1) and is not a timed run of a tool |
| stderr cap | the runner keeps the last 64 KB of the stream in process, counted in bytes, oldest bytes dropped first (NFR-P02, `spec.md:170`), because the detect pass of `media_remove_silence` and the error mapping read it. A result carries less: `details.stderrTail` is the last 4 KB of that buffer, decoded as UTF-8 with a replacement character when the cut lands mid-character, with ANSI escape sequences and control characters other than LF and TAB removed, and with the run's temp-folder path replaced by `<tmp>` (section 5, `details` rule 2). It is the only stderr text a result may carry, and nothing else is added to it |
| Streams | the detect pass of `media_remove_silence` exists because the source scraped `silence_start` and `silence_end` from stderr (inventory F.7, `../context/source-inventory.md:229`, `vam/server.py:1127-1139`), and that is the one tool that needs stderr as data rather than as a failure report. Every other tool keeps the tail only for its error result |
| Temp folder | one per run, created with `fs.mkdtempSync(path.join(os.tmpdir(), 'media-editor-'))` and removed in `finally`. It holds what the source kept in `tempfile.mkdtemp()`: the concat list (`vam/server.py:1009`), which names only server-generated relative files (3.3.5), and the intermediates `norm_*.mp4`, `segment_*.mp4` and `processed_broll_*.mp4` (`:888`, `:905`, `:992`, `:1278`, `:1399`, inventory F.6, `../context/source-inventory.md:223`) |
| Temp cleanup | the removal is forced and retried, because a Windows handle can outlive its process for a moment and the source's `shutil.rmtree` had no retry and could raise on a lock (`vam/server.py:970`, `:1033`, `:1561`, inventory F.6). The temp folder is never a caller path and never the output folder (section 4) |
| Partial outputs | the runner records every path it hands to a child as an output. On a non-zero exit, a timeout, a kill or a thrown error it removes each recorded path that exists, then removes the numbered folder the call created (section 4.3). A failed run leaves neither a partial file nor a folder behind (NFR-R01, `spec.md:177`). Two exceptions. A run refused with `OUTPUT_EXISTS` removes nothing, because the existing target and the folder that holds it are not this run's. And a path that will not go, such as a locked file on Windows or a folder without write access, is retried, then named in `details.leftover` of the error that caused the cleanup |
| Attempts | each attempt of a two-attempt tool writes to its own path inside the temp folder, and only the surviving file is moved into the numbered folder (3.2 rule 5, 3.3 rule 3). A one-attempt tool such as `video_concat` writes its final file to the temp folder the same way, so a failed run never leaves a half-written file in the numbered folder. This is the fix for the source's shared final path, where a partial file from the copy attempt could break the re-encode attempt (`vam/server.py:546-558`, inventory G.5, `../context/source-inventory.md:249`) |
| `OUTPUT_EXISTS` | before each spawn the runner stats each planned output path and keeps the result, so an existing target anywhere in the run maps to `OUTPUT_EXISTS` with `stage: "run"` from the recorded state, never from ffmpeg's wording (section 5). The `-n` flag and the mapping are the same rule seen from two sides |
| Output check | ffmpeg exits 0 after some failures, for example a missing directory prints `Failed to open file` and still returns 0 (checked on ffmpeg 6.0), so an exit status alone never proves a file exists. After every zero exit the runner stats each recorded output: it must exist as a regular file with a size above zero, and a tool that writes several files (the ladder, 3.4) lists every playlist and at least one segment per rung. A miss is `PROCESS_FAILED` with `exitCode: 0` and the capped tail, and the cleanup rule above removes what was written |
| Working directory | the runner takes an optional `cwd`. Only `video_hls_ladder` sets it, to the numbered folder it created, because ffmpeg reads `%` in a segment pattern as a pattern character and does not collapse a doubled `%%` (checked on ffmpeg 6.0, files landed in a literal `p%%q` folder). The ladder passes relative, server-generated patterns, so no caller byte and no `%` in a folder name reaches them (3.4). Every other tool leaves `cwd` unset |
| Large files | the runner checks no file size and adds no limit beyond the timeout, the concurrency cap below and, for images, the pixel cap of 3.1. Every tool that re-encodes says in its description that run time grows with file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to tens of minutes over 1 GB, that the call returns only when the work ends or the timeout fires, and that splitting the file is a suggestion the caller may make, never something the server does on its own (`skill/references/mcp-video-audio.md:232-239`). The tool description is the only place this appears, because a result cannot warn before the work starts |
| Concurrency | several calls may run at once, but the runner starts at most 2 ffmpeg or ffprobe children at a time and queues the rest, so a burst of calls cannot exhaust memory or file handles. A queued run's timeout starts at its spawn, and each spawn takes and gives back its own slot, so a call that runs several processes never waits on itself. Each call gets its own temp folder, the numbered folder is race-free by construction (section 4.3), the capability lists are read once behind a single in-flight read (8.1), and there are no process groups to leak, because no shell was ever started |

### 8.5 One escaping helper for every caller string that reaches a filter graph

Every caller string that reaches a filter graph passes through one helper (NFR-S02, `spec.md:174`), and no tool writes an escape of its own. The helper covers three values, and their routes are fixed in section 3.3: the drawtext text (3.3.3), the subtitle file path in the `subtitles` filter (3.3.2) and the font file path in `fontfile=` (3.3.3). The server writes each value inside single quotes, as `key='<helper output>'`, so no caller byte decides where the quotes fall.

A filter value is parsed at two levels, and the helper undoes both in one pass. **Level 1** is the filtergraph parser. Inside `'...'` every character is literal, and a quote can only be produced by closing the quote, writing `\'` and opening it again (`'\''`). **Level 2** is the filter's own option parser. It honors `\` and `'`, splits options on `:`, and strips leading and trailing white space from a value unless that white space is backslash-escaped. The helper writes the level 2 escape, then wraps it for level 1, so its output is L1(L2(value)):

| Caller character | Text written between the quotes | Why |
|------------------|---------------------------------|-----|
| `\` | `\\` | level 2 reads a backslash as the escape character, so a caller backslash must be doubled or the parser drops it or consumes the character after it |
| `'` | `\'\''` (five characters: backslash, quote, backslash, quote, quote) | level 2 needs `\'`, and level 1 can only carry a quote by closing the quoted section, so the level 2 form is wrapped as `\` then `'\''`. A bare quote would end the quoted section and let the rest read as graph syntax |
| `:` | `\:` | level 2 splits options on it, so an unescaped colon ends the value. This is how a Windows drive letter truncates `subtitles='C:\clips\a.srt'` at `C` (inventory G.4 and G.7, `../context/source-inventory.md:244`, `:251`, and the spec's Windows edge case, `spec.md:188`) |
| space, TAB or LF at the start or end of the value | the same character with a backslash before it | level 2 strips unescaped white space at both ends of a value, so `" hello "` would lose its padding |
| LF inside the value | the raw byte | drawtext renders a raw line feed as a line break, and level 1 keeps it literal inside the quotes. The two-character form `\n` does not work: drawtext with `expansion=none` renders it as a literal `n` |
| every other character | unchanged | inside quotes level 1 keeps `,` `;` `[` `]` `=` `%` and interior spaces literal, and level 2 reacts only to `\`, `'` and `:` |

Five rules keep the helper honest:

- **`%` needs no escape, `expansion=none` carries it.** Every drawtext this contract builds carries `expansion=none`, so `%{...}` never expands. The rule is a fixed part of the command shape in 3.3.3, and no path reaches a `%` reader, because 8.6 sends any path with a `%` through a temp copy.
- **Control characters are refused, not escaped.** A caller value holding a C0 control character other than TAB and LF, or DEL, returns `INVALID_INPUT` with `reason: "control-character"` before the helper runs, because the check against real ffmpeg cannot tell such bytes apart in its debug output. CR and CRLF are normalized to LF first, so a Windows line break does not trip the rule.
- **The helper assumes a validated value.** A NUL, a lone surrogate or a string that is not valid UTF-8 never reaches it, because the schema rejects text before the handler runs (3.3.3) and the real-path check rejects a path (section 4.2).
- **The output is final.** There is one pass, level 2 then level 1, and nothing escapes the helper's own output a second time.
- **Windows is derived, not run.** The drive-letter case follows from the `\` and `:` rows, and no test in this contract ran on Windows. Phase 5 carries a Windows case in its vitest port and states in its notes whether a Windows runner exercised it.

**Evidence.** The rule was checked against a real ffmpeg 6.0 build with the drawtext filter, `scratch/escape-check/escape_check.py` in this phase folder. Each string goes through the helper into `-vf "drawtext=text='<escaped>':expansion=none:fontfile='<font>':x=0:y=0:fontsize=12,scale=64:48"` with `-v debug`, then the script reads the `Setting 'text' to value '...'` line and requires it to equal the original, and requires the filter chain to still scale to 64x48. A 27-string battery (quotes, backslashes, colons, commas, semicolons, brackets, equals, percent, padding, an embedded LF, a `,drawtext=` injection attempt) and a 400-string seeded fuzz run passed with 0 failures. Phase 5 ports both into a vitest suite that runs against the resolved ffmpeg, so a build that parses filters differently fails the test rather than a caller.

Two callers stay outside the helper, on purpose:

- **Enums, numbers and colours do not need it.** A position is an enum member that the server turns into an expression (3.3.1), a time or size is parsed to a number and re-serialized, and a colour is validated as `#RRGGBB` before it is used. The source interpolated raw times into `enable` (`vam/server.py:619`) and raw positions into `x=` and `y=` (`:617-618`, `:728-735`), which is what the round trip removes. The `enable` expression is written as `enable='between(t,<start>,<end>)'` with plain commas, because commas inside the quotes are literal at both levels.
- **An `-i` argument is not graph syntax.** An input media path is one argv element and never appears inside a filter value, so it needs no escaping. Only the two paths the filters themselves open, the subtitle file and the font file, go through the helper.

The concat list is no longer a quoting context. It holds only relative, server-generated names (`norm_0.mp4`, `norm_1.mp4` and so on, 3.3.5), so no caller byte reaches it, and the demuxer runs with `-safe 1`.

### 8.6 Paths that escaping alone cannot carry

A path inside a filter graph is parsed more than once: the graph parser first, the filter's own option parser next, and then the library that opens the file, with its own escaping on top. A quote, a percent, a semicolon or a bracket in a file name has no single agreed escape across those layers, so the contract does not bet on one.

The rule: the helper escapes the path first. A path whose own bytes stay inside a safe set is used as it is, escaped. The safe set is ASCII letters, digits, `.`, `-`, `_`, `/`, `\`, `:` and the space character. A path carrying anything else, a quote, a percent sign, a comma, a semicolon, a bracket or an equals sign, is not escaped at all: the file is copied into the run's temp folder under a generated name (`subtitle.srt`, `font.ttf`), and the temp path is escaped instead.

Four consequences follow:

- **A drive letter survives.** A Windows subtitle path such as `C:\clips\a.srt` stays inside the safe set, so it is escaped in place, and the `:` and `\` rows of the table are what keep it whole. The spec names this exact case as the one where the source breaks (`spec.md:188`), and the source did break: the path went into the filter raw (`vam/server.py:540`), so the value ended at the colon.
- **The copy is byte for byte.** The original is opened read only and never touched, the copy keeps the extension the `subtitles` filter reads, and the temp folder takes the copy with it when the run ends.
- **The bundled font needs no copy.** Its path is fixed at pack time and stays inside the safe set on every platform the bundle ships for, so it goes through the escape directly (3.3.3, inventory F.2, `../context/source-inventory.md:215`).
- **The copy holds only what the sniff accepted.** A subtitle path is copied into the temp folder only after the SubRip sniff of 8.3 passed on the original, so the copy is always a SubRip file and never a script the filter could follow.

### 8.7 Defects this section closes

The process-side defects this section closes, G.1, G.4, G.5, G.7, G.11 and the porting hazards F.2 to F.7, are listed with their evidence in section 9.

## 9. Source defects and their fixes

Inventory section G lists thirteen security and robustness defects that the two sources carry (`../context/source-inventory.md:236-257`). This section is the only place the contract lists them. 9.1 is the index, one row per numbered item with the source evidence and the section of this contract that removes the defect, and AC-009 checks it against the thirteen rows, G.1 to G.13. 9.2 holds the fix detail per defect and per porting hazard from inventory sections F and H, gathered from the sections that implement it. The rules themselves live in the sections named, and those sections point here instead of keeping lists of their own (3.1, 3.2.21, 3.3.12, 3.4, 4.5, 6.11 and 8.7).

Each fix is built by the phase that builds the section named in its row: `002-server-foundation` for the shared guards, `003-image-tools` for the image rows, `004-video-audio-core` and `005-video-composition` for the ffmpeg rows, and `006-probe-repair-hls` for the gap tools.

Source shorthands: `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

Error codes are named as section 5 lists them, because that list is the one tests assert.

### 9.1 Index

| Item | Defect in the source, with evidence | How the new server avoids it |
|------|-------------------------------------|------------------------------|
| G.1 | A practice to keep, not a bug: every subprocess call uses an argument array, in the source's own calls (`vam/server.py:891-900,908-917,994-1003,1016-1024,1428-1436,1539-1553`) and in Imagician, which reaches no shell at all because it works through Node APIs and sharp. The defect is the standing risk that a port rebuilds command strings. | Section 8 makes the good behavior a hard rule: every child process is `spawn` with an argument array and `shell: false`, no command line is ever built as one string, and the resolver reads `PATH` itself instead of running a lookup program (REQ-008, NFR-S02). |
| G.2 | Concat-list injection: the list is written as `file '{path}'` with the path trusted verbatim (`vam/server.py:1012`) and read back with `-safe 0` (`:1019`), so one quote in a file name breaks the list or injects an entry. | The list holds only names the server generates for its own intermediates (`norm_<i>.mp4`), the join runs under `-safe 1` and `-protocol_whitelist file`, and no caller name is written into a list, so a quote or a line break in a file name stays legal and carries no list syntax (3.3.5, 8.3). |
| G.3 | No path restriction anywhere: paths are checked for existence only (`vam/server.py:514-517,592,689-692,841-843,1117,1353,1586`), an output may be any writable path, an output equal to its input is not guarded, so `trim_video(SAMPLE, SAMPLE, ...)` destroys the source, Imagician writes wherever the caller's `outputPath` points (`imagician/src/index.ts:220`), and the subprocess paths force `-y` over an existing file (`vam/server.py:898` and the other forced calls). | Section 4 resolves every input by real path inside an allowed root, removes the caller-chosen output path from every schema (1.4 and section 3), creates exactly one fresh numbered folder per call, and refuses a planned output that equals or sits inside an input path before the file is opened (4.3). Section 8 puts `-n` on every command, and section 5 carries the codes for both refusals. |
| G.4 | Raw caller strings reach filter graphs: the drawtext escaping covers `\ ' : ,` and leaves newlines unescaped (`vam/server.py:610`), `enable=between(t\,start\,end)` interpolates raw caller values (`:619`), `font_file` is partially escaped and its existence is never checked (`:631-632`), `subtitles='...'` is unescaped so one colon (every Windows drive letter) corrupts the filter (`:540`), `force_style` values are unvalidated (`:523-537`), overlay coordinates come from a raw `position` string (`:728-735`), and `resolution`, `width`, `height`, `scale_factor`, `padding_color`, `target_format`, codec and bitrate strings flow into graphs raw (`:100,130-132,196-200,360,376-378,395,703-706,1400,1408`). | Section 8 passes every caller string that reaches a filter graph through one escaping helper that applies the two-level rule verified against ffmpeg 6.0 (8.5): backslash, quote and colon at the filter level, then the quote again for the outer quoting, with control characters refused and `expansion=none` on every drawtext. The `enable` expressions carry server-built numbers inside a quoted value with plain commas (3.3.3, 3.3.4). Section 3 removes most of the raw routes instead of escaping them: `position` is a closed enum whose coordinate expressions the server builds (3.3.1), `format`, `codec` and `fit` are enums, dimensions, times, scales and ratios are typed numbers with ranges that the server re-serializes, and no parameter is a free-form ffmpeg fragment (1.2). |
| G.5 | Two overwrite policies at once: the `subprocess.run` calls force `-y` and overwrite silently anywhere (`vam/server.py:898,1434,1547`), while the ffmpeg-python calls carry no `-y`, so an existing output makes ffmpeg prompt on stdin and fail for a non-interactive server. The `trim_video` copy then re-encode fallback (`:60-66`) can meet the partial file the first attempt left at the same final path. | Section 4.3 gives every call a fresh folder that is created exclusively and checks the planned output path before each write, and section 8 puts `-n` on every command, so no run can overwrite anything. A target that already exists returns `OUTPUT_EXISTS` from section 5's list. Sections 3.2 (rule 5) and 3.3 (rule 3) write each attempt to its own path inside the run's temp folder and move only the survivor into the output folder. |
| G.6 | Working directory assumptions: Imagician's test helper writes relative `test-images/` and `test-output/` (`imagician/test/interactive.js:8-9,27`), the HLS asset fixes `OUTPUT_BASE="hls_output"` (`skill/assets/hls-video-conversion.md:180`), and the runtime leans on temp file names of its own (`vam/server.py:888,905,992,1278`). | Section 4.1 never falls back to the process working directory: with no root configured, a file tool fails with `CONFIG_MISSING`, every root and the output folder must be absolute, and section 6.8 ignores a relative setting or argument value with one warn line while the documented default stays in force. The relative habits above sit in test and asset code, which this contract does not port. |
| G.7 | Platform assumptions: the bare names `ffmpeg` and `ffprobe` must be on `PATH` (`vam/server.py:892,1429`, `vam/tests/test_video_functions.py:58,97`), a colon breaks a filter path such as a Windows drive letter (`vam/server.py:540,610`), `shutil.rmtree` can fail on Windows locks (`:970`), and the tests need lavfi and libx264 from the host build (`vam/tests/test_video_functions.py:74-78`). | Section 6 makes the bare names the third of four steps (override variable, bundled `ffmpeg-static` or `ffprobe-static`, system `PATH`, then the consented `media_setup_ffmpeg` install) and decides the Windows file names itself. Section 8 escapes a drive letter inside a filter value and checks each encoder and filter against the resolved build, so a build without libx264 returns `CAPABILITY_MISSING` before a run starts. The temp folder is removed even when a file in it is locked (4.5 and section 8), and the lavfi need above belongs to fixture generation in the source's tests, not to the server. |
| G.8 | Silent capability lies: `add_b_roll` accepts `audio_mix` on every clip and mixes nothing, mapping the main track instead (`vam/server.py:1466`, `:1528-1531`), and its `slide_*` transition values produce the same plain overlay as its basic branch (`:1363`, `:1506-1520`). | Section 1.5 says an enum lists only values the tool implements, so a value the port would accept and ignore is removed rather than documented. Section 3.3.7 removes `audio_mix` and the slide values, exposes the two fade booleans the port really implements, and maps audio only when the input carries a stream. Section 8 checks the encoders and filters the graph really uses, so an absent one returns `CAPABILITY_MISSING` instead of a silent change of behavior. |
| G.9 | Bugs that break a stated promise: `codec_to_use` is set to `'copy'` and never read, so the pad path re-encodes while the code claims a copy (`vam/server.py:201,223`, where `:181` only initializes it to `None`), the xfade audio branch is malformed and no fixture exercises it (inventory F.1, `vam/server.py:943-950`), `add_text_overlay`'s docstring defaults (`:583-584`) disagree with its code defaults (`:617-618`), and `vam/README.md:294` passes the literal `'center'`, which is not a valid drawtext expression. | Section 3 writes each schema from the behavior the port fixes rather than from the source's claims. The text overlay's `position` is the 3.3.1 enum, so a literal `'center'` is not expressible, the concat tool's xfade graph labels both chain outputs so `-map [v] -map [a]` cannot fail on a well-formed graph (3.3.5), the aspect-ratio tool states one outcome in its schema and description, and section 8 gates every encoder and filter the graph actually needs. |
| G.10 | Misleading error taxonomy: the `except FileNotFoundError` branches (`vam/server.py:37,71,108,262` and the others like them) are effectively unreachable, because a missing input raises `ffmpeg.Error` instead, so callers receive an "unexpected error" string that names nothing they can act on. | Section 4.2 proves an input exists and is a readable file before a tool opens it, and a failure there is `INPUT_NOT_FOUND` from section 5's list. Every other run failure maps to one code in that same list (`PROCESS_FAILED` with the capped stderr tail when nothing more specific fits), so a missing file, a rejected graph and a damaged stream never share one message. Section 6.6 reports a missing binary with the four steps that were tried. |
| G.11 | Unbounded work: no run carries a timeout and stderr is buffered in full (`vam/server.py:32` and every other `run` call). | Section 8 bounds every run with the 1800 second default timeout (`MEDIA_EDITOR_TIMEOUT_SECONDS` overrides it) and keeps the last 64 KB of stderr in process, returning 4 KB of it. A run past its limit is killed, its partial output and its temp folder are removed, and the caller receives `PROCESS_TIMEOUT`. Section 6.1 bounds the `-version` acceptance probe at ten seconds on the same principle. |
| G.12 | Imagician validates almost nothing at runtime: the tool JSON schemas declare `quality` with `minimum` and `maximum` (`imagician/src/index.ts:68-69,103-104`) that the handlers never recheck, `fs.mkdir(path.dirname(outputPath), {recursive:true})` builds whatever directory tree the caller's path implies (`:207`), `preserveAspectRatio` is wired to `withoutEnlargement`, which controls upscaling and not the aspect ratio (`:216`), `fit as any` skips the type check (`:215`), and the metadata dump returns the file's `lastModified` and size (`:376-387`). | Section 3 gives each image tool a validating schema with typed ranges and a `fit` enum, requires at least one dimension so the unchanged-copy path cannot pass, and names the upscale toggle `withoutEnlargement` (3.1). Section 4 builds directories only under the configured output folder, and no schema accepts a caller output path (1.4). `image_probe` returns the field set its schema fixes and drops `lastModified`. |
| G.13 | Doc drift: the README claims "All 30+" tools while the server registers 27 (`vam/README.md:369`), the server id says `0.1.0` while the package says `0.1.1` (`imagician/src/index.ts:17`, `imagician/package.json:3`), and two docstrings still read "Args listed in PRD" or "in previous messages" (`vam/server.py:119,1351`). | Section 2 is the count of record at 39 rows and is checked name by name against both registrations, and section 3 authors every tool description from its schema, so no source docstring or README count carries over. The version pair is set once in the manifest that phases 7 and 8 write, and the `media_health` schema (3.3.9) reports the one version the server is running. |

**Rows in this table: 13**, one for each numbered item in inventory section G (G.1 to G.13). Every row names the contract section that enforces its fix, and no item is missing or duplicated.

### 9.2 Fix detail by defect

Each bullet names the contract section that carries the rule. Inventory citations use `../context/source-inventory.md`.

**G.1 shell use**
- `shell: false` and an argv array for every spawn, the shape the sources already used for `subprocess.run` and which the port keeps (section 8.3, `vam/server.py:891-900`, `:1016-1024`, `:1428-1436`, inventory `:238`).

**G.2 concat-list injection**
- A quote in a file name stays legal (4.4 adversarial row), and no caller name is ever written into a list. The list holds the `norm_<i>.mp4` names the server generates, the join runs under `-safe 1` and `-protocol_whitelist file`, and an absolute or parent-relative entry fails with `Unsafe file name`. A file name with a line break was the second injection route, and it closes the same way (3.3.5, 8.3, `vam/server.py:1012`, with `-safe 0` at `:1019`).

**G.3 arbitrary paths and output equal to input**
- The guard rejects every path outside the roots, and the fresh-folder rule plus the per-write compare make `trim_video(SAMPLE, SAMPLE, ...)` and `toFile(outputPath)` (`imagician/src/index.ts:220`) impossible to express. The sources run only existence checks (4.3, `vam/server.py:514-517,592,689-692,841-843,1117,1353,1586`).
- Image tools: every `outputPath` and `outputDir` parameter becomes `outputName`, and no image tool creates a caller-named directory (3.1, `imagician/src/index.ts:207`). A `sizes[].suffix` with a separator escaped the output directory in the source (`imagician/src/index.ts:402-403`), and the schema now forbids separators and dots (3.1).
- Conversion tools: no parameter names an output file, every write lands in a fresh numbered folder, and the guard compares every planned output with every input, where the source accepted any writable output path and never compared the two (3.2, `vam/server.py:19`, inventory `:240`).
- `media_repair` and `video_hls_ladder` take `inputPath` and `outputName` only, and every ffmpeg run carries `-n` (3.4, inventory `:240`).
- A file inside a root cannot pull in a file outside it. Every input opens under `-protocol_whitelist file`, and the content gates of 8.3 refuse playlist, manifest and script files first, because an in-root `.m3u8` naming an absolute out-of-root `.ts` segment is read even under the whitelist (checked on ffmpeg 6.0). The real path a check returned is the path a child opens, and it is re-resolved before each spawn (4.2, 8.3).

**G.4 raw caller strings in ffmpeg arguments and filter graphs**
- One escaping helper (8.5), the temp-copy rule for unsafe filter paths (8.6) and the number round trip of section 3.3 replace the partial escape at `vam/server.py:610`, the raw times at `:619`, the raw subtitle path at `:540` and the partial font path at `:631-632` (inventory `:241-248`).
- An SRT or font path is validated like any input and reaches the filter graph only through the helper (4.2, 3.3.11, `vam/server.py:540`).
- Composition tools: the 3.3.11 routes, the 3.3.1 position vocabulary and the number round trip replace every raw route (`vam/server.py:610`, `:619`, `:540`, `:631-632`, `:728-735`).
- Conversion tools: codecs, formats and bitrates are enums, `resolution` and `aspectRatio` are parsed and rebuilt, and `paddingColor` is hex only, where the source passed the container and codec strings (`vam/server.py:100`, `:360`), the bitrate (`:278`), the resolution (`:130-132`, `:376-378`), the ratio (`:174-175`) and the colour (`:196`) through raw (3.2).
- Image tools: `background` accepts `#RRGGBB` only, where the source passed hex or named colours through unvalidated (3.1, `imagician/src/index.ts:129-133`).
- `video_hls_ladder` runs a static command (`skill/assets/hls-video-conversion.md:94-118`) whose only caller values, `rungs`, `crf` and `segmentDuration`, are a closed enum and two bounded integers, so the filter graph and the stream map come from server-side values alone. `media_repair` runs fixed commands picked by one enum (3.4).

**G.5 overwrite policy**
- One policy replaces the forced `-y` (`vam/server.py:898,1434,1547`) and the unflagged runs that prompt on stdin (`:55-58`): a fresh exclusive folder, `-n` and `-nostdin` on every command, and no write onto an existing path (4.3, 8.3, inventory `:249`).
- Each attempt of a two-attempt tool writes its own temp file and only the survivor moves into the folder, which removes the shared final path that could block a second attempt (3.2 rule 5, 3.3 rule 3, 8.4, `vam/server.py:546-558`, `:1625-1635`). A failed run removes what it wrote (8.4).
- `image_batch_resize` rejects duplicate suffixes instead of writing one file over another (3.1).

**G.6 working directory**
- Nothing the server writes uses the process working directory. The relative habits in the sources sit in tests and assets (`imagician/test/interactive.js:8-9,27`, `skill/assets/hls-video-conversion.md:180`), and the runtime uses temp file names only (4.1, 4.2, 6.8, `vam/server.py:888,905,992,1278`).

**G.7 platform assumptions**
- The bare `ffmpeg` and `ffprobe` names the sources spawn (`vam/server.py:892,1429`, `vam/tests/test_video_functions.py:58,97`) become the third of four lookup steps, behind an override and a bundled binary, and the Windows file names are decided in section 6 instead of a host `PATH` lookup inside a command (6.1, 8.3).
- Drive letters and UNC names are carried as path values and resolved, never concatenated into command strings (4.2). Inside a filter value a drive letter survives through the escape or the temp copy (8.5, 8.6, 3.3.11, `vam/server.py:540`, `:610`, inventory `:251`).
- Temp cleanup is a forced, retried remove that tolerates a Windows lock (8.4, `vam/server.py:970`).

**G.8 silent capability lies**
- `audio_mix` and the `slide_*` transitions of `add_b_roll` are removed instead of documented (1.5, 3.3.7, `vam/server.py:1466`, `:1528-1531`, `:1363`, `:1506-1520`).

**G.9 bugs that break a stated promise**
- `video_set_aspect_ratio` states its re-encode instead of carrying the dead `codec_to_use` variable, which the source set to `'copy'` at `vam/server.py:201` and never read (3.2.6, inventory `:253`).

**G.10 misleading error taxonomy**
- Every failure maps to one section 5 code with structured details, where the source's catch-all returned an unstructured string (3.2, `vam/server.py:39-40`).
- A missing binary is one code that lists the steps that were tried and names `media_setup_ffmpeg` as the next step, rather than a `FileNotFoundError` branch the sources rarely reach (6.6, inventory `:254`).

**G.11 unbounded work**
- Every run is bounded by `MEDIA_EDITOR_TIMEOUT_SECONDS`, 1800 seconds by default, with a kill on expiry, and its stderr is capped at the last 64 KB in process and 4 KB in a result, where the sources set no timeout and buffered every byte (8.4, `vam/server.py:32`, inventory `:255`, NFR-P01 and NFR-P02 at `spec.md:169-170`). The `-version` acceptance probe keeps its own ten-second bound (6.1).
- Every subprocess of the four new tools goes through the same runner (3.4).

**G.12 Imagician's missing runtime validation**
- `preserveAspectRatio` was wired to `withoutEnlargement` (`imagician/src/index.ts:216`), so the name now states the real behavior, no upscaling, while the source default is kept (3.1).
- The untyped `fit as any` cast (`imagician/src/index.ts:215`) becomes a validated enum, so no string reaches sharp (3.1).
- `image_crop` checks the region against the image first and returns `INVALID_INPUT`, where the source had no bounds check and let sharp throw (3.1, `imagician/src/index.ts:272-274`).
- A `direction` outside its enum and a missing `format` silently wrote a copy in the source, and the required enums now fail at the schema layer (3.1).
- The quality range the source declared but never enforced (`imagician/src/index.ts:68-69,103-104`) is enforced by the zod bounds on every call (3.1).
- A resize call with neither dimension is rejected by the handler with `INVALID_INPUT`, where the source wrote an unchanged copy and reported success (3.1, `imagician/src/index.ts:211`).
- `image_probe` drops the local `lastModified` the source returned (3.1, `imagician/src/index.ts:376-387`).
- The server builds directories only under the configured output folder, where the source created whatever tree the caller's output path implied (4.3, `imagician/src/index.ts:207`).

**G.13 doc drift**
- The composite `video_convert_properties` schema is written fresh, where the source docstring said `Args listed in PRD` (3.2.5, `vam/server.py:119`), and the four new tools get descriptions authored here, where one source docstring points at a document that does not exist (3.4, `vam/server.py:1350-1351`, inventory `:257`).
- `media_health` reports one version from the manifest (3.3.9, `imagician/src/index.ts:17`, `imagician/package.json:3`).

**F.1 xfade graph**
- Both chain outputs carry their labels, so `-map [v] -map [a]` cannot fail on a well-formed graph (3.3.5, `vam/server.py:943-950`).

**F.2 to F.5 build-dependent names**
- The bundled font is passed as `fontfile=` on every run instead of depending on fontconfig (3.3.3, `vam/server.py:630-632`).
- The gate of 8.2 covers `drawtext`, `subtitles`, `xfade` and the encoders, so a build without libass or another needed name fails before the run instead of mid-encode (8.2, `vam/server.py:540`, inventory `:215-221`).

**F.6 temp directories**
- `mkdtempSync` plus a forced, retried removal in `finally` replaces `tempfile.mkdtemp` and `shutil.rmtree`, which could raise on a Windows lock (8.4, `vam/server.py:859`, `:970`, `:1033`, `:1561`, inventory `:223`).

**F.7 ffmpeg-python aliases and stream capture**
- The argv blocks carry real ffmpeg flags, and `-ss` and `-to` precede `-i`, where the source's option names existed only in the library's translation table (3.2 rule 3, inventory `:227-228`).
- The detect pass of `media_remove_silence` reads its stderr tail the way the source's `run_async` scrape did, and the ffprobe JSON read replaces `ffmpeg.probe` (8.4, `vam/server.py:1127-1139`, inventory `:226`, `:229`).

**Gaps from inventory section H**
- No named source carries repair recipes (inventory `:273`). Section 3.4 fixes both `media_repair` passes on the commands that do exist, the repair flow's copy (`skill/README.md:208`), the plain re-encode (`skill/references/mcp-video-audio.md:97`) and the audio re-encode (`:156`), with the copy-first order the ported tools already use (`vam/server.py:55-66`, `:360-362`). `006-probe-repair-hls` implements exactly these command shapes.
- The source probe helper answered `44100`, `2` and `stereo` for a file with no audio and `0` for a missing width or height (`vam/server.py:1248-1253`). `media_probe` omits what the file does not carry and keeps only the documented fallback of 30 frames per second (3.4, `:1260-1262`).
- The HLS asset and the skill tell the user to install ffmpeg by hand (`skill/assets/hls-video-conversion.md:33-36`, `:239`, `skill/SKILL.md:266`). `media_setup_ffmpeg` replaces that with a pinned, consent-gated download into the server data folder that step 4 of the resolver then reads (3.4, 6.5).

## 10. Licences and attribution

This section is the attribution plan that AC-010 checks: given this plan, when `THIRD_PARTY_NOTICES` is drafted from it, both upstream copyright lines appear verbatim and every bundled dependency is listed (`acceptance-criteria.md:66`). REQ-010 names the same file and the same two lines (`spec.md:132`). The section fixes three things: the files every distribution carries, the table of bundled dependencies whose licence texts still have to be fetched upstream, and the GPL obligations that follow from shipping an ffmpeg build inside the bundle. The parent spec hands enforcement to phase 7, which blocks packing until the notices exist (`spec.md:158`, R-002 at `spec.md:215`).

Both upstreams are MIT. Imagician declares it at `imagician/package.json:17` and carries the text at `imagician/LICENSE:1-21`, under the line `Copyright (c) 2024 Hongyi Wang` at `imagician/LICENSE:3`. Video-audio carries the same text at `vam/LICENSE:1-21`, under `Copyright (c) 2025 misbahsy` at `vam/LICENSE:3` (inventory I.1, `../context/source-inventory.md:292,297`). Everything else the bundle ships is a dependency that neither source tree contains, and the inventory records those licences as unknown from these sources (`../context/source-inventory.md:306`). The plan therefore has two halves: keep the two MIT texts exactly as they are, and fetch the rest before anything is packed.

### 10.1 The files the package carries

The files below sit at the package root, `AI Systems/Media Editor/mcp server/`, and travel with every distribution that carries the binaries, the `.mcpb` bundle and the Claude Code plugin alike, because both package this server. Phases 7 and 8 own the manifests that place them, and this section fixes what they must contain.

| Path | Content |
|------|---------|
| `THIRD_PARTY_NOTICES` | The merged project's own licence line, both upstream MIT blocks in full, and one entry per bundled component |
| `licenses/<component>-LICENSE.txt` | One verbatim licence text per bundled component, named by the table in 10.3 |
| `licenses/ffmpeg-LICENSE.txt` | The licence text of the shipped ffmpeg build (10.4) |
| `licenses/ffmpeg-SOURCE.md` | The written source pointer for the shipped ffmpeg build version (10.4) |

`THIRD_PARTY_NOTICES` is the index a reader starts from. Every entry in it names the `licenses/` file that holds the full text, so no text is duplicated across the two files and none goes missing.

### 10.2 The THIRD_PARTY_NOTICES outline

The order is fixed: the merged work's own line first, then Imagician, then video-audio, then the dependency index. The new line for the merged work is the inventory's own rule (I.1, `../context/source-inventory.md:304`). Each upstream block repeats its copyright line verbatim and then the full MIT text, because that is the condition both licences attach to copied code (`imagician/LICENSE:12-13`, `vam/LICENSE:12-13`). The two bodies are the same standard text and differ only in the copyright line above them, and both blocks still carry the whole body. The blocks are copied from the two files rather than retyped, so a byte comparison stays possible at pack time.

```text
THIRD_PARTY_NOTICES

Media Editor MCP server
Copyright (c) 2026 <rights holder>
MIT licence

Portions of this server derive from the MIT licensed projects below. Their
licence texts are reproduced in full. The licences of the bundled third party
components follow after them.

================================================================================
Imagician
================================================================================

MIT License

Copyright (c) 2024 Hongyi Wang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================================================================================
video-audio-mcp (misbahsy/video-audio-mcp)
================================================================================

MIT License

Copyright (c) 2025 misbahsy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================================================================================
Bundled runtime dependencies
================================================================================

@modelcontextprotocol/sdk      licenses/mcp-sdk-LICENSE.txt
zod                            licenses/zod-LICENSE.txt
sharp                          licenses/sharp-LICENSE.txt
prebuilt libvips behind sharp  licenses/libvips-LICENSE.txt
ffmpeg-static                  licenses/ffmpeg-static-LICENSE.txt
ffprobe-static                 licenses/ffprobe-static-LICENSE.txt
the ffmpeg build in the bundle    licenses/ffmpeg-LICENSE.txt
                                  licenses/ffmpeg-SOURCE.md
the ffprobe build in the bundle   licenses/ffprobe-LICENSE.txt and
                                  licenses/ffprobe-SOURCE.md when it is not
                                  the ffmpeg build
```

Two notes on the template. The `<rights holder>` placeholder is filled by phase 7 when it writes the manifest, so the notice and the package metadata name the same holder. The dependency index repeats every row of 10.3, and each name in it matches a file the bundle carries.

### 10.3 Bundled runtime dependencies

This table answers the second half of REQ-010: every bundled dependency whose licence text still has to be fetched upstream (`../context/source-inventory.md:306-308`). A row stays unresolved until its text is in the repo. The word UNKNOWN is a to-do, not a value to ship: where the sources carry no licence string, the text is fetched from the pinned package or archive and copied verbatim.

| Package or component | Licence | Where to fetch the licence text | Obligation |
|----------------------|---------|--------------------------------|------------|
| `@modelcontextprotocol/sdk` (the 1.x line this server pins) | MIT, npm registry read of 1.31.0 (`../002-server-foundation/scratch/package-facts.md:5-9`) | The `LICENSE` file of the pinned npm package | Copy verbatim to `licenses/mcp-sdk-LICENSE.txt` and list it in the notices index |
| `zod` | MIT, npm registry read of 4.6.5 (`../002-server-foundation/scratch/package-facts.md:5-9`) | The `LICENSE` file of the pinned npm package | Copy verbatim to `licenses/zod-LICENSE.txt` and list it in the notices index |
| `sharp` (source evidence: `^0.33.2` at `imagician/package.json:47`, locked 0.33.5 at `imagician/package-lock.json:1090-1092`) | Apache-2.0, npm registry read of the 0.35.5 pin (`../002-server-foundation/scratch/package-facts.md:5-9`). The sources carry no licence string | The `LICENSE` file of the pinned npm package | Copy verbatim to `licenses/sharp-LICENSE.txt` and list it in the notices index |
| The prebuilt libvips binaries behind sharp (`@img/sharp-*`) | UNKNOWN in the sources | The notice files the pinned prebuilt packages carry | Copy verbatim to `licenses/libvips-LICENSE.txt` and list it in the notices index |
| `ffmpeg-static` | GPL-3.0-or-later, the package itself (`../002-server-foundation/scratch/package-facts.md:5-9`) | Its package `LICENSE` file | Copy verbatim to `licenses/ffmpeg-static-LICENSE.txt` and list it in the notices index |
| `ffprobe-static` | MIT, npm registry read of 3.1.0 (`../002-server-foundation/scratch/package-facts.md:5-9`) | Its package `LICENSE` file | Copy verbatim to `licenses/ffprobe-static-LICENSE.txt` and list it in the notices index |
| The ffmpeg build `ffmpeg-static` downloads at install | GPL, the package is GPL-3.0-or-later and the build is a GPL configuration (inventory I.3 and F.5, `../context/source-inventory.md:221,306`, `../002-server-foundation/scratch/package-facts.md:5-9`) | The licence files inside the pinned build archive | `licenses/ffmpeg-LICENSE.txt` and `licenses/ffmpeg-SOURCE.md`, per 10.4 |
| The ffprobe binaries `ffprobe-static` ships | UNKNOWN, the shipped build decides. The package ships its binaries and fetches nothing (`../002-server-foundation/scratch/package-facts.md:5-9`) | The licence files inside the pinned package | The `ffprobe-` pair of 10.4 when its build differs from the ffmpeg build, otherwise the ffmpeg pair covers both |

Three rules hold for the table:

- The fetch follows the pin. Phase 2 pins the versions of the packages above, and the licence text of a pin is copied in the same change that pins it.
- Phase 7 refuses to pack while any row is still UNKNOWN or a file its obligation names is missing.
- The rows cover runtime components only. The dev dependencies of the first source (`typescript`, `tsx`, `@types/node` at `imagician/package.json:49-53`) and the Python packages of the second (`ffmpeg-python`, `mcp`, `pillow` at `vam/pyproject.toml:7-12`) are not carried by this server and need no entry. The ported code from `vam/server.py` stays under misbahsy's MIT all the same, which is the second MIT block in 10.2 (inventory I.2, `../context/source-inventory.md:305`).

The sources show version evidence without a licence string, so the SDK, zod, sharp, ffmpeg-static and ffprobe-static rows take their licence from the npm registry reads of the pinned versions, and the rows still marked UNKNOWN are the binaries whose text has to be fetched from the pinned artifacts. The SDK's only trace is the 0.5.0 lockfile entry (`imagician/package-lock.json:833-835`), and sharp's is the `^0.33.2` range with its 0.33.5 lock (`imagician/package.json:47`, `imagician/package-lock.json:1090-1092`). Neither carries licence text (`../context/source-inventory.md:306`), and the libvips prebuilts are not vendored here at all (`../context/source-inventory.md:295`). The libvips row is a shipped binary rather than a text-only dependency: the prebuilt arrives with sharp, the lockfile already points at the libvips open collective (`imagician/package-lock.json:830`), and the notice has to name it.

### 10.4 GPL obligations for the shipped ffmpeg and ffprobe builds

`ffmpeg-static` is itself GPL-3.0-or-later and downloads a GPL ffmpeg build at install time (`../002-server-foundation/scratch/package-facts.md:5-9`, inventory I.3 and F.5, `../context/source-inventory.md:221,306`). The server runs ffmpeg as a separate program: the child process starts from an args array with no shell, the rule the sources already keep (inventory G.1, `../context/source-inventory.md:238`), and no ffmpeg code is linked into the Node process. The ffmpeg process is separate from the server, and the GPL obligations attach to the binaries the bundle carries and to the `ffmpeg-static` package code it redistributes. One point is left open for `007-desktop-extension`: the server imports `ffmpeg-static` only to learn the binary path, and phase 7 settles whether that import stays, which keeps the redistributed package code inside the bundle's GPL notices, or the path is resolved without importing the package.

The build observed for 6.3 declares `--enable-nonfree` in its configure line, and FFmpeg's configure help describes that option as producing binaries that are unredistributable. Whether any non-free library is actually linked was not checked here. Until it is, the source of the shipped binaries is a decision for `007-desktop-extension` with two outcomes: keep the `ffmpeg-static` import after checking the build's linked libraries and its licence line, or replace it with a build whose configure line is GPL only. The tool set works with either, because the resolver reads a path (6.1) and the capability gate reads the build (8.1).

What changes is where the binary comes from. Both sources treat ffmpeg as a prerequisite the user installs (`vam/README.md:564`, `skill/assets/hls-video-conversion.md:33-36`), and the inventory records that with `ffmpeg-static` it becomes a redistributed component instead (`../context/source-inventory.md:308`). Redistribution inside a `.mcpb` triggers the GPL obligations (inventory I.3, `../context/source-inventory.md:306`). Two of those obligations are concrete and both are checkable at pack time:

- The licence text of the exact shipped build travels in the bundle, verbatim.
- A written pointer names the corresponding source for that exact build version, never for the ffmpeg project in general.

The files fixed here:

| File | Content | Check before packing |
|------|---------|----------------------|
| `licenses/ffmpeg-LICENSE.txt` | The complete licence text of the shipped build, copied verbatim from the build archive | Present, non-empty, and taken from the same archive as the shipped binary |
| `licenses/ffmpeg-SOURCE.md` | The build version, the build URL, the release name, the SHA-256 of the shipped binary, and the URL of the corresponding source for that exact version | Present, and its version equals the first line of `ffmpeg -version` for the shipped binary |

Rules that apply to the pair:

- One pair per distinct shipped build. When the ffprobe binary that `ffprobe-static` ships comes from the same build as the ffmpeg binary, the `ffmpeg-` pair covers both binaries. When it comes from a different build, the parallel pair `licenses/ffprobe-LICENSE.txt` and `licenses/ffprobe-SOURCE.md` is added and passes the same two checks. A pair never describes a build that is not in the bundle.
- The version in `ffmpeg-SOURCE.md` is the same string section 6.7 records in the resolution cache and `media_health` reports as `version`, so the pointer ties to the binary that actually runs.
- `007-desktop-extension` blocks packing until both files exist and pass the checks (`spec.md:158`, R-002 at `spec.md:215`). The gate covers every platform the bundle supports, because section 6.3 requires the binary pair to travel inside the bundle.
- Replacing the bundled binary repeats the pair. A new ffmpeg version beside an old `ffmpeg-SOURCE.md` is the failure this check exists for.

### 10.5 The `media_setup_ffmpeg` download path

`media_setup_ffmpeg` installs a build after the user consents, so the same obligations apply without a pack step: the binary that lands in the data folder is a redistributed build too, even though the user asked for it. The call writes the same notices next to the unpacked binary, inside the server data folder that section 6.5 fixes:

```text
<data dir>/bin/ffmpeg                          the unpacked binary
<data dir>/bin/ffprobe                         the unpacked binary
<data dir>/bin/licenses/ffmpeg-LICENSE.txt
<data dir>/bin/licenses/ffmpeg-SOURCE.md
<data dir>/bin/licenses/ffprobe-LICENSE.txt    when the ffprobe build differs
<data dir>/bin/licenses/ffprobe-SOURCE.md      when the ffprobe build differs
```

Rules for this path:

- The plan rows of section 3 already carry the pinned version, the URL, the byte count and the SHA-256 of the artifact, so `ffmpeg-SOURCE.md` is written from values the call holds before it downloads. No second request and no extra fetch is needed for the pointer.
- The consent result shows those plan rows, and the download keeps the URL the plan showed, so the pointer beside the binary names the artifact the user agreed to.
- `install.json` (section 6.5) records the notice file names beside the binary they describe, so a missing notice is visible from the install record the same way a missing binary is.
- The success result lists the licence file paths next to the installed binary paths, with the section 7 shape. The notice files join the writes of that call (section 3).
- Phase `008-claude-code-plugin` builds this tool, row 39 of the unified table, and these writes are part of its contract. A download that completes without them is not a success.
- The server's own code sends no media, file names or metadata off the machine. The only network use in this contract is this download: it starts after `consent: true`, a caller assertion that the client must gate (3.4), and its request carries the artifact URL the plan showed and nothing taken from the user's files. The claim also covers the runs the server starts: every ffmpeg and ffprobe input opens under `-protocol_whitelist file` and the content gates refuse playlist and manifest files that could name a remote segment (8.3), so a file inside a root cannot make a child fetch a URL. That rests on checks made on ffmpeg 6.0, and it does not cover a binary the user names in `MEDIA_EDITOR_FFMPEG_PATH`, whose behavior the server does not control.

AC-010 is met when the drafted `THIRD_PARTY_NOTICES` carries `Copyright (c) 2024 Hongyi Wang` and `Copyright (c) 2025 misbahsy` verbatim in their MIT blocks and lists every row of 10.3 (`acceptance-criteria.md:66`).

## Change log

Later phases amend this contract in place and add one dated line here.

| Date | Version | Change |
|------|---------|--------|
| 2026-09-28 | 0.1 | Assembled from the thirteen section drafts. Error codes mapped onto the section 5 list, gate lists merged into 8.2, defect lists merged into section 9, and the `vam/server.py:181` citation for `codec_to_use = 'copy'` corrected to `:201` |
| 2026-09-28 | 0.2 | Fixes from the read-only review: the drawtext box group joins with `:` and every drawtext carries `expansion=none`, `force_style` is quoted and `fontsdir` is in the subtitles argv, the silence `select` expressions are quoted, attempt 2 names `-c:a aac`, the seven 3.3 tools have `Output:` lines and write through the temp folder, pad and crop truncate like the source, the licence rows carry the registry values, three citations are corrected, and two rules are added: large-file guidance in the tool descriptions (8.4) and the no-media-leaves-the-machine rule (10.5), the ffprobe platform gap recorded in 6.3 (`darwin/arm64` binary is x86_64, no `linux/arm64` binary, all six binaries shipped) with the observed `ffmpeg-static` capability list for `darwin-arm64`. A later security pass, with each rule checked on ffmpeg 6.0 where it touches ffmpeg: the two-level filter escaping rule replaces the earlier table (8.5), every input opens under a file-only protocol whitelist behind indirection and SubRip content gates (8.3), the concat list holds only server-generated names under `-safe 1` (3.3.5), HLS patterns are relative to the numbered folder with an output-exists check (3.4, 8.4), images pass a magic-byte allowlist and a 100 Mpx cap (3.1), paths compare byte-exact after NFC with a re-resolve before each spawn and images write with an exclusive create (4.2, 4.3), children get an environment allowlist and results carry 4 KB of stderr (8.3, 8.4), the installed binary is checked against a pinned `binarySha256` with a hardened download and consent recorded as a caller assertion (3.4, 6.5), the resolver checks the version-line shape and re-stats a cached binary (6.1, 6.7), and the `--enable-nonfree` build flag is recorded for phase 7 (10.4) |
| 2026-09-29 | 0.2 | Sections 1, 6 and 9 name the phases that build them, and section 6 gains 6.10, the test matrix axes (5 platforms, 3 media kinds, 4 lookup steps). The defects subsection is now 6.11. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 2 amendments: step 2 of 4.2 compares a Windows UNC path with the roots as a string before any file system call, the 4.4 UNC row says so, a note says the drive-letter and UNC rows describe a Windows host, and the section 5 snippet names the constant `ERROR_CODES` as the package does. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 2 process-runner amendments: 8.3 puts the file-only whitelist once at the start of an ffprobe argv, which also covers the positional input of 3.4, and the content-gate paragraph names the `detected` value of each gate. Section 5 lists `reason` in the `INTERNAL` details for a non-absolute binary path, and the 8.3 environment row notes the key macOS adds to every child. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 2 resolver amendment: the 6.2 sample `lookedIn` for a rejected override names the value and the reason, the same shape 6.6 uses for the other steps. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 2 capabilities amendment: the two list reads of 8.1 use a 30 second timeout instead of the job limit. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 2 registry amendment: the section 5 protocol error table names the server's own `tools/call` handler as the source of `-32601` and `-32602`, because SDK 1.31 returns both cases as plain `isError` results. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 2 review amendments: 4.2 and 4.4 treat `//server/share` and mixed separators as UNC and `//?/` and `//./` as special paths on Windows, and the normalized string is what the root compare reads. Section 5 covers a binary that resolved but would not start (`spawnFailed`, `spawnCode`, `exitCode` -1) and names `leftover` in the `details` rule. 8.4 says an `OUTPUT_EXISTS` refusal removes nothing and that a path cleanup cannot remove is listed in `leftover`. 8.3 says the runner is handed every resolved input as a required argument. 6.6 and 6.7 separate `absent` from `unusable` and add `skipped` to a found binary in `media_health`. No tool input schema changed, and the `media_health` result gained the optional `skipped` field |
| 2026-09-29 | 0.2 | Phase 3 amendment: the neither-dimension check of `image_resize` is a handler check returning `INVALID_INPUT` (`dimension-required`), not a schema `.refine()`, because the registry validates a field shape. No other tool schema changed |
| 2026-09-29 | 0.2 | Phase 3 amendment: `media_health` (3.3.9) reports `imageEngine` with the sharp and libvips versions. `outputName` is one shared schema field that fails on `/` and `\` and on a length outside 1 to 64, which is what 4.4 already required. No other tool schema changed |
| 2026-09-29 | 0.2 | Phase 4 amendments: the `video_trim` time order is a handler check (`end-not-after-start`), not an object `.refine()`. The aspect-ratio sizes floor to an even number, because libx264 refuses odd 4:2:0 sizes. The four audio-track tools need an audio stream as well as a video stream. An audio container outside 3.2.1 carries `reason: "container"`. A fallback attempt that made the file adds its 7.2 warning. The section 5 `INVALID_INPUT` sentences leave malformed pattern values to the schema (`-32602`), as the protocol table already said. No field was added or removed |
| 2026-09-29 | 0.2 | Phase 5 amendment: `media_remove_silence` (3.3.6) rebuilds timestamps with `setpts=N/FRAME_RATE/TB` and `asetpts=N/SR/TB`, because `PTS-STARTPTS` left interior silences in the timeline (a 7-second file keeping 2 seconds came out 4.02 seconds long on ffmpeg 6.0), and the detection reads a signed `silence_start`. The gated filters are unchanged. No other tool schema changed |
| 2026-09-29 | 0.2 | Phase 5 amendment: `video_add_b_roll` (3.3.7) shifts each clip with `setpts=PTS-STARTPTS+<insertAt>/TB` before its overlay, because the unshifted clip showed from `insertAt` seconds into itself and its fade-in never appeared (checked on ffmpeg 6.0). The 8.1 filter table and the 8.2 row add `setpts` for the tool, and the grid scale token floors each side to an even number. The 8.2 row for `video_add_image_overlay` gates `scale` only when a size is given, as rule 1 requires, because the graph writes it only then. No other tool schema changed |
| 2026-09-29 | 0.2 | Phase 6 amendment: `video_hls_ladder` (3.4) drops each requested rung taller than the source's shorter side, names it in `droppedRungs` with one warning, and returns `INVALID_INPUT` (`larger-than-source`) when no rung is left, because the phase goal rules out upscaling and the recipe's `force_original_aspect_ratio=decrease` enlarged a 640x360 source to 1920x1080 on ffmpeg 6.0. Profile and level carry a stream index, because the recipe's unindexed flags gave every rung the last value (a 720p rung encoded as Constrained Baseline 3.1). Section 5 lists the new reason. No other tool schema changed |
| 2026-09-29 | 0.2 | Phase 6 amendments, approved by the operator on 2026-09-29: an attached picture is not a video stream, so `media_probe` leaves album art out of its summary and the `media_repair` diagnosis reads `stream_disposition=attached_pic` and sends a song with a cover down the audio branch, whose re-encode gains `-vn` and one warning; `auto` decodes its copy once and re-encodes when the check prints an error; the ladder's frame rate is the shared input probe's, `avg_frame_rate`, then `r_frame_rate`, then 30 |
| 2026-09-29 | 0.2 | Phase 7 amendment, approved by the operator on 2026-09-29: 4.1 accepts a bare path argument as an allowed root, because a Claude Desktop bundle expands its multi-folder setting into one argument per folder and the server kept only the first; an unknown flag takes its value along, so a typo never widens the roots |
| 2026-09-29 | 0.2 | Phase 8 amendment, approved by the operator on 2026-09-29: `media_setup_ffmpeg` (3.4 step 4) follows one `https` redirect to the host its pinned row names, and the plan rows gain `redirectHost`, because eight of the ten pinned files are GitHub release links that always answer 302 with an expiring signed link, so the no-redirect rule left setup working on darwin-arm64 alone. Section 5 narrows the `DOWNLOAD_FAILED` redirect case to match. The digests and the size cap are unchanged |
| 2026-09-29 | 0.2 | The operator approved this contract as built, with every amendment above. No tool schema changed |
| 2026-09-29 | 0.2 | Phase 10 amendment, approved by the operator on 2026-09-29 ("Re-encode like others"): an MP4, M4A or M4V file holding a PCM audio or an FFV1 video stream counts as a failed attempt (3.2, rule 5), a failed `remux` and a reason for the `auto` re-encode (3.4), and a failed no-silence copy (3.3.6), and section 5 lists it under `PROCESS_FAILED`. ffmpeg 9, shipped on Apple Silicon, stores both by stream copy where the builds on the other four platforms refuse, so one request now gives the same file everywhere. No tool schema changed |
