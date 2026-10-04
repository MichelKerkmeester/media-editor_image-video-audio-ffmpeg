---
title: "benchmark/grader: reply linting and twin-scenario comparison"
description: "Checks a finished manual-testing-playbook report for HVR hard blockers and for skill-versus-Project scenario disagreement, plus a one-command runner over both."
trigger_phrases:
  - "hvr lint"
  - "twin divergence"
  - "check report"
  - "manual testing playbook report"
---

# benchmark/grader: reply linting and twin-scenario comparison

---

## 1. OVERVIEW

This system has no grader of any kind before this folder. The manual testing playbook (`sk-media-editor/manual-testing-playbook/`) runs its scenarios by hand, a skill set against the CLI skill runtime and a project set against the claude.ai Project, and records one `PASS`, `FAIL` or `SKIP` verdict per scenario. Nothing previously re-read a finished run as a whole. This folder holds the two checks that only make sense over such a run, plus a one-command runner for both.

Current state:

- `lint_replies.py` checks every captured reply against the output rules this system states in `references/hvr-core.md` and `references/interactive-intelligence.md`. No linter existed for this system before this file
- `twin_divergence.py` pairs the six scenarios this playbook runs on both runtimes by id and reports any pair whose recorded verdict disagrees
- `check_report.sh` runs both over one report directory, continues past a finding so the first does not hide the second, and exits with how many of the two reported findings
- `fixtures/sample-report/` is a small synthetic report, not a real playbook run, kept so the three scripts above have something concrete to run against and so a reader can see the expected shape without producing one

---

## 2. FILES

| File | Responsibility |
|---|---|
| `lint_replies.py` | CLI script. Lints one file or a directory of replies against this system's stated output rules, writes `hvr-lint.csv` beside a directory run |
| `twin_divergence.py` | CLI script. Reads `results.csv`, pairs the six declared skill/Project twins by id, reports any disagreement |
| `check_report.sh` | CLI script. Runs both of the above over one report directory and exits with the count that reported findings |
| `fixtures/sample-report/` | A synthetic report (six replies, a twenty-row `results.csv`) used to prove the three scripts above and to demonstrate the expected report shape |

---

## 3. THE REPORT SHAPE

A report directory is any directory holding:

```text
<report>/
  replies/
    <scenario-id>.txt        (or .md, one captured reply per file)
  results.csv                 (columns: id, result)
```

`id` is this playbook's scenario id, `[SP][A-Z]{2}-\d{3}` (for example `SID-001`, `PHL-001`). `result` is exactly `PASS`, `FAIL` or `SKIP`, this playbook's own verdict vocabulary (see `manual-testing-playbook.md` section 5). A row carrying anything else, including an id with a trailing suffix for a re-run, is read but never compared as a finished verdict.

---

## 4. WHAT THE LINTER CHECKS, AND WHAT IT DELIBERATELY DOES NOT

Checked, all zero-tolerance except the two counted caps:

- Em dash, semicolon, curly quotes
- A bullet line ending in a full stop
- A markdown horizontal divider (`---`, `***`, `___`) on its own line
- More than one ellipsis or one emoji in a single reply
- The "not just X, but Y" construction and its "not only" variant
- The full HARD BLOCKER WORDS and HARD BLOCKER PHRASES lists from `references/hvr-core.md`, the card loaded on every request

Not checked, and why a finding for these would not be believed:

- **Oxford comma.** A comma before "and" inside a list and a comma before "and" joining two independent clauses are the same three characters. Telling them apart needs a parse this gate does not attempt
- **Asterisk emphasis.** The HVR card bans it in delivered output, but this system's own kernel delivery protocol requires bold field labels (`**Run this:**`, `**Result lands in:**`, `**Check this:**`). A blanket ban would fail the shape the kernel itself mandates
- **Title-case headings.** FFmpeg, HLS, MP4 and JPEG are correctly capitalised acronyms this system's own headings use constantly. A case heuristic cannot tell an acronym from a title-cased word without a dictionary this gate does not carry
- **Every soft deduction and context-dependent word** in the full `references/human-voice-rules.md` standard. That document names itself `ON_DEMAND`, not loaded on every request, so checking it on every reply would be enforcing a loading condition this system did not choose

Fenced and inline code spans are stripped before any of the above runs, because `ffmpeg`'s own `-filter_complex` syntax uses a semicolon to separate filter chains (see the HLS multi-quality recipe), and a real, correct command would otherwise read as a punctuation violation.

---

## 5. RUN

From the system directory:

```bash
python3 benchmark/grader/lint_replies.py benchmark/grader/fixtures/sample-report
```

Expected result: one line per reply file, `clean` or `DIRTY` with the violation list, a written `hvr-lint.csv` beside `replies/`, then `PASSED every reply clean of HVR hard blockers`. Exit 0. A single file with `--brief` prints one line, `clean` or `HVR <violations>`.

```bash
python3 benchmark/grader/twin_divergence.py benchmark/grader/fixtures/sample-report
```

Expected result: a summary line naming how many twins agreed, disagreed, were not settled or ran on one packaging only, then `PASSED every paired twin agreed`. Exit 0.

```bash
bash benchmark/grader/check_report.sh benchmark/grader/fixtures/sample-report
```

Expected result: both checks' own output, indented, then `all 2 report checks clean`. Exit 0.

---

## 6. EXIT CODES

| Script | Exit | Meaning |
|---|---|---|
| `lint_replies.py` | 0 | every linted reply carried no hard blocker |
| `lint_replies.py` | 1 | at least one reply carried a hard blocker |
| `lint_replies.py` | 2 | the target was not a directory, or held no `.txt`/`.md` reply files |
| `lint_replies.py` | 64 | usage error, no target given |
| `twin_divergence.py` | 0 | every paired twin agreed |
| `twin_divergence.py` | 1 | at least one twin pair disagreed |
| `twin_divergence.py` | 2 | no `results.csv` at the target, or nothing in it carried a recognised scenario id |
| `twin_divergence.py` | 64 | usage error, no target given |
| `check_report.sh` | 0 | both report checks were clean |
| `check_report.sh` | 1 or 2 | that many of the two report checks reported findings, not that many failed to run |
| `check_report.sh` | 64 | usage error, no report directory given |

`check_report.sh`'s exit code counts checks that reported findings. A dirty reply or a diverging twin is a finding about the manual run that produced the report, not a defect in this repository.

---

## 7. THE TWIN PAIRING, AND WHY IT IS A TABLE

The playbook's scenarios do not share a category code between the skill and Project rows that test the same thing: command routing is `SCR` on the skill side and `PRP` on the Project side, and HLS is `SHL` against `PHL`. A regex over the id cannot recover that mapping, so `twin_divergence.py` declares it by hand, the same way `z — Claude Project Sync Loop/systems.py` declares its pairs rather than deriving them:

| Skill id | Project id | Paired because |
|---|---|---|
| `SID-001` | `PID-001` | the playbook's own "Identity handover rule", the named precondition for each set |
| `SCR-002` | `PRP-001` | identical prompt, `$audio from this video` |
| `SAI-001` | `PAI-001` | identical prompt, the one-comprehensive-question scenario |
| `SSB-001` | `PSB-001` | identical prompt, the generation-request refusal |
| `SHL-001` | `PHL-001` | identical prompt, `$hls Convert this keynote recording` |
| `SRO-001` | `PRO-001` | identical prompt, the tools connected in Claude Code and in Claude Desktop |
| `SCR-003` | `PRP-002` | identical prompt, `$aud strip the track from this $video` |

Thirteen scenarios test something only one runtime can produce or have no Project row with the same prompt, and are declared unpaired rather than left to fall out of a failed match. On the skill side, `SCR-001`, `STV-001`, `SED-001` and `SRO-002` need the real CLI runtime, `STV-002` and `STV-003` need the Claude Code plugin, and `SCR-004`, `SCR-005` and `SRM-001` have no Project twin. On the Project side, `PGD-001`, `PNE-001` and `PSB-002` test the chat-only limits, and `PRM-001` asks with `$repair` where `SRM-001` tests the `$r` alias.

Two of the seven pairs, `SAI-001`/`PAI-001` and `SSB-001`/`PSB-001`, are two-turn scenarios in the playbook's own conversation chains. A result recorded after only the first turn is not one of this playbook's three verdicts, so `twin_divergence.py` refuses to compare it rather than count it as agreement with a finished run on the other side.

---

## 8. PROVEN RED

**`lint_replies.py`**: confirmed by editing the fixture reply `replies/SID-001.txt` to add an em dash, a semicolon and the hard blocker word `leverage` outside its fenced command block. The run reported `SID-001.txt DIRTY em_dashx1, semicolonx1, hard_blocker_word:leveragex1` and exited 1. The genuine semicolons inside that same reply's `-filter_complex` command block, present throughout, were correctly left unflagged. Reverting the edit returned the run to `PASSED` and exit 0.

**`twin_divergence.py`**: confirmed by changing `PID-001`'s result to `FAIL` in the fixture `results.csv` while `SID-001` stayed `PASS`, and separately changing `PAI-001` to `PARTIAL` while `SAI-001` stayed `PASS`. The run reported the `SID-001/PID-001` disagreement by name, correctly filed `SAI-001/PAI-001` as not settled rather than as agreement or disagreement, and exited 1. Reverting both edits returned the run to `PASSED` and exit 0.

**`check_report.sh`**: confirmed with the two edits above applied together. The run printed both sub-checks' findings in full (the second was not hidden by the first) and exited 2, then exited 1 with only the reply edit applied, then 0 with both reverted. This is the behavior the script exists for: the exit code counts checks that reported findings, not the first one encountered.

Every injected file was backed up outside this system's tree before editing and restored from that backup afterward, never left as a copy inside `fixtures/`.

---

## 9. RELATED

- [`../gates/README.md`](../gates/README.md), the check that reads the declared pairs rather than a finished report
- [`../../sk-media-editor/manual-testing-playbook/manual-testing-playbook.md`](../../sk-media-editor/manual-testing-playbook/manual-testing-playbook.md), the source of the nineteen scenario ids, the twin pairing and the `PASS`/`FAIL`/`SKIP` vocabulary
- [`../../sk-media-editor/references/hvr-core.md`](../../sk-media-editor/references/hvr-core.md), the always-loaded card `lint_replies.py` checks
- [`../../sk-media-editor/references/interactive-intelligence.md`](../../sk-media-editor/references/interactive-intelligence.md), the source of the horizontal-divider rule
