## Supabase 認証・登録フロー実装ガイド

Supabase を利用してメール OTP (Magic Link) ベースの登録・ログイン機能を構築する際の手順と注意点をまとめています。今回の不具合対応で得た知見も反映しています。

---

### 1. 事前準備
- **Supabase プロジェクト設定**
  - Authentication > URL configuration にアプリの `Site URL` と `Redirect URLs`（例: `http://localhost:3000/auth/callback`）を正しく登録。
  - メールテンプレートで Magic Link の有効期限を確認し、必要に応じて延長。
- **環境変数**
  - `.env.local` 等に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を用意。
  - サーバーで管理するキー (`SUPABASE_SERVICE_ROLE_KEY`) は API ルートや Edge Functions でのみ使用する。

---

### 2. フロントエンド (ブラウザ) クライアント
- `@supabase/supabase-js` の `createClient` を使い、必ずシングルトンで管理する（`src/lib/supabase/client.ts`）。
- **メールOTPログイン（旧仕様）**：`signInWithOtp` を呼び出す際は `emailRedirectTo` に `/auth/callback` を指定し、`window.location.origin` と組み合わせて環境に応じた URL を生成。
- **パスワードログイン（現行仕様）**：`/auth/login/page.tsx` で `supabase.auth.signInWithPassword({ email, password })` を利用。成功時は `data.session` を `syncSession` 経由で `/api/auth/session` へ POST し、サーバー側 Cookie を更新。失敗理由は `feedback` で利用者に提示。
- `createSupabaseBrowserClient` は `persistSession: true`・`detectSessionInUrl: false` とし、Supabase 標準の `localStorage` ベースのフローを維持する。
- 成功後は `router.replace('/dashboard')` と `router.refresh()` を呼び出し、App Router 側でセッションを反映。

---

### 3. サーバー API (`/api/auth/session`)
- Magic Link フロー完了後、ブラウザから `access_token` と `refresh_token` を POST。
- `createServerClient` を通じて `supabase.auth.setSession()` を実行し、返却される Cookie を **必ず** レスポンスに反映する。
- App Router 環境では `cookies()` API と `NextResponse.cookies.set({ name, value, ...options })` を併用して `Set-Cookie` ヘッダーを確実に送出する。
- 例：`src/app/api/auth/session/route.ts` を参照。

---

### 4. Middleware でのセッション更新
- `src/middleware.ts` でも `createServerClient` にカスタム Cookie ハンドラ (`get` / `set` / `remove`) を渡し、Supabase が返す Cookie を `NextResponse` に適切に書き込む。
- パスに応じて以下を制御：
  - 未認証で保護ルート（例：`/dashboard`）にアクセス → `/auth/login` へリダイレクト。
  - 認証済みで `/auth/login` を閲覧 → `/dashboard` へリダイレクト。
- Middleware が `NextResponse.next({ request: { headers } })` を返す際、リクエストヘッダーを引き継ぐことで Supabase セッションチェックが安定する。

---

### 5. サーバーコンポーネントでの Supabase 利用
- `src/lib/supabase/server.ts` にサーバー用クライアント作成関数を実装。
  - `cookies()` から値を取得し、`get` / `set` / `remove` を実装。
  - Server Component ではレスポンスに直接 `Set-Cookie` を書き込めないため、`set` では Cookie 値の保存のみに留める（オプションは Middleware や API で付与される想定）。
- ページコンポーネント（例：`src/app/dashboard/page.tsx`）から Supabase クライアントを呼び出し、`auth.getUser()` でユーザーを取得する。ユーザーが存在しない場合は `redirect('/auth/login')` を実行。

---

### 6. 代表的な落とし穴と対策
| 症状 | 原因 | 対策 |
| --- | --- | --- |
| Magic Link を踏んでも `otp_expired` エラーになる | `code_verifier` が保存されていない | ブラウザクライアントを `@supabase/supabase-js` の `createClient` で生成し、`localStorage` を有効化 |
| `/auth/callback` / `/auth/update-password` で `invalid request: both auth code and code verifier should be non-empty` | ブラウザクライアントが複数存在し `code_verifier` が消えた | クライアント生成はシングルトン化し、コンポーネントごとに `createSupabaseBrowserClient()` を再定義しない |
| `/api/auth/session` のレスポンスが `{"success": true}` なのにクッキーが発行されない | `Set-Cookie` がレスポンスに含まれていない | API ルートで `response.cookies.set({ ... })` を使用。`setAll` をそのまま渡すのではなく、`get` / `set` / `remove` 形式のハンドラに置き換える |
| `/dashboard` に遷移せず `/auth/login` に戻される | Middleware が Cookie を読めていない | Middleware 側でも同様に `get` / `set` / `remove` を実装し、`NextResponse.next({ request: { headers } })` を返す |
| `ERR_TOO_MANY_REDIRECTS` | Middleware と Server Component 間でセッション認識がズレて無限リダイレクト | API・Middleware・Server Component で同じ Cookie ハンドラ仕様を使う |
| リカバリリンクを開いてもフォームが出ない | URL に含まれるトークン種別を処理していない | `access_token` / `refresh_token` / `code` / `token_hash` の順に試し、`setSession` → `exchangeCodeForSession` → `verifyOtp` でフォールバック |

---

### 7. パスワード再設定フローの実装メモ
- `/auth/reset-password` でメールアドレスを入力 → `supabase.auth.resetPasswordForEmail` を実行。`redirectTo` は `window.location.origin + '/auth/update-password'`。
- `/auth/update-password` では以下を実施（`UpdatePasswordForm.tsx`）：
  1. URL から `access_token` / `refresh_token` / `code` / `token_hash` を抽出。
  2. `setSession` → `exchangeCodeForSession` → `verifyOtp({ type: 'recovery', token_hash })` の順にセッションを確立。
  3. `/api/auth/session` へトークンを送信しサーバー Cookie と同期。URL からトークンを `history.replaceState` で除去。
  4. 新しいパスワード入力後、`supabase.auth.updateUser({ password })` で更新。成功時はローカル `feedback` を表示し、`/auth/login` へのリンクを案内。
- リカバリリンクは短時間・一度限りのため、トラブル時は `/auth/reset-password` から再送。また `SUPABASE_SERVICE_ROLE_KEY` を使った `auth.admin.generateLink({ type: 'recovery' })` で手動再発行も可能（管理者用）。
- 開発時は `Site URL`（例：`http://localhost:3000`）とリダイレクト先が Supabase の Authentication 設定と一致しているかを確認。ポートが異なる場合は `.env.local` の `NEXT_PUBLIC_SITE_URL` を合わせる。
- UI は `Suspense` を利用してメールリンク判定中のローディング表示を行い、完了後にフォームを描画。

---

### 8. デバッグ手順
1. **DevTools Network**  
   - `POST /api/auth/session` の Response Headers に `Set-Cookie` があるか確認。なければ API 実装を修正。
2. **Application > Storage**  
   - `localStorage` に `sb-<project-ref>-auth-token` が存在するか。ない場合はブラウザクライアントの生成を見直す。
3. **Cookies**  
   - `sb-<project-ref>-auth-token` が作成され、`HttpOnly` 属性が付いているか。
4. **Middleware ログ**  
   - 必要に応じて `supabase.auth.getUser()` の結果を `console.log` で確認（Middleware では `process.env.NODE_ENV !== 'production'` 時のみ出力する等の工夫を推奨）。
5. **Supabase ダッシュボード**  
   - Auth → Users にユーザーが作成されているかを監視。`public.users` などアプリ側のテーブルには `upsert` で同期する。

---

### 9. 実装フロー例
1. ログインページでメールアドレスを入力 → `signInWithOtp` 実行。
2. メールリンクから `/auth/callback` に遷移。
3. Callback ページで `code` またはハッシュのトークンを使ってセッション確立。
4. `/api/auth/session` にアクセストークンを送信 → サーバーで Cookie 設定。
5. ブラウザを `/dashboard` にフルリロード付きでリダイレクト。
6. Middleware が Cookie を基にユーザーを判定し、保護ルートへアクセス許可。
7. `/dashboard` など Server Component でも `auth.getUser()` で同じセッションが取得できる。

---

### 10. 今後の実装時に忘れずに行うチェックリスト
- [ ] `createSupabaseBrowserClient`／`createSupabaseServerComponentClient`／Middleware／API の Cookie 処理が統一されている
- [ ] Magic Link の `redirectTo` URL が Supabase ダッシュボードと一致している
- [ ] `/api/auth/session` に `credentials: 'same-origin'` を付与（必要に応じて）
- [ ] `upsert` 等でユーザーテーブルと `auth.users` の同期を行っている
- [ ] 開発環境で `Preserve log` を使ってリダイレクト時のリクエストを確認している
- [ ] 例外時のログ（Console / Network）を記録し再現方法を残しておく

このガイドに沿って実装すれば、メール OTP を用いた Supabase 認証フローを安定して構築できます。リダイレクトループやセッション未反映の問題が再発した際は、上記チェックポイントを順に確認してください。

