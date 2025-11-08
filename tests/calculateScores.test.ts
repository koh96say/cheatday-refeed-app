import { describe, it, expect } from 'vitest'
import { calculateScores, computeRefeedTargets } from '@/lib/calculations/rrs'
import type { MetricDaily } from '@/types'

function createMetric({
  date,
  weight,
  rhr,
  temp,
  hrv,
  sleep,
  fatigue,
  trainingLoad,
  intake,
  expenditure,
}: {
  date: string
  weight?: number
  rhr?: number
  temp?: number
  hrv?: number
  sleep?: number
  fatigue?: number
  trainingLoad?: number
  intake?: number
  expenditure?: number
}): MetricDaily {
  return {
    id: 0,
    user_id: 'test',
    date,
    weight_kg: weight ?? null,
    rhr_bpm: rhr ?? null,
    temp_c: temp ?? null,
    hrv_ms: hrv ?? null,
    sleep_min: sleep ?? null,
    fatigue_1_5: fatigue ?? null,
    training_load: trainingLoad ?? null,
    calorie_intake_kcal: intake ?? null,
    energy_expenditure_kcal: expenditure ?? null,
    notes: null,
  }
}

function generateDate(offset: number) {
  const base = new Date('2025-01-01T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + offset)
  return base.toISOString().slice(0, 10)
}

describe('calculateScores', () => {
  it('returns conservative RRS when metrics are stable', () => {
    const metrics: MetricDaily[] = Array.from({ length: 28 }, (_, index) =>
      createMetric({
        date: generateDate(index),
        weight: 68.5 - index * 0.05,
        rhr: 52 + (index > 20 ? 3 : 0),
        temp: 36.5 - (index > 20 ? 0.1 : 0),
        hrv: 65 - (index > 20 ? 5 : 0),
        sleep: 7.5 * 60,
        fatigue: index > 20 ? 4 : 2,
        trainingLoad: 80,
        intake: 1900,
        expenditure: 2300,
      })
    )

    const result = calculateScores({
      metrics,
      estimatedTdee: 2300,
      bodyWeightKg: metrics.at(-1)?.weight_kg ?? null,
    })

    expect(result.rrs).toBeGreaterThan(0)
    expect(result.rrs).toBeLessThan(1)
    expect(result.mas).toBeTypeOf('number')
    expect(result.deficitStreak).toBeGreaterThan(0)
  })

  it('detects plateau when weight loss stalls', () => {
    const metrics: MetricDaily[] = [
      ...Array.from({ length: 21 }, (_, index) =>
        createMetric({
          date: generateDate(index),
          weight: 70 - index * 0.1,
          rhr: 55,
          temp: 36.5,
          hrv: 70,
          sleep: 7 * 60,
          fatigue: 2,
          trainingLoad: 100,
          intake: 2000,
          expenditure: 2400,
        })
      ),
      ...Array.from({ length: 7 }, (_, index) =>
        createMetric({
          date: generateDate(index + 21),
          weight: 67.9 + index * 0.01,
          rhr: 58,
          temp: 36.3,
          hrv: 60,
          sleep: 6.5 * 60,
          fatigue: 3,
          trainingLoad: 110,
          intake: 1900,
          expenditure: 2400,
        })
      ),
    ]

    const result = calculateScores({
      metrics,
      estimatedTdee: 2400,
      bodyWeightKg: metrics.at(-1)?.weight_kg ?? null,
    })

    expect(result.plateauFlag).toBe(true)
    expect(result.rrs).toBeGreaterThan(0.5)
  })
})

describe('computeRefeedTargets', () => {
  it('returns macronutrient targets based on TDEE', () => {
    const targets = computeRefeedTargets({
      estimatedTdee: 2200,
      bodyWeightKg: 68,
      multiplier: 0.25,
    })

    expect(targets).not.toBeNull()
    expect(targets?.kcal_total).toBe(2750)
    expect(targets?.carb_g).toBeGreaterThan(0)
    expect(targets?.protein_g).toBeGreaterThan(0)
    expect(targets?.fat_g).toBeGreaterThan(0)
  })
})


