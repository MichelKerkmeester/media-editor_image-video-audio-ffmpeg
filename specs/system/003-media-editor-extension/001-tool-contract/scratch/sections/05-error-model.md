## 5. Error model

A tool call ends in one of three ways:

- **Success**: a normal result with the text summary and the structured outputs of section 7. `isError` is false or absent.
- **Tool failure**: a result with `isError: true` and a structured body `{ code, message, details }` under `structuredContent`. The `content` array holds one line, `"<code>: <message>"`, so a text-only client still shows the machine code.
- **Protocol error**: a JSON-RPC error raised by the SDK before any handler runs. Only two triggers produce one, both listed below.

Three rules keep the failure channel predictable:

1. Every failure maps to exactly one code from the list below. One shared helper picks the most specific code that fits, so no tool invents a code of its own.
2. `message` is one plain sentence for the user. `details` is always a JSON object, `{}` when a code has nothing more to add, and it never carries more stderr than the capped tail (last 64 KB, see section 8).
3. A test asserts `structuredContent.code`, never a message substring. Wording stays free to change in later phases without breaking a suite.

### The fixed code list

Phase 2 writes this object as the single source for the codes, and the type is derived from it, not retyped:

```ts
export const ErrorCode = {
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

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
```

One row per code.

| Code | When | Details fields | Example message |
|------|------|----------------|-----------------|
| `INVALID_INPUT` | A value passes the zod schema but fails a handler check against the file or between fields: a crop region that does not fit the image, an end time at or before the start time, an empty clip list, a speed factor of zero, a malformed time, colour or ratio string | `parameter`, `value`, `reason` | crop region does not fit the 1920x1080 image (left + width is 2100) |
| `PATH_NOT_ALLOWED` | The real path leaves every allowed root: a direct outside path, a sibling folder that only shares a text prefix (`/media` against `/media-private`), or a symlink whose target escapes its root. The spec's edge list calls the symlink case `PATH_OUTSIDE_ALLOWED_ROOTS`. This list is the one tests assert, so that case returns `PATH_NOT_ALLOWED` with `reason: "symlink-target"` | `path`, `realPath`, `allowedRoots`, `reason` (`outside-root`, `sibling-prefix`, `symlink-target`) | Path is outside the allowed roots: /tmp/clip.mp4 |
| `CONFIG_MISSING` | The extension config has no allowed roots or no output folder, so a file tool cannot decide where a read is legal or where an output belongs. No fallback to the working directory, and nothing is written | `setting` (`allowedRoots` or `outputFolder`), `tool` | No allowed roots are configured. Set them in the extension settings. |
| `INPUT_NOT_FOUND` | An input path that passed the path policy does not exist or is not a regular file. Also a subtitle file, overlay image or font file named by a parameter | `path`, `role` (`input`, `subtitle`, `overlay-image`, `font`) | Input file not found: /media/clips/intro.mp4 |
| `OUTPUT_EXISTS` | The target output file exists when the tool checks, or appears between that check and the ffmpeg run, which `-n` refuses to overwrite. The run helper records the path's state before the spawn, so the mapping never parses ffmpeg's wording | `path`, `stage` (`pre-check` or `run`) | Output already exists and is never overwritten: /media/exports/001 - trim/clip.mp4 |
| `UNSUPPORTED_FORMAT` | The file's real content does not match what the tool accepts: a video tool given an audio-only file, an image tool given a video, or streams that cannot be mapped to the accepted set. Detection reads ffprobe streams, not the file extension | `path`, `detected`, `accepted` | video_trim needs a video stream, and this file has audio only. |
| `FFMPEG_NOT_FOUND` | No ffmpeg was found by the first three lookup steps of section 6: `MEDIA_EDITOR_FFMPEG_PATH`, the bundled `ffmpeg-static` binary, system `PATH`. The message names `media_setup_ffmpeg` as the next step | `lookedIn`, `envVar`, `nextStep` | ffmpeg was not found. Run media_setup_ffmpeg to install a bundled build. |
| `FFPROBE_NOT_FOUND` | The same three steps for `ffprobe`, for any tool that probes a file or reads stream metadata | `lookedIn`, `envVar`, `nextStep` | ffprobe was not found. Run media_setup_ffmpeg to install a bundled build. |
| `CAPABILITY_MISSING` | The resolved binary runs but lacks an encoder or filter the tool needs (`libx264`, `aac`, `libmp3lame`, `drawtext`, `subtitles`, `xfade`). The check runs before the command starts, so a missing filter never shows up as a failed encode | `binary`, `kind` (`encoder` or `filter`), `name`, `neededBy` | The resolved ffmpeg has no drawtext filter, which video_add_text_overlay needs. |
| `PROCESS_FAILED` | ffmpeg or ffprobe ran and exited non-zero, and no more specific code fits (a damaged stream, a filter graph ffmpeg rejected, a codec error). The partial output and the temp folder are removed before the result returns | `binary`, `exitCode`, `signal`, `stderrTail` | ffmpeg exited with code 1 while reading the input. |
| `PROCESS_TIMEOUT` | A run passed its timeout (1800 seconds by default, `MEDIA_EDITOR_TIMEOUT_SECONDS` changes it). The process is killed, the partial output and the temp folder are removed, then this result returns | `binary`, `timeoutSeconds`, `elapsedSeconds` | ffmpeg did not finish within 1800 seconds and was stopped. |
| `CONSENT_REQUIRED` | `media_setup_ffmpeg` was asked to fetch a build without the caller accepting the download on the call, so nothing was downloaded and no file was written | `action` (`download-ffmpeg` or `download-ffprobe`) | Downloading an ffmpeg build needs explicit consent. Call media_setup_ffmpeg again to accept it. |
| `DOWNLOAD_FAILED` | The consented download failed partway: a connection error, an HTTP status other than 200, or a body that is not the expected archive. Nothing is installed | `url`, `httpStatus`, `reason` | The ffmpeg download failed with HTTP 403. Nothing was installed. |
| `CHECKSUM_MISMATCH` | The downloaded archive failed its pinned SHA-256 check. The archive is discarded before extraction, so a half-verified binary never reaches the install folder | `expected`, `actual`, `url` | The downloaded archive failed its checksum check and was discarded. |
| `INTERNAL` | An unmapped error reached the handler boundary, which converts it instead of letting the SDK turn it into a protocol error. The last resort when no other code fits | `tool`, `cause` | Unexpected server error in media_probe. Report it if it repeats. |

### Protocol errors

| Trigger | JSON-RPC error | Who raises it |
|---------|----------------|---------------|
| A call names a tool that is not registered | `-32601`, method not found | The SDK, before dispatch. The Imagician source already sent this for its unknown-tool branch (`imagician/src/index.ts:445-449`) |
| Arguments fail the zod schema of a registered tool (wrong type, missing required field, a value outside an enum or range) | `-32602`, invalid params | The SDK, which validates each call against the tool's schema before the handler runs |

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

Every code in the list has an owner. Section 4 owns the checks behind `PATH_NOT_ALLOWED`, `CONFIG_MISSING` and `OUTPUT_EXISTS`, section 6 owns the lookup that raises `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND`, and section 8 owns the checks that raise `CAPABILITY_MISSING`, `PROCESS_FAILED` and `PROCESS_TIMEOUT`. The remaining codes sit with the tool rows that return them: `INVALID_INPUT`, `INPUT_NOT_FOUND` and `UNSUPPORTED_FORMAT` in the schema section, and `CONSENT_REQUIRED`, `DOWNLOAD_FAILED` and `CHECKSUM_MISMATCH` in `media_setup_ffmpeg`. `002-server-foundation` builds the shared error helper and the object above, phases `003-image-tools` to `006-probe-repair-hls` return these codes from their tools and assert them in tests, and `008-claude-code-plugin` ships `media_setup_ffmpeg` and its download codes.
