import { User } from 'lucide-react'
import { cx } from './cx'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  displayName: string
  avatarUrl?: string | null
  size?: AvatarSize
  /** Render a neutral person glyph instead of initials, for identities whose name is unknown. */
  fallback?: 'initials' | 'icon'
  /** Stable string used to pick the fallback tint, so the same identity keeps the same color. */
  identityKey?: string
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl',
}

const iconSizes: Record<AvatarSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 26,
  xl: 40,
}

const tints = [
  'bg-accent/20 text-accent',
  'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300',
  'bg-indigo-500/20 text-indigo-300',
  'bg-teal-500/20 text-teal-300',
  'bg-fuchsia-500/20 text-fuchsia-300',
]

function pickTint(key: string): string {
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100000
  }
  return tints[hash % tints.length]
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

export function Avatar({
  displayName,
  avatarUrl,
  size = 'md',
  fallback = 'initials',
  identityKey,
  className = '',
}: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={cx(
          'shrink-0 rounded-full object-cover ring-1 ring-white/10',
          sizeClasses[size],
          className,
        )}
      />
    )
  }

  const tint = pickTint(identityKey ?? displayName)

  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-white/10',
        sizeClasses[size],
        tint,
        className,
      )}
      aria-hidden="true"
    >
      {fallback === 'icon' ? (
        <User size={iconSizes[size]} strokeWidth={2.25} />
      ) : (
        getInitials(displayName)
      )}
    </div>
  )
}
