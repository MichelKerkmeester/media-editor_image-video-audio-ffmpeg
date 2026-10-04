---
title: "Media Editor MCP Server"
description: "Local MCP server with 39 tools that edit, convert and inspect images, video and audio, shipped as a Claude Desktop extension and a Claude Code plugin with its own ffmpeg."
trigger_phrases:
  - "media editor mcp server"
  - "media editor tools"
  - "mcpb bundle build"
  - "media editor plugin build"
---

# Media Editor MCP Server

> A local MCP server that edits, converts and inspects images, video and audio on your machine, with its own pinned ffmpeg.

---

## 1. OVERVIEW

This package is the server behind the Media Editor's tools. A host starts it on your machine and calls its 39 tools over stdio. Claude Desktop runs it from a one-click `.mcpb` extension, and Claude Code runs it from the plugin in `claude-plugin/`. Files never leave your machine.

Every tool follows the same rules. It opens files only inside the folders you allow, writes each result into a new numbered folder under the output folder and never overwrites a file. Video and audio tools try a lossless stream copy first and re-encode when the copy cannot work.

This README is for developers who build, test or package the server. People who only want to install it should read [../INSTALL-GUIDE.md](../INSTALL-GUIDE.md) or [claude-plugin/README.md](./claude-plugin/README.md).

---

## 2. KEY STATISTICS

| Fact | Value |
|------|-------|
| Tools | 39: 8 image, 6 audio, 20 video, 5 media |
| Platforms | macOS arm64 and x64, Windows x64, Linux x64 and arm64 |
| Node.js | 20.9.0 or newer |
| MCP transport | stdio |
| Bundled ffmpeg | One pinned build per platform, checked by SHA-256 |

---

## 3. QUICK START

Run these from this folder, `AI Systems/Media Editor/mcp server/`.

```bash
npm install
npm run build
npm test
```

Expected result: `tsc` prints nothing and vitest ends with every test file passed.

Start the server by hand with one allowed folder and an output folder:

```bash
npm start -- --output-dir "$HOME/Media Editor output" "$HOME/Movies"
```

The server then waits for MCP messages on stdin and logs `started with 1 allowed folder` to stderr when `MEDIA_EDITOR_LOG_LEVEL` is `info` or `debug`.

---

## 4. TOOLS

| Group | Tools |
|-------|-------|
| Image (sharp) | `image_resize`, `image_convert`, `image_crop`, `image_compress`, `image_rotate`, `image_flip`, `image_probe`, `image_batch_resize` |
| Audio (ffmpeg) | `audio_extract`, `audio_convert`, `audio_convert_properties`, `audio_set_bitrate`, `audio_set_sample_rate`, `audio_set_channels` |
| Video (ffmpeg) | `video_trim`, `video_convert`, `video_convert_properties`, `video_set_aspect_ratio`, `video_set_resolution`, `video_set_codec`, `video_set_bitrate`, `video_set_frame_rate`, `video_set_audio_codec`, `video_set_audio_bitrate`, `video_set_audio_sample_rate`, `video_set_audio_channels`, `video_set_speed`, `video_add_fade`, `video_add_text_overlay`, `video_add_image_overlay`, `video_add_subtitles`, `video_add_b_roll`, `video_concat`, `video_hls_ladder` |
| Media | `media_health`, `media_probe`, `media_repair`, `media_remove_silence`, `media_setup_ffmpeg` |

Each tool lists its own schema and description through `tools/list`. `media_health` is the first call to make when something fails, because it reports the ffmpeg and ffprobe it found, where they came from and which encoders and filters they carry.

---

## 5. CONFIGURATION

The server reads command-line arguments first, then environment variables.

| Setting | Argument | Variable | Default |
|---------|----------|----------|---------|
| Allowed folders | `--allowed-dir <path>` or a bare path, repeatable | `MEDIA_EDITOR_ALLOWED_DIRS`, split by the platform path delimiter | None, and every tool that opens a file fails until one is set |
| Output folder | `--output-dir <path>` | `MEDIA_EDITOR_OUTPUT_DIR` | The first allowed folder |
| ffmpeg override | | `MEDIA_EDITOR_FFMPEG_PATH` | Unset |
| ffprobe override | | `MEDIA_EDITOR_FFPROBE_PATH` | Unset |
| Process timeout | | `MEDIA_EDITOR_TIMEOUT_SECONDS` | 1800, allowed 1 to 86400 |
| Data folder | | `MEDIA_EDITOR_DATA_DIR` | `~/Library/Application Support/media-editor` on macOS, `%APPDATA%\media-editor` on Windows, `$XDG_DATA_HOME/media-editor` or `~/.local/share/media-editor` on Linux |
| Log level | | `MEDIA_EDITOR_LOG_LEVEL` | `info`. Also `error`, `warn` or `debug`, and any other value is ignored with a warning |

A value that cannot be used is ignored with a warning on stderr. The warning names the setting and never repeats the value.

---

## 6. STRUCTURE

```text
mcp server/
├── src/              # Server source, see src/README.md
├── scripts/          # Bundle, plugin and pinned-test builds, see scripts/README.md
├── tests/            # Vitest suites, see tests/README.md
├── assets/           # Bundled font and its licence
├── licenses/         # Licence texts the bundles carry
├── claude-plugin/    # Claude Code plugin
├── manifest.json     # MCPB manifest for Claude Desktop
├── icon.png          # Extension icon
├── LICENSE           # MIT licence
└── THIRD_PARTY_NOTICES
```

`dist/`, `build/`, `dist-bundles/` and `node_modules/` are generated and ignored by git.

---

## 7. COMMANDS

| Command | What it does |
|---------|--------------|
| `npm run build` | Compiles `src/` into `dist/` |
| `npm run typecheck` | Type-checks the whole package without writing files |
| `npm test` | Runs every vitest suite on the development ffmpeg |
| `npm run test:pinned` | Runs every suite on this machine's pinned ffmpeg after checking its digest |
| `npm run bundle -- --target <key>` | Packs one Desktop extension into `dist-bundles/`, or `--all` for all five |
| `npm run plugin` | Fills `claude-plugin/` from this machine's bundle and the Media Editor skill |
| `npm start` | Runs `dist/index.js` |

`<key>` is one of `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64`.

---

## 8. RELATED RESOURCES

- [ARCHITECTURE.md](./ARCHITECTURE.md): How the server, tools, runners and packaging fit together
- [claude-plugin/README.md](./claude-plugin/README.md): Claude Code plugin install and use
- [../INSTALL-GUIDE.md](../INSTALL-GUIDE.md): Media Editor install guide for every packaging
- [../sk-media-editor/SKILL.md](../sk-media-editor/SKILL.md): The skill that routes requests to these tools
