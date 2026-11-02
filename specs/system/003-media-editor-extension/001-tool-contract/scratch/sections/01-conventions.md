## 1. Naming and parameter conventions

These rules fix the name and schema vocabulary for all 39 tools. Section 3 restates them tool by tool, and no later section overrides them.

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
- `crf` is the ffmpeg constant rate factor scale: an integer from 0 to 51, lower is better, with 23 recommended as visually transparent (`skill/assets/hls-video-conversion.md:158`). It appears only on tools that run a CRF-capable encoder, never on an image tool.
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
- For each call the server creates `<output folder>/<NNN> - <description>/` and writes every output file inside it. `<output folder>` is the configured output root (section 4), `<NNN>` is the next free three-digit number in that folder and is never reused, and `<description>` is the slug of `outputName`: lowercase, spaces to single hyphens, every other character dropped, an empty slug rejected. The shape matches the Media Editor export convention (`AI Systems/Media Editor/AGENTS.md:40,46-53`).
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
