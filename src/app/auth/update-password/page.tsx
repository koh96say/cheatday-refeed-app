import type { Metadata } from 'next'
import { Suspense } from 'react'
import UpdatePasswordForm from './UpdatePasswordForm'

export const metadata: Metadata = {
  title: 'パスワード更新 | チートデイ発見アプリ',
  description: 'メール認証後に新しいパスワードを設定するページです。',
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-10 shadow-2xl text-center text-white space-y-4">
            <h1 className="text-2xl font-semibold">パスワード更新</h1>
            <p className="text-sm text-gray-300">メールリンクを確認しています...</p>
            <div className="flex justify-center space-x-2 text-blue-300">
              <span className="h-3 w-3 animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="h-3 w-3 animate-ping rounded-full bg-blue-500 opacity-75"></span>
              <span className="h-3 w-3 animate-ping rounded-full bg-blue-600 opacity-75"></span>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 px-4">
        <UpdatePasswordForm />
      </div>
    </Suspense>
  )
}
