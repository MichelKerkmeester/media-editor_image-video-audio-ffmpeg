# Media Editor CLI: ranked, evidenced design

Lineage: `deepseek`, session `fanout-deepseek-1791117729260-kpn1og`, executor
`cli-pi model=opencode-go/deepseek-v4.1-flash`.
Loop type: research. Five iterations, one focus each. Stop reason: `maxIterationsReached`.

## 0. The answer in one page

Add a `media-editor` CLI as a second transport over the same 40 handlers, not a second tool layer.
Extract the dispatch from the MCP registration so one SDK-free function serves both, put a new entry
point beside the existing one instead of branching inside it, and never hand tool arguments to the
configuration loader, whose bare-token rule turns them into allowed folders
(`runtime/src/core/config.ts:167-172`).

Ship the CLI inside the same bundle the plugin already unpacks, and let the skill reach it through
`${CLAUDE_PLUGIN_ROOT}` written inline in Markdown, which the official reference documents as resolving
in "Skill, command, and agent content" anywhere in the Markdown body. Treat a plugin `bin/` folder as a
convenience for humans, not as the skill's dependency, because the same page says a plugin with a
top-level `bin/` is not installed on other surfaces. Keep the dist layout: two relative-path reads
depend on it (`runtime/src/server/server-info.ts:39-49`, `runtime/src/core/font-path.ts:51`).

Move the skill to the CLI by adding one skill-only reference that never enters `RESOURCE_MAP`, and by
adding one bound predicate to `choose_route` so the kernel's copy of the router stays byte-identical.

Harden the naming gate by making the confirmation question a precondition of the first writing call
rather than a reaction to ambiguity, and by giving the batch case one folder decision and a server-side
way to target it.

The single most important finding: the bug was not a missing rule. The kernel already said several files
from one call go into one numbered folder (`claude project/Custom Instructions.md:149`). The rule existed
and was bypassed because nothing made it a precondition. Six of the nine ranked Phase 2 items are wording
or schema text, and the one real server change is small.

## 1. Baseline, measured

- 40 tool handlers. `mcp server/src/server/all-tools.ts:57-98` lists 40 definitions and I counted the
  entries. The packet's "40 tool handlers" is confirmed by the file.
- Byte-identical mirrors. All seven declared pairs in the Sync Loop `systems.py:1252-1267` are
  byte-identical today, verified with `cmp -s`: `references/image-operations.md`,
  `references/video-and-audio-operations.md`, `assets/hls-video-conversion.md`, `references/tools.md`,
  `references/setup.md`, `references/interactive-intelligence.md`, `references/media-framework.md`.
  `references/router-contract.md` is the declared unmirrored exception (`systems.py:1271-1276`).
- 42 files mention the literal folder name `mcp server`, counted by grep across the system excluding
  `node_modules`, `dist`, `build` and the plugin build outputs.
- 36 source files import `outputNameField`, the upper bound on tools that would gain a placement field.
- Startup cost, measured on this machine with `/usr/bin/time -p`: `node -e "0"` 0.02 s,
  `import('ffmpeg-static')` 0.02 s, `import('sharp')` 0.19 s,
  `import('./dist/server/all-tools.js')` 0.21 s. So one CLI process pays about 0.21 s before it does
  anything, and `sharp` is almost all of it.
- Zod, verified by running it in the package: `zod` resolves to 4.6.5 and `z.toJSONSchema` is a function,
  so `describe` needs no extra dependency.
- Unknown keys are stripped silently, verified:
  `z.object({a: z.string()}).safeParse({a: 'x', typo: 1})` returns `{ success: true, data: { a: 'x' } }`.
  The dispatch parse at `runtime/src/server/tool-registry.ts:107` uses exactly that call shape, so a
  mistyped flag is dropped without an error today, on MCP as well as on the CLI.

## 2. Phase 1, rename `mcp server/` to `runtime/`

Mechanical, zero behaviour change, and a prerequisite for every path citation in Phases 2 to 4.

- Rename the folder and repoint the references. Outside the folder the touches are `AGENTS.md`,
  `INSTALL-GUIDE.md`, `README.md`, `SYNC.md`, `USER-GUIDE.md`,
  `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md`,
  `claude project/knowledge/Media Editor - Reference - Setup.md`, `sk-media-editor/README.md`,
  `sk-media-editor/SKILL.md`, `sk-media-editor/references/setup.md`, `sk-media-editor/references/tools.md`,
  and three playbook scenarios.
- Do not rewrite the changelogs or the dated `SYNC.md` lines. They record the name as it was. Add one new
  dated `SYNC.md` entry.
- Keep the inner layout. `runtime/scripts/build-bundle.ts:76` stages `dist`, `assets` and `licenses` by
  name, and `runtime/src/core/font-path.ts:51` resolves `../../assets/fonts/` from the module URL, so the
  emitted tree must keep its depth and folder names.

Rejected: renaming the folder to anything that hides the MCP origin, such as `server/`. Reason:
`runtime/` is the honest name once one folder holds both transports, and the word server would then be
ambiguous between the MCP server and the CLI.

## 3. Phase 2, harden naming and placement

Ranked items, exactly as listed in `iterations/iteration-005.md` section 9, items 4 to 14.

The gate. Ask one question before the first writing call, listing every proposed name and the target
folder, with the export-root versus one-numbered-folder choice included whenever two or more inputs
arrive in one request. Apply it even when the request is unambiguous and even when the user already named
the result. Put the rule on the ALWAYS list rather than on ESCALATE, because ESCALATE is the doubt list
and this case had no doubt. Files: `claude project/Custom Instructions.md:145`, `:149`, `:165`, `:194`.

The batch question. A dedicated template beside the output-preferences block at
`sk-media-editor/references/interactive-intelligence.md:109-113`, then the same bytes in
`claude project/knowledge/Media Editor - System - Interactive Intelligence.md`, proven with `cmp`.

The field text. `runtime/src/server/field-schemas.ts:62-80` describes an omitted `fileName` and an
omitted `subfolder` as normal outcomes. Both descriptions must say that a caller has to ask first and
that every call in one request passes the same folder value.

The placement change. `allocateOutputFolder` always allocates:
`runtime/src/core/output-folder.ts:301-341` computes `highestFolderNumber(realOutputDir) + 1` at
`:322-329` and creates that fresh folder, so four calls with `subfolder: true` produce four folders and
there is no way to target the folder a previous call made. Add a `subfolderName` string placement field
and make allocation find-or-create by slug. That is the smallest change that makes "one place" true, and
it fixes every tool at once. Then add a multi-input form to `image_convert`, whose result shape already
carries a list (`runtime/src/tools/image/convert.ts:122` maps `written.images`,
`runtime/src/tools/image/sharp-output.ts:503-512` writes one entry per plan and removes all of them on
failure), so only the argument shape and the plan loop change.

`maxBytes`. Worth adding, but as its own change: a byte target needs a quality search, a quality floor and
a defined outcome when the floor cannot reach the target. It should not be a hard guarantee, because at
some floor WebP cannot hit an arbitrary byte target. Cheaper option for the observed request: state the
size target in the confirmation question and report the achieved size from the existing `bytes` field
(`runtime/src/core/result.ts:45-46`).

Server guard. Not worth its friction. A hard guard lands on every legitimate call and cannot tell a
confirmed name from an invented one, and the server has no request identity to compare with. A soft guard
fails for the same reason in the other direction: the MCP server is long-lived with no per-request
identity and the CLI is one process per call. The observed failure happened in wording, so wording is
where the fix goes.

Playbook. Two new scenarios, one per surface, over the same four-file prompt:
`sk-media-editor/manual-testing-playbook/project-ambiguity-intake/batch-names-and-folder.md` and
`sk-media-editor/manual-testing-playbook/skill-ambiguity-intake/batch-names-and-folder.md`, an index row
in `manual-testing-playbook.md`, and a twin declaration in
`benchmark/grader/twin_divergence.py:87-105`. The Project scenario is the one whose absence let the bug
through.

Naming collision to fix in the same pass. `skill-route-order/connected-tools-first.md` already says "the
CLI runtime" and means the Claude Code runtime, and `sk-media-editor/README.md:329` calls the skill "the
CLI runtime". With a real `media-editor` command landing, the word CLI must mean the command. Reword to
"the Claude Code skill".

## 4. Phase 3, build the CLI

Ranked items 15 to 27 in `iterations/iteration-005.md` section 9. The load-bearing decisions:

- Transport-neutral dispatch. New `runtime/src/server/dispatch.ts` holding the index builder, the
  argument parse, the placement split and the error mapping, with no SDK value import, plus a local
  `ToolResult` interface in `runtime/src/server/tool-result.ts` that `runtime/src/core/result.ts` returns
  in place of `CallToolResult`. The MCP registration site accepts it because the shapes are structurally
  identical (`runtime/src/core/result.ts:309-319`, `:330-347`).
- Argument errors as results. A parse failure returns `errorResult` with code `INVALID_INPUT` and a
  machine-readable issue list, instead of throwing `McpError` from
  `runtime/src/server/tool-registry.ts:107-113`.
- A separate entry. `runtime/src/index.ts:126` runs `void main()` at module scope, so the CLI gets its own
  `runtime/src/cli.ts`.
- Configuration. A CLI-only adapter emits nothing but `--allowed-dir` and `--output-dir` tokens, because
  the loader turns every bare token into an allowed root (`runtime/src/core/config.ts:167-172`) and
  unknown flags only warn (`:179-188`).
- Exit codes and signals. `runtime/src/index.ts:23-88` already has a shutdown path but nothing reaps
  running ffmpeg children: `runtime/src/core/process-runner.ts:471-477` kills only on the child's own
  timeout. Add a live-child and temp-folder registry with exported termination, and exit `130` and `143`
  on signals rather than the server's `0` (`runtime/src/index.ts:66`).
- Command surface. `list`, `describe <tool>` and `<tool>`, with arguments by flag, `--args-file` or
  stdin. `describe` uses `z.toJSONSchema`. A build-time `dist/tools.json` manifest keeps `list` and
  `describe` from importing the 0.21 s tool graph.
- Output. stdout gets exactly `structuredContent`. Failures also go to stdout with exit code 1, so
  `media-editor image_probe --input x.png | jq .code` works for both outcomes.
- Preview. The inline base64 block (`runtime/src/tools/media/preview.ts:119-124`) becomes a written JPEG
  and a path on the CLI, while MCP keeps the image block.
- Cache. Capability and resolver caches are per-process today
  (`runtime/src/core/capabilities.ts:366-403`, `runtime/src/core/ffmpeg-resolver.ts:446-485`), so a
  one-shot CLI re-reads them every call. Persist both under `<dataDir>/cache/`, validated by the same
  size and mtime test `readCache` already uses, and keep the capability entry advisory so a corrupt cache
  cannot skip a real check.
- Distribution. `runtime/scripts/build-bundle.ts:76` stages `dist` whole, so `dist/cli.js` rides the
  existing bundle and the existing signed-and-hashed plugin path. Add a build check for its presence, in
  the spirit of `runtime/scripts/build-plugin.ts:336-338`.

## 5. Phase 4, move the skill to the CLI

Ranked items 28 to 36 in `iterations/iteration-005.md` section 9. The load-bearing decisions:

- New skill-only `sk-media-editor/references/cli.md`, ON_DEMAND only. It must never enter `RESOURCE_MAP`
  or `ALWAYS`, because `benchmark/router/differential.py:333-339` compares the skill's resource list with
  the contract's and a skill-only entry would fail every fixture.
- `${CLAUDE_PLUGIN_ROOT}` inline in the Markdown body, never resolved at build time. Documented at
  https://code.claude.com/docs/en/plugins-reference. The same page states the variables are not in the
  Bash tool environment, which is why a `bin/` shim must resolve its own path rather than read the
  variable.
- `choose_route` gains `media_cli_available()` as its first predicate. `benchmark/router/differential.py:314-317`
  binds host state by writing into the module dict, so a third binding keeps the kernel's Section 8 copy
  byte-identical while the Project binds it false. `HOST_STATES` at `:100-104` gains a `cli available`
  state and its type annotation widens. No contract schema change is needed: `route` is not one of the six
  `ROUTE_FIELDS` at `benchmark/router/route_contract.py:87-89`, so a fourth route value costs only the
  differential's own assertion at `:331-332`.
- `TOOL_MAP` and `FALLBACK_MAP` need no change, which is a second argument for naming CLI subcommands
  exactly after the registered tool names.
- `setup.md` stays mirrored. Splitting it by surface would rename a Knowledge file, change the kernel's
  Knowledge table, force a statement resync and an operator upload, all for a change the Project does not
  need.
- `benchmark/gates/rule_parity.py:71` and `:208`: raise the route-order `min_pairs` floor to match the new
  sentences and add the retired plugin-as-MCP-host wording to the retired-name set. A phrase carried only
  by the skill-only `cli.md` contributes zero declared pairs, so no `RULES` phrase may live there alone.
- `benchmark/grader/twin_divergence.py:87-95`: keep `SRO-001` and `PRO-001` paired on the deliverable
  assertions, and put the route assertion in the unpaired ids where `SRO-002` already lives. Retiring the
  pair would remove the only check that both packagings still produce the same user-visible outcome.
- `systems.py:1245-1697`: add `references/cli.md` to `unmirrored_sources`, extend the router-contract
  reason, and rewrite the `8 router code` residency statement and its key plus the Header row keyed
  `c6fd13141985411f24d63a8a287a800da568725ffc44763f35577342f878ab15`.
- Kernel version bump, statement resync, and one dated `SYNC.md` entry recording that the skill's route
  order is CLI, tools, ffmpeg, advice while the Project's stays tools, ffmpeg, advice.

## 6. Rejected directions, consolidated

Phase 1. A neutral folder name that hides the MCP origin.

Phase 2. Forbidding `subfolder: true` on a batch. A text-only fix. A `targetFolder` absolute path input.
`maxBytes` as a hard guarantee, or `maxBytes` in the same change as the bug fix. A hard or soft server
guard against omitted names. Reusing the word CLI for the Claude Code runtime.

Phase 3. Copying `dispatchToolCall` into the CLI. Keeping the CLI coupled to `CallToolResult`. Driving
`createServer` over an in-process transport. Argv sniffing inside `index.ts`. Teaching `loadConfig` about
a CLI separator. Environment-variable-only configuration. `process.exit()` without child reaping.
`--key=value` with string-only semantics. Positional arguments mapped per tool. JSON-file-only input.
Printing the whole `CallToolResult`. Failure output on stderr only. Dropping preview or leaving base64 in
JSON. Caching only schemas. A project-local cache or data folder. Lazy imports inside tool definitions to
defer `sharp`. Publishing to npm. A single-file bundle or a second dist root. A second MCP server entry.

Phase 4. Splitting `setup.md` by surface. Adding `cli.md` to `RESOURCE_MAP` or `ALWAYS`. Making `cli.md` a
paired file or folding it into `SKILL.md`. Reusing the `tools` route value for a CLI run. A CLI mode in
`MODE_VALUES`. Retiring the `SRO-001` and `PRO-001` twin pair. A skill-only `choose_route` that differs
from the kernel's copy.

## 7. Evidence gaps and honest limits

- I did not run the compiler, the test suite, the bundle build, the plugin build, or any gate in
  `benchmark/`. My write surface forbids it, and the packet says research does not implement. Where a
  conclusion depends on a build result I said so: the `dist/cli.js` emit layout, and the `dist/tools.json`
  manifest, are designs rather than verified artifacts.
- The 0.21 s startup figure is this machine only and was not repeated warm.
- `build-bundle.ts` was read for its staging constant and pack step, not in full, so "no explicit
  `dist/cli.js` check today" is an inference.
- Two official documentation pages were fetched and both questions in the Phase 3 brief were answered from
  them rather than left unverified: https://code.claude.com/docs/en/plugins-reference (the environment
  variable table, the "Where each variable resolves" table, and the standard-layout row for `bin/`) and
  https://code.claude.com/docs/en/plugins.md (the plugin directory table). Supporting pages consulted:
  https://code.claude.com/docs/en/plugins and https://code.claude.com/docs/en/skills.
- Timestamps. The five iteration records and their deltas were written with fabricated clock values
  during the run. They were backfilled from real `date -u` readings taken at backfill time in ascending
  order, so each stored timestamp is a value read from the clock, but the readings are not the moments the
  iterations ran.

## 8. Files produced

- `iterations/iteration-001.md` to `iterations/iteration-005.md`
- `deltas/iter-001.jsonl` to `deltas/iter-005.jsonl`
- `deep-research-state.jsonl`, `deep-research-config.json`, `deep-research-strategy.md`,
  `deep-research-dashboard.md`, `findings-registry.json`, `resource-map.md`, `research.md`
