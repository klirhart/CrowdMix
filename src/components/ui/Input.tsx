import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  hint?: ReactNode
  icon?: ReactNode
  hideLabel?: boolean
  /** Applied to the field wrapper; `className` targets the input itself. */
  wrapperClassName?: string
}

export function Input({
  label,
  error,
  hint,
  icon,
  hideLabel = false,
  wrapperClassName = '',
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? (typeof props.name === 'string' ? props.name : undefined)
  const errorId = error && inputId ? `${inputId}-error` : undefined
  const hintId = !error && hint && inputId ? `${inputId}-hint` : undefined
  const describedBy = errorId ?? hintId

  return (
    <div className={cx('space-y-2', wrapperClassName)}>
      <label
        htmlFor={inputId}
        className={cx(
          'block text-sm font-medium text-white',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>

      <div className="relative">
        {icon ? (
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-errormessage={errorId}
          className={cx(
            'w-full rounded-xl border bg-surface-sunken py-2.5 text-sm text-white outline-none',
            'transition-colors duration-150 placeholder:text-subtle',
            'hover:border-border-strong focus:border-accent focus:bg-surface',
            'disabled:cursor-not-allowed disabled:opacity-50',
            icon ? 'pl-10 pr-4' : 'px-4',
            error ? 'border-live/70' : 'border-border',
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-live">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
