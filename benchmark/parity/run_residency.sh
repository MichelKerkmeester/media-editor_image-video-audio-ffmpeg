#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: RESIDENCY CHECK ENTRY
# ───────────────────────────────────────────────────────────────
# This system's entry into the shared residency check. The rows live in the
# parity declaration and the checker reuses the parity gate's readers, so this
# file supplies the only per-system thing: the id.
#
# Exit Codes:
#   0 - The shared residency check holds on every statement
#   1 - The shared residency check reported a finding
#   2 - The run was refused before anything was checked
set -uo pipefail
cd "$(dirname "$0")" || exit 2

exec bash "../../../z — Claude Project Sync Loop/run_residency.sh" media-editor
