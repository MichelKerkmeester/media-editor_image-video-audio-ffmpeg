---
title: "Decision Record: Phase 6: probe, repair and HLS"
description: "Decisions taken while building media_probe, media_repair and video_hls_ladder that change what an acceptance criterion said."
trigger_phrases:
  - "probe repair hls decisions"
  - "repair passes"
  - "superseded acceptance criterion"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/006-probe-repair-hls"
    last_updated_at: "2026-09-29T15:20:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Recorded the three operator-approved amendments as ADR-003"
    next_safe_action: "None for this packet; phase 7 is next"
    blockers: []
    key_files:
      - "AI Systems/Media Editor/specs/003-media-editor-extension/001-tool-contract/contract.md"
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 100
    open_questions: []
    answered_questions: []
---
# Decision Record: Phase 6: probe, repair and HLS

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

ADR-001, diagnose before repair and never upscale a ladder rung, is in `plan.md` under the architecture decision record. This file carries the decisions taken while the tools were built.

---

<!-- ANCHOR:adr-002 -->
## ADR-002: The approved contract fixes the three tools, so AC-002, AC-003, AC-007 and AC-008 are superseded

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Orchestrator, following the approved contract |

---

<!-- ANCHOR:adr-002-context -->
### Context

This phase's spec and criteria were written on 2026-09-28, before `001-tool-contract/contract.md` section 3.4 fixed the three schemas, and the operator approved that contract as the schema authority for every build phase (`../spec.md:139`). Four criteria describe behavior the contract settled differently:

- AC-002 expects sharp fields for a PNG. Contract 3.4 makes `media_probe` the ffprobe path for every media kind, with a still image as a single-frame video stream, and keeps `image_probe` as the sharp path.
- AC-003 expects a `diagnose` mode that writes nothing. The contract runs the diagnosis on every `media_repair` call and gives the read-only inspection to `media_probe`, which names `media_repair` when ffprobe cannot read a file.
- AC-007 expects `INVALID_INPUT` for a segment length of 30. The contract bounds `segmentDuration` to 2 to 10 in the schema, and a value outside a schema range is protocol error `-32602` (section 5, the same rule as ADR-002 in phases 4 and 5).
- AC-008 expects `auto` to pick a `faststart` pass. The contract fixes the passes at a stream copy and a re-encode, with `auto` copying first and re-encoding when the copy fails, and adds no other flags.

### Constraints

- `AC-ID` values are stable, so a wrong criterion is superseded, never rewritten
- The contract is the schema every later phase, the extension and the plugin read
- Each pass still needs a broken file it provably repairs (goal decision D2)
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: build the three tools to contract 3.4 and supersede the four criteria with AC-009 to AC-012, which state the contract's outcomes on the same inputs.

**How it works**: AC-009 checks the three probe blocks on a video with sound and on a PNG. AC-010 checks that `media_probe` refuses an MP4 cut before its index with `PROCESS_FAILED` naming `media_repair`, and that `media_repair` refuses the same file with `UNSUPPORTED_FORMAT`, neither creating a folder. AC-011 checks the schema bounds and the handler's repeated-rung refusal. AC-012 checks both branches of `auto`: an unindexed Matroska recording comes back from the copy pass, and a Matroska file with PCM audio named `.mp4`, whose copy fails, comes back from the re-encode with a warning.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Build to the contract, supersede four criteria** | One schema across contract, server, extension and plugin; every pass still proved on a broken file | Four criteria change by supersession | 9/10 |
| Build the spec's five strategies and `diagnose` mode | Matches the criteria word for word | Contradicts the approved contract, and `faststart` repairs nothing a player cannot already read | 3/10 |
| Stop and ask the operator | No judgment call | The operator already approved the contract as the schema authority, and phases 4 and 5 settled the same question the same way | 4/10 |

**Why this one**: The contract is the approved, later and more detailed text, and it was written from the Media Editor's own repair and HLS references.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- The server, the contract and the tool descriptions agree
- The copy pass is proved on the damage it can repair, a missing index, and the re-encode on the damage only it can repair, a cut stream

**What it costs**:
- `auto` trusted the copy's exit status, and a copy of a cut stream exits 0 with the damage carried across (checked on ffmpeg 6.0). ADR-003 closes this with a decode check the operator approved

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A caller runs `auto` on a cut stream and gets a copy that still stutters at the end | M | Closed by ADR-003: `auto` decodes its copy once and re-encodes on an error |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Four criteria describe behavior the approved contract replaced |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | Four supersessions, no new mechanism |
| 4 | **Fits Goal?** | PASS | Goal decisions D1 and D2 hold: every call diagnoses first, and every pass has a broken-file test |
| 5 | **Open Horizons?** | PASS | A later pass is a contract row plus a broken-file test |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `acceptance-criteria.md`: AC-002, AC-003, AC-007 and AC-008 marked Superseded with this record, AC-009 to AC-012 added
- `spec.md`: scope, REQ-002, REQ-003, REQ-007, REQ-008 and the edge cases follow contract 3.4
- `goal.md`: the repair criterion counts the contract's passes, recorded under Deviations

**How to roll back**: Mark AC-009 to AC-012 Superseded and the four originals Unmet, then amend contract 3.4 to add the `diagnose` mode and the two extra passes.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->

---

<!-- ANCHOR:adr-003 -->
## ADR-003: Three behavior amendments the operator approved after the review

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Operator, on the orchestrator's evidence |

---

<!-- ANCHOR:adr-003-context -->
### Context

Building and reviewing the three tools found three places where contract 3.4 and the better behavior differed. Each was checked on ffmpeg 6.0 and ffprobe 9.0.2 before it was raised, and the operator chose on 2026-09-29.

- **Album art.** An MP3 with a cover carries the picture as a video stream flagged `attached_pic`. The contract's diagnosis command did not read the flag, so `reencode` took the video branch and wrote an MP4 with a one-frame picture track. Its audio re-encode, `-c:a aac -b:a 192k` into M4A, exits 1 on the same file, because ffmpeg maps the picture and the M4A muxer refuses it. `media_probe` and the shared input probe already skip attached pictures, while the contract's probe summary said "the first stream of each type".
- **A copy that keeps damage.** A copy of a cut MP4 exits 0 and carries the damage, so `auto` never reached the re-encode for the damage it exists to fix.
- **The ladder's frame rate.** The ladder reads its rate from the shared input probe: `avg_frame_rate`, then `r_frame_rate`, then 30. The contract said the average, then 30. They differ only when the average is missing, where the nominal rate is the better base for the keyframe interval.

### Constraints

- The contract is operator-approved, so a change to it is the operator's call
- Every pass still needs a broken or awkward file it is proved on
<!-- /ANCHOR:adr-003-context -->

---

<!-- ANCHOR:adr-003-decision -->
### Decision

**We chose**: all three amendments, written into contract 3.4 with a dated change-log row.

**How it works**:
- The diagnosis adds `stream_disposition=attached_pic`. A flagged stream is reported with `attachedPicture: true` and never counts as video, so a song with a cover takes the audio branch, whose re-encode gains `-vn` and adds one warning that the album art was left out. `media_probe` keeps skipping attached pictures in its summary, now under the contract's own words.
- `auto` runs `ffmpeg -v error -i COPY -f null -` on its copy through a new attempt-level `check` in `runAttempts`. An error line counts as the copy failing, so the re-encode runs, and its warning names both causes.
- The ladder keeps the shared probe's rate, and the contract sentence now describes it.
<!-- /ANCHOR:adr-003-decision -->

---

<!-- ANCHOR:adr-003-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Amend the contract to the checked behavior** | Songs with covers repair as songs, `auto` fixes a cut stream, and every probe in the server reads album art the same way | One extra decode per `auto` call | 9/10 |
| Change the code to the contract's text | No contract change | `reencode` fails outright on a song with a cover, `media_probe` calls album art video, and `auto` keeps returning damaged copies | 3/10 |
| Leave the gaps as known limitations | No work | The same three defects ship to every user | 2/10 |

**Why this one**: Each amendment removes a failure a user would hit, and each was proved on a generated file before it was proposed.
<!-- /ANCHOR:adr-003-alternatives -->

---

<!-- ANCHOR:adr-003-consequences -->
### Consequences

**What improves**:
- `reencode` on a song with album art writes a clean M4A instead of failing or writing a picture track
- `auto` on a cut MP4 returns a file with no decode errors
- `media_probe`, the input probe of the other tools and the repair diagnosis agree on what counts as video

**What it costs**:
- `auto` decodes its copy once, which adds roughly one real-time decode per call. Mitigation: `remux` stays check-free for a caller who wants the copy alone
- The re-encoded M4A has no cover. Mitigation: the warning says so, and the copy pass keeps the cover

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A decoder prints a harmless error line on a clean copy and forces a re-encode | L | The re-encode is still a correct repair, and its warning names the cause |
<!-- /ANCHOR:adr-003-consequences -->

---

<!-- ANCHOR:adr-003-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Two amendments fix failures checked on ffmpeg 6.0, and the third aligns the text with the shared probe |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One optional hook in `runAttempts`, one flag, one ffprobe entry |
| 4 | **Fits Goal?** | PASS | Goal decision D3 holds: the check reads only the run's own temp file |
| 5 | **Open Horizons?** | PASS | The attempt-level `check` serves any later copy-first tool |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-003-five-checks -->

---

<!-- ANCHOR:adr-003-impl -->
### Implementation

**What changes**:
- `001-tool-contract/contract.md` 3.4: the probe summary rule, the diagnosis command, the audio re-encode row, the `auto` row and the ladder's frame-rate sentence, with one change-log row
- `src/tools/media/repair.ts`: the diagnosis entry, `attachedPicture`, `-vn`, the album-art warning and the decode check
- `src/tools/video/copy-then-encode.ts`: the attempt-level `check`
- `tests/helpers/broken-media.ts`: `generateCoverArtAudio`

**How to roll back**: Remove the `check` from the `auto` copy attempt, the `-vn` and the disposition entry, and restore the five contract sentences from the change-log row.
<!-- /ANCHOR:adr-003-impl -->
<!-- /ANCHOR:adr-003 -->
