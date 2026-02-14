# Article Supporter

静的サイト (Git 管理) にイベント開催報告記事を追加するための Web アプリケーションです。
LLM (OpenAI API) とのチャットを通じて記事を作成し、GitHub Pull Request として投稿できます。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Vite + Vue.js (TypeScript) + PrimeVue + PrimeFlex |
| バックエンド | Hono (TypeScript) on Node.js |
| データベース | PostgreSQL + Drizzle ORM |
| Git操作 | isomorphic-git |
| LLM | OpenAI API (gpt-4o-mini) |
| ストレージ | S3互換 (ローカル開発: RustFS) |
| 認証 | GitHub App OAuth + JWT |

## セットアップ

### 前提条件

- Node.js >= 20.0.0
- Docker / Docker Compose
- GitHub App (OAuth 認証用)
- OpenAI API キー

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd article-supporter
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して各値を設定してください。

### 3. Docker サービスの起動

PostgreSQL と S3 互換ストレージ (RustFS) を起動します。

```bash
docker compose up -d
```

### 4. 依存パッケージのインストール

```bash
npm install
```

### 5. データベースマイグレーション

```bash
npm run db:migrate
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

フロントエンド (http://localhost:5173) とバックエンド (http://localhost:3000) が同時に起動します。
Vite のプロキシ設定により `/api` リクエストはバックエンドに転送されます。

## npm スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | フロントエンド + バックエンドを同時起動 |
| `npm run build` | フロントエンド + バックエンドをビルド |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run lint` | ESLint 実行 |
| `npm test` | テスト実行 |
| `npm run db:migrate` | DBマイグレーション実行 |
| `npm run db:studio` | Drizzle Studio 起動 |

## プロジェクト構成

```
/
├── package.json          # ワークスペースルート
├── docker-compose.yml    # PostgreSQL + RustFS
├── .env.example
├── frontend/
│   ├── src/
│   │   ├── views/        # ページコンポーネント
│   │   ├── components/   # UIコンポーネント
│   │   ├── composables/  # Vue Composables
│   │   ├── stores/       # Pinia ストア
│   │   ├── router/       # Vue Router
│   │   └── types/        # 型定義
│   └── vite.config.ts
└── backend/
    ├── src/
    │   ├── routes/       # APIルート
    │   ├── services/     # ビジネスロジック
    │   ├── middlewares/   # 認証・エラーハンドリング
    │   ├── db/           # Drizzle スキーマ・マイグレーション
    │   ├── config/       # 環境変数
    │   └── utils/        # ユーティリティ
    └── vitest.config.ts
```

## 主な機能

- **GitHub App OAuth 認証**: Organization メンバー + リポジトリ書き込み権限の検証
- **LLM チャット**: OpenAI API によるイベント報告記事の作成支援
- **記事エディタ**: Markdown 記事の編集 (タイトル、slug、本文)、自動保存
- **画像管理**: S3 互換ストレージへのアップロード、アイキャッチ設定
- **PR 作成**: isomorphic-git でブランチ作成・コミット・プッシュし、GitHub API で PR を作成
- **PR 更新**: 記事編集後に既存 PR へ追加コミット

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY_PATH` | GitHub App 秘密鍵ファイルパス |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `GITHUB_APP_INSTALLATION_ID` | GitHub App Installation ID |
| `GITHUB_OWNER` | 対象リポジトリのオーナー |
| `GITHUB_REPO` | 対象リポジトリ名 |
| `GITHUB_ORG` | 所属 Organization |
| `OPENAI_API_KEY` | OpenAI API キー |
| `JWT_SECRET` | JWT 署名シークレット |
| `JWT_REFRESH_SECRET` | リフレッシュトークン署名シークレット |
| `DATABASE_URL` | PostgreSQL 接続 URL |
| `S3_ENDPOINT` | S3 エンドポイント |
| `S3_REGION` | S3 リージョン |
| `S3_BUCKET` | S3 バケット名 |
| `S3_ACCESS_KEY_ID` | S3 アクセスキー |
| `S3_SECRET_ACCESS_KEY` | S3 シークレットキー |
