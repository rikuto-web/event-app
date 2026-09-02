# OCI インフラ先行取得

本番相当リソース（VM / LB / Object Storage / OCIR）を **アプリデプロイ前に確保** する手順です。  
デプロイ時の調整（HTTPS 証明書、nginx 設定、compose 起動）は VS-11 以降で行います。

参照: [07 アーキテクチャ §3–§6](../../docs/07-architecture.md) / Issue [#15 VS-12](https://github.com/rikuto-web/event-app/issues/15)

## 取得するリソース（今回）

| リソース | 内容 |
| --- | --- |
| Compartment | `event-event-app` |
| fe-vm | Ampere A1 Flex 1 OCPU / 3 GB |
| api-vm | Ampere A1 Flex 1 OCPU / 3 GB |
| Load Balancer | Flexible LB、HTTP :80（HTTPS はデプロイ時） |
| Object Storage | `event-app-images-prod` |
| OCIR | `event-frontend`, `event-api`, `event-nginx`（**Console 手動**。Terraform API は Free Tier で 403） |

## デプロイ時に調整するもの（後回しで OK）

- LB への HTTPS :443 リスナーと証明書
- fe-vm nginx 設定（`/api` `/ws` プロキシ）
- OCIR へのイメージ push / compose up
- LB ヘルスチェック URL（`/health`）の HTTP 化

---

## Step 0: recipe-app の削除（任意・推奨）

同時常時公開を避けるため、初級 recipe-app を destroy します。

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
| `compute_shape` | `VM.Standard.A1.Flex` |
| `vcn_cidr` | `10.1.0.0/16` |
| `subnet_cidr` | `10.1.0.0/24` |
| `dns_label` | `eventint` |

`tenancy_ocid` / `user_ocid` / `fingerprint` / `private_key_path` / `admin_cidr` / `ssh_public_key` は **そのまま** で可。

## Step 2: terraform apply

```bash
cd infra/terraform/environments/intermediate

docker run --rm \
  -v "$PWD/..:/workspace" \
  -v "$HOME/.oci:/root/.oci:ro" \
  -w /workspace/environments/intermediate \
  hashicorp/terraform:1.9 init

docker run --rm \
  -v "$PWD/..:/workspace" \
  -v "$HOME/.oci:/root/.oci:ro" \
  -w /workspace/environments/intermediate \
  hashicorp/terraform:1.9 plan

docker run --rm \
  -v "$PWD/..:/workspace" \
  -v "$HOME/.oci:/root/.oci:ro" \
  -w /workspace/environments/intermediate \
  hashicorp/terraform:1.9 apply
```

在庫不足（`Out of host capacity`）時:

```bash
# 手動リトライ（1 回）
bash infra/deploy/retry-apply.sh

# Mac cron（1 時間ごと・既存 event-oci エントリは上書き）
bash infra/deploy/setup-cron.sh

# cron 解除
bash infra/deploy/remove-cron.sh
```

ログは **実行のたびに上書き**（`~/Library/Logs/event-oci-hourly-retry.log`）。過去 run の蓄積はしない。

## Step 3: 確認

```bash
terraform output
# fe_vm_public_ip / api_vm_private_ip / load_balancer_public_ip

ssh -i ~/.ssh/id_ed25519 opc@$(terraform output -raw fe_vm_public_ip)
```

## Step 4: VM 最小初期化（任意・デプロイ前）

```bash
# fe-vm / api-vm それぞれ
sudo dnf install -y docker docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker opc
```

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
    └── deploy.sh          # VS-11 以降
```

`terraform.tfvars` と `*.tfstate` は Git 管理外（ルート `.gitignore` 済み）。
