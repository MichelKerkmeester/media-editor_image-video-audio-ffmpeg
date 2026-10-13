---
title: "Decision Record: Phase 5: video composition"
description: "Decisions made while building the seven composition tools that change what an acceptance criterion said."
trigger_phrases:
  - "video composition decisions"
  - "b-roll removed keys"
  - "superseded acceptance criterion"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/005-video-composition"
    last_updated_at: "2026-09-29T12:05:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Recorded the decision that supersedes AC-008"
    next_safe_action: "Close the phase against acceptance-criteria.md"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/mcp server/src/tools/video/add-b-roll.ts"
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
# Decision Record: Phase 5: video composition

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

ADR-001, one escaping helper and a bundled font, is in `plan.md` under the architecture decision record. This file carries the decisions taken while the tools were built.

---

<!-- ANCHOR:adr-002 -->
## ADR-002: The removed b-roll keys fail the schema, so AC-008 is superseded by AC-010

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Orchestrator, following the approved contract |

---

<!-- ANCHOR:adr-002-context -->
### Context

AC-008 says a b-roll entry carrying `audioMix: 0.5` or a slide transition is either applied or refused with `INVALID_INPUT`, never accepted and ignored. The contract settles the build-or-refuse question in 3.3.7: both source keys are removed, because the source accepted each one and did nothing with it (inventory G.8). `audio_mix` was never mixed, and the `slide_*` values drew a plain overlay. A removed key has no field in the schema, so there is no handler branch that could return `INVALID_INPUT` for it. The section 5 protocol table sends a call that fails its schema to protocol error `-32602` from the server's own `tools/call` handler.

### Constraints

- A zod object drops an unknown key without a word unless it is strict, which is the exact failure AC-008 forbids
- Phase 4 settled the same shape of question in its ADR-002: a malformed value fails the schema as `-32602`
- `AC-ID` values are stable, so a wrong criterion is superseded, never rewritten
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: a strict entry schema. Each `clips` entry is a `z.strictObject`, so `audioMix`, `audio_mix`, `transitionIn` or `transition_in` fails the schema with `-32602`, nothing runs and no folder is created. AC-008 is superseded by AC-010, which states that outcome.

**How it works**: the registry validates the call against the listed schema before `video_add_b_roll` sees it, and the listed schema carries `additionalProperties: false` on the entry, so a caller can see the refusal coming. The fades the source did implement survive as `fadeIn`, `fadeOut` and `fadeDuration`.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Strict entry, `-32602`, supersede AC-008** | Matches 3.3.7 and the protocol table, the refusal shows in the listed schema, same rule as phase 4 | The criterion changes by supersession | 9/10 |
| Keep `audioMix` and `transitionIn` as fields that the handler always refuses | Matches AC-008 word for word | Advertises two fields that can never succeed, which 1.5 forbids for enum values and which the contract removed | 3/10 |
| Build audio mixing and slide motion | Would make the keys useful | New features outside the phase scope, and the contract removed them | 2/10 |

**Why this one**: The contract is the binding schema, and a strict object is the only form that turns a removed key into a refusal instead of a silent drop.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- A removed key is refused on every composition entry, not only on b-roll: `textElements` entries are strict too
- The refusal is visible in `tools/list` before any call

**What it costs**:
- AC-008 no longer reads as a pass. Mitigation: AC-010 carries the same intent with the observed outcome

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A client written against the source sends `audio_mix` and gets a protocol error | L | The error names the unknown key, and the tool description lists the fields |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | AC-008 cannot pass as written: the contract removed the keys it names |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One schema form, no handler branch |
| 4 | **Fits Goal?** | PASS | Goal decision D3: a tool refuses a parameter it cannot honour rather than ignoring it |
| 5 | **Open Horizons?** | PASS | A later tool that adds audio mixing adds a real field |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `acceptance-criteria.md`: AC-008 marked Superseded with this record, AC-010 added
- `src/tools/video/add-b-roll.ts`: each `clips` entry is a `z.strictObject`

**How to roll back**: Mark AC-010 Superseded and AC-008 Unmet, then add the two fields back and refuse them in the handler.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->
