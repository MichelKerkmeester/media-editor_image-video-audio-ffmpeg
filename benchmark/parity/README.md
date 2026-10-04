---
title: "benchmark/parity: wrappers into the shared parity gate"
description: "Five wrappers that exec into the shared Sync Loop checks, passing the id or directory those checks cannot know."
trigger_phrases:
  - "parity wrappers"
  - "upload receipt"
---

# benchmark/parity: wrappers into the shared parity gate

---

## 1. OVERVIEW

`benchmark/parity/` holds this system's wrappers into the shared parity gate. The gate lives in `AI Systems/z — Claude Project Sync Loop/` and decides whether the hand-authored Claude Project package matches its skill sources. A wrapper hands over the only per-system thing the gate cannot know, a system id or a target directory, then execs.

Current state:

- Two wrappers run the shared gate, one runs the receipt writer, one runs the carrier query and one runs the residency check
- Each ends in an `exec`, so the tool's exit code is the wrapper's
- No check or receipt logic lives here, the shared tools own those
- Every wrapper finds its own directory first, so where you run it does not matter

---

## 2. FILES

| Wrapper | Responsibility |
|---|---|
| `run_parity.sh` | Runs the shared gate with this system's id. Extra arguments pass through, so `--range` pins a commit range, default `origin/main..HEAD` |
| `run_receipts.sh` | Runs the shared gate with `--receipts`, which makes the dated upload receipt a required check |
| `run_receipt_write.sh` | Runs the shared receipt writer against this system's directory, resolved at run time |
| `run_query.sh` | Runs the shared carrier query walk over `origin/main..HEAD`. The walk covers every declared system in one pass, so it passes nothing per-system. Pass `--range` to check a pinned batch |
| `run_residency.sh` | Runs the shared residency check with this system's id, which holds every declared kernel statement to its kernel or its declared home |

---

## 3. EXIT CODES

`run_parity.sh` and `run_receipts.sh` return the shared gate's codes:

| Exit | Meaning |
|---|---|
| 0 | every check passed |
| 1 | the gate reported findings, a parity violation or a due mirror review |
| 2 | the system layout is incomplete or the id is not declared in the gate |

Under `--receipts` a receipt that is missing or stale is a finding like any other, and the run exits 1.

`run_receipt_write.sh` returns the receipt writer's own codes. 0, the rendered line passed the gate's own checks. 1, the rendered line failed them. 2, the system layout or a supplied argument is unusable.

`run_query.sh` returns the carrier query's codes. 0, the walk found nothing blocked. 1, the walk reported a block. 2, the run was refused before anything was checked.

`run_residency.sh` returns the residency check's codes. 0, every declared statement sits in its kernel or its declared home. 1, the check reported a finding. 2, the run was refused before anything was checked.

---

## 4. RUN

From the system directory:

```bash
bash benchmark/parity/run_parity.sh
```

Expected result: a line that names this system and the range. Then notes. Then `PASSED` with the declared pair count. Exit 0.

```bash
bash benchmark/parity/run_receipt_write.sh
```

Expected result: the one dated receipt line, printed after the gate's receipt check accepts it. Exit 0. With `--append` the line is added to `SYNC.md` under the review notes heading.

---

## 5. SHARED BY DESIGN

All seven systems that have these wrappers carry this README byte for byte, because nothing in it names a system. `run_query.sh` and `run_receipt_write.sh` are byte-identical across the seven as well: the query walks the whole declaration and the receipt writer resolves its directory at run time. `run_parity.sh`, `run_receipts.sh` and `run_residency.sh` each pass their own system's id, so those three differ from system to system.

---

## 6. RELATED

- [`SYNC.md`](../../SYNC.md), the parity rules it states, the four the gate decides
- [`z — Claude Project Sync Loop/README.md`](../../../z%20—%20Claude%20Project%20Sync%20Loop/README.md), the shared checks these wrappers exec into
