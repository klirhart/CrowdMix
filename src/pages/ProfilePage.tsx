import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Compass, Globe, MapPin, Music, Pencil, SquarePlus, ThumbsUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RoomCard } from '@/components/ui/RoomCard'
import { SectionHeading } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast } from '@/components/ui/Toast'
import { ProfileRoomHistoryCard } from '@/components/profile/ProfileRoomHistoryCard'
import { EditProfileModal } from '@/components/profile/EditProfileModal'
import { cx } from '@/components/ui/cx'
import { PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { fetchProfileActivity, fetchProfileByUsername } from '@/lib/profiles'
import { forgetRoomHistory, getHiddenProfileRoomIds, getProfileRoomHistory, getPublicRoomsCreatedByUser } from '@/lib/rooms'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/profile'
import type { RoomMembershipHistory } from '@/types/room'

function websiteLabel(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
    return `${host}${path}`
  } catch {
    return url
  }
}

function formatJoinDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate))
}

const statMeta = [
  { key: 'songsSuggested' as const, label: 'Songs suggested', icon: Music },
  { key: 'votesCast' as const, label: 'Votes cast', icon: ThumbsUp },
  { key: 'roomsJoined' as const, label: 'Rooms joined', icon: Compass },
]

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { profile: currentProfile, applyProfile } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [createdRooms, setCreatedRooms] = useState<Awaited<ReturnType<typeof getPublicRoomsCreatedByUser>>>([])
  const [roomHistory, setRoomHistory] = useState<RoomMembershipHistory[]>([])
  const [activity, setActivity] = useState({ songsSuggested: 0, votesCast: 0, roomsJoined: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [forgetTarget, setForgetTarget] = useState<RoomMembershipHistory | null>(null)
  const [forgetting, setForgetting] = useState(false)
  const [forgetError, setForgetError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const skipReloadForUsername = useRef<string | null>(null)

  usePageTitle(
    profile?.display_name || profile?.username || (error ? 'Profile not found' : 'Profile'),
  )

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

    if (skipReloadForUsername.current === username.toLowerCase()) {
      skipReloadForUsername.current = null
      setLoading(false)
      return
    }

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

        const [nextRooms, nextActivity, nextHistory, hiddenRoomIds] = await Promise.all([
          getPublicRoomsCreatedByUser(nextProfile.id),
          fetchProfileActivity(nextProfile.id),
          getProfileRoomHistory(nextProfile.id),
          getHiddenProfileRoomIds(nextProfile.id),
        ])

        if (!active) {
          return
        }

        const hidden = new Set(hiddenRoomIds)

        setProfile(nextProfile)
        setCreatedRooms(nextRooms.filter((room) => !hidden.has(room.id)))
        setRoomHistory(nextHistory)
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
    return (
      <PageShell>
        <div className="relative overflow-hidden rounded-panel border border-border bg-surface-raised">
          <Skeleton className="h-36 w-full rounded-none sm:h-44 lg:h-52" />
          <div className="px-5 pb-6 sm:px-7">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5">
              <Skeleton className="h-24 w-24 rounded-full sm:h-28 sm:w-28" />
              <div className="w-full space-y-3">
                <Skeleton className="h-8 w-56 max-w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[104px] rounded-card" />
          ))}
        </div>
      </PageShell>
    )
  }

  if (error || !profile) {
    return (
      <PageShell width="narrow">
        <Alert variant="error">{error ?? 'Profile not found.'}</Alert>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          <ArrowLeft size={15} strokeWidth={2.5} aria-hidden="true" />
          Back to CrowdMix
        </Link>
      </PageShell>
    )
  }

  const isOwnProfile = currentProfile?.id === profile.id
  const createdHistory = roomHistory.filter((membership) => membership.role === 'creator')
  const joinedHistory = roomHistory.filter((membership) => membership.role === 'member')

  const handleProfileSaved = (updated: Profile) => {
    setProfile(updated)
    applyProfile(updated)
    setEditing(false)
    setToast('Profile updated')

    if (updated.username !== username) {
      skipReloadForUsername.current = updated.username
      navigate(`/u/${updated.username}`, { replace: true })
    }
  }

  const handleForgetRoom = async () => {
    if (!forgetTarget || !currentProfile) return

    setForgetting(true)
    setForgetError(null)
    try {
      await forgetRoomHistory(forgetTarget.room_id, currentProfile.id)
      setRoomHistory((current) =>
        current.filter((membership) => membership.room_id !== forgetTarget.room_id),
      )
      setCreatedRooms((current) =>
        current.filter((room) => room.id !== forgetTarget.room_id),
      )
      setActivity((current) => ({
        ...current,
        roomsJoined: Math.max(0, current.roomsJoined - 1),
      }))
      setForgetTarget(null)
    } catch (caught) {
      setForgetError(caught instanceof Error ? caught.message : 'Unable to forget this room.')
    } finally {
      setForgetting(false)
    }
  }

  return (
    <PageShell>
      {/* Profile header with cover, avatar, and identity */}
      <div className="relative rounded-panel border border-border bg-surface-raised">
        <div className="relative h-36 overflow-hidden rounded-t-panel bg-gradient-to-r from-accent/35 via-accent-2/25 to-transparent sm:h-44 lg:h-52">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="relative z-10 px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5">
            <div className="relative z-10 shrink-0 rounded-full ring-4 ring-surface-raised">
              <Avatar
                displayName={profile.display_name}
                avatarUrl={profile.avatar_url}
                size="xl"
                identityKey={profile.id}
              />
            </div>

            <div className="min-w-0 flex-1 sm:pb-1.5">
              <h1 className="truncate text-display">{profile.display_name}</h1>
              <p className="mt-1 font-mono text-sm text-muted">@{profile.username}</p>
            </div>

            {isOwnProfile ? (
              <Button
                variant="secondary"
                className="sm:mb-1.5"
                onClick={() => setEditing(true)}
              >
                <Pencil size={15} strokeWidth={2.25} aria-hidden="true" />
                Edit Profile
              </Button>
            ) : null}
          </div>

          {profile.bio ? (
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted whitespace-pre-wrap">
              {profile.bio}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-subtle">
            <p className="flex items-center gap-2">
              <Calendar size={14} strokeWidth={2.25} aria-hidden="true" />
              Joined {formatJoinDate(profile.created_at)}
            </p>
            {profile.location ? (
              <p className="flex items-center gap-2">
                <MapPin size={14} strokeWidth={2.25} aria-hidden="true" />
                {profile.location}
              </p>
            ) : null}
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-accent transition-colors hover:text-accent-hover"
              >
                <Globe size={14} strokeWidth={2.25} aria-hidden="true" />
                {websiteLabel(profile.website)}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <section className="mt-10">
        <SectionHeading title="Activity" className="mb-5" />
        <div className="grid gap-4 sm:grid-cols-3">
          {statMeta.map((stat) => {
            const StatIcon = stat.icon

            return (
              <div
                key={stat.key}
                className={cx(
                  'rounded-card border border-border bg-surface-raised p-5',
                  'transition-colors duration-200 hover:border-border-strong',
                )}
              >
                <div className="flex items-center gap-2 text-subtle">
                  <StatIcon size={14} strokeWidth={2.25} aria-hidden="true" />
                  <p className="text-meta uppercase">{stat.label}</p>
                </div>
                <p className="mt-2.5 font-mono text-3xl font-bold tabular-nums text-ink">
                  {activity[stat.key]}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Rooms"
          description={
            isOwnProfile
              ? 'Rooms you created, and rooms you joined as a member'
              : `Rooms ${profile.display_name} has created or joined`
          }
          icon={<Compass size={17} strokeWidth={2.25} />}
          className="mb-5"
        />

        {roomHistory.length === 0 ? (
          <EmptyState
            icon={<Music size={24} strokeWidth={2} />}
            title="No rooms yet"
            description={
              isOwnProfile
                ? 'Join or create a room and it will show up here, even after you leave.'
                : 'This member has not joined any public rooms yet.'
            }
          />
        ) : (
          <div className="space-y-8">
            {createdHistory.length > 0 ? (
              <div>
                <h3 className="mb-3 text-meta uppercase text-subtle">Created</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {createdHistory.map((membership) => (
                    <ProfileRoomHistoryCard
                      key={membership.room_id}
                      membership={membership}
                      isOwnProfile={isOwnProfile}
                      forgetting={forgetting && forgetTarget?.room_id === membership.room_id}
                      onForget={
                        isOwnProfile && !membership.is_active
                          ? () => {
                              setForgetError(null)
                              setForgetTarget(membership)
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {joinedHistory.length > 0 ? (
              <div>
                <h3 className="mb-3 text-meta uppercase text-subtle">Joined</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {joinedHistory.map((membership) => (
                    <ProfileRoomHistoryCard
                      key={membership.room_id}
                      membership={membership}
                      isOwnProfile={isOwnProfile}
                      forgetting={forgetting && forgetTarget?.room_id === membership.room_id}
                      onForget={
                        isOwnProfile && !membership.is_active
                          ? () => {
                              setForgetError(null)
                              setForgetTarget(membership)
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Public Rooms */}
      <section className="mt-10">
        <SectionHeading
          title="Public Rooms"
          description={
            isOwnProfile
              ? 'Rooms you created that anyone can join'
              : `Rooms ${profile.display_name} created`
          }
          icon={<Music size={17} strokeWidth={2.25} />}
          className="mb-5"
        />

        {createdRooms.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {createdRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Music size={24} strokeWidth={2} />}
            title="No public rooms yet"
            description={
              isOwnProfile
                ? 'Create a public room and it will show up here.'
                : 'This member has not created any public rooms.'
            }
            action={
              isOwnProfile ? (
                <Link
                  to="/create-room"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-raised transition-all duration-150 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]"
                >
                  <SquarePlus size={15} strokeWidth={2.5} aria-hidden="true" />
                  Create a Room
                </Link>
              ) : null
            }
          />
        )}

        {isOwnProfile && createdRooms.length > 0 ? (
          <Link
            to="/create-room"
            className={cx(
              'mt-4 flex items-center justify-center gap-2 rounded-card border border-dashed border-border',
              'bg-surface-raised/60 py-3.5 text-sm font-semibold text-muted',
              'transition-all duration-150 hover:border-accent/50 hover:bg-surface-overlay hover:text-ink',
            )}
          >
            <SquarePlus size={16} strokeWidth={2.25} aria-hidden="true" />
            Create a New Room
          </Link>
        ) : null}
      </section>

      {isOwnProfile ? (
        <EditProfileModal
          open={editing}
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}

      <Toast message={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={forgetTarget !== null}
        title="Remove from your history?"
        description={
          forgetTarget
            ? `${forgetTarget.name} will disappear from your profile. The room stays up for everyone else.`
            : ''
        }
        confirmLabel={forgetting ? 'Removing...' : 'Forget Room'}
        loading={forgetting}
        error={forgetError}
        onConfirm={() => void handleForgetRoom()}
        onCancel={() => {
          if (!forgetting) {
            setForgetTarget(null)
            setForgetError(null)
          }
        }}
      />
    </PageShell>
  )
}
