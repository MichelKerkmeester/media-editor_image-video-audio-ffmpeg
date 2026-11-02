---
title: "Decision Record: Phase 7: desktop extension"
description: "One bundle per platform or one universal bundle, and how per-platform native binaries are fetched at build time."
trigger_phrases:
  - "desktop extension decisions"
  - "per platform mcpb bundles"
  - "universal bundle size"
  - "native binary cross install"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/007-desktop-extension"
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
# Decision Record: Phase 7: desktop extension

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:adr-001 -->
## ADR-001: One bundle per platform, not a universal bundle

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Orchestrator with the operator, after the spike |

---

<!-- ANCHOR:adr-001-context -->
### Context

Claude Desktop installs `.mcpb` bundles that carry `node_modules` (github.com/modelcontextprotocol/mcpb). sharp, `ffmpeg-static` and `ffprobe-static` each ship native binaries per platform, and ffmpeg alone is about 70 to 80 MB per platform in the approved plan. The targets are darwin-arm64, darwin-x64, win32-x64, linux-x64 and linux-arm64.

### Constraints

- Five targets
- Install works offline once downloaded
- A size budget of 150 MB per download
<!-- /ANCHOR:adr-001-context -->

---

<!-- ANCHOR:adr-001-decision -->
### Decision

**We chose**: One bundle per platform, each declaring its platform in `compatibility.platforms`, with the build method (npm platform flags from one host, or a CI matrix of native runners) settled by the spike.

**How it works**: The build script takes `--target <key>` or `--all`, installs production dependencies for that target with npm's platform flags, places the pinned ffmpeg and ffprobe (ADR-002) and prunes the other platforms' ffprobe binaries. One Mac builds all five bundles; no CI matrix is needed.

**Spike result, 2026-09-29** (macOS arm64 host, node 26.8.2, npm 11.19.1):

- `npm_config_platform=linux npm_config_arch=x64 npm ci --omit=dev --os=linux --cpu=x64 --libc=glibc` exited 0. `file` reported ELF x86-64 for ffmpeg, for `@img/sharp-linux-x64`'s native module and for `libvips-cpp.so.8.18.7`.
- Without `--libc=glibc` npm skipped sharp's Linux packages on the Mac host, because they declare glibc.
- The same command for `win32`/`x64` without `--libc` exited 0, with PE32+ x86-64 for `ffmpeg.exe`, the sharp module and the libvips DLLs.
- Installed as is, `node_modules` held 440 to 462 MB, about 330 MB of it every platform's ffprobe from `ffprobe-static`, so each bundle prunes to its own.
- The final build adds `--ignore-scripts`, so `ffmpeg-static` downloads nothing and the pinned binaries are placed instead. `npm run bundle -- --all` built all five bundles on 2026-09-29, between 64,669,717 and 73,610,195 bytes each.
<!-- /ANCHOR:adr-001-decision -->

---

<!-- ANCHOR:adr-001-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **One bundle per platform** | Small downloads, only matching binaries | Five artifacts to host and name | 8/10 |
| One universal bundle | One file | About 400 MB with five ffmpeg builds, and the runtime must pick a binary | 3/10 |
| Bundle without ffmpeg, download on first run | Small bundle | Needs network and consent on every install, breaks offline use | 4/10 |

**Why this one**: It keeps each download within budget and guarantees the binaries match the machine.
<!-- /ANCHOR:adr-001-alternatives -->

---

<!-- ANCHOR:adr-001-consequences -->
### Consequences

**What improves**:
- Downloads of roughly 100 MB instead of about 400 MB
- Wrong-platform installs refused by the manifest

**What it costs**:
- Five artifacts per release. Mitigation: one build script and consistent names
- `compatibility.platforms` carries the operating system only; the MCPB manifest has no architecture field. An x64 Mac bundle installed on an Apple Silicon Mac without Rosetta fails to load sharp. Mitigation: the architecture is in the file name, and the install guide names which file to pick

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cross-platform fetch fails for one package | H | CI matrix |
| A user downloads the wrong bundle | M | Platform in the file name, refused by `compatibility.platforms` |
<!-- /ANCHOR:adr-001-consequences -->

---

<!-- ANCHOR:adr-001-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Five platforms need five binary sets |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One script, one flag pair |
| 4 | **Fits Goal?** | PASS | One-click install is the parent objective |
| 5 | **Open Horizons?** | PASS | The script can also emit a universal bundle if the answer changes |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-001-five-checks -->

---

<!-- ANCHOR:adr-001-impl -->
### Implementation

**What changes**:
- `scripts/build-bundle.ts` and `scripts/bundle/` take a target and run the pipeline
- The staged `manifest.json` is written per target from the root manifest

**How to roll back**: Switching to a universal bundle means dropping the prune step and listing every platform in one manifest, which the script supports.
<!-- /ANCHOR:adr-001-impl -->
<!-- /ANCHOR:adr-001 -->

---

<!-- ANCHOR:adr-002 -->
## ADR-002: Each bundle carries one pinned ffmpeg and ffprobe build, not what the npm packages fetch

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Operator (the darwin-arm64 source), orchestrator (the pinning) |

---

<!-- ANCHOR:adr-002-context -->
### Context

Contract 10.4 left the source of the shipped binaries to this phase. What the packages fetch was checked on 2026-09-29:

- `ffmpeg-static` 5.3.0 downloads release b6.1.1. Its darwin-arm64 build is osxexperts ffmpeg 6.0, configured `--enable-nonfree`, and `ffmpeg -L` prints that it is not legally redistributable.
- `ffprobe-static` 3.1.0 ships an x86_64 binary under `darwin/arm64` and no `linux/arm64` binary at all. This Mac has no Rosetta, so the x86_64 binaries fail with "bad CPU type".
- The b6.1.1 release also carries an ffprobe for every platform, from the same build as its ffmpeg. The version strings read from the binaries are `6.1.1-tessus` (darwin-x64; its README describes evermeet's later 8.0 release, but the binary says 6.1.1), `7.0.2-static` from John Van Sickle (both Linux targets) and `6.1.1-essentials_build-www.gyan.dev` (win32-x64). All four are configured `--enable-gpl --enable-version3` with no non-free flag.
- The operator chose martin-riedl.de 9.0.2 for darwin-arm64 on 2026-09-29: a native arm64 pair, GPL v3 or later, no non-free flag, with `.sha256` files on the site that match the downloads.

### Constraints

- Every shipped build must be redistributable under the GPL
- One build per bundle, so one licence pair describes both binaries (contract 10.4)
- The build must fail rather than ship a file it did not expect
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: a pinned build table in `src/core/pinned-builds.ts`, one row per platform with the URL, byte count and SHA-256 of each archive and the SHA-256 of each unpacked binary. The build installs with `--ignore-scripts`, fetches each archive through the table, checks both digests, and places the binaries where `ffmpeg-static` and `ffprobe-static` export their paths, so the resolver is unchanged.

**How it works**: darwin-arm64 takes martin-riedl.de 9.0.2 (zip archives). The other four take the b6.1.1 ffmpeg and ffprobe from the same builder (gzip archives). The server keeps importing `ffmpeg-static` to learn the path, which answers the open point in contract 10.4: the package's GPL-3.0-or-later code travels in the bundle, and its licence is `licenses/ffmpeg-static-LICENSE.txt`. The next phase's `media_setup_ffmpeg` reads the same table.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Pinned table, one build per bundle** | Every byte checked, redistributable everywhere, native ffprobe on both arm64 targets | The table must be updated by hand for a new build | 9/10 |
| Ship what the packages fetch | No table | Non-free darwin-arm64 ffmpeg, x86_64 or missing ffprobe on the arm64 targets, nothing pinned | 2/10 |
| Ship no ffmpeg and install on first run | Small bundles | Needs network and consent on every install, breaks offline use | 4/10 |

**Why this one**: It is the only option that ships a working, redistributable pair on all five targets.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- Every bundle carries a native ffmpeg and ffprobe that `media_health` reports as `bundled`
- A changed download or binary stops the build with `CHECKSUM_MISMATCH`

**What it costs**:
- The versions differ per platform (9.0.2, 6.1.1, 7.0.2). Mitigation: the capability gate reads each build, and each `ffmpeg-SOURCE.md` names its own version
- Four of the five binaries cannot run on the build Mac, so the version check reads the version text inside the binary rather than running `-version`

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A pinned URL disappears | M | The build cache keeps verified archives, and a new pin is one table row |
| The GitHub release URLs redirect, and the next phase's download path forbids redirects | M | Recorded for `008-claude-code-plugin`, which owns that rule |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | The fetched darwin-arm64 build is not redistributable and two ffprobe binaries do not run |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One table, two digests per binary, the existing resolver paths |
| 4 | **Fits Goal?** | PASS | Goal decision D1 keeps `ffmpeg-static` and `ffprobe-static` as the path exporters |
| 5 | **Open Horizons?** | PASS | `media_setup_ffmpeg` reuses the table |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `src/core/pinned-builds.ts` and its test
- `scripts/bundle/artifacts.ts`: download, extraction and pruning, each digest checked
- `licenses/ffmpeg-builds/<target>-LICENSE.txt`: the licence text of each pinned build

**How to roll back**: Point a table row at another build with its digests and licence text, and rebuild that target.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->

---

<!-- ANCHOR:adr-003 -->
## ADR-003: The folder list reaches the server as bare arguments

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Operator, on the orchestrator's evidence |

---

<!-- ANCHOR:adr-003-context -->
### Context

The MCPB reference implementation (`@anthropic-ai/mcpb` 2.1.2, `dist/shared/config.js`) expands an args item that is exactly `${user_config.KEY}` holding a list into one argument per element. It cannot prefix each element with a flag, and an unset setting leaves the literal placeholder in place. A required setting counts only what the user saved, never the default, and a list default is not itself substituted.

### Constraints

- More than one allowed folder must work on every platform (REQ-008)
- A mistyped flag must never turn a path into a root
<!-- /ANCHOR:adr-003-context -->

---

<!-- ANCHOR:adr-003-decision -->
### Decision

**We chose**: the operator's option "Bare paths are roots" on 2026-09-29. Contract 4.1 now accepts a bare path argument as a root, and an unknown `--` flag takes its value along so it never becomes one.

**How it works**: The manifest passes `--output-dir ${user_config.output_directory}` and then `${user_config.allowed_directories}` last. An empty output setting reaches the server as the literal placeholder, which is not absolute, so the server warns and uses the first folder. The folder list is required, so the host asks for it at install; the `${DESKTOP}` default only prefills the picker.
<!-- /ANCHOR:adr-003-decision -->

---

<!-- ANCHOR:adr-003-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Bare paths are roots** | Any number of folders, no delimiter parsing, a folder name may hold a colon | A contract amendment | 9/10 |
| One environment variable with a joined list | No contract change | The host cannot join a list, so only one folder would work | 3/10 |
| A fixed number of single-folder settings | No contract change | An arbitrary cap and a cluttered settings screen | 4/10 |

**Why this one**: It is the only shape the host's expansion supports for a list of any length.
<!-- /ANCHOR:adr-003-alternatives -->

---

<!-- ANCHOR:adr-003-consequences -->
### Consequences

**What improves**:
- Two or more folders arrive as two or more roots, in order

**What it costs**:
- A stray bare argument becomes a root. Mitigation: it must be an absolute, existing folder, and `media_health` lists the roots in effect

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A host implementation expands lists differently from the reference | M | The operator's smoke test sets two folders in Claude Desktop itself |
<!-- /ANCHOR:adr-003-consequences -->

---

<!-- ANCHOR:adr-003-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | The host expands a list into bare arguments only |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One parser rule plus the unknown-flag rule |
| 4 | **Fits Goal?** | PASS | Goal decision D3 holds: roots still gate every read |
| 5 | **Open Horizons?** | PASS | The Claude Code plugin can pass folders the same way |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-003-five-checks -->

---

<!-- ANCHOR:adr-003-impl -->
### Implementation

**What changes**:
- `src/core/config.ts` and its test (four new cases)
- `001-tool-contract/contract.md` 4.1 with a change-log row
- `manifest.json` args and `user_config`, and the manifest test that runs the reference expansion into the real parser

**How to roll back**: Restore the 4.1 text and the two parser rules from the change-log row, and pass one folder through `--allowed-dir`.
<!-- /ANCHOR:adr-003-impl -->
<!-- /ANCHOR:adr-003 -->

---

<!-- ANCHOR:adr-004 -->
## ADR-004: The notices follow contract 10.1, so AC-003 is superseded by AC-010

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Orchestrator, applying the approved contract; rights holder named by the operator |

---

<!-- ANCHOR:adr-004-context -->
### Context

REQ-003 and AC-003 named `THIRD_PARTY_NOTICES.md` and put both upstream copyright lines in `LICENSE`. The approved contract (10.1 to 10.4) names `THIRD_PARTY_NOTICES` with no extension, puts the upstream MIT blocks there byte for byte, and adds a `licenses/` folder with one text per component and one licence pair per shipped build. Where a phase spec and the contract differ, the contract wins. The operator named Michel Kerkmeester as the rights holder on 2026-09-29.

### Constraints

- Both upstream MIT files are copied, never retyped, so a byte comparison stays possible
- A notice never describes a build the bundle does not carry
- Packing stops while any notice is missing
<!-- /ANCHOR:adr-004-context -->

---

<!-- ANCHOR:adr-004-decision -->
### Decision

**We chose**: the contract's layout. AC-003 is superseded by AC-010, which checks the files the contract names.

**How it works**: `LICENSE` is the merged work's MIT licence. `THIRD_PARTY_NOTICES` carries the holder line, both upstream files verbatim and an index of every licence file. Each target's `licenses/ffmpeg-LICENSE.txt` is copied from `licenses/ffmpeg-builds/` at build time and `licenses/ffmpeg-SOURCE.md` is written from the pinned table, so the pair always matches the binaries. Two entries go beyond the contract's table: the bundled Source Sans 3 font (OFL) and `licenses/node-modules.txt`, the build's list of every package in the bundle with its licence. `licenses/libvips-LICENSE.txt` carries the licensing sections of every sharp prebuilt package, verbatim, followed by the LGPL text.
<!-- /ANCHOR:adr-004-decision -->

---

<!-- ANCHOR:adr-004-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Contract layout with a pack-time check** | Matches the approved plan, every text present, checked per bundle | More files | 9/10 |
| The phase spec's single Markdown notice | One file | Contradicts the contract, and licence texts would be summarised rather than copied | 3/10 |

**Why this one**: The contract is operator-approved and binding.
<!-- /ANCHOR:adr-004-alternatives -->

---

<!-- ANCHOR:adr-004-consequences -->
### Consequences

**What improves**:
- Every bundle carries the GPL text and a source pointer for its exact ffmpeg build
- The pack check caught two real gaps during the builds: sharp's own README notice, and a Windows README whose heading ended in a carriage return

**What it costs**:
- The source pointers name third-party servers. Mitigation: before a public release, mirror the source archives so the offer stays valid for as long as the GPL requires

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A sharp update changes a README licensing section | L | The pack check fails and names the package |
<!-- /ANCHOR:adr-004-consequences -->

---

<!-- ANCHOR:adr-004-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Redistributing ffmpeg triggers the GPL obligations of contract 10.4 |
| 2 | **Beyond Local Maxima?** | PASS | Two options scored |
| 3 | **Sufficient?** | PASS | Ten pack-time rules in `scripts/bundle/notices.ts` |
| 4 | **Fits Goal?** | PASS | Nothing packs without its notices |
| 5 | **Open Horizons?** | PASS | The Claude Code plugin ships the same bundles |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-004-five-checks -->

---

<!-- ANCHOR:adr-004-impl -->
### Implementation

**What changes**:
- `LICENSE`, `THIRD_PARTY_NOTICES`, `licenses/` and `licenses/ffmpeg-builds/`
- `scripts/bundle/notices.ts` and its test

**How to roll back**: Remove the added files; the build then refuses to pack, which is the intended state without notices.
<!-- /ANCHOR:adr-004-impl -->
<!-- /ANCHOR:adr-004 -->
