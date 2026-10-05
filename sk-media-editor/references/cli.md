---
title: "Media Editor - Reference - Command Line"
description: "How to run the Media Editor tools through the media-editor command: the health check, tool discovery, JSON arguments, exit codes, the one-folder batch pattern, previews, ffmpeg setup with consent, folder flags and the fallback when the command is missing."
contextType: implementation
importance_tier: important
trigger_phrases:
  - "media-editor command"
  - "command not found"
  - "run a tool from the terminal"
  - "batch output folder"
  - "args file"
  - "exit code"
version: 1.0.0.0
---

# Media Editor - Reference - Command Line

How to reach the Media Editor tools through the `media-editor` command in the Bash tool, from the first health check to the last batch call.

**Loading Condition:** ON-DEMAND
**Purpose:** Gives the command to run for every step of a media edit: check, discover, run, batch, preview, set up ffmpeg and recover from a missing command
**Scope:** The `media-editor` command, its subcommands, flags, exit codes, the one-folder batch pattern and the fallback when the command is missing
**Source:** `runtime/README.md` section 5 and `media-editor --help`

---

## 1. OVERVIEW

### Purpose

The Media Editor tools run on the user's own computer. A terminal agent reaches them through the `media-editor` command in the Bash tool, one process per call, and every call prints one JSON object. This reference is the command line manual for that route.

### When to use

- The skill needs a tool and must know how to run it
- A call fails and the exit code or the `code` field must be read
- A batch of files from one request must land in one folder
- The command itself is missing and the fallback must be chosen

---

## 2. CHECK THE COMMAND

Run `media-editor health` once before the first operation of a session.

```bash
media-editor health
```

It runs the `media_health` tool and reports which ffmpeg and ffprobe were found, their encoders and filters and the folders in effect.

When the shell answers `command not found`, the command is missing. Go to Section 9.

---

## 3. RUN A TOOL

1. `media-editor list` prints every tool with its name, title and description
2. `media-editor describe <tool>` prints that tool's JSON Schema, including `fileName`, `subfolder` and `targetFolder`
3. `media-editor <tool>` runs the tool. Arguments come from exactly one of `--args '<json>'`, `--args-file <path>` or stdin

```bash
media-editor list
media-editor describe image_convert
media-editor image_convert --args '{"inputPath":"/abs/path/shot.png","outputName":"web","format":"webp","maxBytes":100000}'
```

Paths inside the JSON must be absolute. A relative `inputPath` such as `a.png` is refused with `INVALID_INPUT`, `details.reason` `relative-path` and exit 1, even when the file sits in the working folder. Build the absolute path from the working folder first.

For any path with spaces or quotes, never build the JSON by joining shell strings. Write the JSON with the Write tool to a file under the session's scratch folder, with a name of its own for each call, and pass `--args-file`, or pipe a quoted heredoc (`<<'JSON'`) on stdin.

```bash
media-editor image_convert --args-file /tmp/session/args.json

media-editor image_convert <<'JSON'
{"inputPath":"/Users/you/project/media files/import/shot-a.png","outputName":"web","fileName":"hero-banner","format":"webp"}
JSON
```

Read `outputs[].path` from the result and report that path. It is the saved file.

---

## 4. OUTPUT AND EXIT CODES

One JSON object goes to stdout, the tool's structured result, also for a failed call. Logs go to stderr.

| Exit code | Meaning | What to do |
| --- | --- | --- |
| 0 | The tool ran | Read `outputs[].path` and report it |
| 1 | The tool returned an error | Read `code` in the JSON, such as `PATH_NOT_ALLOWED` or `CONSENT_REQUIRED`. Fix the named cause and retry |
| 2 | Usage or argument error: unknown tool, bad JSON, two argument sources, a schema failure, `code` `INVALID_INPUT` | Correct the call and retry |
| 3 | The process could not start | Report it and check the install |
| 130, 143 | Stopped by SIGINT or SIGTERM | Running ffmpeg children and the call's new output folders are removed first, so there is nothing to clean up |

---

## 5. ONE REQUEST, ONE PLACE

One request with several inputs writes into one place the user chose in the one question before the first write.

- For one numbered folder, the first writing call passes `subfolder: true` and an `outputName` for the request. The tool creates `NNN - <outputName>/` and returns the path
- Every later call of the same request passes that folder name, such as `001 - webp-under-100kb`, as `targetFolder`
- Every writing call passes `outputName`, the `targetFolder` calls too, because the tool requires it
- Each call passes its own confirmed `fileName`
- Never combine `targetFolder` with `subfolder: false`
- For the export root, every call passes `subfolder: false`

Worked example: four PNGs converted to WebP under 100 KB each.

### Call 1

Creates the folder and returns its path.

```bash
media-editor image_convert <<'JSON'
{"inputPath":"/Users/you/project/media files/import/shot-a.png","outputName":"webp under 100kb","fileName":"hero-banner","format":"webp","maxBytes":100000,"subfolder":true}
JSON
```

The result path sits inside `media files/export/001 - webp-under-100kb/`.

### Call 2

Passes that folder as `targetFolder` with its own `fileName`. `outputName` stays required on every call, and with `targetFolder` it names nothing new.

```bash
media-editor image_convert <<'JSON'
{"inputPath":"/Users/you/project/media files/import/shot-b.png","outputName":"webp under 100kb","targetFolder":"001 - webp-under-100kb","fileName":"team-photo","format":"webp","maxBytes":100000}
JSON
```

### Call 3

```bash
media-editor image_convert <<'JSON'
{"inputPath":"/Users/you/project/media files/import/shot-c.png","outputName":"webp under 100kb","targetFolder":"001 - webp-under-100kb","fileName":"product-shot","format":"webp","maxBytes":100000}
JSON
```

### Call 4

```bash
media-editor image_convert <<'JSON'
{"inputPath":"/Users/you/project/media files/import/shot-d.png","outputName":"webp under 100kb","targetFolder":"001 - webp-under-100kb","fileName":"office-view","format":"webp","maxBytes":100000}
JSON
```

All four files land in that one folder. For the export root instead, every call drops `targetFolder` and passes `"subfolder":false`.

---

## 6. PREVIEWS FOR NAMING

`image_probe` or `media_probe` with `preview: true` writes a small JPEG under the data folder's `previews/` and returns its path as `previewPath`.

```bash
media-editor image_probe --args '{"inputPath":"/abs/path/shot.png","preview":true}'
```

Open that file with the Read tool to look at the picture, then propose names of two to five lowercase words joined by hyphens for the outputs.

---

## 7. FFMPEG SETUP WITH CONSENT

`media-editor health` reports which ffmpeg and ffprobe it found, their encoders and filters and the folders in effect. When its `nextStep` field names `media_setup_ffmpeg`, that tool is the next step.

Run it without consent first, in the same turn, so the plan is part of the one question.

```bash
media-editor media_setup_ffmpeg --args '{}'
```

It exits 1 with `code` `CONSENT_REQUIRED` and the planned download: URL, size, SHA-256 and destination. Show that plan to the user, every field as the tool returned it, the full SHA-256 included and never shortened, and ask. Only after the user agrees, run it again with consent.

```bash
media-editor media_setup_ffmpeg --args '{"consent":true}'
```

---

## 8. FOLDERS AND FLAGS

With no flag and no `MEDIA_EDITOR_*` variable, the command works from the project folder: the working folder, or the folder that holds `media files` when the command starts inside it, such as in `media files/import`. The allowed folder is the project folder, output goes to `<project folder>/media files/export` (created on first use) and the data folder is the platform's application data folder.

| Flag | Effect |
| --- | --- |
| `--allowed-dir <path>` | Adds an allowed folder, repeatable |
| `--output-dir <path>` | Sets where results land |
| `--data-dir <path>` | Sets the data folder |
| `--timeout <seconds>` | Sets the process timeout |
| `--json` | The default output mode |

Any other `--` token, including a bare `--`, is a usage error. `--help` prints the usage line. A flag beats the environment, the environment beats the default.

`PATH_NOT_ALLOWED` means the file sits outside every allowed folder. `CONFIG_MISSING` means no usable folder configuration was found. Start the command in the project folder, the one that holds `media files`, or pass `--allowed-dir` with the folder that holds the file, then retry.

---

## 9. WHEN THE COMMAND IS MISSING

`command not found` means the command is missing.

- When `ffmpeg -version` answers, fall back to hand-written ffmpeg
- Otherwise, give advice: the exact command, where the result would land and what to check, and state plainly that nothing ran
- Then offer the setup in `references/setup.md` once
