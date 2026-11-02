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
