import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  // 最新のメトリクスを取得
  const { data: latestMetrics } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 最新のスコアを取得
  const { data: latestScore } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 直近1週間のメトリクス
  const { data: recentMetrics } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

  // 最新のリフィード提案
  const { data: latestRecommendation } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '--'
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(
      new Date(value)
    )
  }

  const guardFlags = (() => {
    const latest = recentMetrics?.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    const temp = latest?.temp_c ?? null
    const feverLike = temp !== null && temp >= 37.5

    const weightSeries = (recentMetrics ?? [])
      .filter((metric) => metric.weight_kg !== null && metric.weight_kg !== undefined)
      .slice(-3)
    let acuteWeightGain = false
    if (weightSeries.length >= 3) {
      const start = weightSeries[0].weight_kg!
      const end = weightSeries[weightSeries.length - 1].weight_kg!
      if (start > 0 && (end - start) / start >= 0.015) {
        acuteWeightGain = true
      }
    }

    return { feverLike, acuteWeightGain }
  })()

  const guardActive = guardFlags.feverLike || guardFlags.acuteWeightGain

  const sortedRecentMetrics = recentMetrics
    ? recentMetrics
        .slice()
        .sort((a, b) => (a.date > b.date ? -1 : 1))
    : []

  const rrsStatus = (() => {
    const value = latestScore?.rrs
    if (value === null || value === undefined) {
      return { label: 'データなし', color: 'text-gray-500', description: '日次データを入力してください。' }
    }
    if (value >= 0.65) {
      return {
        label: guardActive ? '推奨保留中' : 'リフィード推奨',
        color: guardActive ? 'text-yellow-600' : 'text-green-600',
        description: guardActive
          ? '体調ガードレールが発動中です。回復を優先し、メトリクスを継続記録してください。'
          : '代謝回復のため、炭水化物中心のリフィードを検討してください。',
      }
    }
    if (value >= 0.5) {
      return {
        label: '注意喚起',
        color: 'text-yellow-600',
        description: '停滞兆候を監視しましょう。明日のデータも入力してください。',
      }
    }
    return {
      label: '継続中',
      color: 'text-gray-600',
      description: '引き続き日次データを記録し、コンディションを維持しましょう。',
    }
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">チートデイ発見アプリ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-4">
            <Link
              href="/how-to-use"
              className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              このアプリの使い方について
            </Link>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ダッシュボード</h2>
            <p className="text-gray-600">今日のリフィード準備スコアとメトリクスを確認</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* リフィード準備スコア */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-indigo-600">
                      {latestScore?.rrs ? latestScore.rrs.toFixed(1) : '--'}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        リフィード準備スコア (RRS)
                      </dt>
                      <dd className="text-sm text-gray-900">
                        <span className={rrsStatus.color}>{rrsStatus.label}</span>
                      </dd>
                      <dd className="mt-1 text-xs text-gray-500">{rrsStatus.description}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 代謝適応スコア */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-purple-600">
                      {latestScore?.mas ? latestScore.mas.toFixed(1) : '--'}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        代謝適応スコア (MAS)
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {latestScore?.plateau_flag ? (
                          <span className="text-red-600">停滞検出</span>
                        ) : (
                          <span className="text-gray-600">正常</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 最新の体重 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-blue-600">
                      {latestMetrics?.weight_kg ? `${latestMetrics.weight_kg}kg` : '--'}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        最新の体重
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {latestMetrics?.date ? (
                          formatDate(latestMetrics.date)
                        ) : (
                          <span className="text-gray-400">データなし</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/dashboard/metrics"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  メトリクスを入力
                </Link>
                <Link
                  href="/dashboard/trends"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  トレンドを確認
                </Link>
                <Link
                  href="/dashboard/recommendations"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  リフィード提案を確認
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  プロフィールを更新
                </Link>
              </div>
            </div>
          </div>

          {guardActive && (
            <div className="mt-6">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-semibold mb-1">コンディション警告</p>
                <ul className="list-disc list-inside space-y-1">
                  {guardFlags.feverLike && <li>発熱の兆候が検知されました。リフィード提案を一時保留します。</li>}
                  {guardFlags.acuteWeightGain && (
                    <li>直近3日で体重が急増しています。水分やむくみを確認し、休養を優先してください。</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* 最新のリフィード提案 */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">リフィード提案</h3>
              {latestRecommendation && latestScore?.rrs && latestScore.rrs >= 0.65 && !guardActive ? (
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="font-semibold text-indigo-600">
                    {formatDate(latestRecommendation.date)} にリフィードを実施しましょう
                  </p>
                  <ul className="space-y-1">
                    <li>総摂取カロリー: {latestRecommendation.kcal_total} kcal</li>
                    <li>炭水化物: {latestRecommendation.carb_g} g</li>
                    <li>たんぱく質: {latestRecommendation.protein_g} g</li>
                    <li>脂質: {latestRecommendation.fat_g} g</li>
                  </ul>
                  <p className="text-xs text-gray-500">
                    追加エネルギーの約80%を炭水化物に割り当て、代謝のリセットを狙います。
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {guardActive
                    ? '体調ガードレールがアクティブのため、リフィード提案を一時停止しています。'
                    : '直近のデータではリフィード推奨条件を満たしていません。引き続きデータを記録しましょう。'}
                </p>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">直近のメトリクス</h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">日付</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">体重(kg)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">RHR(bpm)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">体温(℃)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">睡眠(h)</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">疲労(1-5)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRecentMetrics.length > 0 ? (
                    sortedRecentMetrics.map((metric) => (
                      <tr key={metric.date}>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(metric.date)}</td>
                        <td className="px-3 py-2">{metric.weight_kg ?? '--'}</td>
                        <td className="px-3 py-2">{metric.rhr_bpm ?? '--'}</td>
                        <td className="px-3 py-2">{metric.temp_c ?? '--'}</td>
                        <td className="px-3 py-2">{metric.sleep_min ? (metric.sleep_min / 60).toFixed(1) : '--'}</td>
                        <td className="px-3 py-2">{metric.fatigue_1_5 ?? '--'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">
                        直近7日間のデータがありません。メトリクスを入力してください。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}