import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(
    new Date(value)
  )
}

export default async function RecommendationsPage() {
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  const { data: recommendations } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(30)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">History</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">リフィード提案履歴</h1>
          <p className="mt-2 text-sm text-muted">
            RRSが0.65以上となった日に生成された提案の一覧です。推奨PFCバランスと期間を振り返りましょう。
          </p>
        </div>
        <Link href="/dashboard" className="app-button-secondary text-xs uppercase tracking-wide">
          ダッシュボードへ戻る
        </Link>
      </div>

      <div className="app-card p-8">
        {recommendations && recommendations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>カロリー (kcal)</th>
                  <th>炭水化物 (g)</th>
                  <th>たんぱく質 (g)</th>
                  <th>脂質 (g)</th>
                  <th>実施期間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recommendations.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td>{formatDate(item.date)}</td>
                    <td>{item.kcal_total ?? '--'}</td>
                    <td>{item.carb_g ?? '--'}</td>
                    <td>{item.protein_g ?? '--'}</td>
                    <td>{item.fat_g ?? '--'}</td>
                    <td>{item.duration_days} 日</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
            まだリフィード提案は生成されていません。日次データを継続入力してRRSの推移を蓄積しましょう。
          </div>
        )}
      </div>
    </div>
  )
}


