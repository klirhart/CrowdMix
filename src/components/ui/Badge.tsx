import type { ReactNode } from 'react'
import { cx } from './cx'

type BadgeTone = 'neutral' | 'accent' | 'live' | 'online' | 'outline'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
  /** Shows a pulsing status dot, for live or presence indicators. */
  pulse?: boolean
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-overlay text-muted',
  accent: 'bg-accent-soft text-accent',
  live: 'bg-live/15 text-live',
  online: 'bg-online/15 text-online',
  outline: 'border border-border text-muted',
}

const dotClasses: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  live: 'bg-live',
  online: 'bg-online',
  outline: 'bg-muted',
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
  pulse = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span
            className={cx(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              dotClasses[tone],
            )}
          />
          <span
            className={cx('relative inline-flex h-1.5 w-1.5 rounded-full', dotClasses[tone])}
          />
        </span>
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </span>
  )
}
