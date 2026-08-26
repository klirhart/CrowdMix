import { cx } from './cx'

interface LoadingSpinnerProps {
  label?: string
  /** Renders compactly inline instead of as a full-height centered block. */
  inline?: boolean
  className?: string
}

export function LoadingSpinner({
  label = 'Loading...',
  inline = false,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      className={cx(
        'flex items-center text-muted',
        inline ? 'gap-2.5' : 'flex-col justify-center gap-3 py-20',
        className,
      )}
    >
      <div
        className={cx(
          'animate-spin rounded-full border-2 border-border border-t-accent',
          inline ? 'h-4 w-4' : 'h-8 w-8',
        )}
        aria-hidden="true"
      />
      <p className="text-sm">{label}</p>
    </div>
  )
}
