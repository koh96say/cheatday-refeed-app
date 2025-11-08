# Architecture Decision Record (ADR) ガイド

このディレクトリには、プロジェクトの重要な技術決定を記録するADR（Architecture Decision Record）を配置します。

## ADRとは

ADRは、プロジェクトで行った重要な技術決定とその理由を記録するドキュメントです。後から「なぜこの選択をしたのか」を理解できるようにするために作成します。

## いつADRを書くべきか

以下のような重要な決定を行う際にADRを書くことを推奨します：

- **フレームワーク・ライブラリの選択**（例: Next.js vs React + Vite）
- **アーキテクチャパターンの選択**（例: クライアントサイド計算 vs サーバーサイド計算）
- **データベースの選択**（例: PostgreSQL vs MongoDB）
- **デプロイプラットフォームの選択**（例: Vercel vs AWS）
- **計算式・アルゴリズムの選択**（例: BMR計算式の選択）
- **セキュリティ方針の決定**（例: 認証方式の選択）
- **UI/UX設計の重大な決定**

## ADRの書き方

### ファイル命名規則

```
docs/adr/NNN-<短いタイトル>.md
```

- `NNN`: 3桁の連番（001, 002, 003...）
- `<短いタイトル>`: 決定内容を簡潔に表すタイトル（kebab-case）

例:
- `001-nextjs-framework-choice.md`
- `002-client-side-calculation.md`
- `003-database-selection.md`

### ADRテンプレート

`template.md` をコピーして新しいADRを作成してください。

### ADRの構造

各ADRには以下の項目を含めます：

1. **Status**: 決定の状態（Accepted, Proposed, Deprecated, Superseded）
2. **Date**: 決定日
3. **Context**: 決定に至った背景・状況
4. **Decision**: 決定内容
5. **Consequences**: 決定による影響（メリット・デメリット）
6. **Alternatives Considered**（オプション）: 検討した他の選択肢

## Statusの説明

- **Accepted**: 決定が採用された（最も一般的）
- **Proposed**: 提案中（まだ決定されていない）
- **Deprecated**: 廃止された決定（別の決定に置き換えられた）
- **Superseded**: 別のADRに置き換えられた

## 良いADRの例

### ✅ 良い例

- 背景が明確に書かれている
- 決定理由が具体的
- メリット・デメリットが両方記載されている
- 検討した他の選択肢が記載されている

### ❌ 悪い例

- 決定内容だけが書かれている（理由がない）
- 背景が不明確
- メリット・デメリットの片方しか書かれていない

## 参照

- [ADRテンプレート](./template.md)
- [ADRフォーマットの詳細](https://adr.github.io/)

