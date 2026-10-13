### 3.2 Video and audio conversion tool schemas

This subsection fixes the 19 tools built in `004-video-audio-core`: section 2 rows 10 to 27 and row 32. Section 1 rules hold without restatement: lowercase snake_case names, camelCase parameters, `inputPath` and `outputName` as the only path-shaped fields, seconds for a plain time parameter, `#RRGGBB` colours, the bitrate strings `videoBitrate` and `audioBitrate`, and enum values spelled in lowercase with single underscores. Every table reads `parameter | type | required or default | range or enum | unit | notes`, and every code block is the argv array for `spawn(bin, args, { shell: false })`, one element per token (ADR-003). `-n` appears on every command, and every run is bounded by the section 8 process policy: 1800 seconds by default (`MEDIA_EDITOR_TIMEOUT_SECONDS`), the last 64 KB of stderr kept, and the private temp folder removed in `finally`.

Source shorthands: `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/` and `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

Five rules hold for the whole subsection.

1. **Each tool writes into one fresh numbered folder.** Every output goes to `<output folder>/NNN - <slug>/` (sections 1.4 and 4.3), never onto an input, and no parameter can name an output file or directory. The source sent every output to a caller-chosen path and never compared it with the input, so an output equal to its input destroyed the source file (inventory G.3 at `../context/source-inventory.md:240`, the source's output parameters at `vam/server.py:19`).
2. **Every raw source value becomes an enum, a range or a parsed pattern.** The source passed caller strings straight into `-f`, `-c:v`, `-c:a`, `-b:v`, `-b:a` and `-vf scale=` (`vam/server.py:100,144,278,360,376-378`), and its numeric parameters had no bounds either (`vam/server.py:299`, `:320`, `:423`). Inventory G.4 records the string half (`../context/source-inventory.md:241-248`). Codecs, formats and containers are closed enums in the tables below, and every number states its range. `resolution` and `aspectRatio` are regular expressions the server parses and then rebuilds as `scale=<W>:<H>`, `scale=-2:<H>`, `crop=...` or `pad=...`, so no caller byte reaches a filter graph.
3. **ffmpeg-python keyword aliases become real flags.** `vcodec`, `acodec`, `video_bitrate`, `audio_bitrate`, `vf`, `ar`, `ac`, `r`, `format`, `ss` and `to` are library options, not ffmpeg flags, and the translation table is not in either source (inventory F.7 at `../context/source-inventory.md:227`). The argv blocks below carry `-c:v`, `-c:a`, `-b:v`, `-b:a`, `-vf`, `-ar`, `-ac`, `-r`, `-f`, `-ss` and `-to`. The two input options come before `-i` (`../context/source-inventory.md:228`).
4. **Every run is checked before it starts.** Each tool probes its input and requires a stream: the video tools need a video stream, the audio tools need an audio stream, and a mismatch returns `UNSUPPORTED_FORMAT` with `detected` and `accepted` (section 5). The source ran ffmpeg first and returned the failure as a string (`vam/server.py:34-36`). Encoders and filters are then gated against the resolved binary (3.2.21, section 8), so a missing `libx264` is `CAPABILITY_MISSING` before the command starts, never a half-written file.
5. **Two-attempt tools write each attempt to its own temp path.** Nine tools route through the source's shared helper `_run_ffmpeg_with_fallback` (`vam/server.py:332-348`, used at `:362, :383, :397, :411, :425, :439, :453, :467, :481`): a primary call, then a fallback call after the first failure. `video_trim` and `video_set_aspect_ratio` build the same shape inline (`vam/server.py:60-70`, `:221-233`). The port keeps the shape and fixes the collision the source had: both attempts went to the same path with no `-n`, so a partial file from attempt 1 could break attempt 2 and ffmpeg could prompt on stdin (inventory G.5 at `../context/source-inventory.md:249`). Here each attempt writes its own file inside the run's private temp folder, `-n` guards both, and only the surviving file moves into the output folder. When both fail, the result is one `PROCESS_FAILED` whose `stderrTail` is the two tails capped at the last 64 KB (section 5). The other eight tools run one command.

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

The pairs follow the skill's format and codec tables (`skill/references/mcp-video-audio.md:196-209`, `:216-226`). The source passed the caller's container string to `-f` and let ffmpeg choose every unset encoder (`vam/server.py:360-361`, `:144`), so the same call could produce a different codec per machine. The contract names the pair, and 3.2.21 gates it.

**Audio containers** (the six `audio_*` tools of this subsection and the audio settings of the composite tools):

| `format` | `-f` argument | Extension | Default encoder |
|---------|---------------|-----------|-----------------|
| `mp3` | `mp3` | `.mp3` | `libmp3lame` |
| `wav` | `wav` | `.wav` | `pcm_s16le` |
| `m4a` | `mp4` | `.m4a` | `aac` |
| `flac` | `flac` | `.flac` | `flac` |
| `ogg` | `ogg` | `.ogg` | `libvorbis` |

`aac` is accepted as an alias of `m4a` and normalizes before use, because the source's docstring offered it as a target (`vam/server.py:84`) and the skill writes AAC into `.m4a` (`skill/references/mcp-video-audio.md:156`). The five containers are the audio formats the skill lists (`skill/references/mcp-video-audio.md:202-209`). A tool that keeps the input's container reads it from ffprobe and maps it to this table. Anything outside the five is `UNSUPPORTED_FORMAT` with `accepted` naming them.

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

Output: one file, `<basename>-audio.<ext>`. Gates: the encoder named by `audioCodec`.

#### 3.2.3 `video_trim`

Source: `trim_video` (`vam/server.py:42-74`, inventory section B row 3 at `../context/source-inventory.md:43`). Cuts one video to the span between two times, trying a stream copy first and re-encoding only on failure (`vam/server.py:55-66`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `startTime` | number or string | required | 0 or more, less than `endTime` | seconds | string forms `HH:MM:SS`, `HH:MM:SS.mmm`, `MM:SS` or plain numeric (section 1.3) |
| `endTime` | number or string | required | greater than `startTime`, a value past the last timestamp means end of input | seconds | the source documented `HH:MM:SS or seconds` for both (`vam/server.py:49-50`) and passed the strings into `ss=` and `to=` (`:55`). A `.refine()` on the object enforces `startTime < endTime` |

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

Output: one file, `<basename>-trimmed.mp4`. Gates: `libx264` and `aac` before attempt 2.

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

Output: one file, `<basename>-converted.<ext>`, the extension of `format`. Gates: the `format` default encoder.

#### 3.2.5 `video_convert_properties`

Source: `convert_video_properties` (`vam/server.py:113-155`, inventory section B row 5 at `../context/source-inventory.md:45`). Change a video's container and set its resolution, codecs, bitrates, frame rate and audio properties in one call. It re-encodes every stream it is not told to keep, which is the line between it and the `video_set_*` setters (section 2, ADR-004 in `plan.md`). The source docstring said `Args listed in PRD` (`vam/server.py:119`), so this schema is written fresh (inventory G.13 at `../context/source-inventory.md:257`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | existing file under an allowed root | path | the video, opened read only (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |
| `format` | string enum | required | `mp4`, `mov`, `mkv`, `webm`, `avi` | none | replaces `target_format` (`vam/server.py:114`). The video table of 3.2.1 fixes `-f`, the extension and the default pair |
| `resolution` | string pattern | optional | `^\d{1,5}x\d{1,5}$` (width x height) or `^\d{1,5}$` (height only), each side 1 to 32768, plus the alias `preserve` meaning no scaling | pixels | the source pasted the caller's string into `scale=` (`vam/server.py:128-132`, inventory G.4). A width form becomes `scale=<width>:<height>` and a bare height becomes `scale=-2:<height>` (`:130-132`), the forms the skill documents (`skill/references/mcp-video-audio.md:128-129`). `preserve` is the source's skip value (`vam/server.py:128`) and normalizes to absent |
| `codec` | string enum | optional, default the `format` video encoder | `libx264`, `libx265`, `libvpx-vp9`, plus the alias `vp9` | none | the source's `video_codec` examples and their spellings (`vam/server.py:115`, `:391`) |
| `videoBitrate` | string | optional | `1k` to `100M`, suffix required, for example `1M` | `k` is 1000 bit/s, `M` is 1000000 bit/s | the source's test passes `1M` (`vam/tests/test_video_functions.py:165`) |
| `frameRate` | number | optional | greater than 0, at most 240 | frames per second | the source's test passes 30 (`vam/tests/test_video_functions.py:166`) |
| `audioCodec` | string enum | optional, default the `format` audio encoder | `aac`, `libmp3lame`, `libopus` | none | the source's test passes `aac` (`vam/tests/test_video_functions.py:166`) |
| `audioBitrate` | string | optional | `1k` to `100M`, suffix required | `k` and `M` as above | the source's test passes `128k` (`vam/tests/test_video_functions.py:166`) |
| `sampleRate` | integer | optional | 8000 to 384000 | Hz | the source's test passes 44100 (`vam/tests/test_video_functions.py:166`) |
| `channels` | integer | optional | 1 to 8 | channel count | the source's test passes 2 (`vam/tests/test_video_functions.py:167`) |

Args:

```text
-n -i <input> [-vf scale=<W>:<H> or scale=-2:<H>] [-c:v <codec>] [-b:v <videoBitrate>] [-r <frameRate>] [-c:a <audioCodec>] [-b:a <audioBitrate>] [-ar <sampleRate>] [-ac <channels>] -f <muxer> <temp>/converted.<ext>
```

- Every group appears only when its parameter is present, the source's conditional kwargs (`vam/server.py:128-144`).
- An unset `codec` or `audioCodec` falls to the container's default pair from 3.2.1, so the re-encode stays deterministic and gateable. The source let ffmpeg choose the pair (`vam/server.py:144`).

Output: one file, `<basename>-converted.<ext>`, the extension of `format`. Gates: the effective video and audio encoders, plus `scale` when `resolution` is present.

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

Args, attempt 2: the same `-vf` value, with `-c:a aac` in place of `-c:a copy` (`vam/server.py:228`).

Args when the ratio already matches, the source's two-step shortcut (`vam/server.py:184-191`):

```text
-n -i <input> -c copy <temp>/aspect.mp4
```

and when that copy fails:

```text
-n -i <input> -c:v libx264 -c:a aac <temp>/aspect.mp4
```

- The pad filter is the source's own string with the colour validated: `scale=<W>:<H>:force_original_aspect_ratio=decrease,pad=<W>:<H>:(ow-iw)/2:(oh-ih)/2:<colour>` (`vam/server.py:196`, `:200`). `<W>` and `<H>` are computed integers: when the source is wider than the ratio, `W = round(height x ratio)` and `H = height`, otherwise `W = width` and `H = round(width / ratio)` (`:193-200`).
- The crop filter is the source's geometry with computed integers: when the source is wider, `cropW = round(height x ratio)`, `cropH = height`, `x = (iw - cropW)/2`, `y = 0`, otherwise `cropW = width`, `cropH = round(width / ratio)`, `x = 0`, `y = (ih - cropH)/2` (`vam/server.py:212-217`).
- The video is re-encoded on every path that resizes, because a scale or crop cannot be stream-copied. The source declared `codec_to_use = 'copy'` (`vam/server.py:181`, `:201`), never read it, and re-encoded anyway (inventory G.9 at `../context/source-inventory.md:253`). The contract states the re-encode instead of carrying the dead variable.
- The ratio equality test keeps the source's threshold, `abs(originalRatio - targetRatio) < 1e-4` (`vam/server.py:184`, `:204`).

Output: one file, `<basename>-aspect.mp4`. Gates: `scale`, `pad` or `crop` per mode, `libx264`, and `aac` before attempt 2.

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

Output: one file, `<basename>-converted.<ext>`. Gates: the `format` default encoder.

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

Output: one file, `<basename>-bitrate.<ext>`, with the input container's extension. Gates: the container's default encoder.

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
- Output: one file, `<basename>-sample-rate.<ext>`. Gates: the container's default encoder.

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
- Output: one file, `<basename>-channels.<ext>`. Gates: the container's default encoder.

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

Output: one file, `<basename>-converted.<ext>`. Gates: the container's default pair before attempt 2.

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
- Output: one file, `<basename>-<W>x<H>.mp4`, or `<basename>-h<H>.mp4` for the height-only form. Gates: `scale`, `libx264`, and `aac` before attempt 2.

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
- Output: one file, `<basename>-<codec>.mp4`. Gates: the named `codec`, and `aac` before attempt 2.

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
- Output: one file, `<basename>-<videoBitrate>.mp4`. Gates: `libx264`, and `aac` before attempt 2.

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
- Output: one file, `<basename>-<frameRate>fps.mp4`. Gates: `libx264`, and `aac` before attempt 2.

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
- Output: one file, `<basename>-audio-<audioCodec>.mp4`. Gates: the chosen `audioCodec`, and `libx264` before attempt 2.

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
- Output: one file, `<basename>-audio-<audioBitrate>.mp4`. Gates: `aac`, and `libx264` before attempt 2.

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
- Output: one file, `<basename>-audio-<sampleRate>hz.mp4`. Gates: `aac`, and `libx264` before attempt 2.

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
- Output: one file, `<basename>-audio-<channels>ch.mp4`. Gates: `aac`, and `libx264` before attempt 2.

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

Output: one file, `<basename>-<speedFactor>x.mp4`. Gates: `setpts`, `libx264`, `aac`, plus `atempo` when the input has audio.

#### 3.2.21 Capability gates

Each tool checks the resolved binary for every encoder and filter in its command before that command starts, and returns `CAPABILITY_MISSING` with `kind`, `name` and `neededBy` (section 5, section 8). This table is the check list for the subsection. A tool with a two-attempt command gates attempt 2 just before attempt 2 starts, because attempt 1 may succeed with no encoder at all.

| Tool | Encoders | Filters |
|------|----------|---------|
| `audio_extract` | the encoder named by `audioCodec` | none |
| `video_trim` | `libx264`, `aac` before attempt 2 | none |
| `audio_convert_properties` | the `format` default encoder | none |
| `video_convert_properties` | the effective video encoder and the effective audio encoder | `scale` when `resolution` is present |
| `video_set_aspect_ratio` | `libx264`, `aac` before attempt 2 | `scale` plus `pad` or `crop` per mode |
| `audio_convert` | the `format` default encoder | none |
| `audio_set_bitrate` | the input container's default encoder | none |
| `audio_set_sample_rate` | the input container's default encoder | none |
| `audio_set_channels` | the input container's default encoder | none |
| `video_convert` | the container's default pair before attempt 2 | none |
| `video_set_resolution` | `libx264`, `aac` before attempt 2 | `scale` |
| `video_set_codec` | the named `codec`, `aac` before attempt 2 | none |
| `video_set_bitrate` | `libx264`, `aac` before attempt 2 | none |
| `video_set_frame_rate` | `libx264`, `aac` before attempt 2 | none |
| `video_set_audio_codec` | the chosen `audioCodec`, `libx264` before attempt 2 | none |
| `video_set_audio_bitrate` | `aac`, `libx264` before attempt 2 | none |
| `video_set_audio_sample_rate` | `aac`, `libx264` before attempt 2 | none |
| `video_set_audio_channels` | `aac`, `libx264` before attempt 2 | none |
| `video_set_speed` | `libx264`, `aac` | `setpts`, plus `atempo` when the input has audio |

#### 3.2.22 Shared error codes

Besides the path and config codes that section 4 defines (`CONFIG_MISSING`, `PATH_NOT_ALLOWED`) and the binary codes that section 6 owns (`FFMPEG_NOT_FOUND`, `FFPROBE_NOT_FOUND`), the 19 tools return these codes from the section 5 list:

| Code | Raised when |
|------|------------|
| `INPUT_NOT_FOUND` | the resolved input path is not a readable file. The source's `FileNotFoundError` branches were the ones that never fired, because ffmpeg reported the failure instead (inventory G.10 at `../context/source-inventory.md:254`) |
| `OUTPUT_EXISTS` | the planned output file exists at the pre-write check (section 4.3) |
| `INVALID_INPUT` | `endTime <= startTime`, a time, ratio or resolution string outside its pattern, or a speed factor outside its range |
| `UNSUPPORTED_FORMAT` | a video tool given a file with no video stream, an audio tool given a file with no audio stream, or a container outside the tables of 3.2.1. Detection reads ffprobe streams, not the file extension (section 5) |
| `CAPABILITY_MISSING` | an encoder or filter in 3.2.21 is absent from the resolved binary, checked before its command starts |
| `PROCESS_FAILED` | ffmpeg exited non-zero, after the second attempt for a two-attempt tool, with `stderrTail` the two tails capped at the last 64 KB |
| `PROCESS_TIMEOUT` | a run passed `MEDIA_EDITOR_TIMEOUT_SECONDS`, 1800 by default. The process is killed, the partial output and the temp folder are removed, then this result returns |
| `INTERNAL` | an unmapped error reached the handler boundary, where the source returned one catch-all `An unexpected error occurred` string (`vam/server.py:39-40` and each tool's last branch) |

#### 3.2.23 Defects this subsection closes

One line per relevant item in inventory section G, plus the porting hazard in section F.

- **G.3, arbitrary paths and output equal to input** (`../context/source-inventory.md:240`): no parameter names an output file, every write lands in a fresh numbered folder, and the section 4 guard compares every planned output with every input. The source accepted any writable output path and never compared the two (`vam/server.py:19`).
- **G.4, raw caller strings in ffmpeg arguments** (`../context/source-inventory.md:241-248`): codecs, formats and bitrates are enums, `resolution` and `aspectRatio` are parsed and rebuilt, and `paddingColor` is hex only, where the source passed the container and codec strings (`vam/server.py:100`, `:360`), the bitrate (`:278`), the resolution (`:130-132`, `:376-378`), the ratio (`:174-175`) and the colour (`:196`) through raw.
- **G.5, overwrite policy** (`../context/source-inventory.md:249`): one policy replaces the mix of `-y` and unflagged runs. Every command carries `-n`, each attempt gets its own temp file, and a failed run removes what it wrote.
- **G.9, dead `codec_to_use` in `change_aspect_ratio`** (`../context/source-inventory.md:253`): the pad path's re-encode is stated instead of the variable that was set and never read (`vam/server.py:181`, `:201`).
- **G.10, misleading error taxonomy** (`../context/source-inventory.md:254`): every failure maps to one section 5 code with structured details, where the source's catch-all returned an unstructured string (`vam/server.py:39-40`).
- **G.11, unbounded work** (`../context/source-inventory.md:255`): every run is bounded by `MEDIA_EDITOR_TIMEOUT_SECONDS` and its stderr is capped at the last 64 KB, where the source set no timeout and buffered everything (`vam/server.py:32`).
- **G.13, doc drift** (`../context/source-inventory.md:257`): the composite tool's schema is written fresh here, where the source docstring said `Args listed in PRD` (`vam/server.py:119`).
- **F.7, ffmpeg-python aliases and input option order** (`../context/source-inventory.md:227-228`): the argv blocks carry real ffmpeg flags, and `-ss` and `-to` precede `-i`, where the source's option names existed only in the library's translation table.
