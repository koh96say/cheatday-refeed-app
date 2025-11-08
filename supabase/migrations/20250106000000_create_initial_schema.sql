-- ============================================
-- チートデイ発見アプリ データベーススキーマ
-- 作成日: 2025-01-XX
-- ============================================

-- PIIスキーマの作成（機微情報用）
CREATE SCHEMA IF NOT EXISTS pii;

-- ============================================
-- 1. users テーブル（ユーザー基本情報）
-- ============================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid NOT NULL UNIQUE,
  gender text CHECK (gender IN ('male','female','other')),
  birth_year int,
  height_cm numeric(5,2),
  goal_weight numeric(5,2),
  timezone text DEFAULT 'Asia/Tokyo',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. users_pii テーブル（機微情報）
-- ============================================
CREATE TABLE pii.users_pii (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text
);

-- ============================================
-- 3. metrics_daily テーブル（日次メトリクス）
-- ============================================
CREATE TABLE public.metrics_daily (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_kg numeric(5,2),
  rhr_bpm numeric(5,2),
  temp_c numeric(4,2),
  hrv_ms numeric(6,2),
  sleep_min int,
  fatigue_1_5 int CHECK (fatigue_1_5 >= 1 AND fatigue_1_5 <= 5),
  training_load int,
  notes text,
  UNIQUE(user_id, date)
);

-- インデックスの作成
CREATE INDEX idx_metrics_daily_user_date ON public.metrics_daily(user_id, date DESC);

-- ============================================
-- 4. scores テーブル（スコア）
-- ============================================
CREATE TABLE public.scores (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  plateau_flag boolean,
  mas numeric(6,3),
  rrs numeric(6,3),
  PRIMARY KEY (user_id, date)
);

-- インデックスの作成
CREATE INDEX idx_scores_user_date ON public.scores(user_id, date DESC);

-- ============================================
-- 5. recommendations テーブル（リフィード提案）
-- ============================================
CREATE TABLE public.recommendations (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  kcal_total int,
  carb_g int,
  protein_g int,
  fat_g int,
  duration_days int DEFAULT 1,
  rationale_json jsonb
);

-- インデックスの作成
CREATE INDEX idx_recommendations_user_date ON public.recommendations(user_id, date DESC);

-- ============================================
-- 6. consents テーブル（同意情報）
-- ============================================
CREATE TABLE public.consents (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  version text NOT NULL,
  scopes text[],
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- インデックスの作成
CREATE INDEX idx_consents_user ON public.consents(user_id);

-- ============================================
-- 7. audit_logs テーブル（監査ログ）
-- ============================================
CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid,
  actor text NOT NULL,
  action text NOT NULL,
  resource text,
  at timestamptz DEFAULT now(),
  details jsonb
);

-- インデックスの作成
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_at ON public.audit_logs(at DESC);

-- ============================================
-- 8. events テーブル（イベントログ）
-- ============================================
CREATE TABLE public.events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  payload_json jsonb
);

-- インデックスの作成
CREATE INDEX idx_events_user_ts ON public.events(user_id, ts DESC);
CREATE INDEX idx_events_type ON public.events(type);

-- ============================================
-- 9. menstrual_logs テーブル（月経ログ）
-- ============================================
CREATE TABLE public.menstrual_logs (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  phase text CHECK (phase IN ('menstrual','follicular','ovulation','luteal')),
  UNIQUE(user_id, date)
);

-- インデックスの作成
CREATE INDEX idx_menstrual_logs_user_date ON public.menstrual_logs(user_id, date DESC);

-- ============================================
-- 10. device_connections テーブル（デバイス連携）
-- ============================================
CREATE TABLE public.device_connections (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('apple_health','google_fit','oura','withings','garmin','fitbit')),
  connected_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  settings jsonb,
  UNIQUE(user_id, provider)
);

-- インデックスの作成
CREATE INDEX idx_device_connections_user ON public.device_connections(user_id);

-- ============================================
-- 11. notifications テーブル（通知）
-- ============================================
CREATE TABLE public.notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  content jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sent','failed'))
);

-- インデックスの作成
CREATE INDEX idx_notifications_user_scheduled ON public.notifications(user_id, scheduled_at);
CREATE INDEX idx_notifications_status ON public.notifications(status);

-- ============================================
-- 12. user_profiles テーブル（ユーザープロフィール拡張）
-- ============================================
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  body_fat_percentage numeric(5,2),
  activity_level text CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  estimated_tdee int,
  updated_at timestamptz DEFAULT now()
);





