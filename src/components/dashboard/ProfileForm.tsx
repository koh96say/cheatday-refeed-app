'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type UserInfo = {
  gender: 'male' | 'female' | 'other' | null
  birth_year: number | null
  height_cm: number | null
  goal_weight: number | null
  timezone: string | null
} | null

type UserProfileInfo = {
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
  estimated_tdee: number | null
  body_fat_percentage: number | null
} | null

type ProfileFormProps = {
  authUserEmail: string
  userId: string
  userInfo: UserInfo
  profile: UserProfileInfo
}

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: '座りがち (ほぼ運動なし)',
  light: '軽度 (週1-2回の軽い運動)',
  moderate: '中程度 (週3-4回の運動)',
  active: '高い (週5回以上の運動)',
  very_active: '非常に高い (ほぼ毎日高強度)',
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

function calculateAge(birthYear: number | null) {
  if (!birthYear) return null
  const currentYear = new Date().getFullYear()
  return Math.max(currentYear - birthYear, 0)
}

function estimateTdee({
  gender,
  weightKg,
  heightCm,
  age,
  activityLevel,
}: {
  gender: 'male' | 'female' | 'other' | null
  weightKg: number | null
  heightCm: number | null
  age: number | null
  activityLevel: string | null
}) {
  if (!weightKg || !heightCm || !age || !activityLevel) {
    return null
  }

  const base =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

  const multiplier = ACTIVITY_MULTIPLIER[activityLevel] ?? 1.2
  return Math.round(base * multiplier)
}

export default function ProfileForm({ authUserEmail, userId, userInfo, profile }: ProfileFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [isPending, startTransition] = useTransition()

  const [gender, setGender] = useState(userInfo?.gender ?? null)
  const [birthYear, setBirthYear] = useState(userInfo?.birth_year?.toString() ?? '')
  const [height, setHeight] = useState(userInfo?.height_cm?.toString() ?? '')
  const [goalWeight, setGoalWeight] = useState(userInfo?.goal_weight?.toString() ?? '')
  const [timezone, setTimezone] = useState(userInfo?.timezone ?? 'Asia/Tokyo')
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level ?? 'moderate')
  const [bodyFat, setBodyFat] = useState(profile?.body_fat_percentage?.toString() ?? '')
  const [tdee, setTdee] = useState(profile?.estimated_tdee?.toString() ?? '')

  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const age = calculateAge(Number(birthYear) || null)

  const handleAutoTdee = () => {
    const estimated = estimateTdee({
      gender,
      weightKg: Number(goalWeight) || null,
      heightCm: Number(height) || null,
      age,
      activityLevel: activityLevel ?? null,
    })

    if (estimated) {
      setTdee(estimated.toString())
      setMessage(`推定TDEEを ${estimated} kcal に更新しました。`)
      setIsError(false)
    } else {
      setMessage('推定には身長・体重・年齢・活動レベルが必要です。')
      setIsError(true)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setIsError(false)
    setIsSaving(true)

    const parsedBirthYear = birthYear ? Number(birthYear) : null
    const parsedHeight = height ? Number(height) : null
    const parsedGoalWeight = goalWeight ? Number(goalWeight) : null
    const parsedBodyFat = bodyFat ? Number(bodyFat) : null
    const parsedTdee = tdee ? Number(tdee) : null

    try {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          gender,
          birth_year: parsedBirthYear,
          height_cm: parsedHeight,
          goal_weight: parsedGoalWeight,
          timezone,
        })
        .eq('id', userId)

      if (userUpdateError) {
        throw userUpdateError
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            activity_level: activityLevel,
            estimated_tdee: parsedTdee,
            body_fat_percentage: parsedBodyFat,
          },
          { onConflict: 'user_id' }
        )

      if (profileError) {
        throw profileError
      }

      setMessage('プロフィールを保存しました。')
      setIsError(false)

      startTransition(() => {
        router.refresh()
      })
    } catch (error: any) {
      console.error(error)
      setIsError(true)
      setMessage(error?.message ?? '保存中にエラーが発生しました。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
        ログインメール: <span className="font-semibold">{authUserEmail}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
            性別
          </label>
          <select
            id="gender"
            value={gender ?? ''}
            onChange={(event) => setGender(event.target.value ? (event.target.value as typeof gender) : null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">未選択</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </div>

        <div>
          <label htmlFor="birth_year" className="block text-sm font-medium text-gray-700">
            生年 (西暦)
          </label>
          <input
            id="birth_year"
            type="number"
            min="1940"
            max={new Date().getFullYear()}
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="height" className="block text-sm font-medium text-gray-700">
            身長 (cm)
          </label>
          <input
            id="height"
            type="number"
            step="0.1"
            min="120"
            max="220"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="goal_weight" className="block text-sm font-medium text-gray-700">
            目標体重 (kg)
          </label>
          <input
            id="goal_weight"
            type="number"
            step="0.1"
            min="30"
            max="200"
            value={goalWeight}
            onChange={(event) => setGoalWeight(event.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
            タイムゾーン
          </label>
          <input
            id="timezone"
            type="text"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="Asia/Tokyo"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="activity_level" className="block text-sm font-medium text-gray-700">
            活動レベル
          </label>
          <select
            id="activity_level"
            value={activityLevel ?? 'moderate'}
            onChange={(event) =>
              setActivityLevel(event.target.value ? (event.target.value as typeof activityLevel) : 'moderate')
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {Object.entries(ACTIVITY_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="body_fat" className="block text-sm font-medium text-gray-700">
            体脂肪率 (%)
          </label>
          <input
            id="body_fat"
            type="number"
            step="0.1"
            min="0"
            max="70"
            value={bodyFat}
            onChange={(event) => setBodyFat(event.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="estimated_tdee" className="block text-sm font-medium text-gray-700">
            推定TDEE (kcal)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              id="estimated_tdee"
              type="number"
              step="10"
              min="1000"
              max="5000"
              value={tdee}
              onChange={(event) => setTdee(event.target.value)}
              className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAutoTdee}
              className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50"
            >
              自動計算
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Mifflin-St Jeor方程式をベースに活動係数を掛けた推定値です。
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md p-4 text-sm ${
            isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving || isPending}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving || isPending ? '保存中...' : 'プロフィールを保存'}
        </button>
      </div>
    </form>
  )
}


