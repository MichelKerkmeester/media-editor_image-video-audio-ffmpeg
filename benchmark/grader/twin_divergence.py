#!/usr/bin/env python3
# ───────────────────────────────────────────────────────────────
# COMPONENT: TWIN DIVERGENCE REPORT
# ───────────────────────────────────────────────────────────────

"""Report scenario twins whose two packagings disagreed in a run.

The manual testing playbook (`sk-media-editor/manual-testing-playbook/`) runs
its scenarios twice over, a skill set against the skill in a real terminal
and a project set against the claude.ai Project, because the system ships from one source of truth in two
packagings and only a live run shows whether they actually agree. A rule can
be stated once, read by both, and still land differently: the skill
can write a real file and describe it, and the Project without the
Media Editor tools can only hand back a command, so the same request should
produce a recognisably different reply shape on each side while agreeing on
the substance the playbook's own contract fields state (mode, tool, whether a
file was produced). No static check reads two live conversations, so this
comparison is the only instrument this system has for that.

Unlike a scheme where the two packagings share a category code (an `SXX-NNN`
skill row and a `PXX-NNN` project row naming the same category letters), this
playbook's own category letters do not line up: command routing is `SCR` on
the skill side and `PRP` on the project side, and HLS is `SHL` against `PHL`.
A regex over the id cannot recover that mapping, so the pairing below is
declared by hand, read out of the playbook's own "Identity handover rule"
section and the scenario contracts whose `Prompt:` field is character-for-
character identical across a skill row and a project row. That is exactly the
shape `z — Claude Project Sync Loop/systems.py` itself is built on: a map that could silently
match nothing if it were derived is written down instead, so a renamed or
added scenario fails loudly here rather than pairing with the wrong row or
quietly not pairing at all.

Some scenarios test something only one runtime can produce (`STV-001` needs a
real ffmpeg binary to be missing, `SED-001` needs a real file on disk,
`SRO-002` needs a terminal ffmpeg with the command off the PATH, `STV-002` and
`STV-003` need the Claude Code plugin, `SCR-004`, `SCR-005` and `SRM-001`
have no Project row with the same prompt, `PGD-001` and `PNE-001` test the
Project's chat-only limits, `PSB-002` is a size escalation the skill in a
real terminal would simply process, `PRM-001` asks with `$repair` where its skill
counterpart tests the `$r` alias, `PRO-002` needs claude.ai in a browser,
where the tools cannot run, and `SED-004` asks the batch through `$image`
where `PED-001` replays the live request without a command, so no prompt
matches). These are declared
unpaired rather than left to fall out of a failed match, so a scenario the
playbook never intended to twin is never reported as one packaging running
ahead of the other.

A pair is the unit: a scenario run on one packaging only is unpaired, never
counted as agreeing, because a comparison that quietly drops half its input
reports agreement it never measured.

Two of the six twin pairs (`SAI-001`/`PAI-001` and `SSB-001`/`PSB-001`) are
two-turn scenarios in this playbook's own conversation chains. A result
recorded after only the first turn is evidence about that turn and nothing
else, so any row whose result is not exactly `PASS`, `FAIL` or `SKIP`, the
three verdicts this playbook's own review protocol names, is treated as not
settled and is never compared. Two such rows matching would be agreement
about an outcome neither run finished reaching.

Rows whose id does not match this playbook's `[SP][A-Z]{2}-\\d{3}` shape (a
re-run or a diagnostic append a suffix of their own) are excluded from pairing
and listed, since they are a version of a scenario rather than a packaging's
answer to one.

Exit codes:
  0  every paired twin agreed
  1  at least one pair disagreed
  2  no results file, or nothing in it that could be paired

Usage:
  twin_divergence.py <run report dir, or a results.csv>
"""
import csv
import re
import sys
from pathlib import Path

# ───────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ───────────────────────────────────────────────────────────────

ID = re.compile(r"^([SP])([A-Z]{2})-(\d{3})$")
VERDICTS = {"PASS", "FAIL", "SKIP"}

# Declared by hand against the playbook, not derived from the id shape. See
# the module docstring for why: the category letters do not agree between a
# skill row and its project twin (SCR/PRP, SHL/PHL), so a regex would have to
# guess. Keys are the skill-side id, values the project-side id it answers.
TWIN_PAIRS = {
    "SID-001": "PID-001",  # Identity handover, the named precondition for each set
    "SCR-002": "PRP-001",  # Identical prompt on both sides: "$audio from this video"
    "SAI-001": "PAI-001",  # Identical prompt on both sides: "make this file work better"
    "SSB-001": "PSB-001",  # Generation-request refusal, an identical prompt on both sides
    "SHL-001": "PHL-001",  # Identical prompt on both sides: "$hls Convert this keynote recording"
    "SRO-001": "PRO-001",  # Identical prompt, the media-editor command in Claude Code and the connected tools in Claude Desktop
    "SCR-003": "PRP-002",  # Identical prompt on both sides: "$aud strip the track from this $video"
}

# Ids the playbook itself declares as answerable by only one runtime. See the
# module docstring for why each one cannot have a twin.
UNPAIRED_IDS = {
    "SCR-001", "STV-001", "SED-001", "SED-002", "SED-003", "SRO-002",  # Skill-only
    "SCR-004", "SCR-005", "STV-002", "STV-003", "SRM-001", "SED-004",  # Skill-only
    "PGD-001", "PNE-001", "PSB-002", "PRM-001", "PRO-002", "PED-001",  # Project-only
}

# ───────────────────────────────────────────────────────────────
# 2. HELPERS
# ───────────────────────────────────────────────────────────────


def rows(path: Path):
    """Return the parsed rows of a results CSV."""
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))

# ───────────────────────────────────────────────────────────────
# 3. CORE LOGIC
# ───────────────────────────────────────────────────────────────


def main(argv) -> int:
    """Compare settled twin pairs and return the process exit status."""
    if len(argv) < 2:
        print("usage: twin_divergence.py <run report dir, or a results.csv>", file=sys.stderr)
        return 64
    target = Path(argv[1]).resolve()
    results = target / "results.csv" if target.is_dir() else target
    if not results.is_file():
        print(f"no results file at {results}, so no twin was compared", file=sys.stderr)
        return 2

    by_id, variants = {}, []
    for row in rows(results):
        row_id = (row.get("id") or "").strip()
        if not ID.match(row_id):
            variants.append(row_id or "?")
            continue
        by_id[row_id] = row

    if not by_id:
        print(f"no rows in {results.name} carry a recognised scenario id, so nothing was compared", file=sys.stderr)
        return 2

    known = set(TWIN_PAIRS) | set(TWIN_PAIRS.values()) | UNPAIRED_IDS
    unknown = sorted(set(by_id) - known)

    disagreed, agreed, unpaired, unsettled = [], [], [], []
    for skill_id, project_id in sorted(TWIN_PAIRS.items()):
        skill_row, project_row = by_id.get(skill_id), by_id.get(project_id)
        if skill_row is None and project_row is None:
            continue
        if skill_row is None or project_row is None:
            present_id = project_id if skill_row is None else skill_id
            unpaired.append((f"{skill_id}/{project_id}", present_id))
            continue
        skill_result = (skill_row.get("result") or "").strip()
        project_result = (project_row.get("result") or "").strip()
        if skill_result not in VERDICTS or project_result not in VERDICTS:
            unsettled.append((f"{skill_id}/{project_id}", skill_result, project_result))
            continue
        pair_key = f"{skill_id}/{project_id}"
        (agreed if skill_result == project_result else disagreed).append(
            (pair_key, skill_result, project_result)
        )

    solo_seen = sorted(UNPAIRED_IDS & set(by_id))
    for key, skill_result, project_result in disagreed:
        print(f"  {key}: skill {skill_result}, Project {project_result}")
    print(f"  {len(agreed)} twin(s) agreed, {len(disagreed)} disagreed, "
          f"{len(unsettled)} not settled, {len(unpaired)} run on one packaging only")
    if unsettled:
        print("  not settled: " + ", ".join(
            f"{k} (skill {s or '(none)'}, Project {p or '(none)'})" for k, s, p in unsettled
        ))
    if unpaired:
        print("  unpaired: " + ", ".join(f"{k} ({present})" for k, present in unpaired))
    if solo_seen:
        print(f"  single-runtime by design, no twin to compare: {', '.join(solo_seen)}")
    if variants:
        print("  variants not paired: " + ", ".join(variants))
    if unknown:
        print("  ids not in the declared twin scheme, so not compared: " + ", ".join(unknown))

    if disagreed:
        print(f"FAILED {len(disagreed)} twin(s) disagreed across packagings")
        return 1
    print("PASSED every paired twin agreed")
    return 0

# ───────────────────────────────────────────────────────────────
# 4. ENTRY POINT
# ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sys.exit(main(sys.argv))
