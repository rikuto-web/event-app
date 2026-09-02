#!/usr/bin/env bash
# Mac 上で event-oci-hourly-retry cron を登録（既存エントリは上書き）。
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DEPLOY_DIR/../.." && pwd)"
SCRIPT="$DEPLOY_DIR/hourly-cron-apply.sh"
MARKER="event-oci-hourly-retry"
CRON_LINE="*/5 * * * * PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin EVENT_APP_ROOT=\"$ROOT\" $SCRIPT # $MARKER"

TMP="$(mktemp)"
{
  crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v "hourly-cron-apply.sh" || true
  echo "$CRON_LINE"
} | awk '!seen[$0]++' >"$TMP"
crontab "$TMP"
rm -f "$TMP"

echo "Installed cron entry:"
crontab -l | grep "$MARKER"
