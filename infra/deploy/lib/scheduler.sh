#!/usr/bin/env bash
# Mac リトライスケジューラ共通（cron / launchd）
set -euo pipefail

SCHEDULER_LABEL="${SCHEDULER_LABEL:-com.event-app.oci-retry}"
SCHEDULER_MARKER="${SCHEDULER_MARKER:-event-oci-hourly-retry}"
SCHEDULER_PLIST="${HOME}/Library/LaunchAgents/${SCHEDULER_LABEL}.plist"

remove_retry_scheduler() {
  if crontab -l 2>/dev/null | grep -q "$SCHEDULER_MARKER"; then
    crontab -l 2>/dev/null | grep -v "$SCHEDULER_MARKER" | grep -v "hourly-cron-apply.sh" | crontab - 2>/dev/null || true
  fi

  if [[ -f "$SCHEDULER_PLIST" ]]; then
    launchctl bootout "gui/$(id -u)" "$SCHEDULER_PLIST" 2>/dev/null || true
    rm -f "$SCHEDULER_PLIST"
  fi
}
