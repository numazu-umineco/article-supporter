# フロントエンド (frontend/)

## 技術構成

- **Vue 3.5** (`<script setup>` + Composition API)
- **TypeScript 5.7**
- **Vite 6.0** (ビルド + 開発サーバー)
- **PrimeVue 4.0** (UIコンポーネント)
- **PrimeFlex 4.0** (CSSユーティリティ)
- **PrimeIcons 7.0** (アイコン)
- **Pinia 2.3** (グローバル状態管理)
- **Vue Router 4.5** (ルーティング)
- **markdown-it 14.1** (Markdownレンダリング)

## ディレクトリ構造

```
src/
├── main.ts                      # アプリ初期化 (PrimeVue, Pinia, Router)
├── App.vue                      # Toast + ConfirmDialog のグローバルプロバイダ
├── vite-env.d.ts
│
├── types/
│   └── index.ts                 # 共有型定義 (User, Session, ChatMessage, etc.)
│
├── stores/
│   └── auth.ts                  # Pinia認証ストア (唯一のグローバルストア)
│
├── router/
│   └── index.ts                 # ルート定義 + ナビゲーションガード
│
├── composables/                 # ビジネスロジック層
│   ├── useApi.ts                # HTTP クライアント (fetch ラッパー)
│   ├── useSessions.ts           # セッション CRUD
│   ├── useChat.ts               # チャット送受信 + <article>タグ除去
│   ├── useImages.ts             # 画像アップロード/更新/削除
│   ├── useAutoSave.ts           # デバウンス付き自動保存
│   └── useEventTypes.ts         # イベント種類 CRUD
│
├── views/                       # 画面 (ルートに対応)
│   ├── LoginView.vue            # ログイン画面
│   ├── HomeView.vue             # セッション一覧 (ホーム)
│   ├── SessionEditView.vue      # 記事編集画面 (3ペイン)
│   └── EventTypesView.vue       # イベント種類管理
│
├── components/
│   ├── AppHeader.vue            # 共通ヘッダー (ユーザーアバター, ログアウト)
│   ├── common/
│   │   └── MarkdownPreview.vue  # Markdown→HTMLレンダラー (画像パス解決付き)
│   ├── sessions/
│   │   ├── SessionCard.vue      # セッション一覧カード
│   │   └── NewSessionDialog.vue # 新規セッション作成ダイアログ
│   ├── session-edit/
│   │   ├── SessionHeader.vue    # エディタヘッダー (保存状態, PRボタン)
│   │   ├── ChatPane.vue         # 左ペイン: チャットUI
│   │   ├── ChatMessage.vue      # 個別チャットメッセージ
│   │   ├── EditorPane.vue       # 右ペイン: エディタ + プレビュー + 画像
│   │   ├── ImageList.vue        # 画像一覧コンテナ
│   │   └── ImageCard.vue        # 個別画像カード
│   └── event-types/
│       └── EventTypeForm.vue    # イベント種類 作成/編集フォーム
│
├── utils/
│   └── resizeImage.ts           # クライアントサイド画像リサイズ (最大1800px)
│
└── assets/styles/
    └── main.css                 # グローバルCSS (スクロールバー, リセット)
```

## アーキテクチャパターン

### 状態管理の方針

```
グローバル状態 (Pinia)     → 認証情報のみ (auth.ts)
ローカル状態 (Composables) → 画面ごとのビジネスロジック
コンポーネント状態         → UI表示のみ (props/emits)
```

- **Pinia ストア** は認証 (`stores/auth.ts`) のみ使用
- 画面固有の状態は **composables** で管理
- コンポーネント間通信は **props + emits + v-model**

### Composables パターン

composable は `use + ドメイン名` で命名。reactive な状態と操作メソッドを返す。

```typescript
// 使い方の例
const { messages, loading, sending, fetchMessages, sendMessage } = useChat(sessionId)
```

各 composable の責務:

| Composable | 責務 | 状態 |
|-----------|------|------|
| `useApi` | HTTP通信, エラーハンドリング, 401リダイレクト | なし (関数のみ) |
| `useChat` | チャット履歴取得, メッセージ送信, 楽観的UI | messages, loading, sending |
| `useSessions` | セッションCRUD, 公開処理 | なし (関数のみ) |
| `useImages` | 画像アップロード/更新/削除 | images, uploading |
| `useAutoSave` | デバウンス付き自動保存 | saving, saved |
| `useEventTypes` | イベント種類CRUD | eventTypes, loading |

### コンポーネント設計原則

- **Views** はページ全体のレイアウトとcomposableの接続を担当
- **Components** はUI表示に専念し、ビジネスロジックを持たない
- すべて `<script setup>` + TypeScript を使用
- PrimeVue コンポーネントを最大限活用

### API 通信パターン

`useApi` は `fetch` ラッパーで、以下を自動処理:
- `credentials: 'include'` (Cookie送信)
- `Content-Type: application/json`
- エラー時の Toast 通知
- 401 時に `/login` へリダイレクト

```typescript
const api = useApi()
const data = await api.get<Session[]>('/api/sessions')
await api.post('/api/sessions', { eventTypeId, eventDate })
await api.upload('/api/sessions/:id/images', formData) // multipart
```

## ルーティング

| パス | ビュー | 認証 | 説明 |
|------|--------|------|------|
| `/login` | LoginView | 不要 | GitHubログインボタン |
| `/` | HomeView | 必要 | セッション一覧 |
| `/sessions/:id` | SessionEditView | 必要 | 記事編集 (3ペイン) |
| `/event-types` | EventTypesView | 必要 | イベント種類管理 |

ナビゲーションガード:
- 未認証 → `/login` にリダイレクト
- 認証済み + `/login` アクセス → `/` にリダイレクト
- 初回アクセス時に `authStore.initialize()` で `/api/auth/me` を呼び認証状態を確認

## Vite 設定

- 開発サーバー: `http://localhost:5173`
- API プロキシ: `/api` → `http://localhost:3020`
- パスエイリアス: `@/` → `./src/`

## スタイリング方針

- レイアウト: PrimeFlex のユーティリティクラス (`flex`, `gap-*`, `p-*`, `w-*` 等)
- テーマ: PrimeVue のCSS変数 (`surface-ground`, `surface-card`, `text-color` 等)
- コンポーネント固有のスタイルは `<style scoped>` で定義
- アイコン: PrimeIcons (`pi pi-*`)

## 画像処理

- アップロード前にクライアント側でリサイズ (最大1800px, `utils/resizeImage.ts`)
- GIF はリサイズをバイパス (アニメーション保持)
- Markdown 内の画像パス (`./filename`) は API URL に解決 (`MarkdownPreview.vue`)

## キーボードショートカット

- `Ctrl+Enter` (Mac: `Cmd+Enter`): チャットメッセージ送信 (`ChatPane.vue`)
