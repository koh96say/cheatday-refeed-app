'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    const supabase = createSupabaseBrowserClient()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })

      if (error) {
        setMessage({
          type: 'error',
          text: error.message || 'メールの送信に失敗しました。入力内容をご確認ください。',
        })
      } else {
        setMessage({
          type: 'success',
          text: 'パスワード再設定用のメールを送信しました。メール内のリンクから再設定を完了してください。',
        })
      }
    } catch (error) {
      console.error(error)
      setMessage({
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
          <h1 className="text-2xl font-semibold">パスワード再設定</h1>
          <p className="text-sm text-muted">
            登録済みのメールアドレスを入力すると、再設定用リンクをお送りします。
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
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
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="app-button-primary w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          ログインページへ戻る場合は{' '}
          <Link href="/auth/login" className="font-semibold text-gray-200 hover:text-white">
            こちら
          </Link>
        </p>
      </section>
    </main>
  )
}


