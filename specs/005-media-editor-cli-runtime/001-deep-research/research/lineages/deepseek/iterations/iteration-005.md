# Iteration 005 - Naming and placement hardening, plus the ranked change list

Focus: the kernel gate wording, the batch question template, the tool and field description text, batch-aware placement, the `maxBytes` decision, the guard decision, the new playbook scenarios, and the ranked change list for the four implementation phases. Unlike the earlier iterations, most of this focus has already landed in the working tree through phase 003, so each finding records the live text and the decision behind it.

Sources read this iteration: `claude project/Custom Instructions.md:140-200`, `AI Systems/Media Editor/AGENTS.md:35-45`, `:150-160`, `runtime/src/server/field-schemas.ts:40-120`, `runtime/src/tools/image/convert.ts:95-225`, `runtime/src/tools/image/compress.ts:200-215`, `runtime/src/core/output-folder.ts:195-235`, `:385-400`, `sk-media-editor/references/interactive-intelligence.md:45-140`, `sk-media-editor/references/tools.md:40-45`, `sk-media-editor/references/image-operations.md:44-75`, `sk-media-editor/SKILL.md:190-215`, `sk-media-editor/manual-testing-playbook/project-export-delivery/batch-naming-gate.md`, `manual-testing-playbook.md:20-90`, `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/spec.md:211-214`, `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/003-naming-and-placement-hardening/tasks.md:124`.

## Findings

1. The kernel gate landed in five places inside `claude project/Custom Instructions.md`: File Naming at `:145` now puts the proposed name "in the one question before the first writing call", writes only after confirmation, and demotes `media_rename` to "renames an existing result only when the user asks for that afterwards. Never write first and rename after." Export Protocol at `:149` defines "two or more inputs from one request, however many tool calls it takes", sends them to "the one place the user chose", and spells out the first call `subfolder: true` with `outputName` then later calls passing the returned folder name as `targetFolder`. ALWAYS 9 at `:165` and ESCALATE 1 at `:181` carry the same gate, with `:181` now firing on "the request is ambiguous or will write a file" and adding "A clear request that writes still gets this question." Strict Sequence steps 3 and 4 at `:194-195` split the ask from the call.

2. The batch question template landed in `sk-media-editor/references/interactive-intelligence.md`: the naming and placement rule at `:51`, the two-or-more line at `:111`, and a dedicated Batch question section at `:116-138` that "takes the place of the comprehensive question and is still one question". The file is byte-identical to `claude project/knowledge/Media Editor - System - Interactive Intelligence.md` per the `cmp` check in iteration 4, so the template reached both surfaces.

3. The field descriptions were rewritten in `runtime/src/server/field-schemas.ts`. `fileNameField` now reads "Propose it from the content and ask before the first writing call, never write first and rename after" and keeps the omission fallback. `subfolderField` now says "separate calls only share a folder through targetFolder". A new `targetFolderField` names "an existing numbered folder directly inside the export root, such as \"014 - webp-under-100kb\", exactly as an earlier call returned it" and states "It cannot be combined with subfolder false." The omission text no longer reads as permission.

4. Batch-aware placement landed as `targetFolder`, not multi-input `image_convert`. `runtime/src/core/output-folder.ts` resolves an existing numbered folder for a shared batch (`:387-397`) with three named failures, `targetFolderNamed` at `:200`, `targetFolderMissing` at `:212` and `targetFolderOutside` at `:224`, and the conflict check sits in the dispatcher at `runtime/src/core/dispatch.ts:135-144`. This is operator decision OD-2 (`001-deep-research/spec.md:212`), and it means one general primitive fixes every writing tool while `image_convert` stays single-input.

5. `maxBytes` landed for jpeg, webp and avif only. `runtime/src/tools/image/convert.ts:97-118` searches quality down to 1 and, when the target is unreachable, fails with a structured message naming the smallest size ("even quality 1 needs N bytes"), never resizing. The tool description at `:205-212` states "maxBytes caps the file size for jpeg, webp, and avif by lowering quality, never by resizing." This is operator decision OD-3 (`spec.md:213`).

6. No server guard against unconfirmed names, per operator decision OD-4 (`spec.md:214`). The decision stands because the server cannot tell a confirmed name from an invented one, and the friction would land on legitimate scripted calls and the existing tests. The hardening lives in the question, the field text and the playbook instead.

7. Both batch playbook scenarios exist and replay the live bug. `project-export-delivery/batch-naming-gate.md` (PED-001) asserts one question before four `image_convert` calls with `maxBytes` 100000, each with its own confirmed `fileName`, the first with `subfolder: true` and the rest with the returned `targetFolder`, all four in one folder, and its FAIL list includes "a second numbered folder appeared". `skill-export-delivery/batch-naming-gate.md` (SED-004) is the skill twin over the CLI runtime. The playbook index records them at `manual-testing-playbook.md:24`, `:58`, `:78` and `:88`, and both await grading in phase 006 because AC-005 is still open (`003-naming-and-placement-hardening/tasks.md:124`).

8. The Media Editor `AGENTS.md` carries the same gate in its own words: strict sequence step 2 at `:39` and the processing hierarchy row at `:155`, so the skill identity document and the kernel now state one question before the first writing call in the same terms.

9. The seven known causes of the live bug are each addressed, mapped one by one: the single-name wait is replaced by a gate covering every output file and the folder (`:145`, `:165`), ESCALATE 1 no longer waits for ambiguity (`:181`), several files per call is defined as two or more inputs from one request (`:149`), `media_rename` is demoted to a repair the user asks for (`:145`), the field text no longer presents omission as normal (finding 3), folder allocation can now target an existing numbered folder (finding 4), and a Project batch scenario exists (finding 7). The one thing the text cannot guarantee is the model's compliance, which is why the scenarios are the proof and they are still ungraded.

10. The skill-side text also carries the gate where the skill runs: `sk-media-editor/SKILL.md:194` (name proposal before the first write), `:198` (export blocking, one place for a batch, `targetFolder` flow), `:213` (ALWAYS 8) and `:300` (the tool group summary), and `sk-media-editor/references/tools.md:42-44` and `image-operations.md:46` and `:72` catalogue `targetFolder` and the one-question batch rule for the tool caller. All of these files are mirrored byte-identically per iteration 4.

## The ranked change list

Ranked by value if landed early, with the phase and the live status on each line. The phase order is forced by dependency: a path citation needs the rename, a playbook scenario describes the hardened behavior, and the skill cannot route to a CLI that does not exist yet.

Phase 1, rename `mcp server/` to `runtime/` (packet 002, complete in the working tree, staged and uncommitted)

1. `[done]` The rename itself in the nested repository. `git status --short` shows the `RM "mcp server/..." -> runtime/...` entries, 152 pure renames plus 77 renames with modifications.
2. `[done]` Repointed live references outside the folder, 75 mentions in 39 files per the 002 implementation summary, including `AGENTS.md`, `INSTALL-GUIDE.md`, `README.md`, `SYNC.md`, `USER-GUIDE.md`, `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md`, `claude project/knowledge/Media Editor - Reference - Setup.md`, `sk-media-editor/README.md`, `sk-media-editor/SKILL.md`, `sk-media-editor/references/setup.md`, `sk-media-editor/references/tools.md`, and the playbook scenarios `skill-route-order/connected-tools-first.md`, `skill-tool-verification/error-code-handoff.md` and `skill-export-delivery/readable-name-proposal.md`.
3. `[done]` One dated `SYNC.md` entry. Historical changelog files and dated SYNC lines keep the old name as records.
4. `[remaining]` Commit the staged rename in the nested repository. It is the only Phase 1 item left.

Phase 2, naming and placement hardening (packet 003, complete except the graded replies)

1. `[done]` `claude project/Custom Instructions.md` five edits at `:145`, `:149`, `:165`, `:181` and `:194-195`.
2. `[done]` `sk-media-editor/references/interactive-intelligence.md` batch question, and the mirror `claude project/knowledge/Media Editor - System - Interactive Intelligence.md`.
3. `[done]` `runtime/src/server/field-schemas.ts` fileName, subfolder and the new targetFolder field.
4. `[done]` `runtime/src/core/output-folder.ts` targetFolder resolution and its three named failures, `runtime/src/server/tool-context.ts` placement plumbing, `runtime/src/core/dispatch.ts` conflict check.
5. `[done]` `runtime/src/tools/image/convert.ts` maxBytes and description, `runtime/src/tools/image/compress.ts` description.
6. `[done]` `sk-media-editor/references/tools.md`, `image-operations.md`, `video-and-audio-operations.md` and `sk-media-editor/SKILL.md`, with the mirror copies in `claude project/knowledge/`.
7. `[done]` `AI Systems/Media Editor/AGENTS.md` strict sequence and processing table.
8. `[done]` New scenarios `manual-testing-playbook/project-export-delivery/batch-naming-gate.md` and `skill-export-delivery/batch-naming-gate.md`, index rows in `manual-testing-playbook.md`, and `benchmark/grader/twin_divergence.py` unpaired ids.
9. `[remaining]` AC-005 graded real replies, deferred to phase 006.

Phase 3, build the CLI (packet 004, in flight, untracked)

1. `[in tree]` `runtime/src/core/dispatch.ts`, `runtime/src/cli.ts`, `runtime/src/core/probe-cache.ts`.
2. `[in tree]` `runtime/package.json` bin `media-editor` beside `media-editor-mcp`.
3. `[in tree]` `runtime/scripts/build-plugin.ts` cli.js check and the bin shims, with `runtime/scripts/build-bundle.ts` unchanged because dist is staged whole.
4. `[in tree]` `runtime/tests/cli/cli-process.vitest.ts`, `runtime/tests/cli/dispatch.vitest.ts`, `runtime/tests/cli/pinned-smoke.vitest.ts`, `runtime/tests/core/probe-cache.vitest.ts`.
5. `[remaining]` Finish and run the phase tests, update `runtime/tests/packaging/build-plugin.vitest.ts` and the other packaging tests for the CLI payload, and close the 004 acceptance criteria.

Phase 4, move the skill to the CLI (packet 005, not started)

1. `sk-media-editor/SKILL.md` route order and the `media-editor health` tool check, plus a new `sk-media-editor/references/cli.md`.
2. `sk-media-editor/references/setup.md` and its mirror `claude project/knowledge/Media Editor - Reference - Setup.md`, with one section per surface.
3. `sk-media-editor/references/tools.md` route statement and its mirror, kept transport-neutral.
4. `sk-media-editor/references/router-contract.md` `choose_route`, the kernel Section 8 copy, and the `systems.py:1680` statement with its key.
5. `benchmark/router/route_contract.py`, `benchmark/router/differential.py` host states and bind, `benchmark/gates/rule_parity.py` phrases and `min_pairs`, `benchmark/grader/twin_divergence.py` twin re-scope.
6. Playbook `skill-route-order/connected-tools-first.md`, `skill-route-order/fallback-to-local-ffmpeg.md`, `project-route-order/connected-tools-in-desktop.md`, and the CLI runtime rewording in `skill-export-delivery/export-root-no-subfolder.md`, `skill-identity-handover/identity-handover.md` and `project-guidance-delivery/chat-guidance-delivery.md`.
7. `AI Systems/z - Claude Project Sync Loop/systems.py`: `references/cli.md` into `unmirrored_sources` and the header statement at `:1290` rewritten.
8. `runtime/claude-plugin/.claude-plugin/plugin.json` without `mcpServers`, and `runtime/claude-plugin/README.md` rewritten for the CLI delivery.
9. `sk-media-editor/README.md`, `USER-GUIDE.md` and `INSTALL-GUIDE.md` CLI wording.

Phase 5 of the packet, verify and release (006, after 005): grade AC-005 with real replies, grade SED-004 and PED-001, run the release checks, and refresh the changelog.

## Ruled Out

1. A hard server guard that refuses a writing call with no `fileName`, because the server cannot tell a confirmed name from an invented one and the friction lands on every legitimate call, per OD-4.
2. `maxBytes` as a hard guarantee, because at some quality floor WebP cannot hit an arbitrary byte target, and the structured failure is the honest contract, per OD-3.
3. Multi-input `image_convert` in place of `targetFolder`, because one placement primitive fixes every writing tool while a multi-input handler fixes one, per OD-2.
4. A rule that forbids `subfolder: true` on a batch, because a numbered folder is a legitimate choice and the defect was the inconsistency across calls.
5. Relying on the model to notice that `subfolder` was omitted on later calls, because the live failure shows it did not.
6. A soft guard that warns on omission, because neither the MCP server nor a one-process CLI has request identity.

## Edge Cases

- Partial success: the hardening is landed but AC-005 is open and the two batch scenarios are ungraded, so the gate's compliance is designed and documented rather than proven. Recorded in findings 7 and 9.
- Contradictory evidence: none this iteration. The kernel, the field schemas, the tool text and the playbook all state the same gate.

## Sources Consulted

- `AI Systems/Media Editor/claude project/Custom Instructions.md:140-200`
- `AI Systems/Media Editor/AGENTS.md:35-45`, `:150-160`
- `AI Systems/Media Editor/runtime/src/server/field-schemas.ts:40-120`
- `AI Systems/Media Editor/runtime/src/tools/image/convert.ts:95-225`
- `AI Systems/Media Editor/runtime/src/core/output-folder.ts:195-235`, `:385-400`
- `AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md:45-140`
- `AI Systems/Media Editor/sk-media-editor/references/tools.md:40-45`
- `AI Systems/Media Editor/sk-media-editor/references/image-operations.md:44-75`
- `AI Systems/Media Editor/sk-media-editor/SKILL.md:190-215`, `:300`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/project-export-delivery/batch-naming-gate.md:1-35`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/manual-testing-playbook.md:20-90`
- `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/spec.md:211-214`
- `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/003-naming-and-placement-hardening/tasks.md:124`

## Assessment

- New information ratio: 0.7
- Questions addressed: how the naming and placement gate was hardened so a batch gets confirmed names and one place, and the ranked change list for the four phases.
- Questions answered: how the naming and placement gate was hardened so a batch gets confirmed names and one place, and the ranked change list for the four phases.

## Reflection

- What worked: reading the live kernel and field text instead of replaying the dispatch packet's stale line numbers, because the hardening had already landed and every one of the seven known causes could be mapped to a landed fix.
- What did not work: nothing failed this iteration.
- What I would do differently: grade at least one scenario's static expectations here if the write surface allowed it, because the remaining risk is compliance, not design.

## Recommended Next Focus

None. The loop reached its iteration cap. The synthesis is written to `research.md`, and the remaining proof work belongs to phase 006.
