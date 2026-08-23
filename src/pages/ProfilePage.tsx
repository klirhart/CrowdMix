import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { fetchProfileByUsername } from '@/lib/profiles'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

function formatJoinDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { profile: currentProfile } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      setLoading(false)
      setError('Profile not found.')
      return
    }

    if (!isSupabaseConfigured()) {
      setLoading(false)
      setError('Profiles require Supabase to be configured.')
      return
    }

    let active = true

    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const nextProfile = await fetchProfileByUsername(username)

        if (!active) {
          return
        }

        if (!nextProfile) {
          setProfile(null)
          setError('This profile does not exist.')
          return
        }

        setProfile(nextProfile)
      } catch {
        if (active) {
          setError('Unable to load this profile right now.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [username])

  if (loading) {
    return <LoadingSpinner label="Loading profile..." />
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Alert variant="error">{error ?? 'Profile not found.'}</Alert>
        <Link to="/" className="mt-6 inline-block text-sm text-accent hover:text-accent-hover">
          Back to CrowdMix
        </Link>
      </div>
    )
  }

  const isOwnProfile = currentProfile?.id === profile.id

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size="lg" />
        <div>
          <h1 className="text-3xl font-bold">{profile.display_name}</h1>
          <p className="mt-1 font-mono text-muted">@{profile.username}</p>
          <p className="mt-2 text-sm text-muted">Joined {formatJoinDate(profile.created_at)}</p>
          {isOwnProfile ? (
            <p className="mt-3 text-sm text-accent">This is your profile.</p>
          ) : null}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Public Rooms</h2>
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface-raised px-4 py-8 text-sm text-muted">
          Public room listings will appear here in Phase 6.
        </p>
      </section>
    </div>
  )
}
