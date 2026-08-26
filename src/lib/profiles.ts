import { ImageValidationError } from '@/lib/image'
import { getSupabaseClient } from '@/lib/supabase'
import type { Profile, ProfileUpdate } from '@/types/profile'

export const PROFILE_COLUMNS =
  'id, username, display_name, avatar_url, cover_url, bio, location, website, created_at'

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

export async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, Profile>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  const profilesById = new Map<string, Profile>()
  if (uniqueIds.length === 0) {
    return profilesById
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('id', uniqueIds)

  if (error) {
    throw error
  }

  for (const profile of data || []) {
    profilesById.set(profile.id, profile as Profile)
  }

  return profilesById
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
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
    .select(PROFILE_COLUMNS)
    .eq('username', username.toLowerCase())
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

function sanitizeSearchTerm(query: string): string {
  return query.trim().replace(/[%*,()"\\]/g, ' ').replace(/\s+/g, ' ').slice(0, 40)
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const supabase = getSupabaseClient()
  const term = sanitizeSearchTerm(query)
  if (!term) return []

  const like = `%${term}%`
  const [byUsername, byDisplayName] = await Promise.all([
    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .ilike('username', like)
      .order('username')
      .limit(10),
    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .ilike('display_name', like)
      .order('username')
      .limit(10),
  ])

  if (byUsername.error) throw byUsername.error
  if (byDisplayName.error) throw byDisplayName.error

  const profilesById = new Map<string, Profile>()
  for (const profile of [...(byUsername.data || []), ...(byDisplayName.data || [])]) {
    profilesById.set(profile.id, profile as Profile)
  }

  return [...profilesById.values()].sort((left, right) =>
    left.username.localeCompare(right.username),
  ).slice(0, 10)
}

export async function isUsernameAvailable(
  username: string,
  exceptUserId?: string,
): Promise<boolean> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())

  if (exceptUserId) {
    query = query.neq('id', exceptUserId)
  }

  const { data, error } = await query.maybeSingle()

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
    .select(PROFILE_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export function getProfileSaveError(error: unknown): string {
  if (error instanceof ImageValidationError) {
    return error.message
  }

  if (!error || typeof error !== 'object') {
    return 'Unable to save your profile right now. Please try again.'
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : ''

  if (code === '23505' || (/username/i.test(message) && /already|unique|taken/i.test(message))) {
    return 'That username is already taken.'
  }

  if (/row-level security|violates/i.test(message)) {
    return 'You can only edit your own profile.'
  }

  if (/payload too large|maximum allowed size|file size/i.test(message)) {
    return 'That image is too large. Try a smaller file.'
  }

  if (/mime type|not allowed/i.test(message)) {
    return 'Use a JPG, PNG, or WebP image.'
  }

  return message || 'Unable to save your profile right now. Please try again.'
}
