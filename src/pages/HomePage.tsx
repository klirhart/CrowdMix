import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Music, Radio, SquarePlus } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { SectionHeading } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { RoomCard } from '@/components/ui/RoomCard'
import { RoomCardSkeleton } from '@/components/ui/Skeleton'
import { cx } from '@/components/ui/cx'
import { PageHeader, PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  getPublicRooms,
  getRoomsCreatedByUser,
  getRoomsJoinedByUser,
} from '@/lib/rooms'
import type { Room } from '@/types/room'

const quickActions = [
  {
    to: '/create-room',
    label: 'Create Room',
    description: 'Start a new session',
    icon: SquarePlus,
    primary: true,
  },
  {
    to: '/join-room',
    label: 'Join Room',
    description: 'Enter a code or scan',
    icon: Radio,
    primary: false,
  },
]

function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {quickActions.map((action) => {
        const Icon = action.icon

        return (
          <Link
            key={action.label}
            to={action.to}
            className={cx(
              'group flex items-center gap-3.5 rounded-card border p-4',
              'transition-all duration-200 hover:-translate-y-0.5',
              action.primary
                ? 'border-accent/40 bg-gradient-to-br from-accent/20 to-accent-2/10 hover:border-accent/70 hover:shadow-glow'
                : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface-overlay hover:shadow-raised',
            )}
          >
            <span
              className={cx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                action.primary
                  ? 'bg-accent text-white'
                  : 'bg-surface-overlay text-accent group-hover:bg-accent group-hover:text-white',
              )}
              aria-hidden="true"
            >
              <Icon size={18} strokeWidth={2.25} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{action.label}</span>
              <span className="block truncate text-xs text-subtle">{action.description}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function RoomGrid({ rooms }: { rooms: Room[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  )
}

export function HomePage() {
  const { user, profile, isConfigured } = useAuth()
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([])
  const [createdRooms, setCreatedRooms] = useState<Room[]>([])
  const [publicRooms, setPublicRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle('Home')

  useEffect(() => {
    const userId = user?.id

    if (!isConfigured || !userId || !profile || profile.id !== userId) {
      setJoinedRooms([])
      setCreatedRooms([])
      setPublicRooms([])
      setLoading(Boolean(userId && profile && profile.id !== userId))
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setJoinedRooms([])
    setCreatedRooms([])
    setPublicRooms([])

    const loadRooms = async () => {
      try {
        const [joined, created, publicList] = await Promise.all([
          getRoomsJoinedByUser(userId),
          getRoomsCreatedByUser(userId),
          getPublicRooms(20),
        ])

        if (cancelled) {
          return
        }

        setJoinedRooms(joined)
        setCreatedRooms(created)
        setPublicRooms(publicList.filter((room) => room.visibility === 'public'))
      } catch (err) {
        if (cancelled) {
          return
        }
        setError(
          err instanceof Error ? err.message : 'Failed to load rooms'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRooms()

    return () => {
      cancelled = true
    }
  }, [profile?.id, user?.id, isConfigured])

  const memberRooms = profile
    ? joinedRooms.filter((room) => room.created_by !== profile.id)
    : joinedRooms

  if (loading) {
    return (
      <PageShell width="full" className="home-page">
        <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-surface-overlay/70" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="h-[74px] animate-pulse rounded-card border border-border bg-surface-raised"
            />
          ))}
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {[0, 1, 2].map((key) => (
            <RoomCardSkeleton key={key} />
          ))}
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell width="full" className="home-page">
      <PageHeader
        eyebrow="Your dashboard"
        title={profile ? `Welcome back, ${profile.display_name}` : 'Home'}
        description="Create rooms, discover music, and join the crowd."
      />

      <div className="mt-8">
        <QuickActions />
      </div>

      {error && (
        <Alert variant="error" className="mt-8">
          {error}
        </Alert>
      )}

      {createdRooms.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            title="Rooms You Created"
            description="Rooms where you are the creator"
            icon={<SquarePlus size={17} strokeWidth={2.25} />}
            className="mb-5"
          />
          <RoomGrid rooms={createdRooms} />
        </section>
      )}

      {memberRooms.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            title="Rooms You Joined"
            description="Rooms where you are a member"
            icon={<Music size={17} strokeWidth={2.25} />}
            className="mb-5"
          />
          <RoomGrid rooms={memberRooms} />
        </section>
      )}

      <section className="mt-12">
        <SectionHeading
          title="Discover Public Rooms"
          description="Find and join public rooms from the community"
          icon={<Compass size={17} strokeWidth={2.25} />}
          className="mb-5"
        />
        {publicRooms.length > 0 ? (
          <RoomGrid rooms={publicRooms} />
        ) : (
          <EmptyState
            icon={<Compass size={24} strokeWidth={2} />}
            title="No public rooms yet"
            description="Be the first to start one and invite the crowd."
            action={
              <Link
                to="/create-room"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-raised transition-all duration-150 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]"
              >
                <SquarePlus size={15} strokeWidth={2.5} aria-hidden="true" />
                Create Room
              </Link>
            }
          />
        )}
      </section>
    </PageShell>
  )
}
