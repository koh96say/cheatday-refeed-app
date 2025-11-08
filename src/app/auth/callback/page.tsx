'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('メールリンクを確認しています...')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const handleAuth = async () => {
      const currentUrl = new URL(window.location.href)
      const searchParams = currentUrl.searchParams
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

      const error =
        searchParams.get('error') ?? hashParams.get('error') ?? undefined
      const errorDescription =
        searchParams.get('error_description') ??
        hashParams.get('error_description') ??
        undefined

      if (error) {
        setIsError(true)
        setMessage(
          decodeURIComponent(
            errorDescription ??
              'メールリンクが無効か期限切れです。もう一度ログインをお試しください。'
          )
        )
        return
      }

      const code =
        searchParams.get('code') ?? hashParams.get('code') ?? undefined
      const accessToken =
        hashParams.get('access_token') ?? searchParams.get('access_token') ?? undefined
      const refreshToken =
        hashParams.get('refresh_token') ?? searchParams.get('refresh_token') ?? undefined

      let session = null
      let user = null

      if (code) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError || !data.session?.user) {
          setIsError(true)
          setMessage(
            exchangeError?.message ??
              'メールリンクが無効か期限切れです。もう一度ログインをお試しください。'
          )
          return
        }

        session = data.session
        user = data.session.user
      } else if (accessToken && refreshToken) {
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (setSessionError || !data.session?.user) {
          setIsError(true)
          setMessage(
            setSessionError?.message ??
              'メールリンクが無効か期限切れです。もう一度ログインをお試しください。'
          )
          return
        }

        session = data.session
        user = data.session.user
        window.location.hash = ''
      } else {
        setIsError(true)
        setMessage(
          'メールリンクが無効か期限切れです。もう一度ログインをお試しください。'
        )
        return
      }

      if (!session || !user) {
        setIsError(true)
        setMessage(
          'メールリンクが無効か期限切れです。もう一度ログインをお試しください。'
        )
        return
      }

      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', user.id)
        .maybeSingle()

      if (!existingUser && !selectError) {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            {
              auth_uid: user.id,
              timezone: 'Asia/Tokyo',
            },
            {
              onConflict: 'auth_uid',
            }
          )

        if (upsertError && upsertError.code !== '23505') {
          console.error('Error creating user:', upsertError)
        }
      }

      if (session.access_token && session.refresh_token) {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        }).catch((error) => {
          console.error('Failed to sync session cookies:', error)
        })
      }

      const nextPath = searchParams.get('next') ?? '/dashboard'
      window.location.replace(nextPath)
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isError ? '認証エラー' : 'ログイン処理中'}
        </h1>
        <p className={`text-sm ${isError ? 'text-red-600' : 'text-gray-600'}`}>
          {message}
        </p>
        {!isError && (
          <div className="flex items-center justify-center space-x-2 text-indigo-600">
            <span className="h-3 w-3 animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="h-3 w-3 animate-ping rounded-full bg-indigo-500 opacity-75"></span>
            <span className="h-3 w-3 animate-ping rounded-full bg-indigo-600 opacity-75"></span>
          </div>
        )}
      </div>
    </div>
  )
}

