import type { Room, RoomCreate, RoomUpdate, RoomWithMembers, RoomMember } from '@/types/room'
import { getSupabaseClient } from '@/lib/supabase'

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
    .single()

  if (error && error.code !== 'PGRST116') {
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
    .single()

  if (error && error.code !== 'PGRST116') {
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
    .single()

  if (roomError && roomError.code !== 'PGRST116') {
    throw roomError
  }

  if (!room) {
    return null
  }

  const { data: members, error: membersError } = await supabase
    .from('room_members')
    .select()
    .eq('room_id', roomId)

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
 * Search public rooms by name or creator
 */
export async function searchPublicRooms(query: string): Promise<Room[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('visibility', 'public')
    .eq('is_active', true)
    .or(
      `name.ilike.%${query}%,room_code.ilike.%${query}%`,
    )
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throw error
  }

  return (data as Room[]) || []
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
 * Get rooms a user has joined
 */
export async function getRoomsJoinedByUser(userId: string): Promise<Room[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('room_members')
    .select('rooms(*)')
    .eq('user_id', userId)
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
    })
    .select()
    .single()

  if (error && error.code !== '23505') {
    // 23505 is unique constraint violation (user already member)
    throw error
  }

  return data as RoomMember
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
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)

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
    .order('joined_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data as RoomMember[]) || []
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

  if (error) {
    throw error
  }

  return (count ?? 0) > 0
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
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as RoomMember
}
