### 3.4 Media Editor tool schemas

These four schemas are the zod contracts behind rows 36 to 39 of the unified table. Rows 36 to 38 are built in `006-probe-repair-hls` and row 39 in `008-claude-code-plugin` (section 2). Section 1.1 fixes the names, section 1.2 fixes the shared parameter names and ranges, section 1.3 fixes `crf`, and the tables below add the tool-specific fields. A call that fails its schema is the SDK's `-32602` protocol error. A call that passes its schema and then fails a handler check returns a tool result with one code from the section 5 list.

Every table reads `parameter | type | required or default | range or enum | unit | notes`, in that order.

Four rules hold for the whole group before the tool tables:

- The three media tools read their input through the section 4.2 real-path check. `media_repair` and `video_hls_ladder` write into one fresh `<output folder>/NNN - <slug>/` folder (sections 1.4 and 4.3) and never onto an input. `media_probe` and `media_setup_ffmpeg` create no output folder at all. Setup writes only inside the server data folder, which section 4 counts as a package asset and exempts from the root check, and it keeps working when no allowed roots are configured, because it takes no path parameter.
- Every subprocess comes from the section 6 resolver. A missing ffprobe returns `FFPROBE_NOT_FOUND` and a missing ffmpeg returns `FFMPEG_NOT_FOUND`, each naming `media_setup_ffmpeg` as the next step (section 5).
- No caller string reaches a child process argument or a filter graph as syntax. The ladder's every value is a closed enum or a bounded integer, and the repair passes are fixed flags picked by one enum, so the unvalidated string family of defects cannot recur here (section G.4, `../context/source-inventory.md:241-248`). Section 8 owns the escaping helper for the tools that carry caller text.
- Every run takes the section 8 timeout (1800 seconds by default, `MEDIA_EDITOR_TIMEOUT_SECONDS` overrides it), keeps only the last 64 KB of stderr, and carries `-n`.

#### `media_probe`

Source: new tool in row 36. It is the ffprobe inspection path for any media kind (section 2), read-only, with no output folder.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2), any image, audio or video file |

**Behavior**: one ffprobe run, `ffprobe -v error -print_format json -show_format -show_streams` (`../context/source-inventory.md:226` gives this as the TypeScript form that replaces `ffmpeg.probe` at `vam/server.py:1240`), then one `JSON.parse`. The result reports three blocks:

- `format`: `formatName`, `durationSeconds` (a number, parsed from the string ffprobe returns, `../context/source-inventory.md:226`), `sizeBytes` and `bitRate` (bits per second).
- `summary`: `hasVideo` and `hasAudio` (the source picks the first stream of each type, `vam/server.py:1241-1242`), `durationSeconds`, `width` and `height` in pixels from the first video stream (`:1248-1249`), `frameRate` in frames per second from `avg_frame_rate` (`:1255-1262`), and `sampleRate` in Hz with `channels` and `channelLayout` from the first audio stream (`:1251-1253`).
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

**Diagnosis** is one ffprobe run, `ffprobe -v error -show_entries format=format_name,duration:stream=codec_name,codec_type INPUT` (`skill/README.md:207`). Partial output is accepted, because the damaged file is the reason for the call: the streams, the duration and the format name that could be read are reported together with a capped excerpt of the error text (`skill/README.md:204`). The diagnosis decides the re-encode branch and fills the result's `diagnosis` block. A file whose diagnosis read no video and no audio stream returns `UNSUPPORTED_FORMAT` with `detected` naming the format ffprobe reported and `accepted: ["video", "audio"]`, because both passes rewrite media streams and this file is past their scope.

**Rewrite** is one ffmpeg pass, chosen by `strategy`:

| Requested `strategy` | Pass that runs | Command shape |
|---|---|---|
| `remux` | Stream copy | `ffmpeg -n -i INPUT -c copy TARGET`, the repair flow's stream-copy command (`skill/README.md:208`) and the copy form of the plain conversion (`skill/references/mcp-video-audio.md:91`). The container stays the input's, which already accepts its streams (`skill/references/mcp-video-audio.md:209`). |
| `reencode`, a video stream is present | Re-encode | `ffmpeg -n -i INPUT -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k TARGET` (`skill/references/mcp-video-audio.md:97`), with the audio flags only when the diagnosis found an audio stream |
| `reencode`, audio only | Re-encode | `ffmpeg -n -i INPUT -c:a aac -b:a 192k TARGET` (`skill/references/mcp-video-audio.md:156`) |
| `auto` | Copy first, re-encode on failure | The `remux` row, then the re-encode row that fits the diagnosis when the copy exits non-zero (`vam/server.py:55-66`, `:360-362`) |

The two passes are the recovery primitives the reference documents, and the re-encode is the last resort: the copy repairs what a container index or a timestamp table can repair, and the re-encode rebuilds the elementary streams. No other flags are added, so every run is one of the four command shapes above plus `-n`. The output name is `<basename>-repaired.<ext>`, where the extension is the input's own on the copy branch and `.mp4` or `.m4a` on the re-encode branches. A failed pass leaves nothing behind: the runner removes its partial output before the next pass starts (section 8).

The re-encode branches check the resolved build first, per section 8: `libx264` and `aac` for the video branch, `aac` for the audio branch (`../context/source-inventory.md:221` records both as build-dependent). A missing encoder is `CAPABILITY_MISSING` before ffmpeg starts. A copy pass needs no encoder check, because it copies what is already encoded.

**Output**: one file, `<basename>-repaired.<ext>`, inside the call's single numbered folder. The structured result carries the diagnosis (`formatName`, `durationSeconds`, the readable streams, the error excerpt when there was one) and the repair (the requested `strategy`, the `pass` that succeeded, `outputPath` and `bytes`), with the section 7 shape.

#### `video_hls_ladder`

Source: new tool in row 38, built from the Media Editor HLS recipe (`skill/assets/hls-video-conversion.md`): the four-rung ladder at `:51` and its quality table at `:151-156`.

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2), must carry a video stream |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `rungs` | array of enum | default all four | `1080p`, `720p`, `480p`, `360p` | none | 1 to 4 entries, no repeats. The ladder order is always 1080p down to 360p, the stream map renumbers from `v:0`, and dropping a rung is the file-size knob of `skill/assets/hls-video-conversion.md:242` |
| `crf` | integer | default 23 | 0 to 51 | CRF scale, lower is better | the recipe's visually transparent value (`skill/assets/hls-video-conversion.md:158`). The asset's size and quality knobs raise it to 26 or lower it to 20 (`:242-243`) |
| `segmentDuration` | integer | default 2 | 2 to 10 | seconds | the `-hls_time` value (`:111`). 2 seconds is recommended, 4 acceptable, 6 to 10 not recommended (`:170`), and the GOP derives from it (`:168`) |

**Behavior**: one ffmpeg run builds the whole ladder, following the multi-quality command (`skill/assets/hls-video-conversion.md:94-118`). The filter graph splits the picture once per selected rung and scales each copy to fit inside its rung frame, then pads it centered to the exact size (`:97-100`, `:121`), so a portrait or ultrawide source is letterboxed rather than cropped. Each rung then takes the settings of the quality table (`:151-156`):

| Rung | Frame size | `maxrate` | `bufsize` | Profile | Level |
|---|---|---|---|---|---|
| `1080p` | 1920x1080 | 2500k | 5000k | main | 4.0 |
| `720p` | 1280x720 | 1500k | 3000k | main | 4.0 |
| `480p` | 854x480 | 800k | 1600k | baseline | 3.1 |
| `360p` | 640x360 | 500k | 1000k | baseline | 3.1 |

Every rung encodes with `-c:v libx264 -preset fast -tune fastdecode -crf <crf>`, its own `-maxrate` and `-bufsize`, `-g` and `-keyint_min` set to the input's average frame rate times `segmentDuration` (`:101-108`, `:168`), which is 48 at the recipe's 24 fps and 2-second segment (`:121`), and `-sc_threshold 0`. The frame rate comes from one ffprobe read of the input before the run and keeps the 30 frames per second fallback (`vam/server.py:1260-1262`). The rate control, the profiles and the levels are libx264 settings, so the ladder is fixed to `libx264` and the asset's GPU substitutes (`:248`) are not exposed. Audio is not carried: the recipe runs `-an` (`:109`) and records the 20 to 30 percent saving it brings (`:56`). The `libx264` check of section 8 runs before the encode, and a build without it returns `CAPABILITY_MISSING` (`:240`).

The mux options are the recipe's: `-f hls -hls_time <segmentDuration> -hls_playlist_type vod -hls_flags independent_segments -hls_segment_type mpegts`, with the segment pattern `<folder>/%v/segment_%03d.ts`, `-master_pl_name master.m3u8`, the stream map `-var_stream_map "v:0,name:1080p v:1,name:720p v:2,name:480p v:3,name:360p"`, and the output pattern `<folder>/%v/playlist.m3u8` (`:110-118`).

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

1. **Resolve.** The first three lookup steps of section 6 run for every requested component: the `MEDIA_EDITOR_FFMPEG_PATH` or `MEDIA_EDITOR_FFPROBE_PATH` override, the bundled static package, then system `PATH`. Every path found is reported with the step that found it. A component the first three steps resolve is never planned and never downloaded, so consent is only ever asked for what is actually missing.
2. **Plan.** Each requested component that stays unresolved gets one plan row from the pinned build table. That table ships with the server, holds one row per platform and component, and is fixed at pack time: no value in it is computed or fetched at call time.

| Plan field | Value |
|---|---|
| `component` | `ffmpeg` or `ffprobe` |
| `platform` | one of the five keys `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64` (`decision-record.md:56`) |
| `url` | the pinned `https` artifact for that platform |
| `bytes` | the archive size in bytes |
| `sha256` | the pinned digest, lowercase hex |
| `destination` | the file path inside the server data folder that the bundled lookup step of section 6 reads |

A platform outside the five has no pinned row. The call returns `INVALID_INPUT` with `parameter: "platform"`, the detected key and `reason: "unsupported-platform"` instead of guessing a build.

3. **Consent gate.** Without `consent: true` the call ends here and writes nothing. When at least one requested component is unresolved the result is `isError: true` with code `CONSENT_REQUIRED`, `details.action` is `download-ffmpeg` when the ffmpeg artifact is unresolved and `download-ffprobe` when only ffprobe is, and `details.downloads` carries the plan rows, so the caller can show the URL, the byte count and the digest before it asks the user. The section 5 example message names the next step: "Downloading an ffmpeg build needs explicit consent. Call media_setup_ffmpeg again to accept it." When every requested component resolved in step 1, the call is a plain success and no consent question arises, and a `consent: true` call with nothing missing downloads nothing and reports the same paths.
4. **Download.** With `consent: true`, each planned artifact is fetched from its pinned URL with redirects disabled, so a redirect response is `DOWNLOAD_FAILED` before any body is read and no host other than the pinned one is ever contacted. The body is streamed to a temp file beside its destination inside the server data folder and hashed while it arrives. A body whose SHA-256 differs from the pinned digest ends the call with `CHECKSUM_MISMATCH` (`expected`, `actual`, `url`) and the archive is discarded before any unpacking. A matching body is unpacked with the archiver its pinned row names, the binary is moved to `destination` and made executable where the platform has the concept, and the temp file is removed. Nothing lands at `destination` before the hash matches. A connection error, any HTTP status other than 200, a failed write or an archive that does not unpack is `DOWNLOAD_FAILED` with `url`, `httpStatus` and `reason`.

**Output**: none of the media output classes apply. Setup takes no path parameter, needs no allowed roots, and creates no numbered folder (section 4). Its only writes are the archive temp file and the unpacked binary inside the server data folder, which section 4 counts as a package asset and exempts from the root check. The structured result lists each component with `path` and `source`, where `source` names the lookup step that found it exactly as section 6 names it, plus `bytes` and `sha256` for a component that was installed by this call. From then on the resolver's bundled step returns the installed binary to every tool in this contract.

#### Shared error codes

Besides the path and config checks that section 4 defines, whose codes come from the section 5 list, these four tools return the codes below. Section 5 owns the full list, the `{ code, message, details }` body and the result shape, and the three download codes belong to `media_setup_ffmpeg` alone.

| Code | Tools | When |
|---|---|---|
| `INPUT_NOT_FOUND` | `media_probe`, `media_repair`, `video_hls_ladder` | The resolved input path is not a readable file (section 4.2) |
| `UNSUPPORTED_FORMAT` | `media_repair`, `video_hls_ladder` | The diagnosis or probe finds no stream the tool can use: no video and no audio stream for repair, no video stream for the ladder. `detected` and `accepted` name the mismatch (section 5) |
| `FFPROBE_NOT_FOUND` | `media_probe`, `media_repair`, `video_hls_ladder` | The section 6 lookup finds no ffprobe. The message names `media_setup_ffmpeg` |
| `FFMPEG_NOT_FOUND` | `media_repair`, `video_hls_ladder` | The same three lookup steps find no ffmpeg |
| `CAPABILITY_MISSING` | `media_repair`, `video_hls_ladder` | The resolved build lacks an encoder the next pass needs: `libx264` or `aac` for a repair re-encode, `libx264` for the ladder (section 8) |
| `PROCESS_FAILED` | all three run tools | A run exited non-zero and no more specific code fits, including an unreadable file at probe and a repair whose every pass failed |
| `PROCESS_TIMEOUT` | all three run tools | A run passed the section 8 timeout and was killed |
| `OUTPUT_EXISTS` | `media_repair`, `video_hls_ladder` | A planned output file exists at the pre-write check or appears before the `-n` run (section 5, `stage`) |
| `INVALID_INPUT` | `video_hls_ladder`, `media_setup_ffmpeg` | Two entries of `rungs` repeat, or the host platform has no pinned build (`reason: "unsupported-platform"`) |
| `CONSENT_REQUIRED` | `media_setup_ffmpeg` | A requested component is unresolved and the call did not accept the download |
| `DOWNLOAD_FAILED` | `media_setup_ffmpeg` | The consented fetch failed: a redirect, any status other than 200, a connection error, a failed write, or an archive that will not unpack |
| `CHECKSUM_MISMATCH` | `media_setup_ffmpeg` | The downloaded body failed the pinned SHA-256 check and was discarded before unpacking |
| `INTERNAL` | all four | An unmapped error reached the handler boundary |

#### Source defects and gaps closed by these schemas

- **G.3, arbitrary paths and overwrite**: `media_repair` and `video_hls_ladder` take `inputPath` and `outputName` only, so a caller can neither name an output file nor point one at an input, and every run carries `-n` (sections 1.4 and 4.3). The sources restrict nothing and overwrite on request (`../context/source-inventory.md:240`).
- **G.4, raw caller strings into filter graphs**: the ladder recipe is a static command (`skill/assets/hls-video-conversion.md:94-118`) and the only values this contract lets a caller change (`rungs`, `crf`, `segmentDuration`) are a closed enum and two bounded integers, so the filter graph and the stream map are built from server-side values alone. Repair passes are fixed commands picked by one enum.
- **G.11, unbounded work**: every subprocess in these four tools goes through the section 8 runner, with its timeout, stderr cap and temp cleanup. The sources set no timeout and buffer stderr fully (`../context/source-inventory.md:255`).
- **Repair recipes the named sources do not carry**: `../context/source-inventory.md:273` records that gap. This section fixes both passes on the commands that do exist, the repair flow's copy (`skill/README.md:208`), the plain re-encode (`skill/references/mcp-video-audio.md:97`) and the audio re-encode (`:156`), with the copy-first order the ported tools already use (`vam/server.py:55-66`, `:360-362`). `006-probe-repair-hls` implements exactly these command shapes.
- **Fabricated metadata**: the source probe helper answered `44100`, `2` and `stereo` for a file with no audio and `0` for a missing width or height (`vam/server.py:1248-1253`). `media_probe` omits what the file does not carry and keeps only the documented fallback of 30 frames per second (`:1260-1262`), so a missing field reads as absent instead of guessed.
- **The manual install gap**: the HLS asset and the skill tell the user to install ffmpeg by hand (`skill/assets/hls-video-conversion.md:33-36`, `:239`, `skill/SKILL.md:266`). `media_setup_ffmpeg` replaces that with a pinned, consent-gated download into the server data folder that the resolver's bundled step then reads.
- **Descriptions written fresh**: all four tools are new, so their descriptions are authored here rather than ported from source docstrings, one of which still points at a document that does not exist (`vam/server.py:1350-1351`, part of G.13 at `../context/source-inventory.md:257`).
