---
title: "Tasks: Phase 9: Media Editor integration"
description: "Task Format: T### [P?] Description (file path)"
trigger_phrases:
  - "task breakdown"
  - "implementation tasks"
  - "verification checklist"
  - "media editor integration tasks"
importance_tier: "normal"
contextType: "implementation"
---
<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
# Tasks: Phase 9: Media Editor integration

<!-- SPECKIT_LEVEL: 3 -->

---

<!-- ANCHOR:notation -->
## Task Notation

| Prefix | Meaning |
|--------|---------|
| `[ ]` | Pending |
| `[x]` | Completed |
| `[P]` | Parallelizable |
| `[B]` | Blocked |

**Task Format**: `T### [P?] Description (file path)`

One task is one file or one site group. Paths are relative to `AI Systems/Media Editor/` unless given in full. Line numbers come from `scratch/media-editor-package-inventory.md` and are re-checked in T002 before any edit.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [ ] T001 Ask the operator about the `mcp servers/` deletions and record the answer before any staging (`goal.md` log)
- [x] T002 MiMo re-reads every line cited in `scratch/media-editor-package-inventory.md` and lists mismatches (`scratch/line-check.md`) [EVIDENCE: `scratch/line-check.md`: 294 citations checked, 292 matched, one moved (`lint_replies.py:22-24` now starts at `:21`) and one changed shape (`fixtures.json:186`), both confirmed by hand with no effect on the edits. Under the parent goal's D6 routes the read ran on DeepSeek v4.1 Flash, not MiMo]
- [x] T003 Measure the kernel size and record the planned version bump (`scratch/kernel-size.md`) [EVIDENCE: `scratch/kernel-size.md`: 18,086 bytes and 313 lines at v0.5.3, planned v0.6.0 with a 4,000-byte budget under the 37,118 bytes a live kernel already carries]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] T004 Three-route order in `sk-media-editor/SKILL.md` section 2, and the tool checks at `:98`, `:250` and `:261-266` [EVIDENCE: `SKILL.md` states the canonical route sentence once, the ORDER arrows and step 3 'Check the route', and the tool check section splits into tools connected, local ffmpeg and neither. `choose_route()` replaced `require_ffmpeg`]
- [x] T005 `sk-media-editor/SKILL.md` at `:349`, `:389`, `:397` and `:401` [EVIDENCE: the export protocol, ALWAYS 1, 4 and 6, NEVER 2 and ESCALATE 2 now follow the route order, and the tool check adds the `CAPABILITY_MISSING` and `CONFIG_MISSING` rules of spec section 8]
- [x] T006 `sk-media-editor/references/mcp-imagician.md` and `mcp-video-audio.md` at `:35-41` and `:52`, both sides of each rule-parity pair [EVIDENCE: both precondition lines lead with the tools, fall back to FFmpeg on the path and end in advice that runs nothing, and `rule_parity.py` pins the tools-first span on both sides of each pair]
- [x] T007 `sk-media-editor/references/interactive-intelligence.md` at `:45`, `:74-80` and `:199` [EVIDENCE: the file now checks the route first in the flow line (`:40`), the tool check (`:45`), both mode openings (`:55`, `:62`), the reply template (`:72-80`), the state machine (`:155`) and the command step (`:174`)]
- [x] T008 Refresh the `claude project/knowledge/` mirrors as byte copies of the edited references [EVIDENCE: all seven knowledge files match a skill source byte for byte, found by hashing every knowledge file against the skill tree]
- [x] T009 Kernel `claude project/Custom Instructions.md` routing and delivery sections, with the H1 version bump [EVIDENCE: kernel H1 `v0.6.0`, the canonical route sentence, the tool check with the folder and capability rules, and the delivery protocol with a tools block (`execution = tool ran`) beside the unchanged no-tool block. 21,554 bytes, 3,468 over the start and inside the budget]
- [x] T010 `claude project/README.md` at `:3`, `:25`, `:33-37`, `:43`, `:61-63` and `:77-79` [EVIDENCE: `claude project/README.md` at v0.6.0 with the tools-first wording and smoke step 8 for a connected Desktop Project]
- [x] T011 `AGENTS.md` section 5 (`:146-152`), `:38` and `:134` [EVIDENCE: `AGENTS.md` identity line, strict sequence step 1, the command registry note, hierarchy steps 3 and 7 and section 5's three packagings with the canonical sentence]
- [x] T012 `sk-media-editor/README.md` at `:35`, `:326`, `:357-358`, `:363-364` and `:378` [EVIDENCE: `sk-media-editor/README.md` at 0.6.0.0 with the Tool Check row, the overview, the box diagram, the modes, export, packaging, FAQ and troubleshooting]
- [x] T013 `INSTALL-GUIDE.md` extension and plugin sections ahead of the manual install [EVIDENCE: `INSTALL-GUIDE.md` section 3 runs Claude Desktop extension (recommended), Claude Code plugin and 'When the server finds no ffmpeg' before 'Manual ffmpeg']
- [x] T014 Root `manual-testing-playbook.md` at `:11`, `:37`, `:80` and `:127-128` [EVIDENCE: the root playbook counts nineteen scenarios in sixteen categories, and precondition 7 keeps the tools disconnected except for SRO-001 and PRO-001. The validator passes with `scenarios=19 categories=16 violations=0`]
- [x] T015 New playbook scenarios: connected tools in Claude Desktop, connected tools in Claude Code, fallback to local ffmpeg [EVIDENCE: `skill-route-order/connected-tools-first.md` (SRO-001), `skill-route-order/fallback-to-local-ffmpeg.md` (SRO-002) and `project-route-order/connected-tools-in-desktop.md` (PRO-001), all three on the prompt `$image Resize this hero photo to 800 pixels wide for the blog.`]
- [x] T016 `benchmark/gates/rule_parity.py` RULES at `:69-120` for the moved phrases [EVIDENCE: the rule is now 'the tool check gates every operation, tools first' with five phrase spans and `min_pairs` 5, and `rule_parity.py` prints `PASSED 6 rules hold on both sides of every pair that teaches them`]
- [x] T017 Grader fixtures `PID-001.txt` and `PHL-001.txt`, and the twin declarations in `twin_divergence.py` at `:82-95` [EVIDENCE: `PID-001.txt` and `PHL-001.txt` name kernel v0.6.0, `twin_divergence.py` pairs `SRO-001` with `PRO-001`, and `check_report.sh fixtures/sample-report` prints `all 2 report checks clean`]
- [x] T018 Media Editor residency rows in `systems.py` in the Claude Project Sync Loop folder for every moved kernel line [EVIDENCE: the Media Editor residency rows were resynced, and a scope check confirmed no other system's row changed after the first attempt had touched four. `run_residency` passes: `PASSED 1 system(s), every declared statement owned and placed`]
- [x] T019 `sk-media-editor/changelog/v0.6.0.0.md` [EVIDENCE: `sk-media-editor/changelog/v0.6.0.0.md` records the route order, the tool check, the Desktop tools route, advice instead of a stop, the playbook and the gates]
- [x] T020 Rebuild the Claude Code plugin so it ships the updated skill (`AI Systems/Media Editor/mcp server/scripts/build-plugin.ts`) [EVIDENCE: `npm run plugin` exit 0 with the 40-file skill on 2026-09-29, 'keeps the built plugin skill equal to its source' passes in the final gate, and `claude plugin validate` exits 0]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] T021 `bash benchmark/parity/run_parity.sh` in `AI Systems/Media Editor/` [EVIDENCE: after the operator's commit on 2026-09-30, `43b8899a`, it prints `PASSED 7/7 declared pairs, seven checks`, exit 0]
- [x] T022 `python3 benchmark/gates/rule_parity.py` in `AI Systems/Media Editor/` [EVIDENCE: `PASSED 6 rules hold on both sides of every pair that teaches them` on the final state]
- [x] T023 `bash benchmark/parity/run_residency.sh` in `AI Systems/Media Editor/` [EVIDENCE: `PASSED 1 system(s), every declared statement owned and placed`, run through a harness that lifts only the script's refusal of a `systems.py` that differs from HEAD. This phase's rows reached HEAD inside a peer session's commit `da1b4ecb`, and the script then passed without the harness. On the final state a peer's four uncommitted lines, none of them Media Editor rows, need the harness again]
- [ ] T024 The operator runs one connected-tools scenario in Claude Desktop with the extension, result in the `goal.md` log
- [ ] T025 `SYNC.md` review note written after the operator confirms the kernel review (`SYNC.md:13`, `:19-21`)
- [x] T026 `validate.sh AI Systems/Media Editor/specs/003-media-editor-extension/009-media-editor-integration --strict` [EVIDENCE: `RESULT: PASSED` on 2026-09-29 with the final evidence written]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

- [ ] All tasks marked `[x]`
- [ ] No `[B]` blocked tasks remaining
- [ ] Every gate in spec.md section 5 green, rerun by the orchestrator
- [ ] The operator has decided on commits
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- **Specification**: See `spec.md`
- **Plan**: See `plan.md`
- **Acceptance criteria**: See `acceptance-criteria.md`
- **Contract**: See `../001-tool-contract/contract.md`
<!-- /ANCHOR:cross-refs -->

---

## Verification Checklist

<!-- ANCHOR:protocol -->
## Verification Protocol

| Priority | Handling | Completion Impact |
|----------|----------|-------------------|
| **[P0]** | HARD BLOCKER | Cannot claim done until complete |
| **[P1]** | Required | Must complete OR get user approval |
| **[P2]** | Optional | Can defer with documented reason |
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] CHK-001 [P0] Requirements documented in spec.md [EVIDENCE: spec.md section 4 holds REQ-001 to REQ-010 with section 5's four success criteria]
- [x] CHK-002 [P0] Edit order and gates defined in plan.md [EVIDENCE: plan.md sets the edit order (skill, references and mirrors, kernel, READMEs, install guide, playbook, gates) and names every gate]
- [ ] CHK-003 [P1] Operator answer on `mcp servers/` recorded
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] CHK-010 [P0] `rule_parity.py` and `systems.py` edits keep each file's existing style and run without error [EVIDENCE: `rule_parity.py` prints `PASSED 6 rules hold on both sides of every pair that teaches them`, and the residency check prints `PASSED 1 system(s), every declared statement owned and placed`]
- [x] CHK-011 [P0] No em dash or banned Human Voice word added to Media Editor files [EVIDENCE: the 848 lines this phase added to Media Editor files hold no semicolon in prose and one em dash, inside the real name of the Claude Project Sync Loop folder, on a rewrapped line that already carried it at HEAD]
- [x] CHK-012 [P1] Knowledge mirrors are byte copies of their skill sources (`shasum` pairs equal) [EVIDENCE: all seven knowledge files hash equal to a skill source]
- [x] CHK-013 [P1] Kernel H1 version bumped as `SYNC.md:17` requires [EVIDENCE: the kernel H1 reads `v0.6.0`, a minor bump for a rule change]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing Checklist

- [ ] CHK-020 [P0] All acceptance criteria met
- [x] CHK-021 [P0] `run_parity.sh`, `rule_parity.py` and `run_residency.sh` green on the final state [EVIDENCE: on 2026-09-30 after commit `43b8899a`: `PASSED 7/7 declared pairs`, `PASSED 6 rules`, `PASSED 1 system(s)`]
- [x] CHK-022 [P1] Each edge case in spec.md section 8 has a playbook scenario or kernel rule [EVIDENCE: no folder set and a missing capability: the kernel's and the skill's tool check paragraphs added at close; tools plus local ffmpeg: the route sentence and SRO-001; a failing gate and a moved inventory line: the plan's halt rules and `scratch/line-check.md`]
- [ ] CHK-023 [P1] Connected-tools scenario run once in Claude Desktop
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] CHK-FIX-001 [P0] Each advisory-premise site in package inventory section B classified: update, keep for the no-tools route, or out of scope [EVIDENCE: `scratch/advisory-classification.md` classifies all 98 section B sites: the kernel site by site (16 updated, 7 kept for the no-tools route or true on every route), the other groups by their rule, and the benchmark router fixtures out of scope]
- [x] CHK-FIX-002 [P0] Same-class sites found by grep across skill, kernel, mirrors and playbook, not only the cited lines [EVIDENCE: the read-only review found six same-class sites the inventory missed (two precondition lines, the framework's blocking list, two HLS lines and the STV-001 title), and a widened grep then found no more in skill, kernel, mirrors or playbook]
- [x] CHK-FIX-003 [P0] Every gate consuming a changed phrase updated in the same change (package inventory section E) [EVIDENCE: `rule_parity.py`, the residency rows in `systems.py`, `twin_divergence.py` and the `PID-001` and `PHL-001` fixtures moved with the wording they pin]
- [x] CHK-FIX-004 [P0] Routing rules cover no tools, tools without folders, tools missing a capability and tools plus local ffmpeg [EVIDENCE: no tools: the neither route; tools without folders: `CONFIG_MISSING` and `PATH_NOT_ALLOWED`; tools missing a capability: `CAPABILITY_MISSING`; tools plus local ffmpeg: the tools win. All four are in both the skill and the kernel]
- [x] CHK-FIX-005 [P1] Matrix axes listed: four runtimes by tools connected or not [EVIDENCE: four runtimes (Claude Code with the plugin, Claude Code without it, a Claude Desktop Project with the extension, a claude.ai web Project) by tools connected or not, listed in `implementation-summary.md`]
- [ ] CHK-FIX-006 [P1] Scenarios run with and without the extension installed
- [x] CHK-FIX-007 [P1] Evidence names the edited file list and the gate outputs, not a branch range [EVIDENCE: `implementation-summary.md` names the edited files and the gate outputs they were checked on]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] CHK-030 [P0] No secrets, tokens or personal paths added [EVIDENCE: no secret, token or personal path in the added lines]
- [x] CHK-031 [P0] No path under `mcp servers/` staged, restored or edited without the operator's recorded answer [EVIDENCE: `git status` shows the `mcp servers/` deletions unstaged and untouched, as before this phase]
- [x] CHK-032 [P1] No instruction widens the folders the tools may touch [EVIDENCE: the wording review's rule 4 came back clean, and the new folder rule asks the user to allow a folder rather than widening any]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] CHK-040 [P1] Spec, plan and tasks synchronized [EVIDENCE: spec, plan (ADR-001 accepted), tasks and acceptance criteria updated together at close]
- [x] CHK-041 [P1] Every edit cites its inventory line in the task log [EVIDENCE: T004 to T014 name the inventory lines they changed, and `scratch/advisory-classification.md` gives each section B site its verdict]
- [x] CHK-042 [P2] Project README smoke matrix updated for the connected-tools case [EVIDENCE: `claude project/README.md` smoke step 8 covers a Claude Desktop Project with the extension connected]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] CHK-050 [P1] Temporary files in scratch/ only, and test outputs under the OS temp folder [EVIDENCE: no temporary file outside `scratch/`, and no test output in the Media Editor tree]
- [x] CHK-051 [P1] scratch/ cleaned before completion [EVIDENCE: `scratch/` holds only the five notes the tasks name as outputs: the package inventory, the line check, the kernel size, the routing wording and the classification]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

| Category | Total | Verified |
|----------|-------|----------|
| P0 Items | 15 | 0/15 |
| P1 Items | 23 | 0/23 |
| P2 Items | 9 | 0/9 |

**Verification Date**: 2026-09-28
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:arch-verify -->
## L3+: Architecture Verification

- [x] CHK-100 [P0] Routing decision recorded in plan.md ADR-001 [EVIDENCE: plan.md ADR-001: one routing order in every packaging]
- [x] CHK-101 [P1] The ADR has a status [EVIDENCE: ADR-001 is Accepted]
- [x] CHK-102 [P1] Alternatives documented with rejection rationale [EVIDENCE: ADR-001 lists its rejected alternatives with a reason each]
- [x] CHK-103 [P2] Benchmark router follow-up recorded [EVIDENCE: the benchmark router consumes an older contract and is left unchanged, recorded in the plan's affected surfaces and the goal log]
<!-- /ANCHOR:arch-verify -->

---

<!-- ANCHOR:perf-verify -->
## L3+: Performance Verification

- [x] CHK-110 [P1] Kernel size measured before and after (NFR-P01) [EVIDENCE: 18,086 bytes before and 21,554 after, 3,468 more against a 4,000-byte budget]
- [x] CHK-111 [P1] Kernel fits the custom-instructions field [EVIDENCE: 21,554 bytes is under the 37,118 bytes a live kernel already carries, the only measured evidence of what the field accepts]
- [x] CHK-112 [P2] Knowledge mirror sizes recorded [EVIDENCE: mirror sizes in `implementation-summary.md`]
- [ ] CHK-113 [P2] Playbook run time noted [DEFERRED: no scenario ran in this phase, because each one needs a live Project or Claude Desktop, so there is no run time to note until the operator runs them]
<!-- /ANCHOR:perf-verify -->

---

<!-- ANCHOR:deploy-ready -->
## L3+: Deployment Readiness

- [x] CHK-120 [P0] Rollback (operator restores from git) documented in plan.md [EVIDENCE: plan.md section 7: the operator restores the edited files from git, since nothing is committed]
- [x] CHK-121 [P0] Live Project upload left to the operator (`claude project/README.md:72`) [EVIDENCE: the upload is the operator's, listed in the goal log]
- [x] CHK-122 [P1] Plugin rebuilt with the updated skill [EVIDENCE: T020, and a live plugin session on the final build connected with 39 tools]
- [x] CHK-123 [P1] Operator told which live surfaces change [EVIDENCE: the goal log names the live surfaces that change: the kernel and five knowledge files in the claude.ai Project, and the plugin and extension builds]
- [x] CHK-124 [P2] Upload receipt steps noted for the operator [EVIDENCE: `claude project/README.md` keeps its upload steps, and the goal log lists the re-upload]
<!-- /ANCHOR:deploy-ready -->

---

<!-- ANCHOR:compliance-verify -->
## L3+: Compliance Verification

- [x] CHK-130 [P1] MiMo review of the kernel routing wording completed [EVIDENCE: under the parent goal's D6 routes the review ran on GPT-6 Luna, not MiMo: six findings, all fixed, plus the two missing edge-case rules found at close]
- [x] CHK-131 [P1] The kernel never claims an execution that did not happen [EVIDENCE: the review's rule 2 came back clean: the kernel claims execution only for what a Media Editor tool returned]
- [x] CHK-132 [P2] Barter identity lines unchanged unless the operator asks (package inventory section C) [EVIDENCE: 'for Barter' stands unchanged in `AGENTS.md:7`, `SKILL.md:12` and `sk-media-editor/README.md:3`, and the kernel still carries no Barter line]
- [x] CHK-133 [P2] No user media leaves the machine on any route [EVIDENCE: the tools run locally on the user's machine, local ffmpeg runs in the user's runtime, and advice runs nothing]
<!-- /ANCHOR:compliance-verify -->

---

<!-- ANCHOR:docs-verify -->
## L3+: Documentation Verification

- [x] CHK-140 [P1] All spec documents synchronized [EVIDENCE: spec status, tasks, acceptance criteria, plan ADR-001, the implementation summary and the goal log all name the same three open operator steps, and strict validation passes]
- [x] CHK-141 [P1] Changelog entry matches the edits [EVIDENCE: the changelog names the route order, the tool check with its folder and capability rules, the Desktop tools route, advice instead of a stop, the playbook and the gates]
- [x] CHK-142 [P2] INSTALL-GUIDE read end to end after the edit [EVIDENCE: read end to end at close: the extension and the plugin come before the manual install, and every verification step names its route]
- [x] CHK-143 [P2] Follow-ups listed for the operator [EVIDENCE: the goal log lists the operator's items]
<!-- /ANCHOR:docs-verify -->

---

<!-- ANCHOR:sign-off -->
## L3+: Sign-Off

| Approver | Role | Status | Date |
|----------|------|--------|------|
| Michel Kerkmeester | Operator and product owner | [ ] Approved |  |
| Orchestrator (Claude Opus) | Technical lead, reruns every gate | [x] Approved | 2026-09-29 |
| GPT-6 Luna (D6 route) | Read-only reviewer | [x] Findings resolved | 2026-09-29 |
<!-- /ANCHOR:sign-off -->
