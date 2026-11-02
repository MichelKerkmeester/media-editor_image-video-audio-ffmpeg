# --- fence 0 ---
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent
RESOURCE_BASES = (SKILL_ROOT / "references", SKILL_ROOT / "assets")
DEFAULT_RESOURCE = "references/interactive-intelligence.md"

INTENT_MODEL = {
    "IMAGE": {"commands": ["$image", "$img"], "keywords": [("image", 4), ("photo", 3), ("jpeg", 3), ("png", 3), ("webp", 3), ("avif", 3), ("resize", 3), ("crop", 3)]},
    "VIDEO": {"commands": ["$video", "$vid"], "keywords": [("video", 4), ("mp4", 3), ("mov", 3), ("transcode", 3), ("trim", 3), ("overlay", 3), ("subtitle", 3)]},
    "AUDIO": {"commands": ["$audio", "$aud"], "keywords": [("audio", 4), ("mp3", 3), ("aac", 3), ("wav", 3), ("extract audio", 4), ("silence", 3)]},
    "HLS": {"commands": ["$hls"], "keywords": [("hls", 4), ("streaming", 3), ("adaptive", 3), ("m3u8", 3), ("playlist", 3), ("segment", 3)]},
    "REPAIR": {"commands": ["$repair", "$r"], "keywords": [("repair", 4), ("broken", 3), ("corrupted", 3), ("recover", 3)]},
}

RESOURCE_MAP = {
    "IMAGE": ["references/mcp-imagician.md"],
    "VIDEO": ["references/mcp-video-audio.md"],
    "AUDIO": ["references/mcp-video-audio.md"],
    "HLS": ["assets/hls-video-conversion.md"],
    "REPAIR": ["references/interactive-intelligence.md"],
}

TOOL_MAP = {
    "IMAGE": "imagician",
    "VIDEO": "video-audio",
    "AUDIO": "video-audio",
    "HLS": "ffmpeg",
    "REPAIR": "auto",
}

ALWAYS = ["references/media-framework.md", "references/human-voice-rules.md"]

UNKNOWN_FALLBACK_CHECKLIST = [
    "Confirm the media type: image, video, audio or HLS",
    "Confirm the file location, current format and approximate size",
    "Confirm the processing goal and target use case",
    "Ask one comprehensive question, then wait",
]

def _guard_in_skill(relative_path: str) -> str:
    resolved = (SKILL_ROOT / relative_path).resolve()
    resolved.relative_to(SKILL_ROOT)
    if resolved.suffix.lower() != ".md":
        raise ValueError(f"Only markdown resources are routable: {relative_path}")
    return resolved.relative_to(SKILL_ROOT).as_posix()

def discover_markdown_resources() -> set[str]:
    docs = []
    for base in RESOURCE_BASES:
        if base.exists():
            docs.extend(path for path in base.rglob("*.md") if path.is_file())
    return {doc.relative_to(SKILL_ROOT).as_posix() for doc in docs}

def detect_intent(text: str):
    text_lower = (text or "").lower()
    for intent, cfg in INTENT_MODEL.items():
        if any(command in text_lower for command in cfg["commands"]):
            return intent, "command"
    scores = {}
    for intent, cfg in INTENT_MODEL.items():
        scores[intent] = sum(weight for keyword, weight in cfg["keywords"] if keyword in text_lower)
    best = max(scores, key=scores.get)
    return (best, "semantic") if scores[best] > 0 else (None, "fallback")

def route_media_editor_resources(user_request: str):
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
    if intent is None:
        load_if_available(DEFAULT_RESOURCE)
        return {"intent": "INTERACTIVE", "tool": "auto", "source": source,
                "needs_disambiguation": True, "disambiguation_checklist": UNKNOWN_FALLBACK_CHECKLIST,
                "resources": loaded}

    tool = TOOL_MAP[intent]
    verify_tool_connection(tool)  # BLOCKING before any operation
    for reference in RESOURCE_MAP.get(intent, []):
        load_if_available(reference)
    return {"intent": intent, "tool": tool, "source": source, "resources": loaded}

