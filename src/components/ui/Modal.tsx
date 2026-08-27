import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { cx } from '@/components/ui/cx'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Default `sm` matches invite / confirm dialogs. `lg` is lyrics. `xl` is forms. */
  size?: 'sm' | 'lg' | 'xl'
}

export function Modal({ open, title, onClose, children, size = 'sm' }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative w-full rounded-panel border border-border bg-surface-raised shadow-panel outline-none',
          'animate-enter p-5 sm:p-6',
          size === 'xl'
            ? 'flex max-h-[min(46rem,calc(100dvh-2.5rem))] max-w-xl flex-col sm:max-w-2xl'
            : size === 'lg'
              ? 'flex max-h-[min(40rem,calc(100dvh-3rem))] max-w-lg flex-col'
              : 'flex max-h-[calc(100dvh-2rem)] max-w-sm flex-col overflow-y-auto overscroll-contain',
        )}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <h2 id={titleId} className="text-title">
            {title}
          </h2>
          <IconButton
            label="Close"
            icon={<X size={16} strokeWidth={2.25} />}
            size="sm"
            onClick={onClose}
          />
        </div>
        <div className={size === 'sm' ? undefined : 'min-h-0 flex-1 overflow-y-auto overscroll-contain'}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
