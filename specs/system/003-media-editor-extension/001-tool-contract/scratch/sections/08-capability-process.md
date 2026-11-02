## 8. Capability gating, process policy and escaping

This section fixes what the server reads before a run, how a run happens, and how caller text survives the trip into a filter graph. It serves REQ-007 and REQ-008 (`spec.md:129-130`), and it is the section AC-007 and AC-008 are checked against.

Boundaries. Section 6 owns the binary lookup, so a capability check runs only after a binary resolves (section 6.7), and `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND` wins over `CAPABILITY_MISSING` when both would apply. Section 5 owns the three codes this section raises, `CAPABILITY_MISSING`, `PROCESS_FAILED` and `PROCESS_TIMEOUT`, plus the `{ code, message, details }` body and the field names in it. Section 3.3.10 carries the gate list for the composition tools and section 3.4 for the media tools, and both are views of the one list in 8.1 and 8.2. Section 4 owns the allowed roots, the numbered output folder and the file-level side of `-n`. The runner defined here is built once in `002-server-foundation` and used unchanged by every later phase. The escaping helper is built in `005-video-composition`, as the affected-surfaces table in `plan.md` states.

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
2. **The reads obey the process policy of 8.3 and 8.4.** They are ordinary runs with an argv array, `shell: false`, the run timeout, the stderr cap and stdout capture, and their stdout is one of the few streams the server parses (the other two are the `-version` first line in section 6.1 and the ffprobe JSON body of section 3.4).
3. **The parse reads the name column, as a whole word.** A name counts as present when it appears in that column, never as a substring of a description. This is the difference between this check and the `grep` form the skill uses, where `grep libx264` can match a description line (`skill/references/mcp-video-audio.md:56-58`, `:80-82`).
4. **The check is a presence test, never a version or feature test.** The contract asks whether the build carries a name, and it does not try to infer settings from a build string.
5. **`media_health` reports the same cache as data**, one `{ kind, name, present }` entry per name below, so an operator can see the whole list in one call (`3.3.9`, `skill/SKILL.md:263-264`).

The list is closed. These are the names a tool may gate on, and no tool gates on anything else. Encoders:

| Name | Gated for |
|------|-----------|
| `libx264` | every video re-encode (sections 3.3.2 to 3.3.8, 3.4) and the ladder (`skill/assets/hls-video-conversion.md:94-118`) |
| `libx265` | the video codec values a caller may choose (`../context/source-inventory.md:221`) |
| `libvpx-vp9` | the same choice (`../context/source-inventory.md:221`) |
| `aac` | every audio re-encode (sections 3.3 and 3.4) |
| `libmp3lame` | the mp3 side of the audio tools (`skill/references/mcp-video-audio.md:154`) |
| `libopus` | the opus side of the audio tools (`../context/source-inventory.md:221`) |

Filters:

| Name | Gated for |
|------|-----------|
| `drawtext` | `video_add_text_overlay` (3.3.3), a libfreetype build plus a font file (`skill/references/mcp-video-audio.md:78-82`, inventory F.2) |
| `subtitles` | `video_add_subtitles` (3.3.2), a libass build (inventory F.3, `../context/source-inventory.md:217`) |
| `xfade`, `acrossfade` | `video_concat` when a transition is given (3.3.5, `vam/server.py:932-945`) |
| `silencedetect` | `media_remove_silence` (`vam/server.py:1130`) |
| `select`, `setpts`, `aselect`, `asetpts` | `media_remove_silence` (`vam/server.py:1185-1207`) and `video_set_speed` (`vam/server.py:1081-1089`) |
| `atempo` | `video_set_speed` (`vam/server.py:1084-1089`) |
| `fade` | `video_add_fade` (3.3.8) and `video_add_b_roll` when a fade is requested (3.3.7, `vam/server.py:1416-1421`, `:1605-1608`) |
| `overlay` | `video_add_image_overlay` (3.3.4) and `video_add_b_roll` (`vam/server.py:748`) |
| `scale` | `video_set_resolution` (`vam/server.py:374-379`), `video_set_aspect_ratio` (`:196-217`), `video_add_image_overlay` (`:701-707`), `video_concat` (`:891-900`) and the ladder (`skill/assets/hls-video-conversion.md:97-100`) |
| `pad`, `crop` | `video_set_aspect_ratio` (`vam/server.py:196-217`), and `pad` also the ladder (`skill/assets/hls-video-conversion.md:97-100`) |
| `split` | the ladder (`skill/assets/hls-video-conversion.md:97-100`) |
| `format`, `colorchannelmixer` | `video_add_image_overlay` when `opacity` is given (3.3.4, `vam/server.py:710-713`) |

Three exclusions are deliberate, so no reader mistakes the list for a full build audit:

- **The image encoders are not here.** `mjpeg`, `png` and the WebP or AVIF encoders the image recipes mention (`skill/references/mcp-imagician.md:54-60`) are ffmpeg names this server never runs, because `image_convert`, `image_compress` and `image_batch_resize` encode through sharp (`imagician/src/index.ts:242-252`, `:295-303`). Inventory F.5 records the decision behind it: image output must not depend on the ffmpeg build (`../context/source-inventory.md:221`).
- **`loudnorm` is not here.** The skill documents loudness normalization (`skill/references/mcp-video-audio.md:74`, `:157-163`) and none of the 39 tools exposes it, so there is no consumer to gate. A later phase that adds a normalize tool adds the name to this list in the same change.
- **Muxers and demuxers are outside both reads.** The concat demuxer, the hls muxer and the mp3 muxer do not appear in `-encoders` or `-filters`, and section 5 fixes `kind` to `encoder` or `filter`. Inventory F.4 records the concat demuxer as build-dependent (`../context/source-inventory.md:219`). A build without it fails at the run, as `PROCESS_FAILED` with the capped stderr tail.

### 8.2 What each tool checks

Five rules turn the list into a per-tool gate:

1. **A tool checks exactly the names its fixed commands write, and the gate runs before the first spawn of the call.** It also runs before the numbered output folder is created, so a capability failure leaves no folder, no temp file and no child process behind. For a tool that makes several runs, such as `video_concat` or `video_add_b_roll`, one gate covers the whole call, because the same names apply to every pass.
2. **A copy pass needs nothing.** Where a command copies a stream, its row lists nothing for that attempt. The ladder is the same at the demuxer level, where no encoder runs for a remux.
3. **Every video re-encode names `libx264` for the picture and `aac` for the audio** unless its own row names another encoder, the pair every fixed command in sections 3.3 and 3.4 uses. A row below that re-encodes therefore reads the pair, so a build without it fails at the gate rather than mid-encode.
4. **Where a schema carries a codec value, the caller's value is the name checked.** The video codec values are checked against the encoder list (inventory E, `../context/source-inventory.md:171`, and F.5, `:221`), and the audio codec values the same way (`vam/server.py:19`, `:31`).
5. **A property setter keeps the stream's codec**, so the name that gate checks comes from the ffprobe read of the input, through one map: an `mp3` stream needs `libmp3lame`, an `aac` or `m4a` stream needs `aac`, `opus` needs `libopus` and `vorbis` needs `libvorbis`. A codec outside the map is not gated: the pass runs, and a build without the encoder returns `PROCESS_FAILED` with the capped tail. Refusing the call instead would block a system ffmpeg that can encode it.

| Tool (section 2 row) | Encoders to check | Filters to check | Notes |
|----------------------|-------------------|------------------|-------|
| `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` (1 to 8) | none | none | sharp encodes every image format in process (`imagician/src/index.ts:242-252`, `:295-303`), so these eight never resolve a binary and never read the two lists (inventory F.5, `../context/source-inventory.md:221`) |
| `media_health` (9) | none | none | reports the lists as data (3.3.9), its four short runs are named there |
| `audio_extract` (10) | the encoder the caller names through `audioCodec` | none | the check the inventory asks of the enum (`../context/source-inventory.md:171`), on the value the source passed straight to `acodec` (`vam/server.py:19`, `:31`) |
| `video_trim` (11) | none on the copy attempt, `libx264` and `aac` on the re-encode fallback | none | the copy attempt is the fast path (`vam/server.py:55-58`), the fallback re-encodes (`:64-66`) |
| `audio_convert_properties` (12) | the map of rule 5, for the codec of the output the call writes | none | the source passed bitrate, sample rate and channels with no codec name (`vam/server.py:92-103`) |
| `video_convert_properties` (13) | the encoders named by `codec` and `audioCodec` when the caller sets them, otherwise the map of rule 5 | `scale` when `resolution` is given | `vf=scale=...` (`vam/server.py:128-135`) |
| `video_set_aspect_ratio` (14) | `libx264`, `aac` | `scale`, `pad`, `crop` | the pad path re-encodes the picture (`vam/server.py:196-200`, `:223`), the crop path the same (`:214-217`) |
| `audio_convert` (15) | the map of rule 5, or none on a copy | none | a container change with no codec name (`vam/server.py:257`) |
| `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels` (16 to 18) | the map of rule 5 | none | each re-encodes the stream it keeps (`vam/server.py:267-328`) |
| `video_convert` (19) | none on the copy attempt, `libx264` and `aac` on the re-encode fallback | none | copy streams first, re-encode on failure (`vam/server.py:360-362`) |
| `video_set_resolution` (20) | `libx264`, `aac` | `scale` | `vf=scale=...` forces a video re-encode (`vam/server.py:374-379`) |
| `video_set_codec` (21) | the encoder the caller names through `codec` | none | the value the source passed to `vcodec` (`vam/server.py:395-397`) |
| `video_set_bitrate` (22) | `libx264`, `aac` | none | the source named no video codec (`vam/server.py:409-411`) |
| `video_set_frame_rate` (23) | `libx264`, `aac` | none | `vam/server.py:423-425` |
| `video_set_audio_codec` (24) | the encoder the caller names through `audioCodec` | none | `vam/server.py:437-439` |
| `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels` (25 to 27) | the map of rule 5 | none | the audio track is re-encoded, the picture copied (`vam/server.py:451-481`) |
| `video_add_subtitles` (28) | `libx264`, and `aac` before attempt 2 | `subtitles` | 3.3.2, a libass build (inventory F.3) |
| `video_add_text_overlay` (29) | `libx264`, and `aac` before attempt 2 | `drawtext` | 3.3.3, the REQ-007 case, a libfreetype build plus a font file (inventory F.2) |
| `video_add_image_overlay` (30) | `libx264`, `aac` | `overlay`, `scale`, plus `format` and `colorchannelmixer` when `opacity` is given | 3.3.4 |
| `video_concat` (31) | `libx264`, `aac` | `scale`, plus `xfade` and `acrossfade` when `transition` is given | 3.3.5, the two transition filters are build-dependent (inventory F.4, `../context/source-inventory.md:219`) |
| `video_set_speed` (32) | `libx264`, `aac` | `setpts`, `atempo` | the tempo chain (`vam/server.py:1059-1093`) |
| `media_remove_silence` (33) | `libx264` and `aac` for a video input, `aac` for an audio input | `silencedetect`, `select`, `setpts`, `aselect`, `asetpts` | 3.3.6, the detect run scrapes stderr (`vam/server.py:1127-1139`) |
| `video_add_b_roll` (34) | `libx264`, `aac` | `overlay`, `scale`, plus `fade` when a fade is requested | 3.3.7 |
| `video_add_fade` (35) | `libx264`, and `aac` before attempt 2 | `fade` | 3.3.8 |
| `media_probe` (36) | none | none | ffprobe only, no encoder and no filter runs (3.4) |
| `media_repair` (37) | `libx264` and `aac` on a re-encode pass, none on the copy pass | none | 3.4, the copy branch repairs without re-encoding |
| `video_hls_ladder` (38) | `libx264` | `split`, `scale`, `pad` | the graph splits, scales and pads each rung (`skill/assets/hls-video-conversion.md:97-100`), and 3.4 names the encoder |
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
| stdout | `ignore` unless the tool needs it. Three tools need it: the resolver reads a `-version` first line (section 6.1), the capability reads parse the two lists (8.1), and `media_probe` and `media_repair` read ffprobe JSON (3.4). An inherited stdout is never allowed, because stdout carries the protocol stream (section 6.8) |
| stderr | `pipe`, capped as 8.4 states, because the cap is the only reason a failure is readable |
| Environment | the host environment with `LC_ALL` and `LANG` set to `C`, so every line the server parses or shows keeps one spelling across machines |

Every ffmpeg argv begins with three flags, and the runner adds them, so the command shapes in section 3 are written without them:

| Flag | Reason |
|------|--------|
| `-hide_banner` | keeps the build banner out of the capped tail, so the tail holds the failing lines. The capability reads of 8.1 and the checks in `media_health` use it for the same reason (`3.3.9`) |
| `-nostdin` | ffmpeg never reads a console or the server's stdin (G.5, `../context/source-inventory.md:249`) |
| `-n` | ffmpeg never overwrites an existing file (REQ-003, `spec.md:120`). The sources split on this: every `subprocess.run` carried a hard `-y` (`vam/server.py:898`, `:1434`, `:1547`) while the ffmpeg-python runs carried neither flag and could prompt on stdin instead (inventory F.7, `../context/source-inventory.md:231`). One policy replaces both, and `-y` never appears in this contract |

An ffprobe argv begins with `-hide_banner -v error` instead, which is the error level the probe command of 3.4 already uses. `-n` does not apply to ffprobe, which writes no file.

Two Windows notes belong here. The binary file names come from section 6, so no `which` or `where` output is ever spliced into a command (section 6.4). And no shell means no batch script, so a path with spaces, `&` or `%` in it is one argv element with no meaning to anything but ffmpeg itself. The escaping that filter values need is a separate question, owned by 8.5, and it exists because of the filter grammar, not because of a shell.

### 8.4 Timeout, stderr and cleanup

| Rule | Value |
|------|-------|
| Timeout | 1800 seconds per process by default, `MEDIA_EDITOR_TIMEOUT_SECONDS` overrides it (NFR-P01, `spec.md:169`, section 6.8). The budget is per process, not per call: `video_concat` runs one process per clip plus one join, and each gets its own |
| On expiry | the runner ends the process, then enlarges the wait: a termination signal first, five seconds, then a force kill. On Windows both steps terminate the process, and the wait only gives it time to exit. The partial output is removed and `PROCESS_TIMEOUT` returns with `binary`, `timeoutSeconds` and `elapsedSeconds` (section 5) |
| The resolver's probe | the `-version` check keeps its own ten-second bound (section 6.1) and is not a timed run of a tool |
| stderr cap | the last 64 KB of the stream, counted in bytes, oldest bytes dropped first (NFR-P02, `spec.md:170`). The buffer holds the newest bytes whole, is decoded as UTF-8 with a replacement character when the cut lands mid-character, and is the only stderr text a result may carry (`details.stderrTail`, section 5, `details` rule 2). Nothing is added to it |
| Streams | the detect pass of `media_remove_silence` exists because the source scraped `silence_start` and `silence_end` from stderr (inventory F.7, `../context/source-inventory.md:229`, `vam/server.py:1127-1139`), and that is the one tool that needs stderr as data rather than as a failure report. Every other tool keeps the tail only for its error result |
| Temp folder | one per run, created with `fs.mkdtempSync(path.join(os.tmpdir(), 'media-editor-'))` and removed in `finally`. It holds what the source kept in `tempfile.mkdtemp()`: the concat list (`vam/server.py:1009`) and the intermediates `norm_*.mp4`, `segment_*.mp4` and `processed_broll_*.mp4` (`:888`, `:905`, `:992`, `:1278`, `:1399`, inventory F.6, `../context/source-inventory.md:223`) |
| Temp cleanup | the removal is forced and retried, because a Windows handle can outlive its process for a moment and the source's `shutil.rmtree` had no retry and could raise on a lock (`vam/server.py:970`, `:1033`, `:1561`, inventory F.6). The temp folder is never a caller path and never the output folder (section 4) |
| Partial outputs | the runner records every path it hands to a child as an output. On a non-zero exit, a timeout, a kill or a thrown error it removes each recorded path that exists, then removes the numbered folder the call created (section 4.3). A failed run leaves neither a partial file nor a folder behind (NFR-R01, `spec.md:177`) |
| Attempts | each attempt of a two-attempt tool writes to its own path inside the temp folder, and only the surviving file is moved into the numbered folder (3.3, rule 3). This is the fix for the source's shared final path, where a partial file from the copy attempt could break the re-encode attempt (`vam/server.py:546-558`, inventory G.5, `../context/source-inventory.md:249`) |
| `OUTPUT_EXISTS` | before each spawn the runner stats each planned output path and keeps the result, so an existing target anywhere in the run maps to `OUTPUT_EXISTS` with `stage: "run"` from the recorded state, never from ffmpeg's wording (section 5). The `-n` flag and the mapping are the same rule seen from two sides |
| Concurrency | several calls may run at once. Each gets its own temp folder, the numbered folder is race-free by construction (section 4.3), the capability lists are read once behind a single in-flight read (8.1), and there are no process groups to leak, because no shell was ever started |

### 8.5 One escaping helper for every caller string that reaches a filter graph

Every caller string that reaches a filter graph passes through one helper (NFR-S02, `spec.md:174`), and no tool writes an escape of its own. The rule covers three values, and their routes are fixed in section 3.3: the drawtext text (3.3.3), the subtitle file path in the `subtitles` filter (3.3.2) and the font file path in `fontfile=` (3.3.3). The helper applies one table, in one pass, backslash first:

| Character | Escaped form | Why |
|-----------|--------------|-----|
| `\` | `\\` | it is the escape character itself, so a caller backslash must be doubled or the parser drops it or consumes the character after it. The source escaped it for text and font paths (`vam/server.py:610`, `:631-632`) |
| `'` | `\'` | the value is wrapped in single quotes, and a bare quote ends the quoted section and lets the rest read as graph syntax. The source escaped it in text only (`vam/server.py:610`), not in the subtitle path (`:540`) |
| `:` | `\:` | it separates options inside a filter argument, so an unescaped colon ends the value. This is exactly how a Windows drive letter truncates `subtitles='C:\clips\a.srt'` at `C` (inventory G.4 and G.7, `../context/source-inventory.md:244`, `:251`, and the spec's Windows edge case, `spec.md:188`) |
| `%` | `\%` | drawtext expands `%{...}` sequences at its default expansion setting, so a caller percent could inject an expansion the caller never asked for. Every drawtext this contract builds also carries `expansion=none`, and the escape holds whether or not that option is read |
| `,` | `\,` | it separates filters inside one chain, and the server itself joins text elements with a comma (`vam/server.py:639`), so an unescaped comma in caller text turns into a second filter. The source escaped it in text (`:610`) but not in the times it put into `enable` (`:619`) |
| `;` | `\;` | it separates chains inside `filter_complex`, so an unescaped semicolon splits the graph. Inventory G.4 records that the source did not cover it (`../context/source-inventory.md:242`) |
| `[` | `\[` | it opens a stream label, so caller text could otherwise name another stream of the graph (G.4, `../context/source-inventory.md:242`) |
| `]` | `\]` | it closes a label, for the same reason (G.4) |
| `=` | `\=` | it separates an option key from its value, so an unescaped equals inside a value can read as a new assignment. G.4 lists it as uncovered (`../context/source-inventory.md:242`) |
| newline, `LF` or `CRLF` | the two characters `\n` | a raw line break inside a filter value is read as token white space by some parsers and cannot survive one log line or one bug report. The helper writes the two-character form and never emits the raw byte |

Three rules keep the table honest:

- **One pass, backslash first.** A second pass would escape the backslashes the first pass added, so there is exactly one, and the helper's output is final.
- **The quotes are part of the command shape, not of the helper's output.** The server writes `text='...'` and `fontfile='...'`, the helper fills the inside, and no caller byte ever decides where the quotes fall.
- **The helper assumes a validated value.** A NUL, a lone surrogate or a string that is not valid UTF-8 never reaches it, because the schema rejects text before the handler runs (3.3.3) and the real-path check rejects a path (section 4.2).

Two callers stay outside the table, on purpose:

- **Enums, numbers and colours do not need it.** A position is an enum member that the server turns into an expression (3.3.1), a time or size is parsed to a number and re-serialized, and a colour is validated as `#RRGGBB` before it is used. The source interpolated raw times into `enable` (`vam/server.py:619`) and raw positions into `x=` and `y=` (`:617-618`, `:728-735`), which is what the round trip removes.
- **An `-i` argument is not graph syntax.** An input media path is one argv element and never appears inside a filter value, so it needs no escaping. Only the two paths the filters themselves open, the subtitle file and the font file, go through the helper.

The concat list file is a second quoting context with its own rule, owned by 3.3.5 and section 4.5: each `file '...'` line escapes its path for the demuxer, where the source wrapped the path in quotes with no escaping (`vam/server.py:1012`, with `-safe 0` at `:1019`, inventory G.2, `../context/source-inventory.md:239`). It applies the same two rules, `\` and `'`, because it is the same class of problem one layer away from a filter graph.

### 8.6 Paths that escaping alone cannot carry

A path inside a filter graph is parsed more than once: the graph parser first, the filter's own option parser next, and then the library that opens the file, with its own escaping on top. A quote, a percent, a semicolon or a bracket in a file name has no single agreed escape across those layers, so the contract does not bet on one.

The rule: the helper escapes the path first. A path whose own bytes stay inside a safe set is used as it is, escaped. The safe set is ASCII letters, digits, `.`, `-`, `_`, `/`, `\`, `:` and the space character. A path carrying anything else, a quote, a percent sign, a comma, a semicolon, a bracket or an equals sign, is not escaped at all: the file is copied into the run's temp folder under a generated name (`subtitle.srt`, `font.ttf`), and the temp path is escaped instead.

Three consequences follow:

- **A drive letter survives.** A Windows subtitle path such as `C:\clips\a.srt` stays inside the safe set, so it is escaped in place, and the `:` and `\` rows of the table are what keep it whole. The spec names this exact case as the one where the source breaks (`spec.md:188`), and the source did break: the path went into the filter raw (`vam/server.py:540`), so the value ended at the colon.
- **The copy is byte for byte.** The original is opened read only and never touched, the copy keeps the extension the `subtitles` filter reads, and the temp folder takes the copy with it when the run ends.
- **The bundled font needs no copy.** Its path is fixed at pack time and stays inside the safe set on every platform the bundle ships for, so it goes through the escape directly (3.3.3, inventory F.2, `../context/source-inventory.md:215`).

### 8.7 Defects this section closes

- **G.1 shell use**: `shell: false` and an argv array for every spawn, the shape the sources already used for `subprocess.run` and which the port keeps (`vam/server.py:891-900`, `:1016-1024`, `:1428-1436`, `../context/source-inventory.md:238`).
- **G.4 unvalidated strings in filter graphs**: one helper, the table of 8.5, the temp-copy rule of 8.6 and the number round trip of section 3.3 replace the partial escape at `vam/server.py:610`, the raw times at `:619`, the raw subtitle path at `:540` and the partial font path at `:631-632` (`../context/source-inventory.md:241-248`).
- **G.5 overwrite inconsistency**: `-n` on every run, `-nostdin` so nothing prompts, one temp path per attempt and the partial-output removal of 8.4 replace the hard `-y` at `vam/server.py:898`, `:1434` and `:1547` and the shared final path that could block a second attempt (`:546-558`, `../context/source-inventory.md:249`).
- **G.7 platform assumptions**: a drive letter survives inside a filter value through the escape or through the temp copy, the binary file names come from section 6 instead of a host `PATH` lookup inside a command (`vam/server.py:892`, `:1429`), and the temp cleanup retries around a Windows lock (`vam/server.py:970`, `../context/source-inventory.md:251`).
- **G.11 unbounded work**: every run is bounded by the timeout of 8.4 with a kill on expiry, and its stderr is capped at the last 64 KB, where the sources set no timeout and buffered every byte (`../context/source-inventory.md:255`, NFR-P01 and NFR-P02, `spec.md:169-170`).
- **F.2, F.3, F.4 and F.5 build-dependent names**: the gate of 8.2 covers `drawtext`, `subtitles`, `xfade` and the encoders, so a build that lacks one fails before the run instead of mid-encode (`../context/source-inventory.md:215-221`).
- **F.6 temp dirs**: `mkdtempSync` plus a forced, retried removal in `finally` replaces `tempfile.mkdtemp` and `shutil.rmtree`, which could raise on a Windows lock (`vam/server.py:859`, `:970`, `:1033`, `:1561`, `../context/source-inventory.md:223`).
- **F.7 stream capture**: the detect pass reads its stderr tail the way the source's `run_async` scrape did, and the ffprobe JSON read replaces `ffmpeg.probe` (`vam/server.py:1127-1139`, `../context/source-inventory.md:226`, `:229`).
