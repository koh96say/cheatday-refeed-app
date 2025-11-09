'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { MetricDaily } from '@/types'

type MetricsFormProps = {
  latestMetric: MetricDaily | null
  defaultMetric: MetricDaily | null
  estimatedTdee: number | null
}

function formatNumber(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined) return ''
  return value.toFixed(fractionDigits)
}

function parseInput(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function MetricsForm({ latestMetric, defaultMetric, estimatedTdee }: MetricsFormProps) {
  const router = useRouter()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [date, setDate] = useState(defaultMetric?.date ?? today)
  const [weight, setWeight] = useState(formatNumber(defaultMetric?.weight_kg ?? latestMetric?.weight_kg ?? null, 1))
  const [rhr, setRhr] = useState(formatNumber(defaultMetric?.rhr_bpm ?? latestMetric?.rhr_bpm ?? null, 0))
  const [temp, setTemp] = useState(formatNumber(defaultMetric?.temp_c ?? latestMetric?.temp_c ?? null, 1))
  const [hrv, setHrv] = useState(formatNumber(defaultMetric?.hrv_ms ?? latestMetric?.hrv_ms ?? null, 0))
  const [sleepHours, setSleepHours] = useState(
    defaultMetric?.sleep_min
      ? (defaultMetric.sleep_min / 60).toFixed(1)
      : latestMetric?.sleep_min
        ? (latestMetric.sleep_min / 60).toFixed(1)
        : ''
  )
  const [fatigue, setFatigue] = useState(
    defaultMetric?.fatigue_1_5?.toString() ?? latestMetric?.fatigue_1_5?.toString() ?? ''
  )
  const [trainingLoad, setTrainingLoad] = useState(
    defaultMetric?.training_load?.toString() ?? latestMetric?.training_load?.toString() ?? ''
  )
  const [calorieIntake, setCalorieIntake] = useState(
    defaultMetric?.calorie_intake_kcal?.toString() ?? latestMetric?.calorie_intake_kcal?.toString() ?? ''
  )
  const [energyExpenditure, setEnergyExpenditure] = useState(
    defaultMetric?.energy_expenditure_kcal?.toString() ??
      latestMetric?.energy_expenditure_kcal?.toString() ??
      ''
  )
  const [notes, setNotes] = useState(defaultMetric?.notes ?? '')

  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setIsError(false)
    setIsLoading(true)

    const parsedSleepHours = parseInput(sleepHours)

    const payload = {
      date,
      weight_kg: parseInput(weight),
      rhr_bpm: parseInput(rhr),
      temp_c: parseInput(temp),
      hrv_ms: parseInput(hrv),
      sleep_min: parsedSleepHours !== null ? Math.round(parsedSleepHours * 60) : null,
      fatigue_1_5: parseInput(fatigue),
      training_load: parseInput(trainingLoad),
      calorie_intake_kcal: parseInput(calorieIntake),
      energy_expenditure_kcal: parseInput(energyExpenditure),
      notes: notes.trim() === '' ? null : notes.trim(),
    }

    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setIsError(true)
        setMessage(data.error ?? 'データの保存に失敗しました。')
      } else {
        setMessage('メトリクスを保存し、スコアを再計算しました。')
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error(error)
      setIsError(true)
      setMessage('ネットワークエラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="app-label">
            日付 <span className="text-danger">*</span>
          </label>
          <input
            id="date"
            type="date"
            max={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="weight" className="app-label">
            体重 (kg) <span className="text-danger">*</span>
          </label>
          <input
            id="weight"
            type="number"
            step="0.1"
            min="20"
            max="250"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            required
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="rhr" className="app-label flex items-center gap-2">
            安静時心拍数 (bpm) <span className="text-danger">*</span>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="安静時心拍数の補足情報"
                aria-describedby="rhr-helper-text"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-muted transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                ?
              </button>
              <span
                id="rhr-helper-text"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-surface/95 p-3 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
              >
                安静時心拍数は、起床直後など身体が十分に休まっているタイミングで測定してください。測定前に深呼吸を数回行い、1分間安静にしたうえでデバイスの数値を記録します。毎日同じ時間帯と姿勢で測ると変化を把握しやすくなります。
              </span>
            </span>
          </label>
          <input
            id="rhr"
            type="number"
            step="1"
            min="20"
            max="140"
            value={rhr}
            onChange={(event) => setRhr(event.target.value)}
            required
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="temp" className="app-label flex items-center gap-2">
            起床時体温 (℃) <span className="text-danger">*</span>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="起床時体温の補足情報"
                aria-describedby="temp-helper-text"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-muted transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                ?
              </button>
              <span
                id="temp-helper-text"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-surface/95 p-3 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
              >
                アラームで目覚めた直後、ベッドから起き上がる前に測定してください。口腔温度計の場合は舌の裏にしっかり当て、測定中は口を閉じて安静を保ちます。同じ計測機器と時間帯で記録すると微妙な変化を追跡しやすくなります。
              </span>
            </span>
          </label>
          <input
            id="temp"
            type="number"
            step="0.1"
            min="34.0"
            max="39.0"
            value={temp}
            onChange={(event) => setTemp(event.target.value)}
            required
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="hrv" className="app-label flex items-center gap-2">
            HRV (ms)
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="HRVの補足情報"
                aria-describedby="hrv-helper-text"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-muted transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                ?
              </button>
              <span
                id="hrv-helper-text"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-surface/95 p-3 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
              >
                心拍センサーや対応アプリで、座った状態または仰向けでリラックスした姿勢を保ち、深呼吸を数回してから計測します。1分以上動かずに測ると安定した値が得られるため、環境と姿勢を揃えて継続記録しましょう。
              </span>
            </span>
          </label>
          <input
            id="hrv"
            type="number"
            step="1"
            min="0"
            max="250"
            value={hrv}
            onChange={(event) => setHrv(event.target.value)}
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="sleep" className="app-label">
            睡眠時間 (時間)
          </label>
          <input
            id="sleep"
            type="number"
            step="0.1"
            min="0"
            max="16"
            value={sleepHours}
            onChange={(event) => setSleepHours(event.target.value)}
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="fatigue" className="app-label flex items-center gap-2">
            主観疲労 (1-5)
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="主観疲労の補足情報"
                aria-describedby="fatigue-helper-text"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-muted transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                ?
              </button>
              <span
                id="fatigue-helper-text"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-surface/95 p-3 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
              >
                1を「非常に回復している」、5を「極度に疲れている」とした主観評価で選択してください。筋肉痛、眠気、集中力の状態などを総合的に判断し、毎日同じタイミングで自己評価を行うと基準が安定します。
              </span>
            </span>
          </label>
          <select
            id="fatigue"
            value={fatigue}
            onChange={(event) => setFatigue(event.target.value)}
            className="app-input mt-2"
          >
            <option value="">選択してください</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="training_load" className="app-label flex items-center gap-2">
            トレーニング負荷 (TSS/日)
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="トレーニング負荷の補足情報"
                aria-describedby="training-helper-text"
                className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-muted transition hover:border-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                ?
              </button>
              <span
                id="training-helper-text"
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-surface/95 p-3 text-xs leading-relaxed text-white shadow-lg group-hover:block group-focus-within:block"
              >
                Garmin や TrainingPeaks などで算出される TSS 指標をそのまま入力してください。計測値が無い場合はトレーニング時間に主観的な強度を掛け合わせた概算でも構いません。日ごとの負荷を記録して過負荷や回復不足の兆候を把握しましょう。
              </span>
            </span>
          </label>
          <input
            id="training_load"
            type="number"
            step="1"
            min="0"
            max="800"
            value={trainingLoad}
            onChange={(event) => setTrainingLoad(event.target.value)}
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="calorie_intake" className="app-label">
            摂取カロリー (kcal)
          </label>
          <input
            id="calorie_intake"
            type="number"
            step="10"
            min="0"
            max="6000"
            value={calorieIntake}
            onChange={(event) => setCalorieIntake(event.target.value)}
            className="app-input mt-2"
          />
        </div>

        <div>
          <label htmlFor="energy_expenditure" className="app-label">
            消費推定 (kcal)
          </label>
          <input
            id="energy_expenditure"
            type="number"
            step="10"
            min="0"
            max="6000"
            value={energyExpenditure}
            onChange={(event) => setEnergyExpenditure(event.target.value)}
            className="app-input mt-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="app-label">
          メモ
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          className="app-input mt-2"
        />
        <p className="mt-2 text-xs text-muted">※ 500文字まで。補足事項や体調メモに活用してください。</p>
      </div>

      {estimatedTdee ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm text-accent">
          推定TDEE: <span className="font-semibold text-white">{estimatedTdee}</span> kcal
        </div>
      ) : (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          プロフィールに推定TDEEを設定すると、カロリー不足日数の推定がより正確になります。
        </div>
      )}

      {message && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            isError ? 'border-danger/40 bg-danger/10 text-danger' : 'border-success/40 bg-success/10 text-success'
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || isPending}
          className="app-button-primary px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading || isPending ? '保存中...' : 'メトリクスを保存'}
        </button>
      </div>
    </form>
  )
}


