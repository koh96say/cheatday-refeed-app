'use client'

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
const METRIC_CHART_DIMENSIONS = { width: 320, height: 96 }
const SCORE_CHART_PADDING_X = 16
const SCORE_CHART_PADDING_Y = 12
const METRIC_CHART_PADDING_X = 14
const METRIC_CHART_PADDING_Y = 10
const SCORE_COLOR_RRS = '#4C6EF5'
const SCORE_COLOR_MAS = '#A855F7'

type SparklineOptions = {
  width?: number
  height?: number
  min?: number
  max?: number
  paddingX?: number
  paddingY?: number
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
  const paddingX = Math.min(options.paddingX ?? 0, width / 2)
  const paddingY = Math.min(options.paddingY ?? 8, height / 2)

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

  const baseMin = options.min ?? Math.min(...numericValues)
  const baseMax = options.max ?? Math.max(...numericValues)
  const baseRange = baseMax - baseMin
  const paddingRange = baseRange === 0 ? Math.max(Math.abs(baseMin) * 0.1, 0.5) : baseRange * 0.1
  const minValue = baseMin - paddingRange
  const maxValue = baseMax + paddingRange
  const range = maxValue - minValue || 1
  const usableWidth = Math.max(width - paddingX * 2, 1)
  const drawableHeight = Math.max(height - paddingY * 2, 1)
  const denominator = numericValues.length - 1 || 1
  const step = usableWidth / denominator

  const points: SparklinePoint[] = numericValues.map((value, index) => {
    const isLast = index === numericValues.length - 1
    const x = Number(
      (isLast ? width - paddingX : paddingX + index * step).toFixed(2)
    )
    const normalized = (value - minValue) / range
    const y = Number((paddingY + (1 - normalized) * drawableHeight).toFixed(2))
    return { x, y }
  })

  let linePath = ''
  points.forEach((point, index) => {
    linePath += `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `
  })

  const baselineY = Number((height - paddingY).toFixed(2))
  let areaPath = `M ${paddingX} ${baselineY} `
  points.forEach((point) => {
    areaPath += `L ${point.x} ${point.y} `
  })
  areaPath += `L ${width - paddingX} ${baselineY} L ${paddingX} ${baselineY} Z`

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
  executedRecommendationDates?: string[]
}

export function TrendInsights({
  metrics,
  scores,
  executedRecommendationDates = [],
}: TrendInsightsProps) {
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
  const [isScoreHovering, setIsScoreHovering] = useState(false)
  const [metricHoverIndex, setMetricHoverIndex] = useState<Record<string, number>>({})
  const [metricHovering, setMetricHovering] = useState<Record<string, boolean>>({})
  const sparkRefs = useRef<Record<string, SVGSVGElement | null>>({})
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [timelineMode, setTimelineMode] = useState<'text' | 'chart'>('text')

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
            paddingX: SCORE_CHART_PADDING_X,
            paddingY: SCORE_CHART_PADDING_Y,
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
            paddingX: SCORE_CHART_PADDING_X,
            paddingY: SCORE_CHART_PADDING_Y,
          })
        : null,
    [scoreSeries, chartMin, chartMax]
  )

  const chartAvailable = Boolean(rrsLine && masLine && scoreSeries.length >= 2)
  const fallbackScore = scoreSeries.length ? scoreSeries[scoreSeries.length - 1] : null
  const activeHoverIndex = isScoreHovering ? hoverIndex : null
  const hoveredScore = activeHoverIndex !== null ? scoreSeries[activeHoverIndex] : null
  const summaryScore = hoveredScore ?? fallbackScore
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
    const paddingRatio = SCORE_CHART_PADDING_X / CHART_DIMENSIONS.width
    const usableRatio = Math.max(1 - paddingRatio * 2, 0.0001)
    const normalized = (x / rect.width - paddingRatio) / usableRatio
    const clamped = Math.min(Math.max(normalized, 0), 1)
    const index = Math.round(clamped * (scoreSeries.length - 1))
    setHoverIndex(index)
    setIsScoreHovering(true)
  }

  const handlePointerLeave = () => {
    setHoverIndex(null)
    setIsScoreHovering(false)
  }

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

  const executedDateSet = useMemo(() => {
    const set = new Set<string>()
    executedRecommendationDates.forEach((date) => {
      if (date) {
        set.add(date)
      }
    })
    return set
  }, [executedRecommendationDates])

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

      const trimmedMetrics = reversedMetrics.slice(0, 21)
      const orderedMetrics = trimmedMetrics.slice().reverse()
      const valuePairs = orderedMetrics
        .map((metric) => {
          const rawValue = metric[card.key] as number | null | undefined
          const transformed = applyTransform(rawValue, card.transform)
          if (transformed === null || Number.isNaN(transformed)) {
            return null
          }
          return {
            date: metric.date,
            value: transformed,
          }
        })
        .filter(
          (entry): entry is { date: string; value: number } =>
            entry !== null && Number.isFinite(entry.value)
        )

      const seriesValues = valuePairs.map((entry) => entry.value)
      const seriesDates = valuePairs.map((entry) => entry.date)
      const executedFlags = seriesDates.map((date) => executedDateSet.has(date))

      const spark = createSparklineData(seriesValues, {
        width: METRIC_CHART_DIMENSIONS.width,
        height: METRIC_CHART_DIMENSIONS.height,
        paddingX: METRIC_CHART_PADDING_X,
        paddingY: METRIC_CHART_PADDING_Y,
      })

      return {
        ...card,
        lastAvg,
        prevAvg,
        deltaLabel,
        deltaClass,
        spark,
        seriesValues,
        seriesDates,
        executedFlags,
      }
    })
  }, [activeMetrics, executedDateSet])

type TimelinePoint = {
  x: number
  value: number
  label: string
}

type TimelineMetricSeries = {
  key: keyof MetricDaily
  label: string
  unit: string
  color: string
  values: TimelinePoint[]
  min: number
  max: number
}

  const timelineMetrics = useMemo(() => {
    return activeMetrics
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 21)
  }, [activeMetrics])

const timelineSeries: TimelineMetricSeries[] = useMemo(() => {
  const reversed = timelineMetrics.slice().reverse()
  if (reversed.length === 0) return []

  const buildSeries = (key: keyof MetricDaily, label: string, unit: string, color: string, transform?: (value: number) => number) => {
    const points: TimelinePoint[] = []
    reversed.forEach((metric, index) => {
      const raw = metric[key] as number | null | undefined
      if (raw !== null && raw !== undefined) {
        const value = transform ? transform(raw) : raw
        points.push({
          x: index,
          value,
          label: metric.date,
        })
      }
    })

    if (!points.length) {
      return null
    }

    const values = points.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)

    return {
      key,
      label,
      unit,
      color,
      values: points,
      min,
      max,
    }
  }

  return [
    buildSeries('weight_kg', '体重', 'kg', '#4C6EF5'),
    buildSeries('rhr_bpm', 'RHR', 'bpm', '#F97316'),
    buildSeries('temp_c', '体温', '℃', '#FBBF24'),
    buildSeries('sleep_min', '睡眠', 'h', '#34D399', (value) => value / 60),
    buildSeries('fatigue_1_5', '疲労', '', '#F472B6'),
    buildSeries('training_load', '負荷', '', '#38BDF8'),
  ].filter((series): series is TimelineMetricSeries => Boolean(series))
}, [timelineMetrics])

  const scoreTableRows = useMemo(() => activeScores.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 21), [activeScores])

  const chartRangeStart = scoreSeries[0]?.date
  const chartRangeEnd = scoreSeries[scoreSeries.length - 1]?.date

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Progress</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">プログレス</h1>
          <p className="mt-2 text-sm text-muted">
            選択した期間内のメトリクスとスコアの推移を可視化し、コンディションのプログレスを確認しましょう。
          </p>
        </div>
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

        {summaryScore && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-muted">
            <div>
              RRS:{' '}
              <span className="font-semibold text-white">
                {summaryScore.rrs !== null ? summaryScore.rrs.toFixed(2) : '--'}
              </span>
            </div>
            <div>
              MAS:{' '}
              <span className="font-semibold text-white">
                {summaryScore.mas !== null ? summaryScore.mas.toFixed(2) : '--'}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="app-card p-8">
        {activeMetrics.length >= 4 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metricCards.map((card) => {
              const hovering = metricHovering[card.key] ?? false
              const dataLength = card.seriesValues.length
              const hoverIdx = hovering
                ? Math.min(metricHoverIndex[card.key] ?? dataLength - 1, dataLength - 1)
                : null
              const hoverValue = hoverIdx !== null ? card.seriesValues[hoverIdx] : null
              const hoverDate = hoverIdx !== null ? card.seriesDates[hoverIdx] : null
              const hoverPoint =
                hoverIdx !== null && card.spark ? card.spark.points[hoverIdx] : undefined

              return (
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
                  {card.spark && dataLength > 0 && (
                    <div className="relative mt-4">
                    <svg
                        ref={(node) => {
                          sparkRefs.current[card.key] = node
                        }}
                      viewBox={`0 0 ${METRIC_CHART_DIMENSIONS.width} ${METRIC_CHART_DIMENSIONS.height}`}
                        className="h-24 w-full cursor-crosshair"
                      preserveAspectRatio="none"
                        onPointerMove={(event) => {
                          const ref = sparkRefs.current[card.key]
                          if (!ref) return
                          const rect = ref.getBoundingClientRect()
                          const x = event.clientX - rect.left
                          const paddingRatio = METRIC_CHART_PADDING_X / METRIC_CHART_DIMENSIONS.width
                          const usableRatio = Math.max(1 - paddingRatio * 2, 0.0001)
                          const normalized = (x / rect.width - paddingRatio) / usableRatio
                          const clamped = Math.min(Math.max(normalized, 0), 1)
                          const index = Math.round(clamped * (dataLength - 1))
                          setMetricHoverIndex((prev) => ({ ...prev, [card.key]: index }))
                          setMetricHovering((prev) => ({ ...prev, [card.key]: true }))
                        }}
                        onPointerLeave={() => {
                          setMetricHovering((prev) => ({ ...prev, [card.key]: false }))
                        }}
                    >
                      <path d={card.spark.areaPath} fill={card.accent} fillOpacity={0.15} />
                      <path d={card.spark.linePath} fill="none" stroke={card.accent} strokeWidth={2.5} />
                      {card.spark.points.map((point, idx) => {
                        if (!card.executedFlags[idx]) {
                          return null
                        }
                        const dateLabel = card.seriesDates[idx]
                        return (
                          <g key={`executed-${card.key}-${dateLabel}`}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={6}
                              fill="none"
                              stroke="#FACC15"
                              strokeWidth={1.4}
                              strokeDasharray="2 2"
                            />
                            <circle cx={point.x} cy={point.y} r={3} fill="#FACC15" />
                            <title>{`リフィード実施日: ${toDateLabel(dateLabel)}`}</title>
                          </g>
                        )
                      })}
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
                        {hoverIdx !== null && hoverPoint && (
                          <>
                            <line
                              x1={hoverPoint.x}
                              y1={0}
                              x2={hoverPoint.x}
                              y2={METRIC_CHART_DIMENSIONS.height}
                              className="stroke-white/20"
                              strokeWidth={1}
                              strokeDasharray="4 4"
                            />
                            <circle
                              cx={hoverPoint.x}
                              cy={hoverPoint.y}
                              r={3.5}
                              fill={card.accent}
                              stroke="#FFFFFF"
                              strokeWidth={1.2}
                            />
                          </>
                        )}
                    </svg>
                      {hoverIdx !== null && hoverValue !== null && hoverDate && (
                        <div
                          className="pointer-events-none absolute -top-16 min-w-[160px] rounded-xl border border-white/15 bg-background/90 px-4 py-3 text-xs shadow-card"
                          style={{
                            left: `clamp(8px, ${
                              ((hoverPoint?.x ?? 0) / METRIC_CHART_DIMENSIONS.width) * 100
                            }%, calc(100% - 168px))`,
                          }}
                        >
                          <p className="text-muted">{toDateLabel(hoverDate)}</p>
                          <p className="mt-2 flex items-center justify-between text-white">
                            <span>値</span>
                            <span>
                              {hoverValue.toFixed(card.precision)} {card.unit}
                            </span>
                          </p>
                          {card.executedFlags[hoverIdx] && (
                            <p className="mt-1 text-[11px] font-medium text-warning">
                              リフィード実施日
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
              )
            })}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">生体指標タイムライン</h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTimelineMode('text')}
                className={`rounded-full border px-4 py-2 font-medium transition ${
                  timelineMode === 'text'
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/10 bg-transparent text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                リスト表示
              </button>
              <button
                type="button"
                onClick={() => setTimelineMode('chart')}
                className={`rounded-full border px-4 py-2 font-medium transition ${
                  timelineMode === 'chart'
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/10 bg-transparent text-muted hover:border-white/20 hover:text-white'
                }`}
              >
                グラフ表示
              </button>
            </div>
          </div>

          {timelineMode === 'text' ? (
            activeMetrics.length > 0 ? (
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-2">
                {timelineMetrics.map((metric) => {
                  const executed = executedDateSet.has(metric.date)
                  return (
                    <div
                      key={metric.date}
                      className={`rounded-2xl border bg-surface-soft/70 p-4 ${
                        executed ? 'border-warning/60 ring-1 ring-warning/20' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{toDateLabel(metric.date)}</p>
                        {executed && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-[11px] font-semibold text-warning">
                            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                            リフィード実施
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                        <span>体重: {metric.weight_kg ?? '--'} kg</span>
                        <span>RHR: {metric.rhr_bpm ?? '--'} bpm</span>
                        <span>体温: {metric.temp_c ?? '--'} ℃</span>
                        <span>睡眠: {metric.sleep_min ? (metric.sleep_min / 60).toFixed(1) : '--'} h</span>
                        <span>疲労: {metric.fatigue_1_5 ?? '--'}</span>
                        <span>負荷: {metric.training_load ?? '--'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-surface-soft/70 p-8 text-center text-sm text-muted">
                日次メトリクスがまだありません。まずは入力を行いましょう。
              </div>
            )
          ) : timelineSeries.length > 0 ? (
            <div className="mt-6 space-y-6">
              {timelineSeries.map((series) => {
                const seriesPaddingX = 16
                const seriesPaddingY = 12
                const seriesWidth = 520
                const seriesHeight = 96
                const usableWidth = seriesWidth - seriesPaddingX * 2
                const usableHeight = seriesHeight - seriesPaddingY * 2
                const minValue = series.min
                const maxValue = series.max
                const range = maxValue - minValue || 1
                const step = series.values.length > 1 ? usableWidth / (series.values.length - 1) : 0

                const points = series.values.map((point, index) => {
                  const x = seriesPaddingX + index * step
                  const normalized = (point.value - minValue) / range
                  const y = seriesPaddingY + (1 - normalized) * usableHeight
                  return { ...point, x, y }
                })

                const latestPoint = points.at(-1)
                const latestExecuted = latestPoint ? executedDateSet.has(latestPoint.label) : false

                return (
                  <div key={series.key} className="rounded-2xl border border-white/5 bg-surface-soft/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {series.label}{' '}
                          <span className="text-xs text-muted">
                            ({minValue.toFixed(1)} - {maxValue.toFixed(1)} {series.unit})
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-4">
                      <svg viewBox={`0 0 ${seriesWidth} ${seriesHeight}`} className="h-28 w-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`timeline-${series.key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={series.color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={series.color} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <rect
                          x={seriesPaddingX}
                          y={seriesPaddingY}
                          width={usableWidth}
                          height={usableHeight}
                          rx={12}
                          className="fill-none stroke-white/10"
                        />
                        {[0.25, 0.5, 0.75].map((fraction) => (
                          <line
                            key={fraction}
                            x1={seriesPaddingX}
                            x2={seriesWidth - seriesPaddingX}
                            y1={seriesPaddingY + fraction * usableHeight}
                            y2={seriesPaddingY + fraction * usableHeight}
                            className="stroke-white/5"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                          />
                        ))}

                        <path
                          d={`M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`}
                          fill="none"
                          stroke={series.color}
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={`M ${seriesPaddingX} ${seriesHeight - seriesPaddingY} L ${points
                            .map((point) => `${point.x} ${point.y}`)
                            .join(' L ')} L ${seriesWidth - seriesPaddingX} ${seriesHeight - seriesPaddingY} Z`}
                          fill={`url(#timeline-${series.key})`}
                        />
                        {points.map((point) => {
                          const executed = executedDateSet.has(point.label)
                          return (
                            <g key={point.label}>
                              {executed && (
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={7}
                                  fill="none"
                                  stroke="#FACC15"
                                  strokeWidth={1.4}
                                  strokeDasharray="2 2"
                                />
                              )}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={4}
                                fill={executed ? '#FACC15' : series.color}
                                stroke="#ffffff"
                                strokeWidth={1.5}
                              >
                                <title>
                                  {`${toDateLabel(point.label)}: ${point.value.toFixed(2)} ${series.unit}${
                                    executed ? '（リフィード実施）' : ''
                                  }`}
                                </title>
                              </circle>
                            </g>
                          )
                        })}
                      </svg>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted">
                        <span>
                          最新: {latestPoint?.value.toFixed(2)} {series.unit}
                          {latestExecuted && <span className="ml-1 font-semibold text-warning">• リフィード実施</span>}
                        </span>
                        <span>
                          変化:{' '}
                          {(points.at(-1)?.value ?? 0 - (points[0]?.value ?? 0) >= 0 ? '+' : '') +
                            ((points.at(-1)?.value ?? 0) - (points[0]?.value ?? 0)).toFixed(2)}{' '}
                          {series.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
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

