# MVP 実装チェックリスト

このドキュメントは 2025-11-08 時点の MVP 機能一覧とテスト状況をまとめたチェックリストです。仕様参照元: `refeed_service_spec_v3.md`

## 1. アプリ機能チェックリスト

| No. | 区分 | 項目 | 実装状況 | 備考 |
|-----|------|------|----------|------|
| 1 | 認証 | メール OTP ログイン (`/auth/login`, `/auth/callback`) | ✅ | Supabase Auth + magic link |
| 2 | 認証 | 認証済みルート保護 (`middleware.ts`) | ✅ | 未ログイン時 `/auth/login` にリダイレクト |
| 3 | 認証 | ログアウト (`/auth/logout`) | ✅ | セッション破棄・リダイレクト |
| 4 | ダッシュボード | RRS/MAS ステータスカード表示 (`/dashboard`) | ✅ | 最新値＋ガードレール表示 |
| 5 | ダッシュボード | 直近メトリクス一覧テーブル | ✅ | 直近7日で未入力時は警告文表示 |
| 6 | ダッシュボード | リフィード提案セクション | ✅ | 推奨条件未達/ガード発動時の文言を含む |
| 7 | ダッシュボード | クイックアクションリンク | ✅ | Metrics / Trends / Recommendations / Profile |
| 8 | メトリクス入力 | 日次フォーム (`/dashboard/metrics`) | ✅ | 必須: 体重/RHR/体温, 任意: HRV/睡眠/疲労/TSS/摂取/消費 |
| 9 | メトリクス入力 | API 保存 + スコア計算 (`/api/metrics`) | ✅ | MAS/RRS 計算・推奨 upsert・ガードレール |
| 10 | トレンド | 平均比較カード (`/dashboard/trends`) | ✅ | 直近2週 vs 前週差分 |
| 11 | トレンド | スコア履歴テーブル | ✅ | RRS/MAS/停滞フラグ |
| 12 | トレンド | メトリクスタイムライン | ✅ | 最新21件表示 |
| 13 | 提案履歴 | リフィード提案一覧 (`/dashboard/recommendations`) | ✅ | 日付別 PFC / kcal / 期間 |
| 14 | プロフィール | プロフィール編集 (`/dashboard/profile`) | ✅ | 性別・生年・身長・目標体重・TZ |
| 15 | プロフィール | 活動レベル・推定 TDEE 調整 | ✅ | 自動計算ボタンあり |
| 16 | 計算ロジック | MAS/RRS 算出 (`src/lib/calculations/rrs.ts`) | ✅ | 停滞判定・赤字連続日数・TSS補正 |
| 17 | 計算ロジック | リフィードターゲット算出 | ✅ | TDEE +20% 基準、炭水化物 80% 等 |
| 18 | DB | `metrics_daily` 摂取/消費カロリー列追加 | ✅ | `20251108000000_add_calorie_intake_to_metrics.sql` |
| 19 | テスト | Vitest 設定 `vitest.config.ts` | ✅ | `jsdom` 環境 |
| 20 | テスト | 計算ロジック単体テスト `tests/calculateScores.test.ts` | ✅ | 3 ケース（停滞判定含む） |

## 2. テスト状況

| テスト種別 | 対象 | 実施内容 | 結果 | 備考 |
|------------|------|----------|------|------|
| 単体テスト | 計算ロジック | `npm test` (Vitest) | ✅ PASS | `calculateScores`, `computeRefeedTargets` |
| Lint | ESLint | `npm run lint` | ✅ PASS | 設定: `next/core-web-vitals` |
| 手動テスト | 認証 | Magic link でログイン→`/dashboard` 遷移 | ✅ PASS | 2025-11-09 手動確認 |
| 手動テスト | ダッシュボード | RRS/MAS・ガードレール表示検証 | ✅ PASS | RRS=1.0, MAS=2.0 でリフィード推奨表示 |
| 手動テスト | メトリクス入力 | `/api/metrics` 経由で保存→再計算 | ✅ PASS | 手入力/スクリプト併用で極端値を投入 |
| 手動テスト | トレンド・提案・プロフィール | 画面遷移・表示確認 | ✅ PASS | 提案履歴に 2025/11/09 の推奨が表示 |

> ✅ 2025-11-09: RRS 0.997 のリフィード推奨シナリオを再現し、ダッシュボード／提案履歴のUIを確認済み。

## 3. 今後の ToDo

- [x] 認証後のブラウザ遷移ループ確認（magic link → dashboard → metrics 遷移を手動検証）
- [x] `/dashboard/metrics` 入力フローの E2E テスト（ブラウザ操作で保存成功・ダッシュボード反映を確認）
- [x] トレンド／提案履歴／プロフィール画面の表示確認（最新データ反映と空状態メッセージ）
- [x] ガードレール発動時の抑止ロジックをユニットテストで検証（発熱・体重増加ケース）

---

更新担当: ChatGPT-5 Codex  
最終更新: 2025-11-09

