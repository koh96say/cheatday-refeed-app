# Vercelデプロイガイド

このドキュメントでは、代謝計算機をVercelにデプロイする方法を説明します。

## 📋 前提条件

- GitHubアカウント
- Vercelアカウント（[vercel.com](https://vercel.com)で作成）
- プロジェクトがGitHubにプッシュされていること

## 🚀 方法1: GitHub連携（推奨・自動デプロイ）

### 手順

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "feat: Vercelデプロイ準備"
   git push origin main
   ```

2. **Vercelにログイン**
   - [vercel.com](https://vercel.com/login) にアクセス
   - GitHubアカウントでログイン

3. **プロジェクトをインポート**
   - Vercelダッシュボードで「Add New Project」をクリック
   - GitHubリポジトリ一覧から「代謝計算」を選択
   - 「Import」をクリック

4. **デプロイ設定**
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: `./`（デフォルト）
   - **Build Command**: `npm run build`（自動）
   - **Output Directory**: `.next`（自動）
   - **Install Command**: `npm install`（自動）

5. **環境変数設定（APIレート制限を有効化する場合）**
   - プロジェクト設定 → Environment Variables
   - 以下の環境変数を追加:
     - `UPSTASH_REDIS_REST_URL`: Upstash RedisのREST URL
     - `UPSTASH_REDIS_REST_TOKEN`: Upstash RedisのREST Token
   - **注意**: 環境変数を設定しない場合、レート制限は無効化されます（開発環境でも動作します）
   
   **Upstash Redisのセットアップ手順**:
   1. [Upstash](https://upstash.com/)にアクセスしてアカウントを作成
   2. Redis Databaseを作成（無料プランあり）
   3. データベース詳細 → REST APIタブから以下をコピー:
      - `UPSTASH_REDIS_REST_URL`
      - `UPSTASH_REDIS_REST_TOKEN`
   4. VercelのEnvironment Variablesに設定（本番・プレビュー・開発環境を選択）

6. **デプロイ実行**
   - 「Deploy」をクリック
   - 数分でデプロイが完了します

### メリット

- ✅ 自動デプロイ: GitHubにプッシュするたびに自動デプロイ
- ✅ プレビューデプロイ: PRごとにプレビューURLが生成
- ✅ 簡単な設定: 最小限の設定で開始可能
- ✅ 環境管理: 本番・プレビュー・開発環境の分離

---

## 🔧 方法2: Vercel CLI（コマンドライン）

### インストール

```bash
npm i -g vercel
```

または、プロジェクトローカルで:

```bash
npx vercel
```

### 手順

1. **ログイン**
   ```bash
   vercel login
   ```
   - ブラウザが開きます
   - Vercelアカウントで認証してください

2. **デプロイ（本番環境）**
   ```bash
   vercel --prod
   ```

3. **プレビューデプロイ**
   ```bash
   vercel
   ```

### オプション

- `--yes`: 対話プロンプトをスキップ
- `--prod`: 本番環境にデプロイ
- `--debug`: デバッグ情報を表示

---

## 🔍 デプロイ後の確認

### 1. デプロイログの確認

Vercelダッシュボードで以下の情報を確認:
- ビルドログ
- デプロイURL
- デプロイステータス

### 2. アプリケーションの動作確認

デプロイURL（例: `https://your-project.vercel.app`）で以下を確認:
- ✅ ページが正常に表示される
- ✅ 計算フォームが動作する
- ✅ APIエンドポイント（`/api/calculate`）が動作する
- ✅ レスポンシブデザインが正しく表示される

### 3. パフォーマンス確認

- [PageSpeed Insights](https://pagespeed.web.dev/)でスコア確認
- VercelダッシュボードのAnalyticsでトラフィック確認

---

## ⚙️ 設定ファイル

### vercel.json

現在の設定:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hnd1"]
}
```

**設定説明**:
- `regions: ["hnd1"]`: 東京リージョンでデプロイ（日本ユーザー向け最適化）
  
**注意**: Vercelの有効なリージョンコード:
- `hnd1`: 東京（日本）
- `sfo1`: サンフランシスコ（米国）
- `iad1`: ワシントンD.C.（米国）

### カスタムドメイン設定

1. Vercelダッシュボード → プロジェクト → Settings → Domains
2. ドメインを追加
3. DNS設定を実施（Vercelの指示に従う）

---

## 🐛 トラブルシューティング

### ビルドエラー

**エラー**: `Module not found`
```bash
# ローカルでビルドを確認
npm run build
```

**エラー**: TypeScriptエラー
```bash
# 型チェックを実行
npx tsc --noEmit
```

### デプロイエラー

1. **ログを確認**: VercelダッシュボードのBuild Logs
2. **環境変数確認**: Settings → Environment Variables
3. **Node.jsバージョン確認**: Settings → General → Node.js Version

### パフォーマンス問題

- Next.jsの画像最適化が有効か確認
- `next.config.js`の設定を確認
- CDNキャッシュ設定を確認

---

## 📊 モニタリング

### Analytics

Vercelダッシュボードで以下を確認:
- ページビュー
- リクエスト数
- レスポンスタイム
- エラー率

### ログ

- リアルタイムログ: Vercelダッシュボード → Deployments → 選択 → Logs
- 関数ログ: `/api` エンドポイントのログ

---

## 🔄 継続的デプロイ（CI/CD）

### 自動デプロイ設定

GitHub連携を使用している場合、以下が自動設定されます:
- `main`ブランチ → 本番環境に自動デプロイ
- その他のブランチ → プレビュー環境に自動デプロイ
- PR作成 → プレビューデプロイ

### デプロイの停止

特定のコミットでデプロイを停止したい場合:
- コミットメッセージに `[skip vercel]` を含める

---

## 📝 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

## ✅ デプロイチェックリスト

- [ ] GitHubにプッシュ済み
- [ ] `npm run build`が成功
- [ ] Vercelアカウント作成済み
- [ ] プロジェクトをインポート
- [ ] 環境変数設定（Upstash Redis - オプション）
- [ ] デプロイが成功
- [ ] アプリケーションが正常に動作
- [ ] APIレート制限の動作確認（環境変数設定時）
- [ ] カスタムドメイン設定（必要に応じて）

