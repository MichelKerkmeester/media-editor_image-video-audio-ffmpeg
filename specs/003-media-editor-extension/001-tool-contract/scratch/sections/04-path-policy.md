## 4. Path policy

This section fixes where the server may read and write. It answers the path defects in inventory section G (listed in 4.5): no tool restricts a path today (G.3), the two sources disagree on overwrite behavior (G.5), the sources assume a working directory (G.6) and the platform's path quirks (G.7), and Imagician creates directory trees from caller strings (G.12).

The guard defined here is built in `002-server-foundation`, and every later phase uses it. Filter strings that carry a path are escaped by the helper in section 8. Binary paths come from the resolver in section 6. Section 6 also holds the full variable and argument table, and it must carry the four path entries defined here: `MEDIA_EDITOR_ALLOWED_DIRS`, `MEDIA_EDITOR_OUTPUT_DIR`, `--allowed-dir` and `--output-dir`.

Source shorthands: `imagician/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/`, `vam/` is `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/`, `skill/` is `AI Systems/Media Editor/sk-media-editor/`.

The server touches four path classes, and each class has one rule:

| Class | Location | Rule |
|-------|----------|------|
| Inputs | Every path the caller names: media, subtitle files, overlay images, font files | Must resolve by real path inside an allowed root |
| Outputs | `<output folder>/NNN - <description>/` | Written only there, never onto an input |
| Temp | One private folder per run under the OS temp directory | Created and removed by the server, never a caller path |
| Package assets | The bundled font, the resolved binaries, the folder `media_setup_ffmpeg` writes into | Server-owned, exempt from the root check |

### 4.1 Allowed roots and the output folder

Allowed roots come from two sources and merge into one set:

- `MEDIA_EDITOR_ALLOWED_DIRS`, one string holding a list. Entries are separated by the platform path delimiter, `:` on macOS and Linux and `;` on Windows, and each entry is trimmed of surrounding whitespace. An empty entry is ignored.
- `--allowed-dir`, repeated once per root. A path that contains the delimiter character (a colon on macOS or Linux) can only be given this way.

Order is `--allowed-dir` entries first, in the order given, then the variable entries, and duplicates collapse after canonicalization. Every root must be absolute. Each root is canonicalized at startup with the native real path call, so a root that is itself a symlink is fine. An entry that is not absolute, does not resolve, or resolves to a file is dropped, and `media_health` reports the roots that took effect so a dropped entry is visible instead of silent.

When no root remains, every tool with a path parameter fails with `CONFIG_MISSING`, naming `MEDIA_EDITOR_ALLOWED_DIRS` and `--allowed-dir`. There is no fallback to the process working directory, the user's home folder or the package folder. Tools without a path parameter, `media_health` and `media_setup_ffmpeg`, keep working.

The output folder is resolved from the first of these that is set:

1. `--output-dir`, last occurrence wins if the argument repeats.
2. `MEDIA_EDITOR_OUTPUT_DIR`.
3. The first allowed root.

It must be absolute and is canonicalized before the first write. The default of the first root keeps the whole loop inside the roots: an output from one run can be the input of the next. An output folder outside every root is legal (it is a write location, not a read location), with one consequence: its files can only be used as inputs again when the operator adds that folder as a root too. The output folder is created on demand with `recursive: true`.

### 4.2 Input resolution by real path

Every caller path goes through the same five steps before use, font files and subtitle files included:

1. The string must round-trip through UTF-8 (`Buffer.from(s, "utf8").toString("utf8")` equals the original), contain no NUL, and be absolute. A failure is `INVALID_ARGUMENT`. A replacement character is never substituted for a path byte, because that would silently point at a different file. Relative paths are rejected for the same reason: the server's working directory belongs to the host application, not to the user's project (inventory G.6).
2. The path is canonicalized with the native real path call, which resolves every symlink in every segment and returns the on-disk case. This also proves that the input exists. A canonicalization failure is `INPUT_NOT_FOUND`, with the failing path in `details`.
3. The real path is compared with each canonical root segment by segment. It is inside when it equals the root or begins with the root's full sequence of segments. A shared string prefix is not enough: root `/media` does not contain `/media-private`, and root `C:\media` does not contain `C:\media-private`.
4. Comparison folds case on Windows and macOS, where the file system folds it, and is byte-exact on Linux, where the file system is. A case variant of a root can therefore never grant access on a case-sensitive volume.
5. A containment failure is `PATH_OUTSIDE_ALLOWED_ROOTS`, with the roots listed in `details`, and the tool returns before it opens the file or starts a process.

Two consequences worth stating:

- A symlink anywhere in the path is resolved before the check, so a link that sits inside a root but points outside it fails. A root that is itself a symlink passes, because the root and the input are canonicalized the same way.
- Every entry of a list parameter (`video_concat` inputs, `video_add_b_roll` clip paths) is checked with the same steps. One entry outside the roots rejects the whole call before the output folder exists, so a run never performs half of its reads.

### 4.3 Output folder, numbering and file names

A call that writes creates exactly one fresh folder and puts every one of its files inside it:

```text
<output folder>/NNN - <description>/
019 - compressed-hero-video/
```

The folder per call follows the Media Editor export naming (`AI Systems/Media Editor/AGENTS.md:40`, examples at `:52-53`), and it holds outputs even when the call writes a single file, so a later multi-file operation such as `video_hls_ladder` needs no special case. Tools that only read (`image_probe`, `media_probe`, `media_health`, `media_setup_ffmpeg`) create no folder.

**Numbering.** `NNN` is zero-padded to three digits and strictly increases. The server scans the output folder for names matching `NNN - `, takes the highest number present and adds one. A gap left by a deleted folder is not filled, so a number is never reused (spec risk R-004). The folder is then created with `fs.mkdirSync(path)` without `recursive`, which fails with `EEXIST` on anything that already owns the name, a stale folder and a foreign symlink included. On `EEXIST` the run increments and retries, so two concurrent runs can never enter the same folder and the race is settled by the file system, not by a check. Any other creation failure is `IO_ERROR`. Past `999` the width grows to four digits, and numbers compare by value, never as strings. A failed run removes the folder it created, so a failed run leaves no partial output behind.

**Description and slug.** The description text comes from the tool's `description` parameter when its schema carries one, and otherwise the server derives it from the operation and the input's base name. The text is slugged before use:

- Lowercase, ASCII only. Every character outside `a-z0-9` folds to `-`, which covers separators, dots, spaces, quotes and non-ASCII letters.
- Runs of `-` collapse to one, and both ends are trimmed.
- The slug is cut to 60 characters, then a trailing `-` left by the cut is trimmed.
- An empty result becomes `output`.
- A Windows device name (`con`, `prn`, `aux`, `nul`, `com1` to `com9`, `lpt1` to `lpt9`) gets `-out` appended, because those names cannot be created on Windows.
- The slug is one path segment by construction, so the folder name cannot leave the output folder, and two calls with the same description get different numbers.

**File names.** A generated file name is the input's base name plus the operation (`hero-compressed.jpg`), cut to 120 UTF-8 bytes with the extension kept, which stays well under the 255-byte segment limit of mainstream file systems.

**Writes fail closed.** Inputs are opened read-only and are never deleted, renamed or truncated. Every ffmpeg command carries `-n`, the process-level expression of this rule (section 8 repeats it for intermediates). Image writes check the target with `lstat` before sharp writes it. Before the folder is created, and again before each file is written, the guard compares the planned output path against every input path: no output may equal an input path, and no output may sit inside an input path. A match is refused with `OUTPUT_CONFLICT` and the input stays untouched, even when a symlink was swapped in after the folder was created. The reread before each write is what gives the check teeth, because the folder creation and the writes are two separate steps.

### 4.4 Adversarial cases

| Case | Input | Expected result | Error code |
|------|-------|-----------------|------------|
| Traversal that exits the roots | `inputPath = "/roots/media/../secret.png"` | Rejected before any read or write, no output folder is created | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| Traversal that stays inside | `inputPath = "/roots/media/clips/../clip.mp4"` | Accepted, the real path is `/roots/media/clip.mp4` | none |
| Sibling folder with a shared string prefix | Root `/media`, `inputPath = "/media-private/pic.png"` | Rejected, containment compares whole segments | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| Symlink inside a root that points outside | `/roots/media/link.png` pointing at `/elsewhere/secret.png` | Rejected, the check runs on the real path | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| Root that is itself a symlink | Root `/data/media` pointing at `/mnt/big/media`, `inputPath = "/data/media/pic.png"` | Accepted, root and input are canonicalized the same way | none |
| Absolute path outside every root | `inputPath = "/other/file.png"` | Rejected | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| Relative path | `inputPath = "clip.mp4"` | Rejected, the host application's working directory is not the user's folder | `INVALID_ARGUMENT` |
| Windows drive letter inside the roots | Root `C:\media`, `inputPath = "C:\media\a.mp4"` | Accepted, the compare handles the drive letter as a segment | none |
| Windows drive letter outside the roots | Root `C:\media`, `inputPath = "D:\clips\a.mp4"` | Rejected | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| UNC path | `inputPath = "\\server\share\a.mp4"` | Rejected unless a root names the same share after canonicalization | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| Case-insensitive volume | Root `C:\Media`, `inputPath = "c:\media\pic.png"` on Windows or macOS | Accepted, comparison folds case on those platforms | none |
| Description with path separators | `description = "../../Pictures/evil"` | Folded to `pictures-evil`, created as `017 - pictures-evil` directly under the output folder | none |
| Output equal to or inside an input path | A planned target that resolves onto an input file, or a fresh folder that resolves inside an input directory | Write refused before the file is opened, the input stays byte-identical | `OUTPUT_CONFLICT` |
| Very long description | A 300 character description | Cut to 60 characters, the run proceeds | none |
| Non-UTF-8 name, NUL, or a lone surrogate | A JSON string with a lone surrogate, a Linux file name whose bytes are not valid UTF-8, or a string containing `\u0000` | Rejected before any file system call, no replacement character is substituted | `INVALID_ARGUMENT` |
| Joined input list with one entry outside | `video_concat inputPaths = ["/roots/a.mp4", "/etc/passwd"]` | Whole call rejected before the output folder exists, no entry is read | `PATH_OUTSIDE_ALLOWED_ROOTS` |
| No root configured | Any tool with a path parameter, roots empty | Fails naming `MEDIA_EDITOR_ALLOWED_DIRS` and `--allowed-dir`, no fallback to the working directory or the home folder | `CONFIG_MISSING` |
| Output folder not configured | Roots `/roots/media` | Output folder is `/roots/media`, the numbered folder is created on demand | none |
| Output folder not writable | Output folder on a read-only volume | Fails before any ffmpeg run | `IO_ERROR` |
| Name containing a quote or a colon, file inside a root | `inputPath = "/roots/media/it's a clip.mp4"` | Path stays legal, the concat list writer and the section 8 escaping helper carry the quoting | none |

The codes above are the path set that section 5 must carry: `CONFIG_MISSING`, `PATH_OUTSIDE_ALLOWED_ROOTS`, `OUTPUT_CONFLICT`, `INVALID_ARGUMENT`, `INPUT_NOT_FOUND` and `IO_ERROR`. The first two are already fixed by this phase's spec (section 8, edge cases).

### 4.5 Defects this section closes

- **G.2 concat-list injection**: a quote in a file name stays legal (row above) and the list writer escapes it when it writes `file '...'` lines (`vam/server.py:1012`, with `-safe 0` at `:1019`).
- **G.3 arbitrary path use and output equal to input**: the guard rejects every path outside the roots, and the fresh-folder rule plus the per-write compare makes `trim_video(SAMPLE, SAMPLE, ...)` and `toFile(outputPath)` (`imagician/src/index.ts:220`) impossible to express. The sources today run only existence checks (`vam/server.py:514-517,592,689-692,841-843,1117,1353,1586`).
- **G.4 path side**: an SRT or font path is validated like any input and reaches the filter graph only through the section 8 escaping helper, where the source interpolates it raw (`vam/server.py:540`).
- **G.5 overwrite policy**: one policy replaces the mix of forced `-y` (`vam/server.py:898,1434,1547`) and unflagged runs that prompt on stdin (`:55-58`): a fresh exclusive folder, `-n` on every command, and no write onto an existing path.
- **G.6 working directory**: nothing the server writes uses the process working directory. The relative output habits in the sources are tests and assets (`imagician/test/interactive.js:8-9,27`, `skill/assets/hls-video-conversion.md:180`), and the runtime uses temp file names only (`vam/server.py:888,905,992,1278`).
- **G.7 platform paths**: drive letters and UNC names are carried as path values and resolved, never concatenated into command strings, and cleanup uses a forced recursive remove that tolerates Windows locks (`vam/server.py:970`). The broken colon case in a filter string (`vam/server.py:540,610`) is section 8's half of this defect.
- **G.12 directory trees from caller strings**: the server builds directories only under the configured output folder. The source creates whatever tree the caller's output path implies (`imagician/src/index.ts:207`), and the new contract removes caller-chosen output paths from the schemas entirely (section 3).
