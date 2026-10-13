# Baseline before phase 002

Captured 2026-10-04 from the shared tree on `main`, before any change under `AI Systems/`. Every command below is read-only for tracked files: `git status` in the Media Editor repository was empty before and after the runs.

## Repository heads

| Repository | Command | HEAD |
|------------|---------|------|
| Media Editor (nested) | `git -C "AI Systems/Media Editor" rev-parse HEAD` | `044df9c5d710ee1ee0fdec86405089ad6e9ea863` |
| Parent | `git rev-parse HEAD` | `805794e05d2d7002820c2d3d143240a98b94a969` |

## Media Editor runtime, run in `AI Systems/Media Editor/mcp server`

`npm run test:pinned`, exit 0:

```text
Pinned darwin-arm64 ffmpeg 9.0.2-https://www.martin-riedl.de from /Users/michelkerkmeester/MEGA/Development/AI Systems/AI Systems/Media Editor/mcp server/build/pinned/darwin-arm64
 Test Files  86 passed (86)
      Tests  1749 passed | 4 skipped (1753)
   Duration  21.26s (tests 71%, import 25%, transform 3%)
```

`npx vitest run tests/packaging`, exit 0:

```text
 Test Files  8 passed (8)
      Tests  139 passed | 2 skipped (141)
   Duration  14.01s (tests 83%, import 10%, transform 7%)
```

## Playbook, run from the repo root

`node .claude/skills/sk-doc/sk-create-manual-testing-playbook/scripts/validate-playbook-package.cjs --repo-root "$PWD" --package "AI Systems/Media Editor/sk-media-editor/manual-testing-playbook"`, exit 0:

```text
contract=operator-scenario routing_gold_contract=routing-gold strict=on
PASS package=../../../../AI Systems/AI Systems/Media Editor/sk-media-editor tier=FAIL_CLOSED scenarios=30 categories=18 operator=30 routing_gold_excluded=0 violations=0 warnings=0
exit=0
```

## Parity and residency, run in `AI Systems/Media Editor` with a fresh `PYTHONPYCACHEPREFIX`

`bash benchmark/parity/run_parity.sh`, exit 0:

```text
Media Editor parity, range origin/main..HEAD
  pairs: 7 of 7 declared resolved, 8 sources, 1 deliberately unmirrored
  manifest: 7 named across 0 roll-up row(s), 7 on disk, declared total(s) [7]
  version claims: kernel v1.0.0 and Skill v1.0.0.0 live, README states ['1.0.0'] and ['1.0.0.0']
  review-due drift: 7 of 7 owned pairs in step
PASSED 7/7 declared pairs, seven checks
```

`bash benchmark/parity/run_residency.sh`, exit 0:

```text
PASSED 1 system(s), every declared statement owned and placed
```

## Mirror pairs checked by hand

`cmp` found no difference for each of these skill and Project pairs:

| Skill side | Project side |
|------------|--------------|
| `sk-media-editor/references/tools.md` | `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md` |
| `sk-media-editor/references/setup.md` | `claude project/knowledge/Media Editor - Reference - Setup.md` |
| `sk-media-editor/references/interactive-intelligence.md` | `claude project/knowledge/Media Editor - System - Interactive Intelligence.md` |

## Folder name mentions

`rg -c "mcp server" --glob '!**/node_modules/**' --glob '!**/changelog/**'` in `AI Systems/Media Editor` counted 69 matching lines across 40 files. Outside the Media Editor folder and `specs/`, the parent repository names the folder only in Sync Loop episode logs, which are dated records.

## Executor canaries

Each canary sent the one-line prompt `Reply with exactly: OK`, read-only, from the repo root with `AI_SESSION_CHILD=1 SYSTEM_SPEC_GATE_ENFORCE=0`.

| Executor | Command | Answer | Errors |
|----------|---------|--------|--------|
| cli-pi DeepSeek V4.1 Flash max | `pi -p --offline --no-tools --model opencode-go/deepseek-v4.1-flash --thinking max --mode json "..." </dev/null`, with `PI_BLACKHOLE_PASSIVE=true` | `OK`, read from the assistant `message_end` event: `stopReason=stop`, `provider=opencode-go`, `model=deepseek-v4.1-flash` | None. OpenCode Go works, so the Cline fallback was not needed |
| cli-codex GPT-6 Luna max fast | `codex exec --model gpt-6-luna -c model_reasoning_effort="max" -c service_tier="fast" --sandbox read-only -o <file> "..." </dev/null` | `OK` as the last message. The run header printed `model: gpt-6-luna`, `sandbox: read-only`, `reasoning effort: max` | None. The header does not print the service tier, so the fast tier is passed but not confirmed by output |
| cli-devin SWE 2 max | `devin -p --model swe-2-max --permission-mode auto -- "..." </dev/null` | `OK` | None. Devin prints no model name in print mode. A probe with `--model swe-2-nonexistent` failed with `Error: Unknown model`, so the flag is validated and `swe-2-max` was accepted |
