---
title: "Tasks: Media Editor Alignment (Parent)"
description: "Phase tracker for aligning Media Editor to the Product Owner packaging standard."
importance_tier: "high"
contextType: "implementation"
---
<!-- SPECKIT_LEVEL: 3 -->
# Tasks: Media Editor Alignment (Parent)

- [x] P001 Filename hyphenation: 6 underscored files renamed with references updated and all 1 symlinks resolving. (`001-filename-hyphenation/`)
- [x] P002 Skill folder rename to `sk-media-editor` with a full reference sweep and zero residuals. (`002-skill-folder-rename/`)
- [x] P003 SKILL.md rewritten to the create-skill standard behind a routing characterization harness, advisor description.json and graph-metadata.json added. (`003-skill-md-alignment/`)
- [x] P004 Skill README authored to the Product Owner final form and the package root README replaced by a relative symlink. (`004-skill-readme/`)
- [x] P005 SYNC, AGENTS and claude project aligned (7 mirrors, checksum manifest rebuilt), closed by an independent drift audit with byte-verified findings. (`005-package-alignment/`)

## Executed 2026-07-16 (alignment wave, recovered lane complete)

Phases ran as staged Sonnet-xhigh agents with receipts-gated progression. This lane lost one agent to an API server error in the main wave and completed via the recovery workflow, which verified crashed-stage work against receipts before continuing.

- Verification: 7/7 mirrors byte-identical, 8/8 checksum rows.
- P6 audit: 2 findings (stale kernel section count, Repair-row tool binding contradicting the auto-detect canon), 2 confirmed and fixed.
- Recovered lane: the main-wave P1 agent died mid-response with its renames already done; a verification stage confirmed the work before the lane continued. Auditor also noted a canon-side observation for a future sweep: SKILL.md mentions a brand symlink that does not exist.
## Follow-up 2026-07-17

- [x] F001 Skill folder renamed again, `sk-media-editor` to `mcp-media-editor` (owner decision: the system fronts MCP servers). 82 references swept across SYNC, AGENTS, kernel, manifest, JSONs and README with zero residuals, mirrors 7/7 and checksum rows 8/8 re-verified, both symlinks resolve, frontmatter `name: media-editor` kept.
- [x] F002 Canon fix from the audit observation: SKILL.md line 96 no longer names a `brand` symlink that does not exist on disk.
- [x] F003 Changelog added at `mcp-media-editor/changelog/v0.2.0.0.md` in the create-changelog format.

- [x] F004 (2026-07-17) Changelog expanded: retroactive v0.1.0.0 entry added from git evidence, v0.2.0.0 alignment entry deepened including both folder renames.

- [x] F00X (2026-07-17) sk- standardization: skill folder renamed to `sk-media-editor (reverted from mcp-media-editor, changelog amended with a dated follow-up section)`, references swept token-safely (changelog history preserved as written), root symlink retargeted, mirrors byte-identical, manifest hash rows repaired, symlinks resolve.
