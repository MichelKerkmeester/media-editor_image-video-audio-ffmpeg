## 6. ffmpeg and ffprobe resolution

Most of the 39 tools run a child process, and every one of those processes needs a binary that neither source ever looks for. Video-audio spawns the bare names `ffmpeg` and `ffprobe` and assumes both are on `PATH` (`vam/server.py:892,1429`), its suite states the same requirement (`vam/tests/test_video_functions.py:58,97`), and its probe helper goes through `ffmpeg.probe` (`vam/server.py:1237-1240`, `../context/source-inventory.md:226`). On a machine without ffmpeg that assumption yields either an unattributed failure or an error string that names nothing useful (inventory G.7 and G.10, `../context/source-inventory.md:251,254`). The skill behaves better but still ends the work: it treats a failed `ffmpeg -version` as a full stop with install guidance (`skill/SKILL.md:261`, `skill/SKILL.md:266`). This section keeps that honesty and removes the dead end. It fixes one ordered lookup, run separately for each binary, plus every variable and argument that feeds it. AC-005 is what this section is checked against.

Boundaries: section 5 owns `FFMPEG_NOT_FOUND` and `FFPROBE_NOT_FOUND`, the codes this lookup raises. Section 4 owns the allowed roots, the output folder and the rule that this table carries `MEDIA_EDITOR_ALLOWED_DIRS`, `MEDIA_EDITOR_OUTPUT_DIR`, `--allowed-dir` and `--output-dir` (the entries in 6.8). Section 8 owns the capability checks and the per-run timeout that run against the resolved paths. Section 3 owns the `media_setup_ffmpeg` schema, and the phase spec leaves the manifest and plugin fields that pass these values to phases 7 and 8, which reuse the names unchanged (`spec.md:96`, `plan.md:89`).

### 6.1 The lookup order

ffmpeg and ffprobe are resolved independently. They have separate variables, separate steps and separate cache entries, and resolving one never resolves the other. A tool asks for the binary it needs and no more, so the eight `image_*` tools, which run through sharp, need neither binary and keep working on a machine with no ffmpeg at all.

Both binaries follow the same four steps, in this order:

| Step | ffmpeg candidate | ffprobe candidate | Accepted when | Recorded source |
|------|------------------|-------------------|---------------|-----------------|
| 1 | `MEDIA_EDITOR_FFMPEG_PATH` | `MEDIA_EDITOR_FFPROBE_PATH` | the value is an absolute path to an existing regular file, the file is executable and it answers `-version` | `env-override` |
| 2 | the path the `ffmpeg-static` package exports | the path the `ffprobe-static` package exports | the export is a non-empty string and names an existing executable file that answers `-version` | `bundled` |
| 3 | `ffmpeg` in each `PATH` entry, in order (`ffmpeg.exe` on Windows) | `ffprobe` in each `PATH` entry, in order (`ffprobe.exe` on Windows) | the first entry whose file exists, is executable and answers `-version` | `system-path` |
| 4 | `<data dir>/bin/ffmpeg` (`ffmpeg.exe` on Windows) | `<data dir>/bin/ffprobe` (`ffprobe.exe` on Windows) | the file exists, is executable, answers `-version` and matches the SHA-256 in the install record beside it | `installed` |

Steps 2 to 4 fall through to the next step when their candidate is unusable, because a missing candidate is the normal case the order is built for. Step 1 does not fall through, for the reason 6.2 gives. The two binaries need not come from the same step: a system ffmpeg beside an installed ffprobe is a valid pair, and each source is recorded on its own.

`-version` is the acceptance test at every step, run once per candidate, because a file that exists is not yet a working binary. A binary that cannot print its version within ten seconds is treated as unusable at steps 2 to 4 and as a broken override at step 1. The first line of that output is the version string, the form the skill's own check reads (`skill/SKILL.md:262`, `skill/assets/hls-video-conversion.md:192`).

### 6.2 Step 1: the override variables

`MEDIA_EDITOR_FFMPEG_PATH` and `MEDIA_EDITOR_FFPROBE_PATH` name one binary file each. They exist so a user with a fuller build, one that carries libass or libx265 where the bundled build does not (inventory F.3 and F.5, `../context/source-inventory.md:217,221`), can point the server at it without touching its code.

The value must be absolute, must name an existing regular file, must be executable, and must answer `-version`. A value that fails any of those produces a hard failure naming the variable, and the lookup stops there:

```text
FFMPEG_NOT_FOUND   (FFPROBE_NOT_FOUND for MEDIA_EDITOR_FFPROBE_PATH)
details: { "lookedIn": ["env-override"], "envVar": "MEDIA_EDITOR_FFMPEG_PATH",
           "nextStep": "fix or unset MEDIA_EDITOR_FFMPEG_PATH" }
message: "MEDIA_EDITOR_FFMPEG_PATH names /opt/tools/ffmpeg, which does not exist."
```

The lookup does not continue to steps 2 to 4. A user who set the variable stated which binary to run, and running a different one instead hides the mistake until a run fails much later, with a capability error or wrong output that no longer points at the cause. Contrast this with the `MEDIA_EDITOR_TIMEOUT_SECONDS` and `MEDIA_EDITOR_LOG_LEVEL` rules in 6.8: those two have a safe default and a warn line, while a binary override has no safe substitute.

An empty or whitespace-only value is not a broken override. It counts as unset, because a manifest that leaves an unfilled field behind passes an empty string, and the lookup then starts at step 2.

### 6.3 Step 2: the bundled binaries

`ffmpeg-static` and `ffprobe-static` each export the path of a binary that ships with the package, so a packed bundle carries its own pair. This is the step that removes the `PATH` assumption for the common case, and it also removes the install instructions the skill has to hand out today (`skill/SKILL.md:266`).

The exported value is checked before it is used, because the package can return a null or empty value on a platform it has no build for, and because an install with scripts disabled has no binary behind the exported path. Either case falls through to step 3, which is the case the whole order is built for. Three further rules apply:

- The resolver never downloads anything and never runs a package manager. Installing a build is `media_setup_ffmpeg`'s job, after consent (6.5).
- The bundled pair is read only. Nothing is written beside it, because the package folder can be read only after installation.
- The pack step must keep the pair for the target platform inside the bundle. A bundle that pruned its own binaries lands on step 3 for every user, and the size checks in phase 7 are the place that fact is caught.

Whether a given bundled build carries libass, libx265 or libvpx is not evidenced by the sources (inventory F.3 and F.5, `../context/source-inventory.md:217,221`). That is a capability question, not a resolution question, and section 8 owns it. The licence obligations of shipping an ffmpeg build are section 10's.

### 6.4 Step 3: the system PATH

The lookup splits `PATH` on the platform's path delimiter and checks the entries in order, taking the first file that exists and is executable: `ffmpeg` or `ffprobe` on macOS and Linux, `ffmpeg.exe` or `ffprobe.exe` on Windows. This step is where a user's own install is found, which is the situation both sources and the whole skill assume for every run.

Two rules keep the step honest:

- The entries are read and checked directly. The server never runs `which`, `where`, or any other lookup program, because it spawns nothing through a shell (inventory G.1, `../context/source-inventory.md:238`) and a shell-built answer is not checkable.
- An empty entry is skipped, never treated as the process working directory. On macOS and Linux an empty `PATH` entry means the current directory, and that directory belongs to the host application (inventory G.6, `../context/source-inventory.md:250`).

### 6.5 Step 4: the data folder that `media_setup_ffmpeg` fills

`media_setup_ffmpeg` is the consented route to a working pair. Without consent it reports what it would fetch (URL, size, SHA-256, destination) and writes nothing. With `consent: true` (section 3) it downloads a pinned build for the platform, checks the pinned SHA-256, and unpacks it into the server's own data folder:

```text
<data dir>/bin/ffmpeg        ffmpeg.exe on Windows
<data dir>/bin/ffprobe       ffprobe.exe on Windows
<data dir>/bin/install.json  file names, SHA-256 values, platform, pinned versions
```

Step 4 accepts only what that record vouches for. The file must exist, be executable, answer `-version`, and its current SHA-256 must equal the value recorded beside it, so a truncated download or a file replaced after installation is never run. The data folder is server owned (section 4 classes it as a package asset) and is the only location outside the output folder that the server writes to. The resolver itself never writes there, and the folder is never added to `PATH`: the absolute path is passed to `spawn` as an argument, so no other program on the machine can pick the binary up.

The tool's own behaviour, the consent check, the pinned URL table and the download codes, belongs to section 3 and to phase `008-claude-code-plugin`. This section owns only what the resolver reads.

### 6.6 When every step fails

When no candidate is usable at any of the four steps, the tool that needed the binary returns `FFMPEG_NOT_FOUND` (`FFPROBE_NOT_FOUND` for the probe binary) as a tool result with `isError: true`, in the shape section 5 fixes:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "FFMPEG_NOT_FOUND: ffmpeg was not found. Run media_setup_ffmpeg to install a bundled build."
    }
  ],
  "structuredContent": {
    "code": "FFMPEG_NOT_FOUND",
    "message": "ffmpeg was not found. Run media_setup_ffmpeg to install a bundled build.",
    "details": {
      "lookedIn": [
        "env-override: unset",
        "bundled: /Applications/Media Editor.app/Contents/Resources/app/node_modules/ffmpeg-static/ffmpeg absent",
        "system-path: /usr/local/bin, /usr/bin, /bin absent",
        "installed: /Users/me/Library/Application Support/media-editor/bin/ffmpeg absent"
      ],
      "envVar": "MEDIA_EDITOR_FFMPEG_PATH",
      "nextStep": "media_setup_ffmpeg"
    }
  }
}
```

`details.lookedIn` carries one entry per step that was tried, naming the concrete path or directories that step checked, so the caller can see which of the four failed and why. The run stops before a command line is built, before an output folder is created and before a temp file is written, so a missing binary leaves nothing behind.

`media_setup_ffmpeg` is reachable exactly when this result arrives, because it needs no resolved binary of its own. `media_health` is the other exception. It reports a missing binary as `found: false` with the same `lookedIn` list instead of failing, because a health report that cannot answer is not a health report (section 2).

### 6.7 One lookup per process

A resolution is computed on first need and kept for the life of the process. The cache holds, per binary, the absolute path, the step that supplied it and the version string from `-version`. It is keyed by binary, so one binary can come from an override while the other comes from the system `PATH`. Once a binary has resolved, no step of the order runs again for that binary, and the `-version` call happens once rather than once per tool call.

Two deliberate exceptions:

- A failed lookup is not cached. After all four steps fail, `media_setup_ffmpeg` can install a pair inside the same process, and the next tool call then resolves at step 4 instead of repeating the failure until the process restarts.
- A cached path that fails to spawn, because the file was deleted or replaced after the lookup, drops its cache entry and returns the not-found result again. The caller is told the binary is gone, and the next call re-runs the order from step 1.

`media_health` takes no path parameter, reads no media file, and is the surface that makes the cache visible. It forces both resolutions and reports each one on its own:

| Field | Meaning |
|-------|---------|
| `found` | whether the binary resolved at all |
| `path` | the absolute path that will be passed to `spawn` |
| `source` | the step that supplied it: `env-override`, `bundled`, `system-path` or `installed` |
| `version` | the first line of its `-version` output, for example the ffmpeg version and build line |
| `lookedIn` | present only when `found` is false, listing the four steps and the paths they checked |

The same response carries the settings that decide whether a call can run: the allowed roots that took effect (section 4.1), the effective output folder, the effective timeout and log level from 6.8, and the encoder and filter capabilities that section 8 gates on.

### 6.8 The variables and arguments the server reads

The server reads the settings below and nothing else. The names are fixed here, and the desktop manifest and the plugin config reuse them unchanged in phases 7 and 8 (`spec.md:96`, `plan.md:89`). Manifests may render the path settings as their own argument form, but they pass the same values.

| Name | Meaning | Default | Set by |
|------|---------|---------|--------|
| `MEDIA_EDITOR_ALLOWED_DIRS` | The read roots, one list separated by the platform path delimiter, `:` on macOS and Linux and `;` on Windows. A path that contains the delimiter can only be given as `--allowed-dir` | none, so a tool with a path parameter fails with `CONFIG_MISSING` until a root exists (section 4.1) | `.mcpb` user config, plugin config |
| `MEDIA_EDITOR_OUTPUT_DIR` | The folder that receives the numbered output folders | the first allowed root (section 4.1) | `.mcpb` user config, plugin config |
| `--allowed-dir <path>` | One read root per occurrence, repeatable, ordered before the variable's entries | none | `.mcpb` user config, plugin config |
| `--output-dir <path>` | The output folder, last occurrence wins | none | `.mcpb` user config, plugin config |
| `MEDIA_EDITOR_FFMPEG_PATH` | Absolute path of the ffmpeg to run, in place of steps 2 to 4 (6.2) | unset | user |
| `MEDIA_EDITOR_FFPROBE_PATH` | The same for ffprobe | unset | user |
| `MEDIA_EDITOR_TIMEOUT_SECONDS` | The per-run limit for one ffmpeg or ffprobe process, in seconds, a positive integer up to 86400 | 1800 | user |
| `MEDIA_EDITOR_DATA_DIR` | The server's data folder, which holds what `media_setup_ffmpeg` installs | `~/Library/Application Support/media-editor` on macOS, `%APPDATA%\media-editor` on Windows, `$XDG_DATA_HOME/media-editor` or `~/.local/share/media-editor` on Linux | `.mcpb` user config, plugin config, user |
| `MEDIA_EDITOR_LOG_LEVEL` | How much the server writes to stderr: `error`, `warn`, `info` or `debug` | `info` | user |
| `PATH` | Read for step 3 only, never modified by the server | the value the host process supplies | user, read only for the server |

Rules that hold for the whole list:

- A path value must be absolute. The process working directory belongs to the host application, so a relative value is never resolved against it (inventory G.6, `../context/source-inventory.md:250`).
- The two binary overrides are the only settings where a bad value is an error rather than a fallback (6.2). Everywhere else a value that cannot be used is ignored with one warn line naming the variable, the documented default stays in force, and `media_health` reports the value that took effect. A rejected timeout or log level never stops a tool from running.
- The four path entries are parsed and merged exactly as section 4.1 states, including the argument order, the trimming and the dropping of unusable roots.
- The server reads `MEDIA_EDITOR_*` names from this list alone. At startup it names any other `MEDIA_EDITOR_*` variable it can see in one warn line, because a typo such as `MEDIA_EDITOR_FFMPEG` would otherwise stay invisible until a run failed for a reason that no longer points at the cause.
- An argument the server does not know is ignored with one warn line naming it, so a stale manifest shows up in the host log instead of stopping the server. `--name=value` and `--name value` are both accepted.
- The warn lines this section names appear at the default level, so a dropped entry or a broken override is never silent.
- Log lines go to stderr. stdout stays free for the JSON-RPC stream, and no tool ever returns a log line inside a result.

### 6.9 Hostile and wrong values

| Name | Value | Result |
|------|-------|--------|
| `MEDIA_EDITOR_FFMPEG_PATH` | `/opt/tools/ffmpeg` that does not exist, a directory, a file with no execute bit, a relative `ffmpeg`, or a file that cannot answer `-version` | `FFMPEG_NOT_FOUND` naming the variable, no fallthrough to steps 2 to 4 |
| `MEDIA_EDITOR_FFMPEG_PATH` | an empty string or spaces only | Treated as unset, the lookup starts at step 2 |
| `MEDIA_EDITOR_FFPROBE_PATH` | any of the values above | `FFPROBE_NOT_FOUND` on the same rules |
| `MEDIA_EDITOR_ALLOWED_DIRS` | `/does/not/exist`, a path that resolves to a file, or a relative entry | The entry is dropped with one warn line, no fallback to the working directory or the home folder (section 4.1) |
| `MEDIA_EDITOR_OUTPUT_DIR` | a read-only volume, or a path that cannot be created | Building the folder fails with `IO_ERROR` before any ffmpeg run (section 4.4) |
| `MEDIA_EDITOR_TIMEOUT_SECONDS` | `0`, `-5`, `abc`, `1800.5`, `1e9` | The default 1800 applies, one warn line, and `media_health` reports the effective value |
| `MEDIA_EDITOR_DATA_DIR` | a relative path, or a path that is an existing file | Treated as unset, the platform default applies, and `media_health` reports the folder that was used |
| `MEDIA_EDITOR_LOG_LEVEL` | `verbose`, `DEBUG`, an empty string | `info` applies, one warn line |
| `PATH` | an empty entry, or an entry holding neither file name | Skipped, the working directory is never searched |
| an unknown argument | `--allowed-dirs /tmp` | Ignored with one warn line naming it, the real setting keeps its own value or its default |

### 6.10 Defects this section closes

- **G.7 platform assumptions**: the bare `ffmpeg` and `ffprobe` names the sources spawn (`vam/server.py:892,1429`, `vam/tests/test_video_functions.py:58,97`) become the third of four steps, behind an explicit override and a bundled binary, and the Windows file names are decided here instead of left to the host `PATH`.
- **G.10 misleading error taxonomy**: a missing binary is one code that lists the steps that were tried and names `media_setup_ffmpeg` as the next step, rather than a `FileNotFoundError` branch the sources rarely reach (`../context/source-inventory.md:254`).
- **G.11 unbounded work**: the `-version` probe and every run are bounded by `MEDIA_EDITOR_TIMEOUT_SECONDS`, whose default of 1800 seconds is stated in 6.8. Section 8 owns the enforcement.
