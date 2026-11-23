#!/usr/bin/env bash
# Prints the environment details that matter for this repro (macOS / Safari / WebKit build).
# Safe to run anywhere on a Mac; changes nothing.
set -u

S=/Applications/Safari.app/Contents

echo "== date =="
date -u +%Y-%m-%dT%H:%M:%SZ

echo "== macOS =="
sw_vers
uname -m

echo "== virtual machine? (1 = running under a hypervisor) =="
sysctl -n kern.hv_vmm_present 2>&1

echo "== Safari =="
for k in CFBundleShortVersionString CFBundleVersion LSMinimumSystemVersion; do
  printf '%s = ' "$k"
  defaults read "$S/Info" "$k" 2>&1
done
readlink -f /Applications/Safari.app 2>/dev/null || true

echo "== Safari Technology Preview =="
STP="/Applications/Safari Technology Preview.app/Contents"
if [ -d "$STP" ]; then
  for k in CFBundleShortVersionString CFBundleVersion; do
    printf '%s = ' "$k"
    defaults read "$STP/Info" "$k" 2>&1
  done
else
  echo "not installed"
fi

echo "== system WebKit =="
for f in /System/Library/Frameworks/WebKit.framework \
         /System/Library/Frameworks/JavaScriptCore.framework; do
  printf '%s: ' "$f"
  defaults read "$f/Resources/Info" CFBundleVersion 2>&1 | head -1
done

echo "== safaridriver =="
safaridriver --version 2>&1

echo "== node / npm =="
node -v 2>&1
npm -v 2>&1

echo "== display =="
system_profiler SPDisplaysDataType 2>&1 | head -25
