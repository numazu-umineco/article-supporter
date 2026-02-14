# バックエンド (backend/)

## 技術構成

- **Hono 4.6** (Web フレームワーク)
- **@hono/node-server** (Node.js アダプタ)
- **TypeScript 5.7**
- **Drizzle ORM** + **postgres** (PostgreSQL)
- **isomorphic-git** (Git 操作、**必ず使用すること**)
- **openai 6.17** (LLM API)
- **@aws-sdk/client-s3** (S3互換ストレージ)
- **@octokit/rest** + **@octokit/auth-app** (GitHub API)
- **jose** (JWT 署名・検証)
- **zod** (バリデーション)

## ディレクトリ構造

```
src/
├── index.ts                          # サーバー起動 (ポート 3020)
├── app.ts                            # Hono アプリ設定 + ルート登録
│
├── config/
│   └── env.ts                        # 環境変数バリデーション (Zod スキーマ)
│
├── types/
│   └── index.ts                      # 型定義 (APIレスポンス, JWTPayload, SessionStatus等)
│
├── db/
│   ├── client.ts                     # Drizzle ORM 初期化 (getDb())
│   ├── schema.ts                     # テーブル定義 + リレーション + 型エクスポート
│   └── migrations/                   # Drizzle Kit 自動生成マイグレーション
│
├── middlewares/
│   ├── auth.ts                       # JWT認証ミドルウェア (authMiddleware, optionalAuthMiddleware)
│   ├── error-handler.ts              # エラークラス定義 + グローバルエラーハンドラ
│   └── logger.ts                     # HTTPリクエストロギング
│
├── utils/
│   ├── jwt.ts                        # JWT 署名/検証 (jose, HS256)
│   └── crypto.ts                     # セキュアトークン生成, SHA256ハッシュ
│
├── routes/
│   ├── auth.ts                       # 認証 (login, callback, refresh, logout, me)
│   ├── sessions.ts                   # セッション CRUD
│   ├── chat.ts                       # チャットメッセージ (GET, POST)
│   ├── images.ts                     # 画像管理 (upload, update, delete, download)
│   ├── publish.ts                    # PR作成/更新
│   ├── event-types.ts                # イベント種類 CRUD
│   ├── config.ts                     # アプリケーション設定
│   └── health.ts                     # ヘルスチェック
│
└── services/
    ├── github.ts                     # GitHub OAuth + ユーザー情報 + 権限チェック
    ├── session.ts                    # セッション DB 操作
    ├── event-type.ts                 # イベント種類 DB 操作
    ├── storage/
    │   └── s3-service.ts             # S3 アップロード/ダウンロード/削除
    ├── chat/
    │   ├── chat-service.ts           # チャット処理 + OpenAI 呼び出し + article抽出
    │   ├── openai-client.ts          # OpenAI API ラッパー (gpt-4o-mini)
    │   └── article-parser.ts         # <article>タグ パーサー
    └── git/
        ├── git-service.ts            # isomorphic-git ラッパー (clone, branch, commit, push)
        ├── github-api.ts             # GitHub App API (PR作成, botコミッター情報)
        └── publish-service.ts        # 公開ワークフロー (記事生成 → コミット → PR)
```

## アーキテクチャ

### レイヤー構成

```
routes/     → リクエスト受付, バリデーション, レスポンス返却
  ↓
services/   → ビジネスロジック, 外部API呼び出し
  ↓
db/         → データベースアクセス (Drizzle ORM)
```

routes は薄く保ち、ビジネスロジックは services に集約する。

### ミドルウェア

`app.ts` で以下の順序で適用:
1. **Logger** - HTTP リクエストログ (メソッド, パス, ステータス, 所要時間)
2. **Error Handler** - `AppError` 系エラーを JSON レスポンスに変換
3. **CORS** - `http://localhost:5173` からのリクエストを許可 (credentials含む)

ルートごとに `authMiddleware` を適用して認証を強制。

### エラーハンドリング

カスタムエラークラス階層:
```
AppError (statusCode, code)
├── ValidationError  (400, VALIDATION_ERROR)
├── UnauthorizedError (401, UNAUTHORIZED)
├── ForbiddenError   (403, FORBIDDEN)
└── NotFoundError    (404, NOT_FOUND)
```

レスポンス形式:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "エラーメッセージ"
  }
}
```

- 4xx エラーはログ出力しない (想定内)
- 5xx エラーのみコンソールにログ出力

### データベースアクセスパターン

```typescript
import { getDb } from '../db/client'
const db = getDb()

// クエリビルダー
const sessions = await db.query.sessions.findMany({
  where: eq(sessions.userId, userId),
  with: { eventType: true, images: true },
  orderBy: [desc(sessions.updatedAt)],
})

// Insert + Returning
const [session] = await db.insert(sessions).values({...}).returning()

// Upsert (onConflictDoUpdate)
await db.insert(users).values({...}).onConflictDoUpdate({
  target: users.githubId,
  set: { ... }
})
```

型は `schema.ts` から `$inferSelect` / `$inferInsert` で自動生成:
```typescript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### 認証パターン

JWT ペイロード構造:
```typescript
interface JWTPayload {
  sub: string        // ユーザーID (UUID)
  githubLogin: string
  githubId: number
  iat: number
  exp: number
}
```

Cookie 設定:
- `auth_token`: JWT, path `/`, 15分
- `refresh_token`: セキュアトークン, path `/api/auth`, 30日
- `oauth_state`: OAuthステート, path `/api/auth/callback`, 10分

`authMiddleware` が JWT を検証し、`c.set('user', authUser)` で Hono コンテキストに注入。
ルートハンドラは `c.get('user')` でユーザー情報を取得。

### セッション所有権チェック

認証済みルートでは、セッションの `userId` と JWT の `sub` が一致することを検証:
```typescript
if (session.userId !== authUser.id) {
  throw new ForbiddenError('Access denied')
}
```

### マージ済みセッションの保護

PR作成済みセッションを開く際、GitHub API で PR の状態を確認。
マージ済みなら `status` を `merged` に更新し、以降の編集操作をブロック:
```typescript
if (session.status === 'merged') {
  throw new ValidationError('マージ済みのセッションは編集できません')
}
```

## サービス詳細

### chat-service.ts
LLM チャットの中核。詳細は `docs/chat-llm-integration.md` を参照。

### publish-service.ts
PR作成/更新の全ワークフロー。詳細は `docs/publish-workflow.md` を参照。

### s3-service.ts
S3互換ストレージへの操作:
- `uploadFile(key, buffer, contentType)` → URL 返却
- `downloadFile(key)` → Buffer 返却
- `deleteFile(key)`

画像の S3 キー形式: `sessions/{sessionId}/{fileId}-{originalFilename}`

### git-service.ts
isomorphic-git のラッパー。GitHub App インストールトークンで認証:
- `cloneRepo(dir, depth?)` - shallow clone
- `createBranch(dir, branchName)` - ブランチ作成+チェックアウト
- `checkoutBranch(dir, branchName, token)` - 既存ブランチのチェックアウト
- `addFiles(dir, filepaths)` / `removeFiles(dir, filepaths)`
- `hasStagedChanges(dir)` - ステージされた変更の有無
- `commitChanges(dir, message, author, committer)`
- `push(dir, branchName, token)`

## 開発メモ

### 環境変数のバリデーション
`config/env.ts` で Zod を使用。開発環境ではDB接続なしでも起動可能 (部分的バリデーション)。

### 一時ディレクトリ
publish 処理では `os.tmpdir()` に一時ディレクトリを作成。
`finally` ブロックで必ず `fs.rmSync` でクリーンアップ。

### 画像バリデーション
- 最大ファイルサイズ: 10MB
- 許可MIMEタイプ: JPEG, PNG, GIF, WebP
- 画像プロキシ: `/api/sessions/:id/images/:imageId/file` で認証付きアクセス

### eyecatch 管理
- セッションごとに1画像のみ eyecatch に設定可能
- eyecatch 設定時、他の画像の eyecatch フラグを自動解除
- セッションの `eyecatchImageId` も同時に更新
