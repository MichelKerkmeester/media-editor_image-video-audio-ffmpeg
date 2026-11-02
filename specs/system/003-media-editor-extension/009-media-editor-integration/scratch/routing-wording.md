# Routing wording

The one set of sentences every edited site uses, so the skill, the kernel, AGENTS.md and the references say the same thing in the same words. Written 2026-09-29 before the edits.

## Terms

| Term | Meaning |
|------|---------|
| the Media Editor tools | The tools of the Media Editor MCP server: `media_health`, `media_setup_ffmpeg` and the `image_*`, `video_*`, `audio_*` and `media_*` tools. Connected through the Claude Desktop extension or the Claude Code plugin |
| connected | The tools are listed in this conversation, so `media_health` can be called |
| local ffmpeg | ffmpeg on the path of a runtime that has a terminal |
| advice | A chat answer with the exact command to run, where the result lands and what to check, stating that nothing ran |

## Canonical sentences

**Order (skill, AGENTS.md, kernel):**
> Every operation takes the first route that is available: the Media Editor tools when they are connected, then locally installed ffmpeg, then advice with the exact command when neither can run.

**Tool check, tools route:**
> Call `media_health` once before the first operation. It reports which ffmpeg and ffprobe the server found, the encoders and filters they offer and the folders it may read and write. The tools bring their own ffmpeg, so nothing else needs to be on the path. When `media_health` names `media_setup_ffmpeg` as the next step, show the user the planned download it returns and call it with consent only after the user agrees.

**Tool check, local route:**
> Run `ffmpeg -version`. When it answers, the tool is available.

**Tool check, neither:**
> Advise: give the exact ffmpeg command, where the result would land and what to check, say plainly that nothing ran and point to the Media Editor extension, the plugin or an ffmpeg install so the next request can run.

**Capability miss:**
> A tool that returns `CAPABILITY_MISSING` hands the operation to local ffmpeg when it is present, otherwise to advice.

**Export with tools:**
> A tool writes its result into a new `NNN - description/` folder inside its output folder and returns the path. That folder is the export: report the path the tool returned.

**Kernel, no tools:**
> Without the Media Editor tools, this Project cannot run ffmpeg, so it answers in chat with the exact command to run, where the result lands and what to check.

**Kernel, attestation:**
- Tools ran: `mode = [...] | tool = [tool names] | execution = tool ran | verification = [check the tool reported] | save = [folder the tool returned] | HVR = checked`
- No tool ran: the existing line, unchanged: `... | execution = did not occur | verification = did not occur | save = did not occur | HVR = checked`

## Reference preconditions (five pinned sentences, both sides of each pair)

| Document | Old | New |
|----------|-----|-----|
| `mcp-imagician.md`, `mcp-video-audio.md` `:35` | FFmpeg must be on the path. Check once per session: | When the Media Editor tools are connected, use them: they bring their own ffmpeg, and `media_health` reports what it can do. Otherwise FFmpeg must be on the path. Check once per session: |
| same `:41` | ... There is no server, no login and no network dependency. If the check fails, stop and give install guidance before any operation. | ... The local route needs no server, no login and no network. If neither the tools nor the check answers, give the command as advice with install guidance and run nothing. |
| `hls-video-conversion.md:41` | Verify FFmpeg before all operations with `ffmpeg -version`. | Use `video_hls_ladder` when the Media Editor tools are connected. Otherwise verify FFmpeg before all operations with `ffmpeg -version`. |
| `interactive-intelligence.md:45` | FFmpeg check first: confirm `ffmpeg -version` answers in the runtime before any operation | Tool check first: use the Media Editor tools when they are connected, otherwise confirm `ffmpeg -version` answers in the runtime before any operation |
| `media-framework.md:44` | **FFmpeg check first:** never process without confirming ffmpeg is on the path. | **Tool check first:** never process without confirming a route: the Media Editor tools when connected, otherwise ffmpeg on the path. |

`rule_parity.py` re-pins the rule "ffmpeg precondition gates every operation" as "the tool check gates every operation" with the five new sentences, `min_pairs` 5.
