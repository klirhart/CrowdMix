import type { Room, RoomCreate, RoomUpdate, RoomWithMembers, RoomMember, RoomMembershipHistory } from '@/types/room'
import { fetchProfilesByIds, searchProfiles } from '@/lib/profiles'
import { getSupabaseClient } from '@/lib/supabase'

function sanitizeSearchTerm(query: string): string {
  return query.trim().replace(/[%*,()"\\]/g, ' ').replace(/\s+/g, ' ').slice(0, 40)
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

/**
 * Creates a new room
 */
export async function createRoom(
  roomData: RoomCreate,
  userId: string,
): Promise<Room> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('create_room_with_member', {
    p_name: roomData.name,
    p_description: roomData.description,
    p_visibility: roomData.visibility,
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return data as Room
}

/**
 * Get a room by ID
 */
export async function getRoomById(roomId: string): Promise<Room | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('id', roomId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as Room) || null
}

/**
 * Get a room by room code
 */
export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as Room) || null
}

/**
 * Get a room with all members
 */
export async function getRoomWithMembers(
  roomId: string,
): Promise<RoomWithMembers | null> {
  const supabase = getSupabaseClient()

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select()
    .eq('id', roomId)
    .maybeSingle()

  if (roomError) {
    throw roomError
  }

  if (!room) {
    return null
  }

  const { data: members, error: membersError } = await supabase
    .from('room_members')
    .select()
    .eq('room_id', roomId)
    .eq('is_active', true)

  if (membersError) {
    throw membersError
  }

  return {
    ...(room as Room),
    room_members: members as RoomMember[],
    member_count: members?.length || 0,
  }
}

/**
 * Get public rooms (paginated)
 */
export async function getPublicRooms(
  limit = 20,
  offset = 0,
): Promise<Room[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('visibility', 'public')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw error
  }

  return (data as Room[]) || []
}

/**
 * Search public rooms by name, room code, or creator username/display name.
 */
export async function searchPublicRooms(query: string): Promise<Room[]> {
  const term = sanitizeSearchTerm(query)
  if (!term) {
    return []
  }

  const supabase = getSupabaseClient()
  const like = `%${term}%`

  const [byName, byCode, profiles] = await Promise.all([
    supabase
      .from('rooms')
      .select()
      .eq('visibility', 'public')
      .eq('is_active', true)
      .ilike('name', like)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('rooms')
      .select()
      .eq('visibility', 'public')
      .eq('is_active', true)
      .ilike('room_code', like)
      .order('created_at', { ascending: false })
      .limit(20),
    searchProfiles(term),
  ])

  if (byName.error) {
    throw byName.error
  }

  if (byCode.error) {
    throw byCode.error
  }

  let byCreator: Room[] = []
  const creatorIds = profiles.map((profile) => profile.id)

  if (creatorIds.length > 0) {
    const { data, error } = await supabase
      .from('rooms')
      .select()
      .eq('visibility', 'public')
      .eq('is_active', true)
      .in('created_by', creatorIds)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    byCreator = (data as Room[]) || []
  }

  const roomsById = new Map<string, Room>()
  for (const room of [...((byName.data as Room[]) || []), ...((byCode.data as Room[]) || []), ...byCreator]) {
    roomsById.set(room.id, room)
  }

  return [...roomsById.values()]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, 20)
}

/**
 * Get rooms created by a user
 */
export async function getRoomsCreatedByUser(userId: string): Promise<Room[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as Room[]) || []
}

/**
 * Get public rooms created by a user for display on their profile.
 */
export async function getPublicRoomsCreatedByUser(userId: string): Promise<Room[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('created_by', userId)
    .eq('visibility', 'public')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as Room[]) || []
}

/**
 * Room IDs this user has forgotten from their own profile history.
 * RLS only returns the caller's rows, so this is empty on other profiles.
 */
export async function getHiddenProfileRoomIds(userId: string): Promise<string[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId)
    .eq('hidden_from_profile', true)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => row.room_id)
}

/**
 * Get rooms a user has joined
 */
export async function getRoomsJoinedByUser(userId: string): Promise<Room[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .select('rooms(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: false })

  if (error) {
    throw error
  }

  return data?.map((rm: any) => rm.rooms).filter(Boolean) || []
}

/**
 * Update a room
 */
export async function updateRoom(
  roomId: string,
  updates: RoomUpdate,
): Promise<Room> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Room
}

/**
 * Delete a room
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId)

  if (error) {
    throw error
  }
}

/**
 * Add a member to a room
 */
export async function addRoomMember(
  roomId: string,
  userId: string,
): Promise<RoomMember> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .insert({
      room_id: roomId,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single()

  if (!error) {
    return data as RoomMember
  }

  if (!isUniqueViolation(error)) {
    throw error
  }

  const { data: existing, error: existingError } = await supabase
    .from('room_members')
    .update({
      is_active: true,
      left_at: null,
      hidden_from_profile: false,
      is_online: true,
    })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .select()
    .single()

  if (existingError) {
    throw existingError
  }

  return existing as RoomMember
}

/**
 * Remove a member from a room
 */
export async function removeRoomMember(
  roomId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('room_members')
    .update({
      is_active: false,
      left_at: new Date().toISOString(),
      is_online: false,
    })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw error
  }
}

/**
 * Get room members
 */
export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .select()
    .eq('room_id', roomId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  if (error) {
    throw error
  }

  const members = (data as RoomMember[]) || []
  const profiles = await fetchProfilesByIds(members.map((member) => member.user_id))

  return members.map((member) => {
    const profile = profiles.get(member.user_id)
    return {
      ...member,
      profile: profile
        ? {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }
        : member.profile ?? null,
    }
  })
}

/**
 * Check if user is member of room
 */
export async function isRoomMember(
  roomId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { count, error } = await supabase
    .from('room_members')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return (count ?? 0) > 0
}

/**
 * Hide a left room from this user's profile only. Does not delete the room.
 */
export async function forgetRoomHistory(roomId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .update({ hidden_from_profile: true })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .eq('is_active', false)
    .select('id')

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('Leave the room before removing it from your history.')
  }
}

export async function getProfileRoomHistory(userId: string): Promise<RoomMembershipHistory[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_profile_room_history', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return (data || []) as RoomMembershipHistory[]
}

/**
 * Pin or unpin a room on this user's personal list. Does not change membership.
 */
export async function setRoomPinned(
  roomId: string,
  userId: string,
  pinned: boolean,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .eq('hidden_from_profile', false)
    .select('id')

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('Unable to update this room on your list.')
  }
}

/**
 * Leave a room if needed, then hide it from this user's history only.
 */
export async function forgetRoomFromHistory(
  roomId: string,
  userId: string,
  currentlyActive: boolean,
): Promise<void> {
  if (currentlyActive) {
    await removeRoomMember(roomId, userId)
  }

  await forgetRoomHistory(roomId, userId)
}

/**
 * Update member online status
 */
export async function updateMemberOnlineStatus(
  roomId: string,
  userId: string,
  isOnline: boolean,
): Promise<RoomMember> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .update({ is_online: isOnline })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as RoomMember
}

const PRESENCE_LEAVE_MS = 800
const presenceLeaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

function presenceKey(roomId: string, userId: string): string {
  return `${roomId}:${userId}`
}

/**
 * Mark the current user as listening. Cancels a pending leave so React Strict
 * Mode remounts do not flash the creator/member as offline.
 */
export async function markMemberPresent(
  roomId: string,
  userId: string,
): Promise<RoomMember> {
  const key = presenceKey(roomId, userId)
  const pending = presenceLeaveTimers.get(key)
  if (pending !== undefined) {
    clearTimeout(pending)
    presenceLeaveTimers.delete(key)
  }

  return updateMemberOnlineStatus(roomId, userId, true)
}

/**
 * Mark the current user away after a short delay so a Strict Mode unmount
 * that is immediately followed by a remount does not persist is_online=false.
 */
export function scheduleMemberAway(roomId: string, userId: string): void {
  const key = presenceKey(roomId, userId)
  const pending = presenceLeaveTimers.get(key)
  if (pending !== undefined) {
    clearTimeout(pending)
  }

  presenceLeaveTimers.set(
    key,
    setTimeout(() => {
      presenceLeaveTimers.delete(key)
      void updateMemberOnlineStatus(roomId, userId, false).catch(() => undefined)
    }, PRESENCE_LEAVE_MS),
  )
}

/** Drop pending presence-leave timers without writing to the database. */
export function clearPresenceLeaveTimers(): void {
  for (const timer of presenceLeaveTimers.values()) {
    clearTimeout(timer)
  }
  presenceLeaveTimers.clear()
}
