#!/usr/bin/env bash
# Mac 上で event-oci リトライを launchd 登録（秒単位。cron は分単位のため非使用）。
# 既存の cron / launchd エントリは上書き。
#
# Usage:
#   bash infra/deploy/setup-cron.sh              # デフォルト 30 秒間隔
#   INTERVAL_SECONDS=45 bash infra/deploy/setup-cron.sh
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DEPLOY_DIR/../.." && pwd)"
SCRIPT="$DEPLOY_DIR/hourly-cron-apply.sh"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-30}"

# shellcheck source=lib/scheduler.sh
source "$DEPLOY_DIR/lib/scheduler.sh"

if ! [[ "$INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$INTERVAL_SECONDS" -lt 15 ]]; then
  echo "INTERVAL_SECONDS must be an integer >= 15 (got: $INTERVAL_SECONDS)" >&2
  exit 1
fi

remove_retry_scheduler

mkdir -p "$(dirname "$SCHEDULER_PLIST")"
cat >"$SCHEDULER_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SCHEDULER_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${SCRIPT}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>EVENT_APP_ROOT</key>
    <string>${ROOT}</string>
  </dict>
  <key>StartInterval</key>
  <integer>${INTERVAL_SECONDS}</integer>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF

launchctl bootstrap "gui/$(id -u)" "$SCHEDULER_PLIST"

echo "Installed launchd agent: $SCHEDULER_LABEL"
echo "  interval: ${INTERVAL_SECONDS}s"
echo "  plist:    $SCHEDULER_PLIST"
echo "  script:   $SCRIPT"
launchctl print "gui/$(id -u)/${SCHEDULER_LABEL}" 2>/dev/null | grep -E 'state =|path =' | head -4 || true
