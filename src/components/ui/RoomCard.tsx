import { ArrowRight, EyeOff, Globe, Lock, Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { cx } from '@/components/ui/cx'
import type { Room, RoomVisibility } from '@/types/room'

interface RoomCardProps {
  room: Room
  /** Label for the action link; the destination is always the room itself. */
  actionLabel?: string
}

const visibilityMeta: Record<RoomVisibility, { label: string; icon: typeof Globe }> = {
  public: { label: 'Public', icon: Globe },
  unlisted: { label: 'Unlisted', icon: EyeOff },
  private: { label: 'Private', icon: Lock },
}

function formatCreatedAt(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate))
}

export function RoomCard({ room, actionLabel = 'Join' }: RoomCardProps) {
  const visibility = visibilityMeta[room.visibility] ?? visibilityMeta.public
  const VisibilityIcon = visibility.icon

  return (
    <Card interactive padding="none" className="group flex flex-col overflow-hidden">
      <div className="flex items-start gap-3.5 p-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/20 text-white/80"
          aria-hidden="true"
        >
          <Music size={20} strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-section text-white">{room.name}</h3>
            {room.is_active ? (
              <Badge tone="live" pulse>
                LIVE
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-subtle">
            <VisibilityIcon size={12} strokeWidth={2.25} aria-hidden="true" />
            {visibility.label}
            <span aria-hidden="true">·</span>
            <span className="font-mono uppercase tracking-wider">{room.room_code}</span>
          </p>
        </div>
      </div>

      <p
        className={cx(
          'line-clamp-2 min-h-[2.5rem] px-4 text-sm leading-relaxed',
          room.description ? 'text-muted' : 'text-subtle italic',
        )}
      >
        {room.description || 'No description yet.'}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 p-4">
        <span className="text-xs text-subtle">Created {formatCreatedAt(room.created_at)}</span>
        <Link
          to={`/r/${room.room_code}`}
          aria-label={`${actionLabel} ${room.name} (${room.room_code})`}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-xl bg-surface-overlay px-3.5 py-2',
            'text-sm font-semibold text-white transition-all duration-150',
            'group-hover:bg-accent group-hover:shadow-raised hover:bg-accent active:scale-[0.98]',
          )}
        >
          {actionLabel}
          <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}
