import { Avatar } from './Avatar'

interface MemberCardProps {
  name: string
  username: string
  isOnline: boolean
  profileUrl?: string
}

export function MemberCard({
  name,
  username,
  isOnline,
  profileUrl,
}: MemberCardProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <Avatar displayName={name} size="md" />
        {isOnline && (
          <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-surface" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${isOnline ? 'text-white' : 'text-muted'}`}>
          {name}
        </p>
        <p className="text-xs text-muted truncate">@{username}</p>
      </div>
    </div>
  )

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        className={`rounded-lg p-3 transition-colors ${
          isOnline
            ? 'border border-border bg-surface-raised hover:bg-surface-overlay'
            : 'border border-border bg-surface-raised/50 opacity-60'
        }`}
      >
        {content}
      </a>
    )
  }

  return (
    <div
      className={`rounded-lg p-3 ${
        isOnline
          ? 'border border-border bg-surface-raised'
          : 'border border-border bg-surface-raised/50 opacity-60'
      }`}
    >
      {content}
    </div>
  )
}
