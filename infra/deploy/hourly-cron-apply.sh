#!/usr/bin/env bash
# cron 用: terraform apply を段階的に試し、両 VM 作成成功時に cron を削除する。
# Phase 1: api-vm のみ（enable_fe_vm=false）
# Phase 2: api-vm 取得後に fe-vm + LB backend（enable_fe_vm=true）
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

vm_in_state() {
  local pattern="$1"
  run_tf "$ROOT" "$TF_ENV" state list 2>/dev/null | grep -q "$pattern"
}

log "=== event-app retry start ==="

if ! command -v terraform >/dev/null 2>&1; then
  log "ERROR: terraform not found. Run: brew install hashicorp/tap/terraform"
  exit 1
fi

api_ready=false
fe_ready=false
vm_in_state 'module\.api_vm\.oci_core_instance\.this' && api_ready=true
vm_in_state 'module\.fe_vm\[0\]\.oci_core_instance\.this' && fe_ready=true

if [[ "$fe_ready" == true ]]; then
  log "phase: complete (both VMs exist)"
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
  log "WARNING: fe-vm in state but outputs missing; continuing apply"
fi

apply_args=(-auto-approve -no-color)
if [[ "$api_ready" == true && "$fe_ready" == false ]]; then
  log "phase: fe-vm (api-vm already acquired)"
  apply_args+=(-var=enable_fe_vm=true)
else
  log "phase: api-vm only (fe-vm deferred)"
fi

if run_tf "$ROOT" "$TF_ENV" apply "${apply_args[@]}" >>"$LOG" 2>&1; then
  fe_ready=false
  vm_in_state 'module\.fe_vm\[0\]\.oci_core_instance\.this' && fe_ready=true
  if [[ "$fe_ready" == true ]]; then
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

  api_ready=false
  vm_in_state 'module\.api_vm\.oci_core_instance\.this' && api_ready=true
  if [[ "$api_ready" == true && "$fe_ready" == false ]]; then
    log "api-vm acquired; next run will attempt fe-vm"
    exit 0
  fi
fi

log "still waiting (Out of host capacity or apply incomplete)"
exit 0
