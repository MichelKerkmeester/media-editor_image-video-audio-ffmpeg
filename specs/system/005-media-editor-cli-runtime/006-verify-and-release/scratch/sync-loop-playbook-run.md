---
title: "z — Claude Project Sync Loop: playbook run record"
description: "Every playbook scenario run in the sandbox clone on 2026-10-05, with commands, outputs, exits and verdicts."
version: 1.0.0.0
---

# z — Claude Project Sync Loop: playbook run record

- Date: 2026-10-05
- Repository under test: the sandbox clone of the repository, with the live trees committed
- Scope: every scenario in `AI Systems/z — Claude Project Sync Loop/manual-testing-playbook/`

## How the run was made

- Every command is copied from the scenario file as written and run from the clone root.
- Every output line below is copied from the captured transcript of that run.
- The proof-family runs (SELF-001, SELF-002, EXP-001) ran strictly sequentially, per precondition 3.
- The clone was clean before and after. `git status --short` printed nothing, and `git worktree list` showed only the clone's own worktree.

## Verdict summary

| Scenario | Category | Command | Exit | Verdict |
|---|---|---|---|---|
| PAR-001 | Parity checks | `bash "AI Systems/Media Editor/benchmark/parity/run_parity.sh" --range origin/main~1..origin/main` | 0 | PASS |
| REC-001 | Receipt check | `bash "AI Systems/Media Editor/benchmark/parity/run_receipt_write.sh" --date 2026-09-14` then the check block | 0 | PASS |
| REC-002 | Receipt check | `bash "AI Systems/Media Editor/benchmark/parity/run_receipts.sh" --range origin/main~1..origin/main` | 1 | PASS |
| VERB-001 | Four verbs | `C open playbook-demo --range HEAD~1..HEAD` | 0 | PASS |
| VERB-002 | Four verbs | `C dispatch playbook-demo --step note --declare tracked.txt --run 'printf second pinned > tracked.txt; cat tracked.txt'` | 0 | PASS |
| VERB-003 | Four verbs | `C dispatch playbook-demo --step quiet --run 'printf second pinned > tracked.txt'` | 1 | PASS |
| VERB-004 | Four verbs | `C dispatch playbook-demo --step pair --declare note.txt --run 'printf agreed > note.txt; cat note.txt' --family 'echo A' --family 'echo B'` | 0 | PASS |
| VERB-005 | Four verbs | `C adjudicate playbook-demo --step pair --decision keep-first --why "the first wording is agreed" --operator playbook` | 0 | PASS |
| VERB-006 | Four verbs | `C close playbook-demo --operator playbook` then `ls /tmp/parity-playbook/wt` | 0 | PASS |
| SELF-001 | Selftest | `python3 "AI Systems/z — Claude Project Sync Loop/episode_selftest.py"` | 0 | PASS |
| SELF-002 | Selftest | `python3 "AI Systems/z — Claude Project Sync Loop/episode_selftest.py" --inject leak` | 1 | PASS |
| EXP-001 | Expiry proof | `python3 "AI Systems/z — Claude Project Sync Loop/prove_review_expiry.py"` | 0 | PASS |

Release readiness: 12 of 12 scenarios PASS. The package validator passes with 0 violations and 0 warnings. Its command and output are recorded in the last section.

## Scenario runs

### PAR-001, seven parity checks

| Field | Value |
|---|---|
| Command | `bash "AI Systems/Media Editor/benchmark/parity/run_parity.sh" --range origin/main~1..origin/main` |
| Exit code | 0 |
| Expected signals | the header line `Media Editor parity, range origin/main~1..origin/main`, one indented note per check, then exactly `PASSED 7/7 declared pairs, seven checks` |
| Verdict | PASS |
| Reason | The last printed line is exactly `PASSED 7/7 declared pairs, seven checks` and the exit code is 0. The header names the pinned range. The kernel bumps note reads `origin/main~1..origin/main contains no commit touching the kernel`. |
| Date | 2026-10-05 |

Full output:

```text
Media Editor parity, range origin/main~1..origin/main
  pairs: 7 of 7 declared resolved, 9 sources, 2 deliberately unmirrored
  adapted pairs: 0 declared, 0 omitted source line(s) held to the pair's files
  shared sources: 0 checked, 0 of them vendored copies, 0 forked, 0 fork(s) declared with a reason
  manifest: 7 named across 0 roll-up row(s), 7 on disk, declared total(s) [7]
  kernel bumps: origin/main~1..origin/main contains no commit touching the kernel
  version record: live kernel v1.1.0 named among 21 dated notes, a record of the version and not proof of a review
  version claims: kernel v1.1.0 and Skill v1.1.0.0 live, README states ['1.1.0'] and ['1.1.0.0']
  review-due drift: 7 of 7 owned pairs in step, 0 source change(s) confined to constructs a mirror never carries, 0 where the source caught up to an already-correct mirror, 0 cleared by a review recorded at the current source commit, 0 recorded review(s) whose recorded commit the source has moved past, 0 pair(s) whose history could not be read, 0 path(s) differing from their committed revision, 0 pair(s) with no record and a review due on the drift alone
  review keys: compared for all 0 declared record(s) before any timestamp comparison ran, 0 still stand at the commit they name
PASSED 7/7 declared pairs, seven checks

```

### REC-001, the dated receipt line

| Field | Value |
|---|---|
| Command | 1. `bash "AI Systems/Media Editor/benchmark/parity/run_receipt_write.sh" --date 2026-09-14` 2. the check block in section 3 of `receipt-check/dated-upload-receipt.md`, extracted byte for byte and run as a script |
| Exit code | 0 for the writer, 0 for the check |
| Expected signals | one line for the date `2026-09-14`, its count equal to the knowledge folder's Markdown files, every key the check recomputes, the check closes `PASS` |
| Verdict | PASS |
| Reason | The printed line carries the date `2026-09-14` and names 7 files. The check recomputed the kernel key with `shasum -a 256`, recomputed the uploaded key over the named files' shasums, and compared the count and the names with the knowledge folder. It closed `PASS: date 2026-09-14, 7 knowledge files, kernel and uploaded keys recomputed from shasum` and exited 0. |
| Date | 2026-10-05 |

Full output of both steps:

```text
- 2026-09-14 upload receipt: kernel H1 v1.1.0 key sha256:1dd517deb92a8f274da4f9485ef07215ce34de61ea4d116a77c72b6873455d78 | uploaded 7 files key sha256:8204e7d85fc5e03d62059a6ac5a6ec6902d626ae27d2860fcd1d3a819e4b0d4c names: Media Editor - Integrations - Image Operations.md, Media Editor - Integrations - Video And Audio Operations.md, Media Editor - Reference - HLS Video Conversion.md, Media Editor - Reference - Media Editor Tools.md, Media Editor - Reference - Setup.md, Media Editor - System - Interactive Intelligence.md, Media Editor - Thinking - MEDIA Framework.md | deleted 0 files key sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 names: none
PASS: date 2026-09-14, 7 knowledge files, kernel and uploaded keys recomputed from shasum

```

The check block as run:

```bash
SYSTEM="AI Systems/Media Editor"
KERNEL="$SYSTEM/claude project/Custom Instructions.md"
KNOWLEDGE="$SYSTEM/claude project/knowledge"
line="$(bash "$SYSTEM/benchmark/parity/run_receipt_write.sh" --date 2026-09-14)" || exit 2
printf '%s\n' "$line"

python3 - "$line" "$KERNEL" "$KNOWLEDGE" <<'PY'
import hashlib, os, re, subprocess, sys

line, kernel, knowledge = sys.argv[1], sys.argv[2], sys.argv[3]
problems = []

def shasum(path):
    out = subprocess.run(["shasum", "-a", "256", path], check=True,
                         capture_output=True, text=True).stdout
    return out.split()[0]

m = re.fullmatch(
    r"- (\d{4}-\d{2}-\d{2}) upload receipt: kernel H1 v([0-9A-Za-z.\-]+) "
    r"key sha256:([0-9a-f]{64}) \| uploaded (\d+) (?:file|files) "
    r"key sha256:([0-9a-f]{64}) names: (.*?) \| deleted (\d+) (?:file|files) "
    r"key sha256:([0-9a-f]{64}) names: (.*)", line)
if not m:
    print("FAIL: the printed line does not match the receipt shape")
    sys.exit(1)
date, version, kernel_key, count, uploaded_key, names, deleted, deleted_key, deleted_names = m.groups()

if date != "2026-09-14":
    problems.append(f"date is {date}, not 2026-09-14")
if shasum(kernel) != kernel_key:
    problems.append("the kernel key is not the shasum of the kernel file")

on_disk = sorted(name for name in os.listdir(knowledge) if name.endswith(".md"))
if int(count) != len(on_disk):
    problems.append(f"the line counts {count} uploaded files, the knowledge folder holds {len(on_disk)}")

line_names = [name.strip() for name in names.split(",")] if names != "none" else []
if line_names != on_disk:
    problems.append("the names in the line are not the knowledge folder's files")

material = bytearray()
for name in on_disk:
    material += f"{name}\0{shasum(os.path.join(knowledge, name))}\n".encode("utf-8")
if hashlib.sha256(material).hexdigest() != uploaded_key:
    problems.append("the uploaded key is not the sha256 over the named files' shasums")
if deleted != "0" or deleted_names != "none":
    problems.append("the deleted set is not empty")
if deleted_key != hashlib.sha256(b"").hexdigest():
    problems.append("the deleted key is not the empty-input sha256")

if problems:
    for problem in problems:
        print(f"FAIL: {problem}")
    sys.exit(1)
print(f"PASS: date {date}, {count} knowledge files, kernel and uploaded keys recomputed from shasum")
PY
```

### REC-002, the receipt check bites while nothing stands

| Field | Value |
|---|---|
| Command | `bash "AI Systems/Media Editor/benchmark/parity/run_receipts.sh" --range origin/main~1..origin/main` |
| Exit code | 1 |
| Expected signals | the output ends `FAILED 1 parity finding(s)`, then exactly ` - SYNC.md: carries no dated upload receipt, so nothing states what the live Project holds or that the local package reached it` |
| Verdict | PASS |
| Reason | The pinned batch leaves the single receipt finding, and the closing lines are exactly the expected pair. Exit 1 is the documented outcome for this scenario, because the check is expected to bite. |
| Date | 2026-10-05 |

Full output:

```text
Media Editor parity, range origin/main~1..origin/main
  pairs: 7 of 7 declared resolved, 9 sources, 2 deliberately unmirrored
  adapted pairs: 0 declared, 0 omitted source line(s) held to the pair's files
  shared sources: 0 checked, 0 of them vendored copies, 0 forked, 0 fork(s) declared with a reason
  manifest: 7 named across 0 roll-up row(s), 7 on disk, declared total(s) [7]
  kernel bumps: origin/main~1..origin/main contains no commit touching the kernel
  version record: live kernel v1.1.0 named among 21 dated notes, a record of the version and not proof of a review
  version claims: kernel v1.1.0 and Skill v1.1.0.0 live, README states ['1.1.0'] and ['1.1.0.0']
  review-due drift: 7 of 7 owned pairs in step, 0 source change(s) confined to constructs a mirror never carries, 0 where the source caught up to an already-correct mirror, 0 cleared by a review recorded at the current source commit, 0 recorded review(s) whose recorded commit the source has moved past, 0 pair(s) whose history could not be read, 0 path(s) differing from their committed revision, 0 pair(s) with no record and a review due on the drift alone
  review keys: compared for all 0 declared record(s) before any timestamp comparison ran, 0 still stand at the commit they name
FAILED 1 parity finding(s)
 - SYNC.md: carries no dated upload receipt, so nothing states what the live Project holds or that the local package reached it

```

### The four-verbs fixture

The rows below ran against the fixture built by the setup block in section 3 of `four-verbs/throwaway-episode.md`. The block removes and recreates `/tmp/parity-playbook`, so it ran only against disposable data.

| Field | Value |
|---|---|
| Setup command | the setup block in section 3 of `four-verbs/throwaway-episode.md`, copied as written |
| Exit code | 0 |
| Expected signals | the fixture builds from the repository root, silent, exit 0 |
| Verdict | PASS |
| Reason | The fixture built at `/tmp/parity-playbook` with the two commits `feat(playbook): seed the throwaway fixture` and `feat(playbook): second fixture commit`, and exited 0. |
| Date | 2026-10-05 |

The setup block as run:

```bash
R=/tmp/parity-playbook/repo
C() { python3 "$R/AI Systems/z — Claude Project Sync Loop/episode_control.py" --state-dir /tmp/parity-playbook/state --worktree-root /tmp/parity-playbook/wt "$@"; }
rm -rf /tmp/parity-playbook && mkdir -p "$R/AI Systems" /tmp/parity-playbook/wt
cp -R "AI Systems/z — Claude Project Sync Loop" "$R/AI Systems/"
echo first > "$R/tracked.txt"
git -C "$R" init -q -b main && git -C "$R" add -A
git -C "$R" -c user.name=pb -c user.email=pb@x.test commit -qm "feat(playbook): seed the throwaway fixture" -m "a throwaway copy of the parity gate"
echo second >> "$R/tracked.txt"
git -C "$R" -c user.name=pb -c user.email=pb@x.test commit -qam "feat(playbook): second fixture commit"
```

### VERB-001, open pins

| Field | Value |
|---|---|
| Command | `C open playbook-demo --range HEAD~1..HEAD` |
| Exit code | 0 |
| Expected signals | line 2 of the record is `  "id": "playbook-demo",` |
| Verdict | PASS |
| Reason | The record opened with the id on line 2. The full record is one JSON document of 638,848 bytes over 17,240 lines, sha256 `518c7f590c2ff867`. The asserted line is quoted verbatim below, with the record's opening lines. |
| Date | 2026-10-05 |

Asserted line, verbatim:

```text
  "id": "playbook-demo",
```

Record opening:

```text
{
  "id": "playbook-demo",
  "opened_at": "2026-10-04T22:45:39Z",
  "repo": "/private/tmp/parity-playbook/repo",
  "note": null,
  "state_identity": [
    16777233,
    620136266
  ],
  "state_root_mode": "0o755",
  "lock_identity": [
    16777233,
```

The record is a single JSON document whose top-level keys are `id`, `opened_at`, `repo`, `note`, `state_identity`, `state_root_mode`, `lock_identity`, `lock_mode`, `declaration`, `commit_range`, `live_head`, `tree_state`, `authorities`, `authority_keys`, `authority_states`, `joins`, `steps`, `closed_at`, `closed_by`, `root_key`. Its remaining lines are the record's own file-hash inventories, so the record is quoted by its asserted lines and opening rather than in full. The full transcript was kept at `/tmp/pb-runs/verb001.out` during the run.

### VERB-002, dispatch accepts

| Field | Value |
|---|---|
| Command | `C dispatch playbook-demo --step note --declare tracked.txt --run 'printf second pinned > tracked.txt; cat tracked.txt'` |
| Exit code | 0 |
| Expected signals | the record carries `  "verdict": "accepted",` |
| Verdict | PASS |
| Reason | The record carries `"verdict": "accepted"` at line 50, with `tracked.txt` declared and recorded as changed. |
| Date | 2026-10-05 |

Full output:

```text
{
  "step": "note",
  "at": "2026-10-04T22:45:40Z",
  "declared": [
    "tracked.txt"
  ],
  "permitted": [],
  "run": "printf second pinned > tracked.txt; cat tracked.txt",
  "output_sha256": "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
  "stdout": {
    "text": "second",
    "sha256": "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
    "bytes": 6,
    "truncated": false,
    "has_content": true
  },
  "stderr": {
    "text": "",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "bytes": 0,
    "truncated": false,
    "has_content": false
  },
  "actual": [
    {
      "path": "tracked.txt",
      "change": "changed",
      "before": {
        "kind": "file",
        "sha256": "dbea9325179efe46ea2add94f7b6b745ca983fabb208dc6d34aa064623d7ee23",
        "mode": "0o644",
        "target": null,
        "target_sha256": null,
        "mtime_ns": 1791153940302493910
      },
      "after": {
        "kind": "file",
        "sha256": "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
        "mode": "0o644",
        "target": null,
        "target_sha256": null,
        "mtime_ns": 1791153940749178574
      }
    }
  ],
  "undeclared": [],
  "leaked": [],
  "families": [],
  "orphans": [],
  "verdict": "accepted",
  "reason": null,
  "content_key": "bb825abf75d332c2b4c8ca5fbf17fd69c4e66d4f24a2d003bdf6a5cf83302c87",
  "disagreement_key": null,
  "disposition": null,
  "worktree": "/private/tmp/parity-playbook/wt/episode-playbook-demo-z33d1dje/worktree",
  "worktree_parent": "/private/tmp/parity-playbook/wt/episode-playbook-demo-z33d1dje",
  "registration": "/private/tmp/parity-playbook/repo/.git/worktrees/worktree",
  "registration_baseline": {
    "key": "b4323bfce7abb35452d566d001cec121059af82ab99cfbc20a4a9272426355bd",
    "entries": [
      {
        "path": ".",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153940306520760
      },
      {
        "path": "HEAD",
        "kind": "file",
        "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
        "bytes": 41,
        "mode": "0o644",
        "mtime_ns": 1791153940135227526
      },
      {
        "path": "ORIG_HEAD",
        "kind": "file",
        "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
        "bytes": 41,
        "mode": "0o644",
        "mtime_ns": 1791153940305421464
      },
      {
        "path": "commondir",
        "kind": "file",
        "sha256": "340ddcb67a6204f742cd1e28e5b462622dde7daaa8ee36001897196aacdc6d47",
        "bytes": 6,
        "mode": "0o644",
        "mtime_ns": 1791153940134899608
      },
      {
        "path": "gitdir",
        "kind": "file",
        "sha256": "fddb61f9aef4a78d5cc0b18c9a58a5f2621cd3abd0e666f848f7a6b61f4ab633",
        "bytes": 77,
        "mode": "0o644",
        "mtime_ns": 1791153940134780732
      },
      {
        "path": "index",
        "kind": "file",
        "sha256": "98a257b14c8eaf4234509b039506f8b132277bde3e3713065494f1a9ecfc77f5",
        "bytes": 150208,
        "mode": "0o644",
        "mtime_ns": 1791153940305132546
      },
      {
        "path": "logs",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153940135311693
      },
      {
        "path": "logs/HEAD",
        "kind": "file",
        "sha256": "8f0405c1af59a9ebffdd315043fa94121c14226b89f23bf500aafdd57d732dc7",
        "bytes": 172,
        "mode": "0o644",
        "mtime_ns": 1791153940135639528
      },
      {
        "path": "refs",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153940135109900
      }
    ]
  },
  "worktree_removed_at": null,
  "cleanup_failure": null
}

```

### VERB-003, the refusal records

| Field | Value |
|---|---|
| Command | `C dispatch playbook-demo --step quiet --run 'printf second pinned > tracked.txt'` |
| Exit code | 1 |
| Expected signals | stderr carries exactly `REFUSED: the step produced no output, and an empty result is a failure rather than a pass`, then the record with `  "verdict": "refused",` |
| Verdict | PASS |
| Reason | stdout is empty. stderr opens with exactly the expected refusal line, then the record. The record carries `"verdict": "refused"`, lists `tracked.txt` under `undeclared`, and shows the step's worktree removed. The episode continues. |
| Reviewer note | This verdict was too lenient. The playbook quoted the line with two leading spaces, and the record prints it with four because it sits inside the nested step. The orchestrator corrected the quote to four spaces and reran the row in the clone: it printed `    "verdict": "refused",` and exited 1. |
| Date | 2026-10-05 |

Full stderr, stdout was empty:

```text
REFUSED: the step produced no output, and an empty result is a failure rather than a pass
{
  "step": {
    "step": "quiet",
    "at": "2026-10-04T22:45:41Z",
    "declared": [],
    "permitted": [],
    "run": "printf second pinned > tracked.txt",
    "output_sha256": null,
    "stdout": {
      "text": "",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "truncated": false,
      "has_content": false
    },
    "stderr": {
      "text": "",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "bytes": 0,
      "truncated": false,
      "has_content": false
    },
    "actual": [
      {
        "path": "tracked.txt",
        "change": "changed",
        "before": {
          "kind": "file",
          "sha256": "dbea9325179efe46ea2add94f7b6b745ca983fabb208dc6d34aa064623d7ee23",
          "mode": "0o644",
          "target": null,
          "target_sha256": null,
          "mtime_ns": 1791153941419775447
        },
        "after": {
          "kind": "file",
          "sha256": "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
          "mode": "0o644",
          "target": null,
          "target_sha256": null,
          "mtime_ns": 1791153941849231120
        }
      }
    ],
    "undeclared": [
      "tracked.txt"
    ],
    "leaked": [],
    "families": [],
    "orphans": [],
    "verdict": "refused",
    "reason": "the step produced no output, and an empty result is a failure rather than a pass",
    "content_key": "8a5d9d05546dc7018f6b90ff4e6cd9e61dd112b8fa9d2025e7776cf9e9681264",
    "disagreement_key": null,
    "disposition": null,
    "worktree": "/private/tmp/parity-playbook/wt/episode-playbook-demo-_45esd1w/worktree",
    "worktree_parent": "/private/tmp/parity-playbook/wt/episode-playbook-demo-_45esd1w",
    "registration": "/private/tmp/parity-playbook/repo/.git/worktrees/worktree1",
    "registration_baseline": {
      "key": "da406be01360150500e6fb8eba054daaf7b8ec422a71141461d5aeb410e8b2ae",
      "entries": [
        {
          "path": ".",
          "kind": "directory",
          "sha256": "directory",
          "bytes": null,
          "mode": "0o755",
          "mtime_ns": 1791153941423937548
        },
        {
          "path": "HEAD",
          "kind": "file",
          "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
          "bytes": 41,
          "mode": "0o644",
          "mtime_ns": 1791153941248501213
        },
        {
          "path": "ORIG_HEAD",
          "kind": "file",
          "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
          "bytes": 41,
          "mode": "0o644",
          "mtime_ns": 1791153941422895335
        },
        {
          "path": "commondir",
          "kind": "file",
          "sha256": "340ddcb67a6204f742cd1e28e5b462622dde7daaa8ee36001897196aacdc6d47",
          "bytes": 6,
          "mode": "0o644",
          "mtime_ns": 1791153941248130628
        },
        {
          "path": "gitdir",
          "kind": "file",
          "sha256": "aa83b5193c79d3e8c38857337f4890a4d7f6669d4077fa01873a00c07ceb83b7",
          "bytes": 77,
          "mode": "0o644",
          "mtime_ns": 1791153941248010336
        },
        {
          "path": "index",
          "kind": "file",
          "sha256": "effaf54dadabc696f3f0a03b35bb9342f9482f22e4263b07c0f5f9ce1655375c",
          "bytes": 150208,
          "mode": "0o644",
          "mtime_ns": 1791153941422614751
        },
        {
          "path": "logs",
          "kind": "directory",
          "sha256": "directory",
          "bytes": null,
          "mode": "0o755",
          "mtime_ns": 1791153941248571755
        },
        {
          "path": "logs/HEAD",
          "kind": "file",
          "sha256": "69e8981ba1b0890140f07d93d542828c327ae0aaa4124612503e74415bdfb8bd",
          "bytes": 172,
          "mode": "0o644",
          "mtime_ns": 1791153941248915340
        },
        {
          "path": "refs",
          "kind": "directory",
          "sha256": "directory",
          "bytes": null,
          "mode": "0o755",
          "mtime_ns": 1791153941248377212
        }
      ]
    },
    "worktree_removed_at": "2026-10-04T22:45:42Z",
    "cleanup_failure": null
  }
}

```

### VERB-004, the disagreement holds

| Field | Value |
|---|---|
| Command | `C dispatch playbook-demo --step pair --declare note.txt --run 'printf agreed > note.txt; cat note.txt' --family 'echo A' --family 'echo B'` |
| Exit code | 0 |
| Expected signals | the record carries `  "verdict": "disagreement",` and `  "worktree_removed_at": null,` |
| Verdict | PASS |
| Reason | The record carries `"verdict": "disagreement"` at line 64 and `"worktree_removed_at": null` at line 149, so the hold keeps the worktree for the adjudication. The two families returned `A` and `B`, and the disagreement key is `61d5b2d97fbd3f5df5e9c88d112f96286c5dda185410f67d857c5122b891c12d`. |
| Date | 2026-10-05 |

Full output:

```text
{
  "step": "pair",
  "at": "2026-10-04T22:45:42Z",
  "declared": [
    "note.txt"
  ],
  "permitted": [],
  "run": "printf agreed > note.txt; cat note.txt",
  "output_sha256": "9eace41237dcecc2fd793cf88494b80062add70fac8358316003ac38866257da",
  "stdout": {
    "text": "agreed",
    "sha256": "9eace41237dcecc2fd793cf88494b80062add70fac8358316003ac38866257da",
    "bytes": 6,
    "truncated": false,
    "has_content": true
  },
  "stderr": {
    "text": "",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "bytes": 0,
    "truncated": false,
    "has_content": false
  },
  "actual": [
    {
      "path": "note.txt",
      "change": "appeared",
      "after": "9eace41237dcecc2fd793cf88494b80062add70fac8358316003ac38866257da"
    }
  ],
  "undeclared": [],
  "leaked": [],
  "families": [
    {
      "family": "family-a",
      "sha256": "06f961b802bc46ee168555f066d28f4f0e9afdf3f88174c1ee6f9de004fc30a0",
      "bytes": 2,
      "truncated": false,
      "text": "A\n",
      "stderr": {
        "text": "",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "bytes": 0,
        "truncated": false,
        "has_content": false
      }
    },
    {
      "family": "family-b",
      "sha256": "c0cde77fa8fef97d476c10aad3d2d54fcc2f336140d073651c2dcccf1e379fd6",
      "bytes": 2,
      "truncated": false,
      "text": "B\n",
      "stderr": {
        "text": "",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "bytes": 0,
        "truncated": false,
        "has_content": false
      }
    }
  ],
  "orphans": [],
  "verdict": "disagreement",
  "reason": null,
  "content_key": "11444acb277e174bc665a59aa18b941e7026e24589fad71b7dc715fbec477d8f",
  "disagreement_key": "61d5b2d97fbd3f5df5e9c88d112f96286c5dda185410f67d857c5122b891c12d",
  "disposition": null,
  "worktree": "/private/tmp/parity-playbook/wt/episode-playbook-demo-y_e9bywx/worktree",
  "worktree_parent": "/private/tmp/parity-playbook/wt/episode-playbook-demo-y_e9bywx",
  "registration": "/private/tmp/parity-playbook/repo/.git/worktrees/worktree1",
  "registration_baseline": {
    "key": "012a1f64ac143d2905137a693d6b6000d3d8cf1c4b65a39712ff992b58104d4e",
    "entries": [
      {
        "path": ".",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153942625095403
      },
      {
        "path": "HEAD",
        "kind": "file",
        "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
        "bytes": 41,
        "mode": "0o644",
        "mtime_ns": 1791153942444323503
      },
      {
        "path": "ORIG_HEAD",
        "kind": "file",
        "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
        "bytes": 41,
        "mode": "0o644",
        "mtime_ns": 1791153942624036232
      },
      {
        "path": "commondir",
        "kind": "file",
        "sha256": "340ddcb67a6204f742cd1e28e5b462622dde7daaa8ee36001897196aacdc6d47",
        "bytes": 6,
        "mode": "0o644",
        "mtime_ns": 1791153942443935460
      },
      {
        "path": "gitdir",
        "kind": "file",
        "sha256": "2423679d5196e2d3a0682f103fb77152f7085cb977eb69be35cc9cf5d0d45880",
        "bytes": 77,
        "mode": "0o644",
        "mtime_ns": 1791153942443818710
      },
      {
        "path": "index",
        "kind": "file",
        "sha256": "49b41c56ee0b14d8609ee80260bf0c809e7f7c702bbe2e29dfc0ce6904bf64ba",
        "bytes": 150208,
        "mode": "0o644",
        "mtime_ns": 1791153942623764897
      },
      {
        "path": "logs",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153942444382295
      },
      {
        "path": "logs/HEAD",
        "kind": "file",
        "sha256": "ff2976bc02a4baf6a7ad76124412d875ea42f73b0f41633cc028575c0d0c85ce",
        "bytes": 172,
        "mode": "0o644",
        "mtime_ns": 1791153942444898798
      },
      {
        "path": "refs",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153942444190378
      }
    ]
  },
  "worktree_removed_at": null,
  "cleanup_failure": null
}

```

### VERB-005, the decision lands

| Field | Value |
|---|---|
| Command | `C adjudicate playbook-demo --step pair --decision keep-first --why "the first wording is agreed" --operator playbook` |
| Exit code | 0 |
| Expected signals | the disposition carries `    "decision": "keep-first",` |
| Verdict | PASS |
| Reason | The disposition carries `"decision": "keep-first"` at line 71 with the operator `playbook`. |
| Date | 2026-10-05 |

Full output:

```text
{
  "step": "pair",
  "at": "2026-10-04T22:45:42Z",
  "declared": [
    "note.txt"
  ],
  "permitted": [],
  "run": "printf agreed > note.txt; cat note.txt",
  "output_sha256": "9eace41237dcecc2fd793cf88494b80062add70fac8358316003ac38866257da",
  "stdout": {
    "text": "agreed",
    "sha256": "9eace41237dcecc2fd793cf88494b80062add70fac8358316003ac38866257da",
    "bytes": 6,
    "truncated": false,
    "has_content": true
  },
  "stderr": {
    "text": "",
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "bytes": 0,
    "truncated": false,
    "has_content": false
  },
  "actual": [
    {
      "path": "note.txt",
      "change": "appeared",
      "after": "9eace41237dcecc2fd793cf88494b80062add70fac8358316003ac38866257da"
    }
  ],
  "undeclared": [],
  "leaked": [],
  "families": [
    {
      "family": "family-a",
      "sha256": "06f961b802bc46ee168555f066d28f4f0e9afdf3f88174c1ee6f9de004fc30a0",
      "bytes": 2,
      "truncated": false,
      "text": "A\n",
      "stderr": {
        "text": "",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "bytes": 0,
        "truncated": false,
        "has_content": false
      }
    },
    {
      "family": "family-b",
      "sha256": "c0cde77fa8fef97d476c10aad3d2d54fcc2f336140d073651c2dcccf1e379fd6",
      "bytes": 2,
      "truncated": false,
      "text": "B\n",
      "stderr": {
        "text": "",
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "bytes": 0,
        "truncated": false,
        "has_content": false
      }
    }
  ],
  "orphans": [],
  "verdict": "disagreement",
  "reason": null,
  "content_key": "11444acb277e174bc665a59aa18b941e7026e24589fad71b7dc715fbec477d8f",
  "disagreement_key": "61d5b2d97fbd3f5df5e9c88d112f96286c5dda185410f67d857c5122b891c12d",
  "disposition": {
    "at": "2026-10-04T22:45:43Z",
    "operator": "playbook",
    "decision": "keep-first",
    "why": "the first wording is agreed",
    "key": "61d5b2d97fbd3f5df5e9c88d112f96286c5dda185410f67d857c5122b891c12d"
  },
  "worktree": "/private/tmp/parity-playbook/wt/episode-playbook-demo-y_e9bywx/worktree",
  "worktree_parent": "/private/tmp/parity-playbook/wt/episode-playbook-demo-y_e9bywx",
  "registration": "/private/tmp/parity-playbook/repo/.git/worktrees/worktree1",
  "registration_baseline": {
    "key": "012a1f64ac143d2905137a693d6b6000d3d8cf1c4b65a39712ff992b58104d4e",
    "entries": [
      {
        "path": ".",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153942625095403
      },
      {
        "path": "HEAD",
        "kind": "file",
        "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
        "bytes": 41,
        "mode": "0o644",
        "mtime_ns": 1791153942444323503
      },
      {
        "path": "ORIG_HEAD",
        "kind": "file",
        "sha256": "b116439dc4c5863b2a51e9e7f392df41c86f2721e240a716d0eb5190bee5820d",
        "bytes": 41,
        "mode": "0o644",
        "mtime_ns": 1791153942624036232
      },
      {
        "path": "commondir",
        "kind": "file",
        "sha256": "340ddcb67a6204f742cd1e28e5b462622dde7daaa8ee36001897196aacdc6d47",
        "bytes": 6,
        "mode": "0o644",
        "mtime_ns": 1791153942443935460
      },
      {
        "path": "gitdir",
        "kind": "file",
        "sha256": "2423679d5196e2d3a0682f103fb77152f7085cb977eb69be35cc9cf5d0d45880",
        "bytes": 77,
        "mode": "0o644",
        "mtime_ns": 1791153942443818710
      },
      {
        "path": "index",
        "kind": "file",
        "sha256": "49b41c56ee0b14d8609ee80260bf0c809e7f7c702bbe2e29dfc0ce6904bf64ba",
        "bytes": 150208,
        "mode": "0o644",
        "mtime_ns": 1791153942623764897
      },
      {
        "path": "logs",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153942444382295
      },
      {
        "path": "logs/HEAD",
        "kind": "file",
        "sha256": "ff2976bc02a4baf6a7ad76124412d875ea42f73b0f41633cc028575c0d0c85ce",
        "bytes": 172,
        "mode": "0o644",
        "mtime_ns": 1791153942444898798
      },
      {
        "path": "refs",
        "kind": "directory",
        "sha256": "directory",
        "bytes": null,
        "mode": "0o755",
        "mtime_ns": 1791153942444190378
      }
    ]
  },
  "worktree_removed_at": null,
  "cleanup_failure": null
}

```

### VERB-006, close releases

| Field | Value |
|---|---|
| Command | 1. `C close playbook-demo --operator playbook` 2. `ls /tmp/parity-playbook/wt` |
| Exit code | 0 for the close, 0 for the listing |
| Expected signals | the record carries `  "closed_by": "playbook",` and the listing prints nothing |
| Verdict | PASS |
| Reason | The closing record carries `"closed_by": "playbook"` and fills every step's removal timestamp, with `"worktree_removed_at": null` appearing 0 times and a filled timestamp appearing 3 times. The listing printed nothing, 0 bytes, so every worktree is gone at close. The full record is one JSON document of 653,090 bytes over 17,672 lines, sha256 `6126c81c0b07c133`. |
| Date | 2026-10-05 |

Asserted line, verbatim:

```text
  "closed_by": "playbook",
```

Record opening:

```text
{
  "id": "playbook-demo",
  "opened_at": "2026-10-04T22:45:39Z",
  "repo": "/private/tmp/parity-playbook/repo",
  "note": null,
  "state_identity": [
    16777233,
    620136266
```

Step 2 printed nothing. Its output was 0 bytes, exit 0.

The record is a single JSON document whose top-level keys are `id`, `opened_at`, `repo`, `note`, `state_identity`, `state_root_mode`, `lock_identity`, `lock_mode`, `declaration`, `commit_range`, `live_head`, `tree_state`, `authorities`, `authority_keys`, `authority_states`, `joins`, `steps`, `closed_at`, `closed_by`, `root_key`. Its remaining lines are the record's own file-hash inventories, so the record is quoted by its asserted lines and opening rather than in full. The full transcript was kept at `/tmp/pb-runs/verb006.out` during the run.

### SELF-001, every mechanism accepts the clean path

| Field | Value |
|---|---|
| Command | `python3 "AI Systems/z — Claude Project Sync Loop/episode_selftest.py"` |
| Exit code | 0 |
| Expected signals | one line per mechanism, then exactly `PASS: all N mechanisms accept the clean path`, where N is the number of entries in `SCENARIOS` |
| Verdict | PASS |
| Reason | The run printed 74 lines, one per mechanism, then `PASS: all 73 mechanisms accept the clean path`. N is 73, the current number of entries in `SCENARIOS`. Wall time was 96 seconds. |
| Date | 2026-10-05 |

Full output:

```text
clean worktree leak guard: a step with no write outside its worktree was accepted
clean declared intent: a step that wrote exactly its declared path was accepted
clean content key: an adjudicated disagreement closed after its key recomputed
clean two families: agreement passed without a disposition
clean content keys: every record kind recomputed and closed green
clean family runners: agreement passed and no family write escaped
clean ignored paths: a pre-existing ignored directory held its bytes
clean assume-unchanged run: a step that wrote nothing was accepted
clean worktree commit run: a step that wrote nothing was accepted
clean symlink run: the link and its outside target held their bytes
clean directory run: a step that created no directory was accepted
clean declaration pin: the pin came from the range head and the worktree carried it
clean refused step: the declaration check refused and the step record survived
clean cleanup: an accepted worktree was released by close
clean root key: an untouched record closed after its root key recomputed
clean leak then close: a step with no live write was accepted and close released it
clean forged removal: an untouched record closed and its worktree was gone
clean delayed child: a step that started no child was accepted and close released it
clean cleanup preserves: a step left no foreign file and close released it
clean receipt shape: a well-formed receipt produced no finding
clean receipt scope: a receipt under the review notes heading was read
clean receipt write: write_receipt.py rendered and printed one receipt line
clean directory link: a runner that only read the link was accepted
clean named pipe run: a step that created no special file was accepted
clean worktree metadata: close removed a worktree whose metadata was intact
clean state temp path: a runner that wrote no temp link was accepted
clean write temp collision: the record writer used a fresh temporary name
clean stream head: a small subprocess output passed through the reader
clean verb lock: with no holder the verb took the lock and ran
clean runner deadline: a runner that finished inside the deadline was accepted
clean cleanup sabotage: an unlocked parent let close remove the worktree
clean state leak close: a step that wrote no live state file was closed
clean authority join: the join carried the committed key as previous and the moved key as current, and the latest key advanced so no duplicate join appeared
clean backup symlink: the byte copy restored the link and left the linked directory intact
clean worktree add: the add returned a checkout below a fresh temp parent on no branch
clean worktree removal: the removal returned None and left no checkout, temp parent or registration
clean outside git write: a runner that only read the link was accepted
clean foreign json close: an untouched state directory closed
clean foreign lock: the second close passed with the earlier episode's lock beside its record
clean symlink loop: a runner that did nothing was accepted without spinning the walk
clean state root: the real directory constructed and the link was refused
clean git metadata write: a runner that wrote nothing was accepted
clean mode change: a runner that only read the tracked file was accepted
clean utime change: a runner that only read the tracked file was accepted
clean dir utime change: a runner that only listed the directory was accepted
clean dir utime behind declared: the declared child write left the directory unexplained
clean dir utime behind declared chmod: the declared child mode change left the directory unexplained
clean dir utime behind declared content: the declared child rewrite left the directory unexplained
clean root utime behind declared: the declared child write left the root unexplained
clean head moved: the live head held still and the step was accepted
clean git objects write: a runner that wrote nothing was accepted
clean git worktrees write: the control plane's own registration was excluded
clean git lock left: a runner that wrote no lock was accepted
clean orphan process: a runner that waited for its child was accepted
clean state root replaced: the original state directory carried the episode
clean state root fresh controller: the original controller carried the episode
clean spoofed registration: a runner that registered nothing was accepted
clean object same size: a runner that wrote nothing was accepted
clean family orphan: both families agreed and started nothing
clean registration alias: a runner that linked nothing was accepted
clean root mode change: a runner that only read the live root was accepted
clean state root mode close: a step that only read the state directory was accepted
clean family thread: both families agreed and started nothing
clean declared link: a write through a declared link inside the worktree was accepted
clean walk root: the state directory, the worktree and its registration each walked as a directory and the episode closed
clean link target metadata: mode and time writes through a declared link were accepted
clean declared deletion parent: a declared new child explained its directory's timestamp
clean linked worktree: a clean step dispatched and closed from the main checkout
clean authority path form: a repository relative authority pinned, verified and closed
clean absolute link declaration: a relative link declaration kept the link path
clean stream split whitespace: text after a space split across two reads was content
clean authority open state: an unchanged regular authority recorded no join
clean cli constructor refusal: the command line built the control plane on a real state directory and opened
PASS: all 73 mechanisms accept the clean path

```

### SELF-002, the injected leak fault is caught

| Field | Value |
|---|---|
| Command | `python3 "AI Systems/z — Claude Project Sync Loop/episode_selftest.py" --inject leak` |
| Exit code | 1 |
| Expected signals | the output ends `FAULT CAUGHT: the live tree moved outside the worktree, the step was refused and the worktree was discarded`, then `the injected leak fault was caught, so this run exits non-zero` |
| Verdict | PASS |
| Reason | Both lines appear in order and the exit code is 1, the documented caught-fault exit. |
| Date | 2026-10-05 |

Full output:

```text
FAULT CAUGHT: the live tree moved outside the worktree, the step was refused and the worktree was discarded
the injected leak fault was caught, so this run exits non-zero

```

### EXP-001, the review expiry proof

| Field | Value |
|---|---|
| Command | `python3 "AI Systems/z — Claude Project Sync Loop/prove_review_expiry.py"` |
| Exit code | 0 |
| Expected signals | the census line `recorded reviews in the fleet: N`, the target line naming the selected pair, `step 1  baseline, gate as declared: green`, the throwaway worktree line, `step 2  record repointed at cafebabe: red` with exactly one finding naming the injected key, `step 3  live declaration unchanged, gate as declared again: green`, then the PASS line naming the selected system |
| Verdict | PASS |
| Reason | The run selected `sales-direct-communication references/depth-framework.md`, whose recorded key `de61d23` still matches source `de61d232`. Step 1 read green, step 2 read red with exactly one finding naming `cafebabe`, step 3 read the live declaration back green, and the closing line named the selected system. The injected record was committed in a throwaway detached worktree under `/var/folders/.../T/review-expiry-worktree-ybiv9mzu/worktree`, and the live declaration was never written. |
| Date | 2026-10-05 |

Full output:

```text
recorded reviews in the fleet: 1
  sales-direct-communication references/depth-framework.md: record de61d23, source de61d232, key matches, timestamps in step, gate green

target: sales-direct-communication references/depth-framework.md
  recorded key de61d23 still matches the source's commit de61d232, and the gate is green before anything is written, so the injection is the only change that can turn it red

step 1  baseline, gate as declared: green
  injected record committed in the throwaway worktree at /var/folders/3c/zfqcqsts0kn19cgblj82gqhm0000gn/T/review-expiry-worktree-ybiv9mzu/worktree
step 2  record repointed at cafebabe: red
         - depth-framework.md: a review was recorded at cafebabe and the source's latest commit is de61d232, so the recorded decision no longer covers it
step 3  live declaration unchanged, gate as declared again: green

PASS green, red, green: the key comparison turned sales-direct-communication red with the timestamp guard silent, and the live declaration is green again

```

## Package validator

| Field | Value |
|---|---|
| Command | `node .skilled/skills/sk-doc/sk-create-manual-testing-playbook/scripts/validate-playbook-package.cjs --repo-root "$PWD" --skills-root "AI Systems"` |
| Exit code | 0 |
| Verdict | PASS |
| Reason | The package passes with 0 violations and 0 warnings. |
| Date | 2026-10-05 |

Output line for this package:

```text
PASS package=z — Claude Project Sync Loop tier=FAIL_CLOSED scenarios=5 categories=5 operator=5 routing_gold_excluded=0 violations=0 warnings=0
```
