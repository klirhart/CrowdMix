import { getSupabaseClient } from '@/lib/supabase'
import type { Profile, ProfileUpdate } from '@/types/profile'

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
