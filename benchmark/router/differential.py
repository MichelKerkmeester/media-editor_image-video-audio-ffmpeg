#!/usr/bin/env python3
# ───────────────────────────────────────────────────────────────
# COMPONENT: DIFFERENTIAL GATE
# ───────────────────────────────────────────────────────────────

"""Differential gate between the executable router and the router contract's pseudocode.

`references/router-contract.md` carries the Smart Router pseudocode, the exact
algorithm the routing prose in `SKILL.md` summarizes, and `route_contract.py`
carries the same router as the oracle the fixtures pin. The Claude Project
kernel ends with the same code minus its comments, because the kernel is the
one file a Project reads on every turn while a Knowledge document is retrieved
only by relevance. Copies that nothing executes drift silently, so this gate
executes the pseudocode: the block is lifted out of the markdown, run as a real
module, and compared against the oracle on every fixture input.

Four guards fire, each on its own:

1. Copy parity. The kernel's closing Router Code section is held equal to the
   reference block minus its comments, line for line and as a parsed syntax
   tree, while SKILL.md grows no python fence of its own and no Router
   Contract Knowledge document returns as a second routing copy.
2. Table parity. Commands, keyword weights in table order (order is the score
   tie-break), resource lanes, tool groups, fallbacks, the token pattern and
   the disambiguation checklist must match value for value, so a drifted table
   fails even when no input happens to expose it.
3. Behavior parity. Every input is routed through both, once per host state:
   the command beside ffmpeg, the command with no ffmpeg, the command beside
   connected tools, connected tools alone, local ffmpeg only, and neither. The pseudocode decides the route
   from three host calls, `media_cli_available`, `media_tools_connected` and
   `verify_ffmpeg`, so the gate re-binds all three per state, proves the route
   lands on cli, tools, ffmpeg or advice as that state requires, and proves
   the routing decision itself never changes with the host.
4. Corpus coverage. Every command and alias, every mode by command and by
   keyword, the fallback and the named false prefixes must be exercised, so
   behavior parity cannot pass by leaving a table untested.

The pseudocode names its mode `intent` and reports the live route, which the
oracle deliberately does not simulate. The adapter maps `intent` onto `mode`
and checks `route` separately, and everything else is compared as-is.

Exit codes: 0 every guard passed, 1 a guard failed, 2 an input file is
missing or unreadable.

Python 3.9 compatible.
"""
from __future__ import annotations

import ast
import io
import json
import re
import sys
import tokenize
import types
from pathlib import Path
from typing import Any, Dict, List, Tuple

# ───────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ───────────────────────────────────────────────────────────────

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import route_contract as rc  # noqa: E402  (needs HERE on the path first)

SYSTEM_ROOT = HERE.parent.parent
SKILL_MD = SYSTEM_ROOT / "sk-media-editor" / "SKILL.md"
ROUTER_CONTRACT_MD = SYSTEM_ROOT / "sk-media-editor" / "references" / "router-contract.md"
PROJECT_MD = SYSTEM_ROOT / "claude project" / "Custom Instructions.md"
KNOWLEDGE_ROOT = SYSTEM_ROOT / "claude project" / "knowledge"
FIXTURES_PATH = HERE / "fixtures.json"

# One heading names the code in the contract and the pointer to it in the
# skill and the kernel, so a reader who searches for it lands in all three.
PSEUDOCODE_HEADING = "### Smart Router Pseudocode"
# The kernel's own copy of the router. It carries the code without comments
# because the comments explain the design to a maintainer and change nothing
# a model routes.
KERNEL_ROUTER_HEADING = "## 8. ROUTER CODE"

# Any fence a markdown renderer highlights as python: the aliases, a capital,
# trailing space, four backticks, tildes, up to three spaces of indent and the
# braced executable-cell forms. A guard that names one spelling of the thing it
# forbids only guards against typing that spelling.
PYTHON_FENCE_RE = re.compile(
    r"^[ ]{0,3}(?:`{3,}|~{3,})[ \t]*\{?[ \t]*\.?(?:python|python3|py|py3|ipython|sage)\b",
    re.M | re.I,
)
PYTHON_FENCE_SPELLINGS = (
    "```python", "```py", "```python3", "```py3", "```ipython", "```sage",
    "```Python", "```python ", "````python", "~~~python", "   ```python",
    "```{python}", "``` {.python}",
)

# Host states as (media_cli_available, media_tools_connected, verify_ffmpeg)
# and the route each one must produce. The first available route wins, so the
# media-editor command outranks connected tools and ffmpeg on the path never
# outranks either. "cli available" is the skill's own state, "cli without
# ffmpeg" proves the command route never leans on ffmpeg being on the path,
# "cli beside tools" proves the order when both tool routes answer, and
# "tools connected" is a Project with the extension.
HOST_STATES: Dict[str, Tuple[bool, bool, bool, str]] = {
    "cli available": (True, False, True, "cli"),
    "cli without ffmpeg": (True, False, False, "cli"),
    "cli beside tools": (True, True, True, "cli"),
    "tools connected": (False, True, True, "tools"),
    "ffmpeg only": (False, False, True, "ffmpeg"),
    "neither": (False, False, False, "advice"),
}

# Tokens that look like a command and must never fire one.
REQUIRED_FALSE_PREFIXES = ["$rotate", "$images"]


def refuse(message: str) -> None:
    """Exit 2 naming the input that is missing, never a traceback."""
    print(f"differential input unusable: {message}", file=sys.stderr)
    sys.exit(2)


def read_text(path: Path) -> str:
    """Read one of the gate's inputs, or refuse naming the file."""
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        refuse(f"{path}: {exc.strerror or exc}")
        return ""


# ───────────────────────────────────────────────────────────────
# 2. GUARD 1: LIFT THE PSEUDOCODE AND HOLD THE KERNEL COPY EQUAL
# ───────────────────────────────────────────────────────────────

def extract_block(text: str, heading: str, label: str) -> str:
    """Return the first python block after a heading.

    The heading anchors the search so an unrelated python fence elsewhere in the
    document can never be picked up by accident.
    """
    if heading not in text:
        raise LookupError(f"{label} has no {heading!r} section")
    tail = text[text.index(heading):]
    match = re.search(r"```python\n(.*?)\n```", tail, re.S)
    if not match:
        raise LookupError(f"{label} has no python block under {heading!r}")
    return match.group(1)


def section_body(text: str, heading: str) -> str:
    """Return one heading's own body, ending where the next heading begins."""
    tail = text[text.index(heading) + len(heading):]
    nxt = re.search(r"\n#{2,4} ", tail)
    return tail[:nxt.start()] if nxt else tail


def strip_comments(block: str) -> str:
    """Return a python block with every comment removed and blank runs collapsed.

    The tokenizer finds the comments, so a `#` inside a string or a regex is kept.
    A line left empty by the cut is dropped, and a run of blank lines collapses to
    one, so the result is the code alone in its original order and indentation.
    """
    cuts = {tok.start[0]: tok.start[1]
            for tok in tokenize.generate_tokens(io.StringIO(block).readline)
            if tok.type == tokenize.COMMENT}
    kept: List[str] = []
    for number, line in enumerate(block.split("\n"), 1):
        if number in cuts:
            line = line[:cuts[number]]
            if not line.strip():
                continue
        kept.append(line.rstrip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip("\n")


def check_copy_parity(contract_text: str, kernel_text: str, skill_text: str) -> List[str]:
    """Prove the kernel ends with the reference router minus its comments.

    The copies are compared as bytes after the derivation rather than as
    behavior, because an overwrite with another system's router parses, routes
    and can still agree with a table check while every byte differs.
    """
    failures: List[str] = []

    for spelling in PYTHON_FENCE_SPELLINGS:
        if not PYTHON_FENCE_RE.search(f"{spelling}\nx = 1\n"):
            failures.append(
                f"copy parity: the python fence matcher no longer catches {spelling!r}, so a "
                "router pasted back under that spelling would clear every check below"
            )

    try:
        contract_block = extract_block(contract_text, PSEUDOCODE_HEADING, ROUTER_CONTRACT_MD.name)
    except LookupError as problem:
        return failures + [f"copy parity: {problem}"]

    if PYTHON_FENCE_RE.search(skill_text):
        failures.append(
            "copy parity: SKILL.md carries a python fence, so the router exists in a copy "
            f"no guard executes and no guard compares against {ROUTER_CONTRACT_MD.name}"
        )
    pasted = sorted({
        f"def {node.name}(" for node in ast.parse(contract_block).body
        if isinstance(node, ast.FunctionDef) and f"def {node.name}(" in skill_text
    })
    if pasted:
        failures.append(
            f"copy parity: SKILL.md carries the contract's own definitions {pasted}, so the "
            "router is inlined under a fence tag no list anticipates, or under none at all"
        )

    kernel_fences = len(PYTHON_FENCE_RE.findall(kernel_text))
    if kernel_fences != 1:
        failures.append(
            f"copy parity: the kernel carries {kernel_fences} python fences where it carries "
            f"exactly one, the router under {KERNEL_ROUTER_HEADING!r}"
        )
    try:
        kernel_block = extract_block(kernel_text, KERNEL_ROUTER_HEADING, "the kernel")
    except LookupError as problem:
        failures.append(f"copy parity: {problem}")
        kernel_block = None
    if kernel_block is not None:
        expected_block = strip_comments(contract_block)
        if kernel_block != expected_block:
            drift = next((index for index, (have, want) in enumerate(
                zip(kernel_block.splitlines(), expected_block.splitlines()), 1)
                if have != want),
                min(len(kernel_block.splitlines()), len(expected_block.splitlines())) + 1)
            failures.append(
                f"copy parity: the kernel's router is not {ROUTER_CONTRACT_MD.name}'s router with "
                f"its comments removed, first difference at code line {drift}, so the Project "
                "routes from a copy this gate never executed"
            )
        elif ast.dump(ast.parse(kernel_block)) != ast.dump(ast.parse(contract_block)):
            failures.append(
                "copy parity: removing the comments changed the router's syntax tree, so the "
                "kernel's copy no longer means what the reference means"
            )

    # A Router Contract Knowledge document would be a second router, retrieved by
    # relevance and compared against nothing.
    stale = sorted(path.name for path in KNOWLEDGE_ROOT.glob("*.md")
                   if "Router Contract" in path.name)
    if stale:
        failures.append(
            f"copy parity: the knowledge root holds {stale}, and the kernel's router code "
            "is the Project's only routing copy"
        )

    pointers = (
        ("the kernel", kernel_text, "Router Code"),
        ("SKILL.md", skill_text, f"references/{ROUTER_CONTRACT_MD.name}"),
    )
    for label, text, target in pointers:
        if PSEUDOCODE_HEADING not in text:
            failures.append(
                f"copy parity: {label} has no {PSEUDOCODE_HEADING!r} pointer, so the router "
                "code is named by nothing a model reads"
            )
        elif target not in section_body(text, PSEUDOCODE_HEADING):
            failures.append(
                f"copy parity: {label}'s {PSEUDOCODE_HEADING.strip('# ')} section never names "
                f"{target}, so the routing authority is unreachable from it"
            )
    return failures


def build_skill_router(contract_text: str) -> types.ModuleType:
    """Execute the router contract's pseudocode as a module.

    `load` is a side effect rather than a routing decision, so it is stubbed.
    The three host calls do decide the route, so they start unbound and each
    behavior check binds them to one host state. `__file__` points at SKILL.md,
    a sibling of the `references/` and `assets/` folders the block's own
    resource discovery walks.
    """
    module = types.ModuleType("media_editor_pseudocode_router")
    module.__dict__.update({
        "__file__": str(SKILL_MD),
        "load": lambda relative_path: None,
    })
    source = extract_block(contract_text, PSEUDOCODE_HEADING, ROUTER_CONTRACT_MD.name)
    exec(compile(source, f"{ROUTER_CONTRACT_MD.name}::pseudocode", "exec"), module.__dict__)
    return module


# ───────────────────────────────────────────────────────────────
# 3. GUARD 2: TABLE PARITY
# ───────────────────────────────────────────────────────────────

def check_table_parity(skill: types.ModuleType) -> List[str]:
    """Compare the pseudocode's tables against the oracle's, value for value."""
    failures: List[str] = []

    def compare(label: str, expected: Any, actual: Any) -> None:
        if expected != actual:
            failures.append(f"table parity {label}: skill {expected!r}, contract {actual!r}")

    compare("commands", dict(skill.COMMANDS), rc.MODE_COMMANDS)
    skill_signals = [(intent, list(cfg["keywords"]))
                     for intent, cfg in skill.INTENT_MODEL.items() if cfg["keywords"]]
    contract_signals = [(mode, list(signals.items())) for mode, signals in rc.MODE_SIGNALS.items()]
    compare("keywords in table order", skill_signals, contract_signals)
    compare("modes", list(skill.INTENT_MODEL), rc.MODE_VALUES)
    compare("RESOURCE_MAP", skill.RESOURCE_MAP, rc.RESOURCE_MAP)
    compare("TOOL_MAP", skill.TOOL_MAP, rc.TOOL_MAP)
    compare("FALLBACK_MAP", skill.FALLBACK_MAP, rc.FALLBACK_MAP)
    compare("ALWAYS", skill.ALWAYS, rc.ALWAYS)
    compare("token pattern", skill._TOKEN_RE.pattern, rc._TOKEN_RE.pattern)
    compare("disambiguation checklist", skill.UNKNOWN_FALLBACK_CHECKLIST, rc.DISAMBIGUATION_CHECKLIST)
    return failures


# ───────────────────────────────────────────────────────────────
# 4. GUARD 3: BEHAVIOR PARITY ACROSS HOST STATES
# ───────────────────────────────────────────────────────────────

def bind_host(skill: types.ModuleType, cli: bool, tools: bool, ffmpeg: bool) -> None:
    """Point the three host calls at one host state."""
    skill.__dict__["media_cli_available"] = lambda: cli
    skill.__dict__["media_tools_connected"] = lambda: tools
    skill.__dict__["verify_ffmpeg"] = lambda: ffmpeg


def compare_input(skill: types.ModuleType, text: str, state: str) -> List[str]:
    """Route one input through both in one host state and name each field that disagrees."""
    cli, tools, ffmpeg, expected_route = HOST_STATES[state]
    bind_host(skill, cli, tools, ffmpeg)
    raw = skill.route_media_editor_resources(text)
    actual = rc.route_request(text)

    failures: List[str] = []
    schema_errors = rc.validate_route_object(actual)
    if schema_errors:
        return [f"contract route object is not schema-valid: {schema_errors}"]
    if raw.get("route") != expected_route:
        failures.append(f"route: skill {raw.get('route')!r}, host state needs {expected_route!r}")
    adapted = {
        "mode": raw.get("intent"),
        "tool": raw.get("tool"),
        "fallback": raw.get("fallback"),
        "source": raw.get("source"),
        "needs_disambiguation": raw.get("needs_disambiguation"),
        "resources": list(raw.get("resources") or []),
    }
    for field in rc.ROUTE_FIELDS:
        if adapted[field] != actual[field]:
            failures.append(f"{field}: skill {adapted[field]!r}, contract {actual[field]!r}")
    asks = "disambiguation_checklist" in raw
    if asks != bool(raw.get("needs_disambiguation")):
        failures.append("the skill attaches the checklist on a route that does not ask, or omits it on one that does")
    return failures


# ───────────────────────────────────────────────────────────────
# 5. GUARD 4: CORPUS COVERAGE
# ───────────────────────────────────────────────────────────────

def check_coverage(corpus: List[str]) -> List[str]:
    """Prove the corpus exercises every command, mode, fallback and false prefix."""
    failures: List[str] = []
    tokens_seen = {token for text in corpus for token in rc.tokenize(text)}
    for command in rc.MODE_COMMANDS:
        if command not in tokens_seen:
            failures.append(f"coverage: no input carries the command {command}")

    routed = [rc.detect_mode(text) for text in corpus]
    for mode in rc.MODE_VALUES:
        if (mode, "command") not in routed:
            failures.append(f"coverage: no input reaches {mode} by command")
        if mode != "INTERACTIVE" and (mode, "semantic") not in routed:
            failures.append(f"coverage: no input reaches {mode} by keyword")
    if ("INTERACTIVE", "fallback") not in routed:
        failures.append("coverage: no input falls back to the one comprehensive question")

    for prefix in REQUIRED_FALSE_PREFIXES:
        if prefix not in tokens_seen:
            failures.append(f"coverage: no input carries the false prefix {prefix}")
    return failures


# ───────────────────────────────────────────────────────────────
# 6. RUNNER
# ───────────────────────────────────────────────────────────────

def load_corpus() -> List[str]:
    """Fixture inputs in manifest order, deduped."""
    try:
        fixtures = json.loads(read_text(FIXTURES_PATH))
    except json.JSONDecodeError as exc:
        refuse(f"invalid JSON in {FIXTURES_PATH}: {exc}")
        return []
    corpus: List[str] = []
    for fixture in fixtures:
        text = fixture.get("input")
        if isinstance(text, str) and text not in corpus:
            corpus.append(text)
    return corpus


def main() -> int:
    """Run the guard suite and return the exit status."""
    contract_text = read_text(ROUTER_CONTRACT_MD)
    kernel_text = read_text(PROJECT_MD)
    skill_text = read_text(SKILL_MD)
    corpus = load_corpus()

    failures = check_copy_parity(contract_text, kernel_text, skill_text)
    if failures:
        print("FAILED differential gate")
        for failure in failures:
            print(" -", failure)
        return 1

    skill = build_skill_router(contract_text)
    failures.extend(check_table_parity(skill))
    failures.extend(check_coverage(corpus))

    divergent = 0
    for state in HOST_STATES:
        for text in corpus:
            problems = compare_input(skill, text, state)
            if problems:
                divergent += 1
                failures.append(f"input {text!r} ({state})")
                failures.extend(f"    {problem}" for problem in problems)

    checks = len(corpus) * len(HOST_STATES)
    if failures:
        print(f"FAILED differential gate: {divergent}/{checks} input and host-state pairs diverge")
        for failure in failures:
            print(" -", failure)
        return 1

    print(f"PASSED {checks}/{checks} differential checks "
          f"({len(corpus)} inputs x {len(HOST_STATES)} host states, "
          f"{len(rc.MODE_COMMANDS)} commands, {len(rc.MODE_VALUES)} modes in parity)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
