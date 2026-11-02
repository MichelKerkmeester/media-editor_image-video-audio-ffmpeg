# Deep Research Dashboard

Lineage `deepseek`. Session `fanout-deepseek-1791115841524-lv22uz`.
Spec folder `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research`.
Status: complete. Stop reason: `maxIterationsReached`. Iterations: 5 of 5.

## Iteration Table

| run | focus | newInfoRatio | findings count | status |
| --- | --- | --- | --- | --- |
| 1 | CLI core: dispatch seam, argument errors as results, separate entry, config argv separation, exit codes and signal cleanup | 1.00 | 5 | complete |
| 2 | CLI surface and output: verbs, JSON intake, stdout shape, preview to file, startup cost and persistent cache, shared data dir | 0.70 | 7 | complete |
| 3 | Distribution: plugin CLI resolution, `CLAUDE_PLUGIN_ROOT` and plugin `bin/` from official docs, per-platform sharp and pinned ffmpeg, standalone install, dist layout | 0.80 | 6 | complete |
| 4 | Skill and Project split: mirror parity measured, proposal tested, Sync Loop declaration, route-order rewrite | 0.75 | 7 | complete |
| 5 | Naming and placement hardening plus the ranked change list | 0.85 | 8 | complete |

Total findings: 33.

## Question Status

9 of 9 answered.

| # | Question | Status | Iteration |
| --- | --- | --- | --- |
| Q1 | What must be decoupled so one dispatch path serves both MCP and CLI? | answered | 1 |
| Q2 | How should argument errors, exit codes, signals and child cleanup behave in a shared-handler CLI? | answered | 1 |
| Q3 | What CLI surface matches the 40 handlers without a second contract? | answered | 2 |
| Q4 | How does the plugin ship and locate the CLI, and what do the official docs say about `${CLAUDE_PLUGIN_ROOT}` and plugin `bin/`? | answered | 3 |
| Q5 | Can the skill go CLI-only while the mirror pairs keep parity, and what does the Sync Loop declaration require? | answered | 4 |
| Q6 | Which files carry the route-order rewrite, and what breaks in the router benchmark? | answered | 4 |
| Q7 | What gate wording makes a batch ask once about names and one place? | answered | 5 |
| Q8 | Which batch placement mechanism is worth building, and is `maxBytes` or a server guard worth the friction? | answered | 5 |
| Q9 | What is the ranked change list across the four phases? | answered | 5 |

## Convergence Trend

1.00 then 0.70 then 0.80 then 0.75 then 0.85.

Direction: flat with a rising last value. The threshold is 0.05 and no iteration came close to it,
so no convergence occurred and the loop ran to the cap. The rising fifth value is consistent with
intent rather than a signal failure: iteration 5 turned four iterations of design context into new
artifact text and a ranked phase list, which is new to the packet by construction.

## Open Questions Carried Forward

Five. None blocks the ranked change list. They are listed in `research.md` section 15.

1. Whether `layout: 'many'` reaches `writeImageOutputs` from a multi-input `image_convert`.
2. Whether the inline env prefix composes in a skill Markdown body.
3. Whether `unmirrored_sources` accepts a second entry without a kernel review decision.
4. The full read of `benchmark/router/differential.py`, which would size the `HOST_STATES` change.
5. Whether a third copy of the router code exists beyond the two found.

## Dead Ends

Consolidated from iteration `ruledOut` entries. The full table with evidence is in `research.md`
section 14.

- Two weaker CLI seams: re-exporting the registry module, and duplicating dispatch logic.
- One weaker entry pattern: a `--cli` branch inside the existing self-running `index.ts`.
- Two weaker config paths: env-only config, and a tool-flag skip list inside `loadConfig`.
- One rejected refactor: an `AbortSignal` threaded through every handler signature.
- Four rejected CLI surfaces: a checked-in manifest, hand-written help text, shelling to
  `tools/list`, and per-field flags.
- Two rejected output shapes: text-only stdout, and a CLI result envelope.
- Three rejected preview and process models: base64 previews on stdout, previews in the export root,
  and a daemon.
- Two rejected data-folder rules: a `--data-dir` flag, and a per-project data folder.
- Three rejected plugin shipping routes: a root `bin/` shim, a shell variable reference in a skill,
  and a hard-coded install path.
- Three rejected packaging routes: a separate `cli/` package, a bundled single-file CLI now, and a
  compiled standalone binary, plus npm publish.
- One rejected skill rule: assuming shell execution always happens.
- Three rejected split shapes: splitting `setup.md`, two per-surface `choose_route` functions, and
  adding the CLI as a fifth mode.
- Three rejected gate changes: banning MCP in the parity scan, deleting `SRO-001`, and unpairing it.
- One rejected declaration stance: leaving `systems.py` untouched.
- One rejected kernel change: widening ESCALATE 1 to cover placement.
- Two rejected naming rules: a second folder question, and a required `fileName`.
- One rejected placement field: `targetFolder`.
- Two rejected size approaches: `maxBytes` on `image_convert`, and folding it into a description.
- One rejected guard: a server-side unconfirmed-name check.

## Active Risks

None unguarded. The five open questions above are the residual uncertainty, and `research.md`
section 13 maps six implementation risks to mitigations.

One process risk is worth recording. Two claims in the packet rest on inference rather than a
command: the multi-input `image_convert` write path in phase item 2.10, and the inline env prefix in
the skill's invocation line. Both are flagged at their point of use and both have a cheap closing
check named.

## Next Focus

None. The loop reached the iteration cap and the synthesis is complete.

## Lead Steer

`steer.md` was read after iteration 5 and is listed among this packet's sources. It asked for one
thing: a state record per iteration in `deep-research-state.jsonl` carrying the four route keys, the
same four keys on each delta's iteration record, and a terminal synthesis record whose `stopReason`
is `maxIterationsReached`.

All three were applied after the iteration files were written. Every state record now carries
`mode`, `target_agent`, `agent_definition_loaded` and `resolved_route` beside its iteration fields,
every `deltas/iter-NNN.jsonl` iteration record carries the same four keys, and the state log ends
with a `"type":"synthesis"` record whose `stopReason` is `maxIterationsReached`.

Verification, run for each iteration:

```text
node .skilled/skills/system-deep-loop/runtime/scripts/verify-iteration.cjs \
  --loop-type research --artifact-dir <this lineage dir> --iteration N
```

All five returned `OK iteration N complete: narrative + route-proof + delta` with exit 0.

The steer explicitly declined to change the content depth of the iteration files, so no iteration
narrative was revised for it. That was a records-only correction.
