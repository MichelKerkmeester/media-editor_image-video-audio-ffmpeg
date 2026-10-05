# Media Editor Plugin for Claude Code

> Edit, convert and compress the images, video and audio in your project folder from Claude Code, with the `media-editor` command that brings its own ffmpeg.

---

## 1. OVERVIEW

This plugin gives a Claude Code session the Media Editor's 40 tools and its skill through the `media-editor` command. Claude Code puts the plugin's `bin/` folder on the Bash tool's PATH, so the bare command works in a session: one `media-editor <tool>` call runs one tool in one process and prints one JSON object. The command reads files only inside the folder you start Claude Code in, and writes a single result straight into `media files/export/`, with a numbered folder only for several files from one request. Nothing you edit leaves your machine.

The server carries a pinned ffmpeg and ffprobe for its platform. When neither a bundled nor an installed ffmpeg can run, `media-editor health` names `media_setup_ffmpeg`, which shows the download it would make (address, size and SHA-256) and fetches it only after you agree.

It is for anyone who edits media with Claude Code and would rather not install or drive ffmpeg by hand.

The plugin registers no MCP server, and that has an accepted cost: claude.ai and Cowork do not install a plugin that has a `bin/` folder, so this plugin reaches Claude Code only. A claude.ai Project uses the Claude Desktop extension instead, which still is an MCP server.

---

## 2. REQUIREMENTS

| Need | Minimum | Why |
|------|---------|-----|
| Claude Code | 2.1.284 was used to build and test it | Loads the plugin and puts its `bin/` folder on the Bash tool's PATH |
| Node.js | 20.9.0 on your `PATH` | The `media-editor` shim starts `node`, and the plugin does not supply its own |
| Platform | macOS arm64 or x64, Windows x64, Linux x64 or arm64 | One pinned ffmpeg build exists per platform |

---

## 3. QUICK START

Build the plugin from the package root, `AI Systems/Media Editor/runtime/`. The first command builds the Desktop bundle for your machine, and the second unpacks it into `claude-plugin/server/`, copies the skill into `claude-plugin/skills/sk-media-editor/` and writes the shims in `claude-plugin/bin/`.

```bash
npm run bundle -- --target darwin-arm64
npm run plugin
```

Use your own platform key in the first command: `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64`. `npm run plugin` picks your machine's key unless you pass `-- --target <key>`.

Then start Claude Code in the folder that holds your media, with the plugin loaded for that session:

```bash
claude --plugin-dir "<path to>/runtime/claude-plugin"
```

Check that the command answers, inside the session or straight from the plugin folder:

```bash
media-editor list
```

Expected: one JSON object whose `tools` array names all 40 tools. `media-editor health` reports which ffmpeg it found and which folder it may use.

---

## 4. CONFIGURATION

The plugin needs no settings. The `media-editor` command picks its folders like this:

| Part | Default | Effect |
|------|---------|--------|
| Allowed folder | the project folder | The folder you start Claude Code in is the one folder the tools may read. A command started inside its `media files` folder still uses the folder that holds it. `--allowed-dir` adds another |
| Output folder | `<project folder>/media files/export` | A single result goes straight into `media files/export/`, created on first use. Several files from one request get a numbered folder there. Put source files in `media files/import/` and test files in `media files/tests/` |
| Data folder | the platform's application data folder | Where `media_setup_ffmpeg` installs a downloaded ffmpeg, and where preview JPEGs land |

A flag beats the matching `MEDIA_EDITOR_*` environment variable, which beats the default. A tool call takes its arguments from exactly one of `--args '<json>'`, `--args-file <path>` or stdin, and paths inside the JSON must be absolute. `media-editor describe <tool>` prints a tool's JSON Schema.

---

## 5. STRUCTURE

```text
claude-plugin/
├── .claude-plugin/
│   ├── plugin.json        # plugin manifest
│   └── marketplace.json   # a one-plugin local marketplace
├── README.md
├── bin/                  # media-editor shims, built by npm run plugin, not tracked
├── server/               # the command's code, unpacked by npm run plugin, not tracked
└── skills/sk-media-editor/ # copied by npm run plugin, not tracked
```

`bin/media-editor` is a shell shim that runs `server/dist/cli.js`, with `bin/media-editor.cmd` for Windows. `skills/sk-media-editor/` is a copy of `../../sk-media-editor/`, and the build replaces the whole `skills/` folder each time, so a skill folder from an earlier build never ships beside it. Edit the skill there and rebuild. The build fails if any copied file differs from its source, refuses a server that unpacks with any link, and refuses a `plugin.json` that registers an MCP server.

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|--------------|-------|-----|
| `media-editor: command not found` in a session | `bin/` is missing because the plugin was not built | Run `npm run bundle -- --target <key>` and `npm run plugin` |
| The shim fails to start node | No `node` on the `PATH` Claude Code sees | Install Node.js 20.9.0 or later, then start a new session |
| `PATH_NOT_ALLOWED` from a tool | The file sits outside the folders the command may read | Start Claude Code inside the folder that holds your media, or pass `--allowed-dir` |
| `INVALID_INPUT` with `relative-path` | A JSON argument named a relative path | Pass the absolute path, built from the working folder |
| `FFMPEG_NOT_FOUND` | No ffmpeg the command trusts on this machine | Run `media-editor media_setup_ffmpeg --args '{}'`, read the planned download, then run it again with `consent` set to true |

---

## 7. RELATED RESOURCES

- `../../sk-media-editor/SKILL.md`: the skill this plugin ships
- `../manifest.json`: the Claude Desktop extension manifest for the same tools
- `../../INSTALL-GUIDE.md`: installing the Media Editor for Claude Desktop and by hand
