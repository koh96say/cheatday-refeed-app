'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'ダッシュボード',
    href: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    key: 'diary',
    label: 'ダイアリー',
    href: '/dashboard/metrics',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M6 3h12a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm0 16h11V5H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1zm3-10h5v2H9zm0 4h7v2H9z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    key: 'progress',
    label: 'プログレス',
    href: '/dashboard/trends',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M5 17h2v-6H5zm6 0h2V7h-2zm6 0h2v-9h-2z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    key: 'more',
    label: '提案履歴',
    href: '/dashboard/recommendations',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M9 3h6l1 2h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3zm-1 4v11h8V7zm2 3h4v2h-4zm0 3h3v2h-3z"
          fill="currentColor"
        />
      </svg>
    ),
  },
] as const

const CENTER_BUTTON = {
  label: '記録',
  href: '/dashboard/metrics',
}

const FOOTER_HEIGHT = 96

export function FooterNav() {
  const pathname = usePathname()

  if (!pathname?.startsWith('/dashboard')) {
    return null
  }

  return (
    <>
      <div style={{ height: FOOTER_HEIGHT }} aria-hidden />
      <footer
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center"
        style={{ height: FOOTER_HEIGHT }}
      >
        <nav className="mx-auto flex w-[min(640px,90vw)] items-end justify-between rounded-3xl border border-white/12 bg-surface/95 px-4 py-3 shadow-card backdrop-blur">
          <div className="flex flex-1 items-center justify-between gap-3">
            {NAV_ITEMS.slice(0, 2).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition ${
                    isActive ? 'text-white' : 'text-muted hover:text-white'
                  }`}
                  aria-label={item.label}
                >
                  <span className="text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <Link
            href={CENTER_BUTTON.href}
            className="mx-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105"
            aria-label={CENTER_BUTTON.label}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
              <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" />
            </svg>
          </Link>

          <div className="flex flex-1 items-center justify-between gap-3">
            {NAV_ITEMS.slice(2).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition ${
                    isActive ? 'text-white' : 'text-muted hover:text-white'
                  }`}
                  aria-label={item.label}
                >
                  <span className="text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </footer>
    </>
  )
}
