---
title: "Feature Specification: Phase 10: pinned-build-parity"
description: "The suite runs on ffmpeg 6.0 while the Apple Silicon bundle ships 9.0.2, and 9.0.2 stores PCM and FFV1 copies in MP4 that the other builds refuse. This phase runs the suite on the pinned build and makes those copies re-encode everywhere."
trigger_phrases:
  - "feature specification"
  - "problem statement"
  - "requirements and scope"
  - "success criteria"
importance_tier: "normal"
contextType: "general"
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
# Feature Specification: Phase 10: pinned-build-parity

<!-- SPECKIT_LEVEL: 3 -->


---

## EXECUTIVE SUMMARY

The package gate tests the server on the development ffmpeg 6.0, while the Apple Silicon bundle ships ffmpeg 9.0.2. On 9.0.2, 45 of 1,698 tests fail. 28 fail because ffmpeg 9 builds the filter graph twice and logs every drawtext value twice. 17 fail because ffmpeg 9 stores PCM audio and FFV1 video in MP4 by stream copy, where the builds on the other four platforms refuse and the tool re-encodes. This phase adds a suite run on the pinned build of the machine running it, and makes those MP4 copies re-encode on every platform, as the operator chose on 2026-09-29.

**Key Decisions**: an MP4 copy that holds PCM audio or FFV1 video counts as refused on every build (ADR-001). The pinned run swaps the two static packages for test-only shims and leaves shipped code alone (ADR-002).

**Critical Dependencies**: the pinned archives in `build/cache/`, which the bundle build downloads and checks by digest.

---
<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 3 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-09-29 |
| **Branch** | `main`, nothing committed |
| **Parent Spec** | ../spec.md |
| **Phase** | 10 of 10 |
| **Predecessor** | 009-media-editor-integration |
| **Successor** | None |
| **Handoff Criteria** | `npm test` and `npm run test:pinned` both exit 0, and the rebuilt bundles and plugin validate |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:phase-context -->
## Phase Context

This is **Phase 10** of the Media Editor MCP server and Claude extension specification.

**Scope Boundary**: the server package under `AI Systems/Media Editor/mcp server/`, the tool contract's affected sections, and this folder. The Media Editor skill, kernel and playbook are out of scope, because no route or wording changes.

**Dependencies**:
- Phase 7's pinned build table and bundle cache
- Phase 8's plugin build, rebuilt at the end
- The operator's decision of 2026-09-29: "Re-encode like others"

**Deliverables**:
- One shared refusal for MP4 copies that hold PCM audio or FFV1 video, in the attempt runner and the pipeline runner
- `npm run test:pinned`, which runs the whole suite on the pinned ffmpeg and ffprobe of the machine running it
- The drawtext probe and the mislabelled-Matroska fixture test fixed to test what they mean on every build
- Contract amendments, rebuilt bundles and plugin

**Changelog**:
- When this phase closes, refresh the matching file in ../changelog/ using the parent packet number plus this phase folder name.
<!-- /ANCHOR:phase-context -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The gate proves the server on a build no user gets. On the Apple Silicon bundle, a request to trim or re-time a clip with PCM audio keeps that PCM in the MP4, and a request to change the audio of an FFV1 clip keeps the FFV1 picture, while the same request on the other four platforms returns AAC and H.264. An MP4 with PCM or FFV1 plays in far fewer places.

### Purpose
One request gives the same widely playable MP4 on every platform, and the gate proves it on the build that ships.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- A shared check that refuses an MP4, M4A or M4V output holding a PCM audio stream or an FFV1 video stream
- Wiring that check into every attempt of `runAttempts` and into the product of every `runPipeline` call, which covers the silence tool's no-silence copy
- A script, an npm entry and test-only shims that run the suite on the pinned build
- The drawtext round-trip probe and the mislabelled-Matroska fixture test
- Contract amendments in 3.2, 3.3.6, 3.4 and section 5, dated and marked as operator-approved
- Rebuilt bundles and plugin

### Out of Scope
- Other codecs ffmpeg 9 may accept in MP4 - the rule covers the two families the suite found, and a wider table would change behavior the other builds already have
- A re-encode fallback for the silence tool's copy - that tool has none on any build today, so a refused copy fails the same way everywhere
- Running the suite on other platforms' builds - each machine runs its own pinned pair, and this Mac can run only darwin-arm64

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `src/core/media-containers.ts` | Modify | The MP4 extensions and the codecs an MP4 copy may not keep |
| `src/core/media-properties.ts` | Modify | `probeIntermediateCodecs`, the codec of every stream in a temp file |
| `src/tools/video/copy-then-encode.ts` | Modify | `assertPortableMp4`, run after every attempt and on every pipeline product |
| `src/tools/media/remove-silence.ts` | Unchanged | Its no-silence copy runs through `runPipeline`, which now applies the check |
| `scripts/test-pinned.ts`, `package.json`, `vitest.config.ts` | Create and modify | The pinned run |
| `tests/helpers/pinned-ffmpeg-static.ts`, `tests/helpers/pinned-ffprobe-static.ts` | Create | Shims that name the pinned binaries |
| `tests/core/filter-escape.vitest.ts`, `tests/helpers/broken-media.vitest.ts` | Modify | Build-independent assertions |
| New and changed tests | Create and modify | The refusal, the probe helper and the pinned run |
| `../001-tool-contract/contract.md` | Modify | Dated amendments |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (MUST complete)

| ID | Requirement |
|----|-------------|
| REQ-001 | An attempt whose MP4, M4A or M4V output holds a PCM audio stream or an FFV1 video stream counts as refused on every build, so the next attempt runs, and a call with no attempt left returns `PROCESS_FAILED` |
| REQ-002 | `npm run test:pinned` runs the whole suite on the pinned ffmpeg and ffprobe for the machine running it, each checked against its pinned binary digest, without changing shipped code |
| REQ-003 | `npm test` and `npm run test:pinned` both exit 0 |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement |
|----|-------------|
| REQ-004 | The drawtext round trip requires every filter graph ffmpeg builds to hold each value unchanged |
| REQ-005 | The mislabelled-Matroska fixture test asserts what the fixture is, not what one ffmpeg does with it |
| REQ-006 | The silence tool's no-silence copy applies the same refusal, through `runPipeline` |
| REQ-007 | The contract records the amendments with a date and the operator's approval |
| REQ-008 | The five bundles and the plugin are rebuilt, and each validates with 39 tools |
| REQ-009 | A read-only review on the parent goal's D6 routes, by a model that wrote none of the code, with findings resolved |

> Acceptance criteria for these requirements live in `acceptance-criteria.md`,
> which is the document that decides whether this packet may close.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: `npm run test:pinned` on this Mac exits 0 on ffmpeg 9.0.2, where 45 tests failed before
- **SC-002**: `npm test` still exits 0 on the development ffmpeg 6.0
- **SC-003**: A PCM-audio or FFV1 copy into MP4 re-encodes on 9.0.2, shown by the tool tests that failed before
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | `build/cache/` holds the pinned archives | The pinned run cannot start | The script fetches a missing archive through the build's own digest-checked download |
| Risk | The extra probe after an MP4 attempt adds time | Low | One ffprobe of a local temp file, measured on the suite |
| Risk | A codec family beyond PCM and FFV1 also differs | Med | The pinned run is the detector: any new difference fails the gate |
| Risk | Aliases leak into the shipped server | High | The aliases live in `vitest.config.ts` only and apply only when the pinned run sets its variable |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->

## 7. NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The development suite's wall time grows by no more than 10 percent

### Security
- **NFR-S01**: The pinned run executes only binaries whose SHA-256 matches the pinned row

### Reliability
- **NFR-R01**: A missing or wrong cached archive stops the pinned run with a clear message and runs no test

---

## 8. EDGE CASES

### Data Boundaries
- An output that is not MP4, M4A or M4V: never probed
- An MP4 with several audio streams: every stream is read, and one PCM stream refuses the copy
- A PCM stream in a MOV file: allowed, because MOV takes a PCM copy on ffmpeg 6.0 and 9.0.2 alike, checked on this Mac

### Error Scenarios
- The probe of a temp file fails: the attempt fails as it would for any probe failure
- The last attempt is refused: `PROCESS_FAILED` with every attempt's tail
- No pinned build for this platform: the script names the platform and stops

---

## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Triggers |
|-----------|-------|----------|
| Scope | 12/25 | Files: about 14, LOC: about 400, Systems: 1 |
| Risk | 10/25 | Auth: N, API: N, Breaking: behavior change on one platform |
| Research | 6/20 | Measured failure list on 9.0.2 |
| Multi-Agent | 3/15 | Workstreams: 1, plus one review |
| Coordination | 4/15 | Dependencies: bundle cache, plugin build |
| **Total** | **35/100** | **Level 3** |

---

## 10. RISK MATRIX

| Risk ID | Description | Impact | Likelihood | Mitigation |
|---------|-------------|--------|------------|------------|
| R-001 | The refusal misses a stream a copy can carry | M | L | Every stream is read, not just the first audio and video |
| R-002 | The pinned run passes on a build the bundles do not carry | H | L | The script checks each binary's digest against the same pinned table the bundles use |
| R-003 | The drawtext fix weakens the escape proof | H | L | Every graph must hold every value, which is stricter than before |

---

## 11. USER STORIES

### US-001: Same MP4 on every platform (Priority: P0)

**As a** Media Editor user on any platform, **I want** an edited MP4 with AAC audio and an H.264 picture, **so that** the file plays wherever I send it.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

### US-002: The gate tests what ships (Priority: P0)

**As the** maintainer, **I want** the suite to run on the pinned build, **so that** a green gate means the bundle works.

**Acceptance criteria:** see `acceptance-criteria.md` (rows referencing this story).

---

## 12. OPEN QUESTIONS

- None. The operator decided the MP4 behavior and asked for this phase on 2026-09-29.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Implementation Plan**: See `plan.md`
- **Task Breakdown**: See `tasks.md`
- **Verification Checklist**: See `tasks.md`
- **Decision Records**: See `decision-record.md`

---


