# Deep Research Strategy - Session Tracking

## Research Topic
Design a `media-editor` CLI over the existing 40 MCP handlers, split skill and Project routes, harden batch naming and placement, and rank four implementation phases.

## Known Context
- The source directory remains `mcp server/` for this research.
- Fixed decisions: plugin ships skill plus CLI and no MCP server, Claude Project remains on Desktop extension and MCP, route order is CLI, hand-written ffmpeg, advice, audio trim, loudness normalization, and CRF compression remain hand-written ffmpeg.
- The prompt supplies a concrete four-PNG batch failure with one output placed in a numbered folder and three in the export root.
- `resource-map.md` was not present in the target spec folder at initialization.

## Key Questions
- [x] How can dispatchToolCall be made transport-neutral and shared by MCP and CLI while keeping argument errors as CLI results?
- [x] What CLI interface, JSON output, preview-file behavior, cache lifetime, and shared data directory satisfy direct terminal use?
- [x] How should the plugin and standalone package expose the CLI while preserving dist-relative assets?
- [x] How can the skill use the CLI first while the Claude Project remains on MCP and mirrored guidance remains transport-neutral?
- [x] How should a batch get confirmed output names and one selected export location in both Project and skill flows?

## Answered Questions
- How can the skill use the CLI first while the Claude Project remains on MCP and mirrored guidance remains transport-neutral? See iterations/iteration-004.md.
- How should a batch get confirmed output names and one selected export location in both Project and skill flows? See iterations/iteration-005.md.
- How can dispatchToolCall be made transport-neutral and shared by MCP and CLI while keeping argument errors as CLI results? See `iterations/iteration-001.md`.
- What CLI interface, JSON output, preview-file behavior, cache lifetime, and shared data directory satisfy direct terminal use? See `iterations/iteration-002.md`.
- How should the plugin and standalone package expose the CLI while preserving dist-relative assets? See `iterations/iteration-003.md`.

## What Worked
- Source inventory and direct line-number inspection of the tool registry, MCP entry, configuration parser, context factory, and process runner.

## What Failed
None.

## Exhausted Approaches
None.

## Ruled-Out Directions
- Reopening the four fixed decisions. They are constraints for this research.

## Next Focus
Iteration 2: CLI surface, JSON output, preview files, cache lifetime, and shared data directory.

## Research Boundaries
- Maximum iterations: 5
- Convergence threshold: 0.05, telemetry only before the forced cap
- Stop policy: max-iterations
- Session: fanout-luna-1791115841524-lv22uz
- Artifact directory: this lineage directory

## Iteration 1 Update

- What worked: canonical registry tracing and direct source line inspection.
- What failed: the current dispatcher raises protocol errors for invalid arguments.
- Ruled out: a duplicate CLI handler table and per-call MCP stdio subprocess.

## Iteration 2 Update

- What worked: source tracing connected Zod definitions, `structuredContent`, preview blocks, in-memory caches, and `MEDIA_EDITOR_DATA_DIR`.
- What failed: per-process maps do not survive one-shot CLI calls.
- Ruled out: base64 stdout previews and a resident daemon before startup measurements.

## Iteration 3 Update

- What worked: official Claude Code docs settled the plugin path behavior and local packaging code exposed all build assumptions.
- What failed: the current plugin build and tests are coupled to the Desktop MCP entry.
- Ruled out: registering MCP in the plugin or requiring a global shim for the plugin skill.


## Iteration 4 Update

- What worked: Exact byte comparisons confirmed the three named reference pairs remain intact under a skill-only cli.md proposal.
- What failed: The route oracle and plugin connected-tools scenario still model one MCP-first host.
- Ruled out: A single global route order and surface-exclusive edits to paired setup content.

## Iteration 5 Update

- What worked: Tracing caller fields through one-call image writing confirmed the cause and a multi-input handler can own one destination.
- What failed: The current naming tests cover one output or separate requests, not a multi-input request.
- Ruled out: A caller-supplied confirmation flag, repeated per-input folder allocation, and silent dimension reduction to satisfy maxBytes.
