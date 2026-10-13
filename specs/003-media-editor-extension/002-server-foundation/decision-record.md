---
title: "Decision Record: Phase 2: server foundation"
description: "Module layout, the ffmpeg and ffprobe resolution order, and how tests find and create media."
trigger_phrases:
  - "server foundation decisions"
  - "module layout"
  - "ffmpeg resolver order"
  - "test fixtures strategy"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/002-server-foundation"
    last_updated_at: "2026-09-28T16:30:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Recorded the design decisions this phase settles"
    next_safe_action: "Confirm or revise each decision when the phase runs"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
# Decision Record: Phase 2: server foundation

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:adr-001 -->
## ADR-001: One module per tool in a layered tree

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Deciders** | Orchestrator, confirmed by the operator at phase start |

---

<!-- ANCHOR:adr-001-context -->
### Context

Imagician is one 471-line file (`imagician/src/index.ts`) and video-audio one 1,649-line file (`vam/server.py`). Tools here are written by one-change dispatches, so each must land in its own file with its own test. Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Constraints

- kebab-case files, one tool per module
- A core shared by 38 tools
- Tests under `tests/` as `*.vitest.ts`
<!-- /ANCHOR:adr-001-context -->

---

<!-- ANCHOR:adr-001-decision -->
### Decision

**We chose**: `src/index.ts` as the entry, `src/server/` for the registry and server factory, `src/core/` for shared services and `src/tools/<image|video|audio|media>/<tool>.ts` with one tool each. Tests mirror the tree under `tests/`.

**How it works**: Each tool module exports one definition object: name, description, zod schema and handler. `tool-registry.ts` imports the definitions and registers them, so adding a tool is one new module plus one import line.
<!-- /ANCHOR:adr-001-decision -->

---

<!-- ANCHOR:adr-001-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Layered, one module per tool** | One dispatch per file, small diffs, clear ownership | About 50 source files | 9/10 |
| One file per media kind | Fewer files | Files of 500 lines or more, dispatches collide | 5/10 |
| One file, as in the sources | Matches the sources | Unreviewable, every dispatch edits the same file | 1/10 |

**Why this one**: It matches the one-change dispatch model: a task names one file and one test.
<!-- /ANCHOR:adr-001-alternatives -->

---

<!-- ANCHOR:adr-001-consequences -->
### Consequences

**What improves**:
- A dispatch reads only the module it edits plus the core
- The registry test catches a missing import

**What it costs**:
- About 50 source files. Mitigation: consistent naming and one registry index

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular imports between core modules | L | Core modules depend only downward: errors, configuration, then services |
| Registry and tool list drift apart | M | The registry test asserts the exact name list per phase |
<!-- /ANCHOR:adr-001-consequences -->

---

<!-- ANCHOR:adr-001-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | The dispatch model needs one file per change |
| 2 | **Beyond Local Maxima?** | PASS | Three layouts scored |
| 3 | **Sufficient?** | PASS | No framework beyond the SDK |
| 4 | **Fits Goal?** | PASS | Every later phase adds modules here |
| 5 | **Open Horizons?** | PASS | New tools add files instead of editing shared ones |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-001-five-checks -->

---

<!-- ANCHOR:adr-001-impl -->
### Implementation

**What changes**:
- The `src/` and `tests/` trees described above

**How to roll back**: Moving a module is a rename plus one import line in the registry, so the layout can change without touching tool logic.
<!-- /ANCHOR:adr-001-impl -->
<!-- /ANCHOR:adr-001 -->

---

<!-- ANCHOR:adr-002 -->
## ADR-002: Resolve ffmpeg by override, then bundle, then PATH, then consented setup

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Deciders** | Orchestrator, confirmed by the operator at phase start |

---

<!-- ANCHOR:adr-002-context -->
### Context

Video-audio calls bare `ffmpeg` and `ffprobe` from `PATH` (`vam/server.py:892,1429`, inventory G.7). The extension must work where no ffmpeg is installed, yet a user with a fuller system build, for example one with libass, should be able to use it. Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Constraints

- Five platforms
- `ffmpeg-static` builds may lack libass, libx265 or libvpx (inventory F.5, unknown per build)
- No download without consent
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: Look up each binary in this order: `MEDIA_EDITOR_FFMPEG_PATH` or `MEDIA_EDITOR_FFPROBE_PATH`, the bundled `ffmpeg-static` or `ffprobe-static` binary, system `PATH`, then return `FFMPEG_NOT_FOUND` naming `media_setup_ffmpeg`.

**How it works**: Each step checks that the file exists and is executable, then runs `-version` once. The first binary that answers wins, and `media_health` reports which step supplied it.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Override, bundle, PATH, consented setup** | Works offline out of the box, and the user can override | The bundled build may lack a filter a system build has | 9/10 |
| PATH first | Uses the user's full build | Versions vary per machine, breaks the no-install promise | 5/10 |
| Bundled only | Predictable | No way out when a codec is missing | 6/10 |

**Why this one**: The override lets a user fix a missing codec without us shipping a second build, and bundle-before-PATH keeps behaviour the same across machines by default.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- The same ffmpeg on every install unless the user opts out
- `media_health` shows which binary ran

**What it costs**:
- Bundle size, about 70 to 80 MB of ffmpeg per platform in the approved plan. Mitigation: size budget in `007-desktop-extension`

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| The override points at a broken binary | L | The `-version` probe fails, and the resolver moves on and reports it |
| A `PATH` ffmpeg differs in flags | L | Capabilities are read from whichever binary won |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Bare PATH lookup fails where ffmpeg is absent |
| 2 | **Beyond Local Maxima?** | PASS | Three orders scored |
| 3 | **Sufficient?** | PASS | One array of steps |
| 4 | **Fits Goal?** | PASS | Every video and audio tool depends on it |
| 5 | **Open Horizons?** | PASS | The setup step covers platforms without a bundled build |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `src/core/ffmpeg-resolver.ts`
- `media_health` output includes the lookup step

**How to roll back**: The order is one array in the resolver, so reordering is a one-line change plus its test.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->

---

<!-- ANCHOR:adr-003 -->
## ADR-003: Five small clips tracked, everything else generated

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Deciders** | Orchestrator, confirmed by the operator at phase start |

---

<!-- ANCHOR:adr-003-context -->
### Context

The source tests use a 10,498,677-byte `sample.mp4` and a 3,208,752-byte `sample.png` (`../context/source-inventory.md:317-318`). The five `sample_files/` clips total about 33 KB (`:319-323`), and the source already regenerates them with `lavfi` (`vam/tests/test_video_functions.py:69-88`). Source paths use the inventory's shorthands: `imagician/` is `../context/imagician-main/` and `vam/` is `../context/video-audio-mcp-main/`.

### Constraints

- No multi-megabyte binaries in the tracked repo
- Tests run offline
- Some tests need audio tracks, which the lavfi clips lack (inventory section D, xfade row)
<!-- /ANCHOR:adr-003-context -->

---

<!-- ANCHOR:adr-003-decision -->
### Decision

**We chose**: Copy only the five small clips into `tests/fixtures/` and generate everything else at test time into a per-suite temp folder, with the resolved ffmpeg (`testsrc2` plus `sine` for video with audio) or sharp (for images).

**How it works**: `tests/helpers/media.ts` exposes `fixturePath(name)`, built from `import.meta.url`, and generators such as `makeClip({ seconds, width, height, audio })`. Suites create a temp root in `beforeAll`, set it as the allowed root and output folder, and remove it in `afterAll`.
<!-- /ANCHOR:adr-003-decision -->

---

<!-- ANCHOR:adr-003-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Five small clips plus generated media** | Small repo, offline, audio when needed | Generation adds seconds to the suite | 9/10 |
| Copy every source fixture | Identical to the source tests | 13.7 MB of binaries tracked | 3/10 |
| Generate everything | No tracked binaries | Loses the exact clips the b-roll and xfade tests were written against | 6/10 |

**Why this one**: It keeps the tracked repo small and still runs the source's b-roll and xfade cases on their original clips.
<!-- /ANCHOR:adr-003-alternatives -->

---

<!-- ANCHOR:adr-003-consequences -->
### Consequences

**What improves**:
- The suite runs offline
- Clips with audio cover the xfade audio branch the source never tested (inventory F.1)

**What it costs**:
- Generation time. Mitigation: generate once per suite and reuse

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Generated media differs between ffmpeg versions | L | Assertions check duration and stream presence, not bytes |
| The temp root sits behind a symlink on macOS | M | Helpers pass real paths |
<!-- /ANCHOR:adr-003-consequences -->

---

<!-- ANCHOR:adr-003-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | The large fixtures cannot be tracked |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | Five files and one helper |
| 4 | **Fits Goal?** | PASS | Every later phase's tests use it |
| 5 | **Open Horizons?** | PASS | New generators add to the helper |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-003-five-checks -->

---

<!-- ANCHOR:adr-003-impl -->
### Implementation

**What changes**:
- `tests/fixtures/` with five clips and a README
- `tests/helpers/media.ts`

**How to roll back**: Fixtures are five files plus one helper, so replacing them touches no source module.
<!-- /ANCHOR:adr-003-impl -->
<!-- /ANCHOR:adr-003 -->

---
