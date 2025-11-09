import { describe, expect, it } from 'vitest'
import { computeRRSv2 } from '@/lib/calculations/rrsV2'
import type { MetricDaily } from '@/types'

function buildMetric(date: string, overrides: Partial<MetricDaily> = {}): MetricDaily {
  return {
    id: 0,
    user_id: 'user',
    date,
    weight_kg: null,
    rhr_bpm: overrides.rhr_bpm ?? 60,
    temp_c: overrides.temp_c ?? 36.2,
    hrv_ms: overrides.hrv_ms ?? null,
    sleep_min: overrides.sleep_min ?? null,
    fatigue_1_5: overrides.fatigue_1_5 ?? null,
    training_load: overrides.training_load ?? null,
    calorie_intake_kcal: overrides.calorie_intake_kcal ?? null,
    energy_expenditure_kcal: overrides.energy_expenditure_kcal ?? null,
    notes: overrides.notes ?? null,
  }
}

describe('computeRRSv2', () => {
  it('returns reasonable score without refeed history', () => {
    const today = '2025-11-09'
    const metrics: MetricDaily[] = []

    const result = computeRRSv2({
      today,
      mas: 0.6,
      plateauFlag: true,
      deficitStreak: 8,
      trainingLoadFactor: 0.3,
      metrics,
    })

    expect(result.rrs).toBeGreaterThan(0)
    expect(result.rrs).toBeLessThanOrEqual(1)
    expect(result.cooldown).toBe(0)
    expect(result.response).toBe(0)
    expect(result.hardLocked).toBe(false)
  })

  it('applies hard lock within minimum gap days', () => {
    const today = '2025-11-09'
    const metrics: MetricDaily[] = []

    const result = computeRRSv2({
      today,
      mas: 0.9,
      plateauFlag: true,
      deficitStreak: 12,
      trainingLoadFactor: 0.6,
      lastRefeedDate: '2025-11-08',
      metrics,
    })

    expect(result.hardLocked).toBe(true)
    expect(result.rrs).toBe(0)
    expect(result.cooldown).toBeGreaterThan(0)
  })

  it('incorporates positive refeed response when data is available', () => {
    const today = '2025-11-12'
    const baseDate = '2025-11-04'
    const metrics: MetricDaily[] = []

    // Pre refeed days (D-2 to D0)
    metrics.push(buildMetric('2025-11-07', { temp_c: 36.0, rhr_bpm: 64 }))
    metrics.push(buildMetric('2025-11-08', { temp_c: 36.0, rhr_bpm: 64 }))
    metrics.push(buildMetric('2025-11-09', { temp_c: 36.0, rhr_bpm: 65 }))

    // Post refeed days (D+1 to D+3)
    metrics.push(buildMetric('2025-11-10', { temp_c: 36.3, rhr_bpm: 60 }))
    metrics.push(buildMetric('2025-11-11', { temp_c: 36.35, rhr_bpm: 60 }))
    metrics.push(buildMetric('2025-11-12', { temp_c: 36.4, rhr_bpm: 59 }))

    // Fill baseline window to avoid empty z-score calculations
    for (let i = 0; i < 10; i += 1) {
      const date = new Date(baseDate + 'T00:00:00')
      date.setDate(date.getDate() - i - 1)
      const iso = date.toISOString().slice(0, 10)
      metrics.push(buildMetric(iso, { temp_c: 36.0, rhr_bpm: 63 }))
    }

    const result = computeRRSv2({
      today,
      mas: 0.8,
      plateauFlag: true,
      deficitStreak: 10,
      trainingLoadFactor: 0.4,
      lastRefeedDate: '2025-11-09',
      metrics,
    })

    expect(result.hardLocked).toBe(false)
    expect(result.cooldown).toBeGreaterThan(0)
    expect(result.response).toBeGreaterThan(0)
    expect(result.rrs).toBeGreaterThan(0)
  })
})


