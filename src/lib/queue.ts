import type {
  Song,
  QueueItem,
  QueueItemWithDetails,
  PlayHistory,
  PlayHistoryWithSong,
  Vote,
  QueueStatus,
} from '@/types/queue'
import { fetchProfilesByIds } from '@/lib/profiles'
import { getSupabaseClient } from '@/lib/supabase'

async function findSongByYoutubeId(youtubeId: string): Promise<Song | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('songs')
    .select()
    .eq('youtube_id', youtubeId)
    .limit(1)

  if (error) {
    throw error
  }

  return (data?.[0] as Song) ?? null
}

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

  const existing = await findSongByYoutubeId(youtubeId)
  if (existing) {
    return existing
  }

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

  if (!error) {
    return data as Song
  }

  if (error.code !== '23505') {
    throw error
  }

  const raced = await findSongByYoutubeId(youtubeId)
  if (!raced) {
    throw error
  }

  return raced
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
    if (error.code === '23505') {
      throw new Error('That song is already in the queue.')
    }
    throw error
  }

  return data as QueueItem
}

/**
 * Get queue items for a room
 */
export async function getRoomQueue(
  roomId: string,
  userId?: string,
): Promise<QueueItemWithDetails[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('queue_items')
    .select(
      `
      *,
      songs(*)
      `,
    )
    .eq('room_id', roomId)
    .in('status', ['pending', 'playing'])
    .order('status', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  const queueItems = (data as Array<QueueItemWithDetails & { songs?: QueueItemWithDetails['song'] }>).map(
    (item) => ({
      ...item,
      song: item.song || item.songs,
    }),
  )
  const queueItemIds = queueItems.map((item) => item.id)
  const [profiles, votesResult] = await Promise.all([
    fetchProfilesByIds(queueItems.map((item) => item.suggested_by)),
    supabase
      .from('votes')
      .select('queue_item_id, user_id')
      .in('queue_item_id', queueItemIds),
  ])

  if (votesResult.error) {
    throw votesResult.error
  }

  const voteCounts = new Map<string, number>()
  const votedItemIds = new Set<string>()
  for (const vote of votesResult.data || []) {
    voteCounts.set(vote.queue_item_id, (voteCounts.get(vote.queue_item_id) ?? 0) + 1)
    if (userId && vote.user_id === userId) {
      votedItemIds.add(vote.queue_item_id)
    }
  }

  const itemsWithVotes = queueItems.map((item) => {
    const profile = profiles.get(item.suggested_by)
    return {
      ...item,
      vote_count: voteCounts.get(item.id) ?? 0,
      user_voted: votedItemIds.has(item.id),
      suggested_by_profile: profile
        ? { username: profile.username, display_name: profile.display_name }
        : item.suggested_by_profile,
    }
  })

  // Mirror advance_room_playback's selection rule (most votes, then oldest) so
  // the positions shown under "Up Next" are the real play order.
  return itemsWithVotes.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'playing' ? -1 : 1
    }

    if ((b.vote_count ?? 0) !== (a.vote_count ?? 0)) {
      return (b.vote_count ?? 0) - (a.vote_count ?? 0)
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
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
 * Pass `fromItemId` when a specific playing row ended so a concurrent client
 * that already advanced cannot skip the next track.
 */
export async function advanceRoomPlayback(
  roomId: string,
  fromItemId?: string | null,
): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('advance_room_playback', {
    p_room_id: roomId,
    p_from_item_id: fromItemId ?? null,
  })

  if (error) {
    throw error
  }

  return data as string | null
}

/**
 * Promote the next pending song only if the room is idle.
 */
export async function ensureRoomPlaying(roomId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('ensure_room_playing', {
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

  if (!error) {
    return data as Vote
  }

  if (error.code !== '23505') {
    throw error
  }

  const { data: existing, error: existingError } = await supabase
    .from('votes')
    .select()
    .eq('queue_item_id', queueItemId)
    .eq('user_id', userId)
    .single()

  if (existingError) {
    throw existingError
  }

  return existing as Vote
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
