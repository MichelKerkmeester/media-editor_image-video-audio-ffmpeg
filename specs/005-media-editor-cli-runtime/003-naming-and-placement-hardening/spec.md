---
title: "Feature Specification: Phase 3: naming-and-placement-hardening"
description: "Fixes the batch naming and placement bug where a Project converted four PNGs without asking about names or a folder and split them across a numbered folder and the export root, with a hard ask-once gate on every surface and batch-aware placement in the runtime."
trigger_phrases:
  - "media editor naming gate"
  - "batch placement hardening"
  - "ask once before the first write"
  - "webp batch split bug"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
# Feature Specification: Phase 3: naming-and-placement-hardening

<!-- SPECKIT_LEVEL: 2 -->
---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P0 |
| **Status** | In Progress |
| **Created** | 2026-10-04 |
| **Branch** | `main` |
| **Parent Spec** | ../spec.md |
| **Phase** | 3 of 6 |
| **Predecessor** | 002-runtime-rename |
| **Successor** | 004-cli |
| **Handoff Criteria** | The gate wording is on every surface, batch placement is tested, and the new batch scenarios pass by grading a real reply on the Project side and the skill side |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 3** of the Media Editor runtime rename, CLI-only skill and naming hardening specification.

**Scope Boundary**: The naming and placement gate in the kernel, the skill, `AGENTS.md`, Interactive Intelligence and its mirror, the tool and field descriptions, batch-aware placement in the runtime, and new playbook scenarios. No CLI work and no route-order change.

**Dependencies**:
- Phase 002 closed, so paths are under `runtime/`
- The ranked hardening changes in `../001-deep-research/research/research.md`, iteration focus 5, and the operator decisions OD-2, OD-3 and OD-4 in `../001-deep-research/spec.md`

**Deliverables**:
- A hard gate: one question before the first writing call, carrying the proposed names and, for a batch, the choice of one place
- Batch-aware placement: a `targetFolder` field on every writing tool that names an existing numbered folder under the export root, so several calls from one request share it
- A `maxBytes` target on `image_convert` for JPEG, WebP and AVIF
- Playbook scenarios for a Project batch and a skill batch

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
In a Claude Desktop Project, Sonnet 5.5 medium converted four PNGs from `media files/import` to WebP under 100 KB without asking about names or a folder. It passed `subfolder: true` on the first `image_convert` call only, so one file landed in `001 - webp-under-100kb/` and three in the export root as `CleanShot ...-converted.webp`. Seven root causes, verified against the source before the rename, with paths given as they were then:

1. The kernel's only hard wait covers one name and no folder: "With the tools, propose a readable file name from the content and wait for the user to confirm it" (`claude project/Custom Instructions.md:194`).
2. ESCALATE 1 is tied to ambiguity: "ESCALATE IF the request is ambiguous" (`claude project/Custom Instructions.md:181`). A clear batch request skips the question.
3. "Several files" is defined per call: "several files from one call into a new `NNN - description/` folder" (`claude project/Custom Instructions.md:149`). Four single-file calls each count as one file.
4. The naming paragraph says `media_rename` "renames a result already written" (`claude project/Custom Instructions.md:145`), which reads as permission to write first and rename later.
5. The field descriptions present an omitted name as normal: `fileName` "Omitted, the file is named after the input plus the operation", and `subfolder` "Omitted, one file goes to the export root" (`mcp server/src/server/field-schemas.ts:62-80`).
6. `allocateOutputFolder` always creates a new numbered folder (`mcp server/src/core/output-folder.ts:301-341`), so separate calls cannot share one folder.
7. No playbook scenario covers a batch in a Project.

### Purpose
Before the first write, the user gets one question with the proposed names and, for two or more inputs from one request, the choice between the export root and one numbered folder, and every file of the batch lands where that answer says.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Kernel: a hard gate. One question before the first writing call carries the proposed names and, for two or more inputs from one request, the choice between the export root and one numbered folder. It applies even when the request is clear
- "Several files" defined per request, not per call
- The `media_rename` mention moved so it covers renaming afterwards only
- The same gate in `sk-media-editor/SKILL.md`, `AGENTS.md`, `references/interactive-intelligence.md` and its Project mirror, with a batch question template in Interactive Intelligence
- Tool and field descriptions saying the name must be one the user confirmed (`runtime/src/server/field-schemas.ts`, `runtime/src/tools/image/convert.ts:136-141` and every writing tool the research inventory names)
- Batch-aware placement, operator decision OD-2: a `targetFolder` field on every writing tool names an existing numbered folder under the export root. The first call of a batch allocates the folder as today and returns its name, and later calls pass that name. Containment check: the real path sits directly inside the real export root, the name matches `NNN - ` plus a slug, the folder already exists, and the value carries no path separator, no `..` and no symlink out of the root. `targetFolder` together with `subfolder: false` is a usage error. Collision rule: a targeted folder counts as not created by the call, so a taken name moves on to `<stem>-2<ext>`, `<stem>-3<ext>` as in the export root (`runtime/src/core/output-folder.ts:378`), an existing file is never replaced, the returned path carries the name actually written, and a failed call never removes the targeted folder. Both allocation sites honour it, `runtime/src/tools/image/sharp-output.ts:496` and `runtime/src/tools/video/copy-then-encode.ts:297`
- `maxBytes` on `image_convert`, operator decision OD-3, as its own task: JPEG, WebP and AVIF only, a bounded quality search at the original dimensions, and a structured failure naming the smallest size reached when the target cannot be met. It never resizes and publishes no oversized file. PNG with `maxBytes` is a usage error
- No multi-input `image_convert` and no server guard against unconfirmed names, operator decisions OD-2 and OD-4
- Playbook scenarios for a Project batch and a skill batch: four PNGs, a clear prompt, one question with no write in Turn 1, one place and readable names in Turn 2

### Out of Scope
- The CLI and the skill's route order, which are phases 004 and 005
- Renaming results already written by the live bug

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `AI Systems/Media Editor/claude project/Custom Instructions.md` | Modify | Hard gate, per-request batch definition, `media_rename` wording |
| `AI Systems/Media Editor/sk-media-editor/SKILL.md` | Modify | Same gate |
| `AI Systems/Media Editor/AGENTS.md` | Modify | Same gate in the export protocol and processing hierarchy |
| `AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md` | Modify | Gate and batch question template |
| `AI Systems/Media Editor/claude project/knowledge/Media Editor - System - Interactive Intelligence.md` | Modify | Byte-identical mirror |
| `AI Systems/Media Editor/runtime/src/server/field-schemas.ts` | Modify | `fileName` and `subfolder` descriptions |
| `AI Systems/Media Editor/runtime/src/tools/` | Modify | Writing-tool descriptions |
| `AI Systems/Media Editor/runtime/src/core/output-folder.ts` | Modify | Resolve and contain a `targetFolder` |
| `AI Systems/Media Editor/runtime/src/server/tool-context.ts`, `tool-registry.ts` | Modify | Carry `targetFolder` through placement |
| `AI Systems/Media Editor/runtime/src/core/errors.ts` | Modify | Error codes for an invalid target folder and an unreachable size |
| `AI Systems/Media Editor/runtime/src/tools/image/convert.ts`, `sharp-output.ts` | Modify | `maxBytes` quality search |
| `AI Systems/Media Editor/runtime/tests/` | Modify | Placement and description tests |
| `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/` | Create | Project batch and skill batch scenarios |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | The kernel holds a hard gate: one question before the first writing call, with the proposed names and, for two or more inputs from one request, the choice between the export root and one numbered folder, even when the request is clear |
| REQ-002 | The kernel defines several files per request, not per call, and mentions `media_rename` for renaming afterwards only |
| REQ-003 | The skill, `AGENTS.md` and Interactive Intelligence carry the same gate, and the Interactive Intelligence mirror stays byte-identical |
| REQ-004 | Every file of one batch lands in the place the user chose, across separate tool calls through `targetFolder`, proven by a runtime test. `targetFolder` is rejected unless it names an existing `NNN - ` folder directly inside the export root with no traversal or symlink escape, and a name collision inside it takes the next counted name without replacing a file |
| REQ-005 | A Project batch scenario and a skill batch scenario exist, and each passes by grading a real reply: one question with no write in Turn 1, one place and readable names in Turn 2 |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-006 | The `fileName` and `subfolder` descriptions and every writing tool's description say the name must be one the user confirmed |
| REQ-007 | `npm run test:pinned` passes and the playbook validator passes with the new scenarios counted |
| REQ-008 | `maxBytes` on `image_convert` reaches the target for JPEG, WebP and AVIF or returns a structured failure without resizing, and the server guard is recorded as declined |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: A rerun of the live bug's request, four PNGs to WebP under 100 KB in a Project, gets one question before any write and puts all four files in one place with readable names
- **SC-002**: The same request through the skill behaves the same way
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | The research's placement design | The runtime change waits for it | Use the ranked option the operator approved |
| Risk | A model still skips the question on a clear request | High | The gate says it applies even when the request is clear, and the scenario grades a real reply, not a unit test |
| Risk | Kernel growth past the Project's budget | Med | Replace wording rather than add, and measure the kernel before and after |
| Risk | A mirror edited on one side | Med | `cmp` after every edit |
<!-- /ANCHOR:risks -->

---


---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The gate adds exactly one question per request, not one per file
- **NFR-P02**: Placement lookup adds no measurable time to a tool call

### Security
- **NFR-S01**: A target folder must sit inside the configured export folder, and a path outside it is rejected
- **NFR-S02**: Folder targeting never follows a symlink out of the export folder

### Reliability
- **NFR-R01**: Two concurrent batches never write into each other's folder
- **NFR-R02**: A batch interrupted halfway leaves the written files where the user chose
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty input: no inputs means no question and no write
- Maximum length: names are slugged to two to five lowercase words joined by hyphens
- Invalid format: a target folder that does not exist, sits outside the export folder, lacks the `NNN - ` prefix or carries a path separator returns a tool error, not a new folder
- Name collision: a file already in the targeted folder is kept, and the new file takes the next counted name
- Unreachable size: `maxBytes` below what the lowest searched quality reaches returns a structured failure and writes nothing

### Error Scenarios
- External service failure: none, the runtime is local
- Network timeout: none
- Concurrent access: folder numbering keeps its existing `EEXIST` retry

### State Transitions
- Partial completion: a failed file in a batch is reported, and the rest stay in the chosen place
- Session expiry: the user's answer lives in the chat, so a new session asks again
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 16/25 | Kernel, skill, AGENTS.md, one mirror pair, tool descriptions, one core module, tests and scenarios |
| Risk | 16/25 | A live user-facing bug, a mirror pair and a runtime contract |
| Research | 8/20 | Design comes from phase 001 |
| **Total** | **40/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 10. OPEN QUESTIONS

- Which placement shape did the operator approve? Answered: `targetFolder` naming an existing numbered folder, no multi-input `image_convert`
- Did the operator choose a `maxBytes` target and a server guard? Answered: `maxBytes` yes for lossy formats, the server guard no
<!-- /ANCHOR:questions -->

---
