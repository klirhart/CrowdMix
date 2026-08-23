import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthErrorMessage } from '@/lib/auth-validation'
import { useState } from 'react'

export function UserMenu() {
  const { profile, signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!profile) {
    return null
  }

  const handleSignOut = async () => {
    setError(null)
    setLoading(true)

    try {
      await signOut()
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        to={`/u/${profile.username}`}
        className="hidden items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-overlay sm:flex"
      >
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size="sm" />
        <span className="text-sm font-medium">{profile.display_name}</span>
      </Link>

      <Button variant="ghost" onClick={handleSignOut} disabled={loading}>
        {loading ? 'Logging out...' : 'Log out'}
      </Button>

      {error ? <span className="sr-only">{error}</span> : null}
    </div>
  )
}
