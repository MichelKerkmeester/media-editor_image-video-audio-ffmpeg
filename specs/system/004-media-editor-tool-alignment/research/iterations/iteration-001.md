# Iteration 001 — Q1: Server tool surface vs. skill and Project documentation

- **Run:** 004-media-editor-tool-alignment, lineage `2026-10-03T14:44:01.000Z`, iteration 1 of 5
- **Focus:** Q1 — which of the server's tools, with their purpose, key parameters, defaults, consent rules and error codes, are documented, misdocumented or missing across the skill and the Project; and which documented operations have no tool.
- **Outcome:** Q1 answered at the inventory level. The server's 39 tools are verified against `all-tools.ts`; the skill and Project name 6 by name, reference 3 family wildcards, and never name the other 33. Three documented operations have no tool. Error-code and consent coverage is fragmentary.

## Actions Taken

1. Read the server tool registry and error module: `mcp server/src/server/all-tools.ts`, `mcp server/src/core/errors.ts`.
2. Extracted every tool name and title from `mcp server/src/tools/**` (`TOOL_NAME` + `title`), then cross-checked the set against the server README tool table.
3. Grepped tool-name mentions per file across the skill surface (`sk-media-editor/**`), Project surface (`claude project/**`), guides, and the plugin copy.
4. Grepped defaults (`default(...)`), enums, and the `consent` schema in `mcp server/src/tools/**`; located every raise site for `CONSENT_REQUIRED`, `PATH_NOT_ALLOWED`, `CONFIG_MISSING`, `OUTPUT_EXISTS`, `CAPABILITY_MISSING`.
5. Grepped all 15 error codes across the skill, Project, and guide files.
6. Read the kernel tail and fleet kernels for the Router Code pattern (seed evidence for Q3/Q4); checked `benchmark/router/`, `benchmark/gates/rule_parity.py`, and `z — Claude Project Sync Loop/systems.py` pairs (seed evidence for Q5).

## Findings

### F1 (P1) — 39 tools verified; only 6 are ever named in the skill or Project

`mcp server/src/server/all-tools.ts:56-96` registers 39 tools. Count per group matches `mcp server/README.md` section 4 exactly: 8 image, 6 audio, 20 video, 5 media.

| Group | Tools (verified against `TOOL_NAME`) |
| --- | --- |
| Image (8) | `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` |
| Audio (6) | `audio_extract`, `audio_convert`, `audio_convert_properties`, `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels` |
| Video (20) | `video_trim`, `video_convert`, `video_convert_properties`, `video_set_aspect_ratio`, `video_set_resolution`, `video_set_codec`, `video_set_bitrate`, `video_set_frame_rate`, `video_set_audio_codec`, `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels`, `video_set_speed`, `video_add_fade`, `video_add_text_overlay`, `video_add_image_overlay`, `video_add_subtitles`, `video_add_b_roll`, `video_concat`, `video_hls_ladder` |
| Media (5) | `media_health`, `media_probe`, `media_repair`, `media_remove_silence`, `media_setup_ffmpeg` |

Named anywhere in the skill or Project, by explicit name — 6 of 39:

| Tool | Surfaces that name it |
| --- | --- |
| `media_health` | `SKILL.md` (100, 268, 379), `claude project/Custom Instructions.md` (226), `README.md`, `AGENTS.md`, both integration references, `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `interactive-intelligence.md` |
| `media_setup_ffmpeg` | `SKILL.md` (270, 410), kernel (226), `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `interactive-intelligence.md` |
| `media_probe` | `SKILL.md` (297), kernel (243) |
| `media_repair` | `SKILL.md` (297), kernel (243) |
| `media_remove_silence` | `SKILL.md` (297), kernel (243) |
| `video_hls_ladder` | `SKILL.md` (297), kernel (243), `assets/hls-video-conversion.md` |

The remaining 33 tools (all 8 image, all 6 audio, 19 of 20 video) appear only behind family wildcards — `image_*`, `video_*`, `audio_*` — at `SKILL.md:297`, `Custom Instructions.md:243`, `sk-media-editor/README.md:128,151`. No surface lists a tool's purpose, key parameters, defaults, or error behaviour per tool; the per-operation detail lives only in ffmpeg recipes.

### F2 (P1) — The mode maps route to ffmpeg references, not to tools

- `SKILL.md:145-151` `RESOURCE_MAP` binds IMAGE → `references/mcp-imagician.md`, VIDEO/AUDIO → `references/mcp-video-audio.md`, HLS → `assets/hls-video-conversion.md`, REPAIR → `references/interactive-intelligence.md`; the kernel duplicates this at `Custom Instructions.md:112-114`.
- `SKILL.md:157-163` `TOOL_MAP` names `ffmpeg`/`ffprobe and ffmpeg` per mode, never a tool; the kernel duplicates this at `Custom Instructions.md:119-122` (including the comment block that explains the route order).
- `SKILL.md:44-46` command triggers describe `$image`, `$video`, `$audio` as routing to "the ffmpeg image reference" / "the ffmpeg video and audio reference".
- `SKILL.md:117` states the two integration files "keep their historical `mcp-` prefixes"; `sk-media-editor/README.md:328` repeats the justification ("because the parity declaration and every cross reference point at them"). This is exactly the vocabulary the topic requires dropping, and it is currently codified as policy in both files.

### F3 (P1) — Documented operations with no tool (3 found)

| Documented operation | Where documented | Server reality |
| --- | --- | --- |
| Audio normalization (EBU R128 `loudnorm`) | `SKILL.md:37,293,414`; kernel `26,238`; `README.md:94,122,163,168`; `references/mcp-video-audio.md:25,74,157,163,240`; `references/media-framework.md:272` | No tool normalizes audio. Among the 6 audio tools there is no normalize/loudnorm operation; only the ffmpeg route can do it. |
| Compress video or audio | `SKILL.md:34` activation trigger ("Compress an image, video or audio file") | Only `image_compress` exists. Video/audio compression must be expressed through `video_convert_properties` / `video_set_bitrate` / `audio_set_bitrate`, which the docs never do. |
| Audio trim | Kernel `238` (Audio mode column: "Extract, convert, normalize, trim or remove silence") | No `audio_trim` tool. Needs a spot-check whether `audio_extract` or `video_trim` carries a range that covers it; either way the docs name a capability no tool declares. |

Every other capability claimed in the mode tables (`SKILL.md:290-295`, kernel `238-243`) does map to a tool: resize/convert/compress/crop/rotate/flip (image), transcode/trim/overlay/concat/speed/resolution/aspect/codec/bitrate/frame rate/fade/subtitles/b-roll (video), extract/convert/bitrate/sample-rate/channels/silence-removal (audio), HLS (`video_hls_ladder`), repair (`media_probe`→`media_repair`).

### F4 (P2) — Error codes: 3 of 15 in the skill and kernel, none with semantics

`mcp server/src/core/errors.ts:12-28` defines 15 codes. Doc coverage:

| Code | Named in |
| --- | --- |
| `CAPABILITY_MISSING` | `SKILL.md:280`, kernel (`~284`) |
| `CONFIG_MISSING` | `SKILL.md:282`, kernel, `INSTALL-GUIDE.md`, `USER-GUIDE.md` |
| `PATH_NOT_ALLOWED` | `SKILL.md:282`, kernel, `USER-GUIDE.md` |
| `FFMPEG_NOT_FOUND` | `INSTALL-GUIDE.md` only |
| `INVALID_INPUT`, `INPUT_NOT_FOUND`, `OUTPUT_EXISTS`, `UNSUPPORTED_FORMAT`, `FFPROBE_NOT_FOUND`, `PROCESS_FAILED`, `PROCESS_TIMEOUT`, `CONSENT_REQUIRED`, `DOWNLOAD_FAILED`, `CHECKSUM_MISMATCH`, `INTERNAL` | No skill or Project surface |

The two recovery rules that do exist (`SKILL.md:280-282`) are correct but partial: `CAPABILITY_MISSING` → hand off to ffmpeg/advice; `CONFIG_MISSING`/`PATH_NOT_ALLOWED` → start the session in the media folder or add it to the extension's allowed folders. `OUTPUT_EXISTS` and its never-overwrite guarantee, `PROCESS_TIMEOUT` (default 1800 s, `mcp server/README.md` section 5), and `UNSUPPORTED_FORMAT` are absent.

### F5 (P2) — Consent rule: documented as behaviour, not as the tool's contract

- `mcp server/src/tools/media/setup-ffmpeg.ts:147-153`: `consent` boolean, **default false**, "Pass true only after the user has seen the planned download for every missing component, including its URL, size, SHA-256 and destination, and accepted it. Without it the call writes nothing."
- `CONSENT_REQUIRED` is raised only in `setup-ffmpeg.ts`; no other tool takes consent.
- `media_health` names `media_setup_ffmpeg` as the next step (`mcp server/src/tools/media/health.ts:53,120`).
- Docs say the behaviour (`SKILL.md:270`, kernel `226`, `INSTALL-GUIDE.md`, `USER-GUIDE.md`) but never name the `consent` parameter, its default, the `component` enum (`ffmpeg|ffprobe|both`, default `both`), or the `CONSENT_REQUIRED` code. A user or model reading only the skill cannot tell how consent is expressed or that the default writes nothing.

### F6 (P2) — Key parameters and defaults exist per tool but are documented only as ffmpeg recipes

Sampled defaults from `mcp server/src/tools/**`: `image_convert` quality 80; `image_compress` quality 80 + metadata-strip boolean default true; `image_resize` fit `cover` + boolean default true; `image_rotate` background `#000000`; `video_hls_ladder` rungs `[1080p,720p,480p,360p]`, crf 23, segment 2 s (defaults match `assets/hls-video-conversion.md:52,103,112`); `video_set_aspect_ratio` mode `pad`; `video_add_b_roll` position + `fadeIn`/`fadeOut` false + fade duration; `video_add_text_overlay` position, fontSize, box, boxOpacity, boxBorderWidth; `media_remove_silence` threshold −30 dB, min silence 500 ms; `media_repair` mode `auto`; `audio_extract` codec `libmp3lame`; `media_setup_ffmpeg` component `both`, consent false. None of these parameter names or defaults appear in the skill or Project; the HLS asset is the one place whose recipe values match a tool.

### F7 (P2) — The server README is the complete documentation the skill lacks

`mcp server/README.md` section 4 lists all 39 tools by group, and section 5 documents config defaults (no allowed folder → every file tool fails until one is set; output folder defaults to the first allowed folder; timeout 1800 s; `MEDIA_EDITOR_*` overrides). It is the server-side source the skill/Project restatement should be derived from, and it is currently not referenced by the skill's tool check beyond the `media_health` sentence.

### Seed findings for later questions (not answered this iteration)

- **Q3/Q4 seed:** the router is inline in `SKILL.md:73-244` (with a commented Python block) and duplicated in kernel `Custom Instructions.md:41-215`; no `references/router-contract.md` exists. The fleet pattern is visible in `Barter - Copywriter`, `Barter - Deal Templates`, `Product Owner`, `Sales - Direct Communication`: all four ship `references/router-contract.md` + `benchmark/router/differential.py`, and all four kernels end with a `## N. ROUTER CODE` section ("It is `references/router-contract.md` with its comments removed"). Media Editor's kernel ends at section 6 with no Router Code section, and its `benchmark/router/` holds `route_contract.py`, `fixtures.json`, `run_fixtures.sh`, `README.md` — but no `differential.py`.
- **Q2/Q5 seed:** legacy vocabulary paths that must be renamed or rewritten: `sk-media-editor/references/mcp-imagician.md`, `sk-media-editor/references/mcp-video-audio.md`, their Knowledge twins `claude project/knowledge/Media Editor - Integrations - MCP Imagician - v0.211.md` and `... MCP Video Audio - v0.212.md`, plus references in `AGENTS.md:95-96,101,128-129`, `sk-media-editor/README.md:64,316-317,328,396-397`, `INSTALL-GUIDE.md:262-263`, `SYNC.md`, `benchmark/gates/README.md`, `benchmark/router/README.md`, the playbook `skill-route-order/fallback-to-local-ffmpeg.md`, and `systems.py` pairs (`z — Claude Project Sync Loop/systems.py:1242-1245`). The plugin copy `mcp server/claude-plugin/skills/media-editor/` is byte-identical for `SKILL.md` and `references/mcp-imagician.md`, so every skill edit propagates there too. The internal H1 titles of the two references already read "Media Editor - Integrations - FFmpeg Image Operations - v0.211" and "… FFmpeg Video Audio - v0.212".

## Questions Answered

- **Q1 (answered):** the tool inventory is verified (39 tools, names, groups, count agreement with `all-tools.ts` and `mcp server/README.md`); the documentation gap is quantified (6 of 39 tools named; 33 only behind wildcards; no per-tool purpose/parameter/default/consent/error detail anywhere in the skill or Project); misdocumentation identified (`mcp-` prefix retention policy, ffmpeg-named `TOOL_MAP`/`RESOURCE_MAP`, mode→ffmpeg-reference command triggers); three documented operations have no tool (audio normalization, video/audio compression, audio trim — last one pending a range spot-check); error-code coverage is 3/15 in the skill+kernel with no semantics; the consent parameter contract is absent from every doc.

## Questions Remaining

- Q1 residual: confirm whether `audio_extract` or `video_trim` covers audio trim before the change list is written (one spot-check in a later iteration or at implementation time).
- Q2 integration references (file/Knowledge names, tool-first rewrite with ffmpeg fallback, separate tools reference?).
- Q3 `SKILL.md`/`AGENTS.md`/`README.md` changes (command→tool mapping, `TOOL_MAP`/`RESOURCE_MAP`, tool check, export path, router extraction to `references/router-contract.md`).
- Q4 kernel and Knowledge (ROUTER CODE section, section 2 reduced to pointer, upper-case fleet headings, Knowledge add/rename/drop, delivery protocol for tool runs).
- Q5 gates and ranked change list (`rule_parity.py`, new `benchmark/router/differential.py`, Sync Loop pairs/residency, playbook, plugin copy, guides).

## Next Focus

Q2 — decide what `references/mcp-imagician.md`, `references/mcp-video-audio.md` and `assets/hls-video-conversion.md` become: file and Knowledge names, the tool-first/ffmpeg-fallback rewrite, the legacy vocabulary to drop across every referrer (AGENTS.md, README.md, INSTALL-GUIDE.md, SYNC.md, gates/router READMEs, playbook, systems.py), and whether a separate tools reference (39 tools with purpose, key parameters, defaults, consent, error recovery) is needed alongside them.
