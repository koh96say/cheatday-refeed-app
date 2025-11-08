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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← ダッシュボードに戻る
          </Link>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">日次メトリクス入力</h1>
          <p className="text-sm text-gray-600 mb-6">
            体重・安静時心拍数・体温は毎日入力してください。その他の指標は連携デバイスがある場合は参考値を入力できます。
          </p>
          <MetricsForm
            latestMetric={latestMetrics ?? null}
            defaultMetric={todayMetric ?? null}
            estimatedTdee={profile?.estimated_tdee ?? null}
          />
        </div>
      </main>
    </div>
  )
}


