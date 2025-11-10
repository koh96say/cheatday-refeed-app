'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type DeleteMetricButtonProps = {
  date: string
}

export function DeleteMetricButton({ date }: DeleteMetricButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) return

    const confirmed = window.confirm(`${date} のメトリクスを削除します。よろしいですか？`)
    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/metrics', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error ?? '削除に失敗しました。'
        alert(message)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete metric', error)
      alert('削除に失敗しました。')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-danger/40 bg-danger/15 text-danger transition hover:bg-danger/25 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`${date} のメトリクスを削除`}
      title="メトリクスを削除"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M3.5 3.5l9 9m0-9l-9 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
