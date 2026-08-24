import type {
  Song,
  QueueItem,
  QueueItemWithDetails,
  PlayHistory,
  PlayHistoryWithSong,
  Vote,
  QueueStatus,
} from '@/types/queue'
import { getSupabaseClient } from '@/lib/supabase'

/**
 * Create or get a song
 */
export async function upsertSong(
  youtubeId: string,
  title: string,
  artist: string,
  thumbnailUrl?: string,
  duration?: number,
): Promise<Song> {
  const supabase = getSupabaseClient()

  // Try to get existing song
  const { data: existing, error: selectError } = await supabase
    .from('songs')
    .select()
    .eq('youtube_id', youtubeId)
    .single()

  if (existing) {
    return existing as Song
  }

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError
  }

  // Create new song
  const { data, error } = await supabase
    .from('songs')
    .insert({
      youtube_id: youtubeId,
      title,
      artist,
      thumbnail_url: thumbnailUrl,
      duration,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Song
}

/**
 * Suggest a song in a room's queue
 */
export async function suggestSong(
  roomId: string,
  songId: string,
  userId: string,
): Promise<QueueItem> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('queue_items')
    .insert({
      room_id: roomId,
      song_id: songId,
      suggested_by: userId,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as QueueItem
}

/**
 * Get queue items for a room
 */
export async function getRoomQueue(roomId: string): Promise<QueueItemWithDetails[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('queue_items')
    .select(
      `
      *,
      songs(*),
      suggested_by_profile:profiles(username, display_name)
      `,
    )
    .eq('room_id', roomId)
    .in('status', ['pending', 'playing'])
    .order('status', { ascending: false })

  if (error) {
    throw error
  }

  if (!data) {
    return []
  }

  const queueItems = (data as Array<QueueItemWithDetails & { songs?: QueueItemWithDetails['song'] }>).map(
    (item) => ({
      ...item,
      song: item.song || item.songs,
    }),
  )
  const itemsWithVotes = await Promise.all(
    queueItems.map(async (item) => {
      const { count, error: voteError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('queue_item_id', item.id)

      if (voteError) {
        throw voteError
      }

      return {
        ...item,
        vote_count: count ?? 0,
      }
    }),
  )

  return itemsWithVotes
}

/**
 * Get a single queue item
 */
export async function getQueueItem(queueItemId: string): Promise<QueueItem | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('queue_items')
    .select()
    .eq('id', queueItemId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return (data as QueueItem) || null
}

/**
 * Get currently playing song for a room
 */
export async function getCurrentlyPlaying(
  roomId: string,
): Promise<QueueItemWithDetails | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('queue_items')
    .select(
      `
      *,
      songs(*),
      suggested_by_profile:profiles(username, display_name)
      `,
    )
    .eq('room_id', roomId)
    .eq('status', 'playing')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (!data) {
    return null
  }

  const item = data as QueueItemWithDetails & { songs?: QueueItemWithDetails['song'] }
  return {
    ...item,
    song: item.song || item.songs,
  }
}

/**
 * Get next song to play (highest voted)
 */
export async function getNextSongToPlay(roomId: string): Promise<string | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .rpc('get_next_playing_song', { room_id: roomId })

  if (error) {
    throw error
  }

  return data as string | null
}

/**
 * Atomically finish the current song and start the highest-voted next song.
 */
export async function advanceRoomPlayback(roomId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('advance_room_playback', {
    p_room_id: roomId,
  })

  if (error) {
    throw error
  }

  return data as string | null
}

/**
 * Update queue item status
 */
export async function updateQueueItemStatus(
  queueItemId: string,
  status: QueueStatus,
): Promise<QueueItem> {
  const supabase = getSupabaseClient()

  const updateData: any = { status }

  if (status === 'playing') {
    updateData.playing_started_at = new Date().toISOString()
  } else if (status === 'played') {
    updateData.played_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('queue_items')
    .update(updateData)
    .eq('id', queueItemId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as QueueItem
}

/**
 * Remove a queue item (only pending songs)
 */
export async function removeQueueItem(queueItemId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('id', queueItemId)
    .eq('status', 'pending')

  if (error) {
    throw error
  }
}

/**
 * Get vote count for a queue item
 */
export async function getQueueItemVoteCount(queueItemId: string): Promise<number> {
  const supabase = getSupabaseClient()

  const { count, error } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('queue_item_id', queueItemId)

  if (error) {
    throw error
  }

  return count || 0
}

/**
 * Get all votes for a queue item
 */
export async function getQueueItemVotes(queueItemId: string): Promise<Vote[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('votes')
    .select()
    .eq('queue_item_id', queueItemId)

  if (error) {
    throw error
  }

  return (data as Vote[]) || []
}

/**
 * Vote on a queue item
 */
export async function voteOnSong(
  queueItemId: string,
  userId: string,
): Promise<Vote> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('votes')
    .insert({
      queue_item_id: queueItemId,
      user_id: userId,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as Vote
}

/**
 * Remove a vote
 */
export async function removeVote(
  queueItemId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('queue_item_id', queueItemId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

/**
 * Check if user has voted on a queue item
 */
export async function hasUserVoted(
  queueItemId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { count, error } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('queue_item_id', queueItemId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return (count ?? 0) > 0
}

/**
 * Add to play history
 */
export async function addToPlayHistory(
  roomId: string,
  songId: string,
  queueItemId: string,
  suggestedBy: string,
  durationPlayed?: number,
): Promise<PlayHistory> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('play_history')
    .insert({
      room_id: roomId,
      song_id: songId,
      queue_item_id: queueItemId,
      suggested_by: suggestedBy,
      played_at: new Date().toISOString(),
      duration_played: durationPlayed,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as PlayHistory
}

/**
 * Get play history for a room
 */
export async function getRoomPlayHistory(
  roomId: string,
  limit = 50,
): Promise<PlayHistoryWithSong[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('play_history')
    .select('*, songs(*)')
    .eq('room_id', roomId)
    .order('played_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return ((data || []) as Array<PlayHistoryWithSong & { songs?: Song }>).map((item) => ({
    ...item,
    song: item.song || item.songs,
  }))
}
