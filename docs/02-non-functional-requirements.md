# 非機能要件

## 1. 環境

| 項目 | 開発 | 本番 |
| --- | --- | --- |
| フロントエンド | `http://localhost:5173` | Load Balancer 経由 HTTPS |
| API | `http://localhost:8080` | fe-vm nginx コンテナから `/api` プロキシ |
| WebSocket | `ws://localhost:8080/ws/...` | `wss://`（LB 経由） |
| PostgreSQL | Docker Compose 内 | api-vm 上の postgres コンテナ |
| Object Storage | MinIO（Compose 任意） or OCI 開発バケット | OCI Object Storage（`ap-osaka-1`） |
| リージョン | — | OCI ホームリージョン `ap-osaka-1`（大阪） |

## 2. 性能

| 項目 | 目標 |
| --- | --- |
| イベント一覧 API | 100 件以内で p95 < 500 ms（Always Free VM 上） |
| リアルタイム反映 | 同一イベントの更新が他クライアントへ 2 秒以内 |
| 同時 WebSocket 接続 | イベント 1 件あたり 10 接続以下を想定（Always Free 単一 api コンテナ） |
| 画像アップロード | 5 MB 以下を 10 秒以内 |

Always Free の小さい VM を前提とし、過度なスケール要件は設けない。

## 3. 可用性

| 項目 | 方針 |
| --- | --- |
| 待機系 | なし（Always Free 単一 api-vm） |
| LB | OCI Flexible Load Balancer（Always Free 1 基）で SSL 終端 |
| 計画停止 | メンテ時は事前に利用者へ周知（提出デモ以外） |
| 大阪容量不足 | cron による `terraform apply` リトライでインスタンス確保（[07](07-architecture.md)） |

## 4. セキュリティ

| 項目 | 方針 |
| --- | --- |
| 認証 | JWT アクセストークン（15 分）+ リフレッシュトークン（7 日、DB 保存・失効可能） |
| パスワード | bcrypt ハッシュ。平文保存禁止 |
| 認可 | イベント操作は EventMember ロールで判定 |
| DB 直接公開 | 禁止。API のみが PostgreSQL に接続 |
| CORS（開発） | `http://localhost:5173` のみ許可 |
| CORS（本番） | 同一オリジン（nginx プロキシ）のため不要 |
| SSH | 管理者 IP のみ NSG で許可 |
| api-vm 8080 | fe-vm / LB からのみ NSG 許可 |
| SQL インジェクション | SQLAlchemy パラメータバインド。生文字列結合禁止 |
| XSS | SolidJS のテキストエスケープ。`innerHTML` 不使用 |
| HTTPS | 本番は LB で TLS 終端（Let's Encrypt または OCI 証明書） |
| 機密情報 | `.env` / `terraform.tfvars` を Git 管理外 |
| Object Storage | 書き込みは API のみ（Pre-Authenticated Request または SDK）。公開は読み取りのみ |

## 5. 保守性

| 項目 | 方針 |
| --- | --- |
| API バージョン | `/api/v1/...` |
| DB マイグレーション | Alembic |
| レイヤー | Router（Controller）/ Service / Repository |
| DTO | Pydantic スキーマ。エンティティをそのままレスポンスに使わない |
| ログ | 構造化 JSON（request_id, user_id, method, path, status） |
| 例外 | グローバルハンドラで HTTP ステータスとエラー JSON を統一 |

## 6. 運用

| 項目 | 方針 |
| --- | --- |
| プロセス管理 | Docker Compose（本番 VM 上）。VM 再起動時は compose がコンテナを復帰 |
| デプロイ | イメージ build → OCIR push → VM で `docker compose pull && up -d` |
| 監視 | コンテナログ（`docker compose logs`）、nginx アクセスログ |
| バックアップ | postgres コンテナから `pg_dump` → Object Storage の別 prefix へ |

## 7. 文字コード・JSON・日時

| 項目 | 方針 |
| --- | --- |
| 文字コード | UTF-8 |
| JSON | `Content-Type: application/json` |
| 日時 API | ISO 8601 UTC（`2026-09-01T12:00:00Z`） |
| 日時 UI | ユーザーのローカルタイムゾーンで表示 |

| 初級環境削除 | （任意）recipe-app destroy。Ampere 取得とは別問題（[07 §3.1](07-architecture.md)） |

## 8. Docker / コンテナ

| 環境 | Docker |
| --- | --- |
| ローカル開発 | **標準**。`docker compose up` で FE / API / PostgreSQL を起動 |
| 本番（OCI） | **標準**。fe-vm / api-vm 上で Docker Compose によりコンテナ起動 |
| レジストリ | OCI Container Registry（OCIR）。本番イメージは OCIR 経由で配布 |

VM は Docker ホストとして最小構成（Docker Engine + Compose）のみ載せ、アプリはすべてコンテナ内で動作させる。

## 9. コスト

| 項目 | 方針 |
| --- | --- |
| クラウド | OCI Always Free のみ（LB / Compute / Object Storage の無料枠内） |
| AWS | 無料枠は過去受講で使用済みのため利用しない |
| 同時環境 | recipe-app と event-app を **同時常時公開しない** |

## 10. UX（非機能寄り）

- WebSocket 切断時は自動再接続（指数バックオフ）
- 自分の操作（参加表明・コメント）は送信成功時に即反映
- 他ユーザーの操作は WebSocket で即時反映
