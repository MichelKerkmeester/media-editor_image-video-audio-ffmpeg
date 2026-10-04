# Route Contract (executable)

Deterministic characterization of how the Barter Media Editor routes a
request to a mode, binds a tool group and a local fallback, and decides
whether to ask one comprehensive question, so routing behavior is testable
without invoking a model. The router itself lives in
`sk-media-editor/references/router-contract.md`, and the Claude Project
kernel ends with the same code minus its comments under `## 8. ROUTER CODE`.
claude.ai still interprets prose stochastically, so live adherence testing
remains mandatory.

## Files

- `route_contract.py`: the deterministic oracle (exact tokens, word-boundary
  keywords, one primary mode, tool binding, disambiguation, resources, schema).
- `fixtures.json`: the expected route objects (test oracle).
- `differential.py`: executes the contract's pseudocode in each host state and
  holds it, the oracle and the kernel's copy equal.
- `run_fixtures.sh`: gate runner. It runs both checks and exits 0 only when both
  pass, 2 when an input is missing.

## Run

```bash
bash run_fixtures.sh
# or each check directly:
python3 route_contract.py fixtures.json
python3 differential.py
# or inspect a single request:
python3 route_contract.py "$audio from this video file"
```

## Route object

Every request resolves to one stable object:

```json
{
  "mode": "AUDIO",
  "tool": "audio_*",
  "fallback": "ffmpeg",
  "source": "command",
  "needs_disambiguation": false,
  "resources": [
    "references/media-framework.md",
    "references/video-and-audio-operations.md"
  ]
}
```

The schema rejects unknown or duplicate fields and any tool or fallback
outside the fixed vocabulary, so the manifest cannot drift silently from the
contract.

## Decision rules (durable rationale)

- **Exact tokens**: only a complete `$token` selects a mode. `$image`,
  `$img`, `$video`, `$vid`, `$audio`, `$aud`, `$hls`, `$repair`, `$r`,
  `$interactive` and `$int` are matched as whole tokens, never as
  substrings, so `$rotate` and `$images` carry no command.
- **One primary mode, first command wins**: an explicit command beats every
  natural-language signal, so `$audio from this video file` binds AUDIO,
  not VIDEO. With two commands the first one in the text wins. Without a
  command, the highest word-boundary keyword score wins, table order breaks
  a tie, and no second mode loads a second resource pack.
- **Word-boundary keywords**: `photo` matches "compress this photo" but
  never "photography". `stream`-family routing needs `streaming`,
  `adaptive` or `hls`, so an incidental "video" does not steal an HLS
  request.
- **Disambiguation gate**: a request with no command and no keyword hit
  routes to INTERACTIVE with `needs_disambiguation=true`, so the router
  asks one comprehensive question instead of inventing the media type.
- **Tool binding**: `tool` is the Media Editor tool group the mode calls
  when the tools are connected: `image_*`, `video_*`, `audio_*`,
  `video_hls_ladder`, `media_probe then media_repair`, and `auto` for
  Interactive. `fallback` is the local tool when they are not: `ffmpeg`,
  `ffprobe then ffmpeg` for Repair, none for Interactive. Which route is
  live is a runtime concern this oracle does not simulate.
- **Runtime discovery + guarded loading**: every routing call resolves
  resource names against the live `references/*.md` and `assets/*.md`
  inventory (discover, existence-check, dedupe). A renamed or deleted
  reference degrades to a smaller resource set instead of a dead path or
  crash, which is why the fixtures pin every resource path: a stale name
  fails here and nowhere else.

## Differential gate

`differential.py` runs four guards:

- **Copy parity**: the kernel's `## 8. ROUTER CODE` block equals the
  contract block with its comments removed, line for line and as a syntax
  tree. `SKILL.md` carries no python fence, and no Router Contract Knowledge
  document exists.
- **Table parity**: commands, keywords in table order, resource lanes, tool
  groups, fallbacks, the token pattern and the checklist match the oracle.
- **Behavior parity**: every fixture input is routed through the pseudocode
  and the oracle in three host states. The pseudocode decides the live route
  from `media_tools_connected()` and `verify_ffmpeg()`, so the gate binds
  both per state and checks that the route is `tools`, `ffmpeg` or `advice`
  as the state requires while the routing decision stays the same. `load` is
  stubbed because it decides nothing.
- **Coverage**: every command, every mode by command and by keyword, the
  fallback and the false prefixes `$rotate` and `$images` appear in the
  fixtures.

The matrix is the fixture inputs times the three host states. A pass prints
`PASSED N/N differential checks`.
