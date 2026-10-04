# Media Editor - Claude Project packaging

> Hand-maintained local package for the claude.ai Media Editor Project, which runs the Media Editor tools when they are connected and advises when they are not. The live Project remains a separate manual upload.

This folder is the source for the live claude.ai **Media Editor** Project. The live Project is push-only from this folder because the claude.ai UI has no repository lock.

## Structure

```text
claude project/
|-- Custom Instructions.md        <- Project kernel v1.0.0, Skill v1.0.0.0 aligned, ends with the router code
|-- README.md                     <- this manifest and parity contract
`-- knowledge/                    <- upload every file below as Project Knowledge
    |-- Media Editor - Thinking - MEDIA Framework.md
    |-- Media Editor - System - Interactive Intelligence.md
    |-- Media Editor - Integrations - Image Operations.md
    |-- Media Editor - Integrations - Video And Audio Operations.md
    |-- Media Editor - Reference - HLS Video Conversion.md
    |-- Media Editor - Reference - Media Editor Tools.md
    `-- Media Editor - Reference - Setup.md
```

| Path | Purpose |
| --- | --- |
| `Custom Instructions.md` | The kernel pasted into the claude.ai Project custom instructions field |
| `knowledge/` | Project Knowledge mirrors uploaded to claude.ai |
| `README.md` | Packaging manifest and update checklist |

## Custom Instructions = skill kernel, Project-adapted

`Custom Instructions.md` is the synthesized claude.ai Project kernel, v1.0.0, aligned to **Media Editor Skill v1.0.0.0**. It preserves existing-media scope, MEDIA thinking, image, video, audio and HLS modes, the tool check and chat delivery, with the Media Editor tools first when they are connected. It ends with Section 8, Router Code, the code of `../sk-media-editor/references/router-contract.md` with its comments removed, and `../benchmark/router/differential.py` holds the two equal.

CLI-only mechanics are adapted for claude.ai Projects. Without the Media Editor tools, tool execution becomes advisory recipes in chat, direct file loading becomes Project Knowledge consultation and media export becomes a user-run `media files/export/` path in the CLI runtime or terminal, a readable file name for one result and a numbered folder for several. With the tools connected in Claude Desktop, the tools run, the kernel proposes a readable name from the content and passes it as `fileName` once the user confirms, and one result lands straight in the output folder.

The kernel claims execution only for what a Media Editor tool did in the conversation. Do not add language that claims claude.ai can run ffmpeg or terminal commands itself, or save edited media files without the tools, and do not add Canvas Artifact delivery.

In Claude Desktop with the Media Editor extension installed, the Project runs the tools on the user's machine. Without them a claude.ai Project cannot run ffmpeg, so it cannot execute media edits, and it answers in chat with the exact command to run, where the result lands and what to check. The CLI `sk-media-editor/` package and the Claude Code plugin run the same tools from a terminal.

### Key statistics

| Metric | Value |
| --- | --- |
| Project role | Media Editor for claude.ai Projects: the tools when connected, advice otherwise |
| Runtime source | `../sk-media-editor/` |
| Custom Instructions | Canonical 8-section kernel, ending with the router code |
| Project Knowledge files | 7 |
| Supported modes | Image, video, audio, HLS, repair, interactive |

## Paired-version and byte-parity rule

Every knowledge file is a byte-for-byte copy of its skill source. The skill source is the only place a reference is written, and the Project mirror is refreshed by copying the source file so the two stay identical. The read-only commit-timestamp comparison still shows when a review is due.

The router contract is the one skill reference with no mirror here. The kernel is the only file a Project reads on every turn, so it carries the router code itself, and an uploaded Router Contract document would be a second router that nothing compares. A rename changes the upload: remove the superseded mirror from the live Project before uploading its replacement, so two versions of one document never answer the same retrieval.

## Set up the live Project

1. Create or open a claude.ai Project named Media Editor
2. Paste `Custom Instructions.md` into the Project custom instructions field
3. Upload every file in `knowledge/` as Project Knowledge
4. Keep the house display name for each mirror, `Media Editor - <Section> - <Title>.md`, with no version. Replace a refreshed mirror under the same filename, and remove a mirror from the live Project only when its source was renamed or deleted
5. Smoke test `$image`, `$video`, `$audio`, `$hls`, `$repair`, `$interactive` and one ambiguous request
6. Without the tools, confirm the reply leads with the command to run, the destination and the check step, per Custom Instructions Section 5
7. Without the tools, confirm the reply never claims execution, verification or save, never promises a Canvas Artifact and never asks the user to trust an encoder or filter the build may not carry
8. In claude.ai in a browser, ask for an image edit and confirm the reply gives the command first, then offers once to walk you through installing the extension
9. In Claude Desktop with the Media Editor extension installed, run one `$image` request and confirm the reply proposes a readable file name first, then names the tool that ran and the path it returned

## Change checklist

- Update the skill sources first, then copy each changed source over its Project mirror byte for byte
- Hand-write `claude project/Custom Instructions.md` from the skill semantics when scope, routing, tool guidance or delivery behavior changes
- After a kernel change, record the review as a dated sentence in the system `SYNC.md` review notes: who reviewed, what changed, what was decided
- Before live upload, compare every skill source with its Project mirror byte for byte and run the system's parity check from its root:
  - `bash benchmark/parity/run_parity.sh`
- Re-upload changed files to the live Project and confirm the upload took
- Run every `SYNC.md` section 7 drift check before release and confirm all pass

## Known notes

- The Media Editor tools are the Project's only execution. They reach a Project in Claude Desktop through the extension, and claude.ai on the web never gains them
- Project Knowledge may be retrieved as chunks rather than full files, so the Project kernel repeats the core gates and routing contract
- Preserve the no-execution limitation for every reply where no Media Editor tool ran whenever runtime behavior changes
