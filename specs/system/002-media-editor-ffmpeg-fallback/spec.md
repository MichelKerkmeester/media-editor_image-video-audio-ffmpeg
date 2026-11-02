---
title: "023 - Media Editor FFmpeg Fallback [002-media-editor-ffmpeg-fallback/spec]"
description: 'The Media Editor skill''s Tool Verification Gate is unconditionally blocking for image and video/audio operations: "When a required tool is unavailable, stop, report the connecti...'
importance_tier: "normal"
contextType: "general"
---
# 023 - Media Editor FFmpeg Fallback

## Problem

The Media Editor skill's Tool Verification Gate is unconditionally blocking for image and video/audio operations: "When a required tool is unavailable, stop, report the connection status in plain language and provide setup guidance." Imagician (images) and Video-Audio (video, audio) each have exactly one bound tool with no fallback. The one existing fallback statement in the package runs the opposite direction from what is needed (`sk-media-editor/SKILL.md` Integration Points: "use the Video-Audio MCP server for standard single-quality conversion when FFmpeg is unavailable"). HLS already routes to Terminal FFmpeg exclusively, proving the CLI runtime already has an FFmpeg execution path, just not one wired as a fallback for the other two modes.

The owner wants the reverse fallback made explicit: when Imagician or Video-Audio is not connected, the CLI runtime falls back to driving Terminal FFmpeg directly for that operation instead of stopping.

## Scope

`/Users/michelkerkmeester/MEGA/Development/AI_Systems/Barter/Media Editor/`, both packagings:
- `sk-media-editor/SKILL.md` (Tool Verification Gate, Operating Modes table, Integration Points, any routing pseudocode that hardcodes a single bound tool per mode)
- `sk-media-editor/references/` and `assets/` (only if a referenced file also states the blocking-only behavior, for example the HLS conversion recipe file's framing of FFmpeg as HLS-only)
- `claude project/Custom Instructions.md` (Tool reality first rule, the Attestation tool field, the STEP 2 verification language, the Advisory-only truth statement, since the chat-advisory surface must describe the same fallback behavior even though it cannot execute either path itself)
- `claude project/README.md` (Smoke Matrix, add an MCP-down-falls-back-to-FFmpeg check)
- `SYNC.md` (drift checks, if any name the old blocking-only behavior)

## Decisions

- **D001 Fallback direction.** Imagician down for an image operation, or Video-Audio down for a video or audio operation, falls back to Terminal FFmpeg for that operation instead of blocking. FFmpeg availability itself still gates: if FFmpeg is also unavailable, the existing blocking behavior applies and the response says so plainly (both surfaces down is a real stop condition, not silently degraded).
- **D002 Scope of the fallback.** The fallback covers the operations Terminal FFmpeg can actually perform (format conversion, resize, crop, compress, basic transforms). Operations that only Imagician or Video-Audio exposes as a distinct API surface (if any exist, confirm by reading the real MCP tool lists in `references/`) are named explicitly as not covered by the fallback, rather than silently promising parity.
- **D003 Disclosure.** Every response that used the fallback path states plainly that it ran via Terminal FFmpeg rather than the named MCP server, matching the existing house rule against promising a capability the bound tool cannot deliver.
- **D004 claude project parity.** The chat-advisory `Custom Instructions.md` describes the same fallback as guidance (it cannot execute either path), so a user reading the claude.ai Project gets the same mental model as a CLI operator.
- **D005 Protocol.** Standard fleet change protocol: source fix in the skill, version bump on every changed source file, mirror rename and recopy with `cp -L` for changed knowledge files, sha256-16 manifest refresh, changelog entry in `sk-media-editor/changelog/` per create-changelog format, SYNC.md and README fact updates in the same pass.

## Verification

- Read the real Imagician and Video-Audio MCP tool lists (`references/`) before writing the fallback scope, so D002's covered-versus-not-covered split is accurate, not assumed.
- Manifest checksum count matches before and after (currently 8/8 per the prior parity review, confirm the live count).
- No change to the HLS mode, which already routes to FFmpeg exclusively.
- Re-read both surfaces end to end for internal consistency: the Tool Verification Gate, the Operating Modes table, Integration Points and the Custom Instructions Tool reality first rule must all agree on the same fallback direction and the same covered-operations scope.

## Out of scope

Any other Barter system. The sync compiler work running in parallel this session. Actual MCP server code (this changes skill and kernel documentation and routing logic only).
