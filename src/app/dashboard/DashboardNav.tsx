'use client'

import { useState } from 'react'
import Link from 'next/link'

type DashboardNavProps = {
  email: string
  links: Array<{ href: string; label: string }>
}

export function DashboardNav({ email, links }: DashboardNavProps) {
  const [open, setOpen] = useState(false)

  const toggleMenu = () => setOpen((prev) => !prev)
  const closeMenu = () => setOpen(false)

  return (
    <>
      <div className="fixed right-6 top-6 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMenu}
          aria-expanded={open}
          aria-controls="dashboard-nav-menu"
          className="app-button-secondary h-12 w-12 flex-col justify-center gap-1.5 p-0 text-sm"
        >
          <span className="sr-only">メニューを開閉</span>
          <span
            className={`relative block h-[1.5px] w-6 bg-white transition-all ${
              open ? 'translate-y-[6px] rotate-45' : ''
            }`}
          />
          <span
            className={`relative block h-[1.5px] w-6 bg-white transition-all ${
              open ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`relative block h-[1.5px] w-6 bg-white transition-all ${
              open ? '-translate-y-[6px] -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      <div
        id="dashboard-nav-menu"
        className={`fixed right-6 top-20 z-40 w-72 transform rounded-3xl border border-white/10 bg-background/85 p-6 shadow-card backdrop-blur transition-all duration-200 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        <div className="mb-6">
          <Link href="/dashboard" onClick={closeMenu} className="text-lg font-semibold text-white">
            チートデイ発見アプリ
          </Link>
          <p className="mt-2 text-xs text-muted">Metabolic Recovery Companion</p>
        </div>
        <div className="space-y-2">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="block rounded-2xl border border-white/5 bg-surface-soft/70 px-4 py-3 text-sm text-gray-200 transition hover:border-white/20 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-white/5 bg-surface-soft/60 px-4 py-3 text-xs text-muted">
          {email}
        </div>
      </div>
    </>
  )
}

