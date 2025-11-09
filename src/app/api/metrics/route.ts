import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import { calculateScores, computeRefeedTargets } from '@/lib/calculations/rrs'
import { evaluateGuardFlags, shouldSuppressRecommendation } from '@/lib/calculations/guards'

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function validateDate(value: unknown) {
  if (typeof value !== 'string') return false
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime())
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)

  if (!payload) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!validateDate(payload.date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }

  const weight = parseNumber(payload.weight_kg)
  const rhr = parseNumber(payload.rhr_bpm)
  const temp = parseNumber(payload.temp_c)

  if (weight === null || rhr === null || temp === null) {
    return NextResponse.json(
      { error: 'weight_kg, rhr_bpm and temp_c are required numeric values' },
      { status: 400 }
    )
  }

  const hrv = parseNumber(payload.hrv_ms)
  const sleep = parseNumber(payload.sleep_min)
  const fatigue = parseNumber(payload.fatigue_1_5)
  const trainingLoad = parseNumber(payload.training_load)
  const calorieIntake = parseNumber(payload.calorie_intake_kcal)
  const energyExpenditure = parseNumber(payload.energy_expenditure_kcal)
  const notes = typeof payload.notes === 'string' ? payload.notes.slice(0, 500) : null

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, _options: CookieOptions) {
          cookieStore.delete(name)
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('estimated_tdee')
    .eq('user_id', userRecord.id)
    .maybeSingle()

  const metricPayload = {
    user_id: userRecord.id,
    date: payload.date,
    weight_kg: weight,
    rhr_bpm: rhr,
    temp_c: temp,
    hrv_ms: hrv,
    sleep_min: sleep,
    fatigue_1_5: fatigue,
    training_load: trainingLoad,
    calorie_intake_kcal: calorieIntake,
    energy_expenditure_kcal: energyExpenditure,
    notes,
  }

  const { data: upsertedMetric, error: metricError } = await supabase
    .from('metrics_daily')
    .upsert(metricPayload, {
      onConflict: 'user_id,date',
    })
    .select('*')
    .single()

  let metricRecord = upsertedMetric
  if (metricError || !metricRecord) {
    const needsFallback =
      metricError?.message?.includes(`'calorie_intake_kcal'`) ||
      metricError?.message?.includes(`'energy_expenditure_kcal'`)

    if (!needsFallback) {
      return NextResponse.json(
        { error: metricError?.message ?? 'Failed to upsert metrics' },
        { status: 500 }
      )
    }

    const fallbackPayload = { ...metricPayload }
    delete (fallbackPayload as Record<string, unknown>).calorie_intake_kcal
    delete (fallbackPayload as Record<string, unknown>).energy_expenditure_kcal

    const { data: fallbackMetric, error: fallbackError } = await supabase
      .from('metrics_daily')
      .upsert(fallbackPayload, {
        onConflict: 'user_id,date',
      })
      .select('*')
      .single()

    if (fallbackError || !fallbackMetric) {
      return NextResponse.json(
        { error: fallbackError?.message ?? 'Failed to upsert metrics (fallback)' },
        { status: 500 }
      )
    }

    metricRecord = fallbackMetric
  }

  const { data: metricsHistory, error: historyError } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: true })
    .limit(90)

  if (historyError || !metricsHistory) {
    return NextResponse.json(
      { error: historyError?.message ?? 'Failed to load metrics history' },
      { status: 500 }
    )
  }

  const latestWeight = metricsHistory.slice().reverse().find((metric) => metric.weight_kg !== null)?.weight_kg

  const guardFlags = evaluateGuardFlags(metricRecord, metricsHistory)
  const shouldSuppress = shouldSuppressRecommendation(guardFlags)

  const score = calculateScores({
    metrics: metricsHistory,
    estimatedTdee: profile?.estimated_tdee ?? null,
    bodyWeightKg: latestWeight ?? null,
  })

  const { error: scoreError } = await supabase.from('scores').upsert(
    {
      user_id: userRecord.id,
      date: payload.date,
      mas: Number(score.mas.toFixed(3)),
      rrs: Number(score.rrs.toFixed(3)),
      plateau_flag: score.plateauFlag,
    },
    {
      onConflict: 'user_id,date',
    }
  )

  if (scoreError) {
    return NextResponse.json({ error: scoreError.message }, { status: 500 })
  }

  let recommendation = null

  if (!shouldSuppress && score.rrs >= 0.65) {
    const targets = computeRefeedTargets({
      estimatedTdee: profile?.estimated_tdee ?? null,
      bodyWeightKg: latestWeight ?? null,
    })

    if (targets) {
      const { data: upsertedRecommendation, error: recommendationError } = await supabase
        .from('recommendations')
        .upsert(
          {
            user_id: userRecord.id,
            date: payload.date,
            kcal_total: targets.kcal_total,
            carb_g: targets.carb_g,
            protein_g: targets.protein_g,
            fat_g: targets.fat_g,
            duration_days: 1,
            rationale_json: {
              mas: score.mas,
              deficit_streak: score.deficitStreak,
              training_load_factor: score.trainingLoadFactor,
              guards: guardFlags,
            },
          },
          {
            onConflict: 'user_id,date',
          }
        )
        .select('*')
        .single()

      if (!recommendationError) {
        recommendation = upsertedRecommendation
      }
    }
  } else {
    await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userRecord.id)
      .eq('date', payload.date)
  }

  return NextResponse.json({
    metric: metricRecord,
    score,
    recommendation,
    guards: guardFlags,
    suppressed: shouldSuppress,
  })
}


