#!/usr/bin/env python3
# ───────────────────────────────────────────────────────────────
# COMPONENT: HUMAN VOICE REPLY LINTER
# ───────────────────────────────────────────────────────────────

"""Deterministic Human Voice linter for Media Editor replies.

This system has no grader of any kind before this file. Two documents state
output rules a machine can check without judgement: the HVR core card
(`references/hvr-core.md`, loaded on every request) and the Interactive
Intelligence formatting rules (`references/interactive-intelligence.md`,
section 7). This walks a run's captured replies, checks each one against that
stated vocabulary, writes `hvr-lint.csv` beside them and returns an exit code
that means something.

What this deliberately does not check, so a green run is not read as more than
it is: Oxford comma (a comma-before-and inside a list and a comma-before-and
joining two independent clauses are the same three characters, and telling
them apart needs a parse this gate does not attempt), asterisk emphasis (the
card bans it in delivered output, but this system's own kernel delivery
protocol requires bold field labels such as `**Run this:**`, so a blanket ban
would fail the shape the kernel itself mandates), title-case headings (FFmpeg,
HLS, MP4 and JPEG are correctly capitalised acronyms this system's headings
use constantly, and a case heuristic cannot tell an acronym from a title-cased
word without a dictionary this gate does not carry), and every soft deduction
and context-dependent word in the full EN standard, which that document itself
marks ON_DEMAND rather than loaded on every request. A linter that flagged
these would be checking a rule this system did not ask to be checked this way.

Extraction confidence is carried through rather than hidden, adapted to what
this system actually produces. There is no harness wrapper here the way an
opencode transcript has one: the closest equivalent is the ffmpeg command
block a skill-runtime reply carries inline. `ffmpeg`'s own `-filter_complex`
syntax uses a semicolon to separate filter chains (see the HLS multi-quality
recipe), so linting a semicolon ban against the raw reply would fail on a
correct command rather than a voice violation. Fenced and inline code spans
are stripped before the prose checks run. A reply with no code in it at all
returns "high" confidence. A reply that carried a command block returns
"medium": the prose that is left has been through a extra step, and the
counts still stand.

A single file is accepted with `--brief`, printing one line rather than a
table, so a per-scenario capture step can report what it just wrote without
embedding a JSON reader in shell.

Usage:
  lint_replies.py <run report dir or replies dir>
  lint_replies.py <file> --brief
"""
import csv
import re
import sys
from pathlib import Path

# ───────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ───────────────────────────────────────────────────────────────

TEXT_SUFFIXES = {".txt", ".md"}

# references/hvr-core.md section 3, "HARD BLOCKER WORDS", loaded on every
# request. Verbatim list, not a paraphrase, so a finding here can be checked
# against the card by eye.
HARD_BLOCKER_WORDS = [
    "delve", "embark", "realm", "tapestry", "illuminate", "unveil", "elucidate", "abyss",
    "revolutionise", "game-changer", "groundbreaking", "cutting-edge", "ever-evolving",
    "shed light", "dive deep", "leverage", "foster", "nurture", "resonate", "empower",
    "disrupt", "curate", "harness", "elevate", "robust", "seamless", "holistic", "synergy",
    "unpack", "paradigm", "enlightening", "esteemed", "remarkable", "skyrocket",
    "skyrocketing", "utilize", "utilizing",
]

# references/hvr-core.md section 4, "HARD BLOCKER PHRASES". "Navigating the
# [X]" is the card's own placeholder for any object, so it is matched as a
# pattern rather than the literal bracketed text.
HARD_BLOCKER_PHRASES = [
    "It's important to", "It's worth noting", "It goes without saying",
    "At the end of the day", "Moving forward", "In today's world",
    "In today's digital landscape", "When it comes to", "Dive into", "I'd love to",
    "That being said", "Having said that", "Let me be clear", "The reality is",
    "Here's the thing", "In a world where", "You're not alone", "The real question is",
    "Here's what you need to know", "What most people don't realise is", "The truth is",
]

FENCE = re.compile(r"```.*?```", re.S)
INLINE_CODE = re.compile(r"`[^`\n]*`")
ANSI = re.compile(r"\x1b\[[0-9;]*m")

NAVIGATING_THE_X = re.compile(r"\bnavigating the \[?[a-z0-9_-]+\]?", re.I)
NOT_JUST_X_BUT = re.compile(r"\bnot (?:just|only) .{1,40}?\bbut\b", re.I)
BULLET_FULL_STOP = re.compile(r"^[ \t]*[-*][ \t]+.*[^\s]\.[ \t]*$", re.M)
HORIZONTAL_DIVIDER = re.compile(r"^[ \t]*(-{3,}|\*{3,}|_{3,})[ \t]*$", re.M)
CURLY_QUOTES = re.compile("[‘’“”]")
ELLIPSIS = re.compile(r"\.\.\.|…")
EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000026FF\U00002700-\U000027BF\U0001F1E6-\U0001F1FF]"
)

# ───────────────────────────────────────────────────────────────
# 2. CORE LOGIC
# ───────────────────────────────────────────────────────────────


def extract_prose(raw: str):
    """Return (prose_text, confidence), code spans removed before linting.

    Fenced and inline code are replaced with a single space rather than
    deleted outright, so a word split across a removed span cannot fuse into
    a new word that was never written.
    """
    text = ANSI.sub("", raw)
    text, n_fence = FENCE.subn(" ", text)
    text, n_inline = INLINE_CODE.subn(" ", text)
    confidence = "high" if (n_fence == 0 and n_inline == 0) else "medium"
    return text, confidence


def samples(pattern, text, n=2):
    """Return up to n context snippets around matches of pattern in text."""
    out = []
    for m in pattern.finditer(text):
        s = text[max(0, m.start() - 25): m.end() + 25].replace("\n", " ")
        out.append(s.strip())
        if len(out) >= n:
            break
    return out


def lint(text: str):
    """Hard violations only. This system's always-loaded card states no soft tier."""
    v = []

    def add(kind, pattern):
        hits = list(pattern.finditer(text))
        if hits:
            v.append({"type": kind, "severity": "hard", "count": len(hits), "samples": samples(pattern, text)})

    def add_max(kind, pattern, maximum):
        hits = list(pattern.finditer(text))
        if len(hits) > maximum:
            v.append({
                "type": kind, "severity": "hard", "count": len(hits),
                "samples": samples(pattern, text),
            })

    add("em_dash", re.compile("—"))
    add("semicolon", re.compile(";"))
    add("curly_quote", CURLY_QUOTES)
    add("bullet_ends_in_full_stop", BULLET_FULL_STOP)
    add("horizontal_divider", HORIZONTAL_DIVIDER)
    add("not_just_x_but_y", NOT_JUST_X_BUT)
    add("navigating_the_x", NAVIGATING_THE_X)
    add_max("ellipsis_over_one_per_piece", ELLIPSIS, 1)
    add_max("emoji_over_one_per_piece", EMOJI, 1)
    for word in HARD_BLOCKER_WORDS:
        add(f"hard_blocker_word:{word}", re.compile(r"\b" + re.escape(word) + r"\b", re.I))
    for phrase in HARD_BLOCKER_PHRASES:
        add(f"hard_blocker_phrase:{phrase}", re.compile(re.escape(phrase), re.I))
    return v


def lint_file(path: Path) -> dict:
    """Lint one reply file and return its result row."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    prose, confidence = extract_prose(raw)
    violations = lint(prose)
    hard = [v for v in violations if v["severity"] == "hard"]
    return {
        "file": path.name,
        "clean": not hard,
        "hard_violations": len(hard),
        "violations": ", ".join(f"{v['type']}x{v['count']}" for v in violations) or "none",
        "extraction_confidence": confidence,
    }


def replies_dir(target: Path) -> Path:
    """The directory holding reply files, given either it or the run root."""
    if (target / "replies").is_dir():
        return target / "replies"
    return target


def main(argv) -> int:
    """Lint one file or every reply under a directory and return the exit status."""
    if len(argv) < 2:
        print("usage: lint_replies.py <run report dir or replies dir>", file=sys.stderr)
        return 64
    brief = "--brief" in argv[1:]
    args = [a for a in argv[1:] if not a.startswith("--")]
    if not args:
        print("usage: lint_replies.py <run report dir or replies dir>", file=sys.stderr)
        return 64
    target = Path(args[0]).resolve()

    if target.is_file():
        row = lint_file(target)
        if brief:
            print("clean" if row["clean"] else f"HVR {row['violations']}")
        else:
            print(f"  {row['file']}  {'clean' if row['clean'] else 'DIRTY'}  {row['violations']}")
        return 0 if row["clean"] else 1

    if not target.is_dir():
        print(f"{target} is not a directory, so no reply was read", file=sys.stderr)
        return 2
    directory = replies_dir(target)
    rows = [lint_file(p) for p in sorted(directory.iterdir())
            if p.is_file() and p.suffix in TEXT_SUFFIXES]
    if not rows:
        print(f"no reply files under {directory}, so nothing was linted", file=sys.stderr)
        return 2

    out = directory.parent / "hvr-lint.csv"
    with out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    width = max(len(r["file"]) for r in rows)
    for r in rows:
        print(f"  {r['file'].ljust(width)}  {'clean' if r['clean'] else 'DIRTY'}  {r['violations']}")
    dirty = [r for r in rows if not r["clean"]]
    print(f"  {len(rows) - len(dirty)} clean of {len(rows)}, written to {out.name}")
    if dirty:
        print(f"FAILED {len(dirty)} reply/replies carry an HVR hard blocker")
        return 1
    print("PASSED every reply clean of HVR hard blockers")
    return 0

# ───────────────────────────────────────────────────────────────
# 3. ENTRY POINT
# ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sys.exit(main(sys.argv))
