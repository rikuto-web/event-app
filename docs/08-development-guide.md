# 開発ガイド

## 1. 開発方針

本プロジェクトは **垂直スライス + TDD** で実装する。

| 方式 | 採用 |
| --- | --- |
| 水平（API 全部 → 画面全部） | ✗ |
| **垂直（UC 単位で API + 画面 + テスト）** | ✓ |

Epic と各 `[VS-XX]` Issue を参照。旧来の層別 Issue があれば superseded として閉じる。

### TDD サイクル

1. **RED** — 失敗するテストを先に書く
2. **GREEN** — 最小実装で通す
3. **REFACTOR** — Green を保ったまま整理

### 仕様が曖昧なとき

Docs から具体的なテスト・期待値を書けない場合、**仕様不足**とみなす。無理に実装せず **ユーザーと相談** → 合意後に Docs 更新 → RED。

## 2. リポジトリ構成（予定）

```
event-app/
├── frontend/          # SolidJS + UnoCSS + @solidjs/router
├── backend/           # Python / FastAPI / Granian
├── infra/             # Terraform（OCI）
├── docs/
├── prototype/         # UX 確定済み（矛盾時は proto が正）
└── docker-compose.yml
```

## 3. テスト戦略

| 層 | ツール | 対象 |
| --- | --- | --- |
| BE 単体 | pytest | バリデーション、ドメインロジック |
| BE 結合 | pytest + TestClient + PostgreSQL（テスト DB） | 当該スライスの REST / WS |
| FE 単体 | Vitest | ユーティリティ、バリデーション |
| FE コンポーネント | Vitest + Testing Library | 当該画面・モーダル |
| E2E（任意） | Playwright 等 | スライス単位 |

同一 Issue 内で BE → FE の順、または両方 RED にしてから GREEN する。

## 4. 垂直スライス一覧

GitHub Epic [#2 垂直スライス実装ロードマップ](https://github.com/rikuto-web/event-app/issues/2) のチェックリストが正。

### 推奨順

```
VS-00 → VS-01 → VS-02 → VS-03 → VS-04 → VS-05 → VS-06 → VS-07 → VS-08 → VS-09 → VS-10
VS-11（Docker）/ VS-12（Terraform）は VS-00 後並行可
```

## 5. UI 参照

- 本番 UI は **プロトタイプ**（`prototype/`）と **Docs 04・01 §6** に準拠
- プロトタイプ起動: `cd prototype && python3 -m http.server 8765`
