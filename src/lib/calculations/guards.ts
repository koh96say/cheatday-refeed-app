import { MetricDaily } from '@/types'

export interface GuardFlags {
  feverLike: boolean
  acuteWeightGain: boolean
}

export function evaluateGuardFlags(latestMetric: Partial<MetricDaily> | null, metricsHistory: MetricDaily[]): GuardFlags {
  const feverLike = Boolean(latestMetric?.temp_c && latestMetric.temp_c >= 37.5)

  const weightSeries = metricsHistory
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

  return {
    feverLike,
    acuteWeightGain,
  }
}

export function shouldSuppressRecommendation(flags: GuardFlags) {
  return flags.feverLike || flags.acuteWeightGain
}


