import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  /** Adds hover affordance for cards that behave as a single target. */
  interactive?: boolean
  children: ReactNode
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-7',
}

export function Card({
  padding = 'md',
  interactive = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        'rounded-card border border-border bg-surface-raised shadow-card',
        interactive &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-overlay hover:shadow-raised',
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SectionHeadingProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function SectionHeading({
  title,
  description,
  icon,
  action,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={cx('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-title">
          {icon ? (
            <span className="text-accent" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </h2>
        {description ? (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
