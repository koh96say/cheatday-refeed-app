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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            チートデイ発見アプリ
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            代謝停滞を科学的に検知し、最適なタイミングでリフィードを提案するWebサービス
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              ログイン
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-3">データ入力</h2>
            <p className="text-gray-600">
              体重、安静時心拍数、体温、睡眠などの日次データを簡単に入力できます。
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-3">自動判定</h2>
            <p className="text-gray-600">
              代謝適応スコア（MAS）とリフィード準備スコア（RRS）により、最適なタイミングを自動判定します。
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-3">通知機能</h2>
            <p className="text-gray-600">
              リフィード適日をアラートでお知らせし、効果を検証できます。
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}



