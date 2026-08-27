import { Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cx } from '@/components/ui/cx'

interface MemberCardProps {
  name: string
  username?: string
  avatarUrl?: string | null
  isOnline: boolean
  /** Highlights the signed-in user's own row. */
  isYou?: boolean
  isCreator?: boolean
  /** Stable id used for the avatar tint so a member keeps the same color. */
  identityKey?: string
  /** True when only the member id is known, so initials would be meaningless. */
  unknownIdentity?: boolean
  profileUrl?: string
}

export function MemberCard({
  name,
  username,
  avatarUrl,
  isOnline,
  isYou = false,
  isCreator = false,
  identityKey,
  unknownIdentity = false,
  profileUrl,
}: MemberCardProps) {
  const content = (
    <>
      <div className="relative shrink-0">
        <Avatar
          displayName={name}
          avatarUrl={avatarUrl}
          size="sm"
          identityKey={identityKey}
          fallback={unknownIdentity ? 'icon' : 'initials'}
        />
        <span
          className={cx(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-raised',
            isOnline ? 'bg-online' : 'bg-subtle',
          )}
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5">
          <span
            className={cx(
              'truncate text-sm font-semibold',
              isOnline ? 'text-ink' : 'text-muted',
            )}
          >
            {name}
          </span>
          {isCreator ? (
            <Crown
              size={13}
              strokeWidth={2.5}
              className="shrink-0 text-amber-400"
              aria-label="Room creator"
            />
          ) : null}
        </p>
        {username ? (
          <p className="truncate text-xs text-subtle">@{username}</p>
        ) : (
          <p className="text-xs text-subtle">{isOnline ? 'Listening' : 'Away'}</p>
        )}
      </div>

      {isYou ? <Badge tone="accent">You</Badge> : null}
    </>
  )

  const shell = cx(
    'flex min-w-0 w-full items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-150',
    isOnline ? 'hover:bg-surface-overlay' : 'opacity-60 hover:opacity-100',
  )

  if (profileUrl) {
    return (
      <Link to={profileUrl} className={shell}>
        {content}
      </Link>
    )
  }

  return <div className={shell}>{content}</div>
}
