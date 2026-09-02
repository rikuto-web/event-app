#!/usr/bin/env bash
# cron 用: terraform apply を試し、VM 作成成功時に cron を削除する。
# Mac 上で実行。terraform CLI + ~/.oci が必要（Docker 不要）。
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

ROOT="${EVENT_APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
TF_ENV="intermediate"
LOG="${HOME}/Library/Logs/event-oci-hourly-retry.log"
MARKER="event-oci-hourly-retry"

# shellcheck source=lib/run-tf.sh
source "$(dirname "$0")/lib/run-tf.sh"

mkdir -p "$(dirname "$LOG")"
: >"$LOG"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

remove_cron() {
  if crontab -l 2>/dev/null | grep -q "$MARKER"; then
    crontab -l 2>/dev/null | grep -v "$MARKER" | crontab -
    log "removed remaining cron entries ($MARKER)"
  fi
}

log "=== event-app retry start ==="

if ! command -v terraform >/dev/null 2>&1; then
  log "ERROR: terraform not found. Run: brew install hashicorp/tap/terraform"
  exit 1
fi

if run_tf "$ROOT" "$TF_ENV" apply -auto-approve -no-color >>"$LOG" 2>&1; then
  fe_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw fe_vm_public_ip 2>/dev/null || true)"
  api_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw api_vm_private_ip 2>/dev/null || true)"
  if [[ "$fe_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$api_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log "SUCCESS: infrastructure created."
    log "  fe_vm_public_ip=$fe_ip"
    log "  api_vm_private_ip=$api_ip"
    log "  load_balancer=$(run_tf "$ROOT" "$TF_ENV" output -raw load_balancer_public_ip 2>/dev/null || echo n/a)"
    remove_cron
    log "Next: install Docker on VMs (see infra/README.md). App deploy is VS-11+."
    exit 0
  fi
fi

log "still waiting (Out of host capacity or apply incomplete)"
exit 0
