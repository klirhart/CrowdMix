export type RoomVisibility = 'public' | 'unlisted' | 'private'

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

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  joined_at: string
  is_online: boolean
}

export interface RoomWithMembers extends Room {
  room_members?: RoomMember[]
  member_count?: number
}
