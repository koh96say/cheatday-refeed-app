# RRS v2（リフィード履歴考慮）— フィードバック反映仕様

最終更新: 2025-11-09 (Asia/Tokyo)

## 1. 目的
フィードバックに基づき、**データ要件**、**欠損時の扱い**、**refeed_response の数式化**、**パラメータ最適化方針**、**スキーマ整合性**、**連続提案の抑制**、**実装/テスト手順**を明確化する。

---

## 2. データ要件と欠損ハンドリング
### 2.1 最小要件（post 期）
- リフィード実施日を D0 とする。
- post 期の観察窓: D+1〜D+3（3日）
- **最小充足条件**: post 期に **2/3 日**以上で「体温 or RHR」のいずれかが取得済み。

### 2.2 欠損補完（順序）
1) 同日内の複数値があれば平均。
2) 欠測日: 前後 1 日以内の値があれば線形補間（最大 1 日まで）。  
3) それでも不足 → 当該日をスキップ（観測数にカウントしない）。

### 2.3 フォールバック戦略
- post 期の観測が **1 日以下** → `refeed_response = null` とし、RRS計算では **0 に置換**。  
- さらに、**クールダウン延長**: `refeed_effect_window += 2` 日（安全側）。

---

## 3. refeed_response の数式化
### 3.1 前処理（Z スコア）
各指標 x∈{体温, RHR} は 28 日窓の平均・分散から Z 化する。  
`z_x(t) = (x(t) - mean_28(x)) / sd_28(x)`

### 3.2 事前・事後の定義
- pre 期: D-2〜D0 の z を平均（`pre_x`）
- post 期: D+1〜D+3 の z を平均（`post_x`）※ 欠測補完後
- 変化量: `Δx = post_x - pre_x`

### 3.3 正規化とクリッピング
- 期待方向: 体温は **上昇**が好ましい、RHR は **低下**が好ましい。
- 変換: `g_temp = clip( Δtemp / S_temp , -2, +2 )`  
         `g_rhr  = clip( -Δrhr / S_rhr , -2, +2 )`  
  - `S_temp = 0.3`（体温 Z の実務的スケール）  
  - `S_rhr  = 0.5`（RHR Z の実務的スケール）

### 3.4 合成（[-1, +1] に射影）
```
raw = w_temp * g_temp + w_rhr * g_rhr
refeed_response = clip( raw / (w_temp + w_rhr) , -1, +1 )
```
初期値: `w_temp=0.6, w_rhr=0.4`（後述の最適化で更新）

> 拡張: HRV が安定取得できる場合は `w_hrv=0.3` を追加し、  
> `g_hrv = clip( Δhrv / S_hrv , -2, +2 )`（S_hrv = 0.5 目安）、
> 重みを `w_temp=0.5, w_rhr=0.3, w_hrv=0.2` へ再配分。

---

## 4. RRS v2 の確定式（連続提案抑制込み）
### 4.1 クールダウン（ハード/ソフト）
- **ハードロック**: `min_gap_days = 2`（実施後 48h は提案不可）
- **ソフト減衰**: `refeed_cooldown = clamp(1 - days_since_refeed / refeed_effect_window, 0, 1)`

### 4.2 しきい値のヒステリシス
- 提案判定は **二重条件**:  
  1) `RRS >= θ_on`（初期 0.68）  
  2) `RRS - RRS_yesterday >= δ`（初期 +0.02）
- 解除条件: `RRS < θ_off`（初期 0.62）

### 4.3 最終式
```
RRS = sigmoid(
  a*MAS +
  b*plateau_flag +
  c*deficit_streak +
  d*training_load -
  k*refeed_cooldown +
  m*refeed_response
)
```
初期値（暫定）: `a=1.0, b=0.7, c=0.3, d=0.2, k=1.2, m=0.8`  
（後述の最適化でデータ駆動に更新）

---

## 5. スキーマ/データフローの整合性
### 5.1 変更点
- `recommendations.executed_at TIMESTAMPTZ` を追加（実施確定時に記録）。
- `scores` に列を追加: `rrs_v2`, `refeed_cooldown`, `refeed_response`（監査・分析用）。
- オプション: `refeed_sessions(id, user_id, started_at, executed_at, window, response)` を導入し、履歴を正規化。

### 5.2 データフロー
1) 実施報告（ユーザー操作 or 自動検知）で `executed_at` 設定。  
2) バッチ/関数で `days_since_refeed` を計算。  
3) D+1〜D+3 が揃えば `refeed_response` を算出。揃わなければ 0 置換＋クールダウン延長。  
4) `RRS` を更新して `scores` に upsert。

---

## 6. パラメータ最適化と検証
### 6.1 初期レンジ（グリッド）
- `k ∈ [0.8, 1.6]`、`m ∈ [0.4, 1.2]`、`θ_on ∈ [0.64, 0.72]`、`θ_off ∈ [0.58, 0.66]`
- `refeed_effect_window ∈ {5,6,7,8,9}`、`min_gap_days ∈ {1,2,3}`

### 6.2 評価指標（オフライン）
- 過提案率（min_gap 無視提案 / 全日）
- 連続提案率（実施後 7 日以内の再提案）
- 想定頻度: エネルギー赤字が継続するユーザーで **7〜14日に1回** を中心に分布
- 反応弁別: `refeed_response > 0` の後で体温/体重トレンドが改善する割合

### 6.3 手順
1) 合成データ（回復/非回復パターン）+ 実測の匿名化サンプルでバックテスト。  
2) 主要指標が目標を満たすパラメータセットを選定。  
3) **Shadow mode**（提案は表示しないが内部算出）で 1〜2 週間の A/A テスト。  
4) フィーチャーフラグで段階リリース。

---

## 7. 連続提案の抑制ユースケース
- ケースA: 実施翌日 RHR が一時反発 → `min_gap_days=2` で提案不可。  
- ケースB: 3日目に RRS が上昇するがまだ高位不安定 → `refeed_cooldown` とヒステリシスで抑制。  
- ケースC: 反応が鈍い個体 → `refeed_response ≈ 0` でも `refeed_cooldown` が効くため連続提案は回避。

---

## 8. 実装（関数の疑似コード）
```ts
// inputs: MAS, plateau_flag, deficit_streak, training_load, last_refeed_date, zseries.temp, zseries.rhr
function computeRRSv2(ctx) {
  const daysSince = days_between(today, ctx.last_refeed_date);
  const hardLocked = daysSince < MIN_GAP_DAYS; // 2
  const cooldown = clamp(1 - daysSince / ctx.refeed_effect_window, 0, 1);

  const preTemp = mean(z(ctx.temp, D0-2, D0));
  const postTemp = mean(z(ctx.temp, D0+1, D0+3, interpolate=true));
  const preRHR  = mean(z(ctx.rhr,  D0-2, D0));
  const postRHR = mean(z(ctx.rhr,  D0+1, D0+3, interpolate=true));

  let rr = null;
  if (observedDays(postTemp, postRHR) >= 2) {
    const dTemp = postTemp - preTemp;
    const dRHR  = postRHR  - preRHR;
    const gTemp = clip(dTemp / 0.3, -2, 2);
    const gRHR  = clip(-dRHR / 0.5, -2, 2);
    rr = clip((0.6*gTemp + 0.4*gRHR) / 1.0, -1, 1);
  }

  const response = (rr === null) ? 0.0 : rr;
  const RRS = sigmoid(1.0*ctx.MAS + 0.7*ctx.plateau_flag + 0.3*ctx.deficit_streak + 0.2*ctx.training_load
                      - 1.2*cooldown + 0.8*response);

  return (hardLocked) ? {RRS: 0.0, reason: 'hard_lock'} : {RRS, cooldown, response};
}
```

---

## 9. テーブル/マイグレーション例（PostgreSQL）
```sql
alter table public.recommendations add column if not exists executed_at timestamptz;
alter table public.scores add column if not exists rrs_v2 numeric(6,3);
alter table public.scores add column if not exists refeed_cooldown numeric(6,3);
alter table public.scores add column if not exists refeed_response numeric(6,3);

create table if not exists public.refeed_sessions (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  executed_at timestamptz not null,
  effect_window int default 7,
  response numeric(6,3),
  created_at timestamptz default now()
);
```

---

## 10. テスト戦略
- **ユニット**: 欠損/補完、hard lock、cooldown、refeed_response の境界値、ヒステリシス。
- **E2E**: 実施→D+1〜D+3 入力→スコア更新→提案/非提案の確認。
- **回帰**: 旧 RRS と v2 の差分監視、過提案/連続提案率の監視。
- **データドリブン更新**: 月次でパラメータを再推定（グリッド/ベイズ最適化）。

---

## 11. 導入・運用
- フィーチャーフラグでロールアウト、Shadow mode で先行監視。
- 計測ダッシュボード（過提案率、連続提案率、反応弁別、頻度分布）。
- 係数は環境変数化（`RRS_K`, `RRS_M`, `RRS_TH_ON`, ...）し、即時ロールバック可能に。
