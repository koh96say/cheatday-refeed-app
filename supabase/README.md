# Supabase設定

Supabaseプロジェクトの設定ファイルとマイグレーションを管理します。

## 📁 ディレクトリ構成

```
supabase/
├── migrations/           # データベースマイグレーション
│   └── YYYYMMDDHHMMSS_<name>.sql
├── functions/            # Edge Functions
│   ├── calc_rrs/         # RRS計算関数
│   ├── nightly_forecast/  # 通知生成関数
│   └── export_zip/       # エクスポート関数
└── config.toml          # Supabase設定ファイル（オプション）
```

## 🚀 使用方法

### マイグレーションの実行

```bash
# Supabase CLIでマイグレーション実行
supabase db push

# または、Supabaseダッシュボードから実行
```

### Edge Functionsのデプロイ

```bash
# 各関数をデプロイ
supabase functions deploy calc_rrs
supabase functions deploy nightly_forecast
supabase functions deploy export_zip
```

## 📋 マイグレーション命名規則

- 形式: `YYYYMMDDHHMMSS_<名前>.sql`
- 例: `20250101120000_create_users_table.sql`

## 📚 関連ドキュメント

- [仕様書](../refeed_service_spec_v3.md) - データベーススキーマの詳細
- [Supabase公式ドキュメント](https://supabase.com/docs)





