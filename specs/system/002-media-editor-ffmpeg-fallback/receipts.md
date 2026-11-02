# Receipts: 023 - Media Editor FFmpeg Fallback

Executed 2026-07-18. Scope confined to `Media Editor/`. No other Barter system touched. No git commit run.

## Owner Request

The AI should fall back to Terminal FFmpeg when an MCP server is unavailable (Imagician for images, Video-Audio for video and audio) instead of blocking. The prior Tool Verification Gate was unconditionally blocking, and the one existing fallback statement ran the opposite direction (FFmpeg-unavailable falls back to Video-Audio MCP). HLS is out of scope and still runs on Terminal FFmpeg exclusively.

## T001 Finding: Real MCP-vs-Terminal-FFmpeg Operation Split (D002)

Read from `sk-media-editor/references/mcp-imagician.md` (v0.211) and `sk-media-editor/references/mcp-video-audio.md` (v0.212) before writing any fallback language.

Headline: no operation either MCP server exposes is genuinely impossible in Terminal FFmpeg. The real split is core-transforms-clean versus convenience-degrades. The gap is packaging convenience and preset calibration, not raw capability.

Covered by the FFmpeg fallback (genuine substitute):
- Imagician (Sharp engine): format conversion (JPEG, PNG, WebP, AVIF), resize, crop, compress, rotate, flip. All have direct FFmpeg equivalents. Metadata read maps to `ffprobe`.
- Video-Audio (`@misbahsy/video-audio-mcp`) is itself an FFmpeg wrapper, so every operation it exposes is by construction an FFmpeg command line: format conversion and transcode, trim, concatenate, speed change, resolution, aspect ratio, codec, bitrate, frame rate, audio extraction, audio format conversion.

Not covered at parity by the fallback (named explicitly, not silently promised):
- Imagician single-call batch arrays become a scripted loop of separate FFmpeg invocations, not one atomic call.
- Imagician quality presets run on Sharp. FFmpeg quality scales (-q:v, -crf, libwebp -quality) differ, so output size and quality will not match the preset numbers exactly.
- Imagician EXIF orientation auto-correction is automatic in Sharp but needs an explicit FFmpeg transpose.
- Video-Audio convenience/advanced tools (auto-tuned `remove_silence`, named fade and transition effects, text and image overlays, subtitles, b-roll insertion) are FFmpeg-doable only through hand-built filtergraphs, not a single named call with sensible defaults.

Genuinely MCP-only capabilities the fallback cannot cover: none. (Both servers' own "cannot do" lists, such as AI generation, are also outside FFmpeg and outside Media Editor scope anyway.)

## Files Touched

Authoritative skill source (`Media Editor/sk-media-editor/`):
- `SKILL.md` — version 1.1.0 -> 1.2.0. Non-negotiables line, MEDIA Flow STEP 2, Tool Verification Gate (rewritten to MCP-first with FFmpeg fallback, block only if both down, plus disclosure), Operating Modes table (Tool column now shows fallback), Smart Router pseudocode (new `FALLBACK_MAP`, new `resolve_tool_with_fallback` helper replacing the hardcoded blocking `verify_tool_connection(tool)` call, updated route return), RULES (ALWAYS 1 rewritten, new ALWAYS 8 disclosure, NEVER 2 extended, ESCALATE 2 rewritten), Success Criteria gates (Routing/Quality/Blocking wording), Integration Points External Tools (reversed fallback statement corrected) plus a new Fallback Coverage subsection carrying the T001 split.
- `assets/hls-video-conversion.md` — version 0.110 -> 0.111. Reframed the "Cannot do" and "When to use MCP versus terminal" lines so Terminal FFmpeg is no longer cast as HLS-only, and recorded that FFmpeg is the fallback for single-format conversions and editing when the MCP server is down. HLS behavior itself unchanged.
- `README.md` — version 1.1.0.0 -> 1.2.0.0. ASCII gate box (re-padded, byte-aligned), Tool Verification Gate feature row, improvement-protocol prose, tool-not-connected FAQ, and two Troubleshooting rows (the reversed-fallback row corrected, the stop row clarified). Reached through the root `README.md` symlink as well.
- `changelog/v1.2.0.0.md` — new changelog entry per repo create-changelog format (H2 version and date, intro, scope blockquote, `---`, six topic H3 sections separated by `&nbsp;`, no spec-folder paths in prose, house style verified).

Entry wrapper and sync contract (`Media Editor/`):
- `AGENTS.md` — export strict sequence step 1-2, Processing Hierarchy Tool Verification step, and escalation line all moved to MCP-first, FFmpeg-fallback, block-only-if-both-down. Kept aligned with the gate as one contract per SYNC.md.
- `SYNC.md` — INVENTORY block re-pinned (Skill 1.2.0, Custom Instructions 1.1.0 aligned to Skill 1.2.0, Skill mirror v1.2.0.md, HLS mirror v0.111.md). Overview line and Required Parity gate bullet rewritten to the fallback direction.

Advisory Project packaging (`Media Editor/claude project/`):
- `Custom Instructions.md` — version 1.0.1 -> 1.1.0, adapted-from Skill 1.2.0. Advisory-only truth and Tool reality first rules, new Critical Rule 9 (fallback disclosure), Operating Modes Runtime Tool column, new Section 5 Fallback Path subsection (same covered-versus-not-covered split), Section 6 consult bullet, Delivery Protocol Tool field, Attestation footer (new `fallback = [none|Terminal FFmpeg]` field), post-block disclosure sentence, Quality Checklist item, and Escalation trigger.
- `README.md` — structure block filenames, Skill-alignment stamps (v1.2.0), checksum table rows (three changed), and a new Smoke Matrix step 7 for the MCP-down-falls-back-to-FFmpeg case.
- `knowledge/Media Editor - System - Skill - v1.2.0.md` — re-mirrored from SKILL.md with `cp -L`, byte-identical. Superseded `... - v1.1.0.md` removed.
- `knowledge/Media Editor - Reference - HLS Video Conversion - v0.111.md` — re-mirrored from the HLS asset with `cp -L`, byte-identical. Superseded `... - v0.110.md` removed.
- `package-lock.json` — refreshed changed file rows (Custom Instructions, Skill mirror, HLS mirror: path, sha256, sha16, bytes), deletable list renamed, `generatedAt` updated, both generated region hashes (SYNC INVENTORY, README CHECKSUMS) recomputed from final bytes. Valid JSON.

Sync config (`Media Editor/`):
- `claude-project.sync.json` — kernel version 1.0.1 -> 1.1.0, alignedSkillVersion 1.1.0 -> 1.2.0, Skill and HLS mirror targets and versions bumped, `v1.1.0` added to retiredNames. Valid JSON.

Spec folder:
- `tasks.md` — all T001-T012 ticked.
- `receipts.md` — this file.

## Checksum Manifest Result

- Live knowledge file count: 7. Matches declared inventory (7) and `expectedKnowledgeCount` (7).
- Checksum table rows: 8 (7 knowledge mirrors plus Custom Instructions). Three rows changed:
  - Custom Instructions: `a24a88fcdcd30a0b` -> `1ee57079d87bb36a`
  - System - Skill: `0ae1bbef9b45887c` -> `8b915b40224a217d` (v1.1.0 -> v1.2.0)
  - Reference - HLS Video Conversion: `5044382e7ce496dc` -> `7ef6c7b4da9fd07b` (v0.110 -> v0.111)
- Every `package-lock.json` file entry re-verified against live bytes (sha256, sha16, bytes): all OK.
- Both generated region hashes re-verified against live bytes: SYNC INVENTORY and README CHECKSUMS both OK.
- No stale references to the superseded v1.1.0 Skill mirror or v0.110 HLS mirror anywhere outside the historical changelog.

## End-to-End Consistency Check (T011)

Re-read `sk-media-editor/SKILL.md` and `claude project/Custom Instructions.md` in full. They agree on:
- Fallback direction: MCP server preferred, Terminal FFmpeg fallback for image, video and audio when the MCP server is down, block only when both are down.
- HLS exception: Terminal FFmpeg only, no fallback, no MCP path.
- Disclosure (D003): any response or guidance that used the fallback states plainly it ran via Terminal FFmpeg rather than the named MCP server, and never presents an FFmpeg result as MCP output.
- Covered-versus-not-covered scope: identical content in SKILL.md Section 7 Fallback Coverage and Custom Instructions Section 5 Fallback Path.

SYNC.md section 7 drift checks all pass: HVR symlink resolves, all required surfaces exist, knowledge count is 7, MCP servers untouched, SKILL.md within the 3000-line cap (414 lines), no superseded-version residuals. HLS mode behavior unchanged. No git commit was run.

## Orchestrator Follow-Up: Sync Compiler Test Caught A Real Manifest Defect

Running the sync compiler against this package after the agent's pass (`check --system media-editor`) surfaced a genuine bug, not a tool false positive. `claude-project.sync.json`'s `retiredNames` listed `v1.0.0` and `v1.1.0`. The second entry was wrong: the kernel bump this spec performed went `1.0.1` to `1.1.0`, so `v1.0.1` is the version that should retire, not `v1.1.0`, which is the kernel's own new current version. The manifest was self-contradictory, declaring its own live version retired.

Confirmed before fixing: `v1.0.1` had zero live references anywhere in the package (correctly superseded), and `v1.0.0`'s only hit was the manifest's own declaration (expected, not a live leak). Fixed `retiredNames` to `["v1.0.0", "v1.0.1"]`. Re-ran `check --system media-editor`, the `RETIRED_TOKEN_FOUND` finding cleared, leaving only the expected `KERNEL_REVIEW_REQUIRED` gate. Spot-checked the actual kernel content directly (SKILL.md's Tool Verification Gate, Custom Instructions.md's Fallback Path) before recording a review, both surfaces genuinely agree on fallback direction, the HLS exception, the disclosure rule and the identical covered-versus-not-covered scope. Recorded the review with `review-kernel --reviewer claude-fable-5`. Final state: `media-editor: clean`, and `check --all` clean across all ten systems.
