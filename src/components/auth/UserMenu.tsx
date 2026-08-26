import { LogOut } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconButton } from '@/components/ui/IconButton'
import { cx } from '@/components/ui/cx'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@/lib/auth-validation'

interface UserMenuProps {
  /** 'sidebar' renders a full identity card; 'compact' renders avatar + sign out only. */
  variant?: 'sidebar' | 'compact'
}

export function UserMenu({ variant = 'sidebar' }: UserMenuProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const closeConfirm = useCallback(() => {
    if (loading) {
      return
    }

    setConfirmOpen(false)
    setError(null)
  }, [loading])

  if (!profile) {
    return null
  }

  const handleSignOut = async () => {
    setError(null)
    setLoading(true)

    try {
      navigate('/', { replace: true })
      await signOut()
      setConfirmOpen(false)
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  const signOutButton = (
    <IconButton
      label={loading ? 'Logging out...' : 'Log out'}
      icon={<LogOut size={17} strokeWidth={2.25} />}
      onClick={() => {
        setError(null)
        setConfirmOpen(true)
      }}
      disabled={loading}
      tone="danger"
      aria-haspopup="dialog"
      aria-expanded={confirmOpen}
    />
  )

  const confirmDialog = (
    <ConfirmDialog
      open={confirmOpen}
      title="Log out?"
      description="You'll need to sign in again to join rooms, suggest songs, and vote."
      confirmLabel={loading ? 'Logging out...' : 'Log out'}
      loading={loading}
      error={error}
      onConfirm={() => void handleSignOut()}
      onCancel={closeConfirm}
    />
  )

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <Link
          to={`/u/${profile.username}`}
          className="rounded-full transition-transform duration-150 hover:scale-105"
          aria-label={`Your profile, ${profile.display_name}`}
        >
          <Avatar
            displayName={profile.display_name}
            avatarUrl={profile.avatar_url}
            size="sm"
            identityKey={profile.id}
          />
        </Link>
        {signOutButton}
        {confirmDialog}
      </div>
    )
  }

  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-xl border border-transparent p-1.5',
        'transition-colors duration-150 hover:border-border hover:bg-surface-raised',
      )}
    >
      <Link
        to={`/u/${profile.username}`}
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <Avatar
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          size="sm"
          identityKey={profile.id}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">
            {profile.display_name}
          </span>
          <span className="block truncate text-xs text-subtle">@{profile.username}</span>
        </span>
      </Link>
      {signOutButton}
      {confirmDialog}
    </div>
  )
}
