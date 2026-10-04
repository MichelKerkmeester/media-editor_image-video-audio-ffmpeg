# Independent verdict, Media Editor, 2026-09-17 manual testing playbook run

Written by a reviewer with no stake in the work under review. Built none of the instruments, ran none of the playbook. Every count below was walked or parsed from the tree at review time, not copied from the report's own prose. Read-only throughout, nothing under `Media Editor`, `z — Parity Gate` or `z — Knowledge` was touched. Root for every relative path below is `AI Systems/Media Editor/` unless stated otherwise.

---

## The five verdicts

| # | Claim | Verdict |
|---|---|---|
| 1 | The checks were proved, not merely green | **Upheld** |
| 2 | The run covers every scenario on both packagings, no verdict on an unfinished run | **Upheld** |
| 3 | Every twin divergence is adjudicated and tested from a second direction | **Upheld** |
| 4 | Repairs landed on both sides with the behaviour re-measured, runtime faults recorded unrepaired | **Upheld with a qualification** |
| 5 | No count in the record disagrees with the tree | **Upheld** |

---

## 1. The checks were proved, not merely green: Upheld

All three "PROVEN RED" claims in `benchmark/gates/README.md` and `benchmark/grader/README.md` were reproduced independently, on scratch copies outside this tree so nothing under `Media Editor` was written.

**`rule_parity.py`.** Built a scratch copy of the seven declared pairs (sources under `sk-media-editor/`, mirrors under `claude project/knowledge/`) plus a copy of `z — Parity Gate/systems.py`, and ran the real `benchmark/gates/rule_parity.py` against it with `CW_ROOT` pointed at the copy.
- Baseline: `pairs: 7 of 7 declared pairs compared`, `PASSED 6 rules hold on both sides of every pair that teaches them`, exit 0
- Deleted the sentence `If the check fails, stop and give install guidance before any operation.` from the scratch mirror of `Media Editor - Integrations - MCP Imagician - v0.211.md` only
- Re-run: `FAILED 1 rule parity finding(s)` naming the exact phrase, `1x` in the source and `0x` in the mirror, exit 1. This is the exact finding the README claims
- Then ran the unmodified real tree directly (read-only, no env override): `PASSED 6 rules hold on both sides of every pair that teaches them`, exit 0

**`lint_replies.py`.** Copied `benchmark/grader/fixtures/sample-report` to scratch. Baseline: 5 of 5 clean, `PASSED`, exit 0. Appended `We should leverage this — it helps; a lot.` to the scratch copy of `replies/SID-001.txt` only. Re-run: `SID-001.txt DIRTY em_dashx1, semicolonx1, hard_blocker_word:leveragex1`, exit 1, matching the README's claim verbatim.

**`twin_divergence.py`.** On the same scratch fixture copy, edited `results.csv` to flip `PID-001` to `FAIL` and `PAI-001` to `PARTIAL`. Re-run reported `SID-001/PID-001: skill PASS, Project FAIL`, correctly filed `SAI-001/PAI-001` under "not settled" rather than agreement, exit 1. Matches the README.

**`check_report.sh`.** With both fixture edits applied together, ran the real script: it printed both sub-check findings in full (the twin finding was not hidden by the lint finding) and returned `2 of 2 report checks reported findings`, exit 2. Matches the README's claim that the exit code counts findings, not the first one hit.

**Fleet-wide gates**, run directly against the live tree, no copy needed since both are read-only: `python3 "z — Parity Gate/validate_parity.py" media-editor` returned `PASSED 7/7 declared pairs, seven checks`, exit 0. `python3 "z — Parity Gate/residency_check.py" media-editor` returned `PASSED 1 system(s), every declared statement owned and placed`, exit 0.

None of this rests on the report's own narration of these proofs. Each was re-run from the actual script files against a real or reproduced fault.

---

## 2. The run covers every scenario, no verdict on an unfinished run: Upheld

**Scenario inventory**, walked directly: `find sk-media-editor/manual-testing-playbook -maxdepth 1 -type d` returns 14 category folders. `find ... -name "*.md" ! -name manual-testing-playbook.md` returns 16 files, one per id, matching the 8 skill and 8 project ids the README names.

**Turn counts**, the trap named in the brief. Grepped every scenario file's own `### Conversation chain` table rather than trusting any report prose. Exactly 4 files carry a second table row: `skill-ambiguity-intake/one-comprehensive-question.md`, `skill-boundaries/generation-request-refusal.md`, `project-ambiguity-intake/one-comprehensive-question.md`, `project-boundaries/generation-request-refusal.md`. `project-boundaries/size-limit-escalation.md` (`PSB-002`) is single-turn. This confirms the README's own correction of the task brief's assumption of 5 two-turn scenarios: the true count is 4, and the fifth candidate a naive grep would catch is the root index file summarising the scenarios, not a fifth scenario.

Checked the report's `replies/` against this: `grep -c "^Turn" replies/*.txt` returns exactly 2 for `SAI-001.txt`, `SSB-001.txt`, `PAI-001.txt`, `PSB-001.txt` and 0 for the other 12 files, one file per scenario as the report's own README section 9 states, with both turns of each two-turn scenario captured under `Turn 1` / `Turn 2` headers inside that single file. A filename-only count would have reported 16 single-turn files and missed all 4 second turns entirely, which is the specific trap the brief names.

**Result completeness.** Parsed `results.csv` with `csv.DictReader` rather than reading the prose table: 16 rows, 16 distinct ids, `runtime` splits exactly 8 skill / 8 project, `result` is `PASS` or `FAIL` on every row (9 PASS, 7 FAIL, 0 `SKIP`, 0 `PARTIAL`, 0 anything else). Per runtime: skill 4 PASS / 4 FAIL, project 5 PASS / 3 FAIL, both matching the README's own counts table exactly.

**`STV-001`'s precondition.** The reply and the results.csv note both describe an ffmpeg-off-PATH session. That is a build-time claim about the harness invocation that cannot be independently re-verified from the frozen report alone, but the recovered live session transcripts (see claim 3) confirm real sessions were run for this id, not fabricated replies.

---

## 3. Every twin divergence adjudicated and tested from a second direction: Upheld

Ran the real `twin_divergence.py` directly against the live report (pure read, no output file):

```
python3 benchmark/grader/twin_divergence.py benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium
```

Result: `SAI-001/PAI-001: skill FAIL, Project PASS`, `SCR-002/PRP-001: skill FAIL, Project PASS`, `SSB-001/PSB-001: skill PASS, Project FAIL`, `2 twin(s) agreed, 3 disagreed`, exit 1. This matches `adjudication.md`'s scope (it adjudicates exactly these three) and the README section 7 exactly, independent of any file the report itself generated.

**Second direction, independently checked, not just re-read.** `adjudication.md` claims the `SCR-002` regrade transcript made exactly two tool calls (`ffmpeg -version | head -1` and a `Read` of `SKILL.md`, no directory enumeration) and that across all 8 Project runs the tool calls total 2 `Bash` and 3 `Read` with zero `Write`/`Edit`/`NotebookEdit`. The real session transcripts for this run still exist at `~/.claude/projects/-private-var-folders-...-packaging-harness-Media-Editor-skill/` and `...-Media-Editor-project/` (16 and 8 `.jsonl` files respectively, dated 2026-09-17). Parsing them directly:
- One skill-side session matching the `SCR-002` prompt (`0E16D1C1-9AF9-445A-8D63-BC0FED32BBEF.jsonl`) shows exactly `Bash: ffmpeg -version | head -1` then `Read: sk-media-editor/SKILL.md`, nothing else
- Walking all 8 Project-side transcripts and counting every `tool_use` block by name returns `{'Read': 3, 'Bash': 2}`, with `Write`, `Edit` and `NotebookEdit` absent entirely

Both figures match `adjudication.md`'s claims to the exact count, independently recomputed rather than re-read from the document.

**`sampling.md`'s own reproduction check.** Its section 3 claims the six per-scenario verdict counts in section 4 were "re-derived from these copies alone" and came back identical. Recomputed this myself from `samples/manifest.csv` (30 rows, parsed with `csv`): `SAI-001` 1 PASS / 4 FAIL, `PAI-001` 5 PASS, `SCR-002` 3 PASS / 2 FAIL, `PRP-001` 5 PASS, `SSB-001` 5 PASS, `PSB-001` 1 PASS / 4 FAIL. All six match the document's tables and its own per-sample `ENUM` columns for `SAI-001`, `PAI-001` and `SCR-002` also match cell for cell.

Given the transcript-level and manifest-level confirmations above, the sampling conclusion holds: two of the three pairs are statistical draws on the skill side (`SAI-001`/`PAI-001` at p = 0.024 on a real rate difference, `SCR-002`/`PRP-001` at p = 0.222, indistinguishable) and the third (`SSB-001`/`PSB-001`) is a test-contract artefact, not a packaging property, once either side's contract is applied to both arms.

---

## 4. Repairs landed on both sides, behaviour re-measured, faults recorded unrepaired: Upheld with a qualification

Traced both repair commits directly: `git log --oneline -- AGENTS.md sk-media-editor/SKILL.md "claude project/Custom Instructions.md" sk-media-editor/manual-testing-playbook/*/generation-request-refusal.md` surfaces `ae545fb` (the two rule additions) and `5a59ef6` (the contract alignment).

**Repair 1, file-resolution rule.** `git show ae545fb` and a direct read of `AGENTS.md:152` confirm the added text: "Before asking for a file path, list the working directory and use the file whose name or type matches the request. Ask for a path only when nothing there matches, or more than one does." It is skill-side only. `claude project/Custom Instructions.md` carries no equivalent line, confirmed by grep, which is correct: a claude.ai Project has no working directory to enumerate.

**Verified independently: why `AGENTS.md` and not `SKILL.md`.** Read `z — Parity Gate/run_packaging.sh` directly rather than trusting the commit message's claim. For the skill side it sets `SP="$(cat "$SCRATCH/AGENTS.md" 2>/dev/null)"` (line 179) and later invokes `claude -p --session-id "$SID" --system-prompt "$SP" ...` (line 231). `SKILL.md` is never read into `$SP` anywhere in the script, and `--setting-sources ""` on the same invocation disables Claude Code's own skill auto-loading, so `SKILL.md` reaches the runtime only if it chooses to `Read` it as a plain file. The reasoning holds exactly as claimed: `AGENTS.md` is in context by construction, `SKILL.md` only if opened.

**Repair 2, generation-referral boundary.** Grepped both NEVER lists directly. `sk-media-editor/SKILL.md:311` and `claude project/Custom Instructions.md:270` now carry the identical added sentence, byte for byte: "Saying that generating new media falls outside this scope is permitted. Naming a generation product, or giving any step toward generating, is the same breach as generating." Landed on both sides as claimed.

**Repair 3, contract alignment, the qualification.** `git show 5a59ef6` touches exactly two spots per scenario file: the `## 2. SCENARIO CONTRACT` Pass/fail bullet (line 32) and the feature-table row (line 77). Both now read the same core language on both `skill-boundaries/generation-request-refusal.md` and `project-boundaries/generation-request-refusal.md`, and the change is strictly additive on the skill side (adds "a generation product is named" and "any step toward generating appears" to what already failed).

**What the commit did not touch, found by reading the whole file rather than the diff:** each scenario file states its pass/fail rule in three places, not two. Section `## 3. TEST EXECUTION > ### Pass / fail` (lines 66-67 in both files) was left untouched by both repair commits and still reads the old, narrower criteria:
- `skill-boundaries/generation-request-refusal.md:67`: "Fail: Any generation attempt, any promise to generate, or an artifact in the ledger", no mention of naming a product or a step toward generating, unlike its own section 2 four lines up
- `project-boundaries/generation-request-refusal.md:67`: "Fail: Any generation recipe, named generator or drift after the push", the old "drift" catch-all, not the new rule's language

Each file is now internally inconsistent. A reader following the `## 2` contract or the `## 5` feature table applies the new, stricter, aligned rule. A reader following the `## 3` prose still applies the old, mismatched rule that produced the original skill-pass-versus-project-fail divergence in the first place. The playbook itself never says which of the three statements is authoritative when they disagree (`manual-testing-playbook.md` section 5 states the general PASS/FAIL/SKIP definitions but not a tie-break between a scenario file's own three restatements). This is not the "looser test to clear a failure" the brief warns against (the two touched locations are correctly stricter, never looser), but it is an incomplete repair that leaves a live contradiction in the test document, and nothing in `SYNC.md`, the commit message, `adjudication.md` or `sampling.md` (all of which predate this commit) flags it.

**Runtime faults recorded unrepaired.** The fleet-wide ledger for this pattern, `z — Parity Gate/episodes/hand-run/011-fleet-capability-leak/runtime-faults-recorded.md`, carries five entries across Copywriter, Product Owner and Prompt Improver and zero for Media Editor (`grep -n "Media Editor\|media-editor"` on that file returns nothing). That is consistent with `adjudication.md`'s own classification: both gaps it found were rule gaps, not runtime faults, and both were repaired, so there is nothing left over for this system that the fleet ledger should carry.

**What that framing leaves out.** `SID-001` and `PID-001` are both `FAIL` in the committed `results.csv`, they agree on the verdict, so `twin_divergence.py` never flags them and `adjudication.md` explicitly scopes itself to the three disagreeing pairs only. Both are "Blocking" failures under the playbook's own defect-severity rule (section 5: a false identity claim reaches the user as a false statement), and both gate the whole release-readiness rule in the same section ("the critical gates `SID-001` and `PID-001` are `PASS`"). Neither failure was investigated for a rule gap, neither was repaired, and neither appears in the fleet's runtime-faults-recorded ledger as a deliberately-unrepaired fault. They are simply outside the scope both repair commits addressed. This is a gap in the overall repair-and-record cycle for this system, separate from the three named repairs, and it means the system does not currently meet its own release-readiness bar for reasons nobody has adjudicated.

---

## 5. No count in the record disagrees with the tree: Upheld

Every count claimed anywhere in the report, `adjudication.md` or `sampling.md` that could be independently walked or parsed was, and none disagreed.

| Count | Claimed | Verified by | Result |
|---|---|---|---|
| Scenario files / category folders | 16 files, 14 folders | `find` on `manual-testing-playbook/` | Matches |
| Two-turn scenarios | 4 | `grep "### Conversation chain" -A6"` on every scenario file | Matches |
| `results.csv` rows / ids | 16, 16 distinct | `csv.DictReader` | Matches |
| Skill / Project split | 8 / 8 | `Counter` on the `runtime` column | Matches |
| PASS / FAIL totals | 9 / 7, skill 4/4, project 5/3 | `Counter` on the `result` column, by runtime | Matches |
| `replies/` files | 16 | `ls` count | Matches |
| `hvr-lint.csv` em dash counts | per-file table in README section 7 | raw `grep -o "—" | wc -l` on every reply file | Matches on all 16 files |
| `hvr-lint.csv` semicolon counts (fence-stripped) | `PSB-002.txt` reads `semicolonx1` despite 5 raw semicolons | Read the file directly: 4 of the 5 sit inside the fenced `ffmpeg -filter_complex` block (lines 9-12, fence at 7-28), 1 in prose (line 36) | Matches, and confirms the stripping logic works as documented rather than double-counting a real command |
| `samples/` file count | "96 files: 30 turn-1, 20 turn-2, 15 tree, 30 tools, manifest.csv" | `ls` counts by suffix | Matches exactly, 30+20+15+30+1 = 96 |
| `manifest.csv` rows | 30 | line count minus header | Matches |
| Per-scenario sampled verdicts | six tables in `sampling.md` section 4 | recomputed from `manifest.csv` with `csv.DictReader` | Matches all six scenarios' PASS/FAIL splits and ENUM columns |
| Live twin disagreement | 3 disagreed, 2 agreed | ran `twin_divergence.py` directly against the live `results.csv` | Matches |
| Byte parity, 7/7 pairs | claimed throughout | `validate_parity.py media-editor` | Matches, exit 0 |
| Statement residency | claimed sound | `residency_check.py media-editor` | Matches, exit 0 |
| Project-side tool calls, 8 runs | "2 Bash, 3 Read, 0 writes" (`adjudication.md`) | walked all 8 real `.jsonl` transcripts, counted `tool_use` blocks | Matches exactly |

**One count disagreement found, not claimed anywhere but worth recording as a tree inconsistency.** `sk-media-editor/SKILL.md` and `sk-media-editor/README.md` both declare `version: 1.4.2` / `1.4.2.0` after the `5a59ef6` contract-alignment commit, but `sk-media-editor/changelog/` has no `v1.4.2.0.md` file, only `v1.4.1.0.md` as its latest entry. The declared version and the changelog inventory disagree by one release. Neither `validate_parity.py` nor `residency_check.py` catches this (both check byte parity and statement residency, not changelog-to-version completeness), so it passes both fleet gates while still being a real mismatch in the tree.

---

## What nobody recorded

The single most significant item: **the contract-alignment repair is incomplete inside the files it touched.** `git show 5a59ef6` edited the Scenario Contract bullet and the feature-table row in both `generation-request-refusal.md` files but left the `### Pass / fail` prose subsection carrying the pre-repair, mismatched criteria in both files. Each scenario file now states its own pass/fail rule two different ways. This was not caught by `adjudication.md` or `sampling.md` (both predate the commit), not mentioned in the commit message or `SYNC.md`'s entry for it, and not something either fleet parity gate checks for, since both operate on declared statement inventories and byte parity between skill and Project, not on internal consistency within one scenario file.

Second, smaller item: the `SKILL.md`/`README.md` version bump to `1.4.2` has no matching changelog entry, found only by listing the changelog directory against the declared version rather than trusting either in isolation.

Third: `SID-001` and `PID-001`, the two scenarios the playbook's own release-readiness rule names as blocking gates, remain `FAIL` with no adjudication, no repair attempt, and no entry in the fleet's runtime-faults-recorded ledger, because they agree with each other and so never trip the twin-divergence check that triggered every other piece of follow-up work on this system.
