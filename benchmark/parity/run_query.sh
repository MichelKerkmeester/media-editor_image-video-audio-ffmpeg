#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: CARRIER QUERY ENTRY
# ───────────────────────────────────────────────────────────────
# This system's entry into the carrier query walk. The walk covers the whole
# declared universe in one pass, not just this system, so every run_query.sh
# in the fleet runs the identical shared query and supplies nothing per-system.
#
# Default range is origin/main..HEAD. Pass --range to check a pinned batch.
#
# Exit Codes:
#   0 - The shared carrier query walk found nothing blocked
#   1 - The shared carrier query walk reported a block
#   2 - The run was refused before anything was checked
set -uo pipefail
cd "$(dirname "$0")" || exit 2

exec python3 "../../../z — Claude Project Sync Loop/carrier_query.py" walk --range origin/main..HEAD "$@"
