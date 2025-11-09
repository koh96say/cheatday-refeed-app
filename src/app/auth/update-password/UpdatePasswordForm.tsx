'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Stage = 'initializing' | 'ready' | 'success' | 'error'

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

export default function UpdatePasswordForm() {
  const [stage, setStage] = useState<Stage>('initializing')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const supabase = createSupabaseBrowserClient()

    const establishSession = async () => {
      setStage('initializing')
      setFeedback(null)

      const url = new URL(window.location.href)
      const search = url.searchParams
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))

      const accessToken = search.get('access_token') ?? hashParams.get('access_token')
      const refreshToken = search.get('refresh_token') ?? hashParams.get('refresh_token')
      const code = search.get('code') ?? hashParams.get('code')
      const tokenHash =
        search.get('token_hash') ??
        hashParams.get('token_hash') ??
        search.get('token') ??
        hashParams.get('token')
      const type = search.get('type') ?? hashParams.get('type')

      try {
        let session = null

        if (accessToken && refreshToken && type === 'recovery') {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error || !data.session) {
            throw new Error(error?.message ?? 'セッションの確立に失敗しました。もう一度リンクを開き直してください。')
          }
          session = data.session
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error || !data.session) {
            throw new Error(error?.message ?? '認証コードの検証に失敗しました。リンクが無効か期限切れです。')
          }
          session = data.session
        } else if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          })
          if (error || !data.session) {
            throw new Error(error?.message ?? '再設定リンクの確認に失敗しました。再度メールを開き直してください。')
          }
          session = data.session
        } else {
          throw new Error('パスワード再設定リンクが無効か期限切れです。再度リセットメールを送信してください。')
        }

        await syncSession(session.access_token, session.refresh_token)
        window.history.replaceState({}, '', `${window.location.origin}${window.location.pathname}`)

        if (isMounted) {
          setStage('ready')
        }
      } catch (error) {
        console.error('Failed to establish recovery session:', error)
        if (isMounted) {
          setStage('error')
          setFeedback({
            type: 'error',
            text:
              error instanceof Error
                ? error.message
                : 'パスワード再設定リンクの処理に失敗しました。再度メールのリンクからアクセスしてください。',
          })
        }
      }
    }

    establishSession()

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    if (password.length < 8) {
      setFeedback({ type: 'error', text: 'パスワードは8文字以上で入力してください。' })
      return
    }

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: '確認用パスワードが一致しません。' })
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.auth.updateUser({ password })

      if (error || !data.user) {
        throw new Error(error?.message ?? 'パスワードの更新に失敗しました。')
      }

      const sessionResponse = await supabase.auth.getSession()
      const session = sessionResponse.data.session
      if (session?.access_token && session.refresh_token) {
        await syncSession(session.access_token, session.refresh_token)
      }

      setStage('success')
      setFeedback({
        type: 'success',
        text: 'パスワードを更新しました。ログイン画面へ移動して新しいパスワードでサインインしてください。',
      })
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Failed to update password:', error)
      setFeedback({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'パスワードの更新に失敗しました。時間をおいて再度お試しください。',
      })
    } finally {
      setLoading(false)
    }
  }

  if (stage === 'initializing') {
    return (
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl text-center text-white space-y-4">
        <h1 className="text-2xl font-semibold">パスワード更新</h1>
        <p className="text-sm text-gray-300">メールリンクを確認しています...</p>
        <div className="flex justify-center space-x-2 text-blue-300">
          <span className="h-3 w-3 animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span className="h-3 w-3 animate-ping rounded-full bg-blue-500 opacity-75"></span>
          <span className="h-3 w-3 animate-ping rounded-full bg-blue-600 opacity-75"></span>
        </div>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl text-center text-white space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">リンクを確認できません</h1>
          {feedback && <p className="mt-3 text-sm text-red-300">{feedback.text}</p>}
        </div>
        <p className="text-sm text-gray-300">
          リセットメールのリンクは一度しか利用できません。再設定が必要な場合は、もう一度リセットメールを送信してください。
        </p>
        <div className="flex justify-center">
          <Link
            href="/auth/reset-password"
            className="inline-flex items-center rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400"
          >
            リセットメールを再送する
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'success') {
    return (
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl text-center text-white space-y-6">
        <h1 className="text-2xl font-semibold">パスワードを更新しました</h1>
        {feedback && <p className="text-sm text-green-300">{feedback.text}</p>}
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400"
        >
          ログイン画面へ移動
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl text-white">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">新しいパスワードを設定</h1>
        <p className="mt-2 text-sm text-gray-300">
          新しいパスワードを入力し、確認のためにもう一度同じパスワードを入力してください。
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-200">
            新しいパスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            placeholder="8文字以上の安全なパスワード"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">
            新しいパスワード（確認用）
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
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.type === 'error' ? 'text-red-300' : 'text-green-300'}`}>
            {feedback.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '更新中...' : 'パスワードを更新'}
        </button>
      </form>
    </div>
  )
}

