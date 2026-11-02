## 10. Licences and attribution

This section is the attribution plan that AC-010 checks: given this plan, when `THIRD_PARTY_NOTICES` is drafted from it, both upstream copyright lines appear verbatim and every bundled dependency is listed (`acceptance-criteria.md:66`). REQ-010 names the same file and the same two lines (`spec.md:132`). The section fixes three things: the files every distribution carries, the table of bundled dependencies whose licence texts still have to be fetched upstream, and the GPL obligations that follow from shipping an ffmpeg build inside the bundle. The parent spec hands enforcement to phase 7, which blocks packing until the notices exist (`spec.md:158`, R-002 at `spec.md:215`).

Both upstreams are MIT. Imagician declares it at `imagician/package.json:17` and carries the text at `imagician/LICENSE:1-21`, under the line `Copyright (c) 2024 Hongyi Wang` at `imagician/LICENSE:3`. Video-audio carries the same text at `vam/LICENSE:1-21`, under `Copyright (c) 2025 misbahsy` at `vam/LICENSE:3` (inventory I.1, `../context/source-inventory.md:292,297`). Everything else the bundle ships is a dependency that neither source tree contains, and the inventory records those licences as unknown from these sources (`../context/source-inventory.md:306`). The plan therefore has two halves: keep the two MIT texts exactly as they are, and fetch the rest before anything is packed.

### 10.1 The files the package carries

The files below sit at the package root, `AI Systems/Media Editor/mcp server/`, and travel with every distribution that carries the binaries, the `.mcpb` bundle and the Claude Code plugin alike, because both package this server. Phases 7 and 8 own the manifests that place them, and this section fixes what they must contain.

| Path | Content |
|------|---------|
| `THIRD_PARTY_NOTICES` | The merged project's own licence line, both upstream MIT blocks in full, and one entry per bundled component |
| `licenses/<component>-LICENSE.txt` | One verbatim licence text per bundled component, named by the table in 10.3 |
| `licenses/ffmpeg-LICENSE.txt` | The licence text of the shipped ffmpeg build (10.4) |
| `licenses/ffmpeg-SOURCE.md` | The written source pointer for the shipped ffmpeg build version (10.4) |

`THIRD_PARTY_NOTICES` is the index a reader starts from. Every entry in it names the `licenses/` file that holds the full text, so no text is duplicated across the two files and none goes missing.

### 10.2 The THIRD_PARTY_NOTICES outline

The order is fixed: the merged work's own line first, then Imagician, then video-audio, then the dependency index. The new line for the merged work is the inventory's own rule (I.1, `../context/source-inventory.md:304`). Each upstream block repeats its copyright line verbatim and then the full MIT text, because that is the condition both licences attach to copied code (`imagician/LICENSE:12-13`, `vam/LICENSE:12-13`). The two bodies are the same standard text and differ only in the copyright line above them, and both blocks still carry the whole body. The blocks are copied from the two files rather than retyped, so a byte comparison stays possible at pack time.

```text
THIRD_PARTY_NOTICES

Media Editor MCP server
Copyright (c) 2026 <rights holder>
MIT licence

Portions of this server derive from the MIT licensed projects below. Their
licence texts are reproduced in full. The licences of the bundled third party
components follow after them.

================================================================================
Imagician
================================================================================

MIT License

Copyright (c) 2024 Hongyi Wang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================================================================================
video-audio-mcp (misbahsy/video-audio-mcp)
================================================================================

MIT License

Copyright (c) 2025 misbahsy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================================================================================
Bundled runtime dependencies
================================================================================

@modelcontextprotocol/sdk      licenses/mcp-sdk-LICENSE.txt
zod                            licenses/zod-LICENSE.txt
sharp                          licenses/sharp-LICENSE.txt
prebuilt libvips behind sharp  licenses/libvips-LICENSE.txt
ffmpeg-static                  licenses/ffmpeg-static-LICENSE.txt
ffprobe-static                 licenses/ffprobe-static-LICENSE.txt
the ffmpeg build in the bundle    licenses/ffmpeg-LICENSE.txt
                                  licenses/ffmpeg-SOURCE.md
the ffprobe build in the bundle   licenses/ffprobe-LICENSE.txt and
                                  licenses/ffprobe-SOURCE.md when it is not
                                  the ffmpeg build
```

Two notes on the template. The `<rights holder>` placeholder is filled by phase 7 when it writes the manifest, so the notice and the package metadata name the same holder. The dependency index repeats every row of 10.3, and each name in it matches a file the bundle carries.

### 10.3 Bundled runtime dependencies

This table answers the second half of REQ-010: every bundled dependency whose licence text still has to be fetched upstream (`../context/source-inventory.md:306-308`). A row stays unresolved until its text is in the repo. The word UNKNOWN is a to-do, not a value to ship: where the sources carry no licence string, the text is fetched from the pinned package or archive and copied verbatim.

| Package or component | Licence | Where to fetch the licence text | Obligation |
|----------------------|---------|--------------------------------|------------|
| `@modelcontextprotocol/sdk` (the 1.x line this server pins) | UNKNOWN in the sources | The `LICENSE` file of the pinned npm package | Copy verbatim to `licenses/mcp-sdk-LICENSE.txt` and list it in the notices index |
| `zod` | UNKNOWN in the sources | The `LICENSE` file of the pinned npm package | Copy verbatim to `licenses/zod-LICENSE.txt` and list it in the notices index |
| `sharp` (source evidence: `^0.33.2` at `imagician/package.json:47`, locked 0.33.5 at `imagician/package-lock.json:1090-1092`) | UNKNOWN in the sources | The `LICENSE` file of the pinned npm package | Copy verbatim to `licenses/sharp-LICENSE.txt` and list it in the notices index |
| The prebuilt libvips binaries behind sharp (`@img/sharp-*`) | UNKNOWN in the sources | The notice files the pinned prebuilt packages carry | Copy verbatim to `licenses/libvips-LICENSE.txt` and list it in the notices index |
| `ffmpeg-static` | UNKNOWN in the sources | Its package `LICENSE` file | Copy verbatim to `licenses/ffmpeg-static-LICENSE.txt` and list it in the notices index |
| `ffprobe-static` | UNKNOWN in the sources | Its package `LICENSE` file | Copy verbatim to `licenses/ffprobe-static-LICENSE.txt` and list it in the notices index |
| The ffmpeg build `ffmpeg-static` fetches | Typically GPL (inventory I.3 and F.5, `../context/source-inventory.md:221,306`) | The licence files inside the pinned build archive | `licenses/ffmpeg-LICENSE.txt` and `licenses/ffmpeg-SOURCE.md`, per 10.4 |
| The ffprobe build `ffprobe-static` fetches | UNKNOWN in the sources, the fetched build decides | The licence files inside the pinned build archive | The `ffprobe-` pair of 10.4 when its build differs from the ffmpeg build, otherwise the ffmpeg pair covers both |

Three rules hold for the table:

- The fetch follows the pin. Phase 2 pins the versions of the packages above, and the licence text of a pin is copied in the same change that pins it.
- Phase 7 refuses to pack while any row is still UNKNOWN or a file its obligation names is missing.
- The rows cover runtime components only. The dev dependencies of the first source (`typescript`, `tsx`, `@types/node` at `imagician/package.json:49-53`) and the Python packages of the second (`ffmpeg-python`, `mcp`, `pillow` at `vam/pyproject.toml:7-12`) are not carried by this server and need no entry. The ported code from `vam/server.py` stays under misbahsy's MIT all the same, which is the second MIT block in 10.2 (inventory I.2, `../context/source-inventory.md:305`).

The sources show version evidence without a licence string, which is why the table starts from UNKNOWN. The SDK's only trace is the 0.5.0 lockfile entry (`imagician/package-lock.json:833-835`), and sharp's is the `^0.33.2` range with its 0.33.5 lock (`imagician/package.json:47`, `imagician/package-lock.json:1090-1092`). Neither carries licence text (`../context/source-inventory.md:306`), and the libvips prebuilts are not vendored here at all (`../context/source-inventory.md:295`). The libvips row is a shipped binary rather than a text-only dependency: the prebuilt arrives with sharp, the lockfile already points at the libvips open collective (`imagician/package-lock.json:830`), and the notice has to name it.

### 10.4 GPL obligations for the shipped ffmpeg and ffprobe builds

The builds `ffmpeg-static` fetches are typically GPL licensed (inventory I.3 and F.5, `../context/source-inventory.md:221,306`). The server runs ffmpeg as a separate program: the child process starts from an args array with no shell, the rule the sources already keep (inventory G.1, `../context/source-inventory.md:238`), and no ffmpeg code is linked into the Node process. The server source therefore keeps its MIT licence, and the GPL obligations attach to the binaries the package carries.

What changes is where the binary comes from. Both sources treat ffmpeg as a prerequisite the user installs (`vam/README.md:564`, `skill/assets/hls-video-conversion.md:33-36`), and the inventory records that with `ffmpeg-static` it becomes a redistributed component instead (`../context/source-inventory.md:308`). Redistribution inside a `.mcpb` triggers the GPL obligations (inventory I.3, `../context/source-inventory.md:306`). Two of those obligations are concrete and both are checkable at pack time:

- The licence text of the exact shipped build travels in the bundle, verbatim.
- A written pointer names the corresponding source for that exact build version, never for the ffmpeg project in general.

The files fixed here:

| File | Content | Check before packing |
|------|---------|----------------------|
| `licenses/ffmpeg-LICENSE.txt` | The complete licence text of the shipped build, copied verbatim from the build archive | Present, non-empty, and taken from the same archive as the shipped binary |
| `licenses/ffmpeg-SOURCE.md` | The build version, the build URL, the release name, the SHA-256 of the shipped binary, and the URL of the corresponding source for that exact version | Present, and its version equals the first line of `ffmpeg -version` for the shipped binary |

Rules that apply to the pair:

- One pair per distinct shipped build. When `ffprobe-static` fetches the same build as `ffmpeg-static`, the `ffmpeg-` pair covers both binaries. When it fetches a different build, the parallel pair `licenses/ffprobe-LICENSE.txt` and `licenses/ffprobe-SOURCE.md` is added and passes the same two checks. A pair never describes a build that is not in the bundle.
- The version in `ffmpeg-SOURCE.md` is the same string section 6.7 records in the resolution cache and `media_health` reports as `version`, so the pointer ties to the binary that actually runs.
- `007-desktop-extension` blocks packing until both files exist and pass the checks (`spec.md:158`, R-002 at `spec.md:215`). The gate covers every platform the bundle supports, because section 6.3 requires the binary pair to travel inside the bundle.
- Replacing the bundled binary repeats the pair. A new ffmpeg version beside an old `ffmpeg-SOURCE.md` is the failure this check exists for.

### 10.5 The `media_setup_ffmpeg` download path

`media_setup_ffmpeg` installs a build after the user consents, so the same obligations apply without a pack step: the binary that lands in the data folder is a redistributed build too, even though the user asked for it. The call writes the same notices next to the unpacked binary, inside the server data folder that section 6.5 fixes:

```text
<data dir>/bin/ffmpeg                          the unpacked binary
<data dir>/bin/ffprobe                         the unpacked binary
<data dir>/bin/licenses/ffmpeg-LICENSE.txt
<data dir>/bin/licenses/ffmpeg-SOURCE.md
<data dir>/bin/licenses/ffprobe-LICENSE.txt    when the ffprobe build differs
<data dir>/bin/licenses/ffprobe-SOURCE.md      when the ffprobe build differs
```

Rules for this path:

- The plan rows of section 3 already carry the pinned version, the URL, the byte count and the SHA-256 of the artifact, so `ffmpeg-SOURCE.md` is written from values the call holds before it downloads. No second request and no extra fetch is needed for the pointer.
- The consent result shows those plan rows, and the download keeps the URL the plan showed, so the pointer beside the binary names the artifact the user agreed to.
- `install.json` (section 6.5) records the notice file names beside the binary they describe, so a missing notice is visible from the install record the same way a missing binary is.
- The success result lists the licence file paths next to the installed binary paths, with the section 7 shape. The notice files join the writes of that call (section 3).
- Phase `008-claude-code-plugin` builds this tool, row 39 of the unified table, and these writes are part of its contract. A download that completes without them is not a success.

AC-010 is met when the drafted `THIRD_PARTY_NOTICES` carries `Copyright (c) 2024 Hongyi Wang` and `Copyright (c) 2025 misbahsy` verbatim in their MIT blocks and lists every row of 10.3 (`acceptance-criteria.md:66`).
