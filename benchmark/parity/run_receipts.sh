#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: UPLOAD RECEIPT ENTRY
# ───────────────────────────────────────────────────────────────
# This system's entry into the upload receipt check. A receipt is the only
# record that a live Project was updated, and it stops being trustworthy the
# moment the kernel or the knowledge directory moves, so this wrapper runs the
# shared checker with the receipt required and supplies the one per-system
# thing: the id.
#
# Exit Codes:
#   0 - The shared receipt check holds on every rule
#   1 - The shared receipt check reported a finding
#   2 - The run was refused before anything was checked
set -uo pipefail
cd "$(dirname "$0")" || exit 2

exec python3 "../../../z — Claude Project Sync Loop/validate_parity.py" media-editor --receipts "$@"
