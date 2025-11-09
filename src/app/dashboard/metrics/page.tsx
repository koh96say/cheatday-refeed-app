import { redirect } from 'next/navigation'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import MetricsForm from '@/components/dashboard/MetricsForm'

type MetricsPageProps = {
  searchParams?: {
    date?: string
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value: string | undefined): value is string {
  if (!value) return false
  if (!DATE_PATTERN.test(value)) return false
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime())
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value))
}

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  const today = new Date().toISOString().slice(0, 10)
  const targetDate = isValidDate(searchParams?.date) ? searchParams!.date : null
  const selectedDate = targetDate ?? today

  const [{ data: latestMetrics }, { data: selectedMetric }, { data: profile }] = await Promise.all([
    supabase
      .from('metrics_daily')
      .select('*')
      .eq('user_id', userRecord.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('metrics_daily')
      .select('*')
      .eq('user_id', userRecord.id)
      .eq('date', selectedDate)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('estimated_tdee, activity_level')
      .eq('user_id', userRecord.id)
      .maybeSingle(),
  ])

  const editingExistingMetric = Boolean(targetDate && selectedMetric)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-16 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Daily Input</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">日次メトリクス入力</h1>
          <p className="mt-2 text-sm text-muted">
            体重・安静時心拍数・体温は毎日入力。過去データを編集する場合は日付を変更して再保存してください。
          </p>
        </div>
        {editingExistingMetric && (
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white">
            編集対象: {formatDateLabel(selectedDate)}
          </span>
        )}
      </div>

      <div className="app-card mt-6 p-8">
        <MetricsForm
          latestMetric={latestMetrics ?? null}
          defaultMetric={selectedMetric ?? null}
          estimatedTdee={profile?.estimated_tdee ?? null}
        />
      </div>
    </div>
  )
}
