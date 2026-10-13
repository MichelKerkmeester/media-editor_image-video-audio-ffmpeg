# Name diff (T018)

Run by the orchestrator on 2026-09-28 with a Python check: source registrations read from `context/imagician-main/src/index.ts` (tool list `name:` entries) and `context/video-audio-mcp-main/server.py` (functions under `@mcp.tool()`), compared with the source-name cells of contract section 2.

- Imagician registrations: 8
- Video-audio registrations: 27
- Section 2 rows: 39
- Source tools missing from the table: 0 []

## Re-run on contract 0.2 (2026-09-29)

Same method, run again after the 0.2 patch. Section 2 still has 39 rows numbered 1 to 39, all 39 new names are unique, and every one of the 35 source registrations appears in the Source tool name column with no extra source name in the table. The raw regex over `imagician-main/src/index.ts` also returned the server name `imagician` (the server identity entry at line 17), which is not a tool; the eight tool registrations at lines 29 to 196 are all present. The 39 names and their order also equal the `TOOL_NAMES` list in the phase 2 capability brief.

- Source tools missing from the table: 0 []
- Table source names absent from the sources: 0 []
