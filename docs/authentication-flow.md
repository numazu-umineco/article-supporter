# 認証フロー アーキテクチャ

## 概要

GitHub App OAuth による認証。JWT + リフレッシュトークンの2トークン方式。
Organization メンバーシップとリポジトリ write 権限の検証を含む。

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/routes/auth.ts` | 認証エンドポイント (login, callback, refresh, logout, me) |
| `backend/src/services/github.ts` | GitHub OAuth + API 呼び出し |
| `backend/src/middlewares/auth.ts` | JWT 検証ミドルウェア |
| `backend/src/utils/jwt.ts` | JWT 署名・検証 (jose, HS256) |
| `backend/src/utils/crypto.ts` | セキュアトークン生成, SHA256ハッシュ |
| `frontend/src/stores/auth.ts` | 認証状態管理 (Pinia) |
| `frontend/src/router/index.ts` | ナビゲーションガード |
| `frontend/src/composables/useApi.ts` | 401 ハンドリング |

## OAuth フロー

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant BE as バックエンド
    participant GH as GitHub

    B->>+BE: GET /api/auth/login
    BE->>BE: state 生成 + oauth_state Cookie 設定
    BE-->>-B: 302 Redirect (GitHub OAuth URL)

    B->>+GH: GitHub OAuth 画面
    GH-->>-B: 302 Redirect (code, state)

    B->>+BE: GET /api/auth/callback?code=...&state=...
    BE->>BE: state 検証

    BE->>+GH: code → access_token 交換
    GH-->>-BE: access_token

    BE->>+GH: ユーザー情報取得
    GH-->>-BE: user info

    BE->>+GH: Org メンバーシップ検証
    GH-->>-BE: OK/NG

    BE->>+GH: リポジトリ権限検証
    GH-->>-BE: permission level

    BE->>BE: DB: users upsert
    BE->>BE: JWT 発行 (15分)
    BE->>BE: リフレッシュトークン発行<br/>DB: refresh_tokens insert

    BE-->>-B: 302 Redirect to /<br/>+ auth_token Cookie<br/>+ refresh_token Cookie
```

## トークン仕様

### JWT (auth_token)

| 項目 | 値 |
|-----|---|
| アルゴリズム | HS256 |
| 有効期限 | 15分 |
| Cookie パス | `/` |
| Cookie 属性 | `httpOnly`, `sameSite: Lax`, `secure` (本番のみ) |

ペイロード:
```json
{
  "sub": "ユーザーID (UUID)",
  "githubLogin": "github-username",
  "githubId": 12345,
  "iat": 1234567890,
  "exp": 1234568790
}
```

### リフレッシュトークン (refresh_token)

| 項目 | 値 |
|-----|---|
| 形式 | 64バイト暗号学的乱数 (hex) |
| 有効期限 | 30日 |
| Cookie パス | `/api/auth` |
| DB保存 | SHA256 ハッシュのみ |

## トークンリフレッシュ

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant BE as バックエンド

    B->>+BE: POST /api/auth/refresh<br/>(refresh_token Cookie)
    BE->>BE: Cookie から refresh_token 取得
    BE->>BE: SHA256ハッシュ計算
    BE->>BE: DB: tokenHash + 有効期限で検索

    rect rgb(255, 240, 220)
        Note over BE: トークンローテーション
        BE->>BE: DB: 旧リフレッシュトークン削除
        BE->>BE: 新JWT 発行
        BE->>BE: 新リフレッシュトークン発行
        BE->>BE: DB: 新リフレッシュトークン保存
    end

    BE-->>-B: 200 OK<br/>+ 新 auth_token Cookie<br/>+ 新 refresh_token Cookie
```

**トークンローテーション**: リフレッシュのたびに旧トークンを無効化し新トークンを発行。
漏洩したトークンの再利用を防止。

## フロントエンドの認証管理

### 初期化フロー

```typescript
// router/index.ts - ナビゲーションガード
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  if (!authStore.initialized) {
    await authStore.initialize()  // GET /api/auth/me
  }
  // 認証チェック → リダイレクト判定
})
```

### 認証状態 (Pinia ストア)

```typescript
// stores/auth.ts
const user = ref<User | null>(null)       // ユーザー情報 (認証済みなら非null)
const initialized = ref(false)            // 初期化済みフラグ (二重実行防止)
const isAuthenticated = computed(() => !!user.value)
```

### 401 ハンドリング

```typescript
// composables/useApi.ts
if (response.status === 401) {
  window.location.href = '/login'  // 強制リダイレクト
}
```

**注意:** 現在の実装ではリフレッシュトークンによる自動再取得は行わず、
401 発生時は即座にログイン画面にリダイレクトする。
将来的にはリフレッシュを試みてからリダイレクトするように改善可能。

## ログアウト

```mermaid
sequenceDiagram
    participant B as ブラウザ
    participant BE as バックエンド

    B->>+BE: POST /api/auth/logout
    BE->>BE: DB: リフレッシュトークン削除
    BE->>BE: Cookie: auth_token 削除
    BE->>BE: Cookie: refresh_token 削除
    BE-->>-B: 200 OK

    B->>B: user = null
    B->>B: /login にリダイレクト
```

## セキュリティ考慮事項

- JWT シークレットは 32文字以上を強制 (Zod バリデーション)
- リフレッシュトークンはハッシュのみ DB に保存 (平文保存しない)
- OAuth state パラメータで CSRF 防止
- Cookie は `httpOnly` で XSS からの読み取りを防止
- `sameSite: Lax` で CSRF を軽減
- 本番環境では `secure` フラグで HTTPS 通信を強制
