import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { fetchProfileActivity, fetchProfileByUsername } from '@/lib/profiles'
import { getPublicRoomsCreatedByUser } from '@/lib/rooms'
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
  const [createdRooms, setCreatedRooms] = useState<Awaited<ReturnType<typeof getPublicRoomsCreatedByUser>>>([])
  const [activity, setActivity] = useState({ songsSuggested: 0, votesCast: 0, roomsJoined: 0 })
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

        const [nextRooms, nextActivity] = await Promise.all([
          getPublicRoomsCreatedByUser(nextProfile.id),
          fetchProfileActivity(nextProfile.id),
        ])

        if (!active) {
          return
        }

        setProfile(nextProfile)
        setCreatedRooms(nextRooms)
        setActivity(nextActivity)
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

      {/* Activity Stats */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Activity</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-raised p-6">
            <p className="text-sm text-muted uppercase tracking-wide">Songs Suggested</p>
            <p className="mt-2 text-3xl font-bold">{activity.songsSuggested}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-6">
            <p className="text-sm text-muted uppercase tracking-wide">Votes Cast</p>
            <p className="mt-2 text-3xl font-bold">{activity.votesCast}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-raised p-6">
            <p className="text-sm text-muted uppercase tracking-wide">Rooms Joined</p>
            <p className="mt-2 text-3xl font-bold">{activity.roomsJoined}</p>
          </div>
        </div>
      </section>

      {/* Public Rooms */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Public Rooms</h2>
        <div className="space-y-3">
          {createdRooms.length > 0 ? createdRooms.map((room) => (
            <div key={room.id} className="rounded-lg border border-border bg-surface-raised p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{room.name}</h3>
                  <p className="text-sm text-muted mt-1">
                    {room.description || 'A CrowdMix music room'}
                  </p>
                  <p className="text-xs text-muted mt-2">Room code: {room.room_code}</p>
                </div>
                <Link
                  to={`/join-room?room=${room.room_code}`}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Join
                </Link>
              </div>
            </div>
          )) : (
            <p className="text-sm text-muted">No public rooms created yet.</p>
          )}
        </div>
        {isOwnProfile && (
          <Link
            to="/create-room"
            className="mt-4 block w-full rounded-lg border border-border bg-surface-raised py-3 text-center font-semibold text-white transition-colors hover:bg-surface-overlay"
          >
            + Create a New Room
          </Link>
        )}
      </section>

      {/* About Section */}
      <section className="mt-10 rounded-lg border border-border bg-surface-raised p-6">
        <h2 className="font-semibold mb-4">About CrowdMix</h2>
        <p className="text-sm text-muted leading-relaxed">
          {profile.display_name} is part of the CrowdMix community where music is democratized.
          Everyone has equal voting power, and the crowd decides what plays next.
        </p>
      </section>
    </div>
  )
}
