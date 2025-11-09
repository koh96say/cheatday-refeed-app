# リフィード履歴を考慮した計算ロジック（改良版）

## 背景
現行のRRS（Refeed Readiness Score）は、MAS（代謝適応スコア）や停滞フラグなどからリフィードの必要性を算出しているが、**リフィード実施直後の状態**を考慮していない。これにより、リフィード直後にも再度提案が出る可能性があるため、履歴を考慮した改良が必要。

---

## 新規変数
| 変数 | 意味 | 初期値・範囲 |
|------|------|---------------|
| `last_refeed_date` | 直近のリフィード実施日 | 日付型 |
| `days_since_refeed` | 前回リフィードからの経過日数 | 0〜30 |
| `refeed_effect_window` | 代謝回復の観察期間 | 初期7日 |
| `refeed_response` | リフィード後3日間の体温・RHR変化で算出される反応スコア | -1〜+1 |

---

## 改良式（RRS v2）
```math
RRS = sigmoid(
  a*MAS +
  b*plateau_flag +
  c*deficit_streak +
  d*training_load +
  e*refeed_cooldown +
  f*refeed_response
)
```

- `refeed_cooldown = clamp(1 - days_since_refeed / refeed_effect_window, 0, 1)`
  - → リフィード直後（3〜7日）はスコアを抑制。
- `refeed_response`：
  - リフィード後に体温↑ + RHR↓ が見られた場合は正の寄与（効果あり）。
  - 変化が乏しい場合は0または負の寄与（再評価が必要）。

---

## 擬似コード
```python
if days_since_refeed < refeed_effect_window:
    refeed_cooldown = 1 - days_since_refeed / refeed_effect_window
else:
    refeed_cooldown = 0

refeed_response = avg_z_temp_change(+3d) * 0.5 + avg_z_rhr_change(-0.5)

RRS = sigmoid(
  a*MAS +
  b*plateau_flag +
  c*deficit_streak +
  d*training_load - 1.2*refeed_cooldown + 0.8*refeed_response
)
```

---

## 効果
- **連続リフィード防止**：実施直後の期間を自動除外（最低3〜7日空ける）
- **学習的補正**：ユーザー個別の「リフィード反応」を反映可能。
- **精度向上**：MAS/RRSが「回復中の状態」を誤判定しにくくなる。

---

## Supabase実装例（DDL拡張）
```sql
alter table public.recommendations add column executed_at timestamptz;
alter table public.recommendations add column refeed_effect_window int default 7;

create table public.refeed_history (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  days_since_refeed int,
  refeed_response numeric(4,2),
  created_at timestamptz default now()
);
```

---

## Edge Function 実装方針
1. `recommendations.executed_at` を参照し、`days_since_refeed` を計算。
2. 体温・RHRの直近3日変化から `refeed_response` を推定。
3. RRS算出時に `refeed_cooldown` と `refeed_response` を組み込み。
4. 結果を `scores` に保存し、必要に応じて `refeed_history` を更新。

---

## 今後の拡張
- 反応スコアの個別最適化（ユーザーごとの回復速度学習）
- カーボサイクル型食事や段階的リフィード（2日連続など）のシミュレーション対応
- RRS学習モデルの自動チューニング（LightGBM / Neural Network などで学習）
