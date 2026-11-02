# Media Editor CLI and Batch Naming Design

## 1. Executive Summary

Build a media-editor CLI over the existing 40 handlers by extracting the shared dispatcher from the MCP adapter, then expose list, describe, and JSON tool calls through a separate executable. The Claude Code plugin should bundle that CLI and the skill without registering MCP. The Claude Desktop extension and Project remain on MCP.

The skill route is CLI for operations the handlers cover, then hand-written ffmpeg, then advice. The Project route remains MCP when connected and advice otherwise because the Project cannot execute terminal ffmpeg. The three shared tools, setup, and interactive reference pairs can remain byte-identical if they describe both surfaces and the new CLI invocation lives in skill-only references/cli.md. Current pair comparison returned true for each of the three pairs in iteration 4.

For the batch naming bug, ask one question before the first writing call even when the operation is clear. List each proposed output name and, for two or more inputs in one request, ask whether to use the export root or one numbered folder. Prefer extending image_convert to take multiple inputs in one call so its writer allocates one place once. Add maxBytes because the example request sets a size cap the current quality field cannot express. Do not pretend a server boolean proves human confirmation.

## 2. Research Question

How should Media Editor gain a media-editor CLI over its current MCP handlers, move the skill to CLI-only execution while the Claude Project remains on MCP, and harden naming and placement so a batch has confirmed names and one destination?

## 3. Fixed Decisions

- The Claude Code plugin ships the skill and CLI runtime and registers no MCP server.
- The Claude Project stays on the Claude Desktop extension and MCP, and receives naming hardening.
- The skill route order is CLI for every covered operation, hand-written ffmpeg, then advice.
- No new handlers are added for audio trim, loudness normalization, or CRF compression. Those remain hand-written ffmpeg, matching the current gap table at AI Systems/Media Editor/sk-media-editor/references/tools.md:180-189.

## 4. Scope and Evidence

The work is a four-phase design, not an implementation. I read the Media Editor sources, Project kernel, skill references and playbook, package and distribution scripts, benchmarks, user guides, Sync Loop declaration, and the lead steer. Claims about present behavior cite file and line. The mirror test compared the exact bytes of tools.md, setup.md, and interactive-intelligence.md with their Project knowledge counterparts. It returned true for each pair.

No runtime suite was run because no implementation changed and the authorized write surface is the luna lineage. The mirror comparisons and current-source tracing are the tests performed here. Behavior of the proposed CLI and batch API remains to be proven by implementation tests.

## 5. CLI Core Design

ALL_TOOLS is already the canonical ordered array of 40 definitions at AI Systems/Media Editor/mcp server/src/server/all-tools.ts:57-98, and createServer registers it at src/server/create-server.ts:43-56. Reuse it. Extract dispatchToolCall from the MCP server and McpError boundary. It currently performs schema parsing, placement extraction, context setup, and handler dispatch, while invalid args throw MCP InvalidParams at mcp server/src/server/tool-registry.ts:102-127.

Add a separate src/cli.ts entry because src/index.ts calls main on import at mcp server/src/index.ts:94-126. Argument parsing must be separate from loadConfig because bare argv tokens become allowed roots at mcp server/src/core/config.ts:155-175,400-418. Return validation failures as ordinary structured results on CLI. Add exit codes and a cancellation path that stops and awaits ffmpeg children before temp cleanup, following the process and cleanup boundaries in mcp server/src/core/process-runner.ts:360-479,687-702.

## 6. CLI Surface and Output

Provide list, describe tool, and tool invocation commands. Describe should export JSON Schema from the Zod caller-facing schema. Accept one JSON argument source per call from an inline flag, file, or stdin. Print one JSON value from structuredContent to stdout and diagnostics to stderr. Probe previews should be written to an image file and represented by a path, not base64 on stdout. The current preview block uses base64 image content outside structuredContent at mcp server/src/tools/media/preview.ts:38-45,119-123.

Measure one-shot startup cost before considering a daemon. Persist validated capability and resolver metadata in MEDIA_EDITOR_DATA_DIR because process-local cache maps do not survive calls, and media_setup_ffmpeg and media_health already share the configured data directory. Sources: mcp server/src/core/capabilities.ts:163,348-386, mcp server/src/core/ffmpeg-resolver.ts:446-485, mcp server/src/core/config.ts:87-103,410-451, mcp server/src/tools/media/setup-ffmpeg.ts:433-475, and mcp server/src/tools/media/health.ts:176-205.

## 7. Distribution Design

Rename the source package root mcp server/ to runtime/ in Phase 1. In Phase 3, ship server/dist/cli.js inside the plugin payload and remove mcpServers from the plugin manifest. The build currently unpacks a bundle under claude-plugin/server and checks for dist/index.js at mcp server/scripts/build-plugin.ts:302-357. Change that expectation to the CLI entry and test it in mcp server/tests/packaging/build-plugin.vitest.ts:253-291. The separate Desktop extension manifest remains the MCP package.

Use the CLAUDE_PLUGIN_ROOT substitution in the skill to invoke the bundled CLI by an explicit Node path. Official Claude Code docs say the variable is substituted in plugin skill Markdown, and plugin bin executables are placed on the Bash tool PATH while enabled. Direct plugin-root invocation is more specific for the skill. Keep bin as convenience. Provide an installable package bin or standalone package for other terminal agents. Sources: https://code.claude.com/docs/en/skills and https://code.claude.com/docs/en/plugins-reference.

Preserve the package-root and asset layout. server-info.ts resolves package metadata relative to its module at mcp server/src/server/server-info.ts:39-49. The font helper resolves assets/fonts relative to its module at mcp server/src/core/font-path.ts:41-60, and video subtitle and text overlay tools use the helper. Keep server/dist, assets, package metadata, licenses, per-platform sharp dependencies, and pinned ffmpeg together in the plugin payload. Sources: mcp server/scripts/build-bundle.ts:68-76,145-185 and mcp server/scripts/test-pinned.ts:78-134.

## 8. Skill and Project Routing

The skill currently has one shared route statement for connected Media Editor tools, then ffmpeg, then advice at AI Systems/Media Editor/sk-media-editor/SKILL.md:73-103,146-159. That statement must become CLI for covered handlers, then ffmpeg, then advice. Coverage must be operation-specific. A broad mode binding such as audio star does not prove every requested audio operation has a handler. The trim, loudness, and CRF gaps remain on manual ffmpeg.

The Project kernel explicitly has only MCP tool execution and cannot execute shell ffmpeg or terminal commands at AI Systems/Media Editor/claude project/Custom Instructions.md:157,192-196. Keep its MCP route. Make router-contract.md and route_contract.py surface-aware, and expand differential.py host states to include CLI skill profiles and MCP Project profiles. The present route oracle takes only request text and the differential gate models one generic tools and ffmpeg host tuple at benchmark/router/route_contract.py:215-225 and benchmark/router/differential.py:97-104,314-343.

Keep references/tools.md as a transport-neutral catalogue and keep its Project twin. Add skill-only references/cli.md for exact invocation. Keep setup.md and its Project mirror byte-identical with explicit Claude Desktop MCP, Claude Code CLI, and other-terminal ffmpeg sections. Keep interactive-intelligence.md paired, with shared confirmation rules and host-specific route language. The current seven pairs are declared in AI Systems/z - Claude Project Sync Loop/systems.py:1252-1265. The router-contract remains unpaired because the kernel carries its code projection at lines 1272-1275.

Update rule_parity.py to test the Project MCP route, the skill CLI route, the shared paired phrases, and the new unpaired cli.md requirements. Its present route-order rule encodes one tools then ffmpeg family with five required pairs at benchmark/gates/rule_parity.py:71-95. Update the twin report with surface and canonical handler fields. Its current implementation compares only result verdicts despite the broader promise in its module comment at benchmark/grader/twin_divergence.py:10-18,155-163.

## 9. Naming Gate

Before any writing call, inspect or probe enough to propose every resulting file name. Ask one concise question listing the proposed names and wait. Do this even when the requested format, operation, and names seem clear. If the user gave names, restate them for confirmation.

For two or more inputs from one request, include in that same question a choice between all outputs in media files/export/ and one new numbered folder under it. Identify the proposed folder description but let the allocator choose the next number. Do not split the question across per-file tool calls. Never write a generic name and then try to repair the result with media_rename. The kernel currently says media_rename renames a result already written at Custom Instructions.md:145, and the tool moves an existing result at mcp server/src/tools/media/rename.ts:138-169.

The kernel hard wait currently applies only to ambiguous requests at Custom Instructions.md:181. Move the mandatory naming and batch placement gate into an ALWAYS rule and the strict write sequence. Add a matching batch question template to the paired interactive reference. The existing template already offers a proposed name and location at sk-media-editor/references/interactive-intelligence.md:84-114, but its direct-command rule asks about a folder only when one operation writes several outputs at line 118.

## 10. Batch Placement API

Extend image_convert to accept inputPaths and an aligned fileNames list, plus shared format, quality, maxBytes, outputName, and explicit subfolder for a multi-input call. Require names and placement for the multi-input form. Resolve every input under existing allowed roots. Allocate a destination once and write all outputs there. Existing image_convert accepts one inputPath and one plan at mcp server/src/tools/image/convert.ts:100-125. sharp-output allocates once per call and writes all plans into that call's location at mcp server/src/tools/image/sharp-output.ts:492-512. This design targets the observed homogeneous four-image conversion.

Do not add an arbitrary path for targeting existing folders in the first pass. Separate calls currently allocate a fresh numbered folder each time at mcp server/src/core/output-folder.ts:301-341. A safe existing-folder handle may be added later if mixed-tool batches require multiple calls in one location.

## 11. Maximum Byte Target

Add maxBytes to image_convert because the current quality field cannot express a strict size cap. The image conversion handler passes quality into its plan at mcp server/src/tools/image/convert.ts:105-118 and the schema contains quality but no byte target at lines 150-166. Define KB units in the documentation and pass an integer byte count through the API. Search quality in a bounded range at original dimensions. If no acceptable quality meets the cap, return a structured failure with actual minimum bytes and do not publish the oversized file. Resizing should be a separate user-approved operation. Test JPEG, WebP, and AVIF or explicitly limit initial maxBytes support to formats whose encoder behavior is validated. PNG quality has different palette semantics in the current description at lines 137-165, so do not imply identical behavior without tests.

## 12. Server Guard Assessment

A boolean such as confirmedName cannot prove the human approved the name because the handler receives only tool arguments, not a trusted confirmation event. This is an inference from the tool boundary at mcp server/src/server/tool-registry.ts:102-123. Avoid adding that flag. Require the multi-input form to provide one name per input and an explicit placement choice. Those checks prevent accidental fallback names and folders but do not replace the conversation question. Keep the optional single-file fields backward compatible unless implementation testing shows that broader API break is justified.

## 13. Ranked Four-Phase Plan

1. Rename the source package directory and update current path references.
2. Harden the Project and skill naming gate, add the one-call image batch path, and add maxBytes.
3. Build the shared CLI and distribute it in the plugin and as a standalone install.
4. Move the skill to CLI-first routing and update the benchmarks and scenarios, while the Project stays MCP.

This order leaves the Project naming improvement available before the skill transport switch. It also ensures the CLI and plugin are shipped before the skill depends on them.

## 14. Ranked File Change List

All mcp server/ paths below are their current names. After Phase 1, package paths are rooted at runtime/. Keep the plugin payload's inner server/ layout because relative package and font resolution depends on it.

### Phase 1: Rename mcp server/ to runtime/

Rename the whole directory AI Systems/Media Editor/mcp server/ to AI Systems/Media Editor/runtime/. Update the current textual references in:

- AI Systems/Media Editor/AGENTS.md
- AI Systems/Media Editor/README.md
- AI Systems/Media Editor/INSTALL-GUIDE.md
- AI Systems/Media Editor/USER-GUIDE.md
- AI Systems/Media Editor/SYNC.md
- AI Systems/Media Editor/sk-media-editor/README.md
- AI Systems/Media Editor/sk-media-editor/SKILL.md
- AI Systems/Media Editor/sk-media-editor/references/setup.md
- AI Systems/Media Editor/sk-media-editor/references/tools.md
- AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Setup.md
- AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Media Editor Tools.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/readable-name-proposal.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-tool-verification/consent-before-ffmpeg-download.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-tool-verification/error-code-handoff.md
- AI Systems/Media Editor/runtime/ARCHITECTURE.md
- AI Systems/Media Editor/runtime/README.md
- AI Systems/Media Editor/runtime/claude-plugin/README.md
- AI Systems/Media Editor/runtime/scripts/README.md
- AI Systems/Media Editor/runtime/scripts/bundle/README.md
- AI Systems/Media Editor/runtime/src/README.md
- AI Systems/Media Editor/runtime/src/core/README.md
- AI Systems/Media Editor/runtime/src/server/README.md
- AI Systems/Media Editor/runtime/src/tools/README.md
- AI Systems/Media Editor/runtime/src/tools/audio/README.md
- AI Systems/Media Editor/runtime/src/tools/image/README.md
- AI Systems/Media Editor/runtime/src/tools/media/README.md
- AI Systems/Media Editor/runtime/src/tools/video/README.md
- AI Systems/Media Editor/runtime/src/types/README.md
- AI Systems/Media Editor/runtime/tests/README.md
- AI Systems/Media Editor/runtime/tests/core/README.md
- AI Systems/Media Editor/runtime/tests/helpers/README.md
- AI Systems/Media Editor/runtime/tests/packaging/README.md
- AI Systems/Media Editor/runtime/tests/server/README.md
- AI Systems/Media Editor/runtime/tests/tools/README.md
- AI Systems/Media Editor/runtime/tests/tools/audio/README.md
- AI Systems/Media Editor/runtime/tests/tools/composition/README.md
- AI Systems/Media Editor/runtime/tests/tools/image/README.md
- AI Systems/Media Editor/runtime/tests/tools/media/README.md
- AI Systems/Media Editor/runtime/tests/tools/video/README.md

The old changelog files sk-media-editor/changelog/v0.1.0.0.md, v0.2.0.0.md, and v0.6.0.0.md contain historical package wording. Leave them as dated history unless a live command or link inside them is still used.

### Phase 2: Harden naming and placement

- AI Systems/Media Editor/claude project/Custom Instructions.md
- AI Systems/Media Editor/AGENTS.md
- AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md
- AI Systems/Media Editor/claude project/knowledge/Media Editor - System - Interactive Intelligence.md
- AI Systems/Media Editor/runtime/src/server/field-schemas.ts
- AI Systems/Media Editor/runtime/src/server/tool-registry.ts
- AI Systems/Media Editor/runtime/src/server/tool-context.ts
- AI Systems/Media Editor/runtime/src/core/output-folder.ts
- AI Systems/Media Editor/runtime/src/core/errors.ts
- AI Systems/Media Editor/runtime/src/tools/image/convert.ts
- AI Systems/Media Editor/runtime/src/tools/image/sharp-output.ts
- AI Systems/Media Editor/runtime/tests/server/registry.vitest.ts
- AI Systems/Media Editor/runtime/tests/server/tool-context.vitest.ts
- AI Systems/Media Editor/runtime/tests/core/output-folder.vitest.ts
- AI Systems/Media Editor/runtime/tests/tools/image/convert.vitest.ts
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/manual-testing-playbook.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-naming-placement.md, new
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/project-route-order/batch-naming-placement.md, new
- AI Systems/Media Editor/benchmark/grader/twin_divergence.py
- AI Systems/Media Editor/SYNC.md
- AI Systems/z - Claude Project Sync Loop/systems.py

### Phase 3: Build and distribute CLI

- AI Systems/Media Editor/runtime/src/server/tool-registry.ts
- AI Systems/Media Editor/runtime/src/cli.ts, new
- AI Systems/Media Editor/runtime/src/core/config.ts
- AI Systems/Media Editor/runtime/src/core/process-runner.ts
- AI Systems/Media Editor/runtime/src/core/capabilities.ts
- AI Systems/Media Editor/runtime/src/core/ffmpeg-resolver.ts
- AI Systems/Media Editor/runtime/src/tools/media/preview.ts
- AI Systems/Media Editor/runtime/package.json
- AI Systems/Media Editor/runtime/scripts/build-plugin.ts
- AI Systems/Media Editor/runtime/scripts/build-bundle.ts
- AI Systems/Media Editor/runtime/scripts/test-pinned.ts
- AI Systems/Media Editor/runtime/claude-plugin/.claude-plugin/plugin.json
- AI Systems/Media Editor/runtime/claude-plugin/README.md
- AI Systems/Media Editor/runtime/tests/cli.vitest.ts, new
- AI Systems/Media Editor/runtime/tests/server/registry.vitest.ts
- AI Systems/Media Editor/runtime/tests/tools/media/preview.vitest.ts
- AI Systems/Media Editor/runtime/tests/core/capabilities.vitest.ts
- AI Systems/Media Editor/runtime/tests/core/ffmpeg-resolver.vitest.ts
- AI Systems/Media Editor/runtime/tests/packaging/build-plugin.vitest.ts
- AI Systems/Media Editor/runtime/tests/packaging/bundle-contents.vitest.ts
- AI Systems/Media Editor/README.md
- AI Systems/Media Editor/INSTALL-GUIDE.md
- AI Systems/Media Editor/USER-GUIDE.md

### Phase 4: Move the skill to CLI

- AI Systems/Media Editor/AGENTS.md
- AI Systems/Media Editor/sk-media-editor/SKILL.md
- AI Systems/Media Editor/sk-media-editor/references/cli.md, new and skill-only
- AI Systems/Media Editor/sk-media-editor/references/router-contract.md
- AI Systems/Media Editor/sk-media-editor/references/tools.md
- AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Media Editor Tools.md
- AI Systems/Media Editor/sk-media-editor/references/setup.md
- AI Systems/Media Editor/claude project/knowledge/Media Editor - Reference - Setup.md
- AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md
- AI Systems/Media Editor/claude project/knowledge/Media Editor - System - Interactive Intelligence.md
- AI Systems/Media Editor/claude project/Custom Instructions.md
- AI Systems/Media Editor/benchmark/router/route_contract.py
- AI Systems/Media Editor/benchmark/router/differential.py
- AI Systems/Media Editor/benchmark/gates/rule_parity.py
- AI Systems/Media Editor/benchmark/grader/twin_divergence.py
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/manual-testing-playbook.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md
- AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/project-route-order/connected-tools-in-desktop.md
- AI Systems/Media Editor/SYNC.md
- AI Systems/z - Claude Project Sync Loop/systems.py

## 15. Verification Plan

Phase 1: search all active package paths and build plugin and Desktop extension from the renamed root. Preserve the plugin payload's inner server/dist layout and its package and font resolution.

Phase 2: add API tests for four input paths, four confirmed names, both placement choices, collision behavior, no write before confirmation, and one shared destination. Test maxBytes success and inability-to-meet behavior across supported encoders. Verify both Project and skill batch scenarios.

Phase 3: test dispatcher parity against all 40 handlers, argument result and exit behavior, stdin/file/flag JSON input, stdout JSON, preview paths, cache invalidation, signal cleanup, platform bundles, and a standalone install. Verify the plugin contains no MCP registration.

Phase 4: run router contract and differential fixtures for skill CLI, skill ffmpeg fallback, skill advice, Project MCP, and Project advice. Run rule parity, twin divergence, all route-order scenarios, and the read-only pair comparison. Update and review the Sync Loop declaration according to SYNC.md. No test results are claimed here.

## 16. Eliminated Alternatives

| Alternative | Why it is eliminated | Evidence |
|---|---|---|
| Duplicate CLI handler registry | It duplicates the 40-entry ALL_TOOLS source | mcp server/src/server/all-tools.ts:57-98 |
| MCP stdio subprocess per CLI tool call | It couples direct terminal use to protocol framing and server lifecycle | mcp server/src/index.ts:94-126 |
| Base64 preview in stdout JSON | The preview is currently a base64 image block, while the CLI needs clean machine-readable output | mcp server/src/tools/media/preview.ts:38-45,119-123 |
| Plugin MCP registration | It conflicts with the fixed no-MCP plugin decision | mcp server/claude-plugin/.claude-plugin/plugin.json:10-22 |
| Global shim as the plugin skill dependency | Plugin-root substitution identifies the bundled CLI directly | https://code.claude.com/docs/en/skills |
| One generic route order for skill and Project | The Project cannot execute terminal ffmpeg while the skill can | claude project/Custom Instructions.md:157,192-196 |
| One new folder per image_convert call | It splits a single request across numbered folders | mcp server/src/core/output-folder.ts:301-341 |
| Confirmation boolean as consent proof | The current caller arguments contain no trusted user answer | mcp server/src/server/tool-registry.ts:102-123 |
| Quality alone as a hard size cap | The image_convert schema has no byte target | mcp server/src/tools/image/convert.ts:150-166 |
| Silent downscaling to satisfy a cap | It changes dimensions outside the confirmed request | mcp server/src/tools/image/convert.ts:132-166 |

## 17. Open Questions and Limits

The design decisions are sufficient to start the four phases. Implementation must still establish maxBytes behavior across encoder versions, acceptable minimum quality, the exact KB unit convention, and partial-failure cleanup for a multi-input call. The server can reject incomplete batch arguments but cannot independently prove a user confirmed those arguments at the current protocol boundary. The required tests are listed above. The route and output behavior recommendations are design conclusions, not implementation evidence.

