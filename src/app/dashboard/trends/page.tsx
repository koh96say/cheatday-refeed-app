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
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Trends</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">トレンド分析</h1>
          <p className="mt-2 text-sm text-muted">
            直近2週間とその前週の平均を比較し、停滞や回復の兆候を把握します。継続的な入力が鍵です。
          </p>
        </div>
        <Link href="/dashboard" className="app-button-secondary text-xs uppercase tracking-wide">
          ダッシュボードへ戻る
        </Link>
      </div>

      <div className="app-card p-8">
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

              const deltaClass =
                delta === null
                  ? 'text-muted'
                  : delta > 0
                    ? card.key === 'weight_kg'
                      ? 'text-danger'
                      : 'text-warning'
                    : 'text-success'

              return (
                <div key={card.key} className="rounded-2xl border border-white/10 bg-surface-soft/70 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {lastAvg !== null ? `${lastAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    前週比:{' '}
                    <span className={`font-semibold ${deltaClass}`}>
                      {deltaLabel}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    過去2週間平均: {prevAvg !== null ? `${prevAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
            トレンドを計算するには最低4日分のデータが必要です。日次の入力を継続しましょう。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-card p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">スコア履歴</h2>
            <span className="text-xs text-muted">直近21日</span>
          </div>
          {scores && scores.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>RRS</th>
                    <th>MAS</th>
                    <th>停滞</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {scores.slice(-21).map((score: Score) => (
                    <tr key={score.date} className="hover:bg-white/5">
                      <td>{toDateLabel(score.date)}</td>
                      <td>{score.rrs !== null ? score.rrs.toFixed(2) : '--'}</td>
                      <td>{score.mas !== null ? score.mas.toFixed(2) : '--'}</td>
                      <td>
                        {score.plateau_flag ? (
                          <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                            検出
                          </span>
                        ) : (
                          <span className="text-xs text-muted">---</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
              スコア履歴がまだありません。メトリクスを入力してスコアを生成しましょう。
            </div>
          )}
        </div>

        <div className="app-card p-8">
          <h2 className="text-lg font-semibold text-white">生体指標タイムライン</h2>
          {metrics && metrics.length > 0 ? (
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-2">
              {metrics
                .slice()
                .reverse()
                .slice(0, 21)
                .map((metric) => (
                  <div key={metric.date} className="rounded-2xl border border-white/5 bg-surface-soft/70 p-4">
                    <p className="text-sm font-semibold text-white">{toDateLabel(metric.date)}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                      <span>体重: {metric.weight_kg ?? '--'} kg</span>
                      <span>RHR: {metric.rhr_bpm ?? '--'} bpm</span>
                      <span>体温: {metric.temp_c ?? '--'} ℃</span>
                      <span>睡眠: {metric.sleep_min ? (metric.sleep_min / 60).toFixed(1) : '--'} h</span>
                      <span>疲労: {metric.fatigue_1_5 ?? '--'}</span>
                      <span>負荷: {metric.training_load ?? '--'}</span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
              日次メトリクスがまだありません。まずは入力を行いましょう。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


