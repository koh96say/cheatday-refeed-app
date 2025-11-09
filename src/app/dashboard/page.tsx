import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { ensureUserRecords } from '@/lib/auth/ensureUser'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userRecord = await ensureUserRecords(supabase, user.id)

  // 最新のメトリクスを取得
  const { data: latestMetrics } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 最新のスコアを取得
  const { data: latestScore } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 直近1週間のメトリクス
  const { data: recentMetrics } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

  // 最新のリフィード提案
  const { data: latestRecommendation } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userRecord.id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '--'
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(
      new Date(value)
    )
  }

  const guardFlags = (() => {
    const latest = recentMetrics?.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    const temp = latest?.temp_c ?? null
    const feverLike = temp !== null && temp >= 37.5

    const weightSeries = (recentMetrics ?? [])
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

    return { feverLike, acuteWeightGain }
  })()

  const guardActive = guardFlags.feverLike || guardFlags.acuteWeightGain

  const sortedRecentMetrics = recentMetrics
    ? recentMetrics
        .slice()
        .sort((a, b) => (a.date > b.date ? -1 : 1))
    : []

  const rrsStatus = (() => {
    const value = latestScore?.rrs
    if (value === null || value === undefined) {
      return { label: 'データなし', tone: 'muted', description: '日次データを入力してください。' }
    }
    if (value >= 0.65) {
      return {
        label: guardActive ? '推奨保留中' : 'リフィード推奨',
        tone: guardActive ? 'warning' : 'success',
        description: guardActive
          ? '体調ガードレールが発動中です。回復を優先し、メトリクスを継続記録してください。'
          : '代謝回復のため、炭水化物中心のリフィードを検討してください。',
      }
    }
    if (value >= 0.5) {
      return {
        label: '注意喚起',
        tone: 'warning',
        description: '停滞兆候を監視しましょう。明日のデータも入力してください。',
      }
    }
    return {
      label: '継続中',
      tone: 'muted',
      description: '引き続き日次データを記録し、コンディションを維持しましょう。',
    }
  })()

  type RrsCta = {
    href: string
    label: string
    variant: 'primary' | 'secondary'
  }

  const rrsVisual = (() => {
    const mutedBase = (headline: string): { gradient: string; badge: string; ctas: RrsCta[]; headline: string } => ({
      gradient: 'from-white/15 via-white/5 to-transparent',
      badge: 'border-white/20 bg-white/10 text-muted',
      headline,
      ctas: [
        { href: '/dashboard/metrics', label: '今日のデータを記録', variant: 'primary' },
        { href: '/how-to-use', label: '記録のコツを確認', variant: 'secondary' },
      ],
    })

    if (rrsStatus.tone === 'success') {
      if (guardActive || rrsStatus.label === '推奨保留中') {
        return {
          gradient: 'from-warning/30 via-warning/5 to-transparent',
          badge: 'border-warning/60 bg-warning/20 text-white',
          headline: '体調の回復を最優先に',
          ctas: [
            { href: '/dashboard/metrics', label: '最新メトリクスを更新', variant: 'primary' },
            { href: '/dashboard/trends', label: 'コンディション推移を見る', variant: 'secondary' },
          ],
        }
      }

      return {
        gradient: 'from-success/35 via-success/10 to-transparent',
        badge: 'border-success/60 bg-success/20 text-white',
        headline: 'リフィードを実施するタイミングです',
        ctas: [
          { href: '/dashboard/recommendations', label: 'リフィード提案を見る', variant: 'primary' },
          { href: '/dashboard/metrics', label: '最新メトリクスを振り返る', variant: 'secondary' },
        ],
      }
    }

    if (rrsStatus.tone === 'warning') {
      return {
        gradient: 'from-warning/30 via-warning/10 to-transparent',
        badge: 'border-warning/60 bg-warning/20 text-white',
        headline: '停滞の兆候を注視しましょう',
        ctas: [
          { href: '/dashboard/metrics', label: 'メトリクスを入力', variant: 'primary' },
          { href: '/dashboard/trends', label: 'プログレスを確認', variant: 'secondary' },
        ],
      }
    }

    if (rrsStatus.label === '継続中') {
      return {
        ...mutedBase('コンディションは安定しています'),
        ctas: [
          { href: '/dashboard/metrics', label: '今日のデータを記録', variant: 'primary' },
          { href: '/dashboard/trends', label: '過去14日をチェック', variant: 'secondary' },
        ],
      }
    }

    return mutedBase('日次データを入力して状態を確認しましょう')
  })()

  return (
    <div className="space-y-10 pb-16">
      <header>
        <h1 className="text-2xl font-semibold text-white">チートデイ発見アプリ</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-muted">Metabolic Recovery Companion</p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Overview</p>
        </div>
        <Link href="/how-to-use" className="app-button-secondary text-xs uppercase tracking-wide">
          使い方ガイド
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-card relative overflow-hidden p-8 lg:col-span-2">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${rrsVisual.gradient} opacity-80`} />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] ${rrsVisual.badge}`}
              >
                {rrsStatus.label}
              </span>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">RRS</p>
                <p className="text-4xl font-semibold text-white">
                  {latestScore?.rrs ? latestScore.rrs.toFixed(2) : '--'}
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{rrsVisual.headline}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{rrsStatus.description}</p>
            </div>
            {rrsVisual.ctas.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {rrsVisual.ctas.map((cta) => (
                  <Link
                    key={`${cta.href}-${cta.label}`}
                    href={cta.href}
                    className={cta.variant === 'primary' ? 'app-button-primary' : 'app-button-secondary'}
                  >
                    {cta.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="app-card p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-muted">最新体重</p>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-5xl font-semibold text-white">
              {latestMetrics?.weight_kg ? `${latestMetrics.weight_kg.toFixed(1)}kg` : '--'}
            </span>
            <span className="text-xs text-muted">{latestMetrics?.date ? formatDate(latestMetrics.date) : '未入力'}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            安静時指標とセットで入力すると、RRSの精度がさらに高まりリフィード判断に役立ちます。
          </p>
        </div>
      </div>

      {guardActive && (
        <section className="app-card border-warning/40 bg-warning/10 p-8 text-warning">
          <h3 className="text-lg font-semibold">コンディション警告</h3>
          <p className="mt-2 text-sm text-warning/90">
            リフィード提案を一時停止しています。体調回復を優先し、必要に応じて医療専門家に相談してください。
          </p>
          <ul className="mt-4 space-y-2 text-sm text-warning">
            {guardFlags.feverLike && <li>・発熱の兆候が検知されました。十分な休息を取りましょう。</li>}
            {guardFlags.acuteWeightGain && (
              <li>・直近3日で体重が急増しています。水分・塩分バランスや睡眠を見直してください。</li>
            )}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="app-card p-8">
          <h3 className="text-lg font-semibold text-white">リフィード提案</h3>
          <p className="mt-2 text-sm text-muted">
            RRSが閾値を超え、安全ガードレールがクリアされた場合にのみ提案が表示されます。
          </p>
          <div
            className={`mt-6 rounded-2xl border p-6 transition ${
              latestRecommendation && latestScore?.rrs && latestScore.rrs >= 0.65 && !guardActive
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-success/40 bg-success/10 text-success'
            }`}
          >
            {latestRecommendation && latestScore?.rrs && latestScore.rrs >= 0.65 && !guardActive ? (
              <div className="space-y-3 text-sm text-danger-foreground">
                <p className="text-sm font-semibold text-white">
                  推奨実施日: {formatDate(latestRecommendation.date)}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-200">
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted">総摂取</p>
                    <p className="mt-2 text-xl font-semibold text-white">{latestRecommendation.kcal_total} kcal</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted">炭水化物</p>
                    <p className="mt-2 text-xl font-semibold text-white">{latestRecommendation.carb_g} g</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted">たんぱく質</p>
                    <p className="mt-2 text-xl font-semibold text-white">{latestRecommendation.protein_g} g</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted">脂質</p>
                    <p className="mt-2 text-xl font-semibold text-white">{latestRecommendation.fat_g} g</p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  追加エネルギーの約80%を炭水化物に割り当て、甲状腺ホルモンとレプチンの回復を狙います。
                </p>
              </div>
            ) : (
              <p className="text-sm text-success-foreground">
                {guardActive
                  ? '体調ガードレールがアクティブのため、リフィード提案を一時停止しています。'
                  : '直近のデータではリフィード推奨条件を満たしていません。日次入力を継続しましょう。'}
              </p>
            )}
          </div>
        </section>

        <section className="app-card p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">直近のメトリクス</h3>
            <Link href="/dashboard/metrics" className="text-xs text-accent hover:text-accent-strong">
              メトリクス入力へ
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>体重 (kg)</th>
                  <th>RHR (bpm)</th>
                  <th>体温 (℃)</th>
                  <th>睡眠 (h)</th>
                  <th>疲労</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedRecentMetrics.length > 0 ? (
                  sortedRecentMetrics.map((metric) => (
                    <tr key={metric.date} className="hover:bg-white/5 transition">
                      {[
                        formatDate(metric.date),
                        metric.weight_kg ?? '--',
                        metric.rhr_bpm ?? '--',
                        metric.temp_c ?? '--',
                        metric.sleep_min ? (metric.sleep_min / 60).toFixed(1) : '--',
                        metric.fatigue_1_5 ?? '--',
                      ].map((value, idx) => (
                        <td key={idx} className="p-0">
                          <Link
                            href={`/dashboard/metrics?date=${metric.date}`}
                            className="block px-3 py-2"
                            aria-label={`${formatDate(metric.date)} のメトリクスを編集`}
                          >
                            {value}
                          </Link>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted">
                      直近7日間のデータがありません。メトリクスを入力してください。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}