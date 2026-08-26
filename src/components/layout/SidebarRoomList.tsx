import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DoorOpen, EllipsisVertical, Music, Pin, PinOff, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Menu } from '@/components/ui/Menu'
import { cx } from '@/components/ui/cx'
import {
  forgetRoomFromHistory,
  getProfileRoomHistory,
  removeRoomMember,
  setRoomPinned,
} from '@/lib/rooms'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { RoomMembershipHistory } from '@/types/room'

interface SidebarRoomListProps {
  userId: string
}

type PendingAction =
  | { type: 'leave'; room: RoomMembershipHistory }
  | { type: 'forget'; room: RoomMembershipHistory }

function compareSidebarRooms(left: RoomMembershipHistory, right: RoomMembershipHistory): number {
  const leftPin = left.pinned_at ? Date.parse(left.pinned_at) : 0
  const rightPin = right.pinned_at ? Date.parse(right.pinned_at) : 0
  if (leftPin !== rightPin) return rightPin - leftPin
  if (left.is_active !== right.is_active) return left.is_active ? -1 : 1
  return Date.parse(right.joined_at) - Date.parse(left.joined_at)
}

function splitRoomsByRole(rooms: RoomMembershipHistory[]) {
  const created = rooms.filter((room) => room.role === 'creator').sort(compareSidebarRooms)
  const joined = rooms.filter((room) => room.role === 'member').sort(compareSidebarRooms)
  return { created, joined }
}

function canOpenRoom(membership: RoomMembershipHistory, userId: string): boolean {
  return (
    membership.is_active
    || membership.visibility === 'public'
    || membership.visibility === 'unlisted'
    || membership.created_by === userId
  )
}

function SidebarRoomRow({
  membership,
  userId,
  active,
  onLeave,
  onForget,
  onPin,
}: {
  membership: RoomMembershipHistory
  userId: string
  active: boolean
  onLeave: () => void
  onForget: () => void
  onPin: (pinned: boolean) => void
}) {
  const pinned = Boolean(membership.pinned_at)
  const openable = canOpenRoom(membership, userId)
  const roomPath = `/r/${membership.room_code}`

  const content = (
    <>
      <span
        className={cx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-accent/30 text-white' : 'bg-surface-overlay text-subtle',
        )}
        aria-hidden="true"
      >
        <Music size={14} strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white">{membership.name}</span>
          {pinned ? <Pin size={11} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden="true" /> : null}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-subtle">
          {membership.is_active ? 'In room' : 'Left'}
        </span>
      </span>
    </>
  )

  return (
    <div
      className={cx(
        'group relative flex items-center gap-1 rounded-xl py-1 pl-1 pr-0.5',
        'transition-colors duration-150',
        active ? 'bg-accent-soft' : 'hover:bg-surface-overlay',
      )}
    >
      {openable ? (
        <Link
          to={roomPath}
          aria-current={active ? 'page' : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5">
          {content}
        </div>
      )}

      <Menu
        label={`More options for ${membership.name}`}
        trigger={<EllipsisVertical size={15} strokeWidth={2.25} />}
        items={[
          {
            id: 'pin',
            label: pinned ? 'Unpin' : 'Pin room',
            icon: pinned
              ? <PinOff size={15} strokeWidth={2.25} />
              : <Pin size={15} strokeWidth={2.25} />,
            onSelect: () => onPin(!pinned),
          },
          ...(membership.is_active
            ? [{
                id: 'leave',
                label: 'Leave room',
                icon: <DoorOpen size={15} strokeWidth={2.25} />,
                onSelect: onLeave,
              }]
            : []),
          {
            id: 'forget',
            label: 'Remove from my list',
            icon: <Trash2 size={15} strokeWidth={2.25} />,
            tone: 'danger' as const,
            onSelect: onForget,
          },
        ]}
      />
    </div>
  )
}

export function SidebarRoomList({ userId }: SidebarRoomListProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [rooms, setRooms] = useState<RoomMembershipHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [working, setWorking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    let active = true

    const loadRooms = async () => {
      try {
        const nextRooms = await getProfileRoomHistory(userId)
        if (active) {
          setRooms(nextRooms)
        }
      } catch {
        if (active) {
          setRooms([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadRooms()

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`sidebar-rooms:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadRooms()
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const confirmCopy = useMemo(() => {
    if (!pending) {
      return { title: '', description: '', confirmLabel: 'Confirm' }
    }

    if (pending.type === 'leave') {
      return {
        title: 'Leave this room?',
        description: `${pending.room.name} will stay on your list as Left. Everyone else can keep using the room.`,
        confirmLabel: working ? 'Leaving...' : 'Leave room',
      }
    }

    return {
      title: 'Remove from your list?',
      description: pending.room.is_active
        ? `${pending.room.name} will leave your session and disappear from your list. The room stays up for everyone else.`
        : `${pending.room.name} will disappear from your list. The room stays up for everyone else.`,
      confirmLabel: working ? 'Removing...' : 'Remove from my list',
    }
  }, [pending, working])

  const handleConfirm = async () => {
    if (!pending) {
      return
    }

    setWorking(true)
    setActionError(null)

    try {
      if (pending.type === 'leave') {
        await removeRoomMember(pending.room.room_id, userId)
        if (pathname === `/r/${pending.room.room_code}`) {
          navigate('/home')
        }
      } else {
        await forgetRoomFromHistory(
          pending.room.room_id,
          userId,
          pending.room.is_active,
        )
        if (pending.room.is_active && pathname === `/r/${pending.room.room_code}`) {
          navigate('/home')
        }
      }

      setRooms((current) => {
        if (pending.type === 'forget') {
          return current.filter((room) => room.room_id !== pending.room.room_id)
        }

        return current.map((room) =>
          room.room_id === pending.room.room_id
            ? { ...room, is_active: false, left_at: new Date().toISOString() }
            : room,
        )
      })
      setPending(null)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to update this room.')
    } finally {
      setWorking(false)
    }
  }

  const handlePin = async (room: RoomMembershipHistory, pinned: boolean) => {
    const nextPinnedAt = pinned ? new Date().toISOString() : null
    setRooms((current) => {
      const next = current.map((item) =>
        item.room_id === room.room_id ? { ...item, pinned_at: nextPinnedAt } : item,
      )
      return next
    })

    try {
      await setRoomPinned(room.room_id, userId, pinned)
    } catch {
      setRooms((current) =>
        current.map((item) =>
          item.room_id === room.room_id ? { ...item, pinned_at: room.pinned_at } : item,
        ),
      )
    }
  }

  const { created, joined } = splitRoomsByRole(rooms)

  const renderRoomRows = (list: RoomMembershipHistory[]) =>
    list.map((membership) => (
      <SidebarRoomRow
        key={membership.room_id}
        membership={membership}
        userId={userId}
        active={pathname === `/r/${membership.room_code}`}
        onLeave={() => {
          setActionError(null)
          setPending({ type: 'leave', room: membership })
        }}
        onForget={() => {
          setActionError(null)
          setPending({ type: 'forget', room: membership })
        }}
        onPin={(pinned) => {
          void handlePin(membership, pinned)
        }}
      />
    ))

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col">
      <p className="px-3 pb-2 text-meta uppercase text-subtle">Rooms</p>
      <div className="sidebar-room-list">
        {loading ? (
          <div className="space-y-1 px-1">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-12 animate-pulse rounded-xl bg-surface-overlay/70" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-relaxed text-subtle">
            Join a room and it will show up here, even after you leave.
          </p>
        ) : (
          <div className="space-y-4">
            {created.length > 0 ? (
              <div>
                <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Created
                </p>
                {renderRoomRows(created)}
              </div>
            ) : null}
            {joined.length > 0 ? (
              <div>
                <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  Joined
                </p>
                {renderRoomRows(joined)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        loading={working}
        error={actionError}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!working) {
            setPending(null)
            setActionError(null)
          }
        }}
      />
    </div>
  )
}
