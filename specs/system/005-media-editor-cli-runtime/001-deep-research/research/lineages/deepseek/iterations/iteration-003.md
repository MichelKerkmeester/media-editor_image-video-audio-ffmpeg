# Iteration 003 - Distribution

Focus: how the plugin ships the CLI, how the skill finds it in Claude Code (`${CLAUDE_PLUGIN_ROOT}`, a plugin `bin/` folder, or an installed shim), per-platform sharp and the pinned ffmpeg, a standalone install for other terminal agents, and why the dist layout stays. This lineage has a web search tool, so both plugin-mechanics questions were checked against the official Claude Code documentation and every URL relied on is cited below.

Sources read this iteration: `runtime/claude-plugin/.claude-plugin/plugin.json`, `runtime/claude-plugin/README.md`, `runtime/package.json`, `runtime/scripts/build-plugin.ts`, `runtime/scripts/build-bundle.ts`, `runtime/scripts/bundle/targets.ts`, `runtime/scripts/test-pinned.ts`, `runtime/src/server/server-info.ts`, `runtime/src/core/font-path.ts`, plus `git status --short`. Two official pages were fetched and are cited by URL.

## Findings

1. The plugin build now ships and checks the CLI. `runtime/scripts/build-plugin.ts:363-367` fails the build when the unpacked server has no `dist/cli.js` ("The unpacked server has no cli file"), and `:385-393` writes `bin/media-editor` plus `bin/media-editor.cmd` into the plugin folder. The POSIX shim resolves its own real path through a readlink loop and then runs `exec node "$here/../server/dist/cli.js"` (`:59-70`), so a symlinked install still finds the server folder beside the bin folder.

2. The plugin manifest still carries the MCP route. `runtime/claude-plugin/.claude-plugin/plugin.json` is tracked and unmodified since the rename, and its `mcpServers` block still points at `${CLAUDE_PLUGIN_ROOT}/server/dist/index.js` with `MEDIA_EDITOR_DATA_DIR` set to `${CLAUDE_PLUGIN_DATA}`. Fixed decision 1 registers no MCP server in the plugin, so removing that block is an open distribution item, and it is the one manifest edit the plugin still needs.

3. The standalone install for other terminal agents is declared, not published. `runtime/package.json:9-12` lists both `media-editor-mcp` to `dist/index.js` and `media-editor` to `dist/cli.js`, and the package is `private: true` (`:7`), so the routes are `node dist/cli.js` from the package root or a local install such as `npm install -g .`, with no npm publication in scope.

4. The bundle staging is unchanged, which is why the CLI rides along for free. `runtime/scripts/build-bundle.ts:76` stages `dist`, `assets` and `licenses` whole, so `dist/cli.js` is packed as soon as the compiler emits it, and the bundle size limit is 150,000,000 bytes (`runtime/scripts/bundle/targets.ts:29`), against which the 16 KB CLI is noise. The one addition the earlier design asked for, a bundle check for `dist/cli.js`, now exists in the plugin build (finding 1).

5. Official documentation, question A: a skill inside a plugin can read `${CLAUDE_PLUGIN_ROOT}`, but only through inline substitution in Markdown. Source https://code.claude.com/docs/en/plugins-reference, Environment variables section: the variable resolves to "Absolute path of the plugin's installed version" and is for "Scripts, binaries, and config files bundled with the plugin", the resolution table has the row "Skill, command, and agent content | Anywhere in the Markdown body | Not applicable", and the page states that the variables "aren't present in the environment of commands Claude runs through the Bash tool, in the main session or in a subagent" and that Claude Code "substitutes the path inline when it loads the content".

6. Official documentation, question B: a plugin `bin/` folder is on the Bash tool's PATH while the plugin is enabled, with one delivery cost. Same URL, Standard layout table: "Executables | `bin/` | Files here are on the Bash tool's `PATH` while the plugin is enabled, so Claude runs them as bare commands. claude.ai and Cowork don't install a plugin that has this directory, including one you distribute through claude.ai organization settings." The plugin targets Claude Code, so the bare `media-editor` command works there, and the claude.ai and Cowork exclusion is the recorded cost of the choice, not a surprise.

7. The plugin also ships the skill, and the skill is namespaced by the plugin. `runtime/scripts/build-plugin.ts:369-382` copies `../sk-media-editor` into `claude-plugin/skills/sk-media-editor` and fails when the copied tree differs from its source. Plugin skills load from `<plugin>/skills/<skill-name>/SKILL.md` and appear as `/plugin-name:skill-name` (https://code.claude.com/docs/en/skills, the "Where skills live" table and the invocation table), so this plugin's skill is `/media-editor:sk-media-editor` and the invocation name comes from the frontmatter or the directory name.

8. Per-platform sharp and the pinned ffmpeg need no new work. The bundle is built per platform target so `node_modules/sharp` resolves that platform's libvips, and `runtime/scripts/test-pinned.ts:83-95` and `:122` place the pinned pair for the running platform and verify each binary against its pinned digest before placement, while the resolver reads an installed pair from `<dataDir>/bin` or the bundled path. The CLI reaches both through the same `loadConfig` call the server uses.

9. The dist layout constraint is exactly two relative reads. `runtime/src/server/server-info.ts:42` loads `../../package.json` through `createRequire(import.meta.url)`, and `runtime/src/core/font-path.ts:51` resolves `../../assets/fonts/` through `import.meta.url`. A CLI at `dist/cli.js` adds no directory level, so both keep resolving, and any single-file bundle would relocate `import.meta.url` and break both at once. Related pending doc work: `runtime/claude-plugin/README.md:11-15` still describes the MCP-server delivery, so the README follows the manifest flip.

## Design answer

The distribution answer is one payload, two entry names and one bare command. The payload is the existing per-platform bundle, unchanged in shape, with `dist/cli.js` beside `dist/index.js`, so the Desktop extension keeps `dist/index.js` and the plugin gets the CLI with no second staging rule. The plugin writes `bin/media-editor` and `bin/media-editor.cmd` at build time, which puts a bare `media-editor` command on the Bash tool PATH for a Claude Code session, and the shim resolves its own real path before running `server/dist/cli.js`, so plugin updates and symlinked installs both keep working. The skill then carries the invocation in Markdown, and the spec decision recorded in the parent packet is the bare `media-editor` command. The documented `${CLAUDE_PLUGIN_ROOT}` form stays available as the portable alternative, and it is the only form a skill can carry, because the variable is substituted into skill text and is not present in the Bash environment.

## Ruled Out

1. A build-time baked absolute path into the skill copy, because `${CLAUDE_PLUGIN_ROOT}` changes on plugin update, and the documentation says so explicitly.
2. A second MCP server entry for the CLI, because fixed decision 1 registers no MCP server and a tools/list round trip per shell command is the cost the CLI exists to remove.
3. Publishing to npm, because the package is private and the pinned ffmpeg is fetched from a third-party host at first use.
4. A single-file CLI bundle, because it relocates `import.meta.url` and breaks both dist-relative reads at once.
5. Depending on the bare command alone while also depending on `bin/` never being stripped, because the documentation says claude.ai and Cowork refuse a plugin with `bin/`. The bare command is the Claude Code route and the plugin-root form remains the portable fallback in the skill text.
6. A second `dist-cli/` output folder, because it doubles the staging rule and gives the bundle two roots for no benefit.

## Edge Cases

- Partial success: the manifest flip and the plugin README update are not landed yet, which is recorded in findings 2 and 9 as pending work rather than as a failure of this iteration.
- Missing dependency: none. Both documentation pages were reachable and the local files were readable.

## Sources Consulted

- `AI Systems/Media Editor/runtime/scripts/build-plugin.ts:55-75`, `:340-412`
- `AI Systems/Media Editor/runtime/claude-plugin/.claude-plugin/plugin.json`
- `AI Systems/Media Editor/runtime/claude-plugin/README.md:1-40`
- `AI Systems/Media Editor/runtime/package.json:1-30`
- `AI Systems/Media Editor/runtime/scripts/build-bundle.ts:76`, `:107-120`
- `AI Systems/Media Editor/runtime/scripts/bundle/targets.ts:29`
- `AI Systems/Media Editor/runtime/scripts/test-pinned.ts:14`, `:83-122`
- `AI Systems/Media Editor/runtime/src/server/server-info.ts:42`
- `AI Systems/Media Editor/runtime/src/core/font-path.ts:51`
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/skills

## Assessment

- New information ratio: 0.75
- Questions addressed: how the plugin and a standalone package expose the CLI while preserving dist-relative assets.
- Questions answered: how the plugin and a standalone package expose the CLI while preserving dist-relative assets.

## Reflection

- What worked: fetching the official pages instead of trusting the prior lineage's quotes, because the manifest reference page has been rewritten and the environment-variable section now carries the exact sentences this design leans on.
- What did not work: nothing failed this iteration.
- What I would do differently: diff the tracked manifest against the build script's expectations first, which is how the pending flip was found.

## Recommended Next Focus

Iteration 4: the skill and Project split. The route order, the mirror pairs measured by `cmp`, the router contract and differential host states, the rule-parity gate, the twin-divergence grader, and the Sync Loop declaration for media-editor.
