# Deep Research Dashboard

- Session: fanout-deepseek-1791117729260-kpn1og
- Lineage: deepseek
- Executor: cli-pi model=opencode-go/deepseek-v4.1-flash
- Loop type: research
- Iterations planned: 5, iterations complete: 5
- Stop policy: max-iterations, reached
- Convergence threshold: 0.05, treated as telemetry only
- Stop reason: maxIterationsReached

## Iteration ledger

| Iteration | Focus | Findings | newInfoRatio |
|---|---|---|---|
| 1 | CLI core | 7 | 0.82 |
| 2 | CLI surface and output | 9 | 0.78 |
| 3 | Distribution | 8 | 0.80 |
| 4 | Skill and Project split | 10 | 0.75 |
| 5 | Naming hardening and the ranked list | 12 | 0.70 |

Average newInfoRatio: 0.77. No convergence stop was taken, because the stop policy is max-iterations.

## Outputs

- `iterations/iteration-001.md` to `iterations/iteration-005.md`
- `deltas/iter-001.jsonl` to `deltas/iter-005.jsonl`
- `research.md`, `findings-registry.json`, `resource-map.md`
