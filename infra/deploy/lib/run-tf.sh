#!/usr/bin/env bash
# Terraform 実行ヘルパー（Mac ネイティブ terraform を使用。Docker 不要）
set -euo pipefail

run_tf() {
  local root="${1:?root dir}"
  local env="${2:?environment name}"
  shift 2

  if ! command -v terraform >/dev/null 2>&1; then
    echo "terraform not found. Install: brew install terraform" >&2
    return 1
  fi

  local tf_dir="$root/infra/terraform/environments/$env"
  (cd "$tf_dir" && terraform "$@")
}
