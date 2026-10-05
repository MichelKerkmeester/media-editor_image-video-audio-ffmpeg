#!/usr/bin/env python3
# ───────────────────────────────────────────────────────────────
# COMPONENT: RULE PARITY GATE
# ───────────────────────────────────────────────────────────────

"""Hold each named Media Editor rule on both sides of its declared pair.

This system has no gate that reads what a document says. The parity wrappers
in `benchmark/parity/` exec into the shared gate, which counts documents and
checks inventory. Neither reads wording, so a rule can be tightened in a skill
source and left stale in its Project mirror, or the other way round, with
every existing check still green.

This gate names the phrases that carry a rule and requires the same count on
both sides of every declared pair that teaches it. Asymmetry is the finding: a
pair where neither side carries a phrase simply does not teach that rule, and
that is not a gap.

Counting rather than testing presence is the point. A rule stated twice in a
source and once in its mirror is what a presence test calls agreement. Phrases
are verbatim spans, never patterns, so a reader can grep the source for the
same string this gate reads. Where the exact wording is itself the thing being
governed, the span runs the whole sentence rather than a fragment a mirror
could extend with a qualifier while the count still holds.

Pairs come from the shared declaration at `z — Claude Project Sync Loop/systems.py` rather
than a locally built map, because that file is the one place all eight
systems' pairs are written down and the fleet gates already read it there.
This system ships no source map of its own to read instead.

Measured against the live tree, all seven declared pairs hold byte-identical
content on both sides, so every count below starts equal. That is a true
statement about today's tree, not a property this gate assumes. The gate still
runs the comparison rather than trusting it, because an equal count today says
nothing about a mirror edited tomorrow.

A count cannot see a retired name, because a name restored on both sides of a
pair is agreement by count. So the gate also scans every declared pair, the
skill, the bootstrap, the kernel and the two metadata files for the names of
the two third-party servers this system no longer uses, and any hit fails.

Usage:
  rule_parity.py            -> check every declared pair, exit 1 on any finding
"""
import os
import re
import sys

# ───────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ───────────────────────────────────────────────────────────────

HERE = os.path.dirname(os.path.abspath(__file__))
CW = os.environ.get("CW_ROOT") or os.path.dirname(os.path.dirname(HERE))
KNOWLEDGE = os.path.join(CW, "claude project", "knowledge")
SKILL_ROOT = os.path.join(CW, "sk-media-editor")
SYSTEM_ID = "media-editor"

# Each rule names what carries it and how many declared pairs teach it today.
#
# `phrases` are verbatim spans, read out of the live documents rather than
# retyped from memory, and checked once against the source files before this
# dict was written so a transcription slip could not masquerade as drift.
#
# `min_pairs` is how many of the seven declared pairs teach the rule as
# measured against the live tree. A rule that moves from one declared pair to
# another leaves every per-pair count equal on both sides, agreement by the
# count check alone, so the floor is what notices a rule leaving the pair that
# used to carry it. A rise is not a failure, it means the number was updated
# on purpose after reading why it changed.
RULES = {
    # Every operational document restates the route order before any promise:
    # the Media Editor tools when they are available, then installed ffmpeg,
    # then advice that runs nothing. The route word is "available", never
    # "connected", because the mirrored documents are shared with the Project
    # and stay transport-neutral about how the tools are reached. Five of the
    # seven pairs carry it in five distinct sentences, one per document, which
    # is why the rule needs five phrases rather than one repeated string. Each
    # span keeps the tools-first clause, so a mirror that drops back to an
    # ffmpeg-only check is caught. Re-measured when the tools reference became
    # the eighth pair: still five, because that reference states none of the
    # five sentences, and the renamed operation references kept theirs word
    # for word. Still five when the setup reference joined, since it guides
    # installs and states no route rule.
    "the tool check gates every operation, tools first": {
        "phrases": (
            "When the Media Editor tools are available, use them: they bring their own ffmpeg, "
            "and `media_health` reports what it can do.",
            "If neither the tools nor the check answers, give the command as advice with install "
            "guidance and run nothing.",
            "Use `video_hls_ladder` when the Media Editor tools are available. Otherwise verify "
            "FFmpeg before all operations with `ffmpeg -version`.",
            "Tool check first: use the Media Editor tools when they are available, otherwise confirm "
            "`ffmpeg -version` answers in the runtime before any operation",
            "**Tool check first:** never process without confirming a route: the Media Editor tools "
            "when available, otherwise ffmpeg on the path.",
        ),
        "min_pairs": 5,
    },
    "no format or filter promised before a build check": {
        "phrases": ("Encoder availability varies by build.",),
        "min_pairs": 2,
    },
    "no horizontal dividers in a reply": {
        "phrases": (
            "No dividers. Never use horizontal lines in responses",
            "Use horizontal dividers or decorative lines",
        ),
        "min_pairs": 1,
    },
    "one comprehensive question, then wait": {
        "phrases": (
            "One comprehensive question: ask for all information at once",
            "Wait for the response: never proceed without user input",
        ),
        "min_pairs": 1,
    },
    "the export destination convention": {
        "phrases": ("Write one result to `media files/export/[readable-name].[ext]` in the runtime",),
        "min_pairs": 2,
    },
}

# The names of the two third-party MCP servers this system replaced with its
# own. Zero tolerance: a hit anywhere in the scanned files is a finding. The
# spellings are listed one by one rather than as a loose `video.audio`
# pattern, so `video-and-audio-operations` never matches. `video-audio` must
# stand alone, because the repository's own name, `image-video-audio-ffmpeg`,
# carries it inside a longer hyphenated word.
RETIRED_NAMES = (
    ("Imagician", re.compile(r"imagician", re.I)),
    ("MCP Video Audio", re.compile(r"mcp[- ]video[- ]audio", re.I)),
    ("video-audio", re.compile(r"(?<![\w-])video-audio(?![\w-])", re.I)),
)

# Read beside every declared pair. Paths are relative to this system's root.
RETIRED_NAME_FILES = (
    "AGENTS.md",
    os.path.join("sk-media-editor", "SKILL.md"),
    os.path.join("sk-media-editor", "graph-metadata.json"),
    os.path.join("claude project", "Custom Instructions.md"),
)

# ───────────────────────────────────────────────────────────────
# 2. HELPERS
# ───────────────────────────────────────────────────────────────


def declared_pairs(system_id=SYSTEM_ID):
    """This system's mirror-to-source pairs, read from the shared declaration.

    `z — Claude Project Sync Loop/systems.py` is the one place all eight systems' pairs are
    written down, and one process outside this lane owns that file. This reads
    it as source text with bytecode caching disabled, the way the fleet gates
    read it, rather than importing it as a module, which would leave a
    compiled cache behind in a directory this lane does not own for a file it
    was told never to write to. The file is opened for reading only, once,
    and nothing here holds it open or rewrites it.
    """
    sys.dont_write_bytecode = True
    declaration = os.path.join(os.path.dirname(CW), "z — Claude Project Sync Loop", "systems.py")
    with open(declaration, encoding="utf-8") as handle:
        source = handle.read()
    namespace = {"__file__": declaration, "__name__": "systems"}
    exec(compile(source, declaration, "exec"), namespace)  # noqa: S102  read-only declaration data
    systems = namespace["SYSTEMS"]
    if system_id not in systems:
        raise SystemExit(f"'{system_id}' is not declared in {declaration}")
    return dict(systems[system_id]["pairs"])


def body(path, drop_frontmatter=False):
    """The document's text, or None when it cannot be read.

    Skill sources carry YAML frontmatter. Project mirrors are meant to drop it
    on upload, so a rule phrase sitting inside a source's frontmatter would
    count on one side only and report drift in packaging working as intended.
    Dropping it here removes that trap before it can fire rather than after.
    Measured today, this system's mirrors keep the frontmatter block byte for
    byte, so the strip is a guard against a future upload change, not a
    correction to a present mismatch.
    """
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
    except OSError:
        return None
    if drop_frontmatter and text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            text = text[end + 4:]
    return text


def inside(root, path):
    """Whether a resolved path stays under root, checked lexically.

    A declared source path may be a symlink into the shared `z — Knowledge`
    tree. Resolving a path before comparing it would follow such a link
    outside the skill root and reject it as an escape, taking its rule counts
    down with it. What actually needs blocking is a declared path climbing out with `..` or
    naming an absolute path elsewhere, and `abspath` normalises both without
    following a symlink.
    """
    root = os.path.abspath(root)
    target = os.path.abspath(path)
    return target == root or target.startswith(root + os.sep)



def retired_name_findings(paths):
    """One finding per retired name per file, with the first line it sits on.

    An unreadable file is a finding too, since a scan that skips what it
    cannot open would pass on exactly the file it was meant to read.
    """
    findings = []
    for path in paths:
        text = body(path)
        if text is None:
            findings.append(f"{os.path.relpath(path, CW)}: cannot be read, so it was not scanned for retired names")
            continue
        for label, pattern in RETIRED_NAMES:
            hits = list(pattern.finditer(text))
            if hits:
                line = text.count("\n", 0, hits[0].start()) + 1
                findings.append(
                    f"retired name {label}: {len(hits)}x in {os.path.relpath(path, CW)}, first at line {line}"
                )
    return findings

# ───────────────────────────────────────────────────────────────
# 3. CORE LOGIC
# ───────────────────────────────────────────────────────────────


def main() -> int:
    """Compare every declared pair against every rule and return the exit status."""
    try:
        pairs = declared_pairs()
    except (OSError, KeyError) as exc:
        print(f"could not read the declared pairs: {exc}", file=sys.stderr)
        return 2
    if not pairs:
        print("no declared pairs, so no rule could be compared", file=sys.stderr)
        return 2

    findings, taught, compared = [], {name: 0 for name in RULES}, 0
    scanned = [os.path.join(CW, rel) for rel in RETIRED_NAME_FILES]
    # systems.py keys each pair by the Project mirror filename and gives the
    # skill-relative source as the value, so the loop reads mirror, source in
    # that order rather than the other way round.
    for mirror, source in sorted(pairs.items()):
        source_path = os.path.join(SKILL_ROOT, source)
        mirror_path = os.path.join(KNOWLEDGE, mirror)
        if not inside(SKILL_ROOT, source_path):
            findings.append(f"{source}: the declaration points outside the skill root, so this pair was not compared")
            continue
        if not inside(KNOWLEDGE, mirror_path):
            findings.append(f"{mirror}: the declaration points outside the knowledge root, so this pair was not compared")
            continue
        scanned += [source_path, mirror_path]
        left = body(source_path, drop_frontmatter=True)
        right = body(mirror_path)
        if left is None or right is None:
            missing = source if left is None else mirror
            findings.append(f"{missing}: cannot be read, so this pair was not compared")
            continue
        compared += 1
        for name, rule in RULES.items():
            pair_teaches = False
            for phrase in rule["phrases"]:
                here, there = left.count(phrase), right.count(phrase)
                if here or there:
                    pair_teaches = True
                if here != there:
                    findings.append(
                        f"{name}: `{phrase}` appears {here}x in {source} and {there}x in its mirror {mirror}"
                    )
            if pair_teaches:
                taught[name] += 1

    for name, rule in RULES.items():
        if taught[name] < rule["min_pairs"]:
            findings.append(
                f"{name}: taught by {taught[name]} pair(s) and {rule['min_pairs']} are declared, "
                "so the rule left a pair that used to carry it"
            )

    retired = retired_name_findings(scanned)
    findings.extend(retired)

    print(f"  pairs: {compared} of {len(pairs)} declared pairs compared")
    print(f"  retired names: {len(scanned)} files scanned, {len(retired)} finding(s)")
    for name, rule in RULES.items():
        print(f"  {name}: taught by {taught[name]} pair(s), {rule['min_pairs']} declared")

    if findings:
        print(f"FAILED {len(findings)} rule parity finding(s)")
        for finding in findings:
            print(f" - {finding}")
        return 1
    print(f"PASSED {len(RULES)} rules hold on both sides of every pair that teaches them")
    return 0

# ───────────────────────────────────────────────────────────────
# 4. ENTRY POINT
# ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sys.exit(main())
