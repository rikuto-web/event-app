#!/usr/bin/env bash
# Mac 上で event-oci リトライ（cron / launchd）を削除。
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"

# shellcheck source=lib/scheduler.sh
source "$DEPLOY_DIR/lib/scheduler.sh"

remove_retry_scheduler
echo "Removed retry scheduler ($SCHEDULER_MARKER / $SCHEDULER_LABEL)"
