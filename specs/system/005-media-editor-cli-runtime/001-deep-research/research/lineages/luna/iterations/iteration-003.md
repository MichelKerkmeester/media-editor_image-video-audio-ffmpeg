# Iteration 3: Distribution

## Focus

Resolve how Claude Code should locate the CLI, how its plugin build should ship the runtime without registering MCP, how other terminal agents can install it, and how platform binaries and relative assets remain intact.

## Findings

1. The current plugin manifest registers `media-editor` as an MCP server and invokes `server/dist/index.js` with `mcpServers` at `mcp server/claude-plugin/.claude-plugin/plugin.json:10-22`. Its README says to expect that server to be connected at lines 44-54 and describes the plugin as an MCP server at lines 9-11. This conflicts with the fixed decision that the Claude Code plugin ships the skill and CLI runtime and registers no MCP server. Remove the plugin `mcpServers` entry and update its install and verification instructions. Preserve `mcp server/manifest.json` for the separate Claude Desktop extension, whose MCP entry is at lines 23-35.

2. `buildPlugin` currently unpacks a platform `.mcpb` into `claude-plugin/server`, checks for `manifest.json` and `dist/index.js`, then copies and verifies the skill at `mcp server/scripts/build-plugin.ts:302-357`. The plugin build should still place the runtime under `claude-plugin/server/`, additionally require `server/dist/cli.js`, and ensure the deployed skill copy is current. Update `tests/packaging/build-plugin.vitest.ts`, which currently stages only `dist/index.js` at lines 253-289, to require the CLI entry and to assert the plugin manifest has no `mcpServers` entry.

3. The preferred skill invocation is an explicit `node` command whose script path contains `${CLAUDE_PLUGIN_ROOT}`, for example `node "${CLAUDE_PLUGIN_ROOT}/server/dist/cli.js"`. Claude Code substitutes `${CLAUDE_PLUGIN_ROOT}` in plugin skill Markdown and in the skill's `allowed-tools` rules. It is not an environment variable available to commands launched by the Bash tool. Use the same substituted command pattern in both the allowed-tools rule and skill body so the bundled CLI path is exact. These behaviors are documented in the [Claude Code skills guide](https://code.claude.com/docs/en/skills) and [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference).

4. A plugin `bin/` directory is also added to the Bash tool's `PATH` while the plugin is enabled, according to the [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference). A `bin/media-editor` wrapper would make a convenient bare command, but I do not recommend making the skill depend on it. The explicit plugin-root path is easier to tie to the skill permission rule and the exact bundled `server/dist/cli.js`. A global installed shim is suitable for standalone terminal agents, not for a self-contained plugin invocation. I also checked the [Anthropic Claude Code plugins URL](https://docs.anthropic.com/en/docs/claude-code/plugins), which redirects to the current `code.claude.com` plugins overview.

5. The Desktop build already packages platform-specific production dependencies and pinned binaries. `buildBundle` stages `dist`, `assets`, package metadata, and licenses at `mcp server/scripts/build-bundle.ts:68-76`, then performs platform-specific npm installation, checks native packages, and installs the pinned ffmpeg and ffprobe at lines 145-185. `npmInstallArgs` sets platform and architecture for `npm ci` and pins glibc on Linux at `mcp server/scripts/bundle/targets.ts:106-130`. `sharp` is a direct dependency at `mcp server/package.json:24-29`. Preserve this per-platform native dependency selection for the CLI package. `scripts/test-pinned.ts` downloads or reuses pinned binaries, checks their digest during extraction, and runs the suite with those binaries at lines 78-106 and 109-134.

6. Preserve the package-root layout under `server/`. `readServerVersion` resolves `../../package.json` relative to its module at `mcp server/src/server/server-info.ts:39-49`. `bundledFontDir` resolves `../../assets/fonts/` relative to its module at `mcp server/src/core/font-path.ts:41-60`, `add-subtitles.ts` and `add-text-overlay.ts` call the bundled font helpers at lines 19 and 404, and lines 19 and 321-325 respectively. Keep `server/dist/`, `server/assets/`, and `server/package.json` together so the compiled CLI and shared handlers keep resolving package metadata and fonts.

7. The existing package exposes only `media-editor-mcp: dist/index.js` in its `bin` field and has no standalone CLI install path at `mcp server/package.json:8-22`. The main install guide documents the extension and MCP-backed plugin, not a terminal CLI, at `INSTALL-GUIDE.md:90-118`. Add a `media-editor` package bin pointing to `dist/cli.js` and ship a standalone package artifact or local install procedure such as `npm link` from the package checkout. Document Node.js `20.9.0` or newer, the configured `MEDIA_EDITOR_DATA_DIR`, and a direct JSON CLI example for other terminal agents. The plugin skill should still use its bundled path so it does not require a separate global install.

## Sources Consulted

- `AI Systems/Media Editor/mcp server/claude-plugin/.claude-plugin/plugin.json:10-22`
- `AI Systems/Media Editor/mcp server/claude-plugin/server/manifest.json:23-35`
- `AI Systems/Media Editor/mcp server/claude-plugin/README.md:9-11,44-82`
- `AI Systems/Media Editor/mcp server/scripts/build-plugin.ts:302-357`
- `AI Systems/Media Editor/mcp server/scripts/build-bundle.ts:68-76,145-185`
- `AI Systems/Media Editor/mcp server/scripts/bundle/targets.ts:106-130`
- `AI Systems/Media Editor/mcp server/scripts/test-pinned.ts:78-106,109-134`
- `AI Systems/Media Editor/mcp server/tests/packaging/build-plugin.vitest.ts:253-291`
- `AI Systems/Media Editor/mcp server/src/server/server-info.ts:39-49`
- `AI Systems/Media Editor/mcp server/src/core/font-path.ts:41-60`
- `AI Systems/Media Editor/mcp server/src/tools/video/add-subtitles.ts:19,395-405`
- `AI Systems/Media Editor/mcp server/src/tools/video/add-text-overlay.ts:19,319-332`
- `AI Systems/Media Editor/mcp server/package.json:8-29`
- `AI Systems/Media Editor/INSTALL-GUIDE.md:90-118,176-180`
- [Claude Code skills guide](https://code.claude.com/docs/en/skills)
- [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference)
- The Anthropic documentation URL checked, which redirects to the current Claude Code plugin overview: [docs.anthropic.com Claude Code plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- The lineage steer review at `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/research/lineages/luna/steer.md:1-22`

## Assessment

- `newInfoRatio`: 0.9
- Novelty justification: This pass verified both plugin path mechanisms against current official docs and identified that the existing plugin actively registers MCP, while its build and tests currently require the MCP entry.
- Confidence: High for manifest, bundle, asset, and local installer behavior. The standalone packaging choice is a recommendation pending maintainer preference and package-release constraints.

## Reflection

- What worked: Comparing the generated plugin files and build checks with the current official Claude Code path rules, then tracing the runtime's relative package and font lookups.
- What failed: The current plugin build is structurally coupled to the Desktop MCP bundle and `dist/index.js`, so CLI packaging requires explicit build and test changes.
- Ruled out: Leaving `mcpServers` in the Claude Code plugin manifest. This violates the fixed plugin decision and causes Claude Code to start an MCP process with the plugin.
- Ruled out as the skill's required route: a separately installed global shim. It makes a bundled plugin depend on state outside its plugin root.
- Not selected as the skill's primary route: a plugin `bin/` command. Official docs confirm the path is available in Bash while enabled, but direct `${CLAUDE_PLUGIN_ROOT}` substitution ties the invoked file to the same permission rule and bundled layout.

## Recommended Next Focus

Iteration 4: verify whether transport-neutral mirrored references and a CLI-only skill route can coexist, map setup guidance by surface, and identify benchmark and playbook changes.
