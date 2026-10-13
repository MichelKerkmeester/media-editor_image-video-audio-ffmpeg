### 3.3 Composition tool schemas and media_health

This subsection fixes the seven composition tools built in `005-video-composition` (section 2 rows 28 to 35) and `media_health`, built in `002-server-foundation` (section 2 row 9, where the name note replaces the inventory's `media_health_check`). Section 1 rules hold here without change: camelCase names, seconds for a plain time parameter and an `Ms` suffix where the unit is not seconds, `#RRGGBB` colours, enum spellings with single underscores. Every row below is one zod field on the tool schema that the SDK 1.x `McpServer` registers (ADR-002), so a value outside its range or enum is rejected before the handler runs (REQ-002), and the same schema documents the tool.

Source shorthands again: `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

Four rules hold for every tool in this subsection.

1. **The server builds every filter value.** A number is parsed and re-serialized, an enum is checked against its fixed list, and every caller string that reaches a graph is passed through the one escaping helper that section 8 defines and that `005-video-composition` builds. The source concatenated caller bytes into filter strings directly (`vam/server.py:610`, `:619`, `:540`), which inventory G.4 records as the defect this rule closes.
2. **Every command is an argv array for `spawn`.** The code blocks below are the argument array in order, one element per token, with `-n` on every run and no shell (ADR-003). A `<placeholder>` stands for one element even when the value it carries contains spaces. No command line is ever built as one string.
3. **One output folder per call, and no attempt blocks the next.** A tool that tries an audio copy and then an audio re-encode writes each attempt to its own path inside the run's private temp folder, and only the surviving file is moved into `<output folder>/NNN - <description>/` (section 4.3). The source sent both attempts to the same final path, so a partial file from the first attempt could break the second one (G.5, `vam/server.py:546-558`).
4. **A capability is checked before a command starts.** Each tool gates the encoders and filters of its graph against the resolved binary (section 8) and returns `CAPABILITY_MISSING` naming the absent element, never a failed encode (REQ-007). The full check list is 3.3.10.

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
| `subtitlePath` | string | required | existing `.srt` file under an allowed root | path | checked as an input with role `subtitle` (section 5). The source checked existence only (`vam/server.py:516-517`) |
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
-n -i <input> -vf subtitles=<esc subtitlePath>:force_style=<styleList> -c:v libx264 -c:a copy <temp>/subtitled.mp4
```

Attempt 2 is the same argv without `-c:a copy`, after `aac` is checked again (`vam/server.py:551`). `<styleList>` is built from the validated keys only, for example `FontName=Inter,FontSize=24,PrimaryColour=&H00FFFFFF,MarginV=10`. `<esc subtitlePath>` is the section 8 escaping helper's output for a filter path value, which also covers a Windows drive letter. The spec names `subtitles='C:\clips\a.srt'` as the case that corrupts the source's filter (`vam/server.py:540`, spec section 8).

Gates: the `subtitles` filter (a libass build, inventory F.3) plus `libx264`, and `aac` before attempt 2. The bundled font folder is passed through the filter's `fontsdir` option, so `fontStyle.fontName` resolves without system fonts (inventory F.2).

#### 3.3.3 `video_add_text_overlay`

Draws timed text over one video. It replaces `add_text_overlay` (`vam/server.py:568-663`). One `drawtext` filter is built per element and the elements are joined with `,` into one `-vf` value (`vam/server.py:635-639`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the video |
| `textElements` | array | required | 1 or more entries | none | each entry is one overlay (`vam/server.py:594-595` rejected an empty list at runtime, here the schema does it) |
| `textElements[].text` | string | required | 1 to 1000 characters, no NUL and no unpaired surrogate | text | escaped by the section 8 helper. The source escaped `\ ' : ,` only and left `[ ] ; =` and newlines raw (`vam/server.py:610`, G.4) |
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
-n -i <input> -vf drawtext=text='<esc text>':fontfile='<esc fontPath>':fontsize=<size>:fontcolor=<colour>:x=<x>:y=<y>:enable='between(t\,<start>\,<end>)'[,box=1:boxcolor=<colour>@<opacity>:boxborderw=<width>][,drawtext=...] -c:v libx264 -c:a copy <temp>/text-overlay.mp4
```

- `<x>` and `<y>` come from the position table, and `<start>` and `<end>` are parsed numbers, so the commas inside `enable` are separators the helper escapes, not caller bytes (`vam/server.py:619` interpolated raw caller times, G.4).
- The box group appears only when `box` is true (`vam/server.py:623-627`).

Attempt 2 is the same argv without `-c:a copy`, after `aac` is checked again (`vam/server.py:649`).

Gates: the `drawtext` filter, which needs a libfreetype build and a font file at runtime (inventory F.2, `skill/references/mcp-video-audio.md:78-82`), plus `libx264`, and `aac` before attempt 2.

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
-n -i <video> -i <image> -filter_complex "[1:v]scale=<w>:<h>,format=rgba,colorchannelmixer=aa=<opacity>[ov];[0:v][ov]overlay=x=<x>:y=<y>:enable='between(t\,<start>\,<end>)'[v]" -map [v] -map 0:a -c:v libx264 -c:a copy <temp>/image-overlay.mp4
```

- The `scale` token appears only when `width` or `height` is given, with `-1` on the omitted side (`vam/server.py:701-707`).
- The `format` and `colorchannelmixer` tokens appear only when `opacity` is given (`vam/server.py:710-713`).
- The `enable` part appears only when a time bound is given, otherwise the overlay covers the whole clip (`vam/server.py:738-744`).
- `<x>` and `<y>` come from the position table with `main_w`, `main_h`, `overlay_w` and `overlay_h` (`vam/server.py:721-727`).
- `-map 0:a` is emitted when the probed input carries an audio stream, and then attempt 2 is the same argv without `-c:a copy`. A video with no audio stream runs once with no audio map. The source mapped audio unconditionally (`vam/server.py:749-757`).

Gates: `overlay`, `scale`, and `format` plus `colorchannelmixer` when `opacity` is present, plus `libx264`, and `aac` before attempt 2.

#### 3.3.5 `video_concat`

Joins two or more videos in order. It replaces `concatenate_videos` (`vam/server.py:775-1033`). Without `transition` the join normalizes every clip and runs the concat demuxer (`vam/server.py:975-1033`). With `transition`, exactly two clips run the xfade path (`vam/server.py:857-970`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPaths` | string array | required | 2 or more entries, each under an allowed root | path | every entry is checked before the output folder exists (section 4.4). A single input is refused, because a one-clip re-encode is `video_convert`'s job (`vam/server.py:846-854`) |
| `transition` | string enum | optional, absent means a plain join | `dissolve`, `fade`, `fadeblack`, `fadewhite`, `fadegrays`, `distance`, `wipeleft`, `wiperight`, `wipeup`, `wipedown`, `slideleft`, `slideright`, `slideup`, `slidedown`, `smoothleft`, `smoothright`, `smoothup`, `smoothdown`, `circlecrop`, `rectcrop`, `circleopen`, `circleclose`, `vertopen`, `vertclose`, `horzopen`, `horzclose`, `diagtl`, `diagtr`, `diagbl`, `diagbr`, `hlslice`, `hrslice`, `vuslice`, `vdslice`, `pixelize`, `radial`, `hblur` | none | the source's 37-value allowlist, kept whole (`vam/server.py:826-836`). An entry count other than two is `INVALID_INPUT` (`vam/server.py:972-973`) |
| `transitionDuration` | number | required when `transition` is given | greater than 0 and less than the first clip's duration | seconds | source checks (`vam/server.py:820-823`, `:869-870`, `:925-926`) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | the slug source for the folder name |

Args, no transition, per clip, with `W`, `H` and `fps` taken from the first clip (`vam/server.py:983-986`, and the 30 fps fallback is `vam/server.py:1260-1262`):

```text
-n -i <clip> -vf scale=<W>:<H> -r <fps> -c:v libx264 -c:a aac <temp>/norm_<i>.mp4
```

Then the list file with one `file '<esc path>'` line per normalized clip (`vam/server.py:1009-1012`) and the join itself:

```text
-n -f concat -safe 0 -i <temp>/concat_list.txt -c copy <output>/joined.mp4
```

The list writer escapes each path for the demuxer's `file '...'` syntax, because the source wrapped the path in quotes with no escaping (`vam/server.py:1012` with `-safe 0` at `:1019`, G.2).

Args, xfade, exactly two clips. Normalize each clip first, with `W`, `H` and `fps` as the maximum of the two clips and a floor of 640x360 and 30 fps (`vam/server.py:879-884`):

```text
-n -i <clip> -vf scale=<W>:<H> -r <fps> -c:v libx264 -c:a aac <temp>/norm_<i>.mp4
```

Then the join, with `D` the transition duration and `offset` the first normalized clip's duration minus `D` (`vam/server.py:929`):

```text
-n -i <temp>/norm_0.mp4 -i <temp>/norm_1.mp4 -filter_complex "[0:v][1:v]xfade=transition=<transition>:duration=<D>:offset=<offset>[v];[0:a][1:a]acrossfade=d=<D>:c1=tri:c2=tri[a]" -map [v] -map [a] -c:v libx264 -c:a aac <output>/joined.mp4
```

The `acrossfade` chain and the `[a]` map appear only when both clips carry an audio stream (`vam/server.py:872-874`). The source's audio branch emitted no `[v]` and no `[a]` label while still mapping both, so its own graph was malformed as written and its fixtures never exercised it (inventory F.1, `vam/server.py:943-950`). The contract labels both chain outputs.

Gates: `scale`, `libx264` and `aac`, plus `xfade` and `acrossfade` when `transition` is given.

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

The detection reads `silence_start:` and `silence_end:` pairs from the capped stderr tail (`vam/server.py:1127-1139`, the cap is section 8), and a trailing silence with no `silence_end` runs to the end of the file (`vam/server.py:1173`, with the pairing caveat noted at `:1156-1161`).

Args, keep, with one `between(t,<s>,<e>)` term per kept segment joined by `+` (`vam/server.py:1189-1193`):

```text
-n -i <input> -filter_complex "[0:v]select=<expr>,setpts=PTS-STARTPTS[v];[0:a]aselect=<expr>,asetpts=PTS-STARTPTS[a]" -map [v] -map [a] -c:v libx264 -c:a aac <output>/without-silence.mp4
```

- The video chain appears only for a video input, the audio chain is always present because a file without audio is refused (`vam/server.py:1198-1207`).
- When the detection finds no silence at the threshold, the tool stream-copies the input into the output folder and says so, exactly the source's fallback (`vam/server.py:1148-1152`), with `-n -i <input> -c copy` as the argv.
- When every stretch is silent, no keep segment exists and the call is `INVALID_INPUT` (`vam/server.py:1182-1183`).

Gates: `silencedetect`, `select`, `setpts`, `aselect` and `asetpts`, plus `libx264` and `aac` for a video input, and `aac` only for an audio input.

#### 3.3.7 `video_add_b_roll`

Overlays timed clips onto a main video. It replaces `add_b_roll` (`vam/server.py:1348-1571`). The server sorts the entries by insertion time, processes each clip once and chains one overlay per entry (`vam/server.py:1381`, `:1485-1523`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| `inputPath` | string | required | existing file under an allowed root | path | the main video |
| `clips` | array | required | 1 or more entries | none | an empty list is `INVALID_INPUT` (section 5). The source copied the main video instead (`vam/server.py:1355-1360`) |
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

The scale token is `scale=<mainWidth>:<mainHeight>` for `fullscreen` and `scale=iw*<scale>:ih*<scale>` for every other position (`vam/server.py:1405-1408`).

Args, pass 2, with the main video first and one input per processed clip (`vam/server.py:1534-1548`):

```text
-n -i <main> -i <temp>/clip_0.mp4 -i <temp>/clip_1.mp4 -filter_complex "[0:v][1:v]overlay=x=<x>:y=<y>:enable='between(t\,<s>\,<s+d>)'[v0];[v0][2:v]overlay=...[v]" -map [v] -map 0:a -c:v libx264 -c:a aac <output>/b-roll.mp4
```

- `<x>` and `<y>` come from the position table, so no position string reaches the graph (`vam/server.py:1441-1453`).
- `-map 0:a` appears only when the main video has an audio stream (`vam/server.py:1530-1531`).
- The source's slide branch wrote the same overlay as its plain branch (`vam/server.py:1506-1520`), which is why the contract has no slide value at all.

Gates: `overlay`, `scale`, plus `fade` when a fade is requested, plus `libx264` and `aac`.

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

Attempt 2 is the same argv without `-c:a copy`, after `aac` is checked again (`vam/server.py:1630`).

Gates: the `fade` filter and `libx264`, plus `aac` before attempt 2.

#### 3.3.9 `media_health`

Reports the server state without reading any media file. It replaces `health_check`, which returned one fixed sentence (`vam/server.py:13-16`), and it takes the name fixed in section 2's name note.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|-----------|------|---------------------|---------------|------|-------|
| none | | | | | the tool takes no input, creates no output folder, and works when no allowed root is configured (section 4.1) |

The report is the text summary plus these structured fields.

| Field | Content |
|-------|---------|
| `serverVersion` | the one version the server registers, read from the package manifest, so the source's mismatch between registered `0.1.0` and package `0.1.1` cannot recur (`imagician/src/index.ts:17`, `imagician/package.json:3`, inventory G.13) |
| `ffmpeg` | object with `path`, `version` and `source`. `version` is the first line of `ffmpeg -version` (`skill/SKILL.md:261`). `source` is one of `override`, `bundled`, `path`, `setup` or `none`, the four lookup steps of section 6 |
| `ffprobe` | the same object for ffprobe (`skill/SKILL.md:262`) |
| `capabilities` | one `{ kind, name, present }` entry per encoder and filter in the section 8 capability list, read from one parse each of `ffmpeg -encoders` and `ffmpeg -filters` (`skill/SKILL.md:263-264`, `skill/references/mcp-imagician.md:56-58`, `skill/references/mcp-video-audio.md:56-58`, `:80-82`) |
| `allowedRoots` | the roots that took effect after canonicalization, so a dropped config entry is visible instead of silent (section 4.1) |
| `outputFolder` | the resolved output folder, `null` only when nothing sets it (section 4.1) |

Args, four short runs under the section 8 process policy:

```text
ffmpeg -version
ffprobe -version
ffmpeg -hide_banner -encoders
ffmpeg -hide_banner -filters
```

A binary that no lookup step resolves is reported as data (`path: null`, `source: none`, the summary names `media_setup_ffmpeg` as the next step) rather than failing the call, because telling the user what is missing is the tool's purpose. Section 6 owns the lookup that raises `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND` for every tool that cannot run without a binary.

#### 3.3.10 Capability gates

Each tool checks the resolved binary for every encoder and filter in its graph before its first command starts, and returns `CAPABILITY_MISSING` with `kind`, `name` and `neededBy` (section 5, REQ-007). This table is the check list for this subsection. Section 8 owns the shared check and the full list that `media_health` reports.

| Tool | Encoders | Filters | Notes |
|------|----------|---------|-------|
| `video_add_subtitles` | `libx264`, `aac` before attempt 2 | `subtitles` | a libass build (inventory F.3), with the bundled font folder passed through `fontsdir` (inventory F.2) |
| `video_add_text_overlay` | `libx264`, `aac` before attempt 2 | `drawtext` | a libfreetype build plus a font file, always passed (inventory F.2) |
| `video_add_image_overlay` | `libx264`, `aac` before attempt 2 | `overlay`, `scale`, and `format` plus `colorchannelmixer` when `opacity` is given | |
| `video_concat` | `libx264`, `aac` | `scale`, plus `xfade` and `acrossfade` when `transition` is given | |
| `media_remove_silence` | `libx264` and `aac` for a video input, `aac` only for an audio input | `silencedetect`, `select`, `setpts`, `aselect`, `asetpts` | |
| `video_add_b_roll` | `libx264`, `aac` | `overlay`, `scale`, plus `fade` when a fade is requested | |
| `video_add_fade` | `libx264`, `aac` before attempt 2 | `fade` | |
| `media_health` | none | none | reports this list as data (3.3.9) |

The `drawtext` row is the REQ-007 case: a build without `drawtext` makes `video_add_text_overlay` return `CAPABILITY_MISSING` before ffmpeg starts, instead of failing after a partial encode.

#### 3.3.11 How caller text reaches a filter

Every route below ends in a validated value or in the section 8 escaping helper, never in a raw caller string. The source's raw routes are `vam/server.py:610`, `:619`, `:540` and `:631-632`, all recorded as G.4.

| Caller value | Example | Route into the graph |
|--------------|---------|----------------------|
| Overlay text | `50% off, today` | escaped by the section 8 helper, then written as `text='...'`. The source escaped `\ ' : ,` only (`vam/server.py:610`) |
| Subtitle path | `C:\clips\a.srt` | escaped by the same helper as a filter path value (`vam/server.py:540` interpolated it raw, the spec's Windows drive-letter case) |
| Font path | `C:\fonts\Inter.ttf` | escaped by the same helper, and existence is checked before the run. The source escaped partially and never checked (`vam/server.py:631-632`) |
| Position | `bottom_right` | an enum member, and the server writes the expression from the 3.3.1 table |
| Times and sizes | `2.5`, `640`, `0.5` | parsed to a number and re-serialized, so no caller byte survives (`vam/server.py:619` interpolated raw times into `enable`) |
| Colours | `#FF8800` | validated as `#RRGGBB`, then converted to the filter's own colour order (`vam/server.py:523-537` accepted named and `&H` forms unchecked) |
| Style name | `Inter` | validate as letters, digits, spaces and hyphens before it enters `force_style` (`vam/server.py:523`) |
| Concat list member | `it's a clip.mp4` | escaped by the concat list writer for the demuxer's `file '...'` syntax (`vam/server.py:1012` with `-safe 0` at `:1019`, G.2) |

#### 3.3.12 Defects this subsection closes

- **G.2 concat-list injection**: the list writer escapes each path, so a quote in a file name stays legal (section 4.4 carries the adversarial row, `vam/server.py:1012`).
- **G.4 unvalidated strings in filter graphs**: the 3.3.11 table, the position vocabulary and the number round-trip replace every raw route (`vam/server.py:610`, `:619`, `:540`, `:631-632`, `:728-735`).
- **G.5 overwrite inconsistency**: `-n` on every command, one temp path per attempt, and only the survivor moved into a fresh folder (`vam/server.py:546-558`, `:1625-1635`).
- **G.7 platform paths**: a drive letter survives inside a filter value because the helper escapes it (`vam/server.py:540`, `:610`).
- **G.8 silent capability lies**: `audio_mix` and the `slide_*` transitions are removed instead of documented (`vam/server.py:1466`, `:1528-1531`, `:1363`, `:1506-1520`).
- **G.13 version drift**: `media_health` reports one version from the manifest (`imagician/src/index.ts:17`, `imagician/package.json:3`).
- **F.1 xfade graph**: both chain outputs carry their labels, so `-map [v] -map [a]` cannot fail on a well-formed graph (`vam/server.py:943-950`).
- **F.2 drawtext font**: the bundled font is passed as `fontfile=` on every run, instead of depending on fontconfig (`vam/server.py:630-632`).
- **F.3 libass**: `subtitles` is gated, so a build without libass fails before the run instead of mid-encode (`vam/server.py:540`).
