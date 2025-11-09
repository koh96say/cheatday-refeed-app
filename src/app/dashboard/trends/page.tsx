import { redirect } from 'next/navigation'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import { TrendInsights } from '@/components/dashboard/TrendInsights'

export default async function TrendsPage() {
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  const [{ data: metrics }, { data: scores }] = await Promise.all([
    supabase
      .from('metrics_daily')
      .select('*')
      .eq('user_id', userRecord.id)
      .order('date', { ascending: true })
      .limit(365),
    supabase
      .from('scores')
      .select('*')
      .eq('user_id', userRecord.id)
      .order('date', { ascending: true })
      .limit(365),
  ])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-6">
      <TrendInsights metrics={metrics ?? []} scores={scores ?? []} />
    </div>
  )
}

