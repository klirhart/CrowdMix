import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPublicRooms,
  getRoomsCreatedByUser,
  getRoomsJoinedByUser,
} from '@/lib/rooms'
import type { Room } from '@/types/room'

function RoomCard({ room, showCreator = true }: { room: Room; showCreator?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:bg-surface-overlay">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-white">{room.name}</h3>
          {showCreator && (
            <p className="mt-1 text-sm text-muted">Created by @{room.created_by}</p>
          )}
          {room.description && (
            <p className="mt-2 text-sm text-muted line-clamp-2">{room.description}</p>
          )}
          <p className="mt-2 text-xs text-muted">Code: {room.room_code}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {room.is_active && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-400 whitespace-nowrap">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              LIVE
            </span>
          )}
        </div>
      </div>
      <Link
        to={`/join-room?room=${room.room_code}`}
        className="mt-4 block w-full rounded-lg bg-accent py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Join
      </Link>
    </div>
  )
}

export function HomePage() {
  const { profile, isConfigured } = useAuth()
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([])
  const [createdRooms, setCreatedRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRooms = async () => {
      if (!profile || !isConfigured) {
        setLoading(false)
        return
      }

      try {
        const [joined, created, publicList] = await Promise.all([
          getRoomsJoinedByUser(profile.id),
          getRoomsCreatedByUser(profile.id),
          getPublicRooms(20),
        ])

        setJoinedRooms(joined)
        setCreatedRooms(created)
        setPublicRooms(publicList)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load rooms'
        )
      } finally {
        setLoading(false)
      }
    }

    loadRooms()
  }, [profile, isConfigured])

  if (loading) {
    return <LoadingSpinner label="Loading rooms..." />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {profile ? `Welcome back, ${profile.display_name}` : 'Home'}
          </h1>
          <p className="mt-2 text-muted">
            Create rooms, discover music, and join the crowd
          </p>
        </div>
        {profile && (
          <Link
            to={`/u/${profile.username}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-2 transition-colors hover:bg-surface-overlay"
          >
            <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size="sm" />
            <span className="text-sm font-medium">@{profile.username}</span>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          to="/create-room"
          className="rounded-lg bg-accent px-6 py-4 text-center font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          + Create Room
        </Link>
        <Link
          to="/join-room"
          className="rounded-lg border border-border bg-surface-raised px-6 py-4 text-center font-semibold text-white transition-colors hover:bg-surface-overlay"
        >
          Join Room
        </Link>
        <Link
          to="/home"
          className="rounded-lg border border-border bg-surface-raised px-6 py-4 text-center font-semibold text-white transition-colors hover:bg-surface-overlay"
        >
          Search Rooms
        </Link>
      </div>

      {/* Your Rooms */}
      {error && <Alert variant="error">{error}</Alert>}

      {joinedRooms.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Your Rooms</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joinedRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      {/* Rooms You Created */}
      {createdRooms.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Rooms You Created</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {createdRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      )}

      {/* Discover Rooms */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">Discover Public Rooms</h2>
        <p className="mt-2 text-sm text-muted">
          Find and join public rooms from the community
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publicRooms.length > 0 ? (
            publicRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))
          ) : (
            <p className="text-muted col-span-full">No public rooms yet. Create one!</p>
          )}
        </div>
      </section>

      {/* Empty State */}
      {joinedRooms.length === 0 && createdRooms.length === 0 && (
        <section className="mt-12 rounded-lg border border-border bg-surface-raised p-8 text-center">
          <h3 className="text-lg font-semibold">Get started with CrowdMix</h3>
          <p className="mt-2 text-muted">
            Create your first room or join an existing one to start voting
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/create-room"
              className="rounded-lg bg-accent px-6 py-2 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Create Room
            </Link>
            <Link
              to="/join-room"
              className="rounded-lg border border-border bg-surface-overlay px-6 py-2 font-semibold text-white transition-colors hover:bg-surface-overlay"
            >
              Join Room
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
