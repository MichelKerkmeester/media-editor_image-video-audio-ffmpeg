---
title: "benchmark/grader: twin-scenario comparison"
description: "Checks a finished manual-testing-playbook report for skill-versus-Project scenario disagreement, plus a one-command runner."
trigger_phrases:
  - "twin divergence"
  - "check report"
  - "manual testing playbook report"
---

# benchmark/grader: twin-scenario comparison

---

## 1. OVERVIEW

The manual testing playbook (`sk-media-editor/manual-testing-playbook/`) runs its scenarios by hand, a skill set against the CLI skill runtime and a project set against the claude.ai Project, and records one `PASS`, `FAIL` or `SKIP` verdict per scenario. Nothing else re-reads a finished run as a whole. This folder holds the check that only makes sense over such a run, plus a one-command runner.

Current state:

- `twin_divergence.py` pairs the scenarios this playbook runs on both runtimes by id and reports any pair whose recorded verdict disagrees
- `check_report.sh` runs every report check over one report directory, continues past a finding and exits with how many checks reported findings
- `fixtures/sample-report/` is a small synthetic report, not a real playbook run, kept so the scripts above have something concrete to run against and so a reader can see the expected shape without producing one

---

## 2. FILES

| File | Responsibility |
|---|---|
| `twin_divergence.py` | CLI script. Reads `results.csv`, pairs the declared skill/Project twins by id, reports any disagreement |
| `check_report.sh` | CLI script. Runs every report check over one report directory and exits with the count that reported findings |
| `fixtures/sample-report/` | A synthetic report (six replies, a twenty-row `results.csv`) used to prove the scripts above and to demonstrate the expected report shape |

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

## 4. RUN

From the system directory:

```bash
python3 benchmark/grader/twin_divergence.py benchmark/grader/fixtures/sample-report
```

Expected result: a summary line naming how many twins agreed, disagreed, were not settled or ran on one packaging only, then `PASSED every paired twin agreed`. Exit 0.

```bash
bash benchmark/grader/check_report.sh benchmark/grader/fixtures/sample-report
```

Expected result: the twin check's own output, indented, then `all 1 report checks clean`. Exit 0.

---

## 5. EXIT CODES

| Script | Exit | Meaning |
|---|---|---|
| `twin_divergence.py` | 0 | every paired twin agreed |
| `twin_divergence.py` | 1 | at least one twin pair disagreed |
| `twin_divergence.py` | 2 | no `results.csv` at the target, or nothing in it carried a recognised scenario id |
| `twin_divergence.py` | 64 | usage error, no target given |
| `check_report.sh` | 0 | every report check was clean |
| `check_report.sh` | 1 | the twin check reported findings or could not run |
| `check_report.sh` | 64 | usage error, no report directory given |

`check_report.sh`'s exit code counts checks that reported findings. A diverging twin is a finding about the manual run that produced the report, not a defect in this repository.

---

## 6. THE TWIN PAIRING, AND WHY IT IS A TABLE

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

Sixteen scenarios test something only one runtime can produce or have no Project row with the same prompt, and are declared unpaired rather than left to fall out of a failed match. On the skill side, `SCR-001`, `STV-001`, `SED-001`, `SED-002`, `SED-003` and `SRO-002` need the real CLI runtime, `STV-002` and `STV-003` need the Claude Code plugin, and `SCR-004`, `SCR-005` and `SRM-001` have no Project twin. On the Project side, `PGD-001`, `PNE-001` and `PSB-002` test the chat-only limits, and `PRM-001` asks with `$repair` where `SRM-001` tests the `$r` alias. `PRO-002` needs claude.ai in a browser, where the tools cannot run.

Two of the seven pairs, `SAI-001`/`PAI-001` and `SSB-001`/`PSB-001`, are two-turn scenarios in the playbook's own conversation chains. A result recorded after only the first turn is not one of this playbook's three verdicts, so `twin_divergence.py` refuses to compare it rather than count it as agreement with a finished run on the other side.

---

## 7. PROVEN RED

**`twin_divergence.py`**: confirmed by changing `PID-001`'s result to `FAIL` in the fixture `results.csv` while `SID-001` stayed `PASS`, and separately changing `PAI-001` to `PARTIAL` while `SAI-001` stayed `PASS`. The run reported the `SID-001/PID-001` disagreement by name, correctly filed `SAI-001/PAI-001` as not settled rather than as agreement or disagreement, and exited 1. Reverting both edits returned the run to `PASSED` and exit 0.

**`check_report.sh`**: confirmed with the twin edit above applied. The run printed the twin check's findings in full and exited 1, then exited 0 with the edit reverted.

Every injected file was backed up outside this system's tree before editing and restored from that backup afterward, never left as a copy inside `fixtures/`.

---

## 8. RELATED

- [`../gates/README.md`](../gates/README.md), the check that reads the declared pairs rather than a finished report
- [`../../sk-media-editor/manual-testing-playbook/manual-testing-playbook.md`](../../sk-media-editor/manual-testing-playbook/manual-testing-playbook.md), the source of the twenty-nine scenario ids, the twin pairing and the `PASS`/`FAIL`/`SKIP` vocabulary
- [`../../sk-media-editor/references/interactive-intelligence.md`](../../sk-media-editor/references/interactive-intelligence.md), the source of the horizontal-divider rule
