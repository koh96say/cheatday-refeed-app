import { MetricDaily } from '@/types'

type NumericMetricKey = 'temp_c' | 'rhr_bpm' | 'hrv_ms' | 'sleep_min' | 'fatigue_1_5'

interface BaselineStats {
  mean: number
  sd: number
}

export interface ScoreCalculationInput {
  metrics: MetricDaily[]
  estimatedTdee?: number | null
  bodyWeightKg?: number | null
}

export interface ScoreCalculationResult {
  mas: number
  rrs: number
  plateauFlag: boolean
  deficitStreak: number
  trainingLoadFactor: number
  zScores: Partial<Record<NumericMetricKey, number>>
}

const SIGMOID_K = 2
const SIGMOID_X0 = 0.5
const COEFFICIENTS = {
  a: 1.2,
  b: 0.8,
  c: 0.5,
  d: 0.3,
}

type MetricConfig = {
  weight: number
  polarity: 1 | -1
  sdFloor: number
}

const METRIC_CONFIG: Record<NumericMetricKey, MetricConfig> = {
  temp_c: { weight: 0.35, polarity: -1, sdFloor: 0.1 },
  rhr_bpm: { weight: 0.25, polarity: 1, sdFloor: 2 },
  hrv_ms: { weight: 0.15, polarity: -1, sdFloor: 10 },
  sleep_min: { weight: 0.15, polarity: -1, sdFloor: 30 },
  fatigue_1_5: { weight: 0.1, polarity: 1, sdFloor: 0.5 },
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function sortedMetrics(metrics: MetricDaily[]) {
  return metrics
    .slice()
    .filter((metric) => metric.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

function computeBaselineStats(values: number[]): BaselineStats | null {
  if (values.length === 0) {
    return null
  }

  if (values.length === 1) {
    return {
      mean: values[0],
      sd: Math.max(Math.abs(values[0]) * 0.05, 1e-6),
    }
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1)
  const sd = Math.sqrt(Math.max(variance, 1e-6))

  return { mean, sd }
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values
  const stats = computeBaselineStats(values)
  if (!stats) return values

  const threshold = 3 * stats.sd
  return values.filter((value) => Math.abs(value - stats.mean) <= threshold)
}

function calculateZScore(value: number | null, stats: BaselineStats | null) {
  if (value === null || value === undefined || !stats) return 0
  const safeSd = stats.sd || 1
  return (value - stats.mean) / safeSd
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0
  }
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function mad(values: number[], med: number) {
  if (values.length === 0) {
    return 0
  }
  const deviations = values.map((value) => Math.abs(value - med))
  return median(deviations)
}

function computeRobustZ(
  orderedMetrics: MetricDaily[],
  key: NumericMetricKey,
  config: MetricConfig
) {
  const allValues = orderedMetrics
    .map((metric) => metric[key])
    .filter((value): value is number => value !== null && value !== undefined)

  if (allValues.length === 0) {
    return { z: 0, hasValue: false }
  }

  const windowValues = allValues.slice(-28)
  const med = median(windowValues)
  const madValue = mad(windowValues, med)
  const scale = Math.max(1.4826 * madValue, config.sdFloor)

  const latestValue = orderedMetrics.at(-1)?.[key]
  if (latestValue === null || latestValue === undefined) {
    return { z: 0, hasValue: false }
  }

  const rawZ = (latestValue - med) / (scale || config.sdFloor)
  const z = clamp(rawZ, -2.5, 2.5)

  return { z, hasValue: true }
}

function computeSevenDaySlope(weights: { x: number; y: number }[]) {
  const n = weights.length
  const sumX = weights.reduce((acc, point) => acc + point.x, 0)
  const sumY = weights.reduce((acc, point) => acc + point.y, 0)
  const sumXY = weights.reduce((acc, point) => acc + point.x * point.y, 0)
  const sumX2 = weights.reduce((acc, point) => acc + point.x ** 2, 0)

  const denominator = n * sumX2 - sumX ** 2
  if (denominator === 0) return 0

  return (n * sumXY - sumX * sumY) / denominator
}

function calculatePlateauFlag(metrics: MetricDaily[]) {
  const weightMetrics = metrics
    .filter((metric) => metric.weight_kg !== null && metric.weight_kg !== undefined)
    .map((metric) => ({ date: metric.date, weight: metric.weight_kg! }))

  if (weightMetrics.length < 7) {
    return false
  }

  const lastSeven = weightMetrics.slice(-7)
  const slopePoints = lastSeven.map((metric, index) => ({ x: index, y: metric.weight }))
  const slope = computeSevenDaySlope(slopePoints)
  const avgWeight = lastSeven.reduce((sum, metric) => sum + metric.weight, 0) / lastSeven.length
  const slopePercentPerDay = avgWeight > 0 ? slope / avgWeight : 0

  let weeklyDropPercent = -Infinity
  if (weightMetrics.length >= 14) {
    const previous = weightMetrics.slice(-14, -7)
    const prevAvg = previous.reduce((sum, metric) => sum + metric.weight, 0) / previous.length
    const currentAvg = avgWeight
    weeklyDropPercent = prevAvg > 0 ? ((prevAvg - currentAvg) / prevAvg) * 100 : -Infinity
  }

  const slopeCondition = slopePercentPerDay >= -0.0002 // -0.02%/日
  const weeklyDropCondition = weeklyDropPercent > -0.5

  return slopeCondition && weeklyDropCondition
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-SIGMOID_K * (x - SIGMOID_X0)))
}

function computeDeficitStreak(metrics: MetricDaily[], estimatedTdee?: number | null) {
  let streak = 0
  const reversed = metrics.slice().reverse()

  for (const metric of reversed) {
    const target = metric.energy_expenditure_kcal ?? estimatedTdee
    const intake = metric.calorie_intake_kcal
    if (!target || !intake) {
      break
    }

    const deficit = target - intake
    if (deficit > 300) {
      streak += 1
    } else {
      break
    }
  }

  return streak
}

function computeTrainingLoadFactor(metrics: MetricDaily[]) {
  const lastSeven = metrics
    .slice()
    .reverse()
    .filter((metric) => metric.training_load !== null && metric.training_load !== undefined)
    .slice(0, 7)

  if (lastSeven.length === 0) return 0

  const averageLoad =
    lastSeven.reduce((sum, metric) => sum + (metric.training_load ?? 0), 0) / lastSeven.length

  // 週500 TSS相当を上限に正規化
  return Math.min(averageLoad / 500, 1)
}

export function calculateScores({
  metrics,
  estimatedTdee,
  bodyWeightKg,
}: ScoreCalculationInput): ScoreCalculationResult {
  const orderedMetrics = sortedMetrics(metrics)

  const metricKeys: NumericMetricKey[] = ['temp_c', 'rhr_bpm', 'hrv_ms', 'sleep_min', 'fatigue_1_5']
  const zScores: Partial<Record<NumericMetricKey, number>> = {}
  const effectiveWeights: Partial<Record<NumericMetricKey, number>> = {}

  let activeWeightSum = 0

  for (const key of metricKeys) {
    const config = METRIC_CONFIG[key]
    const { z, hasValue } = computeRobustZ(orderedMetrics, key, config)
    zScores[key] = hasValue ? z : 0

    if (hasValue) {
      effectiveWeights[key] = config.weight
      activeWeightSum += config.weight
    } else {
      effectiveWeights[key] = 0
    }
  }

  let mas = 0
  if (activeWeightSum > 0) {
    for (const key of metricKeys) {
      const config = METRIC_CONFIG[key]
      const normalizedWeight =
        activeWeightSum > 0 && effectiveWeights[key] ? effectiveWeights[key]! / activeWeightSum : 0
      const polarity = config.polarity
      const z = zScores[key] ?? 0
      mas += normalizedWeight * polarity * z
    }
  }

  mas = clamp(mas, -3, 3)

  const plateauFlag = calculatePlateauFlag(orderedMetrics)
  const deficitStreak = computeDeficitStreak(orderedMetrics, estimatedTdee)
  const trainingLoadFactor = computeTrainingLoadFactor(orderedMetrics)

  const normalizedDeficit = Math.min(deficitStreak / 14, 1) // 2週間で最大化
  const scoreInput =
    COEFFICIENTS.a * mas +
    COEFFICIENTS.b * (plateauFlag ? 1 : 0) +
    COEFFICIENTS.c * normalizedDeficit +
    COEFFICIENTS.d * trainingLoadFactor

  const rrs = sigmoid(scoreInput)

  return {
    mas,
    rrs,
    plateauFlag,
    deficitStreak,
    trainingLoadFactor,
    zScores,
  }
}

export function computeRefeedTargets(options: {
  estimatedTdee?: number | null
  bodyWeightKg?: number | null
  multiplier?: number
}) {
  const { estimatedTdee, bodyWeightKg, multiplier = 0.2 } = options
  if (!estimatedTdee) {
    return null
  }

  const totalKcal = Math.round(estimatedTdee * (1 + multiplier))
  const extraKcal = totalKcal - estimatedTdee
  const extraCarbKcal = Math.round(extraKcal * 0.8)
  const carbGrams = Math.round(extraCarbKcal / 4)
  const proteinGrams =
    bodyWeightKg && bodyWeightKg > 0 ? Math.round(bodyWeightKg * 2) : Math.round((estimatedTdee * 0.25) / 4)

  const proteinKcal = proteinGrams * 4
  const carbKcal = carbGrams * 4
  const remainingKcal = Math.max(totalKcal - proteinKcal - carbKcal, Math.round(totalKcal * 0.1))
  const fatGrams = Math.round(remainingKcal / 9)

  return {
    kcal_total: totalKcal,
    carb_g: carbGrams,
    protein_g: proteinGrams,
    fat_g: fatGrams,
  }
}


