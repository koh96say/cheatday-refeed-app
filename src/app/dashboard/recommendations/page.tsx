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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">リフィード提案履歴</h1>
          <p className="text-sm text-gray-600 mb-6">
            RRSが0.65以上となった日に生成された提案の一覧です。推奨PFC比を参考にリフィードを計画しましょう。
          </p>

          {recommendations && recommendations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      日付
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      カロリー (kcal)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      炭水化物 (g)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      たんぱく質 (g)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      脂質 (g)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      期間
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recommendations.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-4 py-2">{item.kcal_total ?? '--'}</td>
                      <td className="px-4 py-2">{item.carb_g ?? '--'}</td>
                      <td className="px-4 py-2">{item.protein_g ?? '--'}</td>
                      <td className="px-4 py-2">{item.fat_g ?? '--'}</td>
                      <td className="px-4 py-2">{item.duration_days} 日</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-600">
              まだリフィード提案は生成されていません。日次データを継続入力してRRSを蓄積しましょう。
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


