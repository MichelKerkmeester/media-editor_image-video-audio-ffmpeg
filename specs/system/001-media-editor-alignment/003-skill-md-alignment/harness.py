"""
Routing characterization harness for Media Editor SKILL.md (P003 of
001-media-editor-alignment).

WHY THIS HARNESS EXISTS
------------------------
The single python fence in sk-media-editor/SKILL.md defines every function it
calls except two universal runtime primitives that no skill in this codebase
defines in-fence: `load(path)` (read a resource into context) and
`verify_tool_connection(tool)` (the blocking MCP/FFmpeg connection check).
Both are stubbed as no-ops here, exactly as Product Owner's executed fence
stubs only `load()`. No domain routing logic is supplied by this harness --
INTENT_MODEL, RESOURCE_MAP, TOOL_MAP, ALWAYS, UNKNOWN_FALLBACK_CHECKLIST,
detect_intent() and route_media_editor_resources() all come verbatim from the
fence under test.

Usage:
    python3 harness.py before   # runs fixtures against SKILL.md.before
    python3 harness.py after    # runs fixtures against the live sk-media-editor/SKILL.md
"""

import json
import re
import sys
from pathlib import Path

SPEC_DIR = Path(__file__).resolve().parent
BEFORE_SNAPSHOT = SPEC_DIR / "SKILL.md.before"
LIVE_SKILL = Path(
    "/Users/michelkerkmeester/MEGA/Development/AI_Systems/Barter/Media Editor/sk-media-editor/SKILL.md"
)
FIXTURES_PATH = SPEC_DIR / "fixtures.json"

STUB_PRIMITIVES = '''
_load_calls = []
_verify_calls = []

def load(path):
    _load_calls.append(path)
    return None

def verify_tool_connection(tool):
    _verify_calls.append(tool)
    return True
'''


def extract_python_fence(md_text: str) -> str:
    fences = re.findall(r"```python\n(.*?)```", md_text, re.S)
    if len(fences) != 1:
        raise AssertionError(f"expected exactly 1 python fence, found {len(fences)}")
    return fences[0]


def _patched_guard_in_skill(skill_root: Path):
    """
    Pre-existing bug found by literal execution of the BEFORE fence:
    `_guard_in_skill` calls `(SKILL_ROOT / relative_path).resolve()`, which
    follows the `references/human-voice-rules.md` symlink to its real target
    three directories up in `z - Knowledge/`, landing outside SKILL_ROOT and
    raising ValueError on `.relative_to(SKILL_ROOT)` for every single
    request, since human-voice-rules.md is in the unconditional ALWAYS list.
    Confirmed live: `python3 harness.py before` raised exactly this
    ValueError before this patch existed.

    Product Owner's already-executed, verified fence hits the identical
    shared-symlink shape and avoids the crash by guarding with `.absolute()`
    instead of `.resolve()` (see sk-product-owner/SKILL.md
    `load_if_available`), which checks the path is lexically inside
    SKILL_ROOT without dereferencing the symlink. This is a guard-mechanics
    fix, not a routing-decision or domain-content change: INTENT_MODEL,
    RESOURCE_MAP, TOOL_MAP and detect_intent() are untouched.

    This patch characterizes the INTENDED baseline behavior (what the
    documented ALWAYS/CONDITIONAL resource lists and routing dicts describe)
    by applying that same, already-adopted fix at harness level for the
    BEFORE run only. The AFTER run needs no such patch because the
    rewritten SKILL.md embeds the fix directly (see harness_after being run
    with zero monkeypatching).
    """
    def guarded(relative_path: str) -> str:
        resolved = (skill_root / relative_path).absolute()
        resolved.relative_to(skill_root.absolute())
        if Path(relative_path).suffix.lower() != ".md":
            raise ValueError(f"Only markdown resources are routable: {relative_path}")
        return relative_path
    return guarded


def build_namespace(fence_src: str, skill_root: Path, patch_guard: bool = False) -> dict:
    # __file__ lets the fence's own `SKILL_ROOT = Path(__file__).resolve().parent`
    # line resolve to the real skill folder, exactly like the live agent runtime.
    ns = {"__file__": str(skill_root / "SKILL.md")}
    exec(STUB_PRIMITIVES, ns)
    exec(fence_src, ns)
    if patch_guard:
        ns["_guard_in_skill"] = _patched_guard_in_skill(skill_root)
    return ns


def run_fixtures(fence_src: str, skill_root: Path, fixtures: list, patch_guard: bool = False) -> list:
    results = []
    for fx in fixtures:
        ns = build_namespace(fence_src, skill_root, patch_guard=patch_guard)
        route = ns["route_media_editor_resources"](fx["request"])
        problems = []

        actual_intent = route.get("intent")
        if actual_intent != fx["expect_intent"]:
            problems.append(f"intent expected {fx['expect_intent']!r} got {actual_intent!r}")

        actual_tool = route.get("tool")
        if fx["expect_tool"] is not None and actual_tool != fx["expect_tool"]:
            problems.append(f"tool expected {fx['expect_tool']!r} got {actual_tool!r}")

        actual_source = route.get("source")
        if actual_source != fx["expect_source"]:
            problems.append(f"source expected {fx['expect_source']!r} got {actual_source!r}")

        actual_disambig = bool(route.get("needs_disambiguation", False))
        if actual_disambig != fx["expect_disambig"]:
            problems.append(f"disambig expected {fx['expect_disambig']} got {actual_disambig}")

        resources = route.get("resources") or []
        if fx["expect_extra_resource"] not in resources:
            problems.append(f"expected resource {fx['expect_extra_resource']!r} missing from {resources}")

        # ALWAYS resources must always be present regardless of route.
        for always_ref in ("references/media-framework.md", "references/human-voice-rules.md"):
            if always_ref not in resources:
                problems.append(f"ALWAYS resource {always_ref!r} missing from {resources}")

        results.append({
            "id": fx["id"],
            "request": fx["request"],
            "actual_intent": actual_intent,
            "actual_tool": actual_tool,
            "actual_source": actual_source,
            "actual_disambig": actual_disambig,
            "resources": resources,
            "problems": problems,
            "pass": not problems,
        })
    return results


def summarize(results, label):
    passed = sum(1 for r in results if r["pass"])
    print(f"\n=== {label}: {passed}/{len(results)} fixtures passed ===")
    for r in results:
        status = "PASS" if r["pass"] else "FAIL"
        print(f"[{status}] id={r['id']:>3} intent={r['actual_intent']!s:<12} tool={r['actual_tool']!s:<10} source={r['actual_source']}")
        for p in r["problems"]:
            print(f"        ! {p}")
    return passed, len(results)


def confirm_unpatched_crash(fence_src: str, skill_root: Path) -> str:
    """Prove the raw BEFORE fence crashes universally (dead-on-arrival guard
    bug), before any patch is applied. Every request hits this because
    references/human-voice-rules.md is in the unconditional ALWAYS list."""
    ns = build_namespace(fence_src, skill_root, patch_guard=False)
    try:
        ns["route_media_editor_resources"]("resize this image")
        return "NO CRASH (unexpected -- guard bug not reproduced)"
    except ValueError as exc:
        return str(exc)


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "before"
    fixtures = json.loads(FIXTURES_PATH.read_text())
    real_root = Path(
        "/Users/michelkerkmeester/MEGA/Development/AI_Systems/Barter/Media Editor/sk-media-editor"
    )

    if which == "before":
        md_text = BEFORE_SNAPSHOT.read_text()
        fence = extract_python_fence(md_text)

        print("Step 1: confirm the raw (unpatched) BEFORE fence crashes on the")
        print("        ALWAYS-loaded human-voice-rules.md symlink guard")
        crash_msg = confirm_unpatched_crash(fence, real_root)
        print(f"  -> {crash_msg}")
        if "not in the subpath" not in crash_msg:
            print("EXPECTED CRASH DID NOT REPRODUCE -- guard bug assumption is stale")
            sys.exit(1)

        print("\nStep 2: run fixtures against the BEFORE fence with the guard patched")
        print("        to .absolute() (Product Owner's established fix for the same")
        print("        shared-symlink shape) to characterize INTENDED routing behavior")
        results = run_fixtures(fence, real_root, fixtures, patch_guard=True)
        out_name = "baseline_results.json"
        label = "BASELINE (SKILL.md.before fence, guard patched to .absolute())"
        out_extra = {"unpatched_guard_crash": crash_msg}
    elif which == "after":
        md_text = LIVE_SKILL.read_text()
        fence = extract_python_fence(md_text)
        print("Step 1: confirm the rewritten fence runs clean with ZERO monkeypatching")
        results = run_fixtures(fence, LIVE_SKILL.parent, fixtures, patch_guard=False)
        out_name = "after_results.json"
        label = "AFTER (live rewritten SKILL.md fence, no harness patch)"
        out_extra = {}
    else:
        raise SystemExit(f"unknown mode {which!r}, expected 'before' or 'after'")

    passed, total = summarize(results, label)
    out = {"label": label, "fixture_count": total, "passed": passed, "results": results, **out_extra}
    (SPEC_DIR / out_name).write_text(json.dumps(out, indent=2))
    print(f"\nWritten to {SPEC_DIR / out_name}")
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
