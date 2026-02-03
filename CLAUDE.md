# 静的サイト記事作成支援 Web アプリケーション

## 概要
Git で管理されている静的サイトに、イベント開催報告記事を追加するための Web UI を構築する。
LLM (OpenAI API) とのチャットを通じて記事作成を支援し、GitHub App 認証でログイン後、記事を Pull Request として作成する。

## 技術スタック

### フロントエンド
- Vite + Vue.js (TypeScript)
- PrimeVue (UIライブラリ)
- PrimeFlex (CSS)

### バックエンド  
- Hono (TypeScript) on Node.js
- PostgreSQL (データベース)
- isomorphic-git (Git操作に必ずこれを使用すること)
- OpenAI API (モデル: gpt-4o-mini)
- S3互換ストレージ (画像保存)

### 認証
- GitHub App による OAuth 認証
- JWT (Cookie保存、有効期限15分)
- リフレッシュトークンによる再取得

## プロジェクト構成
```
/
├── package.json          # ルートからまとめて実行できるスクリプト
├── frontend/
│   ├── package.json
│   ├── vite.config.ts    # バックエンドへのプロキシ設定を含む
│   └── src/
└── backend/
    ├── package.json
    └── src/
```

ルートの package.json から `npm run dev` で frontend と backend を同時起動できるようにする。
フロントエンドの Vite 設定で `/api` へのリクエストをバックエンドにプロキシし、同一オリジンとして動作させる。

## 対象リポジトリの構造

記事の配置パス:
```
src/news/YYYY/MMDD/:slug.md
```

例:
```
src/news/2025/1220/umineco_open_cafe_7th.md
```

画像ファイルは Markdown と同じディレクトリに配置する:
```
src/news/2025/1220/umineco_open_cafe_7th.md
src/news/2025/1220/cafe.jpg
src/news/2025/1220/group_photo.jpg
```

### Markdown フロントマター形式
```yaml
---
title: うみねこオープンカフェ 第7回 を開催しました
date: 2025-12-20
eyecatch: ./cafe.jpg
---
```

- `title`: 記事タイトル (必須)
- `date`: 記事の日付 (必須、YYYY-MM-DD形式)
- `eyecatch`: アイキャッチ画像パス (任意、相対パス)

## データベース設計 (PostgreSQL)

### users テーブル
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id INTEGER UNIQUE NOT NULL,
  github_login VARCHAR(255) NOT NULL,
  github_name VARCHAR(255),
  github_email VARCHAR(255),
  github_avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### event_types テーブル
```sql
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### sessions テーブル
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type_id UUID NOT NULL REFERENCES event_types(id),
  event_date DATE NOT NULL,
  title VARCHAR(255),
  slug VARCHAR(255),
  article_content TEXT,
  eyecatch_image_id UUID,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pr_created, merged
  pr_url TEXT,
  pr_number INTEGER,
  branch_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### chat_messages テーブル
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  article_content TEXT, -- <article>タグ内のコンテンツがあれば抽出して保存
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### session_images テーブル
```sql
CREATE TABLE session_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  custom_filename VARCHAR(255) NOT NULL,
  s3_key TEXT NOT NULL,
  s3_url TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  is_eyecatch BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### refresh_tokens テーブル
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 認証フロー

1. GitHub App の OAuth フローでユーザー認証
2. 認証後、以下を検証:
   - ユーザーが指定 Organization のメンバーであること
   - ユーザーが対象リポジトリへの write 権限を持つこと
3. 検証成功後:
   - users テーブルにユーザー情報を保存/更新
   - JWT を発行して HttpOnly Cookie に保存 (有効期限: 15分)
   - リフレッシュトークンを発行して refresh_tokens テーブルに保存し、HttpOnly Cookie に保存
4. リフレッシュトークンで新しい JWT を取得可能

## 画面構成

### 画面1: ログイン画面
- GitHub でログインボタン
- 未認証時はこの画面にリダイレクト

### 画面2: セッション一覧画面 (ログイン後のホーム)

#### 表示内容
- 新規セッション作成ボタン
- 過去のセッション一覧 (カード形式またはテーブル形式)
  - セッションごとに表示:
    - タイトル (未設定の場合は「無題」)
    - イベント種類
    - イベント開催日
    - ステータス (下書き / PR作成済み / マージ済み)
    - PR作成済みの場合: PRへのリンク
    - 作成日時
    - 更新日時
- セッションをクリックで編集画面へ遷移
  - ただし、マージ済みのセッションは閲覧のみ (編集不可)

### 画面3: 新規セッション作成画面 (アンケート形式)

#### 入力項目
1. **イベント開催日**: DatePicker
2. **イベント種類**: ドロップダウン選択 (event_types テーブルから取得)

#### 動作
- 「作成」ボタンで新規セッションを作成し、編集画面へ遷移
- 選択したイベント種類に紐づくシステムプロンプトが、チャットの初期プロンプトとして使用される

### 画面4: 記事編集画面 (3ペイン構造)
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー (常に上部に追従)                                      │
│ - セッション情報 (イベント種類、開催日)                          │
│ - 保存ステータス                                              │
│ - PR作成ボタン / PRリンク                                     │
├─────────────────────────┬───────────────────────────────────┤
│                         │                                   │
│  左ペイン: チャット欄     │  右ペイン: エディタ & 画像          │
│                         │                                   │
│  ┌───────────────────┐  │  ┌─────────────────────────────┐  │
│  │ チャット履歴       │  │  │ タイトル入力欄               │  │
│  │ (スクロール可能)   │  │  ├─────────────────────────────┤  │
│  │                   │  │  │ slug入力欄                  │  │
│  │                   │  │  ├─────────────────────────────┤  │
│  │                   │  │  │ 記事本文エディタ             │  │
│  │                   │  │  │ (Markdown、スクロール可能)   │  │
│  │                   │  │  │                             │  │
│  └───────────────────┘  │  ├─────────────────────────────┤  │
│  ┌───────────────────┐  │  │ 画像一覧                    │  │
│  │ メッセージ入力欄   │  │  │ - サムネイル                │  │
│  │ [送信ボタン]      │  │  │ - カスタムファイル名         │  │
│  └───────────────────┘  │  │ - eyecatch設定              │  │
│                         │  │ - 削除ボタン                 │  │
│                         │  │ [画像追加ボタン]             │  │
│                         │  └─────────────────────────────┘  │
└─────────────────────────┴───────────────────────────────────┘
```

#### 左ペイン: チャット欄

**チャット履歴**
- 過去のメッセージを時系列で表示
- ユーザーメッセージと AI メッセージを区別して表示
- AI メッセージで `<article>` タグ内のコンテンツは表示しない (右ペインに反映されるため)
- `<article>` タグ外の通常の返答のみ表示

**メッセージ入力**
- テキストエリア
- 送信ボタン (またはCtrl+Enter)
- 送信時、現在の右ペインの内容 (タイトル、slug、記事本文) も一緒に LLM に送信される

#### 右ペイン: エディタ & 画像

**タイトル入力欄**
- テキスト入力
- LLM が `<article>` タグ内で title を指定した場合、自動反映
- 手動編集可能

**slug入力欄**
- テキスト入力
- 英数字、ハイフン、アンダースコアのみ許可
- LLM が `<article>` タグ内で slug を指定した場合、自動反映
- 手動編集可能

**記事本文エディタ**
- Markdown テキストエリア
- LLM が `<article>` タグ内で content を指定した場合、自動反映
- 手動編集可能
- 変更は自動保存 (デバウンス処理)

**画像一覧**
- アップロード済み画像のサムネイル表示
- 各画像に対して:
  - カスタムファイル名入力欄
  - eyecatch チェックボックス (1つのみ選択可)
  - 削除ボタン
- 画像追加ボタン:
  - ファイル選択ダイアログ
  - 選択後、即座に S3 にアップロード
  - アップロード完了後、session_images に保存

#### ヘッダー

**表示内容**
- イベント種類名
- イベント開催日
- 保存ステータス (「保存済み」「保存中...」)

**PR作成ボタン** (status が draft の場合)
- クリックで PR 作成処理を開始
- バリデーション:
  - タイトルが入力されていること
  - slugが入力されていること
  - 記事本文が入力されていること
- 処理中はローディング表示
- 完了後、PR リンクを表示

**PRリンク** (status が pr_created または merged の場合)
- PR URL へのリンク
- マージ済みの場合は「マージ済み」バッジも表示

**マージ済みの場合の制限**
- 全ての入力欄を readonly にする
- チャット入力欄を非表示にする
- 「このセッションはマージ済みのため編集できません」メッセージを表示

### 画面5: イベント種類管理画面

#### 一覧表示
- イベント種類のテーブル表示
  - 名前
  - 説明
  - 有効/無効ステータス
  - 作成日時
- 各行に編集・削除ボタン
- 新規作成ボタン

#### 作成/編集フォーム (モーダルまたは別画面)
- 名前: テキスト入力
- 説明: テキストエリア
- システムプロンプト: 大きめのテキストエリア
- 有効/無効: トグルスイッチ

## LLM 連携

### システムプロンプトの構造

イベント種類ごとに DB に保存されたシステムプロンプトを使用。
システムプロンプトには以下の指示を含めること:
```
あなたはイベント開催報告記事の作成をサポートするアシスタントです。

記事のコンテンツを提案する際は、必ず以下の形式で出力してください:

<article>
<title>記事のタイトル</title>
<slug>記事のslug（英数字とハイフン、アンダースコアのみ）</slug>
<content>
Markdown形式の記事本文
</content>
</article>

上記の形式以外の通常の会話や質問への回答は、<article>タグを使わずに普通に返答してください。

[以下、イベント種類固有の指示...]
```

### チャット送信時の処理

1. ユーザーがメッセージを送信
2. バックエンドで以下を組み立てて OpenAI API に送信:
   - システムプロンプト (イベント種類のもの)
   - 過去のチャット履歴
   - 現在の編集状態:
```
     【現在の記事状態】
     タイトル: {title}
     slug: {slug}
     本文:
     {article_content}
```
   - ユーザーの新しいメッセージ
3. AI の返答を受信
4. 返答に `<article>` タグがあれば:
   - タグ内の title, slug, content を抽出
   - セッションの該当フィールドを更新
   - chat_messages の article_content カラムにも保存
5. チャット履歴に保存
6. フロントエンドに返答を返す

### フロントエンドでの表示

- AI 返答全体から `<article>...</article>` 部分を除去して左ペインに表示
- `<article>` タグ内の内容は右ペインの各フィールドに反映

## Git 操作 (isomorphic-git 使用)

### PR 作成時 (初回)

1. 対象リポジトリを clone (shallow clone)
2. 新規ブランチ作成: `post-gen/{ISO8601形式の日時}`
   - 例: `post-gen/2025-01-15T143022`
3. 記事ディレクトリ作成: `src/news/YYYY/MMDD/`
4. Markdown ファイル作成:
   - ファイル名: `{slug}.md`
   - フロントマター + 記事本文
5. S3 から画像をダウンロードして配置
6. コミット作成:
   - メッセージ: 記事タイトル
   - Author: ログイン中の GitHub ユーザー
   - Committer: GitHub App
7. push
8. GitHub API で PR 作成
9. セッションを更新:
   - status: pr_created
   - pr_url, pr_number, branch_name を保存

### PR 作成後の編集時

1. セッションの branch_name を使用
2. リポジトリを clone
3. 該当ブランチをチェックアウト
4. ファイルを更新
5. 差分をコミット:
   - メッセージ: `Update: {記事タイトル}`
6. push
7. (PRは既存のものがそのまま更新される)

### マージ検知

- PR 作成済みセッションを開いたとき、GitHub API で PR の状態を確認
- マージ済みならセッションの status を merged に更新

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
- `PATCH /api/sessions/:id` - セッション更新 (タイトル、slug、記事本文など)
- `DELETE /api/sessions/:id` - セッション削除

### チャット
- `GET /api/sessions/:id/messages` - チャット履歴取得
- `POST /api/sessions/:id/messages` - メッセージ送信 (LLM呼び出し)

### 画像
- `POST /api/sessions/:id/images` - 画像アップロード
- `PATCH /api/sessions/:id/images/:imageId` - 画像情報更新 (ファイル名、eyecatch)
- `DELETE /api/sessions/:id/images/:imageId` - 画像削除

### Git操作
- `POST /api/sessions/:id/publish` - PR作成または更新

### イベント種類
- `GET /api/event-types` - イベント種類一覧取得
- `POST /api/event-types` - イベント種類作成
- `GET /api/event-types/:id` - イベント種類詳細取得
- `PATCH /api/event-types/:id` - イベント種類更新
- `DELETE /api/event-types/:id` - イベント種類削除

## 環境変数
```
# GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY_PATH=  # 秘密鍵ファイルへのパス (例: ./github-app.private-key.pem)
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
JWT_SECRET=
JWT_REFRESH_SECRET=

# Database
DATABASE_URL=

# S3互換ストレージ
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

## 注意事項

- Git 操作には必ず `isomorphic-git` を使用すること
- PrimeVue コンポーネントを積極的に活用すること
- フロントエンドのスタイリングには PrimeFlex を使用すること
- TypeScript の型定義を適切に行うこと
- エラーハンドリングを丁寧に実装すること
- チャットの返答で `<article>` タグの解析は正確に行うこと
- 画像アップロードは即座に S3 に保存し、session_images に記録すること
- マージ済みセッションは編集不可にすること
