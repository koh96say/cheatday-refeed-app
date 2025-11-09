'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MetricDaily, Score } from '@/types'

const PRESET_RANGES = [
  { key: '7', label: '1週間', days: 7 },
  { key: '14', label: '2週間', days: 14 },
  { key: '30', label: '1ヶ月', days: 30 },
  { key: '180', label: '半年', days: 180 },
  { key: 'custom', label: 'カスタム', days: null },
] as const

const CHART_DIMENSIONS = { width: 520, height: 160 }
const METRIC_CHART_DIMENSIONS = { width: 220, height: 64 }
const SCORE_COLOR_RRS = '#4C6EF5'
const SCORE_COLOR_MAS = '#A855F7'

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

function parseISODate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function toDateLabel(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(parseISODate(value))
}

function toFullDateLabel(value: Date | string) {
  const date = typeof value === 'string' ? parseISODate(value) : value
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date)
}

function compareAverages(data: MetricDaily[], key: keyof MetricDaily) {
  const sorted = data.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  const lastWeek = sorted.slice(-7)
  const previousWeek = sorted.slice(-14, -7)

  const average = (values: Array<number | null | undefined>) => {
    const filtered = values.filter((value): value is number => value !== null && value !== undefined)
    if (filtered.length === 0) return null
    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
  }

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

type TrendInsightsProps = {
  metrics: MetricDaily[]
  scores: Score[]
}

export function TrendInsights({ metrics, scores }: TrendInsightsProps) {
  const sortedMetrics = useMemo(
    () => metrics.slice().sort((a, b) => (a.date < b.date ? -1 : 1)),
    [metrics]
  )
  const sortedScores = useMemo(
    () => scores.slice().sort((a, b) => (a.date < b.date ? -1 : 1)),
    [scores]
  )

  const [selectedPreset, setSelectedPreset] = useState<string>('30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (selectedPreset === 'custom' && sortedMetrics.length > 0 && (!customStart || !customEnd)) {
      const startIndex = Math.max(sortedMetrics.length - 30, 0)
      setCustomStart(sortedMetrics[startIndex].date)
      setCustomEnd(sortedMetrics[sortedMetrics.length - 1].date)
    }
  }, [selectedPreset, sortedMetrics, customStart, customEnd])

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (selectedPreset === 'custom') {
      if (!customStart || !customEnd) return [null, null] as const
      const start = parseISODate(customStart)
      const end = parseISODate(customEnd)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [null, null] as const
      }
      return start <= end ? [start, end] as const : [end, start] as const
    }

    const preset = PRESET_RANGES.find((item) => item.key === selectedPreset)
    if (!preset?.days) {
      return [null, null] as const
    }

    const referenceDateString = sortedMetrics.at(-1)?.date ?? sortedScores.at(-1)?.date ?? null
    if (!referenceDateString) {
      return [null, null] as const
    }

    const end = parseISODate(referenceDateString)
    const start = new Date(end)
    start.setDate(start.getDate() - (preset.days - 1))

    return [start, end] as const
  }, [selectedPreset, customStart, customEnd, sortedMetrics, sortedScores])

  const activeMetrics = useMemo(() => {
    if (!rangeStart || !rangeEnd) return sortedMetrics
    return sortedMetrics.filter((metric) => {
      const date = parseISODate(metric.date)
      return date >= rangeStart && date <= rangeEnd
    })
  }, [sortedMetrics, rangeStart, rangeEnd])

  const activeScores = useMemo(() => {
    if (!rangeStart || !rangeEnd) return sortedScores
    return sortedScores.filter((score) => {
      const date = parseISODate(score.date)
      return date >= rangeStart && date <= rangeEnd
    })
  }, [sortedScores, rangeStart, rangeEnd])

  const scoreSeries = useMemo(
    () => activeScores.filter((score) => score.rrs !== null && score.mas !== null),
    [activeScores]
  )

  const combinedScoreValues = useMemo(() => {
    const values: number[] = []
    scoreSeries.forEach((score) => {
      values.push(score.rrs!, score.mas!)
    })
    return values
  }, [scoreSeries])

  const chartMin = combinedScoreValues.length ? Math.min(...combinedScoreValues) : 0
  const chartMax = combinedScoreValues.length ? Math.max(...combinedScoreValues) : 1

  const rrsLine = useMemo(
    () =>
      scoreSeries.length
        ? createSparklineData(scoreSeries.map((score) => score.rrs), {
            width: CHART_DIMENSIONS.width,
            height: CHART_DIMENSIONS.height,
            min: chartMin,
            max: chartMax,
          })
        : null,
    [scoreSeries, chartMin, chartMax]
  )

  const masLine = useMemo(
    () =>
      scoreSeries.length
        ? createSparklineData(scoreSeries.map((score) => score.mas), {
            width: CHART_DIMENSIONS.width,
            height: CHART_DIMENSIONS.height,
            min: chartMin,
            max: chartMax,
          })
        : null,
    [scoreSeries, chartMin, chartMax]
  )

  const chartAvailable = Boolean(rrsLine && masLine && scoreSeries.length >= 2)
  const activeHoverIndex = hoverIndex ?? (scoreSeries.length ? scoreSeries.length - 1 : null)
  const hoveredScore = activeHoverIndex !== null ? scoreSeries[activeHoverIndex] : null
  const hoveredRrsPoint =
    activeHoverIndex !== null && rrsLine ? rrsLine.points[activeHoverIndex] : undefined
  const hoveredMasPoint =
    activeHoverIndex !== null && masLine ? masLine.points[activeHoverIndex] : undefined
  const tooltipLeftPercent =
    hoveredRrsPoint?.x !== undefined
      ? (hoveredRrsPoint.x / CHART_DIMENSIONS.width) * 100
      : hoveredMasPoint?.x !== undefined
        ? (hoveredMasPoint.x / CHART_DIMENSIONS.width) * 100
        : 0

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || !chartAvailable || scoreSeries.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const ratio = Math.min(Math.max(x / CHART_DIMENSIONS.width, 0), 1)
    const index = Math.round(ratio * (scoreSeries.length - 1))
    setHoverIndex(index)
  }

  const handlePointerLeave = () => setHoverIndex(null)

  const applyTransform = (
    value: number | null | undefined,
    transform?: (value: number | null) => number | null
  ) => {
    if (transform) {
      return transform(value ?? null)
    }
    return value ?? null
  }

  const rangeSummary =
    rangeStart && rangeEnd ? `${toFullDateLabel(rangeStart)} 〜 ${toFullDateLabel(rangeEnd)}` : '全期間'

  const metricCards = useMemo(() => {
    const recentMetrics = activeMetrics
    const reversedMetrics = recentMetrics.slice().reverse()

    const cardDefinitions = [
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
          if (value === null) return null
          return value / 60
        },
      },
      { key: 'fatigue_1_5' as const, label: '疲労 (1-5)', unit: '', precision: 1, accent: '#F472B6' },
    ]

    return cardDefinitions.map((card) => {
      const comparison = compareAverages(recentMetrics, card.key)
      const lastAvg = comparison.lastAvg !== null ? applyTransform(comparison.lastAvg, card.transform) : null
      const prevAvg = comparison.prevAvg !== null ? applyTransform(comparison.prevAvg, card.transform) : null
      const delta = comparison.delta !== null ? applyTransform(comparison.delta, card.transform) : null

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

      const seriesValues = reversedMetrics
        .slice(0, 21)
        .map((metric) => applyTransform(metric[card.key] as number | null | undefined, card.transform))
      const spark = createSparklineData(seriesValues, {
        width: METRIC_CHART_DIMENSIONS.width,
        height: METRIC_CHART_DIMENSIONS.height,
      })

      return {
        ...card,
        lastAvg,
        prevAvg,
        deltaLabel,
        deltaClass,
        spark,
      }
    })
  }, [activeMetrics])

  const timelineMetrics = useMemo(() => {
    return activeMetrics
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 21)
  }, [activeMetrics])

  const scoreTableRows = useMemo(() => activeScores.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 21), [activeScores])

  const chartRangeStart = scoreSeries[0]?.date
  const chartRangeEnd = scoreSeries[scoreSeries.length - 1]?.date

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Trends</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">トレンド分析</h1>
          <p className="mt-2 text-sm text-muted">
            選択した期間内のメトリクスとスコアの推移を可視化します。リフィード判断のヒントになる変化を確認しましょう。
          </p>
        </div>
        <Link href="/dashboard" className="app-button-secondary text-xs uppercase tracking-wide">
          ダッシュボードへ戻る
        </Link>
      </div>

      <section className="app-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">表示期間</h2>
          <span className="text-xs text-muted">{rangeSummary}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_RANGES.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setSelectedPreset(preset.key)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                selectedPreset === preset.key
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/10 bg-transparent text-muted hover:border-white/20 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {selectedPreset === 'custom' && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">開始日</span>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="app-input w-44 px-3 py-2 text-xs"
              />
            </label>
            <span>〜</span>
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">終了日</span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="app-input w-44 px-3 py-2 text-xs"
              />
            </label>
            <p className="text-xs text-muted">
              ※ 期間を変更すると自動的にグラフに反映されます
            </p>
          </div>
        )}
      </section>

      <section className="app-card p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">RRS & MAS 推移</h2>
            <p className="mt-1 text-xs text-muted">
              直近のスコア推移を可視化。カーソルを合わせると日付ごとの値を確認できます。
            </p>
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

        {chartAvailable ? (
          <div className="relative mt-6 rounded-2xl border border-white/10 bg-surface-soft/60 p-4">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_DIMENSIONS.width} ${CHART_DIMENSIONS.height}`}
              className="h-40 w-full cursor-crosshair"
              preserveAspectRatio="none"
              onPointerMove={handlePointerMove}
              onPointerEnter={handlePointerMove}
              onPointerDown={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            >
              <defs>
                <linearGradient id="rrsAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={SCORE_COLOR_RRS} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={SCORE_COLOR_RRS} stopOpacity="0" />
                </linearGradient>
              </defs>

              {Array.from({ length: 5 }).map((_, index) => {
                const y = Number(((CHART_DIMENSIONS.height / 4) * index).toFixed(2))
                return (
                  <line
                    key={index}
                    x1={0}
                    y1={y}
                    x2={CHART_DIMENSIONS.width}
                    y2={y}
                    className="stroke-white/10"
                    strokeWidth={0.5}
                  />
                )
              })}

              {activeHoverIndex !== null && hoveredRrsPoint && (
                <line
                  x1={hoveredRrsPoint.x}
                  y1={0}
                  x2={hoveredRrsPoint.x}
                  y2={CHART_DIMENSIONS.height}
                  className="stroke-white/25"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}

              {rrsLine && (
                <>
                  <path d={rrsLine.areaPath} fill="url(#rrsAreaGradient)" stroke="none" />
                  <path d={rrsLine.linePath} fill="none" stroke={SCORE_COLOR_RRS} strokeWidth={3} />
                </>
              )}

              {masLine && (
                <path
                  d={masLine.linePath}
                  fill="none"
                  stroke={SCORE_COLOR_MAS}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                />
              )}

              {activeHoverIndex !== null && hoveredRrsPoint && (
                <circle
                  cx={hoveredRrsPoint.x}
                  cy={hoveredRrsPoint.y}
                  r={4.5}
                  fill={SCORE_COLOR_RRS}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}

              {activeHoverIndex !== null && hoveredMasPoint && (
                <circle
                  cx={hoveredMasPoint.x}
                  cy={hoveredMasPoint.y}
                  r={4.5}
                  fill={SCORE_COLOR_MAS}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )}
            </svg>

            {hoveredScore && (
              <div
                className="pointer-events-none absolute -top-20 min-w-[180px] rounded-2xl border border-white/20 bg-background/90 p-4 text-xs shadow-card"
                style={{ left: `clamp(8px, ${tooltipLeftPercent}%, calc(100% - 188px))` }}
              >
                <p className="text-muted">{toFullDateLabel(hoveredScore.date)}</p>
                <p className="mt-2 flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCORE_COLOR_RRS }} />
                    RRS
                  </span>
                  <span>{hoveredScore.rrs?.toFixed(2)}</span>
                </p>
                <p className="mt-1 flex items-center justify-between text-white">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SCORE_COLOR_MAS }} />
                    MAS
                  </span>
                  <span>{hoveredScore.mas?.toFixed(2)}</span>
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span>{chartRangeStart ? toDateLabel(chartRangeStart) : '--'}</span>
              <span>{chartRangeEnd ? toDateLabel(chartRangeEnd) : '--'}</span>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-surface-soft/60 p-6 text-center text-sm text-muted">
            RRSとMASのデータが十分ではありません。日次のメトリクスを入力してスコアを蓄積しましょう。
          </div>
        )}

        {hoveredScore && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted">
            <div>
              RRS:{' '}
              <span className="font-semibold text-white">
                {hoveredScore.rrs !== null ? hoveredScore.rrs.toFixed(2) : '--'}
              </span>
            </div>
            <div>
              MAS:{' '}
              <span className="font-semibold text-white">
                {hoveredScore.mas !== null ? hoveredScore.mas.toFixed(2) : '--'}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="app-card p-8">
        {activeMetrics.length >= 4 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metricCards.map((card) => (
              <div key={card.key} className="rounded-2xl border border-white/10 bg-surface-soft/70 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">{card.label}</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-semibold text-white">
                    {card.lastAvg !== null ? `${card.lastAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                  </p>
                  <p className="text-xs text-muted">直近平均</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  前週比:{' '}
                  <span className={`font-semibold ${card.deltaClass}`}>
                    {card.deltaLabel}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  先週平均:{' '}
                  {card.prevAvg !== null ? `${card.prevAvg.toFixed(card.precision)} ${card.unit}` : '--'}
                </p>
                {card.spark && (
                  <div className="mt-4">
                    <svg
                      viewBox={`0 0 ${METRIC_CHART_DIMENSIONS.width} ${METRIC_CHART_DIMENSIONS.height}`}
                      className="h-16 w-full"
                      preserveAspectRatio="none"
                    >
                      <path d={card.spark.areaPath} fill={card.accent} fillOpacity={0.15} />
                      <path d={card.spark.linePath} fill="none" stroke={card.accent} strokeWidth={2.5} />
                      {card.spark.points.length > 0 && (
                        <circle
                          cx={card.spark.points[card.spark.points.length - 1].x}
                          cy={card.spark.points[card.spark.points.length - 1].y}
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
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
            指標の比較には最低4日分のデータが必要です。日次の入力を継続しましょう。
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="app-card p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">スコア履歴</h2>
            <span className="text-xs text-muted">
              {activeScores.length ? `${Math.min(activeScores.length, 21)}件を表示` : 'データなし'}
            </span>
          </div>
          {activeScores.length > 0 ? (
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
                  {scoreTableRows.map((score) => (
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
              スコア履歴がまだありません。日次のメトリクスを入力してスコアを生成しましょう。
            </div>
          )}
        </section>

        <section className="app-card p-8">
          <h2 className="text-lg font-semibold text-white">生体指標タイムライン</h2>
          {activeMetrics.length > 0 ? (
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-2">
              {timelineMetrics.map((metric) => (
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
        </section>
      </div>
    </div>
  )
}

