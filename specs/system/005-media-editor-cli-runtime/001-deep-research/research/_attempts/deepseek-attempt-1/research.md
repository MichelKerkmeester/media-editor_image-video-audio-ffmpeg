# Media Editor CLI, Skill and Project Split, and Naming Gate Hardening

Deep research synthesis. Lineage `deepseek`, session `fanout-deepseek-1791115841524-lv22uz`.
Spec folder `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research`.
Five iterations, stop reason `maxIterationsReached`.
Executor: cli-pi, model `opencode-go/deepseek-v4.1-flash`, loop type research.

All paths are relative to `AI Systems/Media Editor/` unless stated otherwise. The folder under study
is still named `mcp server/` on disk and is cited by that name throughout.

---

## 1. Executive Summary

The Media Editor can gain a `media-editor` CLI over its 40 existing tool handlers without forking a
single behavior, because the handler contract is already transport-free and the only MCP coupling in
the dispatch path is one import and one throw. The work is four phases: rename the package folder,
harden the naming and placement gate, build the CLI, then move the skill onto it.

Three findings changed the shape of the work against the brief's own proposal.

1. **The mirror that motivated the split does not exist as described.** The three pairs are
   byte-identical, confirmed by `cmp -s`, and `sk-media-editor/references/tools.md` is already
   transport-neutral, so it stays mirrored. But `setup.md` is also already keyed by surface, and
   splitting it would make parity harder rather than easier. The proposal to split it is rejected.
2. **A plugin root `bin/` folder is on the Bash tool's PATH, and it blocks installs.** The official
   Claude Code documentation says a plugin with `bin/` is not installed on claude.ai or Cowork, and
   that the plugin path variables are substituted inline in skill Markdown but are not present in
   the Bash process environment. The skill must therefore carry a resolved invocation line rather
   than assume a bare command or a shell variable.
3. **The live bug is one interaction, not four defects.** The kernel's hard wait is gated on
   ambiguity at `claude project/Custom Instructions.md:181` and its content is one name with no
   folder at `:194`. A clear batch request never reaches the first and satisfies the second once,
   which is exactly the observed one-`subfolder`-out-of-four pattern.

## 2. Scope and Fixed Decisions

Taken as given and not reopened. The Claude Code plugin ships the skill and the CLI runtime and
registers no MCP server. The Claude Project stays on the Desktop extension and MCP and gets the
naming hardening. The skill's route order is the CLI first for everything it covers, then
hand-written ffmpeg, then advice. No new tools for audio trim, loudness normalization or CRF
compression.

## 3. The Dispatch Seam

`dispatchToolCall` (`mcp server/src/server/tool-registry.ts:102-127`) parses with
`z.object(listedInputSchema(definition)).safeParse(args)`, splits `fileName` and `subfolder` out and
rebuilds the context with `withPlacement`, then calls the handler inside a try/catch that maps any
throw to `errorResult`. `ToolContext` is built by `createToolContext` with no server reference
(`mcp server/src/server/tool-context.ts:332-503`), and both result builders return plain objects
(`mcp server/src/core/result.ts:309-347`).

The only MCP coupling is the `McpError` import and the `CallToolResult` type. Exporting the function
into `mcp server/src/core/dispatch.ts` and returning an argument-error result instead of throwing
`McpError` makes one path serve both transports. The MCP call handler keeps only the unknown-tool
branch, which stays a protocol error because `ErrorCode.MethodNotFound` is an MCP-level concern
(`tool-registry.ts:197-202`).

The tool list is one array of 40 definitions (`mcp server/src/server/all-tools.ts:57-98`, counted),
so a CLI enumerates from the same source and needs no second registry.

## 4. CLI Surface

Three verbs: `list`, `describe <tool>`, and `<tool>`.

`describe` produces JSON Schema from zod directly. The installed zod is 4.6.5 and `z.toJSONSchema` is
present as a function (verified by running it against `mcp server/node_modules/zod`), so
`describe` reports exactly what an MCP client receives, including the `fileName` and `subfolder`
placement fields that `listedInputSchema` composes (`tool-registry.ts:91-100`). That makes the
live-bug surface inspectable from a terminal.

Argument intake is one JSON object, three ways: `--args '<json>'`, `--args-file <path>`, or stdin.
Per-field flags are rejected: they need a 40-schema to argv mapping, cannot express arrays, and
duplicate zod defaults such as `quality`'s `.default(80)` (`mcp server/src/tools/image/convert.ts:162-163`).

stdout carries `JSON.stringify(structuredContent)`. stderr carries the one-line summary, so a human
sees the summary and a script sees pure JSON. `outputs[].path` is already absolute
(`mcp server/src/core/result.ts:42-43`), so chaining works with no CLI-specific shape.

Previews must become files. `previewFrom` returns a base64 image block today
(`mcp server/src/tools/media/preview.ts:38-45`), which a pipe cannot use. The CLI writes the bytes
under `<dataDir>/previews/` and replaces the block with a path.

## 5. Startup Cost and Shared State

`capabilityCache` is a module-level `Map` (`mcp server/src/core/capabilities.ts:163`) that dies with
the process, and reading the lists has a 30 second timeout (`:156`). Per-call CLI startup would
re-read encoder and filter lists every time. The resolver half is already durable: `resolveBinary`
reads `path.join(config.dataDir, 'bin', 'install.json')` and checks the installed digest against both
the record and the pin (`mcp server/src/core/ffmpeg-resolver.ts:569-573`).

So the CLI needs one addition, a capability cache file under the data folder, keyed by the resolved
binary path plus size and mtime, invalidated alongside the in-process map.

`MEDIA_EDITOR_DATA_DIR` (`mcp server/src/core/config.ts:92`) is the mechanism that keeps
`media_setup_ffmpeg` and `media_health` coherent across processes. Setup writes to
`path.join(dataDir, 'bin', ...)` (`mcp server/src/tools/media/setup-ffmpeg.ts:252`), the resolver
finds it there (`ffmpeg-resolver.ts:646`), and `media_health` reports it
(`mcp server/src/tools/media/health.ts:204`). The CLI must not add a `--data-dir` flag, because one
invocation could then install an ffmpeg the next invocations cannot see.

## 6. Exit Codes, Signals and Cleanup

The existing `exitWithCode` drains stderr before exiting (`mcp server/src/index.ts:40-54`) and signal
handling closes an `McpServer` (`:56-88`), which a CLI does not have. The runner kills children with
`SIGTERM` then `SIGKILL` after a grace period (`mcp server/src/core/process-runner.ts:472-477`) but
keeps the child reference in a closure, so there is no process-wide way to walk live children.

Recommended: export a live-child registry plus `killAllChildren()`, and have the CLI's SIGINT and
SIGTERM handlers call it, run the same folder cleanup the runner already uses
(`process-runner.ts:769`), and exit. Exit codes split caller misuse from runtime failure: 0 success,
1 handler failure, 2 invalid tool or arguments, 3 configuration fatal.

An `AbortSignal` threaded through every handler was rejected as too large a blast radius for a phase
meant to be a seam.

## 7. Distribution and Plugin Mechanics

Two questions were checked against the official Claude Code documentation.

**Is a plugin `bin/` folder put on PATH?** Yes. The standard layout table says files in `bin/` "are
on the Bash tool's `PATH` while the plugin is enabled, so Claude runs them as bare commands", and it
adds that "claude.ai and Cowork don't install a plugin that has this directory".
[SOURCE: https://code.claude.com/docs/en/plugins-reference.md]

**Can a skill inside a plugin read `${CLAUDE_PLUGIN_ROOT}`?** Yes, but only as an inline Markdown
substitution. The resolution table lists "Skill, command, and agent content | Anywhere in the
Markdown body | Not applicable", and states that "The variables aren't present in the environment of
commands Claude runs through the Bash tool, in the main session or in a subagent".
[SOURCE: https://code.claude.com/docs/en/plugins-reference.md]

**Recommendation: no plugin root `bin/`. The skill carries the resolved invocation inline.**

```text
MEDIA_EDITOR_DATA_DIR=${CLAUDE_PLUGIN_DATA} node ${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js <tool> --args '<json>'
```

The `bin/` route gives a nicer bare command and forfeits claude.ai and Cowork install eligibility.
The env prefix is inference from documented substitution behavior, not a documented example, so the
plugin build's smoke check should confirm it composes.

The `dist` layout must not move. Three resolutions depend on compiled depth: the version via
`createRequire(import.meta.url)('../../package.json')` (`mcp server/src/server/server-info.ts:42-43`),
the font via `new URL('../../assets/fonts/', import.meta.url)` (`mcp server/src/core/font-path.ts:50-52`),
and the font's failure path (`:73-82`). A separate `cli/` package breaks all three.

Per-platform sharp and the pinned ffmpeg are already solved by the bundle build
(`mcp server/scripts/build-plugin.ts:288-349`, `mcp server/scripts/bundle/targets.ts:28-29`, five
platform `.mcpb` files on disk), so the CLI inherits it. For other terminal agents the install is
`npm link` inside the package or a per-platform tarball, since the package is `private`
(`mcp server/package.json:7`). The `test:pinned` run (`:21`) needs a CLI smoke test or the CLI is the
one surface never exercised against the pinned build.

One more constraint: `disableSkillShellExecution` and Cowork session behavior can remove inline
shell execution ([SOURCE: https://code.claude.com/docs/en/settings-reference]). The skill needs a
stated three-branch degradation rather than an assumption that the CLI runs.

## 8. Skill and Project Split

All three named pairs are byte-identical, confirmed with `cmp -s`. The real mirror file names are
`Media Editor - Reference - Media Editor Tools.md`, `Media Editor - Reference - Setup.md` and
`Media Editor - System - Interactive Intelligence.md`. The full declared pair set is seven, not
three (`Sync Loop systems.py:1252-1272`).

| Proposal element | Verdict | Evidence |
| --- | --- | --- |
| `tools.md` stays transport-neutral and mirrored | **Holds** | Its only transport word is the source note at line 23 |
| A new skill-only `references/cli.md` carries invocation | **Holds, with a condition** | It must be declared in `unmirrored_sources` (`systems.py:1274-1281`), the same way `router-contract.md` is |
| `setup.md` splits by surface | **Rejected** | It is already sectioned and tabulated by surface (`setup.md:3`, `:21-23`, `:55-59`), and both halves would have to match one Project mirror byte for byte |

The declaration block runs `systems.py:1248-1695` with 47 residency statements across ten section
labels. Four labels carry route text the CLI changes: `Header` (which already claims "The CLI
`sk-media-editor/` package and the Claude Code plugin run the same tools from a terminal", `:1290-1292`),
`2 smart routing` (8 statements), `3 how it works` and `8 router code`. Two of those statements are
marked `duplicate or machine`, with `8 router code` as the authority, so the route order has one
authoritative statement to change and two summaries to keep consistent.

## 9. Route Order Rewrite

`choose_route` today is two probes and three outcomes
(`sk-media-editor/references/router-contract.md:147-155`, mirrored in the kernel at
`systems.py:1360-1362`), and the executable oracle is `HOST_STATES` with three rows
(`benchmark/router/differential.py:100-104`) under a comment stating the ordering rule
("ffmpeg on the path never outranks connected tools", `:97-99`).

Recommended shape: one ordered probe list, `("cli", "tools", "ffmpeg", "advice")`, evaluated against
a per-surface probe set. The skill probes `cli` then `ffmpeg`. The Project probes `tools`. One
function, one ordering rule, one return vocabulary, and both fixed decisions expressed directly.

`benchmark/router/route_contract.py` is unaffected because it models modes, not the live route: its
own comment says which route is live is a runtime concern (`:63`).

`rule_parity.py` reads its pair list from the declaration (`:26-29`) and must gain a rule entry for
the CLI route order, because a rule living only in `SKILL.md` and `cli.md` has zero declared pairs
teaching it and reports agreement trivially. Its banned-name scan (`:37-40`) must not be extended to
cover MCP, since the Project keeps its own server and `setup.md` legitimately names MCP surfaces.

`twin_divergence.py` should keep `SRO-001` paired with `PRO-001` and update the comment: the
module's own docstring already covers "a recognisably different reply shape on each side while
agreeing on the substance" (`:11-17`), and both sides still select Image Mode and produce a file.
`SRO-001`'s command step that confirms `mcp list` shows media-editor as Connected must be replaced,
since the plugin registers no server. The skill route order gains a branch, so one skill-side
route scenario is not enough: the playbook needs the CLI branch, the ffmpeg branch, and the advice
branch.

## 10. Naming and Placement Gate

The kernel's four implicated lines read as a connected passage:

| Line | Content | Failure mode |
| --- | --- | --- |
| `claude project/Custom Instructions.md:145` | propose a readable name, apply after confirmation, `media_rename` renames a result already written | one name, and naming framed as reversible |
| `:149` | one result into the output folder, several files from one call into a new numbered folder | several files are a property of one call, so four calls are not "several files" |
| `:181` | ESCALATE IF the request is ambiguous, ask one comprehensive question | the only hard wait is ambiguity-gated and a clear batch never reaches it |
| `:194` | propose a readable file name and wait for the user to confirm | singular name, no folder in the sentence |

`claude project/Custom Instructions.md:181` plus `:194` is the mechanical cause. The replacement
wording moves the wait from ambiguity to the first write, scopes it to the whole request, and makes
the folder part of the same question, including an explicit "Every call in one request uses one
place, never a mixture" clause.

The tool and field descriptions reinforce the wrong behavior. `fileName`'s description ends "Omitted,
the file is named after the input plus the operation"
(`mcp server/src/server/field-schemas.ts:66-68`) and `subfolder`'s ends "Omitted, one file goes to
the export root and several files get a folder" (`:76-80`). Both present omission as a documented,
non-consequential choice. `mcp server/src/tools/image/convert.ts:136-141` adds "in the export root,
or a numbered folder on request". Because `listedInputSchema` composes these two fields onto every
tool that takes `outputName` (`tool-registry.ts:91-100`), rewriting them is the cheapest change that
reaches all 40 tools.

A batch question template carrying one question, one place, and a counted-name rule goes into
`sk-media-editor/references/interactive-intelligence.md` and its mirror in the same edit.

## 11. Batch Placement, Size Targets and Guards

`image_convert` takes one `inputPath` today (`mcp server/src/tools/image/convert.ts:42`, `:107-109`,
`:143`). Only `video_concat` takes a list. **Recommended: give `image_convert` `inputPaths` and an
aligned `fileNames`.** When more than one entry is present the write path gets `layout: 'many'`, and
`wantsFolder` returns true for `many` when `subfolder` is unset
(`mcp server/src/server/tool-context.ts:290-295`), so four inputs land in one new numbered folder by
default with no new placement code.

A `targetFolder` field pointing at an existing numbered folder was rejected: it needs a number
lookup, a containment check and a collision policy, and it does not fix a bug that was about four
calls rather than a missing target.

**`maxBytes` on `image_convert`: not worth adding.** Sharp's `quality` is a visual-fidelity dial
(`convert.ts:137-139`), so a byte ceiling needs a quality search plus a defined not-reachable
failure. The caller already gets the number: `outputs[].bytes` is read from the written file
(`mcp server/src/core/result.ts:44-49`, `:256`). Revisit only if size misses become the next failure
class, and then as a shared field beside `fileName`.

**Server guard against unconfirmed names: rejected.** The server sees one call at a time with no
request boundary, so a batch guard has nothing to hang on (`tool-registry.ts:102-127`,
`tool-context.ts:332-338`), and every proxy guard is bypassed by passing a plausible string. The one
useful invariant already holds: `outputName` is required on every writing tool
(`field-schemas.ts:50-54`), so no numbered folder can be created unnamed.

Two playbook scenarios close the gap. `SED-005`, a Project batch, is the regression test for the
reported bug and belongs in `UNPAIRED_IDS` as Project-only
(`benchmark/grader/twin_divergence.py:99-107`). `SED-004` is its skill-side counterpart. Neither
exists in the 31 current playbook files, where naming scenarios are all single-file.

## 12. Recommendations

Ranked across the four implementation phases. The full per-file list is in
`iterations/iteration-005.md` section F5.8.

Phase 1, rename: `git mv "mcp server" runtime`, then update every path string that names the folder.
The one ordering trap is `sk-media-editor/references/tools.md:23` and its mirror, which must be
edited together or the parity gate goes red between the two edits.

Phase 2, harden the gate: rewrite the kernel File Naming section
(`claude project/Custom Instructions.md:143-145`), the Export Protocol paragraph (`:147-149`), and
the DELIVERY sequence (`:202-207`), then the skill's equivalents (`sk-media-editor/SKILL.md:194`,
`:101`, `:206`), then the two field descriptions
(`mcp server/src/server/field-schemas.ts:62-80`). Then add multi-input `image_convert`, the two
playbook scenarios, and the declaration key updates.

Phase 3, build the CLI: extract `mcp server/src/core/dispatch.ts`, add `mcp server/src/cli.ts`, split
the CLI's argv before `loadConfig`, export the child registry for signals, write previews to a file,
add the persistent capability cache, register the `bin` key, and add a pinned smoke test.

Phase 4, move the skill: rewrite the route order in `SKILL.md`, add the skill-only
`references/cli.md` and declare it, rewrite `choose_route` and hold the kernel copy equal, extend
`HOST_STATES`, update `rule_parity.py` and the `SRO-001` comment, split the route scenarios, remove
the plugin's `mcpServers` block, add the `dist/cli.js` build assertion, and rebuild the bundles.

## 13. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| The inline env prefix in the skill's invocation line is not a documented example | Add a smoke check in the plugin build that composes and runs the line |
| A new skill-only reference is invisible to the parity gate | Declare it in `systems.py` `unmirrored_sources` before writing the file |
| The kernel route code and the skill router drift apart | They are held equal by `rule_parity.py`. Change `8 router code` first, then the summaries |
| `disableSkillShellExecution` or Cowork removes shell execution | State the three-branch degradation in `SKILL.md` and `cli.md` |
| A multi-input `image_convert` changes a tool's call shape | Land the instruction surfaces first, then the schema change, then the tests |
| `npm link` gives a CLI whose module resolution differs from the bundled install | The `dist` layout keeps `../../package.json` and `../../assets/fonts/` resolving in both |

## 14. Eliminated Alternatives

| Approach | Reason Eliminated | Evidence | Iteration(s) |
| --- | --- | --- | --- |
| Re-export `dispatchToolCall` from `tool-registry.ts` | Module-scope `McpServer` and `McpError` import drags the MCP SDK server runtime into every CLI process | `mcp server/src/server/tool-registry.ts:9-14` | 1 |
| Duplicate dispatch logic in the CLI | Two parse-and-place paths drift on the `fileName` and `subfolder` handling the bug implicates | `tool-registry.ts:118-122` | 1 |
| `--cli` branch inside `src/index.ts` | Module self-runs at `:126` and a two-job module still self-runs on import | `mcp server/src/index.ts:126-128` | 1 |
| Env-only config for the CLI | Removes per-call folder targeting and makes `--output-dir` unusable in a terminal | `mcp server/src/core/config.ts:155-219` | 1 |
| Teach `loadConfig` a skip list of tool flags | Couples the config loader to 40 handler schemas | `config.ts:178-188` | 1 |
| Thread `AbortSignal` through every handler | High blast radius across `ToolContext` and `RunBinaryOptions` | `mcp server/src/server/tool-context.ts:60-71` | 1, 3 |
| Checked-in JSON tool manifest for `list` | `ALL_TOOLS` and `TOOL_REQUIREMENTS` already key on one union | `mcp server/src/server/all-tools.ts:57-98` | 2 |
| Hand-maintained per-tool `--help` text | Description text is already authoritative in the zod schema | `mcp server/src/tools/image/convert.ts:136-141` | 2 |
| Shell out to the MCP server's `tools/list` | Needs a live server process, forbidden by fixed decision 1 | `mcp server/src/index.ts:103-111` | 2 |
| Per-field CLI flags | Needs a 40-schema to argv mapping, cannot express arrays, duplicates zod defaults | `tool-registry.ts:107`, `convert.ts:162-163` | 2 |
| Positional JSON as the only argument | Ambiguous with `list` and `describe` and awkward for paths with spaces | inference | 2 |
| Text-only stdout | Drops `outputs[].bytes`, `elapsedMs` and tool extras | `mcp server/src/core/result.ts:309-319` | 2 |
| CLI envelope `{ok,data,error}` | Invents a second contract, `isError` already carries the split | `core/result.ts:334` | 2 |
| Keep base64 previews on stdout | Tens of KB of base64 a shell caller cannot decode | `mcp server/src/tools/media/preview.ts:38-45` | 2 |
| Write previews into the export root | Puts a non-deliverable in the folder the user reviews | inference from the live bug | 2 |
| No capability cache | Adds a 30 second-timeout ffmpeg spawn per CLI call | `mcp server/src/core/capabilities.ts:156`, `:163` | 2 |
| Daemon or long-lived CLI process | Reproduces the MCP transport lifetime problems at larger scope | inference | 2 |
| `--data-dir` flag | Lets one invocation install an ffmpeg the next cannot see | `config.ts:324-341`, `ffmpeg-resolver.ts:569` | 2 |
| Per-project data folder | Duplicates the ffmpeg download and breaks install record lookup | `ffmpeg-resolver.ts:569` | 2 |
| Plugin root `bin/media-editor` shim | Docs state claude.ai and Cowork do not install a plugin with a `bin` directory | https://code.claude.com/docs/en/plugins-reference.md | 3 |
| `$CLAUDE_PLUGIN_ROOT` inside a Bash code block in a skill | Docs state the variables are not in the Bash process environment, only substituted inline in Markdown bodies | https://code.claude.com/docs/en/plugins-reference.md | 3 |
| Hard-code an absolute plugin install path | Docs state the root changes when the plugin updates | https://code.claude.com/docs/en/plugins-reference.md | 3 |
| Separate `cli/` package at the repository root | Breaks `../../package.json` and `../../assets/fonts/` resolution, duplicates native sharp | `mcp server/src/server/server-info.ts:42-43`, `mcp server/src/core/font-path.ts:50-52` | 3 |
| Single-file bundled CLI now | Needs runtime anchoring for fonts and the install record | `font-path.ts:73-82`, `ffmpeg-resolver.ts:569` | 3 |
| Publish to npm and depend on `npx` | Package is private, native sharp makes a publish a per-platform matrix | `mcp server/package.json:7`, `:28` | 3 |
| Standalone compiled binary | Same anchoring gap as the bundled CLI | `font-path.ts:73-82` | 3 |
| Assume shell execution always happens | `disableSkillShellExecution` and Cowork can remove it | https://code.claude.com/docs/en/settings-reference | 3 |
| Split `setup.md` by surface | It is already keyed by surface and both halves must match one mirror | `setup.md:3`, `:21-23`, `:55-59` | 4 |
| Two per-surface `choose_route` functions | Two blocks to hold equal and two chances for a stale kernel copy | `differential.py:97-104`, `systems.py:1360-1362` | 4 |
| Add the CLI as a fifth mode in `route_contract.py` | The CLI is a transport for the same tools, not a mode | `benchmark/router/route_contract.py:36-58`, `:63` | 4 |
| Extend the `rule_parity` banned-name scan to cover MCP | The Project keeps its own MCP server, so a ban would fail its own mirrors | `benchmark/gates/rule_parity.py:37-40` | 4 |
| Delete `SRO-001` | Loses the only paired scenario testing one prompt on a live-mutation surface on both sides | `twin_divergence.py:93` | 4 |
| Unpair `SRO-001` from `PRO-001` | Contract fields still agree, and a different reply shape is already covered | `twin_divergence.py:11-17` | 4 |
| Leave the `systems.py` declaration untouched | `rule_parity.py` reads its pair list from it, so the gate would check the wrong thing green | `rule_parity.py:26-29` | 4 |
| Widen ESCALATE 1 to cover placement | Makes every clear request sound ambiguous | `claude project/Custom Instructions.md:181` | 5 |
| A second question for the folder | Two questions before one request, against the house one-question style | `Custom Instructions.md:181`, `SAI-001` | 5 |
| Make `fileName` required | Breaks scripted callers and makes user-declined-a-name unrepresentable | `field-schemas.ts:62-68` | 5 |
| A `targetFolder` field | New field, number lookup, containment check and collision policy, and it does not fix the bug | `output-folder.ts:301-322` | 5 |
| `maxBytes` on `image_convert` | Quality is a fidelity dial, a ceiling needs a search plus a not-reachable failure, and `bytes` is already reported | `convert.ts:137-139`, `core/result.ts:44-49` | 5 |
| Fold `maxBytes` into the `quality` description | Description text a schema does not enforce is a false signal | `field-schemas.ts:76-80` | 5 |
| Server guard against unconfirmed names | No request boundary to hang a batch guard on, and every proxy is bypassable | `tool-registry.ts:102-127`, `tool-context.ts:332-338` | 5 |

## 15. Open Questions

1. Does `layout: 'many'` actually reach `writeImageOutputs` from a multi-input `image_convert`? The
   claim comes from `withPlacement`'s `wantsFolder` (`mcp server/src/server/tool-context.ts:290-295`)
   and the allocation call site (`mcp server/src/tools/image/sharp-output.ts:492-496`) read
   separately. Phase item 2.10 is written as confirm-then-adjust for this reason.
2. Does the inline env prefix `MEDIA_EDITOR_DATA_DIR=${CLAUDE_PLUGIN_DATA} node ...` compose in a
   skill Markdown body? Documented substitution behavior implies yes. No documented example was
   found and no live Claude Code session was run.
3. Will `unmirrored_sources` accept a second entry for the same system without a kernel review
   decision? The block currently holds exactly one entry (`systems.py:1274-1281`) and the mechanism
   for approving a second was not read.
4. What are `benchmark/router/differential.py`'s other inputs and does it hold a fixture table that
   enumerates the three current host states? Only `:85-130` was read, so the blast radius of adding a
   CLI axis to `HOST_STATES` is an estimate.
5. Does the Project kernel's Section 8 Router Code have a second copy anywhere besides
   `systems.py:1360-1362` and `sk-media-editor/references/router-contract.md`? Two copies were found
   and `rule_parity.py` holds them equal, but the scan was not exhaustive.

None of these five blocks the ranked change list. Items 1, 2 and 3 are cheap to close with one
command each during implementation.

## 16. Verification Method

Evidence was gathered by reading the cited lines and by running commands rather than by inference
wherever a command was available. Commands that produced load-bearing facts:

- `cmp -s` on the three named mirror pairs, all BYTE-IDENTICAL, run from `AI Systems/Media Editor/`
- `find "mcp server/src/tools" -name "*.ts" | wc -l` returned 43 source files
- `sed -n '57,98p' .../all-tools.ts | grep -c "Tool,"` returned 40, confirming the tool count
- `node -e "require('./mcp server/node_modules/zod/package.json').version"` returned 4.6.5
- `node -e "const z=require('./mcp server/node_modules/zod') then console.log(typeof z.toJSONSchema)"`
  returned `function`
- `find sk-media-editor/manual-testing-playbook -name "*.md" | wc -l` returned 31
- `grep -rln "inputPaths" "mcp server/src/tools/"` returned only `video/concat.ts`
- `grep -c "'statement_key'"` over `systems.py:1248-1700` returned 47
- `grep -o "'section': '[^']*'" | sort | uniq -c` produced the ten section labels
- `find "AI Systems" -maxdepth 2 -name systems.py` located the declaration
- `ls "mcp server/dist/"` confirmed no `cli.js` exists today
- `ls "mcp server/dist-bundles/"` confirmed five platform bundles

Web sources, all official Anthropic documentation:

- https://code.claude.com/docs/en/plugins-reference.md
- https://code.claude.com/docs/en/plugins.md
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/settings-reference

## 17. References

### Lead steer

- `steer.md`, read after iteration 5. It asked for one state record per iteration in
  `deep-research-state.jsonl` carrying four route keys, the same four keys on each delta iteration
  record, and a terminal synthesis record whose `stopReason` is `maxIterationsReached`. All three
  were applied as a records-only correction, and all five iterations verify OK with
  `verify-iteration.cjs`. It did not ask for and did not receive any change to the iteration
  narratives.

### Iteration artifacts

- `iterations/iteration-001.md` through `iterations/iteration-005.md`
- `deltas/iter-001.jsonl` through `deltas/iter-005.jsonl`
- `deep-research-strategy.md`, `deep-research-state.jsonl`, `deep-research-dashboard.md`,
  `findings-registry.json`

### Primary sources

- `AI Systems/Media Editor/mcp server/src/server/tool-registry.ts`
- `AI Systems/Media Editor/mcp server/src/server/all-tools.ts`
- `AI Systems/Media Editor/mcp server/src/server/tool-context.ts`
- `AI Systems/Media Editor/mcp server/src/server/field-schemas.ts`
- `AI Systems/Media Editor/mcp server/src/server/create-server.ts`
- `AI Systems/Media Editor/mcp server/src/server/server-info.ts`
- `AI Systems/Media Editor/mcp server/src/index.ts`
- `AI Systems/Media Editor/mcp server/src/core/config.ts`
- `AI Systems/Media Editor/mcp server/src/core/result.ts`
- `AI Systems/Media Editor/mcp server/src/core/errors.ts`
- `AI Systems/Media Editor/mcp server/src/core/output-folder.ts`
- `AI Systems/Media Editor/mcp server/src/core/process-runner.ts`
- `AI Systems/Media Editor/mcp server/src/core/capabilities.ts`
- `AI Systems/Media Editor/mcp server/src/core/ffmpeg-resolver.ts`
- `AI Systems/Media Editor/mcp server/src/core/font-path.ts`
- `AI Systems/Media Editor/mcp server/src/tools/image/convert.ts`
- `AI Systems/Media Editor/mcp server/src/tools/media/preview.ts`
- `AI Systems/Media Editor/mcp server/src/tools/media/setup-ffmpeg.ts`
- `AI Systems/Media Editor/mcp server/src/tools/media/health.ts`
- `AI Systems/Media Editor/mcp server/package.json`
- `AI Systems/Media Editor/mcp server/manifest.json`
- `AI Systems/Media Editor/mcp server/scripts/build-plugin.ts`
- `AI Systems/Media Editor/mcp server/scripts/bundle/targets.ts`
- `AI Systems/Media Editor/mcp server/scripts/test-pinned.ts`
- `AI Systems/Media Editor/mcp server/claude-plugin/.claude-plugin/plugin.json`
- `AI Systems/Media Editor/sk-media-editor/SKILL.md`
- `AI Systems/Media Editor/sk-media-editor/references/tools.md`
- `AI Systems/Media Editor/sk-media-editor/references/setup.md`
- `AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md`
- `AI Systems/Media Editor/sk-media-editor/references/router-contract.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/export-root-no-subfolder.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/one-comprehensive-question.md`
- `AI Systems/Media Editor/claude project/Custom Instructions.md`
- `AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Media Editor Tools.md`
- `AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Setup.md`
- `AI Systems/Media Editor/claude project/knowledge/Media Editor - System - Interactive Intelligence.md`
- `AI Systems/Media Editor/benchmark/router/route_contract.py`
- `AI Systems/Media Editor/benchmark/router/differential.py`
- `AI Systems/Media Editor/benchmark/gates/rule_parity.py`
- `AI Systems/Media Editor/benchmark/grader/twin_divergence.py`
- `Sync Loop systems.py` (`:1248-1695`)

### Resource map

`resource-map.md` was not present in the spec folder at init, so no coverage gate applies and no
resource-map reference is synthesized.
