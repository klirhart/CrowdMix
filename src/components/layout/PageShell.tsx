import type { ReactNode } from 'react'
import { cx } from '@/components/ui/cx'

type PageWidth = 'narrow' | 'default' | 'wide' | 'full'

interface PageShellProps {
  children: ReactNode
  width?: PageWidth
  className?: string
}

const widthClasses: Record<PageWidth, string> = {
  narrow: 'max-w-2xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
  full: 'max-w-none',
}

/** Consistent page gutters, max width, and mount animation for every route. */
export function PageShell({ children, width = 'default', className = '' }: PageShellProps) {
  return (
    <div
      className={cx(
        'mx-auto min-w-0 w-full animate-enter px-4 sm:px-8',
        className.includes('py-') ? undefined : 'py-8 sm:py-12',
        widthClasses[width],
        className,
      )}
    >
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-meta uppercase text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="text-display text-balance">{title}</h1>
        {description ? (
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  )
}
