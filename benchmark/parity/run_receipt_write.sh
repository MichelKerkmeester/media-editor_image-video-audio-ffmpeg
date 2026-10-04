#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: UPLOAD RECEIPT WRITER ENTRY
# ───────────────────────────────────────────────────────────────
# This system's entry into the upload receipt writer. The shared writer renders
# one receipt line from the live kernel and knowledge directory and verifies it
# with the parity gate's own checker. This file supplies the only per-system
# thing: the directory it writes against.
#
# Exit Codes:
#   0 - The shared receipt writer passed the gate's own checks
#   1 - The shared receipt writer rejected the line or refused SYNC.md
#   2 - The run was refused before anything was checked
set -uo pipefail
cd "$(dirname "$0")" || exit 2

exec python3 "../../../z — Claude Project Sync Loop/write_receipt.py" "$(cd ../.. && pwd)" "$@"
