# Media Editor User Guide

Setting up the Media Editor so it edits your files from the Claude Media Editor Project, with the one install you need and the checks that prove it works.

---

## 1. OVERVIEW

You will see three names for the Media Editor tools. They are one program in three wrappers, and you install only one of them.

| Name | What it is | Do you install it? |
| --- | --- | --- |
| MCP server | The program that edits images, video and audio. It carries its own ffmpeg | Never on its own. It comes inside the two below |
| Desktop extension | One `.mcpb` file for Claude Desktop | **Yes, for the Media Editor Project** |
| Claude Code plugin | A folder for Claude Code, the terminal app | Only if you work in Claude Code |

Pick by where you chat with Claude:

| Where you chat | What to install | What the Media Editor Project can do |
| --- | --- | --- |
| Claude Desktop on macOS, Windows or Linux | The Desktop extension | Edit your files and save the results |
| Claude Code in a terminal | The Claude Code plugin, see `INSTALL-GUIDE.md` | Edit your files and save the results |
| claude.ai in a browser, or the mobile app | Nothing, the tools cannot run there | Advise only: it gives you the exact command to run yourself |

The tools run on your own computer, so only the Claude Desktop and Claude Code apps can reach them. Your files never leave your machine.

---

## 2. BEFORE YOU START

1. **Claude Desktop**, signed in with the account that has the Media Editor Project. It runs on macOS 11+, Windows 10+ and, in beta, Ubuntu 22.04+ or Debian 12+.
2. **The extension file for your computer**, 65 to 74 MB. Download it from the [latest release](https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/latest), or build it with section 3 of `INSTALL-GUIDE.md`.

   | Your computer | File |
   | --- | --- |
   | Mac with an Apple chip (M1 or later) | `media-editor-darwin-arm64.mcpb` |
   | Mac with an Intel chip | `media-editor-darwin-x64.mcpb` |
   | Windows | `media-editor-win32-x64.mcpb` |
   | Linux on x64 | `media-editor-linux-x64.mcpb` |
   | Linux on arm64 | `media-editor-linux-arm64.mcpb` |

   Which Mac? Apple menu > About This Mac > Chip.

3. **The `media files` folder** at `AI Systems/Media Editor/media files/`. Git keeps its three folders but not the files in them.

   ```text
   media files/
   ├── import/   the files you want edited
   ├── export/   where every result lands, one file directly, several in a numbered folder
   └── tests/    sample files for trying things out
   ```

No ffmpeg or Node.js needed. The extension brings its own.

---

## 3. INSTALL THE EXTENSION

1. In Claude Desktop, open **Settings > Extensions > Advanced settings**, click **Install Extension…** under **Extension Developer** and choose your `.mcpb` file.
2. **Folders Media Editor may open:** `AI Systems/Media Editor/media files`. Remove any empty **Directory path** row, or the tools will not start.
3. **Output folder:** `AI Systems/Media Editor/media files/export`.
4. Click **Save** and restart Claude Desktop.

---

## 4. OPEN THE MEDIA EDITOR PROJECT

1. **No Project yet?** Create one named Media Editor on claude.ai, paste `claude project/Custom Instructions.md` into its instructions and upload every file in `claude project/knowledge/`.
2. In Claude Desktop, open **Projects > Media Editor** and start a new chat.
3. Under **+ > Connectors**, switch Media Editor on.

---

## 5. CHECK THAT IT WORKS

1. Ask `Run media_health and tell me what it found.` It should report ffmpeg and ffprobe found and list your folder. Allow the tool if asked.
2. Add a photo to `media files/import` and ask `Resize photo.jpg in media files/import to 800 pixels wide as WebP.`, using your file's name.
3. The reply first proposes a readable name for the result and waits. Say yes, and the reply names the new file in `media files/export`. A command to run instead of a saved file means the tools did not run, see section 6.

---

## 6. TROUBLESHOOTING

| What you see | Why | What to do |
| --- | --- | --- |
| Claude gives you an ffmpeg command instead of editing | The tools are off, or you are on claude.ai in a browser or the mobile app | Use Claude Desktop, and check **+ > Connectors** in the chat |
| "Unable to connect to extension server" in the extension settings | A **Directory path** row under **Folders Media Editor may open** is empty, so Claude Desktop treats the required setting as missing and never starts the tools | Remove every empty row with its **×** button, click **Save**, then switch the extension off and on |
| Media Editor is missing from **+ > Connectors** | Claude Desktop has not loaded the extension yet | Restart Claude Desktop. If it is still missing, check **Settings > Extensions** |
| `CONFIG_MISSING` | No folder is listed under **Folders Media Editor may open** | Add your media folders in the extension settings under **Settings > Extensions** |
| `PATH_NOT_ALLOWED` | The file sits outside the folders you listed | Add its folder to the extension settings, or move the file into a listed folder |
| `media_health` says ffmpeg is missing and names `media_setup_ffmpeg` | The ffmpeg that ships with the extension cannot run on this computer | Ask Claude to run `media_setup_ffmpeg`. It shows the download address, size and checksum first and downloads only after you agree |
| The install fails or the tools never start | The file does not match your computer | Check the table in section 2 and install the matching file |
| A result cannot be edited again | The output folder is not inside a listed folder | Set **Output folder** to `media files/export`, inside your listed `media files` folder |

---

## 7. RELATED

- [INSTALL-GUIDE.md](./INSTALL-GUIDE.md): Building the extension, the Claude Code plugin and a manual ffmpeg install
- [claude project/README.md](./claude%20project/README.md): What the Media Editor Project contains and how to update it
- [mcp server/README.md](./mcp%20server/README.md): The server behind the tools, its 40 tools and settings
- [mcp server/claude-plugin/README.md](./mcp%20server/claude-plugin/README.md): The Claude Code plugin
