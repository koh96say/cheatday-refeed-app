# RRS / MAS / リフィード提案 計算リファレンス

このドキュメントでは、MVP 実装で利用している指標計算ロジックの要点を整理します。実装の詳細は主に `src/lib/calculations/` 配下を参照してください。

---

## 1. リフィード準備スコア (RRS)

### 1.1 元データの整形
- 直近28日（最大）の日次メトリクスを取得。
- `removeOutliers` で ±3σを超える値を除去。
- Zスコア計算に使用するため、指標ごとに平均・標準偏差を算出。標準偏差が極端に小さい場合は 1e-6 などで下限を確保。

### 1.2 Zスコア
- `calculateZScore` = `(最新値 - baseline_mean) / baseline_sd`
- 対象指標：体温・RHR・HRV・睡眠・主観疲労（`src/lib/calculations/rrs.ts` の `metricKeys`）。
- 値が欠損している場合は 0 として扱う。

### 1.3 代謝適応スコア (MAS)

```
MAS = 0.35 * ( -z_temp )
    + 0.25 * (  z_rhr  )
    + 0.15 * ( -z_hrv  )
    + 0.15 * ( -z_sleep)
    + 0.10 * (  z_fatigue )
```

- 体温低下や HRV/睡眠の悪化を負の符号で取り入れ、RHR・疲労は正の符号で増加をリスクとして扱う設計。
- `src/lib/calculations/rrs.ts` の `mas` 算出ロジックを参照。

### 1.4 停滞判定 (plateauFlag)
- `calculatePlateauFlag` で実装：体重の 7日移動回帰の傾きが -0.02%/日以上、かつ直近週の減量率が -0.5% 未満で true。
- 7日未満のデータしかない場合は false。

### 1.5 赤字連続日数 / トレーニング負荷
- `deficitStreak`：連続で (推定消費 - 摂取) > 300kcal を満たす日数（逆方向に走査してカウント）。2週間(14日)で最大化。
- `trainingLoadFactor`：直近7日間の `training_load` 平均を 500 TSS を上限に正規化した値。

### 1.6 シグモイド変換
- 合算式  
  `scoreInput = a*MAS + b*plateau + c*normalizedDeficit + d*trainingLoad`
- 係数初期値：a=1.2, b=0.8, c=0.5, d=0.3（仕様書の初期値）。
- シグモイド関数：`sigmoid(x) = 1 / (1 + exp(-k*(x - x0)))`  
  - `k = 2.0`, `x0 = 0.5`
- 出力値が RRS（0～1）。0.65 以上でリフィード推奨判定。

---

## 2. リフィード提案の生成

### 2.1 ガードレール (`src/lib/calculations/guards.ts`)
- 発熱疑い：最新の体温が 37.5℃ 以上 → `feverLike = true`
- 急激な体重増：直近3日で体重が +1.5%以上増加 → `acuteWeightGain = true`
- いずれか true の場合 `shouldSuppressRecommendation = true` となり、提案を抑止。既存の提案は削除。

### 2.2 推奨量の計算 (`computeRefeedTargets`)
- 推定 TDEE (or 消費推定) と体重を入力に、以下を算出：
  - `totalKcal = round(TDEE * (1 + multiplier))` （デフォルト multiplier=0.2 → +20%）
  - 追加エネルギーの約80%を炭水化物へ割り当て → `carb_g = round(extraKcal * 0.8 / 4)`
  - タンパク質は `体重(kg) * 2g` を目安（または TDEEの25%）。
  - 残りを脂質に割り当て。
- 係数は仕様書の推奨値（炭水化物 70～85%）に合わせて調整可能。

### 2.3 Supabase への保存
- `scores` テーブル： `user_id` + `date` で upsert（MAS / RRS / plateau_flag）
- `recommendations` テーブル： `user_id` + `date` で upsert（kcal / PFC / rationale_json）。
  - `rationale_json` に MAS、RRS、deficit_streak、training_load_factor 等を格納。

---

## 3. 参照ファイル

| ファイル | 役割 |
|----------|------|
| `src/lib/calculations/rrs.ts` | RRS / MAS の算出ロジック全般 |
| `src/lib/calculations/guards.ts` | 発熱・体重急増のガードレール判定 |
| `src/app/api/metrics/route.ts` | メトリクス保存→スコア計算→提案 upsert の API エンドポイント |
| `tests/calculateScores.test.ts` | RRS/MAS 計算・ガードレール挙動のユニットテスト |

---

## 4. 今後の調整ポイント（参考）

- **係数チューニング**：`COEFFICIENTS`（a, b, c, d）やシグモイドの `k`, `x0` は実データに基づいて再調整が可能。
- **データ拡張**：摂取/消費カロリー列（`calorie_intake_kcal`, `energy_expenditure_kcal`）が未導入環境ではフォールバックで null を送っても動作するが、導入済みに合わせて調整するとより精緻な deficitStreak が計算できる。
- **追加ガード**：仕様書にある SCOFF スコアや感染兆候など、条件を増やしたい場合は `guards.ts` に拡張予定。

---

更新: 2025-11-09  
作成: ChatGPT-5 Codex

