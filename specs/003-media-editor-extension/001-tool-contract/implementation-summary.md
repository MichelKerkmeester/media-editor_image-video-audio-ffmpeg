---
title: "Implementation Summary"
description: "Phase 1 delivered contract.md, the one document phases 2 to 8 build against: 39 tool schemas, path policy, error model, ffmpeg lookup, result format, process rules, defect fixes and attribution."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/001-tool-contract"
    last_updated_at: "2026-09-29T00:55:00Z"
    last_updated_by: "claude-sonnet-5-5"
    recent_action: "Closed phase 1 documentation with observed evidence"
    next_safe_action: "None: the contract is approved and later phases amend it in place"
    blockers: []
    key_files:
      - "contract.md"
      - "decision-record.md"
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "5347dbce-12b3-4d28-9826-cfbf11c6be1d"
      parent_session_id: null
    completion_pct: 90
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
# Implementation Summary

<!-- SPECKIT_LEVEL: 3 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 001-tool-contract |
| **Completed** | 2026-09-29, operator approval recorded the same day |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

`contract.md` (version 0.2) fixes every name, parameter, path rule, error code and ffmpeg argument that the server phases implement, so no later phase has to guess. It turns two servers with 35 registrations (8 in Imagician, 27 in video-audio, one of them `health_check`, which becomes `media_health`) into one table of 39 tools: the 35 ports plus four new ones, `media_probe`, `media_repair`, `video_hls_ladder` and `media_setup_ffmpeg`.

### Phase 1: tool-contract

The contract has ten sections. Section 2 is the unified table, section 3 gives each tool a schema table with type, default, range and unit plus the argv it runs, section 4 is the path policy and its adversarial case list, section 5 the fifteen error codes, section 6 the four-step ffmpeg lookup, section 7 the result format, section 8 the capability gates, process policy and filter escaping, section 9 one fix per source defect (G.1 to G.13) and section 10 the licence and attribution plan. `decision-record.md` holds ADR-001 to ADR-003 (TypeScript, SDK and zod, spawn with an argv array).

Two review passes shaped version 0.2. A read-only MiMo review of the contract against the sources found 6 P0, 3 P1 and 5 P2 issues, all fixed and logged in the contract change log: the drawtext box separator, the unquoted `force_style`, the unquoted silence `select` expressions, attempt 2 dropping `-c:a aac`, missing output names for seven composition tools, and citation errors. A later security pass replaced the first escape table with a two-level filter escaping rule, added a file-only protocol whitelist with indirection and SubRip content gates, made the concat list server-generated, made HLS patterns relative to the numbered output folder, added a magic-byte allowlist and a 100 Mpx cap for images, and added a pinned `binarySha256` check for downloaded ffmpeg.

### Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `contract.md` | Created | The contract phases 2 to 8 build and test against |
| `decision-record.md` | Created | ADR-001 to ADR-003 |
| `scratch/name-diff.md` | Created | Name diff of 35 source registrations against the 39-row table, 0 missing |
| `scratch/spot-check.md` | Created | Ten inventory citations checked against the sources |
| `scratch/unknowns.md` | Created | Every UNKNOWN the inventory left, and how each was closed |
| `scratch/escape-check/` | Created | The ffmpeg 6.0 runs behind the escaping and protocol rules |
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

MiMo read the two source servers and produced the inventory. Section drafts ran on DeepSeek into `scratch/sections/`, one file each, and one opus-high writer assembled `contract.md`. The orchestrator then re-ran the name diff, the structural checks and the strict validator after each patch. Nothing was committed, staged or pushed.

The autonomous run that produced this contract is not a contract sign-off. AC-011 and the operator row of the sign-off table stay open until the operator reads `contract.md` and says so.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| TypeScript on Node instead of Python | A `.mcpb` Node bundle carries `node_modules`, and a Python bundle cannot carry compiled dependencies on every platform (ADR-001) |
| SDK 1.x `McpServer` with zod schemas | It is the current line and gives one schema source for validation and `tools/list` (ADR-002) |
| `spawn` with an argv array and `shell: false` | No caller byte reaches a shell, and one escaping helper covers the filter graph (ADR-003) |
| Every output in a fresh `NNN - <slug>/` folder, inputs never written | This removes the source's overwrite-the-input defect (G.3) by construction |
| Protocol errors for an unknown tool and a schema failure, `isError` results for everything else | Clients can tell a bad call from a failed run. SDK 1.31 turns both protocol cases into `isError` results by itself, so phase 2 installs its own `tools/call` handler to keep this rule true |
| 1800 second job limit, `MEDIA_EDITOR_*` variables, fifteen error codes | The operator accepted these proposals |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Section 2 rows against the sources | PASS: 39 rows, 39 unique names, 35 of 35 source registrations present, 0 missing, 0 extra (`scratch/name-diff.md`, re-run on 0.2) |
| Every tool has a schema section and a parameter table with a unit column | PASS: 39 of 39 schema headings, 39 parameter tables, 39 with `Unit` |
| Tool names use `image_`, `video_`, `audio_` or `media_`, parameters are camelCase | PASS: no name outside the four prefixes, no parameter token outside camelCase (the only other first-column tokens are enum values such as `top_left`) |
| Each of the fifteen error codes is used outside its own definition | PASS: every code appears outside section 5, the lowest being `INTERNAL` with one mention (section 7) |
| Defect lines G.1 to G.13 in section 9 | PASS: each id appears in the section 9 index and its detail |
| Em dashes in `contract.md` | PASS: 0 |
| Read-only review of the contract against the sources | PASS after fixes: 14 findings, all resolved in version 0.2 |
| Read-only security review of sections 4, 5 and 8 | PASS after fixes: rules added and checked on ffmpeg 6.0 |
| `validate.sh 001-tool-contract --strict` | See the final run recorded in `tasks.md` (T021) |
| Operator approval of `contract.md` | Given on 2026-09-29 as 'Approve as built', with every dated amendment, so AC-011 is `Met` |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **The bundled ffmpeg has license and redistribution questions.** `ffmpeg-static` 5.3.0 is GPL-3.0-or-later, and the darwin-arm64 build reports `--enable-gpl --enable-version3 --enable-nonfree`. Section 10.4 states the obligations and blocks packing until `007-desktop-extension` settles the binary source.
2. **`ffprobe-static` has gaps.** Its darwin/arm64 binary is an x86_64 executable that fails with "bad CPU type" on this machine, and there is no linux/arm64 binary. Section 6.3 records both, and the tests in phase 2 do not assume the packaged ffprobe runs.
3. **Windows behavior is unverified.** The escaping rule, the `\\?\` and alternate-stream rejection and the drive-letter compare were reasoned from the rules and not run on Windows. Phase 5 carries a Windows escaping case in its vitest port and reports whether a Windows runner exercised it, so a run on Windows still has to come from the operator or a CI matrix.
4. **Two path-guard cases cannot run on a default macOS volume.** The case-sensitive-volume and NFD name cases need a special volume.
5. **The contract stays version 0.2 until the operator approves it.** Later phases amend it in place with a dated change log line.

### Handoff to phase 2

- Build against `contract.md` sections 1, 4 to 8. The registry must expose 39 names, and only `media_health` is implemented in phase 2.
- Install a custom `tools/call` handler: unknown tool gives `-32601`, schema failure gives `-32602`, a handler throw becomes an `isError` result with `code`, `message` and `details`.
- Leave the pinned SHA-256 for downloads empty in phase 2 so the fourth lookup step fails closed.
- Do not assume the packaged ffprobe runs on the dev machine. Use `/opt/homebrew/bin` binaries or the `MEDIA_EDITOR_*` override in tests.
- Record that `verify_alignment_drift.py` scans only git-tracked files: an untracked package passes with zero files scanned, so phase 2 uses a tracked copy as the stand-in.
<!-- /ANCHOR:limitations -->

---
