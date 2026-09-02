#!/usr/bin/env bash
# 手動リトライ用（cron なし）。MAX_ATTEMPTS 回まで apply を繰り返す。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_ENV="intermediate"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
WAIT_SECONDS="${WAIT_SECONDS:-60}"

run_tf() {
  docker run --rm \
    -v "$ROOT/infra/terraform:/workspace" \
    -v "$HOME/.oci:/root/.oci:ro" \
    -w "/workspace/environments/$TF_ENV" \
    hashicorp/terraform:1.9 "$@"
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "==> attempt $attempt/$MAX_ATTEMPTS"
  if run_tf apply -auto-approve -no-color; then
    fe_ip="$(run_tf output -raw fe_vm_public_ip 2>/dev/null || true)"
    api_ip="$(run_tf output -raw api_vm_private_ip 2>/dev/null || true)"
    if [[ "$fe_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$api_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "Infrastructure created."
      run_tf output
      exit 0
    fi
  fi
  echo "retry in ${WAIT_SECONDS}s..."
  sleep "$WAIT_SECONDS"
done

echo "failed after $MAX_ATTEMPTS attempts (Out of host capacity?)" >&2
exit 1
