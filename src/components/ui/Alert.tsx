import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

type AlertVariant = 'error' | 'info' | 'success'

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  error: 'border-live/30 bg-live/10 text-ink',
  info: 'border-border bg-surface-raised text-muted',
  success: 'border-online/30 bg-online/10 text-ink',
}

const variantIcons: Record<AlertVariant, typeof Info> = {
  error: CircleAlert,
  info: Info,
  success: CircleCheck,
}

const iconClasses: Record<AlertVariant, string> = {
  error: 'text-live',
  info: 'text-subtle',
  success: 'text-online',
}

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  const Icon = variantIcons[variant]

  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={cx(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      <Icon
        size={17}
        className={cx('mt-px shrink-0', iconClasses[variant])}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  )
}
