#!/usr/bin/env python3
# ───────────────────────────────────────────────────────────────
# COMPONENT: ROUTE CONTRACT
# ───────────────────────────────────────────────────────────────

"""Deterministic route contract for the Barter Media Editor.

Characterizes a request into one stable route object so mode routing,
tool binding and disambiguation behavior are testable without invoking a
model. This is the executable oracle the skill and project kernels are
written against; it is not a claim about what claude.ai executes
internally.

The contract fixes the observed failure class: substring alias matching
(a command like `$audio` matched by an `in` check, or a keyword like
`photo` matched inside `photography`) must never select a mode. Only a
complete `$token` and a word-boundary keyword can. Explicit commands win
over natural-language scoring, so `$audio from this video` binds AUDIO,
never VIDEO. Every decision here is deterministic and fixture-checkable.

Python 3.9 compatible.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ───────────────────────────────────────────────────────────────
# 1. TOKEN TABLES (EXACT, DELIMITER-AWARE MATCHES ONLY)
# ───────────────────────────────────────────────────────────────

# Explicit mode commands. These win over any natural-language signal.
MODE_COMMANDS: Dict[str, str] = {
    "$image": "IMAGE", "$img": "IMAGE",
    "$video": "VIDEO", "$vid": "VIDEO",
    "$audio": "AUDIO", "$aud": "AUDIO",
    "$hls": "HLS",
    "$repair": "REPAIR", "$r": "REPAIR",
    "$interactive": "INTERACTIVE", "$int": "INTERACTIVE",
}

# Natural-language mode signals (word-boundary, not substring). Weights follow
# the skill's INTENT_MODEL: a concrete media noun scores 4, a format/operation
# word scores 3.
MODE_SIGNALS: Dict[str, Dict[str, float]] = {
    "IMAGE": {"image": 4, "photo": 3, "jpeg": 3, "png": 3, "webp": 3,
              "avif": 3, "resize": 3, "crop": 3},
    "VIDEO": {"video": 4, "mp4": 3, "mov": 3, "transcode": 3, "trim": 3,
              "overlay": 3, "subtitle": 3},
    "AUDIO": {"audio": 4, "mp3": 3, "aac": 3, "wav": 3, "extract audio": 4,
              "silence": 3},
    "HLS": {"hls": 4, "streaming": 3, "adaptive": 3, "m3u8": 3,
            "playlist": 3, "segment": 3},
    "REPAIR": {"repair": 4, "broken": 3, "corrupted": 3, "recover": 3},
}

# Tool binding per mode. The tool is the Media Editor tool group the mode calls
# when the tools are connected, and the fallback is the local tool it runs when
# they are not. Interactive binds neither until its one question names the
# media type. Which route is live (the command line, connected tools, local
# ffmpeg or advice) is a runtime concern and is intentionally not simulated
# here. This contract fixes only the routing decision.
TOOL_MAP: Dict[str, str] = {
    "IMAGE": "image_*",
    "VIDEO": "video_*",
    "AUDIO": "audio_*",
    "HLS": "video_hls_ladder",
    "REPAIR": "media_probe then media_repair",
    "INTERACTIVE": "auto",
}
FALLBACK_MAP: Dict[str, Optional[str]] = {
    "IMAGE": "ffmpeg",
    "VIDEO": "ffmpeg",
    "AUDIO": "ffmpeg",
    "HLS": "ffmpeg",
    "REPAIR": "ffprobe then ffmpeg",
    "INTERACTIVE": None,
}

# ───────────────────────────────────────────────────────────────
# 2. ROUTE OBJECT SCHEMA (FIXED FIELD SET; UNKNOWN OR DUPLICATE FIELDS REJECT)
# ───────────────────────────────────────────────────────────────

ROUTE_FIELDS = [
    "mode", "tool", "fallback", "source", "needs_disambiguation", "resources",
]

MODE_VALUES = ["IMAGE", "VIDEO", "AUDIO", "HLS", "REPAIR", "INTERACTIVE"]
TOOL_VALUES = ["image_*", "video_*", "audio_*", "video_hls_ladder",
               "media_probe then media_repair", "auto"]
FALLBACK_VALUES = [None, "ffmpeg", "ffprobe then ffmpeg"]
SOURCE_VALUES = ["command", "semantic", "fallback"]

# ───────────────────────────────────────────────────────────────
# 3. RUNTIME DISCOVERY AND GUARDED LOADING (RESILIENT ROUTER MECHANICS)
# ───────────────────────────────────────────────────────────────

# Resource names below are resolved against the actual skill inventory at every
# call, so a renamed or deleted reference degrades to a smaller resource set
# instead of a dead path or a crash. This mirrors the canonical smart-router
# resilience pattern: discover, guard, dedupe, fall back.
SKILL_ROOT = Path(__file__).resolve().parent.parent.parent / "sk-media-editor"
RESOURCE_BASES = ("references", "assets")

ALWAYS = ["references/media-framework.md"]
RESOURCE_MAP: Dict[str, List[str]] = {
    "IMAGE": ["references/image-operations.md"],
    "VIDEO": ["references/video-and-audio-operations.md"],
    "AUDIO": ["references/video-and-audio-operations.md"],
    "HLS": ["assets/hls-video-conversion.md"],
    "REPAIR": ["references/interactive-intelligence.md"],
    "INTERACTIVE": ["references/interactive-intelligence.md"],
}

# One comprehensive intake question governs every ambiguous turn: the router
# asks once, then waits, and never invents the media type.
DISAMBIGUATION_CHECKLIST = [
    "Confirm the media type: image, video, audio or HLS",
    "Confirm the file location, current format and approximate size",
    "Confirm the processing goal and target use case",
    "Ask one comprehensive question, then wait",
]


def discover_resource_inventory() -> set:
    """Return routable markdown paths under references/ and assets/.

    Returns package-relative posix paths (for example
    ``references/media-framework.md``) so the maps above resolve directly.
    A missing base contributes nothing instead of raising.
    """
    inventory = set()
    for base_name in RESOURCE_BASES:
        base = SKILL_ROOT / base_name
        if not base.exists():
            continue
        for path in base.rglob("*.md"):
            if path.is_file():
                inventory.add(path.relative_to(SKILL_ROOT).as_posix())
    return inventory


def guard_resources(names: List[str], inventory: set) -> List[str]:
    """Keep only resources that exist in the current inventory, dedupe, keep order."""
    seen = set()
    kept = []
    for name in names:
        if name in inventory and name not in seen:
            seen.add(name)
            kept.append(name)
    return kept


# ───────────────────────────────────────────────────────────────
# 4. TOKENIZATION + DETECTION
# ───────────────────────────────────────────────────────────────

_TOKEN_RE = re.compile(r"\$[a-z]+")


def tokenize(text: str) -> List[str]:
    """Return every exact `$token` in the request, case-normalized."""
    return _TOKEN_RE.findall((text or "").lower())


def detect_command(text: str) -> Optional[str]:
    """Explicit mode command, if any. Only exact full-token matches count."""
    for tok in tokenize(text):
        if tok in MODE_COMMANDS:
            return MODE_COMMANDS[tok]
    return None


def score_modes(text: str) -> Dict[str, float]:
    """Word-boundary keyword scores per mode. Never substring."""
    lowered = (text or "").lower()
    scores: Dict[str, float] = {mode: 0.0 for mode in MODE_SIGNALS}
    for mode, signals in MODE_SIGNALS.items():
        for keyword, weight in signals.items():
            if re.search(r"\b" + re.escape(keyword) + r"\b", lowered):
                scores[mode] += weight
    return scores


def detect_mode(text: str) -> Tuple[str, str]:
    """Resolve one primary mode and how it was found.

    An explicit command wins outright; otherwise the highest word-boundary
    keyword score wins; a request with neither falls back to INTERACTIVE so
    the router asks one comprehensive question instead of guessing.
    """
    command = detect_command(text)
    if command:
        return command, "command"
    scores = score_modes(text)
    best = max(scores, key=lambda mode: scores[mode])
    if scores[best] > 0:
        return best, "semantic"
    return "INTERACTIVE", "fallback"


def resources_for(mode: str) -> List[str]:
    """Return the resource list for a mode, guarded against the live inventory."""
    inventory = discover_resource_inventory()
    return guard_resources(list(ALWAYS) + RESOURCE_MAP.get(mode, []), inventory)


# ───────────────────────────────────────────────────────────────
# 5. ROUTE RESOLUTION + SCHEMA VALIDATION
# ───────────────────────────────────────────────────────────────

def route_request(text: str) -> Dict[str, Any]:
    """Return the route object for a request text."""
    mode, source = detect_mode(text)
    return {
        "mode": mode,
        "tool": TOOL_MAP[mode],
        "fallback": FALLBACK_MAP[mode],
        "source": source,
        "needs_disambiguation": mode == "INTERACTIVE",
        "resources": resources_for(mode),
    }


def validate_route_object(obj: Dict[str, Any]) -> List[str]:
    """Reject unknown or duplicate fields and invalid enum values.

    Returns a list of violations (empty when the object is schema-valid).
    """
    errors: List[str] = []
    if not isinstance(obj, dict):
        return ["route object is not a dict"]
    if list(obj.keys()) != ROUTE_FIELDS:
        missing = [f for f in ROUTE_FIELDS if f not in obj]
        extra = [k for k in obj if k not in ROUTE_FIELDS]
        if missing:
            errors.append(f"missing fields: {missing}")
        if extra:
            errors.append(f"unknown fields: {extra}")
    if obj.get("mode") not in MODE_VALUES:
        errors.append(f"bad mode: {obj.get('mode')}")
    if obj.get("tool") not in TOOL_VALUES:
        errors.append(f"bad tool: {obj.get('tool')}")
    if obj.get("source") not in SOURCE_VALUES:
        errors.append(f"bad source: {obj.get('source')}")
    if obj.get("fallback") not in FALLBACK_VALUES:
        errors.append(f"bad fallback: {obj.get('fallback')}")
    if not isinstance(obj.get("needs_disambiguation"), bool):
        errors.append("needs_disambiguation must be a bool")
    if not isinstance(obj.get("resources"), list):
        errors.append("resources must be a list")
    return errors


# ───────────────────────────────────────────────────────────────
# 6. FIXTURE RUNNER
# ───────────────────────────────────────────────────────────────

def load_fixtures(path: str) -> List[Dict[str, Any]]:
    """Return the fixture list read from a JSON manifest."""
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _check_duplicate_json_keys(path: str) -> List[str]:
    """Reject duplicate keys inside any single JSON object in the fixture file.

    json.load silently keeps the last duplicate, which would let a typo'd
    override pass; scan per object so the manifest cannot drift silently.
    """
    def _pairs(pairs):
        seen = {}
        for k, v in pairs:
            if k in seen:
                raise ValueError(f"duplicate key {k!r} in object")
            seen[k] = v
        return seen

    errors = []
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()
    try:
        json.loads(raw, object_pairs_hook=_pairs)
    except ValueError as exc:
        errors.append(str(exc))
    return errors


def run_fixtures(fixtures: List[Dict[str, Any]], source_path: Optional[str] = None) -> Tuple[int, List[str]]:
    """Run every fixture and return the failure count and one line per failure.

    Args:
        fixtures: Each fixture's input text and its expected route fields.
        source_path: Fixture manifest path, scanned for duplicate keys when given.
    """
    failures: List[str] = []
    if source_path:
        failures.extend(_check_duplicate_json_keys(source_path))
    for idx, fx in enumerate(fixtures, start=1):
        inp = fx["input"]
        expect = fx["expect"]
        unknown = [k for k in expect if k not in ROUTE_FIELDS]
        if unknown:
            failures.append(f"fixture {idx} unknown expect fields: {unknown}")
        actual = route_request(inp)
        schema_errors = validate_route_object(actual)
        if schema_errors:
            failures.append(f"fixture {idx} schema: {schema_errors}")
            continue
        for field in ROUTE_FIELDS:
            if field not in expect:
                continue
            if actual.get(field) != expect[field]:
                failures.append(
                    f"fixture {idx} field {field}: expected {expect[field]!r}, got {actual.get(field)!r}"
                )
    return len(failures), failures

# ───────────────────────────────────────────────────────────────
# 7. ENTRY POINT
# ───────────────────────────────────────────────────────────────


def main(argv: List[str]) -> int:
    """Inspect one request, self-check, or run a fixtures file and return the exit status."""
    if len(argv) != 2:
        print("usage: route_contract.py <request-or-fixtures.json | --self-check>")
        return 2
    arg = argv[1]
    if arg == "--self-check":
        sample = route_request("optimize this file")
        errs = validate_route_object(sample)
        print(json.dumps(sample, indent=2, ensure_ascii=False))
        return 0 if not errs else 1
    # A path to a fixtures file runs the gate; anything else is a single request
    # to inspect. Branch on the filesystem so a request string never falls into
    # the fixture loader (open() would raise instead of routing).
    if not Path(arg).is_file():
        obj = route_request(arg)
        errs = validate_route_object(obj)
        print(json.dumps(obj, indent=2, ensure_ascii=False))
        if errs:
            print("SCHEMA ERRORS:", errs, file=sys.stderr)
            return 1
        return 0
    try:
        fixtures = load_fixtures(arg)
    except json.JSONDecodeError as exc:
        print(f"invalid fixtures JSON: {exc}", file=sys.stderr)
        return 2
    count, failures = run_fixtures(fixtures, arg)
    if failures:
        print(f"FAILED {count}/{len(fixtures)}")
        for f in failures:
            print(" -", f)
        return 1
    print(f"PASSED {len(fixtures)}/{len(fixtures)} fixtures")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
