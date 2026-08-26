import { Users } from 'lucide-react'
import { MemberCard } from '@/components/ui/MemberCard'
import type { Profile } from '@/types/profile'
import type { Room, RoomMember } from '@/types/room'

interface MembersPanelProps {
  members: RoomMember[]
  room: Room
  currentUserId?: string
  currentProfile: Profile | null
}

/** Presence list. */
export function MembersPanel({
  members,
  room,
  currentUserId,
  currentProfile,
}: MembersPanelProps) {
  const onlineMembers = members.filter((member) => member.is_online)
  const offlineMembers = members.filter((member) => !member.is_online)

  const renderMember = (member: RoomMember) => {
    const isYou = member.user_id === currentUserId
    // Your own row prefers the live auth profile so a rename shows immediately.
    const profile = (isYou && currentProfile) || member.profile

    return (
      <MemberCard
        key={member.user_id}
        name={profile?.display_name || 'Member'}
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        isOnline={member.is_online}
        isYou={isYou}
        isCreator={member.role === 'creator' || member.user_id === room.created_by}
        identityKey={member.user_id}
        unknownIdentity={!profile}
        profileUrl={profile ? `/u/${profile.username}` : undefined}
      />
    )
  }

  return (
    <section
      id="room-members"
      aria-label="Members"
      className="flex shrink-0 flex-col overflow-hidden rounded-card border border-border bg-surface-raised p-3.5 lg:max-h-[40%]"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-section">
          <Users size={16} strokeWidth={2.25} className="text-accent" aria-hidden="true" />
          Members
        </h2>
        <span className="font-mono text-xs text-subtle">{members.length}</span>
      </div>

      <div className="min-h-0 overflow-y-auto overscroll-contain">
        {onlineMembers.length > 0 ? (
          <>
            <p className="px-2.5 pb-1 pt-2 text-meta uppercase text-subtle">
              Listening — {onlineMembers.length}
            </p>
            <div className="space-y-0.5">{onlineMembers.map(renderMember)}</div>
          </>
        ) : (
          <p className="px-2.5 py-3 text-sm text-subtle">Nobody is listening right now.</p>
        )}

        {offlineMembers.length > 0 ? (
          <>
            <p className="px-2.5 pb-1 pt-4 text-meta uppercase text-subtle">
              Offline — {offlineMembers.length}
            </p>
            <div className="space-y-0.5">{offlineMembers.map(renderMember)}</div>
          </>
        ) : null}
      </div>
    </section>
  )
}
