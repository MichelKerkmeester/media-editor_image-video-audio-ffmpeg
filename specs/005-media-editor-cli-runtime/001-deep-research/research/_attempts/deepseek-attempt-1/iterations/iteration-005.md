# Iteration 5: Naming and Placement Hardening, plus the Ranked Change List

## Focus

Rewrite the naming and placement gate so a batch gets confirmed names and one place. Read the kernel
lines that caused the live bug, the tool and field descriptions, the placement allocators, and the
playbook gaps. Then produce the ranked change list for the four implementation phases.

## Findings

### F5.1 The kernel's wait is attached to ambiguity, and that is why a clear batch skipped it

The four kernel lines the brief names, read in place:

| Line | Text | Why it failed here |
| --- | --- | --- |
| `claude project/Custom Instructions.md:145` | "Propose a readable name ... and apply it only after the user confirms. ... With the tools connected, `image_probe` or `media_probe` with `preview: true` shows the content, the writing tool takes the name as `fileName`, and `media_rename` renames a result already written." | One name, and it points at `media_rename` as the recovery for a written result, which frames naming as reversible |
| `:149` | "A Media Editor tool writes one result file straight into its output folder, under the `fileName` it was given, and several files from one call into a new `NNN - description/` folder." | Defines several files as a property of one call, so four calls are not "several files from one call" and each defaults to the root |
| `:181` | "**ESCALATE IF the request is ambiguous.** Ask one comprehensive question covering media type, file, goal, output and the proposed file name, then wait" | The only hard wait is gated on ambiguity, and "convert these four to WebP under 100 KB" is not ambiguous |
| `:194` | "With the tools, propose a readable file name from the content and wait for the user to confirm it. In advice, write the proposed name into the command and say it can be changed" | Singular name, and no folder question anywhere in the sentence |

`:181` and `:194` are the pair that matters. A request that is clear never reaches the wait at
`:181`, and the wait at `:194` is written for one name and says nothing about a folder, so a model
that reads it literally can satisfy it once and consider the obligation discharged for the whole
batch. That is exactly the observed behavior: one `subfolder: true` on the first call and three
default calls after it.

**Proposed replacement wording for the File Naming section, one hard wait before the first write.**

```text
### File Naming

Before the first call that writes anything in a request, ask one question and wait. It names every
result the request will write and it names where they all go.

Name each result from what the media shows: two to five lowercase words joined by hyphens, with the
file's extension kept. When the user already named a result, repeat that name in the question
instead of proposing a different one.

When the request takes two or more inputs, the same question also offers the place: the export root
as separate files beside earlier results, or one numbered `NNN - description/` folder holding all
of them. Offer both even when the request is clear, because the two produce different folders and
the choice is the user's.

Apply every answer exactly: each confirmed name as that call's `fileName`, and the confirmed place
as the same `subfolder` value on every call in the request. Every call in one request uses one
place, never a mixture.

In advice, write the proposed names and the place into the commands and say they can be changed.
```

Three changes carry the fix: the wait is on the write rather than on ambiguity, it is scoped to the
whole request rather than one call, and the folder is part of the same question. The last
paragraph's "never a mixture" clause is the direct antidote to the live bug.

The matching `NEVER` rule already exists and needs no new text: "**NEVER rename a file or create an
optional subfolder without the user's yes**" (`:179`). It was not enough on its own because it
forbids without requiring, and a model that never considered the folder part of the question has
nothing to consult.

**Rejected option: make ESCALATE 1 cover placement.** Widening the ambiguity rule would make every
clear request sound ambiguous, and the rule already carries the intake checklist for genuinely
ambiguous ones.

**Rejected option: keep the single-name wait and add a second wait for the folder.** Two questions
before one request is worse than one question, and `:181` already establishes the one-question
intake as the house style. The existing SAI-001 scenario states the shape: "asks for media type,
file, goal, output and a proposed readable file name in one message"
(`sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/one-comprehensive-question.md`).

### F5.2 The same gate must land in the skill and the kernel, and `interactive-intelligence.md` is a mirror

The skill's File Naming paragraph is `sk-media-editor/SKILL.md:194`, and it is longer than the
kernel's but has the same two defects: one proposed name and one reference to `media_rename` for a
result already written.

`sk-media-editor/references/interactive-intelligence.md` is byte-identical to
`claude project/knowledge/Media Editor - System - Interactive Intelligence.md` (measured in
iteration 4 with `cmp -s`, result BYTE-IDENTICAL). So the batch question template goes there and it
goes into both files in the same edit, or the pair diverges.

**Proposed batch question template for `interactive-intelligence.md`.**

```text
Before the first writing call, one question covers every result in the request. Fill it from what
the media shows and from the request.

Naming question, one input:
  "I will write <proposed-name>.<ext>. Confirm or change the name."

Naming and placement question, two or more inputs:
  "I am about to write these <N> files:
     <proposed-name-1>.<ext>
     <proposed-name-2>.<ext>
     ...
   Where should they all go?
     a) All <N> in media files/export/ beside earlier results
     b) All <N> in one new media files/export/NNN - <description>/ folder
   Confirm the names and pick a place."

Rules the template carries:
- One question, then wait. Do not write, convert, probe-and-write or create the folder before the answer.
- One place for the whole request. Never send the first file to a folder and the rest to the root.
- The same answer applies to every call in the request, so pass the same subfolder value on all of them.
- If the user gives N names for N inputs, use them in order.
- If the user gives one name for N inputs, ask once more with the counted names shown.
```

The last rule is what closes the `fileName`-for-many problem: with one name and four inputs there
is no correct answer, so the template forces the counted list rather than letting a model invent
suffixes. `countedFileName` already produces that list shape on the server side
(`mcp server/src/core/output-folder.ts:350`).

### F5.3 The field descriptions present an omitted `fileName` as normal, and `subfolder` defaults invisibly

`field-schemas.ts:62-68` describes `fileName` as optional and ends with the consequence:

> "Omitted, the file is named after the input plus the operation."
> [SOURCE: mcp server/src/server/field-schemas.ts:66-68]

`field-schemas.ts:73-80` describes `subfolder` and its omitted behavior:

> "true writes into a new numbered folder named from outputName. false writes into the export root.
> Omitted, one file goes to the export root and several files get a folder."
> [SOURCE: mcp server/src/server/field-schemas.ts:76-80]

Read together with `mcp server/src/tools/image/convert.ts:136-141` ("It writes one re-encoded file
in the export root, or a numbered folder on request, and never changes the input"), the three texts
tell a client that omitting both fields is a legitimate, documented, non-consequential choice. For
a performer that must ask first, that is a false signal.

**Recommended edits.** Keep both fields optional, since MCP clients and the CLI both need the
ability to omit, and change what omission claims:

- `fileName` description: replace "Omitted, the file is named after the input plus the operation."
  with a sentence that makes omission conditional on the caller having confirmed a name:
  "Ask the user for this name before the first writing call and pass it here. Omit it only when the
  user declined a name, in which case the file is named after the input plus the operation."
- `subfolder` description: replace the last clause with a rule rather than a default:
  "One value for the whole request. When a request writes two or more files, ask which of the two
  places the user wants before the first call, then pass the same value on every call in that
  request. Never omit it on some calls of one request and set it on others."
- `image_convert` description at `:136-141`: add the batch clause, so a model reading only the tool
  description learns that a folder of results comes from one request and one place.

`mcp server/src/server/tool-registry.ts:79-100` composes these two fields onto every tool that takes
`outputName` (`listedInputSchema`), so one edit reaches every writing tool. That is the cheapest
one-place change in the whole hardening phase.

**Rejected option: make `fileName` required.** Rejected because the MCP schema is also the CLI's
schema and a scripted caller may legitimately want the derived name, and because a required field
turns "the user declined a name" into an unrepresentable state.

### F5.4 Batch-aware placement: multi-input `image_convert` beats targeting an existing folder

`image_convert` takes one input today: `inputPath` is a required string
(`mcp server/src/tools/image/convert.ts:42`, `:107-109`, `:143`). Only `video_concat` takes a list,
via an `inputPaths` field (`mcp server/src/tools/video/concat.ts`).

Two candidate mechanisms:

**(A) Multi-input `image_convert`, recommended.** Add `inputPaths` plus an aligned `fileNames`
array. When the array holds more than one entry, the writing path already gets `layout: 'many'`,
and `withPlacement`'s `wantsFolder` returns true for `many` when `subfolder` is unset
(`mcp server/src/server/tool-context.ts:290-295`). So a four-input call lands all four in one new
numbered folder by default, which is the correct behavior for the live bug and requires no new
placement code. The folder name comes from the required `outputName` per result
(`mcp server/src/tools/image/sharp-output.ts:492-496` allocates through
`context.allocateOutputFolder`).

**(B) A `targetFolder` field that points at an existing numbered folder, considered and rejected.**
It needs a new field, a folder-number lookup, a containment check against the output root, and a
collision policy for a second batch landing in a folder that already holds an unrelated batch. It
also does not fix the reported bug, because the bug was not a missing folder target, it was four
separate calls with no batch concept.

Rejecting (B) also means `allocateOutputFolder` needs no new behavior. It always creates the next
number and leaves gaps empty (`mcp server/src/core/output-folder.ts:301-322`, doc comment at
`:305-307`), and that stays correct once one request is one call.

The cost of (A) is real and should be stated: `image_convert` becomes variadic, so the single-input
call keeps its current required-field shape and the multi-input call adds an either-or between
`inputPath` and `inputPaths` plus between `fileName` and `fileNames`. That is a schema union, and
zod expresses it but the `describe` output in F2.2 becomes harder to read. A cleaner variant keeps
exactly the concat shape: `inputPaths` only, with a one-element array legal, and `fileNames` as an
array whose length must match. That removes the union entirely and is the variant to implement.

### F5.5 A `maxBytes` target on `image_convert` is not worth adding

The live request said "max 100kb" and there is no field for it. The question is whether that gap
caused the bug. It did not: the reported failure is four files with an unanswered name in two
different folders, and the size instruction was apparently met. Adding `maxBytes` would therefore
be scope expansion on a phase whose purpose is to harden the gate.

There is also a real design cost. Sharp's `quality` is a visual-fidelity dial, not a size dial, and
`image_convert`'s own description says so: "Quality from 1 to 100 is visual quality for jpeg, webp,
and avif, and the palette colour target for png" (`mcp server/src/tools/image/convert.ts:137-139`).
Hitting a byte ceiling means a bounded search over quality, plus a defined failure for the case
where no quality reaches the ceiling, which is reachable for a large PNG whatever the palette
setting. That is a loop, a new error code in `mcp server/src/core/errors.ts:12-31`, and a
nondeterministic runtime, for a capability the caller can already reach by reading the size and
lowering quality once.

The size feedback the caller needs already exists. `successResult` carries `outputs[]` and each
entry holds `bytes`, read from the written file (`mcp server/src/core/result.ts:44-49`, `:256`).
So the reply to a `max 100 KB` request already contains the number that answers it.

**Recommendation: do not add `maxBytes`.** Record it as considered and deferred, with the trigger
for revisiting: if the naming gate lands and size misses become the next reported failure class,
add `maxBytes` as a shared field beside `fileName` in `field-schemas.ts` so every writing tool gets
it at once.

**Rejected option: fold `maxBytes` into the `quality` description as advice.** Rejected because
description text that a schema does not enforce is the same class of false signal as F5.3.

### F5.6 A server guard against unconfirmed names is not worth its friction, and one narrower guard is

The server cannot observe whether a name was confirmed in chat. Every candidate guard is therefore a
proxy:

| Candidate guard | Why it fails |
| --- | --- |
| Refuse a call with no `fileName` | Breaks scripted CLI and MCP callers, and a model that wants to bypass it passes any plausible string |
| Refuse `subfolder: true` without `fileName` | `outputName` is already required, so the folder always has a name. The bug was `subfolder` omitted, not `fileName` missing |
| Refuse a second call in a session with a different `subfolder` value | The server sees one call at a time and has no request boundary, so it would either never fire or fire across unrelated requests |

The last row is the fatal one. `dispatchToolCall` receives one definition, one context and one args
object (`mcp server/src/server/tool-registry.ts:102-127`), and `createToolContext` is built per
server or per CLI process (`mcp server/src/server/tool-context.ts:332-338`). There is no request
grouping anywhere in the codebase to hang a batch guard on.

**Recommendation: reject the guard.** The gate belongs where the confirmation happens, which is the
instruction surface.

The narrower guard worth keeping is schema-level and already half-present: `outputName` is required
on every writing tool (`field-schemas.ts:50-54`), so a folder always has a name and a numbered
folder can never be created unnamed. No change needed, and it is worth recording that this
invariant already holds, because it removes one possible cause from the bug.

### F5.7 Two playbook gaps: no Project batch scenario and no skill batch scenario

The playbook holds 31 markdown files (counted with
`find sk-media-editor/manual-testing-playbook -name "*.md" | wc -l`). The naming scenarios are all
single-file:

| Scenario | Shape |
| --- | --- |
| `SED-002` readable-name-proposal | One image, one proposed name, one file into the export root (`skill-export-delivery/readable-name-proposal.md`) |
| `SED-003` export-root-no-subfolder | Two separate single-file requests, each already named by the user, ffmpeg route (`skill-export-delivery/export-root-no-subfolder.md`) |
| `SAI-001` one-comprehensive-question | One question for an ambiguous request with one file (`skill-ambiguity-intake/one-comprehensive-question.md`) |

None of them submits two or more inputs from one request, and none of them is on the Project side.
That is the exact hole the live bug fell through.

**Two new scenarios, with the shipped pass criteria.**

**New skill scenario `SED-004` (skill batch, one place).**

```text
Objective: Verify a four-input clear request asks once about names and place and writes all four
           into one place, using the CLI.
Prompt:    "Convert these four screenshots to WebP, under 100 KB each."
Given:     Plugin loaded, CLI resolves, four generically named PNGs seeded in media files/import
Turn 1 must: call the CLI's media_health or media_probe once, propose four readable names and the
             export-root-or-one-folder choice in one message, write nothing and create no folder
Turn 2 must: run one image_convert call with four inputPaths, four fileNames and one subfolder
             value, and reply with the folder and the four paths
PASS if:     the question came before the first write, all four files are in one folder, the reply
             names one place, and every file reads back as WebP
FAIL if:     any file is written before the answer, the four files are split across two
             destinations, subfolder differs between calls, or fewer than four names were proposed
```

**New Project scenario `SED-005` (Project batch, one place).**

```text
Objective: Verify the same request in a Claude Desktop Project asks once about names and place and
           passes the same subfolder value on every image_convert call.
Prompt:    "Convert these four screenshots to WebP, under 100 KB each."
Given:     Media Editor extension installed and connected, four generically named PNGs in an
           allowed folder
Turn 1 must: ask one question with four proposed names and the export-root-or-one-folder choice,
             call no writing tool, create no folder
Turn 2 must: call image_convert four times, each with a confirmed fileName, and pass the same
             subfolder value on all four
PASS if:     one question preceded every write, all four results are in one destination, and the
             reply names that one destination
FAIL if:     subfolder was passed on some calls and omitted on others, results are split between a
             numbered folder and the export root, or the reply names two destinations
```

`SED-005` is the regression test for the reported bug, so it is the higher-priority of the two. Its
FAIL clause names the observed symptom directly.

Both scenarios belong in the playbook's export-delivery category, since they test where results
land. `SED-005` is Project-only and so joins the `UNPAIRED_IDS` set in
`benchmark/grader/twin_divergence.py:99-107`. `SED-004` has no Project twin for the same reason
`SED-001` has none, it needs a real file and a running CLI.

### F5.8 The ranked change list

Rank is by what removes the reported bug plus what unblocks the rest. Every file the four phases
touch is named.

#### Phase 1, rename `mcp server/` to `runtime/`

| Rank | Change | File |
| --- | --- | --- |
| 1.1 | `git mv "mcp server" runtime`. No source edit inside the folder, since every internal import is relative | `mcp server/` (whole tree) |
| 1.2 | Update the header source note, together with its mirror in the same edit, or the declared pair diverges on a path string | `sk-media-editor/references/tools.md:23`, `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md` |
| 1.3 | Update every path string that names the folder | `sk-media-editor/SKILL.md`, `sk-media-editor/references/setup.md` and its mirror, `sk-media-editor/references/router-contract.md`, `AGENTS.md`, `README.md`, `INSTALL-GUIDE.md`, `SYNC.md`, `mcp server/README.md` (moved with the tree), `mcp server/ARCHITECTURE.md` |
| 1.4 | Update the playbook command literals that name the folder | `sk-media-editor/manual-testing-playbook/**` (the `--plugin-dir "<path to>/mcp server/claude-plugin"` form in route-order scenarios and any sibling) |
| 1.5 | Update the benchmark path constants if any hard-code the folder | `benchmark/gates/rule_parity.py:56` uses `sk-media-editor` only, `benchmark/router/differential.py`, `benchmark/grader/twin_divergence.py` (verify, do not assume) |
| 1.6 | Update the declaration's skill and system dirs if the rename reaches them, and the residency statement that names the package | `Sync Loop systems.py:1248-1252`, `:1290-1292` |
| 1.7 | Re-run `npm ci` and the pinned test in the renamed folder, since `npm link` and the bundle scripts resolve from the package root | `mcp server/package.json:21`, `mcp server/scripts/bundle/targets.ts:28` |

Note the ordering trap: 1.2 must be done as one edit on both sides. A phase-1 pass that updates the
skill side and defers the Project side leaves the parity gate red between the two edits, which
`rule_parity.py` will catch (`benchmark/gates/rule_parity.py:31-35`).

#### Phase 2, harden naming and placement

| Rank | Change | File |
| --- | --- | --- |
| 2.1 | Replace the File Naming section with the wording in F5.1, one hard wait before the first write, whole-request scope, place included | `claude project/Custom Instructions.md:143-145` |
| 2.2 | Update the Export Protocol paragraph so the one-place rule is stated where placement is defined | `claude project/Custom Instructions.md:147-149` |
| 2.3 | Update the DELIVERY strict sequence so step 3 covers every name and the place, and step 4 says one subfolder value per request | `claude project/Custom Instructions.md:202-207` |
| 2.4 | Update the skill's File Naming paragraph to match F5.1 | `sk-media-editor/SKILL.md:194` |
| 2.5 | Update the skill's route-step 3 and its ALWAYS 1 so the gate is named in the sequence | `sk-media-editor/SKILL.md:101`, `:206` |
| 2.6 | Add the batch question template from F5.2, and the same text in its mirror in the same edit | `sk-media-editor/references/interactive-intelligence.md`, `claude project/knowledge/Media Editor - System - Interactive Intelligence.md` |
| 2.7 | Rewrite the two field descriptions from F5.3. One edit reaches every writing tool through `listedInputSchema` | `mcp server/src/server/field-schemas.ts:62-80`, `mcp server/src/server/tool-registry.ts:91-100` |
| 2.8 | Add the batch clause to the tool description | `mcp server/src/tools/image/convert.ts:136-141` |
| 2.9 | Add `inputPaths` and `fileNames` per F5.4, single-element arrays legal, lengths must match | `mcp server/src/tools/image/convert.ts` (`ConvertArguments`, `runConvert`, `inputSchema`) |
| 2.10 | Confirm `layout: 'many'` reaches `wantsFolder`, and adjust only if the multi-input path does not | `mcp server/src/server/tool-context.ts:290-295`, `mcp server/src/tools/image/sharp-output.ts:492-496` |
| 2.11 | Extend the placement tests for the multi-input case | `mcp server/tests/` (placement and image convert suites) |
| 2.12 | Add the two scenarios from F5.7 and register `SED-005` as Project-only | `sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-one-place.md`, `.../project-export-delivery/batch-one-place.md`, `benchmark/grader/twin_divergence.py:99-107` |
| 2.13 | Regenerate the skill metadata so the new leaves are declared | `sk-media-editor/leaf-manifest.json`, `sk-media-editor/leaf-aliases.json`, `sk-media-editor/graph-metadata.json`, driven by `sk-media-editor/leaf-manifest.config.json` |
| 2.14 | Update the residency `statement_key` values for every changed kernel statement and the new rule entry | `Sync Loop systems.py:1252-1695`, `benchmark/gates/rule_parity.py:59-70` |

Ranked 2.1 first because it is the direct fix for the reported bug, and 2.7 second because it is the
cheapest change that reaches all 40 tools. 2.9 is the largest single edit and is the only one that
changes a tool's call shape, so it should land after the instruction surfaces so the gate is in
place before a caller can use the new shape.

#### Phase 3, build the CLI

| Rank | Change | File |
| --- | --- | --- |
| 3.1 | Extract the transport-neutral dispatch, returning an argument-error result instead of throwing `McpError` | new `mcp server/src/core/dispatch.ts`, edited `mcp server/src/server/tool-registry.ts:102-127` |
| 3.2 | Add the CLI entry with the `list`, `describe` and `<tool>` verbs, argument intake, stdout from `structuredContent` and the exit-code table | new `mcp server/src/cli.ts` |
| 3.3 | Split the CLI's argv before `loadConfig`, so no tool token can become an allowed root | `mcp server/src/cli.ts`, `mcp server/src/core/config.ts:155-219` |
| 3.4 | Export a live-child registry and a `killAllChildren()` for SIGINT and SIGTERM, reusing the existing kill grace | `mcp server/src/core/process-runner.ts:434-477` |
| 3.5 | Write previews to a file and replace the image block in CLI output | `mcp server/src/cli.ts`, `mcp server/src/tools/media/preview.ts:38-45` |
| 3.6 | Add the persistent capability cache under the data folder, invalidated alongside the existing in-process one | new cache module, `mcp server/src/core/capabilities.ts:163`, `:394-402`, `mcp server/src/server/tool-context.ts:344-373` |
| 3.7 | Byte-explicit exit codes, and the CLI must not override `dataDir` | `mcp server/src/cli.ts`, `mcp server/src/core/config.ts:324-341` |
| 3.8 | Register the `bin` key and include the new entry in the build | `mcp server/package.json:9-11`, `mcp server/tsconfig.build.json` |
| 3.9 | Add CLI tests, including a pinned-binary smoke test | `mcp server/tests/`, `mcp server/scripts/test-pinned.ts:46`, `mcp server/package.json:21` |

#### Phase 4, move the skill to the CLI

| Rank | Change | File |
| --- | --- | --- |
| 4.1 | Rewrite the route order to CLI first, then ffmpeg, then advice, and state the shell-disabled degradation | `sk-media-editor/SKILL.md:77`, `:84-88`, `:101`, `:139`, `:151-161` |
| 4.2 | Add the skill-only invocation reference: the resolved invocation line, intake modes, stdout and exit codes, preview paths, the data-folder rule, and the three-branch degradation | new `sk-media-editor/references/cli.md` |
| 4.3 | Declare the new skill-only reference, mirroring the existing `router-contract.md` exemption shape | `Sync Loop systems.py:1274-1281` |
| 4.4 | Register `cli.md` in the skill's routable leaves and regenerate the derived metadata | `sk-media-editor/leaf-manifest.config.json`, `sk-media-editor/leaf-manifest.json`, `sk-media-editor/leaf-aliases.json`, `sk-media-editor/graph-metadata.json` |
| 4.5 | Rewrite `choose_route` as the ordered probe list, and hold the kernel copy equal | `sk-media-editor/references/router-contract.md:147-155`, `Sync Loop systems.py:1360-1362` |
| 4.6 | Extend the host-state table with the CLI axis and the second ordering rule in the comment | `benchmark/router/differential.py:97-104` |
| 4.7 | Update the route-order rule phrases and floors, and leave the banned-name list alone | `benchmark/gates/rule_parity.py:37-40`, `:59-70` |
| 4.8 | Update the `SRO-001`/`PRO-001` pairing comment. Keep the pair | `benchmark/grader/twin_divergence.py:93` |
| 4.9 | Rewrite `SRO-001` to check the CLI resolves rather than `mcp list`, split `SRO-002`, and add the advice-branch scenario | `sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md`, `.../fallback-to-local-ffmpeg.md`, new `.../advice-when-nothing-runs.md` |
| 4.10 | Remove the `mcpServers` block so the plugin registers no server, and keep the `skills` copy | `mcp server/claude-plugin/.claude-plugin/plugin.json`, `mcp server/claude-plugin/.claude-plugin/marketplace.json` |
| 4.11 | Add the `dist/cli.js` assertion beside the `dist/index.js` one | `mcp server/scripts/build-plugin.ts:336` |
| 4.12 | Update setup's Claude Code and terminal-agent rows | `sk-media-editor/references/setup.md:58-59` and its mirror |
| 4.13 | Update the extension manifest's long description if it still promises the plugin registers a server | `mcp server/manifest.json` |
| 4.14 | Refresh the user-facing install and usage text | `INSTALL-GUIDE.md`, `USER-GUIDE.md`, `README.md`, `SYNC.md` |
| 4.15 | Rebuild the five platform bundles and the plugin, then re-run the pinned test | `mcp server/dist-bundles/`, `mcp server/claude-plugin/server/`, `mcp server/claude-plugin/skills/sk-media-editor/` |

Ranked 4.1 first because the route order is the behavior the fixed decisions name, 4.3 second
because an undeclared skill-only reference is the one phase-4 mistake the parity gate cannot see,
and 4.5 third because the oracle must agree with the prose before the playbook scenarios can be
trusted.

## Sources Consulted

- `AI Systems/Media Editor/claude project/Custom Instructions.md` (`:138-207`)
- `AI Systems/Media Editor/sk-media-editor/SKILL.md` (`:77`, `:84-88`, `:101`, `:127`, `:139`, `:151-161`, `:174-180`, `:194`, `:206`)
- `AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md` (parity)
- `AI Systems/Media Editor/sk-media-editor/references/setup.md` (`:55-59`)
- `AI Systems/Media Editor/mcp server/src/server/field-schemas.ts` (whole file)
- `AI Systems/Media Editor/mcp server/src/server/tool-registry.ts` (`:79-100`, `:102-127`)
- `AI Systems/Media Editor/mcp server/src/server/tool-context.ts` (`:290-295`, `:332-338`)
- `AI Systems/Media Editor/mcp server/src/tools/image/convert.ts` (`:100-165`)
- `AI Systems/Media Editor/mcp server/src/tools/image/sharp-output.ts` (`:492-496`)
- `AI Systems/Media Editor/mcp server/src/tools/image/batch-resize.ts` (`:169-187`, `:197-247`)
- `AI Systems/Media Editor/mcp server/src/tools/video/concat.ts` (`inputPaths`)
- `AI Systems/Media Editor/mcp server/src/core/output-folder.ts` (`:301-322`, `:350`, `:406-424`)
- `AI Systems/Media Editor/mcp server/src/core/result.ts` (`:44-49`, `:256`, `:309-319`)
- `AI Systems/Media Editor/mcp server/src/core/errors.ts` (`:12-31`)
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/export-root-no-subfolder.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/one-comprehensive-question.md`
- `AI Systems/Media Editor/benchmark/grader/twin_divergence.py` (`:93`, `:99-107`)
- `AI Systems/Media Editor/benchmark/gates/rule_parity.py` (`:31-35`, `:37-40`, `:55-70`)
- Commands: `find ... -name "*.md" | wc -l` returned 31 playbook files, `grep -rln "inputPaths" "mcp server/src/tools/"` returned only `video/concat.ts`

## Assessment

newInfoRatio: 0.85
Novelty justification: the kernel wording analysis is new and it identifies the precise mechanical
cause, the batch question template and the two new scenario contracts are new artifacts, the
`maxBytes` and server-guard verdicts are new decisions with new reasoning, and the ranked change
list is new. The `inputPaths` placement finding is new. Limited overlap with earlier iterations,
which supply the phase context rather than the content.
Confidence: high for the four kernel line readings and for the schema and placement findings, which
rest on cited lines. Medium for the scenario contracts, which are proposed text with no run behind
them, and medium for the `maxBytes` verdict, which weighs a design cost rather than measuring one.

## Reflection

What worked: reading all four kernel lines in place as a connected passage rather than as four
separate defect strings. The `:181` plus `:194` interaction is what explains the observed behavior,
and neither line looks wrong on its own.

What failed: no failed command this iteration. One gap remains that I did not close:
`mcp server/src/tools/image/sharp-output.ts` was read only at its `writeImageOutputs` allocation
site, so the claim that `layout: 'many'` reaches it from a multi-input call is an inference from
`tool-context.ts:290-295` rather than a confirmed call chain. Phase item 2.10 is written as a
confirm-then-adjust for that reason.

What was ruled out: widening ESCALATE 1 (F5.1), a second question for the folder (F5.1), a required
`fileName` (F5.3), a `targetFolder` field (F5.4), `maxBytes` on `image_convert` (F5.5), a
server-side unconfirmed-name guard (F5.6), and folding `maxBytes` into a description (F5.5).

## Recommended Next Focus

No further focus. The five planned iterations are complete and the ranked list in F5.8 is the
phase deliverable. The synthesis pass should consolidate the ruled-out directions across all five
iterations, carry the open questions rather than closing them silently, and record that the two
playbook scenarios are proposed text with no run behind them and that phase item 2.10 carries an
unconfirmed call-chain inference.
