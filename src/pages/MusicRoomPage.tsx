import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DoorOpen, ListMusic, Music, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { QueueItemCard } from '@/components/ui/QueueItemCard'
import { QueueRowSkeleton } from '@/components/ui/Skeleton'
import { MembersPanel } from '@/components/room/MembersPanel'
import { NowPlayingPanel } from '@/components/room/NowPlayingPanel'
import { RecentlyPlayedPanel, type RecentlyPlayedAction } from '@/components/room/RecentlyPlayedPanel'
import { RoomChatPanel } from '@/components/room/RoomChatPanel'
import { RoomHeader } from '@/components/room/RoomHeader'
import { RoomInfoPanel } from '@/components/room/RoomInfoPanel'
import { RoomPlayerBar } from '@/components/room/RoomPlayerBar'
import { SuggestSongForm } from '@/components/room/SuggestSongForm'
import { SyncedYouTubePlayer, type PlaybackEngineHandle } from '@/components/room/SyncedYouTubePlayer'
import { PageShell } from '@/components/layout/PageShell'
import { Toast } from '@/components/ui/Toast'
import { cx } from '@/components/ui/cx'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { addRoomMember, getRoomByCode, getRoomMembers, isRoomMember, markMemberPresent, removeRoomMember, scheduleMemberAway } from '@/lib/rooms'
import { advanceRoomPlayback, ensureRoomPlaying, getRoomPlayHistory, getRoomQueue, removeQueueItem, removeVote, suggestSong, upsertSong, voteOnSong } from '@/lib/queue'
import { getSupabaseClient } from '@/lib/supabase'
import { searchYouTube, fetchYouTubeDuration, type YouTubeSearchResult } from '@/lib/youtube'
import { DEFAULT_DEVICE_VOLUME, readDeviceVolume, roomPlaybackFinished, roomTrackDuration, writeDeviceVolume } from '@/lib/playback'
import { isCreatorOfRoom, type Room, type RoomMember } from '@/types/room'
import type { QueueItemWithDetails, Song } from '@/types/queue'
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
  const { user, profile } = useAuth()
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
  const [engineDuration, setEngineDuration] = useState(0)
  const [catalogDuration, setCatalogDuration] = useState(0)
  const [engineState, setEngineState] = useState<'loading' | 'live'>('loading')
  const [deviceVolume, setDeviceVolume] = useState(DEFAULT_DEVICE_VOLUME)
  const [replayBusy, setReplayBusy] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const engineRef = useRef<PlaybackEngineHandle | null>(null)
  const endingItemIdRef = useRef<string | null>(null)

  useEffect(() => {
    setDeviceVolume(readDeviceVolume())
  }, [])

  const handleDeviceVolume = useCallback((next: number) => {
    const volume = writeDeviceVolume(next)
    setDeviceVolume(volume)
    engineRef.current?.setVolume(volume)
  }, [])

  usePageTitle(room?.name ?? (error === 'Room not found' ? 'Room not found' : 'Room'))

  const roomLink = useMemo(
    () => `${window.location.origin}/r/${room?.room_code || roomCode || ''}`,
    [room?.room_code, roomCode],
  )
  const qrImageUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(roomLink)}`,
    [roomLink],
  )

  useEffect(() => {
    const userId = user?.id

    if (!roomCode) {
      setError('Room code not found')
      setLoading(false)
      return
    }

    if (!userId) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setActionError(null)
    setRoom(null)
    setMembers([])
    setQueue([])
    setPlayHistory([])
    endingItemIdRef.current = null

    const loadRoomData = async () => {
      try {
        const roomData = await getRoomByCode(roomCode.toUpperCase())

        if (cancelled) {
          return
        }

        if (!roomData) {
          setError('Room not found. This room may no longer exist or the room code may be invalid.')
          setLoading(false)
          return
        }

        const memberStatus = await isRoomMember(roomData.id, userId)
        if (cancelled) {
          return
        }

        if (!memberStatus) {
          if (!roomData.is_active) {
            setError('This room is no longer active.')
            setLoading(false)
            return
          }

          if (roomData.visibility === 'private' && roomData.created_by !== userId) {
            setError('This room is private. You need an invitation to join.')
            setLoading(false)
            return
          }

          await addRoomMember(roomData.id, userId)
          if (cancelled) {
            return
          }
        }

        await markMemberPresent(roomData.id, userId).catch(() => undefined)
        if (cancelled) {
          return
        }

        const [membersData, queueData, historyData] = await Promise.all([
          getRoomMembers(roomData.id),
          getRoomQueue(roomData.id, userId),
          getRoomPlayHistory(roomData.id),
        ])

        if (cancelled) {
          return
        }

        setRoom(roomData)
        setMembers(membersData)
        setQueue(queueData)
        setPlayHistory(historyData)
      } catch (err) {
        if (cancelled) {
          return
        }
        setError(
          err instanceof Error ? err.message : 'Failed to load room'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRoomData()

    return () => {
      cancelled = true
    }
  }, [roomCode, user?.id])

  useEffect(() => {
    const userId = user?.id
    if (!room || !userId) return

    const roomId = room.id
    const supabase = getSupabaseClient()
    const refreshRoomData = async () => {
      const [membersData, queueData] = await Promise.all([
        getRoomMembers(roomId),
        getRoomQueue(roomId, userId),
      ])
      setMembers(membersData)
      setQueue(queueData)
      try {
        setPlayHistory(await getRoomPlayHistory(roomId))
      } catch {
        // Keep the last known history if this refresh loses the embed.
      }
    }

    setMembers((current) =>
      current.map((member) =>
        member.user_id === userId ? { ...member, is_online: true } : member,
      ),
    )
    void markMemberPresent(roomId, userId).catch(() => undefined)
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_items', filter: `room_id=eq.${roomId}` }, () => {
        void refreshRoomData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        void refreshRoomData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, () => {
        void refreshRoomData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'play_history', filter: `room_id=eq.${roomId}` }, () => {
        void refreshRoomData()
      })
      .subscribe()

    return () => {
      scheduleMemberAway(roomId, userId)
      void supabase.removeChannel(channel)
    }
  }, [room, user?.id])

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

      if (!title || !artist) {
        throw new Error('Enter a song title and artist.')
      }

      if (!/^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
        throw new Error('Enter a valid YouTube URL or 11-character video ID')
      }

      const duration = await fetchYouTubeDuration(youtubeId)
      const song = await upsertSong(
        youtubeId,
        title,
        artist,
        `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        duration || undefined,
      )
      await suggestSong(room.id, song.id, user.id)
      setQueue(await getRoomQueue(room.id, user.id))
      setSuggestion({ youtubeId: '', title: '', artist: '' })
      setShowSuggestForm(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to suggest song')
    } finally {
      setSubmitting(false)
    }
  }

  const dismissToast = useCallback(() => setToast(null), [])

  const handleReplaySong = async (song: Song, action: RecentlyPlayedAction) => {
    if (!room || !user) return

    setReplayBusy(true)
    try {
      await suggestSong(room.id, song.id, user.id)
      setQueue(await getRoomQueue(room.id, user.id))
      setToast({
        tone: 'success',
        message:
          action === 'queue'
            ? `${song.title} added to queue`
            : `${song.title} added to suggestions`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add song'
      setToast({ tone: 'error', message })
      throw err instanceof Error ? err : new Error(message)
    } finally {
      setReplayBusy(false)
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
      if (queue.find((item) => item.id === queueItemId)?.user_voted) return
      await voteOnSong(queueItemId, user.id)
      if (room) setQueue(await getRoomQueue(room.id, user.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to vote')
    }
  }

  const handleRemoveVote = async (queueItemId: string) => {
    if (!user) return

    try {
      await removeVote(queueItemId, user.id)
      if (room) setQueue(await getRoomQueue(room.id, user.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove vote')
    }
  }

  const handleRemoveSong = async (queueItemId: string) => {
    if (!room || !user) return

    try {
      await removeQueueItem(queueItemId)
      setQueue(await getRoomQueue(room.id, user.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove song')
    }
  }

  const refreshPlayback = useCallback(async () => {
    if (!room) return
    const [nextQueue, nextHistory] = await Promise.all([
      getRoomQueue(room.id, user?.id),
      getRoomPlayHistory(room.id),
    ])
    setQueue(nextQueue)
    setPlayHistory(nextHistory)
  }, [room, user?.id])

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
      await refreshPlayback()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to start playback')
    } finally {
      setPlaybackBusy(false)
    }
  }

  const handleMarkPlayed = async () => {
    if (!room) return

    setPlaybackBusy(true)
    setActionError(null)
    try {
      await advanceRoomPlayback(room.id)
      await refreshPlayback()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to finish song')
    } finally {
      setPlaybackBusy(false)
    }
  }

  const nowPlaying = queue.find((item) => item.status === 'playing')
  const canControlPlayback = isCreatorOfRoom(user?.id, room, members)

  const playingItemId = nowPlaying?.id
  const trackDuration = roomTrackDuration(
    engineDuration,
    catalogDuration || nowPlaying?.song?.duration,
  )

  useEffect(() => {
    const videoId = nowPlaying?.song?.youtube_id
    const stored = nowPlaying?.song?.duration
    if (stored && stored > 1) {
      setCatalogDuration(stored)
      return
    }
    if (!videoId) {
      setCatalogDuration(0)
      return
    }

    let cancelled = false
    setCatalogDuration(0)
    void fetchYouTubeDuration(videoId)
      .then((seconds) => {
        if (!cancelled) setCatalogDuration(seconds)
      })
      .catch(() => {
        if (!cancelled) setCatalogDuration(0)
      })

    return () => {
      cancelled = true
    }
  }, [nowPlaying?.song?.id, nowPlaying?.song?.youtube_id, nowPlaying?.song?.duration])

  useEffect(() => {
    setEngineDuration(0)
    setEngineState('loading')
    if (playingItemId) {
      setActionError((current) =>
        current === 'There are no pending songs to play' ? null : current,
      )
    }
  }, [playingItemId])

  const handleTrackEnded = useCallback(() => {
    if (!room || !playingItemId) return
    if (endingItemIdRef.current === playingItemId) return
    endingItemIdRef.current = playingItemId

    void advanceRoomPlayback(room.id, playingItemId)
      .then(async () => {
        await refreshPlayback()
      })
      .catch((err: unknown) => {
        if (endingItemIdRef.current === playingItemId) {
          endingItemIdRef.current = null
        }
        setActionError(err instanceof Error ? err.message : 'Failed to advance playback')
      })
  }, [room, playingItemId, refreshPlayback])

  useEffect(() => {
    if (endingItemIdRef.current && endingItemIdRef.current !== playingItemId) {
      endingItemIdRef.current = null
    }
  }, [playingItemId])

  useEffect(() => {
    const startedAt = nowPlaying?.playing_started_at
    if (!startedAt || trackDuration <= 1) return
    if (engineState !== 'live') return

    const check = () => {
      if (roomPlaybackFinished(startedAt, trackDuration)) {
        handleTrackEnded()
      }
    }

    check()
    const timer = window.setInterval(check, 400)
    return () => window.clearInterval(timer)
  }, [nowPlaying?.playing_started_at, trackDuration, handleTrackEnded, engineState])

  useEffect(() => {
    if (!room) return

    const isPlaying = queue.some((item) => item.status === 'playing')
    const hasPending = queue.some((item) => item.status === 'pending')
    if (isPlaying || !hasPending) return

    let cancelled = false
    void ensureRoomPlaying(room.id)
      .then(async (startedId) => {
        if (cancelled || !startedId) return
        setActionError(null)
        setQueue(await getRoomQueue(room.id, user?.id))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [room, queue, user?.id])

  // Display-only ranking so the playing track isn't numbered as "1" in the queue.
  const queueRanks = useMemo(() => {
    const ranks = new Map<string, number>()
    let rank = 0

    for (const item of queue) {
      if (item.status !== 'playing') {
        rank += 1
        ranks.set(item.id, rank)
      }
    }

    return ranks
  }, [queue])

  if (loading) {
    return (
      <PageShell width="wide">
        <div className="aspect-[16/7] w-full animate-pulse rounded-panel border border-border bg-surface-raised" />
        <div className="mt-8 space-y-3">
          <QueueRowSkeleton />
          <QueueRowSkeleton />
          <QueueRowSkeleton />
        </div>
      </PageShell>
    )
  }

  if (error || !room) {
    return (
      <PageShell width="narrow">
        <Alert variant="error">{error || 'Room not found. This room may no longer exist or the room code may be invalid.'}</Alert>
        <Button onClick={() => navigate('/home')} className="mt-5">
          Back to Home
        </Button>
      </PageShell>
    )
  }

  const onlineMembers = members.filter((m) => m.is_online)
  const pendingCount = queue.filter((item) => item.status !== 'playing').length

  return (
    <div
      className={cx(
        'room-page',
        nowPlaying && 'max-lg:pb-[6.25rem]',
      )}
    >
      <RoomHeader
        room={room}
        listenerCount={onlineMembers.length}
        copied={copied}
        roomLink={roomLink}
        qrImageUrl={qrImageUrl}
        onCopyRoomLink={handleCopyRoomLink}
      />

      <PageShell width="wide" className="room-page-shell flex min-w-0 flex-col py-5">
        <div className="room-page-grid grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3 xl:grid-rows-1 xl:gap-6">
          {/* Main Content */}
          <div className="room-page-main flex min-w-0 flex-col gap-5 xl:col-span-2">
            <div className="shrink-0">
              <NowPlayingPanel
                nowPlaying={nowPlaying}
                canControlPlayback={canControlPlayback}
                playbackBusy={playbackBusy}
                durationSeconds={trackDuration}
                player={
                  nowPlaying?.song ? (
                    <SyncedYouTubePlayer
                      ref={engineRef}
                      videoId={nowPlaying.song.youtube_id}
                      startedAt={nowPlaying.playing_started_at ?? null}
                      volume={deviceVolume}
                      onEnded={handleTrackEnded}
                      onDuration={setEngineDuration}
                      onEngineState={setEngineState}
                    />
                  ) : null
                }
                onPlayNext={() => void handlePlayNext()}
                onMarkPlayed={() => void handleMarkPlayed()}
              />
            </div>

            {/* Queue */}
            <section id="room-queue" aria-label="Queue" className="room-page-queue flex min-w-0 flex-col">
              <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
                <h2 className="flex min-w-0 items-center gap-2.5 text-title">
                  <ListMusic size={19} strokeWidth={2.25} className="shrink-0 text-accent" aria-hidden="true" />
                  <span className="truncate">Up Next</span>
                  {pendingCount > 0 ? (
                    <span className="font-mono text-sm font-normal text-subtle">
                      {pendingCount}
                    </span>
                  ) : null}
                </h2>
                {queue.length > 0 ? (
                  <Button
                    onClick={() => setShowSuggestForm((visible) => !visible)}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus size={15} strokeWidth={2.75} aria-hidden="true" />
                    Suggest Song
                  </Button>
                ) : null}
              </div>

              {actionError && <Alert variant="error" className="mb-3 shrink-0">{actionError}</Alert>}

              {showSuggestForm ? (
                <div className="room-page-queue-list">
                  <SuggestSongForm
                    suggestion={suggestion}
                    onSuggestionChange={setSuggestion}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    searchResults={searchResults}
                    searching={searching}
                    submitting={submitting}
                    onSearch={() => void handleSearchYouTube()}
                    onSelectResult={selectSearchResult}
                    onSubmit={handleSuggestSong}
                    onCancel={() => setShowSuggestForm(false)}
                  />
                </div>
              ) : (
                <div className="room-page-queue-list flex flex-col">
                  <div className="space-y-2.5">
                    {queue.map((item) => (
                      <QueueItemCard
                        key={item.id}
                        id={item.id}
                        title={item.song?.title || 'Unknown'}
                        artist={item.song?.artist || 'Unknown'}
                        votes={item.vote_count || 0}
                        thumbnail={item.song?.thumbnail_url ?? undefined}
                        suggestedBy={item.suggested_by_profile?.username || 'member'}
                        index={queueRanks.get(item.id)}
                        isCurrentlyPlaying={item.status === 'playing'}
                        hasVoted={item.user_voted}
                        onVote={handleVote}
                        onRemoveVote={handleRemoveVote}
                        onRemoveSong={
                          item.suggested_by === user?.id && item.status === 'pending'
                            ? handleRemoveSong
                            : undefined
                        }
                      />
                    ))}
                  </div>

                  {queue.length === 0 ? (
                    <EmptyState
                      className="h-full min-h-0 justify-center py-6"
                      icon={<Music size={24} strokeWidth={2} />}
                      title="The queue is empty"
                      description="Be the first to suggest a song. Everyone in the room votes on what plays next."
                      action={
                        <Button onClick={() => setShowSuggestForm(true)}>
                          <Plus size={15} strokeWidth={2.75} aria-hidden="true" />
                          Suggest Song
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              )}
            </section>

            {user ? (
              <RoomChatPanel
                roomId={room.id}
                currentUserId={user.id}
                creatorUserId={room.created_by}
                members={members}
              />
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="room-page-side flex min-w-0 flex-col gap-4">
            <MembersPanel
              members={members}
              room={room}
              currentUserId={user?.id}
              currentProfile={profile}
            />

            <RecentlyPlayedPanel
              playHistory={playHistory}
              busy={replayBusy}
              onReplaySong={handleReplaySong}
            />

            <RoomInfoPanel room={room} />

            <Button onClick={handleLeaveRoom} variant="danger" fullWidth className="shrink-0">
              <DoorOpen size={16} strokeWidth={2.25} aria-hidden="true" />
              Leave Room
            </Button>
          </div>
        </div>
      </PageShell>

      {nowPlaying ? (
        <RoomPlayerBar
          nowPlaying={nowPlaying}
          listenerCount={onlineMembers.length}
          canControlPlayback={canControlPlayback}
          playbackBusy={playbackBusy}
          durationSeconds={trackDuration}
          engineState={engineState}
          volume={deviceVolume}
          onVolumeChange={handleDeviceVolume}
          onSkip={() => void handleMarkPlayed()}
        />
      ) : null}

      <Toast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={dismissToast}
      />
    </div>
  )
}
