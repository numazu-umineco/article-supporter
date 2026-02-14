# 静的サイト記事作成支援 Web アプリケーション

## 概要
Git で管理されている静的サイトに、イベント開催報告記事を追加するための Web UI。
LLM (OpenAI API) とのチャットを通じて記事作成を支援し、GitHub App 認証でログイン後、記事を Pull Request として作成する。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Vite + Vue 3.5 (TypeScript) + PrimeVue 4 + PrimeFlex 4 |
| バックエンド | Hono 4.6 (TypeScript) on Node.js |
| ORM | Drizzle ORM |
| データベース | PostgreSQL |
| Git操作 | isomorphic-git (**必ずこれを使用すること**) |
| LLM | OpenAI API (gpt-4o-mini) |
| ストレージ | S3互換ストレージ (ローカル: MinIO) |
| 認証 | GitHub App OAuth + JWT + リフレッシュトークン |

## プロジェクト構成

```
/
├── package.json              # npm workspaces + npm-run-all2 による同時起動
├── docker-compose.yml        # PostgreSQL + MinIO
├── .env.example
├── CLAUDE.md                 # このファイル (全体仕様)
├── docs/                     # 詳細アーキテクチャドキュメント
│   ├── session-edit-state-management.md
│   ├── authentication-flow.md
│   ├── publish-workflow.md
│   └── chat-llm-integration.md
├── frontend/
│   ├── CLAUDE.md             # フロントエンド固有の説明
│   ├── package.json
│   ├── vite.config.ts        # /api プロキシ → localhost:3020
│   └── src/
│       ├── main.ts           # PrimeVue / Pinia / Router 初期化
│       ├── App.vue           # Toast + ConfirmDialog ラッパー
│       ├── types/index.ts    # 共有型定義
│       ├── stores/auth.ts    # Pinia 認証ストア
│       ├── router/index.ts   # ルーティング + ナビゲーションガード
│       ├── composables/      # ビジネスロジック (useApi, useChat, useAutoSave, etc.)
│       ├── views/            # 画面コンポーネント
│       ├── components/       # UI コンポーネント
│       └── utils/            # ユーティリティ (画像リサイズ等)
└── backend/
    ├── CLAUDE.md             # バックエンド固有の説明
    ├── package.json
    ├── drizzle.config.ts
    └── src/
        ├── index.ts          # サーバー起動 (ポート 3020)
        ├── app.ts            # Hono アプリ + ミドルウェア + ルート登録
        ├── config/env.ts     # 環境変数バリデーション (Zod)
        ├── db/               # Drizzle ORM (schema, client, migrations)
        ├── routes/           # APIルート定義
        ├── services/         # ビジネスロジック
        ├── middlewares/      # 認証, エラーハンドリング, ロギング
        ├── utils/            # JWT, 暗号化ユーティリティ
        └── types/index.ts    # 型定義
```

## 開発コマンド

```bash
# ローカル環境起動 (PostgreSQL + MinIO)
docker-compose up -d

# frontend + backend 同時起動
npm run dev

# フロントエンドのみ
npm run dev:frontend

# バックエンドのみ
npm run dev:backend

# ビルド
npm run build

# 型チェック
npm run typecheck

# DBマイグレーション
npm run db:migrate

# Drizzle Studio (DBブラウザ)
npm run db:studio
```

## データベース設計 (PostgreSQL)

6テーブル構成。スキーマは `backend/src/db/schema.ts` に Drizzle ORM で定義。

| テーブル | 用途 |
|---------|------|
| `users` | GitHub OAuth ユーザー情報 |
| `event_types` | イベント種別 + LLM システムプロンプト |
| `sessions` | 記事作成セッション (draft → pr_created → merged) |
| `chat_messages` | チャット履歴 (role: user/assistant) |
| `session_images` | セッションに紐づく画像 (S3保存) |
| `refresh_tokens` | リフレッシュトークン (SHA256ハッシュ保存) |

### セッションのステータス遷移
```
draft → pr_created → merged
```

## 対象リポジトリの構造

記事の配置パス: `src/news/YYYY/MMDD/{slug}.md`
画像ファイルは Markdown と同じディレクトリに配置する。

### Markdown フロントマター形式
```yaml
---
title: "記事タイトル"
date: YYYY-MM-DD
eyecatch: ./画像ファイル名.jpg
---
```

## 認証フロー

1. GitHub App の OAuth フローでユーザー認証
2. Organization メンバーシップ + リポジトリ write 権限を検証
3. JWT (HttpOnly Cookie, 15分) + リフレッシュトークン (30日) を発行
4. リフレッシュトークンで JWT を再取得 (トークンローテーション)

詳細: `docs/authentication-flow.md`

## 画面構成

| 画面 | パス | コンポーネント |
|------|------|--------------|
| ログイン | `/login` | LoginView.vue |
| セッション一覧 | `/` | HomeView.vue |
| 記事編集 (3ペイン) | `/sessions/:id` | SessionEditView.vue |
| イベント種類管理 | `/event-types` | EventTypesView.vue |

記事編集画面の3ペイン構造:
```
┌──────────────────────────────────────┐
│ ヘッダー (セッション情報, 保存状態, PR) │
├──────────────┬───────────────────────┤
│ チャット欄    │ エディタ & 画像         │
│ (左ペイン)    │ (右ペイン)             │
└──────────────┴───────────────────────┘
```

詳細: `docs/session-edit-state-management.md`

## LLM 連携

- チャット送信時、現在の記事状態 (title, slug, content) も一緒にLLMに送信
- LLM が `<article>` タグで記事を提案 → 自動的にエディタに反映
- `<article>` タグ外のテキストはチャット欄に表示

詳細: `docs/chat-llm-integration.md`

## Git操作・PR作成

- isomorphic-git で clone → branch → commit → push
- GitHub API で PR 作成
- PR作成後の再編集は同一ブランチに追加コミット

詳細: `docs/publish-workflow.md`

## API エンドポイント一覧

### 認証
- `GET /api/auth/login` - GitHub OAuth 開始
- `GET /api/auth/callback` - OAuth コールバック
- `POST /api/auth/refresh` - トークンリフレッシュ
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報

### セッション
- `GET /api/sessions` - セッション一覧取得
- `POST /api/sessions` - 新規セッション作成
- `GET /api/sessions/:id` - セッション詳細取得
- `PATCH /api/sessions/:id` - セッション更新
- `DELETE /api/sessions/:id` - セッション削除

### チャット
- `GET /api/sessions/:id/messages` - チャット履歴取得
- `POST /api/sessions/:id/messages` - メッセージ送信 (LLM呼び出し)

### 画像
- `POST /api/sessions/:id/images` - 画像アップロード
- `PATCH /api/sessions/:id/images/:imageId` - 画像情報更新
- `DELETE /api/sessions/:id/images/:imageId` - 画像削除
- `GET /api/sessions/:id/images/:imageId/file` - 画像ファイル取得 (S3プロキシ)

### Git操作
- `POST /api/sessions/:id/publish` - PR作成または更新

### イベント種類
- `GET /api/event-types` - イベント種類一覧取得
- `POST /api/event-types` - イベント種類作成
- `GET /api/event-types/:id` - イベント種類詳細取得
- `PATCH /api/event-types/:id` - イベント種類更新
- `DELETE /api/event-types/:id` - イベント種類削除

### その他
- `GET /api/health` - ヘルスチェック
- `GET /api/config` - アプリケーション設定取得

## 環境変数
```
# GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY_PATH=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_APP_INSTALLATION_ID=

# 対象リポジトリ
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_ORG=

# OpenAI
OPENAI_API_KEY=

# JWT
JWT_SECRET=          # 32文字以上
JWT_REFRESH_SECRET=  # 32文字以上

# Database
DATABASE_URL=

# S3互換ストレージ
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Optional
NODE_ENV=            # default: development
PORT=                # default: 3000
FRONTEND_URL=        # default: http://localhost:5173
TARGET_SITE_BASE_URL=  # 対象サイトのベースURL (プレビュー用)
```

## 実装上の注意事項

- Git 操作には必ず `isomorphic-git` を使用すること
- PrimeVue コンポーネントを積極的に活用すること
- フロントエンドのスタイリングには PrimeFlex を使用すること
- TypeScript の型定義を適切に行うこと
- エラーハンドリングを丁寧に実装すること
- チャットの返答で `<article>` タグの解析は正確に行うこと
- 画像アップロードは即座に S3 に保存し、session_images に記録すること
- マージ済みセッションは編集不可にすること
- フロントエンドの composables でビジネスロジックを管理し、コンポーネントはUI表示に専念すること
- バックエンドの services レイヤーにビジネスロジックを集約し、routes は薄く保つこと
