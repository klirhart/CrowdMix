import { Link } from 'react-router-dom'
import { ArrowRight, Music } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cx } from '@/components/ui/cx'
import type { RoomMembershipHistory } from '@/types/room'

interface ProfileRoomHistoryCardProps {
  membership: RoomMembershipHistory
  isOwnProfile: boolean
  forgetting?: boolean
  onForget?: () => void
}

function formatJoinedOn(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function ProfileRoomHistoryCard({
  membership,
  isOwnProfile,
  forgetting = false,
  onForget,
}: ProfileRoomHistoryCardProps) {
  const canOpen =
    membership.is_active
    || membership.visibility === 'public'
    || membership.visibility === 'unlisted'

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent-2/20 text-white/80"
          aria-hidden="true"
        >
          <Music size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-section text-white">{membership.name}</h3>
          <p className="mt-0.5 text-xs text-subtle">
            {membership.role === 'creator' ? 'Creator' : 'Member'}
            <span aria-hidden="true"> · </span>
            Created by {membership.creator_display_name}
          </p>
          <p className="mt-2 flex items-center gap-2">
            {membership.is_active ? (
              <Badge tone="online" pulse>
                Currently in room
              </Badge>
            ) : (
              <Badge tone="outline">Left</Badge>
            )}
          </p>
          <p className="mt-2 text-xs text-subtle">
            Joined {formatJoinedOn(membership.joined_at)}
            {membership.left_at ? ` · Left ${formatJoinedOn(membership.left_at)}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
        {isOwnProfile && !membership.is_active && onForget ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mr-auto"
            onClick={onForget}
            disabled={forgetting}
          >
            {forgetting ? 'Removing...' : 'Forget Room'}
          </Button>
        ) : null}
        {canOpen ? (
          <Link
            to={`/r/${membership.room_code}`}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg bg-surface-overlay px-3 py-1.5',
              'text-xs font-semibold text-white transition-all duration-150',
              'hover:bg-accent active:scale-[0.98]',
            )}
          >
            {membership.is_active ? 'Open Room' : 'Rejoin'}
            <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </Card>
  )
}
