---
title: "Implementation Summary"
description: "Five one-click Claude Desktop bundles of the Media Editor server, each with its own pinned ffmpeg, checked notices and a verified size under budget."
trigger_phrases:
  - "implementation summary"
  - "what shipped"
  - "validation evidence"
  - "continuation notes"
importance_tier: "normal"
contextType: "general"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/007-desktop-extension"
    last_updated_at: "2026-09-29T19:40:00Z"
    last_updated_by: "claude-opus-5-5"
    recent_action: "Built and checked the five bundles; smoke test pending with the operator"
    next_safe_action: "Record the operator smoke test, then close the phase"
    blockers: []
    key_files: []
    session_dedup:
      fingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      session_id: "scaffold-007-desktop-extension"
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
| **Spec Folder** | 007-desktop-extension |
| **Completed** | Built 2026-09-29; closes after the operator smoke test |
| **Level** | 3 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

The Media Editor server now ships as five Claude Desktop extensions, one per platform, each between 65 and 74 MB. You double-click the file for your machine, pick the folders it may open, and every tool works with no ffmpeg, no Node and no terminal on your side.

### Phase 7: desktop-extension

Each bundle carries the compiled server, its own sharp for images, and one ffmpeg and ffprobe pair pinned by digest. The pair is not what the npm packages would fetch: the darwin-arm64 build they fetch is non-free and says it cannot be redistributed, and the ffprobe they ship for Apple Silicon is an Intel binary. So a pinned table names one GPL build per platform (martin-riedl.de 9.0.2 for Apple Silicon, the ffmpeg-static b6.1.1 builds for the rest), and the build checks the archive and the unpacked binary against it before placing them where the server already looks.

Nothing packs without its notices. The build writes the ffmpeg licence text and a source pointer for the exact build in each bundle, lists every npm package with its licence, and refuses to pack when a notice is missing or does not match the binaries. That check stopped two builds for real reasons before they were fixed: sharp's own README notice was missing from the libvips file, and a Windows README ended its heading in a carriage return.

Two more checks guard what ships. Before packing, the build stops when the install left out sharp's native module or libvips, because npm skips an optional platform package without failing. After packing, it reads the packed file back, hashes both binaries again and refuses any sharp package built for another platform, deleting the bundle on a mismatch. That second check exists because the review showed the notice check reads the stage, which can change before the pack reads it.

The folder setting reaches the server as one argument per folder, which is how the MCPB host expands a list, and the server treats each as a root (contract 4.1, amended with the operator's approval).

### Captured output

```text
$ npm run bundle -- --all
media-editor-darwin-arm64.mcpb 70332320 bytes sha256 d82a60721fc79c0fd6c15a47c3a2d0fcfa2e5add222c73b63fed166c36e0f7be
media-editor-darwin-x64.mcpb 65761503 bytes sha256 df6e33a2f32d7831962d8911b6a490bd32be62ba47db77f3dd4ec1f5827e1415
media-editor-win32-x64.mcpb 73622802 bytes sha256 dc82efee55af41c7bb0ce2f72a3efc3116cba3bb25ef96f97515e1bc35f98550
media-editor-linux-x64.mcpb 73129750 bytes sha256 aa3b0c8b40c923b20c1987884f581730d6103ac2ada7f886c670a7c06c2dc385
media-editor-linux-arm64.mcpb 64682325 bytes sha256 42464b8c186752996ea54d01af2e06518d393a1d0f48f3f2b4c8e5923da512bd
```

This is the final pack of 2026-09-29, rerun after the last phase 8 source change. The five files were written between 22:19:11 and 22:19:52, and the log is kept as `final-bundle.log` in the session scratchpad. `mcpb validate` exits 0 on each packed manifest with 39 tools, and all five carry the same 70 compiled files, equal to the local build without its source maps.

The darwin-arm64 bundle holds 2,703 files, 166,189,867 bytes unpacked. The digests change on every pack because the zip records timestamps; the sizes do not. Phase 10 repacked all five at 23:15 with the MP4 refusal, and its implementation summary holds the current digests.

### Files Changed

All paths are in `AI Systems/Media Editor/mcp server/`.

| File | Action | Purpose |
|------|--------|---------|
| `manifest.json`, `icon.png` | Created | MCPB 0.3 manifest (38 tools, 39 once phase 8 added `media_setup_ffmpeg`, two folder settings) and a 512 px icon |
| `src/core/pinned-builds.ts` | Created | The pinned ffmpeg and ffprobe build per platform, shared with `media_setup_ffmpeg` next phase |
| `src/core/config.ts` | Modified | Bare path arguments are roots; an unknown flag takes its value along |
| `scripts/build-bundle.ts`, `scripts/bundle/targets.ts`, `artifacts.ts`, `notices.ts` | Created | The per-target pipeline, downloads and extraction, and the pre-pack notice check |
| `LICENSE`, `THIRD_PARTY_NOTICES`, `licenses/`, `licenses/ffmpeg-builds/` | Created | The merged work's licence, both upstream MIT files, and every licence text |
| `tests/core/pinned-builds.vitest.ts`, `tests/packaging/*.vitest.ts` | Created | Pins, manifest, targets, artifacts (22), notices and bundle contents (48) |
| `tests/core/config.vitest.ts` | Modified | Four cases for bare paths and a mistyped flag |
| `package.json`, `tsconfig.json`, `tsconfig.scripts.json`, `.gitignore` | Modified or created | The `bundle` script, the mcpb dev dependency, the scripts build, and ignoring `build/` and `dist-bundles/` |
| `001-tool-contract/contract.md` | Modified | 4.1 bare-path roots, with a change-log row |

### Handoff to the next phases

- `008-claude-code-plugin`: `media_setup_ffmpeg` reads `PINNED_BUILDS`. All eight GitHub URLs answer 302 to `release-assets.githubusercontent.com` while contract 3.4 step 4 refused any redirect; the operator settled it on 2026-09-29 with one named redirect host per row (phase 8 ADR-002). The darwin-arm64 row is a zip, so the tool needs a zip reader with the contract's entry rules. The resolver's `PINNED_BINARY_SHA256` is wired there.
- `009-media-editor-integration`: the install guide must name which file fits which machine, say to expect the unsigned warning, and explain that the folder list is chosen at install. Install steps belong in `INSTALL-GUIDE.md` (that phase's REQ-006), so CHK-042's package README is left to it.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

The code files came from DeepSeek v4.1 Flash dispatches at max thinking, one file per run, with the orchestrator rerunning the full gate after each. Four runs spent the whole 32,768-token output on reasoning and wrote nothing (the pinned table twice, the notices module, the notices test). Each was redone from a brief that carried the file's skeleton, and the written code then matched the skeleton line for line. The orchestrator wrote the small fixes directly: the CRLF heading match in `notices.ts`, `findMissingNatives`, `checkPackedBundle` and the tests for each. Every test file was mutation-checked against its subject, and the bundle test against a wrong-architecture bundle.

The read-only review ran twice. MiMo v2.6 Pro hit its 40-minute limit mid-thought with no report. It ran again on GPT-6 Luna at max, the next reviewer under the parent goal's D6, which returned four findings:

| Finding | Verdict | Action |
|---------|---------|--------|
| F1 P1: the binaries are checked in the stage, then the stage is packed, so a change in between ships | Real | Fixed at source: `checkPackedBundle` hashes both binaries in the packed file and deletes the bundle on a mismatch |
| F2 P1: a colon inside a folder in `MEDIA_EDITOR_ALLOWED_DIRS` splits it | By design | Contract 6.8 says a path containing the delimiter can only be given as `--allowed-dir`, and the bundle and plugin pass folders as arguments |
| F3 P2: the native check does not refuse another platform's sharp package | Real, same class as F1 | Fixed by the same packed-file check |
| F4 P2: a required folder setting's default does not satisfy the reference host's missing-config check | True of the reference code | Moved to the smoke test: whether Claude Desktop saves the `${DESKTOP}` default is only visible on an install |

The pinned values were checked outside the model: all ten archives and binaries were re-hashed from the downloads, gunzipped or unzipped, and searched for the version text (`ALL PINS MATCH`).
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Why |
|----------|-----|
| One bundle per platform, built on one Mac with npm platform flags (ADR-001) | The spike showed correct sharp and ffmpeg binaries for every target, so no CI matrix is needed |
| A pinned build table instead of the packages' own downloads (ADR-002) | The fetched Apple Silicon ffmpeg is not redistributable and two ffprobe binaries do not run natively |
| Folder list as bare arguments (ADR-003) | The MCPB host expands a list into bare arguments only |
| The contract's notice layout, AC-003 superseded by AC-010 (ADR-004) | The approved contract names the files; the phase spec's single Markdown notice contradicted it |
| A 512 px icon upscaled from the 256 px favicon | `mcpb validate` recommends 512 x 512 for every icon; the detail is still the favicon's |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Package gate on the final state | PASS, rerun 2026-09-29 after the phase 8 repack: tsc 0, 81 files, `1694 passed, 4 skipped (1698)`, greps, headers, 100 columns, ids and em dashes clean, alignment 0 findings over 170 files |
| `mcpb validate` | PASS: exit 0 on the root manifest and on each of the five packed manifests of the final pack, each declaring 39 tools |
| Bundle contents | PASS: 48 tests, none skipped, including `file` on four binaries per bundle and the unpacked darwin-arm64 bundle answering over stdio |
| Pinned digests | PASS: all ten archives and binaries re-hashed from the downloads |
| Suite runtime | 19.99 s for the full suite; the bundle test alone takes about 15.5 s, most of it unzipping five bundles |
| Operator smoke test on a clean machine | PENDING: T015, AC-004 and the smoke half of AC-008 |
| Native and packed-file checks | PASS: `findMissingNatives` and `checkPackedBundle` report nothing on all five real bundles and their stages; each fails its test when broken |
| Startup time (NFR-P01) | `media_health` answered 1,581 ms after a cold start of the unpacked darwin-arm64 bundle, then about 240 ms, from a folder named `Extensión ü` with the root `Clips: café 2026` |
| No development dependency (NFR-S02) | PASS: no package from `devDependencies` is in any bundle, and the test fails when a bundled package is named |
| Read-only review | GPT-6 Luna at max: F1 and F3 fixed, F2 rejected with the contract rule, F4 moved to the smoke test |

### Matrix

| Axis | Values | Rows |
|------|--------|------|
| Target | darwin-arm64, darwin-x64, win32-x64, linux-x64, linux-arm64 | 5 |
| Checked binary | ffmpeg, ffprobe, the sharp module with libvips | 3 |
| Archive kind | gzip on four targets, zip on darwin-arm64 | 2 |

Every gate checks the three binaries of each of the five bundles, fifteen cells, by digest and by `file`. Both archive kinds have unit tests for their extract path.

### Operator smoke test

1. Pick the file for the machine: `media-editor-darwin-arm64.mcpb` for an Apple Silicon Mac, `darwin-x64` for an Intel Mac, `win32-x64` for Windows, and the Linux pair by CPU.
2. Use a machine with no ffmpeg and no Node on it. Open the file with Claude Desktop, accept the unsigned-extension warning, and pick two folders.
3. Check whether the folder field starts filled with the Desktop folder and whether the server starts before you change it (review finding F4).
4. In a chat, ask for `media_health`: both binaries should report `bundled`, and both folders should count.
5. Ask for `image_resize` on an image in one folder: a new numbered folder should appear in the output folder.
6. Record the date, machine, platform and both results in the `goal.md` log.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

1. **The manifest cannot name an architecture.** `compatibility.platforms` holds the operating system only, so an x64 Mac bundle installs on Apple Silicon and fails to load sharp there without Rosetta. The file name carries the architecture, and the install guide has to say which file to pick.
2. **The source pointers name third-party servers.** Before a public release, mirror the ffmpeg source archives so the GPL source offer stays valid as long as it must.
3. **Four of the five binaries cannot run on the build Mac.** Their version is checked by finding the version text inside the binary, not by running `-version`; the smoke test on another platform would run it.
4. **The bundles are unsigned.** Claude Desktop shows a warning on install, as the operator accepted for now.
5. **ffmpeg versions differ per platform** (9.0.2, 6.1.1, 7.0.2). The capability gate reads each build, so a missing filter is reported, not assumed. Until phase 8 it misread the Apple Silicon build: ffmpeg 9 prints two flag characters on a filter row, not three, so every filter read as absent there and ten filter-gated tools would have refused. The parser now takes two or three, a test holds an ffmpeg 9 fixture, and a live run found all 18 filters on 9.0.2. The test suite itself still runs on the development ffmpeg 6.0, not on the pinned builds.
6. **Dependencies ship as published.** Their own `test/` folders and `zod/src` are inside each bundle, 407 files and 3.5 MB unpacked. No development dependency ships, and a test checks that. Pruning published packages was rejected because zod's export map points its `@zod/source` condition at `src/index.ts`.
7. **The build runs on macOS or Linux.** It starts `npm` and `unzip` without a shell, and on Windows `npm` is a `.cmd` file that Node will not start that way. This is read from the code and was not tried on Windows.
<!-- /ANCHOR:limitations -->

---
