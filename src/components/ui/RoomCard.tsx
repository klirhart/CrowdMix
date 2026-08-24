import { Link } from 'react-router-dom'

interface RoomCardProps {
  id: string
  name: string
  description?: string
  createdBy: string
  memberCount: number
  isLive: boolean
}

export function RoomCard({
  id,
  name,
  description,
  createdBy,
  memberCount,
  isLive,
}: RoomCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised transition-all hover:bg-surface-overlay hover:border-accent/50">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-white line-clamp-2">🎵 {name}</h3>
          {isLive && (
            <span className="flex-shrink-0 flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-400 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm text-muted line-clamp-2 mb-3">{description}</p>
        )}

        <div className="mb-4 space-y-1">
          <p className="text-xs text-muted">Created by @{createdBy}</p>
          <p className="text-xs text-muted">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>

        <Link
          to={`/r/${id}`}
          className="block w-full rounded-lg bg-accent py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Join Room
        </Link>
      </div>
    </div>
  )
}
