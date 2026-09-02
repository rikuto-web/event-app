#!/usr/bin/env bash
# Mac 上で event-oci-hourly-retry cron を削除。
set -euo pipefail

MARKER="event-oci-hourly-retry"
TMP="$(mktemp)"
if crontab -l 2>/dev/null | grep -v "$MARKER" >"$TMP"; then
  crontab "$TMP"
fi
rm -f "$TMP"
echo "Removed cron entries matching $MARKER"
