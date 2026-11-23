#!/usr/bin/env bash
# One-command check on a Mac:
#   1. records the environment (macOS / Safari / WebKit build)
#   2. installs dependencies
#   3. makes sure safaridriver is enabled
#   4. runs the repro (shared + fresh sessions, REPEAT times) and saves everything
#
# Usage:
#   ./scripts/mac-check.sh                 # Safari
#   BROWSER=safari-tp ./scripts/mac-check.sh   # Safari Technology Preview
#   REPEAT=3 ./scripts/mac-check.sh
#
# Do not touch the Safari windows while it runs.
set -u
cd "$(dirname "$0")/.."

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This script only works on macOS (Safari + safaridriver)." >&2
  exit 2
fi
if ! command -v node >/dev/null; then
  echo "Node.js is required (v20+). Install with: brew install node" >&2
  exit 2
fi

mkdir -p results
OUT="results/mac-$(date +%Y%m%d-%H%M%S)-${BROWSER:-safari}.txt"
echo "Saving output to $OUT"

{
  echo "##### environment"
  ./scripts/mac-env.sh
  echo
  echo "##### npm install"
  npm install --no-audit --no-fund 2>&1 | tail -3
  echo
  echo "##### safaridriver"
} 2>&1 | tee "$OUT"

# safaridriver --enable needs admin rights once per machine. It is a no-op if already enabled.
if [ "${BROWSER:-safari}" != "chrome" ]; then
  echo "Enabling safaridriver (sudo password may be requested)..." | tee -a "$OUT"
  sudo safaridriver --enable 2>&1 | tee -a "$OUT"
fi

{
  echo
  echo "##### repro (BROWSER=${BROWSER:-safari}, REPEAT=${REPEAT:-5})"
} | tee -a "$OUT"
npm run repro 2>&1 | tee -a "$OUT"
STATUS=${PIPESTATUS[0]}

echo
echo "Done. exit=$STATUS  (0 = every non-informational variant passed)"
echo "Attach $OUT to the bug report."
exit "$STATUS"
