import type { ReactNode } from 'react'
import { cx } from './cx'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex w-full min-w-0 flex-col items-center rounded-card border border-dashed border-border bg-surface-raised/60 px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="text-section text-ink">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
