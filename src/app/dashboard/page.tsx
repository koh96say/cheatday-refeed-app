import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('auth_uid', user.id)
    .single()

  // 最新のメトリクスを取得
  const { data: latestMetrics } = await supabase
    .from('metrics_daily')
    .select('*')
    .eq('user_id', userData?.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // 最新のスコアを取得
  const { data: latestScore } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userData?.id)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">チートデイ発見アプリ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ダッシュボード</h2>
            <p className="text-gray-600">今日のリフィード準備スコアとメトリクスを確認</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* リフィード準備スコア */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-indigo-600">
                      {latestScore?.rrs ? latestScore.rrs.toFixed(1) : '--'}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        リフィード準備スコア (RRS)
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {latestScore?.rrs ? (
                          latestScore.rrs >= 0.7 ? (
                            <span className="text-green-600">リフィード推奨</span>
                          ) : latestScore.rrs >= 0.5 ? (
                            <span className="text-yellow-600">要観察</span>
                          ) : (
                            <span className="text-gray-600">継続中</span>
                          )
                        ) : (
                          <span className="text-gray-400">データなし</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 代謝適応スコア */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-purple-600">
                      {latestScore?.mas ? latestScore.mas.toFixed(1) : '--'}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        代謝適応スコア (MAS)
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {latestScore?.plateau_flag ? (
                          <span className="text-red-600">停滞検出</span>
                        ) : (
                          <span className="text-gray-600">正常</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 最新の体重 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-3xl font-bold text-blue-600">
                      {latestMetrics?.weight_kg ? `${latestMetrics.weight_kg}kg` : '--'}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        最新の体重
                      </dt>
                      <dd className="text-sm text-gray-900">
                        {latestMetrics?.date ? (
                          new Date(latestMetrics.date).toLocaleDateString('ja-JP')
                        ) : (
                          <span className="text-gray-400">データなし</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/dashboard/metrics"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  メトリクスを入力
                </Link>
                <Link
                  href="/dashboard/trends"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  トレンドを確認
                </Link>
                <Link
                  href="/dashboard/recommendations"
                  className="block px-4 py-3 border border-gray-300 rounded-md text-center text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  リフィード提案を確認
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}



