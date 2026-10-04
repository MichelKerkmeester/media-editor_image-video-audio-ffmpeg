#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: ROUTE CONTRACT GATE
# ───────────────────────────────────────────────────────────────
# Deterministic route-contract gate.
#
# Two checks run, and the gate fails if either one does.
#
# The fixture manifest is the regression oracle for the executable route
# contract: the same command must fail on a naive substring/keyword-first
# router (which would bind $audio-from-this-video to VIDEO, or match photo
# inside photography) and pass on the exact-token one.
#
# The differential harness is the anti-drift oracle. It lifts the Smart Router
# pseudocode out of references/router-contract.md, executes it in each host
# state, and proves the contract agrees with it on tables, on the route object
# and on the kernel's comment-stripped copy. Fixtures alone cannot catch the
# prose router and the oracle drifting together.
#
# Exit Codes:
#   0 - Every check passed
#   1 - At least one check failed
#   2 - The run was refused before anything was checked
set -uo pipefail
cd "$(dirname "$0")" || exit 2

status=0
python3 route_contract.py fixtures.json || status=$?
[ "$status" = 2 ] && exit 2
python3 differential.py
code=$?
[ "$code" = 2 ] && exit 2
[ "$code" != 0 ] && status=1
exit "$status"
