# OCI インフラ先行取得

本番相当リソース（VM / LB / Object Storage / OCIR）を **アプリデプロイ前に確保** する手順です。  
デプロイ時の調整（HTTPS 証明書、nginx 設定、compose 起動、外部 DB 接続）は VS-11 以降で行います。

参照: [07 アーキテクチャ §3–§6](../../docs/07-architecture.md) / Issue [#15 VS-12](https://github.com/rikuto-web/event-app/issues/15)

## 構成（2026-09 改定）

Ampere A1 Flex の大阪在庫不足（`Out of host capacity`）を受け、**1 台 Micro + 外部 PostgreSQL** に変更しました。

| リソース | 内容 | AWS 相当 |
| --- | --- | --- |
| Compartment | `event-event-app` | — |
| app-vm | **E2.1.Micro**（x86, 1 GB）— Docker ホスト 1 台 | EC2 |
| Load Balancer | Flexible LB、HTTP :80（HTTPS はデプロイ時） | ALB |
| Object Storage | `event-app-images-prod` | S3 |
| PostgreSQL | **外部 PaaS**（Neon / Supabase 等）— Terraform 管理外 | RDS |
| OCIR | `event-frontend`, `event-api`, `event-nginx`（**Console 手動**。Terraform API は Free Tier で 403） | ECR |

app-vm 上の Docker Compose:

```
app-vm（E2.1.Micro）
├── nginx コンテナ   ← LB バックエンド :80
├── frontend コンテナ
└── api コンテナ     ← 外部 PostgreSQL へ接続（VM 内に postgres コンテナなし）
```

## 取得するリソース（Terraform）

| リソース | 内容 |
| --- | --- |
| Compartment | `event-event-app` |
| VCN / Subnet / NSG | 10.1.0.0/16 |
| app-vm | E2.1.Micro |
| Load Balancer | app-vm :80 へ転送 |
| Object Storage | `event-app-images-prod` |

### リトライ（任意）

E2.1.Micro は Ampere より在庫が取りやすいため、通常は **1 回の `terraform apply` で足ります**。  
失敗時のみ launchd / 手動リトライを使います。

Mac の **cron は分単位が最小** のため、秒単位リトライは **launchd**（`setup-cron.sh`）。デフォルト **30 秒** 間隔。

## デプロイ時に調整するもの（後回しで OK）

- LB への HTTPS :443 リスナーと証明書
- app-vm nginx 設定（`/api` `/ws` プロキシ — 同一 VM 内の api コンテナへ）
- 外部 PostgreSQL の接続文字列（`.env` / api コンテナ環境変数）
- OCIR へのイメージ push / compose up
- LB ヘルスチェック URL（`/health`）の HTTP 化

---

## Step 0: recipe-app の削除（任意・推奨）

同時常時公開を避けるため、初級 recipe-app を destroy します。Micro 枠（最大 2 台）も空きます。

```bash
cd ../recipe-app/infra/terraform/environments/beginner

docker run --rm \
  -v "$PWD/..:/workspace" \
  -v "$HOME/.oci:/root/.oci:ro" \
  -w /workspace/environments/beginner \
  hashicorp/terraform:1.9 destroy
```

## Step 1: terraform.tfvars の準備

recipe-app の設定をコピーし、event-app 用に変更します。

```bash
cd infra/terraform/environments/intermediate
cp ../../../../../recipe-app/infra/terraform/environments/beginner/terraform.tfvars ./terraform.tfvars
```

**変更必須項目**:

| 変数 | 値 |
| --- | --- |
| `project_prefix` | `event` |
| `compute_shape` | `VM.Standard.E2.1.Micro` |
| `vcn_cidr` | `10.1.0.0/16` |
| `subnet_cidr` | `10.1.0.0/24` |
| `dns_label` | `eventint` |

`tenancy_ocid` / `user_ocid` / `fingerprint` / `private_key_path` / `admin_cidr` / `ssh_public_key` は **そのまま** で可。

## Step 2: terraform apply

Mac では **terraform CLI のみ**（Docker 不要）。未インストール時: `brew install hashicorp/tap/terraform`

```bash
cd infra/terraform/environments/intermediate
terraform init
terraform plan
terraform apply
```

apply 失敗時:

```bash
# 手動リトライ
bash infra/deploy/retry-apply.sh

# Mac launchd（秒単位・デフォルト 30 秒）
bash infra/deploy/setup-cron.sh

# 間隔変更例（15 秒以上）
INTERVAL_SECONDS=45 bash infra/deploy/setup-cron.sh

# 解除（cron / launchd 両方）
bash infra/deploy/remove-cron.sh
```

**Ampere 用 launchd がまだ動いている場合**（旧構成）は、apply 前に解除してください:

```bash
bash infra/deploy/remove-cron.sh
```

ログ:

- 詳細: `~/Library/Logs/event-oci-hourly-retry.log`（**最新 1 回分を上書き**）
- 履歴: `~/Library/Logs/event-oci-hourly-retry.history.log`（**1 行サマリを追記**）

```bash
tail -20 ~/Library/Logs/event-oci-hourly-retry.history.log
```

## Step 3: 確認

```bash
terraform output
# app_vm_public_ip / app_vm_private_ip / load_balancer_public_ip

ssh -i ~/.ssh/id_ed25519 opc@$(terraform output -raw app_vm_public_ip)
```

## Step 4: VM 最小初期化（任意・デプロイ前）

```bash
sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker opc
```

## Step 5: 外部 PostgreSQL（Terraform 外）

Neon / Supabase 等で PostgreSQL を作成し、接続 URL を api コンテナの `DATABASE_URL` に設定します（VS-11 デプロイ時）。

---

## ディレクトリ構成

```
infra/
├── terraform/
│   ├── modules/{vcn,compute,load_balancer,object_storage}/
│   └── environments/intermediate/
└── deploy/
    ├── hourly-cron-apply.sh
    ├── retry-apply.sh
    ├── setup-cron.sh
    ├── remove-cron.sh
    └── deploy.sh          # VS-11 以降
```

`terraform.tfvars` と `*.tfstate` は Git 管理外（ルート `.gitignore` 済み）。
