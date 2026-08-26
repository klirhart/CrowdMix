import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type IconButtonTone = 'neutral' | 'accent' | 'danger'
type IconButtonSize = 'sm' | 'md' | 'lg'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls need an accessible name. */
  label: string
  icon: ReactNode
  tone?: IconButtonTone
  size?: IconButtonSize
  active?: boolean
}

const toneClasses: Record<IconButtonTone, string> = {
  neutral: 'text-muted hover:bg-surface-overlay hover:text-white',
  accent: 'text-accent hover:bg-accent-soft hover:text-accent-hover',
  danger: 'text-subtle hover:bg-live/15 hover:text-live',
}

const activeClasses: Record<IconButtonTone, string> = {
  neutral: 'bg-surface-overlay text-white',
  accent: 'bg-accent text-white hover:bg-accent-hover hover:text-white',
  danger: 'bg-live/20 text-live',
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7 rounded-lg',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-11 w-11 rounded-xl',
}

export function IconButton({
  label,
  icon,
  tone = 'neutral',
  size = 'md',
  active = false,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      className={cx(
        'inline-flex items-center justify-center transition-all duration-150 active:scale-90',
        'disabled:pointer-events-none disabled:opacity-40',
        sizeClasses[size],
        active ? activeClasses[tone] : toneClasses[tone],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
