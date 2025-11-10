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
    <main className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-3xl flex-col justify-center px-6 pb-24 pt-10">
      <section className="app-card p-10">
        <header className="mb-8 space-y-2 text-white">
          <h1 className="text-2xl font-semibold">新規アカウントの作成</h1>
          <p className="text-sm text-muted">
            必要事項を入力して、チートデイ発見アプリの全機能をご利用ください。
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleRegister}>
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
                autoComplete="new-password"
                required
                minLength={6}
                className="app-input"
                placeholder="8文字以上の安全なパスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="app-label">
                パスワード（確認用）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="app-input"
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
            className="app-button-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '登録処理中...' : 'アカウントを作成'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          すでにアカウントをお持ちですか？{' '}
          <Link href="/auth/login" className="font-semibold text-gray-200 hover:text-white">
            ログインはこちら
          </Link>
        </p>
      </section>
    </main>
  )
}


