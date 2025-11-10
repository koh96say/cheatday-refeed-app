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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const supabase = createSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setFeedback({
          type: 'error',
          text: error.message || 'ログインに失敗しました。入力内容をご確認ください。',
        })
        return
      }

      if (!data.session) {
        setFeedback({
          type: 'error',
          text: 'セッションを開始できませんでした。もう一度お試しください。',
        })
        return
      }

      await syncSession(data.session.access_token, data.session.refresh_token)
      router.replace('/dashboard')
      router.refresh()
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
    <main className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-3xl flex-col justify-center px-6 pb-24 pt-10">
      <section className="app-card p-10">
        <header className="mb-8 space-y-2 text-white">
          <h1 className="text-2xl font-semibold">アカウントにサインイン</h1>
          <p className="text-sm text-muted">登録済みのメールアドレスとパスワードを入力してログインしてください。</p>
        </header>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="app-label">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="app-input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="app-label">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="app-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {feedback && (
            <p className={`text-sm ${feedback.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {feedback.text}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted">
            <Link href="/auth/reset-password" className="font-medium text-accent hover:text-accent/80">
              パスワードをお忘れですか？
            </Link>
            <Link href="/auth/register" className="font-medium text-gray-200 hover:text-white">
              新規登録はこちら
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="app-button-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'ログイン処理中...' : 'ログイン'}
          </button>
        </form>
      </section>
    </main>
  )
}

