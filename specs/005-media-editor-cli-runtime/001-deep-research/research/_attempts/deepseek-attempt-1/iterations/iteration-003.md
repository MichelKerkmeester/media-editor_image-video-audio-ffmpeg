# Iteration 3: Distribution

## Focus

Decide how the CLI ships and how the skill finds it: the plugin's `server/dist/cli.js`, the
`${CLAUDE_PLUGIN_ROOT}` and plugin `bin/` questions answered against the official Claude Code
documentation, per-platform sharp and the pinned ffmpeg, a standalone install for other terminal
agents, and why the `dist` layout must not move.

## Findings

### F3.1 The official docs answer both plugin questions, and the answers constrain the design

The Plugin manifest reference states the standard layout and marks `bin/` as a special directory:

> `Executables | bin/ | Files here are on the Bash tool's PATH while the plugin is enabled, so
> Claude runs them as bare commands. claude.ai and Cowork don't install a plugin that has this
> directory, including one you distribute through claude.ai organization settings`
> [SOURCE: https://code.claude.com/docs/en/plugins-reference.md]

So a plugin root `bin/` folder is put on the Bash tool's PATH, and it carries a real cost: a plugin
that has one is not installable on claude.ai or in Cowork. This is a direct answer to the second
question and it is not a cosmetic omission.

The same page answers the first question, and the answer has two halves:

> `| ${CLAUDE_PLUGIN_ROOT} | Absolute path of the plugin's installed version | Scripts, binaries,
> and config files bundled with the plugin |`
> `| ${CLAUDE_PLUGIN_DATA} | ~/.claude/plugins/data/<id>/, created on first reference and kept
> across plugin updates |`
> `| ${CLAUDE_PROJECT_DIR} | The project root |`
> [SOURCE: https://code.claude.com/docs/en/plugins-reference.md]

and, in the resolution table:

> `| Skill, command, and agent content | Anywhere in the Markdown body | Not applicable |`
> `The variables aren't present in the environment of commands Claude runs through the Bash tool,
> in the main session or in a subagent. In skill, command, and agent content, write the ${...}
> reference in the Markdown body instead, and Claude Code substitutes the path inline when it
> loads`
> [SOURCE: https://code.claude.com/docs/en/plugins-reference.md]

Read together: a skill inside a plugin **can** read `${CLAUDE_PLUGIN_ROOT}`, but only as an inline
Markdown substitution, and the variable is **not** exported into the Bash process. That second half
is the load-bearing one. A skill cannot say `$CLAUDE_PLUGIN_ROOT` in a shell snippet and expect
expansion. It must write the literal token in the Markdown body, which Claude Code replaces with an
absolute path when the skill loads, so the text Claude reads and then passes to Bash already holds
the resolved path.

**Recommended for the skill:** no plugin root `bin/` directory. The skill carries the resolved
invocation inline:

```text
node ${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js <tool> --args '<json>'
```

Three reasons. It keeps claude.ai and Cowork install eligibility, which the `bin/` route forfeits.
It needs no PATH assumption on a machine whose shell profile the plugin does not own. And the
inline substitution is the documented mechanism for exactly this case.

**Rejected option: a plugin `bin/media-editor` shim.** It gives the nicest skill text, a bare
`media-editor` command. Rejected because the documentation says a plugin with `bin/` is not
installed on claude.ai or Cowork, and because a shim script must itself compute the plugin root
since the environment variable is not exported into Bash either.

**Rejected option: rely on `$CLAUDE_PLUGIN_ROOT` inside a Bash code block in the skill.**
Rejected on the documented behavior above. The token is only substituted in Markdown body text and
is explicitly absent from the Bash process environment.

**Rejected option: hard-code an absolute install path in the skill.** Rejected because the docs say
the root path changes when the plugin updates, so a hard-coded path breaks on upgrade.

**Rejected option: shell out through the MCP server.** Rejected by fixed decision 1, the plugin
registers no MCP server.

### F3.2 The plugin build already stages a server folder and a skill folder, so the CLI rides the existing bundle

`build-plugin.ts` fills two folders from build output. It reads the plugin version from
`.claude-plugin/plugin.json` and refuses a mismatch with the package version
(`mcp server/scripts/build-plugin.ts:312-317`), unpacks the per-platform bundle into
`claude-plugin/server` (`:303`, `:317`), asserts `server/dist/index.js` exists (`:336`), then
replaces `claude-plugin/skills` wholesale and copies the tracked skill into
`skills/sk-media-editor` (`:347-349`). The doc block says both folders are build output and never
tracked (`:288-290`).

Consequence: adding `dist/cli.js` to the compile output means the CLI is inside the `.mcpb` bundle
and inside `claude-plugin/server/dist/` with no new build step. The check at `:336` should gain a
sibling assertion for `dist/cli.js`, so a build that silently drops the CLI entry fails loudly
instead of shipping a skill that points at nothing. That is a one-line change in the same function.

`plugin.json` today declares only `mcpServers` with
`${CLAUDE_PLUGIN_ROOT}/server/dist/index.js` and `MEDIA_EDITOR_DATA_DIR: ${CLAUDE_PLUGIN_DATA}`
(`mcp server/claude-plugin/.claude-plugin/plugin.json`). Under fixed decision 1 the plugin
registers no MCP server, so that block is removed and the data-dir binding moves into the skill's
invocation, since the environment no longer reaches the CLI through an MCP `env` block.

That relocation is worth flagging as a real risk. The plugin's `env` entry was the only place the
plugin set `MEDIA_EDITOR_DATA_DIR` to `${CLAUDE_PLUGIN_DATA}`
(`mcp server/claude-plugin/.claude-plugin/plugin.json`). The docs export `CLAUDE_PLUGIN_DATA` to
MCP servers but not to the Bash tool
[SOURCE: https://code.claude.com/docs/en/plugins-reference.md]. The skill therefore cannot set it
by variable either. It must write the resolved path inline, the same way it writes the CLI path, and
the CLI must accept a data folder through an argument or an inline environment assignment. The
cleanest form is an inline env prefix on the command:

```text
MEDIA_EDITOR_DATA_DIR=${CLAUDE_PLUGIN_DATA} node ${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js <tool> --args '<json>'
```

Both tokens are in inline substitution position, and the result a shell receives is two absolute
paths. This is inference about shell composition from documented substitution behavior, not a
documented example, so it belongs in the build's smoke check.

### F3.3 The `dist` layout must not move because three separate relative resolutions depend on it

Three call sites read paths relative to the compiled module, all of which hold only while the
compiled file sits two levels under the package root:

| Site | Mechanism | Citation |
| --- | --- | --- |
| Server version | `createRequire(import.meta.url)('../../package.json')` from `src/server` or `dist/server` | `mcp server/src/server/server-info.ts:42-43` |
| Bundled font | `new URL('../../assets/fonts/', import.meta.url)` resolved from `src/core` or `dist/core` | `mcp server/src/core/font-path.ts:50-52` |
| Font consumer | `assertBundledFont` throws `INTERNAL` when the font file is not a regular file | `mcp server/src/core/font-path.ts:73-82` |

The font resolver's own doc comment states the intent: "The folder resolves from this module, so it
holds while the code runs from `src/` and from `dist/` after a build"
(`font-path.ts:44-46`). A CLI entry at `dist/cli.js` is at the same depth as `dist/index.js`, so
`../../package.json` and `../../assets/fonts/` still resolve. A CLI entry at the package root or in
a new `bin/` source folder would not.

`add-subtitles.ts` and `add-text-overlay.ts` consume the font through `font-path.ts` rather than
computing their own path, so the relative-path risk is concentrated in one module. That is a good
reason to keep any future path needs in `font-path.ts` as well.

**Rejected option: a separate `cli/` package at the repository root.** Rejected because it breaks
all three relative resolutions and duplicates the dependency tree, including native sharp.

**Rejected option: a bundled single-file CLI (esbuild or similar).** Attractive for startup time
and for a standalone install, but it must still carry `assets/fonts` and the pinned `install.json`
location logic. It is a phase-4-plus optimization, not a prerequisite, and it would fork the module
resolution rules that currently just work.

### F3.4 Per-platform sharp and the pinned ffmpeg are already solved by the bundle, and the CLI inherits it

The package depends on `sharp` (`mcp server/package.json:28`), a native module, and the bundle build
installs per target. `scripts/bundle/targets.ts` exports `npmInstallArgs`, `npmInstallEnv`,
`binaryDestinations`, `bundleFileName`, `targetManifest` and `checkBundleSize` with
`BUNDLE_SIZE_LIMIT = 150_000_000` (`mcp server/scripts/bundle/targets.ts:28-29`, README section 2
lists the same responsibilities). Five platform bundles exist on disk
(`mcp server/dist-bundles/media-editor-darwin-arm64.mcpb`, `-darwin-x64`, `-linux-arm64`,
`-linux-x64`, `-win32-x64`).

The pinned ffmpeg is checked twice: the archive digest and then the unpacked binary digest, both
against `src/core/pinned-builds.ts` (README section 1, "Every download is checked against the
SHA-256"). `test-pinned.ts` writes the pinned binaries to a bin dir and points the test config at
them through `PINNED_BIN_DIR_ENV = 'MEDIA_EDITOR_TEST_BIN_DIR'`
(`mcp server/scripts/test-pinned.ts:46`), then runs vitest with that environment.

Consequence for the CLI: it needs no packaging work of its own. It must not, however, add a second
resolution rule for sharp or ffmpeg. `resolveBinary` already checks the configured override, then
the install record under the data folder, then whatever it finds (the ordering is visible in
`ffmpeg-resolver.ts:569-573` and `:646`). A CLI that ships inside the same bundle sees the same
`install.json` as long as `MEDIA_EDITOR_DATA_DIR` is stable, which is F2.7 again.

One test gap worth naming: `test:pinned` runs vitest against the pinned binaries
(`mcp server/package.json:21`). A new `cli` entry point needs its own smoke test in that run, or the
CLI will be the one surface never exercised against the pinned build.

### F3.5 A standalone install for other terminal agents needs three pieces the package already has, plus one it does not

For a terminal agent outside Claude Code, the CLI needs to be reachable as `media-editor`. What
exists:

- `package.json` already has a `bin` map with `media-editor-mcp` -> `dist/index.js`
  (`mcp server/package.json:9-11`), so adding a second key is idiomatic,
- the package declares `"type": "module"` and `engines.node >= 20.9.0` (`:6`, `:12-14`),
- `private: true` (`:7`) blocks publishing to a registry.

What is missing: a distribution channel. Three viable ones:

1. **Local link.** `npm link` inside `mcp server/`, which puts both bin keys on the global prefix.
   Zero packaging, works today, requires the user to have the repo checked out.
2. **A tarball.** `npm pack` plus `npm install -g <tarball>`. Works offline, carries the
   `private` flag fine because it is not a publish, but produces one tarball per platform when
   sharp is a dependency.
3. **A per-platform installed prefix.** Point an agent's PATH at `mcp server/node_modules/.bin` or
   add a small wrapper script.

Recommend 1 for the implementation, documented as "run `npm link` in `mcp server/`", with 2 as the
release path. Either way the `private` flag stays, since neither is a registry publish.

The one real hazard is `dataDir` divergence. An `npm link` install resolves
`import.meta.url` from the source tree, so `readServerVersion` reads the repo package.json
(`server-info.ts:42-43`) and the data dir stays the platform default
(`config.ts:388-390`). A globally installed tarball resolves from the global prefix and gets the
same platform default. So the two installs share one data folder and one ffmpeg install on one
machine, which is the desired behavior and worth stating in the install guide.

**Rejected option: publish to npm and depend on `npx`.** Rejected because the package is private,
the pinned ffmpeg archives are large, and sharp's native binary makes a registry publish a
per-platform build matrix.

**Rejected option: a standalone binary via `pkg` or `bun build --compile`.** Rejected for the same
reason as the single-file CLI in F3.3: `assets/fonts` and the resolver's install record would need
a runtime anchoring rule that does not exist yet.

### F3.6 Claude Code can disable skill shell execution, so the skill must degrade rather than assume the CLI runs

The Claude Code skills documentation exposes a `shell` frontmatter key for inline commands and a
`disableSkillShellExecution` setting that stops skills and custom commands from running inline
shell, and the skills page describes the same behavior for cloud and Cowork sessions
[SOURCE: https://code.claude.com/docs/en/skills]
[SOURCE: https://code.claude.com/docs/en/settings-reference].

That means the skill cannot treat the CLI as always runnable. The fixed route order (CLI, then
hand-written ffmpeg, then advice) already has a natural third branch, but the second branch is
itself shell execution. So the honest shape is:

1. CLI first when a Bash tool is available and the CLI path resolves,
2. hand-written ffmpeg when the CLI is missing but ffmpeg is available,
3. advice only, with the exact command and expected result, when shell execution is unavailable.

The skill must state this fallback explicitly rather than letting a model invent a fourth route.
This also gives the skill a stated behavior for the claude.ai and Cowork cases in F3.1.

**Rejected option: declare `allowed-tools: Bash` and assume execution always follows.** Rejected
because an administrator or a Cowork session can remove it, and a silent failure that produces no
advice is worse than a stated degradation.

## Sources Consulted

Local:

- `AI Systems/Media Editor/mcp server/claude-plugin/.claude-plugin/plugin.json`
- `AI Systems/Media Editor/mcp server/claude-plugin/.claude-plugin/marketplace.json`
- `AI Systems/Media Editor/mcp server/scripts/build-plugin.ts` (`:232-234`, `:288-294`, `:303-349`)
- `AI Systems/Media Editor/mcp server/scripts/bundle/README.md`
- `AI Systems/Media Editor/mcp server/scripts/bundle/targets.ts` (`:18-34`)
- `AI Systems/Media Editor/mcp server/scripts/test-pinned.ts` (`:44-50`)
- `AI Systems/Media Editor/mcp server/src/server/server-info.ts` (`:28-50`)
- `AI Systems/Media Editor/mcp server/src/core/font-path.ts` (whole file)
- `AI Systems/Media Editor/mcp server/package.json` (whole file)
- `AI Systems/Media Editor/mcp server/manifest.json` (server config and tools table)
- `AI Systems/Media Editor/mcp server/dist-bundles/` (five platform bundles on disk)
- `AI Systems/Media Editor/mcp server/dist/` (contains `index.js`, no `cli.js`)

Web, official documentation only:

- https://code.claude.com/docs/en/plugins-reference.md (standard layout, environment variables,
  where each variable resolves)
- https://code.claude.com/docs/en/plugins.md (plugin directory structure)
- https://code.claude.com/docs/en/skills (skill frontmatter, shell behavior)
- https://code.claude.com/docs/en/settings-reference (`disableSkillShellExecution`)

## Assessment

newInfoRatio: 0.8
Novelty justification: the two plugin questions are answered from primary documentation and both
answers change the design, the version and font path depth constraint is a new structural fact, and
the `disableSkillShellExecution` setting adds a branch the route order did not have. The bundle
inheritance in F3.4 largely restates iteration 2's distribution half.
Confidence: high for F3.1, F3.2, F3.3 and F3.4, which rest on quoted documentation and cited lines.
Medium for F3.5's standalone install recommendation, which is a packaging judgment. Medium for the
inline env-prefix composition in F3.2, which follows from documented substitution behavior but is
not itself documented as an example.

## Reflection

What worked: fetching the manifest reference directly settled a question that the search summaries
had left contradictory, since a third-party repository claimed `${CLAUDE_PLUGIN_ROOT}` "does not
work in SKILL.md bodies" while the official table says it resolves in skill content. The official
page is authoritative and the third-party claim is wrong as stated.

What failed: the first search returned a mixed set of mirrors and GitHub issues. The reliable move
was fetching `code.claude.com` and quoting the tables.

What was ruled out: a plugin root `bin/` shim (F3.1, forfeits claude.ai and Cowork), a shell
variable reference inside a skill (F3.1, not exported), a hard-coded install path (F3.1, breaks on
update), a separate CLI package (F3.3, breaks relative resolution), a single-file bundled CLI
(F3.3, font and install-record anchoring), npm publish or `npx` (F3.5, private and native), a
compiled standalone binary (F3.5), and assuming shell execution always happens (F3.6).

## Recommended Next Focus

Iteration 4, skill and Project split. Read `sk-media-editor/SKILL.md`,
`sk-media-editor/references/tools.md`, `setup.md`, `interactive-intelligence.md`,
`router-contract.md:147` and `claude project/knowledge/`, then verify byte-identical mirror parity
with a real diff command. Locate the Sync Loop's `systems.py` with
`find "AI Systems" -maxdepth 2 -name systems.py` and read the media-editor declaration. Read
`benchmark/router/route_contract.py`, `benchmark/router/differential.py:100`,
`benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py` and the route-order
playbook scenarios, then test the proposed split (transport-neutral `tools.md`, skill-only
`cli.md`, surface-split `setup.md`) against the mirror check rather than assuming it holds.
