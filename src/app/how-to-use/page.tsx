import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'このアプリの使い方 | チートデイ発見アプリ',
  description:
    '日次メトリクスの入力からリフィード提案の確認まで、チートデイ発見アプリの活用方法を分かりやすく解説します。',
}

export default function HowToUsePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 pb-16 pt-6">
      <header className="app-card border border-white/10 bg-surface-soft/70 p-10 text-white">
        <p className="text-xs uppercase tracking-[0.35em] text-muted">スタートガイド</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">このアプリの使い方</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          日々のメトリクスを記録してリフィードの最適なタイミングを見つけるまでの流れを紹介します。要点だけ知りたい方も、指標の裏側を理解したい方もここから始めましょう。
        </p>
      </header>

      <main className="space-y-10">
        <section className="app-card space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-white">1. 毎日の基本ルーティン</h2>
          <p className="text-sm text-muted">
            ダッシュボードは最新の記録をもとに代謝の状態を可視化します。以下の3ステップを習慣化しましょう。
          </p>
          <ol className="list-decimal list-inside space-y-4 text-sm text-gray-200">
            <li>
              <span className="font-semibold text-white">メトリクスを入力する：</span>
              朝の体重・安静時心拍数・体温・睡眠時間・主観疲労を
              <Link href="/dashboard/metrics" className="ml-1 text-accent underline hover:text-accent-strong">
                メトリクス入力ページ
              </Link>
              から登録します。
            </li>
            <li>
              <span className="font-semibold text-white">RRS（リフィード準備スコア）を確認：</span>
              ダッシュボード上部に表示されるRRSが
              <span className="font-semibold text-accent">0.65以上</span>
              になっていないかチェックします。
            </li>
            <li>
              <span className="font-semibold text-white">推奨内容に目を通す：</span>
              RRSが高まったら、カルテのように表示されるリフィード提案を確認し、食事計画に反映します。
            </li>
          </ol>
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5 text-sm leading-relaxed text-accent">
            日次メトリクスは直近28日分を使ってスコアが再計算されます。抜け漏れがある場合でも計算は続きますが、最新状態を正しく把握するために連続した記録を心がけましょう。
          </div>
        </section>

        <section className="app-card space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-white">2. 指標の仕組みをざっくり理解する</h2>
          <p className="text-sm text-muted">
            スコアは体温や心拍などの日次データから自動算出されます。細かなアルゴリズムを知らなくても使えるよう設計していますが、日常的に意識したいポイントは次の通りです。
          </p>
          <div className="space-y-6 text-sm leading-relaxed text-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-white">RRS（Refeed Readiness Score）</h3>
              <p>
                体温・安静時心拍数・HRV・睡眠・主観疲労のZスコアを組み合わせ、「代謝の落ち込みがどの程度深刻か」を0〜1の範囲で表します。
                0.65以上で代謝停滞の兆候が濃厚と判断します。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">停滞フラグ（Plateau Flag）</h3>
              <p>
                体重が1週間ほぼ横ばい、かつ減量率が鈍化している場合に点灯します。RRSが高くなくても、体重が落ちづらい状態を知らせます。
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-danger/40 bg-danger/15 p-5 text-sm leading-relaxed text-danger">
            これらの指標は標準偏差を用いたZスコアで整えられています。個々の基準値に合わせて自動調整されるため、特別な設定は不要です。
          </div>
        </section>

        <section className="app-card space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-white">3. リフィード提案を活用する</h2>
          <ul className="space-y-4 text-sm leading-relaxed text-gray-200">
            <li>
              <span className="font-semibold text-white">提案が表示される条件：</span>
              RRSが0.65以上、かつ体温や体重の警告が出ていないときに、直近のデータからエネルギー・PFCバランスを算出します。
            </li>
            <li>
              <span className="font-semibold text-white">カロリーとPFC：</span>
              推定消費カロリーの120%程度を目標とし、追加分の約80%を炭水化物に割り当てます。タンパク質は体重×2gが目安です。
            </li>
            <li>
              <span className="font-semibold text-white">実施日の調整：</span>
              提案された日付を基準に、トレーニングの強度や生活リズムに合わせて1日前後の調整が可能です。
            </li>
          </ul>
          <div className="rounded-2xl border border-success/30 bg-success/10 p-5 text-sm leading-relaxed text-success">
            リフィード後は翌日以降の体調・体重の変化も記録し、スコアの下がり方を振り返ると効果検証に役立ちます。
          </div>
        </section>

        <section className="app-card space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-white">4. ガードレールと安全対策</h2>
          <p className="text-sm leading-relaxed text-gray-200">
            発熱や急な体重増加は、代謝の問題ではなく体調不良や水分変動の可能性があります。以下のガードレールが作動しているときは無理せず休息を優先してください。
          </p>
          <ul className="space-y-3 text-sm leading-relaxed text-gray-200">
            <li>
              <span className="font-semibold text-white">発熱の兆候：</span>
              体温が37.5℃以上のときはリフィード提案を一時停止し、健康状態の回復を待ちます。
            </li>
            <li>
              <span className="font-semibold text-white">急な体重増：</span>
              3日間で1.5%以上増えた場合は浮腫みの可能性が高いため、水分・塩分バランスの見直しを優先します。
            </li>
          </ul>
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-sm leading-relaxed text-warning">
            ガードレールは自動で解除されます。原因が分からない場合はメトリクス入力時のメモ欄（今後追加予定）で状況を記録すると振り返りに役立ちます。
          </div>
        </section>

        <section className="app-card space-y-6 p-8">
          <h2 className="text-2xl font-semibold text-white">5. つまずいたときのチェックポイント</h2>
          <ul className="space-y-4 text-sm leading-relaxed text-gray-200">
            <li>
              データが表示されないときは、今日の日付でメトリクスが登録済みか、ブラウザをリロードして確認してください。
            </li>
            <li>
              数日分データが抜けても自動補正されますが、連続しているほど精度が上がります。可能なら過去日付も補完しましょう。
            </li>
            <li>
              推奨内容がしばらく表示されない場合は、体温・睡眠などの質を整えることを優先し、コンディション改善に努めてください。
            </li>
          </ul>
        </section>

        <div className="flex justify-end">
          <Link
            href="/dashboard"
            className="app-button-primary px-6 py-3 text-sm"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
    </div>
  )
}


