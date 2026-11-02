# Closeout fix proposal: count-only findings from CLI lineages

Proposed, not applied. Every path below is under `.skilled/skills/system-deep-loop/runtime/` at runtime commit `89a42bc0cd` unless it says otherwise. The coordinator decides whether to land it.

The code below leaves out statement terminators, because this packet bans semicolons in the files it writes. Add them in the target files' own style when applying.

## 1. Root cause

**The check.** `synthesis-closeout.cjs` fails a research close in two cases:

- `count_only_state_findings_not_reconstructed`: an iteration record carries only a `findingsCount` (`countOnlyFindings`, `scripts/synthesis-closeout.cjs:255-263`) and the merged registry's `metrics.sourceFindings` is smaller than the total of those counts (`:360-368`).
- `state_finding_reconstruction_gap`: `metrics.reconstructionGaps > 0` (`:369-371`).

The closeout counts a structured finding only under `keyFindings` or `findings` (`FINDING_FIELDS`, `:36-39`), and reads a bare count through `countIterationFindings` (`:188-196`).

**What counts as reconstructable.** `fanout-merge.cjs` rebuilds a count-only record only when one of three sources holds exactly `findingsCount` items (`researchCandidatesFromIteration`, `scripts/fanout-merge.cjs:1101-1139`):

- the iteration's `## Findings` section, using `### N.` subheadings or `N.` lines (`parseIterationMarkdownFindings`, `:187-213`)
- `graphEvents` FINDING nodes
- delta rows of `{"type":"finding"}` (`loadDeltaFindings`, `:238-290`)

When the rebuild comes back short, the merge writes `reconstructionGaps = countOnlyTotal - registryCount` (`:1331-1341`).

**What each lineage wrote.**

| Lineage | State records | Deltas | Iteration Markdown | Registry |
|---|---|---|---|---|
| deepseek (kept attempt) | 5 records, `findingsCount` 7, 9, 8, 10, 12 (46), no list | Iteration row only, no `finding` rows | No `## Findings` heading. Numbered topical sections (6, 7, 6, 6, 9) that match no count | 22 entries under `findings`, no iteration numbers |
| luna | 6 records (iteration 1 twice). Bare counts on 1 to 3, `findings` lists on 4 and 5 | Iteration row only, no `finding` rows | `## Findings` with 7, 7, 7, 8, 8 numbered lines | 24 `keyFindings` |

**Reproduction.** I copied the lineages into a scratch folder, then ran `fanout-merge.cjs` and `synthesis-closeout.cjs` unchanged:

| Copy | Merge | Closeout |
|---|---|---|
| both lineages | `keyFindings` 58, `sourceFindings` 65, gap 24 | exit 2, both invariants, count-only 74 |
| luna only | 36, 43, gap 0 | exit 0, `synthesis_complete` |
| deepseek only | 22, 22, gap 24 | exit 2, both invariants, count-only 46 |

The gap of 24 is DeepSeek's 46 claimed findings minus the 22 it listed. Luna reconstructs from its Markdown and is not the cause.

**Where the chain breaks.**

1. **Iteration prompt template.** The template is correct and carries the contract: `## Findings`, a `{"type":"finding","id","label","iteration","sources"}` delta row per finding (`skills/system-deep-loop/deep-research/assets/prompt-pack-iteration.md.tmpl:46,83-93`), and the same rules in `.skilled/agents/deep-research.md:195-210,296`.
2. **Executor adapter.** This is the defect. The workflow delivers the template only through `step_dispatch_iteration.render_prompt_pack` (`.skilled/commands/deep/assets/deep-research-auto.yaml:1145-1149,1174-1178`). A CLI lineage gets the single prompt from `buildLoopPrompt` (`scripts/fanout-run.cjs:1442-1574`), the same for every kind in `LINEAGE_COMMAND_ADAPTERS` (`:2845-2854`). That prompt carries none of the output contract and says only "Read SKILL.md and execute the loop". Its in-process directive (`:1467-1478`) also tells the model to treat the dispatch steps as "ALREADY SATISFIED", and the prompt pack is rendered inside one of those steps. A CLI lineage therefore sees the finding contract only if it goes and opens the template or the agent file. Luna's iteration headings match the agent file, while DeepSeek improvised its own format.
3. **CLI output capture.** Not the cause. pi without `--mode json` loses `stopReason`, but the artifacts are files the lineage writes itself, and all of them exist.
4. **Reducer.** It works as designed, but two runtime gaps let the fault through:
   - **No per-iteration gate.** `verify-iteration.cjs:301-309` accepts a delta that holds only the iteration row, and nothing checks that `findingsCount` is enumerated anywhere. So all 10 iterations passed, and the fault surfaced only at the closeout.
   - **Superseded records counted twice.** The closeout and the merge sum every iteration record (`synthesis-closeout.cjs:255-263,309`, `fanout-merge.cjs:1152-1160,1216-1226`), while `verify-iteration.cjs:288-296` and the reducer take the latest record per iteration. Luna's backfilled iteration 1 is counted twice: 11 iterations and 7 extra findings.

**Classification.** This is a runtime defect, and a model's output triggered it. The runtime never hands CLI lineages the finding contract and never gates on it, which leaves the outcome to the model's diligence. DeepSeek's count-only output was the trigger. My own `lineages/deepseek/steer.md` reinforced it by giving a state-row template that held `findingsCount` and no finding list.

**Native lineages.** By inference, a native lineage would not hit this. `buildNativeCommandInput` (`fanout-run.cjs:1572-1606`) runs the `:auto` command, and that renders the prompt pack and dispatches the agent with it on every iteration. I did not run it here. The missing gate in `verify-iteration.cjs` would affect native too, if a native leaf ever wrote bare counts.

**The first DeepSeek attempt.** It shares the root cause. Its prompt carried no record contract either, so it improvised in three ways:

- state records written in one batch at the end, so the ledger showed a lag of 2
- invented round timestamps up to 13:00:00 for a lineage that finished at 12:20:53 (`research/_attempts/orchestration-status-run-1.log:23` `timestamp_anomaly`)
- a registry with `openQuestions: 5` as a number

The archived files pass `verify-iteration.cjs` today. Its findings were in fact enumerated (33 claimed, 33 in its registry), but its registry crashes the merge at `fanout-merge.cjs:771` (`number 5 is not iterable`). The proof-field gap was caught because route proof is gated. The finding enumeration and the timestamps are not.

## 2. Proposed patch

### 2.1 `scripts/fanout-run.cjs`: carry the output contract into every CLI lineage prompt

```diff
@@ buildLoopPrompt, after inProcessDirective (:1478)
+  const leafContract = lineage.kind !== 'native'
+    ? [
+        `OUTPUT CONTRACT (binds every iteration, because no per-iteration prompt is rendered for you):`,
+        `Before iteration 1, read .skilled/skills/system-deep-loop/${agentName}/assets/prompt-pack-iteration.md.tmpl`,
+        `and .skilled/agents/${agentName}.md, and follow their OUTPUT CONTRACT for each iteration:`,
+        `- the iteration file has a "## Findings" section with one numbered line per finding`,
+        `- deltas/iter-NNN.jsonl holds the iteration record on line 1, then one`,
+        `  {"type":"finding","id":"<id>","label":"<finding text>","iteration":N,"sources":["<path or URL>"]} row per finding`,
+        `- the state record's findingsCount equals the number of finding rows in that delta`,
+        `- every timestamp is read from the clock when the record is written, and each state record`,
+        `  is appended right after its iteration, never in a batch at the end`,
+        ``,
+      ]
+    : []
@@ return [ ... ]
     ...inProcessDirective,
+    ...leafContract,
     `Read ${skillFile} and execute the ${loopType} loop with these parameters:`,
```

A review lineage gets the review wording, `findingDetails` instead of `finding` rows, in the same block keyed on `loopType`.

### 2.2 `scripts/verify-iteration.cjs`: fail an iteration whose findings are not enumerated

```diff
@@ REASONS (:59-70)
+  FINDINGS_NOT_ENUMERATED: 'findings_not_enumerated',
@@ after the delta check (:309)
+  if (loopType === 'research') {
+    const claimed = Math.floor(Number(iterationRecord.findingsCount))
+    if (Number.isFinite(claimed) && claimed > 0) {
+      const structured = [iterationRecord.keyFindings, iterationRecord.findings]
+        .find((value) => Array.isArray(value) && value.length > 0)
+      const enumerated = [
+        structured ? structured.length : 0,
+        deltaRecords.filter((r) => r && r.type === 'finding').length,
+        parseIterationMarkdownFindings(narrative, iteration, narrativePath).length,
+      ]
+      if (!enumerated.includes(claimed)) {
+        return {
+          ok: false,
+          reason: REASONS.FINDINGS_NOT_ENUMERATED,
+          detail: `iteration ${iteration} claims findingsCount=${claimed} but enumerates ${enumerated.join('/')} (state list/delta rows/## Findings lines)`,
+        }
+      }
+    }
+  }
```

`parseIterationMarkdownFindings` moves from `fanout-merge.cjs:187-213` into a new `lib/deep-loop/iteration-findings.cjs`, which both scripts require, so the gate and the merge can never disagree about what a Markdown finding is. The workflow's existing `redispatch_once` rule (`deep-research-auto.yaml:1752`) then repairs the iteration while it is still fresh, instead of the gap surfacing at the closeout.

### 2.3 `synthesis-closeout.cjs` and `fanout-merge.cjs`: latest record per iteration wins

```diff
+// Append-only logs can hold a superseded record for the same iteration. The
+// reducer and verify-iteration keep the latest one, so the close does too.
+function latestIterationRecords(records) {
+  const byRun = new Map()
+  records.forEach((record) => {
+    if (record && record.type === 'iteration') byRun.set(Number(record.run ?? record.iteration), record)
+  })
+  return records.filter((record) => !record || record.type !== 'iteration' || byRun.get(Number(record.run ?? record.iteration)) === record)
+}
```

Apply it to `stateRecords` at `synthesis-closeout.cjs:307` and in `fanout-merge.cjs` before `countOnlyResearchFindings` (`:1216`) and `rebuildResearchRegistryFromState` (`:1152`).

### 2.4 `scripts/fanout-merge.cjs:771`, related and found while reproducing

```diff
-    for (const q of registry.openQuestions ?? []) {
+    for (const q of Array.isArray(registry.openQuestions) ? registry.openQuestions : []) {
```

Apply the same guard to `resolvedQuestions` and `ruledOutDirections` in that loop. A registry that writes a count where a list belongs then degrades instead of aborting the merge for every lineage.

## 3. Tests

| File | Case | Expected |
|---|---|---|
| `tests/unit/verify-iteration.vitest.ts` | Research record with `findingsCount` 3, a delta with only the iteration row, a narrative with no `## Findings` | `ok: false`, `findings_not_enumerated` |
| same | Same record plus 3 delta `finding` rows | `ok: true` |
| same | Same record with a `## Findings` section of 3 numbered lines and no delta rows | `ok: true` |
| same | `findingsCount` 0 or absent | `ok: true`, unchanged behaviour |
| `tests/fanout-loop-prompt-in-process.test.ts` | `buildLoopPrompt` for `cli-pi` and `cli-codex` | Contains `OUTPUT CONTRACT` and the template path, placed before `Read .skilled/skills` |
| same | `buildLoopPrompt` for `native` | No `OUTPUT CONTRACT` block |
| new `tests/unit/synthesis-closeout-latest-record.vitest.ts` | Lineage log with iteration 1 recorded twice (bare `findingsCount` 7) and a `## Findings` list of 7 | Exit 0, `synthesis_complete`, `totalIterations` 1 |
| new `tests/unit/fanout-merge-question-shape.vitest.ts` | Lineage registry with `openQuestions: 5` | Merge exits 0 and the other lineage's findings survive |

**Regression proof on this packet's real artifacts, already run.** I ran the 2.2 rule as a scratch script over the 10 kept iterations. All 5 DeepSeek iterations return `findings_not_enumerated` (claimed 7, 9, 8, 10, 12, enumerated 0/0/0), and all 5 Luna iterations pass. With the patch landed, each DeepSeek iteration would have failed at the time it was written and been redispatched once.

## 4. Can the existing research be rebuilt without a rerun?

- **Luna: yes.** It already reconstructs, and patch 2.3 only removes the double-counted iteration 1.
- **DeepSeek: no, not faithfully.** No artifact lists its 46 claimed findings. The Markdown has no findings list, the deltas have no finding rows, and the registry lists 22 findings with no iteration numbers. A reducer replay after the fix still has nothing to rebuild the missing 24 from. Writing those rows now would mean authoring the lineage's records for it.

The choices are:

1. Rerun only the DeepSeek lineage after patches 2.1 and 2.2 land (one lineage, about 10 minutes), then merge and close again.
2. Close this packet with the gap recorded as a known limitation. The merged `research/research.md` was built from the iteration Markdown and spot-checked against the code, so none of its conclusions depend on the missing rows.

Recommended: option 2 for packet 088, and land the runtime patch on its own, because the gap is in the closeout's bookkeeping, not in the research.
