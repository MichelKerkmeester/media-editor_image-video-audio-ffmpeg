## 7. Result format

Every tool returns one of two shapes: the success shape this section owns, and the section 5 failure body when `isError` is true. `002-server-foundation` builds the single result builder that produces both, and phases `003-image-tools` to `008-claude-code-plugin` call it, so no tool formats a result of its own. AC-006 is the row this section is checked against: a successful run carries a text summary and structured outputs with `path` and `bytes` per output.

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
