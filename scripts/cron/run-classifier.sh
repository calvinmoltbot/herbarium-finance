#!/bin/bash
# Wrapper for the nightly gmail classifier (issue #13 Session 3).
#
# launchd invokes this; we cd, set PATH, run the classifier, and append
# stdout/stderr to a date-stamped log file. The classifier writes its own
# cron_runs row — this wrapper only owns the log and the PATH.

set -u

PROJECT_DIR="/Users/admin/Dev/Projects/herbarium-finance"
LOG_DIR="/Users/admin/Logs/herbarium"
LOG="$LOG_DIR/gmail-classifier-$(date +%Y-%m-%d).log"

mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR" || { echo "fatal: cannot cd to $PROJECT_DIR" >&2; exit 2; }

# launchd has a minimal PATH; explicitly include the user's npm-global,
# homebrew, and system bins. Node + pnpm live under ~/.npm-global on this Mini.
export PATH="/Users/admin/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# gog uses an encrypted file keyring; under launchd there's no TTY to prompt
# for the master password, so pull it from macOS Keychain (entry created with
# `security add-generic-password -s gog-keyring-password -a $USER -w ...`).
GOG_KEYRING_PASSWORD=$(/usr/bin/security find-generic-password -a "$USER" -s "gog-keyring-password" -w 2>/dev/null)
if [ -z "$GOG_KEYRING_PASSWORD" ]; then
  echo "fatal: gog-keyring-password not found in macOS Keychain" >&2
  exit 3
fi
export GOG_KEYRING_PASSWORD

{
  echo "=== run started $(date '+%Y-%m-%d %H:%M:%S %z') ==="
  /Users/admin/.npm-global/bin/pnpm classify-emails
  rc=$?
  echo "=== run finished $(date '+%Y-%m-%d %H:%M:%S %z') rc=$rc ==="
  exit $rc
} >> "$LOG" 2>&1
