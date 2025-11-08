# チートデイ（リフィード）判定Webサービス 仕様書（最新版・Supabase対応）

## 1. サービス概要
継続的なダイエットや減量を行うユーザーの代謝停滞を、安静時心拍数（RHR）・起床時体温・体重・睡眠などの生理/行動指標から検出し、最適なタイミングでリフィード（チートデイ）を提案するWebサービス。

---

## 2. 目的・価値提供
- **目的**：ホメオスタシスによる代謝低下（メタボリックアダプテーション）を検知し、最適な時期・量のリフィードを自動提案して停滞を打破。
- **価値**：主観ではなく**客観データ**に基づいた「入れるべき日」の判断と、実施後の**効果検証**（体温・RHR・HRV・体重トレンドの回復度）。

---

## 3. 想定ユーザー
| 区分 | 特徴 |
|---|---|
| 一般ダイエッター | 運動＋食事管理を継続。停滞期のモチベ低下を防ぎたい |
| アスリート/ボディビルダー | 計画的リフィードを客観指標で最適化したい |
| ウェアラブル利用者 | Apple Watch/Oura/Fitbit/Withings/Garmin 等を日常使用 |

---

## 4. データ入力項目
| 種別 | 指標 | 取得方法 |
|---|---|---|
| 必須 | 体重、安静時心拍数（RHR）、起床時体温 | 手入力 or デバイス連携 |
| 推奨 | 睡眠時間・効率、HRV、主観疲労（1–5）、運動量（消費kcal/歩数/TSS） | 自動連携 or 手入力 |
| メタ | 性別、年齢、身長、目標体重、現在のPFC、サプリ/薬、月経情報 | 初期設定 |

---

## 5. 判定アルゴリズム
### 5.1 ベースライン算出
- 直近28日の窓で指数移動平均（EMA）＋外れ値（±3σ）除外。

### 5.2 Zスコア化
`z_metric(t) = (metric(t) - baseline_mean) / baseline_sd`

### 5.3 停滞判定（Plateau）
- 体重の**7日移動回帰の傾き** ≧ -0.02%/日
- 週平均 vs 週平均の体重減少率 < -0.5%（≒週 -0.5%未満）

### 5.4 代謝適応スコア（MAS）
`MAS = 0.35*(-z_temp) + 0.25*(z_RHR) + 0.15*(-z_HRV) + 0.15*(-z_sleep) + 0.10*(z_fatigue)`  
（体温↓、RHR↑、HRV↓、睡眠↓、疲労↑ → 適応進行）

### 5.5 リフィード準備スコア（RRS）
`RRS = sigmoid( a*MAS + b*plateau_flag + c*deficit_streak + d*training_load )`  

**係数定義（初期値、実データで調整）**:
- `a = 1.2` (MASの重み)
- `b = 0.8` (plateau_flagの重み)
- `c = 0.5` (deficit_streakの重み)
- `d = 0.3` (training_loadの重み)

**sigmoid関数**:
- `sigmoid(x) = 1 / (1 + exp(-k*(x - x0)))`
- `k = 2.0` (勾配係数)
- `x0 = 0.5` (中央値)

**変数定義**:
- `deficit_streak`: 連続カロリー不足日数（推定TDEE - 実際摂取 > 300kcal）
- `training_load`: 週間トレーニング負荷（TSSまたは消費カロリーベース）

**判定閾値**:
- RRS ≥ 0.65 → **リフィード推奨**
- 0.50–0.65 → **注意喚起**（監視）

### 5.6 抑止条件（ガードレール）
- 発熱/感染兆候（体温+0.5℃、自覚症状）
- 急な体重増（>+1.5%/3日）
- 簡易SCOFF陽性（摂食障害リスク）
- 月経黄体期のむくみ補正（女性ユーザー）

---

## 6. 提案内容（量・期間）
| 項目 | 推奨値 |
|---|---|
| 期間 | 1日（状況により最大2日） |
| カロリー | 推定TDEE +15〜30% |
| 炭水化物 | 全追加エネルギーの70〜85%を配分 |
| 脂質 | 増やし過ぎない |
| たんぱく質 | 体重×1.6〜2.2g/日を継続 |

**例**：TDEE=2,200kcal → 2,530〜2,860kcal（炭水化物 400〜520g 目安）

> 注意：既往症（糖尿病、甲状腺疾患等）や服薬中は医療者の指示を優先。本サービスは医療行為ではなく自己管理支援。

---

## 7. 体験設計（UX）
1. 初回セットアップ：目標・プロフィール・同意
2. 連携：Apple Health / Google Fit / Oura / Withings / Garmin 等
3. 毎朝チェックイン：体重・RHR・体温・主観疲労
4. ダッシュボード：**今日のRRS**、停滞インジケータ、トレンド
5. アラート：**「明日リフィード適日」**通知＋提案PFC
6. 実行ログ：実施/遵守率、翌日以降の変化
7. 週次レポート：回復度・停滞短縮・減量率

---

## 8. 画面モジュール
- **Home**：RRSカード、今日の推奨、警告フラグ
- **Trends**：体重/RHR/体温/HRV/睡眠の多軸グラフ
- **Plan**：通常日PFC・リフィード日PFC・食品プリセット
- **Calendar**：実施履歴・次回予測日
- **Safety**：体調チェック、SCOFF、医療窓口導線
- **Settings**：連携・通知・月経トラッキング・閾値調整

---

## 9. 通知設計（Asia/Tokyo）
### 9.1 通知タイミング
| タイミング | 内容 |
|---|---|
| 前日21:00 | 「明日はリフィード候補。炭水化物+25%を推奨」 |
| 当日07:30 | 起床データ反映後に確定判定 |
| 翌朝08:00 | 実施評価アンケ＋自動チェック開始 |

### 9.2 通知チャネル
- **Push通知（必須）**: ブラウザ/モバイルアプリ向け。リアルタイム配信。
- **Email通知（オプション）**: 週次レポート、重要アラート（リフィード推奨、体調異常）。
- **SMS通知（将来対応）**: 重要アラートのみ（発熱検知、SCOFF陽性など）。

### 9.3 通知設定
- ユーザーごとに通知タイプをオン/オフ可能
- 通知時間帯の設定（例: 8:00-22:00のみ）
- 通知頻度の調整（即時/まとめて/オフ）

### 9.4 通知配信失敗時の処理
- 最大3回リトライ（指数バックオフ: 1分、5分、30分）
- 3回失敗後はエラーログに記録、管理者に通知
- ユーザー設定でEmail通知にフォールバック可能

---

## 10. データモデル（ER 概要）
```sql
-- 代表テーブル（アプリ共通）
users(id, gender, birth_year, height_cm, goal_weight, timezone, auth_uid)
metrics_daily(id, user_id, date, weight_kg, rhr_bpm, temp_c, hrv_ms, sleep_min, fatigue_1_5, training_load, notes)
scores(user_id, date, plateau_flag, mas, rrs)
recommendations(id, user_id, date, kcal_total, carb_g, protein_g, fat_g, duration_days, rationale_json)
events(id, user_id, ts, type, payload_json)
menstrual_logs(id, user_id, date, phase)
```
代表インデックス：`metrics_daily (user_id, date)` ユニーク、`scores (user_id, date)`。

---

## 11. API 設計（初版 REST）
### 11.1 コアAPI
| メソッド | エンドポイント | 機能 |
|---|---|---|
| GET | `/v1/me/dashboard?date=` | 今日のRRS/推奨/警告 |
| POST | `/v1/metrics/daily` | 日次データ登録 |
| GET | `/v1/trends?metric=weight|rhr|temp&range=28d` | トレンド取得 |
| POST | `/v1/recommendations/accept` | 提案の採用記録 |
| POST | `/v1/flags/suppress` | 発熱・SCOFF陽性等の抑止 |
| GET | `/v1/weekly-report?week=YYYY-WW` | 週次レポート |

### 11.2 デバイス連携API
| メソッド | エンドポイント | 機能 |
|---|---|---|
| POST | `/v1/devices/connect` | デバイス連携開始（OAuth認証） |
| GET | `/v1/devices` | 連携済みデバイス一覧 |
| POST | `/v1/devices/sync` | 手動同期トリガー |
| DELETE | `/v1/devices/{device_id}` | デバイス連携解除 |

### 11.3 通知管理API
| メソッド | エンドポイント | 機能 |
|---|---|---|
| GET | `/v1/notifications/preferences` | 通知設定取得 |
| POST | `/v1/notifications/preferences` | 通知設定更新 |
| GET | `/v1/notifications/history` | 通知履歴取得 |

### 11.4 プロフィール管理API
| メソッド | エンドポイント | 機能 |
|---|---|---|
| GET | `/v1/me/profile` | プロフィール取得 |
| PUT | `/v1/me/profile` | プロフィール更新 |
| POST | `/v1/profile/tdee` | TDEE手動設定 |

### 11.5 エラーハンドリング
- **HTTPステータスコード**:
  - `200 OK`: 成功
  - `400 Bad Request`: リクエストエラー（バリデーション失敗）
  - `401 Unauthorized`: 認証失敗
  - `403 Forbidden`: 権限不足
  - `404 Not Found`: リソース不存在
  - `429 Too Many Requests`: レート制限超過
  - `500 Internal Server Error`: サーバーエラー

- **エラーレスポンス形式**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {}
  }
}
```

- **レート制限**:
  - 認証済みユーザー: 1000リクエスト/時間
  - 未認証: 100リクエスト/時間
  - 超過時は429エラーと`Retry-After`ヘッダーを返却

---

## 12. バッチ/ジョブ
### 12.1 定期ジョブ
| 処理 | 時刻 |
|---|---|
| Baseline更新 | 04:00 |
| スコア計算 | 06:30 |
| 予告通知生成 | 21:00 |
| データ品質監視 | 1日数回 |

### 12.2 エラーハンドリング
- **ジョブ失敗時のリトライ**: 最大3回、指数バックオフ（1分、5分、30分）
- **アラート**: Slack/Email通知（連続失敗3回以上、または日次失敗率>5%）
- **ログ記録**: 全てのジョブ実行結果を`audit_logs`テーブルに記録

### 12.3 データ品質チェック
- **欠測率チェック**: 必須データ（体重/RHR/体温）の欠測率>30%でアラート
- **異常値検知**: ±4σを超える値、デバイス別閾値違反を検知
- **データ整合性**: 日次データの重複、日付の不整合をチェック

### 12.4 タイムゾーン対応
- 全ユーザーのタイムゾーンを考慮したジョブ実行
- ユーザーごとのローカル時刻での通知配信
- UTC保存・ローカル表示の原則を維持
- ジョブスケジューラーは`pg_cron`のタイムゾーン設定を利用

---

## 13. 擬似コード
```
for each user, each day D:
  X = load metrics[D-28..D]
  baseline, sd = ema_28(X), sd_28(X)
  z = (today - baseline) / sd
  plateau = (slope_7d >= -0.02%/d) && (weekly_drop < 0.5%)

  MAS = 0.35*(-z_temp) + 0.25*(z_rhr) + 0.15*(-z_hrv) + 0.15*(-z_sleep) + 0.10*(z_fatigue)
  RRS = sigmoid(a*MAS + b*plateau + c*deficit_streak + d*training_load)

  if fever_like or acute_gain or scoff_pos: suppress
  if not suppress and RRS>=0.65: recommend (TDEE +15..30%, carbs 70..85%)
```

---

## 14. セキュリティ・プライバシー（共通）
- **PII分離/最小化**、暗号化（At-rest: AES-256/KMS、In-transit: TLS1.2+）
- **RBAC**：`admin`, `ops_readonly`, `support_limited`, `user`。最小権限原則。
- **監査ログ**：管理操作・エクスポート・削除要求は不可改ログへ。
- **データ権利**：エクスポート `/v1/me/export`、削除 `/v1/me/delete`（30日保留→物理削除）。
- **保持**：既定3年（短縮可）。バックアップはPITR＋別リージョン複製。

---

## 15. サンプル通知文
- 「明日、炭水化物を少し増やしましょう。体温と代謝をリセットする日です。」
- 「今日はリフィード適日。脂質を控え、炭水化物中心で。」
- 「昨日のリフィードお疲れさま！体温と体重の変化を自動チェックします。」

---

## 16. 入口ページ（LP/Onboarding）仕様
### 16.1 目的
初訪問の30秒で価値理解→登録/連携まで導線最短化。

### 16.2 セクション
1. **Hero**：キャッチ（例：停滞を“科学的に”破る）＋CTA（無料で試す）  
2. **How it works（3ステップ）**：①連携 ②検知 ③提案  
3. **Science**：体温/RHR/HRVと代謝の関係を図解＋免責（医療行為ではない）  
4. **機能一覧**：RRS、アラート、PFC提案、カレンダー、週次レポート  
5. **安全性/プライバシー**：保存データ・暗号化・同意撤回・エクスポート/削除  
6. **デモ**：画面スクショ/短尺動画  
7. **料金**：無料枠/有料プラン/返金ポリシー  
8. **FAQ**：データ扱い、頻度、月経期の扱い 等  
9. **再CTA**：フッター直前に設置

### 16.3 Onboarding フロー
登録→同意→目標設定→データ連携→過去データ取り込み→初回ダッシュボード。

---

## 17. データ保存・管理（運用）
### 17.1 分類
- **機微PII**：氏名・メール・認証ID
- **生体メトリクス**：体重/RHR/体温/HRV/睡眠 等
- **同意/設定**：同意バージョン、スコープ、通知、TZ

### 17.2 ストレージ
- **PII分離**（`users_pii` vs 業務データ）
- **DB**：PostgreSQL（行レベルセキュリティ/RLS）。大規模は月次パーティション。
- **オブジェクト**：エクスポート原本/監査ログはWORM相当（バージョン管理＋retention）。
- **暗号化**：At-rest/In-transit

### 17.3 アクセス制御/監査
- RBAC＋最小権限、サービスキーの利用制限、全操作を監査ログへ。

### 17.4 ライフサイクル
取得（最小化）→保持（3年/変更可）→エクスポート→削除（30日保留）→物理削除。  
バックアップ：PITR、RPO≤15分、RTO≤4時間目標。

### 17.5 品質
欠測/異常値検知（±4σ、デバイス別閾値）、UTC保存・ローカル表示（Asia/Tokyo）。

### 17.6 同意
スコープをUIで明示。撤回＝トークン即無効化。既取得分は“保持/削除”を選択可能。

---

## 18. 法的・倫理的配慮（要約）
- 医療行為ではなく**自己管理支援**。診断/治療の代替ではない明記。
- 摂食障害兆候がある場合は**専門機関導線**を常設。
- 未成年は保護者同意必須。国外移転が生じる場合は明示し選択可。

---

## 19. Supabase 採用時アーキテクチャ
### 19.1 採用理由
- PostgreSQL + **RLS** によるデータ分離、Auth/Storage/Functions の一体運用、Realtimeで即時UI反映。

### 19.2 構成
- **Auth**：Supabase Auth（メールOTP/Google/Apple）。`auth.uid()` を `users.auth_uid` に紐付け。
- **DB**：`public` に業務テーブル、`pii` に機微情報。
- **RLS**：`user_id = (select id from users where auth_uid = auth.uid())` で自分の行のみ許可。
- **Storage**：`exports/` バケット（エクスポートZip）。署名付きURLで限定DL。
- **Edge Functions**：`calc_rrs`, `nightly_forecast`, `export_zip`。
- **pg_cron**：04:00/06:30/21:00 の定期計算・通知生成。
- **Secrets**：外部APIキー・通知キーを管理。

### 19.3 DDL（抜粋）
```sql
create schema if not exists pii;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid not null unique,
  gender text check (gender in ('male','female','other')),
  birth_year int,
  height_cm numeric(5,2),
  goal_weight numeric(5,2),
  timezone text default 'Asia/Tokyo',
  created_at timestamptz default now()
);

create table pii.users_pii (
  user_id uuid primary key references public.users (id) on delete cascade,
  email text unique not null,
  name text
);

create table public.metrics_daily (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  weight_kg numeric(5,2),
  rhr_bpm numeric(5,2),
  temp_c numeric(4,2),
  hrv_ms numeric(6,2),
  sleep_min int,
  fatigue_1_5 int,
  training_load int,
  notes text,
  unique(user_id, date)
);

create table public.scores (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  plateau_flag boolean,
  mas numeric(6,3),
  rrs numeric(6,3),
  primary key (user_id, date)
);

create table public.recommendations (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  kcal_total int,
  carb_g int,
  protein_g int,
  fat_g int,
  duration_days int default 1,
  rationale_json jsonb
);

create table public.consents (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  version text not null,
  scopes text[],
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.audit_logs (
  id bigserial primary key,
  user_id uuid,
  actor text not null,
  action text not null,
  resource text,
  at timestamptz default now(),
  details jsonb
);
```

### 19.4 RLS（代表）
```sql
alter table public.users enable row level security;
alter table public.metrics_daily enable row level security;
alter table public.scores enable row level security;
alter table public.recommendations enable row level security;

create policy users_is_owner on public.users
  for select using (auth.uid() = auth_uid)
  with check (auth.uid() = auth_uid);

create policy metrics_is_owner on public.metrics_daily
  for all using (user_id in (select id from public.users where auth_uid = auth.uid()))
  with check (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy scores_is_owner on public.scores
  for select using (user_id in (select id from public.users where auth_uid = auth.uid()));

create policy recs_is_owner on public.recommendations
  for all using (user_id in (select id from public.users where auth_uid = auth.uid()))
  with check (user_id in (select id from public.users where auth_uid = auth.uid()));
```

### 19.5 Edge Function（擬似コード）
```ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // 1) 直近データ取得 → 2) baseline/z 計算 → 3) MAS/RRS算出
  // 4) scores/recommendations を upsert → 5) 通知キューへ
  return new Response("ok");
});
```

### 19.6 スケジューリング/運用
- `pg_cron` で 04:00/06:30/21:00 の定期実行
- 処理が重い場合は Edge Functions + Scheduler で分散
- 監視：エラーレート、レイテンシ、異常アクセス、データ欠損率

### 19.7 コスト/リージョン
- 初期は低プランで十分。ストレージ/接続数/ログが主なスケール要因。
- 日本ユーザー向けに**近傍リージョン**選択を推奨。

---

## 20. 追加タスク（実装チェックリスト）
- [ ] DDL 適用 & RLS ポリシー設定
- [ ] Auth（メールOTP/Google/Apple）設定
- [ ] Edge Functions：`calc_rrs`, `nightly_forecast`, `export_zip`
- [ ] `pg_cron`：ジョブ登録
- [ ] Storage：`exports` バケット＋署名URLポリシー
- [ ] Secrets：外部APIキー登録
- [ ] 監査ログダッシュボード

---

## 21. モニタリング・オブザーバビリティ

### 21.1 ログ集計システム
- **ツール**: CloudWatch Logs / DataDog / Sentry
- **集計対象**:
  - アプリケーションログ（Edge Functions、API）
  - エラーログ（例外、スタックトレース）
  - アクセスログ（API呼び出し、認証）
  - バッチジョブログ（実行結果、エラー）

- **ログレベル**: DEBUG, INFO, WARN, ERROR, FATAL
- **保持期間**: 30日（エラーは90日）

### 21.2 メトリクスダッシュボード
- **主要メトリクス**:
  - **RRS分布**: ユーザーごとのRRS値の分布（ヒストグラム）
  - **通知配信率**: 送信成功/失敗率、チャネル別配信数
  - **エラー率**: APIエラー率、ジョブ失敗率
  - **レイテンシ**: API応答時間（p50, p95, p99）、ジョブ実行時間
  - **アクティブユーザー数**: DAU/MAU、データ入力率
  - **データ品質**: 欠測率、異常値検知数

- **ダッシュボードツール**: Grafana / DataDog Dashboard / CloudWatch Dashboard
- **更新頻度**: リアルタイム（1分間隔）

### 21.3 アラート設定
| メトリクス | 閾値 | アクション |
|---|---|---|
| **エラー率** | >5% (5分平均) | Slack/Email通知、PagerDuty（本番） |
| **APIレイテンシ** | p95 > 2秒 | Slack通知 |
| **ジョブ失敗率** | 日次失敗率>5% | Slack/Email通知 |
| **データ欠損率** | 必須データ欠測率>30% | Slack通知 |
| **通知配信失敗** | 連続失敗3回以上 | Slack通知 |
| **データベース接続** | 接続数>80% | Slack通知 |
| **ストレージ使用率** | >85% | Email通知 |

### 21.4 トレーシング
- **分散トレーシング**: OpenTelemetry / DataDog APM
- **トレース対象**: APIリクエスト、Edge Functions、データベースクエリ
- **パフォーマンスボトルネックの特定**: 遅いクエリ、外部API呼び出し

### 21.5 リアルタイム監視
- **ヘルスチェック**: `/health` エンドポイント（1分間隔）
- **ステータスページ**: サービス稼働状況の公開（StatusPage.io等）
- **SLA目標**: 可用性99.9%、API応答時間p95 < 1秒

---

## 22. ドキュメント化

### 22.1 API仕様書
- **形式**: OpenAPI 3.0 (Swagger)
- **内容**:
  - エンドポイント一覧（リクエスト/レスポンス形式）
  - 認証方式（Bearer Token、OAuth 2.0）
  - エラーレスポンス形式
  - サンプルリクエスト/レスポンス
  - レート制限情報

- **公開方法**: 
  - 開発者向け: `/docs` エンドポイント（Swagger UI）
  - 内部向け: Gitリポジトリ内の`docs/api/`ディレクトリ

### 22.2 アルゴリズムのパラメータ調整ガイド
- **対象パラメータ**:
  - MAS計算式の重み係数（5.4章）
  - RRS計算式の係数（5.5章）
  - 停滞判定の閾値（5.3章）
  - sigmoid関数のパラメータ（k, x0）

- **調整方法**:
  - A/Bテストによる効果検証
  - ユーザーフィードバック収集
  - 統計的検証（t検定、効果量）

- **ドキュメント内容**:
  - パラメータの意味と影響範囲
  - 調整時の注意点
  - 検証プロセス（データ収集→分析→実装→評価）

### 22.3 デバイス連携マニュアル
- **対応デバイス**:
  - Apple Health (HealthKit)
  - Google Fit
  - Oura Ring
  - Withings
  - Garmin Connect
  - Fitbit

- **各デバイスの連携手順**:
  - OAuth認証フロー
  - 取得可能なデータ項目
  - 同期頻度とタイミング
  - トラブルシューティング

- **開発者向け**:
  - API連携仕様
  - Webhook設定
  - データ形式とマッピング

### 22.4 運用マニュアル
- **デプロイ手順**: ステージング→本番のデプロイフロー
- **障害対応**: インシデント対応手順、エスカレーション
- **バックアップ/復旧**: データバックアップ取得と復旧手順
- **監視運用**: アラート対応、ログ確認方法

### 22.5 ユーザー向けドキュメント
- **ヘルプセンター**: FAQ、操作方法ガイド
- **チュートリアル**: 初回セットアップ、データ入力方法
- **用語集**: RRS、MAS、TDEE等の専門用語解説

---

## 23. ユーザビリティ強化

### 23.1 オンボーディングの段階的ガイダンス
- **ステップ1: アカウント作成**
  - メール認証またはSNS認証
  - 利用規約・プライバシーポリシーの同意

- **ステップ2: プロフィール設定**
  - 性別、年齢、身長、目標体重
  - 現在のPFC設定（任意）
  - 活動レベル選択

- **ステップ3: データ連携**
  - デバイス連携の推奨（Apple Health/Google Fit等）
  - 手動入力の説明
  - 過去データの取り込み（過去90日）

- **ステップ4: 初回データ入力**
  - 体重、RHR、体温の入力方法をガイド
  - 理想的な入力タイミングの説明

- **ステップ5: ダッシュボード説明**
  - RRSの見方
  - 通知設定
  - 各画面の説明

- **実装方法**:
  - プログレスバー表示
  - 各ステップでスキップ可能
  - 後から設定画面から再開可能

### 23.2 データ入力の簡易化
- **チャート連携**:
  - Apple Health/Google Fitからの自動同期
  - バックグラウンド同期（1時間ごと）
  - 手動同期ボタン

- **音声入力** (将来対応):
  - 「体重65キロ」「体温36度5分」などの音声認識
  - スマートスピーカー連携（Google Assistant、Alexa）

- **バルク入力**:
  - CSVインポート機能
  - 過去データの一括登録

- **入力支援**:
  - 入力履歴からの選択（前回値、よく使う値）
  - 単位変換（kg↔lb、℃↔℉）
  - 入力候補の表示

### 23.3 多言語対応
- **フェーズ1（初期リリース）**:
  - **日本語**: 完全対応（UI、通知、ドキュメント）
  - **英語**: 部分対応（UIのみ、通知は日本語）

- **フェーズ2（将来的）**:
  - **英語**: 完全対応
  - **中国語（簡体字）**: UI対応
  - **韓国語**: UI対応

- **実装方法**:
  - i18nライブラリ使用（react-i18next等）
  - 翻訳ファイル管理（JSON/YAML）
  - 言語切り替えUI（設定画面）

- **ローカライゼーション項目**:
  - UI文言
  - 通知メッセージ
  - エラーメッセージ
  - 日付・時刻フォーマット
  - 数値フォーマット（小数点、桁区切り）

### 23.4 アクセシビリティ
- **WCAG 2.1 AA準拠**:
  - コントラスト比4.5:1以上
  - キーボード操作対応
  - スクリーンリーダー対応（ARIA属性）

- **対応内容**:
  - フォントサイズ調整機能
  - カラーモード（ライト/ダーク）
  - アニメーション無効化オプション

### 23.5 フィードバック収集
- **インアプリフィードバック**:
  - 評価スコア（1-5点）の収集
  - 自由記述フォーム
  - 機能リクエスト

- **分析**:
  - ユーザー行動分析（Google Analytics、Mixpanel）
  - ヒートマップ（Hotjar等）
  - A/Bテスト（機能改善の検証）
