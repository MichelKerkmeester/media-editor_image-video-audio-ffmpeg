# Line check of the package inventory

Checked 2026-09-29. DeepSeek V4.1 Flash (max, opencode-go, read-only) opened every `path:line` citation in `media-editor-package-inventory.md` that carries a quote or a precise description, and compared the quote with the line. The orchestrator then reopened both mismatches by hand.

## Result

| Checked | Matched | Moved | Gone | Skipped (no quote) |
|--------:|--------:|------:|-----:|-------------------:|
| 294 | 292 | 1 | 1 | 2 |

## Mismatches, confirmed by hand

| Citation | What the file holds now | Effect on this phase |
|----------|-------------------------|----------------------|
| `benchmark/grader/lint_replies.py:22-24` | The quoted sentence starts on line 21 ("protocol requires bold field labels such as `**Run this:**`") and ends on 23 | None. The exemption is still there, one line earlier. |
| `benchmark/router/fixtures.json:186` | `"tool": "ffmpeg", "fallback": null` for the HLS input, not the `imagician` / `ffmpeg` shape the inventory groups it with | The HLS fixture already names ffmpeg with no fallback. Fixture edits read the file itself, not this list. |

## Use

The inventory is accurate enough to plan edits from. Every edit still opens its target file first, so a line that moved again after this check does not carry into the change.
