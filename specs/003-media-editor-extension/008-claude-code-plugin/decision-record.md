---
title: "Decision Record: Phase 8: Claude Code plugin"
description: "Whether the plugin's mcpServers entry references the MCPB bundle or inlines a node command, settled by a spike on Node availability in Claude Code."
trigger_phrases:
  - "claude code plugin decisions"
  - "mcpServers bundle reference"
  - "inline server config node"
  - "node runtime spike"
  - "decision record"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-media-editor-extension/008-claude-code-plugin"
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
# Decision Record: Phase 8: Claude Code plugin

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- HVR_REFERENCE: .skilled/skills/sk-doc/sk-create-with-human-voice/references/hvr-rules.md -->

---

<!-- ANCHOR:adr-001 -->
## ADR-001: Reference the bundle, with an inline node config as the fallback

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted, inline branch |
| **Date** | 2026-09-29 |
| **Deciders** | Orchestrator with the operator, after the spike |

---

<!-- ANCHOR:adr-001-context -->
### Context

Claude Code plugin `mcpServers` accepts a `.mcpb` path or https URL and extracts it to `.mcpb-cache/`, and `claude plugin validate` checks it (code.claude.com/docs/en/plugins-reference). Claude Desktop ships Node for node-type bundles. Nothing read for this spec says whether Claude Code does the same.

### Constraints

- One server build shared with the Desktop bundles
- No Node install asked of users if avoidable
- Bundle hosting: local files for now, by the operator on 2026-09-28
<!-- /ANCHOR:adr-001-context -->

---

<!-- ANCHOR:adr-001-decision -->
### Decision

**We chose**: Reference the phase 7 bundle from `mcpServers` if the spike shows Claude Code runs node-type bundles without a system Node. Otherwise, inline a server config that runs `node server/index.js` from the plugin folder and state Node 18 or later as a requirement.

**How it works**: The spike (T001) installs a test plugin that references the darwin-arm64 bundle, removes `node` from `PATH` and starts a session, and the outcome selects the branch.

**Spike result, 2026-09-29, Claude Code 2.1.284 on darwin-arm64.** Each run was `claude --plugin-dir <plugin> mcp list`, with `PATH` limited to a folder holding only `claude` plus `/usr/bin:/bin:/usr/sbin:/sbin` for the runs without Node.

| Plugin `mcpServers` | Node on `PATH` | Result |
|---|---|---|
| `./media-editor-darwin-arm64.mcpb` (folder setting required) | No, then yes | Extracted into `.mcpb-cache/`, but the server is not listed at all: no saved value for the required setting |
| The same bundle with the folder setting optional | No | `node .../dist/index.js --output-dir ${user_config.output_directory} ${DESKTOP}` and `Failed to connect: ENOENT: Executable not found in $PATH` |
| The same | Yes | Connected, with both placeholders passed through literally, so the server has no usable folder |
| Inline `node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js ${CLAUDE_PROJECT_DIR}` | Yes | Connected, both variables expanded to absolute paths |

Claude Code does not supply Node for a node-type bundle, and it fills neither the bundle's `user_config` nor its `${DESKTOP}` default. So the inline branch applies. The plugin carries the unpacked server for one target in `server/`, runs `node` from `PATH`, passes the session's project folder as the one allowed root, and points `MEDIA_EDITOR_DATA_DIR` at `${CLAUDE_PLUGIN_DATA}`, so a consented `media_setup_ffmpeg` install survives plugin updates. The Node floor is the package's own `engines` value, 20.9.0, not the 18 this record first assumed.
<!-- /ANCHOR:adr-001-decision -->

---

<!-- ANCHOR:adr-001-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Bundle reference, inline config as fallback** | One artifact for both products, no Node install if Claude Code supplies it | Remote installs need a hosted URL | 8/10 |
| Inline config always | No dependency on bundle handling | Users need Node, and the plugin duplicates the server files | 6/10 |
| Bundle reference only | Simplest manifest | Fails outright if Claude Code has no Node | 4/10 |

**Why this one**: It uses the documented `.mcpb` support where it works and keeps a known path where it does not.
<!-- /ANCHOR:adr-001-alternatives -->

---

<!-- ANCHOR:adr-001-consequences -->
### Consequences

**What improves**:
- Claude Desktop and Claude Code run the same bundle
- Plugin updates follow bundle releases

**What it costs**:
- Two possible configs. Mitigation: the spike picks one before any plugin file is written

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| The spike result differs across Claude Code versions | M | Record the CLI version with the result |
| A URL reference waits for public hosting | M | Local bundle path, chosen by the operator |
<!-- /ANCHOR:adr-001-consequences -->

---

<!-- ANCHOR:adr-001-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Node supply in Claude Code is unverified |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One `mcpServers` entry either way |
| 4 | **Fits Goal?** | PASS | The plugin is the Claude Code install path |
| 5 | **Open Horizons?** | PASS | A URL can replace the local path later |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-001-five-checks -->

---

<!-- ANCHOR:adr-001-impl -->
### Implementation

**What changes**:
- `claude-plugin/.claude-plugin/plugin.json` `mcpServers` entry
- `claude-plugin/README.md` requirements

**How to roll back**: Switching branches is one `mcpServers` entry plus one README line.
<!-- /ANCHOR:adr-001-impl -->
<!-- /ANCHOR:adr-001 -->

---

<!-- ANCHOR:adr-002 -->
## ADR-002: Follow one redirect, only to the host the pinned row names

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-09-29 |
| **Deciders** | Michel Kerkmeester (operator), on the orchestrator's recommendation |

---

<!-- ANCHOR:adr-002-context -->
### Context

Contract 3.4 step 4 made any redirect a `DOWNLOAD_FAILED`, so that no host other than the pinned one is ever contacted. A `curl -I` on all ten pinned URLs on 2026-09-29 found the two martin-riedl.de files answering 200 and all eight GitHub release files answering 302 to `release-assets.githubusercontent.com` with a signed query string that expires. Pinning the target URL is not possible, so under the rule as written `media_setup_ffmpeg` could install on darwin-arm64 only.

### Constraints

- The approved contract binds until the operator amends it
- The archive and binary digests stay the trust anchor
- No host the pinned row does not name may be contacted
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: Each pinned row names at most one `redirectHost`. The download follows one `https` redirect whose `Location` host equals it exactly, and the second response must be a 200. The GitHub rows name `release-assets.githubusercontent.com`, and the martin-riedl.de rows name none.

**How it works**: `fetch` runs with `redirect: 'manual'`, so the server sees the 302 and checks its `Location` before any second request. Any other redirect, a second hop, or a redirect from a row with no host is `DOWNLOAD_FAILED` with `reason: "redirect"`. The body is still capped at the pinned size and checked against both digests. The plan rows the user sees before consenting include `redirectHost`. Contract 3.4, the section 5 row and the change log were amended the same day.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **One named redirect host per row** | Setup works on all five platforms; the digests still decide trust | One more host is contacted than the pinned one | 9/10 |
| Mirror the eight files on an operator host | Keeps the no-redirect rule | Needs hosting that does not exist yet; setup blocked meanwhile | 5/10 |
| Keep the rule; setup on darwin-arm64 only | No contract change | Four platforms cannot recover from a missing ffmpeg | 3/10 |

**Why this one**: The rule's purpose is that no unexpected host serves the file, and a digest mismatch already rejects any file a host could substitute. Naming the one host keeps that purpose and makes setup usable everywhere.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- `media_setup_ffmpeg` can install on every pinned platform
- The user sees both hosts before consenting

**What it costs**:
- One more field per pinned row. Mitigation: a test checks each row's host against its URL

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub moves release assets to another host | M | The redirect fails with `reason: "redirect"`; updating one constant fixes it |
| A compromised asset host serves other bytes | L | The archive and binary digests reject them before anything is installed |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | Eight of ten pinned URLs redirect |
| 2 | **Beyond Local Maxima?** | PASS | Three options scored |
| 3 | **Sufficient?** | PASS | One field and one hop cover every row |
| 4 | **Fits Goal?** | PASS | Setup is the fallback for a missing ffmpeg on every target |
| 5 | **Open Horizons?** | PASS | A mirror can later set `redirectHost` to null |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `src/core/pinned-builds.ts` gains `redirectHost` per row
- `src/core/artifact-download.ts` enforces the one-hop rule
- `001-tool-contract/contract.md` 3.4, section 5 and the change log

**How to roll back**: Set every `redirectHost` to null, and the download refuses all redirects again.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->
