# セットアップガイド

## 前提条件

- Node.js 20 以上
- PostgreSQL
- S3 互換ストレージ (開発環境では RustFS / MinIO など)

## 1. GitHub App の作成

### 1.1 GitHub App を作成する

Organization Settings > Developer settings > GitHub Apps > **New GitHub App** から作成する。

#### 基本情報

| 項目 | 値 |
|------|-----|
| GitHub App name | 任意 (例: `article-supporter`) |
| Homepage URL | アプリケーションの URL |
| Callback URL | `http://localhost:5173/api/auth/callback` (開発環境) |
| Expire user authorization tokens | チェック |
| Request user authorization (OAuth) during installation | チェック |
| Enable Device Flow | 不要 |
| Webhook Active | 不要 (チェックを外す) |

#### Repository Permissions

| パーミッション | レベル | 用途 |
|-------------|-------|------|
| **Contents** | Read & Write | リポジトリへの push、ファイル作成・更新 |
| **Pull requests** | Read & Write | PR 作成、PR 状態の取得 |
| **Metadata** | Read-only | リポジトリ情報の取得 (自動で付与される) |

#### Organization Permissions

| パーミッション | レベル | 用途 |
|-------------|-------|------|
| **Members** | Read-only | ユーザーが Organization メンバーか確認 |

#### Account Permissions

| パーミッション | レベル | 用途 |
|-------------|-------|------|
| **Email addresses** | Read-only | ユーザーのメールアドレス取得 (コミット用) |

#### インストール範囲

| 項目 | 値 |
|------|-----|
| Where can this GitHub App be installed? | Only on this account |

### 1.2 認証情報を取得する

GitHub App 作成後、以下の情報を控える:

- **App ID** - GitHub App のページに表示される
- **Client ID** - GitHub App のページに表示される
- **Client secret** - 「Generate a new client secret」で生成
- **Private key** - 「Generate a private key」で生成 (`.pem` ファイルがダウンロードされる)

### 1.3 Organization にインストールする

GitHub App のページ > Install App > 対象の Organization を選択してインストールする。

インストール後、**Installation ID** を取得する:
- Organization Settings > Installed GitHub Apps > Configure
- URL の末尾の数字が Installation ID (例: `https://github.com/organizations/{org}/settings/installations/12345678` なら `12345678`)

## 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成する (バックエンドのルート)。

```bash
cp .env.example backend/.env
```

### GitHub App 関連

```bash
# GitHub App のページから取得
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY_PATH=./github-app.private-key.pem
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_APP_INSTALLATION_ID=12345678
```

秘密鍵ファイル (`.pem`) は `backend/` ディレクトリに配置する。ファイル名は `GITHUB_APP_PRIVATE_KEY_PATH` で指定したパスと一致させること。

### 対象リポジトリ

```bash
GITHUB_OWNER=your-org        # リポジトリのオーナー (Organization名)
GITHUB_REPO=your-repo        # リポジトリ名
GITHUB_ORG=your-org           # Organization名 (メンバーシップ確認用)
```

### データベース

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/article_supporter
```

### JWT

```bash
# 32文字以上のランダムな文字列を設定する
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-at-least-32-characters-long
```

以下のコマンドで生成できる:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### OpenAI

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### S3 互換ストレージ

```bash
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=article-supporter
S3_ACCESS_KEY_ID=rustfsadmin
S3_SECRET_ACCESS_KEY=rustfsadmin
```

## 3. データベースのセットアップ

PostgreSQL にデータベースを作成する:

```bash
createdb article_supporter
```

マイグレーションを実行する:

```bash
npm run db:migrate
```

## 4. 依存関係のインストールと起動

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (frontend + backend 同時起動)
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3000
- フロントエンドから `/api` へのリクエストはバックエンドにプロキシされる
