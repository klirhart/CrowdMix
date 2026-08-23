interface AlertProps {
  variant?: 'error' | 'info' | 'success'
  children: React.ReactNode
}

const variantClasses = {
  error: 'border-red-500/30 bg-red-500/10 text-red-200',
  info: 'border-border bg-surface text-muted',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
}

export function Alert({ variant = 'info', children }: AlertProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${variantClasses[variant]}`}>
      {children}
    </div>
  )
}
