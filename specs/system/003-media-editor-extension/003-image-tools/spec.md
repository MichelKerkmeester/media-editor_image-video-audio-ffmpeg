---
title: "Feature Specification: Phase 3: image tools"
description: "Imagician's eight image tools run on SDK 0.5 without input validation or path limits. This phase rebuilds them on the new core with sharp, each with its own vitest file."
trigger_phrases:
  - "media editor image tools"
  - "image_resize image_convert"
  - "sharp image mcp tools"
  - "image tool vitest"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 3: image tools

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

This phase adds the eight image tools: resize, convert, crop, compress, rotate, flip, probe and batch resize. They keep sharp, which encodes WebP and AVIF itself, so image output does not depend on ffmpeg encoders (inventory F.5). Each tool validates its input, obeys the path policy and has its own vitest file.

**Key Decisions**: Tool names and schemas from `contract.md`, and sharp for all image work (ADR-001 in `plan.md`)

**Critical Dependencies**: A green `002-server-foundation` gate and sharp's prebuilt binary for the build machine

---
<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-09-28 |
| **Branch** | `main` |
| **Parent Spec** | `../spec.md` |
| **Phase** | 3 of 9 |
| **Predecessor** | `002-server-foundation` |
| **Successor** | `004-video-audio-core` |
| **Handoff Criteria** | Eight image tools registered with one vitest file each, and the gate green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 3** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: Eight tool modules under `src/tools/image/`, one shared output helper, their tests and their registry lines.

**Dependencies**:
- `../001-tool-contract/contract.md` image rows
- `002-server-foundation` core: path guard, output folder, result builders, registry
- sharp (Imagician locked 0.33.5, `imagician/package-lock.json:1090-1092`, and this package pins 0.35.5)

**Deliverables**:
- `src/tools/image/` with `resize.ts`, `convert.ts`, `crop.ts`, `compress.ts`, `rotate.ts`, `flip.ts`, `probe.ts`, `batch-resize.ts` and the `sharp-output.ts` helper
- `src/server/field-schemas.ts` with the shared `outputNameField`
- `tests/tools/image/*.vitest.ts`, eleven files: one per tool, the helper, `output-name` and `write-failure`
- Registry test expecting 9 tools

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Imagician's tools work but carry defects the new server cannot inherit. Nothing validates input at runtime (`imagician/src/index.ts:205`). Crop bounds and rotate colours go unchecked (`:272-274`, `:326-328`). `preserveAspectRatio` actually sets `withoutEnlargement` (`:216`). Any output path is written silently and its parent directories created (`:207,220`), and the metadata dump leaks the file's modification time (`:376-387`). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Purpose
Eight image tools on the shared core that behave as the contract says, each proved by its own vitest file.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `image_resize` (source `resize_image`, `imagician/src/index.ts:209-220`), with `preserveAspectRatio` replaced by an explicit `withoutEnlargement` flag
- `image_convert` (`convert_format`, `:242-255`) to jpeg, png, webp or avif at quality 1 to 100
- `image_crop` (`crop_image`, `:272-274`) with bounds checked against the image before sharp runs
- `image_compress` (`compress_image`, `:291-315`) keeping the size-change report
- `image_rotate` (`rotate_image`, `:326-328`) with the background colour validated
- `image_flip` (`flip_image`, `:348-354`)
- `image_probe` (`get_image_info`, `:369-387`) without the modification time
- `image_batch_resize` (`batch_resize`, `:396-431`) writing every size into one output folder

### Out of Scope
- Video frames as images - the `video_*` tools
- Folding `image_probe` into `media_probe` - `006-probe-repair-hls` decides, and this phase keeps it separate
- ffmpeg image recipes from `sk-media-editor/references/mcp-imagician.md` - sharp covers the eight tools

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `mcp server/src/tools/image/*.ts` (9) | Create | Eight tools and the output helper |
| `mcp server/src/server/field-schemas.ts` | Create | The shared `outputNameField` |
| `mcp server/tests/tools/image/*.vitest.ts` (11) | Create | One test file per tool, the helper, `output-name` and `write-failure` |
| `mcp server/src/server/all-tools.ts` | Modify | Eight import and register lines |
| `mcp server/src/tools/media/health.ts` | Modify | Reports `imageEngine` |
| `mcp server/tests/server/registry.vitest.ts`, `tests/tools/media/health.vitest.ts` | Modify | Expected tool count 9, and the health reply |
| `mcp server/tests/helpers/media.ts`, `tests/helpers/tool-client.ts` | Modify | Shared helpers the image tests call |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | Each of the eight tools is registered under its contract name with its zod schema |
| REQ-002 | Every tool reads inputs only through the path guard and writes only into an allocated output folder, never over its input |
| REQ-003 | `image_crop` rejects a region outside the image with `INVALID_INPUT` before sharp runs |
| REQ-004 | Each tool has a vitest file covering the happy path and at least one refusal |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-005 | `image_resize` exposes `withoutEnlargement` explicitly instead of the misnamed `preserveAspectRatio` (inventory G.12) |
| REQ-006 | `image_rotate` accepts `background` only as a `#RRGGBB` hex string and rejects named colours (contract 3.1) |
| REQ-007 | `image_probe` returns format, dimensions, channels, bit depth, colour space, density, alpha and byte size but omits the modification time |
| REQ-008 | `image_compress` reports the original and new byte counts as `bytesBefore` and `bytesAfter`, with no percentage, so a file that grew shows as growth (contract 3.1) |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.

### Code standard

This package lives outside `.skilled/`, so sk-code-opencode's surface does not auto-detect it (`.skilled/skills/sk-code/shared/references/stack-detection.md:84`). It adopts the sk-code-opencode TypeScript rules on purpose:

- A 67-character box `MODULE:` header, then imports
- Numbered ALL-CAPS section dividers
- No `'use strict'`
- kebab-case files, PascalCase types, camelCase functions, UPPER_SNAKE constants, `as const` objects instead of `enum`
- Two-space indent, semicolons, single quotes, lines of at most 100 columns
- NodeNext modules with `.js` relative specifiers and `node:` built-in imports
- `strict: true` in `tsconfig.json`
- No `any` in exported signatures, and explicit return types on every export
- `catch (error: unknown)` with narrowing, never an untyped catch
- Custom errors carry a `code` from the contract's error list
- TSDoc on every export, with `@throws` where it throws
- No commented-out code, at most three comments per ten lines, and no spec, phase or requirement ids in comments
- Tests are `*.vitest.ts` files under `tests/`

Gate, run in `AI Systems/Media Editor/mcp server/`:

```bash
npx tsc --noEmit
npx vitest run
grep -rnE ':[[:space:]]*any([^A-Za-z0-9_]|$)' src tests
grep -rnE 'catch \((error|err|e)\)' src tests
```

Both greps must print nothing. Then, from the repository root:

```bash
python3 .skilled/skills/sk-code/sk-code-opencode/assets/scripts/verify_alignment_drift.py --root "AI Systems/Media Editor/mcp server" --fail-on-warn
```

If `002-server-foundation` recorded that the script rejects this root, the stand-in recorded there applies here.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: `npx vitest run tests/tools/image` exits 0 with 11 test files
- **SC-002**: `tools/list` returns 9 names
- **SC-003**: No image tool imports `process-runner.ts`
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | sharp prebuilt binary for the build platform | No image tests | sharp installs a platform package, and `npm install` fetches it |
| Risk | The current sharp version differs from Imagician's 0.33 | Med | Pinned at 0.35.5 in `package.json`, and the eight tools' tests pass on it |
| Risk | AVIF encoding is slow on large images | Low | Tests use 256 by 256 generated images |
| Risk | Colour strings accepted by sharp but refused by the validator, or the reverse | Low | The validator test lists the accepted forms |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: Each image tool finishes on a 4000 by 3000 JPEG in under 5 seconds on the operator's machine
- **NFR-P02**: The image test files finish in under 30 seconds together

### Security
- **NFR-S01**: No image tool creates a directory outside the output folder, closing the defect at `imagician/src/index.ts:207`
- **NFR-S02**: `image_probe` returns no timestamps and no absolute paths

### Reliability
- **NFR-R01**: A sharp failure removes the allocated output folder and returns `INTERNAL` (contract section 5)

---

## 8. EDGE CASES

### Data Boundaries
- Crop region partly outside the image: `INVALID_INPUT` naming the image size
- Resize with neither width nor height: `INVALID_INPUT`
- Batch resize with no sizes, or two sizes sharing a suffix: `INVALID_INPUT`
- An input that is not an image, such as an MP4: `UNSUPPORTED_FORMAT` with `reason: "image-content"`

### Error Scenarios
- Input deleted between the guard check and the read: `INPUT_NOT_FOUND`
- Disk full while writing: `INTERNAL`, output folder removed

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 12/25 | Files: 20, tools: 8 |
| Risk | 10/25 | Path handling: Y, API: Y, Breaking: N |
| Research | 5/20 | sharp API known from the source |
| Multi-Agent | 8/15 | Workstreams: DeepSeek build, MiMo review |
| Coordination | 8/15 | Depends on the phase 2 core |
| **Total** | **43/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | A sharp version jump changes output | M | M | Tests assert format and dimensions |
| R-002 | Crop bounds check off by one | L | M | Edge test at the exact image edge |
| R-003 | Batch resize overwrites a file inside its own folder | L | L | Suffix uniqueness validated |

---

## 11. USER STORIES

### US-001: Resize and convert without ffmpeg (Priority: P0)

**As a** Claude Desktop user, **I want** to resize and convert images in one call, **so that** I get web-ready images without installing anything.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: Clear crop refusals (Priority: P1)

**As a** Media Editor user, **I want** a wrong crop region refused with the image size, **so that** I can correct the request instead of reading a sharp stack trace.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- None for this phase.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: None in this phase. It builds on `../001-tool-contract/decision-record.md` and `../002-server-foundation/decision-record.md`, plus the local ADR in `plan.md`
- **Source inventory**: `../context/source-inventory.md`

---
