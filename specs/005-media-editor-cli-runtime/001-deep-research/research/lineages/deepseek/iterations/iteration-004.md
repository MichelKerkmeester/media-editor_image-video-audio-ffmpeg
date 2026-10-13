# Iteration 004 - Skill and Project split

Focus: how the skill can rely on the CLI alone while the Claude Project stays on MCP, without breaking the byte-identical mirror pairs, and what that forces in the router contract, the differential host states, the rule-parity gate, the twin-divergence grader and the Sync Loop declaration. The proposed shape was tested rather than assumed: `references/tools.md` stays transport-neutral and mirrored, a new skill-only `references/cli.md` carries invocation, and `setup.md` keeps its pair.

Sources read this iteration: `sk-media-editor/SKILL.md`, `sk-media-editor/references/router-contract.md`, `sk-media-editor/references/setup.md`, the route-order playbook scenarios, `benchmark/router/route_contract.py`, `benchmark/router/differential.py`, `benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py`, the media-editor entry in `AI Systems/z - Claude Project Sync Loop/systems.py`, `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/005-skill-cli-only/spec.md` and the operator decisions in `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/spec.md:211-214`. Seven `cmp -s` checks were run.

## Findings

1. The skill is still MCP-first because phase 005 has not started. `sk-media-editor/SKILL.md:77` states the order as the Media Editor tools when connected, then locally installed ffmpeg, then advice, `:101` makes the tool check call `media_health`, and `:257` says the skill drives the tools first. `sk-media-editor/references/` holds seven files and `references/cli.md` is not one of them. The target state is written in `005-skill-cli-only/spec.md:49-52`: the tool check becomes `media-editor health`, the order becomes CLI then hand-written ffmpeg then advice, `references/cli.md` is added, and the plugin manifest loses its `mcpServers`.

2. All seven declared mirror pairs are byte-identical as of this reading, verified with `cmp -s` on each pair: `references/image-operations.md`, `references/video-and-audio-operations.md`, `assets/hls-video-conversion.md`, `references/tools.md`, `references/setup.md`, `references/interactive-intelligence.md` and `references/media-framework.md`. The pairs are declared at `systems.py:1252-1267`, and `references/router-contract.md` is the declared unmirrored exception at `:1271-1276` because the kernel's Router Code section is that file's Python with comments removed and `differential.py` holds the two equal.

3. `choose_route` is still tools-first at `sk-media-editor/references/router-contract.md:147-155`, and the kernel's copy at `systems.py:1680` carries the same body. The design that keeps the pair of copies equal is to add `media_cli_available()` as the first branch and bind it `False` in the Project host, the same way the existing two predicates are bound, so the kernel's code stays byte-identical modulo its comments.

4. `benchmark/router/differential.py:100-104` holds three host states on a two-boolean tuple, `bind_host` at `:314-317` writes the two predicates into the module dict, and `:322` unpacks two booleans. The change is a third boolean in the tuple, a `cli available` state, and a third binding. No schema change follows: `route` is not a contract field (`route_contract.py:87-90`, and `:236-238` rejects any key set that differs), so a fourth route value needs no `ROUTE_FIELDS`, `MODE_VALUES` or `TOOL_VALUES` change.

5. `benchmark/gates/rule_parity.py:71-95` carries the route rule "the tool check gates every operation, tools first" as five verbatim tools-first sentences with `min_pairs` 5, and its own comment explains why the rule needs five distinct phrases. A CLI-first rewrite must place the new sentences in paired files so both sides teach them, and raise `min_pairs` in the same change so a later silent removal cannot pass.

6. `benchmark/grader/twin_divergence.py:89-97` still pairs `SRO-001` with `PRO-001` as "tools connected in Claude Code and Claude Desktop". After the split the transports differ on purpose, CLI in Claude Code and MCP in the Desktop, so the pair should assert the deliverable while the route assertion moves to the unpaired sets. `UNPAIRED_IDS` at `:101-105` already lists `SED-004` and `PED-001`.

7. The two new batch-naming-gate scenarios exist from phase 003: `sk-media-editor/manual-testing-playbook/skill-export-delivery/batch-naming-gate.md` and `project-export-delivery/batch-naming-gate.md`, and `twin_divergence.py` lists them as `SED-004` and `PED-001` in the unpaired sets, awaiting grading in phase 006 per the 003 implementation summary.

8. The Sync Loop declaration needs three edits. `references/cli.md` joins `unmirrored_sources` at `systems.py:1271-1276`. The header residency statement at `:1290` says "The CLI `sk-media-editor/` package and the Claude Code plugin run the same tools from a terminal", which is wrong twice after the split: the skill package is not a CLI, and the plugin runs the CLI rather than an MCP server. The router code statement at `:1680` carries the `choose_route` body and changes with finding 3, which moves its statement key.

9. The "CLI runtime" phrase collision is live in the playbook: `skill-export-delivery/export-root-no-subfolder.md:29` says "start the CLI runtime without the plugin", `skill-identity-handover/identity-handover.md:15` and `:41` use "the CLI runtime" for the Claude Code runtime, and `project-guidance-delivery/chat-guidance-delivery.md:19` contrasts "the project packaging" with "the CLI runtime". With a real `media-editor` CLI landing, the phrase must mean the command. Reword these to "the Claude Code skill" and keep CLI for the executable. Dated changelog entries keep their historical wording.

## Design answer

The split is forced into one shape by three constraints measured above. First, invocation text cannot live in a paired file, because the Project cannot run the CLI, so it belongs in a new skill-only `references/cli.md` declared unmirrored. Second, `cli.md` must not enter `RESOURCE_MAP` or `ALWAYS`, because `differential.py:333-339` compares the skill's resource list field by field against the contract and a skill-only entry would fail every fixture. It is reached through `SKILL.md`'s resource table instead, which is not a paired file. Third, `setup.md` stays one mirrored file with a section per surface, which is operator decision OD-4 (`001-deep-research/spec.md:214`) and matches what the attempt to split it would cost: a Knowledge rename, a `pairs` key change, a kernel statement resync and an operator upload, all for a change the Project does not need to see.

The route order becomes `media_cli_available()` first, then `media_tools_connected()` for the Project, then `verify_ffmpeg()`, then advice, with the new predicate bound rather than reimplemented so the kernel copy survives. The playbook then splits into a CLI-first skill scenario set and the unchanged Project set, and the twin pair re-scopes to the deliverable because the identical user-visible outcome is the property the sync discipline protects.

## Ruled Out

1. Splitting `setup.md` into a Desktop file and a CLI file, because it costs a Knowledge rename, a `pairs` key change, a kernel resync and an operator upload for a change the Project does not see, and OD-4 rejects it.
2. Adding `references/cli.md` to `RESOURCE_MAP` or `ALWAYS`, because the differential compares resource lists field by field and the Project host cannot load a CLI-only resource.
3. Making `cli.md` a paired file, because its content is untrue on the Project side.
4. Reusing the `tools` route value for a CLI run, because the route value is the machine-checkable statement of which transport answered.
5. A separate CLI mode in `MODE_VALUES`, because the mode is the media type, not the transport.
6. Retiring the `SRO-001` and `PRO-001` twin pair, because the identical prompt on both surfaces is the only check that the two packagings still produce the same user-visible outcome.
7. A skill-only `choose_route` that differs from the kernel's copy, because that split is exactly what the differential exists to prevent.

## Edge Cases

- Partial success: phase 005 is pending, so every finding here describes the current state and the planned change rather than a landed one. The seven `cmp` checks passed, so the pairs are intact at this revision.
- Missing dependency: none.

## Sources Consulted

- `AI Systems/Media Editor/sk-media-editor/SKILL.md:44-49`, `:75-77`, `:97-127`, `:256-257`, `:316`
- `AI Systems/Media Editor/sk-media-editor/references/router-contract.md:147-155`
- `AI Systems/Media Editor/sk-media-editor/references/setup.md:3`, `:22`, `:31`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md:1-30`
- `AI Systems/Media Editor/benchmark/router/differential.py:100-104`, `:308-345`
- `AI Systems/Media Editor/benchmark/router/route_contract.py:87-95`, `:236-245`
- `AI Systems/Media Editor/benchmark/gates/rule_parity.py:71-120`
- `AI Systems/Media Editor/benchmark/grader/twin_divergence.py:89-105`
- `AI Systems/z - Claude Project Sync Loop/systems.py:1248-1310`, `:1680`
- `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/005-skill-cli-only/spec.md:40-80`
- `AI Systems/Media Editor/specs/005-media-editor-cli-runtime/001-deep-research/spec.md:211-214`
- Command evidence: seven `cmp -s` runs against `claude project/knowledge/`.

## Assessment

- New information ratio: 0.75
- Questions addressed: how the skill relies on the CLI alone while the Project stays on MCP and the mirror pairs stay byte-identical.
- Questions answered: how the skill relies on the CLI alone while the Project stays on MCP and the mirror pairs stay byte-identical.

## Reflection

- What worked: running `cmp` on all seven pairs instead of trusting the earlier prose, because the knowledge files were modified in this working tree and byte identity still held.
- What did not work: nothing failed this iteration.
- What I would do differently: read the kernel's Section 8 code statement directly in the kernel file as well, because the `systems.py` copy is the declaration and the kernel is the artifact that ships.

## Recommended Next Focus

Iteration 5: naming and placement hardening against the live kernel and runtime, plus the ranked change list for the four phases. Verify the gate wording in `claude project/Custom Instructions.md`, the field descriptions, `targetFolder` and `maxBytes`, the guard decision, the new playbook scenarios, and rank every remaining change by phase.
