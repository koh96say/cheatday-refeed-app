import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import MetricsForm from '@/components/dashboard/MetricsForm'

export default async function MetricsPage() {
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  const { data: latestMetrics } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: todayMetric } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .eq('date', new Date().toISOString().slice(0, 10))
    .maybeSingle()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('estimated_tdee, activity_level')
    .eq('user_id', userRecord.id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Daily Input</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">日次メトリクス入力</h1>
          <p className="mt-2 text-sm text-muted">
            体重・安静時心拍数・体温は毎日入力。睡眠・疲労やメモも記録してコンディションを可視化しましょう。
          </p>
        </div>
        <Link href="/dashboard" className="app-button-secondary text-xs uppercase tracking-wide">
          ダッシュボードへ戻る
        </Link>
      </div>

      <div className="app-card p-8">
        <MetricsForm
          latestMetric={latestMetrics ?? null}
          defaultMetric={todayMetric ?? null}
          estimatedTdee={profile?.estimated_tdee ?? null}
        />
      </div>
    </div>
  )
}


