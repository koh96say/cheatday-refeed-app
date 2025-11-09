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

type SparklineOptions = {
  width?: number
  height?: number
  min?: number
  max?: number
}

type SparklinePoint = {
  x: number
  y: number
}

type SparklineData = {
  linePath: string
  areaPath: string
  points: SparklinePoint[]
  min: number
  max: number
  last: number
}

function createSparklineData(
  values: Array<number | null | undefined>,
  options: SparklineOptions = {}
): SparklineData | null {
  const width = options.width ?? 160
  const height = options.height ?? 56

  const numericValues = values
    .map((value) => {
      if (value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    })
    .filter((value): value is number => value !== null)

  if (numericValues.length < 2) {
    return null
  }

  const minValue = options.min ?? Math.min(...numericValues)
  const maxValue = options.max ?? Math.max(...numericValues)
  const range = maxValue - minValue || 1
  const step = width / (numericValues.length - 1)

  const points: SparklinePoint[] = numericValues.map((value, index) => {
    const x = index === numericValues.length - 1 ? width : Number((index * step).toFixed(2))
    const normalized = (value - minValue) / range
    const y = Number((height - normalized * height).toFixed(2))
    return { x, y }
  })

  let linePath = ''
  points.forEach((point, index) => {
    linePath += `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `
  })

  let areaPath = `M 0 ${height} `
  points.forEach((point) => {
    areaPath += `L ${point.x} ${point.y} `
  })
  areaPath += `L ${width} ${height} Z`

  return {
    linePath: linePath.trim(),
    areaPath: areaPath.trim(),
    points,
    min: minValue,
    max: maxValue,
    last: numericValues[numericValues.length - 1],
  }
}

function extractNumeric(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => value !== null && value !== undefined)
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
    { key: 'weight_kg' as const, label: '体重 (kg)', unit: 'kg', precision: 1, accent: '#4C6EF5' },
    { key: 'rhr_bpm' as const, label: '安静時心拍数 (bpm)', unit: 'bpm', precision: 0, accent: '#F97316' },
    { key: 'temp_c' as const, label: '体温 (℃)', unit: '℃', precision: 2, accent: '#FBBF24' },
    {
      key: 'sleep_min' as const,
      label: '睡眠 (h)',
      unit: 'h',
      precision: 2,
      accent: '#34D399',
      transform: (value: number | null) => {
        if (value === null || value === undefined) return null
        return value / 60
      },
    },
    { key: 'fatigue_1_5' as const, label: '疲労 (1-5)', unit: '', precision: 1, accent: '#F472B6' },
  ]

  const applyTransform = (
    value: number | null | undefined,
    transform?: (value: number | null) => number | null
  ) => {
    if (transform) {
      return transform(value ?? null)
    }
    return value ?? null
  }

  const recentMetricsSlice = metrics ? metrics.slice(-21) : []
  const cardSparkSize = { width: 220, height: 64 }

  const recentScores = scores ? scores.slice(-21) : []
  const rrsValues = recentScores.map((score) => (score.rrs !== null ? score.rrs : null))
  const masValues = recentScores.map((score) => (score.mas !== null ? score.mas : null))
  const combinedScoreValues = extractNumeric([...rrsValues, ...masValues])
  const sharedMin = combinedScoreValues.length > 0 ? Math.min(...combinedScoreValues) : undefined
  const sharedMax = combinedScoreValues.length > 0 ? Math.max(...combinedScoreValues) : undefined
  const chartWidth = 520
  const chartHeight = 160
  const rrsSpark =
    typeof sharedMin === 'number' && typeof sharedMax === 'number'
      ? createSparklineData(rrsValues, { width: chartWidth, height: chartHeight, min: sharedMin, max: sharedMax })
      : createSparklineData(rrsValues, { width: chartWidth, height: chartHeight })
  const masSpark =
    typeof sharedMin === 'number' && typeof sharedMax === 'number'
      ? createSparklineData(masValues, { width: chartWidth, height: chartHeight, min: sharedMin, max: sharedMax })
      : createSparklineData(masValues, { width: chartWidth, height: chartHeight })
  const firstScoreDate = recentScores[0]?.date
  const lastScoreDate = recentScores[recentScores.length - 1]?.date
  const latestScore = recentScores[recentScores.length - 1]
  const SCORE_COLOR_RRS = '#4C6EF5'
  const SCORE_COLOR_MAS = '#A855F7'

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

      <section className="app-card p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">RRS & MAS 推移</h2>
            <p className="mt-1 text-xs text-muted">直近21日間のスコアトレンド</p>
          </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCORE_COLOR_RRS }} />
                RRS
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCORE_COLOR_MAS }} />
                MAS
              </span>
            </div>
        </div>
        {rrsSpark || masSpark ? (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-surface-soft/60 p-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-40 w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="rrsAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={SCORE_COLOR_RRS} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={SCORE_COLOR_RRS} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {Array.from({ length: 5 }).map((_, index) => {
                  const y = Number(((chartHeight / 4) * index).toFixed(2))
                  return (
                    <line
                      key={index}
                      x1={0}
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      className="stroke-white/10"
                      strokeWidth={0.5}
                    />
                  )
                })}
                {rrsSpark && (
                  <>
                    <path d={rrsSpark.areaPath} fill="url(#rrsAreaGradient)" stroke="none" />
                    <path d={rrsSpark.linePath} fill="none" stroke={SCORE_COLOR_RRS} strokeWidth={3} />
                    {rrsSpark.points.length > 0 && (
                      <circle
                        cx={rrsSpark.points[rrsSpark.points.length - 1].x}
                        cy={rrsSpark.points[rrsSpark.points.length - 1].y}
                        r={4}
                        fill={SCORE_COLOR_RRS}
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                    )}
                  </>
                )}
                {masSpark && (
                  <>
                    <path d={masSpark.linePath} fill="none" stroke={SCORE_COLOR_MAS} strokeWidth={2.5} strokeDasharray="6 4" />
                    {masSpark.points.length > 0 && (
                      <circle
                        cx={masSpark.points[masSpark.points.length - 1].x}
                        cy={masSpark.points[masSpark.points.length - 1].y}
                        r={4}
                        fill={SCORE_COLOR_MAS}
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                      />
                    )}
                  </>
                )}
              </svg>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{firstScoreDate ? toDateLabel(firstScoreDate) : '--'}</span>
                <span>{lastScoreDate ? toDateLabel(lastScoreDate) : '--'}</span>
              </div>
            </div>
            {latestScore && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted">
                <div>
                  RRS:{' '}
                  <span className="font-semibold text-white">
                    {latestScore.rrs !== null ? latestScore.rrs.toFixed(2) : '--'}
                  </span>
                </div>
                <div>
                  MAS:{' '}
                  <span className="font-semibold text-white">
                    {latestScore.mas !== null ? latestScore.mas.toFixed(2) : '--'}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-surface-soft/60 p-6 text-center text-sm text-muted">
            スコア履歴がまだ十分ではありません。メトリクスを入力して推移を蓄積しましょう。
          </div>
        )}
      </section>

      <section className="app-card p-8">
        {metrics && metrics.length >= 4 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendCards.map((card) => {
              const comparison = compareAverages(metrics, card.key)
              const lastAvg = comparison.lastAvg !== null ? applyTransform(comparison.lastAvg, card.transform) : null
              const prevAvg = comparison.prevAvg !== null ? applyTransform(comparison.prevAvg, card.transform) : null
              const deltaRaw = comparison.delta !== null ? comparison.delta : null
              const delta =
                deltaRaw !== null ? applyTransform(deltaRaw, card.transform) ?? deltaRaw : null

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

              const seriesValues = recentMetricsSlice.map((metric) =>
                applyTransform(metric[card.key] as number | null | undefined, card.transform)
              )
              const spark = createSparklineData(seriesValues, {
                width: cardSparkSize.width,
                height: cardSparkSize.height,
              })

              return (
                <div key={card.key} className="rounded-2xl border border-white/10 bg-surface-soft/70 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">{card.label}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-3xl font-semibold text-white">
                      {lastAvg !== null ? `${lastAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                    </p>
                    <p className="text-xs text-muted">直近2週間平均</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    前週比:{' '}
                    <span className={`font-semibold ${deltaClass}`}>
                      {deltaLabel}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    先週平均: {prevAvg !== null ? `${prevAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                  </p>
                  {spark && (
                    <div className="mt-4">
                      <svg
                        viewBox={`0 0 ${cardSparkSize.width} ${cardSparkSize.height}`}
                        className="h-16 w-full"
                        preserveAspectRatio="none"
                      >
                        <path d={spark.areaPath} fill={card.accent} fillOpacity={0.15} />
                        <path d={spark.linePath} fill="none" stroke={card.accent} strokeWidth={2.5} />
                        {spark.points.length > 0 && (
                          <circle
                            cx={spark.points[spark.points.length - 1].x}
                            cy={spark.points[spark.points.length - 1].y}
                            r={3.5}
                            fill={card.accent}
                            stroke="#FFFFFF"
                            strokeWidth={1.5}
                          />
                        )}
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
            トレンドを計算するには最低4日分のデータが必要です。日次の入力を継続しましょう。
          </div>
        )}
      </section>

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


