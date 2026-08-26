export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  location: string | null
  website: string | null
  created_at: string
}

export interface ProfileUpdate {
  username?: string
  display_name?: string
  avatar_url?: string | null
  cover_url?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
}
