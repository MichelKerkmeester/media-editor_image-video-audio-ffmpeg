---
title: "Tasks: Media Editor FFmpeg Fallback"
description: "Wire an explicit MCP-down falls back to Terminal FFmpeg path into the Media Editor skill and its claude project mirror."
importance_tier: "high"
contextType: "implementation"
---
<!-- SPECKIT_LEVEL: 3 -->
# Tasks: Media Editor FFmpeg Fallback

- [x] T001 Read the real Imagician and Video-Audio MCP tool surfaces in `sk-media-editor/references/` to establish the real covered-versus-not-covered operation split for D002, before writing any fallback language.
- [x] T002 Rewrite the Tool Verification Gate in `sk-media-editor/SKILL.md` so an unavailable Imagician or Video-Audio server falls back to Terminal FFmpeg for that operation, with FFmpeg itself still a real blocking condition if it is also unavailable.
- [x] T003 Update the Operating Modes table and any routing pseudocode in `SKILL.md` that hardcodes one bound tool per mode, to reflect the fallback.
- [x] T004 Fix the reversed Integration Points statement ("use the Video-Audio MCP server... when FFmpeg is unavailable") to state the correct direction, and add the covered-versus-not-covered scope from T001.
- [x] T005 Update `claude project/Custom Instructions.md`: Advisory-only truth, Tool reality first rule, the STEP 2 verification language and the Attestation tool field, to describe the same fallback as guidance for the chat-advisory surface.
- [x] T006 Add a response-disclosure rule (D003): any answer that used the fallback states plainly it ran via Terminal FFmpeg, not the named MCP server.
- [x] T007 Add an MCP-down-falls-back-to-FFmpeg smoke case to `claude project/README.md`'s Smoke Matrix.
- [x] T008 Version bump every changed source file, re-mirror knowledge files with `cp -L`, refresh the sha256-16 checksum manifest, confirm the row count matches the live file count.
- [x] T009 Add a changelog entry to `sk-media-editor/changelog/` per create-changelog format.
- [x] T010 Update `SYNC.md` if it names the old blocking-only behavior anywhere.
- [x] T011 Re-read both surfaces end to end for internal consistency (fallback direction and covered-operations scope must agree everywhere they are stated).
- [x] T012 Record receipts in this phase folder.
