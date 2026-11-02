#!/usr/bin/env bash
# Runs every gate in plan.md section 5 and saves output plus exit code.
# Usage: run-gates.sh <outdir>
set -u
ROOT="/Users/michelkerkmeester/MEGA/Development/AI Systems"
ME="$ROOT/AI Systems/Media Editor"
SL="$ROOT/AI Systems/z — Claude Project Sync Loop"
OUT="$1"; mkdir -p "$OUT"; : > "$OUT/exit-codes.txt"
export PYTHONPYCACHEPREFIX="$(mktemp -d)"
run() { local name="$1"; shift; ( "$@" ) >"$OUT/$name.txt" 2>&1; local rc=$?; printf '%-22s %s\n' "$name" "$rc" >> "$OUT/exit-codes.txt"; }
cd "$ME"
run fixtures bash benchmark/router/run_fixtures.sh
[ -f benchmark/router/differential.py ] && run differential python3 benchmark/router/differential.py
run rule_parity python3 benchmark/gates/rule_parity.py
run parity bash benchmark/parity/run_parity.sh
run residency bash benchmark/parity/run_residency.sh
run pair_divergence python3 "$SL/pair_divergence.py" media-editor
run residency_report python3 "$SL/residency_report.py"
run carrier_evidence python3 "$SL/carrier_query_evidence.py"
run record_claims python3 "$SL/record_claims.py"
run check_criteria bash "$SL/check_criteria.sh"
cd "$ROOT"
run playbook node .skilled/skills/sk-doc/sk-create-manual-testing-playbook/scripts/validate-playbook-package.cjs --repo-root "$PWD" --package "AI Systems/Media Editor/sk-media-editor/manual-testing-playbook"
run retired_names grep -rIn -i 'imagician\|mcp-video-audio\|video-audio\|mcp video audio' "AI Systems/Media Editor" "AI Systems/z — Claude Project Sync Loop" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=dist-bundles
cd "$ME/mcp server"
run npm_test npm test --silent
cat "$OUT/exit-codes.txt"
