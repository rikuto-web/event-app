#!/usr/bin/env bash
# 定期リトライ用: terraform apply を試し、app-vm 作成成功時にスケジューラを削除する。
# E2.1.Micro は在庫不足になりにくいが、apply 失敗時の保険として launchd から実行可能。
# Mac 上で launchd から実行（setup-cron.sh）。terraform CLI + ~/.oci が必要。
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

ROOT="${EVENT_APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
TF_ENV="intermediate"
LOG="${HOME}/Library/Logs/event-oci-hourly-retry.log"
HISTORY_LOG="${HOME}/Library/Logs/event-oci-hourly-retry.history.log"
LOCK_DIR="${HOME}/Library/Logs/event-oci-hourly-retry.lock"

# shellcheck source=lib/run-tf.sh
source "$(dirname "$0")/lib/run-tf.sh"
# shellcheck source=lib/scheduler.sh
source "$(dirname "$0")/lib/scheduler.sh"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

mkdir -p "$(dirname "$LOG")"
: >"$LOG"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

record_history() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] result=$1" >>"$HISTORY_LOG"
}

remove_cron() {
  remove_retry_scheduler
  log "removed retry scheduler ($SCHEDULER_MARKER / $SCHEDULER_LABEL)"
}

vm_in_state() {
  run_tf "$ROOT" "$TF_ENV" state list 2>/dev/null | grep -q 'module\.app_vm\.oci_core_instance\.this'
}

classify_apply_failure() {
  if grep -q "Out of host capacity" "$LOG" 2>/dev/null; then
    echo "capacity"
  else
    echo "failed"
  fi
}

log "=== event-app retry start ==="

if ! command -v terraform >/dev/null 2>&1; then
  log "ERROR: terraform not found. Run: brew install hashicorp/tap/terraform"
  record_history "error-terraform-missing"
  exit 1
fi

if vm_in_state; then
  app_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw app_vm_public_ip 2>/dev/null || true)"
  lb_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw load_balancer_public_ip 2>/dev/null || true)"
  if [[ "$app_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log "SUCCESS: infrastructure ready."
    log "  app_vm_public_ip=$app_ip"
    log "  load_balancer_public_ip=${lb_ip:-n/a}"
    remove_cron
    log "Next: install Docker on app-vm (see infra/README.md). App deploy is VS-11+."
    record_history "success"
    exit 0
  fi
  log "WARNING: app-vm in state but outputs missing; continuing apply"
fi

if run_tf "$ROOT" "$TF_ENV" apply -auto-approve -no-color >>"$LOG" 2>&1; then
  if vm_in_state; then
    app_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw app_vm_public_ip 2>/dev/null || true)"
    lb_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw load_balancer_public_ip 2>/dev/null || true)"
    if [[ "$app_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      log "SUCCESS: infrastructure created."
      log "  app_vm_public_ip=$app_ip"
      log "  load_balancer_public_ip=${lb_ip:-n/a}"
      remove_cron
      log "Next: install Docker on app-vm (see infra/README.md). App deploy is VS-11+."
      record_history "success"
      exit 0
    fi
  fi
  log "still waiting (apply incomplete)"
  record_history "incomplete"
  exit 0
fi

log "still waiting (Out of host capacity or apply incomplete)"
record_history "$(classify_apply_failure)"
exit 0
