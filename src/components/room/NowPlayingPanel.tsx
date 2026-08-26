import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Disc3, Music, Play, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NowPlayingBars } from '@/components/ui/QueueItemCard'
import { cx } from '@/components/ui/cx'
import { displayElapsedSeconds, formatClock, roomElapsedSeconds } from '@/lib/playback'
import type { QueueItemWithDetails } from '@/types/queue'

interface NowPlayingPanelProps {
  nowPlaying?: QueueItemWithDetails
  canControlPlayback: boolean
  playbackBusy: boolean
  durationSeconds?: number
  player?: ReactNode
  onPlayNext: () => void
  onMarkPlayed: () => void
}

function swallowPlayerInput(event: { preventDefault: () => void; stopPropagation: () => void }) {
  event.preventDefault()
  event.stopPropagation()
}

export function NowPlayingPanel({
  nowPlaying,
  canControlPlayback,
  playbackBusy,
  durationSeconds = 0,
  player,
  onPlayNext,
  onMarkPlayed,
}: NowPlayingPanelProps) {
  const song = nowPlaying?.song
  const artworkUrl = song?.thumbnail_url
  const [nowMs, setNowMs] = useState(() => Date.now())
  const totalSeconds = durationSeconds || song?.duration || 0
  const elapsedSeconds = displayElapsedSeconds(
    roomElapsedSeconds(nowPlaying?.playing_started_at, nowMs),
    totalSeconds,
  )

  useEffect(() => {
    if (!nowPlaying?.playing_started_at) return

    const timer = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [nowPlaying?.playing_started_at, nowPlaying?.id])

  return (
    <section
      aria-label="Now playing"
      className="relative shrink-0 overflow-hidden rounded-panel border border-border bg-surface-raised shadow-panel"
    >
      {artworkUrl ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <img
            src={artworkUrl}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-25 blur-3xl saturate-150"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-raised/40 via-surface-raised/80 to-surface-raised" />
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(168,85,247,0.18),_transparent_60%)]"
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div
          className={cx(
            'relative isolate w-[9.75rem] shrink-0 overflow-hidden rounded-card border bg-black shadow-raised',
            song ? 'border-white/10' : 'border-dashed border-border',
            'sm:w-48 lg:w-52',
          )}
        >
          <div className="relative aspect-video w-full">
            {song ? (
              <>
                {artworkUrl ? (
                  <img
                    src={artworkUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent-2/10">
                    <Disc3 size={28} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
                  </div>
                )}
                {player}
                <div
                  className="pointer-events-none absolute inset-0 z-[15] overflow-hidden bg-black"
                  aria-hidden="true"
                >
                  {artworkUrl ? (
                    <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/20 to-accent-2/10">
                      <Disc3 size={28} strokeWidth={1.75} className="text-accent" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-accent/15 to-accent-2/10 text-center">
                <Disc3 size={22} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
                <p className="px-2 text-[11px] font-medium text-muted">Nothing is playing yet</p>
              </div>
            )}

            {song ? (
              <div
                className="now-playing-shield absolute inset-0 z-20 cursor-default"
                aria-hidden="true"
                onContextMenu={swallowPlayerInput}
                onClick={swallowPlayerInput}
                onMouseDown={swallowPlayerInput}
                onDoubleClick={swallowPlayerInput}
                onPointerDown={swallowPlayerInput}
              />
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="flex items-center gap-2 text-meta uppercase text-accent">
            {song ? (
              <>
                <NowPlayingBars />
                Now playing
              </>
            ) : (
              <>
                <Music size={13} strokeWidth={2.5} aria-hidden="true" />
                Up next is up to you
              </>
            )}
          </p>

          <h2 className="mt-1 truncate text-base font-extrabold leading-tight tracking-tight sm:text-lg">
            {song?.title || 'No songs yet'}
          </h2>

          <p className="mt-0.5 truncate text-sm text-muted">
            {song?.artist || 'Suggest a song and let the room vote it up.'}
          </p>

          {nowPlaying ? (
            <p className="mt-1.5 font-mono text-xs text-muted">
              {formatClock(elapsedSeconds)}
              {totalSeconds > 0 ? ` / ${formatClock(totalSeconds)}` : ''}
              <span className="ml-2 text-[10px] font-sans uppercase tracking-wider text-accent">
                Live
              </span>
            </p>
          ) : null}

          {nowPlaying ? (
            <p className="mt-1 truncate text-xs text-subtle">
              Suggested by{' '}
              <span className="font-medium text-muted">
                @{nowPlaying.suggested_by_profile?.username || 'member'}
              </span>
            </p>
          ) : null}

          {canControlPlayback ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button onClick={onPlayNext} disabled={playbackBusy} size="sm">
                <Play size={13} strokeWidth={2.5} aria-hidden="true" />
                {playbackBusy ? 'Starting...' : 'Play Next'}
              </Button>
              {nowPlaying ? (
                <Button
                  onClick={onMarkPlayed}
                  disabled={playbackBusy}
                  variant="secondary"
                  size="sm"
                >
                  <SkipForward size={13} strokeWidth={2.5} aria-hidden="true" />
                  Finish Song
                </Button>
              ) : null}
            </div>
          ) : null}

          <p className="mt-2 hidden text-[11px] leading-relaxed text-subtle sm:block">
            {canControlPlayback
              ? 'You start and advance playback for everyone in the room. Playback cannot be paused.'
              : 'The room creator starts and advances playback. Playback cannot be paused.'}
          </p>
        </div>
      </div>
    </section>
  )
}
