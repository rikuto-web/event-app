#!/usr/bin/env bash
# Mac 上で event-oci-hourly-retry cron を登録（既存エントリは上書き）。
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/hourly-cron-apply.sh"
MARKER="event-oci-hourly-retry"
CRON_LINE="0 * * * * EVENT_APP_ROOT=\"$(cd "$SCRIPT/../.." && pwd)\" $SCRIPT # $MARKER"

TMP="$(mktemp)"
(crontab -l 2>/dev/null | grep -v "$MARKER" || true) >"$TMP"
echo "$CRON_LINE" >>"$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "Installed cron entry:"
crontab -l | grep "$MARKER"
