# プロジェクト作業前の確認フロー

このドキュメントは、プロジェクトで作業を開始する前に実行すべき確認フローを整理したものです。
事前確認を徹底することで、作業中の予期しないエラーを防ぎ、時間を大幅に短縮できます。

## 📋 チェックリスト

### 1. プロジェクトディレクトリの確認

```bash
# 現在のディレクトリを確認
pwd

# プロジェクトルートに移動（必要に応じて）
cd /path/to/project
```

### 2. 依存関係（node_modules）の確認

#### 2.1 Next.jsのインストール確認

```bash
# 方法1: 実行ファイルの存在確認（推奨・高速）
ls -la node_modules/.bin/next

# 方法2: npmパッケージリストから確認
npm list next --depth=0
```

**期待される結果**:
- ✅ 成功: ファイルパスが表示される、または`next@x.x.x`が表示される
- ❌ 失敗: `No such file or directory` または `(empty)`

**失敗時の対処**:
```bash
npm install
# または
npm ci  # package-lock.jsonが確実にある場合
```

#### 2.2 全パッケージの確認

```bash
# node_modulesディレクトリの存在確認
ls -d node_modules 2>/dev/null || echo "❌ node_modulesが存在しません"

# インストール済みパッケージの確認（サマリー）
npm list --depth=0 2>/dev/null | head -20
```

### 3. ポート競合の確認

```bash
# 使用したいポートが空いているか確認
# 例: ポート3004の場合
lsof -i :3004 | grep LISTEN

# または
netstat -an | grep 3004 | grep LISTEN  # macOS/Linux
```

**期待される結果**:
- ✅ 成功（ポート空き）: 何も表示されない
- ❌ 失敗（ポート使用中）: プロセス情報が表示される

**失敗時の対処**:
```bash
# 既存プロセスの確認
ps aux | grep "next dev" | grep -v grep

# 必要に応じて停止
pkill -f "next dev"

# または別のポートを使用
PORT=3005 npm run dev
```

### 4. package.jsonの確認

```bash
# スクリプトの確認
cat package.json | grep -A 10 '"scripts"'

# 主要なスクリプトが存在するか
npm run --silent 2>/dev/null | head -10
```

**確認項目**:
- ✅ `dev`: 開発サーバー起動スクリプト
- ✅ `build`: ビルドスクリプト
- ✅ `start`: 本番サーバー起動スクリプト（必要に応じて）

### 5. TypeScript設定の確認

```bash
# tsconfig.jsonの存在確認
ls -la tsconfig.json

# TypeScriptのコンパイルエラー確認
npx tsc --noEmit 2>&1 | head -20
```

**期待される結果**:
- ✅ 成功: `tsconfig.json`が存在し、コンパイルエラーがない
- ❌ 失敗: ファイルが存在しない、またはコンパイルエラーが表示される

**失敗時の対処**:
```bash
# tsconfig.jsonを再生成（必要に応じて）
npx tsc --init
```

### 6. テスト環境の確認（Vitest）

```bash
# vitest.config.tsの存在確認
ls -la vitest.config.ts

# テスト実行環境の確認
npm run test -- --version 2>/dev/null || echo "⚠️ vitestがインストールされていません"
```

**期待される結果**:
- ✅ 成功: `vitest.config.ts`が存在し、テストコマンドが実行可能
- ❌ 失敗: ファイルが存在しない、またはテスト実行に失敗

### 7. Tailwind CSS設定の確認

```bash
# Tailwind設定ファイルの確認
ls -la tailwind.config.js
ls -la postcss.config.js

# Tailwind CSSのコンパイル確認（ビルド時に自動実行）
npm run build 2>&1 | grep -i "tailwind\|error" | head -10
```

**確認項目**:
- ✅ `tailwind.config.js`: Tailwind設定ファイル
- ✅ `postcss.config.js`: PostCSS設定（Tailwindプラグイン含む）
- ✅ `globals.css`: Tailwindディレクティブ（@tailwind）が含まれているか

### 8. 複数ポート対応の確認

このプロジェクトは複数のポートで開発サーバーを起動できます：

```bash
# 利用可能なポートスクリプトの確認
npm run --silent 2>/dev/null | grep "dev:"

# 各ポートの競合確認
for port in 3000 3001 3002 3003 3004; do
  echo -n "ポート$port: "
  lsof -i :$port | grep LISTEN >/dev/null && echo "❌ 使用中" || echo "✅ 空き"
done
```

**確認項目**:
- ✅ `dev:3000` - デフォルトポート
- ✅ `dev:3001` - ブランチ1用
- ✅ `dev:3002` - ブランチ2用
- ✅ `dev:3003` - ブランチ3用
- ✅ `dev:3004` - ブランチ4用

### 9. Git Worktreeの確認（複数ブランチ同時開発時）

複数ブランチを同時に起動する場合：

```bash
# git worktreeの一覧確認
git worktree list

# start-all.shスクリプトの確認
ls -la start-all.sh
chmod +x start-all.sh 2>/dev/null  # 実行権限を付与（必要に応じて）

# stop-all.shスクリプトの確認
ls -la stop-all.sh
chmod +x stop-all.sh 2>/dev/null   # 実行権限を付与（必要に応じて）
```

**確認項目**:
- ✅ `start-all.sh`: 全ブランチ同時起動スクリプト
- ✅ `stop-all.sh`: 全ブランチ停止スクリプト
- ✅ git worktreeが正しく設定されているか

**注意**: git worktreeを使用している場合、各worktreeディレクトリで独立して`npm install`が必要な場合があります。

### 10. ログファイル・PIDファイルの確認

```bash
# 既存のログファイル確認
ls -la logs-*.log 2>/dev/null || echo "✅ ログファイルなし"

# 既存のPIDファイル確認
ls -la .dev-server-pids 2>/dev/null || echo "✅ PIDファイルなし"

# 残存プロセスの確認
ps aux | grep "next dev" | grep -v grep
```

**対処**:
```bash
# 不要なログファイルを削除（必要に応じて）
rm -f logs-*.log

# 残存プロセスを停止
pkill -f "next dev"
```

### 11. 環境変数の確認

```bash
# .envファイルの存在確認
ls -la .env* 2>/dev/null || echo "⚠️ .envファイルが見つかりません"

# .env.localが存在する場合（Next.js）
ls -la .env.local 2>/dev/null

# .env.exampleの確認（テンプレートとして存在するか）
ls -la .env.example 2>/dev/null || echo "⚠️ .env.exampleが見つかりません"
```

**注意**: `.env`ファイルには機密情報が含まれる可能性があるため、Gitにコミットしないように注意。

### 12. ビルド設定の確認（next.config.js）

```bash
# next.config.jsの存在確認
ls -la next.config.js

# 設定ファイルの構文確認
node -c next.config.js 2>&1 || echo "⚠️ 構文エラーがあります"
```

**確認項目**:
- ✅ `next.config.js`: Next.js設定ファイルが存在
- ✅ カスタム設定（画像最適化、ヘッダー設定など）が正しく設定されているか

### 13. Git状態の確認（オプション）

```bash
# 作業前の状態を確認
git status --short

# 変更されたファイルの確認
git diff --name-only
```

---

## 🚀 開発サーバー起動フロー

### 標準的な起動（シングルブランチ）

```bash
# 1. 依存関係の確認（上記のチェックリスト実行）

# 2. 開発サーバー起動
npm run dev                    # ポート3000で起動
npm run dev:3001              # ポート3001で起動
npm run dev:3002              # ポート3002で起動
# ... など
```

### 複数ブランチ同時起動

複数のブランチで異なるデザインを同時に確認したい場合：

```bash
# 全ブランチを同時起動
./start-all.sh

# 起動されるURL
# - feat-polish-ui-pskDc:  http://localhost:3001
# - feat-refine-ui-s24nD:   http://localhost:3002
# - feat-refine-ui-y1FBC:   http://localhost:3003
# - 2025-11-03-84t7-s24nD:  http://localhost:3004

# 全ブランチを停止
./stop-all.sh
```

**注意事項**:
- 各ブランチは別々のworktreeディレクトリに配置されています
- 各ポートで独立したサーバーが起動するため、メモリ使用量が増加します
- ログファイルは各worktreeディレクトリの`logs-{port}.log`に出力されます

### バックグラウンド起動（確認用）

```bash
# ログファイルに出力しながらバックグラウンド起動
PORT=3004 npm run dev > /tmp/nextjs-3004.log 2>&1 &
echo "プロセスID: $!"

# 数秒待ってからログ確認
sleep 5
tail -20 /tmp/nextjs-3004.log

# またはプロジェクト内のログファイルを使用
npm run dev:3004 > logs-3004.log 2>&1 &
tail -f logs-3004.log
```

### 起動確認

```bash
# サーバーが起動しているか確認
lsof -i :3004 | grep LISTEN

# または HTTPリクエストで確認
curl -s http://localhost:3004 | head -20
```

---

## ⚡ 時間短縮のためのベストプラクティス

### 1. 並列実行可能な確認

```bash
# 複数の確認を一度に実行
{
  echo "=== Next.js確認 ==="
  ls node_modules/.bin/next 2>/dev/null || echo "❌ Next.js未インストール"
  
  echo "=== ポート確認 ==="
  lsof -i :3004 | grep LISTEN || echo "✅ ポート3004は空いています"
  
  echo "=== package.json確認 ==="
  npm run --silent 2>&1 | head -5 || echo "⚠️ スクリプト確認失敗"
} | tee /tmp/pre-check.log
```

### 2. 自動化スクリプトの作成

プロジェクトルートに `check-env.sh` を作成:

```bash
#!/bin/bash
# check-env.sh

set -e

echo "🔍 環境確認中..."

# 依存関係チェック
if [ ! -d "node_modules" ]; then
    echo "❌ node_modulesが見つかりません。npm installを実行します..."
    npm install
else
    echo "✅ node_modulesが存在します"
fi

# Next.js確認
if [ ! -f "node_modules/.bin/next" ]; then
    echo "❌ Next.jsがインストールされていません。npm installを実行します..."
    npm install
else
    echo "✅ Next.jsがインストールされています"
fi

# ポート確認
PORT=${1:-3000}
if lsof -i :$PORT | grep -q LISTEN; then
    echo "⚠️ ポート$PORTは既に使用されています"
    echo "別のポートを使用するか、既存プロセスを停止してください"
else
    echo "✅ ポート$PORTは空いています"
fi

echo "✅ 環境確認完了！"
```

実行:
```bash
chmod +x check-env.sh
./check-env.sh 3004
```

### 3. ワンライナー確認コマンド

```bash
# すべての確認を1行で実行
ls node_modules/.bin/next >/dev/null 2>&1 && \
  echo "✅ Next.js OK" || \
  (echo "❌ Next.js NG → npm install" && npm install)
```

### 4. プロジェクト固有の確認コマンド

```bash
# このプロジェクト用の包括的確認
{
  echo "=== Next.js確認 ==="
  ls node_modules/.bin/next 2>/dev/null || echo "❌ Next.js未インストール"
  
  echo "=== TypeScript確認 ==="
  ls tsconfig.json 2>/dev/null && npx tsc --noEmit >/dev/null 2>&1 && echo "✅ TypeScript OK" || echo "⚠️ TypeScriptエラー"
  
  echo "=== テスト環境確認 ==="
  ls vitest.config.ts 2>/dev/null && echo "✅ Vitest設定あり" || echo "⚠️ Vitest設定なし"
  
  echo "=== Tailwind確認 ==="
  ls tailwind.config.js postcss.config.js 2>/dev/null | wc -l | xargs test 2 -eq && echo "✅ Tailwind設定OK" || echo "⚠️ Tailwind設定不完全"
  
  echo "=== 複数ポート確認 ==="
  for port in 3000 3001 3002 3003 3004; do
    lsof -i :$port | grep LISTEN >/dev/null && echo "⚠️ ポート$port使用中" || echo "✅ ポート$port空き"
  done
  
  echo "=== Git Worktree確認 ==="
  git worktree list 2>/dev/null | wc -l | xargs test 1 -gt && echo "⚠️ Worktree未設定" || echo "✅ Worktree設定あり"
} | tee /tmp/project-check.log
```

---

## 🐛 よくある問題と対処法

### 問題1: `next: command not found`

**原因**: `node_modules`が未インストール

**対処**:
```bash
npm install
```

**確認**:
```bash
ls node_modules/.bin/next
```

---

### 問題2: ポートが既に使用されている

**原因**: 既存のプロセスがポートを使用中

**対処**:
```bash
# プロセスIDを確認
lsof -i :3004

# プロセスを停止
kill -9 <PID>

# または pkill を使用（注意して実行）
pkill -f "next dev"
```

**予防**: 事前にポート確認を実行

---

### 問題3: `npm install`が非常に遅い

**原因**: 
- ネットワーク接続の問題
- キャッシュの問題
- パッケージ数が多い

**対処**:
```bash
# npmキャッシュをクリア
npm cache clean --force

# レジストリを確認
npm config get registry

# package-lock.jsonを使用して高速インストール
npm ci
```

---

### 問題4: `node_modules/.bin/next`は存在するが起動しない

**原因**: 
- パッケージの破損
- Node.jsバージョンの不一致

**対処**:
```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# Node.jsバージョン確認
node -v
npm -v

# 必要な場合はnvmでバージョン切り替え
nvm use <version>
```

---

### 問題5: TypeScriptのコンパイルエラー

**原因**: 
- tsconfig.jsonの設定不備
- 型定義ファイルの不足

**対処**:
```bash
# TypeScriptのエラー詳細確認
npx tsc --noEmit

# 型定義のインストール（必要に応じて）
npm install --save-dev @types/node @types/react @types/react-dom
```

---

### 問題6: 複数ブランチ起動時にポート競合

**原因**: 
- 既存のプロセスがポートを使用中
- start-all.shのポート設定と実際の使用ポートが不一致

**対処**:
```bash
# 全てのnext devプロセスを停止
pkill -f "next dev"

# または stop-all.sh を使用
./stop-all.sh

# ポート使用状況を確認
for port in 3001 3002 3003 3004; do
  echo "ポート$port:"
  lsof -i :$port
done
```

---

### 問題7: git worktreeが見つからない

**原因**: 
- worktreeが削除された
- start-all.shのパス設定が古い

**対処**:
```bash
# worktreeの一覧を確認
git worktree list

# 新しいworktreeを作成（必要に応じて）
git worktree add <path> <branch-name>

# start-all.shのパスを更新
# WORKTREES配列のパスを確認・修正
```

---

## 📊 チェックフローの所要時間目安

| チェック項目 | 所要時間 | 重要性 |
|------------|---------|--------|
| ディレクトリ確認 | 1秒 | 低 |
| 依存関係確認 | 2-3秒 | **高** |
| ポート確認 | 1-2秒 | 中 |
| package.json確認 | 1秒 | 低 |
| TypeScript確認 | 3-5秒 | 中 |
| テスト環境確認 | 1-2秒 | 低 |
| Tailwind設定確認 | 1秒 | 低 |
| 複数ポート確認 | 2-3秒 | 中 |
| Git Worktree確認 | 1秒 | 低（複数ブランチ開発時は高） |
| ログ・PIDファイル確認 | 1秒 | 低 |
| 環境変数確認 | 1秒 | 低 |
| ビルド設定確認 | 1秒 | 低 |
| **合計（標準）** | **14-20秒** | - |
| **合計（複数ブランチ時）** | **16-22秒** | - |

**事前確認なしの場合**: 作業中にエラー発見→対処で **30秒〜数分** ロス  
**事前確認ありの場合**: **14-22秒**で問題を早期発見・対処可能

**時間短縮効果**: **約90-95%削減** 🎉

---

## ✅ クイックチェック（コピペ用）

### 標準プロジェクト用（シングルブランチ）

```bash
# 最小限の確認（約3秒）
ls node_modules/.bin/next >/dev/null 2>&1 && \
  lsof -i :${PORT:-3000} | grep LISTEN >/dev/null || \
  echo "✅ 準備完了！"
```

### 複数ブランチ開発用

```bash
# 複数ブランチ開発前の確認（約5秒）
{
  ls node_modules/.bin/next >/dev/null 2>&1 && echo "✅ Next.js" || echo "❌ Next.js未インストール"
  for port in 3001 3002 3003 3004; do
    lsof -i :$port | grep LISTEN >/dev/null && echo "⚠️ ポート$port使用中" || echo "✅ ポート$port空き"
  done
  ls start-all.sh stop-all.sh >/dev/null 2>&1 && echo "✅ 起動スクリプトあり" || echo "⚠️ 起動スクリプトなし"
} && echo "✅ 準備完了！"
```

---

## 📝 作業ログテンプレート

作業開始時に以下を記録:

```markdown
## 作業開始: YYYY-MM-DD HH:MM

### 事前確認結果
- [ ] 依存関係確認: ✅ / ❌
- [ ] ポート確認: ✅ / ❌  
- [ ] package.json確認: ✅ / ❌
- [ ] TypeScript確認: ✅ / ❌
- [ ] テスト環境確認: ✅ / ❌
- [ ] Tailwind設定確認: ✅ / ❌
- [ ] 複数ポート確認: ✅ / ❌（複数ブランチ開発時のみ）
- [ ] Git Worktree確認: ✅ / ❌（複数ブランチ開発時のみ）

### 発見した問題
- 

### 対処内容
- 

### 作業時間
- 開始: 
- 終了: 
- 所要: 
```

---

## 🔗 関連ドキュメント

- [Next.js公式ドキュメント - Getting Started](https://nextjs.org/docs)
- [npm公式ドキュメント](https://docs.npmjs.com/)
- [プロジェクトのREADME](../README.md)

---

**最終更新**: 2025-01-XX  
**作成目的**: プロジェクト作業前の効率的な確認フロー確立による時間短縮

