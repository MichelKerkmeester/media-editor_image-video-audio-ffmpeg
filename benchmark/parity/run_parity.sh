#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: PARITY GATE ENTRY
# ───────────────────────────────────────────────────────────────
# This system's entry into the shared parity gate. The four rules every SYNC.md
# states had a check side in one system out of ten, so "synced" rested on an
# assertion everywhere else. The checks live with the declaration they read, and
# this file supplies the only per-system thing: the id.
#
# Default range is origin/main..HEAD. Pass --range to check a pinned batch.
#
# Exit Codes:
#   0 - The shared parity gate holds on every rule
#   1 - The shared parity gate reported a finding
#   2 - The run was refused before anything was checked
set -uo pipefail
cd "$(dirname "$0")" || exit 2

exec python3 "../../../z — Claude Project Sync Loop/validate_parity.py" media-editor "$@"
