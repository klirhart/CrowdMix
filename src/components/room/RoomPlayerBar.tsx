import { useCallback, useEffect, useState } from 'react'
import { ListMusic, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { LyricsPanel, type LyricsSong } from '@/components/room/LyricsPanel'
import { Artwork } from '@/components/ui/Artwork'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { NowPlayingBars } from '@/components/ui/QueueItemCard'
import { cx } from '@/components/ui/cx'
import { displayElapsedSeconds, formatClock, roomElapsedSeconds } from '@/lib/playback'
import type { QueueItemWithDetails } from '@/types/queue'

interface RoomPlayerBarProps {
  nowPlaying: QueueItemWithDetails
  listenerCount: number
  canControlPlayback: boolean
  playbackBusy: boolean
  durationSeconds: number
  engineState: 'loading' | 'live'
  volume: number
  onVolumeChange: (volume: number) => void
  onSkip: () => void
}

export function RoomPlayerBar({
  nowPlaying,
  listenerCount,
  canControlPlayback,
  playbackBusy,
  durationSeconds,
  engineState,
  volume,
  onVolumeChange,
  onSkip,
}: RoomPlayerBarProps) {
  const song = nowPlaying.song
  const [nowMs, setNowMs] = useState(() => Date.now())
  const totalSeconds = durationSeconds || song?.duration || 0
  const elapsedSeconds = displayElapsedSeconds(
    roomElapsedSeconds(nowPlaying.playing_started_at, nowMs),
    totalSeconds,
  )
  const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0
  const suggestedBy = nowPlaying.suggested_by_profile?.username || 'member'
  const isLive = engineState === 'live'
  const muted = volume === 0
  const [lyricsSong, setLyricsSong] = useState<LyricsSong | null>(null)
  const lyricsOpen = lyricsSong !== null

  const closeLyrics = useCallback(() => setLyricsSong(null), [])

  const toggleLyrics = () => {
    if (lyricsOpen) {
      closeLyrics()
      return
    }

    setLyricsSong({
      title: song?.title || 'Untitled track',
      artist: song?.artist || 'Unknown artist',
      thumbnailUrl: song?.thumbnail_url ?? null,
    })
  }

  useEffect(() => {
    if (!nowPlaying.playing_started_at) return

    const timer = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [nowPlaying.playing_started_at, nowPlaying.id])

  const handleVolume = (next: number) => {
    onVolumeChange(next)
  }

  return (
    <aside
      aria-label="Room player"
      className={cx(
        'room-player-bar z-40 min-w-0 w-full border-t border-border bg-surface/95 backdrop-blur-lg',
        'max-lg:fixed max-lg:inset-x-0 max-lg:z-30',
        'max-lg:bottom-[calc(3.75rem+env(safe-area-inset-bottom))]',
        'lg:sticky lg:bottom-0 lg:shrink-0',
      )}
    >
      <div className="mx-auto flex min-w-0 max-w-[96rem] flex-col gap-1 px-3 py-1.5 sm:gap-1.5 sm:px-4 sm:py-2 lg:min-h-[4.75rem] lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-1 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <Artwork
            src={song?.thumbnail_url}
            alt=""
            iconSize={18}
            className="h-10 w-10 rounded-lg sm:h-14 sm:w-14"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {song?.title || 'Untitled track'}
            </p>
            <p className="truncate text-xs text-muted">{song?.artist || 'Unknown artist'}</p>
            <p className="mt-0.5 hidden truncate text-[11px] text-subtle lg:block">
              Suggested by @{suggestedBy}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5 lg:hidden">
            <Badge tone="live" pulse={isLive} className="px-2 py-0.5 text-[10px]">
              {isLive ? 'LIVE' : 'SYNC'}
            </Badge>
            {canControlPlayback ? (
              <IconButton
                label={playbackBusy ? 'Skipping' : 'Play next'}
                icon={<SkipForward size={16} strokeWidth={2.25} />}
                size="sm"
                disabled={playbackBusy}
                onClick={onSkip}
              />
            ) : null}
            <IconButton
              label={muted ? 'Unmute on this device' : 'Mute on this device'}
              icon={muted ? <VolumeX size={16} strokeWidth={2.25} /> : <Volume2 size={16} strokeWidth={2.25} />}
              size="sm"
              onClick={() => handleVolume(muted ? 80 : 0)}
            />
            <IconButton
              label={lyricsOpen ? 'Hide lyrics' : 'Lyrics'}
              icon={<ListMusic size={16} strokeWidth={2.25} />}
              size="sm"
              active={lyricsOpen}
              aria-expanded={lyricsOpen}
              aria-haspopup="dialog"
              onClick={toggleLyrics}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-[1.4] flex-col items-stretch gap-1 lg:max-w-xl lg:px-2">
          <div className="hidden items-center justify-center gap-3 lg:flex">
            {canControlPlayback ? (
              <IconButton
                label={playbackBusy ? 'Skipping' : 'Play next for the room'}
                icon={<SkipForward size={18} strokeWidth={2.25} />}
                size="md"
                disabled={playbackBusy}
                onClick={onSkip}
              />
            ) : null}

            <span className="inline-flex items-center gap-2">
              {isLive ? <NowPlayingBars className="h-3.5" /> : null}
              <Badge tone="live" pulse={isLive} className="px-2.5 py-0.5">
                {isLive ? 'LIVE' : 'Syncing'}
              </Badge>
              <span className="text-xs text-subtle">
                {listenerCount} listening
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-subtle">
              {formatClock(elapsedSeconds)}
            </span>
            <div
              role="progressbar"
              aria-label="Shared room playback position"
              aria-valuemin={0}
              aria-valuemax={Math.max(totalSeconds, 1)}
              aria-valuenow={Math.min(elapsedSeconds, totalSeconds)}
              aria-valuetext={`${formatClock(elapsedSeconds)} of ${totalSeconds > 0 ? formatClock(totalSeconds) : 'unknown'}`}
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-border"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-200 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-subtle">
              {totalSeconds > 0 ? formatClock(totalSeconds) : '--:--'}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-1 lg:flex">
          <div className="mr-1 flex items-center gap-2">
            <IconButton
              label={muted ? 'Unmute on this device' : 'Mute on this device'}
              icon={muted ? <VolumeX size={16} strokeWidth={2.25} /> : <Volume2 size={16} strokeWidth={2.25} />}
              size="sm"
              onClick={() => handleVolume(muted ? 80 : 0)}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              aria-label="Volume on this device"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volume}
              aria-valuetext={muted ? 'Muted' : `${volume} percent`}
              onChange={(event) => handleVolume(Number(event.target.value))}
              onInput={(event) => handleVolume(Number(event.currentTarget.value))}
              className="room-player-volume h-1 w-16 min-w-0 max-w-full cursor-pointer accent-white sm:w-24"
            />
          </div>

          <IconButton
            label={lyricsOpen ? 'Hide lyrics' : 'Lyrics'}
            icon={<ListMusic size={16} strokeWidth={2.25} />}
            size="sm"
            active={lyricsOpen}
            aria-expanded={lyricsOpen}
            aria-haspopup="dialog"
            onClick={toggleLyrics}
          />
        </div>
      </div>

      {lyricsSong ? <LyricsPanel song={lyricsSong} onClose={closeLyrics} /> : null}
    </aside>
  )
}
