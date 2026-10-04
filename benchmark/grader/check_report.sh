#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────
# COMPONENT: REPORT CHECK RUNNER
# ───────────────────────────────────────────────────────────────
# Run every after-the-fact check a finished manual-testing-playbook report supports.
#
# The playbook records one PASS/FAIL/SKIP verdict per scenario by hand, so
# nothing in this system's own review protocol re-reads a finished run as a
# whole. The two checks that only make sense over a finished report, whether
# every captured reply stayed clean of an HVR hard blocker and whether every
# scenario twin agreed, had to be remembered and typed by hand before this
# script existed, and a check that depends on being remembered is the same as
# no check.
#
# Every check runs even after one reports findings, because stopping at the
# first hides the rest, and the exit code carries how many reported rather
# than the first one, so a caller cannot read one as one problem.
#
# What the exit code means: how many checks reported findings, not how many
# failed to run. A dirty reply or a diverging twin is a finding about the
# runtime that produced it during that manual pass, not a defect in this
# repository, and a caller reading the code should reach for the printed
# output rather than a revert.
#
# Exit Codes:
#   0 - Both report checks were clean
#   1 - One check reported findings or could not run
#   2 - Both checks reported findings or could not run
#   64 - Usage error: no run report dir named
#   66 - The named path is not a report directory
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
# Not ${1:?...}, which exits 1, and 1 already means one check reported
# findings. A caller reading the code could not tell a usage error from a
# real finding.
if [ $# -lt 1 ]; then
  echo "usage: check_report.sh <run report dir>" >&2
  exit 64
fi
REPORT="$1"
if [ ! -d "$REPORT" ]; then
  echo "no report directory at $REPORT, so nothing was checked" >&2
  exit 66
fi

TMP_OUT="$(mktemp -d)"
trap 'rm -rf "$TMP_OUT"' EXIT

found=0
total=0
for check in lint_replies twin_divergence; do
  total=$((total + 1))
  printf '  %-18s ' "$check"
  if python3 "$HERE/$check.py" "$REPORT" > "$TMP_OUT/$check.report.out" 2>&1; then
    echo "clean"
  else
    rc=$?
    if [ "$rc" = 2 ] || [ "$rc" = 64 ]; then
      echo "could not run, its own output follows"
      sed 's/^/      /' "$TMP_OUT/$check.report.out"
      found=$((found + 1))
      continue
    fi
    echo "findings, its own output follows"
    sed 's/^/      /' "$TMP_OUT/$check.report.out"
    found=$((found + 1))
  fi
done

echo
if [ "$found" = 0 ]; then
  echo "all $total report checks clean"
  exit 0
fi
echo "$found of $total report checks reported findings"
exit "$found"
