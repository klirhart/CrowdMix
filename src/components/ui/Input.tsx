import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-white">
        {label}
      </label>
      <input
        id={inputId}
        className={[
          'w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-white outline-none transition-colors',
          'placeholder:text-muted focus:border-accent',
          error ? 'border-red-500/70' : 'border-border',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
