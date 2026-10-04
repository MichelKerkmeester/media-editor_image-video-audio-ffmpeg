---
title: "Media Editor - Router Contract"
description: "The Smart Router as running Python: exact command tokens, word-boundary keyword scoring, one primary mode, the tool group and local fallback each mode binds, the route check and guarded resource loading, expressed as the exact algorithm benchmark/router/route_contract.py is checked against. SKILL.md carries the prose summary this file backs. ON_DEMAND for a reader who needs the precise behavior rather than the rule."
contextType: implementation
importance_tier: normal
trigger_phrases:
  - "router contract"
  - "smart router pseudocode"
  - "exact routing algorithm"
  - "media editor routing code"
  - "route_contract.py"
version: 1.7.0.0
---

# Media Editor - Router Contract

The Smart Router expressed as running Python, one level below the prose routing rules in `SKILL.md` Section 2.

**Loading Condition:** ON-DEMAND
**Purpose:** Provides the exact router algorithm, command tokens, keyword scoring, tool binding, the route check and resource loading, for a reader who needs the precise behavior rather than the summarized rule
**Scope:** Command detection, keyword scoring, the tool group and local fallback per mode, the tools-then-ffmpeg-then-advice route check, the disambiguation checklist and guarded resource loading
**Output Path:** None. This file decides which resources a request loads and which route runs it, and writes no artifact
**Loads With:** nothing. It is read alone, one level below the prose routing rules in `SKILL.md` Section 2, when a request needs the exact algorithm rather than the rule
**Routed By:** nothing automatic. A reader opens it deliberately, and `benchmark/router/differential.py` extracts its Python fence on every gate run to prove `benchmark/router/route_contract.py` never drifts from it
**Hands Off To:** nothing. It is the leaf authority that `SKILL.md` Section 2 summarizes, and the resource map inside it names the reference each mode loads

---

## 1. OVERVIEW

### Purpose

This is the algorithm the routing prose in `SKILL.md` summarizes, and the exact source `benchmark/router/differential.py` executes to prove `benchmark/router/route_contract.py` never drifts from it. The Claude Project kernel ends with the same code minus its comments, under `## 8. ROUTER CODE`.

### Host calls

The code calls three names it does not define, because each one is an action of the host rather than a routing decision:

- `load(path)` reads a resource. In a Claude Project it means consulting the uploaded Knowledge document with the matching name
- `media_tools_connected()` is true when the Media Editor tools are listed and `media_health` answers
- `verify_ffmpeg()` is true when `ffmpeg -version` answers on the path. A Claude Project cannot run it, so there it is always false

---

## 2. ROUTER ALGORITHM

### Smart Router Pseudocode

```python
import re
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent
RESOURCE_BASES = (SKILL_ROOT / "references", SKILL_ROOT / "assets")

# A command names its mode outright. Keywords score on word boundaries, a media
# noun at 4 and a format or operation word at 3, and table order breaks a tie.
# Interactive carries commands and no keywords, because it is where a request
# with no signal lands rather than something a word can score.
INTENT_MODEL = {
    "IMAGE": {"commands": ["$image", "$img"], "keywords": [("image", 4), ("photo", 3), ("jpeg", 3), ("png", 3), ("webp", 3), ("avif", 3), ("resize", 3), ("crop", 3)]},
    "VIDEO": {"commands": ["$video", "$vid"], "keywords": [("video", 4), ("mp4", 3), ("mov", 3), ("transcode", 3), ("trim", 3), ("overlay", 3), ("subtitle", 3)]},
    "AUDIO": {"commands": ["$audio", "$aud"], "keywords": [("audio", 4), ("mp3", 3), ("aac", 3), ("wav", 3), ("extract audio", 4), ("silence", 3)]},
    "HLS": {"commands": ["$hls"], "keywords": [("hls", 4), ("streaming", 3), ("adaptive", 3), ("m3u8", 3), ("playlist", 3), ("segment", 3)]},
    "REPAIR": {"commands": ["$repair", "$r"], "keywords": [("repair", 4), ("broken", 3), ("corrupted", 3), ("recover", 3)]},
    "INTERACTIVE": {"commands": ["$interactive", "$int"], "keywords": []},
}

COMMANDS = {command: intent for intent, cfg in INTENT_MODEL.items() for command in cfg["commands"]}

RESOURCE_MAP = {
    "IMAGE": ["references/image-operations.md"],
    "VIDEO": ["references/video-and-audio-operations.md"],
    "AUDIO": ["references/video-and-audio-operations.md"],
    "HLS": ["assets/hls-video-conversion.md"],
    "REPAIR": ["references/interactive-intelligence.md"],
    "INTERACTIVE": ["references/interactive-intelligence.md"],
}

# The tool group each mode calls when the Media Editor tools are connected, and
# the local tool it falls back to when they are not. Audio also reaches
# media_remove_silence, which sits outside the audio_* names. Interactive binds
# neither until its one question names the media type.
TOOL_MAP = {
    "IMAGE": "image_*",
    "VIDEO": "video_*",
    "AUDIO": "audio_*",
    "HLS": "video_hls_ladder",
    "REPAIR": "media_probe then media_repair",
    "INTERACTIVE": "auto",
}
FALLBACK_MAP = {
    "IMAGE": "ffmpeg",
    "VIDEO": "ffmpeg",
    "AUDIO": "ffmpeg",
    "HLS": "ffmpeg",
    "REPAIR": "ffprobe then ffmpeg",
    "INTERACTIVE": None,
}

ALWAYS = ["references/media-framework.md", "references/hvr-core.md"]

UNKNOWN_FALLBACK_CHECKLIST = [
    "Confirm the media type: image, video, audio or HLS",
    "Confirm the file location, current format and approximate size",
    "Confirm the processing goal and target use case",
    "Ask one comprehensive question, then wait",
]

def _guard_in_skill(relative_path: str) -> str:
    # .absolute() (not .resolve()) keeps a linked leaf lexical, so a link that
    # sits inside SKILL_ROOT is judged by where it sits, not where it points.
    resolved = (SKILL_ROOT / relative_path).absolute()
    resolved.relative_to(SKILL_ROOT.absolute())
    if resolved.suffix.lower() != ".md":
        raise ValueError(f"Only markdown resources are routable: {relative_path}")
    return resolved.relative_to(SKILL_ROOT.absolute()).as_posix()

def discover_markdown_resources() -> set:
    docs = []
    for base in RESOURCE_BASES:
        if base.exists():
            docs.extend(path for path in base.rglob("*.md") if path.is_file())
    return {doc.relative_to(SKILL_ROOT).as_posix() for doc in docs}

_TOKEN_RE = re.compile(r"\$[a-z]+")  # whole $tokens only, never substrings

def detect_intent(text: str):
    text_lower = (text or "").lower()
    # The first command in the text wins, wherever its mode sits in the table,
    # so "$aud strip the track from this $video" binds AUDIO.
    for token in _TOKEN_RE.findall(text_lower):
        if token in COMMANDS:
            return COMMANDS[token], "command"
    scores = {
        intent: sum(
            weight for keyword, weight in cfg["keywords"]
            if re.search(r"\b" + re.escape(keyword) + r"\b", text_lower)  # word boundary, not substring
        )
        for intent, cfg in INTENT_MODEL.items()
    }
    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best, "semantic"
    return "INTERACTIVE", "fallback"

def choose_route() -> str:
    # The first available route wins. The tools route runs the mode's tool
    # group, the ffmpeg route runs its fallback, and advice runs nothing and
    # says so, so a missing tool never turns into a claimed result.
    if media_tools_connected():  # media_health is listed and answers
        return "tools"
    if verify_ffmpeg():  # `ffmpeg -version` answers
        return "ffmpeg"
    return "advice"

def route_media_editor_resources(user_request: str) -> dict:
    inventory = discover_markdown_resources()
    loaded = []
    seen = set()

    def load_if_available(relative_path: str):
        guarded = _guard_in_skill(relative_path)
        if guarded in inventory and guarded not in seen:
            load(guarded)
            loaded.append(guarded)
            seen.add(guarded)

    for reference in ALWAYS:
        load_if_available(reference)

    intent, source = detect_intent(user_request)
    for reference in RESOURCE_MAP[intent]:
        load_if_available(reference)

    result = {"intent": intent, "route": choose_route(), "tool": TOOL_MAP[intent],
              "fallback": FALLBACK_MAP[intent], "source": source,
              "needs_disambiguation": intent == "INTERACTIVE", "resources": loaded}
    if result["needs_disambiguation"]:
        result["disambiguation_checklist"] = UNKNOWN_FALLBACK_CHECKLIST
    return result
```
