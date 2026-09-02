#!/usr/bin/env bash
# 手動リトライ用（cron なし）。MAX_ATTEMPTS 回まで apply を繰り返す。
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

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "==> attempt $attempt/$MAX_ATTEMPTS"
  if run_tf "$ROOT" "$TF_ENV" apply -auto-approve -no-color; then
    fe_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw fe_vm_public_ip 2>/dev/null || true)"
    api_ip="$(run_tf "$ROOT" "$TF_ENV" output -raw api_vm_private_ip 2>/dev/null || true)"
    if [[ "$fe_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$api_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Infrastructure created."
      run_tf "$ROOT" "$TF_ENV" output
      exit 0
    fi
  fi
  echo "retry in ${WAIT_SECONDS}s..."
  sleep "$WAIT_SECONDS"
done

echo "failed after $MAX_ATTEMPTS attempts (Out of host capacity?)" >&2
exit 1
