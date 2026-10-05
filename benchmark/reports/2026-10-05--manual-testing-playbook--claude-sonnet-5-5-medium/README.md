# Media Editor manual testing playbook run, 2026-10-05

Every scenario in `sk-media-editor/manual-testing-playbook/` run on its own packaging, model `claude-sonnet-5-5`, effort `medium`, through the shared harness `run_packaging.sh`. This folder holds the final round. The rounds before it, and the fix each failure got at its cause, are recorded in `specs/088-media-editor-cli-runtime/006-verify-and-release/scratch/gates.md`.

## 1. What was run

- 32 scenarios, 19 skill and 13 Project, counted from the playbook's own scenario files
- One fresh session per scenario, every turn of its conversation chain sent exactly, from a fresh disposable copy of the system
- Seeds placed before turn 1 with `--seed`. Skill runs that name the Claude Code plugin load it with `--plugin-dir`. `STV-001` and `STV-002` ran with no ffmpeg on the path, and `STV-002` with the plugin's bundled ffmpeg removed and an empty data folder
- `PRO-001` and `PED-001` stand in for Claude Desktop with the extension: the extension's MCP server is connected with `--mcp-config`, and file search is withheld with `--deny Glob --deny Grep`, because the extension cannot list a folder
- Every turn recorded the reply, a file ledger and each seed's SHA-256 against its fixture

## 2. How it was graded

Two models graded every run against the scenario's own contract, from a bundle holding the contract, every reply, the ledgers, the seed checksums and every tool call in order: DeepSeek V4.1 Flash through Pi's Cline provider at `xhigh`, that route's top thinking tier, and GPT-6 Luna at max effort on the fast tier through Codex. Each grader worked alone. A scenario passes only when both graders pass it. The orchestrator then checked every ffmpeg option in every reply against the pinned ffmpeg's own option list and read the ledgers for writes a contract forbids.

## 3. Counts

| Side | Scenarios | PASS | FAIL |
|---|---|---|---|
| Skill | 19 | 19 | 0 |
| Project | 13 | 13 | 0 |
| Total | 32 | 32 | 0 |

In this round DeepSeek passed all 32. Luna passed 31 and failed `PAI-001` on one Turn 1 state check, "No mode named", which contradicted the scenario's own pass rule, since an unclear request binds Interactive Mode and the attestation must name it. The check was reworded to "no image, video, audio, HLS or repair mode", the run itself was left unchanged, and both graders graded `PAI-001` again from the same bundle and passed it. `verdicts/` holds the regraded row for `PAI-001`.

`results.csv` holds one row per scenario. `replies/` holds every turn's reply per scenario. `verdicts/` holds both graders' verdicts with the evidence each criterion rests on.

## 4. Earlier rounds

Ten full rounds ran before this one. Each failure was classified as a system, scenario or harness cause and fixed at that cause, then the plugin, the test suite, the declaration gates and the disposable copy were rebuilt and every scenario ran again. The failures by round, and their fixes, are in the `gates.md` table named above. Two grader errors were found along the way, one each way: DeepSeek passed an invalid `-b128k` flag that Luna caught, and Luna read a scenario's allowance as a requirement, which was a wording defect in the scenario and was fixed there.
