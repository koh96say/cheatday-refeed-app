import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'このアプリの使い方 | チートデイ発見アプリ',
  description:
    '日次メトリクスの入力からリフィード提案の確認まで、チートデイ発見アプリの活用方法を分かりやすく解説します。',
}

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-sm text-indigo-600 mb-3">スタートガイド</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">このアプリの使い方</h1>
          <p className="text-base text-gray-600 leading-relaxed">
            このページでは、日々のメトリクスを記録してリフィードの最適なタイミングを見つけるまでの流れを紹介します。
            要点だけ知りたい方も、指標の裏側を理解したい方もここから始めましょう。
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 毎日の基本ルーティン</h2>
          <p className="text-gray-600 mb-6">
            ダッシュボードは、最新の記録をもとに代謝の状態を可視化します。以下の3ステップを習慣化しましょう。
          </p>
          <ol className="list-decimal list-inside space-y-4 text-gray-700">
            <li>
              <span className="font-medium text-gray-900">メトリクスを入力する：</span>
              朝の体重・安静時心拍数・体温・睡眠時間・主観疲労を
              <Link href="/dashboard/metrics" className="text-indigo-600 hover:text-indigo-800 underline ml-1">
                メトリクス入力ページ
              </Link>
              から登録します。
            </li>
            <li>
              <span className="font-medium text-gray-900">RRS（リフィード準備スコア）を確認：</span>
              ダッシュボード上部に表示されるRRSが
              <span className="font-semibold">0.65以上</span>
              になっていないかチェックします。
            </li>
            <li>
              <span className="font-medium text-gray-900">推奨内容に目を通す：</span>
              RRSが高まったら、カルテのように表示されるリフィード提案を確認し、食事計画に反映します。
            </li>
          </ol>
          <div className="mt-6 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-md p-4 text-sm leading-relaxed">
            日次メトリクスは直近28日分を使ってスコアが再計算されます。抜け漏れがある場合でも計算は続きますが、最新状態を正しく把握するために連続した記録を心がけましょう。
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 指標の仕組みをざっくり理解する</h2>
          <p className="text-gray-600 mb-6">
            詳細なロジックは開発者ドキュメント「計算リファレンス」にまとまっていますが、日常的に意識したいポイントは次の通りです。
          </p>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">RRS（Refeed Readiness Score）</h3>
              <p className="text-gray-700 leading-relaxed">
                体温・安静時心拍数・HRV・睡眠・主観疲労のZスコアを組み合わせ、「代謝の落ち込みがどの程度深刻か」を0〜1の範囲で表します。
                0.65以上で代謝停滞の兆候が濃厚と判断します。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">MAS（Metabolic Adaptation Score）</h3>
              <p className="text-gray-700 leading-relaxed">
                RRSの基礎となる合算値で、体温低下やHRVの悪化、疲労蓄積を重み付きで加味します。数値そのものより、前日比・週次推移の変化を追うイメージです。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">停滞フラグ（Plateau Flag）</h3>
              <p className="text-gray-700 leading-relaxed">
                体重が1週間ほぼ横ばい、かつ減量率が鈍化している場合に点灯します。RRSが高くなくても、体重が落ちづらい状態を知らせます。
              </p>
            </div>
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-100 text-blue-900 rounded-md p-4 text-sm leading-relaxed">
            これらの指標は標準偏差を用いたZスコアで整えられています。個々の基準値に合わせて自動調整されるため、特別な設定は不要です。
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. リフィード提案を活用する</h2>
          <ul className="space-y-4 text-gray-700 leading-relaxed">
            <li>
              <span className="font-medium text-gray-900">提案が表示される条件：</span>
              RRSが0.65以上、かつ体温や体重の警告が出ていないときに、直近のデータからエネルギー・PFCバランスを算出します。
            </li>
            <li>
              <span className="font-medium text-gray-900">カロリーとPFC：</span>
              推定消費カロリーの120%程度を目標とし、追加分の約80%を炭水化物に割り当てます。タンパク質は体重×2gが目安です。
            </li>
            <li>
              <span className="font-medium text-gray-900">実施日の調整：</span>
              提案された日付を基準に、トレーニングの強度や生活リズムに合わせて1日前後の調整が可能です。
            </li>
          </ul>
          <div className="mt-6 bg-green-50 border border-green-100 text-green-900 rounded-md p-4 text-sm leading-relaxed">
            リフィード後は翌日以降の体調・体重の変化も記録し、スコアの下がり方を振り返ると効果検証に役立ちます。
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. ガードレールと安全対策</h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            発熱や急な体重増加は、代謝の問題ではなく体調不良や水分変動の可能性があります。以下のガードレールが作動しているときは無理せず休息を優先してください。
          </p>
          <ul className="space-y-3 text-gray-700 leading-relaxed">
            <li>
              <span className="font-medium text-gray-900">発熱の兆候：</span>
              体温が37.5℃以上のときはリフィード提案を一時停止し、健康状態の回復を待ちます。
            </li>
            <li>
              <span className="font-medium text-gray-900">急な体重増：</span>
              3日間で1.5%以上増えた場合は浮腫みの可能性が高いため、水分・塩分バランスの見直しを優先します。
            </li>
          </ul>
          <div className="mt-6 bg-yellow-50 border border-yellow-100 text-yellow-900 rounded-md p-4 text-sm leading-relaxed">
            ガードレールは自動で解除されます。原因が分からない場合はメトリクス入力時のメモ欄（今後追加予定）で状況を記録すると振り返りに役立ちます。
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. つまずいたときのチェックポイント</h2>
          <ul className="space-y-4 text-gray-700 leading-relaxed">
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
            className="inline-flex items-center px-5 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
    </div>
  )
}


