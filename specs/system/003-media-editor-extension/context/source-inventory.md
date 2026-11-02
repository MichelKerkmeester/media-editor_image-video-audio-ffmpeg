# Media Editor Extension — Source Inventory (AI Systems/Media Editor/specs/003-media-editor-extension/context)

Path shorthands used below (all repo-relative):
- `imagician/` = `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`
- `vam/` = `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`
- `skill/` = `AI Systems/Media Editor/sk-media-editor/`

---

## A. Imagician tool table (8 tools)

Server identity: `name: 'imagician', version: '0.1.0'` (`imagician/src/index.ts:16-17`) — note mismatch with package version `0.1.1` (`imagician/package.json:3`). Capabilities declared: `tools: {}` only (`imagician/src/index.ts:20-22`).

| Tool | Params (required `*`, default `=`) | Behavior | sharp calls | Output/overwrite | Error handling |
|---|---|---|---|---|---|
| `resize_image` | `inputPath*:string`, `outputPath*:string`, `width:number`, `height:number`, `fit:string='cover'` enum cover/contain/fill/inside/outside, `preserveAspectRatio:boolean=true` | mkdir of output dir, resize if width/height given, write file | `sharp(inputPath).resize({width,height,fit,withoutEnlargement})` (`index.ts:209-217`), `.toFile` (`:220`) | `fs.mkdir(dirname(outputPath), {recursive:true})` then `toFile` — silent overwrite (`index.ts:207,220`) | single try/catch; all non-McpError wrapped as `McpError(InternalError, "Image processing error: …")` (`index.ts:451-459`) |
| `convert_format` | `inputPath*:string`, `outputPath*:string`, `format*:string` enum jpeg/jpg/png/webp/avif, `quality:number=80` (min 1 max 100) | convert to target format | `.jpeg({quality,progressive:true})`, `.png({quality})`, `.webp({quality})`, `.avif({quality})` (`index.ts:242-252`), `.toFile` | same as above (`index.ts:235,255`) | same wrapper |
| `crop_image` | `inputPath*`, `outputPath*`, `left*:number`, `top*:number`, `width*:number`, `height*:number` | extract region | `.extract({left,top,width,height}).toFile` (`index.ts:272-274`) | silent overwrite (`:270-274`) | same wrapper; no bounds check — sharp throws if region out of image |
| `compress_image` | `inputPath*`, `outputPath*`, `quality:number=80`, `progressive:boolean=true` | read metadata, re-encode at quality per source format, report size delta | `sharp(inputPath).metadata()` (`:291`), `.jpeg({quality,progressive})` / `.png({quality})` / `.webp` / `.avif` (`:295-303`), `.toFile` (`:305`) | silent overwrite; reports `Size reduction: …% (old → new bytes)` via `fs.stat` (`:307-315`) | same wrapper |
| `rotate_image` | `inputPath*`, `outputPath*`, `angle*:number`, `background:string='#000000'` | rotate arbitrary angle | `.rotate(angle,{background}).toFile` (`index.ts:326-328`) | silent overwrite (`:324-328`) | same wrapper; `background` hex/named string passed unvalidated to sharp |
| `flip_image` | `inputPath*`, `outputPath*`, `direction*:string` enum horizontal/vertical/both | flop and/or flip | `.flop()` (`:348`), `.flip()` (`:351`), `.toFile` (`:354`) | silent overwrite (`:343-354`) | same wrapper |
| `get_image_info` | `inputPath*:string` | JSON metadata dump | `sharp(inputPath).metadata()` (`:369`) + `fs.stat` (`:370`) | read-only; returns JSON text with format/width/height/channels/bitDepth/colorSpace/density/density/hasAlpha/fileSize/lastModified (`:376-387`) | same wrapper |
| `batch_resize` | `inputPath*`, `outputDir*:string`, `sizes*:array[{width*,height?,suffix*}]`, `format?:string` enum jpeg/jpg/png/webp/avif | loop sizes; filename `${basename}${suffix}${format?'.'+format:inputExt}`; fit 'cover', no enlargement | `sharp(inputPath).resize({width,height:'cover',withoutEnlargement:true})` (`:405-411`) + optional `.jpeg({quality:80,progressive:true})/.png()/.webp({quality:80})/.avif({quality:80})` (`:414-428`), `.toFile` (`:431`) | mkdir outputDir recursive (`:396`); silent overwrite of generated names | same wrapper |

**MCP SDK API surface used and version.** Low-level `Server` API, not `McpServer`+zod:
- `Server` from `@modelcontextprotocol/sdk/server/index.js` (`index.ts:2`), `StdioServerTransport` from `server/stdio.js` (`:3`), `CallToolRequestSchema`, `ErrorCode`, `ListToolsRequestSchema`, `McpError` from `types.js` (`:4-9`).
- `server.setRequestHandler(ListToolsRequestSchema, …)` (`:26`), `server.setRequestHandler(CallToolRequestSchema, …)` (`:199`), `server.connect(transport)` (`:465`), `McpError(ErrorCode.MethodNotFound)` for unknown tools (`:445-449`).
- Declared range `@modelcontextprotocol/sdk: ^0.5.0` (`imagician/package.json:46`), **locked to 0.5.0** (`imagician/package-lock.json:833-835`).
- `sharp: ^0.33.2` declared (`package.json:47`), **locked 0.33.5** (`package-lock.json:1090-1092`).
- ESM module, Node >= 18 (`package.json:31,54-55`); TS build ES2022/strict (`imagician/tsconfig.json:3-16`).
- Schemas are hand-written JSON Schema objects (no zod) (`index.ts:31-194`); runtime arg validation is nil — defaults are destructured (`:205,233,287,322,394`).

---

## B. Video-audio tool table (27 tools — exact count)

FastMCP server `mcp = FastMCP("VideoAudioServer")` (`vam/server.py:10`); entry `mcp.run()` (`:1649-1650`). All tools are `@mcp.tool()` plain functions returning **status strings** (errors included — never raised). Two exceptions: helper exceptions. Params come from Python type annotations; dict/list params (`font_style`, `text_elements`, `broll_clips`) have no schema validation.

| # | Tool | Params | Behavior | Exact ffmpeg calls / filters / codec args | Output | Error / fallback |
|---|---|---|---|---|---|---|
| 1 | `health_check` | none | returns `"Server is healthy!"` (`server.py:13-16`) | none | n/a | none |
| 2 | `extract_audio_from_video` | `video_path: str`, `output_audio_path: str`, `audio_codec: str='mp3'` | strip audio | `ffmpeg.input(video_path).output(output_audio_path, acodec=audio_codec).run(capture_stdout=True, capture_stderr=True)` (`:30-32`) | new file | `ffmpeg.Error`→stderr string (`:34-36`); `FileNotFoundError`→"not found" (`:37-38`); catch-all (`:39-40`) |
| 3 | `trim_video` | `video_path`, `output_video_path`, `start_time: str`, `end_time: str` (HH:MM:SS or seconds) | cut range; codec-copy first | `ffmpeg.input(v, ss=start_time, to=end_time).output(out, c='copy')` (`:55-58`); fallback re-encode `input(..., ss, to).output(out)` (`:64-66`) | overwrites only if ffmpeg allows (no `-y`, see F/G) | nested try: copy-fail → re-encode; both fail → combined stderr (`:60-70`) |
| 4 | `convert_audio_properties` | `input_audio_path`, `output_audio_path`, `target_format: str`, `bitrate: str=None`, `sample_rate: int=None`, `channels: int=None` | format + props | `stream.output(out, audio_bitrate=bitrate, ar=sample_rate, ac=channels, format=target_format)` (`:92-103`) | new file | standard 3-tier (`:105-111`) |
| 5 | `convert_video_properties` | `input_video_path`, `output_video_path`, `target_format: str`, `resolution: str=None`, `video_codec=None`, `video_bitrate=None`, `frame_rate: int=None`, `audio_codec=None`, `audio_bitrate=None`, `audio_sample_rate: int=None`, `audio_channels: int=None` | composite converter; resolution string `'WxH'`→`scale=WxH`, bare height→`scale=-2:H` (`:128-132`) | `stream.output(out, vf=…, vcodec=…, video_bitrate=…, r=…, acodec=…, audio_bitrate=…, ar=…, ac=…, format=…)` (`:134-147`) | new file | standard 3-tier (`:149-155`) |
| 6 | `change_aspect_ratio` | `video_path`, `output_video_path`, `target_aspect_ratio: str` ("num:den"), `resize_mode: str='pad'`, `padding_color: str='black'` | probes dims (`:166-172`), computes pad/crop geometry | pad: `scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:{padding_color}` (`:196,200`); crop: `crop=N:oh:(iw-N)/2:0` / `crop=ow:N:0:(ih-N)/2` (`:214,217`); run `output(out, vf=…, acodec='copy')` (`:223`) then `output(out, vf=…)` (`:228`); AR-match shortcut uses `c='copy'` then re-encode (`:186-210`) | new file | fallback chain audio-copy→audio-re-encode, combined stderr (`:221-233`); `ValueError` on bad ratio (`:240-241`) |
| 7 | `convert_audio_format` | `input_audio_path`, `output_audio_path`, `target_format: str` | container change | `ffmpeg.input(in).output(out, format=target_format).run(...)` (`:257`) | new file | 3-tier (`:259-265`) |
| 8 | `set_audio_bitrate` | `…, bitrate: str` | | `.output(out, audio_bitrate=bitrate)` (`:278`) | | 3-tier (`:280-286`) |
| 9 | `set_audio_sample_rate` | `…, sample_rate: int` | | `.output(out, ar=sample_rate)` (`:299`) | | 3-tier (`:301-307`) |
| 10 | `set_audio_channels` | `…, channels: int` | | `.output(out, ac=channels)` (`:320`) | | 3-tier (`:322-328`) |
| 11 | `convert_video_format` | `input_video_path`, `output_video_path`, `target_format: str` | copy streams first | `_run_ffmpeg_with_fallback(..., {'format':tf,'vcodec':'copy','acodec':'copy'}, {'format':tf})` (`:360-362`) | new file | via helper (see C) |
| 12 | `set_video_resolution` | `…, resolution: str` | | `vf='scale={res}'` or `scale=-2:{res}` (`:374-379`); primary `{'vf', 'acodec':'copy'}` fallback `{'vf'}` (`:381-383`) | | helper |
| 13 | `set_video_codec` | `…, video_codec: str` | | `{'vcodec':…, 'acodec':'copy'}` / `{'vcodec':…}` (`:395-397`) | | helper |
| 14 | `set_video_bitrate` | `…, video_bitrate: str` | | `{'video_bitrate':…, 'acodec':'copy'}` (`:409-411`) | | helper |
| 15 | `set_video_frame_rate` | `…, frame_rate: int` | | `{'r':…, 'acodec':'copy'}` (`:423-425`) | | helper |
| 16 | `set_video_audio_track_codec` | `…, audio_codec: str` | | `{'acodec':…, 'vcodec':'copy'}` (`:437-439`) | | helper |
| 17 | `set_video_audio_track_bitrate` | `…, audio_bitrate: str` | | `{'audio_bitrate':…, 'vcodec':'copy'}` (`:451-453`) | | helper |
| 18 | `set_video_audio_track_sample_rate` | `…, audio_sample_rate: int` | | `{'ar':…, 'vcodec':'copy'}` (`:465-467`) | | helper |
| 19 | `set_video_audio_track_channels` | `…, audio_channels: int` | | `{'ac':…, 'vcodec':'copy'}` (`:479-481`) | | helper |
| 20 | `add_subtitles` | `video_path`, `srt_file_path`, `output_video_path`, `font_style: dict=None` (keys font_name/font_size/font_color/outline_color/outline_width/shadow_color/shadow_offset_x/y/alignment/margin_v/l/r) | SRT burn-in with ASS force_style | `vf = "subtitles='{srt_file_path}'" + ":force_style='{FontName=…,FontSize=…,PrimaryColour=…,OutlineColour=…,Outline=…,Shadow=…,Alignment=…,MarginV/L/R=…}'"` (`:521-542`); `output(out, vf=…, acodec='copy')` (`:545`) fallback `output(out, vf=…)` (`:551`) | new file | pre-checks `os.path.exists` video and SRT (`:514-517`); dual-stderr fallback (`:546-558`); 3-tier (`:560-566`) |
| 21 | `add_text_overlay` | `video_path`, `output_video_path`, `text_elements: list[dict]` (text*, start_time*, end_time*, font_size=24, font_color='white', x_pos='(w-text_w)/2', y_pos='h-text_h-10', box=False, box_color='black@0.5', box_border_width, font_file) | per-element `drawtext` | `drawtext=text='…':fontsize=…:fontcolor=…:x=…:y=…:enable=between(t\,S\,E)[:box=1:boxcolor=…:boxborderw=…][ :fontfile='…']`, joined with `,` into one `vf` (`:610-639`); run `output(out, vf=…, acodec='copy')` fallback re-encode (`:643-655`) | new file | missing keys → error string (`:605-606`); 3-tier (`:657-663`) |
| 22 | `add_image_overlay` | `video_path`, `output_video_path`, `image_path`, `position: str='top_right'` (named or `'x=..:y=..'`), `opacity: float=None`, `start_time=None`, `end_time=None`, `width: str=None`, `height: str=None` | scale/format/colorchannelmixer/overlay chain | `overlay_input.filter('scale', width/height, auto -1)` (`:701-707`), `.filter('format','rgba')`, `.filter('colorchannelmixer', aa=str(opacity))` (`:712-713`); `ffmpeg.filter([main_input, processed_overlay], 'overlay', x=…, y=…, enable='between(t,S,E)'|'gte(t,S)')` (`:735-748`); `ffmpeg.output(video_with_overlay, main_input.audio, out, acodec='copy')` (`:749`) fallback without acodec (`:757`) | new file | existence pre-checks (`:689-692`); dual-stderr (`:752-763`); 3-tier (`:765-771`) |
| 23 | `concatenate_videos` | `video_paths: list[str]`, `output_video_path`, `transition_effect: str=None` (37-entry allowlist `:826-836`), `transition_duration: float=None` | 3 paths: single-input re-encode (`:846-854`); xfade for exactly 2 (`:857-970`); concat demuxer for N (`:975-1033`) | single: `input(v).output(out, vcodec='libx264', acodec='aac')` (`:851`). Normalize per clip: `subprocess.run(['ffmpeg','-i',v,'-vf',f'scale={W}:{H}','-r',fps,'-c:v','libx264','-c:a','aac','-y',tmp])` (`:891-900`, `:908-917`, `:994-1003`). xfade graph `filter_complex = "[0:v][1:v]xfade=transition={effect}:duration={D}:offset={offset}"` + `",[0:a][1:a]acrossfade=d={D}:c1=tri:c2=tri"` (`:932-945`), maps `'[v]'`/`'[a]'` (`:946-950`), encodes `-c:v libx264 -c:a aac -y` (`:953-958`). Concat: writes `concat_list.txt` lines `file '{path}'` (`:1009-1012`) then `['ffmpeg','-f','concat','-safe','0','-i',list,'-c','copy','-y',out]` (`:1016-1024`) | temp dirs via `tempfile.mkdtemp()` + `shutil.rmtree` (`:859,970,977,1033`) | validation errors for empty list/transition/`transition_duration<=0`/unknown effect/missing file (`:815-843`); `subprocess.CalledProcessError`→stderr (`:901-902,918-919,963-964,1005-1006,1026-1027`); catch-all (`:966-967,1029-1030`) |
| 24 | `change_video_speed` | `video_path`, `output_video_path`, `speed_factor: float` | setpts + chained atempo | video `setpts(f"{1.0/speed_factor}*PTS")` (`:1081`); audio atempo chain for <0.5 / >2.0 (`:1059-1077`) applied as `audio.filter("atempo", …)` (`:1084-1089`); `ffmpeg.output(video, audio, out).run(...)` (`:1092-1093`) | new file | speed<=0 and existence pre-checks (`:1048-1051`); `ffmpeg.Error`/catch-all (`:1096-1100`) |
| 25 | `remove_silence` | `media_path`, `output_media_path`, `silence_threshold_db: float=-30.0`, `min_silence_duration_ms: int=500` | detect silences, keep sound segments | detect: `ffmpeg.input(m).filter('silencedetect', n=f'{T}dB', d=s).output('-', format='null').run_async(pipe_stderr=True)` (`:1127-1133`); parse `silence_start:`/`silence_end:` via regex (`:1138-1139`); probe duration (`:1164-1166`); keep: `video.filter('select', expr).filter('setpts','PTS-STARTPTS')`, `audio.filter('aselect', expr).filter('asetpts','PTS-STARTPTS')`, expr = `between(t,S,E)` joined `+` (`:1185-1207`); `ffmpeg.output(*streams, out).run(...)` (`:1212`) | overwrites per ffmpeg default (no `-y`) | no-silence → `c='copy'` original (`:1148-1152`); all error classes return strings (`:1215-1219`) |
| 26 | `add_b_roll` | `main_video_path`, `broll_clips: list[dict]` (clip_path*, insert_at_timestamp*, duration, position fullscreen/top-left/top-right/bottom-left/bottom-right/center, scale, transition_in/out fade|slide_*, transition_duration=0.5, audio_mix=0.0), `output_video_path` (docstring placeholder "Args listed in previous messages" `:1350-1351`) | two passes: normalize each clip, then chained overlay filtergraph | pass 1 `subprocess.run(['ffmpeg','-i',clip,'-vf',filter_string,'-c:v','libx264','-c:a','aac','-y',tmp])` where filter_string = `scale={main_w}:{main_h}` (fullscreen) or `scale=iw*{f}:ih*{f}` + optional `fade=t=in:st=0:d={d}` / `fade=t=out:st={fade_out_start}:d={d}` (`:1400-1436`). pass 2 `filter_complex` = chained `"[0:v][i:v]overlay=x=…:y=…:enable='between(t,S,S+D)'"` with intermediate labels `[v0]…` and final `[v]`, joined `;` (`:1482-1523`); cmd `['ffmpeg', *inputs, '-filter_complex', …, '-map','[v]', *['-map','0:a'], '-c:v','libx264','-c:a','aac','-y', out]` (`:1534-1548`) | `tempfile.mkdtemp()` + `shutil.rmtree` (`:1367,1561`) | empty clips → `c='copy'` shortcut (`:1355-1360`); invalid position/path errors (`:1383-1396`); per-stage stderr returns (`:1437-1438,1555-1557,1563-1571`) |
| 27 | `add_basic_transitions` | `video_path`, `output_video_path`, `transition_type: str` (`fade_in`/`fade_out` (+ alias names `crossfade_from_black`/`crossfade_to_black` `:1604-1606`)), `duration_seconds: float` | fade in/out | `video_stream.filter('fade', type='in', start_time=0, duration=D)` (`:1605`) or `type='out', start_time=total-D` (`:1608`); `ffmpeg.output(*streams, out, acodec='copy')` fallback no acodec (`:1625-1635`) | new file | duration/exists pre-checks (`:1586-1596`); unsupported type error (`:1609-1610`); 3-tier incl. `ValueError`/`RuntimeError` (`:1637-1645`) |

**Tool count: exactly 27** (`@mcp.tool()` at `server.py:13,18,42,76,113,157,246,267,288,309,350,364,385,399,413,427,441,455,469,485,568,665,775,1035,1102,1348,1573`). README's "30+ tools" claim (`vam/README.md:369`) is wrong. README tool list (`README.md:26-58`) matches the code 1:1.

**Error-handling convention (all 26 non-health tools):** success and failure are both plain strings; the tests distinguish by substring match (`tests/test_video_functions.py:134,238` etc.). This conflicts with imagician's throw-McpError convention (see E).

---

## C. Shared helpers in `vam/server.py`

| Helper | Signature | Logic | Used by |
|---|---|---|---|
| `_run_ffmpeg_with_fallback` | `(input_path: str, output_path: str, primary_kwargs: dict, fallback_kwargs: dict) -> str` (`server.py:332`) | `ffmpeg.input(in).output(out, **primary).run(capture_stdout, capture_stderr)`; on `ffmpeg.Error` retry with `fallback_kwargs`; both fail → combined stderr string; `FileNotFoundError`/catch-all strings (`:334-348`) | `convert_video_format` (`:362`), `set_video_resolution` (`:383`), `set_video_codec` (`:397`), `set_video_bitrate` (`:411`), `set_video_frame_rate` (`:425`), `set_video_audio_track_codec` (`:439`), `set_video_audio_track_bitrate` (`:453`), `set_video_audio_track_sample_rate` (`:467`), `set_video_audio_track_channels` (`:481`) |
| `_parse_time_to_seconds` | `(time_str: str) -> float` (`:1223`) | int/float passthrough; `H:M:S` or `M:S` via `int*3600+int*60+float`; 1-part `float()`; else `ValueError` (`:1225-1235`) | `add_b_roll` sort key (`:1381`), `insert_at_timestamp` (`:1391`), `duration` (`:1392`); imported by tests (`tests/test_video_functions.py:41`) but no dedicated unit test |
| `_get_media_properties` | `(media_path: str) -> dict` (`:1237`) | `ffmpeg.probe`; first video/audio stream; returns `duration(float), has_video, has_audio, width, height, avg_fps, sample_rate(44100 default), channels(2 default), channel_layout('stereo' default)`; `avg_frame_rate` N/D parsing with 30 fps fallbacks (`:1240-1262`); raises `RuntimeError` on probe error (`:1265-1268`) | `concatenate_videos` (`:864-865,922,983`), `add_b_roll` (`:1370,1386`), `add_basic_transitions` (`:1592`) |
| `_prepare_clip_for_concat` | `(source_path: str, start_time_sec: float, end_time_sec: float, target_props: dict, temp_dir: str, segment_index: int) -> str` (`:1271-1272`) | trim (`ss`/`to` input opts `:1280`), video `scale→pad→setsar 1/1→setpts PTS-STARTPTS` (`:1286-1304`), audio `asetpts→aformat(s16, sample_rate, channel_layout)` (`:1307-1316`), output params `vcodec libx264, pix_fmt yuv420p, r fps, acodec aac, ar, ac, strict -2` (`:1318-1326`) to `segment_{i}.mp4`; raises `RuntimeError`/`ValueError` | **DEAD CODE — referenced nowhere else in the repo** (grep over `vam/` finds only the definition at `server.py:1271`; not in the test import list `tests/test_video_functions.py:13-42`) |

No other shared helpers exist. (Inline duplication instead: the audio-copy→re-encode fallback pair is re-implemented in `change_aspect_ratio` `:221-233`, `add_subtitles` `:546-558`, `add_text_overlay` `:641-655`, `add_image_overlay` `:746-763`, `add_basic_transitions` `:1624-1635`.)

---

## D. Tests

Fixture byte sizes: **UNKNOWN** for every fixture — the dispatched read-only toolset cannot return byte sizes (`ls` returns names only; Bash `ls -la` is denied). All other fixture facts below are verified.

**Fixture inventory** (`vam/tests/`):
| File | Role | Size |
|---|---|---|
| `tests/sample.mp4` | primary video for nearly all tests (`test_video_functions.py:45`) | UNKNOWN |
| `tests/sample.png` | image overlay input (`:47`) | UNKNOWN |
| `tests/sample_files/main_video.mp4` | 10s 640x360 black lavfi clip, B-roll/transitions (`:503,616`; generated `:74`) | UNKNOWN |
| `tests/sample_files/broll1.mp4` | 3s red (`:504`; generated `:75`) | UNKNOWN |
| `tests/sample_files/broll2.mp4` | 2s blue (`:505`; generated `:76`) | UNKNOWN |
| `tests/sample_files/short_video1.mp4` | 5s green (xfade `:663`; generated `:77`) | UNKNOWN |
| `tests/sample_files/short_video2.mp4` | 4s yellow (xfade `:664`; generated `:78`) | UNKNOWN |

Note: `SAMPLE_VIDEO_2 = tests/sample2.mp4` is declared (`:46`) but the file does not exist (directory listing) and the symbol is never used. `sample_files/*` are regenerated on demand by `setup_broll_test_environment()` via `ffmpeg -f lavfi -i color=… -c:v libx264 -tune stillimage -pix_fmt yuv420p` (`:69-88`). Test outputs land in `tests/test_outputs/` (`:50,112`); cleanup is commented out (`:120-122`).

**pytest suite** (`vam/tests/test_video_functions.py`, 29 test functions; all need local `ffmpeg` + `ffprobe` on PATH (`:58,66,97,107`); **no network**):

| Test | Tool under test | Fixtures / setup | Assertions | Special needs |
|---|---|---|---|---|
| `test_health_check` (`:124`) | `health_check` | none | `result == "Server is healthy!"` (`:127`) | none |
| `test_extract_audio` (`:130`) | `extract_audio_from_video` | sample.mp4 | "Audio extracted successfully" in result; output exists (`:134-135`) | mp3 encoder |
| `test_trim_video` (`:139`) | `trim_video` | sample.mp4 | "Video trimmed successfully"; exists (`:143-144`) | — |
| `test_convert_audio_properties` (`:148`) | `convert_audio_properties` (after `extract_audio_from_video`) | sample.mp4 | "Audio converted successfully"; exists (`:156-157`) | wav/pcm |
| `test_convert_video_properties` (`:161`) | `convert_video_properties` | sample.mp4, args `"mp4","720","libx264","1M",30,"aac","128k",44100,2` (`:164-167`) | "Video converted successfully"; exists (`:168-169`) | **libx264, aac** |
| `test_change_aspect_ratio` (`:173`) | `change_aspect_ratio` | sample.mp4, `"4:3","pad"` (`:176`) | changed-or-already-matches; exists (`:177-178`) | — |
| `test_convert_audio_format` (`:182`) | `convert_audio_format` | extracted mp3 | "Audio format converted"; exists (`:190-191`) | — |
| `test_set_audio_bitrate` (`:195`) | `set_audio_bitrate` | extracted mp3, `"320k"` | "Audio bitrate set"; exists (`:203-204`) | — |
| `test_set_audio_sample_rate` (`:208`) | `set_audio_sample_rate` | extracted mp3, 48000 | "Audio sample rate set"; exists (`:216-217`) | — |
| `test_set_audio_channels` (`:221`) | `set_audio_channels` | extracted mp3, 1 | "Audio channels set"; exists (`:229-230`) | — |
| `test_convert_video_format` (`:234`) | `convert_video_format` | sample.mp4 → avi | "Operation successful"; exists (`:238-239`) | avi muxer |
| `test_set_video_resolution` (`:243`) | `set_video_resolution` | `"640x480"` | "Operation successful"; exists (`:247-248`) | — |
| `test_set_video_codec` (`:252`) | `set_video_codec` | `"libx264"` | "Operation successful"; exists (`:256-257`) | libx264 |
| `test_set_video_bitrate` (`:261`) | `set_video_bitrate` | `"2M"` | ditto (`:265-266`) | — |
| `test_set_video_frame_rate` (`:270`) | `set_video_frame_rate` | 24 | ditto (`:274-275`) | — |
| `test_set_video_audio_track_codec` (`:279`) | `set_video_audio_track_codec` | `"aac"` | ditto (`:283-284`) | aac |
| `test_set_video_audio_track_bitrate` (`:288`) | `set_video_audio_track_bitrate` | `"192k"` | ditto (`:292-293`) | — |
| `test_set_video_audio_track_sample_rate` (`:297`) | `set_video_audio_track_sample_rate` | 48000 | ditto (`:301-302`) | — |
| `test_set_video_audio_track_channels` (`:306`) | `set_video_audio_track_channels` | 1 | ditto (`:310-311`) | — |
| `test_add_text_overlay` (`:315`) | `add_text_overlay` | sample.mp4; 2 calls (plain `:318-329`; boxed `:345-359`) | any success indicator + output exists (`:333-341,361-364`) | **`drawtext` filter + fontconfig default font** |
| `test_add_subtitles` (`:367`) | `add_subtitles` | self-written SRT (`:370-373`), font_style (`:376-381`) | any success + exists (`:385-387`) | **`subtitles` filter → libass** |
| `test_add_image_overlay` (`:390`) | `add_image_overlay` | sample.png, `position='top_right', opacity=0.5, start='0', end='5', width='iw/2', height='ih/2'` (`:395-399`) | any success + exists (`:403-405`) | (pillow pinned in `tests/requirements.txt:3` but **never imported**) |
| `test_concatenate_videos` (`:409`) | `concatenate_videos` (no transition) | 2 trims of sample.mp4 (`:412-417`) | any success + exists (`:425-427`) | concat demuxer; libx264/aac normalization |
| `test_change_video_speed` (`:430`) | `change_video_speed` | 30s trim; factor 1.5 (`:434-440`) | any success + exists (`:444-452`); skips if trim missing (`:435-436`) | atempo, setpts |
| `test_remove_silence` (`:455`) | `remove_silence` | 50s trim (`:458-459`) | "Silent segments removed" \| "No significant silences…" \| "successfully"; exists (`:466-468`) | silencedetect; select/aselect |
| `test_trim_video_with_duration_check` (`:471`) | `trim_video` | 2 trims (`:478-479`) | `abs(dur-5.0)<0.1` via `ffmpeg.probe` for both (`:482-492`); then `os.remove` (`:495-496`) | — |
| `test_add_b_roll` (`:500`) | `add_b_roll` | sample_files main/broll1/broll2; 5 sub-cases (fullscreen `:516-525`, PiP w/ slide+audio_mix `:538-549`, multiple `:561-578`, invalid position `:590-596`, invalid path `:604-606`) | success ⇒ duration `math.isclose(main, rel_tol=0.1)` (`:530,553,582`); error strings for invalid position (`:599`) and path (`:609`) | lavfi-generated fixtures; libx264/aac |
| `test_add_basic_transitions` (`:613`) | `add_basic_transitions` | main_video.mp4; fade_in/fade_out/long-fade/invalid (`:622-658`) | duration unchanged (`:628,639`); "error"+"exceed" (`:650`); "unsupported transition_type" (`:657`) | `fade` filter |
| `test_concatenate_videos_with_xfade` (`:660`) | `concatenate_videos` + xfade | short_video1/2; dissolve, wipeleft, invalid, 3-videos (`:672-729`) | duration ≈ d1+d2−1.0 (rel_tol 0.15) (`:680-683`); invalid/too-many error strings (`:717,729`) | **`xfade` + `acrossfade` filters** (audio branch not exercised — lavfi clips have no audio) |

`setup_module` builds output dir + sample files (`:110-116`); `teardown_module` is a no-op (`:118-122`). The file also runs standalone via `__main__` (`:732-764`).

`vam/tests/example_usage.py` is a **demo script, not a test** — imports `extract_audio_from_video, trim_video, add_text_overlay` (`:14-18`) and writes three example outputs (`:31-71`). No assertions.

**Imagician test scripts** (`imagician/test/`):
- `interactive.js` — manual smoke harness (wired as `npm test`, `package.json:41`). `downloadSampleImage()` **fetches `https://picsum.photos/1920/1080` → needs network** (`interactive.js:15`), caching to `test-images/sample.jpg` (`:8-17`); spawns `node dist/index.js` (requires prior build) (`:32`); sends raw JSON-RPC `tools/call` for `resize_image`, `convert_format`, `get_image_info`, `batch_resize` (`:81-129`); **prints responses, makes zero assertions** (`:47,134-142`).
- `create-test-image.js` — generates `test-images/sample.jpg` with `sharp({create:{width:1920,height:1080,channels:3,background:{r:255,g:100,b:0}}}).jpeg()` and prints metadata (`create-test-image.js:5-25`). No assertions. No network.

---

## E. Overlaps, naming conflicts, and unified rename map

**Structural conflicts:**
1. **Error contract**: imagician throws `McpError` (`imagician/src/index.ts:451-459`); video-audio returns error strings as tool results (`vam/server.py:36` and 40+ sites). One must win in the merged server.
2. **Naming style**: camelCase `inputPath/outputPath/outputDir` (`index.ts:34-35,173`) vs snake_case `input_video_path/…` (`server.py:19` etc.); `format` (`index.ts:61`) vs `target_format` (`server.py:77`).
3. **Quality semantics**: sharp `quality` 1–100 (`index.ts:68-71`) vs ffmpeg bitrate strings `"192k"` (`server.py:268`) vs skill-doc JPEG `-q:v 2–31`, CRF 0–51 (`skill/references/mcp-imagician.md:117`, `skill/assets/hls-video-conversion.md:158`). A unified `quality` param cannot be shared without a unit.
4. **Capability overlaps**: `convert_video_properties` (`server.py:114-155`) duplicates all 5 `set_video_*` granular tools; `convert_audio_properties` (`:77-111`) duplicates `convert_audio_format` + 3 `set_audio_*`. `change_aspect_ratio` pad path (`:196-200`) is the same scale+pad recipe as `set_video_resolution` and the skill's resize recipes (`skill/references/mcp-video-audio.md:128-129`). `get_image_info` overlaps the planned `media_probe`. `trim_video` overlaps HLS/repair building blocks. `batch_resize` (`index.ts:393-443`) is image-side multi-size generation, conceptually the same "generate N sizes" operation as `video_hls_ladder`.
5. **Near-name collisions**: `convert_format` (image) vs `convert_audio_format`/`convert_video_format`; `set_audio_*` (audio files) vs `set_video_audio_track_*` (audio inside video) — easy to mis-route.

**Unified rename (one row per source tool; prefix set = `image_ video_ audio_ media_`):**

| Source | Source tool name | Proposed name | Notes |
|---|---|---|---|
| imagician | `resize_image` | `image_resize` | fix `preserveAspectRatio`→`withoutEnlargement` semantics (see G) |
| imagician | `convert_format` | `image_convert` | quality unit must be documented per encoder |
| imagician | `crop_image` | `image_crop` | add bounds validation |
| imagician | `compress_image` | `image_compress` | keep size-delta report |
| imagician | `rotate_image` | `image_rotate` | validate `background` color |
| imagician | `flip_image` | `image_flip` | |
| imagician | `get_image_info` | `image_probe` | consider folding into `media_probe`; keep per-media specialization |
| imagician | `batch_resize` | `image_batch_resize` | |
| video-audio | `health_check` | `media_health_check` | |
| video-audio | `extract_audio_from_video` | `audio_extract` | audio_codec enum → validate against `-encoders` |
| video-audio | `trim_video` | `video_trim` | pick keyframe vs frame-accurate policy explicitly |
| video-audio | `convert_audio_properties` | `audio_convert_properties` | overlaps `audio_convert` + setters; consider deprecating |
| video-audio | `convert_video_properties` | `video_convert_properties` | overlaps all `video_set_*`; consider deprecating |
| video-audio | `change_aspect_ratio` | `video_set_aspect_ratio` | dead `codec_to_use` var (see G) |
| video-audio | `convert_audio_format` | `audio_convert` | |
| video-audio | `set_audio_bitrate` | `audio_set_bitrate` | |
| video-audio | `set_audio_sample_rate` | `audio_set_sample_rate` | |
| video-audio | `set_audio_channels` | `audio_set_channels` | |
| video-audio | `convert_video_format` | `video_convert` | |
| video-audio | `set_video_resolution` | `video_set_resolution` | |
| video-audio | `set_video_codec` | `video_set_codec` | codec enum gated on build (see F) |
| video-audio | `set_video_bitrate` | `video_set_bitrate` | |
| video-audio | `set_video_frame_rate` | `video_set_frame_rate` | |
| video-audio | `set_video_audio_track_codec` | `video_set_audio_codec` | |
| video-audio | `set_video_audio_track_bitrate` | `video_set_audio_bitrate` | |
| video-audio | `set_video_audio_track_sample_rate` | `video_set_audio_sample_rate` | |
| video-audio | `set_video_audio_track_channels` | `video_set_audio_channels` | |
| video-audio | `add_subtitles` | `video_add_subtitles` | libass-gated (see F) |
| video-audio | `add_text_overlay` | `video_add_text_overlay` | drawtext/font-gated (see F) |
| video-audio | `add_image_overlay` | `video_add_image_overlay` | |
| video-audio | `concatenate_videos` | `video_concat` | xfade optional path stays param-gated |
| video-audio | `change_video_speed` | `video_set_speed` | |
| video-audio | `remove_silence` | `media_remove_silence` | accepts audio **or** video (`server.py:1103-1105`) so `media_` fits |
| video-audio | `add_b_roll` | `video_add_b_roll` | audio_mix/slide currently ignored (see G) |
| video-audio | `add_basic_transitions` | `video_add_fade` | only fade_in/fade_out exist (`:1604-1610`) |

No literal name is shared by the two servers today; all conflicts are semantic (rows 4–5 above) plus the three planned gap tools (`media_probe`, `media_repair`, `video_hls_ladder` — section H), of which `media_probe` collides with `image_probe`/`get_image_info` output shape.

---

## F. Porting hazards — Python/ffmpeg-python → TypeScript on ffmpeg-static/ffprobe-static

**1. filter_complex graphs to rebuild as arg arrays (all currently Python strings):**
- xfade: `"[0:v][1:v]xfade=transition=X:duration=D:offset=O"` + optional `",[0:a][1:a]acrossfade=d=D:c1=tri:c2=tri"` with `-map [v] -map [a]` (`vam/server.py:932-950`) — **the audio branch emits no `[v]`/`[a]` output labels** (only the video-only branch appends `"[v]"`, `:949`) so the graph is malformed as written; untested because test fixtures are audio-less (`tests/test_video_functions.py:74-78`). Rebuild correctly or replicate the bug consciously.
- b-roll chained overlays: `"[0:v][1:v]overlay=x=…:y=…:enable='between(t,S,E)'"`, intermediates `[v0]…[v]`, joined `;` (`:1482-1523`), mapped with `-map [v] [-map 0:a]` (`:1543-1544`).
- remove_silence select chains: `between(t,S,E)` parts joined `+`, then `select`+`setpts PTS-STARTPTS` / `aselect`+`asetpts` (`:1185-1207`).
- speed: `setpts={1/f}*PTS` plus chained `atempo` filters (`:1054-1089`).
- subtitles: `"subtitles='{path}'" + ":force_style='{…}'"` (`:540-542`).
- text overlays: `drawtext=…` params joined `:` per element, elements joined `,` (`:613-639`).
- image overlay: `scale` → `format=rgba` → `colorchannelmixer aa=` → `overlay x/y/enable` (`:701-748`).
- per-clip normalize + concat demuxer: `-vf scale=W:H -r fps` (`:891-903`) and `file '{path}'` list file (`:1009-1024`).
In TS every one of these becomes an explicit args array (`spawn(bin, args, {shell:false})`); quoting differences between Python f-strings and raw args are the top breakage risk (especially `enable=between(t\,S\,E)` escaping at `:619` and quoted `text='…'` at `:614`).

**2. drawtext font-file requirements per OS.** `add_text_overlay` passes **no `fontfile` unless the caller supplies `font_file`** (`:630-632`) — behavior then depends on fontconfig finding a default font, which differs on macOS (Helvetica via fontconfig), Windows (no font registry fallback in minimal builds), and Linux containers (fonts may be absent entirely). The skill itself warns `drawtext`/`subtitles` may be missing from some builds and demands `ffmpeg -filters | grep -E "drawtext|subtitles|ass "` first (`skill/references/mcp-video-audio.md:78-82`; also `skill/SKILL.md:264`). Plan: bundle one known font (e.g., a packaged .ttf) and always pass `fontfile=`.

**3. subtitles filter needs libass.** Burn-in goes through the `subtitles` filter (`vam/server.py:540`), which only exists in ffmpeg builds compiled with libass; `ffmpeg-static` variant selection must be verified per platform (whether the shipped build carries libass is UNKNOWN from these sources). Same gate applies to `force_style` (ASS style syntax, `:523-537`).

**4. xfade availability.** `xfade` (video) and `acrossfade` (audio) (`:932-945`) are filters not present in old/minimal builds; the skill already treats filter availability as build-dependent (`skill/references/mcp-video-audio.md:78-82`). `fade` (`:1416-1421,1605-1608`), `silencedetect` (`:1130`), `select/aselect` (`:1203-1206`), `atempo` (`:1086`), `overlay` (`:748`), `concat demuxer` (`:1018`) also need gating.

**5. Codecs potentially missing from ffmpeg-static builds.** Sources use or document: `libx264` (`server.py:851,896,1432,1545`), `aac` (`:851,897`), `libmp3lame` (`skill/references/mcp-video-audio.md:154`), `libx265`, `libvpx-vp9`, `libopus` (`:143-144`), `libsvtav1` for AVIF image output (`skill/references/mcp-imagician.md:114`), WebP/AV1 encoders for image output (`:57,90-95`), and `mjpeg`/`png`. The skill mandates encoder checks before promising output (`skill/references/mcp-imagician.md:54-60`; `skill/references/mcp-video-audio.md:54-58`; `skill/SKILL.md:263`). ffmpeg-static ships full GPL builds in most versions, but **libass/libfreetype/libx265/libvpx/libaom/svtav1 presence per build is not evidenced in the sources — verify with `ffmpeg -encoders`/`-filters` at runtime** and prefer **sharp** for image WebP/AVIF (`sharp` locked 0.33.5, `imagician/package-lock.json:1090-1092`, encodes webp/avif natively at `imagician/src/index.ts:248-252`) so image output doesn't depend on ffmpeg encoders at all.

**6. Temp-dir usage.** `tempfile.mkdtemp()` + `shutil.rmtree` in three places: xfade path (`server.py:859,970`), concat path (`:977,1033`), b-roll (`:1367,1561`), plus a written `concat_list.txt` (`:1009`) and intermediate `norm_*.mp4`/`segment_*.mp4`/`processed_broll_*.mp4` (`:888,905,992,1278,1399`). TS equivalent: `fs.mkdtempSync(path.join(os.tmpdir(), 'media-'))` with `finally { fs.rmSync(dir, {recursive:true, force:true}) }`; note `shutil.rmtree` without `ignore_errors` (`:970,1033,1561`) can itself raise on Windows file locks.

**7. Python/ffmpeg-python specific behavior to replace:**
- `ffmpeg.probe()` returns **parsed JSON** from ffprobe (`:1240`, `:166`, `:1164`) with `format.duration` as a **string** (`:1245,1165`) and `avg_frame_rate` as `"N/D"` (`:1255-1256`). TS: spawn `ffprobe-static` with `-v error -print_format json -show_format -show_streams` and JSON.parse; keep the 30-fps default fallbacks (`:1260-1262`).
- ffmpeg-python **kwarg aliases**: `audio_bitrate`, `video_bitrate`, `vcodec`, `acodec`, `format`, `r`, `ar`, `ac`, `vf` (`:31,95-100,137-144,360` and throughout) are not raw ffmpeg flags — ffmpeg-python translates them (e.g. to `-b:a`, `-b:v`, `-c:v`, `-c:a`, `-f`). The mapping lives in the ffmpeg-python package (not in this repo — **verify against upstream `ffmpeg/__init__.py` before porting**); TS args must use the real flags.
- `ss`/`to` are **input** options in the Python calls (`:55,1280`) — must precede `-i` in the args array (README of skill also shows `-ss … -to … -i`, `skill/references/mcp-video-audio.md:103`).
- `run(capture_stdout=True, capture_stderr=True)` (`:32` etc.) buffers both streams; `run_async(pipe_stderr=True)` + `communicate()` pattern for silencedetect (`:1127-1135`) must be reproduced to scrape `silence_start/silence_end` from stderr (`:1138-1139`).
- `-strict -2` AAC legacy flag (`:1325`).
- ffmpeg-python `.run()` calls carry **no `-y`**, while every `subprocess.run` call does (`:898,915,1001,1022,1434,1547`) — decide one overwrite policy for the TS port (see G).
- Regex time parsing of silencedetect output (`:1138-1139`) assumes `silence_end` pairing that ffmpeg may not emit for trailing silence (code admits this at `:1156-1161`).

---

## G. Security and robustness defects in the sources

1. **Shell use:** none — all `subprocess.run` calls use arg arrays (`server.py:891-900,908-917,994-1003,1016-1024,1428-1436,1539-1553`) and imagician uses Node APIs/sharp. Good; keep `shell:false` in TS.
2. **Concat-list injection:** `f.write(f"file '{path}'\n")` (`:1012`) with `-safe 0` (`:1019`) — a filename containing `'` breaks/injects concat-demuxer syntax; absolute paths from user input are trusted verbatim.
3. **Path traversal / arbitrary file write:** no tool restricts input/output paths to any root. Only `os.path.exists` checks (`:514-517,592,689-692,841-843,1117,1353,1586`). Outputs may be any writable path, and **output == input is not guarded** (e.g. `trim_video(SAMPLE, SAMPLE, …)` destroys the source; imagician `toFile(outputPath)` likewise, `imagician/src/index.ts:220`). Subprocess paths hard `-y` overwrite (`:898` etc.).
4. **Unvalidated user strings into filtergraphs:**
   - drawtext text escaping (`server.py:610`) covers `\ ' : ,` but not `[ ] ; =` or newlines; `enable=between(t\,{start}\,{end})` interpolates raw caller strings (`:619`).
   - `font_file` only partially escaped (`:631-632`); existence never checked.
   - `subtitles='{srt_file_path}'` is unescaped (`:540`) — a quote or colon in the path (all Windows drive letters!) corrupts the filter.
   - `force_style` values from `font_style` dict are unvalidated (`:523-537`).
   - `add_image_overlay` custom `position` `'x=…:y=…'` values flow raw into overlay x/y (`:728-735`).
   - `resolution` strings flow raw into `scale=` (`:130-132,376-378`); `width/height` of overlays raw (`:703-706`); `scale_factor` raw (`:1400,1408`); `padding_color` raw (`:196-200`); `target_format`/codec/bitrate strings select arbitrary muxers/encoders (`:100,144,360,395`).
   Arg arrays prevent shell injection, but filter-grammar injection and unexpected ffmpeg behavior remain.
5. **Overwrite policy inconsistency:** `subprocess.run` calls force `-y` (silent overwrite anywhere) (`:898,1434,1547`); ffmpeg-python `.run()` calls carry no `-y`, so an existing output makes ffmpeg prompt on stdin and fail non-interactively — and the `trim_video` copy→re-encode fallback (`:62-67`) can hit this if the first attempt left a partial file.
6. **Hardcoded paths / CWD assumptions:** imagician tests write relative `test-images/`, `test-output/` (`imagician/test/interactive.js:8-9,27`); HLS asset uses `OUTPUT_BASE="hls_output"` (`skill/assets/hls-video-conversion.md:180`); server runtime itself is path-clean apart from temp filenames (`server.py:888,905,992,1278`).
7. **Platform assumptions:** bare `'ffmpeg'`/`'ffprobe'` must be on PATH (`server.py:892,1429`; `tests/test_video_functions.py:58,97`) — this is exactly what ffmpeg-static/ffprobe-static replace; Windows filter-string colon escaping (`:540,610`) breaks drive letters; `shutil.rmtree` may fail on Windows locks (`:970`); tests require lavfi (`color=` sources) and libx264 (`tests/test_video_functions.py:74-78`).
8. **Silent capability lies:** `add_b_roll` accepts `audio_mix` and slide transitions but ignores both (audio mixing stubbed at `:1528-1531`; slide branch is byte-identical to the basic branch, `:1506-1520`).
9. **Bugs:** `change_aspect_ratio` sets `codec_to_use = 'copy'` (`:181,201`) which is **never used** — the pad path always re-encodes video (`:223`); xfade audio branch filtergraph malformed (see F.1); `add_text_overlay` docstring defaults (`x_pos:'center'`, `y_pos:'h-th-10'`, `:583-584`) disagree with code defaults (`'(w-text_w)/2'`, `'h-text_h-10'`, `:617-618`) and the README example passes literal `'center'` (`vam/README.md:294`) which is not a valid drawtext expression.
10. **Misleading error taxonomy:** most `except FileNotFoundError` branches (`:37,71,108,262…`) are effectively unreachable because ffmpeg-python raises `ffmpeg.Error` (or subprocess errors), not `FileNotFoundError`, for missing inputs — callers get "unexpected error" strings instead (inference from library behavior; library source not in repo).
11. **Unbounded work:** no timeouts, no output-size or input-size guards on any spawn (`:32` and all `run` calls); stderr fully buffered.
12. **Imagician:** zero input validation (crop bounds, angle, colors, quality only JSON-schema-declared `index.ts:68-69,103-104` but not enforced at runtime); `fs.mkdir(path.dirname(outputPath), {recursive:true})` creates arbitrary directory trees from user paths (`:207`); `preserveAspectRatio` is wired to `withoutEnlargement` (`:216`) — semantic bug (it prevents upscaling, it does not control aspect ratio); `fit as any` cast (`:215`); metadata dump leaks local file mtime/size (`:376-387`).
13. **Doc drift:** README claims "All 30+ … tools" (`vam/README.md:369`) vs 27 actual; server id version `0.1.0` vs package `0.1.1` (`imagician/src/index.ts:17`, `imagician/package.json:3`); `add_b_roll`/`convert_video_properties` docstrings say "Args listed in PRD/previous messages" (`vam/server.py:119,1351`) — tool schema descriptions for the merged server must be written fresh.

---

## H. Media Editor gap tools — required operations per sources 3 & 4

**`media_probe`** (metadata & stream inspection):
- ffprobe metadata recipe: `ffprobe -v error -show_entries stream=width,height,codec_name,pix_fmt -of default=noprint_wrappers=1 INPUT.jpg` (`skill/references/mcp-imagician.md:150-152`).
- ffprobe "covers inspection", ships with ffmpeg (`skill/references/mcp-video-audio.md:41`); capability row "Inspect: read streams, duration and format with `ffprobe`" (`:75`); ffprobe is "metadata and stream inspection, and first-pass diagnosis in Repair Mode" (`skill/SKILL.md:395`).
- Preconditions to expose as health info: `ffmpeg -version` (`skill/SKILL.md:261`), `ffprobe -version` when metadata is needed (`:262`).
- Property set to return per the source server's probe contract: `duration, has_video, has_audio, width, height, avg_fps, sample_rate, channels, channel_layout` (`vam/server.py:1244-1262`) plus per-image fields `format, width, height, channels, bitDepth, colorSpace, density, hasAlpha, fileSize` (`imagician/src/index.ts:376-387`).
- Encoder/filter availability is part of probe-grade truth: `ffmpeg -encoders | grep -E "mjpeg|png|libsvtav1|libwebp"` (`skill/references/mcp-imagician.md:56-58`), `ffmpeg -encoders | grep -E "libx264|libx265|libvpx|aac|libmp3lame"` (`skill/references/mcp-video-audio.md:56-58`), `ffmpeg -filters | grep -E "drawtext|subtitles|ass "` (`:80-82`).

**`media_repair`** (diagnose then fix):
- Contract: `$repair`/`$r` → "Repair Mode with ffprobe diagnosis then ffmpeg repair" (`skill/SKILL.md:48`), route "`ffprobe then ffmpeg`" (`:86`), tool map "REPAIR: ffprobe and ffmpeg" (`:154-160`), "Diagnose and fix a broken media file" (`:279`), activation trigger "Repair or diagnose a broken media file" (`:39`); keyword weights repair 4 / broken 3 / corrupted 3 / recover 3 (`:140`).
- Flow per the skill README: "Starts with ffprobe to read the streams, the duration and the error, then applies the matching ffmpeg repair" (`skill/README.md:202-204`).
- **GAP (important): the named sources contain no concrete repair ffmpeg recipes** — no `-err_detect`, `+genpts`/`+igndts`, remux-only or stream-recovery commands appear in `SKILL.md`, `mcp-imagician.md`, `mcp-video-audio.md` or `hls-video-conversion.md`. The only documented "recover-by-rewrite" primitives are the generic conversion recipes that a repair tool can compose: plain remux `ffmpeg -i INPUT.mov OUTPUT.mp4` (`skill/references/mcp-video-audio.md:90-92`), explicit-encode remux (`:96-98`), codec-copy trim (`:103`), and the encoder/filter availability checks above. The repair recipes themselves must be authored in the phase specs from general ffmpeg practice, not from these sources.

**`video_hls_ladder`** (from `skill/assets/hls-video-conversion.md`, version 0.111):
- 4-rung ladder: 1080p/720p/480p/360p (`:51`, quality table `:151-156`); output structure `master.m3u8` + per-rung `playlist.m3u8` + `segment_*.ts` (`:77-86`).
- Multi-quality command (`:94-119`): `filter_complex "[0:v]split=4[v1][v2][v3][v4]; [vN]scale=w=…:h=…:force_original_aspect_ratio=decrease,pad=…:(ow-iw)/2:(oh-ih)/2[vNout]"` with rungs `1920x1080`, `1280x720`, `854x480`, `640x360` (`:97-100`); per-rung encodes `-map "[vNout]" -c:v:N libx264 -preset fast -tune fastdecode` + profile/level (`main 4.0` for 1080p/720p, `baseline 3.1` for 480p/360p) + `-crf 23` + `-maxrate:v:N` `2500k/1500k/800k/500k` + `-bufsize:v:N` double the maxrate `5000k/3000k/1600k/1000k` + `-g 48 -keyint_min 48 -sc_threshold 0` (`:101-108`); `-an` (`:109`); mux options `-f hls -hls_time 2 -hls_playlist_type vod -hls_flags independent_segments -hls_segment_type mpegts -hls_segment_filename "OUTPUT_DIR/%v/segment_%03d.ts" -master_pl_name "master.m3u8" -var_stream_map "v:0,name:1080p v:1,name:720p v:2,name:480p v:3,name:360p" OUTPUT_DIR/%v/playlist.m3u8` (`:110-118`).
- Parameter rationale (`:121`): `split=4`, downscale-only `force_original_aspect_ratio=decrease`, centered `pad`, `-crf 23` visually transparent, `-bufsize` = 2× maxrate, `-g 48` GOP = 2 s @ 24 fps, `-an` drops audio.
- Single-quality variant (`:123-136`); 10-second test command (`:138-145`).
- CRF guidance 0–51: 18 lossless, 23 recommended, 28 medium; 20–22 premium, 24–26 constrained (`:158`); bandwidth-based rung selection >3 Mbps→1080p, 1.5–3→720p, 700k–1.5M→480p, <700k→360p (`:160`).
- Codec rules: baseline for 480p/360p, main for 1080p/720p; levels 3.1/4.0/4.1 (`:166-167`); GOP = fps × segment duration (`:168`); buffer = 2× maxrate (`:169`); segment 2 s recommended, 4 s acceptable, 6–10 s not recommended (`:170`).
- Web opts: `-movflags +faststart`, `-an` (20–30% savings), 2-second segments (`:56`).
- Troubleshooting knobs: raise CRF to 26 / maxrate to 2000k / drop 1080p for size (`:242`); lower CRF to 20 / maxrate 3000k / `-preset medium` for quality (`:243`); verify libx264 via `ffmpeg -codecs | grep 264` (`:240`).
- Optional GPU encoders `h264_nvenc`, `h264_qsv`, `h264_videotoolbox` as `-c:v` substitutes (`:248`).
- Batch shell script (`:176-229`) is the multi-file pattern; the merged tool should expose the single-file ladder first.
- Skill-side corroboration: HLS Mode multi-quality 1080p/720p/480p/360p (`skill/SKILL.md:278,288`).

---

## I. Dependencies and licenses (merged MIT package attribution)

**Imagician (MIT — `imagician/package.json:17`; `imagician/LICENSE:1-3`: "MIT License / Copyright (c) 2024 Hongyi Wang"; author `Hongyi Wang <wanghy0113@gmail.com>` `package.json:16`):**
- Runtime: `@modelcontextprotocol/sdk ^0.5.0` (`package.json:46`; locked `0.5.0`, `package-lock.json:833-835`), `sharp ^0.33.2` (`package.json:47`; locked `0.33.5`, `package-lock.json:1090-1092`).
- Dev: `@types/node ^20.11.0`, `tsx ^4.7.0`, `typescript ^5.3.3` (`package.json:49-53`). `engines.node >= 18` (`:54-55`).
- sharp transitively bundles prebuilt libvips binaries (lockfile references the libvips opencollective at `package-lock.json:830`); the prebuilt `@img/sharp-*` packages and libvips carry their own licenses — **not vendored in this repo; license texts are UNKNOWN here and must be pulled from upstream before shipping the .mcpb**.

**Video-audio (MIT — `vam/LICENSE:1-3`: "MIT License / Copyright (c) 2025 misbahsy"; repo `misbahsy/video-audio-mcp` `vam/README.md:543`):**
- `pyproject.toml:7-12`: `ffmpeg-python>=0.2.0`, `mcp[cli]>=1.9.0`, `pillow>=11.2.1`, `pytest>=8.3.5`; `requires-python >=3.13` (`pyproject.toml:6`) — contradicts README "Python 3.8+" (`README.md:10`).
- `requirements.txt:1-4`: `fastmcp>=0.7.0`, `ffmpeg-python==0.2.0`, `pytest==7.4.0`, `pillow==10.0.0` — **conflicting pins vs pyproject** (and `tests/requirements.txt:1-3` repeats `pytest==7.4.0`, `ffmpeg-python==0.2.0`, `pillow==10.0.0`).
- `uv.lock` resolutions: `ffmpeg-python 0.2.0` (`uv.lock:58-59`), `mcp 1.9.0` (`:155-156`), `pillow 11.2.1` (`:199-202`), `pytest 8.3.5` (`:304-305`), `video-edit-mcp 0.1.0` (`:442-443`); transitive `annotated-types 0.7.0` (`:6-7`), `anyio 4.9.0` (`:15-16`), `certifi 2025.4.26` (`:28-29`), `click 8.1.8` (`:37-38`), `colorama 0.4.6` (`:49-50`), `future 1.0.0` (`:70-71`).
- `tests/requirements.txt` (pinned duplicates) and `vam/CONTRIBUTING.md:23` (mentions Pillow/PIL) are non-runtime.

**Attribution needs for the merged MIT package:**
1. Retain both upstream MIT license texts and copyright lines verbatim: "Copyright (c) 2024 Hongyi Wang" (`imagician/LICENSE:3`) and "Copyright (c) 2025 misbahsy" (`vam/LICENSE:3`), plus a new line for the merged work.
2. The Python dependencies drop out of the runtime, but any ported code from `vam/server.py` remains under misbahsy's MIT — keep the notice even though ffmpeg-python/mcp/Pillow are not shipped.
3. New runtime deps named in the merge plan are **not present in either source tree** — `zod`, `ffmpeg-static`, `ffprobe-static` (and their transitive ffmpeg binary licensing: ffmpeg-static ships GPL-licensed ffmpeg builds; redistribution inside a `.mcpb` triggers GPL obligations) — **all version ranges and licenses are UNKNOWN from these sources and must be pinned and verified upstream**. `@modelcontextprotocol/sdk` current-version license is MIT upstream but the only evidence here is the 0.5.0 lockfile entry (`package-lock.json:833-835`) with no license string.
4. sharp / libvips / prebuilt binary notices must be included in the bundle's THIRD-PARTY notices (see above).
5. ffmpeg itself is referenced as externally installed ("Powered by FFmpeg", `vam/README.md:564`; installs at `skill/assets/hls-video-conversion.md:33-36`) — with ffmpeg-static it becomes a redistributed component; the skill docs assume system ffmpeg and this assumption changes with bundling.

**Unread/UNKNOWN items:** fixture byte sizes (all 7 — tool limitation), upstream licenses for sharp/libvips prebuilts, ffmpeg-static/ffprobe-static/zod (not in sources), the ffmpeg-python kwarg translation table (library source not in repo), and whether ffmpeg-static builds carry libass/libfreetype/libx265/libvpx/libaom/svtav1 per target platform (not evidenced in any source file).


## Fixture sizes (added by the orchestrator from `ls -la`, 2026-09-28)

| File | Bytes |
|---|---:|
| `video-audio-mcp-main/tests/sample.mp4` | 10498677 |
| `video-audio-mcp-main/tests/sample.png` | 3208752 |
| `video-audio-mcp-main/tests/sample_files/main_video.mp4` | 12127 |
| `video-audio-mcp-main/tests/sample_files/short_video1.mp4` | 6855 |
| `video-audio-mcp-main/tests/sample_files/short_video2.mp4` | 5802 |
| `video-audio-mcp-main/tests/sample_files/broll1.mp4` | 4770 |
| `video-audio-mcp-main/tests/sample_files/broll2.mp4` | 3717 |
