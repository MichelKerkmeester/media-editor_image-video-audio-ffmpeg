---
title: "Decision Record: Phase 4: video and audio core"
description: "Decisions made while building the 19 video and audio tools that change what an acceptance criterion or the contract said."
trigger_phrases:
  - "video audio core decisions"
  - "aspect ratio schema failure"
  - "superseded acceptance criterion"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/004-video-audio-core"
    last_updated_at: "2026-09-29T09:20:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Recorded the decision that supersedes AC-007"
    next_safe_action: "Close the phase against acceptance-criteria.md"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/mcp server/src/tools/video/set-aspect-ratio.ts"
      - "AI Systems/Media Editor/mcp server/src/server/media-fields.ts"
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
# Decision Record: Phase 4: video and audio core

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

ADR-001, real ffmpeg flags and one attempt helper, is in `plan.md` under the architecture decision record. This file carries the decisions taken while the tools were built.

---

<!-- ANCHOR:adr-002 -->
## ADR-002: A malformed aspect ratio fails the schema, so AC-007 is superseded by AC-010

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Orchestrator, following the approved contract |

---

<!-- ANCHOR:adr-002-context -->
### Context

AC-007 says a call with `targetAspectRatio: '4-3'` returns `INVALID_INPUT`. The contract that binds the tool says otherwise in two places. Section 3.2.6 names the field `aspectRatio` and types it as a string pattern, `^\d{1,3}:\d{1,3}$`. The section 5 protocol table sends a call that fails its schema, including a value outside an enum or range, to protocol error `-32602` from the server's own `tools/call` handler (`../001-tool-contract/contract.md:1498`). One general sentence in the section 5 `INVALID_INPUT` row still lists "a malformed time, colour or ratio string", so the contract disagreed with itself, and the criterion followed the losing half.

### Constraints

- The registry validates a field shape before the handler runs, so a pattern field cannot reach the handler with a value that breaks its pattern
- Phase 3 settled the same question for `image_rotate`, where a named colour fails the schema with `-32602` (`../003-image-tools/acceptance-criteria.md`, AC-007)
- `AC-ID` values are stable, so a wrong criterion is superseded, never rewritten
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: the contract's field rule. `aspectRatio: '4-3'` fails the schema with protocol error `-32602`, nothing runs and no folder is created. AC-007 is superseded by AC-010, which states that outcome with the real field name.

**How it works**: `aspectRatioField` in `src/server/media-fields.ts` carries the pattern and the 1 to 999 range, and the registry turns a failure into `-32602` before `video_set_aspect_ratio` sees the call. `INVALID_INPUT` stays for checks that need the file or a second field, such as `endTime` at or before `startTime` in `video_trim`.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Schema failure, `-32602`, supersede AC-007** | Matches 3.2.6, the protocol table and phase 3; the listed schema tells the caller the pattern | The criterion text changes by supersession | 9/10 |
| Plain string field, pattern checked in the handler as `INVALID_INPUT` | Matches AC-007 word for word | The listed schema loses the pattern, and every pattern field in the package would need the same change to stay consistent | 4/10 |

**Why this one**: The contract is the binding schema for this phase, and the field-level rule is the specific one. The general sentence in section 5 is the part that was wrong.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- One rule for every pattern, enum and range field: a bad value is `-32602` and never reaches a handler
- The listed schema shows callers the accepted form before they call

**What it costs**:
- AC-007 no longer reads as a pass. Mitigation: AC-010 carries the same intent with the observed outcome

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A client shows `-32602` less clearly than a tool error | L | The field description states the `W:H` form and its range |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | AC-007 cannot pass as written: its field name does not exist and its error code contradicts the contract |
| 2 | **Beyond Local Maxima?** | PASS | Two options scored |
| 3 | **Sufficient?** | PASS | No code change, the tool already follows the contract |
| 4 | **Fits Goal?** | PASS | The goal binds the tools to the contract |
| 5 | **Open Horizons?** | PASS | Later phases use the same field rule |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `acceptance-criteria.md`: AC-007 marked Superseded with this record, AC-010 added
- The section 5 `INVALID_INPUT` sentence in the contract narrows to strings that pass their pattern and then fail a handler check

**How to roll back**: Mark AC-010 Superseded and AC-007 Unmet, then move the aspect ratio pattern from the schema into the handler.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->
