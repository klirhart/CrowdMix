import { getSupabaseClient } from '@/lib/supabase'

export type JoinRequestStatus = 'pending' | 'approved' | 'declined'

export interface PrivateRoomAccess {
  found: boolean
  inactive?: boolean
  is_member?: boolean
  can_request?: boolean
  status?: JoinRequestStatus | null
  room_code?: string
  room_name?: string
}

export interface PendingJoinRequest {
  id: string
  room_id: string
  requester_id: string
  created_at: string
  room_code: string
  room_name: string
  requester_username: string
  requester_display_name: string
  requester_avatar_url: string | null
}

function asAccess(value: unknown): PrivateRoomAccess {
  if (!value || typeof value !== 'object') {
    return { found: false }
  }

  return value as PrivateRoomAccess
}

export async function getPrivateRoomAccess(roomCode: string): Promise<PrivateRoomAccess> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_private_room_access', {
    p_room_code: roomCode,
  })

  if (error) {
    throw error
  }

  return asAccess(data)
}

export async function requestToJoinPrivateRoom(roomCode: string): Promise<PrivateRoomAccess> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('request_to_join_private_room', {
    p_room_code: roomCode,
  })

  if (error) {
    throw error
  }

  return {
    found: true,
    is_member: false,
    can_request: false,
    status: 'pending',
    room_code: (data as { room_code?: string } | null)?.room_code,
    room_name: (data as { room_name?: string } | null)?.room_name,
  }
}

export async function listPendingJoinRequests(): Promise<PendingJoinRequest[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('list_pending_join_requests')

  if (error) {
    throw error
  }

  return Array.isArray(data) ? (data as PendingJoinRequest[]) : []
}

export async function resolveJoinRequest(requestId: string, approve: boolean): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('resolve_room_join_request', {
    p_request_id: requestId,
    p_approve: approve,
  })

  if (error) {
    throw error
  }
}
