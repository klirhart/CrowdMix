import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function HomePage() {
  const { profile } = useAuth()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">
        {profile ? `Welcome, ${profile.display_name}` : 'Home'}
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Your dashboard for joined rooms, discovery, and search will expand in later phases.
      </p>

      {profile ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/u/${profile.username}`}
            className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-overlay"
          >
            View your profile
          </Link>
          <Link
            to="/create-room"
            className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Create a room
          </Link>
        </div>
      ) : null}
    </div>
  )
}
