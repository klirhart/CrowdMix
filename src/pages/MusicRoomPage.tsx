import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import { getRoomByCode, getRoomMembers, isRoomMember, removeRoomMember, updateMemberOnlineStatus } from '@/lib/rooms'
import { advanceRoomPlayback, getRoomPlayHistory, getRoomQueue, hasUserVoted, removeQueueItem, removeVote, suggestSong, upsertSong, voteOnSong } from '@/lib/queue'
import { getSupabaseClient } from '@/lib/supabase'
import { env } from '@/lib/env'
import { searchYouTube, type YouTubeSearchResult } from '@/lib/youtube'
import type { Room } from '@/types/room'
import type { RoomMember } from '@/types/room'
import type { QueueItemWithDetails } from '@/types/queue'
import type { PlayHistoryWithSong } from '@/types/queue'

function extractYouTubeId(value: string): string {
  const input = value.trim()

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input
  }

  try {
    const url = new URL(input)
    const queryId = url.searchParams.get('v')
    const pathId = url.pathname.match(/\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/)
    const shortId = url.hostname === 'youtu.be' ? url.pathname.slice(1) : null
    return queryId || pathId?.[1] || shortId || ''
  } catch {
    return ''
  }
}

export function MusicRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [queue, setQueue] = useState<QueueItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [suggestion, setSuggestion] = useState({ youtubeId: '', title: '', artist: '' })
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [playbackBusy, setPlaybackBusy] = useState(false)
  const [playHistory, setPlayHistory] = useState<PlayHistoryWithSong[]>([])

  const roomLink = useMemo(
    () => `${env.appUrl.replace(/\/$/, '')}/join-room?room=${room?.room_code || roomCode || ''}`,
    [room?.room_code, roomCode],
  )
  const qrImageUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(roomLink)}`,
    [roomLink],
  )

  useEffect(() => {
    const loadRoomData = async () => {
      if (!roomCode) {
        setError('Room code not found')
        setLoading(false)
        return
      }

      try {
        // Get room by code
        const roomData = await getRoomByCode(roomCode.toUpperCase())

        if (!roomData) {
          setError('Room not found')
          setLoading(false)
          return
        }

        setRoom(roomData)

        // Check if user is a member
        if (user) {
          const memberStatus = await isRoomMember(roomData.id, user.id)
          if (!memberStatus) {
            setError('You are not a member of this room')
            setLoading(false)
            return
          }
        }

        // Load members, queue, and recent playback history
        const [membersData, queueData, historyData] = await Promise.all([
          getRoomMembers(roomData.id),
          getRoomQueue(roomData.id),
          getRoomPlayHistory(roomData.id, 10),
        ])

        setMembers(membersData)
        setQueue(queueData)
        setPlayHistory(historyData)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load room'
        )
      } finally {
        setLoading(false)
      }
    }

    loadRoomData()
  }, [roomCode, user])

  useEffect(() => {
    if (!room || !user) return

    const supabase = getSupabaseClient()
    const refreshRoomData = async () => {
      const [membersData, queueData, historyData] = await Promise.all([
        getRoomMembers(room.id),
        getRoomQueue(room.id),
        getRoomPlayHistory(room.id, 10),
      ])
      setMembers(membersData)
      setQueue(queueData)
      setPlayHistory(historyData)
    }

    void updateMemberOnlineStatus(room.id, user.id, true).catch(() => undefined)
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${room.id}` }, () => {
        void refreshRoomData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        void refreshRoomData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${room.id}` }, () => {
        void refreshRoomData()
      })
      .subscribe()

    return () => {
      void updateMemberOnlineStatus(room.id, user.id, false).catch(() => undefined)
      void supabase.removeChannel(channel)
    }
  }, [room, user])

  const handleCopyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError('Unable to copy the room link')
    }
  }

  const handleLeaveRoom = async () => {
    if (!room || !user) return

    try {
      await removeRoomMember(room.id, user.id)
      navigate('/home')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to leave room'
      )
    }
  }

  const handleSuggestSong = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!room || !user) return

    setSubmitting(true)
    setActionError(null)
    try {
      const youtubeId = extractYouTubeId(suggestion.youtubeId)
      const title = suggestion.title.trim()
      const artist = suggestion.artist.trim()

      if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
        throw new Error('Enter a valid YouTube URL or 11-character video ID')
      }

      const song = await upsertSong(
        youtubeId,
        title,
        artist,
        `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      )
      await suggestSong(room.id, song.id, user.id)
      setQueue(await getRoomQueue(room.id))
      setSuggestion({ youtubeId: '', title: '', artist: '' })
      setShowSuggestForm(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to suggest song')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSearchYouTube = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setActionError(null)
    try {
      setSearchResults(await searchYouTube(searchQuery.trim()))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'YouTube search failed')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectSearchResult = (result: YouTubeSearchResult) => {
    setSuggestion({
      youtubeId: result.videoId,
      title: result.title,
      artist: result.channelTitle,
    })
    setSearchResults([])
    setSearchQuery('')
  }

  const handleVote = async (queueItemId: string) => {
    if (!user) return

    try {
      if (await hasUserVoted(queueItemId, user.id)) return
      await voteOnSong(queueItemId, user.id)
      if (room) setQueue(await getRoomQueue(room.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to vote')
    }
  }

  const handleRemoveVote = async (queueItemId: string) => {
    if (!user) return

    try {
      await removeVote(queueItemId, user.id)
      if (room) setQueue(await getRoomQueue(room.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove vote')
    }
  }

  const handleRemoveSong = async (queueItemId: string) => {
    if (!room) return

    try {
      await removeQueueItem(queueItemId)
      setQueue(await getRoomQueue(room.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove song')
    }
  }

  const refreshQueue = async () => {
    if (room) setQueue(await getRoomQueue(room.id))
  }

  const handlePlayNext = async () => {
    if (!room) return

    setPlaybackBusy(true)
    setActionError(null)
    try {
      const nextQueueItemId = await advanceRoomPlayback(room.id)
      if (!nextQueueItemId) {
        setActionError('There are no pending songs to play')
        return
      }
      await refreshQueue()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start playback')
    } finally {
      setPlaybackBusy(false)
    }
  }

  const handleMarkPlayed = async () => {
    setPlaybackBusy(true)
    setActionError(null)
    try {
      await advanceRoomPlayback(room?.id || '')
      if (room) {
        setQueue(await getRoomQueue(room.id))
        setPlayHistory(await getRoomPlayHistory(room.id, 10))
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to finish song')
    } finally {
      setPlaybackBusy(false)
    }
  }

  const nowPlaying = queue.find((item) => item.status === 'playing')
  const nowPlayingVideoId = nowPlaying?.song?.youtube_id
  const canControlPlayback = room?.created_by === user?.id

  useEffect(() => {
    if (!nowPlayingVideoId || !canControlPlayback) return

    const playerId = 'crowdmix-youtube-player'
    let player: { destroy: () => void } | undefined
    let cancelled = false

    const createPlayer = () => {
      if (cancelled || !window.YT?.Player) return
      player = new window.YT.Player(playerId, {
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT?.PlayerState?.ENDED) {
              if (room?.id) {
                void advanceRoomPlayback(room.id).then(async () => {
                  const [nextQueue, nextHistory] = await Promise.all([
                    getRoomQueue(room.id),
                    getRoomPlayHistory(room.id, 10),
                  ])
                  setQueue(nextQueue)
                  setPlayHistory(nextHistory)
                }).catch((err: unknown) => {
                  setActionError(err instanceof Error ? err.message : 'Failed to advance playback')
                })
              }
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
      if (!existingScript) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
      window.onYouTubeIframeAPIReady = createPlayer
    }

    return () => {
      cancelled = true
      player?.destroy()
      if (window.onYouTubeIframeAPIReady === createPlayer) {
        window.onYouTubeIframeAPIReady = undefined
      }
    }
  }, [nowPlayingVideoId, canControlPlayback, room?.id])

  if (loading) {
    return <LoadingSpinner label="Loading room..." />
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Alert variant="error">
          {error || 'Room not found'}
        </Alert>
        <Button onClick={() => navigate('/home')} className="mt-4 bg-accent">
          Back to Home
        </Button>
      </div>
    )
  }

  const onlineMembers = members.filter((m) => m.is_online)
  const offlineMembers = members.filter((m) => !m.is_online)
  return (
    <div className="min-h-screen bg-surface">
      {/* Room Header */}
      <header className="sticky top-16 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold">{room.name}</h1>
            <p className="text-sm text-muted">
              Room Code: <span className="font-mono font-semibold">{room.room_code}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
              {onlineMembers.length} listening
            </span>
            <Button onClick={handleCopyRoomLink} className="bg-accent hover:bg-accent-hover text-sm">
              Share
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Now Playing */}
            <section>
              <h2 className="text-2xl font-bold mb-6">Now Playing</h2>
              <div className="rounded-lg border border-border bg-surface-raised p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Artwork */}
                  <div className="flex-shrink-0">
                    {nowPlaying?.song ? (
                      <iframe
                        title={`Playing ${nowPlaying.song.title}`}
                        id="crowdmix-youtube-player"
                        src={`https://www.youtube.com/embed/${nowPlaying.song.youtube_id}?autoplay=1&enablejsapi=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
                        className="h-48 w-full rounded-lg md:w-48"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full md:w-48 aspect-square rounded-lg bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-4xl">
                        🎵
                      </div>
                    )}
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-sm text-muted mb-2">Currently playing</p>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">
                      {nowPlaying?.song?.title || 'No songs yet'}
                    </h3>
                    <p className="text-lg text-muted mb-4">
                      {nowPlaying?.song?.artist || 'Queue a song to start the music'}
                    </p>
                    <p className="text-sm text-muted mb-6">
                      {nowPlaying ? `Suggested by @${nowPlaying.suggested_by_profile?.username || 'member'}` : '—'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-accent transition-all"></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted mt-1">
                        <span>0:00</span>
                        <span>0:00</span>
                      </div>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex gap-3">
                      {canControlPlayback && nowPlaying && (
                        <Button
                          onClick={() => void handleMarkPlayed()}
                          disabled={playbackBusy}
                          className="flex-1 bg-surface-overlay hover:bg-surface-overlay text-sm"
                        >
                          Finish Song
                        </Button>
                      )}
                      {canControlPlayback && (
                        <Button
                          onClick={() => void handlePlayNext()}
                          disabled={playbackBusy}
                          className="flex-1 bg-accent hover:bg-accent-hover text-sm"
                        >
                          {playbackBusy ? 'Starting...' : 'Play Next'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Queue */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Up Next</h2>
                <Button
                  onClick={() => setShowSuggestForm((visible) => !visible)}
                  className="bg-accent hover:bg-accent-hover text-sm"
                >
                  + Suggest Song
                </Button>
              </div>

              {showSuggestForm && (
                <form
                  onSubmit={handleSuggestSong}
                  className="mb-6 rounded-lg border border-border bg-surface-raised p-4 space-y-4"
                >
                  <div className="border-b border-border pb-4">
                    <div className="flex gap-2">
                      <Input
                        label="Search YouTube"
                        name="youtubeSearch"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void handleSearchYouTube()
                          }
                        }}
                        placeholder="Search for a song or artist"
                      />
                      <Button type="button" onClick={() => void handleSearchYouTube()} disabled={searching} className="mt-7 shrink-0">
                        {searching ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {searchResults.map((result) => (
                          <button
                            key={result.videoId}
                            type="button"
                            onClick={() => selectSearchResult(result)}
                            className="flex w-full items-center gap-3 rounded-lg border border-border p-2 text-left hover:bg-surface-overlay"
                          >
                            <img src={result.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-white">{result.title}</span>
                              <span className="block truncate text-xs text-muted">{result.channelTitle}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    label="YouTube URL or video ID"
                    name="youtubeId"
                    value={suggestion.youtubeId}
                    onChange={(event) =>
                      setSuggestion({ ...suggestion, youtubeId: event.target.value })
                    }
                    placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ"
                    required
                  />
                  <Input
                    label="Song title"
                    name="title"
                    value={suggestion.title}
                    onChange={(event) =>
                      setSuggestion({ ...suggestion, title: event.target.value })
                    }
                    required
                  />
                  <Input
                    label="Artist"
                    name="artist"
                    value={suggestion.artist}
                    onChange={(event) =>
                      setSuggestion({ ...suggestion, artist: event.target.value })
                    }
                    required
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowSuggestForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add to queue'}
                    </Button>
                  </div>
                </form>
              )}

              {actionError && <Alert variant="error">{actionError}</Alert>}

              <div className="space-y-3">
                {queue.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-surface-raised p-4 hover:bg-surface-overlay transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="h-16 w-16 flex-shrink-0 rounded bg-surface flex items-center justify-center text-xl">
                        🎵
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {index + 1}. {item.song?.title || 'Unknown'}
                        </h3>
                        <p className="text-sm text-muted truncate">
                          {item.song?.artist || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Suggested by @{item.suggested_by_profile?.username || 'member'}
                        </p>
                      </div>

                      {/* Voting */}
                      <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleVote(item.id)}
                          className="text-accent hover:text-accent-hover text-xl"
                          title="Upvote"
                        >
                          ▲
                        </button>
                        <span className="font-bold text-sm w-8 text-center">
                          {item.vote_count || 0}
                        </span>
                        <button
                          onClick={() => handleRemoveVote(item.id)}
                          className="text-muted hover:text-white text-xs"
                          title="Remove vote"
                        >
                          ✕
                        </button>
                        {item.suggested_by === user?.id && item.status === 'pending' && (
                          <button
                            onClick={() => handleRemoveSong(item.id)}
                            className="text-red-500 hover:text-red-400 text-xs"
                            title="Remove song"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {queue.length === 0 && (
                <div className="rounded-lg border border-border bg-surface-raised p-8 text-center">
                  <p className="text-muted">No songs yet</p>
                  <p className="text-sm text-muted mt-2 mb-4">
                    Be the first to suggest one!
                  </p>
                  <Button className="bg-accent hover:bg-accent-hover">
                    + Suggest Song
                  </Button>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Members */}
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Members ({onlineMembers.length})
              </h3>
              <div className="space-y-2">
                {onlineMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 rounded-lg bg-surface-raised p-3"
                  >
                    <div className="relative">
                      <Avatar
                        displayName={member.user_id}
                        size="sm"
                      />
                      {member.is_online && (
                        <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-surface" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {member.user_id}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {offlineMembers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted uppercase mb-2">
                    Offline ({offlineMembers.length})
                  </p>
                  <div className="space-y-2">
                    {offlineMembers.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 rounded-lg bg-surface-raised p-3 opacity-60"
                      >
                        <Avatar
                          displayName={member.user_id}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {member.user_id}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Room Info */}
            <section>
              <h3 className="text-lg font-bold mb-4">Room Info</h3>
              <div className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted uppercase">Visibility</p>
                  <p className="font-semibold capitalize">{room.visibility}</p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase">Created</p>
                  <p className="text-sm">
                    {new Date(room.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase">Status</p>
                  <p className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${room.is_active ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                    <span className="font-semibold">
                      {room.is_active ? 'Live' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Playback History */}
            <section>
              <h3 className="text-lg font-bold mb-4">Recently Played</h3>
              {playHistory.length > 0 ? (
                <div className="space-y-2">
                  {playHistory.map((historyItem) => (
                    <div
                      key={historyItem.id}
                      className="flex items-center gap-3 rounded-lg bg-surface-raised p-3"
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-surface">
                        {historyItem.song?.thumbnail_url ? (
                          <img
                            src={historyItem.song.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">🎵</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {historyItem.song?.title || 'Unknown song'}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {historyItem.song?.artist || 'Unknown artist'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No songs have finished playing yet.</p>
              )}
            </section>

            {/* QR Code & Share */}
            <section>
              <h3 className="text-lg font-bold mb-4">Share Room</h3>
              <div className="rounded-lg border border-border bg-surface-raised p-6 text-center">
                <div className="inline-flex items-center justify-center h-40 w-40 rounded bg-white p-2">
                  <img src={qrImageUrl} alt={`QR code for ${room.name}`} className="h-full w-full" />
                </div>
                <p className="mt-3 break-all text-xs text-muted">
                  {roomLink}
                </p>
                <Button onClick={handleCopyRoomLink} className="mt-3 w-full bg-accent hover:bg-accent-hover text-sm">
                  {copied ? 'Link Copied' : 'Copy Room Link'}
                </Button>
              </div>
            </section>

            {/* Leave Room */}
            <Button 
              onClick={handleLeaveRoom}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50"
            >
              Leave Room
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
