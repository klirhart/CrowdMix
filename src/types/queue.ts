export type QueueStatus = 'pending' | 'playing' | 'played' | 'removed'

export interface Song {
  id: string
  youtube_id: string
  title: string
  artist: string
  thumbnail_url: string | null
  duration: number | null
  created_at: string
}

export interface QueueItem {
  id: string
  room_id: string
  song_id: string
  suggested_by: string
  status: QueueStatus
  created_at: string
  playing_started_at: string | null
  played_at: string | null
}

export interface QueueItemWithDetails extends QueueItem {
  song?: Song
  suggested_by_profile?: {
    username: string
    display_name: string
  }
  vote_count?: number
  user_voted?: boolean
}

export interface PlayHistory {
  id: string
  room_id: string
  song_id: string
  queue_item_id: string
  suggested_by: string
  played_at: string
  duration_played: number | null
}

export interface PlayHistoryWithSong extends PlayHistory {
  song?: Song
}

export interface Vote {
  id: string
  queue_item_id: string
  user_id: string
  created_at: string
}
