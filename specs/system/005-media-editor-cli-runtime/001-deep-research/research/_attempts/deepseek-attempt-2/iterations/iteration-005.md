# Iteration 005 - Naming and placement hardening, plus the ranked change list

Focus: the kernel gate wording, a batch question template, the tool and field description text,
batch-aware placement, a `maxBytes` target, whether a server guard is worth its friction, new playbook
scenarios for a Project batch and a skill batch, and the ranked change list for the four phases.

Sources read this iteration: `claude project/Custom Instructions.md:140-200`,
`mcp server/src/server/field-schemas.ts:55-90`, `mcp server/src/tools/image/convert.ts:120-160`,
`mcp server/src/tools/image/compress.ts:40-235`, `mcp server/src/tools/image/batch-resize.ts:45-210`,
`mcp server/src/tools/image/sharp-output.ts:60-530`, `mcp server/src/core/output-folder.ts:290-345`,
`mcp server/src/server/tool-context.ts:290-295`, `sk-media-editor/references/interactive-intelligence.md:84-126`,
`sk-media-editor/references/tools.md:43`, `sk-media-editor/references/image-operations.md:46`,
`sk-media-editor/references/video-and-audio-operations.md:46`, `sk-media-editor/changelog/v1.0.0.0.md`,
`sk-media-editor/README.md:329`, `sk-media-editor/SKILL.md:259`, `sk-media-editor/SKILL.md:299`, and a
grep of the whole system for the literal folder name.

## 1. The live bug parsed as five separable defects

The observed run: four PNGs from `media files/import` converted to WebP under 100 KB, in one Claude
Desktop Project, with no question about names or a folder. `subfolder: true` was passed on the first
`image_convert` call only, so one file landed in `001 - webp-under-100kb/` and three in the export root
as `CleanShot ...-converted.webp`.

The causes are separable, and only two of them are server-side.

1. The only hard wait covers one name and no folder. `claude project/Custom Instructions.md:194` says
   "propose a readable file name from the content and wait for the user to confirm it". Nothing in that
   step covers the first call of a batch, and nothing covers the folder.
2. The wait is reachable only through ambiguity. `:181` makes the escalation trigger "the request is
   ambiguous". This request was clear, so the wait never armed.
3. Several files per call is a concept with no gate. `:149` says a tool "writes one result file straight
   into its output folder, under the `fileName` it was given, and several files from one call into a new
   `NNN - description/` folder". So the batch case is described for the folder but not for the question.
4. The folder is chosen per call, so a per-call default cannot produce one place. The remedy
   `media_rename` is described at `:145` as renaming "a result already written", which is a repair, not
   a placement decision. And `mcp server/src/core/output-folder.ts:301-341` always allocates: the loop
   computes `highestFolderNumber(realOutputDir) + 1` at `:322-329` and tries to `mkdirSync` that fresh
   name, so there is no way to target the folder a previous call created. Four calls with
   `subfolder: true` produce four folders.
5. The field text presents omission as normal. `mcp server/src/server/field-schemas.ts:62-69` describes
   `fileName` with "Omitted, the file is named after the input plus the operation", and `:71-81`
   describes `subfolder` with "Omitted, one file goes to the export root and several files get a
   folder". Both are accurate and both read as permission. Nothing in either says that a caller must ask
   first.

And one coverage gap: no playbook scenario covers a batch in a Project.

## 2. The kernel gate, proposed wording

Change three places and add one, all inside `claude project/Custom Instructions.md`.

`File Naming` at `:145` becomes a gate rather than a description. Proposed replacement paragraph:

> Before the first writing call of a request, ask one question and wait. It lists every file the request
> will produce, with the readable name you propose for each, and it names the folder they will land in.
> When two or more inputs arrive in one request, the question also offers the choice between the export
> root and one numbered folder, because that choice is about the batch, not about one file. This wait
> applies even when the request is unambiguous and even when the user already named the result. With the
> tools connected, `image_probe` or `media_probe` with `preview: true` shows the content before you
> propose. The writing tool takes the confirmed name as `fileName`, and `media_rename` is only for
> repairing a name after a result exists.

`Strict Sequence` step 3 at `:194` becomes two steps, so the batch question and the single-file name
confirmation are not conflated:

> 3. Before the first writing call, ask one question that lists the proposed names and the target folder,
>    and wait. For two or more inputs, include the export-root versus numbered-folder choice in the same
>    question.
> 4. With the tools, call `media_health` once, then the mode's tool with the confirmed `fileName`, and
>    read the path it returns. In advice, write the proposed name into the command and say it can be
>    changed.

`ESCALATE IF 1` at `:181` is currently tied to ambiguity. Two options.

- Option A, extend it: "ESCALATE IF the request is ambiguous or if the first writing call of the request
  has not yet been confirmed."
- Option B, leave `:181` about ambiguity and put the batch gate on the ALWAYS list, extending `:165`
  (ALWAYS 9) to read "ALWAYS propose a readable name based on the content and apply it only after the
  user confirms it, and ask once for the names and the folder before the first writing call of a batch."

Recommendation: Option B, because ESCALATE is the doubt list and this rule applies even when there is no
doubt, which is the exact failure mode that produced the bug. `:181` keeps its ambiguity meaning.

`Export Protocol` at `:149` gains one clause: "A batch lands in one place. Either every file goes into the
export root or every file goes into one numbered folder, and the folder is decided once, before the first
writing call, never per call."

Rejected: a rule that forbids `subfolder: true` on a batch. Reason: a numbered folder is a legitimate and
documented choice (`sk-media-editor/references/tools.md:43`), and the defect is the inconsistency across
calls, not the folder.

Rejected: relying on the model to notice `subfolder` was omitted on calls two to four. Reason: nothing in
the field text or the kernel tells it to look, and the observed run shows it did not.

## 3. The batch question template

`sk-media-editor/references/interactive-intelligence.md:109-113` already carries an output-preferences
block, with `:111` reading "For several files: one numbered folder in `media files/export/`, or straight
into it". That sentence is buried inside the comprehensive question, which only fires when the request
is ambiguous (`:168`, `:179`). A batch in a clear request never reaches it.

Proposal: add a dedicated template beside it, in the same file, and let both the skill and the Project
comprehensive question point at it.

```markdown
### Batch confirmation (two or more inputs in one request)

Names and one folder, asked together before the first writing call:

1. Proposed names, one per file, in the order you will write them:
   - `[readable-name-1].[ext]`
   - `[readable-name-2].[ext]`
2. One place for all of them:
   - Straight into `media files/export/`
   - One folder: `media files/export/[NNN] - [description]/`
   - An existing folder: [name it]

Confirm the names and the place, or give changes.
```

That wording asks for the folder decision for two or more inputs, which is the missing case. It also
offers an existing folder, which the server does not support yet, so section 5 exists to make that line
true.

Mirror consequence: this file is one of the seven byte-identical pairs, so the same text must reach
`claude project/knowledge/Media Editor - System - Interactive Intelligence.md`, and `cmp` must pass
afterwards. The text is transport-neutral, so it mirrors cleanly.

## 4. Tool and field description text

The field descriptions are the server's only chance to make omission look like a decision rather than a
default.

`mcp server/src/server/field-schemas.ts:62-69` today: "Readable name for the written file, such as
'team offsite hero'. It is slugged to lowercase words joined by hyphens, and the tool adds the extension.
Omitted, the file is named after the input plus the operation."

Proposed replacement: "Readable name for the written file, such as 'team offsite hero'. It is slugged to
lowercase words joined by hyphens, and the tool adds the extension. A caller that has not confirmed a
name with the user yet must ask before the first writing call, and must pass one name per file when a
request covers several files. Only an unattended call may omit it, and then the file is named after the
input plus the operation."

`mcp server/src/server/field-schemas.ts:73-79` today: "true writes into a new numbered folder named from
outputName. false writes into the export root. Omitted, one file goes to the export root and several
files get a folder."

Proposed replacement: "true writes into a new numbered folder named from outputName. false writes into
the export root. Every call in one request must pass the same value, because the point of the field is
that a batch lands in one place. Omitted, one file goes to the export root and several files get a
folder, and a caller must still ask the user which of the two a batch should use."

`mcp server/src/tools/image/convert.ts:136-141` today: "Converts one image to jpeg, png, webp, or avif.
Quality from 1 to 100 is visual quality for jpeg, webp, and avif, and the palette colour target for png.
It writes one re-encoded file in the export root, or a numbered folder on request, and never changes the
input."

Two fixes: say that one call converts one file, so four files take four calls that must share one folder
decision, and say it after the batch placement option from section 5 lands.

This text reaches `sk-media-editor/references/tools.md` and its mirror as well, since that file
catalogues parameters and defaults. Both sides must stay byte-identical.

## 5. Batch-aware placement

This is the only server change the live bug strictly requires, because the kernel wording alone still
leaves four calls unable to agree on a folder without luck.

Option 1, a `targetFolder` path input. Rejected: it is a second path input on 36 tools that take
`outputName` (counted by grep for `outputNameField`), and `resolveInput` requires an existing real file,
so a folder that does not exist yet has no guard path.

Option 2, replace the boolean `subfolder` with a `subfolderName` string, or add `subfolderName`
alongside it. One call creates `001 - webp-under-100kb`, and calls two through four pass the same name
and land in it. `allocateOutputFolder` (`mcp server/src/core/output-folder.ts:301-341`) becomes find or
create by slug, and `wantsFolder` (`mcp server/src/server/tool-context.ts:290-295`) keeps its meaning.
Recommended, because it fixes every tool at once, it is a name rather than a path so no new guard is
needed, and it makes section 3's third bullet true.

Option 3, multi-input `image_convert`. The result shape already carries a list: `convert.ts:122` maps
`written.images`, and `sharp-output.ts:503-512` builds one entry per plan and removes all of them on
failure. So a multi-input form changes the argument shape and the plan loop, not the result contract.
Recommended as well, because the observed request was one request over four files and one call is a
stronger guarantee of one place than four coordinated calls.

Recommendation: do Option 2 first, because it is the general primitive and unblocks every tool, then
Option 3 for `image_convert` because that is where the bug happened.

Rejected: leave the server alone and fix it with skill text only. Reason: the kernel already says several
files go into one numbered folder (`:149`), and the observed run still split the batch, so a text-only
fix repeats a documented rule that already failed.

## 6. `maxBytes` on `image_convert`

The request said "max 100kb" and no field carries a byte target. `image_compress`
(`mcp server/src/tools/image/compress.ts:225-234`) takes `quality`, which is visual quality, not a size.
`image_convert` takes `quality` as well (`convert.ts:151-160`). So the runtime had to guess a quality
that lands under 100 KB, which is a two-pass problem it cannot solve in one call.

Verdict, ranked as optional: adding `maxBytes` is worth it, but it should be a separate change and not
part of the bug fix, because a byte target requires a retry loop with a quality search, a floor on
acceptable quality, and a decision about what to do when the floor cannot reach the target. That is real
work in `mcp server/src/tools/image/sharp-output.ts` and it is untestable from the current fixtures.

Cheaper alternative that solves the observed request: leave the schema alone and have the skill state the
target in the confirmation question ("under 100 KB means I will pick a quality and check the size, and I
will tell you the size I reached"). The tool already returns `bytes` per output entry
(`mcp server/src/core/result.ts:45-46`, `:256-260`), so the size is observable and reportable today.

Rejected: `maxBytes` as a hard guarantee. Reason: at some quality floor WebP cannot hit an arbitrary byte
target, so the field would be a promise the server cannot always keep, and the fixed decision list
already puts size-critical compression work on hand-written ffmpeg in the skill route order.

## 7. A server guard against unconfirmed names

Options.

- Hard guard: refuse a writing call with no `fileName` unless the caller passes an explicit
  `confirmed: true`-style acknowledgement. Rejected. The friction lands on every legitimate call,
  including `media_rename`, HLS ladders, and any scripted or test use, and the server cannot tell a
  confirmed name from an invented one. It also breaks the existing test suite, which pins
  `subfolder: true` through the test client (`sk-media-editor/changelog/v1.0.0.0.md:91`).
- Soft guard: return a warning when a writing call omits `fileName` while a previous call in the same
  process wrote an output. Rejected, because the MCP server has no request identity and the CLI has one
  process per call, so "same request" is not knowable in either shape.
- Documentation-only guard: the section 4 text. Recommended. It is where the observed failure actually
  happened.

Verdict: not worth its friction. Record it as a rejected direction.

## 8. New playbook scenarios

Two are needed, one per surface, because the failure was a Project failure and the skill has no batch
scenario either.

- `sk-media-editor/manual-testing-playbook/project-ambiguity-intake/batch-names-and-folder.md`, a new
  Project scenario: four PNGs in one request in a Desktop Project with the extension connected. It must
  ask once, before any writing call, name all four, and offer the export root or one numbered folder,
  and the four results must end up in one place. This is the scenario whose absence let the bug through.
- `sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/batch-names-and-folder.md`, the skill
  twin over the CLI runtime, same prompt, asserting one CLI folder decision.
- `sk-media-editor/manual-testing-playbook/manual-testing-playbook.md` gains both rows.
- `benchmark/grader/twin_divergence.py:99-105`: if the two new scenarios share an identical prompt they
  can be declared a twin pair in `TWIN_PAIRS` at `:87-95`. If the CLI twin differs (different tool
  surface), list both in `UNPAIRED_IDS` instead. My recommendation: declare them a twin pair, because the
  prompt is identical and the assertion is the same, which is exactly what the twin grader is for.

Naming collision to fix in the same pass: `skill-route-order/connected-tools-first.md` and its sibling
already say "the CLI runtime" and mean the Claude Code runtime, and `sk-media-editor/README.md:329` says
the skill "is the source of truth and the CLI runtime". With a real `media-editor` CLI landing, the word
CLI must mean the command. Reword both to "the Claude Code skill" and keep CLI for the executable.

## 9. The ranked change list

Ranked by value-if-landed-early, with the phase named on each line. The phase order is forced by
dependency: the rename must precede any change that cites a path, the naming fix must precede the skill
rewrite so the playbook scenarios describe the hardened behavior, and the CLI must exist before the
skill can route to it. The rank order inside each phase is the order I would actually land them.

Phase 1, rename `mcp server/` to `runtime/`

1. `[Phase 1]` Rename the folder to `runtime/` and repoint every reference. Verified inventory: 42 files
   mention the literal folder name, of which the ones outside the folder are `AGENTS.md`,
   `INSTALL-GUIDE.md`, `README.md`, `SYNC.md`, `USER-GUIDE.md`,
   `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md`,
   `claude project/knowledge/Media Editor - Reference - Setup.md`, `sk-media-editor/README.md`,
   `sk-media-editor/SKILL.md`, `sk-media-editor/references/setup.md`, `sk-media-editor/references/tools.md`
   and three playbook scenarios (`skill-route-order/connected-tools-first.md`,
   `skill-tool-verification/error-code-handoff.md`, `skill-export-delivery/readable-name-proposal.md`).
2. `[Phase 1]` Do not rewrite `sk-media-editor/changelog/v0.1.0.0.md`, `v0.2.0.0.md` or `v0.6.0.0.md`, and
   do not rewrite dated lines in `SYNC.md`. They record the name as it was. Add one new dated `SYNC.md`
   entry instead.
3. `[Phase 1]` Keep the inner layout byte-for-byte, because `runtime/scripts/build-bundle.ts:76` stages
   `dist`, `assets` and `licenses` by name, and `runtime/src/core/font-path.ts:51` resolves
   `../../assets/fonts/` from the module URL.

Phase 2, naming and placement hardening

4. `[Phase 2]` `claude project/Custom Instructions.md`: replace the `File Naming` paragraph at `:145`
   with the gate from section 2, split `Strict Sequence` step 3 at `:194` into a batch question and a
   call step, extend ALWAYS 9 at `:165`, add one clause to `Export Protocol` at `:149`, and leave
   ESCALATE 1 at `:181` about ambiguity.
5. `[Phase 2]` Add the batch confirmation template to
   `sk-media-editor/references/interactive-intelligence.md` beside `:109-113`, then copy the file
   byte-for-byte over `claude project/knowledge/Media Editor - System - Interactive Intelligence.md` and
   prove it with `cmp`.
6. `[Phase 2]` `runtime/src/server/field-schemas.ts:62-80`: rewrite both descriptions so omission is not
   presented as normal, and so a batch must pass the same folder value on every call.
7. `[Phase 2]` `runtime/src/core/output-folder.ts:301-341` plus `runtime/src/server/tool-context.ts:290-295`
   plus `runtime/src/server/tool-registry.ts:91-100`: add the `subfolderName` placement field and make
   allocation find-or-create by slug.
8. `[Phase 2]` `runtime/src/tools/image/convert.ts` schema and handler selectors plus
   `runtime/src/tools/image/sharp-output.ts:488-512`: allow several inputs in one call, reusing the
   existing many-image result path.
9. `[Phase 2]` `runtime/src/tools/image/convert.ts:136-141` and `runtime/src/tools/image/compress.ts:208-214`:
   rewrite the tool descriptions for one-file-per-call and for the batch placement rule.
10. `[Phase 2]` `sk-media-editor/references/tools.md:43`, `sk-media-editor/references/image-operations.md:46`,
    `sk-media-editor/references/video-and-audio-operations.md:46` and `sk-media-editor/SKILL.md`: state the
    batch rule and the new field, then mirror `tools.md`, `image-operations.md` and
    `video-and-audio-operations.md` byte-for-byte into `claude project/knowledge/`.
11. `[Phase 2]` New scenarios
    `sk-media-editor/manual-testing-playbook/project-ambiguity-intake/batch-names-and-folder.md` and
    `sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/batch-names-and-folder.md`, the index
    row in `sk-media-editor/manual-testing-playbook/manual-testing-playbook.md`, and the twin declaration
    in `benchmark/grader/twin_divergence.py:87-105`.
12. `[Phase 2]` Reword "the CLI runtime" to "the Claude Code skill" in
    `sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md`,
    `sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md`,
    `sk-media-editor/README.md:329` and `sk-media-editor/SKILL.md`, so CLI means the command alone.
13. `[Phase 2]` `runtime/src/tools/image/convert.ts` and `runtime/src/tools/image/compress.ts`: add
    `maxBytes` only after a retry design exists, or state the byte target in the confirmation question and
    report the achieved size from the existing `bytes` field. Do not add a hard guarantee.
14. `[Phase 2]` Do not add a server guard against omitted names. Recorded as rejected in section 7.

Phase 3, build the CLI

15. `[Phase 3]` New `runtime/src/server/tool-result.ts` with the local structural result interface, and
    `runtime/src/core/result.ts` returning it instead of the MCP SDK type.
16. `[Phase 3]` New `runtime/src/server/dispatch.ts` holding `buildToolIndex`, `listedInputSchema`'s
    consumer, `dispatchToolCall`, and the argument-error result. Slim `runtime/src/server/tool-registry.ts`
    to registration plus `defineTool`.
17. `[Phase 3]` New `runtime/src/cli.ts` as the entry, with exit codes and SIGINT and SIGTERM handling.
18. `[Phase 3]` New `runtime/src/cli/config-adapter.ts` translating CLI folder flags into
    `--allowed-dir` and `--output-dir` tokens only, and `runtime/src/core/config.ts:421` registering any new
    CLI variable name.
19. `[Phase 3]` New `runtime/src/cli/args.ts` for flag, `--args-file` and stdin parsing with JSON values and
    repeated flags, and the unknown-key warning.
20. `[Phase 3]` New `runtime/src/cli/commands.ts` for `list`, `describe` and the default tool form, plus
    `runtime/scripts/build-schema-manifest.ts` writing `dist/tools.json` from `z.toJSONSchema`, and a build
    check in `runtime/scripts/build-bundle.ts` beside the `STAGED_FOLDERS` constant at `:76`.
21. `[Phase 3]` `runtime/src/core/process-runner.ts`: a live-child registry and a temp-folder registry with
    exported termination, so `cli.ts` can reap ffmpeg on a signal.
22. `[Phase 3]` New `runtime/src/core/persistent-cache.ts` wired into
    `runtime/src/core/capabilities.ts:366-403` and `runtime/src/core/ffmpeg-resolver.ts:446-485`, keyed by
    binary path plus size plus mtime, stored under `<dataDir>/cache/`.
23. `[Phase 3]` `runtime/src/tools/media/preview.ts:119-124` plus a new `runtime/src/cli/preview-out.ts`, so
    the CLI writes the JPEG to a file and reports the path while MCP keeps the image block.
24. `[Phase 3]` `runtime/package.json`: add the `media-editor` bin key beside `media-editor-mcp`.
25. `[Phase 3]` `runtime/claude-plugin/.claude-plugin/plugin.json`: remove the `mcpServers` block, keep
    `MEDIA_EDITOR_DATA_DIR` pointing at `${CLAUDE_PLUGIN_DATA}`, and move the project root and export root
    arguments into the CLI invocation line.
26. `[Phase 3]` New `runtime/claude-plugin/bin/media-editor` shim resolving its own real path, plus the
    `dist/cli.js` existence checks in `runtime/scripts/build-plugin.ts:336-338`'s spirit and in
    `runtime/scripts/build-bundle.ts`.
27. `[Phase 3]` New CLI tests under `runtime/tests/`, alongside the existing `runtime/tests/server/` and
    `runtime/tests/tools/` suites, run through `runtime/scripts/test-pinned.ts`.

Phase 4, move the skill to the CLI

28. `[Phase 4]` New `sk-media-editor/references/cli.md` carrying the canonical invocation
    `node ${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js`, the folder and export root arguments, the command
    surface, the exit codes, and the `bin/media-editor` alternative. ON_DEMAND only, never in
    `RESOURCE_MAP` and never in `ALWAYS`.
29. `[Phase 4]` `sk-media-editor/SKILL.md`: add the ON_DEMAND row for `cli.md` beside `:123`, and rewrite
    the route order at `:77`, the command table at `:84-89`, the route check at `:101`, the setup step at
    `:139`, and the packaging notes at `:259` and `:299`.
30. `[Phase 4]` `sk-media-editor/references/router-contract.md:147-155`: add `media_cli_available()` as the
    first predicate of `choose_route`, returning `cli`.
31. `[Phase 4]` `benchmark/router/differential.py:100-104`, `:314-317` and `:331-339`: add the CLI host
    state, bind the third predicate, and keep the contract object's six fields unchanged.
32. `[Phase 4]` `benchmark/gates/rule_parity.py:71` and `:208`: raise the route-order `min_pairs` floor to
    match the new sentences, and add the retired plugin-as-MCP-host wording to the retired-name set.
33. `[Phase 4]` `benchmark/grader/twin_divergence.py:87-105`: keep `SRO-001` and `PRO-001` paired on the
    deliverable assertions, and add a skill-only CLI-first scenario such as `SRO-003` to `UNPAIRED_IDS`.
34. `[Phase 4]` Playbook:
    `sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md` becomes the
    CLI-first scenario, a new `skill-route-order/fallback-to-local-ffmpeg.md` covers the ffmpeg route
    unchanged, `project-route-order/connected-tools-in-desktop.md` and
    `project-route-order/setup-offer-without-tools.md` keep the tools and advice routes, and
    `sk-media-editor/manual-testing-playbook/manual-testing-playbook.md` takes the renumbered rows.
35. `[Phase 4]` Sync Loop declaration `AI Systems/z — Claude Project Sync Loop/systems.py:1245-1697`:
    add `references/cli.md` to `unmirrored_sources`, extend the `references/router-contract.md` reason,
    and replace the `8 router code` residency statement and its key. The Header row keyed
    `c6fd13141985411f24d63a8a287a800da568725ffc44763f35577342f878ab15`, which says the skill package and
    the plugin run the tools from a terminal, needs the same pass.
36. `[Phase 4]` `claude project/Custom Instructions.md` Section 8 and the `SYNC.md` change record: resync
    the moved kernel statements, bump the kernel and skill versions, and add one dated `SYNC.md` entry
    recording that the skill route order is now CLI, tools, ffmpeg, advice while the Project stays tools,
    ffmpeg, advice, with `differential.py` binding the CLI predicate false for Project host states.

## Ruled out this iteration

1. Forbidding `subfolder: true` on a batch.
2. A text-only fix with no server change.
3. A `targetFolder` absolute path input.
4. `maxBytes` as a hard size guarantee, and `maxBytes` in the same change as the bug fix.
5. A hard or a soft server guard against an omitted name.
6. Reusing the word CLI for the Claude Code runtime.

## Inferences recorded as inferences

- The exact number of writing tools that take `outputName` is a grep count of files importing
  `outputNameField`, which is 36. One of them is `batch-resize`, so the count is an upper bound on tools
  that would gain a placement field.
- The `maxBytes` retry cost is my estimate. I read the compress and convert schemas and the plan writer,
  not a prototype.
