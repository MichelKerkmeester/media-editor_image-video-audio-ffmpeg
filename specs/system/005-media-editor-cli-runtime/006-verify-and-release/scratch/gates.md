# Gate run, baseline against final

Final state: the working tree on 2026-10-04 after phases 002 to 005, Media Editor `2749c54` and parent `0d9d802a` plus uncommitted changes. Nothing is committed.

## Runtime, run in `AI Systems/Media Editor/runtime/`

| Gate | Command | Exit | Baseline | Final |
|------|---------|------|----------|-------|
| Build | `npm run build` | 0 | not recorded | 0 |
| Typecheck | `npm run typecheck` | 0 | not recorded | 0 |
| Bundles | `npm run bundle -- --all` | 0 | not recorded | 5 bundles |
| Plugin | `npm run plugin` | 0 | not recorded | server, skill 60 files, bin 2 files |
| Pinned suite | `npm run test:pinned` | 0 | 86 files, 1,749 passed, 4 skipped (before phase 002) | 91 files, 1,824 passed, 4 skipped of 1,828 |
| Packaging | `npx vitest run tests/packaging` | 0 | 8 files, 139 passed, 2 skipped | 8 files, 149 passed, 2 skipped |
| Plugin manifest | `claude plugin validate claude-plugin/.claude-plugin/plugin.json` | 0 | not run | Validation passed |
| Marketplace | `claude plugin validate claude-plugin` | 0 | not run | Validation passed |

## Sandbox clone, the parent cloned with the live Media Editor and Sync Loop trees replayed as one commit

| Gate | Command | Exit | Baseline | Final |
|------|---------|------|----------|-------|
| Router fixtures | `bash benchmark/router/run_fixtures.sh` | 0 | 22/22, differential 66/66, phase 005 start | 22/22, differential 132/132 |
| Differential | `python3 benchmark/router/differential.py` | 0 | 66/66, 3 host states | 132/132, 6 host states |
| Rule parity | `python3 benchmark/gates/rule_parity.py` | 0 | 5 rules | 5 rules |
| Parity | `bash benchmark/parity/run_parity.sh` | 0 | 7/7 pairs | 7/7 pairs, 2 unmirrored sources |
| Residency | `bash benchmark/parity/run_residency.sh` | 0 | PASSED | PASSED |
| Pair divergence | `python3 pair_divergence.py media-editor` | 0 | 7 pairs | 7 pairs |
| Twin divergence | `python3 benchmark/grader/twin_divergence.py benchmark/grader/fixtures/sample-report` | 0 | not run on the fixture | every paired twin agreed |
| Report check | `bash benchmark/grader/check_report.sh benchmark/grader/fixtures/sample-report` | 0 | not run | 1 report check clean |
| Record claims | `python3 record_claims.py media-editor` | 0 | 58 claims, phase 003 run | 58 claims |
| Carrier evidence | `python3 carrier_query_evidence.py` | 0 | not run | all checks PASS |
| Playbook | `validate-playbook-package.cjs --package "AI Systems/Media Editor/sk-media-editor/manual-testing-playbook"` | 0 | 30 scenarios, 18 categories | 32 scenarios, 19 categories, 0 violations |

The twin gate's own dated report, `benchmark/reports/2026-09-17--manual-testing-playbook--claude-sonnet-5-medium`, still shows 3 disagreeing twins. That is the recorded verdict of a past manual run, unchanged by this work.

## Skill and packet

| Gate | Command | Exit | Final |
|------|---------|------|-------|
| Skill root metadata | `ci-skill-root-metadata.cjs --skills-dir "AI Systems/Media Editor"` | 0 | checked 1, passed 1 |
| Skill package | `validate_skill_package.py "AI Systems/Media Editor/sk-media-editor" --strict` | 0 | PASS |
| Packet | `validate.sh AI Systems/Media Editor/specs/005-media-editor-cli-runtime --recursive --strict` | see the summary | RESULT line recorded in implementation-summary.md |

Baselines come from `../scratch/baseline.md` (before phase 002) unless the row names a later run. The phase 005 start run is the sandbox clone taken before any phase 005 edit.

## Round 2, after the trigger fix, the 1.1.0 version and the rewording

Every gate reran from the final state on 2026-10-04. Runtime gates ran in the live runtime folder, the rest in a fresh sandbox clone.

| Gate | Exit | Round 1 | Round 2 |
|------|------|---------|---------|
| `npm run build` | 0 | pass | pass |
| `npm run typecheck` | 0 | pass | pass |
| `npm run bundle -- --all` | 0 | 5 bundles | 5 bundles, manifest version 1.1.0, darwin-arm64 SHA-256 `9e7d8cb2a6ed0f627f3eb0b29f57813324f61cd6a41a0c9d507ebf57a92b637e` |
| `npm run plugin` | 0 | skill 60 files, bin 2 | server 1.1.0, skill 61 files, bin 2 |
| `npm run test:pinned` | 0 | 91 files, 1,824 passed, 4 skipped | 91 files, 1,824 passed, 4 skipped |
| `npx vitest run tests/packaging` | 0 | 149 passed, 2 skipped | 149 passed, 2 skipped |
| `claude plugin validate` manifest and marketplace | 0, 0 | passed | passed |
| Router fixtures | 0 | 22/22 | 22/22 |
| Differential | 0 | 132/132 | 132/132 |
| Rule parity | 0 | 5 rules | 5 rules |
| Parity | 0 | 7/7 | 7/7 |
| Residency | 0 | PASSED | PASSED |
| Twin divergence, sample | 0 | agreed | agreed |
| Report check, sample | 0 | 1 clean | 1 clean |
| Pair divergence | 0 | 7 pairs | 7 pairs |
| Record claims | 0 | 58 claims | 58 claims |
| Carrier evidence | 0 | all PASS | all PASS |
| Playbook validator | 0 | 32 scenarios, 19 categories | 32 scenarios, 19 categories, 0 violations |
| `ci-skill-root-metadata` | 0 | 1 of 1 | 1 of 1 |
| `validate_skill_package --strict` | 0 | PASS | PASS |

The literal-string check, run from the repository root, returned no line and exit 1:

```bash
rg -n "mcp server" --hidden -g '!.git' -g '!**/node_modules/**' -g '!**/changelog/**' -g '!**/reports/**' -g '!**/episodes/**' -g '!specs/**' .
```

## Round 3, the final state after the playbook fixes

Every gate reran on 2026-10-05 after the source fixes the playbook rounds found, and the suite, plugin build and declaration gates (router fixtures, residency, parity, rule parity and pair divergence) reran again after each later fix through round 10 with the same results. The fixes: `media_health` now returns `nextStep`, the kernel and the skill carry the confirmation, Repair advice, file path and size-limit rules, and `systems.py` carries the four resynced kernel statements. Runtime gates ran in the live runtime folder. The rest ran in a fresh sandbox clone holding the release as one commit over `origin/main`, the shape the real commit will have.

| Gate | Exit | Round 3 |
|------|------|---------|
| `npm run build` | 0 | pass |
| `npm run typecheck` | 0 | pass |
| `npm run bundle -- --all` | 0 | 5 bundles, darwin-arm64 SHA-256 `c98c31528f44eb6c39d0b30bdd91f847780df0643563292f16e6485cd4b049f3` |
| `npm run plugin` | 0 | server 1.1.0, skill 61 files, bin 2 |
| `npm run test:pinned` | 0 | 91 files, 1,826 passed, 4 skipped |
| `npx vitest run tests/packaging` | 0 | 8 files, 150 passed, 2 skipped |
| `claude plugin validate` manifest and marketplace | 0, 0 | passed |
| Router fixtures | 0 | 132/132 |
| Differential | 0 | 132/132, 6 host states |
| Rule parity | 0 | 5 rules |
| Parity | 0 | 7/7 |
| Residency | 0 | PASSED, after the four kernel statements were resynced |
| Twin divergence, sample | 0 | agreed |
| Report check, sample | 0 | 1 clean |
| Pair divergence | 0 | 7 pairs |
| Record claims | 0 | pass |
| Carrier evidence | 0 | all PASS |
| Playbook validator, both packages | 0 | Media Editor 32 scenarios, 19 categories, Sync Loop 5 scenarios, 0 violations each |
| Catalog validator, both packages | 0 | 0 violations each |
| Sync Loop alignment drift | 0 | 0 findings |
| `ci-skill-root-metadata` | 0 | 1 of 1 |
| `validate_skill_package --strict` | 0 | PASS |

The first clone run of this round failed parity and residency, and both were real. Parity failed because the clone then held three sandbox commits, two of which edited the kernel without a version bump, so the clone was rebuilt as one commit. Residency failed because four declared kernel statements no longer matched the edited kernel, so they were resynced with `resync_statement.py`, run three times until it reported 0, and the diff was confirmed to touch only the `media-editor` block.

The Sync Loop playbook ran in the clone. `sync-loop-playbook-run.md` holds every command, output and exit. The orchestrator reran PAR-001, REC-001 with its check, REC-002, SELF-001, SELF-002, EXP-001 and all six four-verbs rows itself, and every one matched its scenario after the VERB-003 quote fix.

## Playbook rounds, every Media Editor scenario at Sonnet 5.5 medium

Each round ran all 32 scenarios one at a time, each in a fresh session on its own packaging through `run_packaging.sh`, every turn of its conversation chain sent exactly, from a fresh disposable copy of the system. Each run's bundle holds the contract, every reply, the file ledger per turn, the seed checksums per turn and every tool call. Rounds 1 and 2 were graded by Luna. From round 3, DeepSeek V4.1 Flash max graded every round through Pi's opencode-go provider, because Devin's DeepSeek quota stayed exhausted, and Luna graded independently whenever its usage limit allowed. The operator then chose Pi's Cline provider for DeepSeek, with SWE 2 max on Devin as the fallback, so round 10 was graded again on that route. Its top thinking tier is `xhigh`, since the Cline route has no `max`.

| Round | DeepSeek or first grader | Luna | Failures and the fix at their cause |
|-------|--------------------------|------|-------------------------------------|
| 1 | 19 PASS, 13 FAIL (Luna) | same | Kernel and skill rules for 11 scenarios, contracts for SAI-001 and SRM-001 |
| 2 | 29 PASS, 3 FAIL (Luna) | same | SRM-001 harness: seed checksums per turn. PRM-001: Repair advice answers at once. PRO-001: the Project cannot list a folder, so the prompt names the file and the harness withholds file search |
| 3 | 29 PASS, 3 FAIL | not run, limit | STV-002: `media_health` now returns `nextStep`. SHL-001: a confirmation accepts the stated recommendation. PRO-002: the setup offer is part of the no-tools delivery |
| 4 | 31 PASS, 1 FAIL | not run, limit | PSB-002: an oversized request leads with the limit and the lighter path |
| 5 | 31 PASS, 1 FAIL | not run, limit | PAI-001: unknown media still gets a working name from the stated purpose |
| 6 | 32 PASS | not run | The working-name example was copied verbatim into an unrelated reply, so the example was removed |
| 7 | 32 PASS | 28 PASS, 4 FAIL | SCR-005, SAI-001, SRO-002: the ffmpeg route had no stated way to look, so it renders a temp preview outside `media files/` and the contracts say a naming preview is not a write. PHL-001: contract wording |
| 8 | 32 PASS | 30 PASS, 2 FAIL | PNE-001, real and missed by DeepSeek: an invalid `-b128k` patched in prose, so a noticed mistake repeats the whole corrected command. PHL-001: wording from round 7 read as a requirement |
| 9 | 31 PASS, 1 FAIL | not run, limit | SED-003: when every name and place is settled, nothing is left to ask |
| 10 | 32 PASS on the opencode-go route, and 32 PASS again on Pi's Cline provider at `xhigh`, the operator's chosen DeepSeek route | 29 PASS, 3 FAIL | SED-003, real: a second trial encode replaced the file with `-y`, so the ffmpeg route writes with `-n` and tunes size targets in the temp folder. PAI-001, real: the working name was deferred, so the ambiguity rule itself now requires it. SAI-001, a grader overreach, since the skill's own rule picks the matching file from the listing, so the contract now says so |
| 11 | 32 PASS on Pi's Cline provider at `xhigh` | 31 PASS, 1 FAIL, then 32 PASS | PAI-001, a scenario defect: its Turn 1 check "No mode named" contradicted the mandatory Interactive Mode attestation, so the check now reads "no image, video, audio, HLS or repair mode". The run was left unchanged and both graders graded it again from the same bundle, and both passed it |

Every fix after round 2 changed a source rule, then the plugin, the full test suite, the declaration gates in a fresh clone and the disposable copy were rebuilt before the next full round. No round reused runs from an earlier state.

Round 10 also got the orchestrator's own review: no malformed ffmpeg option in any reply, checked against the pinned ffmpeg's own option list, no prose correction of a command and no Turn 1 write under `media files/` outside the scenario that requires one.

The three live plain-project skill runs were rerun after every skill change. The final three, on the round 11 state, each loaded `media-editor:sk-media-editor`, wrote nothing in Turn 1 and put four readable WebP files of at most 99,728 bytes into one `001 - webp-under-100kb/` folder in Turn 2, saved as `graded-replies/round7-run*`. In two of them the first `targetFolder` call left out `outputName` and was refused with `INVALID_INPUT`, then repeated with it. `cli.md` and `image-operations.md` both state the field is required on every call, so this is friction rather than a failure, and nothing was written in the wrong place.

The benchmark report of round 11 is `AI Systems/Media Editor/benchmark/reports/2026-10-05--manual-testing-playbook--claude-sonnet-5-5-medium/`, 32 of 32 PASS. `check_report.sh` on it exits 0 with 1 report check clean, and `twin_divergence.py` exits 0 with 7 twins agreed and 0 disagreed.

## Final state, rerun after round 11

Every gate reran on 2026-10-05 from the final state, after the round 11 contract fix, the `SYNC.md` note and the changelog entries. Runtime gates ran in the live runtime folder. The rest ran in a fresh sandbox clone holding the release as one commit over `origin/main` `0d9d802a`. The validators ran from the repository root with `--repo-root` set, because the `.skilled` link points into another checkout and a validator left to find its own root reads every relative link as outside the repository. The first attempt of this rerun left that flag off and failed both playbook validators with 107 and 1 `PATH_OUTSIDE_REPO` findings, and called the catalog validator with a path it does not take. Both were invocation errors, fixed in the command, not in the packages.

| Gate | Exit | Final |
|------|------|-------|
| `npm run build` | 0 | pass |
| `npm run typecheck` | 0 | pass |
| `npm run bundle -- --all` | 0 | 5 bundles, darwin-arm64 SHA-256 `7fd0a1205db113f53379b60398d7809d55513c3358d78713ccd7516958b9e327` |
| `npm run plugin` | 0 | server 1.1.0, skill 61 files, bin 2 |
| `npm run test:pinned` | 0 | 91 files, 1,826 passed, 4 skipped of 1,830 |
| `npx vitest run tests/packaging` | 0 | 8 files, 150 passed, 2 skipped of 152 |
| `claude plugin validate` manifest | 0 | passed |
| `claude plugin validate` marketplace | 0 | passed |
| Router fixtures | 0 | 22/22, differential 132/132 |
| Differential | 0 | 132/132, 6 host states |
| Rule parity | 0 | 5 rules |
| Parity | 0 | 7/7 pairs |
| Residency | 0 | PASSED |
| Twin divergence, sample | 0 | agreed |
| Report check, sample | 0 | 1 clean |
| Twin divergence, round 11 report | 0 | 7 agreed, 0 disagreed |
| Report check, round 11 report | 0 | 1 clean |
| Pair divergence | 0 | 7 pairs |
| Record claims | 0 | 58 claims |
| Carrier evidence | 0 | all PASS |
| Playbook validator, Media Editor | 0 | 32 scenarios, 19 categories, 0 violations |
| Playbook validator, Sync Loop | 0 | 5 scenarios, 5 categories, 0 violations |
| Catalog validator, Media Editor | 0 | 0 violations |
| Catalog validator, Sync Loop | 0 | 0 violations |
| Sync Loop alignment drift | 0 | 0 warnings, 0 violations |
| `ci-skill-root-metadata` | 0 | 1 of 1 |
| `validate_skill_package --strict` | 0 | PASS |

The `.mcpb` bundles are not byte-reproducible. Five builds of the same source on 2026-10-05 gave five different darwin-arm64 digests, so `operator-ped-001.md` carries the digest of the last build, the file now on disk.

## Live, after the commits

The operator approved the commits, the push and the release on 2026-10-05. Media Editor `215824e` and parent `71469389` were pushed, and `HEAD` equals `origin/main` in both. Release `v1.1.0.0` is published as Latest at `215824e` with the five `.mcpb` files, each digest in the GitHub API equal to the local file. The declaration gates then ran live in the shared tree at `71469389`.

| Gate | Exit | Live |
|------|------|------|
| Router fixtures | 0 | 22/22, differential 132/132 |
| Differential | 0 | 132/132, 6 host states |
| Rule parity | 0 | 5 rules |
| Parity | 0 | 7/7 pairs |
| Residency | 0 | PASSED |
| Pair divergence | 0 | 7 pairs |
| Record claims | 0 | 58 claims |
| Carrier evidence | 0 | all PASS |

The Media Editor push reported three Dependabot alerts on `runtime/package-lock.json`, `tmp` twice and `node-forge`, all through the devDependency `@anthropic-ai/mcpb`. They are the same three advisories that sat on the old `mcp server/package-lock.json`. Those closed as fixed at 07:46:22 when the path left the tree, and the new ones opened one second later. The bundles do not ship `@anthropic-ai/mcpb`, and `node-forge` has no patched release.

## Follow-up, after the release

Two loose ends showed after the release, and the operator approved a follow-up commit and push in both repositories on 2026-10-05.

- The parent goal's first criterion failed: `rg "mcp server"` outside dated records found one line, a lowercase duplicate trigger phrase `"mcp server entry"` in the catalog leaf `distribution/mcp-server-entry.md`, added with the catalog after the round 2 check. The duplicate was removed and the capitalised phrase kept. `rg` now returns no line, exit 1.
- `tmp` was overridden to `^0.2.6` in the runtime, so the bundle builder's `external-editor` resolves `tmp` 0.2.7. The lockfile also took the `media-editor` bin entry that `package.json` already declared. `npm audit --package-lock-only` went from 6 findings to 2, both `node-forge`, which has no patched release. After the push, Dependabot alerts 4 and 5 for `tmp` closed as fixed within 40 seconds and no new alert opened. Alert 6, `node-forge`, stays open.

The suite, packaging tests, bundle build and plugin build reran before the commits: `test:pinned` 91 files and 1,826 passed, packaging 150 passed, both exit 0. The bundle grew 15 bytes because it packs `package.json`, so the local darwin-arm64 file no longer matches the released asset, and `operator-ped-001.md` now points at the release download with its digest `7fd0a120...`. Media Editor `ad758ed` and parent `3ea7118d` were pushed, and `HEAD` equals `origin/main` in both.

The live gates reran at `3ea7118d`, 12 rows, every exit 0.

| Gate | Exit | Live after the follow-up |
|------|------|--------------------------|
| Router fixtures | 0 | 22/22 |
| Differential | 0 | 132/132 |
| Rule parity | 0 | 5 rules |
| Parity | 0 | 7/7 pairs |
| Residency | 0 | PASSED |
| Pair divergence | 0 | 7 pairs |
| Record claims | 0 | 58 claims |
| Carrier evidence | 0 | all PASS |
| Playbook validator, Media Editor | 0 | 32 scenarios, 0 violations |
| Catalog validator, Media Editor | 0 | 0 violations |
| `ci-skill-root-metadata` | 0 | 1 of 1 |
| `validate_skill_package --strict` | 0 | PASS |

Row counts: the final-state table holds 27 gates, the live table after the commits 8 and this table 12.


## Release alignment, after the follow-up

On the operator's request the v1.1.0.0 changelog was rewritten to lead with the skill's move from an MCP server to the `media-editor` command, retitled "The Skill Moves Off MCP and Asks Before It Writes", and pushed as Media Editor `718eeb8` and parent `99e4022a`. `hvr_scan.py` reports 0 hard blockers and `validate_document.py` VALID.

Both releases now follow the skilled release shape. Each tag is annotated with the message `vX: Heading`, the operator approved replacing the two lightweight tags in place at the same commits, `2749c54` and `215824e`. The titles read `v1.0.0.0 — Readable Names and a Tidy Export Folder` and `v1.1.0.0 — The Skill Moves Off MCP and Asks Before It Writes`, with the em dash the operator chose to match the skilled repository. Each body is its changelog without frontmatter or title, ending in a `Full changelog:` line. `v1.1.0.0` stays Latest with its five assets, and the latest download link answers 200.

The entry was then reworded on the operator's request to say the command serves any terminal agent, such as Codex, OpenCode or Pi through the standalone `npm link` install, with Claude Code one route among them. Pushed as Media Editor `a1487c7` and parent `54dc5970`, and the `v1.1.0.0` release notes took the same text.
