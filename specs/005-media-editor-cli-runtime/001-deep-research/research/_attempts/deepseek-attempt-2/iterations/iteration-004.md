# Iteration 004 - Skill and Project split

Focus: make the skill CLI-only while the Project stays on MCP, without breaking the byte-identical
mirror pairs, and rewrite the router contract, the differential host states, the rule-parity gate, the
twin-divergence grader and the route-order playbook scenarios to match.

Sources read this iteration: `sk-media-editor/SKILL.md`, `sk-media-editor/references/tools.md`,
`sk-media-editor/references/setup.md`, `sk-media-editor/references/router-contract.md`,
`sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md`,
`skill-route-order/fallback-to-local-ffmpeg.md`,
`project-route-order/connected-tools-in-desktop.md`, `project-route-order/setup-offer-without-tools.md`,
`benchmark/router/route_contract.py`, `benchmark/router/differential.py`,
`benchmark/gates/rule_parity.py`, `benchmark/grader/twin_divergence.py`, `SYNC.md`, and the
`media-editor` entry in the Sync Loop `systems.py`.

## 1. The mirror pairs, measured rather than assumed

`systems.py` declares seven pairs for `media-editor`: the block starts at `systems.py:1248` and the
`pairs` mapping is `systems.py:1252-1267`, mapping `references/image-operations.md`,
`references/video-and-audio-operations.md`, `assets/hls-video-conversion.md`, `references/tools.md`,
`references/setup.md`, `references/interactive-intelligence.md` and `references/media-framework.md`
to their `claude project/knowledge/` names.

I ran `cmp -s` on all seven, plus the HLS asset against `Media Editor - Reference - HLS Video
Conversion.md`. All seven are byte-identical today. `SYNC.md:36` and `SYNC.md:37` are consistent with
that, both describing the mirror text as reaching both sides checked by `diff`.

`references/router-contract.md` is the one declared exception, in `unmirrored_sources` at
`systems.py:1271-1276`, with the stated reason that the kernel's Section 8 carries that file's Python
without comments and `benchmark/router/differential.py` holds the two equal.

A CLI-only skill therefore has exactly three ways to stay inside the constraint, and the choice per
file is forced:

1. Put the CLI text in a file that is not paired. This is the only option for invocation details.
2. Put text in a paired file that is true on both surfaces. This works for transport-neutral wording.
3. Break a pair by declaring it unmirrored. This costs a Knowledge deletion and an operator upload.

## 2. Testing the proposed shape, file by file

Proposal under test: `references/tools.md` stays transport-neutral and mirrored, a new skill-only
`references/cli.md` carries invocation, and `setup.md` splits by surface. Verdict per file.

### `references/tools.md`, carries the proposal, with one sentence to fix

The file is a catalogue of the 40 tools with parameters, defaults, the consent rule, the 15 error codes
and the gaps (`sk-media-editor/references/tools.md` frontmatter, `description`). Its body names
transport only twice: `:31` says "The server behind the Media Editor tools runs on the user's machine as
the Claude Desktop extension or the Claude Code plugin", and Section 4 covers output naming and
placement. The catalogued names, parameters and defaults do not change under a CLI, because the CLI
dispatches the same 40 handlers by name (iteration 1).

One sentence is now false. After fixed decision 1 the plugin registers no MCP server, so "as the Claude
Desktop extension or the Claude Code plugin" describes two MCP hosts where only one remains. Reworded
to name the Desktop extension as the MCP host and the plugin as a CLI host, the sentence stays true on
both sides and the pair survives. Verdict: the file stays mirrored.

### `references/setup.md`, keep it mirrored rather than splitting it

The file already spans surfaces: its `Scope` names "the Desktop extension and its two settings, ffmpeg
through `media_setup_ffmpeg`, the Claude Code plugin, local ffmpeg and the final check", and the kernel
consults it for "The tools are not connected, a tool reports a folder or ffmpeg problem, or the user
asks how to install the Media Editor" (`systems.py`, the `7 project knowledge consultation` residency
row).

Splitting it into a Desktop file and a CLI file means: a new Knowledge file name, a new `pairs` key in
`systems.py`, a change to the kernel's Knowledge table row, a kernel statement resync through
`resync_statement.py` (the mechanism `SYNC.md:36` describes), and an operator upload. All of that for a
change the Project does not need to see.

Better: keep `setup.md` mirrored, keep its Desktop walkthrough, and let the plugin's new install path
live in the skill-only `cli.md`, with `setup.md` gaining at most one pointer sentence of the form "on the
Claude Code plugin, see the CLI reference". A pointer sentence is transport-neutral and mirrors cleanly.
Verdict: the proposal's split is rejected, the pair is kept.

### A new skill-only `references/cli.md`

It needs no router change to exist: `discover_markdown_resources()` walks `references/` and `assets/`
recursively (`sk-media-editor/references/router-contract.md:119-124`) and `_guard_in_skill` admits any
`.md` under those roots (`:110-117`). So the file is loadable the moment it is created.

The trap is `RESOURCE_MAP`. `differential.py:333-339` adapts the skill's result into the contract object
and compares `resources` field by field. If `references/cli.md` is added to `RESOURCE_MAP` for IMAGE,
VIDEO, AUDIO, HLS or REPAIR, then the skill's resource list gains an entry the Project host cannot have,
and the differential fails on every fixture. The same applies to `ALWAYS` (`router-contract.md:101`).

So the load-bearing rule for this iteration: a skill-only reference must never enter `RESOURCE_MAP` or
`ALWAYS`. It is reached instead through `SKILL.md`'s resource table, which is not a paired file and
already has an ON_DEMAND row for `references/router-contract.md`
(`sk-media-editor/SKILL.md:123`). `cli.md` gets an ON_DEMAND row beside it.

Rejected: add `cli.md` to `RESOURCE_MAP`. Reason: it breaks the differential on every fixture, and the
fix would be a host-state-aware resource list, which is more machinery than one ON_DEMAND row.

Rejected: make `cli.md` a paired file. Reason: its whole content is how to invoke a command the Project
cannot run, so the mirror text would be untrue on one side.

Rejected: fold the invocation into `SKILL.md` and create no new file. Reason: `SKILL.md` is short and
always loaded, and the invocation line plus its flags and exit codes is exactly the ON_DEMAND material
the resource table exists for.

## 3. `choose_route` gains a fourth value

Today `choose_route` is `sk-media-editor/references/router-contract.md:147-155`: the tools route when
`media_tools_connected()` answers, else the ffmpeg route when `verify_ffmpeg()` answers, else advice.
The kernel's Section 8 holds the same function with comments removed, per the `unmirrored_sources`
reason at `systems.py:1271-1276`.

Proposal:

```python
def choose_route() -> str:
    if media_cli_available():
        return "cli"
    if media_tools_connected():
        return "tools"
    if verify_ffmpeg():
        return "ffmpeg"
    return "advice"
```

`media_cli_available()` is a new predicate, bound the same way the existing two are. `differential.py:314-317`
binds host state by writing into the module dict, `skill.__dict__["media_tools_connected"] = lambda: tools`
and the same for `verify_ffmpeg`. A third binding for `media_cli_available` keeps the kernel's Section 8
copy byte-identical, because the Project host binds it `False` rather than implementing it differently.
That is the property that makes the mirror survivable.

`benchmark/router/differential.py:100-104` holds the host table:

```python
HOST_STATES: Dict[str, Tuple[bool, bool, str]] = {
    "tools connected": (True, True, "tools"),
    "ffmpeg only": (False, True, "ffmpeg"),
    "neither": (False, False, "advice"),
}
```

It becomes a four-element entry per state plus a `cli available` state, and the type annotation follows.
`bind_host` at `:314-317` gains the third predicate. The route assertion at `:331-332` then has four
possible expected values.

Good news on the schema: `route` is not a contract field. `benchmark/router/route_contract.py:87-89` fixes
`ROUTE_FIELDS = ["mode", "tool", "fallback", "source", "needs_disambiguation", "resources"]`, and
`validate_route_object` at `:228` rejects any other key set. So adding a fourth route value needs no
schema change, no `MODE_VALUES` or `TOOL_VALUES` change (`:91-95`), and no fixture change.

`TOOL_MAP` and `FALLBACK_MAP` also need no change, and this is a second argument for naming the CLI
subcommands exactly after the registered tool names: `TOOL_MAP` names `image_*`, `video_*`, `audio_*`,
`video_hls_ladder` and `media_probe then media_repair`, and those names remain correct when the CLI
exposes the same names.

Rejected: reuse the `tools` value for a CLI run. Reason: the route value is the only machine-checkable
statement of which transport answered, and the delivery rule that the reply claims only what ran
(`SKILL.md:139`, and the kernel's quality checklist) needs that distinction.

Rejected: a separate `cli` mode in `MODE_VALUES`. Reason: the mode is the media type or workflow, not
the transport, and a transport mode would multiply the resource map.

## 4. `benchmark/gates/rule_parity.py`

The gate reads the declared pairs out of `systems.py` rather than importing it
(`benchmark/gates/rule_parity.py:146-152`), counts each rule's `phrases` per pair, and holds a `min_pairs`
floor (`:71`, with the floor explained at `:65-68`). `retired_name_findings` at `:208` fails the run on
any retired server name.

Consequences for this change:

- The route-order rule phrases live in paired files, so a CLI-first sentence added to `tools.md` or
  `setup.md` raises that pair's count. Raising the counts is safe, and `min_pairs` should be raised in
  the same change so a later silent removal is caught. Leaving the floor where it is means the new
  sentence can be deleted from both sides and the gate stays green.
- A phrase that appears ONLY in the skill-only `cli.md` contributes zero declared pairs, so adding such
  a phrase to `RULES` without a paired carrier is a self-inflicted failure. Either the CLI invocation
  phrase is carried in a paired file too, or it is not a `RULES` phrase.
- `retired_name_findings` should gain the old plugin-as-MCP-host wording once it is removed, in the same
  spirit as the existing retired names, because that sentence is the one a stale mirror would keep.

## 5. `benchmark/grader/twin_divergence.py`

`TWIN_PAIRS` at `:87-95` pairs `SRO-001` with `PRO-001` as "Identical prompt, tools connected in Claude
Code and Claude Desktop", and `UNPAIRED_IDS` at `:99-105` lists `SRO-002` and `PRO-002` as
single-runtime by design.

The route-order scenarios themselves already say "the CLI runtime" and mean the Claude Code runtime
(`sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md`, its description
line). With a real `media-editor` CLI landing, that phrase becomes ambiguous, and this is a naming
finding for iteration 5.

Proposal for the twins:

- Keep `SRO-001` and `PRO-001` paired and re-scope both to assert the deliverable rather than the
  transport: the file is probed, a readable name is proposed and confirmed before the first writing
  call, the result lands under that name, the reply names the path, and nothing is claimed that did not
  run. Those assertions hold whether the skill used the CLI or the Project used the extension, so the
  twin keeps agreeing and the grader stays meaningful.
- Put the route assertion in the unpaired ids where it already belongs. `SRO-002` is the ffmpeg
  fallback and stays skill-only. Add one skill-only scenario for the CLI first route, for example
  `SRO-003`, and list it in `UNPAIRED_IDS`.
- `PRO-002` stays project-only and its advisory branch is unchanged.

Rejected: retire the `SRO-001` and `PRO-001` pair. Reason: the identical prompt on both surfaces is the
only check that the two packagings still produce the same user-visible outcome, and that property is
what the whole sync discipline protects.

Rejected: keep the route assertion in the paired scenario and expect different routes on each side.
Reason: `twin_divergence.py:184` fails when paired twins disagree, so the twin would have to be deleted
to say that.

## 6. The Sync Loop declaration

The `media-editor` entry spans `systems.py:1245-1697`. Changes needed there:

1. `unmirrored_sources` (`:1271-1276`) gains `references/cli.md` with a reason of the same shape as the
   router-contract entry. The router-contract reason should be extended, because that file now carries
   a predicate the Project binds false rather than a predicate it lacks.
2. `pairs` (`:1252-1267`) is unchanged. No pair is added, removed or renamed, which is the point of
   section 2.
3. The `8 router code` residency row's statement carries the kernel's whole Section 8 code block, keyed
   `6655e653f16eb8a3568be638803861d86f7477e768e1f66851c62ef96680a2d9`. Its `choose_route` body changes,
   so that statement and its key change, and the kernel version moves.
4. The Header residency row whose statement ends "The CLI `sk-media-editor/` package and the Claude Code
   plugin run the same tools from a terminal" (keyed `c6fd13141985411f24d63a8a287a800da568725ffc44763f35577342f878ab15`)
   is now wrong in two ways: the skill package is not a CLI, and the plugin runs the CLI rather than an
   MCP server. That statement needs a rewrite and a resync.
5. `residency: route` rows that name the tool group as the executing agent should be read once more, but
   I found no change forced by a CLI-first order beyond items 3 and 4. The `4 rules always 7` naming row
   already says "the path a Media Editor tool returned", which a CLI run also returns.

Rejected: give the skill a second `choose_route` that the kernel does not carry. Reason: that is exactly
the split `differential.py` exists to prevent, and the predicate binding already handles the difference.

## Ruled out this iteration

1. Splitting `setup.md` by surface.
2. Adding `references/cli.md` to `RESOURCE_MAP` or `ALWAYS`.
3. Making `cli.md` a paired file, or folding it into `SKILL.md`.
4. Reusing the `tools` route value for a CLI run, or adding a CLI mode.
5. Retiring the `SRO-001` and `PRO-001` twin pair.
6. A skill-only `choose_route` that differs from the kernel's copy.

## Inferences recorded as inferences

- `SYNC.md:36` and `SYNC.md:37` describe mirror checks by `diff` and by `cmp`. I verified byte identity
  myself with `cmp -s` and did not run the Sync Loop's own gates, which my write surface forbids.
- The exact line numbers inside the `systems.py` residency list are read from `sed` windows, so the
  router-code row is cited by its statement key rather than by line.
