import { fetchProfilesByIds } from '@/lib/profiles'
import { getSupabaseClient } from '@/lib/supabase'
import type { RoomMessage } from '@/types/room'

const MESSAGE_LIMIT = 80
export const ROOM_MESSAGE_MAX_LENGTH = 500

async function withSenderProfiles(messages: RoomMessage[]): Promise<RoomMessage[]> {
  const profiles = await fetchProfilesByIds(messages.map((message) => message.user_id))

  return messages.map((message) => {
    const profile = profiles.get(message.user_id)
    return {
      ...message,
      profile: profile
        ? {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }
        : message.profile ?? null,
    }
  })
}

export async function listRoomMessages(roomId: string): Promise<RoomMessage[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('room_messages')
    .select('id, room_id, user_id, body, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_LIMIT)

  if (error) {
    throw error
  }

  const chronological = [...((data as RoomMessage[]) || [])].reverse()
  return withSenderProfiles(chronological)
}

export async function sendRoomMessage(
  roomId: string,
  userId: string,
  body: string,
): Promise<RoomMessage> {
  const trimmed = body.trim()
  if (!trimmed) {
    throw new Error('Type a message first.')
  }
  if (trimmed.length > ROOM_MESSAGE_MAX_LENGTH) {
    throw new Error(`Keep messages under ${ROOM_MESSAGE_MAX_LENGTH} characters.`)
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('room_messages')
    .insert({
      room_id: roomId,
      user_id: userId,
      body: trimmed,
    })
    .select('id, room_id, user_id, body, created_at')
    .single()

  if (error) {
    throw error
  }

  const [message] = await withSenderProfiles([data as RoomMessage])
  return message
}
