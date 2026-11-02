# Advisory-premise sites, classified

Checked 2026-09-29 against the files as they stand after this phase. Each site in section B of `media-editor-package-inventory.md` is one of three things: updated to the route order, kept because it is true on the no-tools route or on every route, or out of scope. A script tested each quoted site for its text in the current file, and every kept site was then read by hand.

## Summary

| Group | Sites | Updated | Kept | Out of scope |
|-------|------:|--------:|-----:|-------------:|
| Kernel `Custom Instructions.md` | 23 | 16 | 7 | 0 |
| `claude project/README.md` | 11 | 10 | 1 | 0 |
| `AGENTS.md` | 3 | 3 | 0 | 0 |
| `SYNC.md` | 3 | 0 | 3 | 0 |
| `sk-media-editor/SKILL.md` | 2 | 2 | 0 | 0 |
| `sk-media-editor/README.md` | 3 | 3 | 0 | 0 |
| `INSTALL-GUIDE.md` | 1 | 1 | 0 | 0 |
| Knowledge mirrors | 5 | 5 | 0 | 0 |
| Playbook | 27 | by group rule | by group rule | 0 |
| Benchmark fixtures and graders | 11 | by group rule | by group rule | router fixtures |
| Sync loop | 9 | by group rule | by group rule | 0 |

## Kernel, site by site

| Inventory line | Site | Verdict |
|----------------|------|---------|
| `:5` | Advisory-only kernel | Updated: the header names the tools route in Claude Desktop |
| `:5` | Answers with the exact command | Updated: that answer is now the no-tools route |
| `:15` | Output is guidance only | Updated: guidance only when the tools are not connected |
| `:66` | ffmpeg missing, cannot run | Updated: the route sentence |
| `:72` | Knowledge as advisory reference | Updated: the tools are the only execution the Project has |
| `:206` | The pseudocode does not execute | Kept: true on every route |
| `:220` | The runtime checks ffmpeg, the Project never runs it | Updated: the tool check calls `media_health` first |
| `:226` | Modes table header "Advisory output" | Kept: the table describes the no-tools answer, and the sentence under it maps each mode to its tools |
| `:251` | Export is a runtime action | Updated: export belongs to whichever route ran |
| `:251` | Do not claim the file was produced here | Updated: the same paragraph |
| `:259` | ALWAYS 1, the advisory truth | Updated |
| `:259` | Never claim a run whatever tools appear | Updated: claims only what a Media Editor tool did |
| `:260` | ALWAYS 2, answer with the command | Updated |
| `:265` | ALWAYS 7, recommend saving to `export/` | Updated: the folder the tool returned, otherwise `export/` |
| `:276` | NEVER 7, never claim execution | Updated: except what a Media Editor tool did in the conversation |
| `:277` | NEVER 8, no Canvas Artifact | Kept: true on every route |
| `:290` | Answer in chat and lead with the command | Updated: two blocks, one when a tool ran and one when none did |
| `:292` | **Run this:** | Kept inside the no-tool block |
| `:293` | **Result lands in:** `export/` | Kept inside the no-tool block |
| `:298` | Attestation `execution = did not occur` | Kept inside the no-tool block, beside the new `execution = tool ran` line |
| `:300` | Two to three sentences after the block | Updated: after either block |
| `:306` | Checklist: advisory-only | Updated: claims only what a tool did |
| `:307` | Checklist: chat, not Canvas | Kept: true on every route |

## The other groups

- `claude project/README.md`: ten sites now describe both routes. Smoke step 5 at `:61` is kept, because it smoke-tests the modes on either route, and step 8 adds the connected Desktop case.
- `SYNC.md`: the three dated notes are history and stay as written. A new dated change note records this phase and says it is not a review.
- Knowledge mirrors: none states the premise itself. They are byte copies of the updated references.
- Playbook: the Project scenarios (`PNE`, `PID`, `PGD`, `PHL` and the rest) test the no-tools route and are kept, with precondition 7 keeping the tools disconnected for them. `STV-001` now expects advice. `SRO-001`, `SRO-002` and `PRO-001` are new.
- Benchmark: the `PID-001` and `PHL-001` fixtures name the new kernel version, the grader checks for the no-tools attestation are kept, and `twin_divergence.py` pairs `SRO-001` with `PRO-001`. The router fixtures consume an older contract and are out of scope, recorded as a follow-up.
- Sync loop: the Media Editor residency rows moved with the kernel lines they pin, and no other row changed.
