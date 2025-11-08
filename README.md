# チートデイ（リフィード）判定Webサービス

継続的なダイエットや減量を行うユーザーの代謝停滞を、安静時心拍数（RHR）・起床時体温・体重・睡眠などの生理/行動指標から検出し、最適なタイミングでリフィード（チートデイ）を提案するWebサービス。

## 📋 サービス概要

ホメオスタシスによる代謝低下（メタボリックアダプテーション）を検知し、最適な時期・量のリフィードを自動提案して停滞を打破することを目的としています。

主観ではなく**客観データ**に基づいた「入れるべき日」の判断と、実施後の**効果検証**（体温・RHR・HRV・体重トレンドの回復度）を提供します。

## 🎯 主な機能

- **データ入力**: 体重、安静時心拍数（RHR）、起床時体温、睡眠、HRVなどの日次データ入力
- **デバイス連携**: Apple Health / Google Fit / Oura / Withings / Garmin 等との自動連携
- **リフィード判定**: 代謝適応スコア（MAS）とリフィード準備スコア（RRS）による自動判定
- **ダッシュボード**: 今日のRRS、停滞インジケータ、トレンドグラフ
- **通知**: リフィード適日のアラート通知
- **週次レポート**: 回復度・停滞短縮・減量率の分析

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **認証**: Supabase Auth (メールOTP/Google/Apple)
- **データベース**: PostgreSQL (行レベルセキュリティ/RLS)
- **デプロイ**: Vercel (推奨)

## 📁 プロジェクト構造

```
repo/
├─ src/                      # 実装
│  ├─ app/                   # Next.js App Router
│  ├─ components/            # Reactコンポーネント
│  ├─ lib/                    # ユーティリティ・ヘルパー
│  └─ types/                  # TypeScript型定義
├─ tests/                     # テスト
├─ docs/                      # 仕様・設計・ADR・運用メモ
│  ├─ adr/                    # Architecture Decision Record
│  └─ journal/                # 開発日誌
├─ data/                      # サンプルデータ・スキーマ
│  └─ schema/                 # SQL DDL / JSON Schema
├─ supabase/                  # Supabase設定
│  ├─ migrations/             # データベースマイグレーション
│  └─ functions/              # Edge Functions
├─ CHANGELOG.md               # 変更履歴
├─ README.md                  # このファイル
├─ CONTRIBUTING.md            # 開発ガイドライン
└─ refeed_service_spec_v3.md # 仕様書（最新版）
```

## 🚀 セットアップ

### 前提条件

- Node.js 18.17以上
- npm または yarn
- Supabaseアカウント

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集してSupabaseの認証情報を設定

# 開発サーバー起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 📚 ドキュメント

- [仕様書](./refeed_service_spec_v3.md) - サービスの詳細仕様
- [開発ガイドライン](./CONTRIBUTING.md) - 開発への参加方法
- [開発ルール](./.cursor/rules/development_rules.md) - 開発前ルール集
- [ADR一覧](./docs/adr/) - アーキテクチャ決定記録

## 🔐 環境変数

必要な環境変数は `.env.example` を参照してください。

主な環境変数：
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseサービスロールキー（サーバーサイドのみ）

## 📝 開発ルール

このプロジェクトは以下のルールに従って開発されます：

1. **Issue駆動開発**: 作業前に必ずIssueを1つ作成
2. **Conventional Commits**: コミットメッセージは形式に従う
3. **ADR**: 重要な技術決定はADRとして記録
4. **CHANGELOG**: 変更後はCHANGELOGを更新

詳細は [開発ルール](./.cursor/rules/development_rules.md) を参照してください。

## 🧪 テスト

```bash
# テスト実行
npm run test

# テストカバレッジ
npm run test:coverage
```

## 📦 ビルド

```bash
# プロダクションビルド
npm run build

# 本番サーバー起動
npm start
```

## 🤝 貢献

プロジェクトへの貢献を歓迎します。詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## 📄 ライセンス

このプロジェクトは [LICENSE](./LICENSE) に基づいてライセンスされています。

## 🔗 関連リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [仕様書](./refeed_service_spec_v3.md)

---

**最終更新**: 2025-01-XX  
**プロジェクト名**: チートデイ発見アプリ
