# Lead review before your next iteration

Your iteration files are the right depth, so keep the content as it is. One record is missing.

## State records

The runner checks every iteration with `verify-iteration.cjs`, and it fails an iteration whose state log has no record for it. Your state log is `/Users/michelkerkmeester/MEGA/Development/AI Systems/AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/lineages/luna/deep-research-state.jsonl`.

1. After you write each `iterations/iteration-NNN.md` and its `deltas/iter-NNN.jsonl`, append ONE line to `/Users/michelkerkmeester/MEGA/Development/AI Systems/AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/lineages/luna/deep-research-state.jsonl`. Write it directly, as your lineage prompt says. Do not use `append-mode-event.cjs` for it, because that script projects into a `research/` folder above its run directory and the row never reaches your lineage.
2. The line is one JSON object with these keys and these four exact route values:

```json
{"type":"iteration","iteration":N,"run":N,"mode":"research","target_agent":"deep-research","agent_definition_loaded":true,"resolved_route":"Resolved route: mode=research target_agent=deep-research","status":"complete","focus":"<this iteration's focus>","findingsCount":<count>,"newInfoRatio":<0 to 1>,"keyQuestions":[],"answeredQuestions":[],"timestamp":"<ISO 8601 now>","sessionId":"<your session_id>","generation":1}
```

3. Put the same four route keys (`mode`, `target_agent`, `agent_definition_loaded`, `resolved_route`) on the `"type":"iteration"` record inside each delta file as well.
4. Backfill now: if an iteration file already exists with no state record, append its record before you start the next iteration. Number records exactly as the files are numbered, one record per iteration.
5. Check yourself after each iteration: `node .skilled/skills/system-deep-loop/runtime/scripts/verify-iteration.cjs --loop-type research --artifact-dir /Users/michelkerkmeester/MEGA/Development/AI Systems/AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/lineages/luna --iteration N` must print `OK`.

## At the end

After iteration 5, write your lineage synthesis and a terminal synthesis record in the same state log with `stopReason` set to `maxIterationsReached`.
