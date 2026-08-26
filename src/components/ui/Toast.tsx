import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { cx } from '@/components/ui/cx'

interface ToastProps {
  message: string | null
  tone?: 'success' | 'error'
  onDismiss: () => void
}

export function Toast({ message, tone = 'success', onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return

    const timer = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) {
    return null
  }

  return createPortal(
    <div
      role="status"
      className={cx(
        'fixed bottom-24 left-1/2 z-[60] w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2',
        'flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-panel',
        'lg:bottom-28',
        tone === 'error'
          ? 'border-live/30 bg-live/15 text-red-100'
          : 'border-online/30 bg-surface-raised text-emerald-100',
      )}
    >
      {tone === 'error' ? (
        <CircleAlert size={17} className="mt-px shrink-0 text-live" aria-hidden="true" />
      ) : (
        <CircleCheck size={17} className="mt-px shrink-0 text-online" aria-hidden="true" />
      )}
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
    </div>,
    document.body,
  )
}
