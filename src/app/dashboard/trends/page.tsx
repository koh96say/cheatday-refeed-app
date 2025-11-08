import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import type { MetricDaily, Score } from '@/types'

function toDateLabel(date: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(new Date(date))
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => value !== null && value !== undefined)
  if (filtered.length === 0) return null
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
}

function compareAverages(data: MetricDaily[], key: keyof MetricDaily) {
  const sorted = data.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  const lastWeek = sorted.slice(-7)
  const previousWeek = sorted.slice(-14, -7)

  const lastAvg = average(lastWeek.map((item) => item[key] as number | null | undefined))
  const prevAvg = average(previousWeek.map((item) => item[key] as number | null | undefined))

  if (lastAvg === null || prevAvg === null) {
    return {
      lastAvg,
      prevAvg,
      delta: null,
    }
  }

  return {
    lastAvg,
    prevAvg,
    delta: lastAvg - prevAvg,
  }
}

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
      .limit(56),
    supabase
      .from('scores')
      .select('*')
      .eq('user_id', userRecord.id)
      .order('date', { ascending: true })
      .limit(56),
  ])

  const trendCards = [
    { key: 'weight_kg' as const, label: '体重 (kg)', unit: 'kg', precision: 1 },
    { key: 'rhr_bpm' as const, label: '安静時心拍数 (bpm)', unit: 'bpm', precision: 0 },
    { key: 'temp_c' as const, label: '体温 (℃)', unit: '℃', precision: 2 },
    { key: 'sleep_min' as const, label: '睡眠 (h)', unit: 'h', precision: 2, transform: (value: number | null) => (value ? value / 60 : null) },
    { key: 'fatigue_1_5' as const, label: '疲労 (1-5)', unit: '', precision: 1 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
            ← ダッシュボードに戻る
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">トレンド分析</h1>
          <p className="text-sm text-gray-600 mb-6">
            直近2週間の平均とその前週を比較し、停滞や回復の兆候を把握します。
          </p>

          {metrics && metrics.length >= 4 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trendCards.map((card) => {
                const comparison = compareAverages(metrics, card.key)
                const lastAvg =
                  comparison.lastAvg !== null
                    ? card.transform
                      ? card.transform(comparison.lastAvg)
                      : comparison.lastAvg
                    : null
                const prevAvg =
                  comparison.prevAvg !== null
                    ? card.transform
                      ? card.transform(comparison.prevAvg)
                      : comparison.prevAvg
                    : null
                const delta =
                  comparison.delta !== null
                    ? card.transform
                      ? card.transform(comparison.delta)
                      : comparison.delta
                    : null

                const deltaLabel =
                  delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(card.precision)} ${card.unit}` : '---'

                return (
                  <div key={card.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h2 className="text-sm font-medium text-gray-500 mb-2">{card.label}</h2>
                    <p className="text-2xl font-semibold text-gray-900">
                      {lastAvg !== null ? `${lastAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      前週比: <span className={delta !== null && delta > 0 ? 'text-red-600' : 'text-green-600'}>
                        {deltaLabel}
                      </span>
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-600">
              トレンドを計算するには最低4日分のデータが必要です。日次の入力を継続しましょう。
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">スコア履歴</h2>
            {scores && scores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">日付</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">RRS</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        MAS
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        停滞
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scores.slice(-21).map((score: Score) => (
                      <tr key={score.date}>
                        <td className="px-3 py-2 whitespace-nowrap">{toDateLabel(score.date)}</td>
                        <td className="px-3 py-2">{score.rrs !== null ? score.rrs.toFixed(2) : '--'}</td>
                        <td className="px-3 py-2">{score.mas !== null ? score.mas.toFixed(2) : '--'}</td>
                        <td className="px-3 py-2">
                          {score.plateau_flag ? (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">検出</span>
                          ) : (
                            <span className="text-xs text-gray-500">---</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-600">
                スコア履歴がまだありません。メトリクスを入力してスコアを生成しましょう。
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">生体指標タイムライン</h2>
            {metrics && metrics.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <ul className="space-y-3">
                  {metrics
                    .slice()
                    .reverse()
                    .slice(0, 21)
                    .map((metric) => (
                      <li key={metric.date} className="border border-gray-100 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-700">{toDateLabel(metric.date)}</p>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <span>体重: {metric.weight_kg ?? '--'} kg</span>
                          <span>RHR: {metric.rhr_bpm ?? '--'} bpm</span>
                          <span>体温: {metric.temp_c ?? '--'} ℃</span>
                          <span>睡眠: {metric.sleep_min ? (metric.sleep_min / 60).toFixed(1) : '--'} h</span>
                          <span>疲労: {metric.fatigue_1_5 ?? '--'}</span>
                          <span>負荷: {metric.training_load ?? '--'}</span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 p-6 text-center text-sm text-gray-600">
                日次メトリクスがまだありません。まずは入力を行いましょう。
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}


