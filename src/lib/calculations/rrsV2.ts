'use client'

import { MetricDaily } from '@/types'

type ZSeriesKey = 'temp_c' | 'rhr_bpm'

export interface RRSv2Input {
  today: string
  mas: number
  plateauFlag: boolean
  deficitStreak: number
  trainingLoadFactor: number
  lastRefeedDate?: string | null
  refeedEffectWindow?: number | null
  metrics?: MetricDaily[]
  zSeries?: Partial<Record<ZSeriesKey, Array<{ date: string; z: number }>>>
}

export interface RRSv2Result {
  rrs: number
  rrsInput: number
  cooldown: number
  response: number
  hardLocked: boolean
  effectiveWindow: number
  observedDays: number
  displayRrs: number
  effectiveRrs: number
  thresholdOn: number
  thresholdOff: number
  thresholdDelta: number
}

const DEFAULT_EFFECT_WINDOW = 9
const MIN_GAP_DAYS = 3
const SIGMOID_K = 2
const SIGMOID_X0 = 0.5

const COEFFICIENTS = {
  mas: 1.0,
  plateau: 0.7,
  deficit: 0.3,
  training: 0.2,
  cooldown: 1.6,
  response: 0.6,
}

const NORMALISERS = {
  temp: 0.3,
  rhr: 0.5,
}

const WEIGHTS = {
  temp: 0.6,
  rhr: 0.4,
}

const THRESHOLDS = {
  on: 0.71,
  off: 0.65,
  delta: 0.03,
}

const LOCK_PENALTY = 2.5

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function daysBetween(a: string, b: string) {
  const start = new Date(a + 'T00:00:00')
  const end = new Date(b + 'T00:00:00')
  const diff = end.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function dateWithOffset(base: string, offset: number) {
  const date = new Date(base + 'T00:00:00')
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-SIGMOID_K * (x - SIGMOID_X0)))
}

function sortMetrics(metrics: MetricDaily[]) {
  return metrics.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
}

function computeBaseline(values: number[]) {
  if (!values.length) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length - 1, 1)
  const sd = Math.sqrt(Math.max(variance, 1e-6))
  return { mean, sd }
}

function computeZFromMetrics(metrics: MetricDaily[], key: ZSeriesKey) {
  const sorted = sortMetrics(metrics)
  const series: Array<{ date: string; z: number }> = []
  const values = sorted
    .map((item) => item[key])
    .filter((value): value is number => value !== null && value !== undefined)
  const windowed = values.slice(-28)
  const baseline = computeBaseline(windowed.length ? windowed : values)
  if (!baseline) {
    return series
  }

  const { mean, sd } = baseline
  sorted.forEach((metric) => {
    const raw = metric[key]
    if (raw === null || raw === undefined) return
    const z = (raw - mean) / (sd || 1)
    series.push({ date: metric.date, z })
  })
  return series
}

function buildZSeries(metrics: MetricDaily[] | undefined, existing?: RRSv2Input['zSeries']) {
  const result: Partial<Record<ZSeriesKey, Array<{ date: string; z: number }>>> = {
    temp_c: [],
    rhr_bpm: [],
  }

  if (existing?.temp_c?.length) {
    result.temp_c = existing.temp_c
  } else if (metrics) {
    result.temp_c = computeZFromMetrics(metrics, 'temp_c')
  }

  if (existing?.rhr_bpm?.length) {
    result.rhr_bpm = existing.rhr_bpm
  } else if (metrics) {
    result.rhr_bpm = computeZFromMetrics(metrics, 'rhr_bpm')
  }

  return result
}

function average(series: Array<{ date: string; z: number }>, start: string, end: string) {
  const startDate = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  const filtered = series.filter((point) => {
    const pointDate = new Date(point.date + 'T00:00:00')
    return pointDate >= startDate && pointDate <= endDate
  })

  if (!filtered.length) {
    return { value: null, count: 0 }
  }

  const value =
    filtered.reduce((sum, point) => sum + point.z, 0) / Math.max(filtered.length, 1)
  return { value, count: filtered.length }
}

function computeRefeedResponse(
  series: Partial<Record<ZSeriesKey, Array<{ date: string; z: number }>>>,
  refeedDate: string
) {
  const preStart = dateWithOffset(refeedDate, -2)
  const preEnd = refeedDate
  const postStart = dateWithOffset(refeedDate, 1)
  const postEnd = dateWithOffset(refeedDate, 3)

  const tempSeries = series.temp_c ?? []
  const rhrSeries = series.rhr_bpm ?? []

  const preTemp = average(tempSeries, preStart, preEnd)
  const postTemp = average(tempSeries, postStart, postEnd)
  const preRhr = average(rhrSeries, preStart, preEnd)
  const postRhr = average(rhrSeries, postStart, postEnd)

  const observedDays = Math.max(postTemp.count, postRhr.count)
  if (observedDays < 2) {
    return { response: 0, observedDays, extendedWindow: 2 }
  }

  const deltaTemp =
    postTemp.value !== null && preTemp.value !== null ? postTemp.value - preTemp.value : 0
  const deltaRhr =
    postRhr.value !== null && preRhr.value !== null ? postRhr.value - preRhr.value : 0

  const gTemp = clamp(deltaTemp / NORMALISERS.temp, -2, 2)
  const gRhr = clamp(-deltaRhr / NORMALISERS.rhr, -2, 2)

  const weighted =
    (WEIGHTS.temp * gTemp + WEIGHTS.rhr * gRhr) / (WEIGHTS.temp + WEIGHTS.rhr)
  const response = clamp(weighted, -0.5, 0.5)

  return { response, observedDays, extendedWindow: 0 }
}

export function computeRRSv2(input: RRSv2Input): RRSv2Result {
  const {
    today,
    mas,
    plateauFlag,
    deficitStreak,
    trainingLoadFactor,
    lastRefeedDate,
    refeedEffectWindow,
    metrics,
    zSeries,
  } = input

  const series = buildZSeries(metrics, zSeries)

  const hasRefeed = Boolean(lastRefeedDate)
  const baseWindow = refeedEffectWindow ?? DEFAULT_EFFECT_WINDOW
  let effectiveWindow = baseWindow

  let daysSinceRefeed = Infinity
  if (lastRefeedDate) {
    daysSinceRefeed = Math.max(daysBetween(lastRefeedDate, today), 0)
  }

  const hardLocked = hasRefeed && daysSinceRefeed < MIN_GAP_DAYS
  const cooldown = hasRefeed
    ? clamp(1 - daysSinceRefeed / effectiveWindow, 0, 1)
    : 0

  let response = 0
  let observedDays = 0

  if (hasRefeed && lastRefeedDate) {
    const { response: computed, observedDays: observed, extendedWindow } = computeRefeedResponse(
      series,
      lastRefeedDate
    )
    response = computed
    observedDays = observed
    if (extendedWindow > 0) {
      effectiveWindow += extendedWindow
    }
  }

  let deficitUsed = deficitStreak
  if (hasRefeed && daysSinceRefeed >= 0 && daysSinceRefeed < 3) {
    deficitUsed *= 0.5
  }
  const normalizedDeficit = clamp(deficitUsed / 14, 0, 1)
  const baseInput =
    COEFFICIENTS.mas * mas +
    COEFFICIENTS.plateau * (plateauFlag ? 1 : 0) +
    COEFFICIENTS.deficit * normalizedDeficit +
    COEFFICIENTS.training * trainingLoadFactor

  const adjusted =
    baseInput -
    COEFFICIENTS.cooldown * cooldown +
    COEFFICIENTS.response * response

  const rrs = hardLocked ? 0 : sigmoid(adjusted)
  const inCooldown = cooldown > 0
  const displayRrs = inCooldown ? Math.min(rrs, THRESHOLDS.on - 0.01) : rrs

  const effectiveInput = inCooldown ? adjusted - LOCK_PENALTY : adjusted
  const effectiveRrs = hardLocked ? 0 : sigmoid(effectiveInput)

  return {
    rrs,
    rrsInput: adjusted,
    cooldown,
    response,
    hardLocked,
    effectiveWindow,
    observedDays,
    displayRrs,
    effectiveRrs,
    thresholdOn: THRESHOLDS.on,
    thresholdOff: THRESHOLDS.off,
    thresholdDelta: THRESHOLDS.delta,
  }
}


