#!/usr/bin/env bash
# cron 用: terraform apply を試し、VM 作成成功時に cron を削除する。
# Mac 上で実行。Docker + ~/.oci が必要。
set -euo pipefail

ROOT="${EVENT_APP_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
TF_ENV="intermediate"
LOG="${HOME}/Library/Logs/event-oci-hourly-retry.log"
MARKER="event-oci-hourly-retry"

mkdir -p "$(dirname "$LOG")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

remove_cron() {
  if crontab -l 2>/dev/null | grep -q "$MARKER"; then
    crontab -l 2>/dev/null | grep -v "$MARKER" | crontab -
    log "removed remaining cron entries ($MARKER)"
  fi
}

run_tf() {
  docker run --rm \
    -v "$ROOT/infra/terraform:/workspace" \
    -v "$HOME/.oci:/root/.oci:ro" \
    -w "/workspace/environments/$TF_ENV" \
    hashicorp/terraform:1.9 "$@"
}

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  log "Docker not running. Start Docker Desktop and retry."
  return 1
}

log "=== event-app hourly retry start ==="

if ! ensure_docker; then
  exit 1
fi

if run_tf apply -auto-approve -no-color >>"$LOG" 2>&1; then
  fe_ip="$(run_tf output -raw fe_vm_public_ip 2>/dev/null || true)"
  api_ip="$(run_tf output -raw api_vm_private_ip 2>/dev/null || true)"
  if [[ "$fe_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$api_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log "SUCCESS: infrastructure created."
    log "  fe_vm_public_ip=$fe_ip"
    log "  api_vm_private_ip=$api_ip"
    log "  load_balancer=$(run_tf output -raw load_balancer_public_ip 2>/dev/null || echo n/a)"
    remove_cron
    log "Next: install Docker on VMs (see infra/README.md). App deploy is VS-11+."
    exit 0
  fi
fi

log "still waiting (Out of host capacity or apply incomplete)"
exit 0
