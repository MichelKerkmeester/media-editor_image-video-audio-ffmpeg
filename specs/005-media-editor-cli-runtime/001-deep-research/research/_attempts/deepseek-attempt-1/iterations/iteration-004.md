# Iteration 4: Skill and Project Split

## Focus

Test whether the skill can go CLI-only while the Claude Project stays on MCP without breaking the
byte-identical mirror pairs, find what the Sync Loop declaration requires, and work out which files
carry the route-order rewrite and what the router benchmark and playbook gates need.

## Findings

### F4.1 All three named mirror pairs are byte-identical today, confirmed by a real comparison

`cmp -s` on each pair, run from `AI Systems/Media Editor/`:

| Skill source | Project mirror | Result |
| --- | --- | --- |
| `sk-media-editor/references/tools.md` | `claude project/knowledge/Media Editor - Reference - Media Editor Tools.md` | BYTE-IDENTICAL |
| `sk-media-editor/references/setup.md` | `claude project/knowledge/Media Editor - Reference - Setup.md` | BYTE-IDENTICAL |
| `sk-media-editor/references/interactive-intelligence.md` | `claude project/knowledge/Media Editor - System - Interactive Intelligence.md` | BYTE-IDENTICAL |

Note the mirror file names, which are not the same as the skill file names. The prompt's shorthand
("their twins in `claude project/knowledge/`") resolves to those three long names. This matters for
any change list, since a writer looking for `claude project/knowledge/tools.md` finds nothing.

The full declared pair set is seven, not three, and it comes from the Sync Loop declaration
(`Sync Loop systems.py:1252-1272`): image-operations,
video-and-audio-operations, hls-video-conversion, tools, setup, interactive-intelligence and
media-framework. A change that breaks parity on any of the seven fails the same gate, so the
"three mirrors" framing understates the blast radius by two.

### F4.2 `tools.md` is already transport-neutral, so the proposal holds for it

Scanning `sk-media-editor/references/tools.md` for transport words found exactly one hit:
the source note at line 23, `**Source:** `mcp server/README.md` sections 4 and 5, and each tool's
own schema in `mcp server/src/tools/``. Every other occurrence of `mcp` or `cli` in that scan was
inside a tool parameter description, not a transport claim
(`sk-media-editor/references/tools.md:107`, `:122`).

So `tools.md` body is a tool-and-field catalogue that reads the same whether a tool is reached
through MCP or through the CLI. The **proposal passes**: leave it transport-neutral and mirrored,
and carry invocation in a skill-only file. Two consequences:

- The rename of `mcp server/` to `runtime/` makes the line 23 source note stale, and it must be
  corrected on both sides together, or the pair diverges on a path string.
- `tools.md` is the Project's tool reference too, so it must not gain CLI syntax. Any CLI syntax
  there would be read by the Project kernel, which cannot run the CLI.

### F4.3 `setup.md` is already keyed by surface, so the proposed split should be rejected

`setup.md` already carries per-surface sections. Its frontmatter description names the Desktop
extension, the Claude Code plugin and local ffmpeg
(`sk-media-editor/references/setup.md:3`), line 22 scopes it as "Where the tools can run, the
Desktop extension and its two settings, ffmpeg through `media_setup_ffmpeg`, the Claude Code
plugin, local ffmpeg and the final check", and its surface table at `:55-59` maps claude.ai in a
browser, Claude Desktop, Claude Code and any other terminal agent to the route each can use.

That is the shape a split would try to produce, and it is already inside one file. Splitting it
would mean two files that must both stay in step with the Project mirror, and the Project mirror
is one file. The split therefore makes parity harder rather than easier.

**Recommendation: reject the split.** Keep `setup.md` mirrored and unified, and change only the
content that is wrong after the fixed decisions:

- `setup.md:58` says Claude Code's route is "Yes, through the plugin" and points at Section 6.
  Under fixed decision 1 the plugin still installs, but it installs a skill and a CLI rather than
  an MCP server, so the table cell and Section 6 both need the CLI framing.
- `setup.md:59` says another terminal agent is "Only through local ffmpeg, Section 7". After the
  standalone install in iteration 3's F3.5, that row can point at the CLI instead.
- `setup.md:65-67` and the extension instructions stay as they are, since they describe the
  Desktop extension the Project still uses.

**Rejected option: split `setup.md` into `setup-skill.md` and `setup-project.md`.** The only
argument for it is that a model reading the whole file sees instructions for a surface it is not
on. Against that: the file is already sectioned and tabulated by surface, both halves must match
one Project mirror byte for byte, and a split adds a file to `unmirrored_sources` for every half
that does not mirror. The retrieval cost the split tries to save is smaller than the parity cost it
adds.

### F4.4 A new skill-only reference needs a Sync Loop declaration change, not just a file

`router-contract.md` is already a skill-only reference and its exemption is written down in the
declaration:

> `'unmirrored_sources': {'references/router-contract.md': "Deliberate: the kernel's Router Code
> section is this file's Python with its comments removed, and benchmark/router/differential.py
> holds the two equal, so a Knowledge copy would be a second router the Project retrieves only by
> relevance."}`
> [SOURCE: Sync Loop systems.py:1274-1281]

So the pattern exists. A new `sk-media-editor/references/cli.md` must be added to
`unmirrored_sources` in the same block with the same shape of reason, or the system carries an
undeclared asymmetry between its skill sources and its Project Knowledge set.

That is the real cost of the proposal under test. Creating one skill-only file is one write. Making
it a declared, reviewed skill-only file is two writes in two systems plus a kernel review decision.

`cli.md` should be named as the carrier for: the resolved invocation line (F3.1), the argument
intake modes (F2.3), the stdout contract and exit codes (F2.4, F1.5), the `list` and `describe`
verbs (F2.1, F2.2), the preview-to-file behavior (F2.5) and the `MEDIA_EDITOR_DATA_DIR` rule (F2.7). It must also carry the three-branch degradation
from F3.6, since a session with shell execution disabled has to reach the advice branch without a
model inventing a fourth route.

### F4.5 The declaration block is large and the CLI change touches four of its ten section labels

The media-editor block runs from `systems.py:1248` to the closing `],\n    },` at `:1694-1695`. A
count of `'statement_key'` inside that range returned 47 residency statements. Grouped by
`'section'`, they are:

| Section label | Statements |
| --- | --- |
| `2 smart routing` | 8 |
| `3 how it works` | 5 |
| `1 objective` | 5 |
| `Header` | 3 |
| `5 delivery protocol` | 3 |
| `4 rules always 1..8`, `4 rules escalate 1..4`, `4 rules never 1..8` | 20 |
| `6 quality checklist`, `7 project knowledge consultation`, `8 router code` | 3 |

Four labels carry route text that the CLI changes:

- `Header` already contains a CLI sentence: "The CLI `sk-media-editor/` package and the Claude Code
  plugin run the same tools from a terminal" (`systems.py:1290-1292`). Under the new design the
  plugin does not run "the same tools" through MCP, so this statement's `statement_key` changes.
- `2 smart routing` carries the route table and the three-step route prose, including the `else
  ffmpeg` clauses (`systems.py:1369-1373`) and step 3 "When the Media Editor tools are connected,
  call `media_health` once, use the tools and check the encoders and filters it reports before
  promising a format or filter" (`systems.py:1376-1378`). Under fixed decision 3 the first branch
  is the CLI.
- `3 how it works` and `8 router code` carry the same route ordering in prose and Python.
- `4 rules escalate 1` is the ESCALATE 1 statement that iteration 5 rewrites for the naming gate.

Two of the affected statements are marked `'residency': 'duplicate or machine'` in the read
region (`systems.py:1370`, `:1378`), which the declaration itself explains as the
`8 router code` block being the authority (`:1360-1362`). That is a useful lever: the route order
has exactly one authoritative statement to change and two summaries that must be kept consistent
with it.

**Rejected option: leave the declaration untouched and change only the skill sources.** Rejected
because `rule_parity.py` reads its pair list from this declaration
(`benchmark/gates/rule_parity.py:26-29`), so a stale declaration makes the gate check the wrong
thing while still reporting green.

### F4.6 `choose_route` must become an ordered capability probe, and the host-state table needs a CLI axis

Today the route check is two probes and three outcomes:

```python
def choose_route() -> str:
    if media_tools_connected():  # media_health is listed and answers
        return "tools"
    if verify_ffmpeg():  # `ffmpeg -version` answers
        return "ffmpeg"
    return "advice"
```

`sk-media-editor/references/router-contract.md:147-155`, and the router code block in the kernel
carries the same body with its comments removed (`systems.py:1360-1362`).

The executable oracle mirrors it in one place. `benchmark/router/differential.py:100-104` declares
`HOST_STATES` as `(media_tools_connected, verify_ffmpeg) -> route` with three rows: tools connected
`(True, True) -> "tools"`, ffmpeg only `(False, True) -> "ffmpeg"`, neither `(False, False) ->
"advice"`. The docstring comment above it states the ordering rule: "The first available route
wins, so ffmpeg on the path never outranks connected tools"
(`benchmark/router/differential.py:97-99`).

`benchmark/router/route_contract.py` holds the mode half of the contract and deliberately does not
model which route is live. Its own comment says so: "Which route is live (tools, local ffmpeg or
advice) is a runtime" concern (`benchmark/router/route_contract.py:63`), and its
`MODE_COMMANDS`/`MODE_SIGNALS` tables and `route_request` (`:36-58`, `:215`) are unaffected by the
CLI change. That is good news, since it means the expensive-to-change half of the oracle stays put.

**Design: a four-entry ordered probe list, evaluated against a per-surface probe set.**

```text
ROUTE_ORDER = ("cli", "tools", "ffmpeg", "advice")

skill surface probes:   cli, ffmpeg        -> first true wins, else advice
project surface probes: tools             -> first true wins, else advice
```

`choose_route()` becomes `choose_route(probes)` and returns the first route in `ROUTE_ORDER` whose
probe reported available. That keeps one oracle, one ordering rule and one return vocabulary, and
it expresses the fixed decisions exactly: the skill's order is CLI then ffmpeg then advice, the
Project's is tools then advice.

The alternative is two separate functions, one per surface. **Rejected** because `rule_parity.py`
and `differential.py` both compare the Python in `router-contract.md` against the kernel copy, and
two functions means two blocks to hold equal and two chances for the kernel to carry a stale copy.

`HOST_STATES` then becomes a table over three booleans with a per-surface expected route. The
comment at `differential.py:97-99` must gain the CLI ordering rule in the same style, since that
comment is the thing a future reader checks the rule against.

### F4.7 `rule_parity.py` must not be extended to ban "mcp", and one twin pair survives the split

Two gates need explicit handling.

**`rule_parity.py`.** The gate scans every declared pair, the skill, the bootstrap, the kernel and
the two metadata files for "the names of the two third-party servers this system no longer uses",
and any hit fails (`benchmark/gates/rule_parity.py:37-40`, `:55-57`). The Project keeps the
Media Editor's own MCP server by fixed decision 2, and `setup.md` legitimately names MCP surfaces,
so the banned-name list must not grow to include `mcp` or the MCP server's own name. The retired
names are two unrelated third-party servers and stay as they are.

What the gate does need is a new rule entry for the CLI route order, in the same `phrases` and
`min_pairs` shape it already uses (`rule_parity.py:59-70`). A new rule that lives only in
`SKILL.md` and `cli.md` has zero declared pairs teaching it, so its floor is zero and the gate
reports agreement trivially. That is a real gap: the route order is the one rule that changes on
both surfaces, since the Project's order loses its `tools`-versus-`ffmpeg` first branch and becomes
`tools` then `advice`. The rule should span both surfaces' documents so the floor is meaningful.

**`twin_divergence.py`.** `SRO-001` pairs with `PRO-001`, and the pairing comment reads "Identical
prompt, tools connected in Claude Code and Claude Desktop"
(`benchmark/grader/twin_divergence.py:93`). After the split, Claude Code has a CLI and no MCP
server, so the apparatus differs even though the prompt does not.

Recommendation: **keep the pair** and update the comment. The module's own docstring already
handles exactly this case: "the same request should produce a recognisably different reply shape on
each side while agreeing on the substance the playbook's own contract fields state (mode, tool,
whether a file was produced)" (`twin_divergence.py:11-17`). Both sides still select Image Mode,
still run a resize, still produce a file, so the contract fields agree. Unpairing it would throw
away the only cross-surface check on the connected-apparatus case.

What does change: `SRO-002` is already in `UNPAIRED_IDS` as skill-only
(`benchmark/grader/twin_divergence.py:99-107`) and its scenario text is the ffmpeg-only fallback
(`sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md:15-19`).
The route order now has four branches on the skill side, so one scenario cannot cover it. The
playbook needs three skill-side route scenarios rather than two:

| Scenario | Apparatus | Expected route |
| --- | --- | --- |
| `SRO-001` rewritten | Plugin loaded, CLI resolves | cli |
| new | Plugin loaded, CLI missing, ffmpeg answers | ffmpeg |
| `SRO-002` rewritten | Plugin not loaded, ffmpeg answers | ffmpeg |
| new | Plugin not loaded, no ffmpeg | advice |

`SRO-001`'s execution commands also assert the old apparatus directly: step 1 says to start
`claude --plugin-dir ...` and "confirm `mcp list` shows media-editor as Connected"
(`skill-route-order/connected-tools-first.md`, section 3). Under fixed decision 1 there is no
server to connect, so that step and the matching expected signals must be replaced with a check
that the CLI path resolves and answers.

**Rejected option: delete `SRO-001` and replace it with a CLI scenario.** Rejected because it
loses the paired half of `SRO-001`/`PRO-001`, which is the only scenario pair testing the same
prompt on a live-mutation surface on both sides.

**Rejected option: add the CLI as a fifth mode in `route_contract.py`.** Rejected because the CLI
is a transport for the same tools, not a mode. Adding it would make the mode table and the route
table the same table, and the mode table is the half that is currently stable.

## Sources Consulted

- `AI Systems/Media Editor/sk-media-editor/references/tools.md` (transport-word scan)
- `AI Systems/Media Editor/sk-media-editor/references/setup.md` (`:3`, `:21-23`, `:31`, `:55-59`, `:65-67`)
- `AI Systems/Media Editor/sk-media-editor/references/interactive-intelligence.md` (parity only)
- `AI Systems/Media Editor/sk-media-editor/SKILL.md` (`:77`, `:84-88`, `:101`, `:127`, `:139`, `:151-161`, `:174-180`, `:194`, `:206`)
- `AI Systems/Media Editor/sk-media-editor/references/router-contract.md` (`:130-182`)
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/connected-tools-first.md`
- `AI Systems/Media Editor/sk-media-editor/manual-testing-playbook/skill-route-order/fallback-to-local-ffmpeg.md`
- `AI Systems/Media Editor/benchmark/router/route_contract.py` (`:36-58`, `:63`, `:75-79`, `:215`)
- `AI Systems/Media Editor/benchmark/router/differential.py` (`:97-104`)
- `AI Systems/Media Editor/benchmark/gates/rule_parity.py` (`:26-29`, `:37-40`, `:55-57`, `:59-70`)
- `AI Systems/Media Editor/benchmark/grader/twin_divergence.py` (`:9-17`, `:87-107`)
- `Sync Loop systems.py` (`:1248-1292`, `:1252-1281`, `:1290-1292`,
  `:1360-1378`)
- Commands: `cmp -s` on the three named pairs (all BYTE-IDENTICAL), `diff -q`,
  `find "AI Systems" -maxdepth 2 -name systems.py`, `grep -c "'statement_key'"`
  (returned 47 over `:1248-1700`), `grep -o "'section': ...' | sort | uniq -c`

## Assessment

newInfoRatio: 0.75
Novelty justification: parity is now measured rather than assumed, and three findings changed the
design against the prompt's own proposal (the `setup.md` split is rejected, a new skill-only file
needs a systems.py declaration, and `tools.md` stays mirrored because it is already neutral). The
`HOST_STATES` and twin-pair handling are new. Overlap with earlier iterations is limited to
reusing the route-order decision.
Confidence: high for F4.1 through F4.5, which rest on commands and cited lines. Medium for F4.6's
probe-list shape, which is a design proposal with no code yet. High for F4.7's gate inventory,
medium for the recommendation to keep `SRO-001`/`PRO-001` paired, since that depends on how
strictly a reader applies the "same apparatus" reading of the `TWIN_PAIRS` comment.

## Reflection

What worked: running `cmp -s` instead of trusting the brief's "byte-identical mirror pairs"
phrasing. It confirmed parity and, more usefully, produced the real mirror file names, which are
long and easy to get wrong.

What failed: an early attempt to read the third mirror as `claude project/knowledge/tools.md`
returned "DIFFERENT-or-missing". The pair map in `systems.py:1252-1272` is the authority for the
mapping and should have been the first read. Also, `grep -n "choose_route"` on
`route_contract.py` returned nothing, which is correct: the live-route decision is not in that
file by design (`:63`), so the search itself was misplaced rather than the code being absent.

What was ruled out: splitting `setup.md` (F4.3), two per-surface `choose_route` functions (F4.6),
adding the CLI as a fifth mode (F4.7), deleting `SRO-001` (F4.7), and extending the banned-name scan
to cover MCP (F4.7).

## Recommended Next Focus

Iteration 5, naming and placement hardening plus the ranked change list. Read
`claude project/Custom Instructions.md` around `:145`, `:149`, `:181` and `:194`,
`mcp server/src/server/field-schemas.ts:62-80`,
`mcp server/src/tools/image/convert.ts:136-141`,
`mcp server/src/core/output-folder.ts:301-341`, `mcp server/src/tools/image/batch-resize.ts` for the
existing multi-output shape, and the playbook's export-delivery and ambiguity-intake scenarios.
Then write the kernel gate wording, the batch question template, the field-description rewrites,
the batch placement mechanism, and the ranked change list naming every file across the four phases.
