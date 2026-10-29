---
title: "sk-media-editor Router"
description: "Sibling router for sk-media-editor: the phase detection, the command table, the resource domains and the loading levels a reader parses first."
trigger_phrases:
  - "sk-media-editor router"
  - "sk-media-editor routing"
importance_tier: normal
contextType: general
version: 1.0.0.0
router_state: active
skill_pointer: SKILL.md
---

# sk-media-editor Router

The machine router for [`SKILL.md`](./SKILL.md). `SKILL.md` keeps the short routing prose and the
link that points here; this file holds the routing detail and the machine-readable declaration a
reader parses to decide what loads.

---

## 1. OVERVIEW

A request to convert, compress, resize, crop, trim, transcode, extract audio from or stream an existing image, video or audio file reaches sk-media-editor, and this router binds it to one of the Image, Video, Audio, HLS, Repair or Interactive modes. Each mode loads its own lane from `references/` and `assets/` on top of the always-loaded MEDIA framework, and every operation takes the first available route: the `media-editor` command, then local ffmpeg, then advice.

The router answers one question: given a request, which skill-local resources load, in what order, and what happens when nothing matches. `references/router-contract.md` holds the same router as running Python, and the benchmark gates hold it equal to `benchmark/router/route_contract.py`.

---

## 2. INTENT MODEL

### Phase detection

Resolve the route in a fixed order, then load only what the bound mode needs.

1. **Tokenize and match exactly.** Extract complete `$token`s and match them against the command table. Only a whole token counts, so `$img` never fires inside a longer word and a bare alias is never a substring hit
2. **One primary mode, command wins.** An explicit command selects the mode outright and overrides every natural-language signal, so `$audio from this video` binds AUDIO, not VIDEO. With two commands, the first one in the text wins. With no command, score keywords on word boundaries (`photo` matches "a photo" but never "photography") and take the single highest-scoring mode. No second mode loads a second resource pack
3. **Check the route.** Run `media-editor health` once and, when it answers, use the command. Otherwise confirm `ffmpeg -version` answers and run ffmpeg. When neither is available, advise: give the exact command, where the result lands and what to check, and say plainly that nothing ran
4. **Disambiguate once when unsure.** A request with no command and no keyword hit routes to Interactive Mode: ask one comprehensive question covering media type, file, goal and output, then wait. Never invent the media type
5. **Load the lane.** Load the ALWAYS set plus the bound mode's resources only, discovered and guarded at call time

### Smart Router Pseudocode

`references/router-contract.md` carries this router as running Python, the exact algorithm `benchmark/router/route_contract.py` is checked against: the command and keyword tables, the tool group and local fallback each mode binds, the command-then-ffmpeg-then-advice route check and guarded resource loading through `discover_markdown_resources`, `_guard_in_skill` and the `UNKNOWN_FALLBACK_CHECKLIST` an unmatched request gets. It is ON_DEMAND, read only when a request needs the precise behavior rather than the rule.

---

## 3. MACHINE ROUTER

The machine-readable projection of the intent model above, moved verbatim from `SKILL.md`: the command table, the resource domains and the loading levels. This section is the last in the file.

### Primary detection signal

Detect the media task before loading references.

```text
$image | $img            -> Image Mode  -> image_* tools, else ffmpeg
$video | $vid            -> Video Mode  -> video_* tools, else ffmpeg
$audio | $aud            -> Audio Mode  -> audio_* tools, else ffmpeg
$hls                     -> HLS Mode    -> video_hls_ladder, else ffmpeg
$repair | $r             -> Repair Mode -> media_probe then media_repair, else ffprobe then ffmpeg
$interactive | $int      -> Interactive -> one question, then the bound mode's route
two commands             -> the first one in the text wins
no command, keyword hit  -> semantic detection by media type
ambiguous                -> Interactive Mode (one comprehensive question)
```

### Resource domains

The router discovers markdown resources recursively from `references/` and `assets/` and then applies intent scoring.

```text
references/...   operating docs: MEDIA framework, interactive intelligence, tool-first operation references, the tools catalogue, the command reference, the router contract
assets/...       copy and apply material: HLS conversion with video_hls_ladder and the ffmpeg command pack
```

- `references/` for the MEDIA framework, interactive intelligence, the image and the video and audio operation references, the tools catalogue, the command reference and the router contract
- `assets/` for HLS conversion and reusable batch scripts

### Resource loading levels

| Level | When to load | Resources |
| --- | --- | --- |
| ALWAYS | Every skill invocation | `references/media-framework.md` |
| CONDITIONAL | If intent signals match | `references/image-operations.md`, `references/video-and-audio-operations.md`, `assets/hls-video-conversion.md`, `references/interactive-intelligence.md` |
| ON_DEMAND | Only on explicit request | `references/tools.md` for a tool's parameters, defaults, consent rule or error code, `references/setup.md` when the command is missing or the user asks how to install it, `references/cli.md` for the command's arguments, output, exit codes, previews and the batch pattern, and `references/router-contract.md` for the exact routing algorithm |
