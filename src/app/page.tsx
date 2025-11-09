import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createSupabaseServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 認証済みユーザーはダッシュボードにリダイレクト
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="relative flex min-h-screen flex-col justify-center pb-24 pt-32">
      <div className="mx-auto w-full max-w-6xl px-6">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <span className="app-pill">Metabolic Insight Platform</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            代謝停滞の兆候を可視化し
            <span className="block bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
              最適なリフィードタイミング
            </span>
            を導き出す
          </h1>
          <p className="mt-6 text-lg text-muted">
            体重・心拍・体温・睡眠などの日次メトリクスから、代謝の落ち込みをAIが検知。
            科学的根拠に基づくリフィード提案で、減量停滞を抜け出すサポートを行います。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/auth/login" className="app-button-primary">
              いますぐはじめる
            </Link>
            <Link href="/how-to-use" className="app-button-secondary">
              使い方を見る
            </Link>
          </div>
        </section>

        <section className="mt-24 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="app-card lg:col-span-3">
            <div className="flex flex-col justify-between gap-8 p-10">
              <header>
                <p className="text-sm uppercase tracking-[0.32em] text-muted">INSIGHTS</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">あなたのコンディションを一目で把握</h2>
                <p className="mt-2 text-sm text-muted">
                  直近のエントリーとジャーナル時間を集約。継続度合いと習慣化の進捗がすぐに確認できます。
                </p>
              </header>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-surface-soft/80 p-5 text-left shadow-glow">
                  <p className="text-xs uppercase tracking-wide text-muted">Total Entries</p>
                  <p className="mt-3 text-3xl font-semibold text-white">2</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-surface-soft/80 p-5 text-left shadow-glow">
                  <p className="text-xs uppercase tracking-wide text-muted">Total Words</p>
                  <p className="mt-3 text-3xl font-semibold text-white">115</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-surface-soft/80 p-5 text-left shadow-glow">
                  <p className="text-xs uppercase tracking-wide text-muted">Time Journaling</p>
                  <p className="mt-3 text-3xl font-semibold text-white">12<span className="ml-1 text-sm text-muted">min</span></p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-surface-soft/80 p-5 text-left shadow-glow">
                  <p className="text-xs uppercase tracking-wide text-muted">Daily Streak</p>
                  <p className="mt-3 text-3xl font-semibold text-white">1<span className="ml-1 text-sm text-muted">day</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="app-card lg:col-span-2">
            <div className="flex h-full flex-col justify-between gap-6 p-10">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-muted">ALERTS</p>
                <h3 className="mt-4 text-xl font-semibold text-white">RRSが閾値に近づいています</h3>
                <p className="mt-2 text-sm text-muted">
                  最新の指標でリフィード推奨ラインを超える兆候があります。入力データをチェックして日次のリカバリーを優先しましょう。
            </p>
          </div>
              <div className="flex flex-wrap gap-3">
                <span className="app-pill border-none bg-accent/10 text-accent">RRS 0.64</span>
                <span className="app-pill border-none bg-success/10 text-success">睡眠 7.8h</span>
                <span className="app-pill border-none bg-warning/10 text-warning">体重 ±0.0kg</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: '日次メトリクスの記録',
              body: '体重・心拍・体温・睡眠などの重要指標をアプリで一括入力。習慣化しやすいUIでストレスなく継続できます。',
            },
            {
              title: '代謝停滞の検知',
              body: 'RRSとMASが停滞兆候を捉え、ガードレールが安全性を担保。リフィードのベストタイミングを逃しません。',
            },
            {
              title: 'PFCバランス提案',
              body: 'リフィード日に必要なカロリーとPFCバランスを提示。生活リズムに合わせた実践的なアドバイスが届きます。',
            },
          ].map((item) => (
            <div key={item.title} className="app-card p-8">
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
              <p className="mt-6 text-xs uppercase tracking-[0.3em] text-muted">Metabolic • Insights</p>
        </div>
          ))}
        </section>
      </div>
    </main>
  )
}



