-- ============================================
-- Row Level Security (RLS) ポリシー設定
-- 作成日: 2025-01-XX
-- ============================================

-- RLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menstrual_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii.users_pii ENABLE ROW LEVEL SECURITY;

-- ============================================
-- users テーブルのポリシー
-- ============================================
CREATE POLICY users_is_owner_select ON public.users
  FOR SELECT USING (auth.uid() = auth_uid);

CREATE POLICY users_is_owner_insert ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_uid);

CREATE POLICY users_is_owner_update ON public.users
  FOR UPDATE USING (auth.uid() = auth_uid)
  WITH CHECK (auth.uid() = auth_uid);

-- ============================================
-- metrics_daily テーブルのポリシー
-- ============================================
CREATE POLICY metrics_is_owner_select ON public.metrics_daily
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY metrics_is_owner_insert ON public.metrics_daily
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY metrics_is_owner_update ON public.metrics_daily
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY metrics_is_owner_delete ON public.metrics_daily
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- scores テーブルのポリシー
-- ============================================
CREATE POLICY scores_is_owner_select ON public.scores
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY scores_is_owner_insert ON public.scores
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY scores_is_owner_update ON public.scores
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY scores_is_owner_delete ON public.scores
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- recommendations テーブルのポリシー
-- ============================================
CREATE POLICY recs_is_owner_select ON public.recommendations
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY recs_is_owner_insert ON public.recommendations
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY recs_is_owner_update ON public.recommendations
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY recs_is_owner_delete ON public.recommendations
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- consents テーブルのポリシー
-- ============================================
CREATE POLICY consents_is_owner_select ON public.consents
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY consents_is_owner_insert ON public.consents
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY consents_is_owner_update ON public.consents
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY consents_is_owner_delete ON public.consents
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- events テーブルのポリシー
-- ============================================
CREATE POLICY events_is_owner_select ON public.events
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY events_is_owner_insert ON public.events
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY events_is_owner_update ON public.events
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY events_is_owner_delete ON public.events
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- menstrual_logs テーブルのポリシー
-- ============================================
CREATE POLICY menstrual_logs_is_owner_select ON public.menstrual_logs
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY menstrual_logs_is_owner_insert ON public.menstrual_logs
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY menstrual_logs_is_owner_update ON public.menstrual_logs
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY menstrual_logs_is_owner_delete ON public.menstrual_logs
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- device_connections テーブルのポリシー
-- ============================================
CREATE POLICY device_connections_is_owner_select ON public.device_connections
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY device_connections_is_owner_insert ON public.device_connections
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY device_connections_is_owner_update ON public.device_connections
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY device_connections_is_owner_delete ON public.device_connections
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- notifications テーブルのポリシー
-- ============================================
CREATE POLICY notifications_is_owner_select ON public.notifications
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY notifications_is_owner_insert ON public.notifications
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY notifications_is_owner_update ON public.notifications
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY notifications_is_owner_delete ON public.notifications
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- user_profiles テーブルのポリシー
-- ============================================
CREATE POLICY user_profiles_is_owner_select ON public.user_profiles
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY user_profiles_is_owner_insert ON public.user_profiles
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY user_profiles_is_owner_update ON public.user_profiles
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY user_profiles_is_owner_delete ON public.user_profiles
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

-- ============================================
-- audit_logs テーブルのポリシー
-- ============================================
-- audit_logsは管理者のみアクセス可能（サービスロールキー経由のみ）
-- 通常のユーザーはアクセス不可
CREATE POLICY audit_logs_no_access ON public.audit_logs
  FOR ALL USING (false);

-- ============================================
-- pii.users_pii テーブルのポリシー
-- ============================================
CREATE POLICY users_pii_is_owner_select ON pii.users_pii
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY users_pii_is_owner_insert ON pii.users_pii
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );

CREATE POLICY users_pii_is_owner_update ON pii.users_pii
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_uid = auth.uid())
  );
