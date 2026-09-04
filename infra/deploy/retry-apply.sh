#!/usr/bin/env bash
# 手動リトライ用（cron なし）。段階的に apply を繰り返す。
# Phase 1: api-vm → Phase 2: fe-vm + LB backend
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_ENV="intermediate"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
WAIT_SECONDS="${WAIT_SECONDS:-60}"

# shellcheck source=lib/run-tf.sh
source "$(dirname "$0")/lib/run-tf.sh"

if ! command -v terraform >/dev/null 2>&1; then
  echo "terraform not found. Run: brew install hashicorp/tap/terraform" >&2
  exit 1
fi

vm_in_state() {
  local pattern="$1"
  run_tf "$ROOT" "$TF_ENV" state list 2>/dev/null | grep -q "$pattern"
}

both_vms_ready() {
  local fe_ip api_ip
  fe_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw fe_vm_public_ip 2>/dev/null || true)"
  api_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw api_vm_private_ip 2>/dev/null || true)"
  [[ "$fe_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$api_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

apply_phase() {
  local apply_args=(-auto-approve -no-color)
  if vm_in_state 'module\.api_vm\.oci_core_instance\.this' && ! vm_in_state 'module\.fe_vm\[0\]\.oci_core_instance\.this'; then
    echo "==> phase: fe-vm (api-vm already acquired)"
    apply_args+=(-var=enable_fe_vm=true)
  else
    echo "==> phase: api-vm only"
  fi
  run_tf "$ROOT" "$TF_ENV" apply "${apply_args[@]}"
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "==> attempt $attempt/$MAX_ATTEMPTS"
  if apply_phase && both_vms_ready; then
    echo "Infrastructure created."
    run_tf "$ROOT" "$TF_ENV" output
    exit 0
  fi
  if vm_in_state 'module\.api_vm\.oci_core_instance\.this' && ! vm_in_state 'module\.fe_vm\[0\]\.oci_core_instance\.this'; then
    echo "api-vm ready; continuing with fe-vm on next attempt..."
  fi
  echo "retry in ${WAIT_SECONDS}s..."
  sleep "$WAIT_SECONDS"
done

echo "failed after $MAX_ATTEMPTS attempts (Out of host capacity?)" >&2
exit 1
