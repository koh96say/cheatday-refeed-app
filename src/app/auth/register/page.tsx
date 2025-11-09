'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type FeedbackState = {
  type: 'error' | 'success'
  text: string
} | null

async function syncSession(accessToken: string, refreshToken: string) {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    })
  } catch (error) {
    console.error('Failed to sync session cookies:', error)
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    if (password !== confirmPassword) {
      setFeedback({
        type: 'error',
        text: '確認用パスワードが一致しません。',
      })
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setFeedback({
          type: 'error',
          text: error.message || '登録に失敗しました。入力内容をご確認ください。',
        })
        return
      }

      if (data.session) {
        await syncSession(data.session.access_token, data.session.refresh_token)
        router.replace('/dashboard')
        router.refresh()
        return
      }

      setFeedback({
        type: 'success',
        text: '確認用メールを送信しました。メール内のリンクからアカウントを有効化してください。',
      })
    } catch (error) {
      console.error(error)
      setFeedback({
        type: 'error',
        text: '予期せぬエラーが発生しました。時間をおいて再度お試しください。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl">
        <div className="mb-8 text-center text-white">
          <h1 className="text-2xl font-semibold">代謝計算ツール</h1>
          <p className="mt-2 text-sm text-gray-300">新規アカウントを作成しましょう</p>
        </div>
        <form className="space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-200">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-200">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                placeholder="8文字以上の安全なパスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">
                パスワード（確認用）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                placeholder="パスワードを再入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {feedback && (
            <p className={`text-sm ${feedback.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {feedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '登録処理中...' : 'アカウントを作成'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-300">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="font-semibold text-blue-400 hover:text-blue-300">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}


