import { cx } from './cx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-lg bg-surface-overlay/70',
        'after:absolute after:inset-0 after:-translate-x-full',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent',
        'after:[animation:shimmer_1.6s_infinite]',
        className,
      )}
      aria-hidden="true"
    />
  )
}

/** Placeholder matching the shape of a room card grid. */
export function RoomCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface-raised p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-4 h-9 w-full rounded-xl" />
    </div>
  )
}

/** Placeholder matching the shape of a queue row. */
export function QueueRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface-raised p-3">
      <Skeleton className="h-14 w-14 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
  )
}
