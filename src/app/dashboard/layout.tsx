import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { createSupabaseServerComponentClient } from '@/lib/supabase/server'
import { DashboardNav } from './DashboardNav'

type DashboardLayoutProps = {
  children: ReactNode
}

const navigationLinks = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/dashboard/metrics', label: 'メトリクス入力' },
  { href: '/dashboard/trends', label: 'トレンド分析' },
  { href: '/dashboard/recommendations', label: '提案履歴' },
  { href: '/dashboard/profile', label: 'プロフィール' },
]

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <>
      <DashboardNav email={user.email ?? ''} links={navigationLinks} />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-8">
        <div>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="app-button-secondary border border-white/10 px-4 py-2 text-xs uppercase tracking-wide"
            >
              ログアウト
            </button>
          </form>
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}

