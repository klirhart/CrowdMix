import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-raised hover:bg-accent-hover active:scale-[0.98] hover:shadow-glow',
  secondary:
    'border border-border bg-surface-raised text-white hover:border-border-strong hover:bg-surface-overlay active:scale-[0.98]',
  ghost: 'text-muted hover:bg-surface-overlay hover:text-white active:scale-[0.98]',
  danger:
    'border border-live/40 bg-live/10 text-live hover:border-live/60 hover:bg-live/20 active:scale-[0.98]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'gap-1.5 rounded-lg px-3 py-1.5 text-xs',
  md: 'gap-2 rounded-xl px-4 py-2.5 text-sm',
  lg: 'gap-2 rounded-xl px-6 py-3 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled}
      {...props}
    />
  )
}
