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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl">
        <div className="mb-8 text-center text-white">
          <h1 className="text-2xl font-semibold">パスワード再設定</h1>
          <p className="mt-2 text-sm text-gray-300">
            登録済みメールアドレスを入力すると、パスワード再設定用のリンクを送信します。
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-300">
          ログイン画面に戻る方は{' '}
          <Link href="/auth/login" className="font-semibold text-blue-400 hover:text-blue-300">
            こちら
          </Link>
        </p>
      </div>
    </div>
  )
}


