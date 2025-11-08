-- ============================================
-- metrics_daily テーブルに摂取カロリー列を追加
-- ============================================

ALTER TABLE public.metrics_daily
ADD COLUMN IF NOT EXISTS calorie_intake_kcal int;

ALTER TABLE public.metrics_daily
ADD COLUMN IF NOT EXISTS energy_expenditure_kcal int;


