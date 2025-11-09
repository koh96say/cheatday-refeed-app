'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'

const DASHBOARD_ROOT_PATH = '/dashboard'

export function BackButtonHeader() {
  const router = useRouter()
  const pathname = usePathname()

  if (!pathname || pathname === DASHBOARD_ROOT_PATH) {
    return null
  }

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(DASHBOARD_ROOT_PATH)
    }
  }, [router])

  return (
    <>
      <div className="h-20" aria-hidden />
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl justify-start px-6 py-5">
          <button
            type="button"
            onClick={handleBack}
            className="app-button-secondary border border-white/15 px-4 py-2 text-xs uppercase tracking-wide"
            aria-label="前のページに戻る"
          >
            ← 戻る
          </button>
        </div>
      </header>
    </>
  )
}
