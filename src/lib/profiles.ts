import { getSupabaseClient } from '@/lib/supabase'
import type { Profile, ProfileUpdate } from '@/types/profile'

export interface ProfileActivity {
  songsSuggested: number
  votesCast: number
  roomsJoined: number
}

export async function fetchProfileActivity(userId: string): Promise<ProfileActivity> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('get_profile_activity', {
    p_user_id: userId,
  })

  if (error) {
    throw error
  }

  return {
    songsSuggested: Number(data?.songs_suggested || 0),
    votesCast: Number(data?.votes_cast || 0),
    roomsJoined: Number(data?.rooms_joined || 0),
  }
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const supabase = getSupabaseClient()
  const term = query.trim()
  if (!term) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at')
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .order('username')
    .limit(10)

  if (error) throw error
  return (data as Profile[]) || []
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (error) {
    throw error
  }

  return data === null
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, username, display_name, avatar_url, created_at')
    .single()

  if (error) {
    throw error
  }

  return data
}
