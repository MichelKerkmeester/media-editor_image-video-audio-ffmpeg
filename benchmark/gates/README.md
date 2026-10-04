---
title: "benchmark/gates: rule parity across the eight declared pairs"
description: "Reads the shared parity declaration, holds a named Media Editor rule to the same phrase count on both sides of every pair that teaches it and fails on any retired server name."
trigger_phrases:
  - "rule parity"
  - "declared pairs"
  - "phrase count mismatch"
---

# benchmark/gates: rule parity across the eight declared pairs

---

## 1. OVERVIEW

`benchmark/gates/` holds one check: whether a rule this system states holds the same verbatim phrase count on both sides of every declared skill-to-mirror pair that teaches it. The wrappers in `benchmark/parity/` exec into the shared `z — Claude Project Sync Loop`, which checks document inventory (the knowledge root exists, holds only markdown, carries the pairs the shared declaration names). Neither that gate nor anything else in this system reads what a document actually says, so a rule can be tightened in a skill source and left stale in its Project mirror with every existing check still green.

Current state:

- `rule_parity.py` reads this system's eight declared pairs from `z — Claude Project Sync Loop/systems.py`, the fleet's one shared declaration, rather than a locally built map
- It opens that file for reading only, with bytecode caching disabled first, and never writes to it
- Six rules are named today, each with the verbatim phrase (or phrases) that carry it and a floor for how many of the eight pairs teach it as measured against the live tree
- Measured against the live tree, all eight pairs hold byte-identical content on both sides, so the check starts from a green baseline it earns by comparison, not one it assumes
- A retired-name scan reads every pair, `SKILL.md`, `AGENTS.md`, the kernel and the two metadata files for the names of the two third-party servers this system replaced, and any hit fails

---

## 2. FILES

| File | Responsibility |
|---|---|
| `rule_parity.py` | CLI script. Reads the eight declared pairs, counts each named rule's phrases on both sides of every pair, enforces the floor, scans for retired names, exits 1 on any finding |

---

## 3. THE SIX NAMED RULES

| Rule | Taught by (of 8 pairs) | Carried in |
|---|---|---|
| the tool check gates every operation, tools first | 5 | image-operations, video-and-audio-operations, hls-video-conversion, interactive-intelligence, media-framework |
| no format or filter promised before a build check | 2 | image-operations, video-and-audio-operations |
| no horizontal dividers in a reply | 1 | interactive-intelligence |
| one comprehensive question, then wait | 1 | interactive-intelligence |
| the export destination convention | 2 | image-operations, video-and-audio-operations |
| core punctuation hard blockers (em dash, semicolon) | 2 | hvr-core, human-voice-rules |

The two Human Voice pairs never teach the five operational rules above, and the five operational documents never teach the punctuation rule. The tools reference teaches none of the six: it lists the tools, and the rules live in the documents that say how to run them. That is the expected shape, not a gap: a pair where neither side carries a phrase does not teach that rule.

### The retired-name scan

A count cannot see a retired name, because a name restored on both sides of a pair is agreement by count. So the scan has zero tolerance. It reads 20 files, both sides of every pair plus `AGENTS.md`, `SKILL.md`, `graph-metadata.json` and `Custom Instructions.md`, for three spellings: `Imagician`, `MCP Video Audio` with a space or a hyphen and `video-audio` standing alone. The spellings are listed one by one, so `video-and-audio-operations` never matches, and `video-audio` inside a longer hyphenated word, such as the repository's own name, does not count. An unreadable file is a finding as well.

---

## 4. RUN

From the system directory:

```bash
python3 benchmark/gates/rule_parity.py
```

Expected result: a `pairs: 8 of 8 declared pairs compared` line, a `retired names: 20 files scanned, 0 finding(s)` line, one line per rule naming how many pairs teach it against its floor, then `PASSED 6 rules hold on both sides of every pair that teaches them`. Exit 0.

On a finding: the same lines, then `FAILED N rule parity finding(s)` and a dashed list naming the rule and the exact phrase with the count on each side, or the retired name with its file and first line. Exit 1.

---

## 5. EXIT CODES

| Exit | Meaning |
|---|---|
| 0 | every rule holds an equal phrase count on both sides of every pair that teaches it, and every rule met its floor |
| 1 | at least one phrase count differed across a pair, a rule fell below its declared floor, or a scanned file carries a retired name or cannot be read |
| 2 | the shared declaration could not be read, `media-editor` is not declared in it, or it declares no pairs |

---

## 6. PROVEN RED

Both failure modes were confirmed on a scratch copy of this system and the shared declaration, run with `CW_ROOT` pointed at the copy, so no tracked file was edited.

- Deleting `If neither the tools nor the check answers, give the command as advice with install guidance and run nothing.` from only the Project mirror of the Image Operations pair named the phrase, the 1x/0x split, the source and its mirror, and returned exit 1
- Appending one line naming Imagician to the copy's `SKILL.md` printed `retired name Imagician: 1x in sk-media-editor/SKILL.md` with its line number and returned exit 1

Restoring both files returned the run to `PASSED` and exit 0.

---

## 7. RELATED

- [`../parity/README.md`](../parity/README.md), the document-inventory wrappers this check does not duplicate
- [`../../../z — Claude Project Sync Loop/systems.py`](../../../z%20—%20Claude%20Project%20Sync%20Loop/systems.py), the shared declaration this check reads and never writes
- [`../grader/README.md`](../grader/README.md), the checks that read a finished report rather than the declared pairs
