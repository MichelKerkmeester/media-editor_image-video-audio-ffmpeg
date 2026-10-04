---
title: "Media Editor - Reference - Setup"
description: "Guided setup for the Media Editor: where the user is, the Claude Desktop extension from the latest release, its two folder settings, ffmpeg with consent, the Claude Code plugin, local ffmpeg and the media_health check that proves the setup works."
contextType: implementation
importance_tier: important
trigger_phrases:
  - "set up media editor"
  - "install the extension"
  - "media editor extension"
  - "tools not connected"
  - "install ffmpeg"
  - "mcpb download"
version: 1.0.0.0
---

# Media Editor - Reference - Setup

How to walk a user from no tools to a working `media_health`, one step at a time, on the surface they are using.

**Loading Condition:** ON-DEMAND
**Purpose:** Gives the setup steps and the order to offer them in, for a user whose Media Editor tools are not connected or not working
**Scope:** Where the tools can run, the Desktop extension and its two settings, ffmpeg through `media_setup_ffmpeg`, the Claude Code plugin, local ffmpeg and the final check
**Source:** `INSTALL-GUIDE.md` sections 3 to 6 and the extension settings in `mcp server/manifest.json`

---

## 1. OVERVIEW

### Purpose

The Media Editor tools run on the user's own computer, inside the Claude Desktop extension or the Claude Code plugin. Until one is installed, the system can only advise. This reference turns that dead end into a short guided setup.

### When to use

- A request needs a file edited and no Media Editor tool such as `media_health` is connected
- The user asks how to install or set up the Media Editor, its extension, its plugin or ffmpeg
- A tool returns `CONFIG_MISSING`, `PATH_NOT_ALLOWED`, `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND`, or the tools stop appearing

### How to guide

1. Answer the request first. Without the tools, give the advice the route already requires: the exact command, where the result would land and that nothing ran
2. Then offer the setup in one line, once per conversation, for example: "Want me to walk you through installing the Media Editor extension, so the next edit runs on your files?"
3. When the user agrees, find where they are with Section 2, then give one step at a time and wait for the user to say it is done before the next
4. Use the labels the user sees on screen, in bold, exactly as written here
5. Call the setup finished only when `media_health` answers in a new chat, Section 8. An install the user describes is not a working install

---

## 2. FIND WHERE THE USER IS

The tools need a program on the user's computer. A web page cannot start one.

| Where the user is | Can the tools run there | Next step |
| --- | --- | --- |
| claude.ai in a browser or the mobile app | No | Install the Claude Desktop app, then the extension, Section 3. The same Project opens in the app under **Projects** |
| Claude Desktop, no `media_health` tool | Yes, once the extension is installed | Section 3 |
| Claude Desktop, `media_health` answers | Yes | Fix what it reports: folders in Section 4, ffmpeg in Section 5 |
| Claude Code | Yes, through the plugin | Section 6, or local ffmpeg in Section 7 |
| Another terminal agent | Only through local ffmpeg | Section 7 |

When the conversation does not show which one it is, ask one question: "Are you using Claude in a browser, the Claude Desktop app or Claude Code?"

---

## 3. INSTALL THE DESKTOP EXTENSION

No terminal and no ffmpeg install are needed. The extension carries its own ffmpeg and ffprobe, and Claude Desktop supplies Node to run it.

1. **Download the file for the computer** from the latest release: https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/latest

   | Computer | File |
   | --- | --- |
   | Mac with an Apple chip (M1 or later) | `media-editor-darwin-arm64.mcpb` |
   | Mac with an Intel processor | `media-editor-darwin-x64.mcpb` |
   | Windows | `media-editor-win32-x64.mcpb` |
   | Linux on x64 | `media-editor-linux-x64.mcpb` |
   | Linux on ARM | `media-editor-linux-arm64.mcpb` |

   On a Mac, **About This Mac** in the Apple menu shows **Chip** for an Apple chip or **Processor** for Intel.

2. **Install it.** In Claude Desktop, open **Settings > Extensions > Advanced settings**, click **Install Extension…** under **Extension Developer** and choose the downloaded file

3. **Choose the folders it may open.** Under **Folders Media Editor may open**, add every folder that holds media to edit. The default is the Desktop. Leave no empty **Directory path** row, because Claude Desktop does not start the tools while one is there

4. **Choose the output folder.** **Output folder** is where results land: one file straight in, several files from one run in a numbered folder. Left empty, results go to the first folder from step 3. To edit a result again later, the output folder must also be one of the folders from step 3

5. **Save, then start a new chat** in this Project, and under **+ > Connectors** switch Media Editor on

6. **Check the setup,** Section 8

---

## 4. FOLDERS

| What the user sees | Cause | What to tell the user |
| --- | --- | --- |
| "Unable to connect to extension server" in the extension settings | An empty **Directory path** row under **Folders Media Editor may open** | Remove the empty row, click **Save**, then switch the extension off and on |
| `CONFIG_MISSING` from a tool | No folder is set, or the output folder cannot take a new file or folder | Set the folders in the extension settings, Section 3 steps 3 and 4 |
| `PATH_NOT_ALLOWED` from a tool | The file sits outside every allowed folder | Add the folder that holds the file under **Folders Media Editor may open**, or move the file into one, then retry |

---

## 5. FFMPEG FOR THE EXTENSION

The extension's own ffmpeg normally just works. When `media_health` reports `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND`, it names `media_setup_ffmpeg` as the next step.

1. Call `media_setup_ffmpeg` without `consent`. It returns `CONSENT_REQUIRED` with the planned download: address, size, SHA-256 and destination
2. Show the user that plan and ask
3. Only after the user agrees, call it again with `consent: true`. The download is checked against its SHA-256 and installed for the extension alone

The full consent rule is in the Media Editor Tools reference, Section 6.

---

## 6. INSTALL THE CLAUDE CODE PLUGIN

The plugin is built from a copy of the repository and needs Node.js 20.9.0 or later and npm. Use the platform key from the table in Section 3, such as `darwin-arm64`.

```bash
git clone https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg.git
cd "media-editor_image-video-audio-ffmpeg/mcp server"
npm install
npm run bundle -- --target darwin-arm64
npm run plugin
claude --plugin-dir "$PWD/claude-plugin"
```

Start Claude Code in the folder that holds the media. The tools may read that folder, and each result goes into its `media files/export/`, created on first use. `claude --plugin-dir "<path>/claude-plugin" mcp list` shows the server as Connected. The plugin also carries this skill.

---

## 7. LOCAL FFMPEG WITHOUT THE TOOLS

A terminal agent without the plugin runs ffmpeg directly. A claude.ai Project cannot run it, so these commands are for the user's own terminal.

| System | Command |
| --- | --- |
| macOS | `brew install ffmpeg`, after installing Homebrew from brew.sh when `brew` is missing |
| Ubuntu and Debian | `sudo apt update`, then `sudo apt install ffmpeg` |
| Windows | `winget install ffmpeg`, then reopen the terminal so the new PATH is read |

Then `ffmpeg -version` and `ffprobe -version` must each print a version banner. A packaged build can lack an encoder, so check `ffmpeg -encoders` before promising WebP or AVIF.

---

## 8. CHECK THE SETUP

Setup is finished when `media_health` answers in a new chat. It reports the server version, where ffmpeg and ffprobe were found, the encoders and filters they offer and the folders in effect.

| Result | Next step |
| --- | --- |
| `media_health` answers and lists the user's folders | Done. Run the original request with the tools |
| `media_health` names `media_setup_ffmpeg` | Section 5 |
| `media_health` is not listed | Media Editor is switched off under **+ > Connectors**, or not installed. Switch it on, or repeat Section 3 step 2, then start a new chat |
| Media Editor is missing from **+ > Connectors** | Claude Desktop has not loaded the extension yet. Restart Claude Desktop, and if it is still missing, check **Settings > Extensions** |
| The extension settings show "Unable to connect to extension server" | Section 4, first row |

`INSTALL-GUIDE.md` in the repository covers every route in full, including building the extension from source.
