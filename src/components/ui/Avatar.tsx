interface AvatarProps {
  displayName: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function Avatar({ displayName, avatarUrl, size = 'md' }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`rounded-full object-cover ${sizeClasses[size]}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-accent/20 font-semibold text-accent ${sizeClasses[size]}`}
      aria-hidden="true"
    >
      {getInitials(displayName)}
    </div>
  )
}
