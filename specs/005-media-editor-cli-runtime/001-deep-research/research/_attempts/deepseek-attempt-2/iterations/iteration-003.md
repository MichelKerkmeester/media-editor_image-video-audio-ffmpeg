# Iteration 003 - Distribution

Focus: how the plugin ships `server/dist/cli.js`, how the skill finds that CLI in Claude Code
(`${CLAUDE_PLUGIN_ROOT}`, a plugin `bin/` folder, or an installed shim), per-platform sharp and the
pinned ffmpeg, a standalone install for other terminal agents, and why the dist layout must not move.

Sources read this iteration: `mcp server/claude-plugin/.claude-plugin/plugin.json`,
`mcp server/claude-plugin/.claude-plugin/marketplace.json`, `mcp server/claude-plugin/README.md`,
`mcp server/claude-plugin/server/manifest.json`, `mcp server/scripts/build-plugin.ts`,
`mcp server/scripts/build-bundle.ts`, `mcp server/scripts/bundle/targets.ts`,
`mcp server/scripts/bundle/README.md`, `mcp server/scripts/test-pinned.ts`, `mcp server/scripts/README.md`,
`mcp server/src/core/font-path.ts`, `mcp server/src/core/server-info.ts`, `mcp server/package.json`,
`mcp server/.gitignore`. Two official documentation pages were fetched and are cited by URL below.

## 1. What the plugin ships today, and what a CLI changes

The plugin folder is `mcp server/claude-plugin/`. Two of its three subfolders are build output and are
gitignored: `claude-plugin/server/` and `claude-plugin/skills/` (both listed in
`mcp server/.gitignore`), and `build-plugin.ts:288-290` states the same in prose. The tracked parts are
`.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

`build-plugin.ts:341-357` copies the tracked skill from `../sk-media-editor` into
`claude-plugin/skills/sk-media-editor`, and `:336-338` refuses to finish when the unpacked server has
no `dist/index.js` (`server-missing`). So the plugin's server folder is not this package's `dist/`. It
is a bundle that `build-bundle.ts` staged and packed.

The staging set is the load-bearing detail: `build-bundle.ts:76` is
`const STAGED_FOLDERS: readonly string[] = ['dist', 'assets', 'licenses']`, copied whole at `:121`.
Because `tsc -p tsconfig.build.json` writes `dist/cli.js` beside `dist/index.js`, the CLI rides the
existing bundle with no new staging rule. The same is true for the plugin: `server/dist/cli.js` appears
as soon as the source entry exists, and `build-plugin.ts` unpacks the whole bundle into
`claude-plugin/server`.

Today's plugin manifest points at the MCP entry only:
`claude-plugin/.claude-plugin/plugin.json` has an `mcpServers` block with
`"args": ["${CLAUDE_PLUGIN_ROOT}/server/dist/index.js", "${CLAUDE_PROJECT_DIR}", "--output-dir", "${CLAUDE_PROJECT_DIR}/media files/export"]`
and `"env": { "MEDIA_EDITOR_DATA_DIR": "${CLAUDE_PLUGIN_DATA}" }`. Fixed decision 1 removes that block.
Two consequences worth recording: the folder-root argument `${CLAUDE_PROJECT_DIR}` and the export root
argument must move into the CLI invocation line, and `MEDIA_EDITOR_DATA_DIR` should stay pinned to
`${CLAUDE_PLUGIN_DATA}` so the plugin's ffmpeg install and cache do not collide with a global one.

## 2. Plugin mechanics, from the official documentation

Both questions in this iteration's brief are answered by the official reference, so neither is left
unverified.

Question A, can a skill inside a plugin read `${CLAUDE_PLUGIN_ROOT}`. Yes, but only through inline
substitution in Markdown, not through the environment.
Source: https://code.claude.com/docs/en/plugins-reference
The Environment variables section defines it: "`${CLAUDE_PLUGIN_ROOT}` Absolute path of the plugin's
installed version" for "Scripts, binaries, and config files bundled with the plugin", and adds
"`${CLAUDE_PLUGIN_ROOT}` changes when the plugin updates, so don't write state there."
The "Where each variable resolves" table lists the row "Skill, command, and agent content" with the
field column "Anywhere in the Markdown body" and the process column "Not applicable", and it states
plainly: "The variables aren't present in the environment of commands Claude runs through the Bash
tool, in the main session or in a subagent. In skill, command, and agent content, write the `${...}`
reference in the Markdown body instead, and Claude Code substitutes the path inline when it loads the
content."

Question B, is a plugin `bin/` folder put on `PATH`. Yes, and with one delivery consequence.
Source: https://code.claude.com/docs/en/plugins-reference
The standard-layout table has the row "Executables `bin/` Files here are on the Bash tool's `PATH`
while the plugin is enabled, so Claude runs them as bare commands. claude.ai and Cowork don't install a
plugin that has this directory, including one you distribute through claude.ai organization settings."
Supporting pages: https://code.claude.com/docs/en/plugins.md carries the same directory table with
`bin/` as a plugin-root folder, and https://code.claude.com/docs/en/plugins shows the plugin root as a
directory of components loaded with `--plugin-dir`. The skills page,
https://code.claude.com/docs/en/skills, documents `skills/` as the plugin skill location and the
`plugin-name:skill-name` namespacing, which matters because this plugin's directory name is already
`media-editor`.

## 3. Three ways the skill could find the CLI, and the pick

Option 1, `${CLAUDE_PLUGIN_ROOT}` inline in the skill Markdown. Documented and it needs no new build
output. Cost: the resolved path changes on every plugin update (the doc says so explicitly), so the
skill text must always carry the variable and never a resolved path, and every invocation is a long
`node ${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js` line. The existing README already uses this form for
the server entry (`mcp server/claude-plugin/README.md:66`).

Option 2, a `bin/` folder at the plugin root holding an executable named `media-editor`. The Bash tool
then resolves the bare name. Cost: the plugin becomes uninstallable on claude.ai and Cowork, per the
quoted sentence above. That is acceptable only because fixed decision 1 keeps the Claude Code plugin
separate from the Desktop extension, and it must be recorded as a deliberate consequence, not
discovered later.

Option 3, an installed shim such as `npm install -g` from the package root. Independent of the plugin
loader, and the right answer for "other terminal agents" in section 5. Cost: it does not exist inside
a plugin install, and `mcp server/package.json` is `"private": true`, so publishing is out of scope today.

Recommendation, and the part that matters: make the skill depend on Option 1 and treat Option 2 as a
convenience for humans and terminal agents. Concretely:

1. The skill-only `references/cli.md` carries one canonical invocation line,
   `node ${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js`, with the folder root and export root as fixed
   arguments, mirroring what the manifest passes today.
2. The plugin also gets `claude-plugin/bin/media-editor`, a small executable shim that resolves its own
   real path with `realpathSync(process.argv[1])` and then runs `<plugin>/server/dist/cli.js` with
   `node`. It must resolve itself by path because the docs say the variable is not in the Bash
   environment.
3. Because the skill does not depend on `bin/`, a build target that must stay installable on claude.ai
   can simply omit the `bin/` folder.

Rejected: have the skill call the bare command `media-editor` as its only form. Reason: it silently
breaks on any install where `bin/` is absent or stripped, which the documentation explicitly allows,
and a skill that cannot invoke its own runtime is worse than a long path.

Rejected: resolve the CLI path at build time and write the absolute path into the skill copy. Reason:
`${CLAUDE_PLUGIN_ROOT}` changes on update, so a baked path goes stale on the first plugin update.

Rejected: ship the CLI as a second MCP server entry. Reason: fixed decision 1 registers no MCP server
in the plugin, and a tools/list round trip per shell command is the cost the CLI exists to remove.

## 4. Per-platform sharp and the pinned ffmpeg

Nothing new is needed, and the reasons are local and checkable.

- The per-platform native dependency problem is already solved by the bundle. `build-bundle.ts:76`
  stages `dist`, `assets`, and `licenses`, then runs a platform-targeted install
  (`npmInstallArgs(key)`, `:164`) so `node_modules/sharp` resolves the right libvips. `build-plugin.ts:303`
  reads `dist-bundles/<bundleFileName(key)>` and unpacks it, so the plugin's
  `claude-plugin/server/node_modules/` is that platform's install. The CLI uses the same resolution.
- The pinned ffmpeg is placed per platform by the same tooling.
  `mcp server/scripts/README.md` states `test-pinned.ts` "place[s] the pinned pair, run[s] vitest on
  it", and `mcp server/scripts/test-pinned.ts:1-40` imports `PINNED_BUILDS` and `platformKeyOf`. The
  resolver then finds the binary through `<dataDir>/bin` (`mcp server/src/core/ffmpeg-resolver.ts:646`)
  or the bundled path (`:607`), both of which the CLI reaches through `loadConfig`.
- `bundle/targets.ts:29` sets `BUNDLE_SIZE_LIMIT = 150_000_000`, so `dist/cli.js` is noise against the
  limit and no size gate needs changing.

The one addition is a bundle check: `build-bundle.ts` should fail when `dist/cli.js` is absent, in the
same spirit as `build-plugin.ts:336-338` failing on a missing `dist/index.js`. Otherwise a bundle built
before the CLI entry lands ships a plugin whose skill cannot run.

## 5. A standalone install for other terminal agents

Proposal: add a second `bin` key to `mcp server/package.json`, `"media-editor": "dist/cli.js"`, beside
the existing `"media-editor-mcp": "dist/index.js"`, and document two commands for a terminal agent: run
`node dist/cli.js` from the package root, or `npm install -g .` from the package root for a global
`media-editor`. The first needs no install step and no publish, and it is what a repository-local agent
should use.

Rejected: publish to npm. Reason: the package is `"private": true` in `mcp server/package.json`, the
pinned ffmpeg is fetched from a third-party host at first use, and publication brings a release process
the packet does not ask for.

Rejected: a bundled single-file CLI (esbuild or similar). Reason: section 6.

## 6. Keep the dist layout

Two relative-path reads constrain where the CLI entry may live.

- `mcp server/src/server/server-info.ts:39-49` reads the package version through
  `createRequire(import.meta.url)('../../package.json')`, with the comment at `:41` that "The same
  relative path resolves from src/server and from dist/server". A CLI at `dist/cli.js` adds no
  directory level, so this keeps resolving.
- `mcp server/src/core/font-path.ts:51` resolves the bundled font with
  `path.resolve(fileURLToPath(new URL('../../assets/fonts/', import.meta.url)))`, and the file is at
  `assets/fonts/SourceSans3-Regular.ttf` (confirmed on disk). From `dist/core/font-path.js` that
  resolves to `<package>/assets/fonts`, which is exactly the staged `assets` folder
  (`build-bundle.ts:76`). Any build that flattened modules into one file would break this, and
  `:71-78` throws a `MediaError` when the font is missing rather than degrading quietly.

So the constraint is not "keep `dist/` for the server" in the abstract. It is that the emitted tree
must keep the same depth and folder names, for both `dist/server/` and `dist/core/`.

Rejected: a single-file bundle for the CLI. Reason: it relocates `import.meta.url` for every module, so
both constraints above break at once.

Rejected: a second `dist-cli/` output folder. Reason: it doubles the staging rule and gives the bundle
two roots for no benefit.

## Ruled out this iteration

1. Bare `media-editor` as the skill's only invocation form.
2. A build-time baked absolute path into the skill copy.
3. A second MCP server entry for the CLI.
4. Publishing to npm.
5. A single-file bundle, or a second dist root.

## Inferences recorded as inferences

- That `build-bundle.ts` currently has no explicit `dist/cli.js` check. I read the staging constant and
  the pack step, not the whole file.
- The shim's self-path resolution is my design. The documentation establishes that the variable is not
  in the Bash environment, which is why the shim cannot read it.
