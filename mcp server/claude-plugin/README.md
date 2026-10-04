# Media Editor Plugin for Claude Code

> Edit, convert and compress the images, video and audio in your project folder from Claude Code, with a local server that brings its own ffmpeg.

---

## 1. OVERVIEW

This plugin gives a Claude Code session the Media Editor's 40 tools and its skill. The tools run on your machine through a local MCP server, read files only inside the folder you start Claude Code in, and write a single result straight into `media files/export/`, with a numbered folder only for several files from one call. Nothing you edit leaves your machine.

The server carries a pinned ffmpeg and ffprobe for its platform. When neither a bundled nor an installed ffmpeg can run, the `media_setup_ffmpeg` tool shows the download it would make (address, size and SHA-256) and fetches it only after you agree.

It is for anyone who edits media with Claude Code and would rather not install or drive ffmpeg by hand.

---

## 2. REQUIREMENTS

| Need | Minimum | Why |
|------|---------|-----|
| Claude Code | 2.1.284 was used to build and test it | Loads the plugin and runs its server |
| Node.js | 20.9.0 on your `PATH` | Claude Code starts the server with `node` and does not supply its own |
| Platform | macOS arm64 or x64, Windows x64, Linux x64 or arm64 | One pinned ffmpeg build exists per platform |

---

## 3. QUICK START

Build the plugin from the package root, `AI Systems/Media Editor/mcp server/`. The first command builds the Desktop bundle for your machine, and the second unpacks it into `claude-plugin/server/` and copies the skill into `claude-plugin/skills/sk-media-editor/`.

```bash
npm run bundle -- --target darwin-arm64
npm run plugin
```

Use your own platform key in the first command: `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64`. `npm run plugin` picks your machine's key unless you pass `-- --target <key>`.

Then start Claude Code in the folder that holds your media, with the plugin loaded for that session:

```bash
claude --plugin-dir "<path to>/mcp server/claude-plugin"
```

Check that it connected:

```bash
claude --plugin-dir "<path to>/mcp server/claude-plugin" mcp list
```

Expected line:

```text
plugin:media-editor:media-editor: node .../claude-plugin/server/dist/index.js <your folder> - ✔ Connected
```

Ask the session to run `media_health` to see which ffmpeg it found and which folder it may use.

---

## 4. CONFIGURATION

The plugin needs no settings. `.claude-plugin/plugin.json` starts the server like this:

| Part | Value | Effect |
|------|-------|--------|
| Command | `node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js` | Runs the unpacked server from the plugin |
| Allowed folder | `${CLAUDE_PROJECT_DIR}` | The folder you start Claude Code in is the one folder the tools may read |
| Output folder | `--output-dir "${CLAUDE_PROJECT_DIR}/media files/export"` | A single result goes straight into `media files/export/`, which the server creates on first use. Several files from one call get a numbered folder there. Put source files in `media files/import/` and test files in `media files/tests/` |
| `MEDIA_EDITOR_DATA_DIR` | `${CLAUDE_PLUGIN_DATA}` | Where `media_setup_ffmpeg` installs a downloaded ffmpeg, kept across plugin updates |

---

## 5. STRUCTURE

```text
claude-plugin/
├── .claude-plugin/
│   ├── plugin.json        # plugin manifest and the server command
│   └── marketplace.json   # a one-plugin local marketplace
├── README.md
├── server/                # built by npm run plugin, not tracked
└── skills/sk-media-editor/ # copied by npm run plugin, not tracked
```

`skills/sk-media-editor/` is a copy of `../../sk-media-editor/`, and the build replaces the whole `skills/` folder each time, so a skill folder from an earlier build never ships beside it. Edit the skill there and rebuild. The build fails if any copied file differs from its source, and it refuses a server that unpacks with any link.

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|--------------|-------|-----|
| `Failed to connect: ENOENT: Executable not found in $PATH` | No `node` on the `PATH` Claude Code sees | Install Node.js 20.9.0 or later, then start a new session |
| The server is not listed at all | `server/` is missing because the plugin was not built | Run `npm run bundle -- --target <key>` and `npm run plugin` |
| `CONFIG_MISSING` from a tool | The session has no project folder the server can use | Start Claude Code inside the folder that holds your media |
| `FFMPEG_NOT_FOUND` | No ffmpeg the server trusts on this machine | Run `media_setup_ffmpeg`, read the planned download, and agree to it |

---

## 7. RELATED RESOURCES

- `../../sk-media-editor/SKILL.md`: the skill this plugin ships
- `../manifest.json`: the Claude Desktop extension manifest for the same server
- `../../INSTALL-GUIDE.md`: installing the Media Editor for Claude Desktop and by hand
