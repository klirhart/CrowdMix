export type RoomVisibility = 'public' | 'unlisted' | 'private'
export type RoomMemberRole = 'creator' | 'member'

export interface Room {
  id: string
  room_code: string
  name: string
  description: string | null
  created_by: string
  visibility: RoomVisibility
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomCreate {
  name: string
  description?: string | null
  visibility: RoomVisibility
}

export interface RoomUpdate {
  name?: string
  description?: string | null
  visibility?: RoomVisibility
  is_active?: boolean
}

export interface RoomMemberProfile {
  username: string
  display_name: string
  avatar_url: string | null
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  role: RoomMemberRole
  joined_at: string
  left_at: string | null
  is_active: boolean
  hidden_from_profile: boolean
  pinned_at: string | null
  is_online: boolean
  profile?: RoomMemberProfile | null
}

export interface RoomMembershipHistory {
  room_id: string
  room_code: string
  name: string
  visibility: RoomVisibility
  room_is_active: boolean
  created_by: string
  creator_username: string
  creator_display_name: string
  role: RoomMemberRole
  joined_at: string
  left_at: string | null
  is_active: boolean
  pinned_at: string | null
}

export interface RoomWithMembers extends Room {
  room_members?: RoomMember[]
  member_count?: number
}

export interface RoomMessage {
  id: string
  room_id: string
  user_id: string
  body: string
  created_at: string
  profile?: RoomMemberProfile | null
}

/** True when this user is the creator of this room, not a global account role. */
export function isCreatorOfRoom(
  userId: string | undefined,
  room: Pick<Room, 'created_by'> | null | undefined,
  members: Array<Pick<RoomMember, 'user_id' | 'role'>>,
): boolean {
  if (!userId || !room) return false

  const membership = members.find((member) => member.user_id === userId)
  if (membership?.role) {
    return membership.role === 'creator'
  }

  return room.created_by === userId
}
