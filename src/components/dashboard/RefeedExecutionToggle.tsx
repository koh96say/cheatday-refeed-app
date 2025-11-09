'use client'

import { useMemo, useState, useTransition } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function RefeedExecutionToggle({
  recommendationId,
  initialExecuted,
}: {
  recommendationId: string
  initialExecuted: boolean
}) {
  const [executed, setExecuted] = useState(initialExecuted)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const handleToggle = () => {
    if (isPending) return

    const previous = executed
    const next = !executed

    setExecuted(next)
    setErrorMessage(null)

    startTransition(async () => {
      const { error } = await supabase.from('recommendations').update({ executed: next }).eq('id', recommendationId)

      if (error) {
        console.error('Failed to update refeed execution flag:', error.message)
        setExecuted(previous)
        setErrorMessage('保存に失敗しました')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={executed}
        aria-label={executed ? 'リフィード実施: オン。クリックでオフにする' : 'リフィード実施: オフ。クリックでオンにする'}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
          executed ? 'bg-accent' : 'bg-white/15'
        } ${isPending ? 'pointer-events-none opacity-70' : ''}`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            executed ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {errorMessage ? <span className="text-[10px] text-error">{errorMessage}</span> : null}
    </div>
  )
}
